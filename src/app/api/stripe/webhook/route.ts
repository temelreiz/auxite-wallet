// src/app/api/stripe/webhook/route.ts
//
// Stripe webhook handler. Subscribed events:
//   - payment_intent.succeeded   → credit metal balance, record tx
//   - payment_intent.payment_failed → log only
//   - charge.refunded            → reverse metal credit
//
// Security:
//   - Verifies Stripe-Signature header against STRIPE_WEBHOOK_SECRET
//   - Idempotency: Redis SETNX on PaymentIntent id prevents double-credit
//
// IMPORTANT: Next.js App Router needs the raw body for signature verification.
// We read req.text() — DO NOT use req.json() here.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";
import { stripe, type SupportedMetal, METAL_NAME } from "@/lib/stripe";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

// Map metal symbol to balance field key in Redis
const BALANCE_FIELD: Record<SupportedMetal, string> = {
  AUXG: "auxg",
  AUXS: "auxs",
  AUXPT: "auxpt",
  AUXPD: "auxpd",
};

export async function POST(req: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[stripe/webhook] signature verification failed:", err?.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`[stripe/webhook] unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe/webhook] handler error:", err);
    // Return 200 anyway so Stripe doesn't retry indefinitely on logic errors;
    // surface via console + audit log.
    await redis.lpush(
      "stripe:webhook:errors",
      JSON.stringify({
        eventId: event.id,
        eventType: event.type,
        message: err?.message || String(err),
        timestamp: Date.now(),
      })
    );
    await redis.ltrim("stripe:webhook:errors", 0, 199);
    return NextResponse.json({ received: true, warning: "handler error" });
  }
}

// ── Handlers ───────────────────────────────────────────────────────────────

// Look up user email + name from Redis (mirrors getUserEmail in /api/trade).
async function lookupUserContact(address: string): Promise<{ email?: string; name?: string }> {
  const userId = await redis.get(`user:address:${address}`);
  if (userId) {
    const userData = await redis.hgetall(`user:${userId}`);
    return { email: userData?.email as string, name: (userData?.name as string) || undefined };
  }
  const directUserData = await redis.hgetall(`user:${address}`);
  return { email: directUserData?.email as string, name: (directUserData?.name as string) || undefined };
}

