// src/app/api/admin/auxr/mint-control/route.ts
//
// Operator control over AUXR issuance: read the current limits and usage, and
// stop issuance outright.
//
// The kill switch exists in auxr-mint-limits.ts, but a switch only reachable
// by someone with a Redis console is not a switch you reach for at 00:20 on a
// Saturday. Revoking MINTER_ROLE from the Safe is the heavier, permanent
// answer; this is the one that takes a second and is reversible.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/require-user";
import {
  haltMinting,
  resumeMinting,
  mintingStatus,
} from "@/lib/auxr-mint-limits";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;
  return NextResponse.json({ success: true, ...(await mintingStatus()) });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const { action, reason } = await request.json().catch(() => ({}) as any);

  if (action === "halt") {
    await haltMinting(String(reason || "halted by operator"));
    return NextResponse.json({ success: true, ...(await mintingStatus()) });
  }

  if (action === "resume") {
    await resumeMinting();
    return NextResponse.json({ success: true, ...(await mintingStatus()) });
  }

  return NextResponse.json(
    { success: false, error: "action must be 'halt' or 'resume'" },
    { status: 400 },
  );
}
