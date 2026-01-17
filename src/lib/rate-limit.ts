// src/lib/rate-limit.ts
// Simple in-memory rate limiter for API endpoints
// For production, consider using Redis-based rate limiting

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  // Maximum number of requests
  limit: number;
  // Time window in seconds
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number; // seconds until reset
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (IP, wallet address, etc.)
 * @param config - Rate limit configuration
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = rateLimitStore.get(key);

  // No existing entry or expired
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: config.limit - 1,
      resetIn: config.windowSeconds,
    };
  }

  // Within window
  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }
  return "unknown";
}

/**
 * Pre-configured rate limiters for different use cases
 */
export const RateLimitPresets = {
  // Strict: 10 requests per minute (sensitive operations)
  strict: { limit: 10, windowSeconds: 60 },
  
  // Standard: 60 requests per minute (normal API calls)
  standard: { limit: 60, windowSeconds: 60 },
  
  // Relaxed: 200 requests per minute (public data)
  relaxed: { limit: 200, windowSeconds: 60 },
  
  // Auth: 5 requests per minute (login attempts)
  auth: { limit: 5, windowSeconds: 60 },
  
  // Admin: 30 requests per minute
  admin: { limit: 30, windowSeconds: 60 },
  
  // Withdrawal: 3 requests per minute
  withdrawal: { limit: 3, windowSeconds: 60 },
  
  // Trade: 20 requests per minute
  trade: { limit: 20, windowSeconds: 60 },
} as const;

/**
 * Helper to create rate limit response
 */
export function rateLimitResponse(resetIn: number) {
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      retryAfter: resetIn,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(resetIn),
      },
    }
  );
}
