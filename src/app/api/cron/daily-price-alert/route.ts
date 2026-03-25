// src/app/api/cron/daily-price-alert/route.ts
// Daily morning price alert push notification
// Runs every hour. For each user whose local time is 09:00, sends a push
// notification with day-over-day price changes for AUXG, AUXS, AUXPT, AUXPD.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendPushToUser } from "@/lib/expo-push";

const redis = Redis.fromEnv();

interface ClosingPrices {
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  timestamp: number;
  date: string;
}

interface UserTimezoneInfo {
  walletAddress: string;
  timezone: string;
}

/**
 * Get the current hour in a given IANA timezone.
 * Returns 0-23.
 */
function getLocalHour(timezone: string): number | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === "hour");
    if (!hourPart) return null;
    // Intl may return "24" for midnight in some locales; normalize
    const h = parseInt(hourPart.value, 10);
    return h === 24 ? 0 : h;
  } catch {
    // Invalid timezone string
    return null;
  }
}

/**
 * Calculate percentage change and format with emoji
 */
function formatChange(
  label: string,
  currentPrice: number,
  closePrice: number
): string {
  if (!closePrice || closePrice === 0) return "";
  const pctChange = ((currentPrice - closePrice) / closePrice) * 100;
  const emoji = pctChange >= 0 ? "\u{1F7E2}" : "\u{1F534}"; // green/red circle
  const sign = pctChange >= 0 ? "+" : "";
  return `${emoji} ${label} ${sign}${pctChange.toFixed(1)}%`;
}

export async function GET(request: NextRequest) {
  // Cron secret check
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ─── 1. Load yesterday's closing prices ───
    const latestCloseRaw = await redis.get("prices:daily:close:latest");
    if (!latestCloseRaw) {
      return NextResponse.json({
        success: true,
        message: "No closing prices stored yet. Skipping.",
        sent: 0,
      });
    }

    const closingPrices: ClosingPrices =
      typeof latestCloseRaw === "string"
        ? JSON.parse(latestCloseRaw)
        : (latestCloseRaw as ClosingPrices);

    // ─── 2. Load current prices ───
    const cachedRaw = await redis.get("metal:prices:cache");
    const staleRaw = await redis.get("metal:prices:stale");
    const currentRaw = cachedRaw || staleRaw;

    if (!currentRaw) {
      return NextResponse.json({
        success: true,
        message: "No current prices available. Skipping.",
        sent: 0,
      });
    }

    const currentPrices =
      typeof currentRaw === "string" ? JSON.parse(currentRaw) : currentRaw;

    // ─── 3. Build notification body ───
    const parts = [
      formatChange("Gold", currentPrices.gold, closingPrices.gold),
      formatChange("Silver", currentPrices.silver, closingPrices.silver),
      formatChange("Platinum", currentPrices.platinum, closingPrices.platinum),
      formatChange(
        "Palladium",
        currentPrices.palladium,
        closingPrices.palladium
      ),
    ].filter(Boolean);

    const notificationBody = parts.join(" | ");

    if (!notificationBody) {
      return NextResponse.json({
        success: true,
        message: "Could not compute price changes. Skipping.",
        sent: 0,
      });
    }

    // ─── 4. Find users whose local time is 09:00 ───
    // Get all users with push tokens registered
    const allPushUsers = await redis.smembers("push:mobile:all_users");

    const eligibleUsers: UserTimezoneInfo[] = [];

    for (const walletAddr of allPushUsers) {
      const addr = (walletAddr as string).toLowerCase();

      // Try to get timezone from user:{walletAddress}:info
      let tz: string | null = null;

      const userInfo = (await redis.hgetall(
        `user:${addr}:info`
      )) as Record<string, string> | null;
      if (userInfo?.timezone) {
        tz = userInfo.timezone;
      }

      if (!tz) {
        // Try to find timezone from auth:user hash via email lookup
        const email = await redis.get(`wallet:${addr}`);
        if (email) {
          const authUser = (await redis.hgetall(
            `auth:user:${email}`
          )) as Record<string, string> | null;
          if (authUser?.timezone) {
            tz = authUser.timezone;
          }
        }
      }

      // Default timezone if none set
      if (!tz) {
        tz = "Europe/Istanbul";
      }

      // Check if it's 9 AM in user's timezone
      const localHour = getLocalHour(tz);
      if (localHour === 9) {
        eligibleUsers.push({ walletAddress: addr, timezone: tz });
      }
    }

    // ─── 5. Send push notifications ───
    let totalSent = 0;
    let totalFailed = 0;

    for (const user of eligibleUsers) {
      try {
        const result = await sendPushToUser(
          user.walletAddress,
          "Market Open \u2014 Daily Price Update",
          notificationBody,
          {
            type: "daily_price_alert",
            closingDate: closingPrices.date,
          },
          { priority: "high", channelId: "price-alerts" }
        );
        totalSent += result.sent;
        totalFailed += result.failed;
      } catch (err: any) {
        console.error(
          `[DailyPriceAlert] Failed to send to ${user.walletAddress}:`,
          err.message
        );
        totalFailed++;
      }
    }

    console.log(
      `[DailyPriceAlert] Completed: ${eligibleUsers.length} eligible users, ${totalSent} sent, ${totalFailed} failed`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      closingDate: closingPrices.date,
      eligibleUsers: eligibleUsers.length,
      totalPushUsers: allPushUsers.length,
      sent: totalSent,
      failed: totalFailed,
      body: notificationBody,
    });
  } catch (error: any) {
    console.error("[DailyPriceAlert] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
