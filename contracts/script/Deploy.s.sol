// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../EnterpriseFlashLoanArbitrage.sol";

/**
 * @title DeployEnterpriseFlashLoanArbitrage
 * @notice Multi-Chain Deployment Script for Arbitrum, Optimism, Polygon, Ethereum, zkSync Era
 *         Configures network-specific Aave V3 Pool addresses and initial circuit breaker thresholds.
 */
contract DeployEnterpriseFlashLoanArbitrage is Script {
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

        console.log("=== Deploying EnterpriseFlashLoanArbitrage ===");
        console.log("Chain ID:", chainId);
        console.log("Target Aave V3 Pool:", targetAavePool);
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
