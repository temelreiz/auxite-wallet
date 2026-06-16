// POST /api/nav-clearing/cancel
// Cancel an open/partial NAV-clearing order; refunds remaining escrow.

import { NextRequest, NextResponse } from "next/server";
import { NAV_CLEARING_ENABLED, cancelOrder } from "@/lib/nav-clearing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!NAV_CLEARING_ENABLED) {
    return NextResponse.json({ error: "NAV clearing not enabled" }, { status: 404 });
  }
  try {
    const { address, orderId } = await request.json();
    if (!address || !orderId) {
      return NextResponse.json({ error: "address and orderId required" }, { status: 400 });
    }
    await cancelOrder(String(orderId), String(address));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = msg === "not your order" ? 403 : msg.includes("not") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
