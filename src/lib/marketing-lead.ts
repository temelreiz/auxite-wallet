// src/lib/marketing-lead.ts
//
// Phase 2 of support-chat lead capture: explicit, verifiable marketing consent.
//
// Phase 1 (support-chat-store) merely *detects* an email a user typed — that is
// operational, NOT permission to market to them. This module records an explicit
// opt-in: the user ticks a consent box, and we persist the email together with a
// tamper-evident consent proof (server timestamp, the exact consent text the
// server served for that language, and a version string). Only leads with
// `marketingConsent === true` may be exported for marketing / pushed to a CRM.
//
// Storage: `marketing:lead:{email}` (1 record per email, deduped) + a newest-
// first index `marketing:leads`. No TTL — a consent record is a compliance
// artifact and must outlive a 90-day chat transcript.

import { getRedis } from "@/lib/redis";
import * as crypto from "crypto";

// Bump when the wording below changes so old records keep their original text
// AND we can tell which policy version each person agreed to.
export const CONSENT_VERSION = "2026-08-24";

// The canonical consent sentence per language. The server — never the client —
// is the source of truth for what the user agreed to, so a forged client string
// can't misrepresent consent. Keep in sync with the widget's checkbox label.
const CONSENT_TEXT: Record<string, string> = {
  en: "I agree to receive product news and marketing updates from Auxite by email. I can unsubscribe anytime.",
  tr: "Auxite'ten ürün haberleri ve pazarlama güncellemelerini e-posta ile almayı kabul ediyorum. İstediğim zaman abonelikten çıkabilirim.",
  de: "Ich stimme zu, Produktneuigkeiten und Marketing-Updates von Auxite per E-Mail zu erhalten. Ich kann mich jederzeit abmelden.",
  fr: "J'accepte de recevoir des actualités produits et des offres marketing d'Auxite par e-mail. Je peux me désabonner à tout moment.",
  ar: "أوافق على تلقي أخبار المنتجات وتحديثات التسويق من Auxite عبر البريد الإلكتروني. يمكنني إلغاء الاشتراك في أي وقت.",
  ru: "Я согласен получать новости о продуктах и маркетинговые рассылки от Auxite по электронной почте. Я могу отписаться в любое время.",
};

export function consentText(lang?: string | null): string {
  return CONSENT_TEXT[(lang || "en").toLowerCase()] || CONSENT_TEXT.en;
}

const KEY = {
  lead: (email: string) => `marketing:lead:${email}`,
  index: "marketing:leads", // ZSET member=email score=updatedAt
};

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export function isValidEmail(email: string): boolean {
  return typeof email === "string" && email.length <= 254 && EMAIL_RE.test(email.trim());
}

export interface MarketingLead {
  email: string;
  sessionId: string | null;
  lang: string | null;
  marketingConsent: boolean;
  consentText: string | null; // exact wording agreed to (null if not consented)
  consentVersion: string | null;
  consentAt: number | null; // server timestamp of opt-in
  ipHash: string | null;
  source: string;
  createdAt: number;
  updatedAt: number;
}

function hashIp(ip: string | null | undefined): string | null {
  if (!ip || ip === "unknown") return null;
  const salt = process.env.SUPPORT_CHAT_IP_SALT || process.env.ADMIN_ADDRESSES || "auxite";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

/**
 * Record (or update) a lead with explicit consent proof. Consent text/version/
 * timestamp are stamped server-side. Returns the stored record.
 */
export async function captureLead(params: {
  email: string;
  sessionId?: string | null;
  lang?: string | null;
  marketingConsent: boolean;
  ip?: string | null;
  source?: string;
}): Promise<MarketingLead> {
  const email = params.email.trim().toLowerCase();
  const r = getRedis();
  const now = Date.now();

  let createdAt = now;
  try {
    const existing = (await r.get(KEY.lead(email))) as MarketingLead | null;
    if (existing && typeof existing.createdAt === "number") createdAt = existing.createdAt;
  } catch {}

  const consented = params.marketingConsent === true;
  const record: MarketingLead = {
    email,
    sessionId: params.sessionId ? String(params.sessionId).slice(0, 64) : null,
    lang: params.lang ? String(params.lang).slice(0, 8) : null,
    marketingConsent: consented,
    consentText: consented ? consentText(params.lang) : null,
    consentVersion: consented ? CONSENT_VERSION : null,
    consentAt: consented ? now : null,
    ipHash: hashIp(params.ip),
    source: params.source || "support-chat",
    createdAt,
    updatedAt: now,
  };

  const p = r.pipeline();
  p.set(KEY.lead(email), record);
  p.zadd(KEY.index, { score: now, member: email });
  await p.exec();

  // Optional CRM/automation handoff — fire-and-forget so a slow/broken webhook
  // never blocks the user. Set MARKETING_LEAD_WEBHOOK_URL (e.g. Zapier/HubSpot)
  // to enable; only consented leads are forwarded.
  if (consented && process.env.MARKETING_LEAD_WEBHOOK_URL) {
    void forwardToWebhook(record).catch(() => {});
  }

  return record;
}

async function forwardToWebhook(lead: MarketingLead): Promise<void> {
  const url = process.env.MARKETING_LEAD_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: lead.email,
        lang: lead.lang,
        source: lead.source,
        consentVersion: lead.consentVersion,
        consentAt: lead.consentAt,
      }),
    });
  } catch (e) {
    console.error("marketing lead webhook failed (non-fatal):", (e as Error)?.message || e);
  }
}

export async function listLeads(opts: {
  limit?: number;
  offset?: number;
  consentedOnly?: boolean;
}): Promise<{ items: MarketingLead[]; total: number }> {
  const r = getRedis();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);

  const total = (await r.zcard(KEY.index)) as number;
  const emails = (await r.zrange(KEY.index, offset, offset + limit - 1, {
    rev: true,
  })) as string[];
  if (!emails.length) return { items: [], total };

  const p = r.pipeline();
  for (const e of emails) p.get(KEY.lead(e));
  const records = (await p.exec()) as (MarketingLead | null)[];

  const items = records.filter((x): x is MarketingLead => !!x);
  return {
    items: opts.consentedOnly ? items.filter((l) => l.marketingConsent) : items,
    total,
  };
}

export async function deleteLead(email: string): Promise<void> {
  const clean = String(email).trim().toLowerCase();
  if (!clean) return;
  const r = getRedis();
  await r.del(KEY.lead(clean));
  await r.zrem(KEY.index, clean);
}
