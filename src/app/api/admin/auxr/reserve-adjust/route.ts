// ============================================================================
// POST /api/admin/auxr/reserve-adjust
// ----------------------------------------------------------------------------
// Admin-only manual reserve adjustment. Used after physical bullion arrives
// at the custody vault and we need to add it to the AUXR backing pool, or
// when reconciling small drift after audit.
//
// Body:
//   metal:       'gold' | 'silver' | 'platinum' | 'palladium'
//   deltaGrams:  positive (top-up) or negative (release back to free pool)
//   reason:      required string for audit trail
//
// Does NOT change AUXR supply — only the reserve side. Use this when:
//   - LBMA bar delivered and allocated to AUXR pool
//   - Reconciler found drift and ops decided to settle by adjusting reserves
//   - Pre-funding the basket ahead of public launch
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { recordManualAdjust } from "@/lib/auxr-reserve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  metal: z.enum(["gold", "silver", "platinum", "palladium"]),
  deltaGrams: z.number().refine((n) => Number.isFinite(n) && n !== 0, {
    message: "deltaGrams must be a non-zero finite number",
  }),
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

  try {
    const event = await recordManualAdjust({
      metal: body.metal,
      deltaGrams: body.deltaGrams,
      reason: body.reason,
      operator: auth.address,
    });

    return NextResponse.json({ success: true, event });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "adjust_failed" },
      { status: 500 }
    );
  }
}
