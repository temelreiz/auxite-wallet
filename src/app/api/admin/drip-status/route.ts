// src/app/api/admin/drip-status/route.ts
// Admin endpoint: Drip campaign status & stats
// Auth: Admin session token (same as other admin routes)

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { DRIP_SCHEDULE, type DripStage } from "@/lib/drip-email-templates";

const redis = Redis.fromEnv();

interface DripStats {
  totalUsersInFunnel: number;
  convertedUsers: number;
  stageBreakdown: Record<DripStage, { sent: number; pending: number }>;
  emailsSentToday: number;
  lastRun: {
    timestamp: number;
    processed: number;
    sent: number;
    skippedDeposited: number;
    skippedAlreadySent: number;
    skippedNotReady: number;
    errors: number;
  } | null;
}

/** Days elapsed since a unix-ms timestamp */
function daysSince(timestampMs: number): number {
  return Math.floor((Date.now() - timestampMs) / (1000 * 60 * 60 * 24));
}

/** Check if user has any non-zero balance */
async function userHasDeposited(walletAddress: string): Promise<boolean> {
  if (!walletAddress) return false;
  const balanceData = await redis.hgetall(
    `user:${walletAddress.toLowerCase()}:balance`
  );
  if (!balanceData || Object.keys(balanceData).length === 0) return false;

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

export async function GET(request: NextRequest) {
  // Admin auth
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    // 1. Get all registered users
    const authKeys: string[] = await redis.keys("auth:user:*");

    let totalInFunnel = 0;
    let converted = 0;

    const stageBreakdown: Record<DripStage, { sent: number; pending: number }> =
      {
        day3_kyc: { sent: 0, pending: 0 },
        day5_market: { sent: 0, pending: 0 },
        day7_features: { sent: 0, pending: 0 },
        day14_urgency: { sent: 0, pending: 0 },
      };

    for (const authKey of authKeys) {
      const email = authKey.replace("auth:user:", "");
      if (!email || !email.includes("@")) continue;

      const userData = (await redis.hgetall(authKey)) as Record<
        string,
        string
      > | null;
      if (!userData) continue;

      const createdAt = parseInt(String(userData.createdAt || "0"), 10);
      if (!createdAt) continue;

      const walletAddress = userData.walletAddress || "";
      const deposited = walletAddress
        ? await userHasDeposited(walletAddress)
        : false;

      if (deposited) {
        converted++;
        continue;
      }

      // User is in the funnel (registered, no deposit)
      totalInFunnel++;

      const days = daysSince(createdAt);
      const sentStages = await redis.smembers(`drip:${email}:sent`);
      const sentSet = new Set(sentStages.map(String));

      for (const { stage, daysSinceRegistration } of DRIP_SCHEDULE) {
        if (days >= daysSinceRegistration) {
          if (sentSet.has(stage)) {
            stageBreakdown[stage].sent++;
          } else {
            stageBreakdown[stage].pending++;
          }
        }
      }
    }

    // 2. Emails sent today
    const todayKey = `drip:sent:${new Date().toISOString().slice(0, 10)}`;
    const todayCount = (await redis.get(todayKey)) as number | null;

    // 3. Last run info
    const lastRunRaw = await redis.get("drip:last_run");
    let lastRun = null;
    if (lastRunRaw) {
      lastRun =
        typeof lastRunRaw === "string" ? JSON.parse(lastRunRaw) : lastRunRaw;
    }

    const stats: DripStats = {
      totalUsersInFunnel: totalInFunnel,
      convertedUsers: converted,
      stageBreakdown,
      emailsSentToday: todayCount || 0,
      lastRun,
    };

    return NextResponse.json({ success: true, stats });
  } catch (err) {
    console.error("[Drip Status] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
