// /api/cron/kyc-pending-email-blast — hourly TZ-aware KYC reminder EMAIL.
// Fires 1 hour after the push (push at local 17:00 → email at local 18:00) so
// the email is a follow-up nudge, not a duplicate of the push. Schedule:
// 0 * * * * via vercel.json. Auth: CRON_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { runKycPendingEmailBlast } from "@/lib/kyc-pending-email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const TARGET_LOCAL_HOUR = parseInt(process.env.KYC_EMAIL_LOCAL_HOUR || "18", 10);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runKycPendingEmailBlast({
    send: true,
    targetLocalHour: TARGET_LOCAL_HOUR,
    cooldownDays: 1,
  });
  return NextResponse.json({ success: true, targetLocalHour: TARGET_LOCAL_HOUR, ...result });
}
