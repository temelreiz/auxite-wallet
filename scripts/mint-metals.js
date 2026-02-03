#!/usr/bin/env node
/**
 * AUXITE METAL MINT SCRIPT - BASE MAINNET
 * ========================================
 * Hot wallet'a test metalleri mint eder
 *
 * Usage: node scripts/mint-metals.js
 */

const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

// ═══════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  PRIVATE_KEY: process.env.HOT_WALLET_ETH_PRIVATE_KEY,

  // V8 Contract Addresses (Base Mainnet)
  CONTRACTS: {
    AUXG: "0x390164702040B509A3D752243F92C2Ac0318989D",
    AUXS: "0x82F6EB8Ba5C84c8Fd395b25a7A40ade08F0868aa",
    AUXPT: "0x119de594170b68561b1761ae1246C5154F94705d",
    AUXPD: "0xe051B2603617277Ab50C509F5A38C16056C1C908",
  },
  ORACLE: "0xbB109166062D718756D0389F4bA2aB02A36F296c",
};

// V8 Token ABI
const TOKEN_ABI = [
  "function buy(uint256 grams, string calldata custodian) external payable returns (uint256)",
  "function calculateBuyCost(uint256 grams) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function getPrice() view returns (uint256 askWeiPerGram, uint256 bidWeiPerGram)",
];

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

async function getBalances(provider, wallet, contracts) {
  console.log("\n📊 Current Balances:");
  console.log("─".repeat(50));

  // ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`   ETH: ${ethers.formatEther(ethBalance)} ETH`);

  // Token balances
  for (const [symbol, address] of Object.entries(contracts)) {
    try {
      const contract = new ethers.Contract(address, TOKEN_ABI, provider);
      const balance = await contract.balanceOf(wallet.address);
      const decimals = await contract.decimals();
      console.log(`   ${symbol}: ${ethers.formatUnits(balance, decimals)} grams`);
    } catch (e) {
      console.log(`   ${symbol}: Error - ${e.message}`);
    }
  }
  console.log("─".repeat(50));

  return ethBalance;
}

async function mintMetal(wallet, tokenAddress, symbol, grams) {
  const provider = wallet.provider;
  const contract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);

  console.log(`\n🔶 Minting ${grams}g ${symbol}...`);

  try {
    // Calculate cost
    const costWei = await contract.calculateBuyCost(grams);
    const costETH = ethers.formatEther(costWei);
    console.log(`   Cost: ${costETH} ETH`);

    // Check balance
    const balance = await provider.getBalance(wallet.address);

    // Estimate gas
    const gasEstimate = await contract.buy.estimateGas(grams, "Zurich", { value: costWei });
    const feeData = await provider.getFeeData();
    const gasCost = gasEstimate * (feeData.maxFeePerGas || ethers.parseUnits("1", "gwei"));

    const totalNeeded = costWei + gasCost;

    console.log(`   Gas estimate: ${gasEstimate.toString()}`);
    console.log(`   Total needed: ${ethers.formatEther(totalNeeded)} ETH`);
    console.log(`   Available: ${ethers.formatEther(balance)} ETH`);

    if (balance < totalNeeded) {
      console.log(`   ❌ Insufficient ETH! Need ${ethers.formatEther(totalNeeded - balance)} more ETH`);
      return false;
    }

    // Execute mint
    const tx = await contract.buy(grams, "Zurich", {
      value: costWei,
      gasLimit: gasEstimate + 50000n,
    });

    console.log(`   ⏳ TX: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═".repeat(50));
  console.log("🚀 AUXITE METAL MINT SCRIPT - BASE MAINNET");
  console.log("═".repeat(50));

  if (!CONFIG.PRIVATE_KEY) {
    throw new Error("HOT_WALLET_ETH_PRIVATE_KEY not set in .env.local");
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

  console.log(`\n📍 Hot Wallet: ${wallet.address}`);
  console.log(`📍 Network: Base Mainnet`);

  // Show current balances
  const ethBalance = await getBalances(provider, wallet, CONFIG.CONTRACTS);

  // Check if we have enough ETH
  const minETH = ethers.parseEther("0.01"); // Minimum 0.01 ETH needed
  if (ethBalance < minETH) {
    console.log("\n⚠️  WARNING: Low ETH balance!");
    console.log(`   Need at least 0.01 ETH to mint metals.`);
    console.log(`   Please send ETH to: ${wallet.address}`);
    console.log(`   Current balance: ${ethers.formatEther(ethBalance)} ETH`);
    return;
  }

  // Mint amounts (small amounts for testing)
  const mintAmounts = {
    // AUXG: 1,  // 1 gram gold
    AUXS: 10, // 10 grams silver (cheapest)
    // AUXPT: 1, // 1 gram platinum
    // AUXPD: 1, // 1 gram palladium
  };

  console.log("\n📋 Mint Plan:");
  for (const [symbol, grams] of Object.entries(mintAmounts)) {
    console.log(`   ${symbol}: ${grams} gram(s)`);
  }

  // Execute mints
  for (const [symbol, grams] of Object.entries(mintAmounts)) {
    const address = CONFIG.CONTRACTS[symbol];
    if (address) {
      await mintMetal(wallet, address, symbol, grams);

      // Wait between transactions
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Show final balances
  console.log("\n📊 Final Balances:");
  await getBalances(provider, wallet, CONFIG.CONTRACTS);

  console.log("\n✅ Done!");
}

main().catch(error => {
  console.error("Fatal:", error);
  process.exit(1);
});
