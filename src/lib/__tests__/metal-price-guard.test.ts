/**
 * Metal pricing source: palladium is always GoldAPI spot; any other metal
 * whose KuveytTürk mid drifts more than 5% from spot is priced at spot until KT
 * comes back, the rest keep their KT price, and a switch is never emailed.
 * Numbers are the live ones from 2026-11-03.
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

import { assessKtDeviation, MAX_KT_DEVIATION } from "@/lib/metal-price-guard";
import { getMetalUsdPrice, getSpotPricedMetals } from "@/lib/price-cache";

const spot = { gold: 126.37, silver: 1.597, platinum: 45.98, palladium: 30.14 };
beforeEach(() => {
  store.clear();
  sent.length = 0;
  store.set("metal:spot:cache", JSON.stringify({ ...spot, timestamp: Date.now() }));
  kt.AUXPT = { buyRateUSD: 48.55, sellRateUSD: 44.64 };
});
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("metal price source", () => {
  it("uses the KT mid, so the bank/FX spread on the ask does not switch healthy metals", () => {
    expect(MAX_KT_DEVIATION).toBe(0.05);
    expect(assessKtDeviation(132.37, 122.26, 126.37, Date.now()).useSpot).toBe(false);
    expect(assessKtDeviation(48.55, 44.64, 45.98, Date.now()).useSpot).toBe(false);
    expect(assessKtDeviation(50.52, 46.45, 30.14, Date.now()).useSpot).toBe(true);
  });

  it("keeps KT without a fresh spot reference", () => {
    expect(assessKtDeviation(50.52, 46.45, 30.14, 0).useSpot).toBe(false);
    expect(assessKtDeviation(50.52, 46.45, 30.14, Date.now() - 2 * 3600_000).useSpot).toBe(false);
    expect(assessKtDeviation(50.52, 46.45, undefined, Date.now()).useSpot).toBe(false);
  });

  it("prices palladium at GoldAPI spot for buy and sell, others at KT", async () => {
    await expect(getMetalUsdPrice("AUXPD", "buy")).resolves.toBe(30.14);
    await expect(getMetalUsdPrice("palladium", "sell")).resolves.toBe(30.14);
    await expect(getMetalUsdPrice("AUXG", "buy")).resolves.toBe(132.37);
    await expect(getMetalUsdPrice("platinum", "sell")).resolves.toBe(44.64);
    expect((await getSpotPricedMetals()).map((p) => p.symbol)).toEqual(["AUXPD"]);
  });

  it("switches a drifting KT metal to spot and back without emailing", async () => {
    kt.AUXPT = { buyRateUSD: 60, sellRateUSD: 56 };
    await expect(getMetalUsdPrice("AUXPT", "buy")).resolves.toBe(45.98);
    await getMetalUsdPrice("AUXPT", "sell");
    await flush();
    expect(store.get("metal:price-source:AUXPT")).toBe("spot");

    kt.AUXPT = { buyRateUSD: 48.55, sellRateUSD: 44.64 };
    await expect(getMetalUsdPrice("AUXPT", "buy")).resolves.toBe(48.55);
    await flush();
    expect(store.get("metal:price-source:AUXPT")).toBe("kt");
    expect(sent).toHaveLength(0);
  });
});