async function handlePaymentSucceeded(pi: Stripe.PaymentIntent): Promise<void> {
  const md = pi.metadata || {};
  if (md.type !== "metal_purchase") {
    console.log(`[stripe/webhook] PI ${pi.id} not a metal_purchase, skipping`);
    return;
  }

  const metal = String(md.metal || "").toUpperCase() as SupportedMetal;
  const balanceField = BALANCE_FIELD[metal];
  if (!balanceField) {
    console.error(`[stripe/webhook] PI ${pi.id} unknown metal ${metal}`);
    return;
  }

  const userAddress = String(md.userAddress || "").trim().toLowerCase();
  const grams = parseFloat(md.grams || "0");
  const amountUSD = pi.amount_received / 100;
  const pricePerGramUSD = parseFloat(md.pricePerGramUSD || "0");
  if (!userAddress || !grams || grams <= 0) {
    console.error(`[stripe/webhook] PI ${pi.id} missing userAddress or grams`, md);
    return;
  }

  // Idempotency: refuse to credit twice for the same PaymentIntent
  const idempKey = `stripe:pi:processed:${pi.id}`;
  const firstTime = await redis.set(idempKey, Date.now().toString(), { nx: true, ex: 60 * 60 * 24 * 90 });
  if (!firstTime) {
    console.log(`[stripe/webhook] PI ${pi.id} already processed, skipping`);
    return;
  }

  const txId = `stripe_${pi.id}`;
  const balanceKey = `user:${userAddress}:balance`;

  // Pull contact info (best-effort) for allocation cert + emails
  const { email, name: holderName } = await lookupUserContact(userAddress);

  // ── Allocation: turn whole grams into bar allocations + certificate ──
  // Only the FRACTIONAL part (sub-1g) stays in Redis balance. Whole grams
  // move to the allocation system which mints a certificate.
  let certificateNumber: string | undefined;
  let allocatedGrams = 0;
  let nonAllocatedGrams = grams; // default: whole amount as fractional
  try {
    const { createAllocation } = await import("@/lib/allocation-service");
    const allocData = await createAllocation({
      address: userAddress,
      metal,
      grams,
      txHash: pi.id, // use PI id as the on-source reference
      email,
      holderName,
    });
    if (allocData.success) {
      allocatedGrams = allocData.allocatedGrams || 0;
      nonAllocatedGrams = allocData.nonAllocatedGrams ?? grams;
      certificateNumber = allocData.certificateNumber;
      if (certificateNumber) {
        console.log(`[stripe/webhook] 📜 Certificate ${certificateNumber} for ${allocatedGrams}g ${metal}`);
      } else {
        console.log(`[stripe/webhook] ${grams}g < 1g whole — no certificate, ${nonAllocatedGrams}g fractional`);
      }
    } else {
      console.warn("[stripe/webhook] createAllocation returned !success:", allocData.error);
    }
  } catch (e) {
    console.warn("[stripe/webhook] createAllocation failed (non-blocking):", e);
  }

  // Credit metal balance — only the FRACTIONAL portion (sub-1g remainder).
  // Whole grams already accounted for via allocation system.
  const newBalance = await redis.hincrbyfloat(balanceKey, balanceField, nonAllocatedGrams);

  // Record transaction
  const tx = {
    id: txId,
    type: "buy",
    subType: "card_purchase",
    metal,
    grams,
    allocatedGrams,
    nonAllocatedGrams,
    certificateNumber,
    amountUSD,
    currency: pi.currency,
    pricePerGramUSD,
    baseAskPerGram: parseFloat(md.baseAskPerGram || "0"),
    metalSpreadPct: parseFloat(md.metalSpreadPct || "0"),
    cardBufferPct: parseFloat(md.cardBufferPct || "0"),
    paymentIntentId: pi.id,
    status: "completed",
    timestamp: Date.now(),
  };
  await redis.lpush(`user:${userAddress}:transactions`, JSON.stringify(tx));
  await redis.ltrim(`user:${userAddress}:transactions`, 0, 499);

  console.log(
    `[stripe/webhook] ✅ ${userAddress.slice(0, 10)}... +${grams.toFixed(4)}g ${metal} ` +
    `(PI ${pi.id}, $${amountUSD.toFixed(2)}, fractional bal: ${newBalance}, alloc: ${allocatedGrams}g, cert: ${certificateNumber || "—"})`
  );

  // ── Fee ledger ─────────────────────────────────────────────────────────
  // Card purchases were previously invisible to platform:fees:* — only
  // /api/trade was writing there. That meant our biggest fee channel (card
  // markup) didn't show up in the admin Fees panel.
  //
  // We attribute two distinct fee streams:
  //   1. Metal spread (collected in metal) → platform:fees:{metal}
  //         spread fraction × grams sold
  //   2. Card buffer (collected in USD)    → platform:fees:usd
  //         buffer fraction × amountUSD ÷ (1 + buffer fraction)
  //         (the markup portion of what the user paid — separated cleanly
  //          from baseAsk so Stripe's actual cut nets against the USD pool)
  try {
    const spreadFrac = parseFloat(md.metalSpreadPct || "0") / 100;
    const bufferFrac = parseFloat(md.cardBufferPct || "0") / 100;
    const metalSpreadGrams = grams * spreadFrac;
    const cardBufferUsd = (amountUSD * bufferFrac) / (1 + bufferFrac);
    const metalKey = `platform:fees:${metal.toLowerCase()}`;
    await redis.hincrbyfloat(metalKey, "pending", metalSpreadGrams);
    await redis.hincrbyfloat(metalKey, "total", metalSpreadGrams);
    await redis.hincrby("platform:fees:count", metal.toLowerCase(), 1);
    await redis.hincrbyfloat("platform:fees:usd", "pending", cardBufferUsd);
    await redis.hincrbyfloat("platform:fees:usd", "total", cardBufferUsd);
    await redis.hincrby("platform:fees:count", "usd", 1);
  } catch (e) {
    console.warn("[stripe/webhook] fee ledger write failed (non-blocking):", e);
  }

  // ── Side-effects (all best-effort, non-blocking) ──

  // Telegram admin notification
  try {
    const { notifyTrade } = await import("@/lib/telegram");
    notifyTrade({
      type: "buy",
      userAddress,
      fromToken: "USD-CARD",            // payment source (Stripe)
      toToken: metal,
      fromAmount: amountUSD,
      toAmount: grams,
      txHash: pi.id,
      certificateNumber,
      email,
    }).catch((err) => console.error("[stripe/webhook] Telegram notify error:", err));
  } catch (e) {
    console.warn("[stripe/webhook] Telegram import failed:", e);
  }

  // Procurement pipeline queue (we owe spot metal to cover this purchase)
  try {
    const { queueTradeForProcurement } = await import("@/lib/procurement-pipeline");
    queueTradeForProcurement({
      tradeId: txId,
      userAddress,
      type: "buy",
      fromToken: "USD",
      fromAmount: amountUSD,
      toToken: metal,
      toAmount: grams,
      pricePerGram: pricePerGramUSD,
      fee: 0, // Stripe fee already baked into pricePerGramUSD via cardBufferPct
    }).catch((err) => console.error("[stripe/webhook] Procurement queue error:", err));
  } catch (e) {
    console.warn("[stripe/webhook] Procurement import failed:", e);
  }

  // Trade execution email (institutional confirmation)
  if (email) {
    try {
      const { sendTradeExecutionEmail } = await import("@/lib/email");
      const { getUserLanguage } = await import("@/lib/user-language");
      const metalNameMap: Record<string, string> = {
        AUXG: "Gold (LBMA Good Delivery)",
        AUXS: "Silver",
        AUXPT: "Platinum",
        AUXPD: "Palladium",
      };
      const tradeLang = await getUserLanguage(userAddress);
      sendTradeExecutionEmail(email, {
        clientName: holderName,
        transactionType: "Buy",
        metal,
        metalName: metalNameMap[metal] || metal,
        grams: grams.toFixed(4),
        executionPrice: `USD ${pricePerGramUSD.toFixed(2)} / g`,
        grossConsideration: `USD ${amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        executionTime: new Date().toISOString().replace("T", ", ").replace(/\.\d+Z/, " UTC"),
        referenceId: txId,
        language: tradeLang,
      } as any).catch((err: any) => console.error("[stripe/webhook] Trade execution email error:", err));
    } catch (e) {
      console.warn("[stripe/webhook] Trade email import failed:", e);
    }
  }

  // Push notification (mobile/web)
  try {
    const { notifyTransactionRich } = await import("@/lib/notification-sender");
    notifyTransactionRich(userAddress, {
      type: "buy",
      fromToken: "USD",
      toToken: metal,
      amount: parseFloat(grams.toFixed(4)),
      token: metal,
      certificateNumber,
      txHash: pi.id,
      channel: "trades",
    }).catch((err) => console.error("[stripe/webhook] Push notify error:", err));
  } catch (e) {
    console.warn("[stripe/webhook] Push import failed:", e);
  }

  // Audit log
  try {
    const { logTrade } = await import("@/lib/security/audit-logger");
    await logTrade(userAddress, "stripe-webhook", "stripe-webhook", "USD", metal, amountUSD, grams);
  } catch (e) {
    console.warn("[stripe/webhook] Audit log failed:", e);
  }

  // Bonus volume tracking (toward 500 AUXS-equiv unlock threshold)
  try {
    const userId = (await redis.get(`user:address:${userAddress}`)) as string | null;
    if (userId) {
      const { recordVolume } = await import("@/lib/bonus-guard");
      const tradeValueUsd = amountUSD;
      const volumeResult = await recordVolume(userId, tradeValueUsd);
      console.log(
        `[stripe/webhook] 🎁 Bonus tracking: $${volumeResult.currentVolumeUsd.toFixed(0)} volume, ${volumeResult.unlockPercent.toFixed(0)}% unlocked`
      );
    }
  } catch (e) {
    console.warn("[stripe/webhook] Bonus volume tracking failed:", e);
  }
}

async function handlePaymentFailed(pi: Stripe.PaymentIntent): Promise<void> {
  const md = pi.metadata || {};
  console.log(
    `[stripe/webhook] ❌ payment failed: PI ${pi.id} ${md.metal || "?"} ` +
    `${md.grams || "?"}g userAddress=${(md.userAddress || "").slice(0, 10)}... ` +
    `last_error=${pi.last_payment_error?.message || "n/a"}`
  );
  await redis.lpush(
    "stripe:payments:failed",
    JSON.stringify({
      paymentIntentId: pi.id,
      metal: md.metal,
      grams: md.grams,
      userAddress: md.userAddress,
      reason: pi.last_payment_error?.message,
      timestamp: Date.now(),
    })
  );
  await redis.ltrim("stripe:payments:failed", 0, 199);
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return;

  // Pull the PI to read metadata
  const pi = await stripe.paymentIntents.retrieve(piId);
  const md = pi.metadata || {};
  if (md.type !== "metal_purchase") return;

  const metal = String(md.metal || "").toUpperCase() as SupportedMetal;
  const balanceField = BALANCE_FIELD[metal];
  const userAddress = String(md.userAddress || "").trim().toLowerCase();
  const grams = parseFloat(md.grams || "0");
  if (!balanceField || !userAddress || !grams) return;

  // Idempotency for refund
  const refundKey = `stripe:refund:processed:${charge.id}`;
  const firstTime = await redis.set(refundKey, Date.now().toString(), { nx: true, ex: 60 * 60 * 24 * 90 });
  if (!firstTime) {
    console.log(`[stripe/webhook] refund ${charge.id} already processed, skipping`);
    return;
  }

  // Reverse the metal credit (decrement). If balance now negative, leave it
  // and surface for admin (user may have already spent some).
  const balanceKey = `user:${userAddress}:balance`;
  const newBalance = await redis.hincrbyfloat(balanceKey, balanceField, -grams);

  await redis.lpush(`user:${userAddress}:transactions`, JSON.stringify({
    id: `stripe_refund_${charge.id}`,
    type: "refund",
    subType: "card_refund",
    metal,
    grams: -grams,
    amountUSD: -(charge.amount_refunded / 100),
    paymentIntentId: piId,
    chargeId: charge.id,
    status: "completed",
    timestamp: Date.now(),
  }));

  console.log(
    `[stripe/webhook] ⏪ REFUND ${userAddress.slice(0, 10)}... -${grams.toFixed(4)}g ${metal} ` +
    `(charge ${charge.id}, new bal: ${newBalance})`
  );

  if (parseFloat(newBalance as any) < 0) {
    console.warn(
      `[stripe/webhook] ⚠️ negative balance after refund: ${userAddress} ${metal} = ${newBalance}`
    );
    await redis.lpush("stripe:refund:negative-balance", JSON.stringify({
      userAddress, metal, balance: newBalance, chargeId: charge.id, timestamp: Date.now(),
    }));
  }

  // ── Fee ledger reversal ────────────────────────────────────────────────
  // Mirror the buy-side accrual so refunds don't leave phantom fee balances.
  // Uses the SAME PI metadata the original buy used (metalSpreadPct/cardBufferPct).
  try {
    const refundUSD = charge.amount_refunded / 100;
    const isPartial = refundUSD < (charge.amount / 100) - 0.01;
    // For partial refunds, prorate by the refund/charge ratio. Most card
    // refunds are full, but Stripe partial refunds are allowed.
    const refundRatio = isPartial ? refundUSD / (charge.amount / 100) : 1;
    const spreadFrac = parseFloat(md.metalSpreadPct || "0") / 100;
    const bufferFrac = parseFloat(md.cardBufferPct || "0") / 100;
    const metalSpreadGramsBack = grams * spreadFrac * refundRatio;
    const cardBufferUsdBack = (refundUSD * bufferFrac) / (1 + bufferFrac);
    const metalKey = `platform:fees:${metal.toLowerCase()}`;
    await redis.hincrbyfloat(metalKey, "pending", -metalSpreadGramsBack);
    await redis.hincrbyfloat(metalKey, "total", -metalSpreadGramsBack);
    await redis.hincrbyfloat("platform:fees:usd", "pending", -cardBufferUsdBack);
    await redis.hincrbyfloat("platform:fees:usd", "total", -cardBufferUsdBack);
  } catch (e) {
    console.warn("[stripe/webhook] fee ledger refund reversal failed (non-blocking):", e);
  }
}
