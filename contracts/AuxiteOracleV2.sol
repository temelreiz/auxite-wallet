// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AuxiteOracleV2
 * @notice Simple price oracle for Auxite metal tokens
 * @dev Stores prices in E6 format (6 decimal places)
 *      Metal prices are stored as USD per KILOGRAM
 *      ETH price is stored as USD per ETH
 */
contract AuxiteOracleV2 {
    address public owner;

    // Metal ID hashes (keccak256 of metal name)
    bytes32 public constant GOLD_ID = keccak256("GOLD");
    bytes32 public constant SILVER_ID = keccak256("SILVER");
    bytes32 public constant PLATINUM_ID = keccak256("PLATINUM");
    bytes32 public constant PALLADIUM_ID = keccak256("PALLADIUM");

    // Prices in E6 format (multiply by 1e6)
    // Metal prices: USD per KILOGRAM * 1e6
    // ETH price: USD per ETH * 1e6
    mapping(bytes32 => uint256) public pricesPerKgE6;
    uint256 public ethPriceE6;

    // Last update timestamp
    uint256 public lastUpdated;

    // Events
    event PriceUpdated(bytes32 indexed metalId, uint256 pricePerKgE6, uint256 timestamp);
    event ETHPriceUpdated(uint256 priceE6, uint256 timestamp);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "AuxiteOracle: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        lastUpdated = block.timestamp;

        // Set initial prices (approximate values)
        // Gold: ~$95,000/kg ($95/gram)
        pricesPerKgE6[GOLD_ID] = 95000_000000;
        // Silver: ~$1,000/kg ($1/gram)
        pricesPerKgE6[SILVER_ID] = 1000_000000;
        // Platinum: ~$32,000/kg ($32/gram)
        pricesPerKgE6[PLATINUM_ID] = 32000_000000;
        // Palladium: ~$30,000/kg ($30/gram)
        pricesPerKgE6[PALLADIUM_ID] = 30000_000000;
        // ETH: ~$2,400/ETH
        ethPriceE6 = 2400_000000;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRICE GETTERS (called by token contracts)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get metal price per kilogram in E6 format
     * @param metalId The metal identifier (keccak256 hash)
     * @return priceE6 Price in USD per KG * 1e6
     */
    function getBasePerKgE6(bytes32 metalId) external view returns (uint256) {
        uint256 price = pricesPerKgE6[metalId];
        require(price > 0, "AuxiteOracle: price not set");
        return price;
    }

    /**
     * @notice Get ETH price in E6 format
     * @return ETH price in USD * 1e6
     */
    function getETHPriceE6() external view returns (uint256) {
        require(ethPriceE6 > 0, "AuxiteOracle: ETH price not set");
        return ethPriceE6;
    }

    /**
     * @notice Get metal price (alias for compatibility)
     */
    function getPrice(bytes32 metalId) external view returns (uint256) {
        return pricesPerKgE6[metalId];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRICE SETTERS (owner only)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Update metal price
     * @param metalId The metal identifier
     * @param pricePerKgE6 Price in USD per KG * 1e6
     */
    function updatePrice(bytes32 metalId, uint256 pricePerKgE6) external onlyOwner {
        require(pricePerKgE6 > 0, "AuxiteOracle: invalid price");
        pricesPerKgE6[metalId] = pricePerKgE6;
        lastUpdated = block.timestamp;
        emit PriceUpdated(metalId, pricePerKgE6, block.timestamp);
    }

    /**
     * @notice Update ETH price
     * @param newPriceE6 ETH price in USD * 1e6
     */
    function updateETHPrice(uint256 newPriceE6) external onlyOwner {
        require(newPriceE6 > 0, "AuxiteOracle: invalid price");
        ethPriceE6 = newPriceE6;
        lastUpdated = block.timestamp;
        emit ETHPriceUpdated(newPriceE6, block.timestamp);
    }

    /**
     * @notice Batch update all prices
     * @param goldE6 Gold price per KG in E6
     * @param silverE6 Silver price per KG in E6
     * @param platinumE6 Platinum price per KG in E6
     * @param palladiumE6 Palladium price per KG in E6
     * @param ethE6 ETH price in E6
     */
    function updateAllPrices(
        uint256 goldE6,
        uint256 silverE6,
        uint256 platinumE6,
        uint256 palladiumE6,
        uint256 ethE6
    ) external onlyOwner {
        if (goldE6 > 0) pricesPerKgE6[GOLD_ID] = goldE6;
        if (silverE6 > 0) pricesPerKgE6[SILVER_ID] = silverE6;
        if (platinumE6 > 0) pricesPerKgE6[PLATINUM_ID] = platinumE6;
        if (palladiumE6 > 0) pricesPerKgE6[PALLADIUM_ID] = palladiumE6;
        if (ethE6 > 0) ethPriceE6 = ethE6;
        lastUpdated = block.timestamp;
    }

    /**
     * @notice Set manual price (alias for updatePrice)
     */
    function setManualPrice(bytes32 metalId, uint256 priceE6) external onlyOwner {
        pricesPerKgE6[metalId] = priceE6;
        lastUpdated = block.timestamp;
        emit PriceUpdated(metalId, priceE6, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL (for compatibility with AccessControl interface)
    // ═══════════════════════════════════════════════════════════════════════

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    function hasRole(bytes32 role, address account) external view returns (bool) {
        if (role == DEFAULT_ADMIN_ROLE || role == ORACLE_ROLE) {
            return account == owner;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OWNERSHIP
    // ═══════════════════════════════════════════════════════════════════════

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AuxiteOracle: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // VIEW HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Get all current prices
     */
    function getAllPrices() external view returns (
        uint256 gold,
        uint256 silver,
        uint256 platinum,
        uint256 palladium,
        uint256 eth
    ) {
        return (
            pricesPerKgE6[GOLD_ID],
            pricesPerKgE6[SILVER_ID],
            pricesPerKgE6[PLATINUM_ID],
            pricesPerKgE6[PALLADIUM_ID],
            ethPriceE6
        );
    }

    /**
     * @notice Calculate price per gram in E6
     */
    function getPricePerGramE6(bytes32 metalId) external view returns (uint256) {
        return pricesPerKgE6[metalId] / 1000;
    }
}
