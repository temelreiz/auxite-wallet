"use client";

import { useState, useEffect } from "react";

interface BuyMetalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
  defaultMetal?: MetalType;
  auxmBalance?: number;
  bonusAuxm?: number;
  metalPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
  metalBalances?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
  cryptoBalances?: {
    USDT: number;
    BTC: number;
    ETH: number;
    XRP: number;
    SOL: number;
  };
  cryptoPrices?: {
    BTC: number;
    ETH: number;
    XRP: number;
    SOL: number;
  };
}

type MetalType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type PaymentMethod = "AUXM" | "USDT" | "BTC" | "ETH" | "XRP" | "SOL";

const METALS: Record<MetalType, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  color: string;
}> = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "🥇", color: "#F59E0B" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "🥈", color: "#94A3B8" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "⚪", color: "#CBD5E1" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "🔘", color: "#64748B" },
};

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; color: string }[] = [
  { id: "AUXM", name: "AUXM", icon: "◈", color: "#A855F7" },
  { id: "USDT", name: "USDT", icon: "₮", color: "#26A17B" },
  { id: "BTC", name: "BTC", icon: "₿", color: "#F7931A" },
  { id: "ETH", name: "ETH", icon: "Ξ", color: "#627EEA" },
  { id: "XRP", name: "XRP", icon: "✕", color: "#23292F" },
  { id: "SOL", name: "SOL", icon: "◎", color: "#9945FF" },
];

