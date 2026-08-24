// src/app/api/support-lead/route.ts
//
// Public endpoint the support widget calls when a user leaves their email and
// (optionally) ticks the marketing-consent box. Consent proof is stamped
// server-side in marketing-lead.ts. CORS mirrors /api/support-chat so the
// marketing site can embed the same widget.

import { NextRequest, NextResponse } from "next/server";
import { supportLeadLimiter } from "@/lib/security/rate-limiter";
import { captureLead, isValidEmail, consentText, CONSENT_VERSION } from "@/lib/marketing-lead";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = new Set([
  "https://auxite.io",
  "https://www.auxite.io",
  "http://localhost:3002",
]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  }
  return {};
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);
  const ip = clientIp(req);

  // Spam / abuse guard (fail-open on Redis hiccup).
  try {
    const { success, reset } = await supportLeadLimiter.limit(ip);
    if (!success) {
      const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { ...cors, "Retry-After": String(retryAfter) } },
      );
    }
  } catch {}

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400, headers: cors });
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400, headers: cors });
  }

  const lang = typeof body?.lang === "string" ? body.lang : null;
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;
  const marketingConsent = body?.marketingConsent === true;

  try {
    await captureLead({ email, sessionId, lang, marketingConsent, ip, source: "support-chat" });
  } catch (e) {
    console.error("support-lead capture failed:", (e as Error)?.message || e);
    return NextResponse.json({ error: "Could not save." }, { status: 500, headers: cors });
  }

  return NextResponse.json(
    { ok: true, marketingConsent, consentVersion: marketingConsent ? CONSENT_VERSION : null },
    { headers: cors },
  );
}

// Lets the widget render the exact server-side consent wording for a language
// (so the checkbox label and the stored proof always match).
export async function GET(req: NextRequest) {
  const cors = corsHeaders(req);
  const lang = new URL(req.url).searchParams.get("lang");
  return NextResponse.json(
    { text: consentText(lang), version: CONSENT_VERSION },
    { headers: cors },
  );
}
