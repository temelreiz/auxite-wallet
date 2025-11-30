"use client";
import { useState } from "react";
import Link from "next/link";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import MetalPriceCard from "./MetalPriceCard";
import { ExchangeModal } from "./ExchangeModal";
import CryptoTradingDetailPage from "./CryptoTradingDetailPage";

interface MetalPriceGridProps {
  lang?: "tr" | "en";
}

// Metal icon mapping
const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const metals = [
  {
    id: "gold" as const,
    symbol: "AUXG",
    priceKey: "AUXG",
    icon: metalIcons.AUXG,
  },
  {
    id: "silver" as const,
    symbol: "AUXS",
    priceKey: "AUXS",
    icon: metalIcons.AUXS,
  },
  {
    id: "platinum" as const,
    symbol: "AUXPT",
    priceKey: "AUXPT",
    icon: metalIcons.AUXPT,
  },
  {
    id: "palladium" as const,
    symbol: "AUXPD",
    priceKey: "AUXPD",
    icon: metalIcons.AUXPD,
  },
];

// Helper function to get direction styles
function getDirectionStyles(change: number): { badgeBg: string; badgeText: string; arrow: string } {
  if (change > 0.01) {
    return {
      badgeBg: "bg-emerald-500/20",
      badgeText: "text-emerald-400",
      arrow: "↑"
    };
  } else if (change < -0.01) {
    return {
      badgeBg: "bg-red-500/20",
      badgeText: "text-red-400",
      arrow: "↓"
    };
  } else {
    return {
      badgeBg: "bg-slate-500/20",
      badgeText: "text-slate-300",
      arrow: "~"
    };
  }
}

