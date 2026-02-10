// ============================================
// AUXITE HEDGE ENGINE
// ============================================
// "Hedge immediately. Never bet on price."
//
// RULES:
//   - If exposure > X seconds → hedge immediately
//   - Gold: 30-60 sec tolerance
//   - PGM (Pt, Pd): IMMEDIATE hedge
//   - Hedge time ≠ allocation time
//   - Paper hedge open → physical allocated → hedge closed
//   - Palladium inventory = FORBIDDEN
//
// INSTRUMENTS:
//   - Gold: COMEX GC Futures (primary), OTC Forward, Options (extreme only)
//   - Silver: COMEX SI Futures, OTC Forward
//   - Platinum: NYMEX PL Futures, OTC bilateral
//   - Palladium: NYMEX PA Futures, LP OTC only
//
// This engine TRACKS hedges — execution is manual/LP-connected.
// It calculates required positions and records hedge lifecycle.
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// TYPES
// ============================================

export type HedgeInstrument = 'futures' | 'forward' | 'options';
export type HedgeStatus = 'open' | 'partial_close' | 'closed' | 'expired';

export interface HedgePosition {
  id: string;
  metal: string;               // AUXG, AUXS, AUXPT, AUXPD
  side: 'long' | 'short';     // short = hedging a buy (we sold to user, need to cover)
  instrument: HedgeInstrument;
  grams: number;
  entryPricePerGram: number;
  currentPricePerGram?: number;
  notionalUSD: number;
  openedAt: number;
  closedAt?: number;
  status: HedgeStatus;
  reason: string;              // 'allocation_pending' | 'lp_fill_delay' | 'rfq_pending' | 'weekend_cover'
  linkedOrderId?: string;      // Matching engine order ID
  closedGrams: number;
  pnl: number;                // Hedge P&L (should be ~0 for risk-neutral)
  notes?: string;
}

export interface ExposureSnapshot {
  metal: string;
  netExposureGrams: number;   // + = long, - = short, 0 = flat
  netExposureUSD: number;
  openHedges: number;
  hedgedGrams: number;
  unhedgedGrams: number;      // CRITICAL: this should be ~0
  exposureTimeMs: number;     // How long unhedged
  riskLevel: 'flat' | 'hedged' | 'exposed' | 'critical';
}

export interface HedgeConfig {
  // Max exposure time before MANDATORY hedge (ms)
  maxExposureMs: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
  // Max unhedged grams (micro buffer)
  microBuffer: {
    gold: number;      // e.g., 5g — tolerable unhedged
    silver: number;
    platinum: number;
    palladium: number;
  };
  // Auto-hedge enabled
  autoHedgeEnabled: boolean;
  // Default instrument per metal
  defaultInstrument: Record<string, HedgeInstrument>;
}

// ============================================
// CONSTANTS & DEFAULTS
// ============================================

const DEFAULT_HEDGE_CONFIG: HedgeConfig = {
  maxExposureMs: {
    gold: 60_000,       // 60 sec — gold is liquid
    silver: 30_000,     // 30 sec — more volatile
    platinum: 5_000,    // 5 sec — PGM = immediate
    palladium: 1_000,   // 1 sec — MOST RISKY. Hedge or die.
  },
  microBuffer: {
    gold: 5,            // 5g unhedged ok (~$800)
    silver: 100,        // 100g (~$300)
    platinum: 2,        // 2g (~$160)
    palladium: 0,       // 0g — NO TOLERANCE for palladium
  },
  autoHedgeEnabled: true,
  defaultInstrument: {
    AUXG: 'futures',    // COMEX GC
    AUXS: 'futures',    // COMEX SI
    AUXPT: 'futures',   // NYMEX PL
    AUXPD: 'futures',   // NYMEX PA
  },
};

const METAL_KEY_MAP: Record<string, string> = {
  AUXG: 'gold', AUXS: 'silver', AUXPT: 'platinum', AUXPD: 'palladium',
};

// ============================================
// REDIS KEYS
// ============================================

