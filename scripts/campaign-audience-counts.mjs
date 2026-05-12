// scripts/campaign-audience-counts.mjs
// READ-ONLY: counts cohort sizes for the reactivation campaign.
// Cohort 1 = push token registered, never signed up (no email user)
// Cohort 2 = signed up, no KYC, no deposit, >=14d old (drip exit point)
// Cohort 3 = KYC approved, no deposit ever (high-intent abandon)
// Also reports totals + language breakdown + push-preference opt-in rate.

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

async function hasDeposited(walletAddress) {
  if (!walletAddress) return false;
  const data = await redis.hgetall(`user:${walletAddress.toLowerCase()}:balance`);
  if (!data) return false;
  for (const k of ASSET_KEYS) {
    if (parseFloat(String(data[k] || 0)) > 0) return true;
  }
  return false;
}

async function getKyc(walletAddress) {
  if (!walletAddress) return null;
  const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
  if (!raw) return null;
  try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return null; }
}

async function getMarketingPref(walletAddress) {
  if (!walletAddress) return null;
  const raw = await redis.get(`push:preferences:${walletAddress.toLowerCase()}`);
  if (!raw) return null;
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    return p?.marketing === true;
  } catch { return null; }
}

async function main() {
  console.log("Fetching all auth users + push subscribers...");

  const authKeys = await redis.keys("auth:user:*");
  const pushUserSet = await redis.smembers("push:mobile:all_users");
  const pushUsersLower = new Set(pushUserSet.map((u) => String(u).toLowerCase()));

  console.log(`auth:user:* count          = ${authKeys.length}`);
  console.log(`push:mobile:all_users size = ${pushUserSet.length}`);

  // Build registered-wallet set so we can compute "push token but no auth"
  const registeredWallets = new Set();
  const langCounts = {};
  const platformCounts = {};
  const ageBuckets = { "0-2d": 0, "3-7d": 0, "8-14d": 0, "15-30d": 0, "31-90d": 0, "90d+": 0 };

  let signedUp = 0;
  let signedUpWithWallet = 0;
  let signedUpNoKyc = 0;
  let signedUpKycPending = 0;
  let signedUpKycApproved = 0;
  let signedUpDeposited = 0;

  // Cohort 2: signed up, no kyc, no deposit, >=14d old
  let cohort2 = 0;
  let cohort2_marketingOptIn = 0;

  // Cohort 3: kyc approved, no deposit
  let cohort3 = 0;
  let cohort3_marketingOptIn = 0;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  let i = 0;
  for (const key of authKeys) {
    i++;
    if (i % 500 === 0) console.log(`  ...processed ${i}/${authKeys.length}`);

    const data = await redis.hgetall(key);
    if (!data || !data.email) continue;
    signedUp++;

    const addr = String(data.walletAddress || "").toLowerCase();
    if (addr) {
      signedUpWithWallet++;
      registeredWallets.add(addr);
    }
    const lang = data.language || "en";
    langCounts[lang] = (langCounts[lang] || 0) + 1;
    const platform = data.platform || "unknown";
    platformCounts[platform] = (platformCounts[platform] || 0) + 1;

    const createdAt = parseInt(String(data.createdAt || "0"), 10);
    const ageDays = createdAt ? Math.floor((now - createdAt) / DAY) : 0;
    if (ageDays <= 2) ageBuckets["0-2d"]++;
    else if (ageDays <= 7) ageBuckets["3-7d"]++;
    else if (ageDays <= 14) ageBuckets["8-14d"]++;
    else if (ageDays <= 30) ageBuckets["15-30d"]++;
    else if (ageDays <= 90) ageBuckets["31-90d"]++;
    else ageBuckets["90d+"]++;

    const kyc = await getKyc(addr);
    const kycStatus = kyc?.status || "none";
    if (kycStatus === "none") signedUpNoKyc++;
    else if (kycStatus === "pending" || kycStatus === "under_review") signedUpKycPending++;
    else if (kycStatus === "approved") signedUpKycApproved++;

    const deposited = await hasDeposited(addr);
    if (deposited) signedUpDeposited++;

    // Cohort 2: signed up >= 14d, no kyc, no deposit
    if (ageDays >= 14 && kycStatus === "none" && !deposited) {
      cohort2++;
      const mkt = await getMarketingPref(addr);
      if (mkt) cohort2_marketingOptIn++;
    }

    // Cohort 3: kyc approved, no deposit
    if (kycStatus === "approved" && !deposited) {
      cohort3++;
      const mkt = await getMarketingPref(addr);
      if (mkt) cohort3_marketingOptIn++;
    }
  }

  // Cohort 1 = push tokens whose wallet is NOT in registeredWallets
  let cohort1 = 0;
  for (const w of pushUsersLower) {
    if (!registeredWallets.has(w)) cohort1++;
  }

  console.log("\n========== AUDIENCE COUNTS ==========");
  console.log(`Total signed-up users:               ${signedUp}`);
  console.log(`  with wallet address:               ${signedUpWithWallet}`);
  console.log(`  no KYC:                            ${signedUpNoKyc}`);
  console.log(`  KYC pending/under_review:          ${signedUpKycPending}`);
  console.log(`  KYC approved:                      ${signedUpKycApproved}`);
  console.log(`  has any positive balance:          ${signedUpDeposited}`);
  console.log("");
  console.log(`Push tokens registered (total):      ${pushUserSet.length}`);
  console.log(`Cohort 1 push-only (no auth):        ${cohort1}`);
  console.log("");
  console.log(`Cohort 2 — signed up ≥14d, no KYC, no deposit:`);
  console.log(`  size:                              ${cohort2}`);
  console.log(`  with marketing-push opt-in:        ${cohort2_marketingOptIn}`);
  console.log("");
  console.log(`Cohort 3 — KYC approved, no deposit:`);
  console.log(`  size:                              ${cohort3}`);
  console.log(`  with marketing-push opt-in:        ${cohort3_marketingOptIn}`);
  console.log("");
  console.log(`Language distribution: ${JSON.stringify(langCounts)}`);
  console.log(`Platform distribution: ${JSON.stringify(platformCounts)}`);
  console.log(`Age buckets:           ${JSON.stringify(ageBuckets)}`);
  console.log("=====================================");
}

main().catch((e) => { console.error(e); process.exit(1); });