export default function MetalPriceGrid({ lang = "en" }: MetalPriceGridProps) {
  const { prices, bidPrices, directions, changes, loading } = useMetalsPrices();
  const { prices: cryptoPrices, changes: cryptoChanges, directions: cryptoDirections, loading: cryptoLoading } = useCryptoPrices();
  const [showExchange, setShowExchange] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showCryptoDetail, setShowCryptoDetail] = useState<"ETH" | "BTC" | null>(null);

  // Demo wallet address
  const walletAddress = "0xe6df...3ba3";

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 animate-pulse"
          >
            <div className="h-32"></div>
          </div>
        ))}
      </div>
    );
  }

  // Get styles for each crypto
  const ethStyles = getDirectionStyles(cryptoChanges.eth);
  const btcStyles = getDirectionStyles(cryptoChanges.btc);
  const usdtStyles = getDirectionStyles(0); // Always neutral
  const tryStyles = getDirectionStyles(cryptoChanges.try || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">
            {lang === "tr" ? "Fiyatlar" : "Prices"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {lang === "tr"
              ? "Canlı metal ve kripto fiyatları"
              : "Live metal and crypto prices"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>{lang === "tr" ? "Canlı" : "Live"}</span>
          </div>
        </div>
      </div>

      {/* Metal Price Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metals.map((metal) => {
          const priceData = prices[metal.priceKey];
          const bidPrice = bidPrices[metal.priceKey];
          const direction = directions[metal.priceKey];
          const change = changes[metal.priceKey];

          if (!priceData || typeof priceData !== "number") {
            return null;
          }

          const metalName = lang === "tr" 
            ? `Auxite ${metal.priceKey === "AUXG" ? "Altın" : metal.priceKey === "AUXS" ? "Gümüş" : metal.priceKey === "AUXPT" ? "Platin" : "Paladyum"}`
            : `Auxite ${metal.priceKey === "AUXG" ? "Gold" : metal.priceKey === "AUXS" ? "Silver" : metal.priceKey === "AUXPT" ? "Platinum" : "Palladium"}`;

          return (
            <MetalPriceCard
              key={metal.id}
              metalId={metal.symbol as "AUXG" | "AUXS" | "AUXPT" | "AUXPD"}
              symbol={metal.symbol}
              name={metalName}
              pricePerGram={priceData}
              pricePerKg={priceData * 1000}
              change24h={change || 0}
              bidPrice={bidPrice}
              direction={direction || "neutral"}
              icon={metal.icon}
              lang={lang}
            />
          );
        })}
      </div>

      {/* Crypto Price Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ETH */}
        <div 
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => setShowCryptoDetail("ETH")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                  <path d="M12 18.5l-6.5-4.5L12 22.5l6.5-8.5L12 18.5z" fillOpacity="0.6"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-200">ETH</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${ethStyles.badgeBg} ${ethStyles.badgeText}`}>
              {ethStyles.arrow} {Math.abs(cryptoChanges.eth).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Ethereum</div>
          {/* Ask/Bid Prices - Base fiyat göster */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{lang === "tr" ? "Alış/Satış" : "Ask/Bid"}</span>
            <span className="font-mono">${cryptoPrices.eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`text-xl font-bold font-mono mb-3 transition-colors duration-300 ${cryptoDirections.eth === "up" ? "text-emerald-400" : cryptoDirections.eth === "down" ? "text-red-400" : "text-slate-100"}`}>
            ${cryptoPrices.eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>

        {/* BTC */}
        <div 
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => setShowCryptoDetail("BTC")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F7931A] flex items-center justify-center">
                <span className="text-white text-xs font-bold">₿</span>
              </div>
              <span className="text-sm font-medium text-slate-200">BTC</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${btcStyles.badgeBg} ${btcStyles.badgeText}`}>
              {btcStyles.arrow} {Math.abs(cryptoChanges.btc).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Bitcoin</div>
          {/* Ask/Bid Prices - Base fiyat göster */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{lang === "tr" ? "Alış/Satış" : "Ask/Bid"}</span>
            <span className="font-mono">${cryptoPrices.btc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`text-xl font-bold font-mono mb-3 transition-colors duration-300 ${cryptoDirections.btc === "up" ? "text-emerald-400" : cryptoDirections.btc === "down" ? "text-red-400" : "text-slate-100"}`}>
            ${cryptoPrices.btc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>

        {/* USDT */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#26A17B] flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-sm font-medium text-slate-200">USDT</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${usdtStyles.badgeBg} ${usdtStyles.badgeText}`}>
              {usdtStyles.arrow} 0.00%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Tether</div>
          <div className="text-xl font-bold text-slate-100 font-mono mb-3">
            $1.00
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>

        {/* TRY */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#E30A17] flex items-center justify-center">
                <span className="text-white text-xs font-bold">₺</span>
              </div>
              <span className="text-sm font-medium text-slate-200">TRY</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${tryStyles.badgeBg} ${tryStyles.badgeText}`}>
              {tryStyles.arrow} {Math.abs(cryptoChanges.try || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Turkish Lira</div>
          <div className="text-xl font-bold text-slate-100 font-mono mb-3">
            ₺{cryptoPrices.try.toFixed(2)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Al" : "Buy"}
            </button>
            <button className="px-3 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-semibold transition-all">
              {lang === "tr" ? "Sat" : "Sell"}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-5 gap-3">
        {/* Yatır / Add Funds */}
        <button
          onClick={() => setShowDeposit(true)}
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Yatır" : "Add Funds"}
          </span>
        </button>

        {/* Gönder / Transfer */}
        <button
          onClick={() => setShowTransfer(true)}
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Gönder" : "Transfer"}
          </span>
        </button>

        {/* Al / Receive */}
        <button
          onClick={() => setShowReceive(true)}
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Al" : "Receive"}
          </span>
        </button>

        {/* Dönüştür / Exchange */}
        <button
          onClick={() => setShowExchange(true)}
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-orange-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </span>
        </button>

        {/* Tahsis Et / Allocate - Link to Leasing */}
        <Link
          href="/leasing"
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
            <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Tahsis Et" : "Allocate"}
          </span>
        </Link>
      </div>

      {/* Ecosystem Description */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700">
        <p className="text-sm text-slate-300 leading-relaxed">
          {lang === "tr"
            ? "Auxite ekosistemindeki tüm tokenlar, temsil ettikleri metal türüne karşılık gelen fiziksel değer üzerine yapılandırılmıştır; ilgili varlıklar, dünya genelindeki yetkili ve denetimli depolama tesisleri üzerinden muhafaza edilir."
            : "All tokens in the Auxite ecosystem are structured on physical value corresponding to the metal type they represent; related assets are stored through authorized and audited storage facilities worldwide."}
        </p>
      </div>

      {/* Exchange Modal */}
      {showExchange && (
        <ExchangeModal 
          isOpen={showExchange}
          onClose={() => setShowExchange(false)}
          lang={lang}
        />
      )}

      {/* Deposit Modal - Select Method */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Yatırma Yöntemi Seçin" : "Select Deposit Method"}
              </h3>
              <button
                onClick={() => setShowDeposit(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {/* On-Chain Deposit */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  // TODO: On-Chain Deposit modal açılacak
                  alert(lang === "tr" ? "On-Chain Deposit yakında aktif olacak" : "On-Chain Deposit coming soon");
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">On-Chain Deposit</h4>
                  <p className="text-sm text-slate-400">
                    {lang === "tr" 
                      ? "Diğer borsalardan/cüzdanlardan kripto yatırın" 
                      : "Deposit crypto from other exchanges/wallets"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Deposit Fiat */}
              <button
                onClick={() => {
                  setShowDeposit(false);
                  // TODO: Deposit Fiat modal açılacak
                  alert(lang === "tr" ? "Fiat Yatırma yakında aktif olacak" : "Deposit Fiat coming soon");
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-semibold mb-1">
                    {lang === "tr" ? "Fiat Yatır" : "Deposit Fiat"}
                  </h4>
                  <p className="text-sm text-slate-400">
                    {lang === "tr" 
                      ? "SWIFT, kart, Apple/Google Pay ile USD/TRY yatırın" 
                      : "Deposit USD/TRY via SWIFT, card, Apple/Google Pay"}
                  </p>
                </div>
                <svg className="w-5 h-5 text-slate-500 flex-shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Gönder" : "Transfer"}
              </h3>
              <button
                onClick={() => setShowTransfer(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Token Selection */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Token" : "Token"}</label>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white">
                <option value="AUXG">AUXG - {lang === "tr" ? "Altın" : "Gold"}</option>
                <option value="AUXS">AUXS - {lang === "tr" ? "Gümüş" : "Silver"}</option>
                <option value="AUXPT">AUXPT - {lang === "tr" ? "Platin" : "Platinum"}</option>
                <option value="AUXPD">AUXPD - {lang === "tr" ? "Paladyum" : "Palladium"}</option>
                <option value="ETH">ETH - Ethereum</option>
                <option value="BTC">BTC - Bitcoin</option>
                <option value="USDT">USDT - Tether</option>
              </select>
            </div>

            {/* Recipient Address */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Alıcı Adresi" : "Recipient Address"}</label>
              <input
                type="text"
                placeholder="0x..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
              />
            </div>

            {/* Amount */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-400">{lang === "tr" ? "Miktar" : "Amount"}</label>
                <span className="text-xs text-slate-500">{lang === "tr" ? "Bakiye" : "Balance"}: 998,953.91 AUXG</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
                />
                <button className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-emerald-500 font-medium hover:bg-slate-700 transition-colors">
                  MAX
                </button>
              </div>
            </div>

            {/* Fee Info */}
            <div className="bg-slate-800/50 rounded-xl p-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{lang === "tr" ? "Ağ Ücreti" : "Network Fee"}</span>
                <span className="text-slate-300">~$0.50</span>
              </div>
            </div>

            <button className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">
              {lang === "tr" ? "Gönder" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Al" : "Receive"}
              </h3>
              <button
                onClick={() => setShowReceive(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-4">
              {lang === "tr" 
                ? "Bu adresi paylaşarak token alabilirsiniz." 
                : "Share this address to receive tokens."}
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
              <div className="w-40 h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-32 h-32" viewBox="0 0 100 100" fill="none">
                  <rect x="10" y="10" width="25" height="25" fill="#000"/>
                  <rect x="65" y="10" width="25" height="25" fill="#000"/>
                  <rect x="10" y="65" width="25" height="25" fill="#000"/>
                  <rect x="15" y="15" width="15" height="15" fill="#fff"/>
                  <rect x="70" y="15" width="15" height="15" fill="#fff"/>
                  <rect x="15" y="70" width="15" height="15" fill="#fff"/>
                  <rect x="20" y="20" width="5" height="5" fill="#000"/>
                  <rect x="75" y="20" width="5" height="5" fill="#000"/>
                  <rect x="20" y="75" width="5" height="5" fill="#000"/>
                  <rect x="40" y="40" width="20" height="20" fill="#000"/>
                  <rect x="45" y="45" width="10" height="10" fill="#fff"/>
                </svg>
              </div>
            </div>

            {/* Address */}
            <div className="bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}</p>
              <p className="text-sm text-slate-200 font-mono break-all">0xe6df1234567890abcdef1234567890abcdef3ba3</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0xe6df1234567890abcdef1234567890abcdef3ba3");
                }}
                className="py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-colors"
              >
                {lang === "tr" ? "Kopyala" : "Copy"}
              </button>
              <button className="py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors">
                {lang === "tr" ? "Paylaş" : "Share"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crypto Detail Modal (ETH/BTC) - New Component */}
      {showCryptoDetail && (
        <CryptoTradingDetailPage
          cryptoId={showCryptoDetail}
          onClose={() => setShowCryptoDetail(null)}
          lang={lang}
        />
      )}
    </div>
  );
}