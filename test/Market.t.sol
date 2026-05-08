// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Market.sol";
import "../src/mocks/MockUSDC.sol";

contract MarketTest is Test {
    MockUSDC public usdc;
    Market public market;
    address public feeTo = address(0x123);
    address public user = address(0x456);
    address public owner;
    uint256 public endTime;
    uint256 public resolutionTime;

    function setUp() public {
        owner = address(this);
        usdc = new MockUSDC();
        endTime = block.timestamp + 7 days;
        resolutionTime = block.timestamp + 14 days;

        market = new Market(
            address(usdc),
            "Test Market",
            "Will BTC > $100k?",
            endTime,
            resolutionTime,
            feeTo
        );

        usdc.mint(address(this), 100_000 * 1e6);
        usdc.mint(user, 100_000 * 1e6);

        usdc.approve(address(market), type(uint256).max);

        vm.startPrank(user);
        usdc.approve(address(market), type(uint256).max);
        vm.stopPrank();

        market.addInitialLiquidity(1000 * 1e6);
    }

    function test_InitialState() public view {
        assertFalse(market.resolved());
        assertEq(market.name(), "Test Market");
        assertEq(market.description(), "Will BTC > $100k?");
        assertEq(market.reserveYES(), 1000 * 1e6);
        assertEq(market.reserveNO(), 1000 * 1e6);
        assertEq(market.reserveUSDC(), 1000 * 1e6);
        assertEq(market.endTime(), endTime);
        assertEq(market.resolutionTime(), resolutionTime);
        assertEq(market.feeTo(), feeTo);
        assertEq(market.owner(), address(this));
    }

    function test_BuyYES() public {
        vm.prank(user);
        market.buy(true, 100 * 1e6);

        uint256 yesBalance = market.balanceYES(user);
        assertGt(yesBalance, 0);
        assertEq(market.balanceNO(user), 0);

        assertTrue(market.reserveYES() > 1000 * 1e6);
        assertTrue(market.reserveUSDC() > 1000 * 1e6);
    }

    function test_BuyNO() public {
        vm.prank(user);
        market.buy(false, 100 * 1e6);

        uint256 noBalance = market.balanceNO(user);
        assertGt(noBalance, 0);
        assertEq(market.balanceYES(user), 0);

        assertTrue(market.reserveNO() > 1000 * 1e6);
        assertTrue(market.reserveUSDC() > 1000 * 1e6);
    }

    function test_BuyAndSellYES() public {
        vm.prank(user);
        market.buy(true, 100 * 1e6);

        uint256 yesBalance = market.balanceYES(user);
        assertGt(yesBalance, 0);
        assertTrue(market.reserveYES() > 1000 * 1e6);

        vm.prank(user);
        market.sell(true, yesBalance);

        assertEq(market.balanceYES(user), 0);
        assertTrue(market.reserveYES() >= 1000 * 1e6);
    }

    function test_BuyAndSellNO() public {
        vm.prank(user);
        market.buy(false, 100 * 1e6);

        uint256 noBalance = market.balanceNO(user);
        assertGt(noBalance, 0);

        vm.prank(user);
        market.sell(false, noBalance);

        assertEq(market.balanceNO(user), 0);
    }

    function test_BuyIncreasesBothReserves() public {
        uint256 usdcBefore = market.reserveUSDC();
        uint256 yesBefore = market.reserveYES();

        vm.prank(user);
        market.buy(true, 500 * 1e6);

        assertTrue(market.reserveUSDC() > usdcBefore, "USDC reserve should increase");
        assertTrue(market.reserveYES() > yesBefore, "YES reserve should increase");
        assertEq(market.reserveNO(), yesBefore, "NO reserve should stay unchanged");
    }

    function test_ResolveAndRedeemYES() public {
        vm.prank(user);
        market.buy(true, 100 * 1e6);

        uint256 yesBalance = market.balanceYES(user);
        assertGt(yesBalance, 0);

        vm.warp(resolutionTime + 1);
        market.resolve(true);

        assertTrue(market.resolved());
        assertTrue(market.outcome());

        uint256 usdcBefore = usdc.balanceOf(user);
        vm.prank(user);
        market.redeem();
        uint256 usdcAfter = usdc.balanceOf(user);

        assertGt(usdcAfter, usdcBefore, "User should receive USDC");
        assertEq(market.balanceYES(user), 0, "YES balance should be zeroed");
    }

    function test_ResolveAndRedeemNO() public {
        vm.prank(user);
        market.buy(false, 100 * 1e6);

        uint256 noBalance = market.balanceNO(user);
        assertGt(noBalance, 0);

        vm.warp(resolutionTime + 1);
        market.resolve(false);

        assertTrue(market.resolved());
        assertFalse(market.outcome());

        uint256 usdcBefore = usdc.balanceOf(user);
        vm.prank(user);
        market.redeem();
        uint256 usdcAfter = usdc.balanceOf(user);

        assertGt(usdcAfter, usdcBefore, "User should receive USDC");
        assertEq(market.balanceNO(user), 0, "NO balance should be zeroed");
    }

    function test_RevertBuyAfterEndTime() public {
        vm.warp(endTime + 1);
        vm.prank(user);
        vm.expectRevert("Betting closed");
        market.buy(true, 100 * 1e6);
    }

    function test_RevertBuyAfterEndTimeAndResolve() public {
        vm.warp(resolutionTime + 1);
        market.resolve(true);

        vm.prank(user);
        vm.expectRevert("Betting closed");
        market.buy(true, 100 * 1e6);
    }

    function test_RevertSellAfterResolve() public {
        vm.warp(resolutionTime + 1);
        market.resolve(true);

        vm.prank(user);
        vm.expectRevert("Market resolved, use redeem()");
        market.sell(true, 100);
    }

    function test_RevertResolveBeforeResolutionTime() public {
        vm.expectRevert("Too early");
        market.resolve(true);
    }

    function test_RevertDoubleResolve() public {
        vm.warp(resolutionTime + 1);
        market.resolve(true);
        vm.expectRevert("Already resolved");
        market.resolve(true);
    }

    function test_RevertRedeemBeforeResolve() public {
        vm.prank(user);
        vm.expectRevert("Not resolved yet");
        market.redeem();
    }

    function test_RevertRedeemWithNoTokens() public {
        vm.warp(resolutionTime + 1);
        market.resolve(true);

        vm.prank(user);
        vm.expectRevert("No winning tokens");
        market.redeem();
    }

    function test_RevertSellInsufficientBalance() public {
        vm.prank(user);
        vm.expectRevert("Insufficient balance");
        market.sell(true, 100);
    }

    function test_RevertNonOwnerResolve() public {
        vm.warp(resolutionTime + 1);
        vm.prank(user);
        vm.expectRevert();
        market.resolve(true);
    }

    function test_OwnerCanAddInitialLiquidity() public {
        Market market2 = new Market(
            address(usdc),
            "Empty Market",
            "No liquidity yet",
            endTime,
            resolutionTime,
            feeTo
        );

        usdc.approve(address(market2), 500 * 1e6);
        market2.addInitialLiquidity(500 * 1e6);

        assertEq(market2.reserveUSDC(), 500 * 1e6);
        assertEq(market2.reserveYES(), 500 * 1e6);
        assertEq(market2.reserveNO(), 500 * 1e6);
    }

    function test_RevertAddingLiquidityTwice() public {
        vm.expectRevert("Liquidity already added");
        market.addInitialLiquidity(100 * 1e6);
    }

    function test_RevertAddLiquidityByNonOwner() public {
        Market market2 = new Market(
            address(usdc),
            "Another",
            "desc",
            endTime,
            resolutionTime,
            feeTo
        );

        vm.prank(user);
        usdc.mint(user, 1000 * 1e6);
        vm.prank(user);
        usdc.approve(address(market2), 1000 * 1e6);
        vm.prank(user);
        vm.expectRevert();
        market2.addInitialLiquidity(100 * 1e6);
    }

    function test_FeeCollectedOnBuy() public {
        uint256 feeToBefore = usdc.balanceOf(feeTo);

        vm.prank(user);
        market.buy(true, 1000 * 1e6);

        uint256 feeToAfter = usdc.balanceOf(feeTo);
        uint256 expectedFee = (1000 * 1e6 * 30) / 10000;

        assertEq(feeToAfter - feeToBefore, expectedFee, "Fee should be 0.3% of buy amount");
    }

    function test_GetAmountOut() public {
        uint256 amountOut = market.getAmountOut(100 * 1e6, 1000 * 1e6, 1000 * 1e6);
        assertGt(amountOut, 0);
        assertLt(amountOut, 100 * 1e6);

        uint256 amountInWithFee = (100 * 1e6 * 9970) / 10000;
        uint256 expected = (amountInWithFee * 1000 * 1e6) / (1000 * 1e6 + amountInWithFee);
        assertEq(amountOut, expected);
    }

    function test_GasBuy() public {
        vm.prank(user);
        market.buy(true, 100 * 1e6);
    }

    function test_GasSell() public {
        vm.prank(user);
        market.buy(true, 100 * 1e6);
        uint256 yesBalance = market.balanceYES(user);

        vm.prank(user);
        market.sell(true, yesBalance);
    }

    function test_GasResolveAndRedeem() public {
        vm.warp(resolutionTime + 1);
        market.resolve(true);

        market.redeem();
    }

    function test_MultipleBuysAndOutcomeYES() public {
        address user2 = address(0x789);
        usdc.mint(user2, 100_000 * 1e6);
        vm.startPrank(user2);
        usdc.approve(address(market), type(uint256).max);
        vm.stopPrank();

        vm.prank(user);
        market.buy(true, 200 * 1e6);

        vm.prank(user2);
        market.buy(false, 100 * 1e6);

        vm.warp(resolutionTime + 1);
        market.resolve(true);

        assertTrue(market.outcome());

        uint256 userUsdcBefore = usdc.balanceOf(user);
        vm.prank(user);
        market.redeem();
        uint256 userUsdcAfter = usdc.balanceOf(user);
        assertGt(userUsdcAfter, userUsdcBefore, "YES holder should profit");

        uint256 user2UsdcBefore = usdc.balanceOf(user2);
        vm.prank(user2);
        vm.expectRevert("No winning tokens");
        market.redeem();
        uint256 user2UsdcAfter = usdc.balanceOf(user2);
        assertEq(user2UsdcAfter, user2UsdcBefore, "NO holder balance should stay unchanged");
    }
}
