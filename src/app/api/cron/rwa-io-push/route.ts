// src/app/api/cron/rwa-io-push/route.ts
// Pushes the daily token metrics (circulating/total supply, price, AUM) for each
// Auxite metal token to RWA.io's Insights API so they appear on our rwa.io
// project profile and keep the token verification fed.
//
// Data sources: /api/supply (canonical on-chain supply) + /api/prices (per-gram
// USD price). Auth: Authorization: Bearer ${CRON_SECRET}. Idempotent per hour.

import { NextRequest, NextResponse } from "next/server";
import { pushTokenMetrics, type RwaPreset } from "@/lib/rwa-io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SECRET = process.env.CRON_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Our own data feeds.
  const [supplyRes, priceRes] = await Promise.all([
    fetch(`${APP_URL}/api/supply`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
    fetch(`${APP_URL}/api/prices`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
  ]);

  if (!supplyRes?.tokens?.length) {
    return NextResponse.json({ success: false, error: "supply feed unavailable" }, { status: 502 });
  }
  const prices: Record<string, any> = priceRes?.prices || {};

  const results = [];
  for (const tok of supplyRes.tokens) {
    const sym: string = tok.symbol;
    const supply = parseFloat(tok.circulatingSupply) || 0;
    const total = parseFloat(tok.totalSupply) || 0;
    const price = parseFloat(prices[sym]) || 0; // per-gram USD (1 token = 1 gram)

    const metrics: { presetId: RwaPreset; value: number }[] = [
      { presetId: "circulating-supply", value: supply },
      { presetId: "total-supply", value: total },
    ];
    if (price > 0) {
      metrics.push({ presetId: "price", value: price });
      metrics.push({ presetId: "aum", value: supply * price }); // total value tokenized
      metrics.push({ presetId: "nav", value: price });          // 1:1 metal-backed → NAV/token = price/gram
    }

    results.push(await pushTokenMetrics(sym, String(tok.chainId || 8453), metrics));
  }

  return NextResponse.json({ success: true, ts: Date.now(), results });
}
