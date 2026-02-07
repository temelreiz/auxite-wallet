"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// ALLOCATE PAGE - Execution Console
// Institutional metal allocation interface
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Metal Tahsisi",
    subtitle: "Takas bakiyenizi fiziksel metale dönüştürün",
    allocationFramework: "Tahsis Çerçevesi",
    digitalToMetal: "Dijital varlıklar → Fiziksel metal tahsisi",
    metalToDigital: "Fiziksel metal → Dijital çıkış yok",
    notExchange: "Auxite bir kripto borsası değildir. Bu bir tahsis platformudur.",
    fundingSource: "FONLAMA KAYNAĞI",
    primaryFunding: "BİRİNCİL",
    secondaryFunding: "İKİNCİL",
    tertiaryFunding: "ÜÇÜNCÜL",
    settlementBalance: "Takas Bakiyesi",
    requiredForExecution: "İşlem için gerekli",
    targetMetal: "HEDEF METAL",
    allocationAmount: "TAHSİS TUTARI",
    enterAmount: "Tutar girin",
    estimatedAllocation: "Tahmini Tahsis",
    executionSummary: "İşlem Özeti",
    executionVenue: "İşlem Yeri",
    referencePrice: "Referans Fiyat",
    spread: "Spread",
    custodyDestination: "Saklama Hedefi",
    settlementStatus: "Takas Durumu",
    pending: "Beklemede",
    confirmAllocation: "Tahsisi Onayla",
    settlementInfrastructure: "Tüm tahsisler Auxite'ın dahili takas altyapısı üzerinden gerçekleştirilir.",
    legalSegregation: "Tahsisli metaller ayrılmış saklama altında tutulur ve asla kurumsal fonlarla birleştirilmez.",
    allocationsFinal: "Tahsisler nihaidir ve geri alınamaz.",
    digitalConversionNote: "Dijital varlıklar, metal tahsisinden önce AUXM olarak kredilenir.",
    settlementFlow: "Takas Akışı",
    fundingAsset: "Fonlama Varlığı",
    auxmSettlement: "AUXM Takası",
    metalAllocation: "Metal Tahsisi",
  },
  en: {
    title: "Metal Allocation",
    subtitle: "Convert your settlement balance into physical metal",
    allocationFramework: "Allocation Framework",
    digitalToMetal: "Digital assets → Physical metal allocation",
    metalToDigital: "Physical metal → No digital exit",
    notExchange: "Auxite is not a crypto exchange. This is an allocation platform.",
    fundingSource: "FUNDING SOURCE",
    primaryFunding: "PRIMARY",
    secondaryFunding: "SECONDARY",
    tertiaryFunding: "TERTIARY",
    settlementBalance: "Settlement Balance",
    requiredForExecution: "Required for execution",
    targetMetal: "TARGET METAL",
    allocationAmount: "ALLOCATION AMOUNT",
    enterAmount: "Enter amount",
    estimatedAllocation: "Estimated Allocation",
    executionSummary: "Execution Summary",
    executionVenue: "Execution Venue",
    referencePrice: "Reference Price",
    spread: "Spread",
    custodyDestination: "Custody Destination",
    settlementStatus: "Settlement Status",
    pending: "Pending",
    confirmAllocation: "Confirm Allocation",
    settlementInfrastructure: "All allocations are executed through Auxite's internal settlement infrastructure.",
    legalSegregation: "Allocated metals are held under segregated custody and are never commingled with corporate funds.",
    allocationsFinal: "Allocations are final and irreversible.",
    digitalConversionNote: "Digital assets are credited as AUXM prior to metal allocation.",
    settlementFlow: "Settlement Flow",
    fundingAsset: "Funding Asset",
    auxmSettlement: "AUXM Settlement",
    metalAllocation: "Metal Allocation",
  },
};

const metals = [
  { symbol: "AUXG", name: "Gold", fullName: "Allocated Gold" },
  { symbol: "AUXS", name: "Silver", fullName: "Allocated Silver" },
  { symbol: "AUXPT", name: "Platinum", fullName: "Allocated Platinum" },
  { symbol: "AUXPD", name: "Palladium", fullName: "Allocated Palladium" },
];

const primarySources = [
  { symbol: "AUXM", name: "Settlement Balance", icon: "◈", tier: "primary" },
];

const secondarySources = [
  { symbol: "USDC", name: "USD Coin", icon: "$", tier: "secondary" },
  { symbol: "USDT", name: "Tether", icon: "₮", tier: "secondary" },
];

const tertiarySources = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", tier: "tertiary" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", tier: "tertiary" },
];

