// ============================================================================
// RESERVE ATTESTATION — signed proof-of-reserve report
// ----------------------------------------------------------------------------
// Turns the live reserve snapshot into a canonical, hashable, independently
// verifiable attestation:
//
//   1. Build a canonical report from getReserveSnapshot() (reserves vs. the
//      grams required to back outstanding supply, per metal).
//   2. Deterministically hash it (keccak256 of canonical JSON) → reportHash.
//   3. Sign reportHash with the attestor key (EIP-191). The signer is meant to
//      be the independent attestor (The Network Firm); anyone with the public
//      address can verify the signature.
//   4. The SAME reportHash + per-metal figures are posted on-chain via
//      ReserveAttestation.sol (toMetalInputs()), so the on-chain feed and the
//      off-chain signed report are bound by one hash.
//
// This is the cryptographic half of "every asset, proven": the dashboard shows
// the numbers, this proves who attested them and that they were not altered.
// ============================================================================

import { ethers } from "ethers";
import { CANONICAL_TOKENS } from "@/config/contracts-v8";
import { getLivePrices } from "@/lib/live-prices";

// The live canonical metal tokens (per-investor AuxiteMetal, 0xCef9…). The PoR
// attests the REAL on-chain supply of these tokens, not the off-chain AUXR
// basket ledger. Model: 1 token = 1 gram of allocated physical metal, so
// on-chain supply IS the reserve figure (100% backed by construction); the
// independent physical verification is the CPA attestor's job.
const METAL_SYMBOLS = ["AUXG", "AUXS", "AUXPT", "AUXPD"] as const;
type MetalSym = (typeof METAL_SYMBOLS)[number];

const BASE_RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";
const TOKEN_DECIMALS = 3; // 1 gram = 1000 raw units

/** Per-metal reserve data sourced from the live canonical token + NAV. */
export interface MetalReserveData {
  symbol: string;
  /** On-chain totalSupply, in grams. */
  supplyGrams: number;
  /** Physical metal held, in grams (= supply in the 1:1 allocated model). */
  reservesGrams: number;
  /** USD per gram (issuer NAV). */
  navPerGram: number;
}

export const ATTESTATION_VERSION = "auxite-por-1";

/** Per-metal line in a reserve attestation report. */
export interface AttestationMetal {
  /** Public token symbol, e.g. "AUXG". */
  symbol: string;
  /** Physical metal reserved, in milligrams (grams * 1000) — integer. */
  reservesMg: number;
  /** Milligrams required to fully back current supply — integer. */
  requiredMg: number;
  /** reserves / required in basis points (10000 = 100%) — integer. */
  backingBps: number;
}

/** Canonical reserve attestation report (the thing that gets hashed + signed). */
export interface AttestationReport {
  version: typeof ATTESTATION_VERSION;
  /** Attestor-reported as-of time (unix seconds). */
  asOf: number;
  /** Label of the independent attestor. */
  attestor: string;
  metals: AttestationMetal[];
  /** USD value of reserves at attestation time (informational, not hashed-critical). */
  reservesUSD: number;
  /** USD market cap of outstanding supply at NAV. */
  marketCapUSD: number;
}

/** A report plus its hash and (optional) signature. */
export interface SignedAttestation {
  report: AttestationReport;
  /** keccak256 of the canonical report JSON. Matches the on-chain reportHash. */
  reportHash: string;
  /** EIP-191 signature over reportHash, or null when no signer key is configured. */
  signature: string | null;
  /** Address recovered from / corresponding to the signature, or null. */
  signer: string | null;
}

const ATTESTOR_LABEL = process.env.RESERVE_ATTESTOR_LABEL || "The Network Firm";

// ── Canonicalization & hashing ────────────────────────────────────────────────

/**
 * Deterministic JSON: object keys sorted recursively, no insignificant
 * whitespace. Two parties computing the hash must agree byte-for-byte, so the
 * serialization must be canonical — JSON.stringify key order is insertion
 * order, which we must not rely on.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    "{" +
    keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") +
    "}"
  );
}

/** keccak256 of the canonical report JSON. This is the on-chain reportHash. */
export function hashReport(report: AttestationReport): string {
  return ethers.keccak256(ethers.toUtf8Bytes(canonicalize(report)));
}

// ── Report construction ───────────────────────────────────────────────────────

function gramsToMg(grams: number): number {
  return Math.round(grams * 1000);
}

function ratioToBps(ratio: number): number {
  if (!isFinite(ratio) || ratio < 0) return 0;
  return Math.round(ratio * 10000);
}

