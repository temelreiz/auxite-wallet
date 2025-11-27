"use client";

import { useState, useMemo } from "react";
import type { MetalId } from "@/lib/metals";
import TradePanel from "./TradePanel";
import TradingDetailPage from "./TradingDetailPage";

interface MetalPriceCardProps {
  metalId: MetalId;
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
  
  // Capture values at the moment when TradingDetailPage is FIRST opened
  const [capturedValues, setCapturedValues] = useState({
    price: pricePerGram,
    change: change24h,
    direction: direction,
    bid: bidPrice
  });
  
  // Update captured values only when opening (not when updating)
  const handleCardClick = () => {
    setCapturedValues({
      price: pricePerGram,
      change: change24h,
      direction: direction,
      bid: bidPrice
    });
    setShowTradingDetail(true);
  };

  const isPositive = direction === "up";

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



  return (
    <>
      <div 
        className="relative rounded-xl border border-slate-800 bg-slate-900/80 p-4 hover:border-slate-600 hover:bg-slate-900 transition-all cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              {icon && (
                <img 
                  src={icon} 
                  alt={name}
                  className="w-5 h-5"
                />
              )}
              <h3 className="text-sm font-semibold text-slate-200">{symbol}</h3>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  isPositive
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {isPositive ? "↑" : "↓"} {Math.abs(change24h).toFixed(2)}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{name}</p>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-slate-500">
              {lang === "tr" ? "Alış/Satış" : "Ask/Bid"}
            </div>
            <div className="text-sm text-slate-300 font-mono font-medium">
              ${pricePerGram.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Price - Now with more space */}
        <div className="mb-4">
          <div className="text-3xl font-bold text-slate-100 font-mono tracking-tight">
            {pricePerGram.toFixed(2)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleBuy}
            className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
          >
            {lang === "tr" ? "Al" : "Buy"}
          </button>
          <button
            onClick={handleSell}
            className="px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 active:bg-red-600 text-white text-sm font-semibold transition-all duration-150 shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
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
          metalId={metalId}
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
          metalId={metalId}
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