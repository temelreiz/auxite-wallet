// ============================================================================
// src/lib/dex-swap.ts — in-house hot-wallet swaps via on-chain DEX (Base, 0x).
//
// Piece 2 of "solve fiat→crypto in-house". Lets the Base hot wallet produce the
// exact asset a withdrawal needs (e.g. USDC → ETH) ON-DEMAND, with NO external
// exchange and NO KYC — because it is just our own wallet swapping its own
// crypto on a public DEX. This removes the need to pre-fund standing ETH/BTC
// floats and closes the unhedged-volatile exposure that crypto-position.ts
// reports (real ETH only exists at the instant of withdrawal).
//
// SAFETY — money-moving code, gated hard:
//   • Execution requires BOTH env DEX_SWAP_ENABLED==="true" AND an explicit
//     { dryRun:false } call. Default is dryRun:true → returns a PLAN, sends
//     nothing. With the flag unset, execution throws before any tx.
//   • Quotes (get0xQuote / planSwapToCover) are always safe — read-only price
//     calls, no signing.
//
// Scope: Base-chain assets only (USDC ↔ USDT ↔ ETH). Native BTC is a different
// chain and cannot be produced by a Base DEX swap — that path needs a bridge or
// a small native float and is intentionally reported as unsupported here.
//
// Reuses the hot-wallet signer pattern from blockchain-service.ts (AWS Secrets
// Manager → HOT_WALLET_ETH_PRIVATE_KEY → ethers.Wallet on BASE_RPC).
// ============================================================================

import { ethers } from "ethers";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const BASE_RPC =
  process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";
const BASE_CHAIN_ID = 8453;

// Base-mainnet token addresses. Native ETH uses the 0x sentinel address.
const ETH_SENTINEL = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const USDT_BASE = process.env.USDT_BASE_CONTRACT_ADDRESS || "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";

const TOKENS = {
  eth: { address: ETH_SENTINEL, decimals: 18, native: true },
  usdc: { address: USDC_BASE, decimals: 6, native: false },
  usdt: { address: USDT_BASE, decimals: 6, native: false },
} as const;
export type SwapAsset = keyof typeof TOKENS;

const ZEROX_BASE = "https://api.0x.org";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
];

function enabled(): boolean {
  return process.env.DEX_SWAP_ENABLED === "true";
}

// ── Hot-wallet signer (mirrors blockchain-service.ts) ───────────────────────
let cachedKey: string | null = null;
let keyFetchedAt = 0;
const KEY_TTL = 5 * 60 * 1000;

async function hotWalletKey(): Promise<string> {
  if (cachedKey && Date.now() - keyFetchedAt < KEY_TTL) return cachedKey;
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    cachedKey = process.env.HOT_WALLET_ETH_PRIVATE_KEY || "";
    keyFetchedAt = Date.now();
    return cachedKey;
  }
  const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || "eu-central-1",
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! },
  });
  const res = await client.send(new GetSecretValueCommand({ SecretId: process.env.AWS_SECRET_NAME || "auxite/hot-wallet" }));
  const secrets = res.SecretString ? JSON.parse(res.SecretString) : {};
  cachedKey = secrets.HOT_WALLET_ETH_PRIVATE_KEY || process.env.HOT_WALLET_ETH_PRIVATE_KEY || "";
  keyFetchedAt = Date.now();
  return cachedKey!;
}

function provider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(BASE_RPC);
}

// ── 0x quote (read-only) ────────────────────────────────────────────────────
export interface ZeroXQuote {
  sellAsset: SwapAsset;
  buyAsset: SwapAsset;
  sellAmount: string;        // base units of sellAsset
  buyAmount: string;         // base units of buyAsset (expected)
  minBuyAmount: string;      // base units after slippage
  allowanceTarget: string | null; // spender to approve sellToken for (null if native)
  to: string;                // tx target
  data: string;
  value: string;             // wei (native sell only)
  ok: boolean;
  error?: string;
  raw?: any;
}

/**
 * Quote a swap on Base via 0x. Specify ONE of buyAmount / sellAmount in the
 * respective asset's base units. Read-only; never signs.
 */
export async function get0xQuote(args: {
  sellAsset: SwapAsset;
  buyAsset: SwapAsset;
  buyAmount?: bigint;
  sellAmount?: bigint;
  taker: string;
  slippageBps?: number;
}): Promise<ZeroXQuote> {
  const { sellAsset, buyAsset, buyAmount, sellAmount, taker, slippageBps = 100 } = args;
  const base: ZeroXQuote = {
    sellAsset, buyAsset, sellAmount: sellAmount?.toString() || "0", buyAmount: "0",
    minBuyAmount: "0", allowanceTarget: null, to: "", data: "", value: "0", ok: false,
  };
  const apiKey = process.env.ZEROX_API_KEY;
  if (!apiKey) return { ...base, error: "ZEROX_API_KEY not configured" };
  if (!buyAmount && !sellAmount) return { ...base, error: "specify buyAmount or sellAmount" };

  const qs = new URLSearchParams({
    chainId: String(BASE_CHAIN_ID),
    sellToken: TOKENS[sellAsset].address,
    buyToken: TOKENS[buyAsset].address,
    taker,
    slippageBps: String(slippageBps),
  });
  if (buyAmount) qs.set("buyAmount", buyAmount.toString());
  if (sellAmount) qs.set("sellAmount", sellAmount.toString());

  try {
    const res = await fetch(`${ZEROX_BASE}/swap/allowance-holder/quote?${qs.toString()}`, {
      headers: { "0x-api-key": apiKey, "0x-version": "v2" },
      cache: "no-store",
    });
    const d = await res.json();
    if (!res.ok) return { ...base, error: d?.reason || d?.message || `0x ${res.status}`, raw: d };
    const tx = d.transaction || {};
    return {
      sellAsset, buyAsset,
      sellAmount: String(d.sellAmount ?? base.sellAmount),
      buyAmount: String(d.buyAmount ?? "0"),
      minBuyAmount: String(d.minBuyAmount ?? d.buyAmount ?? "0"),
      allowanceTarget: d?.issues?.allowance?.spender || tx.to || null,
      to: tx.to || "",
      data: tx.data || "",
      value: String(tx.value ?? "0"),
      ok: Boolean(tx.to && tx.data),
      raw: d,
    };
  } catch (e: any) {
    return { ...base, error: e?.message || "0x_fetch_failed" };
  }
}

