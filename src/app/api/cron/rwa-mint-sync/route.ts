// /api/cron/rwa-mint-sync — daily on-chain reconciliation.
//
// Walks every user's off-chain claim, computes the delta vs. last-synced
// total per metal, and mints the delta to the treasury wallet on Base so
// rwa.xyz's Total Supply / Holders catches up to real AUM.
//
// Auth: CRON_SECRET (Bearer).
// Live vs dry-run: see src/lib/rwa-mint-sync.ts — defaults to dry-run if
// any of the required env vars (private key, treasury, RPC) is missing.
//
//   GET                       → run (or dry-run)
//   GET ?force-dry=true       → never mint, even if env is fully set
//   GET ?live=true            → require live mode (errors if env incomplete)

import { NextRequest, NextResponse } from "next/server";
import { runMintSync } from "@/lib/rwa-mint-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const forceDry = sp.get("force-dry") === "true";
  // ?force-execute=true → execute THIS call on-chain regardless of the
  // RWA_SYNC_EXECUTE env, so the daily cron can stay dry (no standing auto-mint)
  // while the founder mints on demand. Gated by CRON_SECRET (checked above).
  const forceExecute = sp.get("force-execute") === "true";
  const requireLive = forceExecute || sp.get("live") === "true";

  if (requireLive) {
    const missing: string[] = [];
    if (!process.env.RWA_MINT_SYNC_PRIVATE_KEY) missing.push("RWA_MINT_SYNC_PRIVATE_KEY");
    if (!process.env.RWA_MINT_SYNC_TREASURY) missing.push("RWA_MINT_SYNC_TREASURY");
    if (!process.env.BASE_RPC_URL) missing.push("BASE_RPC_URL");
    if (missing.length) {
      return NextResponse.json({ error: "Live mode requested but env incomplete", missing }, { status: 400 });
    }
  }

  const dryRun = forceDry ? true : forceExecute ? false : undefined;
  const result = await runMintSync({ dryRun });
  return NextResponse.json({ success: true, ...result });
}
