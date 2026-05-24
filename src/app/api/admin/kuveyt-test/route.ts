// ============================================================================
// /api/admin/kuveyt-test — READ-ONLY KuveytTürk connectivity check.
// Verifies: OAuth token (client_credentials) + RSA-signed request works, and
// shows which environment we're hitting + the live precious-metal rates +
// their currency. NO orders, no money movement.
//
// Auth: Bearer ${CRON_SECRET} OR a valid admin session.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import * as crypto from "crypto";
import { requireAdmin } from "@/lib/admin-auth";
import { getAccessToken, getPreciousMetalRates, getAuxiteMetalRates } from "@/lib/kuveytturk-service";

// Self-contained signed GET against /v1/preciousmetal/rates, trying different
// "what to sign" variants so we can see which one the gateway accepts.
async function probeSignatureVariants() {
  const baseUrl = process.env.KUVEYTTURK_BASE_URL || "https://prep-gateway.kuveytturk.com.tr";
  const clientId = (process.env.KUVEYTTURK_CLIENT_ID || "").trim();
  const subKey = process.env.KUVEYTTURK_SUBSCRIPTION_KEY || "";
  const rawKey = process.env.KUVEYTTURK_RSA_PRIVATE_KEY || "";
  const pem = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  // Derive the public key from the env PRIVATE key. THIS is exactly what must be
  // registered at the bank for signatures to validate — compare it to the portal.
  let derivedPublicKey = "";
  try { derivedPublicKey = crypto.createPublicKey(pem).export({ type: "spki", format: "pem" }) as string; }
  catch (e: any) { derivedPublicKey = `ERR ${e?.message}`; }

  let token = "";
  try { token = await getAccessToken(); } catch (e: any) { return { derivedPublicKey, tokenError: e?.message }; }

  const sign = (input: string) => {
    const s = crypto.createSign("RSA-SHA256");
    s.update(input, "utf8");
    s.end();
    return s.sign(pem, "base64");
  };

  // payload is empty for the parameter-less GET /v1/preciousmetal/rates
  const variants: Record<string, string> = {
    token_trim: token.trim(),
    token_raw: token,
    clientId: clientId,
  };

  const out: any[] = [];
  for (const [name, input] of Object.entries(variants)) {
    let signature = "";
    try { signature = sign(input); } catch (e: any) { out.push({ variant: name, signError: e?.message }); continue; }
    try {
      const res = await fetch(`${baseUrl}/v1/preciousmetal/rates`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Signature: signature,
          "Content-Type": "application/json",
          ...(subKey ? { "Ocp-Apim-Subscription-Key": subKey, apikey: subKey } : {}),
        },
        cache: "no-store",
      });
      const body = await res.text();
      out.push({ variant: name, status: res.status, body: body.slice(0, 160) });
    } catch (e: any) {
      out.push({ variant: name, fetchError: e?.message });
    }
  }
  return { tokenLen: token.length, derivedPublicKey, results: out };
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const CRON_SECRET = process.env.CRON_SECRET;

async function authed(request: NextRequest): Promise<boolean> {
  if (CRON_SECRET && request.headers.get("authorization") === `Bearer ${CRON_SECRET}`) return true;
  try {
    const a = await requireAdmin(request);
    return a.authorized;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  if (!(await authed(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const env = {
    baseUrl: process.env.KUVEYTTURK_BASE_URL || "(default prep)",
    tokenUrl: process.env.KUVEYTTURK_TOKEN_URL || "(default prep)",
    isProd: !/prep|test|sandbox/i.test(process.env.KUVEYTTURK_BASE_URL || ""),
    clientIdSet: !!process.env.KUVEYTTURK_CLIENT_ID,
    clientSecretSet: !!process.env.KUVEYTTURK_CLIENT_SECRET,
    rsaKeySet: !!process.env.KUVEYTTURK_RSA_PRIVATE_KEY,
    subscriptionKeySet: !!process.env.KUVEYTTURK_SUBSCRIPTION_KEY,
    scope: process.env.KUVEYTTURK_SCOPE || "public",
    accountTL: process.env.KUVEYTTURK_ACCOUNT_TL || null,
    accountUSD: process.env.KUVEYTTURK_ACCOUNT_USD || null,
    username: process.env.KUVEYTTURK_USERNAME ? "(set)" : null,
  };

  // Safe RSA key diagnostics — header/footer lines + structure only, NEVER the
  // base64 body. Tells us if the PEM lost its newlines or is the wrong type.
  const rawKey = process.env.KUVEYTTURK_RSA_PRIVATE_KEY || "";
  const normKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;
  const keyLines = normKey.split("\n").filter((l) => l.length > 0);
  const keyDiag = {
    present: !!rawKey,
    rawLength: rawKey.length,
    hadEscapedNewlines: rawKey.includes("\\n"),
    lineCount: keyLines.length,
    firstLine: keyLines[0] || null,           // e.g. "-----BEGIN PRIVATE KEY-----"
    lastLine: keyLines[keyLines.length - 1] || null, // e.g. "-----END PRIVATE KEY-----"
    looksFlattened: keyLines.length <= 3,      // PEM should be ~20+ lines
  };

  // Step 1: OAuth token
  let tokenOk = false;
  let tokenErr: string | null = null;
  try {
    const tok = await getAccessToken();
    tokenOk = !!tok && tok.length > 10;
  } catch (e: any) {
    tokenErr = e?.message || String(e);
  }

  // Step 2: RSA-signed rate fetch (proves signing works end-to-end)
  let rates: any = null;
  let auxite: any = null;
  let ratesErr: string | null = null;
  try {
    rates = await getPreciousMetalRates();      // raw: fxCode + TL/gram buy/sell
    auxite = await getAuxiteMetalRates();        // mapped AUXG/AUXS/AUXPT/AUXPD
  } catch (e: any) {
    ratesErr = e?.message || String(e);
  }

  const signatureProbe = await probeSignatureVariants().catch((e) => ({ error: e?.message }));

  return NextResponse.json({
    success: tokenOk && !ratesErr,
    env,
    keyDiag,
    signatureProbe,
    token: { ok: tokenOk, error: tokenErr },
    rates: {
      ok: !ratesErr,
      error: ratesErr,
      currencyNote: "KuveytTürk metal rate'leri TL/gram cinsindendir.",
      raw: rates,
      auxiteMapped: auxite,
    },
    ts: new Date().toISOString(),
  });
}
