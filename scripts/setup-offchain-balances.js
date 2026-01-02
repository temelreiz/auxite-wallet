const Redis = require("ioredis");

const redis = new Redis({
  host: "localhost",
  port: 6379,
});

const HOT_WALLET = "0xbE8993001F475AF12eFC4185d96859D0b191ABa9";

async function main() {
  console.log("=== Setting Up Off-Chain Balances ===\n");
  
  // Give hot wallet initial balances for transfers
  const tokens = {
    "AUXG": 1000,   // 1000 grams gold
    "AUXS": 10000,  // 10000 grams silver
    "AUXPT": 500,   // 500 grams platinum
    "AUXPD": 500,   // 500 grams palladium
  };
  
  for (const [token, amount] of Object.entries(tokens)) {
    const key = `balance:${HOT_WALLET.toLowerCase()}:${token}`;
    await redis.set(key, amount.toString());
    console.log(`✅ ${token}: ${amount} grams`);
  }
  
  // Verify
  console.log("\n=== Verifying Balances ===");
  for (const token of Object.keys(tokens)) {
    const key = `balance:${HOT_WALLET.toLowerCase()}:${token}`;
    const balance = await redis.get(key);
    console.log(`${token}: ${balance} grams`);
  }
  
  await redis.quit();
  console.log("\n✅ Hot wallet funded for off-chain transfers!");
}

main().catch(console.error);
