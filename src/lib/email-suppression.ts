// src/lib/email-suppression.ts
//
// Single source of truth for the unsubscribe suppression list.
//
// `POST /api/unsubscribe` adds a (lowercased) email to the `email:suppressed`
// Redis SET. Every MARKETING send path must exclude these addresses — the
// drip and winback crons already did, but the admin campaign routes and the
// card-recovery cron historically bypassed it, so an unsubscribed user could
// still be caught by a manual blast. This helper is the shared filter those
// paths now use so "unsubscribe" means unsubscribe everywhere.
//
// NOTE: transactional email (verification, deposit/withdraw confirmations,
// statements) intentionally does NOT consult this set — those are account-
// event mail the user cannot opt out of while holding an account.

import type { Redis } from "@upstash/redis";
import { createHmac } from "crypto";

export const SUPPRESSION_SET = "email:suppressed";

// ── Unsubscribe link tokens ────────────────────────────────────────────────
// HMAC over the email with a stable secret, so the same address always yields
// the same token (sender and /api/unsubscribe both derive it). Shared here so
// marketing senders and the unsubscribe route can't drift apart.

function unsubscribeSecret(): string {
  return (
    process.env.UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "auxite-unsubscribe-fallback"
  );
}

export function unsubscribeToken(email: string): string {
  return createHmac("sha256", unsubscribeSecret())
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

/** Full one-click unsubscribe URL for an email (token embedded). */
export function unsubscribeUrl(email: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
  const e = email.trim().toLowerCase();
  return `${base}/unsubscribe?email=${encodeURIComponent(e)}&token=${unsubscribeToken(e)}`;
}

/**
 * Load the whole suppression set once as a lowercased Set for O(1),
 * round-trip-free membership checks while iterating recipients.
 */
export async function loadSuppressedEmails(redis: Redis): Promise<Set<string>> {
  const arr = (await redis.smembers(SUPPRESSION_SET)) as unknown[];
  return new Set(arr.map((e) => String(e).trim().toLowerCase()));
}

/** True if this email has unsubscribed. Pass a set from loadSuppressedEmails. */
export function isEmailSuppressed(
  suppressed: Set<string>,
  email: string | null | undefined,
): boolean {
  if (!email) return false;
  return suppressed.has(email.trim().toLowerCase());
}
