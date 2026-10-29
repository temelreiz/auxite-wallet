// ============================================
// ITERA RENTAL — Redis key namespace and helpers
// All keys live under rental:* (§7)
// ============================================

import { getRedis } from "@/lib/redis";

export const KEYS = {
  vehicle: (id: string) => `rental:vehicle:${id}`,
  vehicles: "rental:vehicles",
  spans: (month: string) => `rental:spans:${month}`,
  valuations: (id: string) => `rental:valuations:${id}`,
  trip: (id: string) => `rental:trip:${id}`,
  tripsByMonth: (month: string) => `rental:trips:${month}`,
  cashEvent: (id: string) => `rental:cash:${id}`,
  cashByMonth: (month: string) => `rental:cash:month:${month}`,
  cashLog: "rental:cash:log",
  config: "rental:config",
  navDaily: "rental:nav:daily",
};

export { getRedis };

/** Upstash returns parsed JSON for objects it stored, a string otherwise. */
export function parse<T>(raw: unknown): T | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
  return raw as T;
}

/** UTC month bucket, e.g. "2026-11". */
export function monthOf(ts: number): string {
  return new Date(ts).toISOString().slice(0, 7);
}

/** Every month bucket that [start, end] touches. */
export function monthsBetween(start: number, end: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(new Date(start).getUTCFullYear(), new Date(start).getUTCMonth(), 1));
  const last = monthOf(end);
  for (;;) {
    const m = d.toISOString().slice(0, 7);
    out.push(m);
    if (m >= last) break;
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}
