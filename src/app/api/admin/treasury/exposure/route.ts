// ============================================================================
// ADMIN TREASURY EXPOSURE — Phase 1 dashboard endpoint
// ----------------------------------------------------------------------------
// Companion to the legacy /api/admin/treasury (which aggregates client float,
// operating capital, settlement, etc). This endpoint focuses specifically on
// the new exposure-ledger + yield-pool modules so the ops dashboard can:
//
//   • Read real-time net locked positions per metal (AUXG/AUXS/AUXPT/AUXPD)
//   • Detect drift between the new ledger and the legacy
//     platform:staked:* hash (= missing recordExposureChange call)
//   • Inspect the yield pool (accrued vs distributed) Phase 2/3 will fund
//   • View pending threshold alerts the hedge engine should consume
//   • Trigger a yield distribution manually (commit=1) for testing
//
// GET  /api/admin/treasury/exposure
// POST /api/admin/treasury/exposure   { commit?: boolean }
//
// Admin auth required.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getMetalPrices } from "@/lib/price-cache";
import {
  METALS,
  getAllExposures,
  getRecentEvents,
  getPendingAlerts,
  getLegacyPlatformStaked,
  type MetalSymbol,
} from "@/lib/treasury-exposure";
import {
  getYieldPool,
  getRecentIncome,
  getIncomeForDay,
  distributeAllMetals,
} from "@/lib/yield-accounting";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const exposures = await getAllExposures();
    const prices = await getMetalPrices().catch(() => ({
      gold: 0, silver: 0, platinum: 0, palladium: 0,
    } as Record<string, number>));

    const priceByMetal: Record<MetalSymbol, number> = {
      AUXG: prices.gold,
      AUXS: prices.silver,
      AUXPT: prices.platinum,
      AUXPD: prices.palladium,
    };

    const metals: Record<string, any> = {};
    let totalLockedUsd = 0;
    let totalIssuedUsd = 0;
    let totalHedgeNeededUsd = 0;

    for (const m of METALS) {
      const exp = exposures[m];
      const pool = await getYieldPool(m);
      const legacyStaked = await getLegacyPlatformStaked(m);
      const todayIncome = await getIncomeForDay(m);

      const price = priceByMetal[m] || 0;
      const lockedUsd = exp.locked * price;
      const totalUsd = exp.total * price;
      // Phase 1 target: hedge 95% of locked exposure. Phase 2 makes this
      // dynamic against volatility + concentration.
      const hedgeNeededUsd = lockedUsd * 0.95;

      totalLockedUsd += lockedUsd;
      totalIssuedUsd += totalUsd;
      totalHedgeNeededUsd += hedgeNeededUsd;

      // Drift detection — the existing staking flow writes to
      // platform:staked:{metal}.active. If our new ledger disagrees by
      // > 0.5g (or > 1%), an endpoint forgot to call
      // recordExposureChange() and ops should investigate.
      const drift = exp.locked - legacyStaked;
      const driftPct = legacyStaked > 0 ? (drift / legacyStaked) * 100 : 0;

      metals[m] = {
        exposure: exp,
        usd: {
          locked: lockedUsd,
          total: totalUsd,
          free: (exp.total - exp.locked) * price,
        },
        pricePerGram: price,
        yieldPool: pool,
        todayIncome,
        legacyPlatformStaked: legacyStaked,
        drift: {
          grams: drift,
          pct: driftPct,
          flagged: Math.abs(drift) > 0.5 || Math.abs(driftPct) > 1,
        },
        hedge: {
          neededUsd: hedgeNeededUsd,
          // Populated by abaxx-hedge.ts in Phase 2.
          currentHedgeUsd: 0,
          gapUsd: hedgeNeededUsd,
        },
      };
    }

    const alerts = await getPendingAlerts();
    const recentEvents = await getRecentEvents(50);
    const recentIncome = await getRecentIncome(20);

    return NextResponse.json({
      success: true,
      summary: {
        totalLockedUsd: Math.round(totalLockedUsd),
        totalIssuedUsd: Math.round(totalIssuedUsd),
        totalHedgeNeededUsd: Math.round(totalHedgeNeededUsd),
        utilizationPct: totalIssuedUsd > 0
          ? Math.round((totalLockedUsd / totalIssuedUsd) * 10000) / 100
          : 0,
        pendingAlertCount: alerts.length,
      },
      metals,
      alerts,
      recentEvents,
      recentIncome,
      computedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[admin/treasury/exposure GET] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
  }
}

/**
 * Yield distribution — dry-run by default. Pass { commit: true } to apply.
 *
 * Phase 1 has no automated income source yet so this runs against an empty
 * pool unless ops has manually inserted income via recordDailyIncome().
 * Phase 2/3 will hook this to a daily cron.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const url = new URL(request.url);
    let commit = url.searchParams.get("commit") === "1";
    try {
      const body = await request.json();
      if (typeof body?.commit === "boolean") commit = body.commit;
    } catch {
      // empty body, query param wins
    }

    const results = await distributeAllMetals(commit);
    return NextResponse.json({
      success: true,
      commit,
      results,
      ranAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[admin/treasury/exposure POST] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
  }
}
