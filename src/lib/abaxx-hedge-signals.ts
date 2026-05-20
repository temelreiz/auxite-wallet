// ============================================================================
// ABAXX HEDGE SIGNAL ENGINE (Phase 2-A)
// ----------------------------------------------------------------------------
// Computes what hedge orders *should* be placed against the treasury's
// locked-AUXG exposure on Abaxx Gold Kilobar Singapore (GKS) futures. Does
// NOT place orders — only emits signals into a queue that ops/manual flow
// approves and executes on the Abaxx terminal. Once Abaxx grants an
// authenticated trading API, src/lib/abaxx-hedge-executor.ts will read the
// approved-queue and place real orders.
//
// Signal types:
//   OPEN_LONG   — exposure grew → add hedge coverage
//   CLOSE_LONG  — exposure shrank → reduce hedge coverage
//   ROLL        — held contract < 14 days to expiry → roll to next contract
//   MARGIN_TOPUP — (placeholder for Phase 2-B when we get account API)
//
// Sizing:
//   target_grams  = AUXG.locked × HEDGE_RATIO              (default 0.95)
//   current_grams = sum of filled positions on active GKS contracts
//   gap_grams     = target_grams − current_grams
//   if |gap_grams| ≥ MIN_SIGNAL_GRAMS → emit signal
//
// One Abaxx GKS contract = 1 kilobar = 1000 grams of LBMA Good Delivery
// gold. MIN_SIGNAL_GRAMS = 1000 so we never emit a fractional-contract
// signal that can't actually be placed.
//
// Redis schema:
//   treasury:hedge:signals:pending     list  JSON Signal[]
//   treasury:hedge:signals:approved    list  JSON Signal[]
//   treasury:hedge:signals:filled      list  JSON Signal[]    (closed/archived)
//   treasury:hedge:signals:dismissed   list  JSON Signal[]    (cancelled)
//   treasury:hedge:positions:{symbol}  hash  { qty, avgPriceUsdPerOz, openedAt }
//   treasury:hedge:state               hash  { lastRunAt, lastSignalId }
// ============================================================================

import { redis, getRedis } from "@/lib/redis";
import { getAllExposures, type MetalSymbol } from "@/lib/treasury-exposure";
import { getAllCachedFutures, type AbaxxFuturesData } from "@/lib/abaxx-client";

// ── Configuration knobs ──────────────────────────────────────────────────────

/** Fraction of locked-AUXG we want hedged on futures. 0.95 = 95%. */
const HEDGE_RATIO = 0.95;

/** Minimum signal size in grams. 1 GKS contract = 1 kilobar = 1000g. */
const MIN_SIGNAL_GRAMS = 1000;

/** Roll a contract this many days before its expiry. */
const ROLL_DAYS_BEFORE_EXPIRY = 14;

/** Grams per Abaxx GKS contract — kilobar standard. */
const GRAMS_PER_CONTRACT = 1000;

/** Auxite only hedges gold for now. Silver/PT/PD added in Phase 3. */
const HEDGED_METALS: MetalSymbol[] = ["AUXG"];

// ── Types ────────────────────────────────────────────────────────────────────

export type SignalType = "OPEN_LONG" | "CLOSE_LONG" | "ROLL" | "MARGIN_TOPUP";

export type SignalStatus = "pending" | "approved" | "filled" | "dismissed";

export interface HedgeSignal {
  id: string;
  type: SignalType;
  metal: MetalSymbol;
  /** Target Abaxx symbol e.g. "GKSJ26" — for ROLL, this is the contract to open. */
  symbol: string;
  /** Source symbol when type=ROLL (contract being closed). */
  rollFrom?: string;
  /** Direction the signal asks ops to execute on Abaxx terminal. */
  side: "BUY" | "SELL";
  /** Contract count (1 contract = 1000g). */
  contracts: number;
  /** Grams equivalent (contracts × 1000). */
  grams: number;
  /** Mid-market reference at signal generation (USD/oz). */
  referencePrice: number | null;
  status: SignalStatus;
  reason: string;
  /** Per-signal context the ops dashboard can show inline. */
  context: {
    lockedGrams: number;
    targetHedgeGrams: number;
    currentHedgeGrams: number;
    gapGrams: number;
    daysToExpiry?: number;
  };
  createdAt: number;
  /** Filled by ops endpoint when manually approved / filled / dismissed. */
  approvedAt?: number;
  approvedBy?: string;
  filledAt?: number;
  filledBy?: string;
  filledPriceUsdPerOz?: number;
  filledQty?: number;
  fillNote?: string;
  /** Set if filled — references the manual entry in positions hash. */
  positionRef?: string;
}

