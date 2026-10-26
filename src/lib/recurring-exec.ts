// src/lib/recurring-exec.ts
//
// Shared plumbing for the recurring-buy and recurring-stake jobs.
//
// The jobs act for a plan's owner while nobody is signed in. Rather than a
// separate internal key that bypasses the user checks, the job mints a
// short-lived login token for that owner and calls the ordinary user routes
// with it — so trade, buy-with-usd and staking apply exactly the same
// identity, ban, KYC, lock and balance rules as when the user clicks.
//
// Only cron-authenticated routes may call userToken(): plans are created by
// their signed-in owner, and this token never leaves the server.

import jwt from "jsonwebtoken";
import { sendNotification } from "@/lib/notification-sender";
import { getTokenPrices } from "@/lib/v6-token-service";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

/** Payment sources the jobs can actually execute. */
export const RECURRING_SOURCES = ["usd_balance", "usdt_balance"] as const;

/** UI terms are months; /api/staking takes days. */
export const STAKE_DAYS_BY_MONTHS: Record<number, number> = { 3: 90, 6: 180, 12: 365 };

function userToken(address: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign({ walletAddress: address.toLowerCase(), purpose: "recurring" }, secret, {
    expiresIn: "5m",
  });
}

async function callAsUser(address: string, path: string, init: RequestInit = {}) {
  const res = await fetch(BASE_URL + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${userToken(address)}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/** Spendable balances, as the user sees them (Redis + allocations − staked). */
export async function getBalances(address: string): Promise<Record<string, number>> {
  const { ok, data } = await callAsUser(address, `/api/user/balance?address=${address}`);
  if (!ok || !data?.balances) throw new Error(data?.error || "balance lookup failed");
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data.balances)) out[k] = Number(v) || 0;
  return out;
}

export async function askPerGram(metal: string): Promise<number> {
  const prices = await getTokenPrices(metal.toLowerCase());
  if (!(prices?.askPerGram > 0)) throw new Error(`no price for ${metal}`);
  return prices.askPerGram;
}

/**
 * Spend `amount` of the plan's source (USD or USDT) on `metal`.
 * Returns the grams received.
 */
export async function buyMetal(
  address: string,
  source: string,
  metal: string,
  amount: number,
): Promise<{ ok: boolean; grams: number; error?: string }> {
  if (source === "usd_balance") {
    const { ok, data } = await callAsUser(address, "/api/user/buy-with-usd", {
      method: "POST",
      body: JSON.stringify({ targetToken: metal.toLowerCase(), usdAmount: amount }),
    });
    return { ok: ok && data?.success, grams: Number(data?.data?.received?.amount) || 0, error: data?.error };
  }
  if (source === "usdt_balance") {
    const { ok, data } = await callAsUser(address, "/api/trade", {
      method: "POST",
      body: JSON.stringify({
        address,
        type: "buy",
        fromToken: "USDT",
        toToken: metal.toUpperCase(),
        fromAmount: amount,
        executeOnChain: false,
      }),
    });
    return { ok: ok && data?.success, grams: Number(data?.transaction?.toAmount) || 0, error: data?.error };
  }
  return { ok: false, grams: 0, error: `unsupported payment source ${source}` };
}

export async function stakeMetal(
  address: string,
  metal: string,
  grams: number,
  months: number,
): Promise<{ ok: boolean; error?: string }> {
  const duration = STAKE_DAYS_BY_MONTHS[months];
  if (!duration) return { ok: false, error: `unsupported term ${months} months` };
  const { ok, data } = await callAsUser(address, "/api/staking", {
    method: "POST",
    body: JSON.stringify({ action: "create", metal: metal.toUpperCase(), amount: grams, duration, address }),
  });
  return { ok: ok && data?.success !== false, error: data?.error };
}

export async function notify(address: string, title: string, body: string): Promise<void> {
  try {
    await sendNotification(address, "transaction", { title, body, tag: "recurring" });
  } catch (err) {
    console.error("recurring notify failed:", err);
  }
}
