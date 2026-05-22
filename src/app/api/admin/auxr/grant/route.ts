// ============================================================================
// POST /api/admin/auxr/grant
// ----------------------------------------------------------------------------
// Admin-only AUXR grant — used during internal beta to seed a known user's
// AUXR balance with a fixed amount, without going through the buy flow
// (no AUXM debit required, no quote, no spread).
//
// Mints AUXR to user + records reserve mint (so backing accounting stays
// consistent — the grant ALSO requires us to acknowledge basket grams).
//
// Body:
//   address: user wallet address
//   unitsAUXR: amount to grant
//   reason: required audit string (e.g. "Internal beta — Cohort 1 seed")
//
// Use case: 5-20 verified test users get $50-200 worth of AUXR each before
// public launch. They sell back over the next few days to validate the
// burn path and reserve releases.
//
// IMPORTANT: this DOES propagate to treasury exposure (it's a real
// allocation of metal to AUXR, same as a real buy). The only thing it
// skips is the AUXM payment — treat it as ops topping up the customer.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { getRedis, addTransaction } from "@/lib/redis";
import { recordMint } from "@/lib/auxr-reserve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  address: z.string().min(10),
  unitsAUXR: z.number().positive().max(1000), // hard cap as a safety rail
  reason: z.string().min(4).max(500),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  const { address, unitsAUXR, reason } = body;
  const normalizedAddress = address.toLowerCase();
  const refId = `grant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Credit AUXR to user.
  const balanceKey = `user:${normalizedAddress}:balance`;
  await getRedis().hincrbyfloat(balanceKey, "auxr", unitsAUXR);

  // Update reserves + propagate. If this fails, log loudly — the user has
  // a balance that's not backed and we need ops to fix it.
  try {
    await recordMint({
      unitsAUXR,
      refId,
      walletAddress: normalizedAddress,
      reason: `[grant by ${auth.address}] ${reason}`,
    });
  } catch (e) {
    console.error("[/api/admin/auxr/grant] CRITICAL reserve mint failed:", e);
    return NextResponse.json(
      {
        success: false,
        error: "balance_credited_but_reserve_failed",
        action: "manual reconciliation required",
      },
      { status: 500 }
    );
  }

  // Transaction record so it's visible in the user's history.
  const txId = await addTransaction(normalizedAddress, {
    type: "deposit",
    token: "AUXR",
    amount: unitsAUXR,
    status: "completed",
    metadata: {
      grant: true,
      operator: auth.address,
      reason,
      refId,
    },
  });

  return NextResponse.json({
    success: true,
    txId,
    address: normalizedAddress,
    unitsAUXR,
    refId,
  });
}
