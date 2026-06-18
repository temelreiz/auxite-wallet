// ============================================================================
// src/lib/auxm-ledger.ts — AUXM mint/burn bookkeeping.
//
// AUXM is a USD-denominated INTERNAL settlement unit (not an on-chain token):
// every 1 AUXM = "we owe the user 1 USD of value". It is therefore a LIABILITY
// on Auxite's books. This module gives that liability a proper double-entry
// audit trail:
//
//   • recordAuxmEntry()  — append-only journal line + global minted/burned
//                          counters. Called at every mint/burn site. Never
//                          throws: bookkeeping must not break a money path.
//   • getAuxmSupply()    — read the global counters.
//   • sumLiabilities()   — authoritative outstanding = sum of live balances.
//   • ensureGenesis()    — one-time baseline so counters (which start at 0
//                          today) can be reconciled against pre-existing
//                          balances.
//   • reconcileAuxm()    — outstanding vs liquid backing vs counter-drift.
//
// Authoritative outstanding is ALWAYS the sum of live balances. The counters
// are a secondary consistency check: if (genesis + minted − burned) drifts from
// the balance sum, a mint/burn path is uninstrumented or there is a bug.
// ============================================================================

import { getRedis } from "./redis";
import { computeBackingUsd, baseTreasury, tronTreasuryBalances, btcTreasury, cryptoSpot } from "./treasury-balances";

export type AuxmReason =
  | "deposit"        // fiat/stablecoin in → AUXM minted
  | "withdraw"       // AUXM burned → crypto/fiat out
  | "withdraw_refund" // on-chain payout failed → AUXM re-credited
  | "trade_buy"      // AUXM spent to buy another asset (burn)
  | "trade_sell"     // asset sold into AUXM (mint)
  | "bonus"          // promotional AUXM
  | "wise_wire"      // bank wire credited as AUXM
  | "coinbase"       // coinbase commerce charge → AUXM
  | "transak"
  | "nowpayments"
  | "referral"
  | "admin_adjust"   // manual admin credit/debit
  | "genesis"        // baseline marker (delta 0)
  | "other";

export interface AuxmEntry {
  address: string;
  /** +mint / −burn, in AUXM units (= USD). */
  delta: number;
  reason: AuxmReason;
  /** The asset on the other leg, e.g. "USDC", "ETH", "AUXG". */
  counterAsset?: string;
  counterAmount?: number;
  refTxId?: string;
  refTxHash?: string;
  meta?: Record<string, any>;
}

const JOURNAL_KEY = "auxm:journal";
const JOURNAL_MAX = 200_000; // generous cap; archive to cold storage before this fills
const MINTED_KEY = "auxm:total_minted";
const BURNED_KEY = "auxm:total_burned";
const GENESIS_KEY = "auxm:ledger:genesis_outstanding";
const INIT_FLAG = "auxm:ledger:initialized";

const num = (v: any) => parseFloat(String(v ?? 0)) || 0;

/**
 * Append a mint/burn event to the immutable journal and bump global counters.
 * NEVER throws — a bookkeeping failure must not roll back a real balance change.
 */
export async function recordAuxmEntry(entry: AuxmEntry): Promise<void> {
  try {
    if (!entry || typeof entry.delta !== "number" || !isFinite(entry.delta) || entry.delta === 0) return;
    const r = getRedis();
    const rec = {
      ts: Date.now(),
      address: (entry.address || "").toLowerCase(),
      delta: entry.delta,
      reason: entry.reason,
      counterAsset: entry.counterAsset ?? null,
      counterAmount: entry.counterAmount ?? null,
      refTxId: entry.refTxId ?? null,
      refTxHash: entry.refTxHash ?? null,
      meta: entry.meta ?? null,
    };
    const p = r.pipeline();
    p.lpush(JOURNAL_KEY, JSON.stringify(rec));
    p.ltrim(JOURNAL_KEY, 0, JOURNAL_MAX - 1);
    if (entry.delta > 0) p.incrbyfloat(MINTED_KEY, entry.delta);
    else p.incrbyfloat(BURNED_KEY, -entry.delta);
    await p.exec();
  } catch (e: any) {
    console.error("recordAuxmEntry failed (non-fatal):", e?.message || e);
  }
}

export interface AuxmSupply {
  minted: number;
  burned: number;
  /** Pre-instrumentation baseline (sum of balances when the ledger was seeded). */
  genesisOutstanding: number | null;
  /** minted − burned (flow since genesis). */
  flowOutstanding: number;
}

export async function getAuxmSupply(): Promise<AuxmSupply> {
  const r = getRedis();
  const [m, b, g] = await Promise.all([r.get(MINTED_KEY), r.get(BURNED_KEY), r.get(GENESIS_KEY)]);
  const minted = num(m);
  const burned = num(b);
  const genesisOutstanding = g == null ? null : num(g);
  return { minted, burned, genesisOutstanding, flowOutstanding: minted - burned };
}

export interface AuxmLiabilities {
  /** Hard AUXM liability (excludes promo bonus). */
  auxm: number;
  /** Promotional bonus AUXM (separately accounted — may not be fully backed). */
  bonus: number;
  /** User-held cash-equivalents: usd + usdt + usdc. */
  stable: number;
  /** auxm + bonus + stable — total redeemable USD-pegged liability. */
  total: number;
  holders: number;
}

/**
 * Authoritative scan of every user balance hash. This is the source of truth
 * for "how much AUXM is outstanding right now".
 */
