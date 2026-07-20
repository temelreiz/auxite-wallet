/**
 * AUXPAY — PaymentRail adapter interface.
 *
 * Every external money edge (fiat in/out, crypto in/out, card) is normalized
 * behind one interface so orchestration can pick the fastest/cheapest rail and
 * no single provider is a point of failure. A rail never mutates balances
 * directly — it emits balanced Postings for the SettlementLedger to apply. That
 * keeps the ledger the single source of truth and every rail idempotent.
 *
 * Phase 0: interface + a registry mapping the rails ALREADY wired in the repo.
 * Existing implementations (wise.ts, bridge-offramp.ts, deposit-credit.ts, ...)
 * get thin adapters that translate their events into post() calls; new rails
 * (Reap, Rain) implement this interface from the start.
 */

import type { Posting } from './ledger';
import type { Unit } from './units';

export type RailId =
  // wired today
  | 'wise' // fiat wire IN  (Aurum Ledger HK) → AUXP
  | 'bridge' // DEAD — Bridge.xyz rejected Aurum Ledger at KYB; do not build on it
  | 'coinbase' // crypto commerce IN → AUXP
  | 'stripe' // card IN → metal grams
  | 'nowpayments' // crypto IN → AUXP
  | 'transak' // on/off-ramp
  | 'onchain' // hot-wallet crypto withdraw OUT (Base/Tron/…)
  | 'dex' // 0x Base hot-wallet swap (internal conversion)
  | 'htx' // treasury crypto → USDT (internal)
  | 'kuveyt' // TR bank metal procurement (treasury)
  | 'frick' // Bank Frick — direct stablecoin deposit → in-house fiat (PRIMARY off-ramp)
  // targeted next
  | 'reap' // fiat off-ramp (approved) — alternative to Frick
  | 'rain'; // card program + on/off-ramp + virtual accounts (evaluating)

export type RailDirection = 'in' | 'out' | 'both' | 'internal';

export interface RailQuoteRequest {
  fromUnit: Unit;
  toUnit: Unit;
  amount: number;
  /** which side the `amount` is denominated on */
  amountSide: 'from' | 'to';
  meta?: Record<string, unknown>;
}

export interface RailQuote {
  rail: RailId;
  fromUnit: Unit;
  toUnit: Unit;
  fromAmount: number;
  toAmount: number;
  feeUnit: Unit;
  feeAmount: number;
  /** provider quote id, if the rail issues one; pass back on execute */
  quoteRef?: string;
  expiresAt?: string;
}

export interface RailExecuteRequest {
  userAddress: string;
  quote: RailQuote;
  /** dedupe key the caller controls (order id, tx id, …) */
  idempotencyKey: string;
  /** for OUT: destination (address / bank ref / card); for IN: source hint */
  destination?: string;
  meta?: Record<string, unknown>;
}

export type RailStatusCode =
  | 'pending'
  | 'processing'
  | 'settled'
  | 'failed'
  | 'refunded';

export interface RailResult {
  rail: RailId;
  status: RailStatusCode;
  /** provider-side reference to poll / reconcile */
  providerRef?: string;
  /** postings to apply now (e.g. move to inflight); may be empty until webhook */
  postings: Posting[];
  raw?: unknown;
}

/**
 * A rail implements the subset that applies to it. Orchestration inspects
 * `direction` / capability flags before calling.
 */
export interface PaymentRail {
  id: RailId;
  direction: RailDirection;

  quote(req: RailQuoteRequest): Promise<RailQuote>;

  /** fiat/crypto IN → ledger postings (may complete async via webhook) */
  payIn?(req: RailExecuteRequest): Promise<RailResult>;

  /** ledger → fiat/crypto OUT */
  payOut?(req: RailExecuteRequest): Promise<RailResult>;

  /** poll provider state for a prior execute */
  status?(providerRef: string): Promise<RailResult>;

  /**
   * Translate an inbound provider webhook into balanced postings, idempotently.
   * This is where wise/stripe/coinbase/transak/bridge webhooks converge.
   */
  handleWebhook?(payload: unknown): Promise<Posting[]>;
}

/** Simple registry so orchestration can resolve and route. */
export class RailRegistry {
  private rails = new Map<RailId, PaymentRail>();

  register(rail: PaymentRail): void {
    this.rails.set(rail.id, rail);
  }

  get(id: RailId): PaymentRail {
    const r = this.rails.get(id);
    if (!r) throw new Error(`rail not registered: ${id}`);
    return r;
  }

  /** rails that can move `unit` in the given direction, for failover ordering */
  candidates(direction: 'in' | 'out', unit: Unit): PaymentRail[] {
    return [...this.rails.values()].filter(
      (r) =>
        (r.direction === direction || r.direction === 'both') &&
        (direction === 'in' ? !!r.payIn : !!r.payOut),
    );
  }
}

/**
 * Map of what each already-wired rail does today — the adapter checklist for
 * migrating existing code onto post(). Direction is from the user-balance POV.
 */
export const EXISTING_RAIL_MAP: Record<
  RailId,
  { direction: RailDirection; units: Unit[]; note: string }
> = {
  wise: { direction: 'in', units: ['USD', 'AUXP'], note: 'incoming wire → AUXP 1:1' },
  // DEAD: Bridge.xyz rejected Aurum Ledger at KYB. The bridge-offramp code
  // (src/lib/bridge-offramp.ts, api/bridge/*, cron/bridge-offramp-sweep) is
  // orphaned. Off-ramp is replaced by Bank Frick (accepts stablecoin directly,
  // converts in-house). Reuse the sweep pattern (treasury stable → deposit
  // address) but target Frick, not Bridge. Do not add a Bridge adapter.
  bridge: { direction: 'out', units: ['USDC', 'USDT', 'USD'], note: 'DEAD — KYB rejected; replaced by Frick' },
  coinbase: { direction: 'in', units: ['AUXP'], note: 'commerce charge → AUXP + bonus' },
  stripe: { direction: 'in', units: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'], note: 'card → metal grams (no AUXP)' },
  nowpayments: { direction: 'in', units: ['AUXP', 'USDT', 'USDC', 'ETH', 'BTC'], note: 'crypto → AUXP or raw' },
  transak: { direction: 'both', units: ['USDC', 'USDT', 'ETH', 'BTC'], note: 'on/off-ramp, token field' },
  onchain: { direction: 'out', units: ['ETH', 'BTC', 'USDT', 'USDC'], note: 'hot-wallet withdraw Base/Tron/XRP/SOL' },
  dex: { direction: 'internal', units: ['USDC', 'USDT', 'ETH'], note: '0x Base swap, treasury cover' },
  htx: { direction: 'internal', units: ['USDT', 'ETH', 'BTC', 'USDC'], note: 'treasury crypto → USDT' },
  kuveyt: { direction: 'internal', units: ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'], note: 'TR bank metal procurement' },
  frick: { direction: 'out', units: ['USDC', 'USDT'], note: 'PRIMARY off-ramp — send treasury stable to BF deposit addr, BF converts to fiat; no API' },
  reap: { direction: 'out', units: ['USDT', 'USDC'], note: 'off-ramp alternative (approved); needs a non-Wise payout bank' },
  rain: { direction: 'both', units: ['USDC'], note: 'card + ramps + virtual accts (evaluating)' },
};