export function BuyMetalModal({
  isOpen,
  onClose,
  lang = "tr",
  defaultMetal = "AUXG",
  auxmBalance = 1250.50,
  bonusAuxm = 25.00,
  metalPrices = { AUXG: 138.90, AUXS: 1.93, AUXPT: 54.83, AUXPD: 47.09 },
  metalBalances = { AUXG: 15.75, AUXS: 250.00, AUXPT: 5.25, AUXPD: 3.50 },
  cryptoBalances = { USDT: 500, BTC: 0.001, ETH: 0.5, XRP: 1000, SOL: 10 },
  cryptoPrices = { BTC: 97500, ETH: 3650, XRP: 2.20, SOL: 235 },
}: BuyMetalModalProps) {
  const [selectedMetal, setSelectedMetal] = useState<MetalType>(defaultMetal);
  const [amount, setAmount] = useState<string>("1");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount("1");
      setResult(null);
      setSelectedMetal(defaultMetal);
      setPaymentMethod("AUXM");
    }
  }, [isOpen, defaultMetal]);

  if (!isOpen) return null;

  const metalPrice = metalPrices[selectedMetal];
  const amountNum = parseFloat(amount) || 0;

  // Payment method fiyatı (USD cinsinden)
  const getPaymentMethodPrice = (pm: PaymentMethod): number => {
    if (pm === "AUXM" || pm === "USDT") return 1;
    return cryptoPrices[pm as keyof typeof cryptoPrices] || 1;
  };
  
  const paymentMethodPrice = getPaymentMethodPrice(paymentMethod);
  
  // Payment method bakiyesi
  const getPaymentBalance = (pm: PaymentMethod): number => {
    if (pm === "AUXM") return auxmBalance + bonusAuxm;
    if (pm === "USDT") return cryptoBalances.USDT;
    return cryptoBalances[pm as keyof typeof cryptoBalances] || 0;
  };
  
  const paymentBalance = getPaymentBalance(paymentMethod);

  // Hesaplamalar (gram cinsinden input)
  const gramAmount = amountNum;
  const totalCostUSD = gramAmount * metalPrice;
  
  // Payment method cinsinden maliyet
  const totalCostInPayment = totalCostUSD / paymentMethodPrice;

  const canAfford = totalCostInPayment <= paymentBalance && amountNum > 0;
  const currentMetalBalance = metalBalances[selectedMetal];

  // Bonus kullanımı (sadece AUXM için)
  const calculateBonusUsage = () => {
    if (paymentMethod !== "AUXM") return { usedBonus: 0, usedRegular: 0 };
    
    if (bonusAuxm >= totalCostInPayment) {
      return { usedBonus: totalCostInPayment, usedRegular: 0 };
    } else {
      return { 
        usedBonus: bonusAuxm, 
        usedRegular: totalCostInPayment - bonusAuxm 
      };
    }
  };
  
  const bonusUsage = calculateBonusUsage();

  const handleBuy = async () => {
    if (!canAfford) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setResult("success");
      setTimeout(() => onClose(), 2500);
    } catch {
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              {lang === "tr" ? "Al" : "Buy"} {selectedMetal}
            </h2>
            <p className="text-xs text-slate-400">
              {METALS[selectedMetal][lang === "tr" ? "nameTr" : "name"]}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Success State */}
          {result === "success" ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-400 mb-2">
                {lang === "tr" ? "Satın Alma Başarılı!" : "Purchase Successful!"}
              </h3>
              <p className="text-slate-400">
                <span className="text-2xl mr-2">{METALS[selectedMetal].icon}</span>
                {gramAmount.toFixed(4)}g {selectedMetal}
              </p>
              <p className="text-slate-500 text-sm mt-1">
                {totalCostInPayment.toFixed(paymentMethod === "AUXM" || paymentMethod === "USDT" ? 2 : 6)} {paymentMethod}
              </p>
            </div>
          ) : (
            <>
              {/* Launch Campaign Banner */}
              {bonusAuxm > 0 && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {lang === "tr" ? "Lansman Kampanyası Aktif!" : "Launch Campaign Active!"}
                    </p>
                    <p className="text-purple-400 text-xs">
                      {lang === "tr" 
                        ? "Bonus AUXM sadece metal alımlarında kullanılabilir" 
                        : "Bonus AUXM can only be used for metal purchases"}
                    </p>
                  </div>
                </div>
              )}

              {/* Balance Info */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                {paymentMethod === "AUXM" ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{lang === "tr" ? "AUXM Bakiye" : "AUXM Balance"}</span>
                      <span className="text-white font-mono">{auxmBalance.toFixed(2)} AUXM</span>
                    </div>
                    {bonusAuxm > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-purple-400">🎁 Bonus AUXM</span>
                        <span className="text-purple-400 font-mono">+{bonusAuxm.toFixed(2)} AUXM</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm pt-1 border-t border-slate-700">
                      <span className="text-slate-300 font-medium">{lang === "tr" ? "Toplam" : "Total"}</span>
                      <span className="text-white font-mono font-medium">{(auxmBalance + bonusAuxm).toFixed(2)} AUXM</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{paymentMethod} {lang === "tr" ? "Bakiye" : "Balance"}</span>
                    <span className="text-white font-mono">
                      {paymentBalance.toFixed(paymentMethod === "USDT" ? 2 : 6)} {paymentMethod}
                    </span>
                  </div>
                )}
              </div>

              {/* Price Info */}
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    {lang === "tr" ? "Alış Fiyatı" : "Ask Price"}
                  </span>
                  <span className="text-xl font-bold text-white font-mono">
                    ${metalPrice.toFixed(2)} <span className="text-sm text-slate-400 font-normal">per gram</span>
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-slate-400">
                    {lang === "tr" ? "Miktar (gram)" : "Amount (grams)"}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isProcessing}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={() => {
                      const maxUSD = paymentBalance * paymentMethodPrice;
                      const maxGrams = metalPrice > 0 ? maxUSD / metalPrice : 0;
                      setAmount(maxGrams.toFixed(4));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-emerald-400 text-xs font-semibold transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  {lang === "tr" ? "Ödeme Yöntemi" : "Payment Method"}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                        paymentMethod === pm.id
                          ? "bg-purple-500/20 border-purple-500"
                          : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: pm.color }}
                      >
                        {pm.icon}
                      </div>
                      <span className="text-xs text-slate-300">{pm.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className={`p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30`}>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{lang === "tr" ? "Alacağınız" : "You receive"}</span>
                    <span className="text-white font-medium font-mono">{gramAmount.toFixed(4)}g {selectedMetal}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                    <span className="text-emerald-400 font-semibold">{lang === "tr" ? "Toplam Ödeme" : "Total Payment"}</span>
                    <span className={`text-lg font-bold font-mono ${!canAfford && amountNum > 0 ? "text-red-400" : "text-emerald-400"}`}>
                      {totalCostInPayment.toFixed(paymentMethod === "USDT" || paymentMethod === "AUXM" ? 2 : 6)} {paymentMethod}
                    </span>
                  </div>
                  {/* Bonus usage info - sadece AUXM için */}
                  {paymentMethod === "AUXM" && bonusAuxm > 0 && amountNum > 0 && canAfford && (
                    <p className="text-xs text-purple-400 mt-2">
                      🎁 {bonusUsage.usedBonus.toFixed(2)} Bonus + {bonusUsage.usedRegular.toFixed(2)} AUXM {lang === "tr" ? "kullanılacak" : "will be used"}
                    </p>
                  )}
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {!canAfford && amountNum > 0 && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                  ⚠️ {lang === "tr" ? `Yetersiz ${paymentMethod} bakiyesi` : `Insufficient ${paymentMethod} balance`}
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={handleBuy}
                disabled={isProcessing || !canAfford}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "tr" ? "İşleniyor..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {lang === "tr" ? "Satın Al" : "Buy Now"}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default BuyMetalModal;
