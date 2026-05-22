// ============================================================================
// GET /api/auxr/reserves
// ----------------------------------------------------------------------------
// Public Proof-of-Reserves endpoint. Returns:
//   - Outstanding AUXR supply (units)
//   - Grams of each metal currently reserved
//   - Grams required to fully back current supply
//   - Backing ratio per metal + weakest leg
//   - USD value of reserves vs market cap
//
// This is the data structure consumed by:
//   - Public PoR page at /proof-of-reserves
//   - Mobile app About → AUXR Reserves screen
//   - Third-party auditors (Sumsub, LBMA Good Delivery reviewers)
//
// Caching: 60s edge cache. PoR doesn't need to update instantly — the
// reserve snapshot only moves on mint/burn events.
// ============================================================================

import { NextResponse } from "next/server";
import { getReserveSnapshot } from "@/lib/auxr-reserve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const snap = await getReserveSnapshot();

    // Compute a derived "fully backed" flag with a tiny tolerance band for
    // floating-point noise. Below 99.99% is a real under-collateralization.
    const FULLY_BACKED_THRESHOLD = 0.9999;
    const fullyBacked = snap.backingRatio.weakest >= FULLY_BACKED_THRESHOLD;

    return NextResponse.json(
      {
        success: true,
        supply: {
          unitsAUXR: snap.supplyUnits,
          marketCapUSD: snap.marketCapUSD,
        },
        reserves: {
          grams: snap.reservesGrams,
          totalValueUSD: snap.reservesUSD,
        },
        required: {
          grams: snap.requiredGrams,
        },
        backing: {
          ratio: snap.backingRatio,
          fullyBacked,
          // Surplus = reserves minus required, in grams. Positive = healthy.
          surplusGrams: {
            gold: snap.reservesGrams.gold - snap.requiredGrams.gold,
            silver: snap.reservesGrams.silver - snap.requiredGrams.silver,
            platinum: snap.reservesGrams.platinum - snap.requiredGrams.platinum,
            palladium: snap.reservesGrams.palladium - snap.requiredGrams.palladium,
          },
        },
        timestamp: snap.lastUpdated,
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
      { success: false, error: e?.message || "reserves_unavailable" },
      { status: 500 }
    );
  }
}
