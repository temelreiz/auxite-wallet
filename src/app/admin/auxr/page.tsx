// ============================================================================
// /admin/auxr — AUXR Reserve Control Panel
// ----------------------------------------------------------------------------
// Single-page ops tool for everything AUXR-related:
//   - Live snapshot: supply, market cap, reserves, backing ratios
//   - "Seed Treasury" one-click for Phase 1A — mints to the reserved
//     AUXR_TREASURY_ADDRESS so the public PoR page shows real numbers
//   - Manual grant form: any address, any units, any reason
//   - Manual reserve adjust form: top up / write down a specific metal
//   - Recent events log (mints / burns / adjusts) with timestamps
//
// Auth: reads `auxite_admin_token` from sessionStorage (existing pattern).
// All POSTs send Authorization: Bearer.
// ============================================================================

"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const TREASURY_ADDRESS = "0x0000000000000000000000000000000000a11a11";

type Snapshot = {
  success: true;
  supply: { unitsAUXR: number; marketCapUSD: number };
  reserves: {
    grams: { gold: number; silver: number; platinum: number; palladium: number };
    totalValueUSD: number;
  };
  required: {
    grams: { gold: number; silver: number; platinum: number; palladium: number };
  };
  backing: {
    ratio: { gold: number; silver: number; platinum: number; palladium: number; weakest: number };
    fullyBacked: boolean;
  };
};

type EventRow = {
  action: "mint" | "burn" | "manual_adjust";
  unitsAUXR: number;
  deltas: { gold: number; silver: number; platinum: number; palladium: number };
  refId?: string;
  walletAddress?: string;
  reason?: string;
  timestamp: number;
};

function useAdminToken(): string | null {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(sessionStorage.getItem("auxite_admin_token"));
  }, []);
  return token;
}

