// ============================================================================
// GET /api/admin/auxr/events
// ----------------------------------------------------------------------------
// Returns the recent AUXR reserve events (mints, burns, manual adjusts).
// Used by the admin AUXR control panel for real-time ops view.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getRecentReserveEvents } from "@/lib/auxr-reserve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 500);

  try {
    const events = await getRecentReserveEvents(limit);
    return NextResponse.json({ success: true, events, count: events.length });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "fetch_failed" },
      { status: 500 }
    );
  }
}
