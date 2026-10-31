/**
 * The public reserves endpoint used to report 100% backing by construction:
 * the ledger it read added basket grams on every mint. These tests pin the
 * replacement: no statement, or an old one, must never read as backed.
 */
jest.mock("@/lib/redis", () => ({ redis: {}, getRedis: () => ({}) }));
jest.mock("@/lib/auxr-onchain", () => ({}));
jest.mock("@/lib/auxr-reserve", () => ({}));
jest.mock("@/lib/auxr-pricing", () => ({
  AUXR_GRAMS_PER_UNIT: { gold: 0.5, silver: 10, platinum: 0.1, palladium: 0.05 },
  getAuxrPricing: jest.fn(),
}));

import { computeBackingReport, STATEMENT_MAX_AGE_DAYS, type BackingStatement } from "@/lib/auxr-backing";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-10-31T00:00:00Z");
const spot = { gold: 100, silver: 1, platinum: 30, palladium: 30 };
const liability = { offChainUnits: 40, onChainUnits: 60, unrecoverableUnits: 5, totalUnits: 100 };
// 100 units need 50 g Au, 1000 g Ag, 10 g Pt, 5 g Pd.

function statement(grams: BackingStatement["grams"], ageDays = 1): BackingStatement {
  return { grams, asOf: NOW - ageDays * DAY, reference: "ref", enteredBy: "0xadmin", enteredAt: NOW };
}

const run = (s: BackingStatement | null) =>
  computeBackingReport({ liability, statement: s, spotUSDPerGram: spot, navUSD: 80, now: NOW });

describe("computeBackingReport", () => {
  it("without a statement is not backed and reports no ratio", () => {
    const r = run(null);
    expect(r.status).toBe("no_statement");
    expect(r.fullyBacked).toBe(false);
    expect(r.ratio).toBeNull();
    expect(r.heldUSD).toBe(0);
    expect(r.requiredGrams).toEqual({ gold: 50, silver: 1000, platinum: 10, palladium: 5 });
    expect(r.liabilityUSD).toBe(8000);
  });

  it("is backed when every metal is covered by a fresh statement", () => {
    const r = run(statement({ gold: 50, silver: 1000, platinum: 10, palladium: 6 }));
    expect(r.status).toBe("backed");
    expect(r.fullyBacked).toBe(true);
    expect(r.ratio!.weakest).toBe(1);
    expect(r.surplusGrams.palladium).toBe(1);
  });

  it("is under-backed when one metal falls short", () => {
    const r = run(statement({ gold: 50, silver: 500, platinum: 10, palladium: 5 }));
    expect(r.status).toBe("under_backed");
    expect(r.fullyBacked).toBe(false);
    expect(r.ratio!.weakest).toBe(0.5);
    expect(r.surplusGrams.silver).toBe(-500);
  });

  it("stops counting a statement older than the maximum age", () => {
    const r = run(statement({ gold: 999, silver: 99999, platinum: 999, palladium: 999 }, STATEMENT_MAX_AGE_DAYS + 1));
    expect(r.status).toBe("stale");
    expect(r.fullyBacked).toBe(false);
  });

  it("values held grams at spot", () => {
    const r = run(statement({ gold: 1, silver: 10, platinum: 1, palladium: 1 }));
    expect(r.heldUSD).toBe(100 + 10 + 30 + 30);
  });
});
