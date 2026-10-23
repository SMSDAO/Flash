// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/EnterpriseFlashLoanArbitrageV1.1.0.sol";

/**
 * @notice Production Foundry Deployment Script for EnterpriseFlashLoanArbitrageV1.1.0
 *         Automatically resolves canonical Aave V3 Pool addresses and risk parameters 
 *         across Ethereum Mainnet, Arbitrum One, Polygon PoS, Optimism, and zkSync Era.
 */
contract DeployEnterpriseArbitrageScript is Script {
    // Canonical Aave V3 Pool Addresses per Chain
    address constant ETHEREUM_AAVE_POOL = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address constant ARBITRUM_AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant POLYGON_AAVE_POOL  = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant OPTIMISM_AAVE_POOL = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;
    address constant ZKSYNC_AAVE_POOL   = 0x4d9429246EA989C9CEE203B43F6d1C7D83e3B8F8;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        uint256 chainId = block.chainid;
        
        address targetAavePool;
        uint256 maxLoanLimit;
        uint256 maxGasPriceThreshold;

        if (chainId == 1) {
            // Ethereum Mainnet
            targetAavePool = ETHEREUM_AAVE_POOL;
            maxLoanLimit = 500 ether; // 500 WETH max flash loan ceiling
            maxGasPriceThreshold = 250 gwei;
        } else if (chainId == 42161) {
            // Arbitrum One
            targetAavePool = ARBITRUM_AAVE_POOL;
            maxLoanLimit = 1000 ether;
            maxGasPriceThreshold = 5 gwei;
        } else if (chainId == 137) {
            // Polygon PoS
            targetAavePool = POLYGON_AAVE_POOL;
            maxLoanLimit = 1000000 ether;
            maxGasPriceThreshold = 300 gwei;
        } else if (chainId == 10) {
            // Optimism
            targetAavePool = OPTIMISM_AAVE_POOL;
            maxLoanLimit = 800 ether;
            maxGasPriceThreshold = 0.1 gwei;
        } else if (chainId == 324) {
            // zkSync Era
            targetAavePool = ZKSYNC_AAVE_POOL;
            maxLoanLimit = 500 ether;
            maxGasPriceThreshold = 0.5 gwei;
        } else {
            revert("Unsupported Network Chain ID for EnterpriseFlashLoanArbitrage deployment");
        }

        console.log("=== Deploying EnterpriseFlashLoanArbitrageV1.1.0 ===");
        console.log("Chain ID:", chainId);
        console.log("Target Aave V3 Pool:", targetAavePool);
        console.log("Max Loan Limit:", maxLoanLimit);

        vm.startBroadcast(deployerPrivateKey);

        EnterpriseFlashLoanArbitrage arbitrageBot = new EnterpriseFlashLoanArbitrage(
            targetAavePool,
            maxLoanLimit,
            maxGasPriceThreshold
        );

        console.log("Deployed Contract Address:", address(arbitrageBot));

        vm.stopBroadcast();
    }
}
