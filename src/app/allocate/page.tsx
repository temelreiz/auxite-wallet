"use client";

// ============================================
// ALLOCATE - Metal Allocation Screen
// Institutional Framework Style - Trading Desk Language
// Synced with Mobile (auxite-vault)
// ============================================

import { useState, useEffect } from "react";
import Image from "next/image";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useAccount } from "wagmi";

// Metal icons
const metalIcons: Record<string, string> = {
  AUXG: "/images/metals/gold.png",
  AUXS: "/images/metals/silver.png",
  AUXPT: "/images/metals/platinum.png",
  AUXPD: "/images/metals/palladium.png",
};

// ============================================
// TRANSLATIONS - Synced with Mobile
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Metal Tahsisi",
    subtitle: "Sermayenizi tam tahsisli fiziksel metallere dönüştürün",
    framework: "Tahsis Çerçevesi",
    permittedPaths: "İZİN VERİLEN SERMAYE YOLLARI",
    notSupported: "DESTEKLENMIYOR",
    fundingSource: "FONLAMA KAYNAĞI",
    targetMetal: "HEDEF METAL",
    amount: "TUTAR",
    executionSpread: "İşlem Spreadi",
    spreadIncludes: "Tedarik, işlem ve saklama lojistiğini içerir",
    estimatedAllocation: "Tahmini Tahsis",
    confirmAllocation: "Tahsisi Onayla",
    allocationsFinal: "Onaylandıktan sonra tahsisler kesindir.",
    // Permitted Capital Paths
    fiatToMetals: "Fiat → Metals",
    auxmToMetals: "AUXM → Metals",
    digitalToAuxmToMetals: "Digital Capital → AUXM → Metals",
    metalToAuxm: "Metal → AUXM (liquidity event)",
    metalToMetal: "Metal → Metal",
    // Not Supported
    digitalToDigital: "Dijital Varlık ↔ Dijital Varlık ticareti",
    notExchange: "Auxite bir borsa değildir.\nDijital varlıklar yalnızca takas altyapısı olarak hizmet verir.",
    legalSegregation: "Varlıklar yasal ayrım altında tahsis edilir.",
    // Execution Summary
    executionSummary: "İşlem Özeti",
    executionVenue: "İşlem Yeri",
    executionTime: "İşlem Zamanı",
    spread: "Spread",
    custodyDestination: "Saklama Hedefi",
    referencePrice: "Referans Fiyat",
    allocationAmount: "Tahsis Tutarı",
    settlementStatus: "Takas Durumu",
    pending: "Beklemede",
    viewCertificate: "Sertifikayı Gör",
    done: "Tamam",
    allocationExecuted: "Tahsis Gerçekleştirildi",
    // Funding hierarchy
    primaryFunding: "BİRİNCİL",
    secondaryFunding: "İKİNCİL",
    tertiaryFunding: "ÜÇÜNCÜL",
    requiredForExecution: "İşlem için gerekli",
    digitalConversionNote: "Dijital varlıklar, metal tahsisinden önce AUXM olarak kredilenir.",
    settlementInfrastructure: "Tüm tahsisler Auxite'ın dahili takas altyapısı üzerinden gerçekleştirilir.",
    // Settlement flow
    settlementFlow: "Takas Akışı",
    fundingAsset: "Fonlama Varlığı",
    auxmSettlement: "AUXM Takası",
    metalAllocation: "Metal Tahsisi",
    // Allocation Finality
    allocationFinality: "Tahsisli metaller ayrılmış saklama altında tutulur.",
    close: "Kapat",
  },
  en: {
    title: "Metal Allocation",
    subtitle: "Convert capital into fully allocated physical metals",
    framework: "Allocation Framework",
    permittedPaths: "PERMITTED CAPITAL PATHS",
    notSupported: "NOT SUPPORTED",
    fundingSource: "FUNDING SOURCE",
    targetMetal: "TARGET METAL",
    amount: "AMOUNT",
    executionSpread: "Execution Spread",
    spreadIncludes: "Includes sourcing, execution and custody logistics",
    estimatedAllocation: "Estimated Allocation",
    confirmAllocation: "Confirm Allocation",
    allocationsFinal: "Allocations are final once confirmed.",
    // Permitted Capital Paths
    fiatToMetals: "Fiat → Metals",
    auxmToMetals: "AUXM → Metals",
    digitalToAuxmToMetals: "Digital Capital → AUXM → Metals",
    metalToAuxm: "Metal → AUXM (liquidity event)",
    metalToMetal: "Metal → Metal",
    // Not Supported
    digitalToDigital: "Digital Asset → Digital Asset trading",
    notExchange: "Auxite is not an exchange.\nDigital assets serve exclusively as settlement infrastructure.",
    legalSegregation: "Assets are allocated under legal segregation.",
    // Execution Summary
    executionSummary: "Execution Summary",
    executionVenue: "Execution Venue",
    executionTime: "Execution Time",
    spread: "Spread",
    custodyDestination: "Custody Destination",
    referencePrice: "Reference Price",
    allocationAmount: "Allocation Amount",
    settlementStatus: "Settlement Status",
    pending: "Pending",
    viewCertificate: "View Certificate",
    done: "Done",
    allocationExecuted: "Allocation Executed",
    // Funding hierarchy
    primaryFunding: "PRIMARY",
    secondaryFunding: "SECONDARY",
    tertiaryFunding: "TERTIARY",
    requiredForExecution: "Required for execution",
    digitalConversionNote: "Digital assets are credited as AUXM prior to metal allocation.",
    settlementInfrastructure: "All allocations are executed through Auxite's internal settlement infrastructure.",
    // Settlement flow
    settlementFlow: "Settlement Flow",
    fundingAsset: "Funding Asset",
    auxmSettlement: "AUXM Settlement",
    metalAllocation: "Metal Allocation",
    // Allocation Finality
    allocationFinality: "Allocated metals are held under segregated custody.",
    close: "Close",
  },
};

