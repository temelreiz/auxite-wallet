// ════════════════════════════════════════════════════════════════════════════
// BRIDGE OFF-RAMP — forward treasury stablecoins to Bridge & settle into Wise
// ════════════════════════════════════════════════════════════════════════════
//
// The runtime half of the Bridge integration (see src/lib/bridge.ts for the API
// client + one-time setup). Two entry points drive a sweep:
//
//   • cron  (/api/cron/bridge-offramp-sweep) — threshold-based, automatic
//   • admin (/api/admin/bridge/sweep)        — manual, instant
//
// Both call sweepTarget(), which sends treasury stablecoin on-chain to the
// matching Bridge liquidation address. Bridge converts to USD and wires it to
// our Wise USD account. As drains settle, the webhook calls settleDrain() to
// move the value from "in-flight" into treasury USD cash.
//
// SOLVENCY ACCOUNTING — keep liquidBackingUsd() whole across the conversion:
//   sweep:   crypto leaves the hot wallet (balance readers drop) AND we add the
//            swept amount to treasury:bridge:inflight_usd. Net backing unchanged.
//   settle:  inflight -= swept amount; treasury:usd:cash += net USD received.
//            Net backing drops only by the Bridge fee (a real cost). Correct.
// ════════════════════════════════════════════════════════════════════════════

import { getRedis } from "./redis";
import {
  BRIDGE_KEYS,
  getStoredLiquidationAddresses,
  liquidationKey,
  type BridgeChain,
  type BridgeCurrency,
} from "./bridge";
import { baseTreasury, tronTreasuryBalances } from "./treasury-balances";
import { withdrawUSDC, withdrawUSDT } from "./blockchain-service";
import { withdrawUSDT_TRC20 } from "./tron-withdraw";

const num = (v: any) => parseFloat(String(v ?? 0)) || 0;

// ── Off-ramp targets ──────────────────────────────────────────────────────────
// Which (chain, currency) pairs we drain. Matches the funded treasury rails:
// Base USDC/USDT (primary) + Tron USDT. Bridge only accepts stablecoins, so
// ETH/BTC are intentionally absent — they'd need a swap to stable first.
export interface OfframpTarget {
  chain: BridgeChain;
  currency: BridgeCurrency;
  /** Coin symbol for the on-chain send. */
  coin: "USDC" | "USDT";
  /** Network arg for the withdraw layer. */
  network: "base" | "tron";
  label: string;
}

export const OFFRAMP_TARGETS: OfframpTarget[] = [
  { chain: "base", currency: "usdc", coin: "USDC", network: "base", label: "Base USDC" },
  { chain: "base", currency: "usdt", coin: "USDT", network: "base", label: "Base USDT" },
  { chain: "tron", currency: "usdt", coin: "USDT", network: "tron", label: "Tron USDT" },
];

// Minimum balance (USD ≈ stablecoin units) before an automatic sweep fires.
export const SWEEP_MIN_USD = num(process.env.BRIDGE_SWEEP_MIN_USD) || 1000;
// Stablecoin float left behind on each sweep (0 = drain fully).
const SWEEP_RESERVE = num(process.env.BRIDGE_SWEEP_RESERVE) || 0;
// Floor below which the on-chain send isn't worth the gas.
const MIN_SWEEPABLE = 5;

export interface SweepRecord {
  id: string;
  chain: BridgeChain;
  currency: BridgeCurrency;
  liquidationAddress: string;
  amount: number;            // stablecoin units swept (≈ USD pre-fee)
  txHash: string | null;
  status: "submitted" | "settled" | "failed";
  settledUsd?: number;       // net USD landed in Wise (post Bridge fee)
  error?: string;
  trigger: "cron" | "admin";
  createdAt: number;
  settledAt?: number;
}

function rid(chain: string, currency: string, n: number): string {
  return `swp_${chain}_${currency}_${n.toString(36)}`;
}

async function pushSweep(rec: SweepRecord): Promise<void> {
  const r = getRedis();
  await r.lpush(BRIDGE_KEYS.sweeps, JSON.stringify(rec));
  await r.ltrim(BRIDGE_KEYS.sweeps, 0, 4999);
}

export async function listSweeps(limit = 50, offset = 0): Promise<SweepRecord[]> {
  const rows = await getRedis().lrange(BRIDGE_KEYS.sweeps, offset, offset + limit - 1);
  return (rows || []).map((x: any) => {
    try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return x; }
  });
}

export async function getInflightUsd(): Promise<number> {
  return num(await getRedis().get(BRIDGE_KEYS.inflightUsd));
}

// ── Treasury balance for a target ─────────────────────────────────────────────
export async function targetBalance(t: OfframpTarget): Promise<number> {
  if (t.network === "tron") {
    const tron = await tronTreasuryBalances();
    return tron.usdt || 0;
  }
  const base = await baseTreasury();
  return t.currency === "usdc" ? base.usdc || 0 : base.usdt || 0;
}

// ── Sweep one target ──────────────────────────────────────────────────────────
export interface SweepResult {
  ok: boolean;
  swept?: number;
  txHash?: string;
  error?: string;
  skipped?: string;
}

/**
 * Forward `amount` (or the full sweepable balance when omitted) of a target's
 * stablecoin to its Bridge liquidation address. Records the sweep and books the
 * amount as in-flight on success.
 */
