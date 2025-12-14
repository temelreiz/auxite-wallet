"use client";

import { useState, useEffect, useRef } from "react";
import TradePanel from "./TradePanel";
import TradingDetailPage from "./TradingDetailPage";

interface MetalPriceCardProps {
  metalId: "gold" | "silver" | "platinum" | "palladium";
  symbol: string;
  name: string;
  basePrice: number;      // Spread'siz ham fiyat (kartlarda gösterilecek)
  askPrice: number;       // Spread'li satış fiyatı (kullanıcıya satış)
  bidPrice: number;       // Spread'li alış fiyatı (kullanıcıdan alış)
  change24h: number;
  direction: "up" | "down" | "neutral";
  icon?: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

export default function MetalPriceCard({
  metalId,
  symbol,
  name,
  basePrice,
  askPrice,
  bidPrice,
  change24h,
  direction,
  icon,
  lang = "en",
}: MetalPriceCardProps) {
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [showTradingDetail, setShowTradingDetail] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  
  // Önceki fiyatı sakla ve karşılaştır
  const prevPriceRef = useRef<number>(basePrice);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");
  
  useEffect(() => {
    if (basePrice > prevPriceRef.current) {
      setPriceDirection("up");
    } else if (basePrice < prevPriceRef.current) {
      setPriceDirection("down");
    } else {
      setPriceDirection("neutral");
    }
    prevPriceRef.current = basePrice;
  }, [basePrice]);
  
  const [capturedValues, setCapturedValues] = useState({
    basePrice: basePrice,
    askPrice: askPrice,
    bidPrice: bidPrice,
    change: change24h,
    direction: direction,
  });
  
  const handleCardClick = () => {
    setCapturedValues({
      basePrice: basePrice,
      askPrice: askPrice,
      bidPrice: bidPrice,
      change: change24h,
      direction: direction,
    });
    setShowTradingDetail(true);
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTradeMode("buy");
    setShowTradePanel(true);
  };

  const handleSell = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTradeMode("sell");
    setShowTradePanel(true);
  };

  // Translations
  const translations: Record<string, { buy: string; sell: string }> = {
    tr: { buy: "Al", sell: "Sat" },
    en: { buy: "Buy", sell: "Sell" },
    de: { buy: "Kaufen", sell: "Verkaufen" },
    fr: { buy: "Acheter", sell: "Vendre" },
    ar: { buy: "شراء", sell: "بيع" },
    ru: { buy: "Купить", sell: "Продать" },
  };
  const t = translations[lang] || translations.en;

  // Direction-based styling with light/dark support
  const getDirectionStyles = () => {
    let badgeBg, badgeText, arrow;
    if (change24h > 0.01) {
      badgeBg = "bg-emerald-500/20";
      badgeText = "text-emerald-600 dark:text-emerald-400";
      arrow = "↑";
    } else if (change24h < -0.01) {
      badgeBg = "bg-red-500/20";
      badgeText = "text-red-600 dark:text-red-400";
      arrow = "↓";
    } else {
      badgeBg = "bg-slate-500/20";
      badgeText = "text-slate-600 dark:text-slate-300";
      arrow = "~";
    }
    
    let priceColor;
    if (priceDirection === "up") {
      priceColor = "text-emerald-600 dark:text-emerald-400";
    } else if (priceDirection === "down") {
      priceColor = "text-red-600 dark:text-red-400";
    } else {
      if (change24h > 0.01) {
        priceColor = "text-emerald-600 dark:text-emerald-400";
      } else if (change24h < -0.01) {
        priceColor = "text-red-600 dark:text-red-400";
      } else {
        priceColor = "text-slate-800 dark:text-slate-100";
      }
    }
    
    return { badgeBg, badgeText, priceColor, arrow };
  };

  const directionStyles = getDirectionStyles();

  // metalId'yi AUXG formatına çevir
  const metalIdToAux: Record<string, "AUXG" | "AUXS" | "AUXPT" | "AUXPD"> = {
    gold: "AUXG",
    silver: "AUXS",
    platinum: "AUXPT",
    palladium: "AUXPD",
  };
  const auxMetalId = metalIdToAux[metalId];

  return (
    <>
      <div 
        className="relative rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-4 hover:border-stone-300 dark:hover:border-slate-600 hover:bg-stone-50 dark:hover:bg-slate-900 transition-all cursor-pointer group shadow-sm dark:shadow-none"
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon && (
              <img 
                src={icon} 
                alt={name}
                className="w-6 h-6"
              />
            )}
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{symbol}</h3>
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${directionStyles.badgeBg} ${directionStyles.badgeText}`}
          >
            {directionStyles.arrow} {Math.abs(change24h).toFixed(2)}%
          </span>
        </div>
        
        {/* Alt başlık */}
        <p className="text-sm text-slate-500 dark:text-slate-500 mb-2">{name}</p>

        {/* Price - Base fiyat (spread'siz) */}
        <div className="mb-3">
          <div className={`text-3xl font-bold font-mono tracking-tight transition-colors duration-300 ${directionStyles.priceColor}`}>
            ${basePrice?.toFixed(2) || "0.00"}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleBuy}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          >
            {t.buy}
          </button>
          <button
            onClick={handleSell}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 active:bg-red-600 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
          >
            {t.sell}
          </button>
        </div>

        {/* Click hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Trade Panel Modal */}
      {showTradePanel && (
        <TradePanel
          metalId={auxMetalId}
          metalSymbol={symbol}
          metalName={name}
          currentPrice={tradeMode === "buy" ? askPrice : bidPrice}
          bidPrice={bidPrice}
          onClose={() => setShowTradePanel(false)}
          lang={lang}
          initialMode={tradeMode}
        />
      )}

      {/* Trading Detail Page */}
      {showTradingDetail && (
        <TradingDetailPage
          metalId={auxMetalId}
          symbol={symbol}
          name={name}
          currentPrice={capturedValues.basePrice}
          askPrice={capturedValues.askPrice}
          bidPrice={capturedValues.bidPrice}
          change24h={capturedValues.change}
          direction={capturedValues.direction}
          onClose={() => setShowTradingDetail(false)}
          onBuy={() => {
            setShowTradingDetail(false);
            setTradeMode("buy");
            setShowTradePanel(true);
          }}
          onSell={() => {
            setShowTradingDetail(false);
            setTradeMode("sell");
            setShowTradePanel(true);
          }}
          lang={lang}
        />
      )}
    </>
  );
}
