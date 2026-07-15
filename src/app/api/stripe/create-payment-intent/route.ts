// src/app/api/stripe/create-payment-intent/route.ts
//
// Creates a Stripe PaymentIntent for a card-based PRECIOUS METAL purchase.
//
// Body:
//   { metal: "AUXG"|"AUXS"|"AUXPT"|"AUXPD",
//     mode: "byGrams" | "byUsd",
//     grams?: number,        // when mode=byGrams
//     amountUSD?: number,    // when mode=byUsd
//     userAddress: string }
//
// Response:
//   { clientSecret, paymentIntentId, breakdown: { grams, amountUSD, pricePerGramUSD, ... } }
//
// The PaymentIntent metadata fields are read by /api/stripe/webhook on
// payment_intent.succeeded to credit the user's metal balance.

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { blockUSPersonForFeature } from "@/lib/security/us-geofence";
import {
  stripe,
  quoteMetalChargeUSD,
  quoteMetalGramsForUSD,
  maxChargeForAddress,
  SUPPORTED_METALS,
  METAL_NAME,
  type SupportedMetal,
} from "@/lib/stripe";
import { checkTradingAllowed } from "@/lib/trading-guard";
import { checkKycLimit } from "@/lib/kyc-limits";
import { getClientIP } from "@/lib/security/rate-limiter";

// Anti-card-testing rate limiter. Fraudsters create one PI per stolen
// card to probe validity; this caps PI creation to 8/hr per IP +
// 20/day per IP. Real shoppers comfortably under both.
const redis = Redis.fromEnv();
const piHourlyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(8, "1 h"),
  analytics: true,
  prefix: "ratelimit:stripe:pi-create:hourly",
});
const piDailyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 d"),
  analytics: true,
  prefix: "ratelimit:stripe:pi-create:daily",
});

