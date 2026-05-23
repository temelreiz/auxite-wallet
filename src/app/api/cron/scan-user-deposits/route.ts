// src/app/api/cron/scan-user-deposits/route.ts
// Auto-credit watcher (Vercel Cron, every minute). Scans the per-user deposit
// addresses that are currently "armed" (a user viewed them in the last 7 days,
// or they've received funds before) for new inbound transfers, and credits the
// mapped user automatically — no txid, no manual step. Idempotent + lock-shared
// with /api/deposit/claim via creditUserDeposit().

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { creditUserDeposit } from "@/lib/deposit-credit";
import {
  getArmedEvm,
  getArmedBtc,
  userForEvmAddress,
  userForBtcAddress,
  keepWatching,
} from "@/lib/hd-deposit";
import {
  getArmedTron,
  userForTronAddress,
  keepWatchingTron,
  TRON_USDT_CONTRACT,
} from "@/lib/tron-deposit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_EXPLORER_API = "https://base.blockscout.com/api";
const USDT_CONTRACT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2".toLowerCase();
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();
const MIN: Record<string, number> = { ETH: 0.001, USDT: 5, USDC: 5, BTC: 0.00005 };

interface Detected {
  coin: "ETH" | "USDT" | "USDC" | "BTC";
  amount: number;
  amountUsd: number;
  txHash: string;
  from: string;
}

async function getPrices(): Promise<{ ETH: number; BTC: number }> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
    const data = await (await fetch(`${baseUrl}/api/crypto`, { cache: "no-store" })).json();
    return { ETH: data.ethereum?.usd || 0, BTC: data.bitcoin?.usd || 0 };
  } catch {
    return { ETH: 0, BTC: 0 };
  }
}

async function scanEvmAddress(
  redis: ReturnType<typeof getRedis>,
  addr: string,
  prices: { ETH: number; BTC: number },
  dry: boolean
): Promise<Detected[]> {
  const lastKey = `deposit:hd:lastblock:${addr.toLowerCase()}`;
  const lastBlock = Number(await redis.get(lastKey)) || 0;
  const start = lastBlock > 0 ? lastBlock + 1 : 0;
  let maxBlock = lastBlock;
  const out: Detected[] = [];
  const lower = addr.toLowerCase();

  // Native ETH
  try {
    const url = `${BASE_EXPLORER_API}?module=account&action=txlist&address=${addr}&startblock=${start}&endblock=99999999&sort=asc`;
    const d = await (await fetch(url, { cache: "no-store" })).json();
    if (d.status === "1" && Array.isArray(d.result)) {
      for (const tx of d.result) {
        const block = parseInt(tx.blockNumber);
        if (block > maxBlock) maxBlock = block;
        if (tx.to?.toLowerCase() !== lower) continue;
        if (tx.isError === "1") continue;
        const amount = parseFloat(tx.value) / 1e18;
        if (amount < MIN.ETH) continue;
        out.push({ coin: "ETH", amount, amountUsd: amount * prices.ETH, txHash: tx.hash, from: tx.from });
      }
    }
  } catch (e) {
    console.error(`[scan-user] native ${addr}:`, e);
  }

  // ERC-20 USDT/USDC
  try {
    const url = `${BASE_EXPLORER_API}?module=account&action=tokentx&address=${addr}&startblock=${start}&endblock=99999999&sort=asc`;
    const d = await (await fetch(url, { cache: "no-store" })).json();
    if (d.status === "1" && Array.isArray(d.result)) {
      for (const tx of d.result) {
        const block = parseInt(tx.blockNumber);
        if (block > maxBlock) maxBlock = block;
        if (tx.to?.toLowerCase() !== lower) continue;
        const c = tx.contractAddress?.toLowerCase();
        if (c !== USDT_CONTRACT && c !== USDC_CONTRACT) continue;
        const coin = c === USDC_CONTRACT ? "USDC" : "USDT";
        const dec = parseInt(tx.tokenDecimal || "6", 10);
        const amount = parseFloat(tx.value) / Math.pow(10, dec);
        if (amount < MIN[coin]) continue;
        out.push({ coin, amount, amountUsd: amount, txHash: tx.hash, from: tx.from });
      }
    }
  } catch (e) {
    console.error(`[scan-user] token ${addr}:`, e);
  }

  if (!dry && maxBlock > lastBlock) await redis.set(lastKey, String(maxBlock));
  return out;
}

