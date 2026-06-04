// ============================================================================
// /api/admin/email-kyc-limits-announcement — KYC easing email blast.
//
// Companion to /api/admin/push-kyc-limits-announcement. Targets the same
// unverified cohort but via email — reaches the 744 users without a mobile
// push token, plus reinforces the announcement for those who got the push.
//
// Localized TR/EN/DE/FR/AR/RU via getUserLanguage(walletAddress). Sent
// through Resend. Skips KYC-verified users (same logic as the push side).
//
// Auth: CRON_SECRET (Bearer). Safety: dry-run by default; an actual send
// requires BOTH ?send=true AND ?confirm=yes.
//
//   GET ?dry-run               → segment counts, sends nothing
//   GET ?send=true&confirm=yes → sends the localized email
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { getKycLimitsAnnouncementTemplate } from "@/lib/email-templates";
import { getUserLanguage } from "@/lib/user-language";
import { isKycVerified } from "@/lib/kyc-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// 1794 sends at ~3.6 req/sec ≈ 8 min. Vercel Pro allows 900s; we set 800
// to give a margin. The marker SET makes any partial-run safe to resume.
export const maxDuration = 800;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Auxite <noreply@auxite.io>";

const CHUNK = 25;          // walk auth keys in parallel batches
const SEND_PARALLELISM = 4; // Resend hard limit is 5 req/sec — stay under
const SEND_BATCH_DELAY_MS = 1100; // ~3.6 req/sec sustained, well under 5
const DUPE_MARKER_KEY = "email:campaign:kyc-limits-announcement:sent"; // SET

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const doSend = sp.get("send") === "true";
  const confirmed = sp.get("confirm") === "yes";

  // 1. Walk every registered user, resolve language + KYC status + email.
  //    Also skip anyone already in the "sent" SET — protects against the
  //    same campaign blasting twice if we have to re-run after a partial
  //    rate-limit failure.
  const authKeys = await redis.keys("auth:user:*");
  type Entry = { email: string; lang: string; wallet: string };
  const entries: Entry[] = [];
  const byLang: Record<string, number> = {};
  let skippedVerified = 0, skippedNoEmail = 0, skippedAlreadySent = 0;

  for (let i = 0; i < authKeys.length; i += CHUNK) {
    const slice = authKeys.slice(i, i + CHUNK);
    await Promise.all(
      slice.map(async (k) => {
        try {
          const u = await redis.hgetall(k);
          const wallet = String(u?.walletAddress || "").toLowerCase().trim();
          const email = String(u?.email || k.replace("auth:user:", "")).trim().toLowerCase();
          if (!email || !email.includes("@")) { skippedNoEmail++; return; }
          if (wallet && (await isKycVerified(wallet))) { skippedVerified++; return; }
          if (await redis.sismember(DUPE_MARKER_KEY, email)) { skippedAlreadySent++; return; }
          const lang = wallet ? await getUserLanguage(wallet) : "en";
          byLang[lang] = (byLang[lang] || 0) + 1;
          entries.push({ email, lang, wallet });
        } catch { /* skip bad row */ }
      })
    );
  }

  const summary = {
    totalRegistered: authKeys.length,
    targetedRecipients: entries.length,
    skippedVerified,
    skippedNoEmail,
    skippedAlreadySent,
    byLang,
    sampleSubjectsByLang: Object.fromEntries(
      Object.keys(byLang).map((l) => [l, getKycLimitsAnnouncementTemplate(l).subject])
    ),
  };

  if (!doSend) {
    return NextResponse.json({ dryRun: true, ...summary });
  }
  if (!confirmed) {
    return NextResponse.json(
      { error: "Refusing to send: pass &confirm=yes together with &send=true", ...summary },
      { status: 400 }
    );
  }

  // 2. Send in chunks of SEND_PARALLELISM with a sustained pacing that
  // stays under Resend's 5 req/sec hard cap. After each batch we sleep
  // SEND_BATCH_DELAY_MS so the steady-state is ~3.6 req/sec. On every
  // successful send we mark the address in DUPE_MARKER_KEY so re-running
  // this endpoint (e.g. to recover from a transient failure) doesn't
  // double-mail the people we already reached.
  let sent = 0, failed = 0;
  const failures: { email: string; reason: string }[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < entries.length; i += SEND_PARALLELISM) {
    const batch = entries.slice(i, i + SEND_PARALLELISM);
    await Promise.all(
      batch.map(async (e) => {
        try {
          const tpl = getKycLimitsAnnouncementTemplate(e.lang);
          const r = await resend.emails.send({
            from: FROM,
            to: e.email,
            subject: tpl.subject,
            html: tpl.html,
          });
          if ((r as any)?.error) {
            failed++;
            failures.push({ email: e.email, reason: String((r as any).error.message || (r as any).error) });
          } else {
            sent++;
            // Mark sent so a retry run will skip this address.
            try { await redis.sadd(DUPE_MARKER_KEY, e.email); } catch {}
          }
        } catch (err: any) {
          failed++;
          failures.push({ email: e.email, reason: err?.message || String(err) });
        }
      })
    );
    if (i + SEND_PARALLELISM < entries.length) {
      await sleep(SEND_BATCH_DELAY_MS);
    }
  }
  // Keep the dupe set tidy: TTL ~30 days. Long enough to cover any retry
  // run we'd want; short enough that future campaigns can reuse the key
  // namespace without colliding.
  try { await redis.expire(DUPE_MARKER_KEY, 30 * 24 * 60 * 60); } catch {}

  // 3. Log
  await redis.lpush(
    "email:campaigns:log",
    JSON.stringify({
      type: "kyc-limits-announcement",
      recipients: entries.length,
      sent,
      failed,
      broadcast: true,
      sentBy: "email-kyc-limits-announcement",
      timestamp: Date.now(),
    })
  );
  await redis.ltrim("email:campaigns:log", 0, 999);

  return NextResponse.json({
    sent: true,
    recipients: entries.length,
    delivered: sent,
    failed,
    failuresPreview: failures.slice(0, 10),
    ...summary,
  });
}
