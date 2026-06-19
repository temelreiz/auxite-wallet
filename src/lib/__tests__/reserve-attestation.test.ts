// Unit tests for the signed reserve-attestation library.
// Mock the heavy on-chain/data imports so we test the pure hashing/signing path.

import { ethers } from "ethers";

jest.mock("@/lib/live-prices", () => ({ getLivePrices: jest.fn() }));
jest.mock("@/config/contracts-v8", () => ({
  CANONICAL_TOKENS: { AUXG: "0x0", AUXS: "0x0", AUXPT: "0x0", AUXPD: "0x0" },
}));

import {
  buildReport,
  hashReport,
  signReport,
  verifyAttestation,
  toMetalInputs,
  ATTESTATION_VERSION,
  type AttestationReport,
  type MetalReserveData,
} from "@/lib/reserve-attestation";

// Live-style per-metal data: gold slightly over-backed, rest exactly 1:1.
const metalData: MetalReserveData[] = [
  { symbol: "AUXG", supplyGrams: 100, reservesGrams: 100.5, navPerGram: 100 },
  { symbol: "AUXS", supplyGrams: 5000, reservesGrams: 5000, navPerGram: 1 },
  { symbol: "AUXPT", supplyGrams: 200, reservesGrams: 200, navPerGram: 30 },
  { symbol: "AUXPD", supplyGrams: 100, reservesGrams: 100, navPerGram: 20 },
];

// Deterministic test key (well-known Hardhat account #1) — createRandom()
// needs crypto entropy that the jest env doesn't reliably provide.
const TEST_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";

describe("reserve-attestation", () => {
  const ASOF = 1_750_000_000;

  it("builds a canonical report with per-metal mg + bps", () => {
    const r = buildReport(metalData, ASOF);
    expect(r.version).toBe(ATTESTATION_VERSION);
    expect(r.asOf).toBe(ASOF);
    expect(r.metals).toHaveLength(4);

    const gold = r.metals.find((m) => m.symbol === "AUXG")!;
    expect(gold.reservesMg).toBe(100_500); // 100.5g * 1000
    expect(gold.requiredMg).toBe(100_000);
    expect(gold.backingBps).toBe(10_050); // 1.005 * 10000

    // reservesUSD = Σ reservesGrams × navPerGram
    // = 100.5*100 + 5000*1 + 200*30 + 100*20 = 23,050
    expect(r.reservesUSD).toBe(23_050);
  });

  it("hashes deterministically regardless of key order", () => {
    const r1 = buildReport(metalData, ASOF);
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
    const r1 = buildReport(metalData, ASOF);
    const r2 = buildReport(metalData, ASOF + 1);
    expect(hashReport(r1)).not.toBe(hashReport(r2));
  });

  it("signs and verifies a roundtrip with a configured key", () => {
    const wallet = new ethers.Wallet(TEST_KEY);
    const prev = process.env.RESERVE_ATTESTOR_KEY;
    process.env.RESERVE_ATTESTOR_KEY = wallet.privateKey;
    try {
      const att = signReport(buildReport(metalData, ASOF));
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
      const att = signReport(buildReport(metalData, ASOF));
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
      const att = signReport(buildReport(metalData, ASOF));
      // Mutate a figure after signing.
      att.report.metals[0].reservesMg += 1;
      expect(verifyAttestation(att)).toBeNull();
    } finally {
      process.env.RESERVE_ATTESTOR_KEY = prev;
    }
  });

  it("maps to on-chain MetalInput tuples", () => {
    const r = buildReport(metalData, ASOF);
    const inputs = toMetalInputs(r);
    expect(inputs).toHaveLength(4);
    const [symbol, reservesMg, requiredMg, backingBps] = inputs[0];
    expect(symbol).toBe(ethers.encodeBytes32String("AUXG"));
    expect(reservesMg).toBe(100_500n);
    expect(requiredMg).toBe(100_000n);
    expect(backingBps).toBe(10_050n);
  });
});
