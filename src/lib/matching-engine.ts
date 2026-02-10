// ============================================
// AUXITE INTERNAL MATCHING ENGINE
// ============================================
// "Match first. Hedge immediately. Allocate physically."
//
// FIRST LAYER of risk management:
//   - Same metal, same time window → internal match
//   - No LP needed, no hedge needed
//   - Spread = 100% Auxite revenue
//
// Target: 30-60% of all flow internally matched
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// TYPES
// ============================================

export type OrderSide = 'buy' | 'sell';

export interface MatchOrder {
  id: string;
  side: OrderSide;
  metal: string;           // AUXG, AUXS, AUXPT, AUXPD
  grams: number;
  pricePerGram: number;    // Execution price at time of order
  capitalUSD: number;
  address: string;
  fundingSource: string;   // AUXM, USDC, USDT
  createdAt: number;       // Unix timestamp ms
  expiresAt: number;       // TTL — orders expire quickly
  status: 'pending' | 'matched' | 'partial' | 'sent_to_lp' | 'expired';
  matchedWith?: string;    // ID of counterparty order
  matchedGrams?: number;
  remainingGrams?: number;
}

export interface MatchResult {
  matched: boolean;
  matchType: 'full' | 'partial' | 'none';
  buyOrder: MatchOrder;
  sellOrder?: MatchOrder;
  matchedGrams: number;
  remainingBuyGrams: number;
  remainingSellGrams: number;
  spreadCaptured: number;  // USD revenue from internal match
  requiresLP: boolean;
  lpGrams: number;         // Grams that need LP execution
}

export interface MatchingStats {
  totalOrders: number;
  matchedOrders: number;
  matchRatio: number;         // 0-100%
  totalVolumeUSD: number;
  matchedVolumeUSD: number;
  revenueFromMatching: number;
  lpVolumeUSD: number;
  avgMatchTimeMs: number;
}

// ============================================
// REDIS KEYS
// ============================================
const KEYS = {
  pendingBuys: (metal: string) => `matching:pending:buy:${metal.toUpperCase()}`,
  pendingSells: (metal: string) => `matching:pending:sell:${metal.toUpperCase()}`,
  matchHistory: 'matching:history',
  matchStats: 'matching:stats',
  orderDetail: (id: string) => `matching:order:${id}`,
};

// ============================================
// ORDER WINDOW — how long orders wait for match
// ============================================
const MATCH_WINDOW_MS = 30_000;  // 30 seconds — tight window for risk-neutral ops

// ============================================
// CORE: SUBMIT ORDER FOR MATCHING
// ============================================

