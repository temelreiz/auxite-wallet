// ============================================================================
// GET /api/cron/auxr-ops-watch — AUXR ops watchdog (Vercel Cron, */5).
//
// Two jobs, so the operator never has to watch Telegram minute-by-minute:
//
//  A) ESCALATION alerts — fire Telegram ONLY when something needs a human and
//     the market maker (Echo Trade) can't/won't self-heal it:
//       1. Reserve under-collateralised (weakest backing leg < 100%)
//       2. CEX price deviates from NAV — PERSISTENCE-GATED: only escalates
//          after the deviation survives N consecutive checks (default 15 min),
//          giving the MM a window to close it before the operator is pinged.
//       3. Market-maker spread blowout (wide bid/ask ⇒ Echo Trade not quoting)
//       4. Contract unexpectedly paused
//       5. On-chain vs off-chain supply drift beyond tolerance
//
//  B) DAILY DIGEST heartbeat — once per UTC day, one compact "all-green"
//     status line (NAV/gross/fee, CEX price+deviation, spread, 24h volume,
//     backing, supply). Doubles as a DEAD-MAN'S SWITCH: if the digest stops
//     arriving, the watchdog itself is down — silence no longer reads as safe.
//
// Alerts are de-duplicated via Redis flags with TTL. Read-only (no trading).
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
const DEVIATION_PERSIST_RUNS = Number(process.env.AUXR_DEVIATION_PERSIST_RUNS || 3); // ×5min = 15min
const SPREAD_ALERT_BPS = Number(process.env.AUXR_SPREAD_ALERT_BPS || 200); // 2% MM spread
const BACKING_ALERT_PCT = Number(process.env.AUXR_BACKING_ALERT_PCT || 99.99);
const SUPPLY_DRIFT_ALERT = Number(process.env.AUXR_SUPPLY_DRIFT_ALERT || 1); // units
// AUXR minted on-chain OUTSIDE the managed off-chain ledger — the founder
// allocation and MM seed, which are backed externally (founder's own metal) and
// intentionally never recorded via recordMint. Without accounting for it, the
// drift check compares total on-chain supply against only the managed off-chain
// supply and fires forever. Set this to that known external issuance so only
// NEW, unexplained drift alerts.
const EXTERNAL_ONCHAIN_SUPPLY = Number(process.env.AUXR_EXTERNAL_ONCHAIN_SUPPLY || 0); // units
const DEDUPE_TTL = Number(process.env.AUXR_ALERT_DEDUPE_SECONDS || 1800); // 30 min
const DIGEST_HOUR_UTC = Number(process.env.AUXR_DIGEST_HOUR_UTC || 8); // 08:00 UTC daily

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

/** Increment a persistence streak; returns the new count (1 on first hit). */
async function bumpStreak(key: string): Promise<number> {
  try {
    const r = getRedis();
    const n = await r.incr(`auxr:streak:${key}`);
    await r.expire(`auxr:streak:${key}`, 3600); // self-heal if cron stalls
    return typeof n === "number" ? n : Number(n) || 1;
  } catch {
    return DEVIATION_PERSIST_RUNS; // fail toward alerting, not silence
  }
}

async function resetStreak(key: string): Promise<void> {
  try { await getRedis().del(`auxr:streak:${key}`); } catch { /* noop */ }
}

