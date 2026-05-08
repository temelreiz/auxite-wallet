// src/app/api/cron/hot-wallet-alert/route.ts
// Hot wallet balance monitor with state-tracked Telegram alerts.
//
// Runs every 30 min (Vercel cron). Reads ETH, USDC, USDT balances on Base
// for the signer wallet. Compares to thresholds; sends a Telegram alert
// only when an asset CROSSES below its threshold (no spam).
//
// State stored in redis: hot-wallet:alert:state = { eth: 'ok'|'low'|'critical', ... }
// On recovery (balance back above threshold), sends a "RESOLVED" message.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";
import { sendTelegramMessage } from "@/lib/telegram";

const redis = Redis.fromEnv();
const SECRET = process.env.CRON_SECRET || "";

// Thresholds — tune via env later if needed
const THRESHOLDS = {
  ETH:  { critical: 0.005, low: 0.02 },   // gas wallet
  USDC: { critical: 100,   low: 500 },    // payout liquidity
  USDT: { critical: 100,   low: 500 },    // payout liquidity (Ethereum mainnet)
};

const TOKENS = {
  USDC_BASE: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDT_BASE: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
};

const ERC20_BALANCE_OF_ABI = ["function balanceOf(address) view returns (uint256)"];

type Status = "ok" | "low" | "critical";

function classify(balance: number, asset: keyof typeof THRESHOLDS): Status {
  const t = THRESHOLDS[asset];
  if (balance < t.critical) return "critical";
  if (balance < t.low) return "low";
  return "ok";
}

async function getBalances(addr: string) {
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
  const eth = await provider.getBalance(addr);
  const usdcContract = new ethers.Contract(TOKENS.USDC_BASE, ERC20_BALANCE_OF_ABI, provider);
  const usdtContract = new ethers.Contract(TOKENS.USDT_BASE, ERC20_BALANCE_OF_ABI, provider);
  const [usdcRaw, usdtRaw] = await Promise.all([
    usdcContract.balanceOf(addr).catch(() => 0n),
    usdtContract.balanceOf(addr).catch(() => 0n),
  ]);
  return {
    eth: parseFloat(ethers.formatEther(eth)),
    usdc: Number(usdcRaw) / 1e6,
    usdt: Number(usdtRaw) / 1e6,
  };
}

function statusEmoji(s: Status): string {
  return s === "critical" ? "🚨" : s === "low" ? "⚠️" : "✅";
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get("Authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addr = process.env.HOT_WALLET_ETH_ADDRESS;
  if (!addr) {
    return NextResponse.json({ error: "HOT_WALLET_ETH_ADDRESS not configured" }, { status: 500 });
  }

  const balances = await getBalances(addr);
  const newStatus: Record<string, Status> = {
    eth:  classify(balances.eth,  "ETH"),
    usdc: classify(balances.usdc, "USDC"),
    usdt: classify(balances.usdt, "USDT"),
  };

  // Read previous state
  const prev = ((await redis.get("hot-wallet:alert:state")) as Record<string, Status> | null) || {
    eth: "ok", usdc: "ok", usdt: "ok",
  };

  // Detect transitions worth notifying:
  //   ok → low | low → critical | ok → critical : ALERT
  //   critical → low | low → ok | critical → ok : RESOLVED
  const transitions: Array<{ asset: string; from: Status; to: Status; balance: number; direction: "down" | "up" }> = [];
  for (const k of ["eth", "usdc", "usdt"] as const) {
    const from = prev[k] || "ok";
    const to = newStatus[k];
    if (from === to) continue;
    const order = { ok: 0, low: 1, critical: 2 };
    transitions.push({
      asset: k.toUpperCase(),
      from, to,
      balance: (balances as any)[k],
      direction: order[to] > order[from] ? "down" : "up",
    });
  }

  // Send alerts
  let sent = 0;
  for (const t of transitions) {
    const emoji = t.direction === "down" ? statusEmoji(t.to) : "✅";
    const dirWord = t.direction === "down" ? "DROP" : "RECOVERED";
    const msg = [
      `${emoji} <b>Hot wallet ${t.asset} ${dirWord}</b>`,
      ``,
      `Status: ${t.from.toUpperCase()} → <b>${t.to.toUpperCase()}</b>`,
      `Balance: <code>${t.balance.toFixed(t.asset === "ETH" ? 6 : 2)} ${t.asset}</code>`,
      `Threshold low: ${THRESHOLDS[t.asset as keyof typeof THRESHOLDS].low}`,
      `Threshold critical: ${THRESHOLDS[t.asset as keyof typeof THRESHOLDS].critical}`,
      ``,
      `Address: <code>${addr}</code>`,
      `Network: Base`,
      t.to === "critical" ? "→ Top-up urgent. Withdraws will queue." : "",
    ].filter(Boolean).join("\n");

    try {
      await sendTelegramMessage(msg);
      sent++;
    } catch (e) {
      console.error("[hot-wallet-alert] telegram send failed:", e);
    }
  }

  // Persist new state
  await redis.set("hot-wallet:alert:state", newStatus);
  await redis.lpush("cron:hot-wallet-alert:log", JSON.stringify({
    timestamp: Date.now(),
    balances,
    status: newStatus,
    transitions,
    alertsSent: sent,
  }));
  await redis.ltrim("cron:hot-wallet-alert:log", 0, 49);

  return NextResponse.json({
    success: true,
    balances,
    status: newStatus,
    transitions,
    alertsSent: sent,
  });
}
