// ============================================================================
// src/lib/crypto-position.ts — net crypto position & in-house top-up sizing.
//
// THE BRAIN of the "solve fiat→crypto in-house" plan. Read-only: it moves no
// money. It answers one question precisely:
//
//   "Do we actually need to convert any bank USD into crypto right now —
//    and if so, exactly how much?"
//
// Model (see the design discussion):
//   • Internal balances are a Redis ledger. AUXG↔ETH↔USDT conversions never
//     touch a chain — only deposits (in) and withdrawals (out) move real crypto.
//   • The hot wallets are fed by incoming crypto DEPOSITS. Withdrawals are paid
//     from them. So the ONLY time we must source crypto from fiat is when the
//     net crypto we owe (user ledger liability) exceeds the real crypto we hold.
//   • Within the held crypto, any specific asset (ETH/BTC) can be produced
//     on-demand from stablecoin via an on-chain DEX swap — so what matters for
//     the fiat top-up decision is TOTAL crypto value held vs TOTAL owed, not
//     per-asset matching. Per-asset detail is surfaced separately for the
//     swap-on-demand layer to act on.
//
// Withdrawable crypto assets (the ledger fields that can leave on-chain):
//   eth, btc, usdt, usdc.  (`usd` is fiat — backed by the bank, not crypto.)
//
// Pairs with src/lib/treasury-balances.ts (what we hold on-chain) and mirrors
// the authoritative balance scan in src/lib/auxm-ledger.ts (what we owe).
// ============================================================================

import { getRedis } from "./redis";
import {
  baseTreasury,
  tronTreasuryBalances,
  btcTreasury,
  cryptoSpot,
  type BaseTreasury,
  type TronTreasury,
  type BtcTreasury,
  type CryptoSpot,
} from "./treasury-balances";

/** Crypto ledger fields that are withdrawable on-chain. `usd` excluded (fiat). */
export type CryptoAsset = "eth" | "btc" | "usdt" | "usdc";
const CRYPTO_ASSETS: CryptoAsset[] = ["eth", "btc", "usdt", "usdc"];

/** Stablecoins are valued 1:1 USD; volatile assets use spot. */
const VOLATILE: Record<CryptoAsset, boolean> = { eth: true, btc: true, usdt: false, usdc: false };

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export interface CryptoLiabilities {
  /** Per-asset sum of every user's withdrawable crypto balance (native units). */
  byAsset: Record<CryptoAsset, number>;
  /** Number of user hashes carrying any crypto balance. */
  holders: number;
}

/**
 * Authoritative scan of every user balance hash → total crypto we OWE, per
 * asset, in native units. Same scan shape as auxm-ledger.sumLiabilities so the
 * two stay consistent; this one isolates the on-chain-withdrawable crypto legs.
 */
export async function sumCryptoLiabilities(): Promise<CryptoLiabilities> {
  const r = getRedis();
  let cursor = "0";
  const byAsset: Record<CryptoAsset, number> = { eth: 0, btc: 0, usdt: 0, usdc: 0 };
  let holders = 0;
  do {
    const [next, batch] = (await r.scan(cursor, { match: "user:0x*:balance", count: 500 })) as [string, string[]];
    cursor = next;
    for (let i = 0; i < batch.length; i += 100) {
      const slice = batch.slice(i, i + 100);
      const rows = await Promise.all(slice.map((k) => r.hgetall(k).catch(() => null)));
      for (const d of rows) {
        if (!d) continue;
        let any = false;
        for (const a of CRYPTO_ASSETS) {
          const v = num((d as any)[a]);
          if (v !== 0) { byAsset[a] += v; any = true; }
        }
        if (any) holders++;
      }
    }
  } while (cursor !== "0");
  return { byAsset, holders };
}

/** Real crypto held in the hot wallets, per asset, in native units. */
function heldByAsset(base: BaseTreasury, tron: TronTreasury, btc: BtcTreasury): Record<CryptoAsset, number> {
  return {
    eth: base.eth || 0,
    btc: btc.btc || 0,
    usdt: (base.usdt || 0) + (tron.usdt || 0), // USDT lives on both Base and Tron
    usdc: base.usdc || 0,
  };
}

function priceOf(asset: CryptoAsset, spot: CryptoSpot): number {
  if (asset === "eth") return spot.eth || 0;
  if (asset === "btc") return spot.btc || 0;
  return 1; // usdt / usdc ≈ $1
}

export interface AssetPosition {
  asset: CryptoAsset;
  owed: number;        // user ledger liability (native units)
  held: number;        // hot-wallet holdings (native units)
  net: number;         // held − owed (native units; negative = short)
  priceUsd: number;
  netUsd: number;      // net × price
}

