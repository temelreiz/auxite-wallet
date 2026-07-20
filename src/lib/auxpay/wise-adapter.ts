/**
 * AUXPAY — Wise rail adapter (first real rail onto the SettlementLedger).
 *
 * Wise is an INBOUND fiat rail: a wire lands in Aurum Ledger's Wise account and
 * the user is credited AUXP 1:1 (today the webhook writes `auxm` directly). This
 * adapter expresses that same event as a balanced double-entry posting.
 *
 * `shadowRecordWireCredit` is safe to call right after the existing credit in
 * src/app/api/wise/webhook/route.ts: in shadow mode (default) it writes ONLY to
 * the auxpay journal + account ledger, never to user balances, so behavior is
 * unchanged. It never throws — bookkeeping must not break a real wire credit.
 */

import { ACCOUNT, type Posting } from './ledger';
import { createSettlementLedger } from './ledger.redis';
import { ledgerMode } from './ledger.redis';

export interface WireCreditArgs {
  userAddress: string;
  /** USD value credited to the user (= AUXP amount, 1:1) */
  amountUsd: number;
  /** the wire's original currency (e.g. "EUR") */
  currency: string;
  /** the wire's original amount in `currency` */
  sourceAmount: number;
  /** Wise resource id — the natural idempotency key */
  resourceId: string;
  at?: string;
}

/**
 * A settled inbound wire in two balanced legs:
 *   USD:  treasury bank +amountUsd   /  external −amountUsd   (fiat entered)
 *   AUXP: user +amountUsd            /  external −amountUsd   (AUXP minted)
 *
 * The bank leg is booked in USD at the credited value (matching the app's
 * 1 AUXP = 1 USD convention); true multi-currency treasury accounting can split
 * treasury:bank-{currency} later.
 */
export function buildWireCreditPosting(args: WireCreditArgs): Posting {
  const usd = +Number(args.amountUsd).toFixed(2);
  return {
    idempotencyKey: `wise:${args.resourceId}`,
    reason: 'wise_wire',
    at: args.at ?? new Date().toISOString(),
    refId: args.resourceId,
    entries: [
      { account: ACCOUNT.treasury('bank-usd', 'USD'), unit: 'USD', delta: usd },
      { account: ACCOUNT.external('USD'), unit: 'USD', delta: -usd },
      { account: ACCOUNT.user(args.userAddress, 'AUXP'), unit: 'AUXP', delta: usd },
      { account: ACCOUNT.external('AUXP'), unit: 'AUXP', delta: -usd },
    ],
    meta: {
      currency: args.currency,
      sourceAmount: args.sourceAmount,
      rail: 'wise',
    },
  };
}

/**
 * Fire-and-forget shadow recorder. Guarded by mode and fully swallowed on error.
 * Call after the existing balance credit in the webhook.
 */
export async function shadowRecordWireCredit(args: WireCreditArgs): Promise<void> {
  try {
    if (ledgerMode() === 'off') return;
    if (!args.userAddress || !(args.amountUsd > 0) || !args.resourceId) return;
    const ledger = createSettlementLedger();
    await ledger.post(buildWireCreditPosting(args));
  } catch (e) {
    console.warn(
      '[auxpay/wise-adapter] shadow record failed (non-fatal):',
      (e as Error)?.message || e,
    );
  }
}
