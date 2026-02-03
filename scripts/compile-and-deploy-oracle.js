#!/usr/bin/env node
/**
 * COMPILE AND DEPLOY AUXITE ORACLE V2 - BASE MAINNET
 * ===================================================
 * Solc ile compile edip Base Mainnet'e deploy eder
 *
 * Usage: node scripts/compile-and-deploy-oracle.js
 */

const { ethers } = require("ethers");
const solc = require("solc");
const fs = require("fs");
const path = require("path");
require('dotenv').config({ path: '.env.local' });

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  // Use HOT_WALLET for deployment since PRIVATE_KEY wallet has no ETH
  PRIVATE_KEY: process.env.HOT_WALLET_ETH_PRIVATE_KEY || process.env.PRIVATE_KEY,
};

// ═══════════════════════════════════════════════════════════════════════
// CONTRACT SOURCE
// ═══════════════════════════════════════════════════════════════════════

const CONTRACT_SOURCE = `
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
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "AuxiteOracle: not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        lastUpdated = block.timestamp;
        // Initial prices (will be updated via cron)
        pricesPerKgE6[GOLD_ID] = 95000000000;      // $95,000/kg
        pricesPerKgE6[SILVER_ID] = 1050000000;     // $1,050/kg
        pricesPerKgE6[PLATINUM_ID] = 32000000000;  // $32,000/kg
        pricesPerKgE6[PALLADIUM_ID] = 30000000000; // $30,000/kg
        ethPriceE6 = 2340000000;                   // $2,340/ETH
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
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

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

    function getPricePerGramE6(bytes32 metalId) external view returns (uint256) {
        return pricesPerKgE6[metalId] / 1000;
    }
}
`;

// ═══════════════════════════════════════════════════════════════════════
// COMPILE
// ═══════════════════════════════════════════════════════════════════════

function compileContract() {
  console.log("📦 Compiling contract...");

  const input = {
    language: "Solidity",
    sources: {
      "AuxiteOracleV2.sol": {
        content: CONTRACT_SOURCE,
      },
    },
    settings: {
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"],
        },
      },
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const errors = output.errors.filter(e => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:");
      errors.forEach(e => console.error(e.formattedMessage));
      throw new Error("Compilation failed");
    }
    // Show warnings
    output.errors.forEach(e => {
      if (e.severity === "warning") {
        console.warn("⚠️", e.message);
      }
    });
  }

  const contract = output.contracts["AuxiteOracleV2.sol"]["AuxiteOracleV2"];
  console.log("✅ Compilation successful!");

  return {
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// DEPLOY
// ═══════════════════════════════════════════════════════════════════════

async function deploy() {
  console.log("═".repeat(60));
  console.log("🚀 AUXITE ORACLE V2 DEPLOYMENT - BASE MAINNET");
  console.log("═".repeat(60));

  if (!CONFIG.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY not set in .env.local");
  }

  // Compile
  const { abi, bytecode } = compileContract();

  // Connect to network
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

  console.log(`\n📍 Deployer: ${wallet.address}`);
  console.log(`📍 Network: Base Mainnet`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.005")) {
    throw new Error("Insufficient ETH balance. Need at least 0.005 ETH for deployment");
  }

  // Estimate gas
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployTx = await factory.getDeployTransaction();
  const gasEstimate = await provider.estimateGas(deployTx);
  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.maxFeePerGas || ethers.parseUnits("1", "gwei"));

  console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
  console.log(`💰 Estimated cost: ${ethers.formatEther(gasCost)} ETH`);

  // Deploy
  console.log("\n🚀 Deploying contract...");
  const contract = await factory.deploy();

  console.log(`📄 TX Hash: ${contract.deploymentTransaction().hash}`);
  console.log("⏳ Waiting for confirmation...");

  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log(`\n✅ Contract deployed at: ${deployedAddress}`);

  // Verify deployment
  console.log("\n📊 Verifying deployment...");

  const oracle = new ethers.Contract(deployedAddress, abi, provider);

  const owner = await oracle.owner();
  console.log(`   Owner: ${owner}`);

  const [gold, silver, platinum, palladium, eth] = await oracle.getAllPrices();
  console.log(`   GOLD:      $${(Number(gold) / 1_000_000 / 1000).toFixed(2)}/gram`);
  console.log(`   SILVER:    $${(Number(silver) / 1_000_000 / 1000).toFixed(2)}/gram`);
  console.log(`   PLATINUM:  $${(Number(platinum) / 1_000_000 / 1000).toFixed(2)}/gram`);
  console.log(`   PALLADIUM: $${(Number(palladium) / 1_000_000 / 1000).toFixed(2)}/gram`);
  console.log(`   ETH:       $${(Number(eth) / 1_000_000).toFixed(2)}/ETH`);

  // Save deployment info
  const deploymentInfo = {
    address: deployedAddress,
    deployer: wallet.address,
    network: "base-mainnet",
    chainId: 8453,
    txHash: contract.deploymentTransaction().hash,
    timestamp: new Date().toISOString(),
    abi: abi,
  };

  const deploymentPath = path.join(__dirname, "../deployments/oracle-v2.json");
  fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📁 Deployment info saved to: ${deploymentPath}`);

  // Instructions
  console.log("\n" + "═".repeat(60));
  console.log("📋 NEXT STEPS:");
  console.log("═".repeat(60));
  console.log(`
1. Update .env.local:
   NEXT_PUBLIC_ORACLE_ADDRESS=${deployedAddress}

2. Update src/config/contracts-v8.ts:
   export const ORACLE_ADDRESS = "${deployedAddress}";

3. Update token contracts to use new oracle (if needed):
   - Call setOracle(${deployedAddress}) on each token contract

4. Deploy to Vercel:
   vercel --prod
`);

  console.log("═".repeat(60));
  console.log("✅ DEPLOYMENT COMPLETE!");
  console.log("═".repeat(60));

  return deployedAddress;
}

// Run
deploy().catch(error => {
  console.error("\n❌ Deployment failed:", error.message);
  process.exit(1);
});
