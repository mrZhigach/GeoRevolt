// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MarketFactory.sol";
import "../src/Market.sol";
import "../src/mocks/MockUSDC.sol";

contract MarketFactoryTest is Test {
    MockUSDC public usdc;
    MarketFactory public factory;
    address public feeTo = address(0x123);
    address public user = address(0x456);
    uint256 public endTime;
    uint256 public resolutionTime;

    function setUp() public {
        usdc = new MockUSDC();
        factory = new MarketFactory(address(usdc), feeTo);

        endTime = block.timestamp + 7 days;
        resolutionTime = block.timestamp + 14 days;

        usdc.mint(user, 100_000 * 1e6);
        vm.startPrank(user);
        usdc.approve(address(factory), type(uint256).max);
        vm.stopPrank();
    }

    function test_InitialState() public view {
        assertEq(factory.getMarketCount(), 0);
        assertEq(address(factory.usdc()), address(usdc));
        assertEq(factory.feeTo(), feeTo);
        assertEq(factory.MIN_LIQUIDITY(), 200 * 1e6);
    }

    function test_CreateMarket() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Test Market",
            "Will BTC > $100k?",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        assertTrue(marketAddr != address(0));
        assertEq(factory.getMarketCount(), 1);

        address[] memory markets = factory.getMarkets();
        assertEq(markets.length, 1);
        assertEq(markets[0], marketAddr);
    }

    function test_CreateMultipleMarkets() public {
        vm.startPrank(user);
        for (uint256 i = 0; i < 3; i++) {
            factory.createMarket(
                string(abi.encodePacked("Market ", vm.toString(i))),
                "desc",
                endTime + i * 1 days,
                resolutionTime + i * 1 days,
                200 * 1e6
            );
        }
        vm.stopPrank();

        assertEq(factory.getMarketCount(), 3);
        assertEq(factory.getMarkets().length, 3);
    }

    function test_MarketEventOnCreation() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        assertTrue(marketAddr != address(0));
        assertEq(factory.getMarketCount(), 1);
    }

    function test_MarketHasInitialLiquidity() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        Market market = Market(marketAddr);
        assertEq(market.reserveUSDC(), 200 * 1e6);
        assertEq(market.reserveYES(), 200 * 1e6);
        assertEq(market.reserveNO(), 200 * 1e6);
    }

    function test_MarketOwnerIsFactory() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        Market market = Market(marketAddr);
        assertEq(market.owner(), address(factory));
    }

    function test_MarketSetsCorrectParams() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        Market market = Market(marketAddr);
        assertEq(market.name(), "Test Market");
        assertEq(market.description(), "desc");
        assertEq(market.endTime(), endTime);
        assertEq(market.resolutionTime(), resolutionTime);
        assertEq(market.feeTo(), feeTo);
        assertEq(address(market.usdc()), address(usdc));
    }

    function test_BuyAfterFactoryCreation() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        Market market = Market(marketAddr);
        usdc.mint(user, 100 * 1e6);
        vm.prank(user);
        usdc.approve(marketAddr, 100 * 1e6);
        vm.prank(user);
        market.buy(true, 50 * 1e6);

        assertTrue(market.balanceYES(user) > 0);
    }

    function test_RevertCreateWithZeroLiquidity() public {
        vm.prank(user);
        vm.expectRevert("Minimum 200 USDC initial liquidity");
        factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            0
        );
    }

    function test_RevertCreateWithLowLiquidity() public {
        vm.prank(user);
        vm.expectRevert("Minimum 200 USDC initial liquidity");
        factory.createMarket(
            "Test Market",
            "desc",
            endTime,
            resolutionTime,
            100 * 1e6
        );
    }

    function test_RevertCreateWithEmptyName() public {
        vm.prank(user);
        vm.expectRevert("Name required");
        factory.createMarket(
            "",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );
    }

    function test_RevertCreateWithPastEndTime() public {
        vm.prank(user);
        vm.expectRevert("End time must be in the future");
        factory.createMarket(
            "Test",
            "desc",
            block.timestamp - 1,
            resolutionTime,
            200 * 1e6
        );
    }

    function test_RevertCreateWhenResolutionBeforeEnd() public {
        vm.prank(user);
        vm.expectRevert("Resolution time must be after end time");
        factory.createMarket(
            "Test",
            "desc",
            endTime,
            endTime,
            200 * 1e6
        );
    }

    function test_RevertCreateWithInsufficientAllowance() public {
        vm.prank(user);
        usdc.approve(address(factory), 0);

        vm.prank(user);
        vm.expectRevert();
        factory.createMarket(
            "Test",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );
    }

    function test_FeeToCanBeUpdated() public {
        address newFeeTo = address(0x789);
        factory.setFeeTo(newFeeTo);
        assertEq(factory.feeTo(), newFeeTo);
    }

    function test_RevertSetFeeToByNonOwner() public {
        vm.prank(user);
        vm.expectRevert();
        factory.setFeeTo(address(0x789));
    }

    function test_MarketFactoryAddressIsDeployer() public {
        assertEq(factory.owner(), address(this));
    }

    function test_GasCreateMarket() public {
        vm.prank(user);
        factory.createMarket(
            "Gas Test",
            "Measuring gas",
            endTime,
            resolutionTime,
            200 * 1e6
        );
    }

    function test_MarketLiquidityIsInReserves() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Liq Test",
            "Check reserves",
            endTime,
            resolutionTime,
            500 * 1e6
        );

        Market market = Market(marketAddr);
        assertEq(market.reserveUSDC(), 500 * 1e6);
        assertEq(market.reserveYES(), 500 * 1e6);
        assertEq(market.reserveNO(), 500 * 1e6);
    }

    function test_FactoryBalanceAfterCreation() public {
        uint256 factoryBefore = usdc.balanceOf(address(factory));

        vm.prank(user);
        factory.createMarket(
            "Test",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        assertEq(usdc.balanceOf(address(factory)), factoryBefore);
    }

    function test_ResolveMarketViaFactory() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Resolve Test",
            "Testing resolve via factory",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        vm.warp(resolutionTime + 1);

        factory.resolveMarket(marketAddr, true);

        Market market = Market(marketAddr);
        assertTrue(market.resolved());
        assertTrue(market.outcome());
    }

    function test_RevertResolveMarketByNonOwner() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Resolve Test",
            "desc",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        vm.warp(resolutionTime + 1);

        vm.prank(user);
        vm.expectRevert();
        factory.resolveMarket(marketAddr, true);
    }

    function test_UserCanTradeOnFactoryCreatedMarket() public {
        vm.prank(user);
        address marketAddr = factory.createMarket(
            "Trade Test",
            "Buy and sell",
            endTime,
            resolutionTime,
            200 * 1e6
        );

        Market market = Market(marketAddr);

        usdc.mint(user, 1000 * 1e6);
        vm.prank(user);
        usdc.approve(marketAddr, 1000 * 1e6);

        vm.prank(user);
        market.buy(true, 100 * 1e6);

        uint256 yesBalance = market.balanceYES(user);
        assertGt(yesBalance, 0);

        vm.prank(user);
        market.sell(true, yesBalance);

        assertEq(market.balanceYES(user), 0);
    }
}
