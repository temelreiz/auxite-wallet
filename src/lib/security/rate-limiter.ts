// src/lib/security/rate-limiter.ts
// Redis tabanlı rate limiting - Production ready

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Redis client
const redis = Redis.fromEnv();

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITERS - Farklı endpoint'ler için farklı limitler
// ═══════════════════════════════════════════════════════════════════════════

// Genel API limiti
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 req/dakika
  analytics: true,
  prefix: 'ratelimit:general',
});

// Auth endpoints (login, register)
export const authLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 req/dakika
  analytics: true,
  prefix: 'ratelimit:auth',
});

// Withdraw işlemleri
export const withdrawLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 req/saat
  analytics: true,
  prefix: 'ratelimit:withdraw',
});

// Trade işlemleri
export const tradeLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'), // 60 req/dakika
  analytics: true,
  prefix: 'ratelimit:trade',
});

// Admin endpoints
export const adminLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 req/dakika
  analytics: true,
  prefix: 'ratelimit:admin',
});

// Fiyat sorguları (daha yüksek limit)
export const priceLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(300, '1 m'), // 300 req/dakika
  analytics: true,
  prefix: 'ratelimit:price',
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IP adresini al
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}

/**
 * Rate limit kontrolü
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await limiter.limit(identifier);
  
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

/**
 * Rate limit response headers
 */
export function rateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * API route için rate limit middleware
 * 
 * @example
 * export async function POST(request: NextRequest) {
 *   const rateLimitResult = await withRateLimit(request, authLimiter);
 *   if (rateLimitResult) return rateLimitResult; // 429 döner
 *   
 *   // Normal işlem...
 * }
 */
export async function withRateLimit(
  request: NextRequest,
  limiter: Ratelimit,
  identifier?: string
): Promise<NextResponse | null> {
  const ip = identifier || getClientIP(request);
  const result = await checkRateLimit(limiter, ip);
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Çok fazla istek. Lütfen bekleyin.',
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: rateLimitHeaders(result),
      }
    );
  }
  
  return null; // Rate limit OK
}

/**
 * User ID bazlı rate limit
 */