export async function submitForMatching(
  side: OrderSide,
  metal: string,
  grams: number,
  pricePerGram: number,
  address: string,
  fundingSource: string = 'AUXM',
): Promise<MatchResult> {
  const now = Date.now();
  const orderId = `MO-${side[0].toUpperCase()}-${now}-${Math.random().toString(36).substr(2, 6)}`;

  const order: MatchOrder = {
    id: orderId,
    side,
    metal: metal.toUpperCase(),
    grams,
    pricePerGram,
    capitalUSD: grams * pricePerGram,
    address: address.toLowerCase(),
    fundingSource,
    createdAt: now,
    expiresAt: now + MATCH_WINDOW_MS,
    status: 'pending',
    remainingGrams: grams,
  };

  // Try to find counterparty
  const counterSide: OrderSide = side === 'buy' ? 'sell' : 'buy';
  const counterKey = counterSide === 'buy'
    ? KEYS.pendingBuys(metal)
    : KEYS.pendingSells(metal);

  // Get pending orders on the other side
  const pendingRaw = await redis.lrange(counterKey, 0, -1);
  const pendingOrders: MatchOrder[] = pendingRaw
    .map((raw) => {
      try { return typeof raw === 'string' ? JSON.parse(raw) : raw as MatchOrder; }
      catch { return null; }
    })
    .filter((o): o is MatchOrder =>
      o !== null && o.status === 'pending' && o.expiresAt > now
    );

  // Find best match — same metal, not expired, not same user
  let bestMatch: MatchOrder | null = null;
  for (const pending of pendingOrders) {
    if (pending.metal === order.metal && pending.address !== order.address) {
      bestMatch = pending;
      break; // FIFO — first valid match wins
    }
  }

  if (bestMatch) {
    // ── INTERNAL MATCH FOUND ──
    const matchedGrams = Math.min(order.grams, bestMatch.remainingGrams || bestMatch.grams);
    const remainingBuy = side === 'buy'
      ? order.grams - matchedGrams
      : (bestMatch.remainingGrams || bestMatch.grams) - matchedGrams;
    const remainingSell = side === 'sell'
      ? order.grams - matchedGrams
      : (bestMatch.remainingGrams || bestMatch.grams) - matchedGrams;

    // Calculate spread captured (difference between buy execution and sell execution)
    const buyPrice = side === 'buy' ? order.pricePerGram : bestMatch.pricePerGram;
    const sellPrice = side === 'sell' ? order.pricePerGram : bestMatch.pricePerGram;
    // Buy price > sell price → the difference is Auxite's revenue
    const spreadCaptured = (buyPrice - sellPrice) * matchedGrams;

    // Update matched order
    bestMatch.status = matchedGrams >= (bestMatch.remainingGrams || bestMatch.grams) ? 'matched' : 'partial';
    bestMatch.matchedWith = order.id;
    bestMatch.matchedGrams = matchedGrams;
    bestMatch.remainingGrams = (bestMatch.remainingGrams || bestMatch.grams) - matchedGrams;

    // Update our order
    order.status = matchedGrams >= order.grams ? 'matched' : 'partial';
    order.matchedWith = bestMatch.id;
    order.matchedGrams = matchedGrams;
    order.remainingGrams = order.grams - matchedGrams;

    // Save to Redis
    await redis.set(KEYS.orderDetail(order.id), JSON.stringify(order), { ex: 3600 });
    await redis.set(KEYS.orderDetail(bestMatch.id), JSON.stringify(bestMatch), { ex: 3600 });

    // Remove matched order from pending queue
    await redis.lrem(counterKey, 1, JSON.stringify({ ...bestMatch, status: 'pending' }));

    // Record match in history
    const matchRecord = {
      buyOrderId: side === 'buy' ? order.id : bestMatch.id,
      sellOrderId: side === 'sell' ? order.id : bestMatch.id,
      metal: order.metal,
      matchedGrams,
      spreadCaptured: Math.max(0, spreadCaptured),
      matchTimeMs: Date.now() - order.createdAt,
      timestamp: Date.now(),
    };
    await redis.lpush(KEYS.matchHistory, JSON.stringify(matchRecord));
    await redis.ltrim(KEYS.matchHistory, 0, 999);

    // Update stats
    await updateMatchStats(matchedGrams * buyPrice, Math.max(0, spreadCaptured), true);

    const needsLP = order.remainingGrams > 0 || (side === 'sell' && remainingSell > 0);
    const lpGrams = side === 'buy' ? (order.remainingGrams || 0) : remainingSell;

    // If partial, add remainder to pending
    if (order.remainingGrams > 0) {
      const pendingKey = side === 'buy' ? KEYS.pendingBuys(metal) : KEYS.pendingSells(metal);
      await redis.lpush(pendingKey, JSON.stringify({ ...order, status: 'pending' }));
    }

    const result: MatchResult = {
      matched: true,
      matchType: matchedGrams >= order.grams ? 'full' : 'partial',
      buyOrder: side === 'buy' ? order : bestMatch,
      sellOrder: side === 'sell' ? order : bestMatch,
      matchedGrams,
      remainingBuyGrams: side === 'buy' ? (order.remainingGrams || 0) : 0,
      remainingSellGrams: side === 'sell' ? (order.remainingGrams || 0) : 0,
      spreadCaptured: Math.max(0, spreadCaptured),
      requiresLP: needsLP,
      lpGrams,
    };

    return result;
  }

  // ── NO MATCH — Add to pending queue ──
  const pendingKey = side === 'buy' ? KEYS.pendingBuys(metal) : KEYS.pendingSells(metal);
  await redis.lpush(pendingKey, JSON.stringify(order));
  await redis.set(KEYS.orderDetail(order.id), JSON.stringify(order), { ex: 60 });

  // Update stats — no match
  await updateMatchStats(order.capitalUSD, 0, false);

  return {
    matched: false,
    matchType: 'none',
    buyOrder: order,
    matchedGrams: 0,
    remainingBuyGrams: side === 'buy' ? order.grams : 0,
    remainingSellGrams: side === 'sell' ? order.grams : 0,
    spreadCaptured: 0,
    requiresLP: true,
    lpGrams: order.grams,
  };
}

// ============================================
// CLEANUP EXPIRED ORDERS
// ============================================

