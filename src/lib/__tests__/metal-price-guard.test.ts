/**
 * Metal price guard: a metal whose KuveytTürk mid drifts more than 5% from
 * spot is not traded (getMetalUsdPrice throws instead of falling back), the
 * others keep their KT price, and ops hear about it once per state change.
 * Numbers are the live ones from 2026-11-03 (palladium stuck at KT).
 */
const store = new Map<string, string>();
const sent: { subject: string }[] = [];
jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => { store.set(k, v); return "OK"; },
    setex: async (k: string, _t: number, v: string) => { store.set(k, v); return "OK"; },
    getset: async (k: string, v: string) => { const p = store.get(k) ?? null; store.set(k, v); return p; },
    del: async (k: string) => Number(store.delete(k)),
  })),
}));
jest.mock("@/lib/email", () => ({ sendEmail: jest.fn(async (m: any) => { sent.push(m); return { success: true }; }) }));
const kt = {
  AUXG: { buyRateUSD: 132.37, sellRateUSD: 122.26 },
  AUXS: { buyRateUSD: 1.681, sellRateUSD: 1.552 },
  AUXPT: { buyRateUSD: 48.55, sellRateUSD: 44.64 },
  AUXPD: { buyRateUSD: 50.52, sellRateUSD: 46.45 },
};
jest.mock("../kuveytturk-service", () => ({ getMetalPricesInUsd: async () => kt }));

import { assessKtDeviation, MAX_KT_DEVIATION, pausedErrorBody } from "@/lib/metal-price-guard";
import { getMetalUsdPrice, getPausedMetals } from "@/lib/price-cache";

beforeEach(() => {
  store.clear();
  sent.length = 0;
  store.set("metal:spot:cache", JSON.stringify({ gold: 126.37, silver: 1.597, platinum: 45.98, palladium: 30.14, timestamp: Date.now() }));
});

describe("metal price guard", () => {
  it("uses the KT mid, so the bank/FX spread on the ask does not pause healthy metals", () => {
    expect(MAX_KT_DEVIATION).toBe(0.05);
    expect(assessKtDeviation(132.37, 122.26, 126.37, Date.now()).paused).toBe(false);
    expect(assessKtDeviation(48.55, 44.64, 45.98, Date.now()).paused).toBe(false);
    const pd = assessKtDeviation(50.52, 46.45, 30.14, Date.now());
    expect(pd.paused).toBe(true);
    expect(pd.deviation!).toBeGreaterThan(0.6);
  });

  it("stays open without a fresh spot reference", () => {
    expect(assessKtDeviation(50.52, 46.45, 30.14, 0).paused).toBe(false);
    expect(assessKtDeviation(50.52, 46.45, 30.14, Date.now() - 2 * 3600_000).paused).toBe(false);
    expect(assessKtDeviation(50.52, 46.45, undefined, Date.now()).paused).toBe(false);
  });

  it("refuses to price a paused metal and keeps KT prices for the rest", async () => {
    await expect(getMetalUsdPrice("AUXG", "buy")).resolves.toBe(132.37);
    await expect(getMetalUsdPrice("platinum", "sell")).resolves.toBe(44.64);
    const err = await getMetalUsdPrice("AUXPD", "buy").catch((e) => e);
    expect(pausedErrorBody(err)?.code).toBe("metal_paused");
    expect(pausedErrorBody(new Error("other"))).toBeNull();
    expect((await getPausedMetals()).map((p) => p.symbol)).toEqual(["AUXPD"]);
  });

  it("emails on the transition only, in both directions", async () => {
    await getMetalUsdPrice("AUXPD", "buy").catch(() => {});
    await getMetalUsdPrice("AUXPD", "sell").catch(() => {});
    await getPausedMetals();
    await new Promise((r) => setTimeout(r, 0));
    expect(sent.map((m) => m.subject)).toHaveLength(1);
    expect(sent[0].subject).toMatch(/Paladyum alım-satımı DURDURULDU/);

    kt.AUXPD = { buyRateUSD: 31.0, sellRateUSD: 29.6 };
    await expect(getMetalUsdPrice("AUXPD", "buy")).resolves.toBe(31.0);
    await new Promise((r) => setTimeout(r, 0));
    expect(sent).toHaveLength(2);
    expect(sent[1].subject).toMatch(/yeniden açıldı/);
  });
});
