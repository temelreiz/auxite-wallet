// /api/proof-of-reserves/attestation/route.ts
// Public endpoint (no auth) — returns the latest signed reserve attestation.
//
// The off-chain half: a canonical report of reserves vs. required backing,
// hashed and signed by the independent attestor key. The on-chain half: if a
// ReserveAttestation contract is deployed (RESERVE_ATTESTATION_ADDRESS), we read
// its latest committed reportHash and confirm it matches the freshly computed
// report — so a verifier sees "this signed report is the one anchored on-chain."
import { NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  generateAttestation,
  verifyAttestation,
} from "@/lib/reserve-attestation";

export const dynamic = "force-dynamic";

const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const ATTESTATION_ADDRESS = process.env.RESERVE_ATTESTATION_ADDRESS;

const REGISTRY_ABI = [
  "function attestationCount() view returns (uint256)",
  "function latestAttestation() view returns (tuple(uint64 asOf, uint64 postedAt, address attestor, bytes32 reportHash, string reportURI, bytes32[] symbols))",
  "function isFresh(uint64 maxAgeSeconds) view returns (bool)",
];

interface OnChainAnchor {
  deployed: boolean;
  attestationCount?: number;
  asOf?: number;
  postedAt?: number;
  attestor?: string;
  reportHash?: string;
  /** Does the on-chain committed hash equal the freshly computed report hash? */
  matchesLatestReport?: boolean;
  /** Was the latest on-chain attestation posted within 25h? */
  fresh?: boolean;
}

async function readOnChainAnchor(
  computedHash: string
): Promise<OnChainAnchor> {
  if (!ATTESTATION_ADDRESS) return { deployed: false };
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const reg = new ethers.Contract(
      ATTESTATION_ADDRESS,
      REGISTRY_ABI,
      provider
    );
    const count: bigint = await reg.attestationCount();
    if (count === 0n) {
      return { deployed: true, attestationCount: 0 };
    }
    const latest = await reg.latestAttestation();
    const fresh: boolean = await reg.isFresh(90000); // 25h
    return {
      deployed: true,
      attestationCount: Number(count),
      asOf: Number(latest.asOf),
      postedAt: Number(latest.postedAt),
      attestor: latest.attestor,
      reportHash: latest.reportHash,
      matchesLatestReport: latest.reportHash === computedHash,
      fresh,
    };
  } catch (e) {
    // On-chain read failure should not break the off-chain attestation.
    return { deployed: true };
  }
}

export async function GET() {
  try {
    const att = await generateAttestation();
    const recoveredSigner = verifyAttestation(att);
    const onChain = await readOnChainAnchor(att.reportHash);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      attestation: {
        report: att.report,
        reportHash: att.reportHash,
        signature: att.signature,
        signer: att.signer,
        signed: att.signature !== null,
        // self-verification: the signer recovered from the signature matches
        // the configured signer address (null when unsigned)
        verified: recoveredSigner !== null && recoveredSigner === att.signer,
      },
      onChain,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "attestation_failed" },
      { status: 500 }
    );
  }
}
