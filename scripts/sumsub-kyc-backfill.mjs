// scripts/sumsub-kyc-backfill.mjs
// Reconciles Redis kyc:* state with Sumsub for entries the disabled webhook
// (2026-05-10 → 2026-05-13) missed. Iterates pending/under_review entries,
// fetches current Sumsub status, updates Redis when Sumsub has a final answer.
//
// DRY-RUN BY DEFAULT. Pass --apply to actually write.
// Does NOT trigger email notifications (would double-fire on users who already
// got one) — re-run notifications separately if needed.

import { Redis } from "@upstash/redis";
import { createHmac } from "crypto";
import { config } from "dotenv";
import { fileURLToPath, pathToFileURL } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env.local") });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    if (!a.startsWith("--")) return [a, true];
    const [k, v] = a.slice(2).split("=");
    return [k, v ?? true];
  })
);
const APPLY = !!args.apply;
const LIMIT = args.limit ? parseInt(String(args.limit), 10) : Infinity;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SUMSUB_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SUMSUB_SECRET_KEY = process.env.SUMSUB_SECRET_KEY;
const SUMSUB_BASE_URL = process.env.SUMSUB_BASE_URL || "https://api.sumsub.com";

if (!SUMSUB_APP_TOKEN || !SUMSUB_SECRET_KEY) {
  console.error("Missing SUMSUB_APP_TOKEN or SUMSUB_SECRET_KEY in .env.local");
  process.exit(1);
}

const KYC_LIMITS = {
  none: { dailyWithdraw: 100, monthlyWithdraw: 500, singleTransaction: 50 },
  basic: { dailyWithdraw: 1000, monthlyWithdraw: 5000, singleTransaction: 500 },
  verified: { dailyWithdraw: 10000, monthlyWithdraw: 50000, singleTransaction: 5000 },
  enhanced: { dailyWithdraw: 100000, monthlyWithdraw: 500000, singleTransaction: 50000 },
};

function sumsubSign(ts, method, path, body = "") {
  return createHmac("sha256", SUMSUB_SECRET_KEY)
    .update(ts + method.toUpperCase() + path + body)
    .digest("hex");
}

async function sumsubGet(path) {
  const ts = Math.floor(Date.now() / 1000);
  const sig = sumsubSign(ts, "GET", path);
  const res = await fetch(SUMSUB_BASE_URL + path, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-App-Token": SUMSUB_APP_TOKEN,
      "X-App-Access-Ts": String(ts),
      "X-App-Access-Sig": sig,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Sumsub ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

function mapReviewStatusToLevel(reviewResult) {
  if (!reviewResult) return "none";
  if (reviewResult.reviewAnswer === "GREEN") return "verified";
  return "none";
}

function mapReviewStatusToKYCStatus(reviewStatus, reviewResult) {
  switch (reviewStatus) {
    case "init":
    case "pending":
      return "pending";
    case "queued":
    case "onHold":
      return "under_review";
    case "completed":
      if (reviewResult?.reviewAnswer === "GREEN") return "approved";
      if (reviewResult?.reviewAnswer === "RED") return "rejected";
      return "under_review";
    default:
      return "pending";
  }
}

async function main() {
  console.log(`Sumsub backfill — ${APPLY ? "APPLY" : "DRY-RUN"} mode`);
  console.log(`Scanning kyc:* keys in Redis...\n`);

  const keys = await redis.keys("kyc:*");
  console.log(`Found ${keys.length} kyc:* keys total`);

  let scanned = 0;
  let candidates = 0;
  let skipFinal = 0;
  let skipNoApplicant = 0;
  let querySumsub = 0;
  let updated = 0;
  let unchanged = 0;
  let sumsubErrors = 0;
  const transitions = {};

  for (const key of keys) {
    if (scanned >= LIMIT) break;
    scanned++;

    const raw = await redis.get(key);
    if (!raw) continue;
    const kyc = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Skip if Redis already has a final result
    if (kyc.status === "approved" || kyc.status === "rejected") {
      skipFinal++;
      continue;
    }

    // Skip if no Sumsub applicant ID linked
    if (!kyc.sumsubApplicantId || kyc.sumsubApplicantId.startsWith("test_")) {
      skipNoApplicant++;
      continue;
    }

    candidates++;
    querySumsub++;

    try {
      const status = await sumsubGet(`/resources/applicants/${kyc.sumsubApplicantId}/status`);
      const newStatus = mapReviewStatusToKYCStatus(status.reviewStatus, status.reviewResult);
      const newLevel = mapReviewStatusToLevel(status.reviewResult);

      const transitionKey = `${kyc.status} -> ${newStatus}`;

      if (newStatus === kyc.status && newLevel === kyc.level) {
        unchanged++;
        continue;
      }

      transitions[transitionKey] = (transitions[transitionKey] || 0) + 1;

      const wallet = key.replace("kyc:", "");
      console.log(`  ${wallet.slice(0, 10)}... ${kyc.status} -> ${newStatus} (level: ${kyc.level} -> ${newLevel})`);

      if (APPLY) {
        const updatedKyc = {
          ...kyc,
          status: newStatus,
          level: newLevel,
          limits: KYC_LIMITS[newLevel],
          updatedAt: new Date().toISOString(),
          backfilledAt: new Date().toISOString(),
          backfillSource: "sumsub-kyc-backfill.mjs",
        };

        if (status.reviewResult) {
          updatedKyc.verification = {
            ...updatedKyc.verification,
            reviewedAt: status.reviewResult.reviewDate || new Date().toISOString(),
            reviewAnswer: status.reviewResult.reviewAnswer,
            rejectLabels: status.reviewResult.rejectLabels,
            reviewRejectType: status.reviewResult.reviewRejectType,
          };

          if (status.reviewResult.reviewAnswer === "RED" && status.reviewResult.rejectLabels) {
            updatedKyc.verification.rejectionReason = status.reviewResult.rejectLabels.join(", ");
          }
        }

        await redis.set(key, JSON.stringify(updatedKyc));

        // Also sync the user:* hash kycVerified flag if newly approved
        if (newStatus === "approved") {
          const userId = await redis.get(`user:address:${wallet}`);
          if (userId) {
            await redis.hset(`user:${userId}`, {
              kycVerified: "true",
              kycVerifiedAt: new Date().toISOString(),
            });
          }
        }

        updated++;
      }
    } catch (e) {
      sumsubErrors++;
      console.error(`  ERR ${kyc.sumsubApplicantId}: ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\n========== SUMMARY ==========`);
  console.log(`Scanned:                ${scanned}`);
  console.log(`  Final (skip):         ${skipFinal}`);
  console.log(`  No applicant (skip):  ${skipNoApplicant}`);
  console.log(`  Queried Sumsub:       ${querySumsub}`);
  console.log(`    Unchanged:          ${unchanged}`);
  console.log(`    Would update / updated: ${APPLY ? updated : candidates - unchanged - sumsubErrors}`);
  console.log(`    Sumsub errors:      ${sumsubErrors}`);
  console.log(`\nTransitions:`);
  for (const [k, v] of Object.entries(transitions)) {
    console.log(`  ${k}: ${v}`);
  }
  console.log(`==============================`);
  if (!APPLY) console.log("\nDry-run done. Pass --apply to actually write to Redis.");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
