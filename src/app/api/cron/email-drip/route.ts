// src/app/api/cron/email-drip/route.ts
// Email Drip Campaign — runs daily via cron
// Sends follow-up emails to users who registered but haven't deposited.
// Schedule: day 3 (KYC), day 5 (market), day 7 (demo), day 14 (urgency)

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import {
  DRIP_SCHEDULE,
  getDripEmail,
  type DripStage,
} from "@/lib/drip-email-templates";

const redis = Redis.fromEnv();
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@auxite.io";

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Days elapsed since a unix-ms timestamp */
function daysSince(timestampMs: number): number {
  return Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
}

/** Check if user has any non-zero balance (i.e. has deposited) */
async function userHasDeposited(walletAddress: string): Promise<boolean> {
  if (!walletAddress) return false;
  const balanceData = await redis.hgetall(
    `user:${walletAddress.toLowerCase()}:balance`
  );
  if (!balanceData || Object.keys(balanceData).length === 0) return false;

  // Check if any asset has a positive balance
  const assetKeys = [
    "auxm",
    "auxg",
    "auxs",
    "auxpt",
    "auxpd",
    "eth",
    "btc",
    "usdt",
    "usdc",
    "usd",
  ];
  for (const key of assetKeys) {
    const val = parseFloat(String(balanceData[key] || 0));
    if (val > 0) return true;
  }
  return false;
}

/** Send a single drip email via Resend */
async function sendDripEmail(
  to: string,
  stage: DripStage,
  language: string
): Promise<boolean> {
  if (!resend) {
    console.warn("[Drip] Resend not configured, skipping email");
    return false;
  }

  const { subject, html } = getDripEmail(stage, language);

  try {
    const { error } = await resend.emails.send({
      from: `Auxite <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[Drip] Resend error for ${to} (${stage}):`, error);
      return false;
    }

    console.log(`[Drip] Sent ${stage} to ${to}`);
    return true;
  } catch (err) {
    console.error(`[Drip] Failed to send ${stage} to ${to}:`, err);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Auth: CRON_SECRET bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all registered users
    const authKeys: string[] = await redis.keys("auth:user:*");

    if (!authKeys || authKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users found",
        processed: 0,
        sent: 0,
      });
    }

    let processed = 0;
    let sent = 0;
    let skippedDeposited = 0;
    let skippedAlreadySent = 0;
    let skippedNotReady = 0;
    const errors: string[] = [];

    // Track emails sent today for stats
    const todayKey = `drip:sent:${new Date().toISOString().slice(0, 10)}`;

    for (const authKey of authKeys) {
      try {
        // Extract email from key: auth:user:{email}
        const email = authKey.replace("auth:user:", "");
        if (!email || !email.includes("@")) continue;

        processed++;

        // 2. Get user data
        const userData = (await redis.hgetall(authKey)) as Record<
          string,
          string
        > | null;
        if (!userData) continue;

        const createdAt = parseInt(String(userData.createdAt || "0"), 10);
        if (!createdAt) continue;

        const language = userData.language || "en";
        const walletAddress = userData.walletAddress || "";

        // 3. Skip users who already deposited
        if (walletAddress) {
          const deposited = await userHasDeposited(walletAddress);
          if (deposited) {
            skippedDeposited++;
            continue;
          }
        }

        // 4. Calculate days since registration
        const days = daysSince(createdAt);

        // 5. Get already-sent drip emails for this user
        const sentStages = await redis.smembers(`drip:${email}:sent`);
        const sentSet = new Set(sentStages.map(String));

        // 6. Determine which email to send (if any)
        let sentThisRun = false;
        for (const { stage, daysSinceRegistration } of DRIP_SCHEDULE) {
          // Only send if the user has reached or passed the target day
          if (days < daysSinceRegistration) {
            skippedNotReady++;
            continue;
          }

          // Skip if already sent
          if (sentSet.has(stage)) {
            skippedAlreadySent++;
            continue;
          }

          // Send the email
          const success = await sendDripEmail(email, stage, language);
          if (success) {
            // Mark as sent
            await redis.sadd(`drip:${email}:sent`, stage);
            // Increment daily counter
            await redis.incr(todayKey);
            // Set TTL on daily counter (48h)
            await redis.expire(todayKey, 48 * 60 * 60);
            sent++;
            sentThisRun = true;
          } else {
            errors.push(`${email}:${stage}`);
          }

          // Only send one email per user per cron run to avoid spam
          if (sentThisRun) break;
        }
      } catch (userErr) {
        const msg =
          userErr instanceof Error ? userErr.message : String(userErr);
        errors.push(msg);
      }
    }

    // Store run stats for admin dashboard
    await redis.set(
      "drip:last_run",
      JSON.stringify({
        timestamp: Date.now(),
        processed,
        sent,
        skippedDeposited,
        skippedAlreadySent,
        skippedNotReady,
        errors: errors.length,
      })
    );

    return NextResponse.json({
      success: true,
      processed,
      sent,
      skippedDeposited,
      skippedAlreadySent,
      skippedNotReady,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err) {
    console.error("[Drip] Cron error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
