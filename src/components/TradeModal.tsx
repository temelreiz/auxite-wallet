"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import type { MetalId } from "@/lib/metals";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useTrade } from "@/hooks/useTrade";
import { isLaunchCampaignActive, calculateAuxmBonus } from "@/lib/auxm-bonus-service";

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

type Currency = "AUXM" | "USDT" | "BTC" | "ETH" | "XRP" | "SOL";

// Currency conversion helper
function convertToCurrency(
  usdAmount: number, 
  cryptoPrices: { eth: number; btc: number; xrp?: number; sol?: number } | null, 
  currency: Currency
): number {
  if (!cryptoPrices) return usdAmount;
  
  switch (currency) {
    case "ETH":
      return cryptoPrices.eth > 0 ? usdAmount / cryptoPrices.eth : 0;
    case "BTC":
      return cryptoPrices.btc > 0 ? usdAmount / cryptoPrices.btc : 0;
    case "XRP":
      return (cryptoPrices.xrp || 2.20) > 0 ? usdAmount / (cryptoPrices.xrp || 2.20) : 0;
    case "SOL":
      return (cryptoPrices.sol || 235) > 0 ? usdAmount / (cryptoPrices.sol || 235) : 0;
    case "AUXM":
    case "USDT":
    default:
      return usdAmount;
  }
}

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
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("AUXM");
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

  // Mock AUXM balance - gerçek uygulamada API'den gelecek
  const [auxmBalance] = useState({ auxm: 1250.50, bonusAuxm: 25.00 });
  const totalAuxm = auxmBalance.auxm + auxmBalance.bonusAuxm;

  const effectivePrice = mode === "sell" ? (bidPrice || currentPrice * 0.99) : currentPrice;
  const amountNum = parseFloat(amount) || 0;
  const totalUSD = effectivePrice * amountNum;
  
  // Bonus hesaplama (buy mode için)
  const bonusCalculation = mode === "buy" && selectedCurrency === "AUXM" 
    ? calculateAuxmBonus(totalUSD) 
    : null;

  // Bonus kullanımı hesaplama
  const calculateBonusUsage = () => {
    if (mode !== "buy" || selectedCurrency !== "AUXM") return { usedBonus: 0, usedRegular: totalUSD };
    
    if (auxmBalance.bonusAuxm >= totalUSD) {
      return { usedBonus: totalUSD, usedRegular: 0 };
    } else {
      return { 
        usedBonus: auxmBalance.bonusAuxm, 
        usedRegular: totalUSD - auxmBalance.bonusAuxm 
      };
    }
  };

  const bonusUsage = calculateBonusUsage();
  const canAffordAuxm = mode === "buy" && selectedCurrency === "AUXM" ? totalUSD <= totalAuxm : true;

  const totalInCurrency = convertToCurrency(totalUSD, cryptoPrices, selectedCurrency);

  const currencies: Currency[] = ["AUXM", "USDT", "BTC", "ETH", "XRP", "SOL"];

  const getCurrencySymbol = (curr: Currency) => {
    const symbols: Record<Currency, string> = { 
      AUXM: "◈", 
      USDT: "₮", 
      BTC: "₿", 
      ETH: "Ξ", 
      XRP: "✕", 
      SOL: "◎" 
    };
    return symbols[curr];
  };

  const getCurrencyColor = (curr: Currency) => {
    const colors: Record<Currency, string> = { 
      AUXM: "#A855F7", 
      USDT: "#26A17B", 
      BTC: "#F7931A", 
      ETH: "#627EEA", 
      XRP: "#23292F", 
      SOL: "#9945FF" 
    };
    return colors[curr];
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

    if (mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm) {
      alert(lang === "tr" ? "Yetersiz AUXM bakiyesi" : "Insufficient AUXM balance");
      return;
    }

    if (mode === "buy") {
      await buy(amountNum, effectivePrice);
    } else {
      if (parseFloat(metalBalance) < amountNum) {
        alert(lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance");
        return;
      }
      await sell(amountNum);
    }
  };

  const isProcessing = isApproving || isTrading;
  const isCampaignActive = isLaunchCampaignActive();

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
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
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

        {/* Campaign Banner (Buy mode + AUXM) */}
        {mode === "buy" && selectedCurrency === "AUXM" && isCampaignActive && (
          <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚀</span>
              <div>
                <p className="text-sm font-semibold text-white">
                  {lang === "tr" ? "Lansman Kampanyası Aktif!" : "Launch Campaign Active!"}
                </p>
                <p className="text-xs text-purple-300">
                  {lang === "tr" 
                    ? "Bonus AUXM sadece metal alımlarında kullanılabilir" 
                    : "Bonus AUXM can only be used for metal purchases"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">
              {lang === "tr" ? "İşlem Başarılı!" : "Trade Successful!"}
            </h3>
            <p className="text-slate-400">
              {mode === "buy"
                ? `${amountNum.toFixed(4)}g ${metalSymbol} ${lang === "tr" ? "satın alındı" : "purchased"}`
                : `${amountNum.toFixed(4)}g ${metalSymbol} ${lang === "tr" ? "satıldı" : "sold"}`}
            </p>
            {tradeHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${tradeHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline mt-2 inline-block"
              >
                {lang === "tr" ? "İşlemi görüntüle" : "View transaction"} ↗
              </a>
            )}
          </div>
        ) : (
          <>
            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg mb-6">
              <button
                onClick={() => !isProcessing && setMode("buy")}
                disabled={isProcessing}
                className={`py-2.5 rounded-md text-sm font-semibold transition-all ${
                  mode === "buy"
                    ? "bg-emerald-500 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Al" : "Buy"}
              </button>
              <button
                onClick={() => !isProcessing && setMode("sell")}
                disabled={isProcessing}
                className={`py-2.5 rounded-md text-sm font-semibold transition-all ${
                  mode === "sell"
                    ? "bg-red-500 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Sat" : "Sell"}
              </button>
            </div>

            {/* Balance Display */}
            <div className="mb-4">
              {mode === "buy" ? (
                selectedCurrency === "AUXM" ? (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">{lang === "tr" ? "AUXM Bakiye" : "AUXM Balance"}</span>
                      <span className="text-white font-mono">{auxmBalance.auxm.toFixed(2)} AUXM</span>
                    </div>
                    {auxmBalance.bonusAuxm > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-purple-400">🎁 Bonus AUXM</span>
                        <span className="text-purple-400 font-mono">+{auxmBalance.bonusAuxm.toFixed(2)} AUXM</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1 border-t border-purple-500/30">
                      <span className="text-slate-300 font-medium">{lang === "tr" ? "Toplam" : "Total"}</span>
                      <span className="text-white font-mono font-medium">{totalAuxm.toFixed(2)} AUXM</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{selectedCurrency} {lang === "tr" ? "Bakiye" : "Balance"}</span>
                      <span className="text-white font-mono">0.00 {selectedCurrency}</span>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{metalSymbol} {lang === "tr" ? "Bakiye" : "Balance"}</span>
                    <span className="text-white font-mono">{metalBalance || "0.0000"}g</span>
                  </div>
                </div>
              )}
            </div>

            {/* Price Info */}
            <div className="mb-4">
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">
                    {mode === "buy" 
                      ? (lang === "tr" ? "Alış Fiyatı" : "Ask Price")
                      : (lang === "tr" ? "Satış Fiyatı" : "Bid Price")}
                  </span>
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
                <button
                  onClick={() => {
                    if (mode === "sell") {
                      setAmount(metalBalance);
                    } else if (selectedCurrency === "AUXM") {
                      const maxGrams = totalAuxm / effectivePrice;
                      setAmount(maxGrams.toFixed(4));
                    }
                  }}
                  disabled={isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-emerald-400 font-semibold"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Currency Selection - Both Buy and Sell */}
            <div className="mb-6">
              <label className="block text-sm text-slate-400 mb-2">
                {mode === "buy" 
                  ? (lang === "tr" ? "Ödeme Yöntemi" : "Payment Method")
                  : (lang === "tr" ? "Alınacak Para Birimi" : "Receive As")}
              </label>
              <div className="grid grid-cols-6 gap-2">
                {currencies.map((curr) => (
                  <button
                    key={curr}
                    onClick={() => !isProcessing && setSelectedCurrency(curr)}
                    disabled={isProcessing}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                      selectedCurrency === curr
                        ? mode === "buy" 
                          ? "bg-purple-500/20 border-purple-500"
                          : "bg-red-500/20 border-red-500"
                        : "bg-slate-800 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: getCurrencyColor(curr) }}
                    >
                      {getCurrencySymbol(curr)}
                    </div>
                    <span className="text-xs text-slate-300">{curr}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className={`mb-4 p-4 rounded-lg border ${
              mode === "buy" 
                ? selectedCurrency === "AUXM" 
                  ? "bg-purple-500/10 border-purple-500/30"
                  : "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-red-500/10 border-red-500/30"
            }`}>
              <div className={`text-sm mb-1 ${
                mode === "buy" 
                  ? selectedCurrency === "AUXM" ? "text-purple-300" : "text-emerald-300" 
                  : "text-red-300"
              }`}>
                {mode === "buy"
                  ? (lang === "tr" ? "Toplam Ödeme" : "Total Payment")
                  : (lang === "tr" ? "Toplam Alacak" : "Total Receive")
                }
              </div>
              <div className={`text-3xl font-bold ${
                mode === "buy" 
                  ? selectedCurrency === "AUXM" ? "text-purple-400" : "text-emerald-400" 
                  : "text-red-400"
              }`}>
                {pricesLoading && selectedCurrency !== "AUXM" ? (
                  <span className="text-slate-400">...</span>
                ) : (
                  <>
                    {getCurrencySymbol(selectedCurrency)}{" "}
                    {selectedCurrency === "AUXM" || selectedCurrency === "USDT"
                      ? totalUSD.toFixed(2)
                      : totalInCurrency.toFixed(selectedCurrency === "BTC" || selectedCurrency === "ETH" ? 6 : 4)
                    }
                  </>
                )}
              </div>
              <div className={`text-xs mt-1 ${
                mode === "buy" 
                  ? selectedCurrency === "AUXM" ? "text-purple-300" : "text-emerald-300" 
                  : "text-red-300"
              }`}>
                ≈ ${totalUSD.toFixed(2)} USD
              </div>
            </div>

            {/* Bonus Usage Info (buy + AUXM) */}
            {mode === "buy" && selectedCurrency === "AUXM" && auxmBalance.bonusAuxm > 0 && amountNum > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="text-sm text-purple-300">
                  <div className="flex justify-between mb-1">
                    <span>🎁 {lang === "tr" ? "Bonus Kullanımı" : "Bonus Usage"}:</span>
                    <span className="font-mono">{bonusUsage.usedBonus.toFixed(2)} AUXM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{lang === "tr" ? "Normal AUXM" : "Regular AUXM"}:</span>
                    <span className="font-mono">{bonusUsage.usedRegular.toFixed(2)} AUXM</span>
                  </div>
                </div>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm && amountNum > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-400">
                  ⚠️ {lang === "tr" ? "Yetersiz AUXM bakiyesi" : "Insufficient AUXM balance"}
                </p>
              </div>
            )}

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
                disabled={isProcessing || amountNum <= 0 || (mode === "buy" && selectedCurrency === "AUXM" && !canAffordAuxm)}
                className={`px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                  mode === "buy"
                    ? selectedCurrency === "AUXM"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
                      : "bg-emerald-500 text-white hover:bg-emerald-600"
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