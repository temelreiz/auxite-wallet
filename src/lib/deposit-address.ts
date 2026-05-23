// src/lib/deposit-address.ts
// Per-user EVM deposit address backed by the AWS KMS custodial wallet system
// (lib/kms-wallet). Each user gets a real keypair whose private key is stored
// KMS-encrypted (never plaintext). Funds arriving at this address belong to the
// user, so the watcher (scan-user-deposits) can auto-credit them.
//
// We deliberately reuse the watcher's existing keys so it needs no changes:
//   deposit:hd:evm:{addr}  → the user's balance key (their account walletAddress)
//   deposit:watch:evm      → ZSET of armed addresses (score = expiry)

import { getRedis } from "./redis";
import { createCustodialWallet } from "./kms-wallet";

const WATCH_EVM = "deposit:watch:evm";
const WATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isKmsConfigured(): boolean {
  return !!(
    process.env.AWS_KMS_KEY_ID &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION
  );
}

// Returns the user's EVM deposit address (creating the KMS wallet on first use)
// and wires up the watcher mapping + arms it. `userWallet` is the account's
// walletAddress — the key under which the balance lives and will be credited.
export async function getOrCreateEvmDepositAddress(userWallet: string): Promise<string | null> {
  const r = getRedis();
  const acct = userWallet.toLowerCase();

  const userId = await r.get(`user:address:${acct}`);
  if (!userId) return null;

  const { address } = await createCustodialWallet(String(userId));
  const addr = address.toLowerCase();

  // Map deposit address → credit target (the account balance key).
  await r.set(`deposit:hd:evm:${addr}`, acct);
  // Arm for the watcher.
  await r.zadd(WATCH_EVM, { score: Date.now() + WATCH_TTL_MS, member: addr });

  return address;
}
