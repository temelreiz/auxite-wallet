// src/app/api/admin/email-campaigns/yield-promo/route.ts
// Language-segmented YIELD promo email to all users with an email on file.
// Picks subject + HTML per user.language (getYieldPromoTemplate).
//
// Auth: CRON_SECRET (Bearer). Safety: dry-run by default.
//   GET                          → dry-run: recipient counts per language
//   GET ?test=foo@bar.com&lang=tr → send ONE test email
//   GET ?send=true&confirm=yes    → real send to the full segment

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { getYieldPromoTemplate } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Auxite <noreply@auxite.io>";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

async function collectRecipients(): Promise<{ email: string; language: string }[]> {
  const authKeys = await redis.keys("auth:user:*");
  const out: { email: string; language: string }[] = [];
  for (const key of authKeys) {
    const data = (await redis.hgetall(key)) as any;
    if (!data?.email) continue;
    out.push({ email: String(data.email), language: String(data.language || "en").toLowerCase() });
  }
  const seen = new Set<string>();
  return out.filter((r) => {
    const e = r.email.toLowerCase();
    if (seen.has(e)) return false;
    seen.add(e);
    return true;
  });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const testEmail = sp.get("test");
  const doSend = sp.get("send") === "true";
  const confirmed = sp.get("confirm") === "yes";

  // ── TEST MODE ──
  if (testEmail) {
    const lang = (sp.get("lang") || "en").toLowerCase();
    const tpl = getYieldPromoTemplate(lang);
    const result = await resend.emails.send({
      from: FROM,
      to: testEmail,
      subject: `[TEST ${lang.toUpperCase()}] ${tpl.subject}`,
      html: tpl.html,
    });
    return NextResponse.json({ mode: "test", language: lang, to: testEmail, result });
  }

  const recipients = await collectRecipients();
  const byLang: Record<string, number> = {};
  recipients.forEach((r) => { byLang[r.language] = (byLang[r.language] || 0) + 1; });

  // ── DRY RUN (default) ──
  if (!doSend) {
    return NextResponse.json({ dryRun: true, total: recipients.length, byLanguage: byLang });
  }
  if (!confirmed) {
    return NextResponse.json(
      { error: "Refusing to send: pass &confirm=yes with &send=true", total: recipients.length, byLanguage: byLang },
      { status: 400 }
    );
  }

  // ── REAL SEND ──
  let sent = 0, failed = 0;
  const failures: { email: string; lang: string; err: string }[] = [];
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (r) => {
      const tpl = getYieldPromoTemplate(r.language);
      try {
        await resend.emails.send({ from: FROM, to: r.email, subject: tpl.subject, html: tpl.html });
        sent++;
      } catch (e: any) {
        failed++;
        failures.push({ email: r.email, lang: r.language, err: e?.message || String(e) });
      }
    }));
    if (i + BATCH_SIZE < recipients.length) await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
  }

  await redis.lpush("email:campaigns:log", JSON.stringify({
    campaign: "yieldPromo", segment: "all_email_users",
    totalRecipients: recipients.length, sent, failed, byLanguage: byLang,
    sentBy: "yield-promo", timestamp: Date.now(),
  }));
  await redis.ltrim("email:campaigns:log", 0, 99);

  return NextResponse.json({ sent: true, total: recipients.length, mobileSent: sent, emailSent: sent, failed, byLanguage: byLang, failures: failures.slice(0, 20) });
}
