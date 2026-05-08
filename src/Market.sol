// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Market is Ownable, ReentrancyGuard {
    IERC20 public immutable usdc;
    string public name;
    string public description;
    uint256 public immutable endTime;
    uint256 public immutable resolutionTime;
    address public immutable feeTo;

    bool public resolved;
    bool public outcome;

    uint256 public reserveUSDC;
    uint256 public reserveYES;
    uint256 public reserveNO;

    uint256 public constant FEE = 30;
    uint256 private constant FEE_DENOMINATOR = 10000;

    mapping(address => uint256) public balanceYES;
    mapping(address => uint256) public balanceNO;

    event Bought(address indexed buyer, bool isYes, uint256 usdcIn, uint256 tokensOut);
    event Sold(address indexed seller, bool isYes, uint256 tokensIn, uint256 usdcOut);
    event Resolved(bool outcome);

    modifier onlyBeforeEndTime() {
        require(block.timestamp < endTime, "Betting closed");
        _;
    }

    constructor(
        address _usdc,
        string memory _name,
        string memory _desc,
        uint256 _endTime,
        uint256 _resolutionTime,
        address _feeTo
    ) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        name = _name;
        description = _desc;
        endTime = _endTime;
        resolutionTime = _resolutionTime;
        feeTo = _feeTo;
    }

    function addInitialLiquidity(uint256 usdcAmount) external onlyOwner {
        require(reserveUSDC == 0, "Liquidity already added");
        require(usdcAmount > 0, "Amount must be > 0");
        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        reserveUSDC = usdcAmount;
        reserveYES = usdcAmount;
        reserveNO = usdcAmount;
        balanceYES[msg.sender] = usdcAmount;
        balanceNO[msg.sender] = usdcAmount;
    }

    function buy(bool isYes, uint256 usdcAmount) external onlyBeforeEndTime nonReentrant {
        require(!resolved, "Already resolved");
        require(usdcAmount > 0, "Amount must be > 0");

        usdc.transferFrom(msg.sender, address(this), usdcAmount);

        uint256 rUsdc = reserveUSDC;
        uint256 rSrc = isYes ? reserveYES : reserveNO;

        uint256 tokensOut = getAmountOut(usdcAmount, rUsdc, rSrc);
        require(tokensOut > 0, "Insufficient liquidity");

        uint256 feeAmount = (usdcAmount * FEE) / FEE_DENOMINATOR;
        uint256 usdcAfterFee;
        unchecked {
            usdcAfterFee = usdcAmount - feeAmount;
        }

        reserveUSDC = rUsdc + usdcAfterFee;
        if (isYes) {
            reserveYES = rSrc + tokensOut;
            balanceYES[msg.sender] += tokensOut;
        } else {
            reserveNO = rSrc + tokensOut;
            balanceNO[msg.sender] += tokensOut;
        }
        usdc.transfer(feeTo, feeAmount);

        emit Bought(msg.sender, isYes, usdcAmount, tokensOut);
    }

    function sell(bool isYes, uint256 tokenAmount) external nonReentrant {
        require(!resolved, "Market resolved, use redeem()");
        require(tokenAmount > 0, "Amount must be > 0");

        uint256 userBalance = isYes ? balanceYES[msg.sender] : balanceNO[msg.sender];
        require(userBalance >= tokenAmount, "Insufficient balance");

        uint256 rSrc = isYes ? reserveYES : reserveNO;
        uint256 rUsdc = reserveUSDC;

        uint256 usdcOut = getAmountOut(tokenAmount, rSrc, rUsdc);
        require(usdcOut > 0, "Slippage too high");

        unchecked {
            uint256 newUserBalance = userBalance - tokenAmount;
            uint256 newRSrc = rSrc - tokenAmount;
            uint256 newRUsdc = rUsdc - usdcOut;

            if (isYes) {
                balanceYES[msg.sender] = newUserBalance;
                reserveYES = newRSrc;
            } else {
                balanceNO[msg.sender] = newUserBalance;
                reserveNO = newRSrc;
            }
            reserveUSDC = newRUsdc;
        }
        usdc.transfer(msg.sender, usdcOut);

        emit Sold(msg.sender, isYes, tokenAmount, usdcOut);
    }

    function resolve(bool _outcome) external onlyOwner {
        require(block.timestamp >= resolutionTime, "Too early");
        require(!resolved, "Already resolved");
        resolved = true;
        outcome = _outcome;
        emit Resolved(_outcome);
    }

    function redeem() external {
        require(resolved, "Not resolved yet");

        uint256 winningBalance = outcome ? balanceYES[msg.sender] : balanceNO[msg.sender];
        require(winningBalance > 0, "No winning tokens");

        uint256 winningReserve = outcome ? reserveYES : reserveNO;
        uint256 rUsdc = reserveUSDC;
        uint256 userShare = (winningBalance * rUsdc) / winningReserve;

        if (outcome) {
            balanceYES[msg.sender] = 0;
        } else {
            balanceNO[msg.sender] = 0;
        }
        unchecked {
            reserveUSDC = rUsdc - userShare;
        }
        usdc.transfer(msg.sender, userShare);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256) {
        require(reserveIn > 0 && reserveOut > 0, "Insufficient liquidity");

        unchecked {
            uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE) / FEE_DENOMINATOR;
            uint256 numerator = amountInWithFee * reserveOut;
            uint256 denominator = reserveIn + amountInWithFee;
            return numerator / denominator;
        }
    }
}
