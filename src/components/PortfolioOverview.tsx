"use client";
import React from "react";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { formatAmount, getDecimalPlaces } from '@/lib/format';
import { useLanguage } from "@/components/LanguageContext";

interface PortfolioOverviewProps {
  onExchangeClick?: () => void;
  walletAddress?: string;
  showActionButtons?: boolean;
  onMetalClick?: (metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD") => void;
  onCryptoClick?: (crypto: "ETH" | "BTC" | "XRP" | "SOL") => void;
}

const metalIcons: Record<string, string> = {
  AUXG: "/auxg_icon.png",
  AUXS: "/auxs_icon.png",
  AUXPT: "/auxpt_icon.png",
  AUXPD: "/auxpd_icon.png",
};

// Crypto icon components
const CryptoIcons: Record<string, React.ReactNode> = {
  ETH: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA"/>
      <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity=".6"/>
      <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff"/>
      <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity=".6"/>
      <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.379z" fill="#fff"/>
      <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="#fff" fillOpacity=".2"/>
      <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="#fff" fillOpacity=".6"/>
    </svg>
  ),
  BTC: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A"/>
      <path d="M22.5 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.7-.4-.7 2.6c-.4-.1-.9-.2-1.4-.3l.7-2.7-1.7-.4-.7 2.7c-.4-.1-.7-.2-1-.2v-.1l-2.3-.6-.4 1.8s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1h-.2l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.2.5c.4.1.8.2 1.2.3l-.7 2.8 1.7.4.7-2.7c.5.1.9.2 1.4.3l-.7 2.7 1.7.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4 1-5.1.7l.9-3.7c1.1.3 4.7.8 4.2 3zm.5-5.4c-.5 1.9-3.4.9-4.3.7l.8-3.4c.9.2 4 .6 3.5 2.7z" fill="#fff"/>
    </svg>
  ),
  XRP: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#23292F"/>
      <path d="M23.07 8h2.89l-6.01 5.87a5.52 5.52 0 01-7.9 0L6.04 8h2.89l4.54 4.44a3.28 3.28 0 004.06 0L23.07 8zM8.93 24H6.04l6.01-5.87a5.52 5.52 0 017.9 0L25.96 24h-2.89l-4.54-4.44a3.28 3.28 0 00-4.06 0L8.93 24z" fill="#fff"/>
    </svg>
  ),
  SOL: (
    <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="url(#sol-gradient)"/>
      <defs>
        <linearGradient id="sol-gradient" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#9945FF"/>
          <stop offset="100%" stopColor="#14F195"/>
        </linearGradient>
      </defs>
      <path d="M9.5 19.7a.65.65 0 01.46-.19h13.82c.29 0 .43.35.23.55l-2.47 2.47a.65.65 0 01-.46.19H7.26a.33.33 0 01-.23-.55l2.47-2.47zM9.5 9.19a.67.67 0 01.46-.19h13.82c.29 0 .43.35.23.55l-2.47 2.47a.65.65 0 01-.46.19H7.26a.33.33 0 01-.23-.55l2.47-2.47zM22.5 14.4a.65.65 0 00-.46-.19H8.22a.33.33 0 00-.23.55l2.47 2.47c.12.12.29.19.46.19h13.82c.29 0 .43-.35.23-.55l-2.47-2.47z" fill="#fff"/>
    </svg>
  ),
};

