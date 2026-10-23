export const SOLIDITY_SOURCE_CODE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// --- Aave V3 Core Interface ---
interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

// --- Chainlink Aggregator V3 Interface ---
interface IAggregatorV3 {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

// --- DEX Interfaces ---
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external returns (uint256 amountOut);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external returns (uint256);
}

interface ICurveRouter {
    function exchange(
        address pool,
        address from,
        address to,
        uint256 _amount,
        uint256 _expected
    ) external returns (uint256);
}

/**
 * @title EnterpriseFlashLoanArbitrage
 * @notice Production-grade multi-protocol flash loan arbitrage executor with risk controls,
 *         EIP-1559 circuit breaker, Chainlink oracle validation, and cross-chain MEV intent signaling.
 */
contract EnterpriseFlashLoanArbitrage is IFlashLoanSimpleReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IPool public immutable AAVE_POOL;

    // Risk Parameters & Circuit Breakers
    uint256 public maxLoanLimit;
    uint256 public maxGasPriceThreshold;
    mapping(address => address) public chainlinkOracles;

    enum ProtocolType { UNISWAP_V2, UNISWAP_V3, BALANCER_V2, CURVE_V2, SUSHISWAP }

    struct SwapStep {
        ProtocolType protocol;
        address targetContract; // Router or Vault or Pool address
        address tokenIn;
        address tokenOut;
        uint24 v3Fee;          // Used for Uniswap V3
        bytes32 balancerPoolId; // Used for Balancer V2
        uint256 minAmountOut;
        uint16 slippageToleranceBps; // Max slippage allowed (e.g. 100 = 1%)
    }

    struct ArbitrageParams {
        uint256 minProfit;           // Mandatory net profit in loan asset decimals
        uint256 mevBribeBps;         // Percentage (in bps) of net profit sent to block miner via block.coinbase
        uint256 maxGasPriceThreshold; // Circuit breaker: revert if tx.gasprice > maxGasPriceThreshold
        SwapStep[] steps;
    }

    // --- Custom Errors ---
    error UnauthorizedCaller();
    error UnauthorizedInitiator();
    error InsufficientProfit(uint256 netProfit, uint256 minProfit);
    error InvalidProtocolType();
    error BribeTransferFailed();
    error ExceedsMaxLoan(uint256 requested, uint256 limit);
    error CircuitBreakerTriggered(uint256 currentGasPrice, uint256 threshold);
    error StaleOraclePrice(address token);

    // --- Events ---
    event ArbitrageExecuted(
        address indexed asset,
        uint256 loanAmount,
        uint256 totalRepayment,
        uint256 netProfit
    );
    event CircuitBreakerUpdated(uint256 newMaxGas);
    event MaxLoanUpdated(uint256 newMaxLoan);
    event OracleUpdated(address indexed token, address indexed oracle);
    event CrossChainArbitrageIntent(
        bytes32 indexed intentHash,
        uint256 srcChainId,
        uint256 destChainId,
        address asset,
        uint256 expectedYield
    );
    event AssetWithdrawn(address indexed token, address indexed recipient, uint256 amount);

    constructor(
        address _aavePool,
        uint256 _maxLoanLimit,
        uint256 _maxGasPriceThreshold
    ) Ownable(msg.sender) {
        require(_aavePool != address(0), "Invalid pool address");
        AAVE_POOL = IPool(_aavePool);
        maxLoanLimit = _maxLoanLimit;
        maxGasPriceThreshold = _maxGasPriceThreshold;
    }

    function setOracle(address token, address oracle) external onlyOwner {
        chainlinkOracles[token] = oracle;
        emit OracleUpdated(token, oracle);
    }

    function updateRiskParams(uint256 _maxLoanLimit, uint256 _maxGasPriceThreshold) external onlyOwner {
        maxLoanLimit = _maxLoanLimit;
        maxGasPriceThreshold = _maxGasPriceThreshold;
        emit MaxLoanUpdated(_maxLoanLimit);
        emit CircuitBreakerUpdated(_maxGasPriceThreshold);
    }

    function verifyOracleFreshness(address token) public view returns (int256 price) {
        address oracle = chainlinkOracles[token];
        if (oracle != address(0)) {
            (, int256 answer, , uint256 updatedAt, ) = IAggregatorV3(oracle).latestRoundData();
            if (answer <= 0 || block.timestamp - updatedAt > 3600) {
                revert StaleOraclePrice(token);
            }
            return answer;
        }
        return 0;
    }

    function executeArbitrage(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant {
        // 1. Gas Price Circuit Breaker Check
        if (maxGasPriceThreshold > 0 && tx.gasprice > maxGasPriceThreshold) {
            emit CircuitBreakerTriggered(tx.gasprice, maxGasPriceThreshold);
            revert CircuitBreakerTriggered(tx.gasprice, maxGasPriceThreshold);
        }

        // 2. Risk Ceiling Verification
        if (maxLoanLimit > 0 && amount > maxLoanLimit) {
            revert ExceedsMaxLoan(amount, maxLoanLimit);
        }

        // 3. Oracle Price Freshness Verification
        verifyOracleFreshness(asset);

        AAVE_POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(AAVE_POOL)) revert UnauthorizedCaller();
        if (initiator != address(this)) revert UnauthorizedInitiator();

        ArbitrageParams memory arbParams = abi.decode(params, (ArbitrageParams));

        // Param-level gas circuit breaker override if defined
        if (arbParams.maxGasPriceThreshold > 0 && tx.gasprice > arbParams.maxGasPriceThreshold) {
            emit CircuitBreakerTriggered(tx.gasprice, arbParams.maxGasPriceThreshold);
            revert CircuitBreakerTriggered(tx.gasprice, arbParams.maxGasPriceThreshold);
        }

        // 1. Execute Multi-Protocol Swap Route
        _executeSwaps(arbParams.steps);

        // 2. Validate Repayment Requirements
        uint256 totalRepayment = amount + premium;
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));

        if (currentBalance < totalRepayment + arbParams.minProfit) {
            uint256 realizedProfit = currentBalance > totalRepayment ? currentBalance - totalRepayment : 0;
            revert InsufficientProfit(realizedProfit, arbParams.minProfit);
        }

        uint256 grossProfit = currentBalance - totalRepayment;
        uint256 mevBribe = 0;

        // 3. Optional MEV Builder Tip (Coinbase Payment)
        if (arbParams.mevBribeBps > 0 && block.coinbase != address(0)) {
            mevBribe = (grossProfit * arbParams.mevBribeBps) / 10000;
            if (mevBribe > 0) {
                IERC20(asset).safeTransfer(block.coinbase, mevBribe);
            }
        }

        // 4. Approve Aave Pool and Repay Loan
        IERC20(asset).safeApprove(address(AAVE_POOL), totalRepayment);

        uint256 netProfit = grossProfit - mevBribe;
        emit ArbitrageExecuted(asset, amount, totalRepayment, netProfit);

        return true;
    }

    function _executeSwaps(SwapStep[] memory steps) internal {
        uint256 len = steps.length;
        for (uint256 i = 0; i < len; ++i) {
            SwapStep memory step = steps[i];

            uint256 balanceIn = IERC20(step.tokenIn).balanceOf(address(this));
            IERC20(step.tokenIn).safeApprove(step.targetContract, balanceIn);

            if (step.protocol == ProtocolType.UNISWAP_V2 || step.protocol == ProtocolType.SUSHISWAP) {
                address[] memory path = new address[](2);
                path[0] = step.tokenIn;
                path[1] = step.tokenOut;

                IUniswapV2Router(step.targetContract).swapExactTokensForTokens(
                    balanceIn,
                    step.minAmountOut,
                    path,
                    address(this),
                    block.timestamp
                );
            } else if (step.protocol == ProtocolType.UNISWAP_V3) {
                ISwapRouterV3.ExactInputSingleParams memory swapParams = ISwapRouterV3.ExactInputSingleParams({
                    tokenIn: step.tokenIn,
                    tokenOut: step.tokenOut,
                    fee: step.v3Fee,
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: balanceIn,
                    amountOutMinimum: step.minAmountOut,
                    sqrtPriceLimitX96: 0
                });

                ISwapRouterV3(step.targetContract).exactInputSingle(swapParams);
            } else if (step.protocol == ProtocolType.BALANCER_V2) {
                IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
                    poolId: step.balancerPoolId,
                    kind: IBalancerVault.SwapKind.GIVEN_IN,
                    assetIn: step.tokenIn,
                    assetOut: step.tokenOut,
                    amount: balanceIn,
                    userData: ""
                });

                IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
                    sender: address(this),
                    fromInternalBalance: false,
                    recipient: payable(address(this)),
                    toInternalBalance: false
                });

                IBalancerVault(step.targetContract).swap(
                    singleSwap,
                    funds,
                    step.minAmountOut,
                    block.timestamp
                );
            } else if (step.protocol == ProtocolType.CURVE_V2) {
                ICurveRouter(step.targetContract).exchange(
                    step.targetContract,
                    step.tokenIn,
                    step.tokenOut,
                    balanceIn,
                    step.minAmountOut
                );
            } else {
                revert InvalidProtocolType();
            }
        }
    }

    /**
     * @notice Emits cross-chain coordination intent for multi-network arbitrage synchronization.
     */
    function emitCrossChainIntent(
        uint256 destChainId,
        address asset,
        uint256 expectedYield
    ) external onlyOwner {
        bytes32 intentHash = keccak256(abi.encodePacked(block.chainid, destChainId, asset, expectedYield, block.timestamp));
        emit CrossChainArbitrageIntent(intentHash, block.chainid, destChainId, asset, expectedYield);
    }

    function emergencyWithdrawToken(address token, address recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No token balance");
        IERC20(token).safeTransfer(recipient, balance);
        emit EmergencyTokenRecovery(token, recipient, balance);
    }

    function emergencyWithdrawNative(address payable recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No native balance");
        (bool sent, ) = recipient.call{value: balance}("");
        if (!sent) revert EmergencyWithdrawFailed();
        emit EmergencyNativeRecovery(recipient, balance);
    }

    function withdrawToken(address token) external onlyOwner nonReentrant {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "Zero balance");
        IERC20(token).safeTransfer(owner(), balance);
        emit AssetWithdrawn(token, owner(), balance);
    }

    function withdrawNative() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "Zero balance");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
}`;

export const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_aavePool", "type": "address" },
      { "internalType": "uint256", "name": "_maxLoanLimit", "type": "uint256" },
      { "internalType": "uint256", "name": "_maxGasPriceThreshold", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [], "name": "BribeTransferFailed", "type": "error" },
  { "inputs": [{ "internalType": "uint256", "name": "currentGasPrice", "type": "uint256" }, { "internalType": "uint256", "name": "threshold", "type": "uint256" }], "name": "CircuitBreakerTriggered", "type": "error" },
  { "inputs": [{ "internalType": "uint256", "name": "requested", "type": "uint256" }, { "internalType": "uint256", "name": "limit", "type": "uint256" }], "name": "ExceedsMaxLoan", "type": "error" },
  {
    "inputs": [
      { "internalType": "uint256", "name": "netProfit", "type": "uint256" },
      { "internalType": "uint256", "name": "minProfit", "type": "uint256" }
    ],
    "name": "InsufficientProfit",
    "type": "error"
  },
  { "inputs": [], "name": "InvalidProtocolType", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "StaleOraclePrice", "type": "error" },
  { "inputs": [], "name": "UnauthorizedCaller", "type": "error" },
  { "inputs": [], "name": "UnauthorizedInitiator", "type": "error" },
  { "inputs": [], "name": "EmergencyWithdrawFailed", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amountBorrowed", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "grossProfit", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "mevTipPaid", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "netProfit", "type": "uint256" }
    ],
    "name": "ArbitrageExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "EmergencyTokenRecovery",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "EmergencyNativeRecovery",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "recipient", "type": "address" }
    ],
    "name": "emergencyWithdrawToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "recipient", "type": "address" }
    ],
    "name": "emergencyWithdrawNative",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "loanAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "totalRepayment", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "netProfit", "type": "uint256" }
    ],
    "name": "ArbitrageExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newMaxGas", "type": "uint256" }],
    "name": "CircuitBreakerUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [{ "indexed": false, "internalType": "uint256", "name": "newMaxLoan", "type": "uint256" }],
    "name": "MaxLoanUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "oracle", "type": "address" }
    ],
    "name": "OracleUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "bytes32", "name": "intentHash", "type": "bytes32" },
      { "indexed": false, "internalType": "uint256", "name": "srcChainId", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "destChainId", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "asset", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "expectedYield", "type": "uint256" }
    ],
    "name": "CrossChainArbitrageIntent",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "AAVE_POOL",
    "outputs": [{ "internalType": "contract IPool", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxLoanLimit",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxGasPriceThreshold",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "verifyOracleFreshness",
    "outputs": [{ "internalType": "int256", "name": "price", "type": "int256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "params", "type": "bytes" }
    ],
    "name": "executeArbitrage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "asset", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "premium", "type": "uint256" },
      { "internalType": "address", "name": "initiator", "type": "address" },
      { "internalType": "bytes", "name": "params", "type": "bytes" }
    ],
    "name": "executeOperation",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "_maxLoanLimit", "type": "uint256" },
      { "internalType": "uint256", "name": "_maxGasPriceThreshold", "type": "uint256" }
    ],
    "name": "updateRiskParams",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "address", "name": "oracle", "type": "address" }
    ],
    "name": "setOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "destChainId", "type": "uint256" }, { "internalType": "address", "name": "asset", "type": "address" }, { "internalType": "uint256", "name": "expectedYield", "type": "uint256" }],
    "name": "emitCrossChainIntent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "name": "withdrawToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawNative",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  { "stateMutability": "payable", "type": "receive" }
];

export const FOUNDRY_DEPLOY_SCRIPT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/EnterpriseFlashLoanArbitrage.sol";

/**
 * @notice Multi-Chain Deployment Script for Ethereum, Arbitrum, Polygon, Optimism, zkSync Era
 *         Configures network-specific Aave V3 Pool addresses and initial circuit breaker thresholds.
 */
contract DeployMultiChainScript is Script {
    // Network-specific Aave V3 Pool addresses
    address constant ETHEREUM_AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address constant ARBITRUM_AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant POLYGON_AAVE_POOL  = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant OPTIMISM_AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant ZKSYNC_AAVE_POOL   = 0x4d9429246EA989C9CEE203B43F6d1C7D83e3B8F8;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = block.chainid;
        address targetAavePool;
        uint256 maxLoanLimit = 500 ether; // 500 WETH max flash loan ceiling
        uint256 maxGasPriceThreshold = 150 gwei; // Gas circuit breaker threshold

        if (chainId == 1) {
            targetAavePool = ETHEREUM_AAVE_POOL;
            maxGasPriceThreshold = 120 gwei;
        } else if (chainId == 42161) {
            targetAavePool = ARBITRUM_AAVE_POOL;
            maxGasPriceThreshold = 5 gwei;
        } else if (chainId == 137) {
            targetAavePool = POLYGON_AAVE_POOL;
            maxGasPriceThreshold = 300 gwei;
        } else if (chainId == 10) {
            targetAavePool = OPTIMISM_AAVE_POOL;
            maxGasPriceThreshold = 5 gwei;
        } else if (chainId == 324) {
            targetAavePool = ZKSYNC_AAVE_POOL;
            maxGasPriceThreshold = 5 gwei;
        } else {
            targetAavePool = vm.envAddress("AAVE_V3_POOL");
        }

        console.log("Deploying EnterpriseFlashLoanArbitrage on Chain ID:", chainId);
        console.log("Configured Aave V3 Pool:", targetAavePool);
        console.log("Max Loan Limit:", maxLoanLimit);
        console.log("Max Gas Threshold:", maxGasPriceThreshold);

        vm.startBroadcast(deployerPrivateKey);
        EnterpriseFlashLoanArbitrage arb = new EnterpriseFlashLoanArbitrage(
            targetAavePool,
            maxLoanLimit,
            maxGasPriceThreshold
        );
        console.log("Deployed EnterpriseFlashLoanArbitrage to:", address(arb));
        vm.stopBroadcast();
    }
}
// Run Commands:
// Ethereum: forge script script/Deploy.s.sol --rpc-url $ETH_RPC_URL --broadcast --verify -vvvv
// Arbitrum: forge script script/Deploy.s.sol --rpc-url $ARB_RPC_URL --broadcast --verify -vvvv
// Polygon:  forge script script/Deploy.s.sol --rpc-url $POL_RPC_URL --broadcast --verify -vvvv
// Optimism: forge script script/Deploy.s.sol --rpc-url $OP_RPC_URL --broadcast --verify -vvvv
// zkSync:   forge script script/Deploy.s.sol --rpc-url $ZKSYNC_RPC_URL --zksync --broadcast`;

