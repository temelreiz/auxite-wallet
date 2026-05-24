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
import { ethers } from "ethers";
import { getRedis } from "@/lib/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { getAuxrPricing } from "@/lib/auxr-pricing";
import { getReserveSnapshot } from "@/lib/auxr-reserve";
import { deriveTronAddress, TRON_USDT_CONTRACT, isTronConfigured } from "@/lib/tron-deposit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const BASE_RPC = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const HOT_EVM = (process.env.HOT_WALLET_ETH_ADDRESS || "").toLowerCase();
const HOT_BTC = process.env.HOT_WALLET_BTC_ADDRESS || "";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT_BASE = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const ERC20 = ["function balanceOf(address) view returns (uint256)"];
const SUN = 1_000_000;

function tronTreasury(): string {
  if (process.env.HOT_WALLET_TRON_ADDRESS) return process.env.HOT_WALLET_TRON_ADDRESS;
  try { return isTronConfigured() ? deriveTronAddress(0) : ""; } catch { return ""; }
}

// Base hot wallet: USDC / USDT / ETH.
async function baseTreasury() {
  const out: any = { address: HOT_EVM || null, usdc: 0, usdt: 0, eth: 0, ok: false };
  if (!HOT_EVM) return out;
  try {
    const p = new ethers.JsonRpcProvider(BASE_RPC);
    const usdc = new ethers.Contract(USDC_BASE, ERC20, p);
    const usdt = new ethers.Contract(USDT_BASE, ERC20, p);
    const wei = await p.getBalance(HOT_EVM);
    const c = (await usdc.balanceOf(HOT_EVM)) as bigint;
    const t = (await usdt.balanceOf(HOT_EVM)) as bigint;
    out.eth = Number(ethers.formatEther(wei));
    out.usdc = Number(ethers.formatUnits(c, 6));
    out.usdt = Number(ethers.formatUnits(t, 6));
    out.ok = true;
  } catch (e: any) {
    out.error = e?.shortMessage || e?.message || "rpc_error";
  }
  return out;
}

// Tron treasury: TRX + USDT via TronGrid (uses TRONGRID_API_KEY if set).
async function tronTreasuryBalances() {
  const address = tronTreasury();
  const out: any = { address: address || null, trx: 0, usdt: 0, ok: false };
  if (!address) return out;
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, { headers, cache: "no-store" });
    const data = await res.json();
    const acct = (data?.data || [])[0] || {};
    out.trx = Number(acct.balance || 0) / SUN;
    const trc = acct.trc20 || [];
    for (const entry of trc) {
      const raw = entry[TRON_USDT_CONTRACT];
      if (raw !== undefined) out.usdt = Number(raw) / SUN;
    }
    out.ok = true;
  } catch (e: any) {
    out.error = e?.message || "trongrid_error";
  }
  return out;
}

async function btcTreasury() {
  if (!HOT_BTC) return { address: null, btc: 0, ok: false };
  try {
    const res = await fetch(`https://blockstream.info/api/address/${HOT_BTC}`, { cache: "no-store" });
    const d = await res.json();
    const funded = d?.chain_stats?.funded_txo_sum || 0;
    const spent = d?.chain_stats?.spent_txo_sum || 0;
    return { address: HOT_BTC, btc: (funded - spent) / 1e8, ok: true };
  } catch (e: any) {
    return { address: HOT_BTC, btc: 0, ok: false, error: e?.message };
  }
}

// ETH/BTC spot (USD) for AUM valuation — best-effort via CoinGecko.
async function cryptoSpot(): Promise<{ eth: number; btc: number; ok: boolean }> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd",
      { cache: "no-store" }
    );
    const d = await res.json();
    return { eth: Number(d?.ethereum?.usd || 0), btc: Number(d?.bitcoin?.usd || 0), ok: true };
  } catch {
    return { eth: 0, btc: 0, ok: false };
  }
}

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

  // ── Client aggregate: total AUM + AUXR ─────────────────────────────────────
  let totalAum = 0;
  let userCount = 0;
  let sumAuxrUnits = 0;
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
        const auxm = num((d as any).auxm) + num((d as any).bonusAuxm ?? (d as any).bonusauxm);
        const auxr = num((d as any).auxr);
        const usd = num((d as any).usd) + num((d as any).usdc) + num((d as any).usdt);
        const eth = num((d as any).eth);
        const b = num((d as any).btc);
        sumAuxrUnits += auxr;
        totalAum += auxm + usd + auxr * nav + eth * spot.eth + b * spot.btc;
      }
    }
  } catch {}

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
      usd: await r.get("treasury:usd:cash").then((v) => (v != null ? Number(v) : null)).catch(() => null),
    },
    clients: {
      userCount,
      totalAumUSD: totalAum,
      totalAuxrUnits: snap?.supplyUnits ?? sumAuxrUnits,
      auxrMarketCapUSD: snap?.marketCapUSD ?? sumAuxrUnits * nav,
    },
    auxrReserve: reserve,
    pricing: pricing ? { navUSD: pricing.navUSD, buyPriceUSD: pricing.buyPriceUSD } : null,
    meta: { cryptoSpotOk: spot.ok, baseOk: base.ok, tronOk: tron.ok, ts: Date.now() },
  });
}
