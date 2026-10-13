// src/app/api/admin/auxr/mint-requests/route.ts
//
// Operator triage for large AUXR withdrawals awaiting Safe co-signature.
//
// Triage is not approval to mint. Clearing a request here only moves it to
// `awaiting_safe`; the tokens still require two of the Safe's three owners to
// sign, and no key in this process can do that. The step exists so obvious
// rejections never reach the Safe and so there is a record of who looked.
//
// Design note: docs/security/auxr-large-mint-approval.md

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/require-user";
import {
  listOpenRequests,
  getMintRequest,
  decideMintRequest,
  COSIGN_THRESHOLD,
  HARD_CEILING,
  EXPIRY_HOURS,
} from "@/lib/auxr-mint-requests";

export const dynamic = "force-dynamic";

const SAFE = "0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070";
const AUXR = "0xB145B8e9C02193d55454f534f917Cabe704FA042";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const refId = request.nextUrl.searchParams.get("refId");
  if (refId) {
    const req = await getMintRequest(refId);
    return req
      ? NextResponse.json({ success: true, request: req })
      : NextResponse.json({ success: false, error: "not_found" }, { status: 404 });
  }

  const open = await listOpenRequests();
  return NextResponse.json({
    success: true,
    open,
    counts: {
      pendingTriage: open.filter((r) => r.state === "pending_triage").length,
      awaitingSafe: open.filter((r) => r.state === "awaiting_safe").length,
    },
    policy: {
      coSignThreshold: COSIGN_THRESHOLD,
      hardCeiling: HARD_CEILING,
      expiryHours: EXPIRY_HOURS,
      safe: SAFE,
      token: AUXR,
    },
    // What an approved request needs from the Safe, so the operator does not
    // have to reconstruct the call by hand.
    safeCallTemplate: {
      to: AUXR,
      method: "mint(address,uint256)",
      note: "amount is in wei — multiply unitsAUXR by 1e18",
    },
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { refId, decision, note } = await request.json().catch(() => ({}) as any);
  if (!refId || (decision !== "approve" && decision !== "reject")) {
    return NextResponse.json(
      { success: false, error: "refId and decision ('approve' | 'reject') are required" },
      { status: 400 },
    );
  }

  const result = await decideMintRequest(
    refId,
    decision,
    `admin:${admin.user.token.slice(0, 8)}`,
    note,
  );
  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    request: result.request,
    ...(decision === "approve"
      ? {
          next: `Create a Safe transaction from ${SAFE}: ${AUXR}.mint(${result.request!.destination}, ${result.request!.unitsAUXR} * 1e18). Two of three owners must sign.`,
        }
      : { next: "AUXR refunded to the customer's balance." }),
  });
}
