// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

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
 * @title EnterpriseFlashLoanArbitrageV1_1_0
 * @notice Production-grade multi-protocol flash loan arbitrage executor V1.1.0 with
 *         failover circuit breakers, emergency recovery, Chainlink oracle validation,
 *         and direct block.coinbase MEV builder tips.
 */
contract EnterpriseFlashLoanArbitrageV1_1_0 is IFlashLoanSimpleReceiver, Ownable, ReentrancyGuard, Pausable {
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
        uint24 v3Fee;          // Used for Uniswap V3 (e.g. 500 = 5 bps)
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
    error ContractIsPaused();
    error EmergencyWithdrawFailed();

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
    event EmergencyTokenRecovery(address indexed token, address indexed recipient, uint256 amount);
    event EmergencyNativeRecovery(address indexed recipient, uint256 amount);
    event CrossChainArbitrageIntent(
        bytes32 indexed intentHash,
        uint256 srcChainId,
        uint256 destChainId,
        address asset,
        uint256 expectedYield
    );

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

    /**
     * @notice Emergency Pause: Immediately stops all flash loan initiations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract operations.
     */
    function unpause() external onlyOwner {
        _unpause();
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

    /**
     * @notice Initiates atomic flash loan on Aave V3.
     */
    function executeArbitrage(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant whenNotPaused {
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

    /**
     * @notice Aave V3 Callback. Executes multi-DEX hops, validates strict profit,
     *         distributes MEV builder tip via block.coinbase, and repays flash loan debt.
     */
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

        // 2. Validate Repayment Requirements & Strict Profit
        uint256 totalRepayment = amount + premium;
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));

        if (currentBalance < totalRepayment + arbParams.minProfit) {
            uint256 realizedProfit = currentBalance > totalRepayment ? currentBalance - totalRepayment : 0;
            revert InsufficientProfit(realizedProfit, arbParams.minProfit);
        }

        uint256 grossProfit = currentBalance - totalRepayment;
        uint256 mevBribe = 0;

        // 3. MEV Builder Tip (Coinbase Payment) for Private Relay Top-of-Block Inclusion
        if (arbParams.mevBribeBps > 0 && block.coinbase != address(0)) {
            mevBribe = (grossProfit * arbParams.mevBribeBps) / 10000;
            if (mevBribe > 0) {
                IERC20(asset).safeTransfer(block.coinbase, mevBribe);
            }
        }

        // 4. Approve Aave Pool and Repay Flash Loan Debt
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
     * @notice Emergency Recovery: Withdraw all of a specified ERC20 token to recipient.
     */
    function emergencyWithdrawToken(address token, address recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No token balance");
        IERC20(token).safeTransfer(recipient, balance);
        emit EmergencyTokenRecovery(token, recipient, balance);
    }

    /**
     * @notice Emergency Recovery: Withdraw all native ETH/gas tokens to recipient.
     */
    function emergencyWithdrawNative(address payable recipient) external onlyOwner nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        uint256 balance = address(this).balance;
        require(balance > 0, "No native balance");
        (bool sent, ) = recipient.call{value: balance}("");
        if (!sent) revert EmergencyWithdrawFailed();
        emit EmergencyNativeRecovery(recipient, balance);
    }

    receive() external payable {}
}
