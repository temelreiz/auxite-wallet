"use client";

// ============================================
// ALLOCATE — Metal Capital Allocation
// Institutional Prime Metals Platform
// No trading language. No token feel.
// "You are not trading. You are allocating assets."
// ============================================

import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useAccount } from "wagmi";

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Metal Tahsisi",
    subtitle: "Sermayenizi tam tahsisli, ayrılmış fiziksel metallere dönüştürün",
    selectMetal: "HEDEF METAL",
    goldDesc: "London Good Delivery",
    silverDesc: "LBMA Good Delivery",
    platinumDesc: "LPPM Good Delivery",
    palladiumDesc: "LPPM Good Delivery",
    allocatedSegregated: "Tahsisli & Ayrılmış",
    capitalDeployed: "Sermaye Tahsisi",
    fundingSource: "TAKAS VARLIĞI",
    marketReference: "Piyasa Referansı (LBMA)",
    executionPrice: "İşlem Fiyatı",
    estimatedAllocation: "Tahmini Tahsis",
    reviewAllocation: "Tahsisi İncele",
    // Preview
    allocationPreview: "Tahsis Önizleme",
    metal: "Metal",
    structure: "Yapı",
    fullyAllocated: "Tam Tahsisli",
    vault: "Kasa",
    titleHolder: "Başlık Sahibi",
    clientVault: "Müşteri Kasası",
    legalTitle: "Yasal mülkiyet, işlem gerçekleştikten sonra müşteri kasanıza kaydedilecektir.",
    confirmExecution: "Tahsisi Onayla",
    cancel: "İptal",
    executionNote: "İşlem, onaylandıktan sonra genellikle birkaç dakika içinde tamamlanır.",
    // Post-allocation
    allocationCompleted: "Tahsis Tamamlandı",
    allocationId: "Tahsis No",
    viewCertificate: "Sertifikayı Gör",
    enterProgram: "Programa Gir",
    allocateMore: "Daha Fazla Tahsis Et",
    // RFQ
    rfqTitle: "Kurumsal Teklif Talebi",
    rfqDescription: "Bu büyüklükteki tahsisler için kurumsal masadan fiyat teklifi alın.",
    requestQuote: "Kurumsal Teklif İste",
    rfqSubmitted: "Talebiniz masaya iletildi. En kısa sürede dönüş yapılacaktır.",
    // Infrastructure
    institutionalExecution: "Kurumsal düzeyde işlem altyapısı.",
  },
  en: {
    title: "Metal Allocation",
    subtitle: "Deploy capital into fully allocated, segregated physical metals",
    selectMetal: "TARGET METAL",
    goldDesc: "London Good Delivery",
    silverDesc: "LBMA Good Delivery",
    platinumDesc: "LPPM Good Delivery",
    palladiumDesc: "LPPM Good Delivery",
    allocatedSegregated: "Allocated & Segregated",
    capitalDeployed: "Capital Deployed",
    fundingSource: "SETTLEMENT ASSET",
    marketReference: "Market Reference (LBMA)",
    executionPrice: "Execution Price",
    estimatedAllocation: "Estimated Allocation",
    reviewAllocation: "Review Allocation",
    // Preview
    allocationPreview: "Allocation Preview",
    metal: "Metal",
    structure: "Structure",
    fullyAllocated: "Fully Allocated",
    vault: "Vault",
    titleHolder: "Title Holder",
    clientVault: "Client Vault",
    legalTitle: "Legal title will be recorded under your client vault upon execution.",
    confirmExecution: "Confirm Allocation",
    cancel: "Cancel",
    executionNote: "Execution typically completes within minutes once confirmed.",
    // Post-allocation
    allocationCompleted: "Allocation Completed",
    allocationId: "Allocation ID",
    viewCertificate: "View Certificate",
    enterProgram: "Enter Program",
    allocateMore: "Allocate More",
    // RFQ
    rfqTitle: "Institutional Quote Request",
    rfqDescription: "Allocations of this size are executed through our institutional desk for optimal pricing.",
    requestQuote: "Request Institutional Quote",
    rfqSubmitted: "Your request has been forwarded to the desk. You will be contacted shortly.",
    // Infrastructure
    institutionalExecution: "Institutional-grade execution infrastructure.",
  },
};

