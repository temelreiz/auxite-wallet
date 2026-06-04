// src/app/api/user/kyc-limits/route.ts
// Returns the caller's soft KYC limit state so the buy modal can show
// "$X remaining" copy in real time without having to round-trip a full
// PI creation just to learn the ceiling. Read-only; no auth needed beyond
// supplying the wallet address (limits are not sensitive info).

import { NextRequest, NextResponse } from "next/server";
import { checkKycLimit, NO_KYC_LIMIT_USD, NO_KYC_CUMULATIVE_30D_USD } from "@/lib/kyc-limits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const address = (req.nextUrl.searchParams.get("address") || "").trim().toLowerCase();
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  // Probe with $0 — checkKycLimit's per-tx leg never triggers, so we get
  // an "allowed: true" decision back with the actual recentSpend/remaining
  // numbers populated. The UI uses those to render copy.
  const d = await checkKycLimit(address, 0);
  return NextResponse.json({
    kycVerified: d.kycVerified,
    perTxLimitUSD: NO_KYC_LIMIT_USD,
    cumulativeLimit30dUSD: NO_KYC_CUMULATIVE_30D_USD,
    recentSpendUSD: d.recentSpendUSD,
    remainingUSD: d.kycVerified ? null : d.remainingUSD,
  });
}
