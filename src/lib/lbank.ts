// ============================================================================
// LBANK public market-data client (no API key — public spot quotation only).
//
// AUXR trades on LBANK as `auxr_usdt` under the Technical Service Agreement.
// The cockpit already watched BitMart; this is the second venue, so NAV
// deviation and depth can be read per-exchange rather than assumed to be the
// same everywhere.
//
// Shapes mirror lib/bitmart.ts deliberately: the ops route treats both venues
// uniformly and `computeDepthMetrics` is shared, so a second feed does not
// mean a second set of rules about what a spread means.
//
// Read-only: no trading, no credentials.
// ============================================================================

import type { DepthLevel, DepthMetrics } from "@/lib/bitmart";

const LBANK_BASE = process.env.LBANK_API_BASE || "https://api.lbkex.com";
export const LBANK_AUXR_SYMBOL = process.env.LBANK_AUXR_SYMBOL || "auxr_usdt";

async function lbGet(path: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${LBANK_BASE}${path}`, {
      headers: { accept: "application/json", "user-agent": "AuxiteOps/1.0 (+https://auxite.io)" },
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) {
      // Logged rather than swallowed: a persistent failure here means the
      // watchdog is blind to this venue, and silence would read as calm.
      console.error(`[lbank] GET ${path} -> HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    // LBANK wraps as { result: "true", data, error_code }.
    if (json?.error_code && Number(json.error_code) !== 0) {
      console.error(`[lbank] GET ${path} -> error_code ${json.error_code}`);
      return null;
    }
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export interface LbankTicker {
  listed: boolean;
  symbol: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null;      // base volume (AUXR)
  quoteVolume24h: number | null; // USDT turnover
  change24hPct: number | null;
  ts: number;
}

export interface LbankDepth {
  listed: boolean;
  symbol: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  ts: number;
}

const n = (v: unknown): number | null => {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

/**
 * Live ticker. LBANK's ticker carries no bid/ask, so those are filled from the
 * top of the book by `getLbankMarket` rather than reported as null — a spread
 * of "unknown" would read the same as a spread of zero on the dashboard.
 */
export async function getLbankTicker(symbol: string = LBANK_AUXR_SYMBOL): Promise<LbankTicker> {
  const now = Date.now();
  const d = await lbGet(`/v2/ticker.do?symbol=${encodeURIComponent(symbol)}`);
  const row = Array.isArray(d) ? d[0] : null;
  const t = row?.ticker;
  if (!t) {
    return {
      listed: false, symbol, last: null, bid: null, ask: null, high24h: null,
      low24h: null, volume24h: null, quoteVolume24h: null, change24hPct: null, ts: now,
    };
  }
  return {
    listed: true,
    symbol,
    last: n(t.latest),
    bid: null,
    ask: null,
    high24h: n(t.high),
    low24h: n(t.low),
    volume24h: n(t.vol),
    quoteVolume24h: n(t.turnover),
    change24hPct: n(t.change),
    ts: n(row.timestamp) ?? now,
  };
}

/** Order book. LBANK returns [price, size] pairs, best first. */
export async function getLbankDepth(
  symbol: string = LBANK_AUXR_SYMBOL,
  size = 50,
): Promise<LbankDepth> {
  const now = Date.now();
  const d = await lbGet(`/v2/depth.do?symbol=${encodeURIComponent(symbol)}&size=${size}`);
  const parse = (arr: any): DepthLevel[] =>
    Array.isArray(arr)
      ? arr
          .map((l: any) => ({ price: Number(l[0]), size: Number(l[1]) }))
          .filter((l) => Number.isFinite(l.price) && l.price > 0)
      : [];
  if (!d) return { listed: false, symbol, bids: [], asks: [], ts: now };
  return { listed: true, symbol, bids: parse(d.bids), asks: parse(d.asks), ts: now };
}

export interface LbankMarket {
  ticker: LbankTicker;
  depth: LbankDepth;
  metrics: DepthMetrics | null;
  /** Last price against NAV, in basis points. Negative means trading below NAV. */
  deviationBps: number | null;
}

/**
 * One call for the whole venue picture, with bid/ask filled from the book and
 * deviation measured against NAV rather than against the venue's own mid —
 * a market can be internally consistent and still be wrong about fair value,
 * which is the condition worth alerting on.
 */
export async function getLbankMarket(navUSD: number | null): Promise<LbankMarket> {
  const { computeDepthMetrics } = await import("@/lib/bitmart");
  const [ticker, depth] = await Promise.all([getLbankTicker(), getLbankDepth()]);

  const bestBid = depth.bids[0]?.price ?? null;
  const bestAsk = depth.asks[0]?.price ?? null;
  ticker.bid = bestBid;
  ticker.ask = bestAsk;

  const reference = navUSD && navUSD > 0 ? navUSD : ticker.last;
  const metrics = depth.listed && reference ? computeDepthMetrics(depth as any, reference) : null;

  const deviationBps =
    navUSD && navUSD > 0 && ticker.last
      ? Math.round(((ticker.last - navUSD) / navUSD) * 10_000)
      : null;

  return { ticker, depth, metrics, deviationBps };
}

// ── Trade flow ──────────────────────────────────────────────────────────────

export interface LbankTrade {
  ts: number;
  price: number;
  amount: number;
  side: "buy" | "sell";
  tid: string;
}

/** Recent public trades, newest first. LBANK caps `size` at 600. */
export async function getLbankTrades(
  symbol: string = LBANK_AUXR_SYMBOL,
  size = 600,
): Promise<LbankTrade[]> {
  const d = await lbGet(`/v2/trades.do?symbol=${encodeURIComponent(symbol)}&size=${size}`);
  if (!Array.isArray(d)) return [];
  return d
    .map((t: any) => ({
      ts: Number(t.date_ms),
      price: Number(t.price),
      amount: Number(t.amount),
      side: t.type === "sell" ? ("sell" as const) : ("buy" as const),
      tid: String(t.tid ?? ""),
    }))
    .filter((t) => Number.isFinite(t.price) && Number.isFinite(t.amount) && t.amount > 0);
}

export interface FlowSplit {
  trades: number;
  windowHours: number | null;
  /** Trades whose size belongs to a small, heavily repeated set — the shape a
   *  quoting bot makes. Not proof of who traded: the public feed carries no
   *  account, so this is a pattern, not an identity. */
  likelyMm: { trades: number; volume: number };
  /** Everything else. The best available proxy for real interest. */
  residual: { trades: number; volume: number };
  diagnostics: {
    /** distinct sizes ÷ trades. Near 0 means the same few sizes over and over. */
    sizeUniformity: number | null;
    /** median seconds between trades. */
    medianGapSec: number | null;
    /** |buy − sell| ÷ total volume. Near 0 means matched both ways. */
    buySellImbalance: number | null;
    largestTrade: number | null;
  };
}

/**
 * Splits the public tape into "looks like a quoting bot" and "everything else".
 *
 * There is no account id in public data, so this cannot name a counterparty and
 * does not try to. What it can do is measure the three things that separate a
 * machine from a person: a machine reuses a handful of order sizes, fires at a
 * steady cadence, and ends the hour roughly flat. The residual is what is left
 * once that pattern is removed, and it is the number worth reading as interest.
 */
export function classifyFlow(trades: LbankTrade[]): FlowSplit {
  if (!trades.length) {
    return {
      trades: 0, windowHours: null,
      likelyMm: { trades: 0, volume: 0 },
      residual: { trades: 0, volume: 0 },
      diagnostics: { sizeUniformity: null, medianGapSec: null, buySellImbalance: null, largestTrade: null },
    };
  }

  const sorted = [...trades].sort((a, b) => b.ts - a.ts);
  const windowHours = (sorted[0].ts - sorted[sorted.length - 1].ts) / 3_600_000;

  // A size is "repeated" when the same amount shows up often enough that it
  // cannot be coincidence. Threshold scales with the sample so a quiet hour
  // does not flag two matching trades as a bot.
  const counts = new Map<string, number>();
  for (const t of trades) {
    const k = t.amount.toFixed(6);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const repeatThreshold = Math.max(3, Math.ceil(trades.length / 60));

  const sizes = trades.map((t) => t.amount).sort((a, b) => a - b);
  const p90 = sizes[Math.floor(sizes.length * 0.9)] ?? Infinity;

  let mmT = 0, mmV = 0, resT = 0, resV = 0;
  for (const t of trades) {
    const repeated = (counts.get(t.amount.toFixed(6)) ?? 0) >= repeatThreshold;
    // Size alone is not enough: a genuine small trade should not be swept up
    // just for being small, so it must also sit inside the repeated cluster.
    if (repeated && t.amount <= p90) {
      mmT += 1; mmV += t.amount;
    } else {
      resT += 1; resV += t.amount;
    }
  }

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) gaps.push((sorted[i - 1].ts - sorted[i].ts) / 1000);
  gaps.sort((a, b) => a - b);

  const buyVol = trades.filter((t) => t.side === "buy").reduce((s, t) => s + t.amount, 0);
  const sellVol = trades.filter((t) => t.side === "sell").reduce((s, t) => s + t.amount, 0);
  const totalVol = buyVol + sellVol;

  return {
    trades: trades.length,
    windowHours: Number.isFinite(windowHours) ? windowHours : null,
    likelyMm: { trades: mmT, volume: mmV },
    residual: { trades: resT, volume: resV },
    diagnostics: {
      sizeUniformity: counts.size / trades.length,
      medianGapSec: gaps.length ? gaps[Math.floor(gaps.length / 2)] : null,
      buySellImbalance: totalVol > 0 ? Math.abs(buyVol - sellVol) / totalVol : null,
      largestTrade: sizes[sizes.length - 1] ?? null,
    },
  };
}
