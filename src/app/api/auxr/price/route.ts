// ============================================================================
// GET /api/auxr/price
// ----------------------------------------------------------------------------
// Public, unauthenticated endpoint. Returns the current AUXR NAV, buy/sell
// quote prices, and per-metal composition breakdown. Used by:
//   - Mobile app (Markets tab, Buy/Sell sheet)
//   - Public site (proof-of-reserves widget)
//   - Internal dashboards
//
// Caching: relies on price-cache.ts (60s underlying spot cache), so polling
// at the route level is fine. We set a short Cache-Control to encourage CDN
// reuse for unauthenticated browser polls.
// ============================================================================

import { NextResponse } from "next/server";
import {
  getAuxrPricing,
  AUXR_WEIGHTS,
  AUXR_GRAMS_PER_UNIT,
  AUXR_REFERENCE_NAV_USD,
  AUXR_BUY_SPREAD,
  AUXR_SELL_SPREAD,
  AUXR_MIN_PURCHASE_USD,
} from "@/lib/auxr-pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const pricing = await getAuxrPricing();

    return NextResponse.json(
      {
        success: true,
        // Live pricing
        navUSD: pricing.navUSD,
        buyPriceUSD: pricing.buyPriceUSD,
        sellPriceUSD: pricing.sellPriceUSD,
        spread: {
          buyBps: AUXR_BUY_SPREAD * 10000,
          sellBps: AUXR_SELL_SPREAD * 10000,
        },
        // Per-metal composition + contribution to NAV
        components: pricing.components,
        // Immutable basket constants
        basket: {
          weights: AUXR_WEIGHTS,
          gramsPerUnit: AUXR_GRAMS_PER_UNIT,
          referenceNavUSD: AUXR_REFERENCE_NAV_USD,
        },
        // Trading constraints
        constraints: {
          minPurchaseUSD: AUXR_MIN_PURCHASE_USD,
        },
        timestamp: pricing.timestamp,
      },
      {
        headers: {
          // 30s edge cache; spot prices already cached 60s server-side.
          // Stale-while-revalidate so users never see a slow read.
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (e: any) {
    console.error("[/api/auxr/price] error:", e);
    return NextResponse.json(
      { success: false, error: e?.message || "pricing_unavailable" },
      { status: 500 }
    );
  }
}