export interface PositionRow {
  symbol: string;
  qtyContracts: number;   // signed: + long, − short
  qtyGrams: number;
  avgPriceUsdPerOz: number;
  openedAt: number;
  lastFillAt: number;
  fillIds: string[];
}

// ── Redis keys ───────────────────────────────────────────────────────────────

const PENDING = "treasury:hedge:signals:pending";
const APPROVED = "treasury:hedge:signals:approved";
const FILLED = "treasury:hedge:signals:filled";
const DISMISSED = "treasury:hedge:signals:dismissed";
const STATE = "treasury:hedge:state";

function positionKey(symbol: string): string {
  return `treasury:hedge:positions:${symbol}`;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function newSignalId(): string {
  return `hsg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Aggregate all current futures positions (filled signals minus closes). Read
 * from positions:{symbol} hash so we don't have to re-derive from filled list
 * on every call.
 */
async function getOpenPositions(): Promise<PositionRow[]> {
  // KEYS isn't proxied via our redis wrapper, so use the raw client.
  const keys = await getRedis().keys("treasury:hedge:positions:*");
  const positions: PositionRow[] = [];
  for (const key of keys) {
    const data = await redis.hgetall(key);
    if (!data) continue;
    const qtyContracts = parseFloat(String(data.qtyContracts || 0));
    if (qtyContracts === 0) continue; // closed position, skip
    positions.push({
      symbol: key.replace("treasury:hedge:positions:", ""),
      qtyContracts,
      qtyGrams: qtyContracts * GRAMS_PER_CONTRACT,
      avgPriceUsdPerOz: parseFloat(String(data.avgPriceUsdPerOz || 0)),
      openedAt: parseInt(String(data.openedAt || 0), 10),
      lastFillAt: parseInt(String(data.lastFillAt || 0), 10),
      fillIds: typeof data.fillIds === "string"
        ? JSON.parse(data.fillIds)
        : Array.isArray(data.fillIds)
        ? data.fillIds
        : [],
    });
  }
  return positions;
}

/**
 * Find the contract closest to the desired expiry. Prefers the front-month
 * with > ROLL_DAYS_BEFORE_EXPIRY days remaining so a fresh OPEN doesn't go
 * to a contract we're about to roll out of.
 */
function pickActiveContract(
  futures: AbaxxFuturesData[],
  excludeSymbols: Set<string> = new Set(),
): AbaxxFuturesData | null {
  const usable = futures
    .filter((f) => f.status === "Trading")
    .filter((f) => f.midPrice !== null && f.midPrice > 0)
    .filter((f) => !excludeSymbols.has(f.symbol))
    .filter((f) => f.daysToExpiry > ROLL_DAYS_BEFORE_EXPIRY);
  if (usable.length === 0) return null;
  // Closest expiry that still meets the buffer — minimises contango drag.
  usable.sort((a, b) => a.daysToExpiry - b.daysToExpiry);
  return usable[0];
}

/** Total grams hedged by positions that are NOT inside the roll window. */
function currentHedgeGramsFor(
  positions: PositionRow[],
  rollingSymbols: Set<string>,
): number {
  return positions
    .filter((p) => !rollingSymbols.has(p.symbol))
    .reduce((sum, p) => sum + p.qtyGrams, 0);
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute and persist hedge signals based on current treasury exposure. Idempotent
 * across reruns — if a pending signal already exists for the same metal/type/symbol
 * with similar size, it's coalesced rather than duplicated.
 *
 * Returns the signals emitted this run (empty array means nothing needed).
 */
export async function generateHedgeSignals(): Promise<HedgeSignal[]> {
  const emitted: HedgeSignal[] = [];
  const exposures = await getAllExposures();
  const futures = await getAllCachedFutures();
  const positions = await getOpenPositions();

  // ── 1. ROLL signals — held contracts near expiry ──────────────────────────
  const rollingSymbols = new Set<string>();
  for (const pos of positions) {
    const contractData = futures.find((f) => f.symbol === pos.symbol);
    if (!contractData) continue; // unknown symbol → ops needs to investigate
    if (contractData.daysToExpiry > ROLL_DAYS_BEFORE_EXPIRY) continue;

    rollingSymbols.add(pos.symbol);
    const target = pickActiveContract(futures, new Set([pos.symbol]));
    if (!target) {
      console.warn(`[hedge-signals] ${pos.symbol} needs roll but no usable next contract`);
      continue;
    }

    const signal: HedgeSignal = {
      id: newSignalId(),
      type: "ROLL",
      metal: "AUXG",
      symbol: target.symbol,
      rollFrom: pos.symbol,
      side: pos.qtyContracts > 0 ? "SELL" : "BUY", // close existing first
      contracts: Math.abs(pos.qtyContracts),
      grams: Math.abs(pos.qtyGrams),
      referencePrice: contractData.midPrice,
      status: "pending",
      reason: `Roll ${pos.symbol} (DTE ${contractData.daysToExpiry}) → ${target.symbol} (DTE ${target.daysToExpiry})`,
      context: {
        lockedGrams: exposures.AUXG?.locked || 0,
        targetHedgeGrams: (exposures.AUXG?.locked || 0) * HEDGE_RATIO,
        currentHedgeGrams: currentHedgeGramsFor(positions, new Set()),
        gapGrams: 0,
        daysToExpiry: contractData.daysToExpiry,
      },
      createdAt: Date.now(),
    };
    await pushPending(signal);
    emitted.push(signal);
  }

  // ── 2. OPEN/CLOSE signals per hedged metal ────────────────────────────────
  for (const metal of HEDGED_METALS) {
    const exp = exposures[metal];
    if (!exp) continue;

    const targetGrams = exp.locked * HEDGE_RATIO;
    const currentGrams = currentHedgeGramsFor(positions, rollingSymbols);
    const gapGrams = targetGrams - currentGrams;

    if (Math.abs(gapGrams) < MIN_SIGNAL_GRAMS) continue;

    const contracts = Math.round(Math.abs(gapGrams) / GRAMS_PER_CONTRACT);
    if (contracts === 0) continue;

    const type: SignalType = gapGrams > 0 ? "OPEN_LONG" : "CLOSE_LONG";
    const side: "BUY" | "SELL" = gapGrams > 0 ? "BUY" : "SELL";

    let chosen: AbaxxFuturesData | null;
    if (type === "OPEN_LONG") {
      chosen = pickActiveContract(futures, rollingSymbols);
    } else {
      // CLOSE_LONG — close the longest-DTE open position first so we keep
      // front-month coverage clean. Falls back to nearest active contract.
      const openPos = positions
        .filter((p) => !rollingSymbols.has(p.symbol))
        .sort((a, b) => b.qtyContracts - a.qtyContracts)[0];
      chosen = futures.find((f) => f.symbol === openPos?.symbol)
        ?? pickActiveContract(futures, rollingSymbols);
    }

    if (!chosen) {
      console.warn(`[hedge-signals] no usable contract for ${type} ${metal}`);
      continue;
    }

    const signal: HedgeSignal = {
      id: newSignalId(),
      type,
      metal,
      symbol: chosen.symbol,
      side,
      contracts,
      grams: contracts * GRAMS_PER_CONTRACT,
      referencePrice: chosen.midPrice,
      status: "pending",
      reason: gapGrams > 0
        ? `Hedge gap ${gapGrams.toFixed(0)}g — buy ${contracts} ${chosen.symbol}`
        : `Over-hedged ${Math.abs(gapGrams).toFixed(0)}g — sell ${contracts} ${chosen.symbol}`,
      context: {
        lockedGrams: exp.locked,
        targetHedgeGrams: targetGrams,
        currentHedgeGrams: currentGrams,
        gapGrams,
        daysToExpiry: chosen.daysToExpiry,
      },
      createdAt: Date.now(),
    };

    if (await isDuplicatePending(signal)) continue;
    await pushPending(signal);
    emitted.push(signal);
  }

  await redis.hset(STATE, {
    lastRunAt: Date.now(),
    lastSignalCount: emitted.length,
  });

  return emitted;
}

async function pushPending(signal: HedgeSignal): Promise<void> {
  await redis.lpush(PENDING, JSON.stringify(signal));
  await redis.ltrim(PENDING, 0, 199);
}

/**
 * Coalescing check — if a pending signal already exists for the same metal,
 * type, symbol and similar contract count (±1), skip emitting a near-duplicate.
 * Keeps the queue clean when ops takes a few minutes to react.
 */
async function isDuplicatePending(candidate: HedgeSignal): Promise<boolean> {
  const raw = await redis.lrange(PENDING, 0, 49);
  for (const s of raw) {
    try {
      const sig: HedgeSignal = typeof s === "string" ? JSON.parse(s) : s;
      if (sig.type !== candidate.type) continue;
      if (sig.metal !== candidate.metal) continue;
      if (sig.symbol !== candidate.symbol) continue;
      if (Math.abs(sig.contracts - candidate.contracts) <= 1) return true;
    } catch { /* skip parse errors */ }
  }
  return false;
}

// ── Signal lifecycle (used by admin endpoint) ────────────────────────────────

export async function listSignals(status: SignalStatus, limit = 50): Promise<HedgeSignal[]> {
  const key =
    status === "pending" ? PENDING :
    status === "approved" ? APPROVED :
    status === "filled" ? FILLED :
    DISMISSED;
  const raw = await redis.lrange(key, 0, Math.min(limit, 200) - 1);
  return raw.map((s) => {
    try { return typeof s === "string" ? JSON.parse(s) : s; }
    catch { return null; }
  }).filter(Boolean);
}

async function moveSignal(
  signalId: string,
  fromKey: string,
  toKey: string,
  mutate: (s: HedgeSignal) => HedgeSignal,
): Promise<HedgeSignal | null> {
  const all = await redis.lrange(fromKey, 0, 199);
  let target: HedgeSignal | null = null;
  const remaining: string[] = [];
  for (const item of all) {
    try {
      const parsed: HedgeSignal = typeof item === "string" ? JSON.parse(item) : item;
      if (parsed.id === signalId && !target) {
        target = mutate(parsed);
      } else {
        remaining.push(typeof item === "string" ? item : JSON.stringify(item));
      }
    } catch {
      remaining.push(typeof item === "string" ? item : JSON.stringify(item));
    }
  }
  if (!target) return null;

  const pipe = getRedis().pipeline();
  pipe.del(fromKey);
  if (remaining.length > 0) pipe.rpush(fromKey, ...remaining);
  pipe.lpush(toKey, JSON.stringify(target));
  pipe.ltrim(toKey, 0, 499);
  await pipe.exec();

  return target;
}

export async function approveSignal(signalId: string, approvedBy: string): Promise<HedgeSignal | null> {
  return moveSignal(signalId, PENDING, APPROVED, (s) => ({
    ...s,
    status: "approved",
    approvedAt: Date.now(),
    approvedBy,
  }));
}

export async function dismissSignal(signalId: string, dismissedBy: string, note?: string): Promise<HedgeSignal | null> {
  // Look in pending first, then approved (ops can dismiss after approval too).
  const fromPending = await moveSignal(signalId, PENDING, DISMISSED, (s) => ({
    ...s,
    status: "dismissed",
    approvedBy: dismissedBy,
    fillNote: note,
  }));
  if (fromPending) return fromPending;
  return moveSignal(signalId, APPROVED, DISMISSED, (s) => ({
    ...s,
    status: "dismissed",
    approvedBy: dismissedBy,
    fillNote: note,
  }));
}

/**
 * Record that ops manually executed an approved signal on Abaxx terminal. The
 * fill mutates the position state so the next signal generation reflects the
 * new currentHedgeGrams.
 */
export async function recordManualFill(params: {
  signalId: string;
  filledBy: string;
  filledQty: number;       // contracts actually filled (may be less than asked)
  filledPriceUsdPerOz: number;
  note?: string;
}): Promise<HedgeSignal | null> {
  const filled = await moveSignal(params.signalId, APPROVED, FILLED, (s) => ({
    ...s,
    status: "filled",
    filledAt: Date.now(),
    filledBy: params.filledBy,
    filledQty: params.filledQty,
    filledPriceUsdPerOz: params.filledPriceUsdPerOz,
    fillNote: params.note,
  }));
  if (!filled) return null;

  // Update positions hash. Side determines the sign of qty change.
  const sideMultiplier =
    filled.type === "ROLL"
      ? (filled.side === "BUY" ? +1 : -1) // ROLL: open in chosen direction
      : (filled.type === "OPEN_LONG" ? +1 : -1);
  const qtyDelta = sideMultiplier * params.filledQty;

  const posKey = positionKey(filled.symbol);
  const existing = await redis.hgetall(posKey);
  const prevQty = parseFloat(String(existing?.qtyContracts || 0));
  const prevAvg = parseFloat(String(existing?.avgPriceUsdPerOz || 0));
  const prevFills: string[] = existing?.fillIds
    ? (typeof existing.fillIds === "string" ? JSON.parse(existing.fillIds) : existing.fillIds)
    : [];

  let newQty = prevQty + qtyDelta;
  let newAvg = prevAvg;
  if (qtyDelta > 0) {
    // Adding to position — weighted avg
    const totalCost = prevAvg * Math.abs(prevQty) + params.filledPriceUsdPerOz * params.filledQty;
    newAvg = totalCost / (Math.abs(prevQty) + params.filledQty);
  } else if (newQty === 0) {
    newAvg = 0;
  }
  // If we crossed zero (closed past flat), reset avg
  if (Math.sign(prevQty) !== 0 && Math.sign(newQty) !== Math.sign(prevQty) && newQty !== 0) {
    newAvg = params.filledPriceUsdPerOz;
  }

  await redis.hset(posKey, {
    qtyContracts: newQty,
    qtyGrams: newQty * GRAMS_PER_CONTRACT,
    avgPriceUsdPerOz: newAvg,
    openedAt: existing?.openedAt || Date.now(),
    lastFillAt: Date.now(),
    fillIds: JSON.stringify([...prevFills, filled.id].slice(-50)),
  });

  // If we hit flat, delete the hash so getOpenPositions() skips it cleanly
  if (newQty === 0) await redis.del(posKey);

  // If this was a ROLL, also close the source contract
  if (filled.type === "ROLL" && filled.rollFrom) {
    const fromKey = positionKey(filled.rollFrom);
    const fromData = await redis.hgetall(fromKey);
    const fromQty = parseFloat(String(fromData?.qtyContracts || 0));
    // ROLL collapses the source side fully (ops should have entered closing
    // fills as part of the same rolled trade)
    if (Math.abs(fromQty - params.filledQty * Math.sign(fromQty)) < 0.0001) {
      await redis.del(fromKey);
    }
  }

  return filled;
}

/** Snapshot — used by the admin dashboard endpoint and reconciler. */
export async function getHedgeSnapshot() {
  const [exposures, positions, pending, approved, filledRecent, state] = await Promise.all([
    getAllExposures(),
    getOpenPositions(),
    listSignals("pending", 50),
    listSignals("approved", 50),
    listSignals("filled", 25),
    redis.hgetall(STATE).catch(() => ({})),
  ]);
  const auxg = exposures.AUXG || { metal: "AUXG" as MetalSymbol, locked: 0, total: 0, free: 0, lastUpdated: 0 };
  const targetGrams = auxg.locked * HEDGE_RATIO;
  const currentGrams = positions.reduce((s, p) => s + p.qtyGrams, 0);

  return {
    config: { hedgeRatio: HEDGE_RATIO, minSignalGrams: MIN_SIGNAL_GRAMS, gramsPerContract: GRAMS_PER_CONTRACT },
    exposure: auxg,
    target: { grams: targetGrams, contracts: targetGrams / GRAMS_PER_CONTRACT },
    current: { grams: currentGrams, contracts: currentGrams / GRAMS_PER_CONTRACT },
    gap: { grams: targetGrams - currentGrams, contracts: (targetGrams - currentGrams) / GRAMS_PER_CONTRACT },
    positions,
    pendingSignals: pending,
    approvedSignals: approved,
    recentFills: filledRecent,
    state,
  };
}
