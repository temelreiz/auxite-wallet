// src/app/api/admin/wise/setup/route.ts
//
// One-time setup for Wise webhook subscription.
//
//   GET  → introspect: list profiles, balances, existing subscriptions
//   POST → subscribe profile to "account-details-payment#state-change"
//          delivering to /api/wise/webhook
//   DELETE { subscriptionId } → unsubscribe
//
// Run this manually after WISE_API_TOKEN is configured in env. Idempotent
// in the sense that calling POST twice creates two subscriptions — list
// first to confirm none exists.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  listProfiles,
  getBusinessProfile,
  listProfileSubscriptions,
  createIncomingPaymentSubscription,
  deleteSubscription,
  getProfileBalances,
} from "@/lib/wise";

export const dynamic = "force-dynamic";

function publicWebhookUrl(req: NextRequest): string {
  // Prefer explicit env (production canonical URL); fall back to request host
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return `${envUrl.replace(/\/$/, "")}/api/wise/webhook`;
  const host = req.headers.get("host") || "vault.auxite.io";
  return `https://${host}/api/wise/webhook`;
}

// ── GET: introspection ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const profiles = await listProfiles();
    const biz = profiles.find((p) => p.type === "BUSINESS") || profiles[0];

    let balances: any = null;
    let subscriptions: any[] = [];
    if (biz) {
      try { balances = await getProfileBalances(biz.id); } catch (e) { balances = { error: String(e) }; }
      try { subscriptions = await listProfileSubscriptions(biz.id); } catch (e) { subscriptions = [{ error: String(e) }]; }
    }

    return NextResponse.json({
      success: true,
      webhookUrl: publicWebhookUrl(req),
      profiles,
      businessProfile: biz,
      balances,
      subscriptions,
    });
  } catch (err: any) {
    console.error("[wise/setup] GET error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// ── POST: subscribe ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const biz = await getBusinessProfile();
    const url = publicWebhookUrl(req);

    // Refuse to create duplicate if one already targets the same URL
    const existing = await listProfileSubscriptions(biz.id);
    const dup = existing.find(
      (s) =>
        s.trigger_on === "account-details-payment#state-change" &&
        s.delivery?.url === url
    );
    if (dup) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        subscription: dup,
        webhookUrl: url,
      });
    }

    const subscription = await createIncomingPaymentSubscription(biz.id, url);
    return NextResponse.json({ success: true, subscription, webhookUrl: url });
  } catch (err: any) {
    console.error("[wise/setup] POST error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// ── DELETE: unsubscribe ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));
    const subscriptionId = body.subscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: "subscriptionId required" }, { status: 400 });
    }
    const biz = await getBusinessProfile();
    await deleteSubscription(biz.id, subscriptionId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[wise/setup] DELETE error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
