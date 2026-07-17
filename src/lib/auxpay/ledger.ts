/**
 * AUXPAY — SettlementLedger (double-entry, multi-asset).
 *
 * WHY: today user money moves are scattered single-sided `redis.hincrbyfloat`
 * mutations (withdraw route, settlement-service, auxr/buy, wise/stripe/coinbase
 * webhooks, ...). AUXM auto-journaling only fires for the subset that go through
 * redis.ts helpers. There is no single posting chokepoint and no real
 * debit=credit balancing.
 *
 * The SettlementLedger is that chokepoint: every value movement becomes one
 * balanced Posting. A Posting is idempotent (keyed), append-only journaled, and
 * only applied if debits equal credits per Unit. Balances are derived by summing
 * the journal (or a materialized cache), so reconciliation is structural, not a
 * secondary check.
 *
 * Phase 0: interface + types + balancing rules. The Redis-backed implementation
 * is intentionally stubbed — see implement() TODO. Nothing here touches live
 * money until routes are migrated onto post().
 */

import type { Unit } from './units';

/**
 * A ledger account id. Namespaced, colon-delimited. Examples:
 *   user:0xabc...:AUXP           liability owed to a user, in AUXP
 *   user:0xabc...:USDC           crypto owed to a user
 *   treasury:base-hot:USDC       assets actually held (Base hot wallet)
 *   treasury:tron-hot:USDT       Tron hot wallet
 *   treasury:bank-usd:USD        bank-held fiat (Wise / Frick)
 *   rail:bridge:inflight:USD     value in transit through a rail
 *   rail:rain:settlement:USDC    card program settlement account
 *   fee:income:AUXP              fees collected
 *   reserve:AUXG                 metal reserve backing (grams)
 *   equity:genesis:AUXP          opening balances / genesis mint
 */
export type AccountId = string;

export const ACCOUNT = {
  user: (addr: string, unit: Unit): AccountId => `user:${addr.toLowerCase()}:${unit}`,
  treasury: (venue: string, unit: Unit): AccountId => `treasury:${venue}:${unit}`,
  railInflight: (rail: string, unit: Unit): AccountId => `rail:${rail}:inflight:${unit}`,
  feeIncome: (unit: Unit): AccountId => `fee:income:${unit}`,
  reserve: (unit: Unit): AccountId => `reserve:${unit}`,
  equityGenesis: (unit: Unit): AccountId => `equity:genesis:${unit}`,
} as const;

/** One leg of a posting. `delta` is signed: credit to the account is positive. */
export interface Entry {
  account: AccountId;
  unit: Unit;
  /** signed amount; + increases the account balance, − decreases it */
  delta: number;
}

/** Reason codes — superset of the current AuxmReason enum, rail-aware. */
export type PostingReason =
  | 'deposit'
  | 'withdraw'
  | 'trade_buy'
  | 'trade_sell'
  | 'convert'
  | 'settlement' // metal unwind → cash
  | 'card_spend'
  | 'card_settlement'
  | 'onramp'
  | 'offramp'
  | 'payout'
  | 'fee'
  | 'wise_wire'
  | 'bridge'
  | 'coinbase'
  | 'stripe'
  | 'nowpayments'
  | 'transak'
  | 'reap'
  | 'rain'
  | 'referral'
  | 'bonus'
  | 'admin_adjust'
  | 'genesis';

/** A balanced, idempotent set of entries applied atomically. */
export interface Posting {
  /** dedupe key — e.g. a txHash, provider event id, or `${refId}:${step}` */
  idempotencyKey: string;
  reason: PostingReason;
  entries: Entry[];
  /** external references for audit/trace */
  refTxHash?: string;
  refId?: string;
  /** ISO timestamp; caller-supplied so the ledger stays deterministic */
  at: string;
  meta?: Record<string, unknown>;
}

const EPSILON = 1e-9;

/**
 * A posting is valid iff, for every Unit touched, the signed deltas sum to zero.
 * This is what makes it double-entry: value is never created or destroyed within
 * a single unit — it only moves between accounts. Cross-unit moves (USD→USDC)
 * balance each unit independently.
 */
export function assertBalanced(posting: Posting): void {
  if (!posting.entries.length) {
    throw new LedgerError('EMPTY_POSTING', 'posting has no entries');
  }
  const perUnit = new Map<Unit, number>();
  for (const e of posting.entries) {
    if (!Number.isFinite(e.delta)) {
      throw new LedgerError('BAD_DELTA', `non-finite delta on ${e.account}`);
    }
    perUnit.set(e.unit, (perUnit.get(e.unit) ?? 0) + e.delta);
  }
  for (const [unit, sum] of perUnit) {
    if (Math.abs(sum) > EPSILON) {
      throw new LedgerError(
        'UNBALANCED',
        `unit ${unit} does not net to zero (residual ${sum})`,
      );
    }
  }
}

export class LedgerError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

/**
 * The single posting API. ALL money movement must flow through post().
 * Migration target for every direct `redis.hincrbyfloat(balanceKey, ...)` call.
 */
export interface SettlementLedger {
  /**
   * Apply a balanced posting atomically and idempotently.
   * Re-applying the same idempotencyKey is a no-op that returns the original.
   */
  post(posting: Posting): Promise<PostingReceipt>;

  /** Current balance of one account. */
  balanceOf(account: AccountId): Promise<number>;

  /** All non-zero balances for a user across units (drop-in for GET /balance). */
  userBalances(addr: string): Promise<Partial<Record<Unit, number>>>;

  /** Append-only journal slice for audit / reconcile. */
  journal(opts?: { limit?: number; sinceId?: string }): Promise<Posting[]>;
}

export interface PostingReceipt {
  id: string;
  idempotencyKey: string;
  applied: boolean; // false if it was a dedupe no-op
  at: string;
}

/**
 * TODO(phase-0-impl): Redis-backed implementation.
 *  - journal: LPUSH to `auxpay:journal`, id = monotonic counter
 *  - idempotency: `SET auxpay:idem:{key} <id> NX` gate before applying
 *  - balances: pipeline hincrbyfloat on account-hash keys, mirrored to the
 *    existing `user:{addr}:balance` legacy fields (UNIT_TO_LEGACY_FIELD) during
 *    the coexistence window so current read paths keep working
 *  - wrap apply in a lightweight lock; verify assertBalanced() before any write
 * Until this lands, callers should not import a live instance.
 */
export function createSettlementLedger(): SettlementLedger {
  throw new LedgerError(
    'NOT_IMPLEMENTED',
    'SettlementLedger Redis impl not wired yet (Phase 0 skeleton)',
  );
}
