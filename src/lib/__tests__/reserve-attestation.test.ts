// Unit tests for the signed reserve-attestation library.
// Mocks the Redis-backed reserve module so we test pure hashing/signing.

import { ethers } from "ethers";

jest.mock("@/lib/auxr-reserve", () => ({
  getReserveSnapshot: jest.fn(),
}));

import {
  buildReport,
  hashReport,
  signReport,
  verifyAttestation,
  toMetalInputs,
  ATTESTATION_VERSION,
  type AttestationReport,
} from "@/lib/reserve-attestation";
import type { ReserveSnapshot } from "@/lib/auxr-reserve";

const snapshot: ReserveSnapshot = {
  supplyUnits: 1000,
  reservesGrams: { gold: 100.5, silver: 5000, platinum: 200, palladium: 100 },
  requiredGrams: { gold: 100, silver: 5000, platinum: 200, palladium: 100 },
  backingRatio: {
    gold: 1.005,
    silver: 1.0,
    platinum: 1.0,
    palladium: 1.0,
    weakest: 1.0,
  },
  reservesUSD: 1_234_567.89,
  marketCapUSD: 1_230_000.5,
  lastUpdated: 1_700_000_000_000,
};

// Deterministic test key (well-known Hardhat account #1) — createRandom()
// needs crypto entropy that the jest env doesn't reliably provide.
const TEST_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

describe("reserve-attestation", () => {
  const ASOF = 1_750_000_000;

  it("builds a canonical report with per-metal mg + bps", () => {
    const r = buildReport(snapshot, ASOF);
    expect(r.version).toBe(ATTESTATION_VERSION);
    expect(r.asOf).toBe(ASOF);
    expect(r.metals).toHaveLength(4);

    const gold = r.metals.find((m) => m.symbol === "AUXG")!;
    expect(gold.reservesMg).toBe(100_500); // 100.5g * 1000
    expect(gold.requiredMg).toBe(100_000);
    expect(gold.backingBps).toBe(10_050); // 1.005 * 10000

    expect(r.reservesUSD).toBe(1_234_568); // rounded
  });

  it("hashes deterministically regardless of key order", () => {
    const r1 = buildReport(snapshot, ASOF);
    // Same data, shuffled top-level key insertion order.
    const r2: AttestationReport = {
      marketCapUSD: r1.marketCapUSD,
      metals: r1.metals,
      attestor: r1.attestor,
      asOf: r1.asOf,
      reservesUSD: r1.reservesUSD,
      version: r1.version,
    };
    expect(hashReport(r1)).toBe(hashReport(r2));
  });

  it("produces a different hash when a figure changes", () => {
    const r1 = buildReport(snapshot, ASOF);
    const r2 = buildReport(snapshot, ASOF + 1);
    expect(hashReport(r1)).not.toBe(hashReport(r2));
  });

  it("signs and verifies a roundtrip with a configured key", () => {
    const wallet = new ethers.Wallet(TEST_KEY);
    const prev = process.env.RESERVE_ATTESTOR_KEY;
    process.env.RESERVE_ATTESTOR_KEY = wallet.privateKey;
    try {
      const att = signReport(buildReport(snapshot, ASOF));
      expect(att.signature).not.toBeNull();
      expect(att.signer).toBe(wallet.address);
      const recovered = verifyAttestation(att);
      expect(recovered).toBe(wallet.address);
    } finally {
      process.env.RESERVE_ATTESTOR_KEY = prev;
    }
  });

  it("returns unsigned (null) when no key is configured", () => {
    const prev = process.env.RESERVE_ATTESTOR_KEY;
    delete process.env.RESERVE_ATTESTOR_KEY;
    try {
      const att = signReport(buildReport(snapshot, ASOF));
      expect(att.signature).toBeNull();
      expect(att.signer).toBeNull();
      expect(verifyAttestation(att)).toBeNull();
    } finally {
      if (prev) process.env.RESERVE_ATTESTOR_KEY = prev;
    }
  });

  it("rejects a tampered report (hash mismatch)", () => {
    const wallet = new ethers.Wallet(TEST_KEY);
    const prev = process.env.RESERVE_ATTESTOR_KEY;
    process.env.RESERVE_ATTESTOR_KEY = wallet.privateKey;
    try {
      const att = signReport(buildReport(snapshot, ASOF));
      // Mutate a figure after signing.
      att.report.metals[0].reservesMg += 1;
      expect(verifyAttestation(att)).toBeNull();
    } finally {
      process.env.RESERVE_ATTESTOR_KEY = prev;
    }
  });

  it("maps to on-chain MetalInput tuples", () => {
    const r = buildReport(snapshot, ASOF);
    const inputs = toMetalInputs(r);
    expect(inputs).toHaveLength(4);
    const [symbol, reservesMg, requiredMg, backingBps] = inputs[0];
    expect(symbol).toBe(ethers.encodeBytes32String("AUXG"));
    expect(reservesMg).toBe(100_500n);
    expect(requiredMg).toBe(100_000n);
    expect(backingBps).toBe(10_050n);
  });
});
