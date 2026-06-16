// POST /api/nav-clearing/order
// Place a NAV-clearing sell (grams) or buy (AUXM) order; escrows funds and runs
// a clearing pass. Off-chain ledger venue — gated by NAV_CLEARING_ENABLED.

import { NextRequest, NextResponse } from "next/server";
import { NAV_CLEARING_ENABLED, placeOrder } from "@/lib/nav-clearing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!NAV_CLEARING_ENABLED) {
    return NextResponse.json({ error: "NAV clearing not enabled" }, { status: 404 });
  }
  try {
    const { address, side, metal, amount } = await request.json();
    if (!address || (side !== "buy" && side !== "sell") || !metal || !(Number(amount) > 0)) {
      return NextResponse.json({ error: "address, side (buy|sell), metal, amount required" }, { status: 400 });
    }
    const result = await placeOrder(side, String(metal), Number(amount), String(address));
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = msg === "kyc_required" ? 403 : msg.startsWith("insufficient") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