export default function AllocatePage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const { address } = useAccount();

  const [selectedFrom, setSelectedFrom] = useState<string>("AUXM");
  const [selectedTo, setSelectedTo] = useState<string>("AUXG");
  const [amount, setAmount] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [showExecutionSummary, setShowExecutionSummary] = useState(false);

  const metals = [
    { symbol: "AUXG", name: "Gold", fullName: "Allocated Gold" },
    { symbol: "AUXS", name: "Silver", fullName: "Allocated Silver" },
    { symbol: "AUXPT", name: "Platinum", fullName: "Allocated Platinum" },
    { symbol: "AUXPD", name: "Palladium", fullName: "Allocated Palladium" },
  ];

  const primarySources = [{ symbol: "AUXM", name: "Settlement Balance", icon: "◈", tier: "primary" }];
  const secondarySources = [
    { symbol: "USDC", name: "USD Coin", icon: "$", tier: "secondary" },
    { symbol: "USDT", name: "Tether", icon: "₮", tier: "secondary" },
  ];
  const tertiarySources = [
    { symbol: "BTC", name: "Bitcoin", icon: "₿", tier: "tertiary" },
    { symbol: "ETH", name: "Ethereum", icon: "Ξ", tier: "tertiary" },
  ];

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices?chain=84532");
        const data = await res.json();
        if (data.success && data.basePrices) {
          setPrices(data.basePrices);
        }
      } catch (e) {
        console.warn("Valuation temporarily unavailable");
      }
    };
    fetchPrices();
  }, []);

  const calculateEstimatedAllocation = () => {
    const amountNum = parseFloat(amount) || 0;
    const metalPrice = prices[selectedTo] || 0;
    if (amountNum <= 0 || metalPrice <= 0) return null;
    const netAmount = amountNum * (1 - 0.0035);
    const grams = netAmount / metalPrice;
    return grams;
  };

  const estimatedGrams = calculateEstimatedAllocation();

  const getSourceIcon = (symbol: string) => {
    const icons: Record<string, string> = { AUXM: "◈", USDC: "$", USDT: "₮", BTC: "₿", ETH: "Ξ" };
    return icons[symbol] || "$";
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Allocation Framework */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-semibold text-slate-800 dark:text-white">{t.framework}</span>
          </div>

          {/* Permitted Capital Paths */}
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.permittedPaths}
          </p>
          <div className="space-y-2 mb-4">
            {[t.fiatToMetals, t.auxmToMetals, t.digitalToAuxmToMetals, t.metalToAuxm, t.metalToMetal].map((rule) => (
              <div key={rule} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-emerald-600 dark:text-emerald-400">{rule}</span>
              </div>
            ))}
          </div>

          {/* Not Supported */}
          <div className="border-t border-stone-200 dark:border-slate-700 pt-4">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
              {t.notSupported}
            </p>
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-500">{t.digitalToDigital}</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic whitespace-pre-line">{t.notExchange}</p>
          </div>
        </div>

        {/* Funding Source - Institutional Hierarchy */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-4">
            {t.fundingSource}
          </p>

          {/* Primary - AUXM */}
          <p className="text-[10px] font-bold text-amber-500 tracking-wider mb-2">{t.primaryFunding}</p>
          <div className="mb-2">
            {primarySources.map((source) => (
              <button
                key={source.symbol}
                onClick={() => setSelectedFrom(source.symbol)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  selectedFrom === source.symbol
                    ? "bg-amber-500/10 border-amber-500"
                    : "bg-stone-50 dark:bg-slate-800 border-amber-500/30 hover:border-amber-500/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl text-amber-500">{source.icon}</span>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800 dark:text-white">{source.symbol}</p>
                    <p className="text-xs text-slate-500">{source.name}</p>
                  </div>
                </div>
                {selectedFrom === source.symbol && (
                  <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 italic mb-4">{t.requiredForExecution}</p>

          {/* Secondary - Stablecoins */}
          <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">{t.secondaryFunding}</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {secondarySources.map((source) => (
              <button
                key={source.symbol}
                onClick={() => setSelectedFrom(source.symbol)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  selectedFrom === source.symbol
                    ? "bg-amber-500/10 border-amber-500"
                    : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
                }`}
              >
                <span className={`text-lg ${selectedFrom === source.symbol ? "text-amber-500" : "text-slate-600 dark:text-slate-300"}`}>
                  {source.icon}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{source.symbol}</span>
              </button>
            ))}
          </div>

          {/* Tertiary - Volatile Assets */}
          <p className="text-[10px] font-bold text-slate-400 tracking-wider mb-2">{t.tertiaryFunding}</p>
          <div className="grid grid-cols-2 gap-2">
            {tertiarySources.map((source) => (
              <button
                key={source.symbol}
                onClick={() => setSelectedFrom(source.symbol)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all ${
                  selectedFrom === source.symbol
                    ? "bg-amber-500/10 border-amber-500"
                    : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
                }`}
              >
                <span className={`text-lg ${selectedFrom === source.symbol ? "text-amber-500" : "text-slate-600 dark:text-slate-300"}`}>
                  {source.icon}
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{source.symbol}</span>
              </button>
            ))}
          </div>

          {/* Conversion Notice */}
          {selectedFrom && selectedFrom !== "AUXM" && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-amber-600 dark:text-amber-400">{t.digitalConversionNote}</span>
            </div>
          )}
        </div>

        {/* Settlement Flow Diagram */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-4 text-center">
            {t.settlementFlow}
          </p>
          <div className="flex items-center justify-center gap-2">
            {/* Step 1 - Funding Asset */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-2">
                <span className="text-lg text-amber-500">{getSourceIcon(selectedFrom)}</span>
              </div>
              <p className="text-[9px] text-slate-500">{t.fundingAsset}</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-white">{selectedFrom}</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center px-2">
              <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Step 2 - AUXM Settlement */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-2">
                <span className="text-lg text-amber-500">◈</span>
              </div>
              <p className="text-[9px] text-slate-500">{t.auxmSettlement}</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-white">AUXM</p>
            </div>

            {/* Arrow */}
            <div className="flex items-center px-2">
              <div className="w-8 h-px bg-slate-300 dark:bg-slate-600" />
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>

            {/* Step 3 - Metal Allocation */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-[9px] text-slate-500">{t.metalAllocation}</p>
              <p className="text-xs font-semibold text-slate-800 dark:text-white">{selectedTo}</p>
            </div>
          </div>
        </div>

        {/* Target Metal Selection */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-4">
            {t.targetMetal}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {metals.map((metal) => (
              <button
                key={metal.symbol}
                onClick={() => setSelectedTo(metal.symbol)}
                className={`flex flex-col items-center p-4 rounded-xl border transition-all ${
                  selectedTo === metal.symbol
                    ? "bg-amber-500/10 border-amber-500"
                    : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
                }`}
              >
                <div className="w-10 h-10 mb-2">
                  <Image
                    src={metalIcons[metal.symbol]}
                    alt={metal.name}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <p className="font-bold text-slate-800 dark:text-white">{metal.symbol}</p>
                <p className="text-[10px] text-slate-500">{metal.fullName}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  ${prices[metal.symbol]?.toFixed(2) || "--"}/g
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.amount}
          </p>
          <div className="flex items-center bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl px-4 h-14 mb-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 bg-transparent text-2xl font-semibold text-slate-800 dark:text-white outline-none"
            />
            <span className="text-slate-500">{selectedFrom || "USD"}</span>
          </div>

          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-500">{t.executionSpread}</span>
            <span className="text-xs font-semibold text-emerald-500">0.35%</span>
          </div>
          <p className="text-[10px] text-slate-500 italic mb-4">{t.spreadIncludes}</p>

          {/* Estimated Allocation */}
          {estimatedGrams && estimatedGrams > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">{t.estimatedAllocation}</p>
              <p className="text-xl font-bold text-amber-500">
                ≈ {estimatedGrams.toFixed(4)}g {selectedTo}
              </p>
            </div>
          )}
        </div>

        {/* Legal Segregation Notice */}
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
          <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{t.legalSegregation}</span>
        </div>

        {/* Settlement Infrastructure Notice */}
        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-xs text-slate-500 italic">{t.settlementInfrastructure}</span>
        </div>

        {/* Risk Microcopy */}
        <p className="text-xs text-slate-500 text-center italic">{t.allocationsFinal}</p>

        {/* Confirm Allocation Button */}
        <button
          onClick={() => setShowExecutionSummary(true)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t.confirmAllocation}
        </button>
      </div>

      {/* Execution Summary Modal */}
      {showExecutionSummary && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl">
            {/* Success Header */}
            <div className="flex flex-col items-center py-6 bg-emerald-500/10 rounded-t-3xl">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-bold text-emerald-600">{t.allocationExecuted}</p>
            </div>

            {/* Execution Details */}
            <div className="px-5 py-4">
              <p className="font-semibold text-slate-800 dark:text-white mb-3">{t.executionSummary}</p>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">{t.executionVenue}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">Auxite Primary Market</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">{t.referencePrice}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">${prices[selectedTo]?.toFixed(2) || "--"}/g</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">{t.spread}</span>
                  <span className="text-sm font-semibold text-emerald-500">0.35%</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">{t.allocationAmount}</span>
                  <span className="text-sm font-semibold text-amber-500">
                    {estimatedGrams?.toFixed(4) || "0.0000"}g {selectedTo}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">{t.executionTime}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">
                    {new Date().toISOString().split("T")[0]} {new Date().toTimeString().split(" ")[0]} UTC
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-700">
                  <span className="text-sm text-slate-500">{t.custodyDestination}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">Zurich, Switzerland</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-slate-500">{t.settlementStatus}</span>
                  <span className="px-2 py-1 bg-orange-500/20 rounded text-xs font-semibold text-orange-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    {t.pending}
                  </span>
                </div>
              </div>
            </div>

            {/* Allocation Finality Message */}
            <div className="mx-5 flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl mb-4">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-semibold text-emerald-600">{t.allocationFinality}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 px-5 pb-8">
              <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-stone-200 dark:border-slate-700 rounded-xl text-amber-500 font-semibold hover:bg-amber-500/10 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t.viewCertificate}
              </button>
              <button
                onClick={() => setShowExecutionSummary(false)}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors"
              >
                {t.done}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
