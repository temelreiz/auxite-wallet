// Spread Configuration - Admin controlled buy/sell margins
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface MetalSpreadConfig {
  gold: { buy: number; sell: number };
  silver: { buy: number; sell: number };
  platinum: { buy: number; sell: number };
  palladium: { buy: number; sell: number };
}

export interface CryptoSpreadConfig {
  btc: { buy: number; sell: number };
  eth: { buy: number; sell: number };
  xrp: { buy: number; sell: number };
  sol: { buy: number; sell: number };
  usdt: { buy: number; sell: number };
}

export interface SpreadConfig {
  metals: MetalSpreadConfig;
  crypto: CryptoSpreadConfig;
}

const DEFAULT_SPREAD: SpreadConfig = {
  metals: {
    gold: { buy: 1.5, sell: 1.5 },
    silver: { buy: 2.0, sell: 2.0 },
    platinum: { buy: 2.0, sell: 2.0 },
    palladium: { buy: 2.5, sell: 2.5 },
  },
  crypto: {
    btc: { buy: 1.0, sell: 1.0 },
    eth: { buy: 1.0, sell: 1.0 },
    xrp: { buy: 1.5, sell: 1.5 },
    sol: { buy: 1.5, sell: 1.5 },
    usdt: { buy: 0.1, sell: 0.1 },
  },
};

/**
 * Get spread config from Redis or defaults
 */
export async function getSpreadConfig(): Promise<SpreadConfig> {
  try {
    const config = await redis.get('admin:spread:config:v2');
    
    if (config) {
      const parsed = typeof config === 'string' ? JSON.parse(config) : config;
      if (parsed.metals && parsed.crypto) {
        return parsed as SpreadConfig;
      }
    }
    
    // Check for legacy config and migrate
    const legacyConfig = await redis.get('admin:spread:config');
    if (legacyConfig) {
      const parsed = typeof legacyConfig === 'string' ? JSON.parse(legacyConfig) : legacyConfig;
      if (parsed.gold) {
        // Migrate legacy to new format
        const migrated: SpreadConfig = {
          metals: {
            gold: parsed.gold || DEFAULT_SPREAD.metals.gold,
            silver: parsed.silver || DEFAULT_SPREAD.metals.silver,
            platinum: parsed.platinum || DEFAULT_SPREAD.metals.platinum,
            palladium: parsed.palladium || DEFAULT_SPREAD.metals.palladium,
          },
          crypto: DEFAULT_SPREAD.crypto,
        };
        await redis.set('admin:spread:config:v2', JSON.stringify(migrated));
        return migrated;
      }
    }
    
    return DEFAULT_SPREAD;
  } catch (error) {
    console.error('Error getting spread config:', error);
    return DEFAULT_SPREAD;
  }
}

/**
 * Set spread config for a single asset (admin only)
 */
export async function setSpreadConfig(
  type: 'metal' | 'crypto',
  key: string,
  values: { buy: number; sell: number }
): Promise<void> {
  const current = await getSpreadConfig();
  
  if (type === 'metal') {
    current.metals[key as keyof MetalSpreadConfig] = values;
  } else {
    current.crypto[key as keyof CryptoSpreadConfig] = values;
  }
  
  await redis.set('admin:spread:config:v2', JSON.stringify(current));
}

/**
 * Set entire spread config at once
 */
export async function setFullSpreadConfig(config: Partial<SpreadConfig>): Promise<void> {
  const current = await getSpreadConfig();
  const updated = {
    metals: { ...current.metals, ...config.metals },
    crypto: { ...current.crypto, ...config.crypto },
  };
  await redis.set('admin:spread:config:v2', JSON.stringify(updated));
}

/**
 * Get spread for specific metal
 */
export async function getMetalSpread(metal: string): Promise<{ buy: number; sell: number }> {
  const config = await getSpreadConfig();
  
  switch (metal.toUpperCase()) {
    case 'AUXG': case 'GOLD': return config.metals.gold;
    case 'AUXS': case 'SILVER': return config.metals.silver;
    case 'AUXPT': case 'PLATINUM': return config.metals.platinum;
    case 'AUXPD': case 'PALLADIUM': return config.metals.palladium;
    default: return { buy: 2.0, sell: 2.0 };
  }
}

/**
 * Get spread for specific crypto
 */
export async function getCryptoSpread(crypto: string): Promise<{ buy: number; sell: number }> {
  const config = await getSpreadConfig();
  
  switch (crypto.toUpperCase()) {
    case 'BTC': case 'BITCOIN': return config.crypto.btc;
    case 'ETH': case 'ETHEREUM': return config.crypto.eth;
    case 'XRP': case 'RIPPLE': return config.crypto.xrp;
    case 'SOL': case 'SOLANA': return config.crypto.sol;
    case 'USDT': case 'TETHER': return config.crypto.usdt;
    default: return { buy: 1.0, sell: 1.0 };
  }
}

/**
 * Apply spread to price
 * Buy: Customer pays MORE (price + spread%)
 * Sell: Customer receives LESS (price - spread%)
 */
export function applySpread(
  basePrice: number, 
  type: 'buy' | 'sell', 
  spreadPercent: number
): number {
  if (type === 'buy') {
    return basePrice * (1 + spreadPercent / 100);
  } else {
    return basePrice * (1 - spreadPercent / 100);
  }
}
