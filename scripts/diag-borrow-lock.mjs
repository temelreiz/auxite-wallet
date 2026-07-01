// Diagnostic: list borrow loans + verify collateral encumbrance (lock) per user.
// Run: node --env-file=.env.local scripts/diag-borrow-lock.mjs
import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });

const pool = await redis.hgetall("borrow:pool");
console.log("borrow:pool =", pool);

// Scan loan:* keys
let cursor = 0, loanKeys = [];
do {
  const [next, keys] = await redis.scan(cursor, { match: "loan:*", count: 200 });
  cursor = Number(next);
  loanKeys.push(...keys);
} while (cursor !== 0);

console.log(`\nFound ${loanKeys.length} loan(s):`);
for (const k of loanKeys) {
  const l = await redis.hgetall(k);
  if (!l || !l.address) continue;
  const addr = String(l.address);
  console.log(`\n${k}`);
  console.log(`  address=${addr} metal=${l.metal} collateralGrams=${l.collateralGrams} principal=${l.principalUSDC} status=${l.status}`);
  // Read encumbrance for this user+metal (both raw + lowercased key)
  for (const cand of [addr, addr.toLowerCase()]) {
    const enc = await redis.hgetall(`encumbrance:user:${cand}:${String(l.metal).toUpperCase()}`);
    if (enc && Object.keys(enc).length) {
      console.log(`  encumbrance[${cand}] = locked:${enc.locked} yielding:${enc.yielding}`);
    }
  }
  // Live balances via the same GET path
  const active = await redis.smembers(`borrow:user:${addr}:loans`);
  console.log(`  borrow:user:${addr}:loans = ${JSON.stringify(active)}`);
}
