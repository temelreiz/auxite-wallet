// ============================================================================
// src/lib/treasury-balances.ts — on-chain treasury balance readers.
//
// Single source of truth for "what liquid value the platform actually holds":
//   • Base hot wallet (USDC / USDT / ETH)
//   • Tron treasury (TRX / USDT)
//   • BTC hot wallet
//   • USD cash (treasury:usd:cash)
//
// Extracted from /api/admin/reserve-control so the AUXM reconciliation layer
// (src/lib/auxm-ledger.ts) and the admin surface can share one implementation.
// ============================================================================

import { ethers } from "ethers";
import { getRedis } from "./redis";
import { deriveTronAddress, TRON_USDT_CONTRACT, isTronConfigured } from "./tron-deposit";

const BASE_RPC = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const HOT_EVM = (process.env.HOT_WALLET_ETH_ADDRESS || "").toLowerCase();
const HOT_BTC = process.env.HOT_WALLET_BTC_ADDRESS || "";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT_BASE = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
const ERC20 = ["function balanceOf(address) view returns (uint256)"];
const SUN = 1_000_000;

export interface BaseTreasury { address: string | null; usdc: number; usdt: number; eth: number; ok: boolean; error?: string }
export interface TronTreasury { address: string | null; trx: number; usdt: number; ok: boolean; error?: string }
export interface BtcTreasury { address: string | null; btc: number; ok: boolean; error?: string }
export interface CryptoSpot { eth: number; btc: number; ok: boolean }

export function tronTreasury(): string {
  if (process.env.HOT_WALLET_TRON_ADDRESS) return process.env.HOT_WALLET_TRON_ADDRESS;
  try { return isTronConfigured() ? deriveTronAddress(0) : ""; } catch { return ""; }
}

// Base hot wallet: USDC / USDT / ETH.
export async function baseTreasury(): Promise<BaseTreasury> {
  const out: BaseTreasury = { address: HOT_EVM || null, usdc: 0, usdt: 0, eth: 0, ok: false };
  if (!HOT_EVM) return out;
  try {
    const p = new ethers.JsonRpcProvider(BASE_RPC);
    const usdc = new ethers.Contract(USDC_BASE, ERC20, p);
    const usdt = new ethers.Contract(USDT_BASE, ERC20, p);
    const wei = await p.getBalance(HOT_EVM);
    const c = (await usdc.balanceOf(HOT_EVM)) as bigint;
    const t = (await usdt.balanceOf(HOT_EVM)) as bigint;
    out.eth = Number(ethers.formatEther(wei));
    out.usdc = Number(ethers.formatUnits(c, 6));
    out.usdt = Number(ethers.formatUnits(t, 6));
    out.ok = true;
  } catch (e: any) {
    out.error = e?.shortMessage || e?.message || "rpc_error";
  }
  return out;
}

// Tron treasury: TRX + USDT via TronGrid (uses TRONGRID_API_KEY if set).
export async function tronTreasuryBalances(): Promise<TronTreasury> {
  const address = tronTreasury();
  const out: TronTreasury = { address: address || null, trx: 0, usdt: 0, ok: false };
  if (!address) return out;
  try {
    const headers: Record<string, string> = { accept: "application/json" };
    if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${address}`, { headers, cache: "no-store" });
    const data = await res.json();
    const acct = (data?.data || [])[0] || {};
    out.trx = Number(acct.balance || 0) / SUN;
    const trc = acct.trc20 || [];
    for (const entry of trc) {
      const raw = entry[TRON_USDT_CONTRACT];
      if (raw !== undefined) out.usdt = Number(raw) / SUN;
    }
    out.ok = true;
  } catch (e: any) {
    out.error = e?.message || "trongrid_error";
  }
  return out;
}

export async function btcTreasury(): Promise<BtcTreasury> {
  if (!HOT_BTC) return { address: null, btc: 0, ok: false };
  try {
    const res = await fetch(`https://blockstream.info/api/address/${HOT_BTC}`, { cache: "no-store" });
    const d = await res.json();
    const funded = d?.chain_stats?.funded_txo_sum || 0;
    const spent = d?.chain_stats?.spent_txo_sum || 0;
    return { address: HOT_BTC, btc: (funded - spent) / 1e8, ok: true };
  } catch (e: any) {
    return { address: HOT_BTC, btc: 0, ok: false, error: e?.message };
  }
}

// ETH/BTC spot (USD) for valuation — best-effort via CoinGecko.
export async function cryptoSpot(): Promise<CryptoSpot> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin&vs_currencies=usd",
      { cache: "no-store" }
    );
    const d = await res.json();
    return { eth: Number(d?.ethereum?.usd || 0), btc: Number(d?.bitcoin?.usd || 0), ok: true };
  } catch {
    return { eth: 0, btc: 0, ok: false };
  }
}

export interface BackingUsd {
  usd: number;
  ok: boolean;
  breakdown: Record<string, number>;
  sources: { base: BaseTreasury; tron: TronTreasury; btc: BtcTreasury; spot: CryptoSpot; cash: number };
}

// Pure: turn already-fetched treasury reads into a USD total + breakdown.
//
// `bridgeInflight` = stablecoin already sent to a Bridge liquidation address but
// whose USD has not yet landed in Wise (and so isn't in `cash` yet). Counting it
// keeps the backing whole across the off-ramp conversion window — see
// src/lib/bridge-offramp.ts.
export function computeBackingUsd(
  base: BaseTreasury,
  tron: TronTreasury,
  btc: BtcTreasury,
  spot: CryptoSpot,
  cash: number,
  bridgeInflight = 0
): BackingUsd {
  const breakdown: Record<string, number> = {
    base_usdc: base.usdc || 0,
    base_usdt: base.usdt || 0,
    base_eth_usd: (base.eth || 0) * (spot.eth || 0),
    tron_usdt: tron.usdt || 0,
    btc_usd: (btc.btc || 0) * (spot.btc || 0),
    cash_usd: cash || 0,
    bridge_inflight_usd: bridgeInflight || 0,
  };
  const usd = Object.values(breakdown).reduce((a, b) => a + b, 0);
  // "ok" means we trust the number enough to drive a solvency verdict:
  // base RPC succeeded and we have an ETH spot price (the largest swing factor).
  const ok = base.ok && spot.ok;
  return { usd, ok, breakdown, sources: { base, tron, btc, spot, cash } };
}

// Fetch all treasury reads and return the consolidated liquid backing in USD.
export async function liquidBackingUsd(): Promise<BackingUsd> {
  const [base, tron, btc, spot, cash, inflight] = await Promise.all([
    baseTreasury(),
    tronTreasuryBalances(),
    btcTreasury(),
    cryptoSpot(),
    getRedis().get("treasury:usd:cash").then((v) => (v != null ? Number(v) : 0)).catch(() => 0),
    getRedis().get("treasury:bridge:inflight_usd").then((v) => (v != null ? Number(v) : 0)).catch(() => 0),
  ]);
  return computeBackingUsd(base, tron, btc, spot, cash, inflight);
}
