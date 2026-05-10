// src/app/api/admin/email-campaigns/card-launch/route.ts
//
// Campaign: "Card payments are now live — buy AUXG/AUXS/AUXPT/AUXPD with Visa/Mastercard."
// Targets: every registered user with an email on file (regardless of KYC).
// Picks subject + HTML per user.language automatically.
//
// Endpoints:
//   GET  → recipient count by language (preview, no send)
//   POST { dryRun: true } → same as GET (alt syntax)
//   POST { testEmail, testLang? } → send a single test message
//   POST {} → send the full campaign

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { getCardLaunchTemplate } from "@/lib/email-templates";

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
    note: "Targeting all registered users with email on file. Use POST to send.",
  });
}

// ─────────────────────────────────────────────────────────────────
// POST — send the campaign.
//   { dryRun }    → preview counts only
//   { testEmail } → single message to address (testLang default 'en')
//   {}            → full broadcast, per-user language pick
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
    const tpl = getCardLaunchTemplate(lang);
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
    return NextResponse.json({ error: "No recipients found" }, { status: 400 });
  }

  // ── DRY RUN ──
  if (dryRun) {
    const byLang: Record<string, number> = {};
    recipients.forEach((r) => {
      byLang[r.language] = (byLang[r.language] || 0) + 1;
    });
    return NextResponse.json({
      success: true,
      mode: "dryRun",
      total: recipients.length,
      byLanguage: byLang,
      sample: recipients.slice(0, 5).map((r) => ({
        email: r.email,
        language: r.language,
      })),
    });
  }

  // ── FULL SEND ──
  let sent = 0;
  let failed = 0;
  const errors: { email: string; error: string }[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (r) => {
        try {
          const tpl = getCardLaunchTemplate(r.language);
          await resend.emails.send({
            from: FROM,
            to: r.email,
            subject: tpl.subject,
            html: tpl.html,
          });
          sent++;
        } catch (e: any) {
          failed++;
          errors.push({ email: r.email, error: e?.message || String(e) });
        }
      })
    );
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  // Persist a campaign-run summary for audit
  await redis.lpush("email:campaigns:card-launch:runs", JSON.stringify({
    timestamp: Date.now(),
    total: recipients.length,
    sent,
    failed,
    errorCount: errors.length,
    sampleErrors: errors.slice(0, 5),
  }));
  await redis.ltrim("email:campaigns:card-launch:runs", 0, 49);

  return NextResponse.json({
    success: true,
    mode: "send",
    total: recipients.length,
    sent,
    failed,
    errorCount: errors.length,
    sampleErrors: errors.slice(0, 5),
  });
}

// ─────────────────────────────────────────────────────────────────
// Recipient collection
// All registered users with an email address. No KYC filter — this
// announcement is product news that applies to everyone.
// ─────────────────────────────────────────────────────────────────
async function collectRecipients(): Promise<{ email: string; language: string; walletAddress: string }[]> {
  const authKeys = await redis.keys("auth:user:*");
  const out: { email: string; language: string; walletAddress: string }[] = [];

  for (const key of authKeys) {
    const data = (await redis.hgetall(key)) as any;
    if (!data?.email) continue;

    out.push({
      email: data.email,
      language: (data.language || "en").toLowerCase(),
      walletAddress: data.walletAddress || "",
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
