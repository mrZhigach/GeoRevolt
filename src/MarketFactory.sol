// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Market.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketFactory is Ownable {
    IERC20 public usdc;
    address public feeTo;

    uint256 public constant MIN_LIQUIDITY = 200 * 1e6;

    address[] public markets;

    event MarketCreated(address indexed marketAddress, uint256 indexed index, string name);

    constructor(address _usdc, address _feeTo) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        feeTo = _feeTo;
    }

    function createMarket(
        string calldata name,
        string calldata description,
        uint256 endTime,
        uint256 resolutionTime,
        uint256 initialLiquidity
    ) external returns (address) {
        require(initialLiquidity >= MIN_LIQUIDITY, "Minimum 200 USDC initial liquidity");
        require(bytes(name).length > 0, "Name required");
        require(endTime > block.timestamp, "End time must be in the future");
        require(resolutionTime > endTime, "Resolution time must be after end time");

        usdc.transferFrom(msg.sender, address(this), initialLiquidity);

        Market market = new Market(
            address(usdc),
            name,
            description,
            endTime,
            resolutionTime,
            feeTo
        );

        usdc.approve(address(market), initialLiquidity);

        market.addInitialLiquidity(initialLiquidity);

        markets.push(address(market));
        uint256 index = markets.length - 1;

        emit MarketCreated(address(market), index, name);

        return address(market);
    }

    function getMarkets() external view returns (address[] memory) {
        return markets;
    }

    function getMarketCount() external view returns (uint256) {
        return markets.length;
    }

    function setFeeTo(address _feeTo) external onlyOwner {
        feeTo = _feeTo;
    }

    function resolveMarket(address marketAddress, bool _outcome) external onlyOwner {
        Market(marketAddress).resolve(_outcome);
    }
}
