// src/app/api/cron/daily-price-alert/route.ts
// Daily price alert push notification
// Runs every hour. For each user whose local time is 12:00 ON A WEEKDAY, sends a
// push with day-over-day price changes for AUXG, AUXS, AUXPT, AUXPD. Weekends are
// skipped — metals markets are closed, so prices have not moved since Friday.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendPushToUser } from "@/lib/expo-push";
import { getUserLanguage } from "@/lib/user-language";

const redis = Redis.fromEnv();

interface ClosingPrices {
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  timestamp: number;
  date: string;
}

interface UserDeliveryInfo {
  walletAddress: string;
  timezone: string;
  language: string;
}

// Localized title per supported language. Body uses AUXG/AUXS/AUXPT/AUXPD
// token symbols which are brand-universal — no translation needed.
const TITLE_BY_LANG: Record<string, string> = {
  en: "📊 Daily Price Update",
  tr: "📊 Günlük Fiyat Güncellemesi",
  de: "📊 Tägliches Preisupdate",
  fr: "📊 Mise à jour quotidienne des prix",
  ar: "📊 تحديث الأسعار اليومي",
  ru: "📊 Ежедневное обновление цен",
};

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
 * Get the weekday in a given IANA timezone as a short English name
 * ("Mon".."Sun"). Returns null for an invalid timezone.
 */
function getLocalWeekday(timezone: string): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(new Date());
  } catch {
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

    // ─── Unit normalization ───
    // System standard is USD/GRAM (price-cache.ts enforces gold < $500/g).
    // The bare redis.get() bypass in cron context means we sometimes receive
    // ounce-unit data (gold ~$4700) when other writers update the cache.
    // Normalize inline so push still ships, but with correct % values.
    const TROY_OUNCE_TO_GRAMS = 31.1034768;
    const normalize = (p: any, label: string) => {
      if (p && p.gold > 500) {
        console.warn(`[DailyPriceAlert] Normalizing ${label} oz→g (gold=$${p.gold.toFixed(2)})`);
        return {
          ...p,
          gold: p.gold / TROY_OUNCE_TO_GRAMS,
          silver: p.silver / TROY_OUNCE_TO_GRAMS,
          platinum: p.platinum / TROY_OUNCE_TO_GRAMS,
          palladium: p.palladium / TROY_OUNCE_TO_GRAMS,
        };
      }
      return p;
    };
    const closeNorm = normalize(closingPrices, "close");
    const currentNorm = normalize(currentPrices, "current");

    // ─── 3. Build notification body ───
    // Use AUXG/AUXS/AUXPT/AUXPD token symbols (brand-universal, language-agnostic).
    // Body is the same for all users; title is per-language below.
    const parts = [
      formatChange("AUXG", currentNorm.gold, closeNorm.gold),
      formatChange("AUXS", currentNorm.silver, closeNorm.silver),
      formatChange("AUXPT", currentNorm.platinum, closeNorm.platinum),
      formatChange("AUXPD", currentNorm.palladium, closeNorm.palladium),
    ].filter(Boolean);

    const notificationBody = parts.join(" | ");

    if (!notificationBody) {
      return NextResponse.json({
        success: true,
        message: "Could not compute price changes. Skipping.",
        sent: 0,
      });
    }

    // ─── 4. Find users whose local time is 12:00 AND opted in for priceAlerts ───
    const allPushUsers = await redis.smembers("push:mobile:all_users");

    const eligibleUsers: UserDeliveryInfo[] = [];
    let skippedOptOut = 0;
    let skippedWeekend = 0;

    for (const walletAddr of allPushUsers) {
      const addr = (walletAddr as string).toLowerCase();

      // ── 4a. Push preference check — respect explicit opt-out ──
      // Default is to allow priceAlerts (priceAlerts !== false). If user
      // has explicitly toggled it off, skip them.
      const prefsRaw = await redis.get(`push:preferences:${addr}`);
      if (prefsRaw) {
        try {
          const prefs = typeof prefsRaw === "string" ? JSON.parse(prefsRaw) : prefsRaw;
          if (prefs.enabled === false || prefs.priceAlerts === false) {
            skippedOptOut++;
            continue;
          }
        } catch {
          // malformed prefs — treat as default (allow)
        }
      }

      // ── 4b. Timezone lookup ──
      let tz: string | null = null;
      const userInfo = (await redis.hgetall(
        `user:${addr}:info`
      )) as Record<string, string> | null;
      if (userInfo?.timezone) tz = userInfo.timezone;

      if (!tz) {
        const email = await redis.get(`wallet:${addr}`);
        if (email) {
          const authUser = (await redis.hgetall(
            `auth:user:${email}`
          )) as Record<string, string> | null;
          if (authUser?.timezone) tz = authUser.timezone;
        }
      }

      if (!tz) tz = "Europe/Istanbul";

      // ── 4c. Only continue if it's 12 PM in user's tz ──
      const localHour = getLocalHour(tz);
      if (localHour !== 12) continue;

      // ── 4c-bis. Weekdays only — metals markets are closed on weekends,
      //           so skip Saturday/Sunday in the user's local timezone. ──
      const weekday = getLocalWeekday(tz);
      if (weekday === "Sat" || weekday === "Sun") {
        skippedWeekend++;
        continue;
      }

      // ── 4d. Fetch user language for localized title ──
      const language = await getUserLanguage(addr);

      eligibleUsers.push({ walletAddress: addr, timezone: tz, language });
    }

    // ─── 5. Send push notifications (per-user localized title) ───
    let totalSent = 0;
    let totalFailed = 0;

    for (const user of eligibleUsers) {
      const title = TITLE_BY_LANG[user.language] || TITLE_BY_LANG.en;
      try {
        const result = await sendPushToUser(
          user.walletAddress,
          title,
          notificationBody,
          {
            type: "daily_price_alert",
            closingDate: closingPrices.date,
          },
          // 'default' is registered in mobile app's setupNotificationChannels.
          // 'price-alerts' was a phantom channel — Android fell back to no-sound silent delivery.
          { priority: "high", channelId: "default" }
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
      `[DailyPriceAlert] Completed: ${eligibleUsers.length} eligible, ${totalSent} sent, ${totalFailed} failed, ${skippedOptOut} opted out, ${skippedWeekend} skipped (weekend)`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      closingDate: closingPrices.date,
      eligibleUsers: eligibleUsers.length,
      totalPushUsers: allPushUsers.length,
      skippedOptOut,
      skippedWeekend,
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