async function scanTronAddress(addr: string): Promise<Detected[]> {
  const out: Detected[] = [];
  try {
    const url = `https://api.trongrid.io/v1/accounts/${addr}/transactions/trc20?only_to=true&limit=50&contract_address=${TRON_USDT_CONTRACT}`;
    const headers: Record<string, string> = {};
    if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
    const data = await (await fetch(url, { headers, cache: "no-store" })).json();
    for (const t of data?.data || []) {
      if (t.to !== addr) continue;
      if (t.token_info?.address !== TRON_USDT_CONTRACT) continue;
      const decimals = Number(t.token_info?.decimals ?? 6);
      const amount = Number(t.value) / Math.pow(10, decimals);
      if (amount < MIN.USDT) continue;
      out.push({ coin: "USDT", amount, amountUsd: amount, txHash: t.transaction_id, from: t.from });
    }
  } catch (e) {
    console.error(`[scan-user] tron ${addr}:`, e);
  }
  return out;
}

async function scanBtcAddress(
  addr: string,
  prices: { ETH: number; BTC: number }
): Promise<Detected[]> {
  const out: Detected[] = [];
  try {
    const txs = await (await fetch(`https://mempool.space/api/address/${addr}/txs`, { cache: "no-store" })).json();
    if (!Array.isArray(txs)) return out;
    for (const tx of txs) {
      if (!tx.status?.confirmed) continue;
      let received = 0;
      for (const vout of tx.vout || []) {
        if (vout?.scriptpubkey_address === addr) received += Number(vout.value || 0) / 1e8;
      }
      if (received < MIN.BTC) continue;
      const from = tx.vin?.[0]?.prevout?.scriptpubkey_address || "unknown";
      out.push({ coin: "BTC", amount: received, amountUsd: received * prices.BTC, txHash: tx.txid, from });
    }
  } catch (e) {
    console.error(`[scan-user] btc ${addr}:`, e);
  }
  return out;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const redis = getRedis();
  const prices = await getPrices();

  const armedEvm = await getArmedEvm();
  const armedBtc = await getArmedBtc();
  const armedTron = await getArmedTron();

  let detected = 0;
  let credited = 0;
  let duplicate = 0;
  const sample: any[] = [];

  for (const addr of armedEvm) {
    const user = await userForEvmAddress(addr);
    if (!user) continue;
    const deps = await scanEvmAddress(redis, addr, prices, dry);
    for (const d of deps) {
      detected++;
      if (dry) {
        sample.push({ user: user.slice(0, 10) + "…", ...d, addr: addr.slice(0, 10) + "…" });
        continue;
      }
      const res = await creditUserDeposit({
        userWallet: user,
        coin: d.coin,
        amount: d.amount,
        amountUsd: d.amountUsd,
        chain: "eth",
        txHash: d.txHash,
        fromAddress: d.from,
        source: "auto-watcher",
      });
      if (res.status === "credited") {
        credited++;
        await keepWatching(addr, false);
      } else duplicate++;
    }
  }

  for (const addr of armedBtc) {
    const user = await userForBtcAddress(addr);
    if (!user) continue;
    const deps = await scanBtcAddress(addr, prices);
    for (const d of deps) {
      detected++;
      if (dry) {
        sample.push({ user: user.slice(0, 10) + "…", ...d, addr: addr.slice(0, 12) + "…" });
        continue;
      }
      const res = await creditUserDeposit({
        userWallet: user,
        coin: d.coin,
        amount: d.amount,
        amountUsd: d.amountUsd,
        chain: "btc",
        txHash: d.txHash,
        fromAddress: d.from,
        source: "auto-watcher",
      });
      if (res.status === "credited") {
        credited++;
        await keepWatching(addr, true);
      } else duplicate++;
    }
  }

  for (const addr of armedTron) {
    const user = await userForTronAddress(addr);
    if (!user) continue;
    const deps = await scanTronAddress(addr);
    for (const d of deps) {
      detected++;
      if (dry) {
        sample.push({ user: user.slice(0, 10) + "…", ...d, addr: addr.slice(0, 12) + "…" });
        continue;
      }
      const res = await creditUserDeposit({
        userWallet: user,
        coin: d.coin,
        amount: d.amount,
        amountUsd: d.amountUsd,
        chain: "tron",
        txHash: d.txHash,
        fromAddress: d.from,
        source: "auto-watcher",
      });
      if (res.status === "credited") {
        credited++;
        await keepWatchingTron(addr);
      } else duplicate++;
    }
  }

  return NextResponse.json({
    success: true,
    dry,
    armed: { evm: armedEvm.length, btc: armedBtc.length, tron: armedTron.length },
    detected,
    credited,
    duplicate,
    ...(dry ? { sample } : {}),
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
