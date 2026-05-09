// ════════════════════════════════════════════════════════════════════════════
// WITHDRAW FEES — Single Source of Truth
// ════════════════════════════════════════════════════════════════════════════
//
// All withdrawal fees, network defaults, and minimum amounts in one place.
// Used by:
//   - src/app/api/withdraw/route.ts                (backend)
//   - src/components/WithdrawModal.tsx             (web direct withdraw UI)
//   - src/components/AuxmRedeemModal.tsx           (web AUXM redeem UI)
//   - src/app/api/cron/reconcile-deferred-onchain  (deferred queue retry)
//
// MOBILE NOTE: auxite-vault/app/withdraw.tsx maintains a manual mirror of
// these values (different repo, no shared package yet). When you change fees
// here, also update mobile WITHDRAW_NETWORKS — search "SYNC: withdraw-fees".
//
// FEE PHILOSOPHY:
//   - Cover real on-chain gas / payout-provider fee with a small buffer.
//   - Multi-network assets (USDT, USDC, ETH) charge per-network fees because
//     Ethereum mainnet gas is 30-50x what Base or Tron costs.
//   - BTC fee bundles NOWPayments service fee + Bitcoin miner fee; we don't
//     run our own BTC node so the third-party charge is real.
//   - Estimated USD numbers are display-only; math uses asset-unit `fee`.
// ════════════════════════════════════════════════════════════════════════════

export type Network =
  | "ethereum"
  | "tron"
  | "base"
  | "bitcoin"
  | "xrpl"
  | "solana";

export interface FeeConfig {
  /** Fee in payout asset units (e.g. 0.001 ETH, 1 USDC, 0.0002 BTC). */
  fee: number;
  /** Network the withdrawal lands on. */
  network: Network;
  /** Approximate USD value of the fee, for display only. */
  estimatedUsd: number;
  /** Minimum withdrawal amount in asset units. */
  minWithdraw: number;
}

// ── Single-network assets ──────────────────────────────────────────────────
const SINGLE_NET: Record<string, FeeConfig> = {
  XRP: { fee: 0.1,    network: "xrpl",    estimatedUsd: 0.20, minWithdraw: 10     },
  SOL: { fee: 0.01,   network: "solana",  estimatedUsd: 2,    minWithdraw: 0.1    },
  // BTC: NOWPayments charges service + Bitcoin miner; 0.0002 BTC ≈ $18 covers both.
  BTC: { fee: 0.0002, network: "bitcoin", estimatedUsd: 18,   minWithdraw: 0.0005 },
};

// ── Multi-network assets ───────────────────────────────────────────────────
const MULTI_NET: Record<string, Partial<Record<Network, FeeConfig>>> = {
  USDT: {
    ethereum: { fee: 15,  network: "ethereum", estimatedUsd: 15,  minWithdraw: 25 },
    tron:     { fee: 1,   network: "tron",     estimatedUsd: 1,   minWithdraw: 10 },
    base:     { fee: 0.5, network: "base",     estimatedUsd: 0.5, minWithdraw: 10 },
  },
  USDC: {
    ethereum: { fee: 15,  network: "ethereum", estimatedUsd: 15,  minWithdraw: 25 },
    base:     { fee: 0.5, network: "base",     estimatedUsd: 0.5, minWithdraw: 10 },
  },
  ETH: {
    ethereum: { fee: 0.005,  network: "ethereum", estimatedUsd: 15,  minWithdraw: 0.01  },
    base:     { fee: 0.0002, network: "base",     estimatedUsd: 0.6, minWithdraw: 0.001 },
  },
};

// ── Default network when caller doesn't specify ────────────────────────────
// AUXM redemption uses these defaults (cheapest network with hot-wallet liquidity).
export const DEFAULT_NETWORK: Record<string, Network> = {
  USDT: "tron",   // cheapest for retail; switch to "ethereum" only if user requires it
  USDC: "base",   // hot wallet holds USDC on Base
  ETH:  "base",   // hot wallet sends ETH on Base
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Get fee config for a withdrawal.
 * @param coin - "USDT" | "USDC" | "ETH" | "BTC" | "XRP" | "SOL"
 * @param network - Optional. Falls back to DEFAULT_NETWORK[coin] for multi-net assets.
 * @throws if coin is unknown.
 */
export function getWithdrawFee(coin: string, network?: Network | string): FeeConfig {
  const c = coin.toUpperCase();

  if (SINGLE_NET[c]) return SINGLE_NET[c];

  const multi = MULTI_NET[c];
  if (multi) {
    const requested = (network as Network) || DEFAULT_NETWORK[c];
    return multi[requested] || multi[DEFAULT_NETWORK[c]]!;
  }

  throw new Error(`Unsupported withdraw asset: ${coin}`);
}

/** List of networks supported for an asset (for UI network selector). */
export function getNetworksFor(coin: string): Network[] {
  const c = coin.toUpperCase();
  if (SINGLE_NET[c]) return [SINGLE_NET[c].network];
  if (MULTI_NET[c])  return Object.keys(MULTI_NET[c]) as Network[];
  return [];
}

/** Pretty network labels for UI. */
export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: "Ethereum",
  tron:     "Tron",
  base:     "Base",
  bitcoin:  "Bitcoin",
  xrpl:     "XRP Ledger",
  solana:   "Solana",
};

/** Convenience: shortcut to read just the fee number. */
export function getNetworkFee(coin: string, network?: Network | string): number {
  return getWithdrawFee(coin, network).fee;
}

/** Convenience: shortcut to read just the minimum withdraw. */
export function getMinWithdraw(coin: string, network?: Network | string): number {
  return getWithdrawFee(coin, network).minWithdraw;
}
