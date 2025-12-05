"use client";

import { useState, useEffect, useRef } from "react";
import TradePanel from "./TradePanel";
import TradingDetailPage from "./TradingDetailPage";

interface MetalPriceCardProps {
  metalId: "gold" | "silver" | "platinum" | "palladium";
  symbol: string;
  name: string;
  pricePerGram: number;
  pricePerKg: number;
  change24h: number;
  bidPrice?: number;
  direction: "up" | "down" | "neutral";
  icon?: string;
  lang?: "tr" | "en";
}

export default function MetalPriceCard({
  metalId,
  symbol,
  name,
  pricePerGram,
  pricePerKg,
  change24h,
  bidPrice,
  direction,
  icon,
  lang = "en",
}: MetalPriceCardProps) {
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [showTradingDetail, setShowTradingDetail] = useState(false);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  
  // Önceki fiyatı sakla ve karşılaştır
  const prevPriceRef = useRef<number>(pricePerGram);
  const [priceDirection, setPriceDirection] = useState<"up" | "down" | "neutral">("neutral");
  
  useEffect(() => {
    if (pricePerGram > prevPriceRef.current) {
      setPriceDirection("up");
    } else if (pricePerGram < prevPriceRef.current) {
      setPriceDirection("down");
    } else {
      setPriceDirection("neutral");
    }
    prevPriceRef.current = pricePerGram;
  }, [pricePerGram]);
  
  const [capturedValues, setCapturedValues] = useState({
    price: pricePerGram,
    change: change24h,
    direction: direction,
    bid: bidPrice
  });
  
  const handleCardClick = () => {
    setCapturedValues({
      price: pricePerGram,
      change: change24h,
      direction: direction,
      bid: bidPrice
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

  // Direction-based styling - badge için change24h, fiyat için priceDirection
  const getDirectionStyles = () => {
    // Badge rengi: 24 saatlik değişime göre
    let badgeBg, badgeText, arrow;
    if (change24h > 0.01) {
      badgeBg = "bg-emerald-500/20";
      badgeText = "text-emerald-400";
      arrow = "↑";
    } else if (change24h < -0.01) {
      badgeBg = "bg-red-500/20";
      badgeText = "text-red-400";
      arrow = "↓";
    } else {
      badgeBg = "bg-slate-500/20";
      badgeText = "text-slate-300";
      arrow = "~";
    }
    
    // Fiyat rengi: anlık değişime göre
    let priceColor;
    if (priceDirection === "up") {
      priceColor = "text-emerald-400";
    } else if (priceDirection === "down") {
      priceColor = "text-red-400";
    } else {
      // Neutral durumda change24h'a bak
      if (change24h > 0.01) {
        priceColor = "text-emerald-400";
      } else if (change24h < -0.01) {
        priceColor = "text-red-400";
      } else {
        priceColor = "text-slate-100";
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
        className="relative rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 hover:bg-slate-900 transition-all cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* Header - Crypto tarzı: sol icon+isim, sağ yüzde */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon && (
              <img 
                src={icon} 
                alt={name}
                className="w-5 h-5"
              />
            )}
            <h3 className="text-sm font-semibold text-slate-200">{symbol}</h3>
          </div>
          {/* Sağ üst - Yüzde değişim badge */}
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${directionStyles.badgeBg} ${directionStyles.badgeText}`}
          >
            {directionStyles.arrow} {Math.abs(change24h).toFixed(2)}%
          </span>
        </div>
        
        {/* Alt başlık */}
        <p className="text-xs text-slate-500 mb-1">{name}</p>

        {/* Price - Base fiyat (spread'siz) */}
        <div className="mb-3">
          <div className={`text-xl font-bold font-mono tracking-tight transition-colors duration-300 ${directionStyles.priceColor}`}>
            ${pricePerGram.toFixed(2)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleBuy}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          >
            {lang === "tr" ? "Al" : "Buy"}
          </button>
          <button
            onClick={handleSell}
            className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 active:bg-red-600 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
          >
            {lang === "tr" ? "Sat" : "Sell"}
          </button>
        </div>

        {/* Click hint */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          currentPrice={pricePerGram}
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
          currentPrice={capturedValues.price}
          bidPrice={capturedValues.bid}
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
