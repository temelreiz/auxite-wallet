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

export const SUPPRESSION_SET = "email:suppressed";

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
