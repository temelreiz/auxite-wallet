// Signed links to a stake's Participation Note.
//
// The note is opened from an email, so the request carries no login token.
// It used to be served to anyone who knew (or guessed) the stakeId, and the
// pre-ledger ids ended in only four random characters. The link now carries
// an HMAC of the stakeId; without the right signature the note isn't served.

import { createHmac, timingSafeEqual } from "crypto";

function secret(): string | null {
  return process.env.STAKING_NOTE_SECRET || process.env.JWT_SECRET || null;
}

export function noteSignature(stakeId: string): string | null {
  const s = secret();
  if (!s) return null;
  return createHmac("sha256", s).update(`staking-note:${stakeId}`).digest("base64url").slice(0, 32);
}

export function verifyNoteSignature(stakeId: string, sig: string | null): boolean {
  const expected = noteSignature(stakeId);
  if (!expected || !sig) return false;
  const a = Buffer.from(expected), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function noteUrl(baseUrl: string, stakeId: string): string {
  const sig = noteSignature(stakeId) || "";
  return `${baseUrl}/api/staking/agreement?stakeId=${encodeURIComponent(stakeId)}&sig=${sig}`;
}
