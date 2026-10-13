/**
 * The caps are the layer that actually refuses a mint.
 *
 * A Telegram alert is detection: by the time it arrives the tokens are on
 * chain and cannot be recalled. On 10-11 October 2026 an attacker issued 697
 * AUXR in six calls between 21:55 and 00:22 and the first anyone knew of it
 * was the exchange telling us a day later. These limits are what bounds that
 * when nobody is watching, so they get a regression suite.
 */
const store = new Map<string, unknown>();

jest.mock("@/lib/redis", () => ({
  getRedis: () => ({
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    set: jest.fn(async (k: string, v: unknown) => void store.set(k, v)),
    del: jest.fn(async (k: string) => void store.delete(k)),
    expire: jest.fn(async () => 1),
    incrbyfloat: jest.fn(async (k: string, by: number) => {
      const next = (Number(store.get(k)) || 0) + by;
      store.set(k, next);
      return next;
    }),
  }),
}));

import {
  reserveMintAllowance,
  releaseMintAllowance,
  haltMinting,
  resumeMinting,
  DAILY_CAP_PER_ACCOUNT,
  DAILY_CAP_GLOBAL,
  MANUAL_REVIEW_THRESHOLD,
} from "@/lib/auxr-mint-limits";

const A = "0xaaa0000000000000000000000000000000000001";
const B = "0xbbb0000000000000000000000000000000000002";

beforeEach(() => store.clear());

describe("reserveMintAllowance", () => {
  it("allows a withdrawal inside every limit", async () => {
    const r = await reserveMintAllowance(A, 10);
    expect(r.ok).toBe(true);
  });

  it("refuses an amount over the manual review threshold", async () => {
    const r = await reserveMintAllowance(A, MANUAL_REVIEW_THRESHOLD + 1);
    expect(r).toMatchObject({ ok: false, code: "manual_review_required" });
  });

  it("refuses once the account's rolling 24h cap is reached", async () => {
    let used = 0;
    while (used + MANUAL_REVIEW_THRESHOLD <= DAILY_CAP_PER_ACCOUNT) {
      expect((await reserveMintAllowance(A, MANUAL_REVIEW_THRESHOLD)).ok).toBe(true);
      used += MANUAL_REVIEW_THRESHOLD;
    }
    const r = await reserveMintAllowance(A, MANUAL_REVIEW_THRESHOLD);
    expect(r).toMatchObject({ ok: false, code: "daily_cap_account" });
  });

  it("does not consume the allowance it refused", async () => {
    // Fill to just under the cap, attempt something too large, then confirm a
    // small withdrawal still fits — a refusal that still spent the quota would
    // let one blocked attempt lock an account out.
    const room = DAILY_CAP_PER_ACCOUNT - 5;
    let used = 0;
    while (used + MANUAL_REVIEW_THRESHOLD <= room) {
      await reserveMintAllowance(A, MANUAL_REVIEW_THRESHOLD);
      used += MANUAL_REVIEW_THRESHOLD;
    }
    const before = Number(store.get(`auxr:mint:24h:acct:${A}`)) || 0;
    const refused = await reserveMintAllowance(A, DAILY_CAP_PER_ACCOUNT);
    expect(refused.ok).toBe(false);
    expect(Number(store.get(`auxr:mint:24h:acct:${A}`)) || 0).toBeCloseTo(before, 6);
  });

  it("refuses on the platform cap even when each account is within its own", async () => {
    let total = 0;
    let i = 0;
    while (total + MANUAL_REVIEW_THRESHOLD <= DAILY_CAP_GLOBAL) {
      // A fresh account each time, so only the global ceiling can bite.
      await reserveMintAllowance(`0xccc${String(i).padStart(37, "0")}`, MANUAL_REVIEW_THRESHOLD);
      total += MANUAL_REVIEW_THRESHOLD;
      i += 1;
    }
    const r = await reserveMintAllowance(B, MANUAL_REVIEW_THRESHOLD);
    expect(r).toMatchObject({ ok: false, code: "daily_cap_global" });
  });

  it("returns the allowance when a mint fails", async () => {
    await reserveMintAllowance(A, 20);
    const after = Number(store.get(`auxr:mint:24h:acct:${A}`));
    await releaseMintAllowance(A, 20);
    expect(Number(store.get(`auxr:mint:24h:acct:${A}`))).toBeCloseTo(after - 20, 6);
  });
});

describe("kill switch", () => {
  it("refuses everything while halted, and resumes when cleared", async () => {
    await haltMinting("incident");
    expect(await reserveMintAllowance(A, 1)).toMatchObject({
      ok: false,
      code: "mint_halted",
    });
    await resumeMinting();
    expect((await reserveMintAllowance(A, 1)).ok).toBe(true);
  });

  it("halts before the amount is even considered", async () => {
    await haltMinting("incident");
    const r = await reserveMintAllowance(A, MANUAL_REVIEW_THRESHOLD + 1000);
    expect(r).toMatchObject({ code: "mint_halted" });
  });
});
