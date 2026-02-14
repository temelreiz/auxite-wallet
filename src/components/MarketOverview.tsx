"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface MarketOverviewProps {}

type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

const metalConfigs = {
  AUXG: {
    nameKey: "gold",
    basePrice: 131.27,
  },
  AUXS: {
    nameKey: "silver",
    basePrice: 1.62,
  },
  AUXPT: {
    nameKey: "platinum",
    basePrice: 48.78,
  },
  AUXPD: {
    nameKey: "palladium",
    basePrice: 44.30,
  },
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    marketOverview: "Piyasa G\u00f6r\u00fcn\u00fcm\u00fc",
    open: "A\u00e7\u0131l\u0131\u015f",
    high: "Y\u00fcksek",
    low: "D\u00fc\u015f\u00fck",
    close: "Kapan\u0131\u015f",
    gold: "Alt\u0131n",
    silver: "G\u00fcm\u00fc\u015f",
    platinum: "Platin",
    palladium: "Paladyum",
  },
  en: {
    marketOverview: "Market Overview",
    open: "Open",
    high: "High",
    low: "Low",
    close: "Close",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
  },
  de: {
    marketOverview: "Markt\u00fcbersicht",
    open: "Er\u00f6ffnung",
    high: "Hoch",
    low: "Tief",
    close: "Schluss",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
  },
  fr: {
    marketOverview: "Aper\u00e7u du March\u00e9",
    open: "Ouverture",
    high: "Haut",
    low: "Bas",
    close: "Cl\u00f4ture",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
  },
  ar: {
    marketOverview: "\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0633\u0648\u0642",
    open: "\u0627\u0641\u062a\u062a\u0627\u062d",
    high: "\u0623\u0639\u0644\u0649",
    low: "\u0623\u062f\u0646\u0649",
    close: "\u0625\u063a\u0644\u0627\u0642",
    gold: "\u0630\u0647\u0628",
    silver: "\u0641\u0636\u0629",
    platinum: "\u0628\u0644\u0627\u062a\u064a\u0646",
    palladium: "\u0628\u0627\u0644\u0627\u062f\u064a\u0648\u0645",
  },
  ru: {
    marketOverview: "\u041e\u0431\u0437\u043e\u0440 \u0440\u044b\u043d\u043a\u0430",
    open: "\u041e\u0442\u043a\u0440\u044b\u0442\u0438\u0435",
    high: "\u041c\u0430\u043a\u0441",
    low: "\u041c\u0438\u043d",
    close: "\u0417\u0430\u043a\u0440\u044b\u0442\u0438\u0435",
    gold: "\u0417\u043e\u043b\u043e\u0442\u043e",
    silver: "\u0421\u0435\u0440\u0435\u0431\u0440\u043e",
    platinum: "\u041f\u043b\u0430\u0442\u0438\u043d\u0430",
    palladium: "\u041f\u0430\u043b\u043b\u0430\u0434\u0438\u0439",
  },
};

export default function MarketOverview({}: MarketOverviewProps) {
  const { lang } = useLanguage();
  const [selectedMetal, setSelectedMetal] = useState<MetalSymbol>("AUXG");
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

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
            {t("marketOverview")}
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
            {metal} - {t(metalConfigs[metal].nameKey)}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{t("open")}</div>
          <div className="text-lg font-mono text-slate-200">${open.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{t("high")}</div>
          <div className="text-lg font-mono text-green-400">${high.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{t("low")}</div>
          <div className="text-lg font-mono text-red-400">${low.toFixed(2)}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
          <div className="text-xs text-slate-500 mb-1">{t("close")}</div>
          <div className="text-lg font-mono text-slate-200">${close.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}