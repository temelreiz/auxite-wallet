"use client";

import { useState, useEffect } from "react";

import { useWallet } from "@/components/WalletContext";

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: {
    symbol: string;
    name: string;
    price: number;
    icon: string;
  };
  mode: "buy" | "sell";
  lang?: "tr" | "en";
}

const paymentMethods = [
  { id: "AUXM", name: "AUXM", icon: "💵" },
  { id: "USDT", name: "USDT", icon: "₮" },
  { id: "ETH", name: "ETH", icon: "Ξ" },
  { id: "BTC", name: "BTC", icon: "₿" },
];

export function TradeModal({ isOpen, onClose, metal, mode, lang = "en" }: TradeModalProps) {
  // Gerçek bakiyeler - useWallet hook'undan
  const { balances, isConnected } = useWallet();
  
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const totalAuxm = auxmBalance + bonusAuxm;
  
  const [amount, setAmount] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setSelectedCurrency("AUXM");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const metalAmount = mode === "buy" 
    ? amountNum / metal.price 
    : amountNum * metal.price;

  const getAvailableBalance = () => {
    if (!balances) return 0;
    switch (selectedCurrency) {
      case "AUXM": return totalAuxm;
      case "ETH": return balances.eth;
      case "BTC": return balances.btc;
      default: return 0;
    }
  };

  const availableBalance = getAvailableBalance();
  const hasInsufficientBalance = mode === "buy" && amountNum > availableBalance;

  const calculateBonusUsage = () => {
    if (mode !== "buy" || selectedCurrency !== "AUXM" || amountNum <= 0) {
      return { usedBonus: 0, usedRegular: amountNum };
    }
    if (bonusAuxm >= amountNum) {
      return { usedBonus: amountNum, usedRegular: 0 };
    }
    return { usedBonus: bonusAuxm, usedRegular: amountNum - bonusAuxm };
  };

  const bonusUsage = calculateBonusUsage();

  const handleTrade = async () => {
    if (!isConnected || amountNum <= 0 || hasInsufficientBalance) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      onClose();
    } catch (error) {
      console.error("Trade error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const t = {
    buy: lang === "tr" ? "Satın Al" : "Buy",
    sell: lang === "tr" ? "Sat" : "Sell",
    youPay: lang === "tr" ? "Ödeyeceğiniz" : "You Pay",
    youReceive: lang === "tr" ? "Alacağınız" : "You Receive",
    balance: lang === "tr" ? "Bakiye" : "Balance",
    bonus: lang === "tr" ? "Bonus" : "Bonus",
    insufficientBalance: lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance",
    connectWallet: lang === "tr" ? "Cüzdan bağlayın" : "Connect wallet",
    processing: lang === "tr" ? "İşleniyor..." : "Processing...",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">
            {mode === "buy" ? t.buy : t.sell} {metal.name}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              {mode === "buy" ? t.youPay : t.youReceive}
            </label>
            <div className="flex gap-2 mb-3">
              {paymentMethods.map((pm) => (
                <button
                  key={pm.id}
                  onClick={() => setSelectedCurrency(pm.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCurrency === pm.id
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                      : "bg-slate-800 text-slate-400 border border-slate-700"
                  }`}
                >
                  {pm.icon} {pm.name}
                </button>
              ))}
            </div>
            
            {selectedCurrency === "AUXM" && (
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">{t.balance}:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">{auxmBalance.toFixed(2)} AUXM</span>
                  {bonusAuxm > 0 && (
                    <span className="text-purple-400 font-mono">+{bonusAuxm.toFixed(2)} {t.bonus}</span>
                  )}
                </div>
              </div>
            )}

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white text-lg font-mono focus:outline-none ${
                hasInsufficientBalance ? "border-red-500" : "border-slate-700"
              }`}
            />
            {hasInsufficientBalance && (
              <p className="text-red-400 text-xs mt-1">{t.insufficientBalance}</p>
            )}
          </div>

          <div className="flex justify-center">
            <div className="p-2 bg-slate-800 rounded-full">
              ↓
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">
              {mode === "buy" ? t.youReceive : t.youPay}
            </label>
            <div className="flex items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-xl">
              <span className="text-2xl">{metal.icon}</span>
              <div>
                <div className="text-white text-lg font-mono">
                  {metalAmount.toFixed(4)} {metal.symbol}
                </div>
                <div className="text-slate-400 text-sm">@ ${metal.price.toFixed(2)}/g</div>
              </div>
            </div>
          </div>

          {mode === "buy" && selectedCurrency === "AUXM" && bonusAuxm > 0 && amountNum > 0 && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="text-xs text-purple-300">
                💜 {lang === "tr" ? "Bonus kullanımı:" : "Bonus usage:"} 
                <span className="font-mono ml-2">{bonusUsage.usedBonus.toFixed(2)} AUXM</span>
              </div>
            </div>
          )}

          <button
            onClick={handleTrade}
            disabled={!isConnected || amountNum <= 0 || hasInsufficientBalance || isProcessing}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-colors ${
              !isConnected || amountNum <= 0 || hasInsufficientBalance || isProcessing
                ? "bg-slate-700 cursor-not-allowed"
                : mode === "buy" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                ⏳ {t.processing}
              </span>
            ) : !isConnected ? t.connectWallet : `${mode === "buy" ? t.buy : t.sell} ${metal.symbol}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeModal;
