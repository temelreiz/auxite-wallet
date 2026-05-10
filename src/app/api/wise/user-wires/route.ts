// src/app/api/wise/user-wires/route.ts
//
// Per-user wire activity feed: returns the user's recent bank-wire deposits
// (auto-credited via /api/wise/webhook). Used by both web (vault page) and
// mobile (home tab) to surface a "Wire Activity" widget.
//
// We don't currently track "pending" state separately — wires are invisible
// to us until Wise notifies. So this endpoint only lists CREDITED wires.
// The widget pairs the list with the user's reference so they can wire more
// at any time.
//
// Source of truth: `user:{address}:transactions` Redis list, written by the
// wise webhook handler with `subType: "bank_wire"`.

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface WireTx {
  id: string;
  type: string;
  subType?: string;
  source?: string;
  currency?: string;
  amount?: number;
  usdValue?: number;
  auxmCredited?: number;
  reference?: string;
  refShort?: string;
  senderName?: string;
  resourceId?: string;
  status?: string;
  timestamp?: number;
}

function buildReference(address: string): string {
  if (!address || !address.startsWith("0x") || address.length < 8) return "AUX-XXXXXX";
  return `AUX-${address.slice(2, 8).toUpperCase()}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = (searchParams.get("address") || "").toLowerCase();
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

  if (!address || !address.startsWith("0x")) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

  try {
    const raw = await redis.lrange(`user:${address}:transactions`, 0, 499);
    const txs: WireTx[] = raw
      .map((r: any) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      })
      .filter((t: any): t is WireTx => !!t && (t.subType === "bank_wire" || t.source === "wise"));

    txs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    const items = txs.slice(0, limit).map((t) => ({
      id: t.id,
      timestamp: t.timestamp,
      currency: t.currency,
      amount: t.amount,
      auxmCredited: t.auxmCredited,
      senderName: t.senderName,
      reference: t.reference || (t.refShort ? `AUX-${t.refShort}` : null),
      status: t.status || "completed",
    }));

    return NextResponse.json({
      success: true,
      reference: buildReference(address),
      wires: items,
      total: txs.length,
    });
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e?.message || "Failed to fetch wires",
      reference: buildReference(address),
      wires: [],
      total: 0,
    });
  }
}
