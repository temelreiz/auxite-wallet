// /api/cron/kyc-pending-blast — hourly TZ-aware KYC reminder. Each pending-KYC
// user receives the localized push when their *local* clock hits TARGET_HOUR
// (default 17:00 local). Timezone is resolved from the user's country,
// phone E.164 prefix, or language (see lib/timezones.ts). Schedule: 0 * * * *
// (every hour at minute 0) via vercel.json. Auth: CRON_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { runKycPendingBlast } from "@/lib/kyc-pending-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const TARGET_LOCAL_HOUR = parseInt(process.env.KYC_PUSH_LOCAL_HOUR || "17", 10);

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runKycPendingBlast({
    send: true,
    targetLocalHour: TARGET_LOCAL_HOUR,
    cooldownDays: 1, // hourly cron → 1-day cooldown so each user gets one/day
  });
  return NextResponse.json({ success: true, targetLocalHour: TARGET_LOCAL_HOUR, ...result });
}
