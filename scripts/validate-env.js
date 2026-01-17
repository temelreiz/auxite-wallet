// scripts/validate-env.js
// Run: node scripts/validate-env.js
// Or: npm run validate-env

require('dotenv').config({ path: '.env.local' });

const REQUIRED_VARS = {
  // App
  NEXT_PUBLIC_APP_ENV: "App environment",
  NEXT_PUBLIC_APP_CHAIN_ID: "Blockchain chain ID",

  // Security
  ADMIN_SECRET: "Admin secret (min 32 chars)",
  CRON_SECRET: "Cron authentication",

  // Database
  UPSTASH_REDIS_REST_URL: "Redis URL",
  UPSTASH_REDIS_REST_TOKEN: "Redis Token",

  // Blockchain
  SEPOLIA_RPC_URL: "Ethereum RPC URL",

  // WalletConnect
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "WalletConnect Project ID",

  // Contract Addresses
  NEXT_PUBLIC_AUXG_V8: "AUXG V8 contract",
  NEXT_PUBLIC_AUXS_V8: "AUXS V8 contract",
  NEXT_PUBLIC_AUXPT_V8: "AUXPT V8 contract",
  NEXT_PUBLIC_AUXPD_V8: "AUXPD V8 contract",
  NEXT_PUBLIC_ORACLE_V2: "Oracle V2 contract",
};

const PRODUCTION_REQUIRED = {
  // Hot Wallets
  HOT_WALLET_ETH_ADDRESS: "ETH hot wallet address",
  HOT_WALLET_ETH_PRIVATE_KEY: "ETH hot wallet key",
  HOT_WALLET_SOL_ADDRESS: "SOL hot wallet address",
  HOT_WALLET_SOL_PRIVATE_KEY: "SOL hot wallet key",
  HOT_WALLET_XRP_ADDRESS: "XRP hot wallet address",
  HOT_WALLET_XRP_SECRET: "XRP hot wallet secret",

  // Services
  SUMSUB_APP_TOKEN: "Sumsub token",
  SUMSUB_SECRET_KEY: "Sumsub secret",
  RESEND_API_KEY: "Email API key",
  NOWPAYMENTS_API_KEY: "NowPayments key",
  GOLDAPI_KEY: "Gold price API key",
};

function validate() {
  console.log("\n🔍 Environment Variables Validation\n");
  console.log("═".repeat(50));

  let errors = 0;
  let warnings = 0;
  const isProduction = process.env.NEXT_PUBLIC_APP_ENV === "production";

  // Required
  console.log("\n📋 REQUIRED:\n");
  for (const [key, desc] of Object.entries(REQUIRED_VARS)) {
    const val = process.env[key];
    if (!val) {
      console.log(`  ❌ ${key} - ${desc}`);
      errors++;
    } else if (key === "ADMIN_SECRET" && val.length < 32) {
      console.log(`  ⚠️  ${key} - Too short (min 32 chars)`);
      warnings++;
    } else {
      console.log(`  ✅ ${key}`);
    }
  }

  // Production only
  if (isProduction) {
    console.log("\n📋 PRODUCTION REQUIRED:\n");
    for (const [key, desc] of Object.entries(PRODUCTION_REQUIRED)) {
      if (!process.env[key]) {
        console.log(`  ❌ ${key} - ${desc}`);
        errors++;
      } else {
        console.log(`  ✅ ${key}`);
      }
    }
  } else {
    console.log("\n📋 PRODUCTION REQUIRED (skipped - not production):\n");
    console.log("  ℹ️  Set NEXT_PUBLIC_APP_ENV=production to check these");
  }

  // Summary
  console.log("\n" + "═".repeat(50));
  if (errors > 0) {
    console.log(`\n❌ ${errors} missing required variables\n`);
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`\n⚠️  All set, but ${warnings} warnings\n`);
  } else {
    console.log("\n✅ All environment variables configured!\n");
  }
}

validate();
