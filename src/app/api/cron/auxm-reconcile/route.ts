// src/app/api/cron/auxm-reconcile/route.ts
// Daily AUXM solvency + bookkeeping reconciliation.
//
// AUXM is a USD-denominated internal settlement liability (see src/lib/auxm-ledger.ts).
// This cron answers two questions every day:
//   1. Solvency — does liquid treasury cover all redeemable stable liabilities?
//   2. Integrity — do the mint/burn counters still match the live balance sum?
//
// It snapshots the result to redis (latest + 365-day history) and fires a
// Telegram alert when either check trips. Read-only w.r.t. user balances.
//
// Triggered by Vercel cron (see vercel.json). Auth: Bearer CRON_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { reconcileAuxm } from "@/lib/auxm-ledger";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SECRET = process.env.CRON_SECRET || "";
const LATEST_KEY = "auxm:reconcile:latest";
const HISTORY_KEY = "auxm:reconcile:history";

export async function GET(request: NextRequest) {
  // Allow Vercel cron (Bearer CRON_SECRET); also allow admins via the same header.
  const auth = request.headers.get("Authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await reconcileAuxm();
  const r = getRedis();

  // Persist snapshot: latest + rolling 365-entry history.
  try {
    await r.set(LATEST_KEY, JSON.stringify(report));
    await r.lpush(HISTORY_KEY, JSON.stringify(report));
    await r.ltrim(HISTORY_KEY, 0, 364);
  } catch (e: any) {
    console.error("auxm-reconcile: snapshot persist failed:", e?.message || e);
  }

  // Alert on any tripped check.
  if (report.alerts.length > 0) {
    const lines = [
      "⚠️ *AUXM reconciliation alert*",
      `Outstanding AUXM: ${report.liabilities.auxm.toFixed(2)}`,
      `Stable liabilities: ${report.liabilities.total.toFixed(2)} USD`,
      `Liquid backing: ${report.backingUSD.toFixed(2)} USD${report.backingOk ? "" : " (unreliable)"}`,
      report.coverageVsStable != null ? `Coverage: ${(report.coverageVsStable * 100).toFixed(1)}%` : "",
      report.drift != null ? `Counter drift: ${report.drift.toFixed(2)} USD` : "",
      "",
      ...report.alerts.map((a) => `• ${a}`),
    ].filter(Boolean);
    try {
      await sendTelegramMessage(lines.join("\n"));
    } catch (e: any) {
      console.error("auxm-reconcile: telegram alert failed:", e?.message || e);
    }
    // Also append to the admin audit error feed for the dashboard.
    try {
      await r.lpush(
        "admin:audit:errors",
        JSON.stringify({ ts: report.ts, kind: "auxm_reconcile", alerts: report.alerts })
      );
      await r.ltrim("admin:audit:errors", 0, 499);
    } catch {}
  }

  return NextResponse.json({
    success: true,
    ts: report.ts,
    outstanding: report.liabilities.auxm,
    stableLiabilitiesUSD: report.liabilities.total,
    backingUSD: report.backingUSD,
    backingOk: report.backingOk,
    coverageVsAuxm: report.coverageVsAuxm,
    coverageVsStable: report.coverageVsStable,
    solvent: report.solvent,
    drift: report.drift,
    driftOk: report.driftOk,
    alerts: report.alerts,
  });
}
