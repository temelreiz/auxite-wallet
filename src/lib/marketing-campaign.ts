// src/lib/marketing-campaign.ts
//
// Sends a marketing email to consented support-widget leads. This is the ONLY
// path that turns Phase-2 consent into an actual send, and it enforces the two
// hard rules every time:
//   1. Recipient must have marketingConsent === true (marketing-lead.ts), and
//   2. Recipient must NOT be on the unsubscribe suppression list.
// Every message carries a one-click unsubscribe link + List-Unsubscribe headers.

import { Resend } from "resend";
import { getRedis } from "@/lib/redis";
import { listLeads } from "@/lib/marketing-lead";
import { loadSuppressedEmails, isEmailSuppressed, unsubscribeUrl } from "@/lib/email-suppression";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@auxite.io";
const FROM_NAME = process.env.FROM_NAME || "Auxite";

const CAMPAIGN_LOG = "marketing:campaigns:log";

export interface Recipient {
  email: string;
  lang: string | null;
}

/** Consented leads with unsubscribed addresses removed. */
export async function getConsentedRecipients(): Promise<Recipient[]> {
  const redis = getRedis();
  const [{ items }, suppressed] = await Promise.all([
    listLeads({ limit: 500, consentedOnly: true }),
    loadSuppressedEmails(redis as any),
  ]);
  return items
    .filter((l) => l.marketingConsent && !isEmailSuppressed(suppressed, l.email))
    .map((l) => ({ email: l.email, lang: l.lang }));
}

/** Append a plain, compliant unsubscribe footer to the campaign HTML. */
function withUnsubscribeFooter(html: string, email: string): string {
  const url = unsubscribeUrl(email);
  return `${html}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 16px" />
<p style="font-size:12px;color:#888;line-height:1.5;font-family:Arial,sans-serif">
You are receiving this because you opted in to Auxite marketing updates.
<a href="${url}" style="color:#888">Unsubscribe</a>.
</p>`;
}

export interface SendResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Send a campaign. mode "test" delivers only to `testEmail` (no consent/suppress
 * check — it's your own address for previewing). mode "live" delivers to every
 * consented, non-suppressed lead. Throttled to stay within Resend rate limits.
 */
export async function sendMarketingCampaign(params: {
  subject: string;
  html: string;
  mode: "test" | "live";
  testEmail?: string;
  sentBy?: string;
}): Promise<SendResult> {
  if (!resend) {
    throw new Error("Email service not configured (RESEND_API_KEY missing).");
  }
  const subject = params.subject.trim();
  const html = params.html;
  if (!subject || !html.trim()) throw new Error("Subject and body are required.");

  let recipients: Recipient[];
  if (params.mode === "test") {
    const t = (params.testEmail || "").trim().toLowerCase();
    if (!t) throw new Error("Test email required for test mode.");
    recipients = [{ email: t, lang: null }];
  } else {
    recipients = await getConsentedRecipients();
  }

  const result: SendResult = { total: recipients.length, sent: 0, failed: 0, skipped: 0 };

  for (const r of recipients) {
    try {
      const { error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: r.email,
        subject,
        html: withUnsubscribeFooter(html, r.email),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl(r.email)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      if (error) {
        result.failed++;
        console.error(`marketing send failed → ${r.email}:`, error.message);
      } else {
        result.sent++;
      }
    } catch (e) {
      result.failed++;
      console.error(`marketing send threw → ${r.email}:`, (e as Error)?.message || e);
    }
    // Gentle throttle so a larger list doesn't trip Resend's rate limit.
    await new Promise((res) => setTimeout(res, 120));
  }

  // Record the run (live sends only — test previews aren't campaign history).
  if (params.mode === "live") {
    try {
      const redis = getRedis();
      await redis.lpush(
        CAMPAIGN_LOG,
        JSON.stringify({
          subject,
          ...result,
          sentBy: params.sentBy || null,
          at: Date.now(),
        }),
      );
      await redis.ltrim(CAMPAIGN_LOG, 0, 199);
    } catch {}
  }

  return result;
}

export async function listCampaignLog(limit = 20): Promise<any[]> {
  try {
    const redis = getRedis();
    const raw = (await redis.lrange(CAMPAIGN_LOG, 0, limit - 1)) as unknown[];
    return raw.map((x) => (typeof x === "string" ? JSON.parse(x) : x));
  } catch {
    return [];
  }
}
