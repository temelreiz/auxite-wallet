/**
 * Transaction Limits System
 * Günlük, haftalık, aylık ve tek işlem limitleri
 */

// ============================================
// TYPES
// ============================================

export interface TransactionLimits {
  enabled: boolean;
  daily: LimitConfig;
  weekly: LimitConfig;
  monthly: LimitConfig;
  perTransaction: LimitConfig;
  whitelistedAddresses: string[]; // Bu adreslere limit yok
  updatedAt: string;
}

export interface LimitConfig {
  enabled: boolean;
  amount: number; // USD cinsinden
  used: number; // Kullanılan miktar
  resetAt?: string; // Sıfırlanma zamanı
}

export interface LimitCheckResult {
  allowed: boolean;
  requiresMultiSig: boolean;
  reason?: string;
  limits: {
    daily: { remaining: number; used: number; limit: number };
    weekly: { remaining: number; used: number; limit: number };
    monthly: { remaining: number; used: number; limit: number };
    perTransaction: { limit: number; exceeded: boolean };
  };
}

export interface UsageHistory {
  date: string;
  amount: number;
  token: string;
  type: 'withdraw' | 'transfer';
  txId?: string;
}

// ============================================
// DEFAULT LIMITS
// ============================================

export const DEFAULT_LIMITS: TransactionLimits = {
  enabled: true,
  daily: {
    enabled: true,
    amount: 10000, // $10,000/gün
    used: 0,
  },
  weekly: {
    enabled: true,
    amount: 50000, // $50,000/hafta
    used: 0,
  },
  monthly: {
    enabled: true,
    amount: 150000, // $150,000/ay
    used: 0,
  },
  perTransaction: {
    enabled: true,
    amount: 5000, // $5,000/işlem (üstü multi-sig)
    used: 0,
  },
  whitelistedAddresses: [],
  updatedAt: new Date().toISOString(),
};

// ============================================
// LIMIT TIERS (Account levels)
// ============================================

