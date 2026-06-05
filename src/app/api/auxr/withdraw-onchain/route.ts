// ============================================================================
// POST /api/auxr/withdraw-onchain
// ----------------------------------------------------------------------------
// Move AUXR from the user's Auxite off-chain ledger balance to a recipient
// address on Base. The off-chain side is debited and the AUXR ERC-20 is
// minted to `destination` on chain.
//
// Pattern mirrors /api/auxr/buy:
//   - Zod-validated body
//   - KYC gate (`kyc:{address}` source of truth)
//   - Idempotency token (`auxr:withdraw:idempotency:{refId}`)
//   - Notifications: Telegram + push + email
//
// Flow is delegated to `auxr-bridge.withdrawToChain()`, which handles the
// atomic off-chain debit, reserve burn, and on-chain mint with state
// tracking and retry recovery.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Address } from "viem";
import { isAddress } from "viem";
import { redis, getUserBalance } from "@/lib/redis";
import { withdrawToChain, getWithdrawRecord } from "@/lib/auxr-bridge";
import { isPaused } from "@/lib/auxr-onchain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Config ────────────────────────────────────────────────────────────────────

/** Smallest withdrawal allowed (gas/UX floor). */
const MIN_WITHDRAW_AUXR = 0.5;

/** Largest single withdrawal — anti-fraud cap, can be raised per-user later. */
const MAX_WITHDRAW_AUXR_DEFAULT = 100_000;

// ── Schema ────────────────────────────────────────────────────────────────────

const BodySchema = z.object({
  address: z.string().min(10),
  destination: z.string().min(10),
  unitsAUXR: z.number().positive(),
  refId: z.string().min(8).max(128),
  reason: z.string().max(280).optional(),
  source: z.string().max(32).optional(),
});

// ── KYC ───────────────────────────────────────────────────────────────────────

const VERIFIED_KYC_STATUSES = new Set(["approved", "verified", "enhanced"]);

async function isKycVerified(walletAddress: string): Promise<boolean> {
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return false;
    const kyc = typeof raw === "string" ? JSON.parse(raw) : raw;
    return VERIFIED_KYC_STATUSES.has(String(kyc?.status || "").toLowerCase());
  } catch {
    return false;
  }
}

// ── Idempotency markers ──────────────────────────────────────────────────────

const IDEMP_KEY = (refId: string) => `auxr:withdraw:idempotency:${refId}`;

async function readIdempotentResult(refId: string): Promise<unknown | null> {
  const raw = await redis.get(IDEMP_KEY(refId));
  if (!raw) return null;
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

async function persistIdempotentResult(refId: string, body: unknown): Promise<void> {
  // 24h TTL — long enough to absorb client retries.
  await redis.set(IDEMP_KEY(refId), JSON.stringify(body), { ex: 24 * 60 * 60 });
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  const { address, destination, unitsAUXR, refId, reason } = body;
  const offChainAddress = address.toLowerCase();

  // 1. Destination validation — must be a valid EVM address (not zero)
  if (!isAddress(destination)) {
    return NextResponse.json(
      { success: false, error: "invalid_destination" },
      { status: 400 }
    );
  }
  if (destination.toLowerCase() === "0x0000000000000000000000000000000000000000") {
    return NextResponse.json(
      { success: false, error: "destination_zero_address" },
      { status: 400 }
    );
  }

  // 2. Amount bounds
  if (unitsAUXR < MIN_WITHDRAW_AUXR) {
    return NextResponse.json(
      { success: false, error: "below_minimum", minAUXR: MIN_WITHDRAW_AUXR },
      { status: 400 }
    );
  }
  if (unitsAUXR > MAX_WITHDRAW_AUXR_DEFAULT) {
    return NextResponse.json(
      {
        success: false,
        error: "above_maximum",
        maxAUXR: MAX_WITHDRAW_AUXR_DEFAULT,
      },
      { status: 400 }
    );
  }

  // 3. KYC
  if (!(await isKycVerified(offChainAddress))) {
    return NextResponse.json(
      { success: false, error: "kyc_required" },
      { status: 403 }
    );
  }

  // 4. Pause guard — short-circuit so we don't debit when on-chain mint would
  //    revert anyway
  try {
    if (await isPaused()) {
      return NextResponse.json(
        { success: false, error: "auxr_paused" },
        { status: 503 }
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: "rpc_unavailable",
        details: String(e?.message || e),
      },
      { status: 503 }
    );
  }

  // 5. Idempotency — if we already returned a result for this refId, replay it
  const replay = await readIdempotentResult(refId);
  if (replay) {
    return NextResponse.json(replay, { status: 200 });
  }

  // 6. Off-chain balance sanity check before delegating
  const balance = await getUserBalance(offChainAddress);
  if (balance.auxr < unitsAUXR - 1e-9) {
    return NextResponse.json(
      {
        success: false,
        error: "insufficient_balance",
        available: balance.auxr,
        requested: unitsAUXR,
      },
      { status: 400 }
    );
  }

  // 7. Bridge execution
  try {
    const record = await withdrawToChain({
      refId,
      walletAddressOffChain: offChainAddress,
      destinationOnChain: destination as Address,
      unitsAUXR,
      reason,
    });

    const responseBody = {
      success: true,
      state: record.state,
      refId: record.refId,
      txHash: record.mintTxHash || null,
      destination: record.destinationOnChain,
      unitsAUXR: record.unitsAUXR,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    // Only persist as idempotent once we reach a terminal success state — if
    // the bridge is stuck mid-flow, retries should be allowed to resume.
    if (record.state === "completed") {
      await persistIdempotentResult(refId, responseBody);
    }

    return NextResponse.json(responseBody, { status: 200 });
  } catch (e: any) {
    const message = String(e?.message || e);
    const status = /insufficient/.test(message)
      ? 400
      : /paused/.test(message)
      ? 503
      : 500;
    // Surface the underlying bridge record so the client can poll status
    const record = await getWithdrawRecord(refId);
    return NextResponse.json(
      {
        success: false,
        error: "withdraw_failed",
        details: message,
        state: record?.state || "unknown",
        refId,
      },
      { status }
    );
  }
}

// ── GET /api/auxr/withdraw-onchain?refId=... — poll status ───────────────────

export async function GET(request: NextRequest) {
  const refId = request.nextUrl.searchParams.get("refId");
  if (!refId) {
    return NextResponse.json(
      { success: false, error: "refId_required" },
      { status: 400 }
    );
  }
  const record = await getWithdrawRecord(refId);
  if (!record) {
    return NextResponse.json(
      { success: false, error: "not_found" },
      { status: 404 }
    );
  }
  return NextResponse.json(
    {
      success: true,
      state: record.state,
      txHash: record.mintTxHash || null,
      unitsAUXR: record.unitsAUXR,
      destination: record.destinationOnChain,
      error: record.error || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    { status: 200 }
  );
}
