"use client";
import { DepositAddressModal } from "@/components/DepositAddressModal";
import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import MetalPriceCard from "./MetalPriceCard";
import { ExchangeModal } from "./ExchangeModal";
import { BuyMetalModal } from "./BuyMetalModal";
import CryptoTradingDetailPage from "./CryptoTradingDetailPage";
import { CryptoConvertModal } from "./CryptoConvertModal";
import { DynamicBanner } from "./DynamicBanner";
import { TransferModal } from "@/components/TransferModal";
import { useLanguage } from "@/components/LanguageContext";
import { AddFundsModal } from "@/components/AddFundsModal";

// Metal icon mapping
const metalIcons: Record<string, string> = {
  AUXG: "/auxg_icon.png",
  AUXS: "/auxs_icon.png",
  AUXPT: "/auxpt_icon.png",
  AUXPD: "/auxpd_icon.png",
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
    memo: "123456"
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
      badgeBg: "bg-[#2F6F62]/20",
      badgeText: "text-[#2F6F62]",
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

// Props artık gerekli değil - useLanguage hook'u kullanılıyor
export default function MetalPriceGrid() {
  const { t, lang } = useLanguage();
  const { address } = useAccount();
  const { basePrices, prices, bidPrices, directions, changes, loading } = useMetalsPrices();
  const { prices: cryptoPrices, changes: cryptoChanges, directions: cryptoDirections, loading: cryptoLoading } = useCryptoPrices();
  const [showExchange, setShowExchange] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsDefaultTab, setAddFundsDefaultTab] = useState<"crypto" | "card" | "bank">("crypto");
  // Keep old states for backward compatibility - will be removed later
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
  const [moonpayNotice, setMoonpayNotice] = useState(false);

  // Wallet address - from useAccount or localStorage
  const walletAddress = address || localStorage.getItem("auxite_wallet_address") || "";
  
  // Deposit coins list
  const depositCoins = [
    { id: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
    { id: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
    { id: "XRP", name: "Ripple", icon: "✕", color: "#23292F" },
    { id: "SOL", name: "Solana", icon: "◎", color: "#9945FF" },
    { id: "USDT", name: "Tether", icon: "₮", color: "#26A17B" },
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
            className="rounded-xl border border-stone-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 animate-pulse"
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
      <DynamicBanner />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            {lang === "tr" ? "Fiyatlar" : "Prices"}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {lang === "tr"
              ? "Canlı metal ve kripto fiyatları"
              : "Live metal and crypto prices"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>{lang === "tr" ? "Canlı" : "Live"}</span>
          </div>
        </div>
      </div>

      {/* Metal Price Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metals.map((metal) => {
          const basePrice = basePrices[metal.priceKey];
          const askPrice = prices[metal.priceKey];
          const bidPrice = bidPrices[metal.priceKey];
          const direction = directions[metal.priceKey];
          const change = changes[metal.priceKey];

          if (!basePrice || typeof basePrice !== "number") {
            return null;
          }

          const metalName = lang === "tr" 
            ? `Auxite ${metal.priceKey === "AUXG" ? "Altın" : metal.priceKey === "AUXS" ? "Gümüş" : metal.priceKey === "AUXPT" ? "Platin" : "Paladyum"}`
            : `Auxite ${metal.priceKey === "AUXG" ? "Gold" : metal.priceKey === "AUXS" ? "Silver" : metal.priceKey === "AUXPT" ? "Platinum" : "Palladium"}`;

          return (
            <MetalPriceCard
              key={metal.id}
              metalId={metal.id}
              symbol={metal.symbol}
              name={metalName}
              basePrice={basePrice}
              askPrice={askPrice}
              bidPrice={bidPrice}
              change24h={change || 0}
              direction={direction || "neutral"}
              icon={metal.icon}
              lang={lang}
            />
          );
        })}
      </div>

      {/* Crypto Price Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* ETH */}
        <div 
          className="rounded-xl border border-stone-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-2.5 sm:p-4 hover:border-stone-400 dark:hover:border-slate-600 cursor-pointer transition-all flex flex-col"
          onClick={() => setShowCryptoDetail("ETH")}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/>
                  <path d="M12 18.5l-6.5-4.5L12 22.5l6.5-8.5L12 18.5z" fillOpacity="0.6"/>
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">ETH</span>
            </div>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${ethStyles.badgeBg} ${ethStyles.badgeText}`}>
              {ethStyles.arrow} {Math.abs(cryptoChanges.eth).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Ethereum</div>
          <div className={`text-base sm:text-xl font-bold font-mono mb-2 sm:mb-3 transition-colors duration-300 ${cryptoDirections.eth === "up" ? "text-[#2F6F62]" : cryptoDirections.eth === "down" ? "text-red-400" : "text-slate-800 dark:text-slate-100"}`}>
            ${cryptoPrices.eth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("ETH"); }}
            className="w-full px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-auto"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
        </div>

        {/* BTC */}
        <div 
          className="rounded-xl border border-stone-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-2.5 sm:p-4 hover:border-stone-400 dark:hover:border-slate-600 cursor-pointer transition-all flex flex-col"
          onClick={() => setShowCryptoDetail("BTC")}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 rounded-full bg-[#F7931A] flex items-center justify-center">
                <span className="text-white text-xs font-bold">₿</span>
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">BTC</span>
            </div>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${btcStyles.badgeBg} ${btcStyles.badgeText}`}>
              {btcStyles.arrow} {Math.abs(cryptoChanges.btc).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Bitcoin</div>
          <div className={`text-base sm:text-xl font-bold font-mono mb-2 sm:mb-3 transition-colors duration-300 ${cryptoDirections.btc === "up" ? "text-[#2F6F62]" : cryptoDirections.btc === "down" ? "text-red-400" : "text-slate-800 dark:text-slate-100"}`}>
            ${cryptoPrices.btc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("BTC"); }}
            className="w-full px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-auto"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
        </div>

        {/* XRP */}
        <div 
          className="rounded-xl border border-stone-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-2.5 sm:p-4 hover:border-stone-400 dark:hover:border-slate-600 cursor-pointer transition-all flex flex-col"
          onClick={() => setShowCryptoDetail("XRP")}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 rounded-full bg-[#23292F] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M12 0L4 6l8 6 8-6-8-6zM4 18l8 6 8-6-8-6-8 6z"/>
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">XRP</span>
            </div>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${xrpStyles.badgeBg} ${xrpStyles.badgeText}`}>
              {xrpStyles.arrow} {Math.abs(cryptoChanges.xrp || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Ripple</div>
          <div className={`text-base sm:text-xl font-bold font-mono mb-2 sm:mb-3 transition-colors duration-300 ${cryptoDirections.xrp === "up" ? "text-[#2F6F62]" : cryptoDirections.xrp === "down" ? "text-red-400" : "text-slate-800 dark:text-slate-100"}`}>
            ${(cryptoPrices.xrp || 2.20).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("XRP"); }}
            className="w-full px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-auto"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
        </div>

        {/* SOL */}
        <div 
          className="rounded-xl border border-stone-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-2.5 sm:p-4 hover:border-stone-400 dark:hover:border-slate-600 cursor-pointer transition-all flex flex-col"
          onClick={() => setShowCryptoDetail("SOL")}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white">
                  <path d="M4 17.5l3.5-3.5H20l-3.5 3.5H4zM4 6.5l3.5 3.5H20l-3.5-3.5H4zM4 12h16"/>
                </svg>
              </div>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">SOL</span>
            </div>
            <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${solStyles.badgeBg} ${solStyles.badgeText}`}>
              {solStyles.arrow} {Math.abs(cryptoChanges.sol || 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">Solana</div>
          <div className={`text-base sm:text-xl font-bold font-mono mb-2 sm:mb-3 transition-colors duration-300 ${cryptoDirections.sol === "up" ? "text-[#2F6F62]" : cryptoDirections.sol === "down" ? "text-red-400" : "text-slate-800 dark:text-slate-100"}`}>
            ${(cryptoPrices.sol || 235).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowCryptoConvert("SOL"); }}
            className="w-full px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:from-blue-700 active:to-indigo-800 text-white text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 mt-auto"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </button>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {/* Yatır / Add Funds */}
        <button
          onClick={() => {
            setAddFundsDefaultTab("crypto");
            setShowAddFunds(true);
          }}
          className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-[#2F6F62] transition-all group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center group-hover:bg-[#2F6F62]/30 transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
            {lang === "tr" ? "Yatır" : "Add Funds"}
          </span>
        </button>

        {/* Gönder / Transfer */}
        <button
          onClick={() => setShowTransfer(true)}
          className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-blue-500 transition-all group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
            {lang === "tr" ? "Gönder" : "Transfer"}
          </span>
        </button>

        {/* Hızlı Al / Quick Buy */}
        <button
          onClick={() => setShowBuyMetal(true)}
          className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-purple-500 transition-all group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
            {lang === "tr" ? "Hızlı Al" : "Quick Buy"}
          </span>
        </button>

        {/* Dönüştür / Exchange */}
        <button
          onClick={() => setShowExchange(true)}
          className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-orange-500 transition-all group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500/30 transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
            {lang === "tr" ? "Dönüştür" : "Exchange"}
          </span>
        </button>

        {/* Kazan / Earn */}
        <Link
          href="/stake"
          className="flex flex-col items-center gap-1 sm:gap-2 px-1 sm:px-4 py-2 sm:py-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 hover:border-[#BFA181] transition-all group"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#BFA181]/20 flex items-center justify-center group-hover:bg-[#BFA181]/30 transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-[10px] sm:text-sm font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-center leading-tight">
            {lang === "tr" ? "Biriktir" : "Stake"}
          </span>
        </Link>
      </div>

      {/* Ecosystem Description */}
      <div className="p-3 sm:p-4 rounded-xl bg-stone-100 dark:bg-slate-800/30 border border-stone-200 dark:border-slate-700">
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
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
        />
      )}

      {/* Add Funds Modal - Unified Crypto + Card */}
      {showAddFunds && (
        <AddFundsModal
          isOpen={showAddFunds}
          onClose={() => setShowAddFunds(false)}
          lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
          walletAddress={walletAddress}
          defaultTab={addFundsDefaultTab}
          bankOnly={addFundsDefaultTab === "bank"}
        />
      )}

      {/* Fiat Deposit Modal */}
      {showFiatDeposit && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-stone-300 dark:border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                  {lang === "tr" ? "Fiat Yatır" : "Deposit Fiat"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === "tr" ? "USD veya TRY yatırın" : "Deposit USD or TRY"}
                </p>
              </div>
              <button
                onClick={() => setShowFiatDeposit(false)}
                className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3">
              {/* MoonPay */}
              <button
                onClick={() => {
                  setMoonpayNotice(true);
                  setTimeout(() => setMoonpayNotice(false), 3000);
                }}
                className="w-full p-4 rounded-xl border border-stone-300 dark:border-slate-700 hover:border-purple-500/50 bg-stone-50 dark:bg-transparent hover:bg-purple-50 dark:hover:bg-slate-800/50 transition-all text-left flex items-start gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-slate-800 dark:text-white font-semibold text-sm">MoonPay</h4>
                    <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      {lang === "tr" ? "Anında" : "Instant"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span>Min: $30</span>
                    <span>•</span>
                    <span>{lang === "tr" ? "Anında" : "Instant"}</span>
                    <span>•</span>
                    <span className="text-[#BFA181] dark:text-[#BFA181]">3.5%</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-purple-500 dark:group-hover:text-purple-400 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {/* MoonPay Coming Soon Notice */}
              {moonpayNotice && (
                <div className="mt-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-center">
                  <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    {lang === "tr" ? "MoonPay yakında aktif olacak" : "MoonPay coming soon"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* On-Chain Deposit - Select Coin Modal */}
      {showOnChainDeposit && !selectedDepositCoin && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl border-t sm:border border-stone-300 dark:border-slate-700 w-full sm:max-w-md p-6 max-h-[80vh] overflow-y-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {lang === "tr" ? "Coin Seç" : "Select Coin"}
              </h3>
              <button
                onClick={() => setShowOnChainDeposit(false)}
                className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={lang === "tr" ? "Coin Ara" : "Search Coins"}
                value={depositSearchQuery}
                onChange={(e) => setDepositSearchQuery(e.target.value)}
                className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-stone-400 dark:focus:border-slate-600"
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
                  className="w-full flex items-center gap-4 p-3 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-stone-400 dark:hover:border-slate-600 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-all"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: coin.color }}
                  >
                    {coin.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-slate-800 dark:text-white font-semibold">{coin.id}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{coin.name}</div>
                  </div>
                  <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* Deposit Address Modal */}
      {selectedDepositCoin && (
        <DepositAddressModal
          isOpen={!!selectedDepositCoin}
          onClose={() => {
            setSelectedDepositCoin(null);
            setShowOnChainDeposit(false);
          }}
          coin={selectedDepositCoin}
          lang={lang}
        />
      )}

      {/* Transfer Modal */}
      <TransferModal 
        isOpen={showTransfer} 
        onClose={() => setShowTransfer(false)} 
        lang={lang} 
      />

      {/* Receive Modal */}
      {showReceive && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {lang === "tr" ? "Al" : "Receive"}
              </h3>
              <button
                onClick={() => setShowReceive(false)}
                className="p-2 hover:bg-stone-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {lang === "tr" 
                ? "Bu adresi paylaşarak token alabilirsiniz." 
                : "Share this address to receive tokens."}
            </p>

            {/* QR Code */}
            <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center border border-stone-200 dark:border-transparent">
              <div className="w-40 h-40 flex items-center justify-center">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=0xe6df1234567890abcdef1234567890abcdef3ba3"
                  alt="QR Code"
                  className="w-40 h-40"
                />
              </div>
            </div>

            {/* Address */}
            <div className="bg-stone-100 dark:bg-slate-800 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-500 mb-1">{lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-mono break-all">0xe6df1234567890abcdef1234567890abcdef3ba3</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText("0xe6df1234567890abcdef1234567890abcdef3ba3");
                }}
                className="py-3 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-medium transition-colors"
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
