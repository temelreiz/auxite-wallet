// src/app/api/admin/wise/console/route.ts
//
// Admin Wise console aggregator. Single endpoint serving the
// `/admin/wise` page with everything needed for incoming-wire ops:
//
//   GET  → returns recent events / unmatched / errors / kyc-pending /
//          processed-resource summary
//   POST → manual credit action: take an unmatched or kyc-held wire
//          and push it through the same crediting pipeline (with the
//          admin-supplied wallet address for unmatched cases)

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuxmEntry } from "@/lib/auxm-ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function readList(key: string, limit: number): Promise<any[]> {
  const raw = await redis.lrange(key, 0, limit - 1);
  return raw
    .map((r: any) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return { raw: r }; }
    })
    .filter(Boolean);
}

// ─── GET: aggregate dashboard payload ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const [events, unmatched, errors, kycPending] = await Promise.all([
      readList("wise:webhook:events", 50),
      readList("wise:webhook:unmatched", 50),
      readList("wise:webhook:errors", 50),
      readList("wise:webhook:kyc-pending", 50),
    ]);

    return NextResponse.json({
      success: true,
      counts: {
        events: events.length,
        unmatched: unmatched.length,
        errors: errors.length,
        kycPending: kycPending.length,
      },
      events,
      unmatched,
      errors,
      kycPending,
      generatedAt: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// ─── POST: manual credit action ───────────────────────────────────────────
//
// body shape:
//   { source: "unmatched" | "kyc-pending",
//     resourceId: string,           // matches the queued entry
//     walletAddress: string,        // user to credit (required for unmatched)
//     overrideAmount?: number,      // override usdValue (defaults to entry's usdValue or amount)
//     note?: string }               // free-text audit note
//
// Side effects:
//   - Hincrbyfloat AUXM credit
//   - Append transaction record (with subType: bank_wire_manual)
//   - Mark resourceId as processed (idempotency)
//   - Remove the resolved entry from its source queue
//   - Telegram + push notification to user
//
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json();
    const {
      source,
      resourceId,
      walletAddress,
      overrideAmount,
      note,
    }: {
      source: "unmatched" | "kyc-pending";
      resourceId: string;
      walletAddress: string;
      overrideAmount?: number;
      note?: string;
    } = body;

    if (!source || !resourceId || !walletAddress) {
      return NextResponse.json(
        { error: "source, resourceId, walletAddress required" },
        { status: 400 }
      );
    }
    if (!["unmatched", "kyc-pending"].includes(source)) {
      return NextResponse.json({ error: "invalid source" }, { status: 400 });
    }
    const userAddress = walletAddress.toLowerCase();
    if (!userAddress.startsWith("0x")) {
      return NextResponse.json({ error: "walletAddress must be 0x-prefixed" }, { status: 400 });
    }

    // Refuse to double-credit
    const idempKey = `wise:processed:${resourceId}`;
    const existing = await redis.get(idempKey);
    if (existing) {
      return NextResponse.json(
        { error: "resourceId already processed", processedAt: existing },
        { status: 409 }
      );
    }

    // Find the queued entry
    const queueKey = source === "unmatched" ? "wise:webhook:unmatched" : "wise:webhook:kyc-pending";
    const raw = await redis.lrange(queueKey, 0, -1);
    let entry: any = null;
    let entryRawString: string | null = null;
    for (const r of raw) {
      const item = typeof r === "string" ? safeJSON(r) : r;
      if (item?.resourceId === resourceId) {
        entry = item;
        entryRawString = typeof r === "string" ? r : JSON.stringify(r);
        break;
      }
    }
    if (!entry) {
      return NextResponse.json({ error: "resourceId not found in queue" }, { status: 404 });
    }

    const currency = entry.currency || "USD";
    const amount = Number(entry.amount || 0);
    const usdValue = Number(overrideAmount ?? entry.usdValue ?? amount ?? 0);
    if (!usdValue || usdValue <= 0) {
      return NextResponse.json({ error: "amount/usdValue invalid" }, { status: 400 });
    }
    const auxmCredit = +usdValue.toFixed(2);

    // Credit balance
    const balanceKey = `user:${userAddress}:balance`;
    const newBalance = await redis.hincrbyfloat(balanceKey, "auxm", auxmCredit);
    await recordAuxmEntry({
      address: userAddress,
      delta: auxmCredit,
      reason: "wise_wire",
      counterAsset: currency,
      counterAmount: amount,
      refTxId: `wise_manual_${resourceId}`,
      meta: { source: "wise" },
    });

    // Audit transaction record (subType discriminates manual vs auto)
    const tx = {
      id: `wise_manual_${resourceId}`,
      type: "deposit",
      subType: "bank_wire_manual",
      source: "wise",
      currency,
      amount,
      usdValue,
      auxmCredited: auxmCredit,
      reference: entry.reference || (entry.refShort ? `AUX-${entry.refShort}` : null),
      refShort: entry.refShort,
      senderName: entry.senderName,
      resourceId,
      status: "completed",
      timestamp: Date.now(),
      manualCredit: {
        admin: auth.address || "admin",
        sourceQueue: source,
        note: note || null,
      },
    };
    await redis.lpush(`user:${userAddress}:transactions`, JSON.stringify(tx));
    await redis.ltrim(`user:${userAddress}:transactions`, 0, 499);

    // Idempotency marker
    await redis.set(idempKey, Date.now().toString(), { ex: 60 * 60 * 24 * 90 });

    // Remove resolved entry from queue (lrem with the original raw string)
    if (entryRawString) {
      try { await redis.lrem(queueKey, 1, entryRawString); } catch (e) {
        console.warn("[admin/wise/console] queue lrem failed (non-fatal):", e);
      }
    }

    // Notifications (best-effort)
    try {
      const { notifyWireCredit } = await import("@/lib/notification-sender");
      notifyWireCredit(userAddress, {
        fiatAmount: amount,
        fiatCurrency: currency,
        auxmCredited: auxmCredit,
        resourceId,
      }).catch(() => {});
    } catch {}

    try {
      const { sendTelegramMessage } = await import("@/lib/telegram");
      sendTelegramMessage(
        `✅ <b>Manual wire credit</b>\n\n` +
        `User: <code>${userAddress.slice(0, 10)}...${userAddress.slice(-4)}</code>\n` +
        `Amount: <b>${amount} ${currency}</b> (~$${usdValue.toFixed(2)})\n` +
        `Credited: <b>${auxmCredit} AUXM</b>\n` +
        `Source: ${source}\n` +
        `Admin: <code>${auth.address || "admin"}</code>\n` +
        (note ? `Note: ${note}\n` : "") +
        `Resource: <code>${resourceId}</code>`
      ).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      credited: { userAddress, auxmCredit, currency, amount, usdValue },
      newBalance,
    });
  } catch (err: any) {
    console.error("[admin/wise/console] POST error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

function safeJSON(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}
