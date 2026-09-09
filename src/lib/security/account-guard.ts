// src/lib/security/account-guard.ts
// One gate that every value-moving route consults before touching balances.
//
// Why this exists: the codebase had three separate ways to stop an account —
// the emergency `frozen` flag (/api/security/emergency), the admin `banned`
// flag (/api/admin/users), and `vaultFrozen` (/api/convert-metal) — and none
// of them were read by /api/trade, /api/withdraw, /api/transfer or
// /api/redeem. Freezing or banning a user changed a field and nothing else,
// so a flagged account could keep trading and keep requesting withdrawals.
//
// checkAccountStatus() already encoded the freeze/panic/expiry semantics; it
// simply had no callers on the money paths. This wraps it, folds in the other
// two flags, and gives the routes a single call.

import { redis } from "@/lib/redis";
import { checkAccountStatus, type EmergencyConfig } from "@/lib/security/emergency";

export type AccountGate =
  | { ok: true }
  | { ok: false; error: string; code: "frozen" | "panic" | "banned" | "vault_frozen" };

function parse<T>(value: unknown): T | null {
  if (!value) return null;
  try {
    return typeof value === "string" ? (JSON.parse(value) as T) : (value as T);
  } catch {
    return null;
  }
}

/**
 * Returns { ok: false } when `address` is frozen, in panic mode, banned, or
 * vault-frozen. Callers must treat a non-ok result as a hard 403.
 *
 * Fails CLOSED on an unexpected Redis error: a value-moving request must not
 * proceed just because we could not read the account's status.
 */
export async function assertAccountActive(address: string): Promise<AccountGate> {
  if (!address) return { ok: true };

  const normalized = address.toLowerCase();

  try {
    // The emergency route keys off the raw x-wallet-address header, so a
    // config may live under either casing. Check both before concluding the
    // account is clear.
    const emergencyRaw =
      (await redis.get(`user:emergency:${normalized}`)) ??
      (address === normalized ? null : await redis.get(`user:emergency:${address}`));

    const config = parse<EmergencyConfig>(emergencyRaw);
    if (config) {
      const status = checkAccountStatus(config);
      if (!status.canTransact) {
        return {
          ok: false,
          error: status.reason || "Hesap dondurulmuş",
          code: status.status === "panic" ? "panic" : "frozen",
        };
      }
    }

    const info = await redis.hgetall(`user:${normalized}:info`);
    if (info?.banned === "true" || info?.banned === true) {
      return { ok: false, error: "Hesap askıya alındı", code: "banned" };
    }

    // Parity with /api/convert-metal, which gates on the uid-keyed record.
    const uid = (await redis.get(`user:address:${normalized}`)) as string | null;
    if (uid) {
      const userData = await redis.hgetall(`user:${uid}`);
      if (userData?.vaultFrozen === "true" || userData?.vaultFrozen === true) {
        return { ok: false, error: "Vault dondurulmuş", code: "vault_frozen" };
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("assertAccountActive failed, denying by default:", error);
    return { ok: false, error: "Hesap durumu doğrulanamadı", code: "frozen" };
  }
}
