// ============================================================================
// GET /api/cron/auxr-ops-watch — AUXR ops watchdog (Vercel Cron, */5).
//
// Two jobs, so the operator never has to watch Telegram minute-by-minute:
//
//  A) ESCALATION alerts — fire Telegram ONLY when something needs a human and
//     the market maker (Echo Trade) can't/won't self-heal it:
//       1. Reserve under-collateralised (weakest backing leg < 100%)
//       2. LBANK price deviates from NAV — PERSISTENCE-GATED: only escalates
//          after the deviation survives N consecutive checks (default 15 min),
//          giving the MM a window to close it before the operator is pinged.
//       3. Market-maker spread blowout (wide bid/ask ⇒ Echo Trade not quoting)
//       4. Contract unexpectedly paused
//       5. On-chain vs off-chain supply drift beyond tolerance
//       6. Our own MM (Pionex) silent — no lease renewal from either node
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
import { getLbankTicker, getLbankDepth } from "@/lib/lbank";
import { computeDepthMetrics } from "@/lib/bitmart";
import { getOnChainTotalSupply, weiToAuxr, isPaused, isMinter } from "@/lib/auxr-onchain";
import type { Address } from "viem";
import { sendTelegramMessage } from "@/lib/telegram";
import { getRedis } from "@/lib/redis";
import { lastRenewal } from "@/lib/mm-lease";
import { followTaint, taintHoldings, claimGasAlert } from "@/lib/auxr-taint";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const DEVIATION_ALERT_BPS = Number(process.env.AUXR_DEVIATION_ALERT_BPS || 300); // 3%
const DEVIATION_PERSIST_RUNS = Number(process.env.AUXR_DEVIATION_PERSIST_RUNS || 3); // ×5min = 15min
const SPREAD_ALERT_BPS = Number(process.env.AUXR_SPREAD_ALERT_BPS || 200); // 2% MM spread
const BACKING_ALERT_PCT = Number(process.env.AUXR_BACKING_ALERT_PCT || 99.99);
const SUPPLY_DRIFT_ALERT = Number(process.env.AUXR_SUPPLY_DRIFT_ALERT || 1); // units
// Bid depth within 2% of NAV. A tight spread can sit on top of almost nothing:
// at the time this check was added the book quoted 10.5 bps over 101 USDT of
// bids, so a holder trying to leave would have moved the price on their own.
const BID_DEPTH_ALERT_USD = Number(process.env.AUXR_BID_DEPTH_ALERT_USD || 2500);
// AUXR minted on-chain OUTSIDE the managed off-chain ledger — the founder
// allocation and MM seed, which are backed externally (founder's own metal) and
// intentionally never recorded via recordMint. Without accounting for it, the
// drift check compares total on-chain supply against only the managed off-chain
// supply and fires forever. Set this to that known external issuance so only
// NEW, unexplained drift alerts.
const EXTERNAL_ONCHAIN_SUPPLY = Number(process.env.AUXR_EXTERNAL_ONCHAIN_SUPPLY || 0); // units
const DEDUPE_TTL = Number(process.env.AUXR_ALERT_DEDUPE_SECONDS || 1800); // 30 min
const DIGEST_HOUR_UTC = Number(process.env.AUXR_DIGEST_HOUR_UTC || 8); // 08:00 UTC daily
const NAV_FEED_URL = process.env.AUXR_NAV_FEED_URL || "https://vault.auxite.io/api/auxr/price";
const MM_LEASE_VENUE = process.env.AUXR_MM_LEASE_VENUE || "pionex";
const MM_SILENT_ALERT_SEC = Number(process.env.AUXR_MM_SILENT_ALERT_SEC || 180);
// The wallet whose key sits in this process. Checked, not trusted: it is
// supposed to hold no role at all.
const HOT_WALLET_FALLBACK = "0xd4cecfdf73cccd0517f576e75be469d75e0a1658";

// The AUXR taken in October is followed in src/lib/auxr-taint.ts: a set that
// grows as the money moves, rather than a list that goes stale the first time
// it does. Check 7 below reports movements and what is still held.

