// ============================================================================
// /api/admin/auxr/backing-statement
// ----------------------------------------------------------------------------
// GET  → current holdings statement, recent history and the backing report.
// POST → record a new statement (grams per metal held for AUXR, as-of date and
//        an internal reference), copied from bank / broker statements.
//
// The statement is the only source of "held" figures on /api/auxr/reserves.
// Reference and note stay internal; the public endpoint shows grams and date.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getBackingReport,
  getBackingStatement,
  getBackingStatementHistory,
  saveBackingStatement,
} from "@/lib/auxr-backing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const grams = z.number().finite().min(0);
const BodySchema = z.object({
  grams: z.object({ gold: grams, silver: grams, platinum: grams, palladium: grams }),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "asOf must be YYYY-MM-DD"),
  reference: z.string().trim().min(3).max(200),
  note: z.string().trim().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const [statement, history, report] = await Promise.all([
      getBackingStatement(),
      getBackingStatementHistory(20),
      getBackingReport().catch(() => null),
    ]);
    return NextResponse.json({ success: true, statement, history, report });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "fetch_failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  try {
    const statement = {
      grams: body.grams,
      asOf: Date.parse(`${body.asOf}T00:00:00Z`),
      reference: body.reference,
      note: body.note,
      enteredBy: auth.address || "admin",
      enteredAt: Date.now(),
    };
    await saveBackingStatement(statement);
    return NextResponse.json({ success: true, statement });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "save_failed" }, { status: 400 });
  }
}
