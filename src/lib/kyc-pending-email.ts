// src/lib/kyc-pending-email.ts
// TZ-aware localized KYC reminder email. Mirrors lib/kyc-pending-push.ts but
// uses Resend + getKycAuxgPromoTemplate. Designed to fire 1 hour after the
// push (push at local 17:00 → email at local 18:00) so the email is the
// follow-up, not a duplicate first nudge.

import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { getKycAuxgPromoTemplate } from "@/lib/email-templates";
import { resolveUserTimezone, getLocalHour } from "@/lib/timezones";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Auxite <noreply@auxite.io>";
const DEFAULT_COOLDOWN_DAYS = 1; // hourly cron → 1 email/day max

export interface KycEmailBlastResult {
  dryRun: boolean;
  eligible: number;
  byLanguage: Record<string, number>;
  byTimezone?: Record<string, number>;
  matchedTzNow?: number;
  sent?: number;
  cooled?: number;
  noEmail?: number;
  failed?: number;
  failures?: { wallet: string; reason: string }[];
}

export async function runKycPendingEmailBlast(opts: {
  send: boolean;
  /** If set, only send to users whose *local* hour matches this (0-23). */
  targetLocalHour?: number | null;
  cooldownDays?: number;
}): Promise<KycEmailBlastResult> {
  const authKeys = await redis.keys("auth:user:*");
  const byLanguage: Record<string, number> = {};
  const byTimezone: Record<string, number> = {};
  let eligible = 0, sent = 0, cooled = 0, noEmail = 0, failed = 0, matchedTzNow = 0;
  const failures: { wallet: string; reason: string }[] = [];
  const cooldown = opts.cooldownDays ?? DEFAULT_COOLDOWN_DAYS;

  for (const key of authKeys) {
    const data = (await redis.hgetall(key)) as any;
    if (!data?.walletAddress) continue;
    const addr = String(data.walletAddress).toLowerCase();
    const email = data.email ? String(data.email) : "";

    const kycRaw = await redis.get(`kyc:${addr}`);
    const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
    const status = kyc?.status;
    if (status === "approved" || status === "pending" || status === "under_review") continue;

    eligible++;
    const lang = String(data.language || "en").toLowerCase();
    byLanguage[lang] = (byLanguage[lang] || 0) + 1;

    const tz = resolveUserTimezone({ country: data.country, phone: data.phone, language: lang });
    byTimezone[tz] = (byTimezone[tz] || 0) + 1;

    if (opts.targetLocalHour != null) {
      if (getLocalHour(tz) !== opts.targetLocalHour) continue;
      matchedTzNow++;
    }

    if (!opts.send) continue;

    if (!email) { noEmail++; continue; }

    const flagKey = `kyc:pending:email:${addr}`;
    if (await redis.get(flagKey)) { cooled++; continue; }

    try {
      const tpl = getKycAuxgPromoTemplate(lang);
      await resend.emails.send({ from: FROM, to: email, subject: tpl.subject, html: tpl.html });
      sent++;
      await redis.set(flagKey, "1", { ex: cooldown * 24 * 60 * 60 });
    } catch (e: any) {
      failed++;
      failures.push({ wallet: addr, reason: e?.message || String(e) });
    }
  }

  if (!opts.send) return { dryRun: true, eligible, byLanguage, byTimezone, matchedTzNow };

  await redis.lpush("email:campaigns:log", JSON.stringify({
    campaign: "kycPendingTzEmail", segment: "kyc_pending_tz",
    eligible, sent, cooled, noEmail, failed, matchedTzNow,
    sentBy: "kyc-pending-email-blast", timestamp: Date.now(),
  }));
  await redis.ltrim("email:campaigns:log", 0, 99);

  return { dryRun: false, eligible, byLanguage, byTimezone, matchedTzNow, sent, cooled, noEmail, failed, failures: failures.slice(0, 15) };
}
