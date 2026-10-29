// ============================================
// ITERA RENTAL — trip completion webhook from the car-sharing provider
// The only route through which trip revenue enters the ledger (§3).
// Signature is always enforced; there is no development bypass.
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { getProviderAdapter } from "@/lib/rental/provider";
import { recordTrip } from "@/lib/rental/trip-ledger";

export async function POST(request: NextRequest) {
  const adapter = getProviderAdapter();
  const rawBody = await request.text();

  if (!adapter.verify(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = adapter.parseTrip(rawBody, Date.now());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const result = await recordTrip(parsed.trip);
    if (!result.ok) {
      // 422 so the provider does not retry a payload that will never be valid.
      return NextResponse.json({ error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true, tripId: result.trip.tripId, duplicate: result.duplicate });
  } catch (error) {
    console.error("Rental trip webhook error:", error);
    // 500 lets the provider retry; recording is idempotent on tripId.
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
