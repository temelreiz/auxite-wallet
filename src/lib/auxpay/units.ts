/**
 * AUXPAY — units of account.
 *
 * AUXP is the internal, off-chain, USD-pegged settlement unit (1 AUXP = 1 USD).
 * It is the AUXPAY name for the balance that today lives in the `auxm` field of
 * `user:{addr}:balance` (see src/lib/redis.ts, src/lib/auxm-ledger.ts). AUXP does
 * NOT introduce a new concept — it renames that role. Storage-field rename is a
 * later migration; for now AUXP maps 1:1 onto the existing `auxm` balance.
 *
 * Phase 0: types only. Nothing here is wired into live money paths yet.
 */

/** Every asset the ledger can hold a balance in. */
export type Unit =
  | 'AUXP' // internal USD-pegged cash liability (1 AUXP = 1 USD) — was `auxm`
  | 'USD' // bank fiat (Wise / Frick), distinct from AUXP
  | 'USDC' // stablecoin, native units (~$1)
  | 'USDT' // stablecoin, native units (~$1)
  | 'ETH' // native, spot-valued
  | 'BTC' // native, spot-valued
  | 'AUXG' // gold, grams
  | 'AUXS' // silver, grams
  | 'AUXPT' // platinum, grams
  | 'AUXPD' // palladium, grams
  | 'AUXR'; // reserve basket units

export const METAL_UNITS = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'] as const;
export const STABLE_UNITS = ['USDC', 'USDT'] as const;
export const CRYPTO_UNITS = ['ETH', 'BTC', 'USDC', 'USDT'] as const;

/** Units whose face value is 1 USD (no spot lookup needed). */
export const USD_PEGGED: ReadonlySet<Unit> = new Set<Unit>(['AUXP', 'USD', 'USDC', 'USDT']);

/**
 * The legacy storage field for a unit inside the `user:{addr}:balance` Redis hash.
 * AUXP reads/writes the `auxm` field until a field rename migration lands.
 */
export const UNIT_TO_LEGACY_FIELD: Record<Unit, string> = {
  AUXP: 'auxm',
  USD: 'usd',
  USDC: 'usdc',
  USDT: 'usdt',
  ETH: 'eth',
  BTC: 'btc',
  AUXG: 'auxg',
  AUXS: 'auxs',
  AUXPT: 'auxpt',
  AUXPD: 'auxpd',
  AUXR: 'auxr',
};

export function isMetal(u: Unit): boolean {
  return (METAL_UNITS as readonly string[]).includes(u);
}
