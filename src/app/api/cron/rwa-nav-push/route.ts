// ============================================================================
// /api/cron/rwa-nav-push — push metal-token NAVs to the rwa.xyz ingestion API.
//
// rwa.xyz lists Auxite metal tokens as Dynamic-NAV assets and won't finalize a
// listing until NAV data is fed via their ingestion API. This cron sends each
// asset's NAV once per day.
//
//   PUT https://ingestion-api.rwa.xyz/v1/assets/metrics/{YYYY-MM-DD}
//   Authorization: Bearer <RWA_NAV_API_KEY>
//   body: [{ id, metrics: { net_asset_value, net_yield_1d_rate } }]
//
// NAV   = spot USD value of 1 token (= 1 gram of the metal), from the valuation
//         feed (getMetalPrice — spot, no trade spread).
// yield = daily rate derived from the metal's staking APY (env-configurable).
//
// Each asset is sent in its own PUT so a not-yet-approved asset can't block the
// others.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getMetalPrice } from "@/lib/price-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RWA_INGEST_BASE = "https://ingestion-api.rwa.xyz/v1/assets/metrics";

// Listed assets to push. Headline staking APY (%) used to express the asset's
// daily yield rate; override per-metal via env.
const ASSETS: { id: string; metal: string; apyPct: number }[] = [
  { id: "AUXG", metal: "AUXG", apyPct: parseFloat(process.env.RWA_AUXG_YIELD_APY_PCT || "3.5") },
  { id: "AUXS", metal: "AUXS", apyPct: parseFloat(process.env.RWA_AUXS_YIELD_APY_PCT || "3.0") },
];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.RWA_NAV_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "RWA_NAV_API_KEY not set" }, { status: 500 });
  }

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const results: any[] = [];

  for (const asset of ASSETS) {
    try {
      const nav = await getMetalPrice(asset.metal); // spot USD/gram, no spread
      if (!nav || !(nav > 0)) {
        results.push({ id: asset.id, ok: false, error: "NAV unavailable", nav });
        continue;
      }

      const body = [
        {
          id: asset.id,
          metrics: {
            net_asset_value: Number(nav.toFixed(4)),
            net_yield_1d_rate: Number((asset.apyPct / 100 / 365).toFixed(8)),
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
      results.push({
        id: asset.id,
        ok: res.ok,
        status: res.status,
        nav: body[0].metrics.net_asset_value,
        response: text.slice(0, 300),
      });
      if (!res.ok) console.error(`[rwa-nav-push] ${asset.id} ${res.status} ${text.slice(0, 200)}`);
      else console.log(`[rwa-nav-push] ${asset.id} NAV ${nav} sent for ${date}`);
    } catch (error: any) {
      results.push({ id: asset.id, ok: false, error: error?.message || String(error) });
      console.error(`[rwa-nav-push] ${asset.id} error:`, error?.message || error);
    }
  }

  const success = results.every((r) => r.ok);
  return NextResponse.json({ success, date, results }, { status: success ? 200 : 207 });
}
