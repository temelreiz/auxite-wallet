// scripts/freeze-20261019-debug-ring.mjs
//
// Freezes the ring that worked /api/debug/wallet on 10-11 and 19 October.
//
// Not one attacker: six Proton throwaways across two addresses each, on
// 186.247.73.62 and .69 — the same /24 in Brazil. permexx@proton.me was
// REJECTED by Sumsub and kept full API access anyway; permexchange@proton.me
// passed KYC at 01:52 on 11 October, minutes after that night's theft.
//
// Also zeroes two fabricated balances left over from 6 June — one of them
// still carrying USD 1,000,000, BTC 100 and AUXM 947,999 in the live ledger.
// Neither has an email, so neither can be logged into; they are debug residue
// sitting in the liability numbers.
//
// Run with --apply to write.

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
config({ path: new URL("../.env.local", import.meta.url).pathname, quiet: true });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
const APPLY = process.argv.includes("--apply");
const p = (v) => { try { return typeof v === "string" ? JSON.parse(v) : v; } catch { return null; } };
const NOW = new Date().toISOString();

const REASON = "Security — 2026-10 /api/debug/wallet balance-fabrication ring";
const RING = [
  "0x0e93c8d5b1f540d00a9b46844aa2a57dc5221702", // permexx@proton.me — KYC REJECTED
  "0xeab480a28949baa8262d35dabeffaf1bfdadf57d", // permexx@proton.me (second address)
  "0xbab6a03be445094a10695772a79777407dcdc0e7", // labfbmv1duxwc@proton.me
  "0xa49f2e5ea589c675368ccc8d0e8b03a8ab2008e7", // labfbmv1duxwc@proton.me (second address)
  "0xa49f2e5e38c8b00aef22d93e0f0e64ea12c3eafd", // no email, 16 probes on 19 Oct
  "0xb9e355b84221bc4f7113ed085f30eface69d2c2a", // labrescmv34ydwa@proton.me
];
// Fabricated balances with no login behind them. Frozen as well as zeroed:
// if an email is ever attached to one of these, it must not come with a
// million dollars.
const RESIDUE = [
  "0x80c78abe20f313c0e2a77128123338d2844138b9",
  "0x2a6007a15a7b04feadd64f0d002a10a6867587f6",
];

const TOKENS = ["auxr","usdt","usd","auxm","totalAuxm","bonusAuxm","auxg","auxs","auxpt","auxpd","btc","eth","xrp","sol"];

console.log(APPLY ? "MODE: APPLY\n" : "MODE: DRY RUN (no writes)\n");

async function freeze(a, zeroBalance) {
  const before = p(await redis.get(`user:emergency:${a}`)) || {};
  const info = (await redis.hgetall(`user:${a}:info`)) || {};
  const email = await redis.get(`wallet:${a}`);
  const bal = (await redis.hgetall(`user:${a}:balance`)) || {};

  const next = {
    frozen: false, panicMode: false, trustedContacts: [], cooldownPeriod: 24,
    securityLevel: "standard",
    ...before,
    frozen: true,
    frozenAt: before.frozenAt || NOW,
    frozenBy: "admin:security-review",
    frozenReason: REASON,
  };
  delete next.frozenUntil;

  const zero = {};
  if (zeroBalance) {
    for (const k of TOKENS) if (Number(bal[k] || 0) !== 0) zero[k] = "0";
  }

  console.log(`${a}  ${email || "(no email)"}`);
  console.log(`  frozen ${before.frozen ?? false} -> true, banned ${info.banned ?? false} -> true`);
  if (zeroBalance) {
    console.log(`  zeroing: ${Object.keys(zero).length ? Object.keys(zero).map((k) => `${k}=${bal[k]}`).join(" ") : "(already empty)"}`);
  } else {
    const nz = Object.entries(bal).filter(([, v]) => Number(v) > 0);
    console.log(`  balance left in place: ${nz.length ? nz.map(([k, v]) => `${k}=${v}`).join(" ") : "(empty)"}`);
  }

  if (APPLY) {
    await redis.set(`user:emergency:${a}`, JSON.stringify(next));
    await redis.hset(`user:${a}:info`, { banned: "true", bannedAt: Date.now(), banReason: REASON });
    await redis.lpush(`user:emergency:logs:${a}`, JSON.stringify({
      action: "freeze", walletAddress: a, timestamp: NOW,
      details: { reason: REASON, by: "admin:security-review" },
    }));
    await redis.ltrim(`user:emergency:logs:${a}`, 0, 99);
    if (Object.keys(zero).length) await redis.hset(`user:${a}:balance`, zero);
  }
  console.log("");
}

console.log("── the ring ────────────────────────────────────────────────\n");
// Balances here are small and partly real deposits; the freeze is what matters,
// and an operator can settle the arithmetic afterwards without racing anyone.
for (const a of RING) await freeze(a, false);

console.log("── fabricated residue, June ────────────────────────────────\n");
for (const a of RESIDUE) await freeze(a, true);

if (!APPLY) console.log("nothing written — re-run with --apply");
