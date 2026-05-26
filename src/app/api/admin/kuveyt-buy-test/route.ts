// ============================================================================
// /api/admin/kuveyt-buy-test — TEMPORARY sandbox buy verification.
// Does ONE small precious-metal buy funded from the USD account (102) using
// KT's TL/gram BuyRate, and returns KT's raw response — to verify whether a
// USD-funded buy with a TL rate is accepted (or needs a USD rate / other param).
//
// SANDBOX ONLY guard: refuses to run if the base URL looks like production.
// Auth: Bearer ${CRON_SECRET} OR a valid admin session. Requires ?confirm=yes.
// Remove this route after verification.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getPreciousMetalRates,
  buyPreciousMetal,
  getMetalAccountSuffix,
  AUXITE_TO_KT_MAP,
} from "@/lib/kuveytturk-service";

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

export async function POST(request: NextRequest) {
  if (!(await authed(request))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  if (searchParams.get("confirm") !== "yes") {
    return NextResponse.json({ error: "Pass ?confirm=yes to execute a sandbox test buy" }, { status: 400 });
  }

  const baseUrl = process.env.KUVEYTTURK_BASE_URL || "";
  const looksProd = !/prep|test|sandbox/i.test(baseUrl) && baseUrl !== "";
  if (looksProd) {
    return NextResponse.json({ error: `Refusing: base URL not sandbox (${baseUrl})` }, { status: 400 });
  }

  const metal = (searchParams.get("metal") || "AUXG").toUpperCase();
  const grams = parseFloat(searchParams.get("grams") || "1");

  const fromAccount = parseInt(process.env.KUVEYTTURK_ACCOUNT_USD || process.env.KUVEYTTURK_ACCOUNT_TL || "0");
  const toAccount = getMetalAccountSuffix(metal);
  const username = process.env.KUVEYTTURK_USERNAME || "";

  // Resolve the TL/gram buy rate for this metal
  let buyRate = 0;
  let rateError: string | null = null;
  try {
    const rates = await getPreciousMetalRates();
    const fxCode = AUXITE_TO_KT_MAP[metal];
    const rate = rates.find((r) => r.fxCode === fxCode);
    buyRate = rate?.buyRate || 0;
  } catch (e: any) {
    rateError = e?.message || String(e);
  }

  const params = {
    AccountSuffixFrom: fromAccount, // USD (102)
    AccountSuffixTo: toAccount, // metal account (101/103/104/105)
    CorporateWebUserName: username,
    BuyRate: buyRate, // TL/gram
    ExchangeAmount: grams,
  };

  if (!fromAccount || !toAccount || !username || !buyRate) {
    return NextResponse.json({
      ok: false,
      reason: "missing config",
      detail: {
        fromAccountSet: !!fromAccount,
        toAccountSet: !!toAccount,
        usernameSet: !!username,
        buyRate,
        rateError,
      },
      params,
    });
  }

  try {
    const ktResponse = await buyPreciousMetal(params);
    return NextResponse.json({ ok: true, sandbox: true, params, ktResponse });
  } catch (e: any) {
    return NextResponse.json({ ok: false, sandbox: true, params, error: e?.message || String(e) });
  }
}