// ============================================
// METAL DEFINITIONS
// ============================================
const METALS = [
  {
    symbol: "AUXG",
    name: "Auxite Gold",
    descKey: "goldDesc" as const,
    icon: "/auxg_icon.png",
    color: "#C6A15B",
    certification: "LBMA Good Delivery",
  },
  {
    symbol: "AUXS",
    name: "Auxite Silver",
    descKey: "silverDesc" as const,
    icon: "/auxs_icon.png",
    color: "#A6B0BF",
    certification: "LBMA Good Delivery",
  },
  {
    symbol: "AUXPT",
    name: "Auxite Platinum",
    descKey: "platinumDesc" as const,
    icon: "/auxpt_icon.png",
    color: "#8FA3B8",
    certification: "LPPM Approved",
  },
  {
    symbol: "AUXPD",
    name: "Auxite Palladium",
    descKey: "palladiumDesc" as const,
    icon: "/auxpd_icon.png",
    color: "#6E7C8A",
    certification: "LPPM Approved",
  },
];

const FUNDING_SOURCES = [
  { symbol: "AUXM", name: "Settlement Balance", tier: "primary" },
  { symbol: "USDC", name: "USD Coin", tier: "secondary" },
  { symbol: "USDT", name: "Tether", tier: "secondary" },
  { symbol: "BTC", name: "Bitcoin", tier: "tertiary" },
  { symbol: "ETH", name: "Ethereum", tier: "tertiary" },
];

// ============================================
// ROUNDING HELPER
// ============================================
function formatUSD(value: number): string {
  return "$" + Math.round(value).toLocaleString("en-US");
}

function formatGrams(grams: number): string {
  if (grams >= 1000) {
    return grams.toFixed(2) + "g";
  }
  if (grams >= 100) {
    return grams.toFixed(2) + "g";
  }
  if (grams >= 1) {
    return grams.toFixed(4) + "g";
  }
  return grams.toFixed(4) + "g";
}

function formatPricePerGram(price: number): string {
  return "$" + price.toFixed(2);
}

// ============================================
// COMPONENT
// ============================================
type ViewState = "allocate" | "preview" | "completed" | "rfq";

