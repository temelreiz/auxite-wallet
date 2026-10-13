// src/app/api/cron/auxr-mint-requests/route.ts
//
// Settles large AUXR withdrawals that are waiting on the Safe.
//
// Two jobs:
//   1. mark a request completed once the Safe's mint has landed on chain
//   2. refund anything nobody signed before it expired
//
// Settlement is read from the chain rather than from an operator telling us it
// happened. The operator has just signed in the Safe and knows the hash, but a
// request marked complete on trust and a request refunded on a timer are the
// same customer being paid twice if the two ever disagree.
//
// Design note: docs/security/auxr-large-mint-approval.md

import { NextRequest, NextResponse } from "next/server";
import {
  listOpenRequests,
  isSettledOnChain,
  completeMintRequest,
  expireStaleRequests,
} from "@/lib/auxr-mint-requests";
import { notifyValueMovement } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron");
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!cronHeader && token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const settled: string[] = [];

  for (const req of await listOpenRequests()) {
    if (req.state !== "awaiting_safe") continue;
    if (!(await isSettledOnChain(req))) continue;

    await completeMintRequest(req.refId, req.txHash || "observed-on-chain");
    settled.push(req.refId);

    await notifyValueMovement({
      kind: "withdraw",
      fromAddress: req.address,
      toAddress: req.destination,
      token: "AUXR",
      amount: req.unitsAUXR,
      detail: `Safe ortak imzasi tamamlandi (${req.refId})`,
    }).catch(() => {});
  }

  // Expiry runs after settlement so a request that landed in the same window
  // is completed rather than refunded.
  const { expired, refunded } = await expireStaleRequests();

  if (expired > 0) {
    await notifyValueMovement({
      kind: "withdraw",
      fromAddress: "system",
      token: "AUXR",
      amount: refunded,
      detail: `${expired} imzalanmayan cekim suresi doldu, bakiyeler iade edildi`,
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    settled: settled.length,
    settledRefIds: settled,
    expired,
    refundedAUXR: refunded,
  });
}
