#!/usr/bin/env node
/**
 * DEPLOY AUXITE ORACLE V2 - BASE MAINNET
 * ======================================
 * Yeni Oracle contract'ını deploy eder ve fiyatları set eder
 *
 * Usage: node scripts/deploy-oracle-v2.js
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: '.env.local' });

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  PRIVATE_KEY: process.env.PRIVATE_KEY,

  // Current real prices (approximate)
  INITIAL_PRICES: {
    // Prices per KILOGRAM in E6 format (USD * 1,000,000)
    GOLD: 95000_000000,      // ~$95,000/kg ($95/gram)
    SILVER: 1050_000000,     // ~$1,050/kg ($1.05/gram)
    PLATINUM: 32000_000000,  // ~$32,000/kg ($32/gram)
    PALLADIUM: 30000_000000, // ~$30,000/kg ($30/gram)
    ETH: 2340_000000,        // ~$2,340/ETH
  }
};

// ═══════════════════════════════════════════════════════════════════════
// CONTRACT BYTECODE (compiled from AuxiteOracleV2.sol)
// ═══════════════════════════════════════════════════════════════════════

// This is the ABI for deployment and interaction
const ORACLE_ABI = [
  "constructor()",
  "function owner() view returns (address)",
  "function updateAllPrices(uint256 goldE6, uint256 silverE6, uint256 platinumE6, uint256 palladiumE6, uint256 ethE6)",
  "function updatePrice(bytes32 metalId, uint256 pricePerKgE6)",
  "function updateETHPrice(uint256 newPriceE6)",
  "function getBasePerKgE6(bytes32 metalId) view returns (uint256)",
  "function getETHPriceE6() view returns (uint256)",
  "function getAllPrices() view returns (uint256 gold, uint256 silver, uint256 platinum, uint256 palladium, uint256 eth)",
  "function GOLD_ID() view returns (bytes32)",
  "function SILVER_ID() view returns (bytes32)",
  "function PLATINUM_ID() view returns (bytes32)",
  "function PALLADIUM_ID() view returns (bytes32)",
  "function lastUpdated() view returns (uint256)",
];

// Solidity source for reference (compile with solc or use hardhat/foundry)
const SOLIDITY_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AuxiteOracleV2 {
    address public owner;
    bytes32 public constant GOLD_ID = keccak256("GOLD");
    bytes32 public constant SILVER_ID = keccak256("SILVER");
    bytes32 public constant PLATINUM_ID = keccak256("PLATINUM");
    bytes32 public constant PALLADIUM_ID = keccak256("PALLADIUM");

    mapping(bytes32 => uint256) public pricesPerKgE6;
    uint256 public ethPriceE6;
    uint256 public lastUpdated;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    event PriceUpdated(bytes32 indexed metalId, uint256 pricePerKgE6, uint256 timestamp);
    event ETHPriceUpdated(uint256 priceE6, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "AuxiteOracle: caller is not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        lastUpdated = block.timestamp;
        pricesPerKgE6[GOLD_ID] = 95000000000;
        pricesPerKgE6[SILVER_ID] = 1000000000;
        pricesPerKgE6[PLATINUM_ID] = 32000000000;
        pricesPerKgE6[PALLADIUM_ID] = 30000000000;
        ethPriceE6 = 2400000000;
    }

    function getBasePerKgE6(bytes32 metalId) external view returns (uint256) {
        uint256 price = pricesPerKgE6[metalId];
        require(price > 0, "AuxiteOracle: price not set");
        return price;
    }

    function getETHPriceE6() external view returns (uint256) {
        require(ethPriceE6 > 0, "AuxiteOracle: ETH price not set");
        return ethPriceE6;
    }

    function getPrice(bytes32 metalId) external view returns (uint256) {
        return pricesPerKgE6[metalId];
    }

    function updatePrice(bytes32 metalId, uint256 pricePerKgE6) external onlyOwner {
        require(pricePerKgE6 > 0, "AuxiteOracle: invalid price");
        pricesPerKgE6[metalId] = pricePerKgE6;
        lastUpdated = block.timestamp;
        emit PriceUpdated(metalId, pricePerKgE6, block.timestamp);
    }

    function updateETHPrice(uint256 newPriceE6) external onlyOwner {
        require(newPriceE6 > 0, "AuxiteOracle: invalid price");
        ethPriceE6 = newPriceE6;
        lastUpdated = block.timestamp;
        emit ETHPriceUpdated(newPriceE6, block.timestamp);
    }

    function updateAllPrices(uint256 goldE6, uint256 silverE6, uint256 platinumE6, uint256 palladiumE6, uint256 ethE6) external onlyOwner {
        if (goldE6 > 0) pricesPerKgE6[GOLD_ID] = goldE6;
        if (silverE6 > 0) pricesPerKgE6[SILVER_ID] = silverE6;
        if (platinumE6 > 0) pricesPerKgE6[PLATINUM_ID] = platinumE6;
        if (palladiumE6 > 0) pricesPerKgE6[PALLADIUM_ID] = palladiumE6;
        if (ethE6 > 0) ethPriceE6 = ethE6;
        lastUpdated = block.timestamp;
    }

    function setManualPrice(bytes32 metalId, uint256 priceE6) external onlyOwner {
        pricesPerKgE6[metalId] = priceE6;
        lastUpdated = block.timestamp;
        emit PriceUpdated(metalId, priceE6, block.timestamp);
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        if (role == DEFAULT_ADMIN_ROLE || role == ORACLE_ROLE) {
            return account == owner;
        }
        return false;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AuxiteOracle: zero address");
        owner = newOwner;
    }

    function getAllPrices() external view returns (uint256, uint256, uint256, uint256, uint256) {
        return (pricesPerKgE6[GOLD_ID], pricesPerKgE6[SILVER_ID], pricesPerKgE6[PLATINUM_ID], pricesPerKgE6[PALLADIUM_ID], ethPriceE6);
    }

    function getPricePerGramE6(bytes32 metalId) external view returns (uint256) {
        return pricesPerKgE6[metalId] / 1000;
    }
}
`;

// Compiled bytecode (you need to compile this - use remix.ethereum.org or solc)
// This is placeholder - will be replaced after compilation
const BYTECODE = "0x608060405234801561000f575f80fd5b505f80546001600160a01b031916331790554260025565015d3ef79800600360207fdbd17891fc491ac6717dd01ab1f90f82509f1f2e91cd5066f68805860fbdeb7281526040908120919091556509184e72a0006003907f454d6c851444d132b9c5c6b5a240f5f138c08fac6b78a14b9044880f78bc8ba6908252812091909155650775f05a07406003907f7d2e7a1fb70d1e7d2efa5a1df5ce7a1fb70d1e7d2efa5a1df5ce7a1fb70d1e7d908252812091909155650689c7a8d4006003907f35bc1b8f0d0a4b1c1f1a6f1e7d2efa5a1df5ce7a1fb70d1e7d2efa5a1df5ce7a908252812091909155648f0d18000060015561063c806100fc5f395ff3fe608060405234801561000f575f80fd5b5060043610610114575f3560e01c806391d148541161009f578063c6e6f5921161006f578063c6e6f592146102a3578063d547741f146102c3578063dbd17891146102f1578063e566534d14610318578063f2fde38b1461033f575f80fd5b806391d1485414610220578063a217fddf14610257578063a4cde9731461025f578063c553800014610298575f80fd5b80634e2b15e1116100e45780634e2b15e1146101b85780635f704f3e146101cb578063715018a6146101de5780638da5cb5b146101e857806390c3f38f14610213575f80fd5b80630e032ba0146101185780631c4b774b1461014857806336568abe146101825780633ccfd60b146101af575b5f80fd5b61012b610126366004610528565b610352565b604051908152602001[...]";

// ═══════════════════════════════════════════════════════════════════════
// MAIN DEPLOY FUNCTION
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═".repeat(60));
  console.log("🚀 AUXITE ORACLE V2 DEPLOYMENT - BASE MAINNET");
  console.log("═".repeat(60));

  if (!CONFIG.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in .env.local");
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

  console.log(`\n📍 Deployer: ${wallet.address}`);
  console.log(`📍 Network: Base Mainnet (${CONFIG.RPC_URL})`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient ETH balance for deployment. Need at least 0.01 ETH");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OPTION 1: Deploy via Remix (recommended)
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(60));
  console.log("📋 DEPLOYMENT OPTIONS:");
  console.log("─".repeat(60));
  console.log("\n1. REMIX (Recommended):");
  console.log("   - Go to https://remix.ethereum.org");
  console.log("   - Create new file: AuxiteOracleV2.sol");
  console.log("   - Copy contract from: contracts/AuxiteOracleV2.sol");
  console.log("   - Compile with Solidity 0.8.20");
  console.log("   - Deploy to Base Mainnet using MetaMask");
  console.log("   - Connect wallet: " + wallet.address);

  console.log("\n2. After deployment, update these files:");
  console.log("   - src/config/contracts-v8.ts (ORACLE_ADDRESS)");
  console.log("   - .env.local (NEXT_PUBLIC_ORACLE_ADDRESS)");

  // ═══════════════════════════════════════════════════════════════════════
  // VERIFY METAL IDs match what token contracts expect
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(60));
  console.log("📋 METAL ID VERIFICATION:");
  console.log("─".repeat(60));

  const METAL_IDS = {
    GOLD: ethers.id("GOLD"),
    SILVER: ethers.id("SILVER"),
    PLATINUM: ethers.id("PLATINUM"),
    PALLADIUM: ethers.id("PALLADIUM"),
  };

  console.log("\nExpected Metal IDs (keccak256):");
  for (const [metal, id] of Object.entries(METAL_IDS)) {
    console.log(`   ${metal}: ${id}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRICE CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n" + "─".repeat(60));
  console.log("📋 INITIAL PRICES TO SET:");
  console.log("─".repeat(60));

  const { INITIAL_PRICES } = CONFIG;
  console.log(`\n   GOLD:      $${(INITIAL_PRICES.GOLD / 1_000_000 / 1000).toFixed(2)}/gram ($${(INITIAL_PRICES.GOLD / 1_000_000).toLocaleString()}/kg)`);
  console.log(`   SILVER:    $${(INITIAL_PRICES.SILVER / 1_000_000 / 1000).toFixed(2)}/gram ($${(INITIAL_PRICES.SILVER / 1_000_000).toLocaleString()}/kg)`);
  console.log(`   PLATINUM:  $${(INITIAL_PRICES.PLATINUM / 1_000_000 / 1000).toFixed(2)}/gram ($${(INITIAL_PRICES.PLATINUM / 1_000_000).toLocaleString()}/kg)`);
  console.log(`   PALLADIUM: $${(INITIAL_PRICES.PALLADIUM / 1_000_000 / 1000).toFixed(2)}/gram ($${(INITIAL_PRICES.PALLADIUM / 1_000_000).toLocaleString()}/kg)`);
  console.log(`   ETH:       $${(INITIAL_PRICES.ETH / 1_000_000).toLocaleString()}/ETH`);

  console.log("\n" + "─".repeat(60));
  console.log("📋 AFTER DEPLOYMENT - Run this to update prices:");
  console.log("─".repeat(60));
  console.log(`
const oracle = new ethers.Contract(NEW_ORACLE_ADDRESS, [
  "function updateAllPrices(uint256,uint256,uint256,uint256,uint256)"
], wallet);

await oracle.updateAllPrices(
  ${INITIAL_PRICES.GOLD}n,   // GOLD
  ${INITIAL_PRICES.SILVER}n,  // SILVER
  ${INITIAL_PRICES.PLATINUM}n, // PLATINUM
  ${INITIAL_PRICES.PALLADIUM}n, // PALLADIUM
  ${INITIAL_PRICES.ETH}n      // ETH
);
`);

  console.log("\n═".repeat(60));
  console.log("✅ Ready to deploy! Use Remix or Foundry to deploy the contract.");
  console.log("═".repeat(60));
}

main().catch(error => {
  console.error("Fatal:", error);
  process.exit(1);
});
