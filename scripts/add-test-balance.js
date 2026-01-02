const { Redis } = require("@upstash/redis");

// Use Upstash Redis (same as the API)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Test with a known wallet address - replace with your test wallet
const TEST_WALLET = process.argv[2] || "0x742d35Cc6634C0532925a3b844Bc9e7595f5bE21";

async function main() {
  const normalizedAddress = TEST_WALLET.toLowerCase();
  const balanceKey = `user:${normalizedAddress}:balance`;
  
  console.log("=== Adding Test Balance ===");
  console.log("Wallet:", normalizedAddress);
  
  // Add balances
  const balances = {
    auxg: 100,    // 100 grams gold
    auxs: 1000,   // 1000 grams silver
    auxpt: 50,    // 50 grams platinum
    auxpd: 50,    // 50 grams palladium
    auxm: 5000,   // 5000 AUXM
    eth: 1.5,     // 1.5 ETH
    usdt: 10000,  // 10000 USDT
    btc: 0.1,     // 0.1 BTC
  };
  
  await redis.hset(balanceKey, balances);
  
  // Verify
  const stored = await redis.hgetall(balanceKey);
  console.log("\n✅ Balances set:");
  for (const [token, amount] of Object.entries(stored || {})) {
    console.log(`  ${token.toUpperCase()}: ${amount}`);
  }
}

main().catch(console.error);
