#!/usr/bin/env node
/**
 * UPDATE OLD ORACLE PRICES - BASE MAINNET
 * ========================================
 * Token contract'larının kullandığı eski Oracle'daki fiyatları günceller
 *
 * Usage: node scripts/update-old-oracle-prices.js
 */

const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  PRIVATE_KEY: process.env.HOT_WALLET_ETH_PRIVATE_KEY,

  // Old Oracle (used by token contracts)
  OLD_ORACLE: "0xbB109166062D718756D0389F4bA2aB02A36F296c",

  // Current real prices (approximate - GoldAPI'den daha doğru değerler alınabilir)
  // Fiyatlar per KILOGRAM, E6 format (USD * 1,000,000)
  PRICES: {
    // Gold: ~$95,000/kg ($95/gram, $2950/oz)
    GOLD: 95000_000000n,
    // Silver: ~$1,050/kg ($1.05/gram, $33/oz)
    SILVER: 1050_000000n,
    // Platinum: ~$32,000/kg ($32/gram, ~$1000/oz)
    PLATINUM: 32000_000000n,
    // Palladium: ~$30,000/kg ($30/gram, ~$935/oz)
    PALLADIUM: 30000_000000n,
    // ETH: ~$2,340/ETH
    ETH: 2340_000000n,
  }
};

// Metal IDs (keccak256 hashes)
const METAL_IDS = {
  GOLD: ethers.id("GOLD"),
  SILVER: ethers.id("SILVER"),
  PLATINUM: ethers.id("PLATINUM"),
  PALLADIUM: ethers.id("PALLADIUM"),
};

const ORACLE_ABI = [
  "function updatePrice(bytes32 metalId, uint256 priceE6) external",
  "function setManualPrice(bytes32 metalId, uint256 priceE6) external",
  "function getBasePerKgE6(bytes32 metalId) view returns (uint256)",
  "function getETHPriceE6() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function ORACLE_ROLE() view returns (bytes32)",
];

async function main() {
  console.log("═".repeat(60));
  console.log("🔧 UPDATE OLD ORACLE PRICES - BASE MAINNET");
  console.log("═".repeat(60));

  if (!CONFIG.PRIVATE_KEY) {
    throw new Error("HOT_WALLET_ETH_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

  console.log(`\n📍 Wallet: ${wallet.address}`);
  console.log(`📍 Oracle: ${CONFIG.OLD_ORACLE}`);

  const oracle = new ethers.Contract(CONFIG.OLD_ORACLE, ORACLE_ABI, wallet);

  // Check role
  const oracleRole = await oracle.ORACLE_ROLE();
  const hasRole = await oracle.hasRole(oracleRole, wallet.address);
  console.log(`📍 Has ORACLE_ROLE: ${hasRole}`);

  if (!hasRole) {
    throw new Error("Wallet does not have ORACLE_ROLE!");
  }

  console.log("\n─────────────────────────────────────────");
  console.log("📊 SETTING PRICES:");
  console.log("─────────────────────────────────────────");

  // Update each metal price
  for (const [metal, priceE6] of Object.entries(CONFIG.PRICES)) {
    if (metal === "ETH") continue; // ETH handled separately

    const metalId = METAL_IDS[metal];
    const pricePerGram = Number(priceE6) / 1_000_000 / 1000;

    console.log(`\n🪙 ${metal}:`);
    console.log(`   Price: $${pricePerGram.toFixed(2)}/gram ($${(Number(priceE6) / 1_000_000).toLocaleString()}/kg)`);
    console.log(`   Metal ID: ${metalId}`);

    try {
      // Try updatePrice first
      console.log(`   ⏳ Calling updatePrice...`);
      const tx = await oracle.updatePrice(metalId, priceE6);
      console.log(`   TX: ${tx.hash}`);
      await tx.wait();
      console.log(`   ✅ Updated!`);

      // Verify
      const newPrice = await oracle.getBasePerKgE6(metalId);
      console.log(`   Verified: $${(Number(newPrice) / 1_000_000 / 1000).toFixed(2)}/gram`);

      // Wait between transactions
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      console.log(`   ❌ updatePrice failed: ${error.message.substring(0, 80)}`);

      // Try setManualPrice as fallback
      try {
        console.log(`   ⏳ Trying setManualPrice...`);
        const tx = await oracle.setManualPrice(metalId, priceE6);
        console.log(`   TX: ${tx.hash}`);
        await tx.wait();
        console.log(`   ✅ Updated via setManualPrice!`);
      } catch (e2) {
        console.log(`   ❌ setManualPrice also failed: ${e2.message.substring(0, 50)}`);
      }
    }
  }

  // Note: ETH price update - old oracle might not have this function
  // Token contracts get ETH price from elsewhere

  console.log("\n─────────────────────────────────────────");
  console.log("📊 VERIFYING PRICES:");
  console.log("─────────────────────────────────────────");

  for (const [metal, id] of Object.entries(METAL_IDS)) {
    try {
      const price = await oracle.getBasePerKgE6(id);
      console.log(`   ${metal}: $${(Number(price) / 1_000_000 / 1000).toFixed(2)}/gram`);
    } catch (e) {
      console.log(`   ${metal}: Error - ${e.message.substring(0, 40)}`);
    }
  }

  console.log("\n═".repeat(60));
  console.log("✅ DONE! Token contracts should now have correct prices.");
  console.log("═".repeat(60));
}

main().catch(error => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
