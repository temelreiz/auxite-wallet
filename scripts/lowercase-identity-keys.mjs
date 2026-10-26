// scripts/lowercase-identity-keys.mjs
//
// alerts / notifications/subscribe / security/limits used to key Redis by the raw
// x-wallet-address header, so some records live under checksummed casing.
// Those routes now take the address from the login JWT, which is lowercase —
// copy each mixed-case record to its lowercase key so nobody loses data.
//
// Originals are left in place. Where a lowercase key already exists, arrays
// are merged by `id`/`endpoint` and objects keep the lowercase values.
//
// Usage: node scripts/lowercase-identity-keys.mjs [--apply]

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
const APPLY = process.argv.includes("--apply");
const PATTERNS = ["alerts:0x*", "push:subscriptions:0x*", "push:preferences:0x*", "user:limits:0x*"];

const parse = (v) => (typeof v === "string" ? JSON.parse(v) : v);
const itemKey = (x) => x?.id ?? x?.endpoint ?? x?.token ?? JSON.stringify(x);

async function scan(match) {
  let cursor = "0";
  const keys = [];
  do {
    const [next, batch] = await redis.scan(cursor, { match, count: 1000 });
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

for (const pattern of PATTERNS) {
  for (const key of await scan(pattern)) {
    const lower = key.toLowerCase();
    if (key === lower) continue;

    const legacy = parse(await redis.get(key));
    const current = parse(await redis.get(lower));
    let merged;
    if (current == null) merged = legacy;
    else if (Array.isArray(legacy) && Array.isArray(current)) {
      const seen = new Set(current.map(itemKey));
      merged = [...current, ...legacy.filter((x) => !seen.has(itemKey(x)))];
    } else merged = { ...legacy, ...current };

    console.log(`${key} -> ${lower}${current == null ? "" : " (merged)"}`);
    if (APPLY) await redis.set(lower, JSON.stringify(merged));
  }
}
console.log(APPLY ? "applied" : "dry run — pass --apply to write");
