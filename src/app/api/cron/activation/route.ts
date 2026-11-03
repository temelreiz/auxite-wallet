// src/app/api/cron/activation/route.ts
// Daily activation series for the two places sign-ups stall:
//
//   kyc_finish  — opened identity verification but never submitted it (Sumsub
//                 "pending"). The drip and the KYC reminders both skip
//                 "pending", so until now nobody followed these up.
//                 Days 2, 5 and 12 after verification was started.
//   deposit     — verified, never funded. Days 1, 4, 9 and 16 after approval
//                 (the approval email itself goes out on day 0). Stops at the
//                 first deposit.
//
// Only people who reached that point in the last WINDOW_DAYS are in scope: the
// early-2026 backlog was already sent the one-shot winback and is left alone.
// Each stage goes out once (email + push), in order, at least MIN_GAP_DAYS
// apart: someone who is already past several stages (first run, a missed day)
// starts at the first one and catches up gradually, never in a burst and never
// with "last reminder" as the first message.
// ?dry=1 lists who would get what without sending anything.
//
// It also records the first time each account is seen funded
// (FUNDED_ZSET), which the weekly funnel report reads.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { sendPushToUser } from "@/lib/expo-push";
import { renderActivationEmail, activationPush, type ActivationStage } from "@/lib/activation-content";
import { loadSuppressedEmails, isEmailSuppressed, unsubscribeUrl } from "@/lib/email-suppression";
import { assertAccountActive } from "@/lib/security/account-guard";
import { DAY_MS as DAY, isFunded, isoWeek, FUNDED_ZSET, FUNDED_SEEDED } from "@/lib/activation-funnel";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const redis = Redis.fromEnv();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@auxite.io";

const WINDOW_DAYS = 30;
const BATCH = 40;
const SEND_GAP_MS = 600;
const MIN_GAP_DAYS = 3; // stay under Resend's 2 requests/second

const KYC_FINISH: { stage: ActivationStage; day: number }[] = [
  { stage: "kyc_finish_1", day: 2 },
  { stage: "kyc_finish_2", day: 5 },
  { stage: "kyc_finish_3", day: 12 },
];
const DEPOSIT: { stage: ActivationStage; day: number }[] = [
  { stage: "deposit_1", day: 1 },
  { stage: "deposit_2", day: 4 },
  { stage: "deposit_3", day: 9 },
  { stage: "deposit_4", day: 16 },
];

function ts(v: unknown): number {
  if (!v) return 0;
  const n = typeof v === "number" ? v : Date.parse(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** When the user got to the point this track starts from, and which track. */
function trackOf(kyc: any): { track: "kyc_finish" | "deposit"; since: number } | null {
  if (!kyc) return null;
  if (kyc.status === "pending") return { track: "kyc_finish", since: ts(kyc.createdAt) || ts(kyc.updatedAt) };
  if (kyc.status === "approved") {
    return { track: "deposit", since: ts(kyc.verification?.reviewedAt) || ts(kyc.personalInfo?.verifiedAt) || ts(kyc.updatedAt) };
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const now = Date.now();
  const week = isoWeek(now);

  const stats = { scanned: 0, inScope: 0, newlyFunded: 0, emailed: 0, pushed: 0, skipped: 0, failed: 0 };
  const plan: { email: string; stage: ActivationStage; day: number }[] = [];
  const failures: string[] = [];

  // The first run finds every account funded before tracking began; those get
  // score 0 so the report does not count them as this week's first deposits.
  const seeded = !!(await redis.get(FUNDED_SEEDED));
  const keys: string[] = await redis.keys("auth:user:*");
  const suppressed = await loadSuppressedEmails(redis);

  for (let i = 0; i < keys.length; i += BATCH) {
    const users = await Promise.all(
      keys.slice(i, i + BATCH).map(async (key) => {
        const u = (await redis.hgetall(key)) as Record<string, any> | null;
        const addr = String(u?.walletAddress || "").toLowerCase();
        if (!addr) return null;
        const [kycRaw, bal] = await Promise.all([
          redis.get(`kyc:${addr}`),
          redis.hgetall(`user:${addr}:balance`) as Promise<Record<string, unknown> | null>,
        ]);
        const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
        return { email: key.replace("auth:user:", ""), language: String(u?.language || "en"), addr, kyc, bal };
      }),
    );

    for (const u of users) {
      if (!u) continue;
      stats.scanned++;

      if (isFunded(u.bal)) {
        // First time we see this account funded: keep the date for the report.
        if (!dry && (await redis.zadd(FUNDED_ZSET, { nx: true }, { score: seeded ? now : 0, member: u.addr }))) stats.newlyFunded++;
        continue;
      }

      const t = trackOf(u.kyc);
      if (!t || !t.since || now - t.since > WINDOW_DAYS * DAY) continue;
      stats.inScope++;

      const age = Math.floor((now - t.since) / DAY);
      const schedule = t.track === "kyc_finish" ? KYC_FINISH : DEPOSIT;
      const due = schedule.filter((s) => s.day <= age);
      if (!due.length) continue;

      const sentKey = `activation:${u.addr}:sent`;
      const lastKey = `activation:${u.addr}:last`;
      const sent = new Set((await redis.smembers(sentKey)).map(String));
      const next = due.find((s) => !sent.has(s.stage));
      if (!next) continue;
      const last = Number(await redis.get(lastKey)) || 0;
      if (now - last < MIN_GAP_DAYS * DAY) continue;

      if (dry) {
        plan.push({ email: u.email, stage: next.stage, day: age });
        continue;
      }
      if (!(await assertAccountActive(u.addr)).ok) {
        stats.skipped++;
        continue;
      }

      // Mark first, so a failing send is not retried every day into a burst.
      await redis.sadd(sentKey, next.stage);
      await redis.expire(sentKey, 90 * 24 * 60 * 60);
      await redis.set(lastKey, String(now), { ex: 90 * 24 * 60 * 60 });

      let delivered = false;
      if (resend && u.email.includes("@") && !isEmailSuppressed(suppressed, u.email)) {
        const unsub = unsubscribeUrl(u.email);
        const { subject, html } = renderActivationEmail(next.stage, u.language, unsub);
        try {
          await new Promise((r) => setTimeout(r, SEND_GAP_MS));
          const { error } = await resend.emails.send({
            from: `Auxite <${FROM_EMAIL}>`,
            to: u.email,
            subject,
            html,
            headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          });
          if (error) throw new Error(error.message || String(error));
          stats.emailed++;
          delivered = true;
        } catch (e: any) {
          stats.failed++;
          failures.push(`${u.email}:${next.stage}: ${e?.message || e}`);
        }
      }

      const push = activationPush(next.stage, u.language);
      try {
        const r = await sendPushToUser(u.addr, push.title, push.body, { type: "activation", stage: next.stage, screen: push.screen });
        if (r.sent > 0) {
          stats.pushed++;
          delivered = true;
        }
      } catch (e: any) {
        failures.push(`${u.addr}:push: ${e?.message || e}`);
      }

      if (delivered) await redis.hincrby(`activation:sent:${week}`, next.stage, 1);
      else stats.skipped++;
    }
  }

  if (!dry) {
    await redis.expire(`activation:sent:${week}`, 120 * 24 * 60 * 60);
    if (!seeded) await redis.set(FUNDED_SEEDED, String(now));
    await redis.set("activation:last_run", JSON.stringify({ timestamp: now, ...stats, failures: failures.length }));
  }
  return NextResponse.json({ success: true, dry, ...stats, plan: dry ? plan : undefined, failures: failures.slice(0, 10) });
}