export default function AllocatePage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const { address } = useAccount();

  // State
  const [selectedMetal, setSelectedMetal] = useState("AUXG");
  const [selectedSource, setSelectedSource] = useState("AUXM");
  const [amount, setAmount] = useState("");
  const [basePrices, setBasePrices] = useState<Record<string, number>>({});
  const [executionPrices, setExecutionPrices] = useState<Record<string, number>>({});
  const [spotPricesOz, setSpotPricesOz] = useState<Record<string, number>>({});
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [priceSource, setPriceSource] = useState<string>("--");
  const [viewState, setViewState] = useState<ViewState>("allocate");
  const [allocationResult, setAllocationResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [rfqSubmitted, setRfqSubmitted] = useState(false);

  // Fetch prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/prices?chain=84532");
        const data = await res.json();
        if (data.success) {
          if (data.basePrices) setBasePrices(data.basePrices);
          if (data.executionPrices || data.prices) setExecutionPrices(data.executionPrices || data.prices);
          if (data.spotPrices) setSpotPricesOz(data.spotPrices);
          if (data.pricingEngine?.source) setPriceSource(data.pricingEngine.source);
        }
      } catch (e) {
        console.warn("Metal price feed temporarily unavailable");
      }

      try {
        const cryptoRes = await fetch("/api/crypto");
        const cryptoData = await cryptoRes.json();
        if (cryptoData) {
          const prices: Record<string, number> = { AUXM: 1 };
          if (cryptoData.bitcoin?.usd) prices.BTC = cryptoData.bitcoin.usd;
          if (cryptoData.ethereum?.usd) prices.ETH = cryptoData.ethereum.usd;
          if (cryptoData.tether?.usd) prices.USDT = cryptoData.tether.usd;
          prices.USDC = 1;
          setCryptoPrices(prices);
        }
      } catch (e) {
        console.warn("Crypto price feed temporarily unavailable");
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const inputAmount = parseFloat(amount) || 0;
  const metalExecPrice = executionPrices[selectedMetal] || 0;
  const metalBasePrice = basePrices[selectedMetal] || 0;
  const metalSpotOz = spotPricesOz[selectedMetal] || 0;
  const metalInfo = METALS.find((m) => m.symbol === selectedMetal);

  // Determine if source is USD-denominated or crypto
  const isStablecoinSource = selectedSource === "AUXM" || selectedSource === "USDC" || selectedSource === "USDT";
  const cryptoUsdPrice = cryptoPrices[selectedSource] || 0;

  // Capital in USD: for stablecoins input is USD, for crypto it's crypto amount × price
  const capitalAmount = isStablecoinSource ? inputAmount : inputAmount * cryptoUsdPrice;
  const estimatedGrams = metalExecPrice > 0 ? capitalAmount / metalExecPrice : 0;

  // How many units of this crypto = 1 gram of selected metal
  const cryptoPerGram = (cryptoUsdPrice > 0 && metalExecPrice > 0) ? metalExecPrice / cryptoUsdPrice : 0;

  // RFQ threshold: $1.5M+ → institutional desk pricing
  const requiresRFQ = capitalAmount >= 1500000;

  const handleReviewClick = () => {
    if (capitalAmount <= 0 || metalExecPrice <= 0) return;
    if (requiresRFQ) {
      setViewState("rfq");
    } else {
      setViewState("preview");
    }
  };

  const handleConfirmAllocation = useCallback(async () => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      const res = await fetch("/api/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAsset: selectedSource,
          toAsset: selectedMetal,
          fromAmount: capitalAmount,
          toAmount: estimatedGrams,
          address,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setAllocationResult({
          id: data.exchange?.allocation?.certificateNumber || `AUX-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          grams: data.exchange?.toAmount || estimatedGrams,
          metal: selectedMetal,
          capitalDeployed: capitalAmount,
          executionPrice: metalExecPrice,
          vault: "Zurich, Switzerland",
        });
        setViewState("completed");
      } else {
        alert(data.error || "Allocation failed. Please try again.");
      }
    } catch (error) {
      alert("Connection error. Please try again.");
    } finally {
      setIsExecuting(false);
    }
  }, [isExecuting, selectedSource, selectedMetal, capitalAmount, estimatedGrams, address, metalExecPrice]);

  const handleRFQSubmit = async () => {
    setRfqSubmitted(true);
    // In production: POST to /api/rfq
  };

  // ============================================
  // RENDER: RFQ VIEW
  // ============================================
  if (viewState === "rfq") {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
        <TopNav />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 bg-[#BFA181]/10 border-b border-stone-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.rfqTitle}</h2>
              <p className="text-sm text-slate-500 mt-1">{t.rfqDescription}</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.metal}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{metalInfo?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.capitalDeployed}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{formatUSD(capitalAmount)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.estimatedAllocation}</span>
                <span className="text-sm font-semibold text-[#BFA181]">{formatGrams(estimatedGrams)}</span>
              </div>

              {rfqSubmitted ? (
                <div className="p-4 bg-[#2F6F62]/10 rounded-xl text-center">
                  <svg className="w-8 h-8 text-[#2F6F62] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-[#2F6F62] font-semibold">{t.rfqSubmitted}</p>
                </div>
              ) : (
                <button
                  onClick={handleRFQSubmit}
                  className="w-full py-4 bg-[#BFA181] text-white font-semibold rounded-xl"
                >
                  {t.requestQuote}
                </button>
              )}

              <button
                onClick={() => { setViewState("allocate"); setRfqSubmitted(false); }}
                className="w-full py-3 text-slate-500 text-sm"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: POST-ALLOCATION (COMPLETED)
  // ============================================
  if (viewState === "completed" && allocationResult) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
        <TopNav />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 overflow-hidden">
            {/* Success Header */}
            <div className="flex flex-col items-center py-8 bg-[#2F6F62]/10">
              <div className="w-16 h-16 rounded-full bg-[#2F6F62] flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#2F6F62]">{t.allocationCompleted}</h2>
              <p className="text-sm text-slate-500 mt-1 font-mono">{t.allocationId}: {allocationResult.id}</p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-3">
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.metal}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{metalInfo?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.structure}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{t.fullyAllocated}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.capitalDeployed}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{formatUSD(allocationResult.capitalDeployed)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.executionPrice}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{formatPricePerGram(allocationResult.executionPrice)}/g</span>
              </div>
              <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.estimatedAllocation}</span>
                <span className="text-sm font-semibold text-[#BFA181]">{formatGrams(allocationResult.grams)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-500">{t.vault}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{allocationResult.vault}</span>
              </div>
            </div>

            {/* Legal notice */}
            <div className="mx-6 mb-4 p-3 bg-[#2F6F62]/10 rounded-xl">
              <p className="text-xs text-[#2F6F62] text-center">{t.legalTitle}</p>
            </div>

            {/* CTAs */}
            <div className="px-6 pb-6 space-y-3">
              <button className="w-full py-3 bg-[#BFA181] text-white font-semibold rounded-xl">
                {t.viewCertificate}
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm">
                  {t.enterProgram}
                </button>
                <button
                  onClick={() => {
                    setViewState("allocate");
                    setAmount("");
                    setAllocationResult(null);
                  }}
                  className="py-3 border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm"
                >
                  {t.allocateMore}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: PREVIEW SCREEN (P5 - MANDATORY)
  // ============================================
  if (viewState === "preview") {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
        <TopNav />
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-stone-200 dark:border-slate-800">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.allocationPreview}</h2>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.metal}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{metalInfo?.name}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.structure}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{t.fullyAllocated}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.fundingSource}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{selectedSource}</span>
              </div>
              {!isStablecoinSource && (
                <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{lang === 'tr' ? 'Kripto Miktarı' : 'Crypto Amount'}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{inputAmount} {selectedSource}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.capitalDeployed}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{formatUSD(capitalAmount)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.marketReference}</span>
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{formatPricePerGram(metalBasePrice)}/g</span>
              </div>
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.executionPrice}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{formatPricePerGram(metalExecPrice)}/g</span>
              </div>
              {cryptoPerGram > 0 && (
                <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-[#BFA181]">{lang === 'tr' ? 'Gram Başına' : 'Per Gram'} ({selectedSource})</span>
                  <span className="text-sm font-bold text-[#BFA181]">{cryptoPerGram.toFixed(selectedSource === "BTC" ? 6 : isStablecoinSource ? 2 : 4)} {selectedSource}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.estimatedAllocation}</span>
                <span className="text-sm font-bold text-[#BFA181]">{formatGrams(estimatedGrams)}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500">{t.vault}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">Zurich, Switzerland</span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm text-slate-500">{t.titleHolder}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{t.clientVault}</span>
              </div>
            </div>

            {/* Legal notice */}
            <div className="mx-6 p-3 bg-[#2F6F62]/10 rounded-xl mb-4">
              <p className="text-xs text-[#2F6F62] text-center">{t.legalTitle}</p>
            </div>

            {/* Execution note */}
            <p className="text-[10px] text-slate-400 text-center px-6 mb-4">{t.executionNote}</p>

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setViewState("allocate")}
                className="flex-1 py-4 border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirmAllocation}
                disabled={isExecuting}
                className="flex-1 py-4 bg-[#BFA181] text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {isExecuting ? "..." : t.confirmExecution}
              </button>
            </div>
          </div>

          {/* Institutional note */}
          <p className="text-[10px] text-slate-400 text-center mt-4">{t.institutionalExecution}</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: MAIN ALLOCATION SCREEN
  // ============================================
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Metal Selection — Institutional Card Style */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-4">
            {t.selectMetal}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {METALS.map((metal) => {
              const isSelected = selectedMetal === metal.symbol;
              return (
                <button
                  key={metal.symbol}
                  onClick={() => setSelectedMetal(metal.symbol)}
                  className={`flex flex-col items-start p-4 rounded-xl border transition-all text-left ${
                    isSelected
                      ? `border-[${metal.color}]`
                      : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700"
                  }`}
                  style={isSelected ? { borderColor: metal.color, backgroundColor: `${metal.color}0D` } : {}}
                >
                  {/* Icon LEFT of metal name — 36px PNG, circular mask */}
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10" style={{ background: `${metal.color}15` }}>
                      <img
                        src={metal.icon}
                        alt={metal.name}
                        className="w-full h-full object-cover scale-[0.85]"
                        style={{ opacity: isSelected ? 1 : 0.65, filter: 'contrast(1.1)' }}
                      />
                    </div>
                    <p className="font-bold text-slate-800 dark:text-white text-sm">{metal.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{t[metal.descKey]}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: isSelected ? metal.color : '#2F6F62' }}>{t.allocatedSegregated}</p>
                  {/* LBMA / LPPM certification badge */}
                  <p className="text-[11px] sm:text-xs mt-0.5" style={{ opacity: 0.6 }}>{metal.certification}</p>

                  {/* Pricing: Market Reference + Execution Price */}
                  <div className="w-full mt-3 pt-2 border-t border-stone-200 dark:border-slate-700">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] text-slate-400">{lang === "tr" ? "Referans" : "Reference"}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {metalBasePrice ? formatPricePerGram(basePrices[metal.symbol]) : "--"}/g
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                      <span className="text-[11px] text-slate-400">{lang === "tr" ? "İşlem" : "Execution"}</span>
                      <span
                        className="text-sm font-bold text-slate-800 dark:text-white"
                        style={isSelected ? { backgroundColor: `${metal.color}0D`, padding: '0 4px', borderRadius: '4px' } : {}}
                      >
                        {executionPrices[metal.symbol] ? formatPricePerGram(executionPrices[metal.symbol]) : "--"}/g
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Funding Source */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-4">
            {t.fundingSource}
          </p>
          <div className="flex gap-2">
            {FUNDING_SOURCES.map((source) => (
              <button
                key={source.symbol}
                onClick={() => { setSelectedSource(source.symbol); setAmount(""); }}
                className={`flex-1 flex flex-col items-center p-3 rounded-xl border transition-all ${
                  selectedSource === source.symbol
                    ? "bg-[#BFA181]/10 border-[#BFA181]"
                    : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
                }`}
              >
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{source.symbol}</span>
                <span className="text-[11px] text-slate-500 mt-0.5">{source.name}</span>
                {source.symbol !== "AUXM" && source.symbol !== "USDC" && source.symbol !== "USDT" && cryptoPrices[source.symbol] ? (
                  <span className="text-[9px] text-slate-400 mt-0.5">
                    ${cryptoPrices[source.symbol]?.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                ) : source.symbol === "AUXM" ? (
                  <span className="text-[10px] text-[#C6A15B] mt-0.5 font-medium">
                    {lang === 'tr' ? 'Tahsis için gerekli' : 'Required for allocation'}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {/* Capital Deployment Input */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-stone-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.capitalDeployed}
          </p>
          <div className="flex items-center bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl px-4 h-14 mb-4">
            <span className="text-slate-400 mr-3 text-sm font-semibold">{selectedSource}</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="flex-1 bg-transparent text-2xl font-semibold text-slate-800 dark:text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* USD Equivalent for crypto sources */}
          {!isStablecoinSource && inputAmount > 0 && cryptoUsdPrice > 0 && (
            <div className="flex justify-between items-center px-1 mb-3">
              <span className="text-xs text-slate-500">{lang === 'tr' ? 'USD Karşılığı' : 'USD Equivalent'}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{formatUSD(capitalAmount)}</span>
            </div>
          )}

          {/* Crypto price info */}
          {!isStablecoinSource && cryptoUsdPrice > 0 && (
            <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg mb-4">
              <span className="text-[11px] text-slate-500 font-semibold">1 {selectedSource}</span>
              <span className="text-[11px] text-slate-800 dark:text-white font-bold">= {formatUSD(cryptoUsdPrice)}</span>
              {cryptoPerGram > 0 && (
                <span className="text-[10px] text-[#BFA181] font-medium ml-1">
                  ({cryptoPerGram.toFixed(selectedSource === "BTC" ? 6 : 4)} {selectedSource}/g {metalInfo?.symbol || ""})
                </span>
              )}
            </div>
          )}

          {/* Market Reference vs Execution Price */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">{t.marketReference}</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {metalBasePrice ? formatPricePerGram(metalBasePrice) : "--"}/g
                {metalSpotOz > 0 && (
                  <span className="text-slate-400 ml-1">({formatUSD(metalSpotOz)}/oz)</span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500 font-semibold">{t.executionPrice}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {metalExecPrice ? formatPricePerGram(metalExecPrice) : "--"}/g
              </span>
            </div>
            {/* Execution price in asset terms — shown for ALL funding sources */}
            {cryptoPerGram > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-[#BFA181]">{lang === 'tr' ? 'Gram Başına' : 'Per Gram'} ({selectedSource})</span>
                <span className="text-sm font-bold text-[#BFA181]">
                  {cryptoPerGram.toFixed(selectedSource === "BTC" ? 6 : isStablecoinSource ? 2 : 4)} {selectedSource}
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 italic">
              {lang === 'tr' ? 'Tedarik ve kurumsal işlem maliyetlerini içerir.' : 'Includes sourcing and institutional execution.'}
            </p>
          </div>

          {/* Estimated Allocation */}
          {estimatedGrams > 0 && (
            <div className="p-4 bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl text-center">
              <p className="text-[10px] text-slate-500 mb-1">{t.estimatedAllocation}</p>
              <p className="text-xl font-bold text-[#BFA181]">
                {formatGrams(estimatedGrams)} {metalInfo?.name}
              </p>
              {!isStablecoinSource && capitalAmount > 0 && (
                <p className="text-xs text-slate-500 mt-1">≈ {formatUSD(capitalAmount)}</p>
              )}
            </div>
          )}
        </div>

        {/* Institutional note */}
        <p className="text-[10px] text-slate-400 text-center italic">{t.institutionalExecution}</p>

        {/* Review Allocation Button */}
        <button
          onClick={handleReviewClick}
          disabled={capitalAmount <= 0 || metalExecPrice <= 0}
          className="w-full flex items-center justify-center gap-2 py-4 bg-[#BFA181] text-white font-semibold rounded-xl disabled:opacity-40 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {requiresRFQ ? t.requestQuote : t.reviewAllocation}
        </button>
      </div>
    </div>
  );
}