/** Fire the once-per-day digest. Redis nx flag keyed by UTC date gates it. */
async function maybeSendDigest(lines: string[]): Promise<boolean> {
  const now = new Date();
  if (now.getUTCHours() < DIGEST_HOUR_UTC) return false;
  const day = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  try {
    const r = getRedis();
    const ok = await r.set(`auxr:digest:${day}`, Date.now().toString(), { nx: true, ex: 26 * 3600 });
    if (ok === null) return false; // already sent today
    await sendTelegramMessage([`📊 <b>AUXR daily status — ${day}</b>`, ...lines].join("\n"));
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
  const nav = pricing?.navUSD;

  // 1. Backing under-collateralised (human must add reserves — always escalate)
  if (snap?.backingRatio?.weakest != null) {
    const weakestPct = snap.backingRatio.weakest * 100;
    if (weakestPct < BACKING_ALERT_PCT) {
      if (await alertOnce("backing", `🔴 <b>AUXR backing breach</b>\nWeakest leg: <b>${weakestPct.toFixed(2)}%</b> (threshold ${BACKING_ALERT_PCT}%)\nSupply: ${snap.supplyUnits} AUXR · Reserves: $${Math.round(snap.reservesUSD || 0).toLocaleString()}`))
        fired.push("backing");
    }
  }

  // 2. CEX price deviation from NAV — persistence-gated (give the MM time first)
  if (ticker?.listed && ticker.last && nav && nav > 0) {
    const devBps = ((ticker.last - nav) / nav) * 10000;
    if (Math.abs(devBps) >= DEVIATION_ALERT_BPS) {
      const streak = await bumpStreak("deviation");
      if (streak >= DEVIATION_PERSIST_RUNS) {
        const mins = streak * 5;
        if (await alertOnce("deviation", `🟠 <b>AUXR price vs NAV deviation (sustained ${mins}m)</b>\nCEX (BitMart): <b>$${ticker.last}</b>\nNAV: <b>$${nav.toFixed(3)}</b>\nDeviation: <b>${(devBps / 100).toFixed(2)}%</b> (threshold ${(DEVIATION_ALERT_BPS / 100).toFixed(1)}%)\n→ MM hasn't closed it — check Echo Trade / trigger arb top-up.`))
          fired.push("deviation");
      }
    } else {
      await resetStreak("deviation");
    }
  }

  // 3. MM spread blowout — wide bid/ask means Echo Trade isn't quoting depth
  if (ticker?.listed && ticker.bid && ticker.ask && ticker.bid > 0) {
    const mid = (ticker.bid + ticker.ask) / 2;
    const spreadBps = mid > 0 ? ((ticker.ask - ticker.bid) / mid) * 10000 : 0;
    if (spreadBps >= SPREAD_ALERT_BPS) {
      if (await alertOnce("spread", `🟡 <b>AUXR MM spread wide</b>\nBid $${ticker.bid} / Ask $${ticker.ask} → spread <b>${(spreadBps / 100).toFixed(2)}%</b> (threshold ${(SPREAD_ALERT_BPS / 100).toFixed(1)}%)\n→ Echo Trade may not be quoting. Also hurts BML depth score.`))
        fired.push("spread");
    }
  }

  // 4. Contract paused
  if (paused === true) {
    if (await alertOnce("paused", `⏸️ <b>AUXR contract is PAUSED</b>\nAll transfers/mints/burns halted on-chain. Confirm this is intentional.`))
      fired.push("paused");
  }

  // 5. Supply drift (off-chain ledger + known external issuance vs on-chain)
  let onChainUnits: number | null = null;
  if (snap?.supplyUnits != null && chainWei != null) {
    onChainUnits = weiToAuxr(chainWei as bigint);
    const expected = snap.supplyUnits + EXTERNAL_ONCHAIN_SUPPLY;
    const drift = Math.abs(expected - onChainUnits);
    if (drift > SUPPLY_DRIFT_ALERT) {
      const externalNote = EXTERNAL_ONCHAIN_SUPPLY ? ` (+${EXTERNAL_ONCHAIN_SUPPLY} external)` : "";
      if (await alertOnce("supply-drift", `⚠️ <b>AUXR supply drift</b>\nOff-chain ledger: ${snap.supplyUnits}${externalNote} · On-chain: ${onChainUnits}\nDrift: <b>${drift.toFixed(3)} AUXR</b> (threshold ${SUPPLY_DRIFT_ALERT})`))
        fired.push("supply-drift");
    }
  }

  // B) Daily digest heartbeat — passive oversight + dead-man's switch
  const devBps = ticker?.listed && ticker.last && nav && nav > 0
    ? ((ticker.last - nav) / nav) * 10000 : null;
  const spreadBps = ticker?.listed && ticker.bid && ticker.ask && ticker.bid > 0
    ? ((ticker.ask - ticker.bid) / ((ticker.bid + ticker.ask) / 2)) * 10000 : null;
  const digestSent = await maybeSendDigest([
    nav != null ? `NAV (net): <b>$${nav.toFixed(3)}</b>${pricing?.grossNavUSD != null ? ` · gross $${pricing.grossNavUSD.toFixed(3)}` : ""}` : `NAV: n/a`,
    pricing?.accruedFeePerUnitUSD != null ? `Mgmt fee: ${(pricing.mgmtFeeAnnual * 100).toFixed(2)}%/yr · accrued $${pricing.accruedFeePerUnitUSD.toFixed(4)}/unit` : ``,
    ticker?.listed
      ? `CEX: <b>$${ticker.last}</b>${devBps != null ? ` · dev ${(devBps / 100).toFixed(2)}%` : ""}${spreadBps != null ? ` · spread ${(spreadBps / 100).toFixed(2)}%` : ""}${ticker.quoteVolume24h != null ? ` · 24h $${Math.round(ticker.quoteVolume24h).toLocaleString()}` : ""}`
      : `CEX: not listed yet`,
    snap?.backingRatio?.weakest != null ? `Backing (weakest): ${(snap.backingRatio.weakest * 100).toFixed(2)}% · supply ${snap.supplyUnits} AUXR` : ``,
    paused === true ? `⏸️ CONTRACT PAUSED` : ``,
    fired.length ? `⚠️ Active alerts today: ${fired.join(", ")}` : `✅ All green`,
  ].filter(Boolean));

  return NextResponse.json({
    success: true,
    checked: { backing: snap?.backingRatio?.weakest != null, cexListed: !!ticker?.listed, paused: paused === true },
    alertsFired: fired,
    digestSent,
    timestamp: Date.now(),
  });
}
