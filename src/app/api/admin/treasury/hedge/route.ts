// ============================================================================
// ADMIN: HEDGE SIGNALS DASHBOARD + MANUAL ACTIONS
// ----------------------------------------------------------------------------
// GET  /api/admin/treasury/hedge
//   → full hedge snapshot: exposure, target/current/gap, positions, signals
//
// POST /api/admin/treasury/hedge
//   body:
//     { action: "generate" }
//        → force-run signal generation now (independent of cron)
//
//     { action: "approve", signalId, by }
//        → move signal from pending → approved
//
//     { action: "dismiss", signalId, by, note? }
//        → move signal from pending|approved → dismissed
//
//     { action: "fill", signalId, by, filledQty, filledPriceUsdPerOz, note? }
//        → record a manual fill from Abaxx terminal:
//          - mutates the position state
//          - signal status → filled
//
// All actions admin-auth gated.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  generateHedgeSignals,
  getHedgeSnapshot,
  approveSignal,
  dismissSignal,
  recordManualFill,
} from "@/lib/abaxx-hedge-signals";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const snapshot = await getHedgeSnapshot();
    return NextResponse.json({
      success: true,
      ...snapshot,
      computedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[admin/treasury/hedge GET]", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const action = String(body?.action || "").toLowerCase();
    const adminAddress = auth.address || "admin";

    switch (action) {
      case "generate": {
        const signals = await generateHedgeSignals();
        return NextResponse.json({ success: true, emitted: signals.length, signals });
      }

      case "approve": {
        const { signalId } = body;
        if (!signalId) return NextResponse.json({ error: "signalId required" }, { status: 400 });
        const updated = await approveSignal(signalId, body.by || adminAddress);
        if (!updated) return NextResponse.json({ error: "signal not found in pending" }, { status: 404 });
        return NextResponse.json({ success: true, signal: updated });
      }

      case "dismiss": {
        const { signalId, note } = body;
        if (!signalId) return NextResponse.json({ error: "signalId required" }, { status: 400 });
        const updated = await dismissSignal(signalId, body.by || adminAddress, note);
        if (!updated) return NextResponse.json({ error: "signal not found" }, { status: 404 });
        return NextResponse.json({ success: true, signal: updated });
      }

      case "fill": {
        const { signalId, filledQty, filledPriceUsdPerOz, note } = body;
        if (!signalId) return NextResponse.json({ error: "signalId required" }, { status: 400 });
        const qty = parseFloat(String(filledQty));
        const price = parseFloat(String(filledPriceUsdPerOz));
        if (!(qty > 0)) return NextResponse.json({ error: "filledQty must be > 0" }, { status: 400 });
        if (!(price > 0)) return NextResponse.json({ error: "filledPriceUsdPerOz must be > 0" }, { status: 400 });
        const updated = await recordManualFill({
          signalId,
          filledBy: body.by || adminAddress,
          filledQty: qty,
          filledPriceUsdPerOz: price,
          note,
        });
        if (!updated) return NextResponse.json({ error: "approved signal not found" }, { status: 404 });
        return NextResponse.json({ success: true, signal: updated });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[admin/treasury/hedge POST]", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal error" },
      { status: 500 },
    );
  }
}
