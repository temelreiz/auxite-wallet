// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleOracle {
    address public owner;
    mapping(bytes32 => uint256) public prices;
    uint256 public ethPriceUsd;
    
    bytes32 public constant GOLD_ID = 0x3496e2e73c4d42b75d702e60d9e48102720b8691234415963a5a857b86425d07;
    bytes32 public constant SILVER_ID = 0xee566534db4be977568dfe4ffe67466f5f29880d065f02314dd9f131ef9fb0ae;
    
    constructor() {
        owner = msg.sender;
        prices[GOLD_ID] = 9500000000;
        prices[SILVER_ID] = 110000000;
        ethPriceUsd = 350000000000;
    }
    
    function getLatestPrice(bytes32 tokenId) external view returns (uint256) {
        return prices[tokenId];
    }
    
    function getEthPrice() external view returns (uint256) {
        return ethPriceUsd;
    }
    
    function c551b800() external view returns (uint256) {
        return ethPriceUsd;
    }
    
    function setPrice(bytes32 tokenId, uint256 price) external {
        require(msg.sender == owner, "Not owner");
        prices[tokenId] = price;
    }
    
    function setEthPrice(uint256 price) external {
        require(msg.sender == owner, "Not owner");
        ethPriceUsd = price;
    }
    
    function updatePrice(bytes32 tokenId, uint256 price) external {
        require(msg.sender == owner, "Not owner");
        prices[tokenId] = price;
    }
}
