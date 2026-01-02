import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const address = "0xd24b2bca1e0b58a2eae5b1184871219f9a8ee944";
const key = `user:${address}:balance`;

// Yanlış değerleri sıfırla
const updates = {
  btc: 0,
  xrp: 0,
  sol: 0,
  eth: 0,
};

await redis.hset(key, updates);
console.log("✅ Balance fixed:", updates);

// Doğrula
const balance = await redis.hgetall(key);
console.log("New balance:", balance);
