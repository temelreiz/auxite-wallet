// src/app/api/cron/stripe-cleanup-incomplete/route.ts
//
// Hourly cron — cancels Stripe PaymentIntents stuck in incomplete
// states (`requires_payment_method`, `requires_confirmation`,
// `requires_action`) for longer than the abandonment threshold.
//
// Why we need this:
//
// Every time a user opens the buy-with-card modal and clicks "Get
// Quote" we create a fresh PaymentIntent. If they close the modal,
// refresh, or get distracted, the PI sits in incomplete state for
// up to 24h before Stripe auto-expires it. Two side-effects:
//
//   1. Stripe Dashboard fills up with hundreds of incompletes —
//      noise that hides real failures + makes the success-rate
//      metric look worse than it is.
//   2. Card-testing bots create one PI per stolen card to probe
//      validity and never confirm. Closing those PIs faster cuts
//      the attack surface (a stolen card can only be "tested" on
//      a PI for the duration we keep it open).
//
// Threshold: 1 hour. Real users complete checkout within minutes
// or never; nobody picks up an abandoned cart 60+ minutes later
// from the same PI. Stripe's own auto-expire is 24h, which is
// way too long for this use case.

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

const STALE_AGE_SECONDS = 60 * 60; // 1 hour

const STALE_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
] as const;

export async function GET(request: NextRequest) {
  // Same auth pattern as the other crons — Vercel cron token or our
  // internal API key. Either is acceptable; Vercel sets the bearer
  // automatically on its scheduled invocations.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = Math.floor(Date.now() / 1000) - STALE_AGE_SECONDS;
  const summary: Record<string, number> = {
    scanned: 0,
    canceled: 0,
    skipped_not_stale: 0,
    skipped_not_metal_purchase: 0,
    errors: 0,
  };
  const sample: Array<{ id: string; status: string; created: number; reason: string }> = [];

  // Stripe's PaymentIntent list endpoint doesn't filter by status, but
  // it does take a created.lt cursor — pull anything older than the
  // cutoff and walk the page. Default limit 100; one page covers any
  // reasonable hourly volume. Iterating with starting_after would catch
  // tail batches if traffic spikes, but for now the simple call is
  // fine — anything missed gets caught on the next hour's run.
  try {
    const list = await stripe.paymentIntents.list({
      limit: 100,
      created: { lt: cutoff },
    });

    for (const pi of list.data) {
      summary.scanned++;

      // Only touch PIs we created for metal purchases. Defensive: if
      // some other flow ever shares the Stripe account, we never
      // cancel something that isn't ours.
      if (pi.metadata?.type !== "metal_purchase") {
        summary.skipped_not_metal_purchase++;
        continue;
      }

      if (!(STALE_STATUSES as readonly string[]).includes(pi.status)) {
        summary.skipped_not_stale++;
        continue;
      }

      try {
        await stripe.paymentIntents.cancel(pi.id, {
          cancellation_reason: "abandoned",
        });
        summary.canceled++;
        if (sample.length < 10) {
          sample.push({
            id: pi.id,
            status: pi.status,
            created: pi.created,
            reason: "stale_incomplete",
          });
        }
      } catch (err: any) {
        summary.errors++;
        console.error(
          `[stripe-cleanup-incomplete] cancel failed pi=${pi.id} status=${pi.status} err=${err?.message}`,
        );
      }
    }
  } catch (err: any) {
    console.error("[stripe-cleanup-incomplete] list failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message || "stripe list failed", summary },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    cutoff_iso: new Date(cutoff * 1000).toISOString(),
    summary,
    sample,
  });
}
