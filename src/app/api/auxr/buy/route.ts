// ============================================================================
// POST /api/auxr/buy
// ----------------------------------------------------------------------------
// Mint AUXR for a user by debiting their in-platform AUXM (USD-pegged) and
// crediting AUXR units according to the current basket NAV + buy spread.
//
// Phase 1A: off-chain ledger. The AUXR balance lives in Redis under
// user:{addr}:balance.auxr; the synthetic metals supply moves through
// auxr-reserve.recordMint() which also propagates to treasury-exposure.ts
// so the global treasury view stays consistent.
//
// Auth: matches the /api/trade pattern — wallet address in the body is the
// identifier. Same trust model as existing trades. KYC gate enforced
// defensively because AUXR represents real metal claims.
//
// Idempotency: caller may pass `refId` to deduplicate retries. If a mint
// event with the same refId already exists in the audit log, we short-
// circuit (returns the original result).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getUserBalance,
  redis,
  getRedis,
  addTransaction,
} from "@/lib/redis";
import { quoteBuy, AUXR_MIN_PURCHASE_USD } from "@/lib/auxr-pricing";
import { recordMint } from "@/lib/auxr-reserve";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  address: z.string().min(10),
  usdAmount: z.number().positive(),
  source: z.string().optional(), // 'lite' | 'pro' | 'web' — analytics only
  refId: z.string().min(4).max(64).optional(),
});

async function isKycVerified(walletAddress: string): Promise<boolean> {
  try {
    const userId = await redis.get(`user:address:${walletAddress.toLowerCase()}`);
    if (!userId) return false;
    const userData = await redis.hgetall(`user:${userId}`);
    return userData?.kycVerified === "true";
  } catch {
    return false;
  }
}

async function refIdAlreadyProcessed(refId: string): Promise<boolean> {
  // Audit log entries from recordMint embed the refId as 'auxr-mint:{refId}:{metal}'.
  // A quick cheap check: see if we have a tombstone marker set.
  const marker = await redis.get(`auxr:idempotency:${refId}`);
  return marker !== null;
}

async function markRefIdProcessed(refId: string, resultJson: string): Promise<void> {
  // 24h TTL — long enough to absorb retries, short enough to keep Redis tidy.
  await redis.set(`auxr:idempotency:${refId}`, resultJson, { ex: 24 * 60 * 60 });
}

export async function POST(request: NextRequest) {
  let body: z.infer<typeof BodySchema>;
  try {
    const raw = await request.json();
    body = BodySchema.parse(raw);
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: "invalid_request", details: e?.message },
      { status: 400 }
    );
  }

  const { address, usdAmount, source, refId } = body;
  const normalizedAddress = address.toLowerCase();

  // Min ticket guard (also enforced by quoteBuy, redundant for clear errors).
  if (usdAmount < AUXR_MIN_PURCHASE_USD) {
    return NextResponse.json(
      {
        success: false,
        error: "below_minimum",
        minUSD: AUXR_MIN_PURCHASE_USD,
      },
      { status: 400 }
    );
  }

  // Idempotency: replay-safe.
  if (refId) {
    const seen = await refIdAlreadyProcessed(refId);
    if (seen) {
      const cached = await redis.get(`auxr:idempotency:${refId}`);
      try {
        const parsed = typeof cached === "string" ? JSON.parse(cached) : cached;
        return NextResponse.json({ success: true, replay: true, ...parsed });
      } catch {
        // Fall through to fresh execution if cache parse fails.
      }
    }
  }

  // KYC gate. AUXR is a real metal claim; demo / KYC-pending users buy
  // through the existing demo flow (or get prompted to verify).
  const kycVerified = await isKycVerified(normalizedAddress);
  if (!kycVerified) {
    return NextResponse.json(
      { success: false, error: "kyc_required" },
      { status: 403 }
    );
  }

  // Balance check. AUXR settles in AUXM (the in-platform unit) — user must
  // hold ≥ usdAmount of total AUXM (paid + bonus).
  const balance = await getUserBalance(normalizedAddress);
  const totalAuxm = balance.auxm + balance.bonusAuxm;
  if (totalAuxm < usdAmount) {
    return NextResponse.json(
      {
        success: false,
        error: "insufficient_auxm",
        availableAuxm: totalAuxm,
        requiredAuxm: usdAmount,
      },
      { status: 400 }
    );
  }

  // Quote at current NAV. We re-quote AFTER the balance check so the
  // mint reflects the price the user actually sees in the next moment.
  // Volatility risk is minimal because /api/auxr/price polling caches
  // for 30s; same horizon as this quote.
  const quote = await quoteBuy(usdAmount);

  // Execute the swap atomically: debit AUXM (paid balance first, then
  // bonus) and credit AUXR. Use a pipeline so the two writes can't drift.
  const balanceKey = `user:${normalizedAddress}:balance`;
  const pipe = getRedis().pipeline();

  // Debit AUXM. Prefer to drain paid `auxm` before `bonusAuxm` because
  // bonusAuxm has an expiry — using it first protects against forfeiture.
  const auxmDebit = Math.min(balance.auxm, usdAmount);
  const bonusDebit = usdAmount - auxmDebit;
  if (auxmDebit > 0) pipe.hincrbyfloat(balanceKey, "auxm", -auxmDebit);
  if (bonusDebit > 0) pipe.hincrbyfloat(balanceKey, "bonusAuxm", -bonusDebit);

  // Credit AUXR.
  pipe.hincrbyfloat(balanceKey, "auxr", quote.unitsAUXR);

  // Keep totalAuxm consistent — readers may use it directly.
  pipe.hset(balanceKey, { totalAuxm: totalAuxm - usdAmount });

  await pipe.exec();

  // Update reserves + propagate to treasury exposure. Best-effort — if
  // this fails the balance change has already been committed, so we log
  // and continue. Reconciler will detect drift.
  try {
    await recordMint({
      unitsAUXR: quote.unitsAUXR,
      refId,
      walletAddress: normalizedAddress,
      reason: `buy via ${source || "unknown"} — $${usdAmount.toFixed(2)}`,
    });
  } catch (e) {
    console.error("[/api/auxr/buy] reserve mint failed:", e);
  }

  // Transaction record (for user history screen).
  const txId = await addTransaction(normalizedAddress, {
    type: "swap",
    fromToken: "AUXM",
    toToken: "AUXR",
    fromAmount: usdAmount,
    toAmount: quote.unitsAUXR,
    status: "completed",
    metadata: {
      navUSD: quote.navUSD,
      buyPriceUSD: quote.buyPriceUSD,
      spreadUSD: quote.spreadUSD,
      source: source || null,
      refId: refId || null,
      metalsReservedGrams: quote.metalsReservedGrams,
    },
  });

  const result = {
    txId,
    unitsAUXR: quote.unitsAUXR,
    usdAmount,
    buyPriceUSD: quote.buyPriceUSD,
    navUSD: quote.navUSD,
    spreadUSD: quote.spreadUSD,
    timestamp: Date.now(),
  };

  if (refId) {
    await markRefIdProcessed(refId, JSON.stringify(result));
  }

  return NextResponse.json({ success: true, ...result });
}
