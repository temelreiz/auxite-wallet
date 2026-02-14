// Settlement Exit Spread Configuration
// Separate from trading spread — custody unwind pricing
// Redis key: admin:settlement:spread
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface SettlementSpreadConfig {
  gold: number;       // Exit spread % for AUXG
  silver: number;     // Exit spread % for AUXS
  platinum: number;   // Exit spread % for AUXPT
  palladium: number;  // Exit spread % for AUXPD
}

// Blueprint: 0.60-0.80% exit spread (vs 1.5% trading)
const DEFAULT_SETTLEMENT_SPREAD: SettlementSpreadConfig = {
  gold: 0.65,
  silver: 0.80,
  platinum: 0.80,
  palladium: 0.80,
};

const REDIS_KEY = 'admin:settlement:spread';

/**
 * Get settlement exit spread config from Redis or defaults
 */
export async function getSettlementSpreadConfig(): Promise<SettlementSpreadConfig> {
  try {
    const config = await redis.get(REDIS_KEY);
    if (config) {
      const parsed = typeof config === 'string' ? JSON.parse(config) : config;
      return { ...DEFAULT_SETTLEMENT_SPREAD, ...parsed };
    }
    return DEFAULT_SETTLEMENT_SPREAD;
  } catch (error) {
    console.error('Error getting settlement spread config:', error);
    return DEFAULT_SETTLEMENT_SPREAD;
  }
}

/**
 * Get exit spread for a specific metal
 */
export async function getSettlementSpread(metal: string): Promise<number> {
  const config = await getSettlementSpreadConfig();
  switch (metal.toUpperCase()) {
    case 'AUXG': case 'GOLD': return config.gold;
    case 'AUXS': case 'SILVER': return config.silver;
    case 'AUXPT': case 'PLATINUM': return config.platinum;
    case 'AUXPD': case 'PALLADIUM': return config.palladium;
    default: return 0.80;
  }
}

/**
 * Set settlement spread config (admin only)
 */
export async function setSettlementSpreadConfig(config: Partial<SettlementSpreadConfig>): Promise<void> {
  const current = await getSettlementSpreadConfig();
  const updated = { ...current, ...config };
  await redis.set(REDIS_KEY, JSON.stringify(updated));
}

/**
 * Apply exit spread to spot price
 * Settlement = Spot - ExitSpread%
 * User always receives LESS than spot (custody unwind cost)
 */
export function applyExitSpread(spotPrice: number, exitSpreadPercent: number): number {
  return spotPrice * (1 - exitSpreadPercent / 100);
}
