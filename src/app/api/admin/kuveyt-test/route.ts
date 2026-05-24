// ============================================================================
// /api/admin/kuveyt-test — READ-ONLY KuveytTürk connectivity check.
// Verifies: OAuth token (client_credentials) + RSA-signed request works, and
// shows which environment we're hitting + the live precious-metal rates +
// their currency. NO orders, no money movement.
//
// Auth: Bearer ${CRON_SECRET} OR a valid admin session.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAccessToken, getPreciousMetalRates, getAuxiteMetalRates } from "@/lib/kuveytturk-service";

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

  return NextResponse.json({
    success: tokenOk && !ratesErr,
    env,
    keyDiag,
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