// ============================================
// LOCAL TRANSLATIONS (6 languages)
// ============================================
const translations = {
  tr: {
    totalPortfolioValue: "Toplam Portföy Değeri",
    approx: "yaklaşık",
    connectWalletPrompt: "Portföyünüzü görmek için cüzdanınızı bağlayın",
    auxmBalance: "Bakiyeniz",
    platformCurrency: "Platform Para Birimi",
    exchange: "Dönüştür",
    portfolioDetails: "Portföy Detayları",
    metalAssets: "Metal Varlıklar",
    cryptoAssets: "Kripto Varlıklar",
    ofPortfolio: "portföy",
    details: "Detaylar",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
  },
  en: {
    totalPortfolioValue: "Total Portfolio Value",
    approx: "approx.",
    connectWalletPrompt: "Connect your wallet to view your portfolio",
    auxmBalance: "Balance",
    platformCurrency: "Platform Currency",
    exchange: "Exchange",
    portfolioDetails: "Portfolio Details",
    metalAssets: "Metal Assets",
    cryptoAssets: "Crypto Assets",
    ofPortfolio: "of portfolio",
    details: "Details",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
  },
  de: {
    totalPortfolioValue: "Gesamtwert des Portfolios",
    approx: "ungefähr",
    connectWalletPrompt: "Verbinden Sie Ihre Wallet, um Ihr Portfolio anzuzeigen",
    auxmBalance: "Guthaben",
    platformCurrency: "Plattformwährung",
    exchange: "Tauschen",
    portfolioDetails: "Portfolio-Details",
    metalAssets: "Metallvermögen",
    cryptoAssets: "Krypto-Vermögen",
    ofPortfolio: "des Portfolios",
    details: "Details",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
  },
  fr: {
    totalPortfolioValue: "Valeur Totale du Portefeuille",
    approx: "environ",
    connectWalletPrompt: "Connectez votre portefeuille pour voir votre portefeuille",
    auxmBalance: "Solde",
    platformCurrency: "Monnaie de la Plateforme",
    exchange: "Échanger",
    portfolioDetails: "Détails du Portefeuille",
    metalAssets: "Actifs Métalliques",
    cryptoAssets: "Actifs Crypto",
    ofPortfolio: "du portefeuille",
    details: "Détails",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
  },
  ar: {
    totalPortfolioValue: "إجمالي قيمة المحفظة",
    approx: "تقريباً",
    connectWalletPrompt: "اربط محفظتك لعرض محفظتك",
    auxmBalance: "الرصيد",
    platformCurrency: "عملة المنصة",
    exchange: "تبادل",
    portfolioDetails: "تفاصيل المحفظة",
    metalAssets: "أصول المعادن",
    cryptoAssets: "أصول العملات المشفرة",
    ofPortfolio: "من المحفظة",
    details: "التفاصيل",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
  },
  ru: {
    totalPortfolioValue: "Общая Стоимость Портфеля",
    approx: "примерно",
    connectWalletPrompt: "Подключите кошелек для просмотра портфеля",
    auxmBalance: "Баланс",
    platformCurrency: "Валюта Платформы",
    exchange: "Обмен",
    portfolioDetails: "Детали Портфеля",
    metalAssets: "Металлические Активы",
    cryptoAssets: "Крипто Активы",
    ofPortfolio: "портфеля",
    details: "Детали",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
  },
};