export async function withUserRateLimit(
  request: NextRequest,
  limiter: Ratelimit,
  userId: string
): Promise<NextResponse | null> {
  // User ID + IP kombinasyonu
  const ip = getClientIP(request);
  const identifier = `${userId}:${ip}`;
  
  return withRateLimit(request, limiter, identifier);
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY/MONTHLY LIMITS (Withdraw için)
// ═══════════════════════════════════════════════════════════════════════════

interface WithdrawLimits {
  daily: number;
  monthly: number;
}

const DEFAULT_LIMITS: WithdrawLimits = {
  daily: 10000,   // $10,000/gün
  monthly: 100000, // $100,000/ay
};

const VERIFIED_LIMITS: WithdrawLimits = {
  daily: 50000,   // $50,000/gün
  monthly: 500000, // $500,000/ay
};

/**
 * Withdraw limiti kontrolü
 */
export async function checkWithdrawLimit(
  userId: string,
  amountUSD: number,
  isVerified: boolean = false
): Promise<{
  allowed: boolean;
  reason?: string;
  dailyUsed: number;
  dailyRemaining: number;
  monthlyUsed: number;
  monthlyRemaining: number;
}> {
  const limits = isVerified ? VERIFIED_LIMITS : DEFAULT_LIMITS;
  
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const month = today.substring(0, 7); // YYYY-MM
  
  const dailyKey = `withdraw:daily:${userId}:${today}`;
  const monthlyKey = `withdraw:monthly:${userId}:${month}`;
  
  const [dailyUsedRaw, monthlyUsedRaw] = await Promise.all([
    redis.get<number>(dailyKey),
    redis.get<number>(monthlyKey),
  ]);
  
  const dailyUsed = dailyUsedRaw || 0;
  const monthlyUsed = monthlyUsedRaw || 0;
  const dailyRemaining = limits.daily - (dailyUsed || 0);
  const monthlyRemaining = limits.monthly - (monthlyUsed || 0);
  
  // Limit kontrolü
  if (amountUSD > dailyRemaining) {
    return {
      allowed: false,
      reason: `Günlük limit aşıldı. Kalan: $${dailyRemaining.toFixed(2)}`,
      dailyUsed,
      dailyRemaining,
      monthlyUsed,
      monthlyRemaining,
    };
  }
  
  if (amountUSD > monthlyRemaining) {
    return {
      allowed: false,
      reason: `Aylık limit aşıldı. Kalan: $${monthlyRemaining.toFixed(2)}`,
      dailyUsed,
      dailyRemaining,
      monthlyUsed,
      monthlyRemaining,
    };
  }
  
  return {
    allowed: true,
    dailyUsed,
    dailyRemaining,
    monthlyUsed,
    monthlyRemaining,
  };
}

/**
 * Withdraw sonrası limit güncelle
 */
export async function updateWithdrawUsage(
  userId: string,
  amountUSD: number
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const month = today.substring(0, 7);
  
  const dailyKey = `withdraw:daily:${userId}:${today}`;
  const monthlyKey = `withdraw:monthly:${userId}:${month}`;
  
  await Promise.all([
    redis.incrbyfloat(dailyKey, amountUSD),
    redis.incrbyfloat(monthlyKey, amountUSD),
    redis.expire(dailyKey, 86400 * 2),    // 2 gün TTL
    redis.expire(monthlyKey, 86400 * 35), // 35 gün TTL
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// SUSPICIOUS ACTIVITY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Şüpheli aktivite kontrolü
 */
export async function checkSuspiciousActivity(
  userId: string,
  ip: string,
  action: 'login' | 'withdraw' | 'trade'
): Promise<{ suspicious: boolean; reason?: string }> {
  const key = `suspicious:${userId}`;

  // Son 1 saatteki işlemleri kontrol et
  const recentActions = await redis.lrange(key, 0, 100);

  // Farklı IP'lerden çok fazla istek?
  const ips = new Set(recentActions.map((a: any) => { try { return typeof a === "string" ? JSON.parse(a).ip : a.ip; } catch { return null; } }).filter(Boolean));
  if (ips.size > 5 && action === 'withdraw') {
    return {
      suspicious: true,
      reason: 'Son 1 saatte 5+ farklı IP adresinden işlem',
    };
  }

  // Çok hızlı withdraw denemeleri?
  if (action === 'withdraw') {
    const withdraws = recentActions.filter(
      (a: any) => { try { const parsed = typeof a === "string" ? JSON.parse(a) : a; return parsed.action === "withdraw"; } catch { return false; } }
    );
    if (withdraws.length > 5) {
      return {
        suspicious: true,
        reason: 'Son 1 saatte 5+ withdraw denemesi',
      };
    }
  }

  // Aktiviteyi kaydet
  await redis.lpush(
    key,
    JSON.stringify({ action, ip, timestamp: Date.now() })
  );
  await redis.ltrim(key, 0, 99); // Son 100 işlem
  await redis.expire(key, 3600); // 1 saat TTL

  return { suspicious: false };
}

// ═══════════════════════════════════════════════════════════════════════════
// IP + ADDRESS COMBINED RATE LIMITING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * IP + Address kombinasyonu ile daha sıkı rate limiting
 * Hem IP hem de address bazlı limitleri kontrol eder
 */
export async function checkCombinedRateLimit(
  address: string,
  ip: string,
  action: 'transfer' | 'withdraw' | 'trade',
  limits: { addressLimit: number; ipLimit: number; windowSec: number }
): Promise<{ allowed: boolean; reason?: string }> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - limits.windowSec;

  const addressKey = `ratelimit:${action}:addr:${address.toLowerCase()}`;
  const ipKey = `ratelimit:${action}:ip:${ip}`;

  // Temizle ve say
  await Promise.all([
    redis.zremrangebyscore(addressKey, 0, windowStart),
    redis.zremrangebyscore(ipKey, 0, windowStart),
  ]);

  const [addressCount, ipCount] = await Promise.all([
    redis.zcard(addressKey),
    redis.zcard(ipKey),
  ]);

  // Address limiti kontrolü
  if (addressCount >= limits.addressLimit) {
    return {
      allowed: false,
      reason: `Bu adres için ${action} limiti aşıldı. Lütfen ${Math.ceil(limits.windowSec / 60)} dakika bekleyin.`,
    };
  }

  // IP limiti kontrolü
  if (ipCount >= limits.ipLimit) {
    return {
      allowed: false,
      reason: `Bu IP için ${action} limiti aşıldı. Lütfen ${Math.ceil(limits.windowSec / 60)} dakika bekleyin.`,
    };
  }

  // Her iki key'e de ekle
  const member = `${now}-${Math.random()}`;
  await Promise.all([
    redis.zadd(addressKey, { score: now, member }),
    redis.zadd(ipKey, { score: now, member }),
    redis.expire(addressKey, limits.windowSec * 2),
    redis.expire(ipKey, limits.windowSec * 2),
  ]);

  return { allowed: true };
}

// Önerilen limitler
export const COMBINED_LIMITS = {
  transfer: { addressLimit: 5, ipLimit: 10, windowSec: 60 },     // 1 dakika
  withdraw: { addressLimit: 3, ipLimit: 5, windowSec: 300 },     // 5 dakika
  trade: { addressLimit: 30, ipLimit: 60, windowSec: 60 },       // 1 dakika
};
