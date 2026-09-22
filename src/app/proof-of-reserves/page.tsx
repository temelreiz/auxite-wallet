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
// and the reserve audit pack. Static-renderable enough to be archived by
// auditors; live data via fetch on mount + interval.
// ============================================================================

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/LanguageContext";

// ── Contract generations ────────────────────────────────────────────────────
// Every Base deployment of the metal tokens, canonical set first. Supply is
// deliberately NOT hardcoded here — /api/supply reads it live from the
// canonical contracts, and a second hardcoded figure is exactly the kind of
// contradiction this section exists to remove.
const BASESCAN = "https://basescan.org/token/";

const CONTRACT_GENERATIONS: {
  genKey: "gen_canonical" | "gen_mirror" | "gen_v8" | "gen_v6v8";
  statusKey: "status_canonical" | "status_superseded" | "status_nocontract";
  deployed: string;
  rows: { label: string; address: string | null }[];
}[] = [
  {
    genKey: "gen_canonical",
    statusKey: "status_canonical",
    deployed: "2026-06-09",
    rows: [
      { label: "AUXG", address: "0xCef9D7593E8Ba796eE05C54B8983B7749bB1218a" },
      { label: "AUXS", address: "0xB0aC63aeD12b5A0Ee710618D99444bf126068c1a" },
      { label: "AUXPT", address: "0x39F314fb20668997A2ADDaB1eA9236e0072D5E2D" },
      { label: "AUXPD", address: "0x6e4837fCf158D15ABFdf90b3954D041D452BE832" },
    ],
  },
  {
    genKey: "gen_mirror",
    statusKey: "status_superseded",
    deployed: "2026-06-09",
    rows: [
      { label: "AUXG-M", address: "0x24acdf6dbc53e4e257d1812077e7ba1960b02019" },
      { label: "AUXS-M", address: "0xb03471ba1616c8c1f772afcfc05966bbd298014e" },
      { label: "AUXPT-M", address: "0xe5640dcbcb1de6316f9baa8654cfd0e51f3bdd19" },
      { label: "AUXPD-M", address: "0x1c99a4979d34871d1c4fff0761a2863ec8610cf2" },
    ],
  },
  {
    genKey: "gen_v8",
    statusKey: "status_superseded",
    deployed: "2026-02-02",
    rows: [
      { label: "AUXG", address: "0x390164702040B509A3D752243F92C2Ac0318989D" },
      { label: "AUXS", address: "0x82F6EB8Ba5C84c8Fd395b25a7A40ade08F0868aa" },
      { label: "AUXPT", address: "0x119de594170b68561b1761ae1246C5154F94705d" },
      { label: "AUXPD", address: "0xe051B2603617277Ab50C509F5A38C16056C1C908" },
    ],
  },
  {
    genKey: "gen_v6v8",
    statusKey: "status_nocontract",
    deployed: "—",
    rows: [
      { label: "AUXG", address: "0x28e0938457c5bf02Fe35208b7b1098af7Ec20d91" },
      { label: "AUXS", address: "0x21583fa6D61Ecbad51C092c4A433511255D29A4E" },
      { label: "AUXPT", address: "0x0023aBB9822AC52012542278e6E862EF4Ea12616" },
      { label: "AUXPD", address: "0x3d2F416A30BAcd28D93ACCc1Ee1DB69C27ff9223" },
    ],
  },
];

