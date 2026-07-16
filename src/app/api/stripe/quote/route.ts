// src/app/api/stripe/quote/route.ts
//
// Lightweight metal-purchase quote endpoint — runs the same pricing
// logic as /api/stripe/create-payment-intent but DOES NOT create a
// Stripe PaymentIntent.
//
// Why this exists:
//   The old flow created a PI on "Get Quote", which meant every
//   shopper that opened the modal and abandoned left an incomplete
//   PI in Stripe (24h to auto-expire). 6 days produced 75 of them
//   for ~$12k in phantom volume — 100% of which never even reached
//   the card-entry step.
//
//   Now the modal calls THIS endpoint on Get Quote (cheap, no PI),
//   and only calls /api/stripe/create-payment-intent when the user
//   clicks "Pay with Card" and is ready to enter card details.
//
// Body: same shape as create-payment-intent
//   { metal: "AUXG"|"AUXS"|"AUXPT"|"AUXPD",
//     mode: "byGrams" | "byUsd",
//     grams?: number,        // when mode=byGrams
//     amountUSD?: number,    // when mode=byUsd
//     userAddress: string }
//
// Returns the breakdown only:
//   { breakdown: { metal, metalName, grams, amountUSD, pricePerGramUSD, ... } }

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import {
  quoteMetalChargeUSD,
  quoteMetalGramsForUSD,
  maxChargeForAddress,
  toChargeAmount,
  SUPPORTED_METALS,
  METAL_NAME,
  type SupportedMetal,
  type ChargeCurrency,
} from "@/lib/stripe";
import { checkTradingAllowed } from "@/lib/trading-guard";
import { checkKycLimit } from "@/lib/kyc-limits";
import { getClientIP } from "@/lib/security/rate-limiter";

// Quoting is cheap and price-discovery, so the limit is generous —
// 60/hr per IP. A genuine user toggling amount/metal back and forth
// generates a handful of quotes; bot traffic still bunches against
// the wall. Tighter than the unrestricted oracle endpoint because
// each call also runs KYC + trading-guard lookups.
const redis = Redis.fromEnv();
const quoteLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 h"),
  analytics: true,
  prefix: "ratelimit:stripe:quote",
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const { success } = await quoteLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "Too many quote requests. Please slow down.", code: "rate_limited" },
        { status: 429 },
      );
    }

    const fiatGuard = await checkTradingAllowed("fiatDeposit");
    if (!fiatGuard.allowed) {
      return NextResponse.json(
        { error: fiatGuard.message?.en || "Card purchases temporarily disabled", reason: fiatGuard.reason },
        { status: 503 },
      );
    }
    const metalGuard = await checkTradingAllowed("metalTrading");
    if (!metalGuard.allowed) {
      return NextResponse.json(
        { error: metalGuard.message?.en || "Metal trading temporarily disabled", reason: metalGuard.reason },
        { status: 503 },
      );
    }

    const body = await req.json();
    const metal = String(body.metal || "").toUpperCase() as SupportedMetal;
    if (!SUPPORTED_METALS.includes(metal)) {
      return NextResponse.json({ error: `Unsupported metal: ${metal}` }, { status: 400 });
    }
    const userAddress = String(body.userAddress || "").toLowerCase();
    if (!userAddress) {
      return NextResponse.json({ error: "userAddress required" }, { status: 400 });
    }
    const mode = body.mode === "byGrams" ? "byGrams" : "byUsd";
    const maxCharge = maxChargeForAddress(userAddress);
    const chargeCurrency: ChargeCurrency =
      String(body.currency || "usd").toLowerCase() === "hkd" ? "hkd" : "usd";

    let amountUSD: number;
    let grams: number;
    let pricePerGramUSD: number;
    let baseAskPerGram: number;
    let metalSpreadPct: number;
    let cardBufferPct: number;

    if (mode === "byUsd") {
      const inputUsd = Number(body.amountUSD);
      if (!Number.isFinite(inputUsd) || inputUsd <= 0) {
        return NextResponse.json({ error: "amountUSD required for byUsd mode" }, { status: 400 });
      }
      const q = await quoteMetalGramsForUSD(metal, inputUsd, maxCharge);
      grams = q.grams;
      amountUSD = q.amountUSD;
      pricePerGramUSD = q.pricePerGramUSD;
      // quoteMetalGramsForUSD doesn't return these — re-derive from the
      // forward quote with the same grams so the panel shows them.
      const forward = await quoteMetalChargeUSD(metal, grams, maxCharge);
      baseAskPerGram = forward.baseAskPerGram;
      metalSpreadPct = forward.metalSpreadPct;
      cardBufferPct = forward.cardBufferPct;
    } else {
      const inputGrams = Number(body.grams);
      if (!Number.isFinite(inputGrams) || inputGrams <= 0) {
        return NextResponse.json({ error: "grams required for byGrams mode" }, { status: 400 });
      }
      const q = await quoteMetalChargeUSD(metal, inputGrams, maxCharge);
      grams = inputGrams;
      amountUSD = q.amountUSD;
      pricePerGramUSD = q.pricePerGramUSD;
      baseAskPerGram = q.baseAskPerGram;
      metalSpreadPct = q.metalSpreadPct;
      cardBufferPct = q.cardBufferPct;
    }

    // Soft KYC gate — block the quote display itself if the user is
    // over their limit, so they don't see a number they can't pay.
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
        { status: 403 },
      );
    }

    const charge = toChargeAmount(amountUSD, chargeCurrency);
    return NextResponse.json({
      breakdown: {
        metal,
        metalName: METAL_NAME[metal],
        grams,
        amountUSD,
        pricePerGramUSD,
        baseAskPerGram,
        metalSpreadPct,
        cardBufferPct,
        chargeCurrency: charge.currency,
        chargeAmount: charge.amount / 100,
      },
    });
  } catch (err: any) {
    console.error("[stripe/quote]", err);
    return NextResponse.json(
      { error: err?.message || "Quote failed" },
      { status: 500 },
    );
  }
}
