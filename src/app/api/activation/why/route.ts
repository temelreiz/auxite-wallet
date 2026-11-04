// src/app/api/activation/why/route.ts
// The one-question survey linked from the why_stopped email. The email opens a
// page (GET) and only a button press records an answer (POST), because mail
// scanners follow every link in a message. Token-gated like /api/unsubscribe.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { timingSafeEqual } from "crypto";
import { activationLang, type ActivationLang } from "@/lib/activation-content";
import { WHY_HASH, WHY_REASONS, whyToken, type WhyReason } from "@/lib/activation-funnel";

export const dynamic = "force-dynamic";

const redis = Redis.fromEnv();

const TEXT: Record<ActivationLang, {
  question: string;
  thanks: string;
  invalid: string;
  reasons: Record<WhyReason, string>;
}> = {
  en: {
    question: "What stopped you from buying?",
    thanks: "Thank you. Your answer was saved.",
    invalid: "This link is no longer valid.",
    reasons: {
      trust: "I'm not sure I can trust it yet",
      price: "Fees or prices",
      verification: "Identity verification",
      payment: "My payment didn't work",
      later: "Just looking for now",
    },
  },
  tr: {
    question: "Almanıza ne engel oldu?",
    thanks: "Teşekkürler. Cevabınız kaydedildi.",
    invalid: "Bu bağlantı artık geçerli değil.",
    reasons: {
      trust: "Henüz güvenebileceğimden emin değilim",
      price: "Ücretler veya fiyatlar",
      verification: "Kimlik doğrulaması",
      payment: "Ödemem gerçekleşmedi",
      later: "Şimdilik sadece bakıyorum",
    },
  },
  ar: {
    question: "ما الذي منعك من الشراء؟",
    thanks: "شكراً لك. تم حفظ إجابتك.",
    invalid: "هذا الرابط لم يعد صالحاً.",
    reasons: {
      trust: "لست متأكداً بعد من إمكانية الوثوق به",
      price: "الرسوم أو الأسعار",
      verification: "التحقق من الهوية",
      payment: "لم تنجح عملية الدفع",
      later: "أتصفح فقط في الوقت الحالي",
    },
  },
};

function tokenValid(email: string, token: string): boolean {
  if (!email.includes("@") || token.length !== 16) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(whyToken(email)));
  } catch {
    return false;
  }
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function page(L: ActivationLang, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html><html dir="${L === "ar" ? "rtl" : "ltr"}" lang="${L}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="robots" content="noindex"><title>Auxite</title></head>
<body style="margin:0;background:#f5f5f5;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1a"><main style="max-width:480px;margin:0 auto;padding:32px 16px">${body}</main></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: NextRequest) {
  const q = new URL(request.url).searchParams;
  const email = (q.get("email") || "").trim().toLowerCase();
  const token = q.get("token") || "";
  const L = activationLang(q.get("lang") || "en");
  const t = TEXT[L];
  if (!tokenValid(email, token)) return page(L, `<p>${t.invalid}</p>`, 403);

  const buttons = WHY_REASONS.map(
    (r) => `<button type="submit" name="reason" value="${r}" style="display:block;width:100%;min-height:48px;margin:0 0 10px;padding:12px 16px;background:#fff;border:1px solid #ccc;border-radius:8px;font-size:15px;color:#1a1a1a;text-align:start;cursor:pointer">${t.reasons[r]}</button>`,
  ).join("");
  return page(L, `<h1 style="font-size:20px;font-weight:600;margin:0 0 20px">${t.question}</h1>
<form method="post" action="/api/activation/why">
<input type="hidden" name="email" value="${escapeHtml(email)}"><input type="hidden" name="token" value="${escapeHtml(token)}"><input type="hidden" name="lang" value="${L}">
${buttons}</form>`);
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const email = String(form?.get("email") || "").trim().toLowerCase();
  const token = String(form?.get("token") || "");
  const reason = String(form?.get("reason") || "");
  const L = activationLang(String(form?.get("lang") || "en"));
  const t = TEXT[L];
  if (!tokenValid(email, token)) return page(L, `<p>${t.invalid}</p>`, 403);
  if (!WHY_REASONS.includes(reason as WhyReason)) return page(L, `<p>${t.invalid}</p>`, 400);

  // Keyed by email, so a second answer replaces the first instead of adding to it.
  await redis.hset(WHY_HASH, { [email]: reason });
  return page(L, `<p style="font-size:16px">${t.thanks}</p>`);
}
