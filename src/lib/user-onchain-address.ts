// ============================================================================
// user-onchain-address.ts — the user's REAL, key-controlled on-chain address
// ----------------------------------------------------------------------------
// The account `walletAddress` (aka vaultAddress) is a KEYLESS SHA256 pseudo-
// address — see `api/auth/register/route.ts`:
//     walletAddress = "0x" + SHA256("auxite-wallet-" + userId).slice(0, 40)
// No private key exists (or can exist) for it, so ANY token sent on-chain to it
// is permanently locked (this is exactly how the 23,100-AUXR founder tranche at
// 0x8d23… got stuck). It is only valid as an internal account identifier.
//
// This module resolves the user's REAL EVM address — the same per-user address
// the deposit infra already issues (HD seed preferred, KMS custodial fallback),
// which the platform actually holds keys for. Every on-chain-facing use for a
// user (mint targets, on-chain receive, withdrawal defaults) MUST resolve the
// address through here and MUST refuse the operation when it returns null,
// rather than ever falling back to the keyless account `walletAddress`.
// ============================================================================

import { isHdConfigured, getUserDepositAddresses } from "./hd-deposit";
import { isKmsConfigured, getOrCreateEvmDepositAddress } from "./deposit-address";
import crypto from "node:crypto";

const EVM_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * The user's real, key-controlled EVM (Base) address, reusing the deposit
 * custody infra. HD seed preferred, KMS fallback — mirrors `/api/deposit`.
 *
 * @param walletAddress the account identifier (the keyless SHA256 address)
 * @returns a real EVM address, or `null` when no custody backend is configured
 *          or derivation fails. Callers MUST treat null as "no on-chain address
 *          available" and refuse the on-chain operation — never fall back to
 *          `walletAddress`.
 */
export async function getUserOnchainEvmAddress(
  walletAddress: string,
): Promise<string | null> {
  if (!walletAddress || !EVM_RE.test(walletAddress)) return null;

  if (isHdConfigured()) {
    try {
      const { evm } = await getUserDepositAddresses(walletAddress);
      if (evm && EVM_RE.test(evm)) return evm;
    } catch (e) {
      console.error("[user-onchain-address] HD derive failed:", e);
    }
  }

  if (isKmsConfigured()) {
    try {
      const evm = await getOrCreateEvmDepositAddress(walletAddress);
      if (evm && EVM_RE.test(evm)) return evm;
    } catch (e) {
      console.error("[user-onchain-address] KMS derive failed:", e);
    }
  }

  return null;
}

/**
 * Recompute the legacy keyless account address the registration flow assigns,
 * so callers can detect and refuse it as an on-chain destination.
 * Mirrors `api/auth/register/route.ts`.
 */
export function deriveLegacyFakeAddress(userId: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(`auxite-wallet-${userId}`)
    .digest("hex");
  return "0x" + hash.substring(0, 40);
}
