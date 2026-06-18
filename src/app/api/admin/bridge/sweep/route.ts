// src/app/api/admin/bridge/sweep/route.ts
//
// Manual ("instant") Bridge off-ramp control for admins.
//
//   GET  → status: live treasury balances per target, configured liquidation
//          addresses, in-flight USD, and recent sweeps.
//   POST { target: "base:usdc", amount?: number }
//          → forward treasury stablecoin to its Bridge liquidation address now.
//            Omit `amount` to sweep the full available balance.
//   POST { all: true }  → run the same threshold pass the cron does.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getStoredLiquidationAddresses, liquidationKey } from "@/lib/bridge";
import {
  OFFRAMP_TARGETS,
  SWEEP_MIN_USD,
  targetBalance,
  sweepTarget,
  autoSweepAll,
  listSweeps,
  getInflightUsd,
} from "@/lib/bridge-offramp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const [laMap, inflight, sweeps] = await Promise.all([
      getStoredLiquidationAddresses(),
      getInflightUsd(),
      listSweeps(25),
    ]);

    const targets = await Promise.all(
      OFFRAMP_TARGETS.map(async (t) => {
        const balance = await targetBalance(t).catch(() => 0);
        const la = laMap[liquidationKey(t.chain, t.currency)];
        return {
          key: `${t.chain}:${t.currency}`,
          label: t.label,
          balance,
          liquidationAddress: la?.address || null,
          ready: !!la?.address,
          aboveThreshold: balance >= SWEEP_MIN_USD,
        };
      })
    );

    return NextResponse.json({ success: true, thresholdUsd: SWEEP_MIN_USD, inflightUsd: inflight, targets, recentSweeps: sweeps });
  } catch (err: any) {
    console.error("[bridge/sweep] GET error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await req.json().catch(() => ({}));

    if (body.all === true) {
      const report = await autoSweepAll();
      return NextResponse.json({ success: true, ...report });
    }

    const key = String(body.target || "");
    const target = OFFRAMP_TARGETS.find((t) => `${t.chain}:${t.currency}` === key);
    if (!target) {
      return NextResponse.json(
        { error: `unknown target '${key}' — one of ${OFFRAMP_TARGETS.map((t) => `${t.chain}:${t.currency}`).join(", ")}` },
        { status: 400 }
      );
    }

    const amount = body.amount != null ? Number(body.amount) : undefined;
    if (amount != null && (!isFinite(amount) || amount <= 0)) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    const res = await sweepTarget(target, amount, "admin");
    const status = res.ok ? 200 : res.skipped ? 200 : 502;
    return NextResponse.json({ success: res.ok, target: target.label, ...res }, { status });
  } catch (err: any) {
    console.error("[bridge/sweep] POST error:", err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
