// ============================================================================
// GET /api/auxr/reserves
// ----------------------------------------------------------------------------
// Public Proof-of-Reserves endpoint. Compares what is owed (AUXR on the
// off-chain ledger plus AUXR on Base) with the latest issuer-reported holdings
// statement. See src/lib/auxr-backing.ts.
//
// `backing.fullyBacked` is true ONLY with a statement newer than the max age
// that covers every basket metal. With no statement it is false and the
// ratios are null; the figures are issuer-reported and not audited either way.
//
// Consumed by /proof-of-reserves, /admin/auxr and the mobile app (web view).
// Caching: 60s edge cache.
// ============================================================================

import { NextResponse } from "next/server";
import { getBackingReport, STATEMENT_MAX_AGE_DAYS } from "@/lib/auxr-backing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await getBackingReport();

    return NextResponse.json(
      {
        success: true,
        status: r.status,
        supply: {
          unitsAUXR: r.liability.totalUnits,
          offChainUnits: r.liability.offChainUnits,
          onChainUnits: r.liability.onChainUnits,
          unrecoverableUnits: r.liability.unrecoverableUnits,
          marketCapUSD: r.liabilityUSD,
        },
        reserves: {
          grams: r.heldGrams,
          totalValueUSD: r.heldUSD,
          basis: "issuer_reported_statement",
          statementAsOf: r.statementAsOf ? new Date(r.statementAsOf).toISOString() : null,
          statementAgeDays: r.statementAgeDays != null ? Math.floor(r.statementAgeDays) : null,
          maxAgeDays: STATEMENT_MAX_AGE_DAYS,
        },
        required: {
          grams: r.requiredGrams,
        },
        backing: {
          ratio: r.ratio,
          fullyBacked: r.fullyBacked,
          surplusGrams: r.surplusGrams,
        },
        attestation: "none — holdings are issuer-reported and have not been independently verified",
        timestamp: r.timestamp,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e: any) {
    console.error("[/api/auxr/reserves] error:", e);
    return NextResponse.json(
      { success: false, error: "reserves_unavailable" },
      { status: 503 }
    );
  }
}