export default function AllocatePage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [selectedFrom, setSelectedFrom] = useState("AUXM");
  const [selectedTo, setSelectedTo] = useState("AUXG");
  const [amount, setAmount] = useState("");
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Fetch metal prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices?chain=84532");
        const data = await res.json();
        if (data.success) {
          setPrices(data.basePrices || {});
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const calculateEstimatedAllocation = () => {
    const amountNum = parseFloat(amount) || 0;
    const metalPrice = prices[selectedTo] || 0;
    if (!metalPrice || !amountNum) return 0;
    const netAmount = amountNum * (1 - 0.0035);
    return netAmount / metalPrice;
  };

  const estimatedGrams = calculateEstimatedAllocation();

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Allocation Framework */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="font-semibold text-slate-800 dark:text-white">{t.allocationFramework}</h2>
          </div>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-slate-600 dark:text-slate-400">{t.digitalToMetal}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm text-slate-600 dark:text-slate-400">{t.metalToDigital}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-500 italic">{t.notExchange}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Funding & Metal Selection */}
          <div className="space-y-6">
            {/* Funding Source */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">{t.fundingSource}</h3>

              {/* Primary */}
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">{t.primaryFunding}</p>
              {primarySources.map((source) => (
                <button
                  key={source.symbol}
                  onClick={() => setSelectedFrom(source.symbol)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 mb-2 transition-all ${
                    selectedFrom === source.symbol
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
              <p className="text-xs text-slate-500 italic mb-4">{t.requiredForExecution}</p>

              {/* Secondary */}
              <p className="text-xs font-bold text-slate-500 mb-2">{t.secondaryFunding}</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {secondarySources.map((source) => (
                  <button
                    key={source.symbol}
                    onClick={() => setSelectedFrom(source.symbol)}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                      selectedFrom === source.symbol
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
                    }`}
                  >
                    <span className="text-lg">{source.icon}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{source.symbol}</span>
                  </button>
                ))}
              </div>

              {/* Tertiary */}
              <p className="text-xs font-bold text-slate-400 mb-2">{t.tertiaryFunding}</p>
              <div className="grid grid-cols-2 gap-2">
                {tertiarySources.map((source) => (
                  <button
                    key={source.symbol}
                    onClick={() => setSelectedFrom(source.symbol)}
                    className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
                      selectedFrom === source.symbol
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
                    }`}
                  >
                    <span className="text-lg">{source.icon}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{source.symbol}</span>
                  </button>
                ))}
              </div>

              {/* Conversion Notice */}
              {selectedFrom !== "AUXM" && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-600 dark:text-amber-400">{t.digitalConversionNote}</p>
                </div>
              )}
            </div>

            {/* Target Metal */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">{t.targetMetal}</h3>
              <div className="grid grid-cols-2 gap-3">
                {metals.map((metal) => (
                  <button
                    key={metal.symbol}
                    onClick={() => setSelectedTo(metal.symbol)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      selectedTo === metal.symbol
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-stone-200 dark:border-slate-700 hover:border-amber-500/50"
                    }`}
                  >
                    <p className="font-semibold text-slate-800 dark:text-white">{metal.symbol}</p>
                    <p className="text-xs text-slate-500">{metal.fullName}</p>
                    <p className="text-xs text-amber-600 mt-1">
                      ${prices[metal.symbol]?.toFixed(2) || "--"}/g
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Amount & Execution */}
          <div className="space-y-6">
            {/* Amount Input */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">{t.allocationAmount}</h3>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.enterAmount}
                  className="w-full px-4 py-4 text-2xl font-bold bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-slate-500">{selectedFrom}</span>
              </div>

              {amount && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">{t.estimatedAllocation}</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {estimatedGrams.toFixed(4)}g <span className="text-base">{selectedTo}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Settlement Flow Diagram */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4 text-center">{t.settlementFlow}</h3>
              <div className="flex items-center justify-center gap-2">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl text-amber-500">
                      {selectedFrom === "AUXM" ? "◈" : selectedFrom === "USDC" ? "$" : selectedFrom === "USDT" ? "₮" : selectedFrom === "BTC" ? "₿" : "Ξ"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{t.fundingAsset}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{selectedFrom}</p>
                </div>
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-2">
                    <span className="text-xl text-amber-500">◈</span>
                  </div>
                  <p className="text-xs text-slate-500">{t.auxmSettlement}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">AUXM</p>
                </div>
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-2">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500">{t.metalAllocation}</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{selectedTo}</p>
                </div>
              </div>
            </div>

            {/* Execution Summary */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-4">{t.executionSummary}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.executionVenue}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-white">Auxite Primary Market</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.referencePrice}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-white">${prices[selectedTo]?.toFixed(2) || "--"}/g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.spread}</span>
                  <span className="text-sm font-medium text-emerald-600">0.35%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.custodyDestination}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-white">Zurich, Switzerland</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.settlementStatus}</span>
                  <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-600">{t.pending}</span>
                </div>
              </div>
            </div>

            {/* Trust Messages */}
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{t.legalSegregation}</p>
              </div>
              <p className="text-xs text-slate-500 text-center italic">{t.settlementInfrastructure}</p>
            </div>

            {/* Confirm Button */}
            <button
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t.confirmAllocation}
            </button>

            <p className="text-xs text-slate-400 text-center">{t.allocationsFinal}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
