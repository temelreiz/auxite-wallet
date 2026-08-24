// src/app/api/admin/marketing-send/route.ts
// Send a marketing email to consented support-widget leads.
//
// GET  → { recipientCount, log } for the compose screen
// POST → { subject, html, mode: "test"|"live", testEmail? } sends the campaign
//
// Consent + unsubscribe enforcement lives in marketing-campaign.ts.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  sendMarketingCampaign,
  getConsentedRecipients,
  listCampaignLog,
} from "@/lib/marketing-campaign";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  const [recipients, log] = await Promise.all([getConsentedRecipients(), listCampaignLog(20)]);
  return NextResponse.json({ recipientCount: recipients.length, log });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subject = typeof body?.subject === "string" ? body.subject : "";
  const html = typeof body?.html === "string" ? body.html : "";
  const mode = body?.mode === "live" ? "live" : "test";
  const testEmail = typeof body?.testEmail === "string" ? body.testEmail : undefined;

  if (!subject.trim() || !html.trim()) {
    return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
  }

  try {
    const result = await sendMarketingCampaign({
      subject,
      html,
      mode,
      testEmail,
      sentBy: auth.address,
    });
    return NextResponse.json({ ok: true, mode, result });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error)?.message || "Send failed" },
      { status: 500 },
    );
  }
}
