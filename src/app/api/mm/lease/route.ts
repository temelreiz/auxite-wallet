// ============================================================================
// POST /api/mm/lease — leader lease for the AUXR market maker nodes.
//
// Body: { venue, holder, action: "acquire" | "release" }
// Auth: Authorization: Bearer <MM_LEASE_SECRET>
//
// "acquire" takes a free lease or renews one the caller already holds and
// answers who holds it. See src/lib/mm-lease.ts for why this exists.
// Unconfigured (no MM_LEASE_SECRET) → 503, so nothing is open by default.
// ============================================================================

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { acquireOrRenew, release, MM_LEASE_TTL_MS } from "@/lib/mm-lease";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NAME = /^[a-z0-9][a-z0-9._-]{0,47}$/;

function authorized(req: NextRequest, secret: string): boolean {
  const got = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.MM_LEASE_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ ok: false, error: "lease not configured" }, { status: 503 });
  }
  if (!authorized(req, secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad json" }, { status: 400 });
  }
  const { venue, holder, action } = body ?? {};
  if (!NAME.test(String(venue)) || !NAME.test(String(holder)) || !["acquire", "release"].includes(action)) {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  try {
    if (action === "release") {
      const released = await release(venue, holder);
      return NextResponse.json({ ok: true, released });
    }
    const r = await acquireOrRenew(venue, holder);
    return NextResponse.json({ ok: true, ...r, leaseTtlMs: MM_LEASE_TTL_MS, serverTime: Date.now() });
  } catch (e: any) {
    console.error("[mm/lease]", e);
    // The caller treats any failure as "not renewed" and fences itself.
    return NextResponse.json({ ok: false, error: "lease store unavailable" }, { status: 503 });
  }
}