// ── Cover-a-withdrawal planner / executor ───────────────────────────────────
export interface CoverPlan {
  coin: string;                 // requested withdrawal asset
  requiredNative: number;       // amount the withdrawal needs (human units)
  heldNative: number;           // hot-wallet balance of that asset (human units)
  shortfallNative: number;      // max(0, required − held)
  action: "none" | "swap" | "unsupported";
  fundingAsset?: SwapAsset;     // what we sell to cover (always usdc here)
  quote?: ZeroXQuote;
  note?: string;
}

const FUNDING_ASSET: SwapAsset = "usdc"; // sell stablecoin to produce the needed asset

function isSwappable(coin: string): coin is "ETH" | "USDT" | "USDC" {
  return coin === "ETH" || coin === "USDT" || coin === "USDC";
}

async function heldOf(asset: SwapAsset, hot: string, p: ethers.JsonRpcProvider): Promise<number> {
  if (TOKENS[asset].native) return Number(ethers.formatEther(await p.getBalance(hot)));
  const c = new ethers.Contract(TOKENS[asset].address, ERC20_ABI, p);
  const bal = (await c.balanceOf(hot)) as bigint;
  return Number(ethers.formatUnits(bal, TOKENS[asset].decimals));
}

/**
 * Plan (and optionally execute) the swap that guarantees the hot wallet holds
 * enough of `coin` to satisfy a withdrawal of `requiredNative`.
 *
 * dryRun=true (default): returns the plan, signs nothing.
 * dryRun=false: requires DEX_SWAP_ENABLED==="true"; approves + sends the swap
 *               tx from the hot wallet and waits for confirmation.
 *
 * BTC and any non-Base asset return action:"unsupported" (handle via bridge or
 * a native float — out of scope for the Base DEX path).
 */
export async function planSwapToCover(args: {
  coin: string;
  requiredNative: number;
  bufferBps?: number;   // extra to buy over the shortfall (gas/slippage/rounding)
  dryRun?: boolean;
}): Promise<CoverPlan> {
  const { coin, requiredNative, bufferBps = 150, dryRun = true } = args;
  const upper = coin.toUpperCase();

  if (!isSwappable(upper)) {
    return {
      coin: upper, requiredNative, heldNative: 0, shortfallNative: 0, action: "unsupported",
      note: `${upper} cannot be produced by a Base DEX swap (different chain). Use a native float or bridge.`,
    };
  }

  const asset = upper.toLowerCase() as SwapAsset;
  const p = provider();
  const key = await hotWalletKey();
  if (!key) return { coin: upper, requiredNative, heldNative: 0, shortfallNative: 0, action: "unsupported", note: "hot wallet key unavailable" };
  const hot = new ethers.Wallet(key).address;

  const held = await heldOf(asset, hot, p);
  const shortfall = Math.max(0, requiredNative - held);
  if (shortfall <= 0) {
    return { coin: upper, requiredNative, heldNative: held, shortfallNative: 0, action: "none" };
  }

  // Quote: buy the shortfall (+buffer) of `asset` by selling USDC.
  const buyHuman = shortfall * (1 + bufferBps / 10_000);
  const buyAmount = ethers.parseUnits(buyHuman.toFixed(TOKENS[asset].decimals), TOKENS[asset].decimals);
  const quote = await get0xQuote({ sellAsset: FUNDING_ASSET, buyAsset: asset, buyAmount, taker: hot });

  const plan: CoverPlan = {
    coin: upper, requiredNative, heldNative: held, shortfallNative: shortfall,
    action: "swap", fundingAsset: FUNDING_ASSET, quote,
  };

  if (dryRun) {
    plan.note = "dry-run: no swap executed";
    return plan;
  }
  if (!enabled()) {
    throw new Error("DEX swap execution is disabled (set DEX_SWAP_ENABLED=true to allow).");
  }
  if (!quote.ok) {
    throw new Error(`Cannot execute swap — quote failed: ${quote.error || "unknown"}`);
  }

  // ── Execute: approve funding token (if needed) then send the swap tx ──────
  const wallet = new ethers.Wallet(key, p);
  if (quote.allowanceTarget && !TOKENS[FUNDING_ASSET].native) {
    const sell = new ethers.Contract(TOKENS[FUNDING_ASSET].address, ERC20_ABI, wallet);
    const needed = BigInt(quote.sellAmount || "0");
    const current = (await sell.allowance(hot, quote.allowanceTarget)) as bigint;
    if (current < needed) {
      const approveTx = await sell.approve(quote.allowanceTarget, ethers.MaxUint256);
      await approveTx.wait(1);
      plan.note = `approved ${FUNDING_ASSET} for ${quote.allowanceTarget}; `;
    }
  }
  const swapTx = await wallet.sendTransaction({ to: quote.to, data: quote.data, value: BigInt(quote.value || "0") });
  const receipt = await swapTx.wait(1);
  plan.note = (plan.note || "") + `swap confirmed ${receipt?.hash || swapTx.hash}`;
  return plan;
}
