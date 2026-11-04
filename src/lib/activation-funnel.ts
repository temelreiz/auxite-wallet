// src/lib/activation-funnel.ts
// Shared by the activation series cron and the weekly funnel report.

import type { Redis } from "@upstash/redis";
import { unsubscribeToken } from "@/lib/email-suppression";
import type { ActivationStage } from "@/lib/activation-content";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type ActivationTrack = "first_buy" | "kyc_finish" | "deposit";

export const SCHEDULES: Record<ActivationTrack, { stage: ActivationStage; day: number }[]> = {
  first_buy: [
    { stage: "first_buy", day: 1 },
    { stage: "why_stopped", day: 10 },
  ],
  kyc_finish: [
    { stage: "kyc_finish_1", day: 2 },
    { stage: "kyc_finish_2", day: 5 },
    { stage: "kyc_finish_3", day: 12 },
    { stage: "why_stopped", day: 16 },
  ],
  deposit: [
    { stage: "deposit_1", day: 1 },
    { stage: "deposit_2", day: 4 },
    { stage: "deposit_3", day: 9 },
    { stage: "deposit_4", day: 16 },
  ],
};

function ts(v: unknown): number {
  if (!v) return 0;
  const n = typeof v === "number" ? v : Date.parse(String(v));
  return Number.isFinite(n) ? n : 0;
}

/** Which track an unfunded account is on, and when it reached that point. */
export function trackOf(kyc: any, createdAt: unknown): { track: ActivationTrack; since: number } | null {
  if (!kyc || kyc.status === "none") {
    // Numeric strings come back from the auth hash.
    const created = Number(createdAt);
    return { track: "first_buy", since: Number.isFinite(created) && created > 0 ? created : ts(createdAt) };
  }
  if (kyc.status === "pending") return { track: "kyc_finish", since: ts(kyc.createdAt) || ts(kyc.updatedAt) };
  if (kyc.status === "approved") {
    return { track: "deposit", since: ts(kyc.verification?.reviewedAt) || ts(kyc.personalInfo?.verifiedAt) || ts(kyc.updatedAt) };
  }
  return null;
}

// ── One-question survey ───────────────────────────────────────────────────────

export const WHY_HASH = "activation:why";
export const WHY_REASONS = ["trust", "price", "verification", "payment", "later"] as const;
export type WhyReason = (typeof WHY_REASONS)[number];

export function whyToken(email: string): string {
  return unsubscribeToken(`why:${email}`);
}

export function whyUrl(email: string, language: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
  const e = email.trim().toLowerCase();
  return `${base}/api/activation/why?email=${encodeURIComponent(e)}&token=${whyToken(e)}&lang=${encodeURIComponent(language)}`;
}

// ── Card funnel ───────────────────────────────────────────────────────────────
// First time each account reaches a step: saw a card price, started a payment,
// paid. The steps before these live only in GA4.

export type CardStep = "quote" | "intent" | "paid";
export const cardStepKey = (step: CardStep) => `activation:card:${step}`;

/** Never lets a counter failure get in the way of a payment. */
export async function recordCardStep(redis: Redis, step: CardStep, address: string): Promise<void> {
  try {
    await redis.zadd(cardStepKey(step), { nx: true }, { score: Date.now(), member: address.toLowerCase() });
  } catch (e) {
    console.warn(`[activation-funnel] ${step} not recorded:`, e);
  }
}

/** Internal and test accounts stay out of the first-purchase count. */
export function isFunnelExcluded(email: string | undefined): boolean {
  const e = (email || "").trim().toLowerCase();
  if (e.endsWith("@auxite.io")) return true;
  return (process.env.FUNNEL_EXCLUDE_EMAILS || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .includes(e);
}

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
