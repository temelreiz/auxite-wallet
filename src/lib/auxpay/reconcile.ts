/**
 * AUXPAY — shadow reconciliation.
 *
 * While the ledger runs in shadow mode, this compares what the double-entry
 * ledger accumulated (auxpay:acct) against the legacy `user:{addr}:balance`
 * fields for the units the shadow adapters cover. Drift here means an adapter's
 * posting doesn't mirror the legacy mutation — surface it before flipping any
 * route to `live`.
 *
 * Note: in the current shadow phase only the wire rail is wired, so only AUXP
 * is expected to track. Units with no shadow coverage yet will show the full
 * legacy balance as "drift" and should be ignored until their adapter lands.
 */

import { getRedis } from '../redis';
import { UNIT_TO_LEGACY_FIELD, type Unit } from './units';

export interface BalanceDrift {
  unit: Unit;
  ledger: number;
  legacy: number;
  drift: number; // ledger − legacy
}

const num = (v: unknown) => parseFloat(String(v ?? 0)) || 0;
const EPSILON = 1e-6;

export async function compareUserBalances(
  addr: string,
  units: Unit[] = ['AUXP'],
): Promise<BalanceDrift[]> {
  const a = addr.toLowerCase();
  const r = getRedis();

  const ledgerRaw = (await r.hmget(
    'auxpay:acct',
    ...units.map((u) => `user:${a}:${u}`),
  )) as Record<string, unknown> | unknown[] | null;
  const legacyHash = (await r.hgetall(`user:${a}:balance`)) || {};

  return units.map((u, i) => {
    const ledger = num(
      Array.isArray(ledgerRaw) ? ledgerRaw[i] : ledgerRaw?.[`user:${a}:${u}`],
    );
    const legacy = num((legacyHash as Record<string, unknown>)[UNIT_TO_LEGACY_FIELD[u]]);
    return { unit: u, ledger, legacy, drift: +(ledger - legacy).toFixed(8) };
  });
}

export function hasDrift(drifts: BalanceDrift[]): boolean {
  return drifts.some((d) => Math.abs(d.drift) > EPSILON);
}
