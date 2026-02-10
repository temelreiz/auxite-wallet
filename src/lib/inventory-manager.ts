// ============================================
// AUXITE INVENTORY MANAGER
// ============================================
// "Never bet on price. Never hold directional inventory."
//
// RULES:
//   ❌ Net inventory tutma
//   ❌ Fiyat beklentisiyle pozisyon alma
//   ❌ "Biraz fiyat tutalım" — dealer ölümü
//
// ALLOWED:
//   ✅ Micro buffer (dakikalık, operational)
//   ✅ Leased metal = encumbered (ayrı tracking)
//   ✅ Pending allocation = temporary
//
// This module enforces zero-inventory policy across all metals.
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// TYPES
// ============================================

export interface InventoryPosition {
  metal: string;
  totalGrams: number;            // Gross holding
  allocatedToClients: number;    // Client-owned, held in custody
  leasedOut: number;             // Under lease contracts (encumbered)
  pendingAllocation: number;     // In-flight, not yet allocated
  microBuffer: number;           // Operational buffer (sub-minute)
  netDirectional: number;        // MUST BE ~0 — this is the danger number
}

export interface InventoryConfig {
  // Max allowed net directional per metal (grams)
  maxNetDirectional: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
  // Alert threshold (% of max)
  alertThresholdPercent: number;
  // Hard block threshold — reject orders if exceeded
  hardBlockEnabled: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CONFIG: InventoryConfig = {
  maxNetDirectional: {
    gold: 10,         // 10g max (~$1,600)
    silver: 200,      // 200g max (~$600)
    platinum: 5,      // 5g max (~$400)
    palladium: 0,     // 0g — ZERO TOLERANCE
  },
  alertThresholdPercent: 50,
  hardBlockEnabled: true,
};

const METAL_KEY_MAP: Record<string, string> = {
  AUXG: 'gold', AUXS: 'silver', AUXPT: 'platinum', AUXPD: 'palladium',
};

const KEYS = {
  config: 'inventory:config',
  position: (metal: string) => `inventory:position:${metal.toUpperCase()}`,
  violations: 'inventory:violations',
  dailySnapshot: (date: string) => `inventory:snapshot:${date}`,
};

// ============================================
// CONFIG
// ============================================

export async function getInventoryConfig(): Promise<InventoryConfig> {
  try {
    const raw = await redis.get(KEYS.config);
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function setInventoryConfig(config: Partial<InventoryConfig>): Promise<InventoryConfig> {
  const current = await getInventoryConfig();
  const updated = { ...current, ...config };
  await redis.set(KEYS.config, JSON.stringify(updated));
  return updated;
}

// ============================================
// CORE: CHECK IF ORDER IS ALLOWED
// ============================================
// Called before any execution — blocks if it would create forbidden inventory

export async function checkOrderAllowed(
  metal: string,
  grams: number,
  side: 'buy' | 'sell',
): Promise<{ allowed: boolean; reason?: string; currentNet: number; afterNet: number }> {
  const config = await getInventoryConfig();
  const metalKey = METAL_KEY_MAP[metal.toUpperCase()] || 'gold';
  const maxNet = config.maxNetDirectional[metalKey as keyof typeof config.maxNetDirectional] ?? 10;

  const position = await getPosition(metal);
  const currentNet = position.netDirectional;

  // Calculate what net would be after this order
  // BUY = we acquire inventory (positive direction)
  // SELL = we release inventory (negative direction)
  const delta = side === 'buy' ? grams : -grams;
  const afterNet = currentNet + delta;

  // Check against limits
  if (config.hardBlockEnabled && Math.abs(afterNet) > maxNet) {
    // Log violation
    await recordViolation(metal, side, grams, currentNet, afterNet, maxNet);

    return {
      allowed: false,
      reason: `Would exceed max net directional: ${Math.abs(afterNet).toFixed(2)}g > ${maxNet}g limit for ${metal}`,
      currentNet,
      afterNet,
    };
  }

  return { allowed: true, currentNet, afterNet };
}

// ============================================
// POSITION TRACKING
// ============================================

export async function getPosition(metal: string): Promise<InventoryPosition> {
  try {
    const raw = await redis.get(KEYS.position(metal));
    if (raw) {
      return typeof raw === 'string' ? JSON.parse(raw) : raw as InventoryPosition;
    }
    return {
      metal: metal.toUpperCase(),
      totalGrams: 0,
      allocatedToClients: 0,
      leasedOut: 0,
      pendingAllocation: 0,
      microBuffer: 0,
      netDirectional: 0,
    };
  } catch {
    return {
      metal: metal.toUpperCase(),
      totalGrams: 0,
      allocatedToClients: 0,
      leasedOut: 0,
      pendingAllocation: 0,
      microBuffer: 0,
      netDirectional: 0,
    };
  }
}

export async function updatePosition(
  metal: string,
  updates: Partial<InventoryPosition>,
): Promise<InventoryPosition> {
  const current = await getPosition(metal);
  const updated: InventoryPosition = {
    ...current,
    ...updates,
    metal: metal.toUpperCase(),
  };

  // Recalculate net directional
  updated.netDirectional = updated.totalGrams
    - updated.allocatedToClients
    - updated.leasedOut
    - updated.pendingAllocation;

  await redis.set(KEYS.position(metal), JSON.stringify(updated));
  return updated;
}

// Convenience: record that client allocation happened
export async function recordClientAllocation(metal: string, grams: number): Promise<void> {
  const pos = await getPosition(metal);
  await updatePosition(metal, {
    totalGrams: pos.totalGrams + grams,
    allocatedToClients: pos.allocatedToClients + grams,
  });
}

// Convenience: record that client de-allocated (sold)
export async function recordClientDeallocation(metal: string, grams: number): Promise<void> {
  const pos = await getPosition(metal);
  await updatePosition(metal, {
    totalGrams: Math.max(0, pos.totalGrams - grams),
    allocatedToClients: Math.max(0, pos.allocatedToClients - grams),
  });
}

// Convenience: record lease
export async function recordLease(metal: string, grams: number): Promise<void> {
  const pos = await getPosition(metal);
  await updatePosition(metal, {
    leasedOut: pos.leasedOut + grams,
  });
}

// Convenience: record lease return
export async function recordLeaseReturn(metal: string, grams: number): Promise<void> {
  const pos = await getPosition(metal);
  await updatePosition(metal, {
    leasedOut: Math.max(0, pos.leasedOut - grams),
  });
}

// ============================================
// ALL POSITIONS SNAPSHOT
// ============================================

export async function getAllPositions(): Promise<InventoryPosition[]> {
  const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
  const positions: InventoryPosition[] = [];

  for (const metal of metals) {
    positions.push(await getPosition(metal));
  }

  return positions;
}

// ============================================
// VIOLATION TRACKING
// ============================================

async function recordViolation(
  metal: string,
  side: 'buy' | 'sell',
  grams: number,
  currentNet: number,
  wouldBeNet: number,
  maxAllowed: number,
): Promise<void> {
  const violation = {
    metal,
    side,
    grams,
    currentNet,
    wouldBeNet,
    maxAllowed,
    timestamp: Date.now(),
    blocked: true,
  };
  await redis.lpush(KEYS.violations, JSON.stringify(violation));
  await redis.ltrim(KEYS.violations, 0, 99);
  console.warn(`🚨 INVENTORY VIOLATION BLOCKED: ${metal} ${side} ${grams}g would create ${wouldBeNet.toFixed(2)}g net (max: ${maxAllowed}g)`);
}

export async function getViolations(limit: number = 20): Promise<any[]> {
  try {
    const raw = await redis.lrange(KEYS.violations, 0, limit - 1);
    return raw.map((r) => {
      try { return typeof r === 'string' ? JSON.parse(r) : r; }
      catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

// ============================================
// DAILY SNAPSHOT (for reporting)
// ============================================

export async function takeDailySnapshot(): Promise<void> {
  const date = new Date().toISOString().split('T')[0];
  const positions = await getAllPositions();
  await redis.set(KEYS.dailySnapshot(date), JSON.stringify({
    date,
    positions,
    timestamp: Date.now(),
  }), { ex: 90 * 86400 }); // Keep 90 days
}

// ============================================
// RISK SUMMARY
// ============================================

export async function getRiskSummary(): Promise<{
  totalNetExposureUSD: number;
  positions: InventoryPosition[];
  violations: any[];
  isHealthy: boolean;
  alerts: string[];
}> {
  const positions = await getAllPositions();
  const violations = await getViolations(5);
  const config = await getInventoryConfig();

  const spotPrices: Record<string, number> = { AUXG: 160, AUXS: 3, AUXPT: 80, AUXPD: 55 };

  let totalNetUSD = 0;
  const alerts: string[] = [];

  for (const pos of positions) {
    const spot = spotPrices[pos.metal] || 100;
    totalNetUSD += pos.netDirectional * spot;

    const metalKey = METAL_KEY_MAP[pos.metal] || 'gold';
    const maxNet = config.maxNetDirectional[metalKey as keyof typeof config.maxNetDirectional] ?? 10;
    const threshold = maxNet * (config.alertThresholdPercent / 100);

    if (Math.abs(pos.netDirectional) > threshold && maxNet > 0) {
      alerts.push(`${pos.metal}: ${pos.netDirectional.toFixed(2)}g net (${((Math.abs(pos.netDirectional) / maxNet) * 100).toFixed(0)}% of limit)`);
    }

    // Palladium special
    if (pos.metal === 'AUXPD' && Math.abs(pos.netDirectional) > 0.01) {
      alerts.push(`CRITICAL: Palladium has ${pos.netDirectional.toFixed(2)}g directional exposure`);
    }
  }

  return {
    totalNetExposureUSD: totalNetUSD,
    positions,
    violations,
    isHealthy: alerts.length === 0 && Math.abs(totalNetUSD) < 5000,
    alerts,
  };
}