export async function cleanupExpiredOrders(): Promise<number> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const now = Date.now();
  let cleaned = 0;

  for (const metal of metals) {
    for (const side of ['buy', 'sell'] as const) {
      const key = side === 'buy' ? KEYS.pendingBuys(metal) : KEYS.pendingSells(metal);
      const pending = await redis.lrange(key, 0, -1);

      for (const raw of pending) {
        try {
          const order: MatchOrder = typeof raw === 'string' ? JSON.parse(raw) : raw as MatchOrder;
          if (order.expiresAt < now) {
            await redis.lrem(key, 1, typeof raw === 'string' ? raw : JSON.stringify(raw));
            // Mark as expired
            order.status = 'expired';
            await redis.set(KEYS.orderDetail(order.id), JSON.stringify(order), { ex: 300 });
            cleaned++;
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  return cleaned;
}

// ============================================
// STATS
// ============================================

async function updateMatchStats(volumeUSD: number, revenue: number, wasMatched: boolean): Promise<void> {
  try {
    const statsRaw = await redis.get(KEYS.matchStats);
    const stats: any = statsRaw
      ? (typeof statsRaw === 'string' ? JSON.parse(statsRaw) : statsRaw)
      : { totalOrders: 0, matchedOrders: 0, totalVolumeUSD: 0, matchedVolumeUSD: 0, revenueFromMatching: 0, lpVolumeUSD: 0 };

    stats.totalOrders++;
    stats.totalVolumeUSD += volumeUSD;
    if (wasMatched) {
      stats.matchedOrders++;
      stats.matchedVolumeUSD += volumeUSD;
      stats.revenueFromMatching += revenue;
    } else {
      stats.lpVolumeUSD += volumeUSD;
    }

    await redis.set(KEYS.matchStats, JSON.stringify(stats));
  } catch (e) {
    console.error('Match stats update error:', e);
  }
}

export async function getMatchingStats(): Promise<MatchingStats> {
  try {
    const statsRaw = await redis.get(KEYS.matchStats);
    const stats: any = statsRaw
      ? (typeof statsRaw === 'string' ? JSON.parse(statsRaw) : statsRaw)
      : {};

    return {
      totalOrders: stats.totalOrders || 0,
      matchedOrders: stats.matchedOrders || 0,
      matchRatio: stats.totalOrders > 0
        ? Math.round((stats.matchedOrders / stats.totalOrders) * 100)
        : 0,
      totalVolumeUSD: stats.totalVolumeUSD || 0,
      matchedVolumeUSD: stats.matchedVolumeUSD || 0,
      revenueFromMatching: stats.revenueFromMatching || 0,
      lpVolumeUSD: stats.lpVolumeUSD || 0,
      avgMatchTimeMs: 0, // Calculated from history if needed
    };
  } catch (e) {
    return {
      totalOrders: 0, matchedOrders: 0, matchRatio: 0,
      totalVolumeUSD: 0, matchedVolumeUSD: 0, revenueFromMatching: 0,
      lpVolumeUSD: 0, avgMatchTimeMs: 0,
    };
  }
}

export async function getRecentMatches(limit: number = 20): Promise<any[]> {
  try {
    const raw = await redis.lrange(KEYS.matchHistory, 0, limit - 1);
    return raw.map((r) => {
      try { return typeof r === 'string' ? JSON.parse(r) : r; }
      catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================
// PENDING ORDER BOOK (for dashboard)
// ============================================

export async function getPendingOrderBook(): Promise<{
  buys: Record<string, MatchOrder[]>;
  sells: Record<string, MatchOrder[]>;
}> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const now = Date.now();
  const buys: Record<string, MatchOrder[]> = {};
  const sells: Record<string, MatchOrder[]> = {};

  for (const metal of metals) {
    const buyRaw = await redis.lrange(KEYS.pendingBuys(metal), 0, -1);
    const sellRaw = await redis.lrange(KEYS.pendingSells(metal), 0, -1);

    buys[metal] = buyRaw
      .map((r) => { try { return typeof r === 'string' ? JSON.parse(r) : r as MatchOrder; } catch { return null; } })
      .filter((o): o is MatchOrder => o !== null && o.expiresAt > now);

    sells[metal] = sellRaw
      .map((r) => { try { return typeof r === 'string' ? JSON.parse(r) : r as MatchOrder; } catch { return null; } })
      .filter((o): o is MatchOrder => o !== null && o.expiresAt > now);
  }

  return { buys, sells };
}
