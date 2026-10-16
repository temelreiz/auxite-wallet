// src/lib/mm-lease.ts
// Leader lease for the AUXR market maker (trading-bot repo, mm/).
//
// Two MM nodes run against ONE exchange account (Hetzner fsn1 active, hel1
// standby) so a dead server does not leave stale quotes on the book. Exactly
// one may quote at a time: two quoting loops on one account would each treat
// the other's orders as their own and cancel them, every five seconds. The
// lease decides who that one is.
//
// The holder renews every loop; a standby takes over only after the lease
// has expired. The node that stops renewing fences itself (stops quoting and
// cancels) well before expiry, so the two never overlap.
//
// The MM servers get a narrow bearer secret for this one route — never the
// Upstash credentials, which also guard customer balances.

import { getRedis } from "@/lib/redis";

export const MM_LEASE_TTL_MS = 30_000;

const ACQUIRE_SCRIPT = `
local cur = redis.call("GET", KEYS[1])
if (not cur) or cur == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[1], "PX", ARGV[2])
  return {1, ARGV[1], tonumber(ARGV[2])}
end
return {0, cur, redis.call("PTTL", KEYS[1])}
`;

const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
`;

export type LeaseResult = { held: boolean; holder: string | null; ttlMs: number };
export type LeaseBeat = { holder: string; at: number };

const leaseKey = (venue: string) => `mm:lease:${venue}`;
const beatKey = (venue: string) => `mm:lease:${venue}:lastRenew`;

/** Take the lease if free, or renew it if `holder` already has it. */
export async function acquireOrRenew(venue: string, holder: string): Promise<LeaseResult> {
  const r = getRedis();
  const res = (await r.eval(ACQUIRE_SCRIPT, [leaseKey(venue)], [holder, String(MM_LEASE_TTL_MS)])) as [
    number,
    string | null,
    number,
  ];
  const held = Number(res[0]) === 1;
  if (held) {
    // Last renewal, kept for a week: the ops watch alarms when nobody has
    // renewed for minutes, i.e. both MM nodes are down.
    const beat: LeaseBeat = { holder, at: Date.now() };
    await r.set(beatKey(venue), JSON.stringify(beat), { ex: 7 * 24 * 3600 });
  }
  return { held, holder: res[1] ?? null, ttlMs: Number(res[2]) };
}

export async function release(venue: string, holder: string): Promise<boolean> {
  const n = await getRedis().eval(RELEASE_SCRIPT, [leaseKey(venue)], [holder]);
  return Number(n) === 1;
}

export async function lastRenewal(venue: string): Promise<LeaseBeat | null> {
  const raw = await getRedis().get(beatKey(venue));
  if (!raw) return null;
  return (typeof raw === "string" ? JSON.parse(raw) : raw) as LeaseBeat;
}