// ── i18n ────────────────────────────────────────────────────────────────────
// Page-level translations. Kept inline since this is a single-page document.
// Lang-aware upper() helper avoids the Turkish dotless-i CSS bug entirely
// because casing happens in JS with an explicit locale (no CSS transform).
const T = {
  en: {
    nav_home: "Home",
    section_basket: "AUXR BASKET",
    backed_pill: "Fully Backed",
    reconciling_pill: "Reconciling",
    title: "Proof of Reserves",
    intro: "Auxite's reserve token (AUXR) is a 55/30/10/5 basket of Au, Ag, Pt and Pd. The basket grams below are read directly from Auxite's own reserve ledger. These figures are self-reported: no independent auditor, custodian or insurer has verified them, and no attestation report has been published to date.",
    stat_circulation: "AUXR in Circulation",
    stat_units: "units",
    stat_marketcap: "Market Cap",
    stat_navsub: (nav: string) => `NAV ${nav} / unit`,
    stat_reserves: "Reserves Value",
    stat_atspot: "at spot prices",
    stat_weakest: "Weakest Backing",
    stat_okrange: "≥ 100%",
    stat_warn: "needs review",
    section_backing: "Backing Detail",
    target_weight: (pct: string) => `Target weight: ${pct}%`,
    reserves: "Reserves",
    required: "Required",
    surplus: "Surplus",
    per_auxr: "Per AUXR",
    spot: "Spot",
    backing: "Backing",
    section_composition: "Basket Composition (Immutable)",
    section_contracts: "Token Contracts",
    contracts_intro: "Auxite metal tokens have been deployed three times on Base. The canonical set below, deployed 9 June 2026, is the reference supply: it is what /api/supply, rwa.xyz and any external data consumer should read. Earlier generations were not burned and still carry residual balances, so more than one contract on Base answers to the symbol AUXG. Only the canonical address is authoritative; the superseded addresses are listed here so that no one has to guess which is which.",
    contracts_why: "Why the migration: the February 2026 (V8) contracts minted only against on-chain USDC purchases, so their totalSupply reflected a fraction of platform holdings rather than the whole. An interim mirror set (symbols AUXG-M etc.) was added as a reporting layer, then replaced on 9 June 2026 by the canonical AuxiteMetal contracts, which mint per investor so the chain itself records ownership.",
    th_contract: "Contract",
    th_status: "Status",
    th_deployed: "Deployed",
    status_canonical: "Canonical — live",
    status_superseded: "Superseded — residual balances only",
    status_nocontract: "No contract at this address on Base",
    gen_canonical: "Canonical (AuxiteMetal)",
    gen_mirror: "Interim mirror",
    gen_v8: "V8",
    gen_v6v8: "V5 / V6 (pre-Base)",
    contracts_supply_note: "Live supply figures are served by /api/supply and are read from these canonical contracts.",
    th_metal: "Metal",
    th_grams: "Grams / AUXR",
    th_spot: "Spot (live)",
    th_usd: "USD value",
    th_weight: "Live weight",
    nav_row: "NAV (1 AUXR)",
    footer: 'Operated by Aurum Ledger Limited, Hong Kong (Company Reg. No. 79809097). Reserve figures above are read in real time from Auxite\'s own production reserve ledger and auto-refresh every 60 seconds; they are self-reported and unaudited. No custodian, insurer or auditor has been appointed to date. For audit inquiries: ',
    last_refresh: "Last refresh:",
    metal_gold: "Gold",
    metal_silver: "Silver",
    metal_platinum: "Platinum",
    metal_palladium: "Palladium",
  },
  tr: {
    nav_home: "Ana Sayfa",
    section_basket: "AUXR SEPETİ",
    backed_pill: "Tamamen Destekli",
    reconciling_pill: "Uzlaştırılıyor",
    title: "Rezerv Kanıtı",
    intro: "Auxite'ın rezerv tokeni (AUXR), Au, Ag, Pt ve Pd metallerinden oluşan %55/30/10/5 oranlı bir sepettir. Aşağıdaki sepet gramları doğrudan Auxite'ın kendi rezerv defterinden okunmaktadır. Bu rakamlar şirket beyanıdır: bağımsız bir denetçi, saklamacı veya sigortacı tarafından doğrulanmamıştır ve bugüne kadar yayınlanmış bir attestation raporu yoktur.",
    stat_circulation: "Dolaşımdaki AUXR",
    stat_units: "birim",
    stat_marketcap: "Piyasa Değeri",
    stat_navsub: (nav: string) => `NAV ${nav} / birim`,
    stat_reserves: "Rezerv Değeri",
    stat_atspot: "spot fiyatlarda",
    stat_weakest: "En Zayıf Karşılık",
    stat_okrange: "≥ %100",
    stat_warn: "inceleme gerekli",
    section_backing: "Karşılık Detayı",
    target_weight: (pct: string) => `Hedef ağırlık: %${pct}`,
    reserves: "Rezerv",
    required: "Gerekli",
    surplus: "Fazla",
    per_auxr: "AUXR Başına",
    spot: "Spot",
    backing: "Karşılık",
    section_composition: "Sepet Bileşimi (Değişmez)",
    section_contracts: "Token Kontratları",
    contracts_intro: "Auxite metal tokenları Base üzerinde üç kez deploy edildi. Aşağıdaki kanonik set (9 Haziran 2026) referans arzdır: /api/supply, rwa.xyz ve tüm dış veri tüketicileri bunu okumalıdır. Önceki nesiller yakılmadı ve hâlâ artık bakiye taşıyor; yani Base üzerinde AUXG sembolüne cevap veren birden fazla kontrat var. Yalnızca kanonik adres bağlayıcıdır; hangisinin hangisi olduğu tahmine kalmasın diye devre dışı adresler de burada listelenmiştir.",
    contracts_why: "Geçişin nedeni: Şubat 2026 (V8) kontratları yalnızca on-chain USDC alımları karşılığında mint ediyordu, dolayısıyla totalSupply platform varlıklarının tamamını değil bir dilimini gösteriyordu. Ara çözüm olarak bir mirror set (AUXG-M vb. sembollü) raporlama katmanı eklendi; 9 Haziran 2026'da bunun yerini, sahipliği zincirin kendisine kaydetmek üzere yatırımcı bazında mint eden kanonik AuxiteMetal kontratları aldı.",
    th_contract: "Kontrat",
    th_status: "Durum",
    th_deployed: "Deploy",
    status_canonical: "Kanonik — canlı",
    status_superseded: "Devre dışı — yalnızca artık bakiye",
    status_nocontract: "Base üzerinde bu adreste kontrat yok",
    gen_canonical: "Kanonik (AuxiteMetal)",
    gen_mirror: "Ara mirror",
    gen_v8: "V8",
    gen_v6v8: "V5 / V6 (Base öncesi)",
    contracts_supply_note: "Canlı arz rakamları /api/supply tarafından, bu kanonik kontratlardan okunarak sunulur.",
    th_metal: "Metal",
    th_grams: "Gram / AUXR",
    th_spot: "Spot (canlı)",
    th_usd: "USD değeri",
    th_weight: "Canlı ağırlık",
    nav_row: "NAV (1 AUXR)",
    footer: "Aurum Ledger Limited, Hong Kong (Şirket Kayıt No. 79809097) tarafından işletilmektedir. Yukarıdaki rezerv rakamları Auxite'ın kendi üretim rezerv defterinden gerçek zamanlı okunur ve her 60 saniyede bir yenilenir; şirket beyanıdır ve denetlenmemiştir. Bugüne kadar atanmış bir saklamacı, sigortacı veya denetçi bulunmamaktadır. Denetim sorgulamaları için: ",
    last_refresh: "Son yenileme:",
    metal_gold: "Altın",
    metal_silver: "Gümüş",
    metal_platinum: "Platin",
    metal_palladium: "Paladyum",
  },
} as const;

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
  const { lang } = useLanguage();
  const t = T[(lang === "tr" ? "tr" : "en") as "en" | "tr"];
  // Locale-aware uppercase. Replaces CSS text-transform: uppercase which
  // inherited the global <html lang="tr"> and produced "İ" instead of "I"
  // on English labels. JS toLocaleUpperCase with explicit locale is
  // bulletproof — TR users see proper dotted İ where Turkish words call
  // for it, EN users see clean I.
  const upper = (s: string) => {
    try { return s.toLocaleUpperCase(lang === "tr" ? "tr-TR" : "en-US"); }
    catch { return s.toUpperCase(); }
  };

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
          &larr; {t.nav_home}
        </Link>
      </nav>

      {/* Header */}
      <header className="max-w-6xl mx-auto px-6 pt-8 pb-12">
        <div className="flex items-center gap-3 mb-3">
          {/* Casing is done in JS via upper() (toLocaleUpperCase with explicit
              locale), not CSS text-transform: uppercase. CSS inherited the
              global <html lang="tr"> and produced "İ" instead of "I" on
              English labels. JS-based casing with explicit locale is
              bulletproof — TR users see dotted İ where Turkish words need
              it, EN users see clean I. */}
          <span className="text-xs text-slate-500 tracking-widest">{upper(t.section_basket)}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              fullyBacked
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-amber-500/15 text-amber-400"
            }`}
          >
            {fullyBacked ? `● ${t.backed_pill}` : `● ${t.reconciling_pill}`}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">{t.title}</h1>
        <p className="text-slate-400 max-w-2xl">{t.intro}</p>
        {error && (
          <div className="mt-4 inline-flex items-center gap-2 text-sm text-red-400">
            <span>⚠</span> {error}
          </div>
        )}
      </header>

      {/* Top stats */}
      <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Stat
          label={upper(t.stat_circulation)}
          value={reserves ? reserves.supply.unitsAUXR.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "—"}
          sub={t.stat_units}
        />
        <Stat
          label={upper(t.stat_marketcap)}
          value={reserves ? fmtUSD(reserves.supply.marketCapUSD) : "—"}
          sub={pricing ? t.stat_navsub(fmtUSD(pricing.navUSD)) : ""}
        />
        <Stat
          label={upper(t.stat_reserves)}
          value={reserves ? fmtUSD(reserves.reserves.totalValueUSD) : "—"}
          sub={t.stat_atspot}
        />
        <Stat
          label={upper(t.stat_weakest)}
          value={reserves ? fmtPct(weakest) : "—"}
          sub={fullyBacked ? t.stat_okrange : t.stat_warn}
          accent={fullyBacked ? "ok" : "warn"}
        />
      </section>

      {/* Per-metal grid */}
      <section className="max-w-6xl mx-auto px-6 mb-10">
        <h2 className="text-xs tracking-widest text-slate-500 mb-3">{upper(t.section_backing)}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {METALS.map(({ key, symbol, color }) => {
            const ratio = reserves?.backing.ratio[key] ?? 1;
            const reserveG = reserves?.reserves.grams[key] ?? 0;
            const requiredG = reserves?.required.grams[key] ?? 0;
            const surplusG = reserves?.backing.surplusGrams[key] ?? 0;
            const spot = pricing?.components[key].spotUSDPerGram ?? 0;
            const gramsPerUnit = pricing?.basket.gramsPerUnit[key] ?? 0;
            const weight = pricing?.basket.weights[key] ?? 0;
            const metalLabel = t[`metal_${key}` as `metal_${typeof key}`];

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
                    <span className="text-lg font-semibold">{metalLabel}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {t.target_weight((weight * 100).toFixed(1))}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                  <div>
                    <div className="text-slate-500 text-xs mb-1">{t.reserves}</div>
                    <div className="font-semibold">{fmtGrams(reserveG)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">{t.required}</div>
                    <div className="font-semibold">{fmtGrams(requiredG)}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">{t.surplus}</div>
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
                    <div className="text-slate-500 text-xs mb-1">{t.per_auxr}</div>
                    <div className="font-semibold">{gramsPerUnit.toFixed(5)} g</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">{t.spot}</div>
                    <div className="font-semibold">{fmtUSD(spot)} /g</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">{t.backing}</div>
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
        <h2 className="text-xs tracking-widest text-slate-500 mb-3">{upper(t.section_composition)}</h2>
        <div className="rounded-2xl bg-zinc-900/80 border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-500 text-xs tracking-wider">
              <tr>
                <th className="text-left py-3 px-5">{upper(t.th_metal)}</th>
                <th className="text-right py-3 px-5">{upper(t.th_grams)}</th>
                <th className="text-right py-3 px-5">{upper(t.th_spot)}</th>
                <th className="text-right py-3 px-5">{upper(t.th_usd)}</th>
                <th className="text-right py-3 px-5">{upper(t.th_weight)}</th>
              </tr>
            </thead>
            <tbody>
              {METALS.map(({ key, symbol, color }) => (
                <tr key={key} className="border-t border-white/5">
                  <td className="py-3 px-5">
                    <span className="font-semibold" style={{ color }}>{symbol}</span>
                    <span className="text-slate-400 ml-2">{t[`metal_${key}` as `metal_${typeof key}`]}</span>
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
                  <td className="py-3 px-5 font-semibold">{t.nav_row}</td>
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

      {/* Token contracts — canonical set + superseded generations */}
      <section className="max-w-6xl mx-auto px-6 mb-10">
        <h2 className="text-xs tracking-widest text-slate-500 mb-3">{upper(t.section_contracts)}</h2>
        <p className="text-sm text-slate-400 leading-relaxed max-w-4xl mb-3">{t.contracts_intro}</p>
        <p className="text-sm text-slate-400 leading-relaxed max-w-4xl mb-5">{t.contracts_why}</p>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-400">
              <tr>
                <th className="text-left py-3 px-5 font-medium">{t.th_contract}</th>
                <th className="text-left py-3 px-5 font-medium">{t.th_status}</th>
                <th className="text-left py-3 px-5 font-medium">{t.th_deployed}</th>
              </tr>
            </thead>
            <tbody>
              {CONTRACT_GENERATIONS.map((gen) =>
                gen.rows.map((row, i) => (
                  <tr key={`${gen.genKey}-${row.label}`} className="border-t border-white/5">
                    <td className="py-3 px-5">
                      <span className="text-slate-300">{row.label}</span>
                      <span className="text-slate-600"> · {t[gen.genKey]}</span>
                      {row.address && (
                        <a
                          className="block font-mono text-[11px] text-[#BFA181] underline break-all"
                          href={`${BASESCAN}${row.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {row.address}
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-5 align-top">
                      {i === 0 ? (
                        <span
                          className={
                            gen.statusKey === "status_canonical"
                              ? "text-emerald-400"
                              : "text-slate-500"
                          }
                        >
                          {t[gen.statusKey]}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-5 align-top font-mono text-slate-500">
                      {i === 0 ? gen.deployed : null}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-600">{t.contracts_supply_note}</p>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-10 text-xs text-slate-500 border-t border-white/5">
        <p className="max-w-3xl leading-relaxed">
          {t.footer}
          <a className="text-[#BFA181] underline" href="mailto:audit@auxite.io">
            audit@auxite.io
          </a>
          .
        </p>
        {lastFetched > 0 && (
          <p className="mt-3 text-[11px] text-slate-600">
            {t.last_refresh} {new Date(lastFetched).toLocaleString()}
          </p>
        )}
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
      <div className="text-xs tracking-wider text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}
