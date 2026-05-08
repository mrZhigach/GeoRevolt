// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/MarketFactory.sol";
import "../src/mocks/MockUSDC.sol";

contract Deploy is Script {
    function run() external {
        address deployer = msg.sender;
        console.log("Deployer:", deployer);

        address usdcAddress = vm.envOr("USDC_ADDRESS", address(0));
        address feeTo = vm.envOr("FEE_TO", deployer);

        IERC20 usdc;
        bool isMock;

        if (usdcAddress == address(0)) {
            console.log("No USDC_ADDRESS set. Deploying MockUSDC...");
            vm.startBroadcast();
            usdc = new MockUSDC();
            vm.stopBroadcast();
            usdcAddress = address(usdc);
            isMock = true;
            console.log("MockUSDC deployed at:", usdcAddress);
        } else {
            console.log("Using existing USDC at:", usdcAddress);
            usdc = IERC20(usdcAddress);
            isMock = false;
        }

        vm.startBroadcast();
        MarketFactory factory = new MarketFactory(usdcAddress, feeTo);
        vm.stopBroadcast();

        console.log("MarketFactory deployed at:", address(factory));

        if (isMock) {
            vm.startBroadcast();
            MockUSDC(address(usdc)).mint(deployer, 10_000 * 1e6);
            vm.stopBroadcast();
            console.log("Minted 10,000 MockUSDC to deployer");
        }

        bool createTestMarket = vm.envOr("CREATE_TEST_MARKET", false);
        if (createTestMarket) {
            uint256 testLiquidity = 200 * 1e6;

            uint256 balance = usdc.balanceOf(deployer);
            require(balance >= testLiquidity, "Insufficient USDC balance for test market");

            vm.startBroadcast();
            usdc.approve(address(factory), testLiquidity);
            factory.createMarket(
                "Test Market",
                "First market on GeoRevolt",
                block.timestamp + 7 days,
                block.timestamp + 8 days,
                testLiquidity
            );
            vm.stopBroadcast();

            console.log("Test market created with", testLiquidity / 1e6, "USDC initial liquidity");
        } else {
            console.log("Skipping test market creation (CREATE_TEST_MARKET not set)");
        }

        console.log("=== Deployment Summary ===");
        console.log("USDC:", usdcAddress);
        console.log("MarketFactory:", address(factory));
        console.log("FeeTo:", feeTo);
        console.log("Test market:", createTestMarket ? "created" : "skipped");
    }

    function runAnvil() external {
        address deployer = msg.sender;
        console.log("Anvil deployer:", deployer);

        vm.startBroadcast();
        MockUSDC mockUsdc = new MockUSDC();
        mockUsdc.mint(deployer, 100_000 * 1e6);
        MarketFactory factory = new MarketFactory(address(mockUsdc), deployer);
        vm.stopBroadcast();

        console.log("MockUSDC:", address(mockUsdc));
        console.log("MarketFactory:", address(factory));

        vm.startBroadcast();
        mockUsdc.approve(address(factory), 200 * 1e6);
        factory.createMarket(
            "Anvil Test Market",
            "Deployed via Anvil local testnet",
            block.timestamp + 7 days,
            block.timestamp + 8 days,
            200 * 1e6
        );
        vm.stopBroadcast();

        console.log("Test market created on Anvil");
        console.log("Factory address:", address(factory));
    }
}
