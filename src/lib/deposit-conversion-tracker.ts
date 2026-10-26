// Fires the Google Ads "deposit" conversion (and a GA4 vault_funded event)
// once per real, completed deposit. Deposits are credited server-side
// (crypto watcher, Wise webhook, card), so the web vault learns about them
// from the transaction list on refresh — same approach as the mobile app's
// lib/funding-tracker.ts.
//
// The first run in a browser only records deposits already on the account,
// so shipping this never back-fills old deposits as new conversions. Only
// type "deposit" counts — admin grants and bonuses don't.

import { fireConversion } from "@/lib/google-ads-conversion";
import { logEvent } from "@/lib/analytics";
import { isGenuineDeposit } from "@/lib/genuine-deposit";

const SEEN_KEY = (address: string) => `auxite_seen_deposits:${address.toLowerCase()}`;
const MIN_INTERVAL_MS = 60_000;
const MAX_SEEN = 200;

let lastRunAt = 0;
let running = false;

type DepositTx = Record<string, any>;

const depositKey = (tx: DepositTx): string | null =>
  tx.id || tx.txHash || tx.metadata?.txHash || tx.resourceId || tx.reference ||
  (tx.createdAt || tx.timestamp ? `${tx.createdAt || tx.timestamp}:${tx.amount}` : null);

const depositUsd = (tx: DepositTx): number => {
  const v = Number(tx.amountUsd ?? tx.usdValue ?? tx.metadata?.amountUsd ?? 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
};

const depositMethod = (tx: DepositTx): "crypto" | "card" | "wire" | "other" => {
  const src = String(tx.source || tx.metadata?.source || tx.subType || "").toLowerCase();
  if (src.includes("wise") || src.includes("wire") || src.includes("bank")) return "wire";
  if (src.includes("stripe") || src.includes("card") || src.includes("transak")) return "card";
  if (tx.txHash || tx.metadata?.txHash || tx.metadata?.chain) return "crypto";
  return "other";
};

function readSeen(address: string): string[] | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY(address));
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSeen(address: string, seen: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY(address), JSON.stringify([...seen].slice(-MAX_SEEN)));
  } catch {}
}

export async function trackNewDeposits(address: string | null | undefined): Promise<void> {
  if (typeof window === "undefined") return;
  if (!address || running || Date.now() - lastRunAt < MIN_INTERVAL_MS) return;
  running = true;
  lastRunAt = Date.now();
  try {
    const res = await fetch(`/api/transactions?address=${address}&type=deposit&status=completed&limit=20`);
    const data = await res.json();
    const txs: DepositTx[] = Array.isArray(data?.transactions) ? data.transactions : [];

    const prior = readSeen(address);
    const firstRun = prior === null;
    const seen = new Set<string>(prior || []);

    for (const tx of txs) {
      const key = depositKey(tx);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      // Fabricated (debug_add_balance) and internal admin rows must never
      // reach Google Ads as a deposit conversion.
      if (!isGenuineDeposit(tx)) continue;
      const usd = depositUsd(tx);
      if (firstRun || usd <= 0) continue;
      const value = Math.round(usd * 100) / 100;
      fireConversion("deposit", { value, currency: "USD", transactionId: key });
      logEvent("vault_funded", {
        value,
        currency: "USD",
        value_usd: value,
        payment_method: depositMethod(tx),
        asset: tx.coin || tx.token || tx.currency,
      });
    }

    writeSeen(address, seen);
  } catch (e) {
    console.warn("[deposit-conversion] check failed", e);
  } finally {
    running = false;
  }
}
