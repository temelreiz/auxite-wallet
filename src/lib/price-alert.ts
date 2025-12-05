/**
 * Price Alert System
 * Fiyat uyarısı oluşturma, kontrol ve tetikleme
 */

import crypto from 'crypto';

// Types
export interface PriceAlert {
  id: string;
  walletAddress: string;
  token: string;
  targetPrice: number;
  direction: 'above' | 'below';
  currentPrice?: number;
  status: 'active' | 'triggered' | 'expired' | 'cancelled';
  createdAt: string;
  triggeredAt?: string;
  expiresAt?: string;
  notificationSent: boolean;
  repeat: boolean; // Tekrar aktif olsun mu?
}

export interface CreateAlertParams {
  walletAddress: string;
  token: string;
  targetPrice: number;
  direction: 'above' | 'below';
  expiresInDays?: number;
  repeat?: boolean;
}

// Desteklenen tokenlar
export const SUPPORTED_TOKENS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'AUXG', name: 'Auxite Gold' },
  { symbol: 'AUXS', name: 'Auxite Silver' },
  { symbol: 'AUXPT', name: 'Auxite Platinum' },
  { symbol: 'AUXPD', name: 'Auxite Palladium' },
  { symbol: 'USDT', name: 'Tether' },
];

/**
 * Alert ID oluştur
 */
export function generateAlertId(): string {
  return `alert_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Yeni fiyat uyarısı oluştur
 */
export function createAlert(params: CreateAlertParams): PriceAlert {
  const now = new Date();
  const expiresAt = params.expiresInDays 
    ? new Date(now.getTime() + params.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  return {
    id: generateAlertId(),
    walletAddress: params.walletAddress,
    token: params.token.toUpperCase(),
    targetPrice: params.targetPrice,
    direction: params.direction,
    status: 'active',
    createdAt: now.toISOString(),
    expiresAt,
    notificationSent: false,
    repeat: params.repeat || false,
  };
}

/**
 * Fiyat kontrolü - uyarı tetiklenmeli mi?
 */
export function checkAlertCondition(alert: PriceAlert, currentPrice: number): boolean {
  if (alert.status !== 'active') return false;

  if (alert.direction === 'above') {
    return currentPrice >= alert.targetPrice;
  } else {
    return currentPrice <= alert.targetPrice;
  }
}

/**
 * Uyarıyı tetikle
 */
export function triggerAlert(alert: PriceAlert, currentPrice: number): PriceAlert {
  return {
    ...alert,
    status: 'triggered',
    currentPrice,
    triggeredAt: new Date().toISOString(),
    notificationSent: true,
  };
}

/**
 * Tekrarlayan uyarıyı yeniden aktifle
 */
export function resetRepeatingAlert(alert: PriceAlert): PriceAlert | null {
  if (!alert.repeat || alert.status !== 'triggered') {
    return null;
  }

  return {
    ...alert,
    status: 'active',
    triggeredAt: undefined,
    notificationSent: false,
    // Hedef fiyatı %5 uzaklaştır
    targetPrice: alert.direction === 'above' 
      ? alert.targetPrice * 1.05 
      : alert.targetPrice * 0.95,
  };
}

/**
 * Süresi dolmuş uyarıları işaretle
 */
export function checkExpiration(alert: PriceAlert): PriceAlert {
  if (alert.status !== 'active' || !alert.expiresAt) {
    return alert;
  }

  if (new Date() > new Date(alert.expiresAt)) {
    return { ...alert, status: 'expired' };
  }

  return alert;
}

/**
 * Uyarı özeti formatla
 */
export function formatAlertSummary(alert: PriceAlert, lang: 'tr' | 'en' = 'tr'): string {
  const direction = lang === 'tr'
    ? (alert.direction === 'above' ? 'üstüne çıktığında' : 'altına düştüğünde')
    : (alert.direction === 'above' ? 'goes above' : 'drops below');

  return `${alert.token} $${alert.targetPrice.toLocaleString()} ${direction}`;
}

/**
 * Farkı yüzde olarak hesapla
 */
export function calculatePriceDifference(currentPrice: number, targetPrice: number): {
  percentage: number;
  direction: 'up' | 'down';
} {
  const diff = ((targetPrice - currentPrice) / currentPrice) * 100;
  return {
    percentage: Math.abs(diff),
    direction: diff > 0 ? 'up' : 'down',
  };
}

/**
 * Önerilen fiyat hedefleri
 */
export function getSuggestedTargets(
  currentPrice: number,
  direction: 'above' | 'below'
): number[] {
  const percentages = direction === 'above' 
    ? [1, 2, 5, 10, 20] 
    : [1, 2, 5, 10, 20];

  return percentages.map(pct => {
    const multiplier = direction === 'above' ? (1 + pct / 100) : (1 - pct / 100);
    return Math.round(currentPrice * multiplier * 100) / 100;
  });
}
