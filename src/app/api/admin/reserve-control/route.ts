// ============================================================================
// /api/admin/reserve-control — treasury & reserve control surface.
//
// One read-only snapshot of "what we have vs what we owe":
//   • Treasury balances: Base hot wallet (USDC/USDT/ETH), Tron treasury
//     (TRX/USDT), BTC hot wallet, USD cash.
//   • Client aggregate: total AUM (USD), total AUXR units + market cap.
//   • AUXR physical reserve coverage: per-metal owed vs held grams, gap,
//     backing %, gap $ — the "neyimiz var neyimiz yok" view.
//
// Auth: admin session (Authorization: Bearer <session token>).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { getAuxrPricing } from "@/lib/auxr-pricing";
import { getReserveSnapshot } from "@/lib/auxr-reserve";
import {
  baseTreasury,
  tronTreasuryBalances,
  btcTreasury,
  cryptoSpot,
  computeBackingUsd,
} from "@/lib/treasury-balances";
import { getAuxmSupply } from "@/lib/auxm-ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function scanUserKeys(): Promise<string[]> {
  const r = getRedis();
  let cursor = "0";
  const out: string[] = [];
  do {
    const [next, batch] = (await r.scan(cursor, { match: "user:0x*:balance", count: 500 })) as [string, string[]];
    cursor = next;
    out.push(...batch);
  } while (cursor !== "0" && out.length < 20000);
  return out;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const r = getRedis();

  // AUXR pricing + reserve snapshot (owe vs held vs coverage).
  const [pricing, snap, base, tron, btc, spot] = await Promise.all([
    getAuxrPricing().catch(() => null),
    getReserveSnapshot().catch(() => null),
    baseTreasury(),
    tronTreasuryBalances(),
    btcTreasury(),
    cryptoSpot(),
  ]);

  const nav = pricing?.navUSD || 0;

  // ── Client aggregate: total AUM + AUXR + AUXM liability ─────────────────────
  let totalAum = 0;
  let userCount = 0;
  let sumAuxrUnits = 0;
  let sumAuxmCore = 0;   // hard AUXM liability (excludes promo bonus)
  let sumAuxmBonus = 0;  // promotional bonus AUXM
  let sumStable = 0;     // usd + usdc + usdt across users
  try {
    const keys = await scanUserKeys();
    userCount = keys.length;
    // Read balances in modest batches to limit memory/latency.
    const CHUNK = 100;
    for (let i = 0; i < keys.length; i += CHUNK) {
      const slice = keys.slice(i, i + CHUNK);
      const rows = await Promise.all(slice.map((k) => r.hgetall(k).catch(() => null)));
      for (const d of rows) {
        if (!d) continue;
        const num = (v: any) => parseFloat(String(v ?? 0)) || 0;
        const auxmCore = num((d as any).auxm);
        const auxmBonus = num((d as any).bonusAuxm ?? (d as any).bonusauxm);
        const auxm = auxmCore + auxmBonus;
        const auxr = num((d as any).auxr);
        const usd = num((d as any).usd) + num((d as any).usdc) + num((d as any).usdt);
        const eth = num((d as any).eth);
        const b = num((d as any).btc);
        sumAuxrUnits += auxr;
        sumAuxmCore += auxmCore;
        sumAuxmBonus += auxmBonus;
        sumStable += usd;
        totalAum += auxm + usd + auxr * nav + eth * spot.eth + b * spot.btc;
      }
    }
  } catch {}

  // ── AUXM ledger: outstanding liability vs liquid backing ────────────────────
  // Outstanding (authoritative) = sum of live balances. Counters (minted/burned)
  // are a secondary drift check vs the genesis baseline. Backing = liquid
  // treasury USD; solvency is judged against ALL redeemable stable liabilities
  // (AUXM + user USD/USDT/USDC), since one treasury backs them together.
  const cashUsd = await r.get("treasury:usd:cash").then((v) => (v != null ? Number(v) : 0)).catch(() => 0);
  const backing = computeBackingUsd(base, tron, btc, spot, cashUsd);
  const supply = await getAuxmSupply().catch(() => null);
  const stableLiabilities = sumAuxmCore + sumAuxmBonus + sumStable;
  const expectedOutstanding =
    supply && supply.genesisOutstanding != null
      ? supply.genesisOutstanding + supply.minted - supply.burned
      : null;
  const auxmLedger = {
    outstanding: sumAuxmCore,           // hard AUXM liability (excludes bonus)
    bonusOutstanding: sumAuxmBonus,
    stableLiabilitiesUSD: stableLiabilities,
    backingUSD: backing.usd,
    backingOk: backing.ok,
    backingBreakdown: backing.breakdown,
    coverageVsAuxm: sumAuxmCore > 0 ? backing.usd / sumAuxmCore : null,
    coverageVsStable: stableLiabilities > 0 ? backing.usd / stableLiabilities : null,
    solvent: backing.ok ? backing.usd >= stableLiabilities : null,
    minted: supply?.minted ?? null,
    burned: supply?.burned ?? null,
    genesisOutstanding: supply?.genesisOutstanding ?? null,
    expectedOutstanding,
    drift: expectedOutstanding != null ? sumAuxmCore - expectedOutstanding : null,
  };

  // ── AUXR reserve coverage table ────────────────────────────────────────────
  const metals = ["gold", "silver", "platinum", "palladium"] as const;
  const comp = pricing?.components;
  const reserve = snap
    ? {
        supplyUnits: snap.supplyUnits,
        nav,
        marketCapUSD: snap.marketCapUSD,
        reservesUSD: snap.reservesUSD,
        weakestBackingPct: (snap.backingRatio.weakest || 0) * 100,
        metals: metals.map((m) => {
          const owed = snap.requiredGrams[m] || 0;
          const held = snap.reservesGrams[m] || 0;
          const spotG = comp ? comp[m].spotUSDPerGram : 0;
          return {
            metal: m,
            owedGrams: owed,
            heldGrams: held,
            gapGrams: Math.max(0, owed - held),
            backingPct: owed > 0 ? (held / owed) * 100 : 100,
            spotUSDPerGram: spotG,
            gapUSD: Math.max(0, owed - held) * spotG,
          };
        }),
      }
    : null;

  return NextResponse.json({
    success: true,
    treasury: {
      base,                 // { address, usdc, usdt, eth }
      tron,                 // { address, trx, usdt }
      btc,                  // { address, btc }
      usd: cashUsd,
    },
    clients: {
      userCount,
      totalAumUSD: totalAum,
      totalAuxrUnits: snap?.supplyUnits ?? sumAuxrUnits,
      auxrMarketCapUSD: snap?.marketCapUSD ?? sumAuxrUnits * nav,
    },
    auxmLedger,
    auxrReserve: reserve,
    pricing: pricing ? { navUSD: pricing.navUSD, buyPriceUSD: pricing.buyPriceUSD } : null,
    meta: { cryptoSpotOk: spot.ok, baseOk: base.ok, tronOk: tron.ok, ts: Date.now() },
  });
}
