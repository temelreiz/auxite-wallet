// src/lib/kyc-pending-push.ts
// Shared logic for the language-segmented KYC reminder to ALL pending-KYC
// users (no/rejected KYC; excludes approved/pending/under_review).
// Used by the admin dry-run endpoint and the daily cron blast.

import { Redis } from "@upstash/redis";
import { sendPushToUser } from "@/lib/expo-push";
import { resolveUserTimezone, getLocalHour } from "@/lib/timezones";

const redis = Redis.fromEnv();
const COOLDOWN_DAYS = 3; // per-user cooldown so repeat runs don't spam

export const KYC_TITLES: Record<string, string> = {
  en: "🏆 Your 5 AUXG bonus is waiting",
  tr: "🏆 5 AUXG bonusunuz sizi bekliyor",
  de: "🏆 Ihr 5 AUXG Bonus wartet",
  fr: "🏆 Votre bonus 5 AUXG vous attend",
  ar: "🏆 مكافأة 5 AUXG بانتظارك",
  ru: "🏆 Ваш бонус 5 AUXG ждёт",
};
export const KYC_BODIES: Record<string, string> = {
  en: "Verify your identity in 60 seconds — unlock the bonus and your $50K/month withdrawal limit.",
  tr: "60 saniyede kimliğinizi doğrulayın — bonusu ve $50K aylık çekim limitinizi açın.",
  de: "Identität in 60 Sekunden verifizieren — Bonus und $50K Limit freischalten.",
  fr: "Vérifiez votre identité en 60 secondes — débloquez le bonus et la limite $50K/mois.",
  ar: "تحقق من هويتك في 60 ثانية — افتح المكافأة وحد السحب $50K/شهر.",
  ru: "Подтвердите личность за 60 секунд — разблокируйте бонус и лимит $50K/мес.",
};

export interface KycBlastResult {
  dryRun: boolean;
  eligible: number;
  byLanguage: Record<string, number>;
  byTimezone?: Record<string, number>;
  matchedTzNow?: number;
  sent?: number;
  cooled?: number;
  noDevice?: number;
  failed?: number;
  failures?: { wallet: string; reason: string }[];
}

export async function runKycPendingBlast(opts: {
  send: boolean;
  /** If set, only send to users whose *local* hour matches this (0-23). */
  targetLocalHour?: number | null;
  /** Per-user cooldown override (days). Default = 3 for the legacy single-shot
   *  daily cron; pass 1 for the hourly TZ-aware cron so each user gets one/day. */
  cooldownDays?: number;
}): Promise<KycBlastResult> {
  const authKeys = await redis.keys("auth:user:*");
  const byLanguage: Record<string, number> = {};
  const byTimezone: Record<string, number> = {};
  let eligible = 0, sent = 0, cooled = 0, noDevice = 0, failed = 0, matchedTzNow = 0;
  const failures: { wallet: string; reason: string }[] = [];
  const cooldown = opts.cooldownDays ?? COOLDOWN_DAYS;

  for (const key of authKeys) {
    const data = (await redis.hgetall(key)) as any;
    if (!data?.walletAddress) continue;
    const addr = String(data.walletAddress).toLowerCase();

    const kycRaw = await redis.get(`kyc:${addr}`);
    const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
    const status = kyc?.status;
    if (status === "approved" || status === "pending" || status === "under_review") continue;

    eligible++;
    const lang = String(data.language || "en").toLowerCase();
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;

    // Resolve TZ from (country → phone prefix → language). Country/phone come
    // from the auth/user record (populated at signup/KYC).
    const tz = resolveUserTimezone({ country: data.country, phone: data.phone, language: lang });
    byTimezone[tz] = (byTimezone[tz] || 0) + 1;

    // Hourly-cron mode: only deliver when the user's local clock matches.
    if (opts.targetLocalHour != null) {
      const localHour = getLocalHour(tz);
      if (localHour !== opts.targetLocalHour) continue;
      matchedTzNow++;
    }

    if (!opts.send) continue;

    const flagKey = `kyc:pending:push:${addr}`;
    if (await redis.get(flagKey)) { cooled++; continue; }

    const title = KYC_TITLES[lang] || KYC_TITLES.en;
    const body = KYC_BODIES[lang] || KYC_BODIES.en;
    try {
      const r = await sendPushToUser(addr, title, body, { type: "kyc_reminder", category: "kyc", screen: "/kyc-verification" });
      if (r.sent > 0) {
        sent++;
        await redis.set(flagKey, "1", { ex: cooldown * 24 * 60 * 60 });
      } else if (r.failed > 0) {
        failed++; failures.push({ wallet: addr, reason: `${r.failed} failed` });
      } else {
        noDevice++;
      }
    } catch (e: any) {
      failed++; failures.push({ wallet: addr, reason: e?.message || String(e) });
    }
  }

  if (!opts.send) return { dryRun: true, eligible, byLanguage, byTimezone, matchedTzNow };

  await redis.lpush("notifications:log", JSON.stringify({
    type: "kyc_reminder", title: "kyc-pending blast (localized)",
    eligible, sent, cooled, noDevice, failed, byLanguage, timestamp: Date.now(),
  }));
  await redis.ltrim("notifications:log", 0, 999);

  return { dryRun: false, eligible, byLanguage, byTimezone, matchedTzNow, sent, cooled, noDevice, failed, failures: failures.slice(0, 15) };
}
