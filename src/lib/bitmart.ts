// ============================================================================
// BitMart public market-data client (no API key — public spot quotation only).
//
// Used by the AUXR Ops Cockpit + monitoring cron to compare the live CEX price
// against AUXR's NAV, measure order-book depth (a proxy for BitMart's BML
// liquidity index), and detect the abnormal-fluctuation conditions the listing
// addendum penalises. Read-only: no trading, no credentials.
//
// AUXR trades as the pair AUXR_USDT (once listed). Until BitMart integrates the
// token every call returns { listed: false } so the cockpit shows "pending"
// instead of erroring.
// ============================================================================

const BITMART_BASE = process.env.BITMART_API_BASE || "https://api-cloud.bitmart.com";
export const AUXR_SYMBOL = process.env.BITMART_AUXR_SYMBOL || "AUXR_USDT";

async function bmGet(path: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`${BITMART_BASE}${path}`, {
      headers: {
        accept: "application/json",
        // BitMart's edge returns 403 to any request WITHOUT a User-Agent.
        // Without this the ticker/depth calls always failed, getBitmartTicker()
        // fell back to { listed:false }, and the ops watchdog silently stopped
        // checking NAV deviation and spread — an outage that looks like "all
        // quiet" because no alert can fire. Any non-empty UA satisfies it, so
        // we identify ourselves honestly rather than spoofing a browser.
        "user-agent": "AuxiteOps/1.0 (+https://auxite.io)",
      },
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) {
      // Log rather than swallow: a persistent non-OK here means the market
      // feed is down and the watchdog is blind.
      console.error(`[bitmart] GET ${path} -> HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    // BitMart wraps as { code, message, data }. code 1000 = success.
    if (json && typeof json.code === "number" && json.code !== 1000) return null;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export interface BitmartTicker {
  listed: boolean;
  symbol: string;
  last: number | null;
  bid: number | null;
  ask: number | null;
  high24h: number | null;
  low24h: number | null;
  volume24h: number | null; // base volume (AUXR)
  quoteVolume24h: number | null; // USDT volume
  ts: number;
}

/** Live ticker for the AUXR/USDT pair. Returns listed:false until BitMart adds it. */
export async function getBitmartTicker(symbol: string = AUXR_SYMBOL): Promise<BitmartTicker> {
  const now = Date.now();
  const d = await bmGet(`/spot/quotation/v3/ticker?symbol=${encodeURIComponent(symbol)}`);
  if (!d) {
    return {
      listed: false, symbol, last: null, bid: null, ask: null,
      high24h: null, low24h: null, volume24h: null, quoteVolume24h: null, ts: now,
    };
  }
  const num = (v: any) => (v == null || v === "" ? null : Number(v));
  return {
    listed: true,
    symbol,
    last: num(d.last),
    bid: num(d.bid_px ?? d.best_bid),
    ask: num(d.ask_px ?? d.best_ask),
    high24h: num(d.high_24h),
    low24h: num(d.low_24h),
    volume24h: num(d.v_24h),
    quoteVolume24h: num(d.qv_24h),
    ts: num(d.ts) || now,
  };
}

export interface DepthLevel { price: number; size: number }
export interface BitmartDepth {
  listed: boolean;
  symbol: string;
  bids: DepthLevel[];
  asks: DepthLevel[];
  ts: number;
}

/** Order book (depth) for the pair. */
export async function getBitmartDepth(symbol: string = AUXR_SYMBOL, limit = 50): Promise<BitmartDepth> {
  const now = Date.now();
  const d = await bmGet(`/spot/quotation/v3/books?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
  const parse = (arr: any): DepthLevel[] =>
    Array.isArray(arr) ? arr.map((l: any) => ({ price: Number(l[0]), size: Number(l[1]) })).filter((l) => l.price > 0) : [];
  if (!d) return { listed: false, symbol, bids: [], asks: [], ts: now };
  return { listed: true, symbol, bids: parse(d.bids), asks: parse(d.asks), ts: Number(d.ts) || now };
}

export interface DepthMetrics {
  spreadBps: number | null; // (ask-bid)/mid in basis points
  bidUsdWithin: Record<string, number>; // "2"/"5"/"10" pct → bid depth in USDT
  askUsdWithin: Record<string, number>;
  totalBidUsd: number;
  totalAskUsd: number;
}

/**
 * Depth metrics around a reference `mid` price (use NAV so the measurement is
 * anchored to fair value). Bands mirror BitMart's BML depth layers (±2/±5/±10%).
 */
export function computeDepthMetrics(depth: BitmartDepth, mid: number): DepthMetrics {
  const bands = [2, 5, 10];
  const bidUsdWithin: Record<string, number> = { "2": 0, "5": 0, "10": 0 };
  const askUsdWithin: Record<string, number> = { "2": 0, "5": 0, "10": 0 };
  let totalBidUsd = 0;
  let totalAskUsd = 0;

  for (const b of depth.bids) {
    const usd = b.price * b.size;
    totalBidUsd += usd;
    for (const band of bands) if (b.price >= mid * (1 - band / 100)) bidUsdWithin[String(band)] += usd;
  }
  for (const a of depth.asks) {
    const usd = a.price * a.size;
    totalAskUsd += usd;
    for (const band of bands) if (a.price <= mid * (1 + band / 100)) askUsdWithin[String(band)] += usd;
  }

  const bestBid = depth.bids[0]?.price;
  const bestAsk = depth.asks[0]?.price;
  const spreadBps =
    bestBid && bestAsk && mid > 0 ? ((bestAsk - bestBid) / mid) * 10000 : null;

  return { spreadBps, bidUsdWithin, askUsdWithin, totalBidUsd, totalAskUsd };
}
