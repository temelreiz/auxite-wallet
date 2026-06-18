// src/app/api/cron/bridge-offramp-sweep/route.ts
//
// Threshold-based Bridge off-ramp sweep. For each configured (chain, currency)
// target, if the treasury stablecoin balance is at/above BRIDGE_SWEEP_MIN_USD,
// forward it to the matching Bridge liquidation address. Bridge converts to USD
// and wires it to our Wise USD account.
//
// Triggered by Vercel cron. Safe to retry — autoSweepAll() holds a short Redis
// lock to prevent overlapping runs, and a confirmed sweep drops the balance so
// the next run won't re-send. Opt out at runtime by setting
// `bridge:offramp:enabled` = "false" in Redis.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { autoSweepAll } from "@/lib/bridge-offramp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const enabled = await getRedis().get("bridge:offramp:enabled");
    if (enabled === "false") {
      return NextResponse.json({ success: true, skipped: "bridge offramp disabled (bridge:offramp:enabled=false)" });
    }

    const report = await autoSweepAll();
    return NextResponse.json({ success: true, ts: Date.now(), ...report });
  } catch (err: any) {
    console.error("[cron/bridge-offramp-sweep] error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
