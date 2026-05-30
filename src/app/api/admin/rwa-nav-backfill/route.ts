// /api/admin/rwa-nav-backfill — one-off historical NAV+yield backfill for the
// rwa.xyz ingestion API. Asset inception is 2026-02-02. Pulls daily closes
// from Redis (prices:daily:close:{date}), fills the pre-cron gap from Yahoo
// Finance (front-month futures, oz→g), forward-fills weekends/holidays, then
// PUTs each day for all 4 metal assets. Yield = static fallback APY per metal.
// CRON_SECRET auth. Dry-run by default; ?send=true&confirm=yes to send.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const RWA_BASE = "https://ingestion-api.rwa.xyz/v1/assets/metrics";
const INCEPTION = "2026-02-02";
const TROY = 31.1034768;
const ASSETS = [
  { id: "AUXG", metalKey: "gold" as const, apyPct: 2.53 },
  { id: "AUXS", metalKey: "silver" as const, apyPct: 2.23 },
  { id: "AUXPT", metalKey: "platinum" as const, apyPct: 3.03 },
  { id: "AUXPD", metalKey: "palladium" as const, apyPct: 2.83 },
];
const YH_SYMS: Record<string, string> = { gold: "GC=F", silver: "SI=F", platinum: "PL=F", palladium: "PA=F" };

type Prices = { gold: number; silver: number; platinum: number; palladium: number };
function* dateRange(start: string, end: string): Generator<string> {
  const d = new Date(start + "T00:00:00Z");
  const stop = new Date(end + "T00:00:00Z");
  while (d <= stop) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}
async function fetchYahoo(sym: string, fromDate: string, toDate: string): Promise<Record<string, number>> {
  const p1 = Math.floor(new Date(fromDate + "T00:00:00Z").getTime() / 1000);
  const p2 = Math.floor(new Date(toDate + "T23:59:59Z").getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v7/finance/chart/${encodeURIComponent(sym)}?period1=${p1}&period2=${p2}&interval=1d`;
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  const j: any = await r.json();
  const res = j?.chart?.result?.[0];
  if (!res) return {};
  const ts: number[] = res.timestamp || [];
  const closes: (number | null)[] = res.indicators?.quote?.[0]?.close || [];
  const out: Record<string, number> = {};
  for (let i = 0; i < ts.length; i++) {
    const d = new Date(ts[i] * 1000).toISOString().slice(0, 10);
    const c = closes[i];
    if (c != null && !Number.isNaN(c)) out[d] = c;
  }
  return out;
}
async function scanAll(pattern: string): Promise<string[]> {
  let cursor = "0";
  const out: string[] = [];
  do {
    const [next, batch] = (await redis.scan(cursor, { match: pattern, count: 500 })) as [string, string[]];
    cursor = String(next);
    out.push(...batch);
  } while (cursor !== "0");
  return out;
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const doSend = sp.get("send") === "true";
  const confirmed = sp.get("confirm") === "yes";
  const RWA_KEY = process.env.RWA_NAV_API_KEY;
  if (doSend && !RWA_KEY) {
    return NextResponse.json({ error: "RWA_NAV_API_KEY not set" }, { status: 500 });
  }

  // 1) Pull Redis stored daily closes.
  const keys = (await scanAll("prices:daily:close:*"))
    .filter((k) => /^prices:daily:close:\d{4}-\d{2}-\d{2}$/.test(k));
  const stored: Record<string, Prices> = {};
  for (const k of keys) {
    const v = await redis.get(k);
    const o = typeof v === "string" ? JSON.parse(v) : v;
    if (o?.gold && o?.silver && o?.platinum && o?.palladium) {
      stored[k.split(":").pop()!] = o as Prices;
    }
  }
  const storedDates = Object.keys(stored).sort();

  // 2) Yahoo fallback for pre-cron days.
  const yhFrom = INCEPTION;
  const yhTo = storedDates[0] || new Date().toISOString().slice(0, 10);
  const yh: Record<string, Partial<Prices>> = {};
  for (const [metal, sym] of Object.entries(YH_SYMS)) {
    const series = await fetchYahoo(sym, yhFrom, yhTo);
    for (const [d, oz] of Object.entries(series)) {
      if (!yh[d]) yh[d] = {};
      (yh[d] as any)[metal] = oz / TROY;
    }
  }
  for (const [d, p] of Object.entries(yh)) {
    if (!stored[d] && p.gold && p.silver && p.platinum && p.palladium) {
      stored[d] = p as Prices;
    }
  }

  // 3) Forward-fill weekends/holidays.
  const yest = new Date(); yest.setUTCDate(yest.getUTCDate() - 1);
  const endDate = yest.toISOString().slice(0, 10);
  const nav: Record<string, Prices> = {};
  let last: Prices | null = null;
  let exact = 0, ffilled = 0, uncovered = 0;
  for (const d of dateRange(INCEPTION, endDate)) {
    if (stored[d]) { last = stored[d]; nav[d] = stored[d]; exact++; }
    else if (last) { nav[d] = last; ffilled++; }
    else { uncovered++; }
  }
  const totalDates = Object.keys(nav).length;

  if (!doSend) {
    return NextResponse.json({
      dryRun: true,
      inception: INCEPTION,
      endDate,
      exact, ffilled, uncovered,
      totalDates,
      totalPuts: totalDates * ASSETS.length,
      sample: ["2026-02-02", "2026-03-01", "2026-04-01", "2026-05-01", endDate]
        .filter((d) => nav[d])
        .map((d) => ({ date: d, ...nav[d] })),
    });
  }
  if (!confirmed) {
    return NextResponse.json({ error: "send=true requires confirm=yes" }, { status: 400 });
  }

  // 4) PUT each date for all 4 assets in one batch body.
  let sent = 0, failed = 0;
  const sampleFailures: { date: string; status?: number; err?: string }[] = [];
  for (const d of Object.keys(nav).sort()) {
    const p = nav[d];
    const body = ASSETS.map((a) => ({
      id: a.id,
      metrics: {
        net_asset_value: Number(p[a.metalKey].toFixed(4)),
        net_yield_1d_rate: Number((a.apyPct / 100 / 365).toFixed(8)),
      },
    }));
    try {
      const res = await fetch(`${RWA_BASE}/${d}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${RWA_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) sent++;
      else { failed++; if (sampleFailures.length < 8) sampleFailures.push({ date: d, status: res.status, err: (await res.text()).slice(0, 120) }); }
    } catch (e: any) {
      failed++; if (sampleFailures.length < 8) sampleFailures.push({ date: d, err: e?.message });
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  return NextResponse.json({
    sent: true, totalDates, exact, ffilled,
    datesSentOK: sent, datesFailed: failed,
    sampleFailures,
  });
}
