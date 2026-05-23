// src/lib/tron-deposit.ts
// Per-user Tron (TRC20) deposit address derived from the same HD master seed
// (DEPOSIT_HD_MNEMONIC) at m/44'/195'/0'/0/{index}, reusing the user's shared
// index so their EVM/BTC/Tron addresses all come from one index (one backup).
//
// A Tron address = base58check( 0x41 ++ keccak256(uncompressedPubKey[1:])[-20:] ).
// Verified against the public BIP44-Tron test vector. Only bs58 + ethers +
// @scure/bip32 + node crypto are needed (no tronweb).

import { ethers } from "ethers";
import { HDKey } from "@scure/bip32";
import { mnemonicToSeedSync } from "@scure/bip39";
import bs58 from "bs58";
import { createHash } from "crypto";
import { getRedis } from "./redis";
import { getOrAssignIndex, isHdConfigured } from "./hd-deposit";

const WATCH_TRON = "deposit:watch:tron";
const WATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// USDT TRC20 contract on Tron mainnet.
export const TRON_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

function getMnemonic(): string {
  return (process.env.DEPOSIT_HD_MNEMONIC || "").trim();
}
export function isTronConfigured(): boolean {
  return isHdConfigured();
}

function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

function tronAddressFromPrivHex(privHex: string): string {
  const uncompressed = ethers.SigningKey.computePublicKey("0x" + privHex, false); // 0x04 + X + Y
  const hash = ethers.keccak256("0x" + uncompressed.slice(4)); // keccak of 64-byte pubkey
  const addr21 = Buffer.from("41" + hash.slice(-40), "hex"); // 0x41 mainnet prefix + 20 bytes
  const checksum = sha256(sha256(addr21)).subarray(0, 4);
  return bs58.encode(Buffer.concat([addr21, checksum]));
}

export function deriveTronAddress(index: number): string {
  const seed = mnemonicToSeedSync(getMnemonic());
  const child = HDKey.fromMasterSeed(seed).derive(`m/44'/195'/0'/0/${index}`);
  if (!child.privateKey) throw new Error("tron derive: no privkey");
  return tronAddressFromPrivHex(Buffer.from(child.privateKey).toString("hex"));
}

// Private key — only for the (separate) sweeper. Never logged/returned to clients.
export function deriveTronPrivateKey(index: number): string {
  const seed = mnemonicToSeedSync(getMnemonic());
  const child = HDKey.fromMasterSeed(seed).derive(`m/44'/195'/0'/0/${index}`);
  if (!child.privateKey) throw new Error("tron derive: no privkey");
  return Buffer.from(child.privateKey).toString("hex");
}

const tronRevKey = (a: string) => `deposit:tron:${a}`;

// Returns the user's Tron deposit address (reusing their shared index) and
// wires up the watcher mapping + arms it. `userWallet` is the account balance key.
export async function getOrCreateTronDepositAddress(userWallet: string): Promise<string | null> {
  if (!isTronConfigured()) return null;
  const r = getRedis();
  const acct = userWallet.toLowerCase();
  const index = await getOrAssignIndex(acct);
  const addr = deriveTronAddress(index);
  await r.set(tronRevKey(addr), acct);
  await r.zadd(WATCH_TRON, { score: Date.now() + WATCH_TTL_MS, member: addr });
  return addr;
}

export async function userForTronAddress(addr: string): Promise<string | null> {
  const v = await getRedis().get(tronRevKey(addr));
  return v ? String(v) : null;
}

export async function getArmedTron(): Promise<string[]> {
  const r = getRedis();
  const now = Date.now();
  await r.zremrangebyscore(WATCH_TRON, 0, now);
  const members = (await r.zrange(WATCH_TRON, now, "+inf", { byScore: true })) as string[];
  return members || [];
}

export async function keepWatchingTron(addr: string): Promise<void> {
  const r = getRedis();
  const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000;
  await r.zadd(WATCH_TRON, { score: farFuture, member: addr });
}
