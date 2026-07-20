// src/app/api/cron/winback-email/route.ts
// One-shot win-back campaign for users who exited the drip schedule (>=14d old)
// without converting. Uses the templates in src/lib/winback-email-templates.ts.
//
// Cohorts (mutually exclusive):
//   cohort3_kyc_done = KYC approved, never deposited  (highest intent — sent first)
//   cohort2_no_kyc   = signed up >=14d, no KYC, no deposit
//
// Safety:
//   - respects the email:suppressed unsubscribe set
//   - dedupe via redis set winback:{email}:sent (one send per cohort per user, ever)
//   - RATE-LIMITED per run (default 150) so a large base drips out over days
//     instead of a single reputation-killing blast
//   - ?dryRun=1 computes + reports without sending
//   - ?limit=N overrides the per-run cap
//   - ?cohort=cohort2_no_kyc|cohort3_kyc_done restricts to one cohort
//
// Schedule daily; with dedupe the whole cohort clears in ~1-2 weeks then no-ops.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { createHmac } from "crypto";
import {
  getWinbackEmail,
  type WinbackStage,
} from "@/lib/winback-email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const redis = Redis.fromEnv();
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@auxite.io";
const SUPPRESSION_SET = "email:suppressed";
const DEFAULT_MAX_PER_RUN = 150;
const MIN_AGE_DAYS = 14;

const ASSET_KEYS = [
  "auxm", "auxg", "auxs", "auxpt", "auxpd",
  "eth", "btc", "usdt", "usdc", "usd",
];

/** Same symmetric HMAC scheme as /api/unsubscribe so links validate. */
function unsubscribeToken(email: string): string {
  const secret =
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "auxite-unsubscribe-fallback";
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

async function hasDeposited(addr: string): Promise<boolean> {
  if (!addr) return false;
  const bal = await redis.hgetall(`user:${addr.toLowerCase()}:balance`);
  if (!bal) return false;
  for (const k of ASSET_KEYS) {
    if (parseFloat(String((bal as Record<string, unknown>)[k] || 0)) > 0) return true;
  }
  return false;
}

async function isApproved(addr: string): Promise<boolean> {
  if (!addr) return false;
  const kyc = await redis.get(`kyc:${addr.toLowerCase()}`);
  if (!kyc) return false;
  const k = typeof kyc === "string" ? JSON.parse(kyc) : kyc;
  return (k?.status || "none") === "approved";
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const maxPerRun = Math.max(
    1,
    parseInt(url.searchParams.get("limit") || String(DEFAULT_MAX_PER_RUN), 10) ||
      DEFAULT_MAX_PER_RUN,
  );
  const onlyCohort = url.searchParams.get("cohort") as WinbackStage | null;

  try {
    const authKeys: string[] = await redis.keys("auth:user:*");
    const suppressedArr = await redis.smembers(SUPPRESSION_SET);
    const suppressed = new Set(suppressedArr.map((e) => String(e).toLowerCase()));

    let scanned = 0;
    let sent = 0;
    let eligibleC2 = 0;
    let eligibleC3 = 0;
    let skippedSuppressed = 0;
    let skippedAlreadySent = 0;
    const sampleRecipients: string[] = [];
    const errors: string[] = [];

    for (const key of authKeys) {
      if (sent >= maxPerRun) break;

      const email = key.replace("auth:user:", "");
      if (!email || !email.includes("@")) continue;
      scanned++;

      if (suppressed.has(email.toLowerCase())) {
        skippedSuppressed++;
        continue;
      }

      const u = (await redis.hgetall(key)) as Record<string, string> | null;
      if (!u) continue;

      const createdAt = parseInt(String(u.createdAt || "0"), 10);
      if (!createdAt || daysSince(createdAt) < MIN_AGE_DAYS) continue;

      const addr = String(u.walletAddress || "");
      const language = u.language || "en";

      // Depositors are converted — never win-back
      if (await hasDeposited(addr)) continue;

      const approved = await isApproved(addr);
      const stage: WinbackStage = approved ? "cohort3_kyc_done" : "cohort2_no_kyc";

      if (onlyCohort && stage !== onlyCohort) continue;
      if (stage === "cohort3_kyc_done") eligibleC3++;
      else eligibleC2++;

      // Dedupe: one send per cohort per user, ever
      const already = await redis.sismember(`winback:${email}:sent`, stage);
      if (already) {
        skippedAlreadySent++;
        continue;
      }

      if (sampleRecipients.length < 15) sampleRecipients.push(`${email} [${stage}]`);

      if (dryRun) {
        sent++; // count as would-send
        continue;
      }

      if (!resend) {
        errors.push("resend-not-configured");
        break;
      }

      const { subject, html } = getWinbackEmail(
        stage,
        language,
        email,
        unsubscribeToken(email),
      );

      try {
        const { error } = await resend.emails.send({
          from: `Auxite <${FROM_EMAIL}>`,
          to: email,
          subject,
          html,
        });
        if (error) {
          errors.push(`${email}:${stage}:${String(error)}`);
          continue;
        }
        await redis.sadd(`winback:${email}:sent`, stage);
        sent++;
      } catch (e) {
        errors.push(`${email}:${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const summary = {
      success: true,
      dryRun,
      maxPerRun,
      onlyCohort: onlyCohort || "all",
      scanned,
      sent,
      eligibleC2,
      eligibleC3,
      skippedSuppressed,
      skippedAlreadySent,
      errors: errors.length,
      sampleRecipients: dryRun ? sampleRecipients : undefined,
      errorSample: errors.slice(0, 5),
    };

    await redis.set("winback:last_run", JSON.stringify({ ...summary, timestamp: Date.now() }));
    return NextResponse.json(summary);
  } catch (err) {
    console.error("[Winback] Cron error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