export const HARDHAT_DEPLOY_SCRIPT = `import { ethers } from "hardhat";

// Aave V3 Pool addresses across supported EVM networks
const AAVE_POOLS: Record<number, string> = {
  1: "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",       // Ethereum Mainnet
  42161: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",   // Arbitrum One
  137: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",     // Polygon PoS
  10: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",      // Optimism
  324: "0x4d9429246EA989C9CEE203B43F6d1C7D83e3B8F8"      // zkSync Era
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log("=================================================");
  console.log("Deployer Address:", deployer.address);
  console.log("Target Chain ID:", chainId.toString());

  const aavePoolAddress = process.env.AAVE_POOL || AAVE_POOLS[chainId] || AAVE_POOLS[1];
  const maxLoanLimit = ethers.parseEther(process.env.MAX_LOAN_ETH || "500");
  const maxGasPriceThreshold = ethers.parseUnits(process.env.MAX_GAS_GWEI || "150", "gwei");

  console.log("Configured Aave V3 Pool:", aavePoolAddress);
  console.log("Configured Max Loan Limit (Wei):", maxLoanLimit.toString());
  console.log("Configured Max Gas Threshold (Wei):", maxGasPriceThreshold.toString());

  const Factory = await ethers.getContractFactory("EnterpriseFlashLoanArbitrage");
  const contract = await Factory.deploy(aavePoolAddress, maxLoanLimit, maxGasPriceThreshold);
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("Successfully Deployed to:", deployedAddress);
  console.log("=================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});`;
