"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";

interface BuyMetalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
  initialMetal?: string;
}

const metals = [
  { symbol: "AUXG", name: { tr: "Altın", en: "Gold" }, icon: "🥇", color: "yellow" },
  { symbol: "AUXS", name: { tr: "Gümüş", en: "Silver" }, icon: "🥈", color: "gray" },
  { symbol: "AUXPT", name: { tr: "Platin", en: "Platinum" }, icon: "💎", color: "cyan" },
  { symbol: "AUXPD", name: { tr: "Paladyum", en: "Palladium" }, icon: "🔷", color: "orange" },
];

const paymentMethods = [
  { id: "AUXM", name: "AUXM", icon: "💵" },
  { id: "ETH", name: "ETH", icon: "Ξ" },
  { id: "BTC", name: "BTC", icon: "₿" },
];

export function BuyMetalModal({ isOpen, onClose, lang = "en", initialMetal }: BuyMetalModalProps) {
  const { balances, isConnected, refreshBalances, address } = useWallet();
  const { prices: metalPrices } = useMetalsPrices();
  
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const ethBalance = balances?.eth ?? 0;
  const btcBalance = balances?.btc ?? 0;
  
  const [selectedMetal, setSelectedMetal] = useState(initialMetal || "AUXG");
  const [amount, setAmount] = useState("");
  const [selectedPayment, setSelectedPayment] = useState("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{toAmount: number; toToken: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setSelectedPayment("AUXM");
      setError(null);
      setSuccess(null);
      if (initialMetal) setSelectedMetal(initialMetal);
    }
  }, [isOpen, initialMetal]);

  if (!isOpen) return null;

  const currentMetal = metals.find(m => m.symbol === selectedMetal) || metals[0];
  const metalPrice = metalPrices?.[selectedMetal as keyof typeof metalPrices] || 100;
  
  const amountNum = parseFloat(amount) || 0;
  
  const getAvailableBalance = (pm: string) => {
    switch (pm) {
      case "AUXM": return auxmBalance + bonusAuxm;
      case "ETH": return ethBalance;
      case "BTC": return btcBalance;
      default: return 0;
    }
  };

  const availableBalance = getAvailableBalance(selectedPayment);
  const metalAmount = amountNum / metalPrice;
  const hasInsufficientBalance = amountNum > availableBalance;

  const calculateBonusUsage = () => {
    if (selectedPayment !== "AUXM" || amountNum <= 0) {
      return { usedBonus: 0, usedRegular: amountNum };
    }
    if (bonusAuxm >= amountNum) {
      return { usedBonus: amountNum, usedRegular: 0 };
    }
    return { usedBonus: bonusAuxm, usedRegular: amountNum - bonusAuxm };
  };

  const bonusUsage = calculateBonusUsage();

  const handleBuy = async () => {
    if (!isConnected || !address || amountNum <= 0 || hasInsufficientBalance) return;
    
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          type: "buy",
          fromToken: selectedPayment,
          toToken: selectedMetal,
          fromAmount: amountNum,
          price: metalPrice,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Trade failed");
      }

      setSuccess({
        toAmount: data.transaction.toAmount,
        toToken: data.transaction.toToken,
      });

      await refreshBalances();

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error("Buy error:", err);
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const t = {
    title: lang === "tr" ? "Metal Satın Al" : "Buy Metal",
    selectMetal: lang === "tr" ? "Metal Seç" : "Select Metal",
    youPay: lang === "tr" ? "Ödeyeceğiniz" : "You Pay",
    youReceive: lang === "tr" ? "Alacağınız" : "You Receive",
    balance: lang === "tr" ? "Bakiye" : "Balance",
    bonus: lang === "tr" ? "Bonus" : "Bonus",
    total: lang === "tr" ? "Toplam" : "Total",
    insufficientBalance: lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance",
    buy: lang === "tr" ? "Satın Al" : "Buy",
    processing: lang === "tr" ? "İşleniyor..." : "Processing...",
    connectWallet: lang === "tr" ? "Cüzdan Bağlayın" : "Connect Wallet",
    success: lang === "tr" ? "Başarılı!" : "Success!",
    received: lang === "tr" ? "aldınız" : "received",
    fee: lang === "tr" ? "İşlem ücreti" : "Transaction fee",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-semibold text-white">{t.title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-xl text-slate-400">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-emerald-400 font-semibold">{t.success}</p>
              <p className="text-white">
                {success.toAmount.toFixed(4)}g {success.toToken} {t.received}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!success && (
            <>
              {/* Metal Selection */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.selectMetal}</label>
                <div className="grid grid-cols-4 gap-2">
                  {metals.map((metal) => (
                    <button
                      key={metal.symbol}
                      onClick={() => setSelectedMetal(metal.symbol)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedMetal === metal.symbol
                          ? "bg-emerald-500/20 border-2 border-emerald-500"
                          : "bg-slate-800 border-2 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div className="text-2xl mb-1">{metal.icon}</div>
                      <div className="text-xs font-medium text-slate-300">{metal.symbol}</div>
                      <div className="text-xs text-slate-500">${metalPrices?.[metal.symbol as keyof typeof metalPrices]?.toFixed(0) || "..."}/g</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.youPay}</label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setSelectedPayment(pm.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        selectedPayment === pm.id
                          ? "bg-purple-500/20 border-2 border-purple-500"
                          : "bg-slate-800 border-2 border-slate-700"
                      }`}
                    >
                      <div className="text-xl mb-1">{pm.icon}</div>
                      <div className="text-xs font-medium text-slate-300">{pm.name}</div>
                    </button>
                  ))}
                </div>

                {/* Balance Info */}
                <div className="flex items-center justify-between text-xs mb-2 px-1">
                  <span className="text-slate-500">{t.balance}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">
                      {selectedPayment === "AUXM" ? auxmBalance.toFixed(2) : availableBalance.toFixed(6)} {selectedPayment}
                    </span>
                    {selectedPayment === "AUXM" && bonusAuxm > 0 && (
                      <span className="text-purple-400 font-mono">+{bonusAuxm.toFixed(2)} {t.bonus}</span>
                    )}
                  </div>
                </div>

                {selectedPayment === "AUXM" && (
                  <div className="flex items-center justify-between text-xs mb-2 px-1">
                    <span className="text-slate-500">{t.total}:</span>
                    <span className="text-white font-mono font-medium">{(auxmBalance + bonusAuxm).toFixed(2)} AUXM</span>
                  </div>
                )}

                {/* Amount Input */}
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-4 bg-slate-800 border rounded-xl text-white text-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      hasInsufficientBalance ? "border-red-500" : "border-slate-700"
                    }`}
                  />
                  <button
                    onClick={() => setAmount(availableBalance.toFixed(2))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300"
                  >
                    MAX
                  </button>
                </div>
                {hasInsufficientBalance && (
                  <p className="text-red-400 text-xs mt-1">{t.insufficientBalance}</p>
                )}
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 bg-slate-800 rounded-full text-emerald-400 text-xl">↓</div>
              </div>

              {/* Metal Amount */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.youReceive}</label>
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
                  <span className="text-3xl">{currentMetal.icon}</span>
                  <div className="flex-1">
                    <div className="text-white text-xl font-mono">
                      {metalAmount.toFixed(4)}g {currentMetal.symbol}
                    </div>
                    <div className="text-slate-400 text-sm">
                      @ ${metalPrice.toFixed(2)}/gram
                    </div>
                  </div>
                </div>
              </div>

              {/* Bonus Usage */}
              {selectedPayment === "AUXM" && bonusAuxm > 0 && amountNum > 0 && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-purple-300">💜 {t.bonus} kullanımı:</span>
                    <span className="text-purple-400 font-mono">{bonusUsage.usedBonus.toFixed(2)} AUXM</span>
                  </div>
                  {bonusUsage.usedRegular > 0 && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-slate-400">Normal:</span>
                      <span className="text-white font-mono">{bonusUsage.usedRegular.toFixed(2)} AUXM</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fee Info */}
              <div className="p-3 bg-slate-800/50 rounded-xl text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>{t.fee}:</span>
                  <span>0.1%</span>
                </div>
              </div>

              {/* Buy Button */}
              <button
                onClick={handleBuy}
                disabled={!isConnected || amountNum <= 0 || hasInsufficientBalance || isProcessing}
                className={`w-full py-4 rounded-xl font-semibold text-white text-lg transition-all ${
                  !isConnected || amountNum <= 0 || hasInsufficientBalance || isProcessing
                    ? "bg-slate-700 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-600"
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    ⏳ {t.processing}
                  </span>
                ) : !isConnected ? t.connectWallet : `${t.buy} ${currentMetal.symbol}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuyMetalModal;
