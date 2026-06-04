// src/app/api/wise/webhook/route.ts
//
// Wise webhook handler for incoming wire detection.
//
// Trigger: account-details-payment#state-change (subscribed via
// /api/admin/wise/setup). When a wire lands in any of Aurum Ledger's
// Wise account details (USD, EUR, ...), Wise POSTs an event here. We:
//
//   1. Read raw body (for signature verification)
//   2. Verify Wise RSA signature (X-Signature-SHA256, fail-open until
//      WISE_WEBHOOK_PUBLIC_KEY is set — see lib/wise.ts)
//   3. Parse envelope → resource id + state
//   4. Skip unless current_state indicates funds RECEIVED
//   5. Fetch full payment details from Wise (amount, currency, reference)
//   6. Match reference → wallet address (user lookup)
//   7. Idempotently credit user's AUXM balance (FX-converted USD value)
//   8. Send email + push, write transaction record
//
// Idempotency: Redis SETNX on resource id (90-day TTL).
// Reference format expected: "AUX-{6-char hex}" — derived from
//   `AUX-${address.slice(2, 8).toUpperCase()}` in fund-vault page.
//
// NEVER throws to Wise (always return 200) so they don't retry endlessly
// on logic errors. Errors land in `wise:webhook:errors` log.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import {
  verifyWiseWebhookSignature,
  getBusinessProfile,
  tryFetchPaymentByResourceId,
} from "@/lib/wise";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Reference parser. Expected formats users might write in wire memo:
//   AUX-ABC123      (6 hex from wallet address)
//   AUX-ABC123-USD  (with currency suffix, ignored when matching)
//   AUXITE-ABC123   (variant we accept)
const REF_RE = /AUX(?:ITE)?[-_\s]?([0-9A-F]{6})/i;

function parseReference(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const m = REF_RE.exec(raw);
  return m ? m[1].toUpperCase() : null;
}

// Find wallet address whose vault id short code matches the wire reference.
// Vault id is `AUX-${address.slice(2, 8).toUpperCase()}`. We scan
// user:0x*:balance keys to find the match. Cached after first hit.
async function lookupAddressByReference(refShort: string): Promise<string | null> {
  // Try fast cache first
  const cacheKey = `wise:ref-cache:${refShort}`;
  const cached = await redis.get<string>(cacheKey);
  if (cached) return cached;

  const userKeys = await redis.keys("user:0x*:balance");
  for (const key of userKeys) {
    const addr = key.replace("user:", "").replace(":balance", "");
    if (!addr.startsWith("0x")) continue;
    const candidate = addr.slice(2, 8).toUpperCase();
    if (candidate === refShort) {
      await redis.set(cacheKey, addr, { ex: 60 * 60 * 24 * 30 });
      return addr;
    }
  }
  return null;
}

