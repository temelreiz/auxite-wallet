// ============================================================================
// /api/cron/reserve-attestation-post — post the daily on-chain PoR attestation.
//
// Builds the signed reserve report (reserve-attestation.ts), then commits its
// hash + per-metal figures on-chain via ReserveAttestation.postAttestation. The
// signing key (RESERVE_ATTESTOR_KEY) must hold ATTESTOR_ROLE on the contract —
// it is the independent attestor's key (The Network Firm).
//
// Auth:  CRON_SECRET (Bearer).
// Safety: dry-run by default. Set RESERVE_POST_EXECUTE=true to actually send.
//
// Env:
//   CRON_SECRET                  bearer secret for the cron caller
//   RESERVE_ATTESTATION_ADDRESS  deployed registry address (Base)
//   RESERVE_ATTESTOR_KEY         signer holding ATTESTOR_ROLE (also signs report)
//   RESERVE_POST_EXECUTE         "true" to send the tx; otherwise dry-run
//   BASE_RPC_URL                 Base RPC (premium recommended)
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { generateAttestation, toMetalInputs } from "@/lib/reserve-attestation";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const REGISTRY_ABI = [
  "function postAttestation(uint64 asOf, bytes32 reportHash, string reportURI, (bytes32 symbol, uint256 reservesMg, uint256 requiredMg, uint32 backingBps)[] metals) returns (uint256)",
  "function attestationCount() view returns (uint256)",
];

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://vault.auxite.io"
  );
}

async function handle(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }

  const execute = process.env.RESERVE_POST_EXECUTE === "true";
  const address = process.env.RESERVE_ATTESTATION_ADDRESS;
  const key = process.env.RESERVE_ATTESTOR_KEY;

  // Build + sign the report off-chain (works without any chain config).
  const att = await generateAttestation();
  const reportURI = `${baseUrl()}/api/proof-of-reserves/attestation`;
  const metals = toMetalInputs(att.report);

  const plan = {
    asOf: att.report.asOf,
    reportHash: att.reportHash,
    reportURI,
    metals: att.report.metals,
    signed: att.signature !== null,
  };

  if (!execute) {
    return NextResponse.json({
      success: true,
      mode: "dry-run",
      message: "Set RESERVE_POST_EXECUTE=true to commit on-chain.",
      plan,
    });
  }

  if (!address || !key) {
    return NextResponse.json(
      { success: false, error: "missing_config", detail: "RESERVE_ATTESTATION_ADDRESS / RESERVE_ATTESTOR_KEY required to execute." },
      { status: 500 }
    );
  }

  try {
    const provider = new ethers.JsonRpcProvider(
      process.env.BASE_RPC_URL || "https://mainnet.base.org"
    );
    const wallet = new ethers.Wallet(key, provider);
    const reg = new ethers.Contract(address, REGISTRY_ABI, wallet);

    const tx = await reg.postAttestation(
      att.report.asOf,
      att.reportHash,
      reportURI,
      metals
    );
    const receipt = await tx.wait();

    const record = {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      asOf: att.report.asOf,
      reportHash: att.reportHash,
      postedAt: Date.now(),
    };
    await redis.set("reserve:attestation:last", JSON.stringify(record));

    return NextResponse.json({ success: true, mode: "executed", ...record, plan });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "post_failed", message: e?.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
