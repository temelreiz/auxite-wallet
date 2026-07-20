// scripts/marketing-cohorts-fast.mjs
// READ-ONLY, parallelized cohort sizing for the activation strategy.
// Batches Redis reads (concurrency=40) so it finishes in seconds, not minutes.
// Cohorts:
//   signed_up            = total auth:user:*
//   verified (kyc)       = kyc status approved
//   funded               = any positive balance
//   c_no_kyc_no_deposit  = signed up, no KYC, no deposit  (drip/winback target)
//   c_kyc_no_deposit     = KYC approved, never deposited   (highest-intent abandon)
//   c_funded_inactive    = funded but 0 transactions       (activation target)
// Plus geo (KYC country) + language buckets, and suppression-set size.

import { Redis } from "@upstash/redis";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ASSET_KEYS = ["auxm", "auxg", "auxs", "auxpt", "auxpd", "eth", "btc", "usdt", "usdc", "usd"];
const CONCURRENCY = 40;

function balancePositive(data) {
  if (!data) return false;
  for (const k of ASSET_KEYS) if (parseFloat(String(data[k] || 0)) > 0) return true;
  return false;
}

async function mapPool(items, fn, concurrency = CONCURRENCY) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return out;
}

function bucketLang(l) {
  const x = (l || "en").toLowerCase();
  return ["en", "tr", "ar", "de", "fr", "ru"].includes(x) ? x : "other";
}

const run = async () => {
  console.log("Scanning users (parallel)…");
  const authKeys = await redis.keys("auth:user:*");
  const suppressed = await redis.scard("email:suppressed").catch(() => 0);
  const pushAll = await redis.scard("push:mobile:all_users").catch(() => 0);

  const rows = await mapPool(authKeys, async (key) => {
    const email = key.replace("auth:user:", "");
    const u = await redis.hgetall(key);
    if (!u) return null;
    const addr = String(u.walletAddress || "").toLowerCase();
    let kycStatus = "none";
    let country = "";
    let deposited = false;
    let txCount = 0;
    if (addr) {
      const [kyc, bal, txlen] = await Promise.all([
        redis.get(`kyc:${addr}`).catch(() => null),
        redis.hgetall(`user:${addr}:balance`).catch(() => null),
        redis.llen(`user:${addr}:transactions`).catch(() => 0),
      ]);
      if (kyc) {
        const k = typeof kyc === "string" ? JSON.parse(kyc) : kyc;
        kycStatus = k?.status || "none";
        country = (k?.address?.country || k?.personalInfo?.nationality || "").toUpperCase();
      }
      deposited = balancePositive(bal);
      txCount = Number(txlen) || 0;
    }
    if (!country) country = String(u.country || "").toUpperCase();
    return {
      email,
      lang: bucketLang(u.language),
      country,
      approved: kycStatus === "approved",
      kycStatus,
      deposited,
      txCount,
      createdAt: parseInt(String(u.createdAt || "0"), 10),
    };
  });

  const users = rows.filter(Boolean);
  const now = Date.now();
  const DAY = 86400000;
  const c = {
    signed_up: users.length,
    verified: users.filter((u) => u.approved).length,
    funded: users.filter((u) => u.deposited).length,
    c_no_kyc_no_deposit: users.filter((u) => !u.approved && !u.deposited).length,
    c_no_kyc_14d: users.filter((u) => !u.approved && !u.deposited && u.createdAt && now - u.createdAt >= 14 * DAY).length,
    c_kyc_no_deposit: users.filter((u) => u.approved && !u.deposited).length,
    c_funded_inactive: users.filter((u) => u.deposited && u.txCount === 0).length,
  };

  const byLang = {};
  const byGeo = {};
  const geoBucket = (cc) => {
    const gulf = ["AE", "SA", "QA", "KW", "BH", "OM", "JO", "EG", "LB"];
    const west = ["US", "GB", "CA", "AU", "DE", "FR", "NL", "CH", "IE", "SE", "ES", "IT"];
    if (!cc) return "unknown";
    if (cc === "TR") return "TR";
    if (gulf.includes(cc)) return "Gulf/MENA";
    if (west.includes(cc)) return "West/EN-EU";
    return "other";
  };
  for (const u of users) {
    byLang[u.lang] = (byLang[u.lang] || 0) + 1;
    const g = geoBucket(u.country);
    byGeo[g] = (byGeo[g] || 0) + 1;
  }

  console.log("\n================ MARKETING COHORTS ================");
  console.log(`push tokens (mobile all_users) : ${pushAll}`);
  console.log(`email suppressed (unsub)       : ${suppressed}`);
  console.log("--------------------------------------------------");
  console.log(`signed_up (email users)        : ${c.signed_up}`);
  console.log(`  KYC approved                 : ${c.verified}  (${((c.verified / c.signed_up) * 100).toFixed(1)}%)`);
  console.log(`  funded (any balance>0)       : ${c.funded}  (${((c.funded / c.signed_up) * 100).toFixed(1)}%)`);
  console.log("---- ACTIVATION TARGET COHORTS -------------------");
  console.log(`A. no-KYC, no-deposit          : ${c.c_no_kyc_no_deposit}  (of which >=14d: ${c.c_no_kyc_14d})`);
  console.log(`B. KYC done, never deposited   : ${c.c_kyc_no_deposit}   <-- highest intent`);
  console.log(`C. funded but 0 transactions   : ${c.c_funded_inactive}`);
  console.log("---- LANGUAGE ------------------------------------");
  for (const [k, v] of Object.entries(byLang).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(6)}: ${v}`);
  console.log("---- GEO (KYC country / signup) ------------------");
  for (const [k, v] of Object.entries(byGeo).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)}: ${v}`);
  console.log("==================================================");
};

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