export const LIMIT_TIERS = {
  basic: {
    name: 'Basic',
    daily: 1000,
    weekly: 5000,
    monthly: 15000,
    perTransaction: 500,
  },
  verified: {
    name: 'Verified',
    daily: 10000,
    weekly: 50000,
    monthly: 150000,
    perTransaction: 5000,
  },
  premium: {
    name: 'Premium',
    daily: 50000,
    weekly: 200000,
    monthly: 500000,
    perTransaction: 25000,
  },
  institutional: {
    name: 'Institutional',
    daily: 500000,
    weekly: 2000000,
    monthly: 5000000,
    perTransaction: 250000,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Limit kontrolü yap
 */
export function checkLimits(
  limits: TransactionLimits,
  amount: number,
  toAddress?: string
): LimitCheckResult {
  // Limitler kapalıysa
  if (!limits.enabled) {
    return {
      allowed: true,
      requiresMultiSig: false,
      limits: {
        daily: { remaining: Infinity, used: 0, limit: Infinity },
        weekly: { remaining: Infinity, used: 0, limit: Infinity },
        monthly: { remaining: Infinity, used: 0, limit: Infinity },
        perTransaction: { limit: Infinity, exceeded: false },
      },
    };
  }

  // Whitelist kontrolü
  if (toAddress && limits.whitelistedAddresses.includes(toAddress.toLowerCase())) {
    return {
      allowed: true,
      requiresMultiSig: false,
      limits: {
        daily: { remaining: Infinity, used: limits.daily.used, limit: limits.daily.amount },
        weekly: { remaining: Infinity, used: limits.weekly.used, limit: limits.weekly.amount },
        monthly: { remaining: Infinity, used: limits.monthly.used, limit: limits.monthly.amount },
        perTransaction: { limit: limits.perTransaction.amount, exceeded: false },
      },
    };
  }

  const dailyRemaining = limits.daily.amount - limits.daily.used;
  const weeklyRemaining = limits.weekly.amount - limits.weekly.used;
  const monthlyRemaining = limits.monthly.amount - limits.monthly.used;
  const perTxExceeded = amount > limits.perTransaction.amount;

  // En düşük kalan limit
  const minRemaining = Math.min(dailyRemaining, weeklyRemaining, monthlyRemaining);

  const result: LimitCheckResult = {
    allowed: amount <= minRemaining,
    requiresMultiSig: perTxExceeded,
    limits: {
      daily: { remaining: dailyRemaining, used: limits.daily.used, limit: limits.daily.amount },
      weekly: { remaining: weeklyRemaining, used: limits.weekly.used, limit: limits.weekly.amount },
      monthly: { remaining: monthlyRemaining, used: limits.monthly.used, limit: limits.monthly.amount },
      perTransaction: { limit: limits.perTransaction.amount, exceeded: perTxExceeded },
    },
  };

  // Neden izin verilmedi?
  if (!result.allowed) {
    if (amount > dailyRemaining) {
      result.reason = `Günlük limit aşıldı. Kalan: $${dailyRemaining.toLocaleString()}`;
    } else if (amount > weeklyRemaining) {
      result.reason = `Haftalık limit aşıldı. Kalan: $${weeklyRemaining.toLocaleString()}`;
    } else if (amount > monthlyRemaining) {
      result.reason = `Aylık limit aşıldı. Kalan: $${monthlyRemaining.toLocaleString()}`;
    }
  }

  return result;
}

/**
 * Limit kullanımını güncelle
 */
export function updateUsage(
  limits: TransactionLimits,
  amount: number
): TransactionLimits {
  return {
    ...limits,
    daily: { ...limits.daily, used: limits.daily.used + amount },
    weekly: { ...limits.weekly, used: limits.weekly.used + amount },
    monthly: { ...limits.monthly, used: limits.monthly.used + amount },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Günlük limiti sıfırla
 */
export function resetDailyLimit(limits: TransactionLimits): TransactionLimits {
  return {
    ...limits,
    daily: { ...limits.daily, used: 0, resetAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Haftalık limiti sıfırla
 */
export function resetWeeklyLimit(limits: TransactionLimits): TransactionLimits {
  return {
    ...limits,
    weekly: { ...limits.weekly, used: 0, resetAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Aylık limiti sıfırla
 */
export function resetMonthlyLimit(limits: TransactionLimits): TransactionLimits {
  return {
    ...limits,
    monthly: { ...limits.monthly, used: 0, resetAt: new Date().toISOString() },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Limit reset zamanlarını kontrol et ve gerekirse sıfırla
 */
export function checkAndResetLimits(limits: TransactionLimits): TransactionLimits {
  const now = new Date();
  let updated = { ...limits };

  // Günlük reset (her gün 00:00 UTC)
  if (limits.daily.resetAt) {
    const lastReset = new Date(limits.daily.resetAt);
    if (now.getUTCDate() !== lastReset.getUTCDate() || 
        now.getTime() - lastReset.getTime() > 24 * 60 * 60 * 1000) {
      updated = resetDailyLimit(updated);
    }
  }

  // Haftalık reset (her Pazartesi 00:00 UTC)
  if (limits.weekly.resetAt) {
    const lastReset = new Date(limits.weekly.resetAt);
    const daysSinceReset = Math.floor((now.getTime() - lastReset.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceReset >= 7) {
      updated = resetWeeklyLimit(updated);
    }
  }

  // Aylık reset (her ayın 1'i 00:00 UTC)
  if (limits.monthly.resetAt) {
    const lastReset = new Date(limits.monthly.resetAt);
    if (now.getUTCMonth() !== lastReset.getUTCMonth() || 
        now.getUTCFullYear() !== lastReset.getUTCFullYear()) {
      updated = resetMonthlyLimit(updated);
    }
  }

  return updated;
}

/**
 * Whitelist'e adres ekle
 */
export function addToWhitelist(
  limits: TransactionLimits,
  address: string
): TransactionLimits {
  const normalized = address.toLowerCase();
  if (limits.whitelistedAddresses.includes(normalized)) {
    return limits;
  }
  return {
    ...limits,
    whitelistedAddresses: [...limits.whitelistedAddresses, normalized],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Whitelist'ten adres çıkar
 */
export function removeFromWhitelist(
  limits: TransactionLimits,
  address: string
): TransactionLimits {
  const normalized = address.toLowerCase();
  return {
    ...limits,
    whitelistedAddresses: limits.whitelistedAddresses.filter(a => a !== normalized),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Kullanım yüzdesini hesapla
 */
export function getUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 100;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Limit özeti oluştur
 */
export function formatLimitSummary(limits: TransactionLimits): {
  daily: string;
  weekly: string;
  monthly: string;
  perTransaction: string;
} {
  return {
    daily: `$${limits.daily.used.toLocaleString()} / $${limits.daily.amount.toLocaleString()}`,
    weekly: `$${limits.weekly.used.toLocaleString()} / $${limits.weekly.amount.toLocaleString()}`,
    monthly: `$${limits.monthly.used.toLocaleString()} / $${limits.monthly.amount.toLocaleString()}`,
    perTransaction: `Max $${limits.perTransaction.amount.toLocaleString()}/işlem`,
  };
}

/**
 * Sonraki reset zamanını hesapla
 */
export function getNextResetTime(type: 'daily' | 'weekly' | 'monthly'): Date {
  const now = new Date();
  
  switch (type) {
    case 'daily':
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);
      return tomorrow;
    
    case 'weekly':
      const nextMonday = new Date(now);
      const daysUntilMonday = (8 - nextMonday.getUTCDay()) % 7 || 7;
      nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
      nextMonday.setUTCHours(0, 0, 0, 0);
      return nextMonday;
    
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      nextMonth.setUTCDate(1);
      nextMonth.setUTCHours(0, 0, 0, 0);
      return nextMonth;
  }
}
