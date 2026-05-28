// /api/admin/push-kyc-pending — language-segmented KYC reminder to ALL users
// who have NOT completed verification (status none / missing / rejected).
// Distinct from the staggered 1/3/7-day drip (/api/cron/kyc-reminder-push).
//
// Auth: CRON_SECRET (Bearer). Dry-run by default.
//   GET                        → counts per language (no send)
//   GET ?send=true&confirm=yes → send (with a per-user cooldown so repeat
//                                 runs don't spam the same person)

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendPushToUser } from "@/lib/expo-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const redis = Redis.fromEnv();

const COOLDOWN_DAYS = 3; // don't re-nudge the same user within N days

const TITLES: Record<string, string> = {
  en: "🏆 Your 5 AUXG bonus is waiting",
  tr: "🏆 5 AUXG bonusunuz sizi bekliyor",
  de: "🏆 Ihr 5 AUXG Bonus wartet",
  fr: "🏆 Votre bonus 5 AUXG vous attend",
  ar: "🏆 مكافأة 5 AUXG بانتظارك",
  ru: "🏆 Ваш бонус 5 AUXG ждёт",
};
const BODIES: Record<string, string> = {
  en: "Verify your identity in 60 seconds — unlock the bonus and your $50K/month withdrawal limit.",
  tr: "60 saniyede kimliğinizi doğrulayın — bonusu ve $50K aylık çekim limitinizi açın.",
  de: "Identität in 60 Sekunden verifizieren — Bonus und $50K Limit freischalten.",
  fr: "Vérifiez votre identité en 60 secondes — débloquez le bonus et la limite $50K/mois.",
  ar: "تحقق من هويتك في 60 ثانية — افتح المكافأة وحد السحب $50K/شهر.",
  ru: "Подтвердите личность за 60 секунд — разблокируйте бонус и лимит $50K/мес.",
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const doSend = sp.get("send") === "true";
  const confirmed = sp.get("confirm") === "yes";

  const authKeys = await redis.keys("auth:user:*");
  const byLang: Record<string, number> = {};
  let eligible = 0, sent = 0, skipped = 0, failed = 0, noDevice = 0, cooled = 0;
  const failures: { wallet: string; reason: string }[] = [];

  for (const key of authKeys) {
    const data = (await redis.hgetall(key)) as any;
    if (!data?.walletAddress) continue;
    const addr = String(data.walletAddress).toLowerCase();

    // Pending = not verified and not already in review.
    const kycRaw = await redis.get(`kyc:${addr}`);
    const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
    const status = kyc?.status;
    if (status === "approved" || status === "pending" || status === "under_review") continue;

    eligible++;
    const lang = String(data.language || "en").toLowerCase();
    byLang[lang] = (byLang[lang] || 0) + 1;

    if (!doSend) continue;

    // Per-user cooldown so repeat runs don't spam.
    const flagKey = `kyc:pending:push:${addr}`;
    if (await redis.get(flagKey)) { cooled++; continue; }

    const title = TITLES[lang] || TITLES.en;
    const body = BODIES[lang] || BODIES.en;
    try {
      const r = await sendPushToUser(addr, title, body, { type: "kyc_reminder", category: "kyc", screen: "/kyc-verification" });
      if (r.sent > 0) {
        sent++;
        await redis.set(flagKey, "1", { ex: COOLDOWN_DAYS * 24 * 60 * 60 });
      } else if (r.failed > 0) {
        failed++; failures.push({ wallet: addr, reason: `${r.failed} failed` });
      } else {
        noDevice++; // eligible but no registered push device
      }
    } catch (e: any) {
      failed++; failures.push({ wallet: addr, reason: e?.message || String(e) });
    }
  }

  if (!doSend) {
    return NextResponse.json({ dryRun: true, eligible, byLanguage: byLang, note: "users with no/rejected KYC (excludes approved/pending/under_review)" });
  }
  if (!confirmed) {
    return NextResponse.json({ error: "pass &confirm=yes with &send=true", eligible, byLanguage: byLang }, { status: 400 });
  }

  await redis.lpush("notifications:log", JSON.stringify({
    type: "kyc_reminder", title: "kyc-pending blast (localized)",
    eligible, sent, cooled, noDevice, failed, byLanguage: byLang,
    sentBy: "push-kyc-pending", timestamp: Date.now(),
  }));
  await redis.ltrim("notifications:log", 0, 999);

  return NextResponse.json({ sent: true, eligible, mobileSent: sent, cooled, noDevice, failed, byLanguage: byLang, failures: failures.slice(0, 15) });
}