export function PortfolioOverview({
  onExchangeClick,
  walletAddress,
  showActionButtons = true,
  onMetalClick,
  onCryptoClick,
}: PortfolioOverviewProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { address, isConnected } = useAccount();
  const { balances, isLoading: balancesLoading } = useTokenBalances();
  const { prices, loading: pricesLoading } = useMetalsPrices();
  const { prices: cryptoPrices, changes: cryptoChanges } = useCryptoPrices();

  // Use provided walletAddress or connected address
  const displayAddress = walletAddress || address;

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const isLoading = balancesLoading || pricesLoading;

  // Get real changes from API
  const { changes: metalChanges } = useMetalsPrices();

  // Calculate metal holdings
  const metalHoldings = Object.entries(balances).map(([metal, balance]) => {
    const balanceNum = parseFloat(balance);
    const price = prices[metal] || 0;
    const value = balanceNum * price;
    const change = metalChanges[metal] || 0;
    
    return {
      symbol: metal,
      name: metal === "AUXG" ? t("gold") : metal === "AUXS" ? t("silver") : metal === "AUXPT" ? t("platinum") : t("palladium"),
      balance: balanceNum,
      balanceKg: balanceNum / 1000,
      price,
      value,
      change,
      icon: metalIcons[metal],
      type: "metal" as const,
    };
  });

  // Crypto holdings
  const ethBalanceNum = ethBalance ? parseFloat(ethBalance.formatted) : 0;
  const ethValue = ethBalanceNum * (cryptoPrices?.eth || 0);

  const cryptoHoldings = [
    {
      symbol: "ETH",
      name: "Ethereum",
      balance: ethBalanceNum,
      price: cryptoPrices?.eth || 0,
      value: ethValue,
      change: cryptoChanges?.eth || 0,
      type: "crypto" as const,
    },
    {
      symbol: "BTC",
      name: "Bitcoin",
      balance: 0,
      price: cryptoPrices?.btc || 0,
      value: 0,
      change: cryptoChanges?.btc || 0,
      type: "crypto" as const,
    },
    {
      symbol: "XRP",
      name: "Ripple",
      balance: 0,
      price: cryptoPrices?.xrp || 0,
      value: 0,
      change: cryptoChanges?.xrp || 0,
      type: "crypto" as const,
    },
    {
      symbol: "SOL",
      name: "Solana",
      balance: 0,
      price: cryptoPrices?.sol || 0,
      value: 0,
      change: cryptoChanges?.sol || 0,
      type: "crypto" as const,
    },
  ];

  // Calculate totals
  const metalTotal = metalHoldings.reduce((sum, h) => sum + h.value, 0);
  const cryptoTotal = cryptoHoldings.reduce((sum, h) => sum + h.value, 0);
  const totalValue = metalTotal + cryptoTotal;

  if (!mounted || isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3"></div>
          <div className="h-16 bg-slate-800 rounded"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected && !walletAddress) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💼</div>
          <p className="text-slate-400 text-sm">
            {t("connectWalletPrompt")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total Value Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="text-sm text-slate-400 mb-1">
          {t("totalPortfolioValue")}{" "}
          <span className="text-slate-500">({t("approx")})</span>
        </div>
        <div className="text-3xl font-bold text-slate-100">
          ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-sm text-slate-400 ml-2 font-normal">USDT</span>
        </div>
      </div>

      {/* AUXM Balance - Platform Currency */}
      <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30">
              ◈
            </div>
            <div>
              <div className="text-xs text-purple-300">AUXM {t("auxmBalance")}</div>
              <div className="font-bold text-white text-lg">5,000.00 AUXM</div>
              <div className="text-xs text-slate-500">{t("platformCurrency")}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-slate-300">≈ $5,000</div>
              <div className="text-xs text-[#2F6F62]">1 AUXM = 1 USD</div>
            </div>
            <button 
              onClick={onExchangeClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-[#BFA181] hover:from-orange-400 hover:to-[#BFA181] text-white text-sm font-medium transition-all shadow-lg shadow-orange-500/20"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              {t("exchange")}
            </button>
          </div>
        </div>
      </div>

      {/* Metal Assets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metalHoldings.map((holding) => (
          <div
            key={holding.symbol}
            onClick={() => onMetalClick?.(holding.symbol as "AUXG" | "AUXS" | "AUXPT" | "AUXPD")}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 cursor-pointer hover:border-slate-600 hover:bg-slate-800/50 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <img src={holding.icon} alt={holding.symbol} className="w-5 h-5" />
                <span className="text-sm font-medium text-slate-200">{holding.symbol}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                holding.change >= 0 
                  ? "bg-[#2F6F62]/20 text-[#2F6F62]" 
                  : "bg-red-500/20 text-red-400"
              }`}>
                {holding.change >= 0 ? "↑" : "↓"} {Math.abs(holding.change).toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-2">{holding.name}</div>
            <div className="text-xl font-bold text-slate-100">
              {formatAmount(holding.balance, holding.symbol)}g
            </div>
            <div className="text-xs text-slate-500">
              {holding.balanceKg.toFixed(3)} kg
            </div>
            <div className="text-sm text-slate-300 mt-2">
              ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500">
              ${holding.price.toFixed(2)}/g
            </div>
          </div>
        ))}
      </div>

      {/* Crypto Assets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cryptoHoldings.map((holding) => (
          <div
            key={holding.symbol}
            onClick={() => onCryptoClick?.(holding.symbol as "ETH" | "BTC" | "XRP" | "SOL")}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 cursor-pointer hover:border-slate-600 hover:bg-slate-800/50 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {CryptoIcons[holding.symbol]}
                <span className="text-sm font-medium text-slate-200">{holding.symbol}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                holding.change >= 0
                  ? "bg-[#2F6F62]/20 text-[#2F6F62]"
                  : "bg-red-500/20 text-red-400"
              }`}>
                {holding.change >= 0 ? "↑" : "↓"} {Math.abs(holding.change).toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-slate-500 mb-2">{holding.name}</div>
            <div className="text-xl font-bold text-slate-100">
              {formatAmount(holding.balance, holding.symbol)}
            </div>
            <div className="text-xs text-slate-500">
              {holding.symbol}
            </div>
            <div className="text-sm text-slate-300 mt-2">
              ${holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div className="text-xs text-slate-500">
              ${holding.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>

      {/* Details Panel (conditionally shown) */}
      {showDetails && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">
            {t("portfolioDetails")}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">
                {t("metalAssets")}
              </div>
              <div className="text-xl font-bold text-[#BFA181]">
                ${metalTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totalValue > 0 ? ((metalTotal / totalValue) * 100).toFixed(1) : '0'}% {t("ofPortfolio")}
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">
                {t("cryptoAssets")}
              </div>
              <div className="text-xl font-bold text-blue-400">
                ${cryptoTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {totalValue > 0 ? ((cryptoTotal / totalValue) * 100).toFixed(1) : '0'}% {t("ofPortfolio")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Only show if showActionButtons is true */}
      {showActionButtons && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onExchangeClick}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {t("exchange")}
          </button>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors border border-slate-700"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t("details")}
          </button>
        </div>
      )}
    </div>
  );
}

export default PortfolioOverview;