// src/app/api/admin/email-campaigns/kyc-auxg-promo/route.ts
// Dedicated multi-language campaign:
//   "Your vault is ready — 5 AUXG Welcome Bonus awaits"
// Targets users who registered but haven't completed KYC.
// Picks subject + HTML per user.language automatically.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { getKycAuxgPromoTemplate } from "@/lib/email-templates";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Auxite <noreply@auxite.io>";
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;

// ─────────────────────────────────────────────────────────────────
// GET — preview: count of recipients per language, no send.
// ─────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const recipients = await collectRecipients();
  const byLang: Record<string, number> = {};
  recipients.forEach((r) => {
    byLang[r.language] = (byLang[r.language] || 0) + 1;
  });

  return NextResponse.json({
    success: true,
    total: recipients.length,
    byLanguage: byLang,
    note: "Targeting registered users with no KYC or KYC=none. Use POST to send.",
  });
}

// ─────────────────────────────────────────────────────────────────
// POST — send the campaign.
//   body: { dryRun?: boolean, testEmail?: string, testLang?: string }
//   - dryRun: collect recipients, don't send (returns counts only)
//   - testEmail: send single message to this email using testLang (default 'en')
//   - else: send to full segment, picking template per user language
// ─────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: any = {};
  try { body = await request.json(); } catch {}
  const { dryRun, testEmail, testLang } = body;

  // ── TEST MODE ──
  if (testEmail) {
    const lang = (testLang || "en").toLowerCase();
    const tpl = getKycAuxgPromoTemplate(lang);
    const result = await resend.emails.send({
      from: FROM,
      to: testEmail,
      subject: `[TEST ${lang.toUpperCase()}] ${tpl.subject}`,
      html: tpl.html,
    });
    return NextResponse.json({ success: true, mode: "test", language: lang, result });
  }

  const recipients = await collectRecipients();
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients in target segment" }, { status: 400 });
  }

  // ── DRY RUN ──
  if (dryRun) {
    const byLang: Record<string, number> = {};
    recipients.forEach((r) => { byLang[r.language] = (byLang[r.language] || 0) + 1; });
    return NextResponse.json({ success: true, mode: "dryRun", total: recipients.length, byLanguage: byLang });
  }

  // ── REAL SEND ──
  let sent = 0;
  let failed = 0;
  const failures: { email: string; lang: string; err: string }[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (r) => {
      const tpl = getKycAuxgPromoTemplate(r.language);
      try {
        await resend.emails.send({
          from: FROM,
          to: r.email,
          subject: tpl.subject,
          html: tpl.html,
        });
        sent++;
      } catch (e: any) {
        failed++;
        failures.push({ email: r.email, lang: r.language, err: e?.message || String(e) });
      }
    }));

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Log campaign
  await redis.lpush("email:campaigns:log", JSON.stringify({
    campaign: "kycAuxgPromo",
    segment: "registered_no_kyc",
    totalRecipients: recipients.length,
    sent,
    failed,
    sentBy: "admin",
    timestamp: Date.now(),
  }));
  await redis.ltrim("email:campaigns:log", 0, 99);

  return NextResponse.json({
    success: true,
    mode: "send",
    totalRecipients: recipients.length,
    sent,
    failed,
    failures: failures.slice(0, 20),
  });
}

// ─────────────────────────────────────────────────────────────────
// Helper: collect target recipients (registered, no KYC approved).
// ─────────────────────────────────────────────────────────────────
async function collectRecipients(): Promise<{ email: string; language: string; walletAddress: string }[]> {
  const authKeys = await redis.keys("auth:user:*");
  const out: { email: string; language: string; walletAddress: string }[] = [];

  for (const key of authKeys) {
    const data = (await redis.hgetall(key)) as any;
    if (!data?.email) continue;

    const addr = data.walletAddress || "";
    const kycData = addr ? await redis.get(`kyc:${addr}`) : null;
    const kyc = kycData ? (typeof kycData === "string" ? JSON.parse(kycData) : kycData) : null;

    // Target: no KYC at all OR KYC status === 'none'
    // (we exclude approved/pending/under_review/rejected)
    const isStuck = !kyc || kyc.status === "none" || kyc.status === undefined;
    if (!isStuck) continue;

    out.push({
      email: data.email,
      language: (data.language || "en").toLowerCase(),
      walletAddress: addr,
    });
  }

  // Dedup by email (in case of duplicates)
  const seen = new Set<string>();
  return out.filter((r) => {
    if (seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
}
