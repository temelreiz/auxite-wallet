// ============================================================================
// /api/cron/rwa-nav-push — push metal-token NAVs + yields to rwa.xyz.
//
// rwa.xyz lists Auxite metal tokens as Dynamic-NAV assets and won't finalize a
// listing until NAV data is fed via their ingestion API. This cron sends each
// asset's NAV + daily yield once per day.
//
//   PUT https://ingestion-api.rwa.xyz/v1/assets/metrics/{YYYY-MM-DD}
//   Authorization: Bearer <RWA_NAV_API_KEY>
//   body: [{ id, metrics: { net_asset_value, net_yield_1d_rate } }]
//
// NAV   = spot USD value of 1 token (= 1 gram of the metal) from getMetalPrice.
// yield = the SAME live lease/staking APY shown on /stake — pulled from
//         /api/lease-rates (yield-builder → Abaxx → SOFR-GOFO), NOT hardcoded.
//         net_yield_1d_rate = (metal's chosen-tenor APY %) / 100 / 365.
//
// Each asset is sent in its own PUT so a not-yet-approved asset can't block the
// others.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getMetalPrice } from "@/lib/price-cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const RWA_INGEST_BASE = "https://ingestion-api.rwa.xyz/v1/assets/metrics";

// Tenor of the lease-rate APY used as the headline annual yield (3m/6m/12m).
const YIELD_TENOR = process.env.RWA_NAV_YIELD_TENOR || "12m";

// Listed assets. `leaseKey` maps to /api/lease-rates metal keys; `fallbackApy`
// is used only if the live rate feed is unavailable.
const ASSETS: { id: string; metal: string; leaseKey: string; fallbackApy: number }[] = [
  { id: "AUXG", metal: "AUXG", leaseKey: "gold", fallbackApy: 2.53 },
  { id: "AUXS", metal: "AUXS", leaseKey: "silver", fallbackApy: 2.23 },
  { id: "AUXPT", metal: "AUXPT", leaseKey: "platinum", fallbackApy: 3.03 },
];

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://vault.auxite.io"
  ).replace(/\/$/, "");
}

// Live lease/staking APY per metal (same numbers as the /stake page).
async function fetchLeaseRates(): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(`${baseUrl()}/api/lease-rates`, { cache: "no-store" });
    const json = await res.json();
    return json?.rates || null;
  } catch {
    return null;
  }
}

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
  const rates = await fetchLeaseRates();
  const results: any[] = [];

  for (const asset of ASSETS) {
    try {
      const nav = await getMetalPrice(asset.metal); // spot USD/gram, no spread
      if (!nav || !(nav > 0)) {
        results.push({ id: asset.id, ok: false, error: "NAV unavailable", nav });
        continue;
      }

      const apyPct = Number(rates?.[asset.leaseKey]?.[YIELD_TENOR]) || asset.fallbackApy;

      const body = [
        {
          id: asset.id,
          metrics: {
            net_asset_value: Number(nav.toFixed(4)),
            net_yield_1d_rate: Number((apyPct / 100 / 365).toFixed(8)),
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
        apyPct,
        response: text.slice(0, 300),
      });
      if (!res.ok) console.error(`[rwa-nav-push] ${asset.id} ${res.status} ${text.slice(0, 200)}`);
      else console.log(`[rwa-nav-push] ${asset.id} NAV ${nav} APY ${apyPct}% sent for ${date}`);
    } catch (error: any) {
      results.push({ id: asset.id, ok: false, error: error?.message || String(error) });
      console.error(`[rwa-nav-push] ${asset.id} error:`, error?.message || error);
    }
  }

  const success = results.every((r) => r.ok);
  return NextResponse.json({ success, date, tenor: YIELD_TENOR, results }, { status: success ? 200 : 207 });
}
