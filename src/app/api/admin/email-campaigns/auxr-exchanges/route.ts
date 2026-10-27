// src/app/api/admin/email-campaigns/auxr-exchanges/route.ts
//
// Campaign: "AUXR is now trading on LBANK, Hotcoin and Pionex."
// Per-user language (en/tr/de/fr/ar/ru), one-click unsubscribe.
//
// Excluded: unsubscribed addresses, banned/frozen accounts, and users whose
// profile country is the US or the UK (AUXR is not offered there).
//
// Sending is resumable: each POST { send: true } mails the next `limit`
// recipients who have not been mailed yet (tracked in a Redis set), so a
// retry or a timeout never mails anyone twice.
//
//   GET                              → counts (no send)
//   POST { testEmail, testLang? }    → one test message
//   POST { send: true, limit? }      → next chunk; returns `remaining`

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin-auth";
import { getRedis } from "@/lib/redis";
import { getAuxrExchangesTemplate } from "@/lib/email-templates";
import { loadSuppressedEmails, isEmailSuppressed, unsubscribeUrl } from "@/lib/email-suppression";
import { assertAccountActive } from "@/lib/security/account-guard";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Auxite <noreply@auxite.io>";
const SENT_SET = "email:campaigns:auxr-exchanges:sent";
const RUNS_LIST = "email:campaigns:auxr-exchanges:runs";
const EXCLUDED_COUNTRIES = new Set(["US", "USA", "GB", "GBR", "UK"]);
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 500;
const redis = getRedis();

type Recipient = { email: string; language: string; walletAddress: string };

async function collectRecipients(): Promise<{ recipients: Recipient[]; excludedCountry: number }> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match: "auth:user:*", count: 1000 });
    cursor = String(next);
    keys.push(...(batch as string[]));
  } while (cursor !== "0");

  const p = redis.pipeline();
  keys.forEach((k) => p.hgetall(k));
  const users = (await p.exec()) as any[];

  const p2 = redis.pipeline();
  users.forEach((u) => (u?.id ? p2.hget(`user:${u.id}`, "country") : p2.get("__none__")));
  const countries = (await p2.exec()) as any[];

  const suppressed = await loadSuppressedEmails(redis);
  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  let excludedCountry = 0;

  users.forEach((u, i) => {
    const email = String(u?.email || "").toLowerCase().trim();
    if (!email || seen.has(email)) return;
    seen.add(email);
    if (isEmailSuppressed(suppressed, email)) return;
    if (EXCLUDED_COUNTRIES.has(String(countries[i] || "").toUpperCase())) {
      excludedCountry++;
      return;
    }
    recipients.push({
      email,
      language: String(u.language || "en").toLowerCase(),
      walletAddress: String(u.walletAddress || "").toLowerCase(),
    });
  });
  return { recipients, excludedCountry };
}

function withUnsubscribe(html: string, email: string): string {
  return `${html}
<p style="font-size:11px;color:#999;line-height:1.5;font-family:Arial,sans-serif;text-align:center;margin:16px 0 0">
You are receiving this because you have an Auxite account.
<a href="${unsubscribeUrl(email)}" style="color:#999">Unsubscribe</a>.
</p>`;
}

async function sendOne(r: Recipient): Promise<void> {
  const tpl = getAuxrExchangesTemplate(r.language);
  const { error } = await resend.emails.send({
    from: FROM,
    to: r.email,
    subject: tpl.subject,
    html: withUnsubscribe(tpl.html, r.email),
    headers: {
      "List-Unsubscribe": `<${unsubscribeUrl(r.email)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
  if (error) throw new Error(error.message);
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const { recipients, excludedCountry } = await collectRecipients();
  const alreadySent = await redis.scard(SENT_SET);
  const byLang: Record<string, number> = {};
  for (const r of recipients) byLang[r.language] = (byLang[r.language] || 0) + 1;
  return NextResponse.json({ success: true, total: recipients.length, alreadySent, excludedCountry, byLang });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;
  const body = await request.json().catch(() => ({}));

  if (body.testEmail) {
    const r = { email: String(body.testEmail), language: String(body.testLang || "en").toLowerCase(), walletAddress: "" };
    await sendOne(r);
    return NextResponse.json({ success: true, mode: "test", to: r.email, language: r.language });
  }

  if (body.send !== true) {
    return NextResponse.json({ error: "Pass { send: true } to send, or { testEmail } for a test" }, { status: 400 });
  }

  const limit = Math.min(Math.max(Number(body.limit) || 250, 1), 500);
  const { recipients } = await collectRecipients();
  const sentSet = new Set(((await redis.smembers(SENT_SET)) as string[]).map((e) => e.toLowerCase()));
  const pending = recipients.filter((r) => !sentSet.has(r.email));
  const chunk = pending.slice(0, limit);

  let sent = 0;
  let failed = 0;
  let skippedInactive = 0;
  const errors: string[] = [];

  for (let i = 0; i < chunk.length; i += BATCH_SIZE) {
    await Promise.all(
      chunk.slice(i, i + BATCH_SIZE).map(async (r) => {
        // Banned / frozen accounts get no marketing. Mark them handled so
        // they are not re-checked on every run.
        if (r.walletAddress && !(await assertAccountActive(r.walletAddress)).ok) {
          skippedInactive++;
          await redis.sadd(SENT_SET, r.email);
          return;
        }
        try {
          await sendOne(r);
          await redis.sadd(SENT_SET, r.email);
          sent++;
        } catch (e: any) {
          failed++;
          if (errors.length < 5) errors.push(`${r.email}: ${e?.message || e}`);
        }
      }),
    );
    if (i + BATCH_SIZE < chunk.length) await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
  }

  const remaining = pending.length - chunk.length + failed;
  await redis.lpush(RUNS_LIST, JSON.stringify({ at: Date.now(), sent, failed, skippedInactive, remaining }));
  await redis.ltrim(RUNS_LIST, 0, 99);

  return NextResponse.json({ success: true, mode: "send", sent, failed, skippedInactive, remaining, sampleErrors: errors });
}