// FX conversion to USD for AUXM crediting (1 AUXM = 1 USD).
async function convertToUsd(amount: number, currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return amount;
  // Pull a same-host rate from a free public API (open.er-api.com), cached
  // for an hour in Redis. For the first version we keep it simple — a
  // dedicated FX provider can replace this later.
  const cacheKey = `wise:fx:${cur}-USD`;
  const cached = await redis.get<number>(cacheKey);
  if (cached && cached > 0) return amount * cached;
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${cur}`);
    const data: any = await res.json();
    const rate = data?.rates?.USD;
    if (typeof rate === "number" && rate > 0) {
      await redis.set(cacheKey, rate, { ex: 60 * 60 });
      return amount * rate;
    }
  } catch (e) {
    console.warn("[wise/webhook] FX fetch failed:", e);
  }
  // Conservative fallback: assume 1:1 (will be reconciled manually)
  console.warn(`[wise/webhook] no FX rate for ${cur} — assuming 1:1 to USD (manual reconcile flagged)`);
  return amount;
}

// ── Main handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature-sha256") || req.headers.get("X-Signature-SHA256") || "";

  // Verify signature (fail-open until public key is configured — see lib/wise.ts)
  if (!verifyWiseWebhookSignature(rawBody, signature)) {
    console.error("[wise/webhook] invalid signature, rejecting");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try { event = JSON.parse(rawBody); } catch (e) {
    console.error("[wise/webhook] invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Always store the raw event for inspection (first-look + audit)
  await redis.lpush("wise:webhook:events", JSON.stringify({ at: Date.now(), event }));
  await redis.ltrim("wise:webhook:events", 0, 99);

  try {
    // Wise envelope shape (per docs):
    //   { event_type, data: { resource: { id, type, profile_id }, current_state, occurred_at, ... } }
    const eventType: string = event.event_type || event.type || "";
    if (eventType && !eventType.startsWith("account-details-payment")) {
      console.log(`[wise/webhook] ignoring event type: ${eventType}`);
      return NextResponse.json({ received: true, ignored: true });
    }

    const data = event.data || event;
    const resource = data.resource || data;
    const resourceId = resource.id || data.resource_id;
    const profileId = resource.profile_id || data.profile_id;
    const currentState: string = String(data.current_state || data.state || "").toUpperCase();

    if (!resourceId) {
      console.warn("[wise/webhook] no resource id in payload — first-look check needed");
      await redis.lpush("wise:webhook:errors", JSON.stringify({
        at: Date.now(), reason: "no_resource_id", event,
      }));
      return NextResponse.json({ received: true, warning: "no_resource_id" });
    }

    // Only credit when funds are actually received
    const COMPLETED_STATES = ["RECEIVED", "PROCESSED", "COMPLETED", "INCOMING_PAYMENT_WAITING"];
    if (!COMPLETED_STATES.includes(currentState)) {
      console.log(`[wise/webhook] state=${currentState} not yet final, awaiting next event`);
      return NextResponse.json({ received: true, state: currentState });
    }

    // Idempotency: refuse to credit twice for same wire
    const idempKey = `wise:processed:${resourceId}`;
    const firstTime = await redis.set(idempKey, Date.now().toString(), { nx: true, ex: 60 * 60 * 24 * 90 });
    if (!firstTime) {
      console.log(`[wise/webhook] resource ${resourceId} already processed`);
      return NextResponse.json({ received: true, deduped: true });
    }

    // Fetch full payment details (amount, currency, reference)
    let detail: any = null;
    try {
      const resolvedProfileId = profileId || (await getBusinessProfile()).id;
      const fetched = await tryFetchPaymentByResourceId(resolvedProfileId, resourceId);
      detail = fetched?.data || null;
    } catch (e) {
      console.warn("[wise/webhook] payment detail fetch failed:", e);
    }

    // Try multiple field names for amount/currency/reference. Wise's exact
    // shape isn't documented publicly — log what we found for inspection.
    const amount = Number(
      detail?.amount?.value ?? detail?.amount ?? data.amount?.value ?? data.amount ?? 0
    );
    const currency = String(
      detail?.amount?.currency ?? detail?.currency ?? data.amount?.currency ?? data.currency ?? ""
    ).toUpperCase();
    const referenceRaw = String(
      detail?.reference ?? detail?.referenceText ?? detail?.payment_reference ??
      data.reference ?? data.referenceText ?? ""
    );
    const senderName = detail?.sender?.name ?? detail?.payer?.name ?? "";

    if (!amount || !currency) {
      console.warn(`[wise/webhook] missing amount/currency for ${resourceId}`, { amount, currency });
      await redis.lpush("wise:webhook:errors", JSON.stringify({
        at: Date.now(), reason: "missing_amount_or_currency", resourceId, detail,
      }));
      return NextResponse.json({ received: true, needsManualReview: true, reason: "missing_amount" });
    }

    const refShort = parseReference(referenceRaw);
    if (!refShort) {
      console.warn(`[wise/webhook] no AUX reference in memo: "${referenceRaw}"`);
      await redis.lpush("wise:webhook:unmatched", JSON.stringify({
        at: Date.now(), resourceId, amount, currency, referenceRaw, senderName,
      }));
      return NextResponse.json({ received: true, needsManualReview: true, reason: "no_reference" });
    }

    const userAddress = await lookupAddressByReference(refShort);
    if (!userAddress) {
      console.warn(`[wise/webhook] reference ${refShort} not matched to any user`);
      await redis.lpush("wise:webhook:unmatched", JSON.stringify({
        at: Date.now(), resourceId, amount, currency, refShort, senderName,
      }));
      return NextResponse.json({ received: true, needsManualReview: true, reason: "user_not_found", refShort });
    }

    // Convert to USD → credit AUXM 1:1
    const usdValue = await convertToUsd(amount, currency);
    const auxmCredit = +usdValue.toFixed(2);

    // ── KYC GATE ──────────────────────────────────────────────────────────
    // Two-tier soft AML threshold (shared with card + AUXR rails):
    //   - per-tx ceiling: NO_KYC_LIMIT_USD ($500)
    //   - 30d cumulative: NO_KYC_CUMULATIVE_30D_USD ($1000)
    // Above either, we hold the credit, push the wire to admin queue, and
    // notify the user to complete KYC. WISE_KYC_THRESHOLD_USD env override
    // still works for the per-tx leg — useful for whitelisted partner
    // wires that should auto-credit at higher tickets.
    const { checkKycLimit, NO_KYC_LIMIT_USD } = await import("@/lib/kyc-limits");
    const decision = await checkKycLimit(userAddress, usdValue);
    const perTxOverride = process.env.WISE_KYC_THRESHOLD_USD
      ? usdValue <= Number(process.env.WISE_KYC_THRESHOLD_USD)
      : false;
    if (!decision.allowed && !perTxOverride) {
      const kycApproved = decision.kycVerified;
      const KYC_REQUIRED_USD = NO_KYC_LIMIT_USD;
      if (!kycApproved) {
        console.warn(
          `[wise/webhook] ⚠️ KYC gate held wire: ${userAddress.slice(0, 10)}... ` +
          `${amount} ${currency} (~$${usdValue.toFixed(2)}) — KYC not approved`
        );
        await redis.lpush("wise:webhook:kyc-pending", JSON.stringify({
          at: Date.now(),
          resourceId,
          userAddress,
          amount,
          currency,
          usdValue,
          auxmCredit,
          refShort,
          senderName,
          reason: "kyc_not_approved",
        }));
        await redis.ltrim("wise:webhook:kyc-pending", 0, 199);

        // Notify user (push) — please complete KYC to release the credit
        try {
          const { sendNotification } = await import("@/lib/notification-sender");
          sendNotification(userAddress, "deposit", {
            title: "🔒 KYC Required for Wire",
            body: `Your ${amount} ${currency} wire is on hold pending KYC verification. Complete KYC to release ${auxmCredit} AUXM.`,
            icon: "/icons/icon-192x192.png",
            tag: `wire-kyc-${resourceId}`,
            data: {
              type: "transaction",
              txType: "deposit",
              subType: "wire_kyc_pending",
              txHash: resourceId,
              amount: auxmCredit,
              fiatAmount: amount,
              fiatCurrency: currency,
            },
          } as any).catch((e: any) => console.warn("[wise/webhook] kyc-pending push failed:", e));
        } catch {}

        // Telegram alert to admin
        try {
          const { sendTelegramMessage } = await import("@/lib/telegram");
          sendTelegramMessage(
            `⚠️ <b>Wise wire HELD — KYC required</b>\n\n` +
            `User: <code>${userAddress.slice(0, 10)}...${userAddress.slice(-4)}</code>\n` +
            `Amount: <b>${amount} ${currency}</b> (~$${usdValue.toFixed(2)})\n` +
            `Sender: ${senderName || "(unknown)"}\n` +
            `Resource: <code>${resourceId}</code>\n\n` +
            `Review at /admin/wise → KYC Pending tab.`
          ).catch((e: any) => console.warn("[wise/webhook] telegram kyc alert failed:", e));
        } catch {}

        return NextResponse.json({
          received: true,
          held: true,
          reason: "kyc_required",
          threshold: KYC_REQUIRED_USD,
          usdValue,
        });
      }
    }

    const balanceKey = `user:${userAddress}:balance`;
    const newBalance = await redis.hincrbyfloat(balanceKey, "auxm", auxmCredit);

    // Transaction record
    const txId = `wise_${resourceId}`;
    const tx = {
      id: txId,
      type: "deposit",
      subType: "bank_wire",
      source: "wise",
      currency,
      amount,
      usdValue,
      auxmCredited: auxmCredit,
      reference: referenceRaw,
      refShort,
      senderName,
      resourceId,
      status: "completed",
      timestamp: Date.now(),
    };
    await redis.lpush(`user:${userAddress}:transactions`, JSON.stringify(tx));
    await redis.ltrim(`user:${userAddress}:transactions`, 0, 499);

    console.log(
      `[wise/webhook] ✅ wire credited: ${userAddress.slice(0, 10)}... ` +
      `+${auxmCredit} AUXM (from ${amount} ${currency}, ref ${refShort})`
    );

    // Record toward the 30d cumulative no-KYC cap so the next wire (or
    // card buy, or AUXR buy) sees the right "remaining" balance. We
    // already passed the per-tx gate above; this is the bookkeeping leg.
    try {
      const { isKycVerified, recordNoKycSpend } = await import("@/lib/kyc-limits");
      if (!(await isKycVerified(userAddress))) {
        await recordNoKycSpend(userAddress, usdValue);
      }
    } catch (e) {
      console.warn("[wise/webhook] no-kyc spend record failed (non-blocking):", e);
    }

    // Side-effects: Telegram + email + push (best-effort, non-blocking)
    try {
      const { notifyTrade } = await import("@/lib/telegram");
      notifyTrade({
        type: "buy",
        userAddress,
        fromToken: `${currency}-WIRE`,
        toToken: "AUXM",
        fromAmount: amount,
        toAmount: auxmCredit,
        txHash: resourceId,
      } as any).catch((e) => console.warn("[wise/webhook] telegram failed:", e));
    } catch {}

    try {
      const { notifyWireCredit } = await import("@/lib/notification-sender");
      notifyWireCredit(userAddress, {
        fiatAmount: amount,
        fiatCurrency: currency,
        auxmCredited: auxmCredit,
        resourceId,
      }).catch((e) => console.warn("[wise/webhook] push failed:", e));
    } catch {}

    return NextResponse.json({
      received: true,
      credited: { userAddress, auxmCredit, currency, amount },
      newBalance,
    });
  } catch (err: any) {
    console.error("[wise/webhook] handler error:", err);
    await redis.lpush("wise:webhook:errors", JSON.stringify({
      at: Date.now(), reason: err?.message || String(err),
    }));
    await redis.ltrim("wise:webhook:errors", 0, 99);
    // Return 200 so Wise doesn't retry indefinitely on logic errors
    return NextResponse.json({ received: true, warning: "handler_error" });
  }
}
