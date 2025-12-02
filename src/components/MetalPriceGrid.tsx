"use client";
import { useState } from "react";
import Link from "next/link";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import MetalPriceCard from "./MetalPriceCard";
import { ExchangeModal } from "./ExchangeModal";
import { BuyMetalModal } from "./BuyMetalModal";
import CryptoTradingDetailPage from "./CryptoTradingDetailPage";
import { CryptoConvertModal } from "./CryptoConvertModal";
import { CampaignBanner } from "./CampaignBanner";

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

// Deposit adresleri
const DEPOSIT_ADDRESSES: Record<string, { address: string; network: string; memo?: string }> = {
  BTC: { 
    address: "1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume", 
    network: "Bitcoin" 
  },
  ETH: { 
    address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", 
    network: "Ethereum / Base" 
  },
  XRP: { 
    address: "r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae", 
    network: "XRP Ledger",
    memo: "123456" // Destination Tag
  },
  SOL: { 
    address: "6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe", 
    network: "Solana" 
  },
};

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
  const [showOnChainDeposit, setShowOnChainDeposit] = useState(false);
  const [showFiatDeposit, setShowFiatDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showBuyMetal, setShowBuyMetal] = useState(false);
  const [showCryptoDetail, setShowCryptoDetail] = useState<"ETH" | "BTC" | "XRP" | "SOL" | null>(null);
  const [showCryptoConvert, setShowCryptoConvert] = useState<"ETH" | "BTC" | "XRP" | "SOL" | null>(null);
  const [depositSearchQuery, setDepositSearchQuery] = useState("");
  
  // Deposit Address Modal State
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Demo wallet address
  const walletAddress = "0xe6df...3ba3";
  
  // Deposit coins list
  const depositCoins = [
    { id: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
    { id: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
    { id: "XRP", name: "Ripple", icon: "✕", color: "#23292F" },
    { id: "SOL", name: "Solana", icon: "◎", color: "#9945FF" },
  ];
  
  const filteredDepositCoins = depositCoins.filter(coin => 
    coin.id.toLowerCase().includes(depositSearchQuery.toLowerCase()) ||
    coin.name.toLowerCase().includes(depositSearchQuery.toLowerCase())
  );

  // Copy address function
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

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
  const xrpStyles = getDirectionStyles(cryptoChanges.xrp || 0);
  const solStyles = getDirectionStyles(cryptoChanges.sol || 0);

  return (
    <div className="space-y-4">
      {/* Campaign Banner */}
      <CampaignBanner lang={lang} variant="full" />

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
              metalId={(() => {
                const auxToMetal: Record<string, "gold" | "silver" | "platinum" | "palladium"> = {
                  AUXG: "gold", AUXS: "silver", AUXPT: "platinum", AUXPD: "palladium"
                };
                return auxToMetal[metal.symbol] || "gold";
              })()}
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
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("ETH"); }}
            className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
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
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("BTC"); }}
            className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
        </div>

        {/* XRP */}
        <div 
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => setShowCryptoDetail("XRP")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[#23292F] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0L4 6l8 6 8-6-8-6zM4 18l8 6 8-6-8-6-8 6z"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-200">XRP</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${xrpStyles.badgeBg} ${xrpStyles.badgeText}`}>
              {xrpStyles.arrow} {Math.abs(cryptoChanges.xrp || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Ripple</div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{lang === "tr" ? "Alış/Satış" : "Ask/Bid"}</span>
            <span className="font-mono">${(cryptoPrices.xrp || 2.20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`text-xl font-bold font-mono mb-3 transition-colors duration-300 ${cryptoDirections.xrp === "up" ? "text-emerald-400" : cryptoDirections.xrp === "down" ? "text-red-400" : "text-slate-100"}`}>
            ${(cryptoPrices.xrp || 2.20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("XRP"); }}
            className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
        </div>

        {/* SOL */}
        <div 
          className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 cursor-pointer transition-all"
          onClick={() => setShowCryptoDetail("SOL")}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M4 17.5l3.5-3.5H20l-3.5 3.5H4zM4 6.5l3.5 3.5H20l-3.5-3.5H4zM4 12h16"/>
                </svg>
              </div>
              <span className="text-sm font-medium text-slate-200">SOL</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${solStyles.badgeBg} ${solStyles.badgeText}`}>
              {solStyles.arrow} {Math.abs(cryptoChanges.sol || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-slate-500 mb-1">Solana</div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{lang === "tr" ? "Alış/Satış" : "Ask/Bid"}</span>
            <span className="font-mono">${(cryptoPrices.sol || 235).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className={`text-xl font-bold font-mono mb-3 transition-colors duration-300 ${cryptoDirections.sol === "up" ? "text-emerald-400" : cryptoDirections.sol === "down" ? "text-red-400" : "text-slate-100"}`}>
            ${(cryptoPrices.sol || 235).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("SOL"); }}
            className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
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

        {/* Hızlı Al / Quick Buy */}
        <button
          onClick={() => setShowBuyMetal(true)}
          className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-purple-500 transition-all group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
            {lang === "tr" ? "Hızlı Al" : "Quick Buy"}
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

      {/* Buy Metal Modal (Hızlı Al) */}
      {showBuyMetal && (
        <BuyMetalModal
          isOpen={showBuyMetal}
          onClose={() => setShowBuyMetal(false)}
          lang={lang}
          metalPrices={{
            AUXG: prices.AUXG || 139.31,
            AUXS: prices.AUXS || 1.79,
            AUXPT: prices.AUXPT || 54.14,
            AUXPD: prices.AUXPD || 48.16,
          }}
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
                  setShowOnChainDeposit(true);
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
                  setShowFiatDeposit(true);
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

      {/* Fiat Deposit Modal */}
      {showFiatDeposit && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {lang === "tr" ? "Fiat Yatır" : "Deposit Fiat"}
                </h3>
                <p className="text-xs text-slate-400">
                  {lang === "tr" ? "USD veya TRY yatırın" : "Deposit USD or TRY"}
                </p>
              </div>
              <button
                onClick={() => setShowFiatDeposit(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3">
              {/* SWIFT Transfer */}
              <button
                onClick={() => {
                  alert(lang === "tr" ? "SWIFT Transfer yakında aktif olacak" : "SWIFT Transfer coming soon");
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold text-sm">SWIFT Transfer</h4>
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {lang === "tr" ? "Banka" : "Bank"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Min: $100</span>
                    <span>•</span>
                    <span>1-3 {lang === "tr" ? "gün" : "days"}</span>
                    <span>•</span>
                    <span className="text-emerald-500">{lang === "tr" ? "Ücretsiz" : "Free"}</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* MoonPay */}
              <button
                onClick={() => {
                  alert(lang === "tr" ? "MoonPay yakında aktif olacak" : "MoonPay coming soon");
                }}
                className="w-full p-4 rounded-xl border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-white font-semibold text-sm">MoonPay</h4>
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      {lang === "tr" ? "Anında" : "Instant"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Min: $30</span>
                    <span>•</span>
                    <span>{lang === "tr" ? "Anında" : "Instant"}</span>
                    <span>•</span>
                    <span className="text-amber-500">3.5%</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-500 group-hover:text-purple-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Chain Deposit - Select Coin Modal */}
      {showOnChainDeposit && !selectedDepositCoin && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Coin Seç" : "Select Coin"}
              </h3>
              <button
                onClick={() => setShowOnChainDeposit(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={lang === "tr" ? "Coin Ara" : "Search Coins"}
                value={depositSearchQuery}
                onChange={(e) => setDepositSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>

            {/* Coin List */}
            <div className="space-y-2">
              {filteredDepositCoins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    setSelectedDepositCoin(coin.id);
                  }}
                  className="w-full flex items-center gap-4 p-3 rounded-xl border border-slate-700 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: coin.color }}
                  >
                    {coin.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{coin.id}</div>
                    <div className="text-sm text-slate-400">{coin.name}</div>
                  </div>
                  <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deposit Address Modal - Minimal */}
      {selectedDepositCoin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <button
                onClick={() => setSelectedDepositCoin(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-bold text-white">
                {lang === "tr" ? `${selectedDepositCoin} Yatır` : `Deposit ${selectedDepositCoin}`}
              </h2>
              <button
                onClick={() => {
                  setSelectedDepositCoin(null);
                  setShowOnChainDeposit(false);
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* QR Code - Real */}
              <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
                <div className="w-40 h-40 flex items-center justify-center">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(DEPOSIT_ADDRESSES[selectedDepositCoin]?.address || '')}`}
                    alt="QR Code"
                    className="w-40 h-40"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="bg-slate-800 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-400 text-xs">{lang === "tr" ? "Adres" : "Address"}</span>
                  <button
                    onClick={() => copyAddress(DEPOSIT_ADDRESSES[selectedDepositCoin]?.address || "")}
                    className="text-emerald-500 text-xs font-medium hover:text-emerald-400 transition-colors"
                  >
                    {copied ? "✓" : (lang === "tr" ? "Kopyala" : "Copy")}
                  </button>
                </div>
                <p className="text-white font-mono text-xs break-all select-all">
                  {DEPOSIT_ADDRESSES[selectedDepositCoin]?.address}
                </p>
              </div>

              {/* Memo/Tag (for XRP only) */}
              {DEPOSIT_ADDRESSES[selectedDepositCoin]?.memo && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 text-sm font-medium">Destination Tag</span>
                    <span className="text-white font-mono font-bold">{DEPOSIT_ADDRESSES[selectedDepositCoin]?.memo}</span>
                  </div>
                  <p className="text-xs text-amber-400/70 mt-1">
                    {lang === "tr" ? "Tag olmadan gönderim yapmayın!" : "Required for deposit!"}
                  </p>
                </div>
              )}

              {/* AUXM Info - Compact */}
              <div className="bg-emerald-500/10 rounded-xl p-3 mb-4">
                <p className="text-xs text-emerald-400">
                  {lang === "tr" 
                    ? `${selectedDepositCoin} → AUXM (1 AUXM = 1 USD) otomatik dönüşüm`
                    : `${selectedDepositCoin} → AUXM (1 AUXM = 1 USD) auto conversion`}
                </p>
              </div>

              {/* Done Button */}
              <button
                onClick={() => {
                  setSelectedDepositCoin(null);
                  setShowOnChainDeposit(false);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
              >
                {lang === "tr" ? "Tamam" : "Done"}
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
                <option value="XRP">XRP - Ripple</option>
                <option value="SOL">SOL - Solana</option>
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
              <div className="w-40 h-40 flex items-center justify-center">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=0xe6df1234567890abcdef1234567890abcdef3ba3"
                  alt="QR Code"
                  className="w-40 h-40"
                />
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

      {/* Crypto Detail Modal (ETH/BTC/XRP/SOL) */}
      {showCryptoDetail && (
        <CryptoTradingDetailPage
          cryptoId={showCryptoDetail}
          onClose={() => setShowCryptoDetail(null)}
          lang={lang}
          cryptoBalances={{
            ETH: 0,
            BTC: 0,
            XRP: 0,
            SOL: 0,
          }}
          metalBidPrices={{
            AUXG: bidPrices.AUXG || 134.69,
            AUXS: bidPrices.AUXS || 1.82,
            AUXPT: bidPrices.AUXPT || 52.92,
            AUXPD: bidPrices.AUXPD || 45.57,
          }}
        />
      )}

      {/* Crypto Convert Modal (ETH/BTC/XRP/SOL → AUXM/Metal) */}
      {showCryptoConvert && (
        <CryptoConvertModal
          isOpen={!!showCryptoConvert}
          onClose={() => setShowCryptoConvert(null)}
          crypto={showCryptoConvert}
          lang={lang}
          cryptoBalances={{
            ETH: 0,
            BTC: 0,
            XRP: 0,
            SOL: 0,
          }}
          cryptoPrices={{
            ETH: cryptoPrices.eth,
            BTC: cryptoPrices.btc,
            XRP: cryptoPrices.xrp || 2.20,
            SOL: cryptoPrices.sol || 235,
          }}
          metalBidPrices={{
            AUXG: bidPrices.AUXG || 134.69,
            AUXS: bidPrices.AUXS || 1.82,
            AUXPT: bidPrices.AUXPT || 52.92,
            AUXPD: bidPrices.AUXPD || 45.57,
          }}
        />
      )}
    </div>
  );
}
