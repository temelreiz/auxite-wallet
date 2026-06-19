// Unit tests for the pure NAV-redemption quote logic.

import {
  quoteNavRedemption,
  NAV_REDEMPTION_FEE_BPS,
  NAV_MIN_GRAMS,
  NAV_MAX_AGE_SECONDS,
} from "@/lib/nav-redemption";

describe("nav-redemption quote", () => {
  const fresh = 10; // seconds old

  it("computes gross/fee/net for gold at NAV", () => {
    const q = quoteNavRedemption({
      metal: "AUXG",
      grams: 100,
      navPerGram: 145,
      navAgeSeconds: fresh,
      stablecoin: "USDC",
    });
    expect(q.ok).toBe(true);
    expect(q.grossUsd).toBe(14500); // 100 * 145
    expect(q.feeBps).toBe(NAV_REDEMPTION_FEE_BPS.AUXG); // 50 bps
    expect(q.feeUsd).toBe(72.5); // 0.50% of 14500
    expect(q.netUsd).toBe(14427.5);
    expect(q.stablecoinOut).toBe(14427.5); // USDC 1:1
    expect(q.effectiveRatePerGram).toBe(144.28); // 14427.5 / 100, rounded
    expect(q.circuitBreaker).toBe(false);
  });

  it("rejects amounts below the per-metal minimum", () => {
    const q = quoteNavRedemption({
      metal: "AUXS",
      grams: NAV_MIN_GRAMS.AUXS - 1,
      navPerGram: 2.26,
      navAgeSeconds: fresh,
      stablecoin: "USDT",
    });
    expect(q.ok).toBe(false);
    expect(q.reason).toBe("below_minimum");
  });

  it("rejects non-positive amounts", () => {
    const q = quoteNavRedemption({
      metal: "AUXG",
      grams: 0,
      navPerGram: 145,
      navAgeSeconds: fresh,
      stablecoin: "USDC",
    });
    expect(q.ok).toBe(false);
    expect(q.reason).toBe("invalid_amount");
  });

  it("rejects an invalid NAV", () => {
    const q = quoteNavRedemption({
      metal: "AUXG",
      grams: 100,
      navPerGram: 0,
      navAgeSeconds: fresh,
      stablecoin: "USDC",
    });
    expect(q.ok).toBe(false);
    expect(q.reason).toBe("invalid_nav");
  });

  it("trips the circuit breaker on a stale NAV", () => {
    const q = quoteNavRedemption({
      metal: "AUXG",
      grams: 100,
      navPerGram: 145,
      navAgeSeconds: NAV_MAX_AGE_SECONDS + 1,
      stablecoin: "USDC",
    });
    expect(q.ok).toBe(false);
    expect(q.circuitBreaker).toBe(true);
    expect(q.reason).toBe("nav_stale");
  });

  it("applies wider fee for PGMs", () => {
    const q = quoteNavRedemption({
      metal: "AUXPT",
      grams: 10,
      navPerGram: 60,
      navAgeSeconds: fresh,
      stablecoin: "USDC",
    });
    // 10 * 60 = 600 gross; 1.00% fee = 6; net 594
    expect(q.feeBps).toBe(100);
    expect(q.grossUsd).toBe(600);
    expect(q.feeUsd).toBe(6);
    expect(q.netUsd).toBe(594);
  });

  it("net is always strictly below gross (the lower NAV band)", () => {
    const q = quoteNavRedemption({
      metal: "AUXG",
      grams: 50,
      navPerGram: 150,
      navAgeSeconds: fresh,
      stablecoin: "USDC",
    });
    expect(q.netUsd).toBeLessThan(q.grossUsd);
    expect(q.effectiveRatePerGram).toBeLessThan(q.navPerGram);
  });
});
