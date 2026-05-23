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
import { notifyAuxrTrade } from "@/lib/telegram";
import { notifyAuxrTradePush } from "@/lib/notification-sender";
import { sendTradeExecutionEmail } from "@/lib/email";

// Resolve a user's email + display name from the user record, mirroring the
// /api/trade pattern. Best-effort; returns empty when unavailable.
async function getUserEmailName(walletAddress: string): Promise<{ email?: string; name?: string }> {
  try {
    const userId = await redis.get(`user:address:${walletAddress.toLowerCase()}`);
    if (userId) {
      const u = await redis.hgetall(`user:${userId}`);
      if (u?.email) return { email: String(u.email), name: u?.name ? String(u.name) : undefined };
    }
    const direct = await redis.hgetall(`auth:user:${walletAddress.toLowerCase()}`);
    if (direct?.email) return { email: String(direct.email), name: direct?.name ? String(direct.name) : undefined };
  } catch {}
  return {};
}

// Spot USD prices for volatile rails (BTC/ETH). Same source the vault/crypto
// screens use, so the quote the user sees matches the debit.
async function getCryptoSpot(): Promise<{ btc: number; eth: number }> {
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";
    const d = await (await fetch(`${base}/api/crypto`, { cache: "no-store" })).json();
    return { btc: Number(d.bitcoin?.usd || 0), eth: Number(d.ethereum?.usd || 0) };
  } catch {
    return { btc: 0, eth: 0 };
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  address: z.string().min(10),
  usdAmount: z.number().positive(),
  // Payment rail. User funds the vault first, then picks any held asset:
  //   auxm/usdt/usdc/usd → 1:1 USD-pegged (usdAmount maps directly to debit)
  //   btc/eth            → spot-valued (debit = usdAmount / spotPrice)
  paymentToken: z.enum(["auxm", "usdt", "usdc", "usd", "btc", "eth"]).optional().default("auxm"),
  source: z.string().optional(), // 'lite' | 'pro' | 'web' — analytics only
  refId: z.string().min(4).max(64).optional(),
});