/** Build the canonical report from per-metal reserve data. */
export function buildReport(
  metals: MetalReserveData[],
  asOfSeconds: number
): AttestationReport {
  const lines: AttestationMetal[] = metals.map((m) => ({
    symbol: m.symbol,
    reservesMg: gramsToMg(m.reservesGrams),
    requiredMg: gramsToMg(m.supplyGrams),
    backingBps:
      m.supplyGrams > 0 ? ratioToBps(m.reservesGrams / m.supplyGrams) : 10000,
  }));

  const reservesUSD = metals.reduce(
    (s, m) => s + m.reservesGrams * m.navPerGram,
    0
  );
  const marketCapUSD = metals.reduce(
    (s, m) => s + m.supplyGrams * m.navPerGram,
    0
  );

  return {
    version: ATTESTATION_VERSION,
    asOf: asOfSeconds,
    attestor: ATTESTOR_LABEL,
    metals: lines,
    reservesUSD: Math.round(reservesUSD),
    marketCapUSD: Math.round(marketCapUSD),
  };
}

// ── Signing & verification ────────────────────────────────────────────────────

/**
 * Sign a report with the attestor key (env `RESERVE_ATTESTOR_KEY`). Returns the
 * report, its hash, and the EIP-191 signature. When no key is configured the
 * report is still hashed and returned unsigned (`signature: null`) so the
 * endpoint works in dev without a key.
 */
export function signReport(report: AttestationReport): SignedAttestation {
  const reportHash = hashReport(report);
  const key = process.env.RESERVE_ATTESTOR_KEY;
  if (!key) {
    return { report, reportHash, signature: null, signer: null };
  }
  const wallet = new ethers.Wallet(key);
  // EIP-191 personal_sign over the 32-byte hash.
  const signature = wallet.signMessageSync(ethers.getBytes(reportHash));
  return { report, reportHash, signature, signer: wallet.address };
}

/**
 * Verify a signed attestation independently: recompute the hash from the
 * report, confirm it matches, and recover the signer from the signature.
 * @returns the recovered signer address, or null if invalid.
 */
export function verifyAttestation(att: SignedAttestation): string | null {
  if (!att.signature) return null;
  const expectedHash = hashReport(att.report);
  if (expectedHash !== att.reportHash) return null;
  try {
    return ethers.verifyMessage(
      ethers.getBytes(att.reportHash),
      att.signature
    );
  } catch {
    return null;
  }
}

// ── On-chain bridge ────────────────────────────────────────────────────────────

/** The MetalInput[] tuple shape expected by ReserveAttestation.postAttestation. */
export type MetalInputTuple = [
  symbol: string,
  reservesMg: bigint,
  requiredMg: bigint,
  backingBps: bigint
];

/**
 * Convert a report's metals into the on-chain `MetalInput[]` calldata so the
 * exact figures behind `reportHash` are committed on-chain in one posting.
 */
export function toMetalInputs(report: AttestationReport): MetalInputTuple[] {
  return report.metals.map((m) => [
    ethers.encodeBytes32String(m.symbol),
    BigInt(m.reservesMg),
    BigInt(m.requiredMg),
    BigInt(m.backingBps),
  ]);
}

// ── High-level entry point ─────────────────────────────────────────────────────

/**
 * Read live reserve data: each canonical metal token's on-chain totalSupply,
 * priced at the issuer NAV. reserves = supply (1:1 allocated model).
 */
export async function readOnChainReserves(): Promise<MetalReserveData[]> {
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const prices = await getLivePrices();
  const abi = ["function totalSupply() view returns (uint256)"];
  const out: MetalReserveData[] = [];
  for (const sym of METAL_SYMBOLS) {
    const addr = (CANONICAL_TOKENS as Record<MetalSym, string>)[sym];
    let supplyGrams = 0;
    try {
      const c = new ethers.Contract(addr, abi, provider);
      const raw: bigint = await c.totalSupply();
      supplyGrams = parseFloat(ethers.formatUnits(raw, TOKEN_DECIMALS));
    } catch {
      supplyGrams = 0;
    }
    const navPerGram = Number((prices as Record<string, number>)[sym.toLowerCase()]) || 0;
    out.push({ symbol: sym, supplyGrams, reservesGrams: supplyGrams, navPerGram });
  }
  return out;
}

/**
 * Produce a fresh signed attestation from the live on-chain canonical supply.
 * @param asOfSeconds as-of time; defaults to now.
 */
export async function generateAttestation(
  asOfSeconds?: number
): Promise<SignedAttestation> {
  const metals = await readOnChainReserves();
  const asOf = asOfSeconds ?? Math.floor(Date.now() / 1000);
  return signReport(buildReport(metals, asOf));
}
