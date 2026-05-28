// /api/cron/kyc-pending-blast — daily localized KYC reminder to ALL pending-KYC
// users. Scheduled 14:00 UTC (= 17:00 Europe/Istanbul) via vercel.json.
// Auth: CRON_SECRET (Vercel cron sends Authorization: Bearer <CRON_SECRET>).
// Always sends (3-day per-user cooldown in the lib prevents spam).

import { NextRequest, NextResponse } from "next/server";
import { runKycPendingBlast } from "@/lib/kyc-pending-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runKycPendingBlast({ send: true });
  return NextResponse.json({ success: true, ...result });
}