// Canonical KYC check — reads kyc:{address}.status, the SAME source the
// /api/user/profile endpoint (and the mobile client) use. The previous
// implementation read user:{userId}.kycVerified, a separate flag that the
// KYC webhook doesn't always sync, so verified users got kyc_required.
const VERIFIED_KYC_STATUSES = new Set(["approved", "verified", "enhanced"]);
async function isKycVerified(walletAddress: string): Promise<boolean> {
  try {
    const raw = await redis.get(`kyc:${walletAddress.toLowerCase()}`);
    if (!raw) return false;
    const kyc = typeof raw === "string" ? JSON.parse(raw) : raw;
    return VERIFIED_KYC_STATUSES.has(String(kyc?.status || "").toLowerCase());
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

  const { address, usdAmount, paymentToken, source, refId } = body;
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

  // Balance check on the chosen rail. Pegged tokens (auxm/usdt/usdc/usd) map
  // 1:1 to USD; btc/eth are valued at spot and debited in token units.
  const balance = await getUserBalance(normalizedAddress);

  let availableForRail = 0; // always in USD, compared against usdAmount
  let railLabel = "";
  let tokenDebit = usdAmount; // amount to subtract from the rail balance
  let spotPrice = 1;
  if (paymentToken === "auxm") {
    availableForRail = balance.auxm + balance.bonusAuxm;
    railLabel = "AUXM";
  } else if (paymentToken === "usdt") {
    availableForRail = balance.usdt;
    railLabel = "USDT";
  } else if (paymentToken === "usdc") {
    availableForRail = balance.usdc;
    railLabel = "USDC";
  } else if (paymentToken === "usd") {
    availableForRail = balance.usd;
    railLabel = "USD";
  } else if (paymentToken === "btc" || paymentToken === "eth") {
    const spot = await getCryptoSpot();
    spotPrice = paymentToken === "btc" ? spot.btc : spot.eth;
    if (!spotPrice || spotPrice <= 0) {
      return NextResponse.json(
        { success: false, error: "price_unavailable", paymentToken },
        { status: 503 }
      );
    }
    const tokenBal = paymentToken === "btc" ? balance.btc : balance.eth;
    availableForRail = tokenBal * spotPrice; // USD value of the holding
    tokenDebit = usdAmount / spotPrice; // token units for $usdAmount
    railLabel = paymentToken.toUpperCase();
  }

  if (availableForRail < usdAmount) {
    return NextResponse.json(
      {
        success: false,
        error: `insufficient_${paymentToken}`,
        paymentToken,
        available: availableForRail,
        required: usdAmount,
      },
      { status: 400 }
    );
  }

  // Quote at current NAV. We re-quote AFTER the balance check so the
  // mint reflects the price the user actually sees in the next moment.
  // Volatility risk is minimal because /api/auxr/price polling caches
  // for 30s; same horizon as this quote.
  const quote = await quoteBuy(usdAmount);

  // Execute the swap atomically: debit the chosen rail, credit AUXR.
  const balanceKey = `user:${normalizedAddress}:balance`;
  const pipe = getRedis().pipeline();

  if (paymentToken === "auxm") {
    // AUXM rail. Prefer to drain paid `auxm` before `bonusAuxm` because
    // bonusAuxm has an expiry — using it first protects against forfeiture.
    const auxmDebit = Math.min(balance.auxm, usdAmount);
    const bonusDebit = usdAmount - auxmDebit;
    if (auxmDebit > 0) pipe.hincrbyfloat(balanceKey, "auxm", -auxmDebit);
    if (bonusDebit > 0) pipe.hincrbyfloat(balanceKey, "bonusAuxm", -bonusDebit);
    // Keep totalAuxm consistent — readers may use it directly.
    pipe.hset(balanceKey, {
      totalAuxm: balance.auxm + balance.bonusAuxm - usdAmount,
    });
  } else if (paymentToken === "usdt") {
    pipe.hincrbyfloat(balanceKey, "usdt", -usdAmount);
  } else if (paymentToken === "usdc") {
    pipe.hincrbyfloat(balanceKey, "usdc", -usdAmount);
  } else if (paymentToken === "usd") {
    pipe.hincrbyfloat(balanceKey, "usd", -usdAmount);
  } else if (paymentToken === "btc") {
    pipe.hincrbyfloat(balanceKey, "btc", -tokenDebit);
  } else if (paymentToken === "eth") {
    pipe.hincrbyfloat(balanceKey, "eth", -tokenDebit);
  }

  // Credit AUXR.
  pipe.hincrbyfloat(balanceKey, "auxr", quote.unitsAUXR);

  await pipe.exec();

  // Update reserves + propagate to treasury exposure. Best-effort — if
  // this fails the balance change has already been committed, so we log
  // and continue. Reconciler will detect drift.
  try {
    await recordMint({
      unitsAUXR: quote.unitsAUXR,
      refId,
      walletAddress: normalizedAddress,
      reason: `buy via ${source || "unknown"} (${railLabel}) — $${usdAmount.toFixed(2)}`,
    });
  } catch (e) {
    console.error("[/api/auxr/buy] reserve mint failed:", e);
  }

  // Transaction record (for user history screen).
  const txId = await addTransaction(normalizedAddress, {
    type: "swap",
    fromToken: railLabel,
    toToken: "AUXR",
    fromAmount: usdAmount,
    toAmount: quote.unitsAUXR,
    status: "completed",
    metadata: {
      paymentToken,
      paidAmount: tokenDebit, // token units actually debited (= usdAmount for pegged rails)
      spotPrice, // 1 for pegged rails; live BTC/ETH price otherwise
      navUSD: quote.navUSD,
      buyPriceUSD: quote.buyPriceUSD,
      spreadUSD: quote.spreadUSD,
      source: source || null,
      refId: refId || null,
      metalsReservedGrams: quote.metalsReservedGrams,
    },
  });

  // ── Notifications (all best-effort, non-blocking) ──────────────────────
  // 1) Telegram → admin/ops (basket metals must be physically procured)
  // 2) Push → user's device
  // 3) Email → user's inbox (execution confirmation)
  // Mirrors the metal-buy notification stack in /api/trade.
  (async () => {
    const { email, name } = await getUserEmailName(normalizedAddress);

    notifyAuxrTrade({
      side: "buy",
      userAddress: normalizedAddress,
      usdAmount,
      unitsAUXR: quote.unitsAUXR,
      navUSD: quote.navUSD,
      paymentToken,
      email,
      basketGrams: quote.metalsReservedGrams,
    }).catch((e) => console.error("[auxr/buy] telegram notify failed:", e));

    notifyAuxrTradePush(normalizedAddress, {
      side: "buy",
      unitsAUXR: quote.unitsAUXR,
      usdAmount,
      paymentToken,
    }).catch((e) => console.error("[auxr/buy] push notify failed:", e));

    if (email) {
      sendTradeExecutionEmail(email, {
        clientName: name,
        transactionType: "Buy",
        metal: "AUXR",
        metalName: "Auxite Reserve — 55/30/10/5 Au·Ag·Pt·Pd basket",
        grams: `${quote.unitsAUXR.toFixed(6)} AUXR`,
        executionPrice: `USD ${quote.buyPriceUSD.toFixed(4)} / AUXR`,
        grossConsideration: `USD ${usdAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        executionTime: new Date().toISOString().replace("T", ", ").replace(/\.\d+Z/, " UTC"),
        referenceId: txId,
      }).catch((e: any) => console.error("[auxr/buy] email failed:", e));
    }
  })().catch(() => { /* notification orchestration is best-effort */ });

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
