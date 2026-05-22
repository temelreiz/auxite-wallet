// ============================================================================
// /auxr — Web buy/sell UI for the AUXR basket reserve token
// ----------------------------------------------------------------------------
// Mirrors the mobile (tabs)/auxr screen. Reads:
//   GET  /api/auxr/price     — live NAV + buy/sell quotes (30s polling)
//   GET  /api/auxr/reserves  — current backing pool grams
//   GET  /api/user/balance   — user balances per token
//   GET  /api/user/profile   — KYC status
//   POST /api/auxr/buy       — debit AUXM/USDT/USDC, credit AUXR
//   POST /api/auxr/sell      — burn AUXR, credit AUXM
//
// Bilingual EN/TR. Locale-aware uppercase via toLocaleUpperCase so the
// Turkish dotless-i bug never surfaces.
// ============================================================================

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";

// ── Types ────────────────────────────────────────────────────────────────────
type Pricing = {
  navUSD: number;
  buyPriceUSD: number;
  sellPriceUSD: number;
  spread: { buyBps: number; sellBps: number };
  components: Record<"gold" | "silver" | "platinum" | "palladium", {
    gramsPerUnit: number;
    spotUSDPerGram: number;
    valueUSD: number;
    weightPct: number;
  }>;
  basket: {
    weights: { gold: number; silver: number; platinum: number; palladium: number };
    gramsPerUnit: { gold: number; silver: number; platinum: number; palladium: number };
    referenceNavUSD: number;
  };
  constraints: { minPurchaseUSD: number };
};

type Reserves = {
  supply: { unitsAUXR: number; marketCapUSD: number };
  reserves: { grams: { gold: number; silver: number; platinum: number; palladium: number } };
  required: { grams: { gold: number; silver: number; platinum: number; palladium: number } };
  backing: {
    ratio: { gold: number; silver: number; platinum: number; palladium: number; weakest: number };
    fullyBacked: boolean;
  };
};

// ── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  en: {
    title: "AUXR — Reserve Basket",
    subtitle: "55% gold · 30% silver · 10% platinum · 5% palladium · physically allocated",
    live: "LIVE",
    nav: "NAV per AUXR",
    bid: "Sell",
    ask: "Buy",
    mode_buy: "Buy",
    mode_sell: "Sell",
    amountUSD: "Amount (USD)",
    amountAUXR: "Amount (AUXR)",
    payWith: "Pay with",
    available: "Available",
    receive: "You receive",
    proceedsLabel: "You receive",
    buyCTA: "Buy AUXR",
    sellCTA: "Sell AUXR",
    useMax: "Max",
    minIs: "Minimum",
    insufficient: "Insufficient balance",
    kycRequired: "Identity verification required",
    kycDesc: "AUXR represents real allocated metal. Complete a 2-minute KYC to trade.",
    verifyNow: "Verify Identity",
    backingPool: "Backing Pool",
    backingSub: (n: string) => `Physical bullion held for ${n} AUXR in circulation. Backed 1:1.`,
    fullyBacked: "FULLY BACKED",
    required: "Required",
    backed: "backed",
    emptyPool: "Reserves grow as users mint AUXR. We physically procure bullion to back each mint at 1:1.",
    composition: "Basket Composition",
    compositionSub: "Fixed grams per unit. Weights drift naturally with spot prices.",
    th_metal: "Metal",
    th_gpu: "Grams / AUXR",
    th_spot: "Spot",
    th_weight: "Weight",
    viewPoR: "View Proof of Reserves →",
    disclosure: "AUXR is an off-chain reserve token backed by physical bullion in LBMA-compliant custody. Spread is 50 bps each side (1% round-trip). Phase 1A — internal beta. Not yet redeemable for physical bullion.",
    success_buy: "Purchase complete",
    success_sell: "Sale complete",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Done",
    connect_prompt: "Connect your account to trade AUXR.",
    demo_prompt: "Switch to a live account to trade AUXR.",
    metals: { gold: "Gold", silver: "Silver", platinum: "Platinum", palladium: "Palladium" },
  },
  tr: {
    title: "AUXR — Rezerv Sepeti",
    subtitle: "%55 altın · %30 gümüş · %10 platin · %5 paladyum · fiziksel tahsis",
    live: "CANLI",
    nav: "AUXR Başına NAV",
    bid: "Sat",
    ask: "Al",
    mode_buy: "Al",
    mode_sell: "Sat",
    amountUSD: "Tutar (USD)",
    amountAUXR: "Miktar (AUXR)",
    payWith: "Ödeme aracı",
    available: "Kullanılabilir",
    receive: "Alacağınız",
    proceedsLabel: "Alacağınız",
    buyCTA: "AUXR Al",
    sellCTA: "AUXR Sat",
    useMax: "Tümü",
    minIs: "Minimum",
    insufficient: "Yetersiz bakiye",
    kycRequired: "Kimlik doğrulaması gerekli",
    kycDesc: "AUXR gerçek tahsisli metali temsil eder. İşlem için 2 dakikalık KYC tamamlayın.",
    verifyNow: "Kimlik Doğrula",
    backingPool: "Rezerv Havuzu",
    backingSub: (n: string) => `Dolaşımdaki ${n} AUXR için tutulan fiziksel külçe. 1:1 desteklenir.`,
    fullyBacked: "TAM DESTEKLİ",
    required: "Gerekli",
    backed: "destekli",
    emptyPool: "Kullanıcılar AUXR mint ettikçe rezervler büyür. Her mint için 1:1 fiziksel külçe satın alırız.",
    composition: "Sepet Bileşimi",
    compositionSub: "Birim başına sabit gram. Ağırlıklar spot fiyatlarla doğal olarak değişir.",
    th_metal: "Metal",
    th_gpu: "Gram / AUXR",
    th_spot: "Spot",
    th_weight: "Ağırlık",
    viewPoR: "Rezerv Kanıtını Gör →",
    disclosure: "AUXR, LBMA uyumlu saklamada fiziksel külçe ile desteklenen off-chain bir rezerv tokendir. Spread her yönde 50 bps (toplam %1). Phase 1A — iç beta. Henüz fiziksel teslim alınamaz.",
    success_buy: "Alım tamamlandı",
    success_sell: "Satış tamamlandı",
    boughtSummary: (units: string, usd: string) => `${usd} → ${units} AUXR`,
    soldSummary: (units: string, usd: string) => `${units} AUXR → ${usd}`,
    done: "Tamam",
    connect_prompt: "AUXR alıp satmak için hesabınızı bağlayın.",
    demo_prompt: "AUXR alıp satmak için canlı hesaba geçin.",
    metals: { gold: "Altın", silver: "Gümüş", platinum: "Platin", palladium: "Paladyum" },
  },
} as const;

