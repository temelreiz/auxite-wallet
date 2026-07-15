// ============================================================================
// GET /api/cron/auxr-ops-watch — AUXR ops watchdog (Vercel Cron).
//
// Runs every few minutes and fires Telegram alerts when something needs an
// operator's attention:
//   1. Reserve under-collateralised (weakest backing leg < 100%)
//   2. CEX price deviates from NAV beyond threshold (abnormal-fluctuation / BML
//      risk — this is what the listing addendum penalises)
//   3. Contract unexpectedly paused
//   4. On-chain vs off-chain supply drift beyond tolerance
//
// Alerts are de-duplicated via a Redis flag with TTL so the same condition
// doesn't spam the channel every run. Read-only.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getReserveSnapshot } from "@/lib/auxr-reserve";
import { getAuxrPricing } from "@/lib/auxr-pricing";
import { getBitmartTicker } from "@/lib/bitmart";
import { getOnChainTotalSupply, weiToAuxr, isPaused } from "@/lib/auxr-onchain";
import { sendTelegramMessage } from "@/lib/telegram";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const DEVIATION_ALERT_BPS = Number(process.env.AUXR_DEVIATION_ALERT_BPS || 300); // 3%
const BACKING_ALERT_PCT = Number(process.env.AUXR_BACKING_ALERT_PCT || 99.99);
const SUPPLY_DRIFT_ALERT = Number(process.env.AUXR_SUPPLY_DRIFT_ALERT || 1); // units
const DEDUPE_TTL = Number(process.env.AUXR_ALERT_DEDUPE_SECONDS || 1800); // 30 min

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try { return await p; } catch { return fallback; }
}

/** Send once per condition per TTL window. Returns true if sent. */
async function alertOnce(key: string, message: string): Promise<boolean> {
  try {
    const r = getRedis();
    const ok = await r.set(`auxr:alert:${key}`, Date.now().toString(), { nx: true, ex: DEDUPE_TTL });
    if (ok === null) return false; // already alerted recently
    await sendTelegramMessage(message);
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!cronHeader && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [snap, pricing, ticker, chainWei, paused] = await Promise.all([
    safe(getReserveSnapshot(), null as any),
    safe(getAuxrPricing(), null as any),
    safe(getBitmartTicker(), null as any),
    safe(getOnChainTotalSupply(), null as unknown as bigint),
    safe(isPaused(), null as any),
  ]);

  const fired: string[] = [];

  // 1. Backing under-collateralised
  if (snap?.backingRatio?.weakest != null) {
    const weakestPct = snap.backingRatio.weakest * 100;
    if (weakestPct < BACKING_ALERT_PCT) {
      if (await alertOnce("backing", `🔴 <b>AUXR backing breach</b>\nWeakest leg: <b>${weakestPct.toFixed(2)}%</b> (threshold ${BACKING_ALERT_PCT}%)\nSupply: ${snap.supplyUnits} AUXR · Reserves: $${Math.round(snap.reservesUSD || 0).toLocaleString()}`))
        fired.push("backing");
    }
  }

  // 2. CEX price deviation from NAV (only when listed)
  const nav = pricing?.navUSD;
  if (ticker?.listed && ticker.last && nav && nav > 0) {
    const devBps = ((ticker.last - nav) / nav) * 10000;
    if (Math.abs(devBps) >= DEVIATION_ALERT_BPS) {
      if (await alertOnce("deviation", `🟠 <b>AUXR price vs NAV deviation</b>\nCEX (BitMart): <b>$${ticker.last}</b>\nNAV: <b>$${nav.toFixed(3)}</b>\nDeviation: <b>${(devBps / 100).toFixed(2)}%</b> (threshold ${(DEVIATION_ALERT_BPS / 100).toFixed(1)}%)\n→ Check MM / arbitrage; sustained deviation risks BML abnormal-fluctuation triggers.`))
        fired.push("deviation");
    }
  }

  // 3. Contract paused
  if (paused === true) {
    if (await alertOnce("paused", `⏸️ <b>AUXR contract is PAUSED</b>\nAll transfers/mints/burns halted on-chain. Confirm this is intentional.`))
      fired.push("paused");
  }

  // 4. Supply drift (off-chain ledger vs on-chain)
  if (snap?.supplyUnits != null && chainWei != null) {
    const onChain = weiToAuxr(chainWei as bigint);
    const drift = Math.abs(snap.supplyUnits - onChain);
    if (drift > SUPPLY_DRIFT_ALERT) {
      if (await alertOnce("supply-drift", `⚠️ <b>AUXR supply drift</b>\nOff-chain ledger: ${snap.supplyUnits} · On-chain: ${onChain}\nDrift: <b>${drift.toFixed(3)} AUXR</b> (threshold ${SUPPLY_DRIFT_ALERT})`))
        fired.push("supply-drift");
    }
  }

  return NextResponse.json({
    success: true,
    checked: { backing: snap?.backingRatio?.weakest != null, cexListed: !!ticker?.listed, paused: paused === true },
    alertsFired: fired,
    timestamp: Date.now(),
  });
}
