// src/app/api/admin/vault/route.ts
// Admin Vault control: edit per-vault metal holdings (grams), see the rolled-up
// on-chain target (Σ held), and run the on-chain reconciler (preview = dry-run,
// execute = mint/burn). Replaces the env-var + curl flow with admin buttons.
//
// GET                                → { rows (metal totals vs supply), vaults (per-vault held/sold/available) }
// POST { action:"save-holdings", holdings } → persist per-vault held grams to Redis
// POST { action:"preview" }          → reconciler dry-run (the plan, no on-chain writes)
// POST { action:"execute" }          → reconciler live (mint/burn to hit Σ held)
// Auth: admin session (requireAdmin).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getVaultTargets, runMintSync } from "@/lib/rwa-mint-sync";
import { getInventoryView, setHeldBulk, METALS as INV_METALS, type Metal } from "@/lib/vault-inventory";

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
  const [targets, onchain, vaults] = await Promise.all([
    getVaultTargets(),       // Σ held per metal (seeds holdings on first call)
    currentSupply(origin),
    getInventoryView(),      // per-vault held/sold/available
  ]);
  const rows = METALS.map((m) => ({
    metal: m,
    target: targets[m] ?? 0,
    onchain: onchain[m] ?? 0,
    delta: (targets[m] ?? 0) - (onchain[m] ?? 0),
  }));
  return NextResponse.json({ success: true, rows, vaults });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  let body: any = {};
  try { body = await request.json(); } catch {}
  const action = body?.action;

  if (action === "save-holdings") {
    // holdings: { [metal]: { [vaultId]: grams } }
    const holdings: Partial<Record<Metal, Record<string, number>>> = {};
    const src = body?.holdings || {};
    for (const m of INV_METALS) {
      const byVault = src[m];
      if (!byVault || typeof byVault !== "object") continue;
      const clean: Record<string, number> = {};
      for (const [vid, raw] of Object.entries(byVault)) {
        if (raw === "" || raw === null || raw === undefined) continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: `Geçersiz ${m}/${vid} değeri` }, { status: 400 });
        }
        clean[vid] = n;
      }
      if (Object.keys(clean).length) holdings[m] = clean;
    }
    await setHeldBulk(holdings);
    console.log(`[admin/vault] holdings saved by ${auth.address}`);
    const targets = await getVaultTargets();
    return NextResponse.json({ success: true, targets });
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
