// ============================================================================
// /api/cron/rwa-nav-push — push AUXG NAV to the rwa.xyz ingestion API.
//
// rwa.xyz lists AUXG as a Dynamic-NAV asset and won't finalize the listing
// until NAV data is fed via their ingestion API. This cron sends today's
// NAV once per day.
//
//   PUT https://ingestion-api.rwa.xyz/v1/assets/metrics/{YYYY-MM-DD}
//   Authorization: Bearer <RWA_NAV_API_KEY>
//   body: [{ id, metrics: { net_asset_value, net_yield_1d_rate } }]
//
// NAV  = spot USD value of 1 AUXG (= 1 gram gold), from the valuation feed
//        (getMetalPrice — spot, no trade spread).
// yield = daily rate derived from the AUXG staking APY (env-configurable).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getMetalPrice } from "@/lib/price-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RWA_INGEST_BASE = "https://ingestion-api.rwa.xyz/v1/assets/metrics";
const RWA_ASSET_ID = "AUXG";

// Headline AUXG staking APY (%) used to express the asset's daily yield rate.
// Override via env if the representative APY changes.
const YIELD_APY_PCT = parseFloat(process.env.RWA_AUXG_YIELD_APY_PCT || "3.5");

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RWA_NAV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RWA_NAV_API_KEY not set" }, { status: 500 });
  }

  try {
    // NAV = spot USD value of 1 AUXG (1 gram gold), no trade spread.
    const nav = await getMetalPrice(RWA_ASSET_ID);
    if (!nav || !(nav > 0)) {
      return NextResponse.json({ error: "NAV unavailable", nav }, { status: 502 });
    }

    const netYield1dRate = YIELD_APY_PCT / 100 / 365;
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

    const body = [
      {
        id: RWA_ASSET_ID,
        metrics: {
          net_asset_value: Number(nav.toFixed(4)),
          net_yield_1d_rate: Number(netYield1dRate.toFixed(8)),
        },
      },
    ];

    const res = await fetch(`${RWA_INGEST_BASE}/${date}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error(`[rwa-nav-push] ${res.status} ${text.slice(0, 300)}`);
      return NextResponse.json(
        { success: false, status: res.status, response: text.slice(0, 500), sent: body },
        { status: 502 }
      );
    }

    console.log(`[rwa-nav-push] sent NAV ${nav} for ${date}`);
    return NextResponse.json({ success: true, date, sent: body, response: text.slice(0, 500) });
  } catch (error: any) {
    console.error("[rwa-nav-push] error:", error?.message || error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
