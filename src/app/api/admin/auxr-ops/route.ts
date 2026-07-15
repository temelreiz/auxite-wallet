// ============================================================================
// GET /api/admin/auxr-ops  — AUXR Ops Cockpit data aggregator (admin-only).
//
// One call that assembles the full operating picture for AUXR:
//   • NAV + bid/ask (from the pricing engine)
//   • Live BitMart AUXR/USDT price + order-book depth (CEX)
//   • Price↔NAV deviation (the abnormal-fluctuation / BML risk signal)
//   • Reserve coverage — owed vs held grams, weakest backing leg
//   • Supply — off-chain ledger vs on-chain totalSupply (drift check)
//   • Liquid treasury backing (USD)
//
// Read-only. Every heavy source is wrapped so one failure can't blank the page.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAuxrPricing } from "@/lib/auxr-pricing";
import { getReserveSnapshot } from "@/lib/auxr-reserve";
import { liquidBackingUsd } from "@/lib/treasury-balances";
import { getOnChainTotalSupply, weiToAuxr, isPaused } from "@/lib/auxr-onchain";
import { getBitmartTicker, getBitmartDepth, computeDepthMetrics, AUXR_SYMBOL } from "@/lib/bitmart";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const [pricing, snap, backing, chainSupplyWei, paused, ticker, depth] = await Promise.all([
    safe(getAuxrPricing(), null as any),
    safe(getReserveSnapshot(), null as any),
    safe(liquidBackingUsd(), null as any),
    safe(getOnChainTotalSupply(), null as unknown as bigint),
    safe(isPaused(), null as any),
    safe(getBitmartTicker(), null as any),
    safe(getBitmartDepth(AUXR_SYMBOL, 50), null as any),
  ]);

  const nav: number | null = pricing?.navUSD ?? null;
  const cexLast: number | null = ticker?.listed ? ticker.last : null;

  // Deviation of CEX price from NAV (the key integrity/abnormal-fluctuation signal)
  let deviationBps: number | null = null;
  if (nav && cexLast && nav > 0) deviationBps = ((cexLast - nav) / nav) * 10000;

  // Order-book depth measured around NAV (fair-value anchored)
  const depthMetrics = depth?.listed && nav ? computeDepthMetrics(depth, nav) : null;

  // Supply: off-chain ledger vs on-chain totalSupply
  const offChainSupply: number | null = snap?.supplyUnits ?? null;
  const onChainSupply: number | null =
    chainSupplyWei != null ? weiToAuxr(chainSupplyWei as bigint) : null;

  return NextResponse.json({
    success: true,
    timestamp: Date.now(),
    price: {
      navUSD: nav,
      buyPriceUSD: pricing?.buyPriceUSD ?? null,
      sellPriceUSD: pricing?.sellPriceUSD ?? null,
      referenceNavUSD: 100,
      components: pricing?.components ?? null,
    },
    cex: {
      exchange: "BitMart",
      symbol: AUXR_SYMBOL,
      listed: !!ticker?.listed,
      last: cexLast,
      bid: ticker?.bid ?? null,
      ask: ticker?.ask ?? null,
      high24h: ticker?.high24h ?? null,
      low24h: ticker?.low24h ?? null,
      volume24h: ticker?.volume24h ?? null,
      quoteVolume24h: ticker?.quoteVolume24h ?? null,
      deviationBps,
      depth: depthMetrics,
    },
    reserve: snap
      ? {
          supplyUnits: snap.supplyUnits,
          reservesUSD: snap.reservesUSD,
          marketCapUSD: snap.marketCapUSD,
          weakestBackingPct: snap.backingRatio?.weakest != null ? snap.backingRatio.weakest * 100 : null,
          fullyBacked: snap.backingRatio?.weakest != null ? snap.backingRatio.weakest >= 0.9999 : null,
          backingRatio: snap.backingRatio ?? null,
          reservesGrams: snap.reservesGrams ?? null,
          requiredGrams: snap.requiredGrams ?? null,
        }
      : null,
    supply: {
      offChain: offChainSupply,
      onChain: onChainSupply,
      driftUnits:
        offChainSupply != null && onChainSupply != null ? offChainSupply - onChainSupply : null,
      contractPaused: paused,
    },
    treasury: backing
      ? { liquidBackingUSD: backing.usd, solvent: backing.ok, breakdown: backing.breakdown }
      : null,
  });
}
