// ============================================================================
// /proof-of-reserves — public Proof-of-Reserves dashboard
// ----------------------------------------------------------------------------
// Reads /api/auxr/reserves + /api/auxr/price every 60s and renders:
//   - Outstanding AUXR supply + market cap
//   - Grams reserved per component vs grams required for current supply
//   - Backing ratio per metal + an overall "fully backed" badge
//   - Surplus / shortfall in grams and USD
//
// Designed to be the URL we cite in compliance docs, regulator submissions,
// and the LBMA audit pack. Static-renderable enough to be archived by
// auditors; live data via fetch on mount + interval.
// ============================================================================

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Reserves = {
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
    ratio: {
      gold: number;
      silver: number;
      platinum: number;
      palladium: number;
      weakest: number;
    };
    fullyBacked: boolean;
    surplusGrams: {
      gold: number;
      silver: number;
      platinum: number;
      palladium: number;
    };
  };
  timestamp: number;
};

type Pricing = {
  success: true;
  navUSD: number;
  buyPriceUSD: number;
  sellPriceUSD: number;
  components: {
    gold: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
    silver: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
    platinum: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
    palladium: { gramsPerUnit: number; spotUSDPerGram: number; valueUSD: number; weightPct: number };
  };
  basket: {
    weights: { gold: number; silver: number; platinum: number; palladium: number };
    gramsPerUnit: { gold: number; silver: number; platinum: number; palladium: number };
    referenceNavUSD: number;
  };
  timestamp: number;
};

const METALS = [
  { key: "gold" as const, label: "Gold", symbol: "Au", color: "#D4AF37" },
  { key: "silver" as const, label: "Silver", symbol: "Ag", color: "#C0C0C0" },
  { key: "platinum" as const, label: "Platinum", symbol: "Pt", color: "#E5E4E2" },
  { key: "palladium" as const, label: "Palladium", symbol: "Pd", color: "#CED0DD" },
];

