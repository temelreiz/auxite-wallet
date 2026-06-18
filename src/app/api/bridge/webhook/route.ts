// src/app/api/bridge/webhook/route.ts
//
// Bridge webhook receiver for liquidation-address drain events. As treasury
// stablecoin is converted to USD and wired to our Wise account, Bridge emits
// drain state changes: funds_received → payment_submitted → payment_processed.
//
// On a terminal "processed/settled" state we call settleDrain(), which moves the
// value from treasury in-flight into treasury USD cash so solvency backing stays
// whole (see src/lib/bridge-offramp.ts).
//
// Signature: verified against BRIDGE_WEBHOOK_PUBLIC_KEY when set (fail-open with
// a warning until configured, to inspect the first real delivery). Idempotent on
// the event id.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { verifyBridgeWebhookSignature, BRIDGE_KEYS } from "@/lib/bridge";
import { settleDrain } from "@/lib/bridge-offramp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const num = (v: any) => parseFloat(String(v ?? 0)) || 0;

// Bridge drain states that mean fiat has actually been delivered to the bank.
const SETTLED_STATES = new Set(["payment_processed", "funds_settled", "completed", "processed"]);

/** Pull the drain-ish object out of various Bridge envelope shapes. */
function extractDrain(evt: any): any {
  return evt?.data || evt?.object || evt?.drain || evt?.event_object || evt || {};
}

function extractState(d: any): string {
  return String(d?.state || d?.status || "").toLowerCase();
}

/** Net USD delivered to the bank. On a Bridge drain this is `amount` (currency
 *  "usd"); tolerate other field shapes as fallbacks. */
function extractUsd(d: any): number {
  const cur = String(d?.currency || "").toLowerCase();
  if (cur === "usd" && num(d?.amount)) return num(d.amount);
  return (
    num(d?.destination_amount) ||
    num(d?.receipt?.destination_amount) ||
    num(d?.converted_amount) ||
    num(d?.amount_usd) ||
    num(d?.destination?.amount) ||
    num(d?.amount)
  );
}

function extractLiquidationAddress(d: any): { id?: string; address?: string } {
  return {
    id: d?.liquidation_address_id || d?.liquidation_address?.id || d?.source?.liquidation_address_id,
    address:
      d?.liquidation_address?.address ||
      d?.destination_address ||
      d?.source?.address ||
      (typeof d?.liquidation_address === "string" ? d.liquidation_address : undefined),
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature =
    req.headers.get("x-webhook-signature") ||
    req.headers.get("X-Webhook-Signature") ||
    req.headers.get("x-signature") ||
    "";

  const r = getRedis();

  // Log every delivery for forensics (last 100).
  try {
    await r.lpush(BRIDGE_KEYS.webhookEvents, JSON.stringify({ ts: Date.now(), body: rawBody.slice(0, 4000) }));
    await r.ltrim(BRIDGE_KEYS.webhookEvents, 0, 99);
  } catch {}

  if (!verifyBridgeWebhookSignature(rawBody, signature)) {
    console.warn("[bridge/webhook] signature verification failed");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let evt: any;
  try { evt = JSON.parse(rawBody); } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const eventId = String(evt?.id || evt?.event_id || evt?.data?.id || "");
    // Idempotency: ignore replays of the same event.
    if (eventId) {
      const fresh = await r.set(`bridge:webhook:processed:${eventId}`, "1", { nx: true, ex: 60 * 60 * 24 * 30 });
      if (!fresh) return NextResponse.json({ success: true, duplicate: true });
    }

    const drain = extractDrain(evt);
    const state = extractState(drain);
    const eventType = String(evt?.event_type || evt?.type || "").toLowerCase();

    // Only liquidation-address drains concern us.
    const isDrain = eventType.includes("liquidation") || eventType.includes("drain") || !!drain?.state || !!drain?.status;
    if (!isDrain) {
      return NextResponse.json({ success: true, ignored: `non-drain event (${eventType || "unknown"})` });
    }

    if (!SETTLED_STATES.has(state)) {
      // Informational (funds_received / payment_submitted / in_review / error…).
      return NextResponse.json({ success: true, noted: state || "unknown-state" });
    }

    const usd = extractUsd(drain);
    const la = extractLiquidationAddress(drain);
    if (usd <= 0) {
      await r.lpush(BRIDGE_KEYS.webhookErrors, JSON.stringify({ ts: Date.now(), reason: "settled event with no USD amount", drain }));
      await r.ltrim(BRIDGE_KEYS.webhookErrors, 0, 99);
      return NextResponse.json({ success: false, error: "no usd amount on settled drain" }, { status: 422 });
    }

    const result = await settleDrain({
      liquidationAddressId: la.id,
      liquidationAddress: la.address,
      amountUsd: usd,
      drainId: String(drain?.id || ""),
      depositTxHash: drain?.deposit_tx_hash || drain?.source?.tx_hash,
    });

    // Best-effort admin alert.
    try {
      const { sendTelegramMessage } = await import("@/lib/telegram");
      sendTelegramMessage(
        `🏦 Bridge off-ramp settled: $${usd.toFixed(2)} USD wired to Wise` +
          (result.matched ? ` (sweep ${result.sweepId})` : " (unmatched — review)")
      ).catch(() => {});
    } catch {}

    return NextResponse.json({ success: true, settledUsd: usd, ...result });
  } catch (err: any) {
    console.error("[bridge/webhook] error:", err);
    try {
      await r.lpush(BRIDGE_KEYS.webhookErrors, JSON.stringify({ ts: Date.now(), error: err?.message || String(err) }));
      await r.ltrim(BRIDGE_KEYS.webhookErrors, 0, 99);
    } catch {}
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