/** Top of the public Pionex AUXR book (no key needed). Null when unlisted. */
async function getPionexTop(): Promise<{ bid: number | null; ask: number | null } | null> {
  const res = await fetch("https://api.pionex.com/api/v1/market/depth?symbol=AUXR_USDT&limit=1", {
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  const j = await res.json();
  if (!j?.result) return null;
  return {
    bid: j.data?.bids?.[0] ? Number(j.data.bids[0][0]) : null,
    ask: j.data?.asks?.[0] ? Number(j.data.asks[0][0]) : null,
  };
}

/**
 * Market-maker (Echo Trade) Telegram chat. Optional — unset disables the relay.
 *
 * ⚠️ ONLY market-facing alerts are relayed here: NAV deviation and bid/ask
 * spread. Both are derived from PUBLIC data (the published NAV feed + the live
 * order book), so nothing confidential leaves. Reserve/backing, on-chain supply
 * drift, contract-pause and the daily digest are material non-public info and
 * MUST stay on the internal channel only.
 */
const MM_CHAT_ID = process.env.TELEGRAM_MM_CHAT_ID || "";

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

/**
 * Relay a market-facing alert to the market maker's channel so they can act
 * without waiting for us to forward it. No-op when TELEGRAM_MM_CHAT_ID is unset.
 * Never call this with reserve/backing/supply/fee internals.
 */
async function notifyMM(message: string): Promise<void> {
  if (!MM_CHAT_ID) return;
  try { await sendTelegramMessage(message, MM_CHAT_ID); } catch { /* noop */ }
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

  const [snap, pricing, ticker, depth, chainWei, paused] = await Promise.all([
    safe(getReserveSnapshot(), null as any),
    safe(getAuxrPricing(), null as any),
    safe(getLbankTicker(), null as any),
    safe(getLbankDepth(), null as any),
    safe(getOnChainTotalSupply(), null as unknown as bigint),
    safe(isPaused(), null as any),
  ]);

  const fired: string[] = [];
  const nav = pricing?.navUSD;

  /**
   * Reference price for NAV comparison.
   *
   * Use the bid/ask MID, not `last`. In a thin book `last` is whatever price
   * the most recent trade printed at — possibly hours ago — while NAV keeps
   * moving with metal spot. That stale gap grows until it trips the deviation
   * threshold and fires an alert about a book that is in fact sitting right on
   * NAV. The mid reflects where the market is actually quoted right now.
   * Falls back to `last` only when one side of the book is missing.
   */
  const refPrice: number | null = (() => {
    if (!ticker?.listed) return null;
    if (ticker.bid && ticker.ask && ticker.bid > 0 && ticker.ask > 0) {
      return (ticker.bid + ticker.ask) / 2;
    }
    return ticker.last ?? null;
  })();
  // LBANK's ticker carries no bid/ask; without filling them from the book the
  // spread check below silently never fires.
  if (ticker?.listed && depth?.listed) {
    ticker.bid = depth.bids[0]?.price ?? null;
    ticker.ask = depth.asks[0]?.price ?? null;
  }
  const refLabel = ticker?.bid && ticker?.ask ? "mid" : "last";

  // 1. Backing under-collateralised (human must add reserves — always escalate)
  if (snap?.backingRatio?.weakest != null) {
    const weakestPct = snap.backingRatio.weakest * 100;
    if (weakestPct < BACKING_ALERT_PCT) {
      if (await alertOnce("backing", `🔴 <b>AUXR backing breach</b>\nWeakest leg: <b>${weakestPct.toFixed(2)}%</b> (threshold ${BACKING_ALERT_PCT}%)\nSupply: ${snap.supplyUnits} AUXR · Reserves: $${Math.round(snap.reservesUSD || 0).toLocaleString()}`))
        fired.push("backing");
    }
  }

  // 2. CEX price deviation from NAV — persistence-gated (give the MM time first)
  if (refPrice && nav && nav > 0) {
    const devBps = ((refPrice - nav) / nav) * 10000;
    if (Math.abs(devBps) >= DEVIATION_ALERT_BPS) {
      const streak = await bumpStreak("deviation");
      if (streak >= DEVIATION_PERSIST_RUNS) {
        const mins = streak * 5;
        if (await alertOnce("deviation", `🟠 <b>AUXR price vs NAV deviation (sustained ${mins}m)</b>\nCEX (LBANK) ${refLabel}: <b>$${refPrice.toFixed(3)}</b>\nNAV: <b>$${nav.toFixed(3)}</b>\nDeviation: <b>${(devBps / 100).toFixed(2)}%</b> (threshold ${(DEVIATION_ALERT_BPS / 100).toFixed(1)}%)\n→ MM hasn't closed it — check Echo Trade / trigger arb top-up.`)) {
          fired.push("deviation");
          await notifyMM(
            `⚠️ <b>AUXR/USDT — price vs NAV</b>\n` +
            `Market (${refLabel}): <b>$${refPrice.toFixed(3)}</b> · NAV: <b>$${nav.toFixed(3)}</b>\n` +
            `Deviation: <b>${(devBps / 100).toFixed(2)}%</b> (sustained ${mins}m)\n` +
            `→ Please re-centre quotes on the live NAV feed: ${NAV_FEED_URL}\n` +
            `Target band: NAV ±50 bps (outside it a redemption arb opens).`,
          );
        }
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
      if (await alertOnce("spread", `🟡 <b>AUXR MM spread wide</b>\nBid $${ticker.bid} / Ask $${ticker.ask} → spread <b>${(spreadBps / 100).toFixed(2)}%</b> (threshold ${(SPREAD_ALERT_BPS / 100).toFixed(1)}%)\n→ Echo Trade may not be quoting. Also hurts BML depth score.`)) {
        fired.push("spread");
        await notifyMM(
          `⚠️ <b>AUXR/USDT — spread wide</b>\n` +
          `Bid <b>$${ticker.bid}</b> / Ask <b>$${ticker.ask}</b> → <b>${(spreadBps / 100).toFixed(2)}%</b>\n` +
          `→ Quotes look thin or absent. Tightening also lifts the BML depth score.`,
        );
      }
    }
  }

  // 3b. Bid depth collapse — the side that matters to a holder trying to exit.
  //
  // Separate from the spread check because the two fail independently: a maker
  // can quote 10 bps over a hundred dollars, which looks healthy on every
  // measure except the only one that matters when someone sells.
  if (ticker?.listed && depth?.listed && nav && nav > 0) {
    const m = computeDepthMetrics(depth as any, nav);
    const bid2 = m.bidUsdWithin?.["2"] ?? 0;
    if (bid2 < BID_DEPTH_ALERT_USD) {
      if (
        await alertOnce(
          "bid-depth",
          `🟠 <b>AUXR bid depth thin</b>\nWithin 2% of NAV: <b>$${Math.round(bid2).toLocaleString()}</b> bids / $${Math.round(m.askUsdWithin?.["2"] ?? 0).toLocaleString()} asks (threshold $${BID_DEPTH_ALERT_USD.toLocaleString()})\n→ A holder selling more than this moves the price alone.`,
        )
      ) {
        fired.push("bid-depth");
        await notifyMM(
          `⚠️ <b>AUXR/USDT — bid depth thin</b>\n` +
          `±2% of NAV: <b>$${Math.round(bid2).toLocaleString()}</b> bid vs $${Math.round(m.askUsdWithin?.["2"] ?? 0).toLocaleString()} ask\n` +
          `→ The book is one-sided. Please add bid-side depth.`,
        );
      }
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
      // Mints made through the cockpit bump BOTH ledgers via recordMint(), so
      // this figure is normally constant. It only shifts when AUXR is minted
      // outside the app — which is exactly what this alert exists to catch.
      // Spell out the implied value so reconciling is a copy-paste, not arithmetic.
      const implied = (onChainUnits - snap.supplyUnits).toFixed(4);
      if (await alertOnce("supply-drift", `⚠️ <b>AUXR supply drift</b>\nOff-chain ledger: ${snap.supplyUnits}${externalNote} · On-chain: ${onChainUnits}\nDrift: <b>${drift.toFixed(3)} AUXR</b> (threshold ${SUPPLY_DRIFT_ALERT})\n\nIf this is explained by a mint made outside the app, set <code>AUXR_EXTERNAL_ONCHAIN_SUPPLY=${implied}</code>`))
        fired.push("supply-drift");
    }
  }

  // 6. Our own market maker gone silent. The MM nodes renew a lease every few
  // seconds (src/lib/mm-lease.ts); if nobody has renewed for minutes, both
  // nodes are down. Pionex has no cancel-on-disconnect, so their last quotes
  // may still be resting at an old NAV — this is the only check that runs
  // off the MM servers and can say so. Silent until the MM has ever run.
  const mmBeat = await safe(lastRenewal(MM_LEASE_VENUE), null);
  if (mmBeat) {
    const silentSec = (Date.now() - mmBeat.at) / 1000;
    if (silentSec > MM_SILENT_ALERT_SEC) {
      const book = await safe(getPionexTop(), null);
      const bookLine = book
        ? `Pionex book: bid ${book.bid ?? "—"} / ask ${book.ask ?? "—"}${nav ? ` · NAV ${nav.toFixed(3)}` : ""}`
        : `Pionex book: unreadable`;
      if (
        await alertOnce(
          "mm-down",
          `🔴 <b>AUXR market maker DOWN</b>\nNo lease renewal for <b>${Math.round(silentSec / 60)} min</b> (last: ${mmBeat.holder}).\n${bookLine}\n→ Both MM nodes are down. Their last quotes may still be on Pionex at an old NAV — cancel open AUXR orders in the Pionex app, then check the servers.`,
        )
      )
        fired.push("mm-down");
    }
  }

  // 7. The stolen AUXR: where it went, and whether it is still inert.
  //
  // The point of this check is the pause() decision. Tokens moving between the
  // thief's own wallets are not worth halting a market over; tokens reaching a
  // contract are, because that is a swap, a bridge or a deposit — the moment
  // they stop being inert. So a contract destination is alerted separately and
  // says so plainly, and a plain wallet is reported without crying wolf.
  //
  // Gas is watched too: every one of these addresses started with zero ETH and
  // no transaction history, so somebody funding gas is the earliest warning
  // available and it arrives before the transfer does.
  const taint = await safe(followTaint(), null);

  if (taint) {
    for (const m of taint.movements) {
      const label = m.toIsContract
        ? `🚨 <b>Stolen AUXR moved INTO A CONTRACT</b>`
        : `⚠️ <b>Stolen AUXR moved</b>`;
      const advice = m.toIsContract
        ? `\n\nA contract destination means a swap, a bridge or an exchange deposit — this is the case <code>pause()</code> exists for. The admin Safe needs ETH to send it.`
        : `\n\nDestination is a plain wallet, so the tokens are being shuffled rather than sold. Added to the watch set; no action unless it reaches a contract or a venue.`;
      if (
        await alertOnce(
          `taint-move:${m.txHash}`,
          `${label}\n<b>${m.units.toFixed(4)} AUXR</b>\nfrom <code>${m.from}</code>\nto <code>${m.to}</code>${m.newlyTainted ? " (new)" : ""}\nblock ${m.blockNumber}\n<a href="https://basescan.org/tx/${m.txHash}">tx</a>${advice}`,
        )
      )
        fired.push(m.toIsContract ? "taint-contract" : "taint-move");
    }
  }

  // Gas arriving on an address that has never sent a transaction is the signal
  // that precedes everything else, so it is checked on every address we hold,
  // not just the ones that have already moved.
  const holdings = await safe(taintHoldings(), [] as Awaited<ReturnType<typeof taintHoldings>>);
  for (const h of holdings) {
    if (h.units <= 0) continue;
    // Latched rather than deduped on a timer: the first version re-sent this
    // every thirty minutes for a condition that had not changed, which is how
    // an alert stops being read.
    if (!(await claimGasAlert(h.address, h.gasEth))) continue;
    await sendTelegramMessage(
      `⛽ <b>Gas arrived on a stolen-AUXR address</b>\n<code>${h.address}</code>\n${h.label}\nETH <b>${h.gasEth.toFixed(6)}</b> · holds <b>${h.units.toFixed(4)} AUXR</b>\n\nThis address had no gas until now, so it can move. Movements are reported separately as they happen.`,
    ).catch(() => {});
    fired.push("taint-gas");
  }

  // 8. The hot wallet must not be able to mint.
  //
  // This is the control that makes the rest of them unnecessary: minting lives
  // with the admin Safe, and the key in this process holds no role. It is also
  // the control most easily undone — one revokeRole's worth of work to put
  // back, by anyone with the Safe, for a good-sounding reason at two in the
  // morning. So it is asserted every run rather than assumed.
  const hotMinter = process.env.AUXR_HOT_WALLET_ADDRESS || HOT_WALLET_FALLBACK;
  const hotCanMint = await safe(isMinter(hotMinter as Address), null);
  if (hotCanMint === true) {
    if (
      await alertOnce(
        "hot-minter-role",
        `🔑 <b>The hot wallet holds MINTER_ROLE again</b>\n<code>${hotMinter}</code>\n\nThis key lives in the web process, which is where every October incident started. If this was not deliberate, revoke it from the Safe:\n<code>revokeRole(MINTER_ROLE, ${hotMinter})</code>\n\nIf it was deliberate, it should not stay that way for long.`,
      )
    )
      fired.push("hot-minter-role");
  }

  // B) Daily digest heartbeat — passive oversight + dead-man's switch
  const devBps = refPrice && nav && nav > 0
    ? ((refPrice - nav) / nav) * 10000 : null;
  const spreadBps = ticker?.listed && ticker.bid && ticker.ask && ticker.bid > 0
    ? ((ticker.ask - ticker.bid) / ((ticker.bid + ticker.ask) / 2)) * 10000 : null;
  const depthDigest =
    ticker?.listed && depth?.listed && nav && nav > 0
      ? (() => {
          const m = computeDepthMetrics(depth as any, nav);
          return `Depth ±2%: bid <b>$${Math.round(m.bidUsdWithin?.["2"] ?? 0).toLocaleString()}</b> / ask $${Math.round(m.askUsdWithin?.["2"] ?? 0).toLocaleString()}`;
        })()
      : ``;

  const digestSent = await maybeSendDigest([
    nav != null ? `NAV (net): <b>$${nav.toFixed(3)}</b>${pricing?.grossNavUSD != null ? ` · gross $${pricing.grossNavUSD.toFixed(3)}` : ""}` : `NAV: n/a`,
    pricing?.accruedFeePerUnitUSD != null ? `Mgmt fee: ${(pricing.mgmtFeeAnnual * 100).toFixed(2)}%/yr · accrued $${pricing.accruedFeePerUnitUSD.toFixed(4)}/unit` : ``,
    ticker?.listed
      ? `LBANK: <b>$${ticker.last}</b>${devBps != null ? ` · dev ${(devBps / 100).toFixed(2)}%` : ""}${spreadBps != null ? ` · spread ${(spreadBps / 100).toFixed(2)}%` : ""}${ticker.quoteVolume24h != null ? ` · 24h $${Math.round(ticker.quoteVolume24h).toLocaleString()}` : ""}`
      : `LBANK: not listed yet`,
    // Depth belongs in the daily line, not only in the alert: a book that is
    // thin every day never crosses a threshold twice and so never alerts twice.
    depthDigest,
    snap?.backingRatio?.weakest != null ? `Backing (weakest): ${(snap.backingRatio.weakest * 100).toFixed(2)}% · supply ${snap.supplyUnits} AUXR` : ``,
    paused === true ? `⏸️ CONTRACT PAUSED` : ``,
    fired.length ? `⚠️ Active alerts today: ${fired.join(", ")}` : `✅ All green`,
  ].filter(Boolean));

  // Heartbeat. Until now the only evidence this ran was a Telegram message,
  // so a silent channel and a dead watchdog looked identical — and the daily
  // digest, the dead-man's switch, only answers that question once a day. This
  // records every run so the cockpit can say when it last checked.
  try {
    await getRedis().set(
      "auxr:watch:lastRun",
      JSON.stringify({
        at: Date.now(),
        alertsFired: fired,
        lbankListed: !!ticker?.listed,
        navRead: nav != null,
        digestSent,
      }),
      { ex: 7 * 24 * 3600 },
    );
  } catch (e) {
    console.error("[auxr-ops-watch] heartbeat write failed", e);
  }

  return NextResponse.json({
    success: true,
    checked: { backing: snap?.backingRatio?.weakest != null, lbankListed: !!ticker?.listed, paused: paused === true },
    alertsFired: fired,
    digestSent,
    timestamp: Date.now(),
  });
}
