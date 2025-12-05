// src/components/UsdBalanceCard.tsx
// Fiat USD bakiye kartı - Wallet sayfasında kullanılır

"use client";

import { useState } from "react";

interface UsdBalanceCardProps {
  usdBalance: number;
  usdtBalance: number;
  lang: "tr" | "en";
  onBuyClick: () => void;
  onConvertClick: () => void;
}

export function UsdBalanceCard({
  usdBalance,
  usdtBalance,
  lang,
  onBuyClick,
  onConvertClick,
}: UsdBalanceCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const totalUsdValue = usdBalance + usdtBalance;

  const texts = {
    tr: {
      title: "Fiat Bakiye",
      usdLabel: "USD (Fiat)",
      usdtLabel: "USDT (Stablecoin)",
      totalLabel: "Toplam USD Değeri",
      buyButton: "USD ile Satın Al",
      convertButton: "Dönüştür",
      noBalance: "Henüz USD bakiyeniz yok",
      depositHint: "Admin üzerinden USD yatırma işlemi yapabilirsiniz",
    },
    en: {
      title: "Fiat Balance",
      usdLabel: "USD (Fiat)",
      usdtLabel: "USDT (Stablecoin)",
      totalLabel: "Total USD Value",
      buyButton: "Buy with USD",
      convertButton: "Convert",
      noBalance: "No USD balance yet",
      depositHint: "Contact admin to deposit USD",
    },
  };

  const t = texts[lang];

  return (
    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/20 border border-green-700/30 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{t.title}</h3>
            <p className="text-xs text-slate-400">{t.totalLabel}</p>
          </div>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
        >
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${
              showDetails ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Total Value */}
      <div className="mb-4">
        <p className="text-3xl font-bold text-white">
          ${totalUsdValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>

      {/* Details (collapsible) */}
      {showDetails && (
        <div className="space-y-3 mb-4 pt-3 border-t border-slate-700/50">
          {/* USD Fiat */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-sm text-slate-300">{t.usdLabel}</span>
            </div>
            <span className="text-sm font-medium text-white">
              ${usdBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* USDT */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#26A17B] flex items-center justify-center">
                <span className="text-white text-xs font-bold">₮</span>
              </div>
              <span className="text-sm text-slate-300">{t.usdtLabel}</span>
            </div>
            <span className="text-sm font-medium text-white">
              ${usdtBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {totalUsdValue > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onBuyClick}
            className="py-2.5 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {t.buyButton}
          </button>
          <button
            onClick={onConvertClick}
            className="py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
            {t.convertButton}
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-sm text-slate-400">{t.noBalance}</p>
          <p className="text-xs text-slate-500 mt-1">{t.depositHint}</p>
        </div>
      )}
    </div>
  );
}