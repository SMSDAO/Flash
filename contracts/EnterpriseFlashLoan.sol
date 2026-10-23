// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IPool
 * @notice Aave V3 Pool minimal interface for flashLoanSimple
 */
interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

/**
 * @title IFlashLoanSimpleReceiver
 * @notice Aave V3 Flash Loan receiver callback interface
 */
interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

/**
 * @title IWETH
 * @notice Interface for Wrapped Ether unwrapping and wrapping
 */
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 wad) external;
}

/**
 * @title EnterpriseFlashLoan
 * @author Principal MEV & Smart Contract Systems Architect
 * @notice Production-grade, zero-collateral Flash Loan Arbitrage Engine.
 *         Features polymorphic call execution across any DEX router (Uniswap V2/V3,
 *         Curve, Balancer, etc.), strict solvency and profit verification, dynamic
 *         block.coinbase MEV builder bribes, and emergency recovery controls.
 */
contract EnterpriseFlashLoan is IFlashLoanSimpleReceiver, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Custom Errors ---
    error UnauthorizedCaller(address caller, address expectedPool);
    error UnauthorizedInitiator(address initiator, address expectedContract);
    error InsufficientProfit(uint256 currentBalance, uint256 requiredBalance);
    error ExecutionCallFailed(uint256 index, address target, bytes errorData);
    error BribeTransferFailed();
    error EmergencyWithdrawalFailed();
    error ZeroAddress();
    error ZeroAmount();

    // --- Struct Definitions ---
    struct Call {
        address target;      // DEX router or pool contract
        address approveToken;// Token to approve for target (address(0) if none)
        uint256 approveAmount;// Amount to approve (type(uint256).max if max)
        bytes callData;      // Encoded swap function payload
    }

    struct ArbitrageParams {
        uint256 minProfit;   // Minimum acceptable net profit in asset base units
        uint256 mevBribeBps; // Basis points (1 bps = 0.01%) of gross profit tipped to block.coinbase
        Call[] calls;        // Polymorphic sequence of router interactions
    }

    // --- State Variables ---
    IPool public immutable aavePool;
    address public immutable weth;

    // --- Events ---
    event ArbitrageExecuted(
        address indexed asset,
        uint256 borrowedAmount,
        uint256 totalRepayment,
        uint256 grossProfit,
        uint256 mevBribePaid,
        uint256 netProfit
    );

    event TokenRecovered(address indexed token, address indexed recipient, uint256 amount);
    event NativeRecovered(address indexed recipient, uint256 amount);

    /**
     * @notice Constructor sets the immutable canonical Aave V3 Lending Pool and WETH address.
     * @param _aavePool Canonical Aave V3 Pool contract address on the target chain.
     * @param _weth Canonical WETH address on the target chain.
     */
    constructor(address _aavePool, address _weth) Ownable(msg.sender) {
        if (_aavePool == address(0) || _weth == address(0)) revert ZeroAddress();
        aavePool = IPool(_aavePool);
        weth = _weth;
    }

    /**
     * @notice Initiates zero-collateral Aave V3 flash loan.
     * @param asset The ERC20 token address to borrow.
     * @param amount The principal amount to borrow.
     * @param params ABI-encoded ArbitrageParams struct.
     */
    function requestFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner nonReentrant {
        if (asset == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        aavePool.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referralCode
        );
    }

    /**
     * @notice Aave V3 flash loan callback function executed within the atomic loan transaction.
     * @param asset The borrowed ERC20 token.
     * @param amount The principal amount borrowed.
     * @param premium The protocol fee charged by Aave V3.
     * @param initiator The address that initiated the flash loan (must be address(this)).
     * @param params The arbitrary encoded calldata passed via requestFlashLoan.
     * @return true on successful execution and solvency verification.
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        if (msg.sender != address(aavePool)) {
            revert UnauthorizedCaller(msg.sender, address(aavePool));
        }
        if (initiator != address(this)) {
            revert UnauthorizedInitiator(initiator, address(this));
        }

        ArbitrageParams memory arbParams = abi.decode(params, (ArbitrageParams));

        // 1. Execute polymorphic sequence of swap calls across specified DEX protocols
        uint256 callsLength = arbParams.calls.length;
        for (uint256 i = 0; i < callsLength; ) {
            Call memory step = arbParams.calls[i];

            if (step.approveToken != address(0)) {
                // Ensure target has approval to pull tokens
                IERC20(step.approveToken).forceApprove(step.target, step.approveAmount);
            }

            (bool success, bytes memory returnData) = step.target.call(step.callData);
            if (!success) {
                revert ExecutionCallFailed(i, step.target, returnData);
            }

            unchecked {
                ++i;
            }
        }

        // 2. Solvency & Strict Profit Verification
        uint256 totalRepayment = amount + premium;
        uint256 currentBalance = IERC20(asset).balanceOf(address(this));
        uint256 requiredBalance = totalRepayment + arbParams.minProfit;

        if (currentBalance < requiredBalance) {
            revert InsufficientProfit(currentBalance, requiredBalance);
        }

        uint256 grossProfit = currentBalance - totalRepayment;
        uint256 bribeAmount = 0;

        // 3. Dynamic MEV Builder Bribe Transfer (block.coinbase tip)
        if (arbParams.mevBribeBps > 0 && block.coinbase != address(0)) {
            bribeAmount = (grossProfit * arbParams.mevBribeBps) / 10000;
            if (bribeAmount > 0) {
                if (asset == weth) {
                    // Unwrap WETH to native ETH and tip block.coinbase
                    IWETH(weth).withdraw(bribeAmount);
                    (bool sent, ) = block.coinbase.call{value: bribeAmount}("");
                    if (!sent) revert BribeTransferFailed();
                } else {
                    // Transfer ERC20 tip directly if miner supports token bribes
                    IERC20(asset).safeTransfer(block.coinbase, bribeAmount);
                }
            }
        }

        // 4. Approve Aave Pool to pull exact repayment (principal + premium)
        IERC20(asset).forceApprove(address(aavePool), totalRepayment);

        uint256 netProfit = grossProfit - bribeAmount;

        emit ArbitrageExecuted(
            asset,
            amount,
            totalRepayment,
            grossProfit,
            bribeAmount,
            netProfit
        );

        return true;
    }

    /**
     * @notice Emergency withdrawal of ERC20 tokens to the contract owner.
     * @param token Address of ERC20 token to recover.
     * @param amount Amount to transfer.
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0)) revert ZeroAddress();
        uint256 balance = IERC20(token).balanceOf(address(this));
        uint256 transferAmount = amount > balance ? balance : amount;
        if (transferAmount == 0) revert ZeroAmount();

        IERC20(token).safeTransfer(owner(), transferAmount);
        emit TokenRecovered(token, owner(), transferAmount);
    }

    /**
     * @notice Emergency withdrawal of native ETH to the contract owner.
     * @param amount Amount of native wei to transfer.
     */
    function withdrawNative(uint256 amount) external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        uint256 transferAmount = amount > balance ? balance : amount;
        if (transferAmount == 0) revert ZeroAmount();

        (bool success, ) = payable(owner()).call{value: transferAmount}("");
        if (!success) revert EmergencyWithdrawalFailed();

        emit NativeRecovered(owner(), transferAmount);
    }

    /**
     * @notice Fallback to accept native ETH during WETH unwrapping.
     */
    receive() external payable {}
}