const BUY_PRESETS = [30, 100, 250, 500];
const METAL_KEYS = ["gold", "silver", "platinum", "palladium"] as const;
const SYMBOLS = { gold: "Au", silver: "Ag", platinum: "Pt", palladium: "Pd" };
const COLORS = { gold: "#D4AF37", silver: "#C0C0C0", platinum: "#E5E4E2", palladium: "#CED0DD" };

function fmtUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}
function fmtGrams(g: number) {
  if (Math.abs(g) >= 1000) return `${(g / 1000).toFixed(3)} kg`;
  if (g === 0) return "0 g";
  if (Math.abs(g) < 0.01) return `${g.toFixed(5)} g`;
  return `${g.toFixed(4)} g`;
}

export default function AuxrPage() {
  const { lang } = useLanguage();
  const t = T[(lang === "tr" ? "tr" : "en") as "en" | "tr"];
  const upper = useCallback(
    (s: string) => {
      try { return s.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US"); }
      catch { return s.toUpperCase(); }
    },
    [lang]
  );
  const { isDemoMode } = useWallet();

  // Wallet address from localStorage (matches /allocate pattern).
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const a = typeof window === "undefined" ? null : localStorage.getItem("auxite_wallet_address");
    if (a) setAddress(a);
  }, []);

  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [reserves, setReserves] = useState<Reserves | null>(null);
  const [balances, setBalances] = useState({ auxm: 0, bonus: 0, usdt: 0, usdc: 0, auxr: 0 });
  const [kycVerified, setKycVerified] = useState(false);

  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("100");
  const [sellUnits, setSellUnits] = useState("");
  const [paymentToken, setPaymentToken] = useState<"auxm" | "usdt" | "usdc">("auxm");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<null | { mode: "buy" | "sell"; units: number; usd: number }>(null);

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadPricing = useCallback(async () => {
    try {
      const r = await fetch("/api/auxr/price", { cache: "no-store" });
      const j = await r.json();
      if (j?.success) setPricing(j);
    } catch {}
  }, []);
  const loadReserves = useCallback(async () => {
    try {
      const r = await fetch("/api/auxr/reserves", { cache: "no-store" });
      const j = await r.json();
      if (j?.success) setReserves(j);
    } catch {}
  }, []);
  const loadUser = useCallback(async () => {
    if (!address) return;
    try {
      const [balR, profR] = await Promise.all([
        fetch(`/api/user/balance?address=${address}`, { cache: "no-store" }),
        fetch(`/api/user/profile?address=${address}`, { cache: "no-store" }),
      ]);
      const balJ = await balR.json();
      const profJ = await profR.json();
      const b = balJ?.balances || {};
      setBalances({
        auxm: parseFloat(String(b.auxm || 0)) || 0,
        bonus: parseFloat(String(b.bonusAuxm || 0)) || 0,
        usdt: parseFloat(String(b.usdt || 0)) || 0,
        usdc: parseFloat(String(b.usdc || 0)) || 0,
        auxr: parseFloat(String(b.auxr || 0)) || 0,
      });
      const k = profJ?.profile?.kycStatus || profJ?.profile?.kycLevel || "none";
      setKycVerified(k === "approved" || k === "verified" || k === "enhanced");
    } catch {}
  }, [address]);

  useEffect(() => {
    loadPricing();
    loadReserves();
    loadUser();
    const interval = setInterval(() => { loadPricing(); loadReserves(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadPricing, loadReserves, loadUser]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const buyAmountNum = parseFloat(buyAmount) || 0;
  const sellUnitsNum = parseFloat(sellUnits) || 0;
  const minUSD = pricing?.constraints.minPurchaseUSD ?? 100;
  const totalAuxm = balances.auxm + balances.bonus;
  const railBalance =
    paymentToken === "auxm" ? totalAuxm
    : paymentToken === "usdt" ? balances.usdt
    : balances.usdc;
  const railLabel = paymentToken === "auxm" ? "AUXM" : paymentToken === "usdt" ? "USDT" : "USDC";
  const expectedUnits = pricing && pricing.buyPriceUSD > 0 ? buyAmountNum / pricing.buyPriceUSD : 0;
  const expectedProceeds = pricing ? sellUnitsNum * pricing.sellPriceUSD : 0;
  const canBuy = !!pricing && !!address && !isDemoMode && kycVerified && buyAmountNum >= minUSD && buyAmountNum <= railBalance;
  const canSell = !!pricing && !!address && !isDemoMode && kycVerified && sellUnitsNum > 0 && sellUnitsNum <= balances.auxr;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submitBuy = async () => {
    if (!canBuy || submitting) return;
    setSubmitting(true); setErr(null);
    const refId = `web-buy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const r = await fetch("/api/auxr/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, usdAmount: buyAmountNum, paymentToken, source: "web", refId }),
      });
      const j = await r.json();
      if (j?.success) {
        setOk({ mode: "buy", units: j.unitsAUXR, usd: buyAmountNum });
        loadUser();
        loadReserves();
      } else {
        setErr(j?.error || "buy_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "buy_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitSell = async () => {
    if (!canSell || submitting) return;
    setSubmitting(true); setErr(null);
    const refId = `web-sell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      const r = await fetch("/api/auxr/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, unitsAUXR: sellUnitsNum, source: "web", refId }),
      });
      const j = await r.json();
      if (j?.success) {
        setOk({ mode: "sell", units: sellUnitsNum, usd: j.proceedsUSD });
        loadUser();
        loadReserves();
      } else {
        setErr(j?.error || "sell_failed");
      }
    } catch (e: any) {
      setErr(e?.message || "sell_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fullyBacked = reserves?.backing.fullyBacked ?? false;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t.title}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-[#BFA181]/20 text-[#BFA181] font-semibold tracking-wider">
                BETA
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-1">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
            {upper(t.live)}
          </div>
        </header>

        {/* NAV card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          <div className="text-xs text-slate-500 tracking-wider mb-1">{upper(t.nav)}</div>
          <div className="text-4xl font-bold text-[#BFA181]">
            {pricing ? `$${pricing.navUSD.toFixed(4)}` : "—"}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 max-w-md">
            <div>
              <div className="text-[10px] text-slate-500 tracking-wider">{upper(t.bid)}</div>
              <div className="text-sm font-semibold">{pricing ? `$${pricing.sellPriceUSD.toFixed(4)}` : "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-slate-500 tracking-wider">{upper(t.ask)}</div>
              <div className="text-sm font-semibold">{pricing ? `$${pricing.buyPriceUSD.toFixed(4)}` : "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/5 text-center">
            {METAL_KEYS.map((m) => (
              <div key={m}>
                <div className="text-[10px] text-slate-500">{SYMBOLS[m]}</div>
                <div className="text-sm font-semibold" style={{ color: COLORS[m] }}>
                  {pricing?.components[m].weightPct.toFixed(1) ?? "—"}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trade card */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {(["buy", "sell"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); setErr(null); setOk(null); }}
                  className={`py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#BFA181] text-zinc-950"
                      : "bg-transparent text-slate-300 border border-white/5 hover:border-white/15"
                  }`}
                >
                  {m === "buy" ? t.mode_buy : t.mode_sell}
                </button>
              );
            })}
          </div>

          {/* Gates */}
          {!address ? (
            <div className="text-center py-8 text-slate-400">{t.connect_prompt}</div>
          ) : isDemoMode ? (
            <div className="text-center py-8 text-slate-400">{t.demo_prompt}</div>
          ) : !kycVerified ? (
            <div className="text-center py-8">
              <div className="text-slate-300 font-semibold mb-1">{t.kycRequired}</div>
              <div className="text-sm text-slate-500 mb-4 max-w-md mx-auto">{t.kycDesc}</div>
              <Link href="/kyc" className="inline-block px-5 py-2 rounded-lg bg-[#BFA181] text-zinc-950 font-semibold text-sm hover:bg-[#D4B47A]">
                {t.verifyNow}
              </Link>
            </div>
          ) : ok ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                <svg className="w-8 h-8 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-emerald-400 font-semibold text-lg">
                {ok.mode === "buy" ? t.success_buy : t.success_sell}
              </div>
              <div className="text-sm text-slate-400 mt-1">
                {ok.mode === "buy"
                  ? t.boughtSummary(ok.units.toFixed(6), fmtUSD(ok.usd))
                  : t.soldSummary(ok.units.toFixed(6), fmtUSD(ok.usd))}
              </div>
              <button
                onClick={() => { setOk(null); setBuyAmount("100"); setSellUnits(""); }}
                className="mt-5 px-5 py-2 rounded-lg bg-[#BFA181] text-zinc-950 font-semibold text-sm"
              >
                {t.done}
              </button>
            </div>
          ) : mode === "buy" ? (
            <>
              <label className="text-xs text-slate-500 tracking-wider">{upper(t.amountUSD)}</label>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl text-slate-500 font-light">$</span>
                <input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => { setBuyAmount(e.target.value); setErr(null); }}
                  className="bg-transparent text-3xl font-bold flex-1 outline-none min-w-0"
                  placeholder="0"
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ≈ {expectedUnits.toFixed(6)} AUXR · {pricing?.spread.buyBps ?? 50}bps spread
              </div>

              {/* Amount presets */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {BUY_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBuyAmount(String(p))}
                    className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                      buyAmountNum === p
                        ? "bg-[#BFA181]/20 border-[#BFA181] text-white"
                        : "bg-transparent border-white/5 text-slate-300 hover:border-white/15"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>

              {/* Rail picker */}
              <div className="mt-5">
                <label className="text-xs text-slate-500 tracking-wider">{upper(t.payWith)}</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {([
                    { key: "auxm" as const, label: "AUXM", bal: totalAuxm },
                    { key: "usdt" as const, label: "USDT", bal: balances.usdt },
                    { key: "usdc" as const, label: "USDC", bal: balances.usdc },
                  ]).map((r) => {
                    const active = paymentToken === r.key;
                    const aff = r.bal >= buyAmountNum && r.bal > 0;
                    return (
                      <button
                        key={r.key}
                        onClick={() => { setPaymentToken(r.key); setErr(null); }}
                        className={`py-2 px-2 rounded-lg border transition-colors ${
                          active
                            ? "bg-[#BFA181]/20 border-[#BFA181]"
                            : "bg-transparent border-white/5 hover:border-white/15"
                        } ${r.bal > 0 ? "opacity-100" : "opacity-40"}`}
                      >
                        <div className="text-sm font-semibold">{r.label}</div>
                        <div className={`text-[10px] ${aff ? "text-slate-500" : "text-amber-400"}`}>
                          ${r.bal.toFixed(2)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Available row */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5 text-sm">
                <span className="text-slate-500">{upper(t.available)}</span>
                <span className="font-semibold">${railBalance.toFixed(2)} {railLabel}</span>
              </div>

              {err && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-300">
                  {err}
                </div>
              )}
              {buyAmountNum > railBalance && (
                <div className="mt-2 text-xs text-amber-400 text-center">{t.insufficient} ({railLabel})</div>
              )}
              {buyAmountNum > 0 && buyAmountNum < minUSD && (
                <div className="mt-2 text-xs text-amber-400 text-center">{t.minIs} ${minUSD}</div>
              )}

              <button
                disabled={!canBuy || submitting}
                onClick={submitBuy}
                className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  canBuy && !submitting
                    ? "bg-[#BFA181] text-zinc-950 hover:bg-[#D4B47A]"
                    : "bg-zinc-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "..." : `${t.buyCTA} $${buyAmountNum.toFixed(0)}`}
              </button>
            </>
          ) : (
            <>
              <label className="text-xs text-slate-500 tracking-wider">{upper(t.amountAUXR)}</label>
              <div className="flex items-baseline gap-2 mt-1">
                <input
                  type="number"
                  value={sellUnits}
                  onChange={(e) => { setSellUnits(e.target.value); setErr(null); }}
                  className="bg-transparent text-3xl font-bold flex-1 outline-none min-w-0"
                  placeholder="0"
                />
                <span className="text-base text-slate-500 font-semibold">AUXR</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ≈ {fmtUSD(expectedProceeds)} AUXM
              </div>
              <button
                onClick={() => setSellUnits(String(balances.auxr))}
                className="mt-3 text-xs text-[#BFA181] font-semibold hover:underline"
              >
                {t.useMax}: {balances.auxr.toFixed(6)} AUXR
              </button>

              {err && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-sm text-red-300">
                  {err}
                </div>
              )}

              <button
                disabled={!canSell || submitting}
                onClick={submitSell}
                className={`w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-colors ${
                  canSell && !submitting
                    ? "bg-[#BFA181] text-zinc-950 hover:bg-[#D4B47A]"
                    : "bg-zinc-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {submitting ? "..." : t.sellCTA}
              </button>
            </>
          )}
        </div>

        {/* Backing Pool */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold">{t.backingPool}</h2>
            {fullyBacked && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold tracking-wider">
                ● {upper(t.fullyBacked)}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mb-4">
            {t.backingSub((reserves?.supply.unitsAUXR ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 }))}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {METAL_KEYS.map((m) => {
              const ratio = reserves?.backing.ratio[m] ?? 1;
              const reserveG = reserves?.reserves.grams[m] ?? 0;
              const requiredG = reserves?.required.grams[m] ?? 0;
              const ok = ratio >= 0.9999;
              return (
                <div key={m} className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
                  <div>
                    <span className="font-semibold" style={{ color: COLORS[m] }}>{SYMBOLS[m]}</span>
                    <span className="ml-2 text-slate-300">{t.metals[m]}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t.required}: {fmtGrams(requiredG)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${ok ? "text-emerald-400" : "text-amber-400"}`}>
                      {fmtGrams(reserveG)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(ratio * 100).toFixed(2)}% {t.backed}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {reserves && reserves.supply.unitsAUXR === 0 && (
            <p className="text-xs text-slate-500 mt-3 italic">{t.emptyPool}</p>
          )}
          <Link
            href="/proof-of-reserves"
            className="inline-block mt-4 text-xs text-[#BFA181] font-semibold hover:underline"
          >
            {t.viewPoR}
          </Link>
        </div>

        {/* Composition table */}
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 overflow-hidden">
          <div className="p-6 pb-3">
            <h2 className="text-base font-semibold">{t.composition}</h2>
            <p className="text-sm text-slate-400 mt-1">{t.compositionSub}</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-500 text-xs tracking-wider">
              <tr>
                <th className="text-left py-3 px-6">{upper(t.th_metal)}</th>
                <th className="text-right py-3 px-6">{upper(t.th_gpu)}</th>
                <th className="text-right py-3 px-6">{upper(t.th_spot)}</th>
                <th className="text-right py-3 px-6">{upper(t.th_weight)}</th>
              </tr>
            </thead>
            <tbody>
              {METAL_KEYS.map((m) => (
                <tr key={m} className="border-t border-white/5">
                  <td className="py-3 px-6">
                    <span className="font-semibold" style={{ color: COLORS[m] }}>{SYMBOLS[m]}</span>
                    <span className="ml-2 text-slate-400">{t.metals[m]}</span>
                  </td>
                  <td className="text-right py-3 px-6 font-mono text-slate-300">
                    {pricing?.basket.gramsPerUnit[m].toFixed(5) ?? "—"}
                  </td>
                  <td className="text-right py-3 px-6 font-mono text-slate-300">
                    {pricing ? fmtUSD(pricing.components[m].spotUSDPerGram) : "—"}
                  </td>
                  <td className="text-right py-3 px-6 font-semibold">
                    {pricing ? pricing.components[m].weightPct.toFixed(2) + "%" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed max-w-3xl">
          {t.disclosure}
        </p>
      </main>
    </div>
  );
}
