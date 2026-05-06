// src/app/api/cron/kyc-reminder-push/route.ts
// Daily KYC reminder push notification
// Targets: users registered 1-7 days ago with no KYC yet
// Sends one push per day per user, dedupe via redis flag.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendPushToUser } from "@/lib/expo-push";

const redis = Redis.fromEnv();
const SECRET = process.env.CRON_SECRET || "";

// Day-bucketed reminders (1, 3, 7) — staggered to avoid spam
const REMINDER_DAYS = [1, 3, 7];

const TITLES: Record<string, string> = {
  en: "🏆 Your 5 AUXG bonus is waiting",
  tr: "🏆 5 AUXG bonusunuz sizi bekliyor",
  de: "🏆 Ihr 5 AUXG Bonus wartet",
  fr: "🏆 Votre bonus 5 AUXG vous attend",
  ar: "🏆 مكافأة 5 AUXG بانتظارك",
  ru: "🏆 Ваш бонус 5 AUXG ждёт",
};

const BODIES: Record<string, string> = {
  en: "Verify identity in 60 seconds — unlock the bonus and $50K/month withdrawal limit.",
  tr: "60 saniyede kimlik doğrulayın — bonusu ve $50K aylık limit hakkınızı açın.",
  de: "Identität in 60 Sekunden verifizieren — Bonus und $50K Limit freischalten.",
  fr: "Vérifiez en 60 secondes — débloquez le bonus et la limite $50K/mois.",
  ar: "تحقق في 60 ثانية — افتح المكافأة وحد $50K/شهر.",
  ru: "Подтвердите за 60 секунд — разблокируйте бонус и лимит $50K/мес.",
};

function daysSince(ts: number): number {
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  const auth = request.headers.get("Authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let scanned = 0;
  let eligible = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { walletAddress: string; reason: string }[] = [];

  const authKeys = await redis.keys("auth:user:*");

  for (const key of authKeys) {
    scanned++;
    const data = (await redis.hgetall(key)) as any;
    if (!data?.walletAddress || !data?.createdAt) continue;

    const addr = String(data.walletAddress).toLowerCase();
    const createdAt = Number(data.createdAt);
    if (!createdAt) continue;

    const days = daysSince(createdAt);
    if (!REMINDER_DAYS.includes(days)) continue;

    // Already verified? skip
    const kycRaw = await redis.get(`kyc:${addr}`);
    const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
    if (kyc?.status === "approved" || kyc?.status === "pending" || kyc?.status === "under_review") continue;

    eligible++;

    // Dedupe — already sent today's reminder?
    const flagKey = `kyc:reminder:push:${addr}:day${days}`;
    const already = await redis.get(flagKey);
    if (already) {
      skipped++;
      continue;
    }

    const lang = (data.language || "en").toLowerCase();
    const title = TITLES[lang] || TITLES.en;
    const body = BODIES[lang] || BODIES.en;

    try {
      const result = await sendPushToUser(
        addr,
        title,
        body,
        { type: "kyc_reminder", screen: "/kyc-verification", day: days },
      );
      if (result.sent > 0) {
        sent++;
        // 30 day TTL on dedupe flag (well past 7 day window)
        await redis.set(flagKey, "1", { ex: 30 * 24 * 60 * 60 });
      } else if (result.failed > 0) {
        failed++;
        failures.push({ walletAddress: addr, reason: `expo: ${result.failed} failed deliveries` });
      } else {
        // No devices registered — count as skip, not failure
        skipped++;
      }
    } catch (e: any) {
      failed++;
      failures.push({ walletAddress: addr, reason: e?.message || String(e) });
    }
  }

  // Log run
  await redis.lpush("cron:kyc-reminder:log", JSON.stringify({
    timestamp: Date.now(),
    scanned, eligible, sent, skipped, failed,
  }));
  await redis.ltrim("cron:kyc-reminder:log", 0, 49);

  return NextResponse.json({
    success: true,
    scanned, eligible, sent, skipped, failed,
    failures: failures.slice(0, 10),
  });
}
