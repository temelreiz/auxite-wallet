// scripts/remediate-20261019-debug-wallet.mjs
//
// Cleans up after the /api/debug/wallet exploitation of 11 and 19 October.
//
// 0x7ed16d2b…22c3 (permexchange@proton.me, Sumsub-approved) credited itself
// 2,025.5 AUXR and 60 USDT through an unauthenticated debug endpoint — every
// single transaction on the account carries source "debug_add_balance" and
// there is not one real deposit. So the whole balance goes, not a part of it.
//
// The two open mint requests are cancelled rather than rejected: rejection
// refunds the hold to the customer's balance, and that balance was never real.
//
// Run with --apply to write. Without it, nothing is written.

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const APPLY = process.argv.includes("--apply");
const p = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };

const A = "0x7ed16d2b18eb0fb9e52e12e23715c8bdb91822c3";
const REASON = "Security — 2026-10-19 /api/debug/wallet balance fabrication";
const NOW = new Date().toISOString();

console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN (no writes)\n");

// ── 1. freeze and ban ───────────────────────────────────────────────────────
const before = p(await redis.get(`user:emergency:${A}`)) || {};
const info = (await redis.hgetall(`user:${A}:info`)) || {};
const next = {
  frozen: false, panicMode: false, trustedContacts: [], cooldownPeriod: 24,
  securityLevel: "standard",
  ...before,
  frozen: true,
  frozenAt: before.frozenAt || NOW,
  frozenBy: "admin:security-review",
  frozenReason: REASON,
};
delete next.frozenUntil; // indefinite — an attacker must not be able to wait it out
console.log(`freeze  ${A}`);
console.log(`  frozen ${before.frozen ?? false} -> true, banned ${info.banned ?? false} -> true`);

// ── 2. zero the fabricated balance ──────────────────────────────────────────
const bal = (await redis.hgetall(`user:${A}:balance`)) || {};
const credited = (await redis.lrange(`user:${A}:transactions`, 0, -1))
  .map(p).filter(Boolean)
  .filter((t) => t.source === "debug_add_balance");
const byToken = {};
for (const t of credited) byToken[t.token] = (byToken[t.token] || 0) + Number(t.amount || 0);
console.log(`\ncredited through the debug endpoint (${credited.length} calls):`);
for (const [k, v] of Object.entries(byToken)) if (v !== 0) console.log(`  ${k.padEnd(6)} ${v}`);

const zero = {};
for (const k of ["auxr", "usdt", "usd", "auxm", "totalAuxm", "bonusAuxm", "auxg", "auxs", "auxpt", "auxpd", "btc", "eth", "xrp", "sol"]) {
  if (Number(bal[k] || 0) !== 0) zero[k] = "0";
}
console.log("\nzeroing:");
for (const k of Object.keys(zero)) console.log(`  ${k.padEnd(6)} ${bal[k]} -> 0`);
if (!Object.keys(zero).length) console.log("  (already zero)");

// ── 3. cancel the open holds without refunding them ─────────────────────────
const openIds = (await redis.smembers("auxr:mintreq:open")) || [];
const mine = [];
for (const id of openIds) {
  const r = p(await redis.get(`auxr:mintreq:${id}`));
  if (r?.address?.toLowerCase() === A) mine.push(r);
}
console.log(`\nopen mint requests for this account: ${mine.length}`);
for (const r of mine) {
  console.log(`  ${r.refId}  ${r.unitsAUXR} AUXR -> ${r.destination}  (${r.state}) => cancelled, NOT refunded`);
}

if (APPLY) {
  await redis.set(`user:emergency:${A}`, JSON.stringify(next));
  await redis.hset(`user:${A}:info`, { banned: "true", bannedAt: Date.now(), banReason: REASON });
  await redis.lpush(`user:emergency:logs:${A}`, JSON.stringify({
    action: "freeze", walletAddress: A, timestamp: NOW,
    details: { reason: REASON, by: "admin:security-review" },
  }));
  await redis.ltrim(`user:emergency:logs:${A}`, 0, 99);

  if (Object.keys(zero).length) await redis.hset(`user:${A}:balance`, zero);

  for (const r of mine) {
    r.state = "cancelled";
    r.decidedBy = "admin:security-review";
    r.note = `${REASON} — hold not refunded, the balance behind it was fabricated`;
    r.updatedAt = NOW;
    await redis.set(`auxr:mintreq:${r.refId}`, JSON.stringify(r));
    await redis.srem("auxr:mintreq:open", r.refId);
  }

  await redis.lpush(`user:${A}:transactions`, JSON.stringify({
    id: `remediation-${Date.now()}`,
    type: "adjustment",
    token: "AUXR",
    amount: -Number(bal.auxr || 0),
    source: "security_remediation",
    status: "completed",
    timestamp: Date.now(),
    note: REASON,
  }));

  console.log("\nwritten.");
} else {
  console.log("\nnothing written — re-run with --apply");
}
