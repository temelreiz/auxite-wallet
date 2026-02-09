"use client";

import { useState } from "react";

interface MarketOverviewProps {
  lang?: "tr" | "en";
}

type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

const metalConfigs = {
  AUXG: {
    name: { tr: "Altın", en: "Gold" },
    basePrice: 131.27,
  },
  AUXS: {
    name: { tr: "Gümüş", en: "Silver" },
    basePrice: 1.62,
  },
  AUXPT: {
    name: { tr: "Platin", en: "Platinum" },
    basePrice: 48.78,
  },
  AUXPD: {
    name: { tr: "Paladyum", en: "Palladium" },
    basePrice: 44.30,
  },
};

export default function MarketOverview({ lang = "en" }: MarketOverviewProps) {
  const [selectedMetal, setSelectedMetal] = useState<MetalSymbol>("AUXG");

  const currentPrice = metalConfigs[selectedMetal].basePrice;
  const change = (Math.random() - 0.5) * 2; // Random change -1% to +1%

  // Generate mock OHLC data
  const volatility = currentPrice * 0.015;
  const open = currentPrice * (1 + (Math.random() - 0.5) * 0.01);
  const high = currentPrice + Math.random() * volatility;
  const low = currentPrice - Math.random() * volatility;
  const close = currentPrice;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            {lang === "tr" ? "Piyasa Görünümü" : "Market Overview"}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm font-medium ${change >= 0 ? "text-green-400" : "text-red-400"}`}>
              {change >= 0 ? "↑" : "↓"} {Math.abs(change).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* Metal Selector */}
      <div className="flex items-center gap-2 mb-4">
        {(Object.keys(metalConfigs) as MetalSymbol[]).map((metal) => (
          <button
            key={metal}
            onClick={() => setSelectedMetal(metal)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedMetal === metal
                ? "bg-[#2F6F62]/20 border-2 border-[#2F6F62] text-[#2F6F62]"
                : "border border-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {metal} - {metalConfigs[metal].name[lang]}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Açılış" : "Open"}</div>
          <div className="text-lg font-mono text-slate-200">${open.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Yüksek" : "High"}</div>
          <div className="text-lg font-mono text-green-400">${high.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Düşük" : "Low"}</div>
          <div className="text-lg font-mono text-red-400">${low.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Kapanış" : "Close"}</div>
          <div className="text-lg font-mono text-slate-200">${close.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}