export async function POST(req: NextRequest) {
  try {
    // Rate-limit FIRST — keeps Stripe and Upstash from being beaten on by
    // a script that hits this endpoint in a loop. Two windows so a
    // legitimate user re-quoting throughout the day isn't blocked by
    // the hourly limit, but a bot grinding 24/7 still hits the daily wall.
    const ip = getClientIP(req);
    const [hourly, daily] = await Promise.all([
      piHourlyLimiter.limit(ip),
      piDailyLimiter.limit(ip),
    ]);
    if (!hourly.success || !daily.success) {
      console.warn(
        `[stripe/create-payment-intent] rate-limited ip=${ip} ` +
          `hourly=${hourly.remaining}/${hourly.limit} daily=${daily.remaining}/${daily.limit}`,
      );
      return NextResponse.json(
        {
          error: "Too many quote requests. Please wait a few minutes and try again.",
          code: "rate_limited",
        },
        { status: 429 },
      );
    }

    // Honor admin-controlled kill switches: both fiat deposit (card onramp)
    // and metal trading (the underlying allocation) must be allowed.
    const fiatGuard = await checkTradingAllowed("fiatDeposit");
    if (!fiatGuard.allowed) {
      return NextResponse.json(
        { error: fiatGuard.message?.en || "Card purchases temporarily disabled", reason: fiatGuard.reason },
        { status: 503 }
      );
    }
    const metalGuard = await checkTradingAllowed("metalTrading");
    if (!metalGuard.allowed) {
      return NextResponse.json(
        { error: metalGuard.message?.en || "Metal trading temporarily disabled", reason: metalGuard.reason },
        { status: 503 }
      );
    }

    const body = await req.json();
    const metal = String(body.metal || "").toUpperCase() as SupportedMetal;
    const mode = String(body.mode || "byGrams") as "byGrams" | "byUsd";
    const userAddress = String(body.userAddress || "").trim().toLowerCase();

    // ── US-person regulatory geofence — card / fiat on-ramp is a regulated
    // money-movement feature; not offered to US persons pending licensing.
    const usGate = await blockUSPersonForFeature("fiatOnRamp", userAddress, req);
    if (usGate) return usGate;

    if (!SUPPORTED_METALS.includes(metal)) {
      return NextResponse.json(
        { error: `Unsupported metal. Allowed: ${SUPPORTED_METALS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42) {
      return NextResponse.json({ error: "Invalid userAddress" }, { status: 400 });
    }

    // Per-address charge ceiling (founder/ops wallets may exceed retail cap).
    const maxCharge = maxChargeForAddress(userAddress);

    // Build the breakdown depending on mode
    let grams: number;
    let amountUSD: number;
    let amountCents: number;
    let pricePerGramUSD: number;
    let baseAskPerGram: number;
    let metalSpreadPct: number;
    let cardBufferPct: number;

    if (mode === "byUsd") {
      const inputUsd = Number(body.amountUSD);
      if (!Number.isFinite(inputUsd)) {
        return NextResponse.json({ error: "amountUSD required for byUsd mode" }, { status: 400 });
      }
      const q = await quoteMetalGramsForUSD(metal, inputUsd, maxCharge);
      grams = q.grams;
      amountUSD = q.amountUSD;
      amountCents = Math.round(amountUSD * 100);
      pricePerGramUSD = q.pricePerGramUSD;
      // Re-derive spread metadata for transparency
      const full = await quoteMetalChargeUSD(metal, grams, maxCharge);
      baseAskPerGram = full.baseAskPerGram;
      metalSpreadPct = full.metalSpreadPct;
      cardBufferPct = full.cardBufferPct;
    } else {
      const inputGrams = Number(body.grams);
      if (!Number.isFinite(inputGrams)) {
        return NextResponse.json({ error: "grams required for byGrams mode" }, { status: 400 });
      }
      const q = await quoteMetalChargeUSD(metal, inputGrams, maxCharge);
      grams = inputGrams;
      amountUSD = q.amountUSD;
      amountCents = q.amountCents;
      pricePerGramUSD = q.pricePerGramUSD;
      baseAskPerGram = q.baseAskPerGram;
      metalSpreadPct = q.metalSpreadPct;
      cardBufferPct = q.cardBufferPct;
    }

    // Soft KYC gate. Below NO_KYC_LIMIT_USD (currently $500) any user with
    // an email can buy; above it we require KYC. Run AFTER pricing so the
    // limit checks against the actual USD charge, not the user's input
    // (matters for byGrams mode where USD is derived).
    const kycDecision = await checkKycLimit(userAddress, amountUSD);
    if (!kycDecision.allowed) {
      return NextResponse.json(
        {
          error: "KYC verification required for purchases above the limit.",
          code: "kyc_required",
          reason: kycDecision.reason,
          limitUSD: kycDecision.limitUSD,
          requestedUSD: kycDecision.requestedUSD,
        },
        { status: 403 }
      );
    }

    // Stripe metadata: keep keys/values short (limit 50 chars value, 500 chars total)
    const metadata: Record<string, string> = {
      type: "metal_purchase",
      metal,                                  // AUXG/AUXS/AUXPT/AUXPD
      grams: grams.toFixed(6),
      pricePerGramUSD: pricePerGramUSD.toFixed(4),
      baseAskPerGram: baseAskPerGram.toFixed(4),
      metalSpreadPct: metalSpreadPct.toFixed(2),
      cardBufferPct: cardBufferPct.toFixed(2),
      userAddress,
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      // Let Stripe surface every eligible inline-confirming method (card,
      // Apple Pay, Google Pay, Link) per the dashboard config + buyer's
      // device/region — instead of hard-coding card only. `allow_redirects:
      // "never"` deliberately EXCLUDES redirect-based methods (Bancontact,
      // EPS, iDEAL, …): the client confirms with redirect:"if_required" and
      // shows success inline, so a method that navigates away to a bank page
      // would have no return-landing handler. Wallets like Apple/Google Pay
      // and Link tokenize inline and stay within this flow.
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      // Statement on cardholder's bill — keep aligned with Stripe-allowed
      // category (precious metals dealer), no crypto/AUXM language.
      statement_descriptor_suffix: `${METAL_NAME[metal].toUpperCase().slice(0, 22)}`,
      description: `Auxite — ${grams.toFixed(4)}g ${METAL_NAME[metal]}`,
      metadata,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      breakdown: {
        metal,
        metalName: METAL_NAME[metal],
        grams,
        amountUSD,
        pricePerGramUSD,
        baseAskPerGram,
        metalSpreadPct,
        cardBufferPct,
      },
    });
  } catch (err: any) {
    console.error("[stripe/create-payment-intent]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