function fmtGrams(g: number): string {
  if (g >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  return `${g.toFixed(3)} g`;
}
function fmtUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}
function fmtPct(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export default function ProofOfReservesPage() {
  const [reserves, setReserves] = useState<Reserves | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [r, p] = await Promise.all([
          fetch("/api/auxr/reserves").then((res) => res.json()),
          fetch("/api/auxr/price").then((res) => res.json()),
        ]);
        if (cancelled) return;
        if (r?.success) setReserves(r);
        if (p?.success) setPricing(p);
        setLastFetched(Date.now());
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "fetch_failed");
      }
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const fullyBacked = reserves?.backing.fullyBacked ?? false;
  const weakest = reserves?.backing.ratio.weakest ?? 1;

  return (
    // lang="en" forces CSS `text-transform: uppercase` to apply English
    // casing rules. Without this, the global <html lang="tr"> at the root
    // turns lowercase 'i' into Turkish dotted 'İ' (e.g. "CİRCULATİON"),
    // even though our strings are English.
    <div lang="en" className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFA181]/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#BFA181] tracking-widest">AUXITE</span>
        </Link>
        <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
          &larr; Home
        </Link>
      </nav>

      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-slate-500 uppercase tracking-widest">AUXR Basket</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              fullyBacked
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            }`}
          >
            {fullyBacked ? "● Fully Backed" : "● Reconciling"}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Proof of Reserves</h1>
        <p className="text-slate-400 max-w-2xl">
          Auxite&apos;s reserve token (AUXR) is a 55/30/10/5 basket of physically allocated Au, Ag, Pt and
          Pd held under LBMA Good Delivery standards. Every unit in circulation is backed by the
          basket grams listed below — read directly from the live reserve ledger.
        </p>
        {error && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-red-400">
            <span>⚠</span> {error}
          </div>
        )}
      </header>

      {/* Top stats */}
      <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Stat
          label="AUXR in Circulation"
          value={reserves ? reserves.supply.unitsAUXR.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
          sub="units"
        />
        <Stat
          label="Market Cap"
          value={reserves ? fmtUSD(reserves.supply.marketCapUSD) : "—"}
          sub={pricing ? `NAV ${fmtUSD(pricing.navUSD)} / unit` : ""}
        />
        <Stat
          label="Reserves Value"
          value={reserves ? fmtUSD(reserves.reserves.totalValueUSD) : "—"}
          sub="at spot prices"
        />
        <Stat
          label="Weakest Backing"
          value={reserves ? fmtPct(weakest) : "—"}
          sub={fullyBacked ? "≥ 100%" : "needs review"}
          accent={fullyBacked ? "ok" : "warn"}
        />
      </section>

      {/* Per-metal grid */}
      <section className="max-w-6xl mx-auto px-6 mb-10">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Backing Detail</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {METALS.map(({ key, label, symbol, color }) => {
            const ratio = reserves?.backing.ratio[key] ?? 1;
            const reserveG = reserves?.reserves.grams[key] ?? 0;
            const requiredG = reserves?.required.grams[key] ?? 0;
            const surplusG = reserves?.backing.surplusGrams[key] ?? 0;
            const spot = pricing?.components[key].spotUSDPerGram ?? 0;
            const gramsPerUnit = pricing?.basket.gramsPerUnit[key] ?? 0;
            const weight = pricing?.basket.weights[key] ?? 0;

            const ratioOK = ratio >= 0.9999;
            const ratioPct = Math.min(ratio * 100, 200); // cap for sane bar width

            return (
              <div
                key={key}
                className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6"
              >
                <div className="flex items-baseline justify-between mb-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold" style={{ color }}>{symbol}</span>
                    <span className="text-lg font-semibold">{label}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    Target weight: {(weight * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Reserves</div>
                    <div className="font-semibold">{fmtGrams(reserveG)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Required</div>
                    <div className="font-semibold">{fmtGrams(requiredG)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Surplus</div>
                    <div
                      className={`font-semibold ${
                        surplusG >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {surplusG >= 0 ? "+" : ""}
                      {fmtGrams(surplusG)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Per AUXR</div>
                    <div className="font-semibold">{gramsPerUnit.toFixed(5)} g</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Spot</div>
                    <div className="font-semibold">{fmtUSD(spot)} /g</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Backing</div>
                    <div
                      className={`font-semibold ${
                        ratioOK ? "text-emerald-400" : "text-amber-400"
                      }`}
                    >
                      {fmtPct(ratio)}
                    </div>
                  </div>
                </div>

                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full ${ratioOK ? "bg-emerald-500" : "bg-amber-500"}`}
                    style={{ width: `${ratioPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Basket composition table */}
      <section className="max-w-6xl mx-auto px-6 mb-10">
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Basket Composition (Immutable)</h2>
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left py-3 px-5">Metal</th>
                <th className="text-right py-3 px-5">Grams / AUXR</th>
                <th className="text-right py-3 px-5">Spot (live)</th>
                <th className="text-right py-3 px-5">USD value</th>
                <th className="text-right py-3 px-5">Live weight</th>
              </tr>
            </thead>
            <tbody>
              {METALS.map(({ key, label, symbol, color }) => (
                <tr key={key} className="border-t border-white/5">
                  <td className="py-3 px-5">
                    <span className="font-semibold" style={{ color }}>{symbol}</span>
                    <span className="text-slate-400 ml-2">{label}</span>
                  </td>
                  <td className="text-right py-3 px-5 font-mono">
                    {pricing?.basket.gramsPerUnit[key].toFixed(5) ?? "—"}
                  </td>
                  <td className="text-right py-3 px-5 font-mono">
                    {pricing ? fmtUSD(pricing.components[key].spotUSDPerGram) : "—"}
                  </td>
                  <td className="text-right py-3 px-5 font-mono">
                    {pricing ? fmtUSD(pricing.components[key].valueUSD) : "—"}
                  </td>
                  <td className="text-right py-3 px-5">
                    {pricing ? pricing.components[key].weightPct.toFixed(2) + "%" : "—"}
                  </td>
                </tr>
              ))}
              {pricing && (
                <tr className="border-t-2 border-white/10 bg-white/[0.02]">
                  <td className="py-3 px-5 font-semibold">NAV (1 AUXR)</td>
                  <td className="text-right py-3 px-5"></td>
                  <td className="text-right py-3 px-5"></td>
                  <td className="text-right py-3 px-5 font-mono font-bold text-[#BFA181]">
                    {fmtUSD(pricing.navUSD)}
                  </td>
                  <td className="text-right py-3 px-5 font-semibold">100.00%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-slate-500 border-t border-white/5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            Live data via{" "}
            <code className="bg-zinc-800 px-2 py-0.5 rounded text-slate-300">/api/auxr/reserves</code>{" "}
            and{" "}
            <code className="bg-zinc-800 px-2 py-0.5 rounded text-slate-300">/api/auxr/price</code>.
            Updates every 60 seconds.
          </div>
          <div>
            {lastFetched > 0 && (
              <>
                Last refresh:{" "}
                <span className="text-slate-400">
                  {new Date(lastFetched).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
        <p className="mt-4 max-w-3xl">
          Operated by Aurum Ledger Limited (HK). Physical bullion held under LBMA Good Delivery
          custody. This page is updated in real time from the production reserve ledger. For audit
          inquiries: <a className="text-[#BFA181] underline" href="mailto:audit@auxite.io">audit@auxite.io</a>.
        </p>
      </footer>
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
    accent === "ok"
      ? "text-emerald-400"
      : accent === "warn"
      ? "text-amber-400"
      : "text-white";
  return (
    <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-5">
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
