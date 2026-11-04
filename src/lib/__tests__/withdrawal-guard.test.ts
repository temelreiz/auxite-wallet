/**
 * Card-funded hold: value bought by card may not leave until it settles, whatever
 * it was converted into. Whole grams live in allocations, not the balance hash.
 */
const lists = new Map<string, string[]>();
const hashes = new Map<string, Record<string, string>>();
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    lrange: async (k: string) => lists.get(k) ?? [],
    lpush: async (k: string, v: string) => { lists.set(k, [v, ...(lists.get(k) ?? [])]); return 1; },
    ltrim: async () => "OK",
    del: async (k: string) => Number(lists.delete(k)),
    rpush: async (k: string, ...v: string[]) => { lists.set(k, [...(lists.get(k) ?? []), ...v]); return v.length; },
    hgetall: async (k: string) => hashes.get(k) ?? null,
  })),
}));

const prices: Record<string, number> = {};
const free: Record<string, number> = {};
const tokenPrices = jest.fn(async (m: string) => {
  if (!prices[m]) throw new Error("no price");
  return { bidPerGram: prices[m] };
});
const spotPrice = jest.fn(async (c: string) => {
  if (!prices[c]) throw new Error("no price");
  return prices[c];
});
jest.mock("@/lib/v6-token-service", () => ({ getTokenPrices: (m: string) => tokenPrices(m) }));
jest.mock("@/lib/crypto-liquidation-service", () => ({ getCryptoSpotPrice: (c: string) => spotPrice(c) }));
jest.mock("@/lib/allocation-service", () => ({ getAvailable: async (_a: string, m: string) => free[m] ?? 0 }));
let verified = true;
jest.mock("@/lib/kyc-limits", () => ({ isKycVerified: async () => verified }));
jest.mock("@/lib/auxr-pricing", () => ({ getAuxrPricing: async () => ({ sellPriceUSD: 80 }) }));

import {
  assertCardHoldAllows,
  assertCardHoldAllowsAsset,
  assertValueMayLeave,
  recordCardFundingHold,
  usdValueOf,
} from "@/lib/withdrawal-guard";

const A = "0xabc";
const setBalance = (b: Record<string, string>) => hashes.set(`user:${A}:balance`, b);

beforeEach(() => {
  lists.clear();
  hashes.clear();
  tokenPrices.mockClear();
  spotPrice.mockClear();
  for (const k of Object.keys(prices)) delete prices[k];
  for (const k of Object.keys(free)) delete free[k];
  prices.auxg = 120;
  prices.eth = 2000;
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("usdValueOf", () => {
  it("values a metal by its bid per gram, not grams as dollars", async () => {
    await expect(usdValueOf("AUXG", 2)).resolves.toBe(240);
  });

  it("throws instead of guessing when there is no price", async () => {
    await expect(usdValueOf("BTC", 0.5)).rejects.toThrow();
    spotPrice.mockResolvedValueOnce(0);
    await expect(usdValueOf("ETH", 0.5)).rejects.toThrow("No USD price");
  });
});

describe("assertCardHoldAllowsAsset", () => {
  it("never needs a price when the account has no holds", async () => {
    await expect(assertCardHoldAllowsAsset(A, "BTC", 1)).resolves.toEqual({ ok: true });
    expect(spotPrice).not.toHaveBeenCalled();
  });

  it("blocks card-bought value after it was converted to ETH", async () => {
    await recordCardFundingHold(A, 500, "pi_1");
    setBalance({ eth: "0.25" }); // $500 worth, all of it unsettled
    const r = await assertCardHoldAllowsAsset(A, "ETH", 0.25);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("card_funding_hold");
  });

  it("blocks moving held AUXM to another account", async () => {
    await recordCardFundingHold(A, 500, "pi_1");
    setBalance({ auxm: "500" });
    const r = await assertCardHoldAllowsAsset(A, "AUXM", 500);
    expect(r.code).toBe("card_funding_hold");
  });

  it("lets settled value leave beside a hold, counting allocated grams", async () => {
    await recordCardFundingHold(A, 120, "pi_1");
    free.auxg = 10; // $1,200 in allocations, nothing in the balance hash
    await expect(assertCardHoldAllowsAsset(A, "AUXG", 9)).resolves.toEqual({ ok: true });
    const tooMuch = await assertCardHoldAllowsAsset(A, "AUXG", 9.5);
    expect(tooMuch.code).toBe("card_funding_hold");
  });

  it("does not count locked or yielding metal as withdrawable", async () => {
    await recordCardFundingHold(A, 100, "pi_1");
    free.auxg = 0; // everything encumbered
    setBalance({ auxm: "100" });
    const r = await assertCardHoldAllowsAsset(A, "AUXM", 100);
    expect(r.code).toBe("card_funding_hold");
  });

  it("fails closed when an active hold cannot be priced", async () => {
    await recordCardFundingHold(A, 100, "pi_1");
    setBalance({ auxm: "10000" });
    const r = await assertCardHoldAllowsAsset(A, "SOL", 1);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("card_hold_check_failed");
  });

  it("fails closed on an amount that is not a number", async () => {
    await recordCardFundingHold(A, 100, "pi_1");
    setBalance({ auxm: "10000" });
    const r = await assertCardHoldAllows(A, NaN);
    expect(r.code).toBe("card_hold_check_failed");
  });

  it("values AUXR by its sell price and counts it toward the account", async () => {
    await recordCardFundingHold(A, 400, "pi_1");
    setBalance({ auxr: "10" }); // $800
    await expect(assertCardHoldAllowsAsset(A, "AUXR", 5)).resolves.toEqual({ ok: true });
    const tooMuch = await assertCardHoldAllowsAsset(A, "AUXR", 6);
    expect(tooMuch.code).toBe("card_funding_hold");
  });
});

describe("assertValueMayLeave", () => {
  afterEach(() => { verified = true; });

  it("requires KYC even with no holds", async () => {
    verified = false;
    const r = await assertValueMayLeave(A, "AUXM", 1);
    expect(r.code).toBe("kyc_required");
  });

  it("then applies the card hold", async () => {
    await recordCardFundingHold(A, 100, "pi_1");
    setBalance({ auxm: "100" });
    const r = await assertValueMayLeave(A, "AUXM", 100);
    expect(r.code).toBe("card_funding_hold");
  });

  it("allows a verified account with no holds", async () => {
    await expect(assertValueMayLeave(A, "AUXM", 100)).resolves.toEqual({ ok: true });
  });
});
