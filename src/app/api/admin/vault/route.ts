// src/app/api/admin/vault/route.ts
// Admin Vault control: read/edit the per-metal vault targets (grams) and run the
// on-chain reconciler (preview = dry-run, execute = mint/burn). Replaces the
// env-var + curl flow with an admin-panel button.
//
// GET                          → { targets, onchain }  (targets vs current supply)
// POST { action:"save", targets } → persist new targets to Redis
// POST { action:"preview" }    → reconciler dry-run (the plan, no on-chain writes)
// POST { action:"execute" }    → reconciler live (mint/burn to hit targets)
// Auth: admin session (requireAdmin).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getVaultTargets, setVaultTargets, runMintSync } from "@/lib/rwa-mint-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"] as const;

async function currentSupply(origin: string): Promise<Record<string, number>> {
  try {
    const r = await fetch(`${origin}/api/supply`, { cache: "no-store" });
    const j = await r.json();
    const out: Record<string, number> = {};
    for (const t of j?.tokens || []) out[t.symbol] = Number(t.totalSupply) || 0;
    return out;
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const origin = new URL(request.url).origin;
  const [targets, onchain] = await Promise.all([getVaultTargets(), currentSupply(origin)]);
  const rows = METALS.map((m) => ({
    metal: m,
    target: targets[m] ?? 0,
    onchain: onchain[m] ?? 0,
    delta: (targets[m] ?? 0) - (onchain[m] ?? 0),
  }));
  return NextResponse.json({ success: true, rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: any = {};
  try { body = await request.json(); } catch {}
  const action = body?.action;

  if (action === "save") {
    const targets: Record<string, number> = {};
    for (const m of METALS) {
      const v = body?.targets?.[m];
      if (v !== undefined && v !== null && v !== "") {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: `Geçersiz ${m} değeri` }, { status: 400 });
        }
        targets[m] = n;
      }
    }
    const updated = await setVaultTargets(targets);
    console.log(`[admin/vault] targets saved by ${auth.address}:`, updated);
    return NextResponse.json({ success: true, targets: updated });
  }

  if (action === "preview") {
    const result = await runMintSync({ dryRun: true });
    return NextResponse.json({ success: true, ...result });
  }

  if (action === "execute") {
    console.log(`[admin/vault] EXECUTE reconciler by ${auth.address}`);
    const result = await runMintSync({ dryRun: false });
    return NextResponse.json({ success: true, ...result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
