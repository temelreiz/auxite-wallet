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

import { encodeFunctionData, keccak256, parseUnits, toBytes } from "viem";

/** Holder of MINTER_ROLE. Minting happens here and nowhere else. */
const SAFE_ADDRESS = "0xedc9163c5f8a2a76bd1cdda6baa4eb576b481070";
const AUXR_ADDRESS = "0xB145B8e9C02193d55454f534f917Cabe704FA042";

/** mint(address,uint256,bytes32). Encoded with viem rather than by hand: the
 *  first draft of this screen used the selector for the two-argument mint. */
const MINT_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "refId", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

interface MintRequest {
  refId: string;
  address: string;
  destination: string;
  unitsAUXR: number;
  state: string;
  createdAt: string;
  expiresAt: string;
  note?: string;
}

interface SafeTx {
  safe: string;
  to: string;
  value: string;
  method: string;
  destination: string;
  units: number;
  amountWei: string;
  refId: string;
  calldata: string;
  reason: string;
}

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

/** Formats a gram figure WITH its unit — callers must not append one, or
 *  the kilo branch renders as "1.180 kg g". */
function fmtGrams(g: number): string {
  if (Math.abs(g) >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  if (g === 0) return "0 g";
  if (Math.abs(g) < 0.01) return `${g.toFixed(5)} g`;
  return `${g.toFixed(4)} g`;
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
  // Admin sessions expire after 2h. Without surfacing that, every admin-authed
  // panel silently renders "—" and looks like missing data rather than logout.
  const [sessionExpired, setSessionExpired] = useState(false);

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
  const [safeTx, setSafeTx] = useState<SafeTx | null>(null);
  const [requests, setRequests] = useState<MintRequest[]>([]);
  const [reqSafeTx, setReqSafeTx] = useState<Record<string, SafeTx>>({});

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

  // With the co-sign threshold at zero every withdrawal lands here, so this
  // queue is the whole withdrawal pipeline rather than an exception list. It
  // reloads on the same interval as everything else: a customer waiting on a
  // signature should not also be waiting on someone to refresh a page.
  const loadRequests = useCallback(async () => {
    if (!adminToken) return;
    try {
      const r = await fetch("/api/admin/auxr/mint-requests", {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (j?.success) setRequests(j.open || []);
    } catch (e: any) {
      console.warn("[admin/auxr] mint requests fetch failed", e);
    }
  }, [adminToken]);

  const decideRequest = async (refId: string, decision: "approve" | "reject") => {
    if (!adminToken) return setErr("Admin token missing");
    const req = requests.find((x) => x.refId === refId);
    if (
      decision === "reject" &&
      typeof window !== "undefined" &&
      !window.confirm(
        `Reject ${req?.unitsAUXR} AUXR for ${req?.address.slice(0, 10)}…?\n\nThe hold is refunded to their balance.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/auxr/mint-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ refId, decision }),
      });
      const j = await r.json();
      if (!j?.success) {
        setErr(j?.error || "decision_failed");
      } else {
        setOkMsg(
          decision === "approve"
            ? `${refId} cleared for the Safe — build and sign the mint below`
            : `${refId} rejected, AUXR refunded`,
        );
        // Approving does not mint. Hand over the transaction immediately, so
        // the operator is not left wondering what "approved" accomplished.
        if (decision === "approve" && req) buildSafeTxFor(req);
        await loadRequests();
      }
    } catch (e: any) {
      setErr(e?.message || "decision_failed");
    } finally {
      setBusy(false);
    }
  };

  const buildSafeTxFor = (req: MintRequest) => {
    const amountWei = parseUnits(String(req.unitsAUXR), 18);
    const calldata = encodeFunctionData({
      abi: MINT_ABI,
      functionName: "mint",
      args: [req.destination as `0x${string}`, amountWei, keccak256(toBytes(req.refId))],
    });
    setReqSafeTx((prev) => ({
      ...prev,
      [req.refId]: {
        safe: SAFE_ADDRESS,
        to: AUXR_ADDRESS,
        value: "0",
        method: "mint(address,uint256,bytes32)",
        destination: req.destination,
        units: req.unitsAUXR,
        amountWei: amountWei.toString(),
        refId: req.refId,
        calldata,
        reason: req.note || "customer withdrawal",
      },
    }));
  };

  const loadOps = useCallback(async () => {
    if (!adminToken) return;
    try {
      const r = await fetch("/api/admin/auxr-ops", {
        headers: { Authorization: `Bearer ${adminToken}` },
        cache: "no-store",
      });
      if (r.status === 401 || r.status === 403) {
        setSessionExpired(true);
        return;
      }
      const j = await r.json();
      if (j?.success) {
        setOps(j);
        setSessionExpired(false);
      }
    } catch (e: any) {
      console.warn("[admin/auxr] ops fetch failed", e);
    }
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    let cancelled = false;
    (async () => {
      await Promise.all([loadSnapshot(), loadEvents(), loadOps(), loadRequests()]);
      if (!cancelled) setLoading(false);
    })();
    const interval = setInterval(() => {
      loadSnapshot();
      loadEvents();
      loadOps();
      loadRequests();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [adminToken, loadSnapshot, loadEvents, loadOps, loadRequests]);

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

  // No longer mints. The admin Safe holds MINTER_ROLE and this process does
  // not, so the useful thing this screen can do is hand the operator the exact
  // transaction to paste into the Safe — contract, function, arguments and
  // calldata — rather than a button that reverts.
  //
  // Encoded with viem rather than by hand: the first draft of this used the
  // selector for mint(address,uint256) on a contract whose mint takes three
  // arguments, which would have produced calldata that reverts after the
  // operator had already signed it.
  const buildSafeMintTx = () => {
    const units = parseFloat(mintUnits);
    const dest = mintAddr.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(dest)) {
      setErr("a valid 0x destination address is required");
      return;
    }
    if (!isFinite(units) || units <= 0) {
      setErr("units required");
      return;
    }
    if (!mintReason || mintReason.length < 4) {
      setErr("reason ≥ 4 chars required");
      return;
    }
    setErr(null);
    setOkMsg(null);

    const refId = `admin-${Date.now()}`;
    const amountWei = parseUnits(String(units), 18);
    const calldata = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "mint",
          stateMutability: "nonpayable",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "refId", type: "bytes32" },
          ],
          outputs: [],
        },
      ] as const,
      functionName: "mint",
      args: [dest as `0x${string}`, amountWei, keccak256(toBytes(refId))],
    });

    setSafeTx({
      safe: SAFE_ADDRESS,
      to: AUXR_ADDRESS,
      value: "0",
      method: "mint(address,uint256,bytes32)",
      destination: dest,
      units,
      amountWei: amountWei.toString(),
      refId,
      calldata,
      reason: mintReason,
    });
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
          {sessionExpired ? (
            // Don't claim a listing state we can't actually read.
            <span className="text-red-400">● Session expired</span>
          ) : ops?.lbank?.listed ? (
            // LBANK carries the live book; BitMart's delisting left the old
            // badge reading "Delisted" while AUXR was trading elsewhere.
            <span className="text-emerald-400">● Live on {ops.lbank.exchange}</span>
          ) : ops?.cex?.listed ? (
            <span className="text-emerald-400">● Live on {ops.cex.exchange}</span>
          ) : ops?.cex?.delisted ? (
            <span className="text-slate-400">● Delisted — NAV only</span>
          ) : (
            <span className="text-amber-400">● Pre-listing</span>
          )}
          <span className="text-slate-600"> · auto-refresh 30s</span>
          {/* Watchdog liveness. The cron's only prior sign of life was a
              Telegram message, so a muted channel read exactly like a dead
              cron — and the daily digest only answers that once a day. */}
          {(() => {
            const w = ops?.watchdog;
            if (!w?.ageSeconds && w?.ageSeconds !== 0) {
              return <span className="text-slate-600"> · <span className="text-amber-400">gözcü: kayıt yok</span></span>;
            }
            const mins = Math.round(w.ageSeconds / 60);
            const stale = w.ageSeconds > 900; // cron runs every 5 min
            return (
              <span className="text-slate-600">
                {" · "}
                <span className={stale ? "text-red-400" : "text-emerald-400"}>
                  gözcü: {mins < 1 ? "az önce" : `${mins} dk önce`}
                  {stale ? " — GECİKMİŞ" : ""}
                </span>
                {w.alertsFired?.length ? (
                  <span className="text-amber-400"> · {w.alertsFired.length} alarm</span>
                ) : null}
              </span>
            );
          })()}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {sessionExpired && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span className="font-semibold">Admin session expired.</span>{" "}
            Live figures below are stale or blank — log in again to restore them.{" "}
            <Link href="/admin" className="underline hover:text-white">Go to admin login →</Link>
          </div>
        )}
        {/* ── Ops Cockpit hero ─────────────────────────────────────────── */}
        {(() => {
          const nav = ops?.price?.navUSD;
          const cex = ops?.cex;
          const lb = ops?.lbank;
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
                  <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">CEX price{cex?.exchange ? ` (${cex.exchange})` : ""}</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {cex?.delisted
                      ? <span className="text-slate-500 text-base">Delisted</span>
                      : cex?.listed && cex.last != null
                        ? fmtUSD(cex.last)
                        : <span className="text-amber-400 text-base">Not listed yet</span>}
                  </div>
                  {cex?.delisted ? (
                    <div className="text-xs text-slate-500 mt-1">no CEX tracked — NAV is the reference</div>
                  ) : cex?.listed && (
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

              {/* ── LBANK: the live venue ──────────────────────────────── */}
              {lb?.listed && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-baseline justify-between mb-4">
                    <div className="text-xs uppercase tracking-widest text-slate-500">
                      {lb.exchange} · {lb.symbol}
                    </div>
                    {lb.deviationBps != null && (
                      <div
                        className={`text-xs tabular-nums ${
                          Math.abs(lb.deviationBps) <= 100
                            ? "text-emerald-400"
                            : Math.abs(lb.deviationBps) <= 300
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        NAV&apos;a göre {lb.deviationBps > 0 ? "+" : ""}
                        {(lb.deviationBps / 100).toFixed(2)}%
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Son fiyat</div>
                      <div className="tabular-nums text-lg">{lb.last != null ? fmtUSD(lb.last) : "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        bid {lb.bid != null ? fmtUSD(lb.bid) : "—"} · ask {lb.ask != null ? fmtUSD(lb.ask) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">24s aralık</div>
                      <div className="tabular-nums">
                        {lb.low24h != null ? fmtUSD(lb.low24h) : "—"} – {lb.high24h != null ? fmtUSD(lb.high24h) : "—"}
                      </div>
                      {lb.change24hPct != null && (
                        <div className={`text-xs mt-1 ${lb.change24hPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {lb.change24hPct > 0 ? "+" : ""}{lb.change24hPct}%
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">24s hacim</div>
                      <div className="tabular-nums">{lb.volume24h != null ? `${lb.volume24h} AUXR` : "—"}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {lb.quoteVolume24h != null ? fmtUSD(lb.quoteVolume24h) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Spread</div>
                      <div className="tabular-nums">
                        {lb.depth?.spreadBps != null ? `${lb.depth.spreadBps.toFixed(1)} bps` : "—"}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        ±2% {fmtUSD(lb.depth?.bidUsdWithin?.["2"] || 0)} / {fmtUSD(lb.depth?.askUsdWithin?.["2"] || 0)}
                      </div>
                    </div>
                  </div>

                  {/* Flow split. Volume is the number everyone quotes and the
                      easiest to manufacture, so it is shown next to what is
                      left once the machine pattern is removed. */}
                  {ops?.flow && ops.flow.trades > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-black/20 border border-white/5">
                      <div className="flex items-baseline justify-between mb-2">
                        <div className="text-xs uppercase tracking-widest text-slate-500">
                          İşlem akışı · son {ops.flow.windowHours != null ? `${ops.flow.windowHours.toFixed(1)} sa` : "—"}
                        </div>
                        <div className="text-xs text-slate-600">{ops.flow.trades} işlem</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Muhtemel MM deseni</div>
                          <div className="tabular-nums text-slate-400">
                            {ops.flow.likelyMm.volume.toFixed(2)} AUXR
                            <span className="text-slate-600 text-xs"> · {ops.flow.likelyMm.trades} işlem</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Artık (gerçek ilgi vekili)</div>
                          <div
                            className={`tabular-nums ${ops.flow.residual.volume > 0 ? "text-emerald-400" : "text-amber-400"}`}
                          >
                            {ops.flow.residual.volume.toFixed(2)} AUXR
                            <span className="text-slate-600 text-xs"> · {ops.flow.residual.trades} işlem</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-500">
                        <div>
                          Boyut tekdüzeliği
                          <div className="tabular-nums text-slate-400">
                            {ops.flow.diagnostics.sizeUniformity != null
                              ? ops.flow.diagnostics.sizeUniformity.toFixed(3)
                              : "—"}
                          </div>
                        </div>
                        <div>
                          İşlem aralığı
                          <div className="tabular-nums text-slate-400">
                            {ops.flow.diagnostics.medianGapSec != null
                              ? `${ops.flow.diagnostics.medianGapSec.toFixed(1)} sn`
                              : "—"}
                          </div>
                        </div>
                        <div>
                          Al/sat dengesizliği
                          <div className="tabular-nums text-slate-400">
                            {ops.flow.diagnostics.buySellImbalance != null
                              ? `${(ops.flow.diagnostics.buySellImbalance * 100).toFixed(1)}%`
                              : "—"}
                          </div>
                        </div>
                        <div>
                          24s zincire çıkan
                          <div className="tabular-nums text-slate-400">
                            {ops.flow.releasedOnChain24h != null
                              ? `${ops.flow.releasedOnChain24h} AUXR`
                              : "—"}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-600 leading-relaxed">
                        Public veride hesap kimliği yok — bu bir desen ayrımı, kimlik tespiti değil.
                        &quot;24s zincire çıkan&quot;, organik satışın üst sınırı: AUXR biz salmadan borsaya ulaşamaz.
                      </div>
                    </div>
                  )}

                  {/* Top of book. Depth bands summarise; the ladder shows whether
                      the quotes are one maker's wall or a real two-sided market. */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="text-slate-500 mb-1">Alış (bid)</div>
                      {(lb.bookTop?.bids ?? []).map((l: any, i: number) => (
                        <div key={i} className="flex justify-between tabular-nums text-emerald-400/80">
                          <span>{fmtUSD(l.price)}</span>
                          <span className="text-slate-500">{l.size}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Satış (ask)</div>
                      {(lb.bookTop?.asks ?? []).map((l: any, i: number) => (
                        <div key={i} className="flex justify-between tabular-nums text-red-400/80">
                          <span>{fmtUSD(l.price)}</span>
                          <span className="text-slate-500">{l.size}</span>
                        </div>
                      ))}
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
                  {snapshot ? fmtGrams(snapshot.reserves.grams[m]) : "—"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  req {snapshot ? fmtGrams(snapshot.required.grams[m]) : "—"}
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

        {/* Withdrawal queue — every withdrawal lands here */}
        <section className="rounded-2xl bg-zinc-900/80 border border-sky-500/30 p-6">
          <h2 className="text-base font-semibold mb-1">
            Withdrawal queue{" "}
            <span className="text-xs font-normal text-sky-400">
              ({requests.length} open)
            </span>
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            Customer AUXR withdrawals, held for Safe co-signature. The balance
            is already debited, so a request left here is a customer waiting.
            Approving does not mint — it clears the request and hands you the
            transaction to sign in the Safe. Rejecting refunds the hold.
          </p>

          {requests.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const tx = reqSafeTx[req.refId];
                const expiresIn =
                  (new Date(req.expiresAt).getTime() - Date.now()) / 3_600_000;
                return (
                  <div
                    key={req.refId}
                    className="rounded-xl bg-zinc-950 border border-white/5 p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                      <span className="font-semibold text-sm text-white">
                        {req.unitsAUXR} AUXR
                      </span>
                      <span className="font-mono text-slate-400">
                        {req.address.slice(0, 10)}… → {req.destination.slice(0, 10)}…
                      </span>
                      <span
                        className={
                          req.state === "awaiting_safe"
                            ? "text-amber-400"
                            : "text-sky-400"
                        }
                      >
                        {req.state}
                      </span>
                      <span className={expiresIn < 12 ? "text-red-400" : "text-slate-500"}>
                        {expiresIn > 0
                          ? `expires in ${Math.round(expiresIn)}h`
                          : "EXPIRED — will be refunded"}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 mb-3 break-all">
                      {req.refId}
                    </div>

                    <div className="flex gap-2">
                      {req.state === "pending_triage" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => decideRequest(req.refId, "approve")}
                            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-semibold px-4 py-1.5 rounded-lg"
                          >
                            Approve
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => decideRequest(req.refId, "reject")}
                            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-red-400 font-semibold px-4 py-1.5 rounded-lg"
                          >
                            Reject &amp; refund
                          </button>
                        </>
                      )}
                      {req.state === "awaiting_safe" && !tx && (
                        <button
                          onClick={() => buildSafeTxFor(req)}
                          className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-1.5 rounded-lg"
                        >
                          Show Safe transaction
                        </button>
                      )}
                    </div>

                    {tx && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                        <p className="text-slate-400">
                          Sign in the Safe{" "}
                          <code className="text-amber-400">{tx.safe.slice(0, 10)}…</code>:
                        </p>
                        <dl className="grid grid-cols-[6rem_1fr] gap-y-1 font-mono break-all">
                          <dt className="text-slate-500">To</dt>
                          <dd>{tx.to}</dd>
                          <dt className="text-slate-500">Function</dt>
                          <dd>{tx.method}</dd>
                          <dt className="text-slate-500">amount</dt>
                          <dd>
                            {tx.amountWei}
                            <span className="text-slate-500"> ({tx.units} AUXR)</span>
                          </dd>
                        </dl>
                        <textarea
                          readOnly
                          value={tx.calldata}
                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                          className="w-full h-16 bg-zinc-900 border border-white/5 rounded-lg p-2 font-mono text-[10px]"
                        />
                        <p className="text-slate-500">
                          Settlement is read from the chain, so the request closes
                          itself once the mint lands — nothing to mark done here.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* On-chain Mint — via the Safe, not from here */}
        <section className="rounded-2xl bg-zinc-900/80 border border-amber-500/30 p-6">
          <h2 className="text-base font-semibold mb-1">
            On-chain Mint{" "}
            <span className="text-xs font-normal text-amber-400">
              (prepares a Safe transaction — this panel cannot mint)
            </span>
          </h2>
          <p className="text-sm text-slate-400 mb-4">
            AUXR is minted by the admin Safe, which holds{" "}
            <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">MINTER_ROLE</code>.
            No key in this application can mint, deliberately: every incident in
            October was an authorisation bug in this process, and a control that
            lives in the same process as the bug cannot be relied on. This form
            builds the exact transaction — paste it into the Safe and sign.
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
            onClick={buildSafeMintTx}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-5 py-2 rounded-lg text-sm"
          >
            Build Safe transaction
          </button>

          {safeTx && (
            <div className="mt-4 rounded-xl bg-zinc-950 border border-amber-500/20 p-4 text-xs space-y-2">
              <p className="text-slate-400">
                In the Safe at{" "}
                <code className="text-amber-400 break-all">{safeTx.safe}</code>, create
                a new transaction with these values. Two of three owners must sign.
              </p>
              <dl className="grid grid-cols-[7rem_1fr] gap-y-1.5 font-mono break-all">
                <dt className="text-slate-500">To</dt>
                <dd>{safeTx.to}</dd>
                <dt className="text-slate-500">Value</dt>
                <dd>{safeTx.value} ETH</dd>
                <dt className="text-slate-500">Function</dt>
                <dd>{safeTx.method}</dd>
                <dt className="text-slate-500">to</dt>
                <dd>{safeTx.destination}</dd>
                <dt className="text-slate-500">amount</dt>
                <dd>
                  {safeTx.amountWei}
                  <span className="text-slate-500"> ({safeTx.units} AUXR)</span>
                </dd>
                <dt className="text-slate-500">refId</dt>
                <dd>{safeTx.refId}</dd>
              </dl>
              <div>
                <p className="text-slate-500 mb-1">
                  Raw calldata — check the amount above before signing:
                </p>
                <textarea
                  readOnly
                  value={safeTx.calldata}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  className="w-full h-20 bg-zinc-900 border border-white/5 rounded-lg p-2 font-mono text-[10px]"
                />
              </div>
              <p className="text-amber-400/80">
                The Safe needs ETH on Base to send this.
              </p>
            </div>
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