export async function sweepTarget(
  t: OfframpTarget,
  amount: number | undefined,
  trigger: "cron" | "admin"
): Promise<SweepResult> {
  const map = await getStoredLiquidationAddresses();
  const la = map[liquidationKey(t.chain, t.currency)];
  if (!la?.address) {
    return { ok: false, error: `No Bridge liquidation address configured for ${t.label}. Run setup first.` };
  }

  const balance = await targetBalance(t);
  const available = Math.max(0, balance - SWEEP_RESERVE);
  let send = amount != null ? amount : available;
  // Never send more than we actually hold.
  send = Math.min(send, available);
  send = Math.floor(send * 100) / 100; // 2dp — matches the withdraw layer

  if (send < MIN_SWEEPABLE) {
    return { ok: false, skipped: `${t.label}: only ${balance.toFixed(2)} available (< ${MIN_SWEEPABLE})` };
  }

  // On-chain send to the liquidation address.
  let res: { success: boolean; txHash?: string; error?: string };
  if (t.network === "tron") {
    res = await withdrawUSDT_TRC20(la.address, send);
  } else if (t.currency === "usdc") {
    res = await withdrawUSDC(la.address, send);
  } else {
    res = await withdrawUSDT(la.address, send);
  }

  const id = rid(t.chain, t.currency, Date.now());
  if (!res.success) {
    await pushSweep({
      id, chain: t.chain, currency: t.currency, liquidationAddress: la.address,
      amount: send, txHash: null, status: "failed", error: res.error, trigger, createdAt: Date.now(),
    });
    return { ok: false, error: res.error || "on-chain send failed" };
  }

  await pushSweep({
    id, chain: t.chain, currency: t.currency, liquidationAddress: la.address,
    amount: send, txHash: res.txHash || null, status: "submitted", trigger, createdAt: Date.now(),
  });
  // Booked as in-flight: crypto has left the wallet, USD not yet in Wise.
  await getRedis().incrbyfloat(BRIDGE_KEYS.inflightUsd, send);

  return { ok: true, swept: send, txHash: res.txHash };
}

// ── Cron entry: sweep every target above threshold ────────────────────────────
export interface AutoSweepReport {
  ran: boolean;
  results: Array<{ target: string } & SweepResult>;
}

export async function autoSweepAll(): Promise<AutoSweepReport> {
  const r = getRedis();
  // Short lock to avoid overlapping cron runs racing the same balance.
  const locked = await r.set(BRIDGE_KEYS.sweepLock, String(Date.now()), { nx: true, ex: 120 });
  if (!locked) return { ran: false, results: [] };

  const results: Array<{ target: string } & SweepResult> = [];
  try {
    for (const t of OFFRAMP_TARGETS) {
      const balance = await targetBalance(t);
      if (balance < SWEEP_MIN_USD) {
        results.push({ target: t.label, ok: false, skipped: `${balance.toFixed(2)} < ${SWEEP_MIN_USD} threshold` });
        continue;
      }
      const res = await sweepTarget(t, undefined, "cron");
      results.push({ target: t.label, ...res });
    }
  } finally {
    await r.del(BRIDGE_KEYS.sweepLock);
  }
  return { ran: true, results };
}

// ── Settlement: a Bridge drain reached payment_processed ──────────────────────
export interface DrainSettlement {
  liquidationAddressId?: string;
  liquidationAddress?: string;
  /** Net fiat amount delivered to the bank (USD). */
  amountUsd: number;
  drainId?: string;
  /** On-chain hash of the deposit that funded the drain = our sweep's txHash. */
  depositTxHash?: string;
}

/**
 * Match a settled drain to an open sweep and move the value from in-flight into
 * treasury USD cash. We match on the drain's `deposit_tx_hash` (= the hash of
 * the sweep we sent) for an exact link, falling back to the oldest open sweep on
 * the same liquidation address. Unmatched settlements are logged for review and
 * the cash is still credited (the USD really did arrive).
 */
export async function settleDrain(s: DrainSettlement): Promise<{ matched: boolean; sweepId?: string }> {
  const r = getRedis();

  const raw = await r.lrange(BRIDGE_KEYS.sweeps, 0, 4999);
  const list = (raw || []).map((x: any) => {
    try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return null; }
  }).filter(Boolean) as SweepRecord[];

  // Exact match on deposit tx hash; else oldest open sweep on this address.
  const depHash = (s.depositTxHash || "").toLowerCase();
  const addr = (s.liquidationAddress || "").toLowerCase();
  let match: SweepRecord | undefined;
  if (depHash) {
    match = list.find((x) => x.status === "submitted" && (x.txHash || "").toLowerCase() === depHash);
  }
  if (!match) {
    const open = list
      .filter((x) => x.status === "submitted" && (!addr || x.liquidationAddress.toLowerCase() === addr))
      .sort((a, b) => a.createdAt - b.createdAt);
    match = open[0];
  }

  // Credit the USD that actually landed in Wise into treasury cash.
  await r.incrbyfloat("treasury:usd:cash", s.amountUsd);

  if (match) {
    // Clear the originally-booked in-flight amount for this sweep.
    await r.incrbyfloat(BRIDGE_KEYS.inflightUsd, -match.amount);
    // Mark the sweep settled (rewrite the list entry in place).
    match.status = "settled";
    match.settledUsd = s.amountUsd;
    match.settledAt = Date.now();
    const idx = list.findIndex((x) => x.id === match.id);
    if (idx >= 0) await r.lset(BRIDGE_KEYS.sweeps, idx, JSON.stringify(match));
    return { matched: true, sweepId: match.id };
  }

  // No open sweep matched — reduce in-flight conservatively (not below zero) and
  // record for review.
  const inflight = await getInflightUsd();
  if (inflight > 0) {
    await r.incrbyfloat(BRIDGE_KEYS.inflightUsd, -Math.min(inflight, s.amountUsd));
  }
  await r.lpush(BRIDGE_KEYS.webhookUnmatched, JSON.stringify({ ts: Date.now(), settlement: s }));
  await r.ltrim(BRIDGE_KEYS.webhookUnmatched, 0, 199);
  return { matched: false };
}
