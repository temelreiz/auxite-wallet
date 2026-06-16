// GET /api/nav-clearing/book?metal=AUXG
// Live NAV-clearing order book + current NAV for a metal.

import { NextRequest, NextResponse } from "next/server";
import { NAV_CLEARING_ENABLED, getBook } from "@/lib/nav-clearing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!NAV_CLEARING_ENABLED) {
    return NextResponse.json({ error: "NAV clearing not enabled" }, { status: 404 });
  }
  try {
    const metal = new URL(request.url).searchParams.get("metal");
    if (!metal) return NextResponse.json({ error: "metal required" }, { status: 400 });
    const book = await getBook(metal);
    return NextResponse.json({ success: true, metal: metal.toUpperCase(), ...book });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
