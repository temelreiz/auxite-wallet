// ============================================================================
// CRON: HEDGE SIGNAL GENERATOR
// ----------------------------------------------------------------------------
// Runs every 5 minutes via Vercel cron. Reads treasury exposure + Abaxx
// futures cache → emits hedge signals to pending queue. Ops/manual flow
// approves and executes on Abaxx terminal, then records fills via the admin
// endpoint.
//
// Authorization: Vercel cron header OR Bearer CRON_SECRET (manual trigger).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { isCronRequest } from "@/lib/security/require-user";
import { generateHedgeSignals } from "@/lib/abaxx-hedge-signals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const signals = await generateHedgeSignals();
    return NextResponse.json({
      success: true,
      emitted: signals.length,
      signals,
      ranAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[cron/hedge-signal] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
  }
}