export async function sumLiabilities(): Promise<AuxmLiabilities> {
  const r = getRedis();
  let cursor = "0";
  let auxm = 0, bonus = 0, stable = 0, holders = 0;
  do {
    const [next, batch] = (await r.scan(cursor, { match: "user:0x*:balance", count: 500 })) as [string, string[]];
    cursor = next;
    for (let i = 0; i < batch.length; i += 100) {
      const slice = batch.slice(i, i + 100);
      const rows = await Promise.all(slice.map((k) => r.hgetall(k).catch(() => null)));
      for (const d of rows) {
        if (!d) continue;
        const a = num((d as any).auxm);
        const bn = num((d as any).bonusAuxm ?? (d as any).bonusauxm);
        const st = num((d as any).usd) + num((d as any).usdt) + num((d as any).usdc);
        if (a !== 0 || bn !== 0 || st !== 0) holders++;
        auxm += a;
        bonus += bn;
        stable += st;
      }
    }
  } while (cursor !== "0");
  return { auxm, bonus, stable, total: auxm + bonus + stable, holders };
}

/**
 * Seed the pre-instrumentation baseline exactly once. Counters start at 0 today,
 * but balances already reflect all historical mints — so we record the current
 * outstanding as `genesisOutstanding`. Idempotent.
 */
export async function ensureGenesis(): Promise<number> {
  const r = getRedis();
  const flag = await r.get(INIT_FLAG);
  if (flag) {
    const g = await r.get(GENESIS_KEY);
    return num(g);
  }
  const { auxm } = await sumLiabilities();
  await r.set(GENESIS_KEY, String(auxm));
  await r.set(INIT_FLAG, String(Date.now()));
  // Genesis marker in the journal (delta 0 — recordAuxmEntry skips 0, so push directly).
  try {
    await r.lpush(
      JOURNAL_KEY,
      JSON.stringify({ ts: Date.now(), address: "system", delta: 0, reason: "genesis", meta: { genesisOutstanding: auxm } })
    );
  } catch {}
  return auxm;
}

export interface AuxmReconcileReport {
  ts: number;
  liabilities: AuxmLiabilities;
  supply: AuxmSupply;
  backingUSD: number;
  backingOk: boolean;
  backingBreakdown: Record<string, number>;
  /** genesis + minted − burned. */
  expectedOutstanding: number | null;
  /** actual outstanding AUXM − expectedOutstanding. */
  drift: number | null;
  driftOk: boolean;
  coverageVsAuxm: number | null;
  coverageVsStable: number | null;
  /** backing ≥ all redeemable stable liabilities. */
  solvent: boolean | null;
  alerts: string[];
}

// Tolerances. Drift allows for float dust + a small uninstrumented tail.
const DRIFT_TOLERANCE_USD = 1.0;
const COVERAGE_WARN = 1.0; // alert if backing < 100% of stable liabilities

export async function reconcileAuxm(): Promise<AuxmReconcileReport> {
  await ensureGenesis();

  const [liabilities, supply, base, tron, btc, spot, cash, inflight] = await Promise.all([
    sumLiabilities(),
    getAuxmSupply(),
    baseTreasury(),
    tronTreasuryBalances(),
    btcTreasury(),
    cryptoSpot(),
    getRedis().get("treasury:usd:cash").then((v) => (v != null ? Number(v) : 0)).catch(() => 0),
    getRedis().get("treasury:bridge:inflight_usd").then((v) => (v != null ? Number(v) : 0)).catch(() => 0),
  ]);

  const backing = computeBackingUsd(base, tron, btc, spot, cash, inflight);

  const expectedOutstanding =
    supply.genesisOutstanding != null ? supply.genesisOutstanding + supply.minted - supply.burned : null;
  const drift = expectedOutstanding != null ? liabilities.auxm - expectedOutstanding : null;
  const driftOk = drift == null ? true : Math.abs(drift) <= DRIFT_TOLERANCE_USD;

  const coverageVsAuxm = liabilities.auxm > 0 ? backing.usd / liabilities.auxm : null;
  const coverageVsStable = liabilities.total > 0 ? backing.usd / liabilities.total : null;
  const solvent = backing.ok ? backing.usd >= liabilities.total : null;

  const alerts: string[] = [];
  if (!driftOk && drift != null) {
    alerts.push(
      `AUXM counter drift ${drift.toFixed(2)} USD: outstanding ${liabilities.auxm.toFixed(2)} vs expected ${expectedOutstanding!.toFixed(2)} — a mint/burn path may be uninstrumented.`
    );
  }
  if (backing.ok && coverageVsStable != null && coverageVsStable < COVERAGE_WARN) {
    alerts.push(
      `AUXM under-backed: liquid treasury ${backing.usd.toFixed(2)} USD < stable liabilities ${liabilities.total.toFixed(2)} USD (coverage ${(coverageVsStable * 100).toFixed(1)}%).`
    );
  }
  if (!backing.ok) {
    alerts.push("Backing figure unreliable (treasury RPC/spot fetch failed) — solvency verdict skipped this run.");
  }

  return {
    ts: Date.now(),
    liabilities,
    supply,
    backingUSD: backing.usd,
    backingOk: backing.ok,
    backingBreakdown: backing.breakdown,
    expectedOutstanding,
    drift,
    driftOk,
    coverageVsAuxm,
    coverageVsStable,
    solvent,
    alerts,
  };
}

/** Read recent journal entries (newest first). */
export async function getAuxmJournal(limit = 100, offset = 0): Promise<any[]> {
  const r = getRedis();
  const rows = await r.lrange(JOURNAL_KEY, offset, offset + limit - 1);
  return (rows || []).map((x: any) => {
    try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return x; }
  });
}
