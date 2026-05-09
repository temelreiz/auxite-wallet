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
import {
  stripe,
  quoteMetalChargeUSD,
  quoteMetalGramsForUSD,
  SUPPORTED_METALS,
  METAL_NAME,
  type SupportedMetal,
} from "@/lib/stripe";
import { checkTradingAllowed } from "@/lib/trading-guard";

export async function POST(req: NextRequest) {
  try {
    // Honor admin-controlled trading kill switch
    const guard = await checkTradingAllowed("metalBuy");
    if (!guard.allowed) {
      return NextResponse.json(
        { error: guard.message?.en || "Metal purchases temporarily disabled", reason: guard.reason },
        { status: 503 }
      );
    }

    const body = await req.json();
    const metal = String(body.metal || "").toUpperCase() as SupportedMetal;
    const mode = String(body.mode || "byGrams") as "byGrams" | "byUsd";
    const userAddress = String(body.userAddress || "").trim().toLowerCase();

    if (!SUPPORTED_METALS.includes(metal)) {
      return NextResponse.json(
        { error: `Unsupported metal. Allowed: ${SUPPORTED_METALS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!userAddress || !userAddress.startsWith("0x") || userAddress.length !== 42) {
      return NextResponse.json({ error: "Invalid userAddress" }, { status: 400 });
    }

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
      const q = await quoteMetalGramsForUSD(metal, inputUsd);
      grams = q.grams;
      amountUSD = q.amountUSD;
      amountCents = Math.round(amountUSD * 100);
      pricePerGramUSD = q.pricePerGramUSD;
      // Re-derive spread metadata for transparency
      const full = await quoteMetalChargeUSD(metal, grams);
      baseAskPerGram = full.baseAskPerGram;
      metalSpreadPct = full.metalSpreadPct;
      cardBufferPct = full.cardBufferPct;
    } else {
      const inputGrams = Number(body.grams);
      if (!Number.isFinite(inputGrams)) {
        return NextResponse.json({ error: "grams required for byGrams mode" }, { status: 400 });
      }
      const q = await quoteMetalChargeUSD(metal, inputGrams);
      grams = inputGrams;
      amountUSD = q.amountUSD;
      amountCents = q.amountCents;
      pricePerGramUSD = q.pricePerGramUSD;
      baseAskPerGram = q.baseAskPerGram;
      metalSpreadPct = q.metalSpreadPct;
      cardBufferPct = q.cardBufferPct;
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
      payment_method_types: ["card"],
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
