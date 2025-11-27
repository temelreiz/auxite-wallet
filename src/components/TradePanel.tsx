"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import type { MetalId } from "@/lib/metals";
import { useCryptoPrices, convertMetalPrice } from "@/hooks/useCryptoPrices";
import { useTrade } from "@/hooks/useTrade";

interface TradePanelProps {
  metalId: MetalId;
  metalSymbol: string;
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  onClose: () => void;
  lang?: "tr" | "en";
  initialMode?: "buy" | "sell";
}

type Currency = "ETH" | "BTC" | "USDT" | "TRY";

export default function TradePanel({
  metalId,
  metalSymbol,
  metalName,
  currentPrice,
  bidPrice,
  onClose,
  lang = "en",
  initialMode = "buy",
}: TradePanelProps) {
  const { isConnected } = useAccount();
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const [amount, setAmount] = useState<string>("1");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USDT");
  const { prices: cryptoPrices, loading: pricesLoading } = useCryptoPrices();
  
  const {
    buy,
    sell,
    reset,
    step,
    errorMessage,
    isApproving,
    isTrading,
    isSuccess,
    tradeHash,
    metalBalance,
  } = useTrade({ metalSymbol });

  const effectivePrice = mode === "sell" ? (bidPrice || currentPrice * 0.9962) : currentPrice;
  const amountNum = parseFloat(amount) || 0;
  const totalUSD = effectivePrice * amountNum;
  const totalInCurrency = convertMetalPrice(totalUSD, cryptoPrices, selectedCurrency);

  const currencies: Currency[] = ["USDT", "ETH", "BTC", "TRY"];

  const getCurrencySymbol = (curr: Currency) => {
    const symbols = { USDT: "₮", ETH: "Ξ", BTC: "₿", TRY: "₺" };
    return symbols[curr];
  };

  // Auto close on success after 2 seconds
  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose]);

  const handleTrade = async () => {
    if (!isConnected) {
      alert(lang === "tr" ? "Lütfen cüzdanınızı bağlayın" : "Please connect your wallet");
      return;
    }

    if (amountNum <= 0) {
      alert(lang === "tr" ? "Geçerli bir miktar girin" : "Enter a valid amount");
      return;
    }

    if (mode === "buy") {
      await buy(amountNum, effectivePrice);
    } else {
      // Check balance for sell
      if (parseFloat(metalBalance) < amountNum) {
        alert(lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance");
        return;
      }
      await sell(amountNum);
    }
  };

  const isProcessing = isApproving || isTrading;

  const getStepText = () => {
    if (step === "approving") {
      return lang === "tr" ? "Onay bekleniyor..." : "Waiting for approval...";
    }
    if (step === "trading") {
      return lang === "tr" ? "İşlem yapılıyor..." : "Processing trade...";
    }
    if (step === "success") {
      return lang === "tr" ? "İşlem başarılı!" : "Trade successful!";
    }
    if (step === "error") {
      return errorMessage || (lang === "tr" ? "İşlem başarısız" : "Trade failed");
    }
    return "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      ></div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {mode === "buy" 
                ? (lang === "tr" ? "Al" : "Buy")
                : (lang === "tr" ? "Sat" : "Sell")
              } {metalSymbol}
            </h2>
            <p className="text-sm text-slate-400 mt-1">{metalName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {step === "success" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">
              {lang === "tr" ? "İşlem Başarılı!" : "Trade Successful!"}
            </h3>
            <p className="text-slate-400 mb-4">
              {mode === "buy"
                ? lang === "tr"
                  ? `${amountNum}g ${metalSymbol} satın alındı`
                  : `Bought ${amountNum}g ${metalSymbol}`
                : lang === "tr"
                  ? `${amountNum}g ${metalSymbol} satıldı`
                  : `Sold ${amountNum}g ${metalSymbol}`
              }
            </p>
            {tradeHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${tradeHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {lang === "tr" ? "İşlemi görüntüle →" : "View transaction →"}
              </a>
            )}
          </div>
        )}

        {/* Error State */}
        {step === "error" && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="text-red-400 text-xl">⚠️</div>
              <div>
                <div className="font-medium text-red-400">
                  {lang === "tr" ? "İşlem Başarısız" : "Trade Failed"}
                </div>
                <div className="text-sm text-red-300 mt-1">{errorMessage}</div>
                <button
                  onClick={reset}
                  className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
                >
                  {lang === "tr" ? "Tekrar dene" : "Try again"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal State */}
        {step !== "success" && step !== "error" && (
          <>
            {/* Buy/Sell Toggle */}
            <div className="mb-6 grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
              <button
                onClick={() => !isProcessing && setMode("buy")}
                disabled={isProcessing}
                className={`py-2 rounded-md font-medium transition-colors ${
                  mode === "buy"
                    ? "bg-emerald-500 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {lang === "tr" ? "Al" : "Buy"}
              </button>
              <button
                onClick={() => !isProcessing && setMode("sell")}
                disabled={isProcessing}
                className={`py-2 rounded-md font-medium transition-colors ${
                  mode === "sell"
                    ? "bg-red-500 text-white"
                    : "text-slate-400 hover:text-slate-300"
                }`}
              >
                {lang === "tr" ? "Sat" : "Sell"}
              </button>
            </div>

            {/* Balance Info (for sell) */}
            {mode === "sell" && (
              <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">
                    {lang === "tr" ? "Mevcut Bakiye" : "Available Balance"}
                  </span>
                  <span className="text-sm font-mono text-slate-200">
                    {parseFloat(metalBalance).toFixed(4)}g {metalSymbol}
                  </span>
                </div>
              </div>
            )}

            {/* Current Price */}
            <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-500 mb-1">
                    {mode === "buy" 
                      ? (lang === "tr" ? "Alış Fiyatı" : "Ask Price")
                      : (lang === "tr" ? "Satış Fiyatı" : "Bid Price")
                    }
                  </div>
                  <div className="text-2xl font-bold text-slate-100">
                    ${effectivePrice.toFixed(2)}
                    <span className="text-sm text-slate-400 ml-2">
                      {lang === "tr" ? "/ gram" : "per gram"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">
                {lang === "tr" ? "Miktar (gram)" : "Amount (grams)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.01"
                  step="0.01"
                  disabled={isProcessing}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  placeholder="1.00"
                />
                {mode === "sell" && (
                  <button
                    onClick={() => setAmount(metalBalance)}
                    disabled={isProcessing}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>

            {/* Currency Selection */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">
                {lang === "tr" ? "Para Birimi" : "Currency"}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {currencies.map((curr) => (
                  <button
                    key={curr}
                    onClick={() => !isProcessing && setSelectedCurrency(curr)}
                    disabled={isProcessing}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedCurrency === curr
                        ? mode === "buy"
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "bg-red-500 border-red-500 text-white"
                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-lg font-bold">{getCurrencySymbol(curr)}</div>
                    <div className="text-xs">{curr}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className={`mb-6 p-4 rounded-lg border ${
              mode === "buy" 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-red-500/10 border-red-500/30"
            }`}>
              <div className={`text-sm mb-1 ${mode === "buy" ? "text-emerald-300" : "text-red-300"}`}>
                {mode === "buy"
                  ? (lang === "tr" ? "Toplam Ödeme" : "Total Payment")
                  : (lang === "tr" ? "Toplam Alacak" : "Total Receive")
                }
              </div>
              <div className={`text-3xl font-bold ${mode === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                {getCurrencySymbol(selectedCurrency)}{" "}
                {totalInCurrency.toFixed(selectedCurrency === "BTC" || selectedCurrency === "ETH" ? 6 : 2)}
              </div>
              <div className={`text-xs mt-1 ${mode === "buy" ? "text-emerald-300" : "text-red-300"}`}>
                ≈ ${totalUSD.toFixed(2)} USD
              </div>
            </div>

            {/* Processing Status */}
            {isProcessing && (
              <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <div>
                    <div className="font-medium text-blue-300">{getStepText()}</div>
                    <div className="text-xs text-blue-200">
                      {lang === "tr" ? "Cüzdanınızı kontrol edin" : "Check your wallet"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {lang === "tr" ? "İptal" : "Cancel"}
              </button>
              <button
                onClick={handleTrade}
                disabled={isProcessing || amountNum <= 0}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                  mode === "buy"
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {step === "approving" 
                      ? (lang === "tr" ? "Onaylanıyor..." : "Approving...")
                      : (lang === "tr" ? "İşleniyor..." : "Processing...")
                    }
                  </span>
                ) : mode === "buy" ? (
                  lang === "tr" ? "Satın Al" : "Buy Now"
                ) : (
                  lang === "tr" ? "Şimdi Sat" : "Sell Now"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}