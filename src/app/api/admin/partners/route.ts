// src/app/api/admin/partners/route.ts
//
// Admin access to Auxite Partners: partners, orders, certificates, desk stock,
// and the operator actions. Everything is held by the Partners engine, this route
// only checks the admin session and forwards the allowed calls.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/require-user";
import { callPartnersEngine, EngineResponse, PartnersEngineUnavailable } from "@/lib/partners-engine";

export const dynamic = "force-dynamic";

function unavailable(error: unknown) {
  if (!(error instanceof PartnersEngineUnavailable)) throw error;
  console.error("Partners engine unavailable:", error.message);
  return NextResponse.json({ error: "engine_unavailable", message: error.message }, { status: 503 });
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const [overview, orders, certificates, applications, fiatOrders] = await Promise.all([
      callPartnersEngine("/admin/overview"),
      callPartnersEngine("/admin/orders?limit=100"),
      callPartnersEngine("/admin/certificates?limit=50"),
      callPartnersEngine("/admin/applications"),
      callPartnersEngine("/admin/fiat-orders"),
    ]);
    const failed = [overview, orders, certificates, applications, fiatOrders].find((r) => r.status !== 200);
    if (failed) return NextResponse.json(failed.body, { status: failed.status });
    return NextResponse.json({ overview: overview.body, orders: orders.body, certificates: certificates.body, applications: applications.body, fiatOrders: fiatOrders.body });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const partner = encodeURIComponent(String(body.partnerId ?? ""));

  try {
    let result: EngineResponse;
    switch (body.action) {
      case "halt":
        result = await callPartnersEngine(`/admin/partners/${partner}/halt`, { method: "POST", body: { halted: true } });
        break;
      case "resume":
        result = await callPartnersEngine(`/admin/partners/${partner}/halt`, { method: "POST", body: { halted: false } });
        break;
      case "spread":
        result = await callPartnersEngine(`/admin/partners/${partner}/spread`, { method: "POST", body: { spreadBps: body.spreadBps } });
        break;
      case "approve":
        result = await callPartnersEngine(`/admin/applications/${encodeURIComponent(String(body.wallet ?? ""))}/approve`, { method: "POST", body: {} });
        break;
      case "reject":
        result = await callPartnersEngine(`/admin/applications/${encodeURIComponent(String(body.wallet ?? ""))}/reject`, { method: "POST", body: { note: body.note } });
        break;
      case "fiat-confirm":
        result = await callPartnersEngine(`/admin/fiat-orders/${encodeURIComponent(String(body.reference ?? ""))}/confirm`, {
          method: "POST",
          body: { amountTry: body.amountTry, bankReference: body.bankReference },
        });
        break;
      case "fiat-retry":
        result = await callPartnersEngine(`/admin/fiat-orders/${encodeURIComponent(String(body.reference ?? ""))}/retry`, { method: "POST", body: {} });
        break;
      case "fiat-cancel":
        result = await callPartnersEngine(`/admin/fiat-orders/${encodeURIComponent(String(body.reference ?? ""))}/cancel`, { method: "POST", body: {} });
        break;
      case "add":
        result = await callPartnersEngine("/admin/partners", {
          method: "POST",
          body: { id: body.id, wallet: body.wallet, brand: body.brand, spreadBps: body.spreadBps },
        });
        break;
      default:
        return NextResponse.json({ error: "invalid_action" }, { status: 400 });
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return unavailable(error);
  }
}
