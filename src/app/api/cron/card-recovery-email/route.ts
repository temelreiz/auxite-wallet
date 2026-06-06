// src/app/api/cron/card-recovery-email/route.ts
//
// Daily card-recovery cron — emails users who started a card purchase
// but never completed it.
//
// Pulls Stripe PaymentIntents from the last 36 hours that are still
// stuck at requires_payment_method (i.e. the user opened the card
// sheet and never returned), looks each up by metadata.userAddress
// in Redis, and sends the card-recovery email in their preferred
// language — pivoting them to the crypto deposit rail (USDT / USDC
// / ETH / BTC), which bypasses the issuing bank entirely.
//
// Dedup: per-user 30-day flag at `email:card-recovery-sent:<uid>`
// (TTL 30d). We only push one recovery per user per month so we
// don't pester someone who repeatedly fails to complete a card sale.
//
// Window: 36h gives the cron a safety overlap (each run scans the
// last 36h; if it skips one we still pick up everything on the next
// run). The Stripe cleanup cron is canceling incompletes at 60min,
// so anything we send to is at most ~60 min from cancellation —
// they can still finish on the original PI if they're quick.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { stripe, METAL_NAME, type SupportedMetal } from "@/lib/stripe";
import { sendEmail } from "@/lib/email-service";

const redis = Redis.fromEnv();

const WINDOW_HOURS = 36;
const DEDUPE_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  // Same auth pattern as the rest of /api/cron/* — Vercel cron token
  // or our internal API key.
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = Math.floor(Date.now() / 1000) - WINDOW_HOURS * 60 * 60;
  const summary = {
    scanned: 0,
    not_metal_purchase: 0,
    not_incomplete: 0,
    user_not_found: 0,
    already_emailed_recently: 0,
    no_email: 0,
    sent: 0,
    send_errors: 0,
  };
  const sentSample: Array<{ pi: string; email: string; metal: string; usd: number }> = [];

  try {
    let after: string | undefined = undefined;
    let pages = 0;

    // PaymentIntent list supports created.gt for forward-pagination
    // by time. One page (100) is enough for normal daily volume; we
    // keep paginating in case of a spike day.
    while (pages < 5) {
      pages++;
      const list = await stripe.paymentIntents.list({
        limit: 100,
        created: { gt: cutoff },
        ...(after ? { starting_after: after } : {}),
      });

      for (const pi of list.data) {
        summary.scanned++;
        after = pi.id;

        if (pi.metadata?.type !== "metal_purchase") {
          summary.not_metal_purchase++;
          continue;
        }
        // Only target the "user opened the form, never went further"
        // state. requires_action means 3DS was triggered (let Stripe
        // continue retrying that); processing/succeeded need no help.
        if (pi.status !== "requires_payment_method") {
          summary.not_incomplete++;
          continue;
        }

        const userAddress = String(pi.metadata?.userAddress || "").toLowerCase();
        if (!userAddress) {
          summary.user_not_found++;
          continue;
        }

        const userId = await redis.get<string>(`user:address:${userAddress}`);
        if (!userId) {
          summary.user_not_found++;
          continue;
        }

        // 30-day dedupe — don't pester the same user month after month.
        const dedupeKey = `email:card-recovery-sent:${userId}`;
        const already = await redis.get(dedupeKey);
        if (already) {
          summary.already_emailed_recently++;
          continue;
        }

        const profile = (await redis.hgetall(`user:${userId}`)) as Record<string, string> | null;
        const email = profile?.email;
        if (!email) {
          summary.no_email++;
          continue;
        }

        const language = profile?.language || "en";
        const firstName = profile?.firstName || profile?.name?.split(" ")[0] || "";
        const metalCode = (pi.metadata?.metal || "AUXG") as SupportedMetal;
        const metalName = METAL_NAME[metalCode] || "metal";
        const amountUSD = Math.round((pi.amount || 0) / 100);

        try {
          await sendEmail({
            type: "card-recovery",
            to: email,
            data: {
              name: firstName,
              amountUSD,
              metalName,
              language,
            },
          });
          // Mark sent BEFORE doing anything else — if the cron crashes
          // mid-batch a re-run won't double-send.
          await redis.set(dedupeKey, String(Date.now()), { ex: DEDUPE_TTL_SECONDS });
          summary.sent++;
          if (sentSample.length < 10) {
            sentSample.push({ pi: pi.id, email, metal: metalCode, usd: amountUSD });
          }
        } catch (err: any) {
          summary.send_errors++;
          console.error(
            `[card-recovery-email] send failed pi=${pi.id} user=${userId} email=${email} err=${err?.message}`,
          );
        }
      }

      if (!list.has_more) break;
    }
  } catch (err: any) {
    console.error("[card-recovery-email] list failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message || "stripe list failed", summary },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    cutoff_iso: new Date(cutoff * 1000).toISOString(),
    summary,
    sentSample,
  });
}
