// src/lib/hd-deposit.ts
// Per-user deposit addresses derived from a single HD master seed
// (DEPOSIT_HD_MNEMONIC). Giving every user their own address is what makes
// deposits attributable — funds arriving at address X belong to the user X was
// assigned to, so they can be credited automatically (no txid, no guessing the
// sender). All addresses are derived from a seed we hold, so they remain
// sweepable to the hot wallet later.
//
// Paths:  EVM (Base: ETH/USDT/USDC)  m/44'/60'/0'/0/{index}
//         BTC (native segwit)        m/84'/0'/0'/0/{index}
//
// The seed is read lazily so importing this module never throws when the env
// var is absent (the feature simply reports "not configured").

import { ethers } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import { getRedis } from "./redis";

const WATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days armed after viewing

function getMnemonic(): string {
  // Gate strictly on the dedicated DEPOSIT_HD_MNEMONIC so the feature stays
  // dormant until the operator explicitly provisions (and has verified) this
  // seed — never auto-activate off an unrelated treasury mnemonic.
  return (process.env.DEPOSIT_HD_MNEMONIC || "").trim();
}

export function isHdConfigured(): boolean {
  const m = getMnemonic();
  if (!m) return false;
  try {
    ethers.Mnemonic.fromPhrase(m);
    return true;
  } catch {
    return false;
  }
}

// ── Derivation (pure) ──────────────────────────────────────────────────────

export function deriveEvmAddress(index: number): string {
  const mn = ethers.Mnemonic.fromPhrase(getMnemonic());
  const root = ethers.HDNodeWallet.fromMnemonic(mn, "m");
  return root.derivePath(`44'/60'/0'/0/${index}`).address;
}

// Private key — only used by the (separate) sweeper. Never logged/returned to clients.
export function deriveEvmPrivateKey(index: number): string {
  const mn = ethers.Mnemonic.fromPhrase(getMnemonic());
  const root = ethers.HDNodeWallet.fromMnemonic(mn, "m");
  return root.derivePath(`44'/60'/0'/0/${index}`).privateKey;
}

export function deriveBtcAddress(index: number): string {
  const seed = mnemonicToSeedSync(getMnemonic());
  const root = HDKey.fromMasterSeed(seed);
  const child = root.derive(`m/84'/0'/0'/0/${index}`);
  if (!child.publicKey) throw new Error("btc derive: no pubkey");
  const { address } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(child.publicKey),
    network: bitcoin.networks.bitcoin,
  });
  if (!address) throw new Error("btc derive: no address");
  return address;
}

// ── Index assignment + reverse maps (Redis) ────────────────────────────────

const COUNTER_KEY = "deposit:hd:counter";
const idxKey = (w: string) => `deposit:hd:index:${w.toLowerCase()}`;
const evmRevKey = (a: string) => `deposit:hd:evm:${a.toLowerCase()}`;
const btcRevKey = (a: string) => `deposit:hd:btc:${a}`;

export async function getOrAssignIndex(userWallet: string): Promise<number> {
  const r = getRedis();
  const existing = await r.get(idxKey(userWallet));
  if (existing !== null && existing !== undefined) return Number(existing);
  // INCR returns 1 on first use → index 1 (index 0 reserved/unused).
  const idx = (await r.incr(COUNTER_KEY)) as number;
  await r.set(idxKey(userWallet), idx);
  return idx;
}

export interface UserDepositAddresses {
  index: number;
  evm: string; // Base — used for ETH, USDT, USDC
  btc: string;
}

export async function getUserDepositAddresses(userWallet: string): Promise<UserDepositAddresses> {
  const index = await getOrAssignIndex(userWallet);
  const evm = deriveEvmAddress(index);
  const btc = deriveBtcAddress(index);
  const r = getRedis();
  const w = userWallet.toLowerCase();
  await r.set(evmRevKey(evm), w);
  await r.set(btcRevKey(btc), w);
  return { index, evm, btc };
}

export async function userForEvmAddress(evmAddr: string): Promise<string | null> {
  const v = await getRedis().get(evmRevKey(evmAddr));
  return v ? String(v) : null;
}
export async function userForBtcAddress(btcAddr: string): Promise<string | null> {
  const v = await getRedis().get(btcRevKey(btcAddr));
  return v ? String(v) : null;
}

// ── Watch arming (so the cron only polls actively-depositing addresses) ─────

const WATCH_EVM = "deposit:watch:evm";
const WATCH_BTC = "deposit:watch:btc";

export async function armWatch(evm: string, btc: string): Promise<void> {
  const r = getRedis();
  const expiry = Date.now() + WATCH_TTL_MS;
  await r.zadd(WATCH_EVM, { score: expiry, member: evm.toLowerCase() });
  await r.zadd(WATCH_BTC, { score: expiry, member: btc });
}

// Active (non-expired) armed addresses, and prune expired ones.
export async function getArmedEvm(): Promise<string[]> {
  const r = getRedis();
  const now = Date.now();
  await r.zremrangebyscore(WATCH_EVM, 0, now);
  const members = (await r.zrange(WATCH_EVM, now, "+inf", { byScore: true })) as string[];
  return members || [];
}
export async function getArmedBtc(): Promise<string[]> {
  const r = getRedis();
  const now = Date.now();
  await r.zremrangebyscore(WATCH_BTC, 0, now);
  const members = (await r.zrange(WATCH_BTC, now, "+inf", { byScore: true })) as string[];
  return members || [];
}

// Keep watching an address that has actually received funds, regardless of the
// 7-day arm window, so repeat deposits are always caught.
export async function keepWatching(evmOrBtc: string, isBtc: boolean): Promise<void> {
  const r = getRedis();
  const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000;
  await r.zadd(isBtc ? WATCH_BTC : WATCH_EVM, {
    score: farFuture,
    member: isBtc ? evmOrBtc : evmOrBtc.toLowerCase(),
  });
}
