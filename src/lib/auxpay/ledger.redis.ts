/**
 * AUXPAY — Redis-backed SettlementLedger (Upstash).
 *
 * Storage:
 *   auxpay:journal        LPUSH'd JSON postings (append-only, capped)
 *   auxpay:journal:seq    INCR monotonic posting id
 *   auxpay:idem:{key}     idempotency gate → stores the applied posting id
 *   auxpay:acct           hash: field = AccountId, value = balance
 *
 * Modes (env AUXPAY_LEDGER_MODE):
 *   off     post() is a no-op (adapters may call unconditionally)
 *   shadow  writes journal + auxpay:acct ONLY — never touches user balances.
 *           Legacy code remains the source of truth; used to validate that the
 *           double-entry reproduces legacy balances with zero risk. (default)
 *   live    ledger is the writer; mirrors user:{addr}:{unit} legs into the
 *           legacy `user:{addr}:balance` fields so current read paths keep
 *           working. Only flip here once the legacy hincrbyfloat is removed
 *           from the corresponding route (else double-credit).
 */

import { getRedis } from '../redis';
import { UNIT_TO_LEGACY_FIELD, type Unit } from './units';
import {
  assertBalanced,
  parseUserAccount,
  type AccountId,
  type Posting,
  type PostingReceipt,
  type SettlementLedger,
} from './ledger';

export type LedgerMode = 'off' | 'shadow' | 'live';

export function ledgerMode(): LedgerMode {
  const m = (process.env.AUXPAY_LEDGER_MODE || 'shadow').toLowerCase();
  return m === 'off' || m === 'live' ? m : 'shadow';
}

const K = {
  journal: 'auxpay:journal',
  seq: 'auxpay:journal:seq',
  acct: 'auxpay:acct',
  idem: (key: string) => `auxpay:idem:${key}`,
};

const JOURNAL_MAX = 200_000;
const IDEM_TTL_S = 60 * 60 * 24 * 90; // 90 days
const num = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

class RedisSettlementLedger implements SettlementLedger {
  async post(posting: Posting): Promise<PostingReceipt> {
    const mode = ledgerMode();
    if (mode === 'off') {
      return { id: '', idempotencyKey: posting.idempotencyKey, applied: false, at: posting.at };
    }

    // Never write an unbalanced posting.
    assertBalanced(posting);

    const r = getRedis();
    const idemKey = K.idem(posting.idempotencyKey);

    // Idempotency gate: first writer wins the NX lock.
    const first = await r.set(idemKey, 'pending', { nx: true, ex: IDEM_TTL_S });
    if (!first) {
      const existingId = await r.get<string>(idemKey);
      return {
        id: existingId && existingId !== 'pending' ? existingId : '',
        idempotencyKey: posting.idempotencyKey,
        applied: false,
        at: posting.at,
      };
    }

    const id = String(await r.incr(K.seq));
    const record = { id, ...posting };

    const mirror = mode === 'live';
    const p = r.pipeline();
    p.lpush(K.journal, JSON.stringify(record));
    p.ltrim(K.journal, 0, JOURNAL_MAX - 1);

    for (const e of posting.entries) {
      p.hincrbyfloat(K.acct, e.account, e.delta);
      if (mirror) {
        const parsed = parseUserAccount(e.account);
        const field = parsed && UNIT_TO_LEGACY_FIELD[parsed.unit as Unit];
        if (parsed && field) {
          p.hincrbyfloat(`user:${parsed.addr}:balance`, field, e.delta);
        }
      }
    }

    // Record the applied id under the idempotency key for later dedupe lookups.
    p.set(idemKey, id, { ex: IDEM_TTL_S });
    await p.exec();

    return { id, idempotencyKey: posting.idempotencyKey, applied: true, at: posting.at };
  }

  async balanceOf(account: AccountId): Promise<number> {
    const v = await getRedis().hget(K.acct, account);
    return num(v);
  }

  async userBalances(addr: string): Promise<Partial<Record<Unit, number>>> {
    const a = addr.toLowerCase();
    const units = Object.keys(UNIT_TO_LEGACY_FIELD) as Unit[];
    const r = getRedis();
    const raw = (await r.hmget(
      K.acct,
      ...units.map((u) => `user:${a}:${u}`),
    )) as Record<string, unknown> | unknown[] | null;
    const out: Partial<Record<Unit, number>> = {};
    units.forEach((u, i) => {
      // hmget returns an object keyed by field OR an array depending on client;
      // normalize by index against the requested fields.
      const val = Array.isArray(raw) ? raw[i] : raw?.[`user:${a}:${u}`];
      const n = num(val);
      if (n !== 0) out[u] = n;
    });
    return out;
  }

  async journal(opts?: { limit?: number }): Promise<Posting[]> {
    const limit = opts?.limit ?? 100;
    const rows = await getRedis().lrange(K.journal, 0, limit - 1);
    return rows
      .map((row) => {
        try {
          return JSON.parse(row) as Posting;
        } catch {
          return null;
        }
      })
      .filter((p): p is Posting => p !== null);
  }
}

let singleton: SettlementLedger | null = null;

export function createSettlementLedger(): SettlementLedger {
  if (!singleton) singleton = new RedisSettlementLedger();
  return singleton;
}
