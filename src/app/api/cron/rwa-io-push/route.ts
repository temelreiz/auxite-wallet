// src/app/api/cron/rwa-io-push/route.ts
// Pushes the daily token metrics (circulating/total supply, price, AUM) for each
// Auxite metal token to RWA.io's Insights API so they appear on our rwa.io
// project profile and keep the token verification fed.
//
// Data sources: /api/supply (canonical on-chain supply) + /api/prices (per-gram
// USD price). Auth: Authorization: Bearer ${CRON_SECRET}. Idempotent per hour.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { pushTokenMetrics, type RwaPreset } from "@/lib/rwa-io";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const SECRET = process.env.CRON_SECRET || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

const redis = Redis.fromEnv();
const METAL_FIELD: Record<string, string> = { AUXG: "auxg", AUXS: "auxs", AUXPT: "auxpt", AUXPD: "auxpd" };

// Count distinct holders per metal (balance > 0) + total unique wallets.
// One scan over user:0x*:balance, pipelined hgetall. Real data, no fabrication.
async function countHolders(): Promise<{ perMetal: Record<string, number>; totalWallets: number }> {
  const perMetal: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
  const wallets = new Set<string>();
  try {
    const keys = await redis.keys("user:0x*:balance");
    const BATCH = 100;
    for (let i = 0; i < keys.length; i += BATCH) {
      const slice = keys.slice(i, i + BATCH);
      const pipe = redis.pipeline();
      slice.forEach((k) => pipe.hgetall(k));
      const rows = (await pipe.exec()) as Array<Record<string, unknown> | null>;
      rows.forEach((bal, idx) => {
        if (!bal) return;
        let holdsAny = false;
        for (const sym of Object.keys(METAL_FIELD)) {
          const v = parseFloat(String(bal[METAL_FIELD[sym]] ?? "0"));
          if (Number.isFinite(v) && v > 0) { perMetal[sym]++; holdsAny = true; }
        }
        if (holdsAny) wallets.add(slice[idx]);
      });
    }
  } catch (e) {
    console.error("[rwa-io-push] countHolders failed:", e);
  }
  return { perMetal, totalWallets: wallets.size };
}

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

  // Real holder counts (distinct addresses with a >0 balance per metal).
  const { perMetal: holders, totalWallets } = await countHolders();

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
      const aum = supply * price; // total USD value of metal tokenized
      metrics.push({ presetId: "price", value: price });
      metrics.push({ presetId: "aum", value: aum });
      metrics.push({ presetId: "tokenized-value", value: aum }); // = AUM (1:1 metal-backed)
      metrics.push({ presetId: "nav", value: price });           // NAV/token = price/gram
    }
    if (holders[sym] > 0) metrics.push({ presetId: "holders", value: holders[sym] });

    results.push(await pushTokenMetrics(sym, String(tok.chainId || 8453), metrics));
  }

  return NextResponse.json({ success: true, ts: Date.now(), holders, totalWallets, results });
}
