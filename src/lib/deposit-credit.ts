// src/lib/deposit-credit.ts
// Single, idempotent crediting path shared by the auto-credit watcher
// (scan-user-deposits) and the manual txid-claim endpoint. Keeping one
// implementation prevents the two paths from diverging or double-crediting:
// both take the same per-tx lock and honor the same `deposit:tx` marker.

import { getRedis, incrementBalance, addTransaction } from "./redis";

export type CreditStatus = "credited" | "duplicate";

export interface CreditParams {
  userWallet: string;
  coin: "ETH" | "USDT" | "USDC" | "BTC";
  amount: number;
  amountUsd: number;
  chain: "eth" | "btc" | "tron";
  txHash: string;
  fromAddress: string;
  source: string; // "auto-watcher" | "user-claim" | ...
}

export interface CreditResult {
  status: CreditStatus;
  coin?: string;
  amount?: number;
  amountUsd?: number;
  autoConverted?: boolean;
  creditedToken?: string;
  creditedAmount?: number;
  txId?: string;
}

async function getUserAutoConvert(
  redis: ReturnType<typeof getRedis>,
  address: string
): Promise<boolean> {
  // Default OFF: deposits are held as the crypto the user sent (shown in the
  // Liquidity / Cash & Crypto screen). Conversion to AUXM happens later at
  // purchase time, which is where the fee/spread is captured. Only auto-convert
  // when the user has explicitly opted in.
  try {
    const settings = await redis.hgetall(`user:${address.toLowerCase()}:settings`);
    return String((settings as any)?.autoConvertToAuxm) === "true";
  } catch {
    return false;
  }
}

export async function creditUserDeposit(params: CreditParams): Promise<CreditResult> {
  const { userWallet, coin, amount, amountUsd, chain, txHash, fromAddress, source } = params;
  const redis = getRedis();
  const address = userWallet.toLowerCase();
  const txKey = `deposit:tx:${txHash}`;

  if ((await redis.get(txKey)) === "credited") return { status: "duplicate" };

  // Shared per-tx lock — also held by /api/deposit/claim, so the watcher and a
  // manual claim of the same tx can never both credit it.
  const lockKey = `deposit:claimlock:${txHash}`;
  const locked = await redis.set(lockKey, source, { nx: true, ex: 60 });
  if (!locked) return { status: "duplicate" };

  try {
    if ((await redis.get(txKey)) === "credited") return { status: "duplicate" };

    const autoConvert = await getUserAutoConvert(redis, address);
    let creditedToken: string;
    let creditedAmount: number;
    if (autoConvert) {
      await incrementBalance(address, { auxm: amountUsd } as any);
      creditedToken = "AUXM";
      creditedAmount = amountUsd;
    } else {
      await incrementBalance(address, { [coin.toLowerCase()]: amount } as any);
      creditedToken = coin;
      creditedAmount = amount;
    }

    const txId = await addTransaction(address, {
      type: "deposit",
      token: coin,
      amount,
      status: "completed",
      metadata: {
        source,
        chain,
        txHash,
        fromAddress,
        amountUsd,
        autoConverted: autoConvert,
        creditedToken,
        creditedAmount,
      },
    });

    await redis.set(txKey, "credited", { ex: 86400 * 365 });
    await redis.set(
      `deposit:assigned:${txHash}`,
      JSON.stringify({
        walletAddress: address,
        coin,
        amount,
        amountUsd,
        autoConverted: autoConvert,
        txHash,
        assignedAt: new Date().toISOString(),
        source,
      }),
      { ex: 86400 * 365 }
    );

    // Recent-credits feed for the /admin Deposits panel (best-effort).
    try {
      await redis.lpush(
        "deposit:credits:recent",
        JSON.stringify({
          walletAddress: address,
          coin,
          amount,
          amountUsd,
          creditedToken,
          creditedAmount,
          autoConverted: autoConvert,
          chain,
          txHash,
          fromAddress,
          source,
          at: Date.now(),
        })
      );
      await redis.ltrim("deposit:credits:recent", 0, 199);
    } catch {}

    // Push (best-effort, non-blocking)
    try {
      const { notifyTransactionRich } = await import("./notification-sender");
      notifyTransactionRich(address, {
        type: "deposit",
        amount,
        token: coin,
        txHash,
        fromAddress,
        channel: "default",
      }).catch((e) => console.error("[deposit-credit] push failed:", e));
    } catch (e) {
      console.error("[deposit-credit] push import failed:", e);
    }

    // Email (best-effort)
    try {
      const userData = (await redis.hgetall(`user:${address}`)) as Record<string, string> | null;
      const email = userData?.email || null;
      if (email) {
        const { sendDepositConfirmedEmail } = await import("./email-service");
        const emailAmount = autoConvert ? amountUsd.toFixed(2) : String(amount);
        const emailToken = autoConvert ? "AUXM" : coin;
        sendDepositConfirmedEmail(
          email,
          userData?.name || "Client",
          emailAmount,
          emailToken,
          txHash,
          userData?.language || "en"
        ).catch((e) => console.error("[deposit-credit] email failed:", e));
      }
    } catch (e) {
      console.error("[deposit-credit] email lookup failed:", e);
    }

    return {
      status: "credited",
      coin,
      amount,
      amountUsd,
      autoConverted: autoConvert,
      creditedToken,
      creditedAmount,
      txId,
    };
  } finally {
    await redis.del(lockKey).catch(() => {});
  }
}
