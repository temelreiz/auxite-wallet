import { Redis } from "@upstash/redis";
import { config } from "dotenv";
config({ path: "/Users/bs/Desktop/auxite-wallet/.env.local", quiet: true });
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
const p=(v)=>{try{return typeof v==="string"?JSON.parse(v):v}catch{return null}};
const APPLY = process.argv.includes("--apply");

const TARGETS = [
  "0x11f589705dae12174a7907cc35cee23f3b023b88",
  "0xf39f27ea538d45c1e13f9614cec43b6800dbb1c7",
  "0x1916659ec7214a0a7eecab4d08bb0daba0fcf58d",
  "0x287477412580f72fbecd60cb6372c3b9b4a41dbe", // already self-frozen; can self-unfreeze after 24h
];
const REASON = "Security review — 2026-09-09 balance manipulation incident";
const NOW = new Date().toISOString();

console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN (no writes)\n");

for (const a of TARGETS) {
  const before = p(await redis.get(`user:emergency:${a}`)) || {};
  const info = await redis.hgetall(`user:${a}:info`);
  console.log(`${a}`);
  console.log(`  before: frozen=${before.frozen ?? false} frozenBy=${(before.frozenBy||"-").slice(0,14)} banned=${info?.banned ?? false}`);

  const next = {
    frozen: false, panicMode: false, trustedContacts: [], cooldownPeriod: 24, securityLevel: "standard",
    ...before,
    frozen: true,
    frozenAt: before.frozenAt || NOW,
    frozenBy: "admin:security-review",
    frozenReason: REASON,
  };
  delete next.frozenUntil; // indefinite — must never auto-expire

  if (APPLY) {
    await redis.set(`user:emergency:${a}`, JSON.stringify(next));
    await redis.hset(`user:${a}:info`, { banned: "true", bannedAt: Date.now(), banReason: REASON });
    await redis.lpush(`user:emergency:logs:${a}`, JSON.stringify({
      action: "freeze", walletAddress: a, timestamp: NOW,
      details: { reason: REASON, by: "admin:security-review" },
    }));
    await redis.ltrim(`user:emergency:logs:${a}`, 0, 99);
  }
  console.log(`  after : frozen=true frozenBy=admin:security-review banned=true frozenUntil=none${APPLY ? "" : "  (not written)"}\n`);
}
