/**
 * Recurring Buy / Dollar Cost Averaging (DCA)
 * Otomatik düzenli alım sistemi
 */

import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export type RecurringStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'failed';

export interface RecurringBuy {
  id: string;
  walletAddress: string;
  
  // Ne alınacak
  token: string; // BTC, ETH, AUXG, etc.
  
  // Ne kadar
  amount: number; // USD cinsinden
  
  // Ne sıklıkla
  frequency: RecurringFrequency;
  dayOfWeek?: number; // 0-6 (weekly için)
  dayOfMonth?: number; // 1-28 (monthly için)
  hour: number; // 0-23 UTC
  
  // Durum
  status: RecurringStatus;
  
  // Ödeme kaynağı
  paymentSource: 'usd_balance' | 'usdt_balance' | 'bank';
  
  // İstatistikler
  stats: {
    totalPurchased: number; // Toplam alınan miktar (token)
    totalSpent: number; // Toplam harcanan (USD)
    averagePrice: number; // Ortalama alım fiyatı
    executionCount: number; // Kaç kez çalıştı
    lastExecutedAt?: string;
    nextExecutionAt?: string;
  };
  
  // Limitler
  endDate?: string; // Bitiş tarihi (opsiyonel)
  maxExecutions?: number; // Maksimum çalışma sayısı
  minPrice?: number; // Minimum fiyat (altındaysa alma)
  maxPrice?: number; // Maksimum fiyat (üstündeyse alma)
  
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExecution {
  id: string;
  recurringBuyId: string;
  status: 'success' | 'failed' | 'skipped';
  amount: number; // USD
  tokenAmount: number; // Alınan token miktarı
  price: number; // Alım anındaki fiyat
  reason?: string; // Başarısızlık/skip nedeni
  executedAt: string;
}

export interface CreateRecurringBuyParams {
  walletAddress: string;
  token: string;
  amount: number;
  frequency: RecurringFrequency;
  paymentSource: 'usd_balance' | 'usdt_balance';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour?: number;
  endDate?: string;
  maxExecutions?: number;
  minPrice?: number;
  maxPrice?: number;
}

// ============================================
// CONSTANTS
// ============================================

export const FREQUENCY_LABELS = {
  tr: {
    daily: 'Günlük',
    weekly: 'Haftalık',
    biweekly: 'İki Haftada Bir',
    monthly: 'Aylık',
  },
  en: {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
  },
};

export const DAY_LABELS = {
  tr: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export const MIN_AMOUNT = 10; // Minimum $10
export const MAX_AMOUNT = 10000; // Maximum $10,000

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Recurring buy ID oluştur
 */
export function generateRecurringBuyId(): string {
  return `rcb_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Execution ID oluştur
 */
export function generateExecutionId(): string {
  return `exe_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Yeni recurring buy oluştur
 */
export function createRecurringBuy(params: CreateRecurringBuyParams): RecurringBuy {
  const now = new Date();
  const nextExecution = calculateNextExecution(
    params.frequency,
    params.hour || 12,
    params.dayOfWeek,
    params.dayOfMonth
  );

  return {
    id: generateRecurringBuyId(),
    walletAddress: params.walletAddress,
    token: params.token.toUpperCase(),
    amount: params.amount,
    frequency: params.frequency,
    dayOfWeek: params.dayOfWeek,
    dayOfMonth: params.dayOfMonth,
    hour: params.hour || 12,
    status: 'active',
    paymentSource: params.paymentSource,
    stats: {
      totalPurchased: 0,
      totalSpent: 0,
      averagePrice: 0,
      executionCount: 0,
      nextExecutionAt: nextExecution.toISOString(),
    },
    endDate: params.endDate,
    maxExecutions: params.maxExecutions,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Sonraki çalışma zamanını hesapla
 */
export function calculateNextExecution(
  frequency: RecurringFrequency,
  hour: number,
  dayOfWeek?: number,
  dayOfMonth?: number,
  fromDate: Date = new Date()
): Date {
  const next = new Date(fromDate);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(hour);

  switch (frequency) {
    case 'daily':
      // Bugün geçtiyse yarın
      if (next <= fromDate) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      break;

    case 'weekly':
      const targetDay = dayOfWeek ?? 1; // Varsayılan Pazartesi
      const currentDay = next.getUTCDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0 || (daysUntil === 0 && next <= fromDate)) {
        daysUntil += 7;
      }
      next.setUTCDate(next.getUTCDate() + daysUntil);
      break;

    case 'biweekly':
      const biweeklyDay = dayOfWeek ?? 1;
      const currentBiweeklyDay = next.getUTCDay();
      let daysUntilBiweekly = biweeklyDay - currentBiweeklyDay;
      if (daysUntilBiweekly <= 0 || (daysUntilBiweekly === 0 && next <= fromDate)) {
        daysUntilBiweekly += 14;
      }
      next.setUTCDate(next.getUTCDate() + daysUntilBiweekly);
      break;

    case 'monthly':
      const targetDate = dayOfMonth ?? 1;
      next.setUTCDate(targetDate);
      if (next <= fromDate) {
        next.setUTCMonth(next.getUTCMonth() + 1);
      }
      // Ay sonunu aşarsa ayın son gününe ayarla
      const lastDay = new Date(next.getUTCFullYear(), next.getUTCMonth() + 1, 0).getUTCDate();
      if (targetDate > lastDay) {
        next.setUTCDate(lastDay);
      }
      break;
  }

  return next;
}

/**
 * Execution sonrası stats güncelle
 */
export function updateStatsAfterExecution(
  recurringBuy: RecurringBuy,
  execution: RecurringExecution
): RecurringBuy {
  const stats = { ...recurringBuy.stats };

  if (execution.status === 'success') {
    stats.totalPurchased += execution.tokenAmount;
    stats.totalSpent += execution.amount;
    stats.executionCount += 1;
    stats.averagePrice = stats.totalSpent / stats.totalPurchased;
    stats.lastExecutedAt = execution.executedAt;
  }

  // Sonraki çalışma zamanını hesapla
  stats.nextExecutionAt = calculateNextExecution(
    recurringBuy.frequency,
    recurringBuy.hour,
    recurringBuy.dayOfWeek,
    recurringBuy.dayOfMonth,
    new Date(execution.executedAt)
  ).toISOString();

  // Maksimum çalışma kontrolü
  if (recurringBuy.maxExecutions && stats.executionCount >= recurringBuy.maxExecutions) {
    return {
      ...recurringBuy,
      stats,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
  }

  // Bitiş tarihi kontrolü
  if (recurringBuy.endDate && new Date(stats.nextExecutionAt) > new Date(recurringBuy.endDate)) {
    return {
      ...recurringBuy,
      stats,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...recurringBuy,
    stats,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fiyat limitlerine uygun mu kontrol et
 */
export function checkPriceLimits(
  recurringBuy: RecurringBuy,
  currentPrice: number
): { allowed: boolean; reason?: string } {
  if (recurringBuy.minPrice && currentPrice < recurringBuy.minPrice) {
    return { 
      allowed: false, 
      reason: `Fiyat minimum limitin ($${recurringBuy.minPrice}) altında` 
    };
  }

  if (recurringBuy.maxPrice && currentPrice > recurringBuy.maxPrice) {
    return { 
      allowed: false, 
      reason: `Fiyat maksimum limitin ($${recurringBuy.maxPrice}) üstünde` 
    };
  }

  return { allowed: true };
}

/**
 * Özet formatla
 */
export function formatRecurringSummary(
  recurringBuy: RecurringBuy,
  lang: 'tr' | 'en'
): string {
  const freq = FREQUENCY_LABELS[lang][recurringBuy.frequency];
  return `$${recurringBuy.amount} ${recurringBuy.token} - ${freq}`;
}
