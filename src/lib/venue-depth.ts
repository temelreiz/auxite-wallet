// src/lib/venue-depth.ts
//
// AUXR order-book depth on every venue that lists it, measured against NAV.
//
// A tight spread can sit on top of almost nothing: in October 2026 all three
// books quoted within 0.1–0.7% of NAV, yet held only ~$400–760 per side within
// 2%. Depth is what decides whether a burst of buyers (a KOL post) or one
// holder leaving moves the price on their own, so it is watched per venue and
// per side, and reported only when a venue changes state (feedback: alert on
// transitions, not states).

import { getRedis } from "@/lib/redis";
import { getLbankDepth } from "@/lib/lbank";

export type Venue = "lbank" | "pionex" | "hotcoin";
export const VENUES: Venue[] = ["lbank", "pionex", "hotcoin"];

export interface VenueDepth {
  venue: Venue;
  bidUsd2: number; // bids within 2% of NAV, in USDT
  askUsd2: number; // asks within 2% of NAV, in USDT
  spreadBps: number | null;
}

type Level = { price: number; size: number };

function levels(arr: unknown): Level[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((l: any) => ({ price: Number(l[0]), size: Number(l[1]) }))
    .filter((l) => Number.isFinite(l.price) && l.price > 0 && Number.isFinite(l.size));
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000) });
  return res.json();
}

async function book(venue: Venue): Promise<{ bids: Level[]; asks: Level[] } | null> {
  if (venue === "lbank") {
    const d = await getLbankDepth();
    return d.listed ? { bids: d.bids, asks: d.asks } : null;
  }
  if (venue === "pionex") {
    const j = await fetchJson("https://api.pionex.com/api/v1/market/depth?symbol=AUXR_USDT&limit=100");
    return j?.result ? { bids: levels(j.data?.bids), asks: levels(j.data?.asks) } : null;
  }
  const j = await fetchJson("https://api.hotcoinfin.com/v1/depth?symbol=auxr_usdt&step=60");
  const d = j?.data?.depth;
  return d ? { bids: levels(d.bids), asks: levels(d.asks) } : null;
}

function measure(venue: Venue, b: { bids: Level[]; asks: Level[] }, nav: number): VenueDepth {
  const bidUsd2 = b.bids.filter((l) => l.price >= nav * 0.98).reduce((s, l) => s + l.price * l.size, 0);
  const askUsd2 = b.asks.filter((l) => l.price <= nav * 1.02).reduce((s, l) => s + l.price * l.size, 0);
  const bestBid = Math.max(0, ...b.bids.map((l) => l.price));
  const asks = b.asks.map((l) => l.price);
  const bestAsk = asks.length ? Math.min(...asks) : 0;
  const spreadBps = bestBid > 0 && bestAsk > 0 ? ((bestAsk - bestBid) / nav) * 10000 : null;
  return { venue, bidUsd2, askUsd2, spreadBps };
}

/** Depth on every venue; a venue whose API fails is left out, not reported as empty. */
export async function getAllVenueDepth(nav: number): Promise<VenueDepth[]> {
  const out = await Promise.all(
    VENUES.map(async (v) => {
      try {
        const b = await book(v);
        return b ? measure(v, b, nav) : null;
      } catch {
        return null;
      }
    }),
  );
  return out.filter((x): x is VenueDepth => x !== null);
}

/**
 * Minimum USDT per side within 2% of NAV. AUXR_DEPTH_ALERT_USD sets the
 * default; AUXR_DEPTH_ALERT_USD_<VENUE> overrides one venue (e.g. raise the
 * campaign venue to 10000 before a KOL post).
 */
export function depthThreshold(venue: Venue): number {
  const own = Number(process.env[`AUXR_DEPTH_ALERT_USD_${venue.toUpperCase()}`]);
  if (own > 0) return own;
  return Number(process.env.AUXR_DEPTH_ALERT_USD || 2500);
}

export type DepthState = "ok" | "thin";

/**
 * Compare against the last recorded state and return the venues that changed.
 * Recovery needs 10% above the threshold so a book hovering on the line does
 * not flap. The first observation of a venue counts as a change only when thin.
 */
export async function depthTransitions(
  depths: VenueDepth[],
): Promise<Array<VenueDepth & { from: DepthState | null; to: DepthState; threshold: number }>> {
  const r = getRedis();
  const changes: Array<VenueDepth & { from: DepthState | null; to: DepthState; threshold: number }> = [];

  for (const d of depths) {
    const threshold = depthThreshold(d.venue);
    const key = `auxr:depth-state:${d.venue}`;
    const prev = ((await r.get(key)) as DepthState | null) ?? null;
    const worst = Math.min(d.bidUsd2, d.askUsd2);

    let next: DepthState;
    if (worst < threshold) next = "thin";
    else if (prev === "thin" && worst < threshold * 1.1) next = "thin";
    else next = "ok";

    if (next !== prev) {
      await r.set(key, next);
      if (prev !== null || next === "thin") changes.push({ ...d, from: prev, to: next, threshold });
    }
  }
  return changes;
}

export const VENUE_LABEL: Record<Venue, string> = { lbank: "LBANK", pionex: "Pionex", hotcoin: "Hotcoin" };