const KEYS = {
  hedgeConfig: 'hedge:config',
  openPositions: 'hedge:positions:open',
  closedPositions: 'hedge:positions:closed',
  exposure: (metal: string) => `hedge:exposure:${metal.toUpperCase()}`,
  hedgeDetail: (id: string) => `hedge:position:${id}`,
  stats: 'hedge:stats',
};

// ============================================
// CONFIG
// ============================================

export async function getHedgeConfig(): Promise<HedgeConfig> {
  try {
    const raw = await redis.get(KEYS.hedgeConfig);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { ...DEFAULT_HEDGE_CONFIG, ...parsed };
    }
    return DEFAULT_HEDGE_CONFIG;
  } catch {
    return DEFAULT_HEDGE_CONFIG;
  }
}

export async function setHedgeConfig(config: Partial<HedgeConfig>): Promise<HedgeConfig> {
  const current = await getHedgeConfig();
  const updated = { ...current, ...config };
  await redis.set(KEYS.hedgeConfig, JSON.stringify(updated));
  return updated;
}

// ============================================
// CORE: RECORD NEW EXPOSURE
// ============================================
// Called when matching engine sends order to LP (no internal match)

export async function recordExposure(
  metal: string,
  grams: number,
  side: 'buy' | 'sell',
  pricePerGram: number,
  reason: string,
  linkedOrderId?: string,
): Promise<{ needsHedge: boolean; hedgeId?: string; position?: HedgePosition }> {
  const config = await getHedgeConfig();
  const metalKey = METAL_KEY_MAP[metal.toUpperCase()] || 'gold';
  const microBuffer = config.microBuffer[metalKey as keyof typeof config.microBuffer] || 0;

  // Check if within micro buffer (no hedge needed)
  if (grams <= microBuffer) {
    // Record as micro exposure but don't hedge
    await updateExposureTracker(metal, grams, side);
    return { needsHedge: false };
  }

  // ── HEDGE REQUIRED ──
  // When user BUYS metal → we need to COVER (go long in futures)
  // When user SELLS metal → we need to OFFSET (go short in futures)
  const hedgeSide: 'long' | 'short' = side === 'buy' ? 'long' : 'short';
  const instrument = config.defaultInstrument[metal.toUpperCase()] || 'futures';

  const hedgeId = `HG-${metal.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

  const position: HedgePosition = {
    id: hedgeId,
    metal: metal.toUpperCase(),
    side: hedgeSide,
    instrument,
    grams,
    entryPricePerGram: pricePerGram,
    notionalUSD: grams * pricePerGram,
    openedAt: Date.now(),
    status: 'open',
    reason,
    linkedOrderId,
    closedGrams: 0,
    pnl: 0,
  };

  // Save hedge position
  await redis.set(KEYS.hedgeDetail(hedgeId), JSON.stringify(position), { ex: 86400 }); // 24h TTL
  await redis.lpush(KEYS.openPositions, hedgeId);

  // Update exposure tracker
  await updateExposureTracker(metal, grams, side);

  // Update stats
  await updateHedgeStats('opened', position.notionalUSD);

  return { needsHedge: true, hedgeId, position };
}

// ============================================
// CORE: CLOSE HEDGE (when physical allocation completes)
// ============================================

export async function closeHedge(
  hedgeId: string,
  closePricePerGram: number,
  gramsToClose?: number,
): Promise<{ success: boolean; pnl: number; position?: HedgePosition }> {
  try {
    const raw = await redis.get(KEYS.hedgeDetail(hedgeId));
    if (!raw) return { success: false, pnl: 0 };

    const position: HedgePosition = typeof raw === 'string' ? JSON.parse(raw) : raw as HedgePosition;
    const closeGrams = gramsToClose || (position.grams - position.closedGrams);

    // Calculate P&L
    const priceDiff = closePricePerGram - position.entryPricePerGram;
    const hedgePnL = position.side === 'long'
      ? priceDiff * closeGrams     // Long: profit if price went up
      : -priceDiff * closeGrams;   // Short: profit if price went down

    position.closedGrams += closeGrams;
    position.pnl += hedgePnL;
    position.currentPricePerGram = closePricePerGram;

    if (position.closedGrams >= position.grams) {
      position.status = 'closed';
      position.closedAt = Date.now();
      // Move from open to closed
      await redis.lrem(KEYS.openPositions, 1, hedgeId);
      await redis.lpush(KEYS.closedPositions, hedgeId);
    } else {
      position.status = 'partial_close';
    }

    await redis.set(KEYS.hedgeDetail(hedgeId), JSON.stringify(position), { ex: 86400 });

    // Update exposure
    await updateExposureTracker(position.metal, -closeGrams, position.side === 'long' ? 'buy' : 'sell');

    // Update stats
    await updateHedgeStats('closed', closeGrams * closePricePerGram);

    return { success: true, pnl: hedgePnL, position };
  } catch (e) {
    console.error('Close hedge error:', e);
    return { success: false, pnl: 0 };
  }
}

// ============================================
// EXPOSURE TRACKING
// ============================================

async function updateExposureTracker(metal: string, grams: number, side: 'buy' | 'sell'): Promise<void> {
  const key = KEYS.exposure(metal);
  try {
    const raw = await redis.get(key);
    const exposure: any = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : { netGrams: 0, lastUpdated: 0, buyGrams: 0, sellGrams: 0 };

    if (side === 'buy') {
      exposure.buyGrams = (exposure.buyGrams || 0) + grams;
      exposure.netGrams = (exposure.netGrams || 0) + grams;
    } else {
      exposure.sellGrams = (exposure.sellGrams || 0) + grams;
      exposure.netGrams = (exposure.netGrams || 0) - grams;
    }
    exposure.lastUpdated = Date.now();

    await redis.set(key, JSON.stringify(exposure), { ex: 86400 });
  } catch (e) {
    console.error('Exposure tracker error:', e);
  }
}

// ============================================
// EXPOSURE DASHBOARD
// ============================================

export async function getExposureSnapshot(): Promise<ExposureSnapshot[]> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const snapshots: ExposureSnapshot[] = [];

  // Get approximate spot prices for USD conversion
  const spotPrices: Record<string, number> = { AUXG: 160, AUXS: 3, AUXPT: 80, AUXPD: 55 };
  try {
    const priceCache = await redis.get('metal:prices:cache');
    if (priceCache) {
      const parsed = typeof priceCache === 'string' ? JSON.parse(priceCache) : priceCache;
      if (parsed.AUXG) spotPrices.AUXG = parsed.AUXG;
      if (parsed.AUXS) spotPrices.AUXS = parsed.AUXS;
      if (parsed.AUXPT) spotPrices.AUXPT = parsed.AUXPT;
      if (parsed.AUXPD) spotPrices.AUXPD = parsed.AUXPD;
    }
  } catch { /* use defaults */ }

  for (const metal of metals) {
    const raw = await redis.get(KEYS.exposure(metal));
    const exposure: any = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : { netGrams: 0, lastUpdated: Date.now(), buyGrams: 0, sellGrams: 0 };

    const spot = spotPrices[metal] || 100;
    const netGrams = exposure.netGrams || 0;
    const hedgedGrams = exposure.buyGrams || 0; // Simplified — actual from open positions
    const unhedgedGrams = Math.abs(netGrams);

    let riskLevel: ExposureSnapshot['riskLevel'] = 'flat';
    if (Math.abs(netGrams) < 0.01) riskLevel = 'flat';
    else if (unhedgedGrams <= 5) riskLevel = 'hedged';
    else if (unhedgedGrams <= 50) riskLevel = 'exposed';
    else riskLevel = 'critical';

    snapshots.push({
      metal,
      netExposureGrams: netGrams,
      netExposureUSD: netGrams * spot,
      openHedges: 0, // Will be populated from open positions
      hedgedGrams,
      unhedgedGrams,
      exposureTimeMs: Date.now() - (exposure.lastUpdated || Date.now()),
      riskLevel,
    });
  }

  // Count open hedges per metal
  const openIds = await redis.lrange(KEYS.openPositions, 0, -1);
  for (const id of openIds) {
    try {
      const raw = await redis.get(KEYS.hedgeDetail(id as string));
      if (raw) {
        const pos: HedgePosition = typeof raw === 'string' ? JSON.parse(raw) : raw as HedgePosition;
        const snap = snapshots.find(s => s.metal === pos.metal);
        if (snap) {
          snap.openHedges++;
          snap.hedgedGrams += pos.grams - pos.closedGrams;
        }
      }
    } catch { /* skip */ }
  }

  return snapshots;
}

// ============================================
// OPEN POSITIONS LIST
// ============================================

export async function getOpenHedgePositions(): Promise<HedgePosition[]> {
  const ids = await redis.lrange(KEYS.openPositions, 0, -1);
  const positions: HedgePosition[] = [];

  for (const id of ids) {
    try {
      const raw = await redis.get(KEYS.hedgeDetail(id as string));
      if (raw) {
        positions.push(typeof raw === 'string' ? JSON.parse(raw) : raw as HedgePosition);
      }
    } catch { /* skip */ }
  }

  return positions;
}

// ============================================
// STATS
// ============================================

async function updateHedgeStats(action: 'opened' | 'closed', volumeUSD: number): Promise<void> {
  try {
    const raw = await redis.get(KEYS.stats);
    const stats: any = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : { hedgesOpened: 0, hedgesClosed: 0, totalHedgeVolumeUSD: 0, totalPnL: 0 };

    if (action === 'opened') {
      stats.hedgesOpened++;
      stats.totalHedgeVolumeUSD += volumeUSD;
    } else {
      stats.hedgesClosed++;
    }

    await redis.set(KEYS.stats, JSON.stringify(stats));
  } catch (e) {
    console.error('Hedge stats error:', e);
  }
}

export async function getHedgeStats(): Promise<{
  hedgesOpened: number;
  hedgesClosed: number;
  totalHedgeVolumeUSD: number;
  totalPnL: number;
  openPositionCount: number;
}> {
  try {
    const raw = await redis.get(KEYS.stats);
    const stats: any = raw
      ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
      : {};

    const openCount = await redis.llen(KEYS.openPositions);

    return {
      hedgesOpened: stats.hedgesOpened || 0,
      hedgesClosed: stats.hedgesClosed || 0,
      totalHedgeVolumeUSD: stats.totalHedgeVolumeUSD || 0,
      totalPnL: stats.totalPnL || 0,
      openPositionCount: openCount || 0,
    };
  } catch {
    return { hedgesOpened: 0, hedgesClosed: 0, totalHedgeVolumeUSD: 0, totalPnL: 0, openPositionCount: 0 };
  }
}

// ============================================
// EXPOSURE ALERTS
// ============================================

export async function checkExposureAlerts(): Promise<{
  alerts: { metal: string; message: string; severity: 'warning' | 'critical' }[];
}> {
  const config = await getHedgeConfig();
  const snapshots = await getExposureSnapshot();
  const alerts: { metal: string; message: string; severity: 'warning' | 'critical' }[] = [];

  for (const snap of snapshots) {
    const metalKey = METAL_KEY_MAP[snap.metal] || 'gold';
    const maxMs = config.maxExposureMs[metalKey as keyof typeof config.maxExposureMs] || 60000;
    const buffer = config.microBuffer[metalKey as keyof typeof config.microBuffer] || 0;

    if (snap.unhedgedGrams > buffer && snap.exposureTimeMs > maxMs) {
      alerts.push({
        metal: snap.metal,
        message: `${snap.metal}: ${snap.unhedgedGrams.toFixed(2)}g unhedged for ${Math.round(snap.exposureTimeMs / 1000)}s (max: ${maxMs / 1000}s)`,
        severity: snap.riskLevel === 'critical' ? 'critical' : 'warning',
      });
    }

    // Palladium special rule: ANY inventory = alert
    if (snap.metal === 'AUXPD' && Math.abs(snap.netExposureGrams) > 0.01) {
      alerts.push({
        metal: 'AUXPD',
        message: `PALLADIUM: ${snap.netExposureGrams.toFixed(2)}g net exposure. INVENTORY FORBIDDEN.`,
        severity: 'critical',
      });
    }
  }

  return { alerts };
}
