/**
 * AP quotes run at 25 bps, so they must not price off a stale NAV: during a
 * metals move that is a free option against the treasury. Retail quotes keep
 * working on the last-good price, as before.
 */
const spot = { gold: 130, silver: 1.6, platinum: 32, palladium: 33, timestamp: 0 };
jest.mock("@/lib/price-cache", () => ({
  getMetalSpotPrices: jest.fn(async () => ({ ...spot })),
}));

import { quoteBuy, quoteSell, StaleNavError } from "@/lib/auxr-pricing";
import { NAV_MAX_AGE_SECONDS } from "@/lib/nav-redemption";

const AP = 0.0025;

function setAge(seconds: number) {
  spot.timestamp = Date.now() - seconds * 1000;
}

describe("AP quotes refuse a stale NAV", () => {
  it("quotes AP buy and sell on a fresh NAV", async () => {
    setAge(10);
    const b = await quoteBuy(1000, AP);
    const s = await quoteSell(1, AP);
    expect(b.buyPriceUSD).toBeCloseTo(b.navUSD * (1 + AP), 8);
    expect(s.sellPriceUSD).toBeCloseTo(s.navUSD * (1 - AP), 8);
  });

  it("throws StaleNavError past the max age", async () => {
    setAge(NAV_MAX_AGE_SECONDS + 1);
    await expect(quoteBuy(1000, AP)).rejects.toBeInstanceOf(StaleNavError);
    await expect(quoteSell(1, AP)).rejects.toBeInstanceOf(StaleNavError);
  });

  it("treats the hardcoded last-resort price (timestamp 0) as stale", async () => {
    spot.timestamp = 0;
    await expect(quoteSell(1, AP)).rejects.toBeInstanceOf(StaleNavError);
  });

  it("leaves retail quotes alone on a stale NAV", async () => {
    setAge(NAV_MAX_AGE_SECONDS * 10);
    await expect(quoteBuy(1000)).resolves.toMatchObject({ usdAmount: 1000 });
    await expect(quoteSell(1)).resolves.toMatchObject({ unitsAUXR: 1 });
  });
});
