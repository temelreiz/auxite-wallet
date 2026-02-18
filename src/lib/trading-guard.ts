// src/lib/trading-guard.ts
// Kill Switch / Trading Disable — Redis-backed guard for all trade routes
// Reads existing admin panel flags: mobile:maintenance + mobile:features

import { getRedis } from './redis';

type TradingFeature =
  | 'metalTrading'
  | 'cryptoTrading'
  | 'cryptoWithdraw'
  | 'cryptoDeposit'
  | 'fiatDeposit'
  | 'fiatWithdraw'
  | 'leasing'
  | 'staking'
  | 'p2pTransfer';

interface TradingStatus {
  allowed: boolean;
  reason?: 'maintenance' | 'feature_disabled';
  message?: { tr: string; en: string };
}

const DEFAULT_MAINTENANCE_MSG = {
  tr: 'Sistem bakımda. Lütfen daha sonra tekrar deneyin.',
  en: 'System is under maintenance. Please try again later.',
};

const DEFAULT_FEATURE_MSG: Record<string, { tr: string; en: string }> = {
  metalTrading:   { tr: 'Metal alım-satım geçici olarak durduruldu.', en: 'Metal trading is temporarily disabled.' },
  cryptoTrading:  { tr: 'Kripto alım-satım geçici olarak durduruldu.', en: 'Crypto trading is temporarily disabled.' },
  cryptoWithdraw: { tr: 'Kripto çekim geçici olarak durduruldu.', en: 'Crypto withdrawal is temporarily disabled.' },
  cryptoDeposit:  { tr: 'Kripto yatırma geçici olarak durduruldu.', en: 'Crypto deposit is temporarily disabled.' },
  fiatDeposit:    { tr: 'Fiat yatırma geçici olarak durduruldu.', en: 'Fiat deposit is temporarily disabled.' },
  fiatWithdraw:   { tr: 'Fiat çekim geçici olarak durduruldu.', en: 'Fiat withdrawal is temporarily disabled.' },
  leasing:        { tr: 'Leasing geçici olarak durduruldu.', en: 'Leasing is temporarily disabled.' },
  staking:        { tr: 'Staking geçici olarak durduruldu.', en: 'Staking is temporarily disabled.' },
  p2pTransfer:    { tr: 'P2P transfer geçici olarak durduruldu.', en: 'P2P transfer is temporarily disabled.' },
};

/**
 * Check if a specific trading feature is allowed.
 * Reads from Redis keys set by admin panel:
 *   - mobile:maintenance  → global kill switch
 *   - mobile:features     → per-feature toggle
 *
 * Returns { allowed: true } if trading is permitted.
 * Returns { allowed: false, reason, message } if blocked.
 */
export async function checkTradingAllowed(feature: TradingFeature): Promise<TradingStatus> {
  try {
    const redis = getRedis();

    // 1. Global maintenance check (kill switch)
    const maintenance = await redis.get('mobile:maintenance') as any;
    if (maintenance && typeof maintenance === 'object' && maintenance.enabled === true) {
      return {
        allowed: false,
        reason: 'maintenance',
        message: maintenance.message || DEFAULT_MAINTENANCE_MSG,
      };
    }

    // 2. Per-feature flag check
    const features = await redis.get('mobile:features') as any;
    if (features && typeof features === 'object' && features[feature] === false) {
      return {
        allowed: false,
        reason: 'feature_disabled',
        message: DEFAULT_FEATURE_MSG[feature] || DEFAULT_MAINTENANCE_MSG,
      };
    }

    return { allowed: true };
  } catch (error) {
    // Redis down — fail open (allow trading)
    // Better to allow trades than block everything on Redis failure
    console.error('[trading-guard] Redis check failed, allowing trade:', error);
    return { allowed: true };
  }
}
