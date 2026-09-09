// src/lib/balance-lock.ts
// Per-user mutex for balance-mutating flows.
//
// Why: routes like /api/trade read a balance, validate it, then debit it many
// lines later. Between the read and the debit there is a window where N
// concurrent requests all see the same balance and all pass the check — a
// classic TOCTOU race that lets a user spend the same funds N times. On
// 2026-09-09 this was exploited in production: 20 concurrent buys against a
// $26 balance left the account at usdt -65.08.
//
// A short-lived Redis lock keyed by user address serialises those flows. The
// lock carries a random token so a slow request that already lost its lock to
// the TTL can never release someone else's.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Trades can wait on a chain round-trip before the debit lands, so the lease
// has to outlive the slowest realistic critical section.
const DEFAULT_TTL_SECONDS = 30;

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export type BalanceLock = { key: string; token: string };

/**
 * Try to take the balance lock for `address`. Returns null when another
 * request already holds it — callers should surface that as a retryable
 * conflict rather than queueing, so a burst of concurrent requests fails fast
 * instead of piling up behind the leader.
 */
export async function acquireBalanceLock(
  address: string,
  scope: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<BalanceLock | null> {
  const key = `lock:balance:${address.toLowerCase()}`;
  const token = `${scope}:${Date.now()}:${Math.random().toString(36).slice(2)}`;

  const ok = await redis.set(key, token, { nx: true, ex: ttlSeconds });
  return ok ? { key, token } : null;
}

/** Release a lock we still own. Safe to call with null. */
export async function releaseBalanceLock(lock: BalanceLock | null): Promise<void> {
  if (!lock) return;
  try {
    await redis.eval(RELEASE_SCRIPT, [lock.key], [lock.token]);
  } catch (error) {
    // A stuck lock expires on its own; never fail the request over cleanup.
    console.error("releaseBalanceLock failed:", error);
  }
}
