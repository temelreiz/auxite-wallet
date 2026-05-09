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

  // Credit metal balance (grams)
  const balanceKey = `user:${userAddress}:balance`;
  const newBalance = await redis.hincrbyfloat(balanceKey, balanceField, grams);

  // Record transaction
  const tx = {
    id: `stripe_${pi.id}`,
    type: "buy",
    subType: "card_purchase",
    metal,
    grams,
    amountUSD: pi.amount_received / 100,
    currency: pi.currency,
    pricePerGramUSD: parseFloat(md.pricePerGramUSD || "0"),
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
    `(PI ${pi.id}, $${(pi.amount_received / 100).toFixed(2)}, new bal: ${newBalance})`
  );

  // Notify procurement pipeline (opportunistic — non-blocking on failure)
  try {
    const { queueTradeForProcurement } = await import("@/lib/procurement-pipeline");
    await queueTradeForProcurement({
      type: "buy",
      coin: metal,
      amount: grams,
      address: userAddress,
      timestamp: Date.now(),
    } as any);
  } catch (e) {
    console.warn("[stripe/webhook] procurement queue failed (non-blocking):", e);
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
}
