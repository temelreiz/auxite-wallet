// src/app/api/admin/marketing-leads/route.ts
// Admin access to opt-in marketing leads captured by the support widget.
//
// GET              → newest-first leads (with consent status/proof)
// GET ?consented=1 → only leads with explicit marketing consent
// DELETE ?email=   → erase one lead (GDPR / unsubscribe request)

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listLeads, deleteLead } from "@/lib/marketing-lead";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  const url = new URL(req.url);
  const consentedOnly = url.searchParams.get("consented") === "1";
  const limit = parseInt(url.searchParams.get("limit") || "200", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);

  const { items, total } = await listLeads({ limit, offset, consentedOnly });
  const consentedCount = items.filter((l) => l.marketingConsent).length;
  return NextResponse.json({ items, total, consentedCount, consentedOnly });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  await deleteLead(email);
  return NextResponse.json({ ok: true });
}
