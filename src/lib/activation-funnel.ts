// src/lib/activation-funnel.ts
// Shared by the activation series cron and the weekly funnel report.

export const DAY_MS = 24 * 60 * 60 * 1000;

const BALANCE_KEYS = ["auxm", "auxg", "auxs", "auxpt", "auxpd", "auxr", "eth", "btc", "usdt", "usdc", "usd"];

/** Any positive balance counts as funded (same test as the drip). */
export function isFunded(bal: Record<string, unknown> | null): boolean {
  return !!bal && BALANCE_KEYS.some((k) => parseFloat(String(bal[k] ?? 0)) > 0);
}

/** ISO week label, e.g. 2026-W45 — activation sends are counted per week. */
export function isoWeek(ms: number): string {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); // Thursday of this week
  const jan4 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / DAY_MS - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Accounts first seen funded, scored by when (0 = funded before tracking began). */
export const FUNDED_ZSET = "activation:funded";
export const FUNDED_SEEDED = "activation:funded:seeded";
