// ============================================================================
// POST /api/deposit/claim
// ----------------------------------------------------------------------------
// User-initiated deposit claim. The user pastes the txid of a crypto transfer
// they sent to the platform hot wallet; we verify it on-chain and credit the
// *logged-in* user — instead of trying to guess the owner from the sender
// address (which never works for exchange withdrawals, the common case).
//
// Security: amount + coin come from the chain, never from the client. The only
// client input is (address of the caller, txHash). A given txHash can be
// credited exactly once (deposit:tx:{hash} == "credited") and is protected by
// a short claim lock against concurrent double-submits.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRedis, incrementBalance, addTransaction, getUserBalance } from "@/lib/redis";
import { verifyHotWalletDeposit } from "@/lib/deposit-verify";
import { sendDepositConfirmedEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  address: z.string().min(10),
  txHash: z.string().min(10).max(100),
});

// Map a verifier failure reason to an HTTP status + user-facing error code.
const REASON_HTTP: Record<string, number> = {
  missing_txhash: 400,
  invalid_txhash: 400,
  tx_failed: 400,
  not_to_hot_wallet: 400,
  below_minimum: 400,
  pending_confirmations: 202,
  tx_not_found: 404,
  hot_wallet_not_configured: 503,
  explorer_error: 503,
};

async function getUserAutoConvert(redis: ReturnType<typeof getRedis>, address: string): Promise<boolean> {
  // Default OFF — hold the deposited crypto; only convert if the user opted in.
  try {
    const settings = await redis.hgetall(`user:${address.toLowerCase()}:settings`);
    return String((settings as any)?.autoConvertToAuxm) === "true";
  } catch {
    return false;
  }
}

async function bestEffortRemoveFromPending(redis: ReturnType<typeof getRedis>, txHash: string) {
  try {
    const raw = await redis.lrange("deposits:pending", 0, 499);
    for (const item of raw) {
      const obj = typeof item === "string" ? JSON.parse(item) : item;
      if (obj && String(obj.txHash).toLowerCase() === txHash.toLowerCase()) {
        await redis.lrem("deposits:pending", 1, item as any);
      }
    }
  } catch {
    // non-fatal — the "credited" marker still blocks any re-credit
  }
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  const redis = getRedis();
  const address = body.address.toLowerCase();
  const txHash = body.txHash.trim();

  // Caller must be a known user (so we never credit a phantom address).
  const userId = (await redis.get(`user:address:${address}`)) as string | null;
  const walletEmail = (await redis.get(`wallet:${address}`)) as string | null;
  if (!userId && !walletEmail) {
    return NextResponse.json({ success: false, error: "user_not_found" }, { status: 404 });
  }

  // Fast reject if already credited.
  const txKey = `deposit:tx:${txHash}`;
  if ((await redis.get(txKey)) === "credited") {
    return NextResponse.json({ success: false, error: "already_claimed" }, { status: 409 });
  }

  // Verify on-chain — amount + coin come from here, not the client.
  const v = await verifyHotWalletDeposit(txHash);
  if (!v.ok) {
    return NextResponse.json(
      { success: false, error: v.reason },
      { status: REASON_HTTP[v.reason] ?? 400 }
    );
  }

  // Concurrency guard: only one in-flight claim per txHash.
  const lockKey = `deposit:claimlock:${txHash}`;
  const locked = await redis.set(lockKey, address, { nx: true, ex: 60 });
  if (!locked) {
    return NextResponse.json({ success: false, error: "processing" }, { status: 409 });
  }

  try {
    // Re-check inside the lock.
    if ((await redis.get(txKey)) === "credited") {
      return NextResponse.json({ success: false, error: "already_claimed" }, { status: 409 });
    }

    const amountUsd =
      v.amountUsdHint != null ? v.amountUsdHint : v.coin === "USDT" || v.coin === "USDC" ? v.amount : 0;

    const autoConvert = await getUserAutoConvert(redis, address);

    let credited: { token: string; amount: number };
    if (autoConvert) {
      await incrementBalance(address, { auxm: amountUsd } as any, {
        auxmReason: "deposit",
        counterAsset: v.coin,
        counterAmount: v.amount,
        refTxHash: txHash,
        meta: { source: "user-claim", chain: v.chain, fromAddress: v.fromAddress },
      });
      credited = { token: "AUXM", amount: amountUsd };
    } else {
      const coinKey = v.coin.toLowerCase();
      await incrementBalance(address, { [coinKey]: v.amount } as any);
      credited = { token: v.coin, amount: v.amount };
    }

    const txId = await addTransaction(address, {
      type: "deposit",
      token: v.coin,
      amount: v.amount,
      status: "completed",
      metadata: {
        source: "user-claim",
        chain: v.chain,
        txHash,
        fromAddress: v.fromAddress,
        amountUsd,
        autoConverted: autoConvert,
        creditedToken: credited.token,
        creditedAmount: credited.amount,
        confirmations: v.confirmations,
      },
    });

    // Mark credited (one-time) + assignment record.
    await redis.set(txKey, "credited", { ex: 86400 * 365 });
    await redis.set(
      `deposit:assigned:${txHash}`,
      JSON.stringify({
        walletAddress: address,
        email: walletEmail || null,
        coin: v.coin,
        amount: v.amount,
        amountUsd,
        autoConverted: autoConvert,
        txHash,
        assignedAt: new Date().toISOString(),
        source: "user-claim",
      }),
      { ex: 86400 * 365 }
    );

    await bestEffortRemoveFromPending(redis, txHash);

    // Notifications (best-effort, non-blocking).
    try {
      const { notifyTransactionRich } = await import("@/lib/notification-sender");
      notifyTransactionRich(address, {
        type: "deposit",
        amount: v.amount,
        token: v.coin,
        txHash,
        fromAddress: v.fromAddress,
        channel: "default",
      }).catch((e) => console.error("[deposit/claim] push failed:", e));
    } catch (e) {
      console.error("[deposit/claim] push import failed:", e);
    }

    try {
      const userData = (await redis.hgetall(`user:${address}`)) as Record<string, string> | null;
      const email = userData?.email || walletEmail || null;
      if (email) {
        const emailAmount = autoConvert ? amountUsd.toFixed(2) : String(v.amount);
        const emailToken = autoConvert ? "AUXM" : v.coin;
        sendDepositConfirmedEmail(
          email,
          userData?.name || "Client",
          emailAmount,
          emailToken,
          txHash,
          userData?.language || "en"
        ).catch((e) => console.error("[deposit/claim] email failed:", e));
      }
    } catch (e) {
      console.error("[deposit/claim] email lookup failed:", e);
    }

    const balance = await getUserBalance(address);

    return NextResponse.json({
      success: true,
      txId,
      coin: v.coin,
      amount: v.amount,
      amountUsd,
      autoConverted: autoConvert,
      credited,
      confirmations: v.confirmations,
      balance,
    });
  } finally {
    await redis.del(lockKey).catch(() => {});
  }
}