export interface CryptoPositionReport {
  ts: number;
  perAsset: AssetPosition[];
  /** Total USD value of all crypto we owe. */
  liabilityUsd: number;
  /** Total USD value of all crypto we hold in hot wallets. */
  heldUsd: number;
  /** heldUsd − liabilityUsd. Negative ⇒ we are net short and need a top-up. */
  netUsd: number;
  /**
   * The ONLY number that should ever trigger the fiat→crypto venue:
   * USD we must convert to stablecoin to make total crypto holdings cover
   * total crypto liability. 0 ⇒ hot wallets are self-funded, NO venue needed.
   */
  fiatTopUpNeededUsd: number;
  /** Volatile (ETH/BTC) exposure: owed value not matched by held ETH/BTC. */
  unhedgedVolatileUsd: number;
  /** Per-asset native shortfalls the swap-on-demand layer must cover at exit. */
  assetShortfalls: Partial<Record<CryptoAsset, number>>;
  ok: boolean;
  alerts: string[];
  sources: { base: BaseTreasury; tron: TronTreasury; btc: BtcTreasury; spot: CryptoSpot };
}

// Alert when held crypto covers < this fraction of crypto liability.
const COVERAGE_WARN = 1.0;

/**
 * Full net-position report. Read-only. This is what the withdrawal
 * swap-on-demand layer and the (rare) venue top-up automation both read from.
 */
export async function cryptoPositionReport(): Promise<CryptoPositionReport> {
  const [liab, base, tron, btc, spot] = await Promise.all([
    sumCryptoLiabilities(),
    baseTreasury(),
    tronTreasuryBalances(),
    btcTreasury(),
    cryptoSpot(),
  ]);

  const held = heldByAsset(base, tron, btc);
  const perAsset: AssetPosition[] = CRYPTO_ASSETS.map((asset) => {
    const owed = liab.byAsset[asset];
    const h = held[asset];
    const net = h - owed;
    const priceUsd = priceOf(asset, spot);
    return { asset, owed, held: h, net, priceUsd, netUsd: net * priceUsd };
  });

  const liabilityUsd = perAsset.reduce((s, p) => s + p.owed * p.priceUsd, 0);
  const heldUsd = perAsset.reduce((s, p) => s + p.held * p.priceUsd, 0);
  const netUsd = heldUsd - liabilityUsd;
  const fiatTopUpNeededUsd = netUsd < 0 ? -netUsd : 0;

  // Volatile-only exposure: how much ETH/BTC value we owe beyond what we hold.
  const unhedgedVolatileUsd = perAsset
    .filter((p) => VOLATILE[p.asset])
    .reduce((s, p) => s + Math.max(0, (p.owed - p.held) * p.priceUsd), 0);

  // Native shortfalls — which exact assets the on-demand swap must produce.
  const assetShortfalls: Partial<Record<CryptoAsset, number>> = {};
  for (const p of perAsset) if (p.net < 0) assetShortfalls[p.asset] = -p.net;

  // Trust the verdict only if Base RPC + spot both resolved (largest swing).
  const ok = base.ok && spot.ok;

  const alerts: string[] = [];
  if (ok && liabilityUsd > 0 && heldUsd / liabilityUsd < COVERAGE_WARN) {
    alerts.push(
      `Crypto under-funded: hot wallets hold $${heldUsd.toFixed(2)} vs $${liabilityUsd.toFixed(2)} owed ` +
        `(coverage ${((heldUsd / liabilityUsd) * 100).toFixed(1)}%). Top up $${fiatTopUpNeededUsd.toFixed(2)} ` +
        `(bank USD → USDC → hot wallet) before it bites a withdrawal.`
    );
  }
  if (ok && unhedgedVolatileUsd > 0) {
    alerts.push(
      `Unhedged ETH/BTC exposure $${unhedgedVolatileUsd.toFixed(2)}: owed volatile crypto exceeds held. ` +
        `Swap-on-demand at withdrawal (stable→asset via DEX) removes this; until then it is open price risk.`
    );
  }
  if (!ok) {
    alerts.push("Position figure unreliable (Base RPC or spot fetch failed) — skip top-up/withdrawal decisions this run.");
  }

  return {
    ts: Date.now(),
    perAsset,
    liabilityUsd,
    heldUsd,
    netUsd,
    fiatTopUpNeededUsd,
    unhedgedVolatileUsd,
    assetShortfalls,
    ok,
    alerts,
    sources: { base, tron, btc, spot },
  };
}
