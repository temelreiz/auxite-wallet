#!/usr/bin/env node
/**
 * UPDATE TOKEN ORACLES - BASE MAINNET
 * ====================================
 * Tüm metal token contract'larının oracle adresini günceller
 *
 * Usage: node scripts/update-token-oracles.js
 */

const { ethers } = require("ethers");
require('dotenv').config({ path: '.env.local' });

const CONFIG = {
  RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org",
  PRIVATE_KEY: process.env.HOT_WALLET_ETH_PRIVATE_KEY,

  // New Oracle V2 address
  NEW_ORACLE: "0x585314943599C810698E3263aE9F9ec4C1C25Ff2",

  // Token contracts
  TOKENS: {
    AUXG: "0x390164702040B509A3D752243F92C2Ac0318989D",
    AUXS: "0x82F6EB8Ba5C84c8Fd395b25a7A40ade08F0868aa",
    AUXPT: "0x119de594170b68561b1761ae1246C5154F94705d",
    AUXPD: "0xe051B2603617277Ab50C509F5A38C16056C1C908",
  },
};

const TOKEN_ABI = [
  "function oracle() view returns (address)",
  "function setOracle(address newOracle) external",
  "function getPrice() view returns (uint256 askWeiPerGram, uint256 bidWeiPerGram)",
];

async function main() {
  console.log("═".repeat(60));
  console.log("🔧 UPDATE TOKEN ORACLES - BASE MAINNET");
  console.log("═".repeat(60));

  if (!CONFIG.PRIVATE_KEY) {
    throw new Error("HOT_WALLET_ETH_PRIVATE_KEY not set");
  }

  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);

  console.log(`\n📍 Wallet: ${wallet.address}`);
  console.log(`📍 New Oracle: ${CONFIG.NEW_ORACLE}`);

  for (const [symbol, address] of Object.entries(CONFIG.TOKENS)) {
    console.log(`\n─────────────────────────────────────────`);
    console.log(`🪙 ${symbol} (${address})`);
    console.log(`─────────────────────────────────────────`);

    const contract = new ethers.Contract(address, TOKEN_ABI, wallet);

    try {
      // Check current oracle
      const currentOracle = await contract.oracle();
      console.log(`   Current Oracle: ${currentOracle}`);

      if (currentOracle.toLowerCase() === CONFIG.NEW_ORACLE.toLowerCase()) {
        console.log(`   ✅ Already using new Oracle!`);
        continue;
      }

      // Update oracle
      console.log(`   ⏳ Updating oracle...`);
      const tx = await contract.setOracle(CONFIG.NEW_ORACLE);
      console.log(`   TX: ${tx.hash}`);

      await tx.wait();
      console.log(`   ✅ Oracle updated!`);

      // Verify
      const newOracle = await contract.oracle();
      console.log(`   New Oracle: ${newOracle}`);

      // Test getPrice
      try {
        const [ask, bid] = await contract.getPrice();
        const ethPrice = 2340; // Approximate
        console.log(`   Price check: ask=${ethers.formatEther(ask)} ETH, bid=${ethers.formatEther(bid)} ETH`);
        console.log(`   USD/gram: ~$${(Number(ethers.formatEther(ask)) * ethPrice).toFixed(2)}`);
      } catch (e) {
        console.log(`   Price check error: ${e.message.substring(0, 50)}`);
      }

      // Wait between transactions
      await new Promise(r => setTimeout(r, 2000));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message.substring(0, 100)}`);
    }
  }

  console.log("\n═".repeat(60));
  console.log("✅ DONE!");
  console.log("═".repeat(60));
}

main().catch(error => {
  console.error("Fatal:", error);
  process.exit(1);
});
