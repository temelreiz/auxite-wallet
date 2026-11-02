// src/app/api/cron/kyc-reminder-push/route.ts
// Daily "verify your account" reminders for users who signed up but haven't
// started KYC.
//   - push every other day for the first three weeks (days 1, 3, … 21)
//   - email on days 10, 17 and 24 (the drip already covers day 3, and its
//     day 5/7/14 emails land on other days, so no one gets two in a day)
//   - backlog: accounts older than the last email day that never verified get
//     the same email once, at most BACKLOG_PER_RUN a day so a ~2,000-address
//     send warms the domain over about nine days instead of landing in one burst
//     (OTP and deposit mail share the sender). Frozen/banned accounts and
//     rejected KYC are left out.
// Each (user, day, channel) is sent at most once (redis flag). Emails respect
// the unsubscribe list and carry a one-click unsubscribe link.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { sendPushToUser } from "@/lib/expo-push";
import { kycReminderPush, renderKycReminderEmail } from "@/lib/kyc-reminder-content";
import { loadSuppressedEmails, isEmailSuppressed, unsubscribeUrl } from "@/lib/email-suppression";
import { assertAccountActive } from "@/lib/security/account-guard";

export const maxDuration = 300;

const redis = Redis.fromEnv();
const SECRET = process.env.CRON_SECRET || "";
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@auxite.io";

const PUSH_DAYS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
const EMAIL_DAYS = [10, 17, 24];
const DEDUPE_TTL = 60 * 24 * 60 * 60; // well past the last reminder day
const BACKLOG_PER_RUN = 250;
const BACKLOG_GAP_MS = 600; // stay under Resend's 2 requests/second

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
  let emailed = 0;
  let skipped = 0;
  let backlog = 0;
  let failed = 0;
  const failures: { walletAddress: string; reason: string }[] = [];

  const authKeys = await redis.keys("auth:user:*");
  const suppressed = await loadSuppressedEmails(redis);

  for (const key of authKeys) {
    scanned++;
    const data = (await redis.hgetall(key)) as any;
    if (!data?.walletAddress || !data?.createdAt) continue;

    const addr = String(data.walletAddress).toLowerCase();
    const createdAt = Number(data.createdAt);
    if (!createdAt) continue;

    const days = daysSince(createdAt);
    const pushToday = PUSH_DAYS.includes(days);
    const backlogKey = `kyc:reminder:email:backlog:${addr}`;
    const backlogCandidate =
      days > EMAIL_DAYS[EMAIL_DAYS.length - 1] && backlog < BACKLOG_PER_RUN && !(await redis.get(backlogKey));
    const emailToday = EMAIL_DAYS.includes(days) || backlogCandidate;
    if (!pushToday && !emailToday) continue;

    // Already verified (or in review)? skip
    const kycRaw = await redis.get(`kyc:${addr}`);
    const kyc = kycRaw ? (typeof kycRaw === "string" ? JSON.parse(kycRaw) : kycRaw) : null;
    if (kyc?.status === "approved" || kyc?.status === "pending" || kyc?.status === "under_review") continue;
    if (backlogCandidate) {
      if (kyc?.status === "rejected") continue;
      if (!(await assertAccountActive(addr)).ok) continue;
    }

    eligible++;
    const lang = (data.language || "en").toLowerCase();

    if (pushToday) {
      const flagKey = `kyc:reminder:push:${addr}:day${days}`;
      if (await redis.get(flagKey)) {
        skipped++;
      } else {
        const { title, body } = kycReminderPush(lang);
        try {
          const result = await sendPushToUser(
            addr,
            title,
            body,
            { type: "kyc_reminder", screen: "/kyc-verification", day: days },
          );
          if (result.sent > 0) {
            sent++;
            await redis.set(flagKey, "1", { ex: DEDUPE_TTL });
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
    }

    if (emailToday && resend) {
      const email = key.replace("auth:user:", "");
      const flagKey = backlogCandidate ? backlogKey : `kyc:reminder:email:${addr}:day${days}`;
      if (!email.includes("@") || isEmailSuppressed(suppressed, email) || (await redis.get(flagKey))) {
        skipped++;
      } else {
        if (backlogCandidate) await new Promise((r) => setTimeout(r, BACKLOG_GAP_MS));
        const unsub = unsubscribeUrl(email);
        const { subject, html } = renderKycReminderEmail(lang, days, unsub);
        try {
          const { error } = await resend.emails.send({
            from: `Auxite <${FROM_EMAIL}>`,
            to: email,
            subject,
            html,
            headers: {
              "List-Unsubscribe": `<${unsub}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          });
          if (error) {
            // A bad address would otherwise be retried by the backlog every day
            // (rate limits are retried tomorrow, not written off).
            if (backlogCandidate && (error as any).name !== "rate_limit_exceeded") await redis.set(flagKey, "error");
            failed++;
            failures.push({ walletAddress: addr, reason: `email: ${error.message || String(error)}` });
          } else {
            emailed++;
            if (backlogCandidate) {
              backlog++;
              await redis.set(flagKey, "1"); // once ever, no TTL
            } else {
              await redis.set(flagKey, "1", { ex: DEDUPE_TTL });
            }
          }
        } catch (e: any) {
          failed++;
          failures.push({ walletAddress: addr, reason: `email: ${e?.message || String(e)}` });
        }
      }
    }
  }

  // Log run
  await redis.lpush("cron:kyc-reminder:log", JSON.stringify({
    timestamp: Date.now(),
    scanned, eligible, sent, emailed, backlog, skipped, failed,
  }));
  await redis.ltrim("cron:kyc-reminder:log", 0, 49);

  return NextResponse.json({
    success: true,
    scanned, eligible, sent, emailed, backlog, skipped, failed,
    failures: failures.slice(0, 10),
  });
}
