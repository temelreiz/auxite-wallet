// ============================================================================
// POST /api/admin/auxr/mint-onchain
// ----------------------------------------------------------------------------
// Admin-only: mint REAL AUXR on-chain (Base) to any wallet address.
//
// This is distinct from /api/admin/auxr/grant, which only credits the
// off-chain Auxite ledger (`user:{addr}:balance`) for in-app beta users and
// never touches the chain. THIS route signs an actual mint() transaction with
// the MINTER_ROLE key, so the tokens land in the recipient's on-chain wallet
// (e.g. their MetaMask) and are transferable/withdrawable like any ERC-20.
//
// Backing accounting (supply + reserve grams) is booked AFTER the mint
// confirms, so a failed mint never leaves phantom supply on the books.
//
// Requires env: AUXR_MINTER_PRIVATE_KEY (holds MINTER_ROLE on the contract),
// AUXR_CONTRACT_ADDRESS (or the mainnet fallback in auxr-onchain.ts).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isAddress, type Address } from "viem";
import { requireAdmin } from "@/lib/admin-auth";
import { recordMint } from "@/lib/auxr-reserve";
import {
  mintOnChain,
  isPaused,
  auxrToWei,
  AUXR_CHAIN,
} from "@/lib/auxr-onchain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ZERO = "0x0000000000000000000000000000000000000000";

// Safety rail for on-chain admin mints. The founder allocation was ~23k, so
// the ceiling sits just above that while still blocking fat-finger disasters.
// Raise deliberately in code if a larger single mint is ever needed.
const MAX_MINT_AUXR = 25_000;

const BodySchema = z.object({
  destination: z.string().min(10),
  unitsAUXR: z.number().positive().max(MAX_MINT_AUXR),
  reason: z.string().min(4).max(500),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  const { destination, unitsAUXR, reason } = body;

  // 1. Destination must be a real, non-zero EVM address.
  if (!isAddress(destination) || destination.toLowerCase() === ZERO) {
    return NextResponse.json(
      { success: false, error: "invalid_destination" },
      { status: 400 }
    );
  }

  // 2. Pause guard — don't attempt a mint the contract would revert anyway.
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

  const refId = `admin-mint-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  // 3. On-chain mint — the irreversible anchor. If this throws (missing minter
  //    key, missing MINTER_ROLE, RPC error), nothing has been booked yet so we
  //    fail clean with the underlying reason surfaced to the operator.
  let txHash: string;
  try {
    txHash = await mintOnChain({
      to: destination as Address,
      amount: auxrToWei(unitsAUXR),
      refId,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "mint_failed", details: String(e?.message || e) },
      { status: 500 }
    );
  }

  // 4. Book reserve/backing AFTER the mint confirms. The tokens already exist
  //    on-chain at this point, so a booking failure must be surfaced loudly for
  //    manual reconciliation rather than silently swallowed.
  try {
    await recordMint({
      unitsAUXR,
      refId,
      walletAddress: destination.toLowerCase(),
      reason: `[on-chain mint by ${auth.address}] ${reason}`,
    });
  } catch (e) {
    console.error(
      "[/api/admin/auxr/mint-onchain] CRITICAL: minted on-chain but reserve booking failed:",
      e
    );
    return NextResponse.json(
      {
        success: false,
        error: "minted_onchain_but_reserve_failed",
        action: "manual reserve reconciliation required",
        txHash,
        refId,
      },
      { status: 500 }
    );
  }

  const explorerBase =
    (AUXR_CHAIN as any)?.blockExplorers?.default?.url || "https://basescan.org";

  return NextResponse.json({
    success: true,
    txHash,
    explorerUrl: `${explorerBase}/tx/${txHash}`,
    destination: destination.toLowerCase(),
    unitsAUXR,
    refId,
  });
}