function fmtGrams(g: number): string {
  if (Math.abs(g) >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  if (g === 0) return "0";
  if (Math.abs(g) < 0.01) return g.toFixed(5);
  return g.toFixed(4);
}
function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export default function AdminAuxrPage() {
  const adminToken = useAdminToken();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [ops, setOps] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // Seed form
  const [seedUnits, setSeedUnits] = useState("50");

  // Grant form (off-chain app balance)
  const [grantAddr, setGrantAddr] = useState("");
  const [grantUnits, setGrantUnits] = useState("10");
  const [grantReason, setGrantReason] = useState("Internal beta seed");

  // On-chain mint form (real AUXR to any wallet)
  const [mintAddr, setMintAddr] = useState("");
  const [mintUnits, setMintUnits] = useState("100");
  const [mintReason, setMintReason] = useState("On-chain mint");
  const [mintTxUrl, setMintTxUrl] = useState<string | null>(null);

  // Adjust form
  const [adjMetal, setAdjMetal] = useState<"gold" | "silver" | "platinum" | "palladium">("gold");
  const [adjDelta, setAdjDelta] = useState("0");
  const [adjReason, setAdjReason] = useState("");

  const loadSnapshot = useCallback(async () => {
    try {
      const r = await fetch("/api/auxr/reserves", { cache: "no-store" });
      const j = await r.json();
      if (j?.success) setSnapshot(j);
    } catch (e: any) {
      setErr(e?.message || "snapshot_fetch_failed");
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!adminToken) return;
    try {
      const r = await fetch("/api/admin/auxr/events?limit=30", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const j = await r.json();
      if (j?.success) setEvents(j.events || []);
    } catch (e: any) {
      console.warn("[admin/auxr] events fetch failed", e);
    }
  }, [adminToken]);

  const loadOps = useCallback(async () => {
    if (!adminToken) return;
    try {
      const r = await fetch("/api/admin/auxr-ops", {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (j?.success) setOps(j);
    } catch (e: any) {
      console.warn("[admin/auxr] ops fetch failed", e);
    }
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      await Promise.all([loadSnapshot(), loadEvents(), loadOps()]);
      if (!cancelled) setLoading(false);
    })();
    const interval = setInterval(() => {
      loadSnapshot();
      loadEvents();
      loadOps();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [adminToken, loadSnapshot, loadEvents, loadOps]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const seedTreasury = async () => {
    if (!adminToken) {
      setErr("Admin token missing — log in to /admin first");
      return;
    }
    const units = parseFloat(seedUnits);
    if (!isFinite(units) || units <= 0) {
      setErr("Invalid seed units");
      return;
    }
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      const r = await fetch("/api/admin/auxr/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          address: TREASURY_ADDRESS,
          unitsAUXR: units,
          reason: `Phase 1A treasury seed — ${units} AUXR pre-launch reserve booking`,
        }),
      });
      const j = await r.json();
      if (j?.success) {
        setOkMsg(`Seeded ${units} AUXR to treasury · refId ${j.refId}`);
        await loadSnapshot();
        await loadEvents();
      } else {
        setErr(j?.error || "seed_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "seed_failed");
    } finally {
      setBusy(false);
    }
  };

  const submitGrant = async () => {
    if (!adminToken) return setErr("Admin token missing");
    const units = parseFloat(grantUnits);
    if (!grantAddr || !isFinite(units) || units <= 0) {
      setErr("address + units required");
      return;
    }
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      const r = await fetch("/api/admin/auxr/grant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          address: grantAddr,
          unitsAUXR: units,
          reason: grantReason || "Manual grant",
        }),
      });
      const j = await r.json();
      if (j?.success) {
        setOkMsg(`Granted ${units} AUXR to ${grantAddr.slice(0, 10)}…`);
        setGrantAddr("");
        await loadSnapshot();
        await loadEvents();
      } else {
        setErr(j?.error || "grant_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "grant_failed");
    } finally {
      setBusy(false);
    }
  };

  const submitMintOnchain = async () => {
    if (!adminToken) return setErr("Admin token missing");
    const units = parseFloat(mintUnits);
    if (!mintAddr || !isFinite(units) || units <= 0) {
      setErr("address + units required");
      return;
    }
    if (!mintReason || mintReason.length < 4) {
      setErr("reason ≥ 4 chars required");
      return;
    }
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Mint ${units} REAL AUXR on-chain to ${mintAddr}?\n\nThis signs an irreversible mint() transaction. The tokens land in the recipient's on-chain wallet.`
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    setMintTxUrl(null);
    try {
      const r = await fetch("/api/admin/auxr/mint-onchain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          destination: mintAddr,
          unitsAUXR: units,
          reason: mintReason || "On-chain mint",
        }),
      });
      const j = await r.json();
      if (j?.success) {
        setOkMsg(
          `Minted ${units} AUXR on-chain to ${mintAddr.slice(0, 10)}… · tx ${String(
            j.txHash
          ).slice(0, 12)}…`
        );
        setMintTxUrl(j.explorerUrl || null);
        setMintAddr("");
        await loadSnapshot();
        await loadEvents();
      } else {
        setErr(
          j?.details ? `${j.error}: ${j.details}` : j?.error || "mint_failed"
        );
      }
    } catch (e: any) {
      setErr(e?.message || "mint_failed");
    } finally {
      setBusy(false);
    }
  };

  const submitAdjust = async () => {
    if (!adminToken) return setErr("Admin token missing");
    const delta = parseFloat(adjDelta);
    if (!isFinite(delta) || delta === 0) {
      setErr("delta must be non-zero");
      return;
    }
    if (!adjReason || adjReason.length < 4) {
      setErr("reason ≥ 4 chars required");
      return;
    }
    setBusy(true);
    setErr(null);
    setOkMsg(null);
    try {
      const r = await fetch("/api/admin/auxr/reserve-adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          metal: adjMetal,
          deltaGrams: delta,
          reason: adjReason,
        }),
      });
      const j = await r.json();
      if (j?.success) {
        setOkMsg(`Adjusted ${adjMetal} by ${delta > 0 ? "+" : ""}${delta} g`);
        setAdjDelta("0");
        setAdjReason("");
        await loadSnapshot();
        await loadEvents();
      } else {
        setErr(j?.error || "adjust_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "adjust_failed");
    } finally {
      setBusy(false);
    }
  };

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-3">Admin authentication required</p>
          <Link href="/admin" className="text-[#BFA181] underline">Go to /admin to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div lang="en" className="min-h-screen bg-zinc-950 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-slate-400 hover:text-white">&larr; Admin</Link>
          <span className="text-slate-600">·</span>
          <h1 className="text-base font-semibold">AUXR Ops Cockpit</h1>
        </div>
        <div className="text-xs text-slate-500">
          {ops?.cex?.listed ? (
            <span className="text-emerald-400">● Live on BitMart</span>
          ) : (
            <span className="text-amber-400">● Pre-listing</span>
          )}
          <span className="text-slate-600"> · auto-refresh 30s</span>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* ── Ops Cockpit hero ─────────────────────────────────────────── */}
        {(() => {
          const nav = ops?.price?.navUSD;
          const cex = ops?.cex;
          const dev = cex?.deviationBps;
          const devPct = dev != null ? dev / 100 : null;
          const devColor =
            dev == null ? "text-slate-500"
              : Math.abs(dev) < 50 ? "text-emerald-400"
              : Math.abs(dev) < 200 ? "text-amber-400"
              : "text-red-400";
          const backingPct = ops?.reserve?.weakestBackingPct;
          const fullyBacked = ops?.reserve?.fullyBacked;
          const depth = cex?.depth;
          return (
            <section className="rounded-2xl border border-[#BFA181]/30 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6">
              {/* Price strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">NAV (fair value)</div>
                  <div className="text-2xl font-semibold tabular-nums">{nav != null ? fmtUSD(nav) : "—"}</div>
                  <div className="text-xs text-slate-500 mt-1">bid {ops?.price?.sellPriceUSD != null ? fmtUSD(ops.price.sellPriceUSD) : "—"} · ask {ops?.price?.buyPriceUSD != null ? fmtUSD(ops.price.buyPriceUSD) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">CEX price (BitMart)</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {cex?.listed && cex.last != null ? fmtUSD(cex.last) : <span className="text-amber-400 text-base">Not listed yet</span>}
                  </div>
                  {cex?.listed && (
                    <div className="text-xs text-slate-500 mt-1">bid {cex.bid != null ? fmtUSD(cex.bid) : "—"} · ask {cex.ask != null ? fmtUSD(cex.ask) : "—"}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Deviation vs NAV</div>
                  <div className={`text-2xl font-semibold tabular-nums ${devColor}`}>
                    {devPct != null ? `${devPct > 0 ? "+" : ""}${devPct.toFixed(2)}%` : "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{dev != null ? `${dev.toFixed(0)} bps` : "anchor to NAV"}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Backing (weakest leg)</div>
                  <div className={`text-2xl font-semibold tabular-nums ${fullyBacked ? "text-emerald-400" : backingPct != null ? "text-red-400" : "text-slate-500"}`}>
                    {backingPct != null ? `${backingPct.toFixed(2)}%` : "—"}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{fullyBacked ? "fully backed" : backingPct != null ? "UNDER-COLLATERALISED" : "—"}</div>
                </div>
              </div>

              {/* Secondary metrics */}
              <div className="mt-5 pt-5 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Reserves</div>
                  <div className="tabular-nums">{ops?.reserve?.reservesUSD != null ? fmtUSD(ops.reserve.reservesUSD) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Liquid treasury backing</div>
                  <div className={`tabular-nums ${ops?.treasury?.solvent === false ? "text-red-400" : ""}`}>{ops?.treasury?.liquidBackingUSD != null ? fmtUSD(ops.treasury.liquidBackingUSD) : "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Supply (on / off-chain)</div>
                  <div className="tabular-nums">
                    {ops?.supply?.onChain != null ? ops.supply.onChain.toLocaleString() : "—"}
                    <span className="text-slate-600"> / </span>
                    {ops?.supply?.offChain != null ? ops.supply.offChain.toLocaleString() : "—"}
                  </div>
                  {ops?.supply?.driftUnits != null && Math.abs(ops.supply.driftUnits) > 0.001 && (
                    <div className="text-xs text-amber-400 mt-0.5">drift {ops.supply.driftUnits.toFixed(3)}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Contract</div>
                  <div className={ops?.supply?.contractPaused ? "text-red-400" : "text-emerald-400"}>
                    {ops?.supply?.contractPaused == null ? "—" : ops.supply.contractPaused ? "PAUSED" : "Active"}
                  </div>
                </div>
              </div>

              {/* MM depth (only once listed) */}
              {cex?.listed && depth && (
                <div className="mt-5 pt-5 border-t border-white/5">
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-3">Order-book depth (around NAV) · MM / BML proxy</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Spread</div>
                      <div className="tabular-nums">{depth.spreadBps != null ? `${depth.spreadBps.toFixed(1)} bps` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">±2% bid / ask</div>
                      <div className="tabular-nums">{fmtUSD(depth.bidUsdWithin?.["2"] || 0)} / {fmtUSD(depth.askUsdWithin?.["2"] || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">±5% bid / ask</div>
                      <div className="tabular-nums">{fmtUSD(depth.bidUsdWithin?.["5"] || 0)} / {fmtUSD(depth.askUsdWithin?.["5"] || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">24h volume</div>
                      <div className="tabular-nums">{cex.quoteVolume24h != null ? fmtUSD(cex.quoteVolume24h) : "—"}</div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          );
        })()}

        {/* Snapshot */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Live Snapshot</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Supply" value={snapshot ? snapshot.supply.unitsAUXR.toFixed(4) : "—"} sub="AUXR" />
            <Stat label="Market Cap" value={snapshot ? fmtUSD(snapshot.supply.marketCapUSD) : "—"} />
            <Stat label="Reserves USD" value={snapshot ? fmtUSD(snapshot.reserves.totalValueUSD) : "—"} />
            <Stat
              label="Weakest Backing"
              value={snapshot ? `${(snapshot.backing.ratio.weakest * 100).toFixed(2)}%` : "—"}
              accent={snapshot?.backing.fullyBacked ? "ok" : "warn"}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["gold", "silver", "platinum", "palladium"] as const).map((m) => (
              <div key={m} className="rounded-xl bg-zinc-900/80 border border-white/5 p-3">
                <div className="text-xs uppercase text-slate-500 mb-1">{m}</div>
                <div className="text-sm font-mono">
                  {snapshot ? fmtGrams(snapshot.reserves.grams[m]) : "—"} g
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  req {snapshot ? fmtGrams(snapshot.required.grams[m]) : "—"} g
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Banners */}
        {err && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/40 px-4 py-3 text-sm text-red-300">
            {err}
          </div>
        )}
        {okMsg && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/40 px-4 py-3 text-sm text-emerald-300">
            {okMsg}
          </div>
        )}

        {/* Seed Treasury */}
        <section className="rounded-2xl bg-zinc-900/80 border border-[#BFA181]/30 p-6">
          <h2 className="text-base font-semibold mb-1">
            Seed Treasury{" "}
            <span className="text-xs font-normal text-slate-500">(off-chain)</span>
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Books off-chain AUXR supply against the reserved treasury address{" "}
            <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded">{TREASURY_ADDRESS}</code>.
            Use for Phase 1A pre-launch reserve booking. No AUXM debited. Does
            NOT mint on-chain.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <label className="block text-xs text-slate-500 mb-1">Units AUXR</label>
              <input
                type="number"
                value={seedUnits}
                onChange={(e) => setSeedUnits(e.target.value)}
                className="w-full bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              disabled={busy}
              onClick={seedTreasury}
              className="bg-[#BFA181] hover:bg-[#D4B47A] disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2 rounded-lg text-sm"
            >
              {busy ? "Working..." : "Seed Treasury"}
            </button>
          </div>
        </section>

        {/* Manual Grant */}
        <section className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          <h2 className="text-base font-semibold mb-1">
            Manual Grant{" "}
            <span className="text-xs font-normal text-slate-500">
              (off-chain app balance)
            </span>
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Credits an in-app AUXR balance for an Auxite user (max 1000). For
            internal beta seeding to test users (5–20 wallets).{" "}
            <span className="text-amber-400/80">
              Does NOT send to on-chain wallets — use “On-chain Mint” for
              MetaMask/external addresses.
            </span>
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              value={grantAddr}
              onChange={(e) => setGrantAddr(e.target.value)}
              placeholder="0x… wallet"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <input
              type="number"
              value={grantUnits}
              onChange={(e) => setGrantUnits(e.target.value)}
              placeholder="Units"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Reason"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={busy}
            onClick={submitGrant}
            className="bg-white text-zinc-950 hover:bg-slate-200 disabled:opacity-40 font-semibold px-5 py-2 rounded-lg text-sm"
          >
            Grant AUXR
          </button>
        </section>

        {/* On-chain Mint */}
        <section className="rounded-2xl bg-zinc-900/80 border border-emerald-500/30 p-6">
          <h2 className="text-base font-semibold mb-1">
            On-chain Mint{" "}
            <span className="text-xs font-normal text-emerald-400">
              (real AUXR → any wallet)
            </span>
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Signs a real <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">mint()</code>{" "}
            on Base and sends AUXR to any on-chain wallet (e.g. a MetaMask
            address). The tokens are transferable/withdrawable like any ERC-20.
            Backing is booked after the tx confirms. Irreversible.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              value={mintAddr}
              onChange={(e) => setMintAddr(e.target.value)}
              placeholder="0x… destination wallet"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm font-mono"
            />
            <input
              type="number"
              value={mintUnits}
              onChange={(e) => setMintUnits(e.target.value)}
              placeholder="Units AUXR"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={mintReason}
              onChange={(e) => setMintReason(e.target.value)}
              placeholder="Reason (required, ≥4 chars)"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={busy}
            onClick={submitMintOnchain}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold px-5 py-2 rounded-lg text-sm"
          >
            {busy ? "Minting…" : "Mint On-chain"}
          </button>
          {mintTxUrl && (
            <a
              href={mintTxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-xs text-emerald-400 hover:underline break-all"
            >
              View transaction ↗ {mintTxUrl}
            </a>
          )}
        </section>

        {/* Manual Reserve Adjust */}
        <section className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          <h2 className="text-base font-semibold mb-1">Manual Reserve Adjust</h2>
          <p className="text-sm text-slate-400 mb-4">
            Top up reserves (e.g. physical bullion arrival) or write down (audit reconciliation).
            Does NOT change supply.
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <select
              value={adjMetal}
              onChange={(e) => setAdjMetal(e.target.value as any)}
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="platinum">Platinum</option>
              <option value="palladium">Palladium</option>
            </select>
            <input
              type="number"
              step="0.0001"
              value={adjDelta}
              onChange={(e) => setAdjDelta(e.target.value)}
              placeholder="Δ grams (+ or −)"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Reason (required, ≥4 chars)"
              className="bg-zinc-800 border border-white/5 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            disabled={busy}
            onClick={submitAdjust}
            className="bg-white text-zinc-950 hover:bg-slate-200 disabled:opacity-40 font-semibold px-5 py-2 rounded-lg text-sm"
          >
            Apply Adjust
          </button>
        </section>

        {/* Recent Events */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Recent Events</h2>
          <div className="rounded-2xl bg-zinc-900/80 border border-white/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left py-3 px-4">Time</th>
                  <th className="text-left py-3 px-4">Action</th>
                  <th className="text-right py-3 px-4">Units</th>
                  <th className="text-left py-3 px-4">Address</th>
                  <th className="text-left py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No events yet — seed the treasury or run a buy/sell.
                    </td>
                  </tr>
                )}
                {events.map((e, i) => (
                  <tr key={i} className="border-t border-white/5">
                    <td className="py-2 px-4 text-xs text-slate-400 font-mono">
                      {new Date(e.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          e.action === "mint"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : e.action === "burn"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {e.action}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right font-mono">
                      {e.unitsAUXR.toFixed(4)}
                    </td>
                    <td className="py-2 px-4 font-mono text-xs text-slate-400">
                      {e.walletAddress ? `${e.walletAddress.slice(0, 10)}…` : "—"}
                    </td>
                    <td className="py-2 px-4 text-xs text-slate-400">{e.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "ok" | "warn";
}) {
  const accentClass =
    accent === "ok" ? "text-emerald-400" : accent === "warn" ? "text-amber-400" : "text-white";
  return (
    <div className="rounded-xl bg-zinc-900/80 border border-white/5 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
