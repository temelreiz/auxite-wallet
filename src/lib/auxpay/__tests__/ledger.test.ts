import { assertBalanced, ACCOUNT, parseUserAccount, LedgerError, type Posting } from '../ledger';
import { buildWireCreditPosting } from '../wise-adapter';

const at = '2026-07-17T00:00:00.000Z';

describe('assertBalanced (double-entry invariant)', () => {
  it('accepts a per-unit zero-sum posting', () => {
    const p: Posting = {
      idempotencyKey: 'k1',
      reason: 'convert',
      at,
      entries: [
        { account: ACCOUNT.user('0xabc', 'USD'), unit: 'USD', delta: -100 },
        { account: ACCOUNT.treasury('bank-usd', 'USD'), unit: 'USD', delta: 100 },
        { account: ACCOUNT.treasury('base-hot', 'USDC'), unit: 'USDC', delta: -100 },
        { account: ACCOUNT.user('0xabc', 'USDC'), unit: 'USDC', delta: 100 },
      ],
    };
    expect(() => assertBalanced(p)).not.toThrow();
  });

  it('rejects a posting that does not net to zero for a unit', () => {
    const p: Posting = {
      idempotencyKey: 'k2',
      reason: 'deposit',
      at,
      entries: [
        { account: ACCOUNT.user('0xabc', 'AUXP'), unit: 'AUXP', delta: 100 },
        { account: ACCOUNT.external('AUXP'), unit: 'AUXP', delta: -99 },
      ],
    };
    expect(() => assertBalanced(p)).toThrow(LedgerError);
  });

  it('rejects an empty posting', () => {
    const p: Posting = { idempotencyKey: 'k3', reason: 'deposit', at, entries: [] };
    expect(() => assertBalanced(p)).toThrow(/EMPTY|no entries/i);
  });
});

describe('parseUserAccount', () => {
  it('parses a user account id', () => {
    expect(parseUserAccount('user:0xabc:AUXP')).toEqual({ addr: '0xabc', unit: 'AUXP' });
  });
  it('returns null for non-user accounts', () => {
    expect(parseUserAccount('treasury:bank-usd:USD')).toBeNull();
    expect(parseUserAccount('external:AUXP')).toBeNull();
  });
});

describe('buildWireCreditPosting (Wise rail)', () => {
  const posting = buildWireCreditPosting({
    userAddress: '0xABC',
    amountUsd: 250.01,
    currency: 'EUR',
    sourceAmount: 230,
    resourceId: 'wise-res-123',
    at,
  });

  it('is a balanced posting', () => {
    expect(() => assertBalanced(posting)).not.toThrow();
  });

  it('uses the wise resource id as the idempotency key', () => {
    expect(posting.idempotencyKey).toBe('wise:wise-res-123');
  });

  it('credits the user AUXP the USD value and mints it from external', () => {
    const userLeg = posting.entries.find(
      (e) => e.account === ACCOUNT.user('0xABC', 'AUXP'),
    );
    expect(userLeg?.delta).toBe(250.01);
    const bankLeg = posting.entries.find(
      (e) => e.account === ACCOUNT.treasury('bank-usd', 'USD'),
    );
    expect(bankLeg?.delta).toBe(250.01);
    // external contra mints the AUXP and sources the USD (both negative)
    expect(posting.entries.find((e) => e.account === ACCOUNT.external('AUXP'))?.delta).toBe(-250.01);
  });
});
