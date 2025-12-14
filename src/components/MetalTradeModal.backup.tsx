"use client";

import { useState, useEffect } from "react";

interface MetalTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  initialMode?: "buy" | "sell";
  lang?: "tr" | "en";
  userBalance?: {
    auxm: number;
    bonusAuxm: number;
    metals: Record<string, number>;
    crypto?: {
      USDT: number;
      BTC: number;
      ETH: number;
      XRP: number;
      SOL: number;
    };
  };
  cryptoPrices?: {
    BTC: number;
    ETH: number;
    XRP: number;
    SOL: number;
  };
}

type PaymentMethod = "AUXM" | "USDT" | "BTC" | "ETH" | "XRP" | "SOL";

const METAL_INFO = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "🥇", color: "#FFD700" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "🥈", color: "#C0C0C0" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "⚪", color: "#E5E4E2" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "🔘", color: "#CED0DD" },
};

const PAYMENT_METHODS: { id: PaymentMethod; name: string; icon: string; color: string }[] = [
  { id: "AUXM", name: "AUXM", icon: "◈", color: "#A855F7" },
  { id: "USDT", name: "USDT", icon: "₮", color: "#26A17B" },
  { id: "BTC", name: "BTC", icon: "₿", color: "#F7931A" },
  { id: "ETH", name: "ETH", icon: "Ξ", color: "#627EEA" },
  { id: "XRP", name: "XRP", icon: "✕", color: "#23292F" },
  { id: "SOL", name: "SOL", icon: "◎", color: "#9945FF" },
];

// Spread oranları
const SPREAD = {
  buy: 0.01,  // %1
  sell: 0.01, // %1
};

export function MetalTradeModal({
  isOpen,
  onClose,
  metal,
  metalName,
  currentPrice,
  bidPrice,
  initialMode = "buy",
  lang = "en",
  userBalance = { 
    auxm: 1250.50, 
    bonusAuxm: 25.00, 
    metals: { AUXG: 15.75, AUXS: 500, AUXPT: 2.5, AUXPD: 1.25 },
    crypto: { USDT: 500, BTC: 0.001, ETH: 0.5, XRP: 1000, SOL: 10 }
  },
  cryptoPrices = { BTC: 97500, ETH: 3650, XRP: 2.20, SOL: 235 },
}: MetalTradeModalProps) {
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const [amount, setAmount] = useState<string>("1");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("AUXM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAmount("1");
      setPaymentMethod("AUXM");
      setResult(null);
      setErrorMessage("");
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const metalInfo = METAL_INFO[metal];
  const amountNum = parseFloat(amount) || 0;
  
  // Fiyat hesaplama
  const askPrice = currentPrice; // Alış fiyatı (kullanıcı alırken öder)
  const sellPrice = bidPrice || currentPrice * (1 - SPREAD.sell); // Satış fiyatı (kullanıcı satarken alır)
  const effectivePrice = mode === "buy" ? askPrice : sellPrice;
  
  // Payment method için fiyat (USD cinsinden)
  const getPaymentMethodPrice = (pm: PaymentMethod): number => {
    if (pm === "AUXM" || pm === "USDT") return 1;
    return cryptoPrices[pm as keyof typeof cryptoPrices] || 1;
  };
  
  const paymentMethodPrice = getPaymentMethodPrice(paymentMethod);
  
  // Payment method bakiyesi
  const getPaymentBalance = (pm: PaymentMethod): number => {
    if (pm === "AUXM") return userBalance.auxm + userBalance.bonusAuxm;
    if (pm === "USDT") return userBalance.crypto?.USDT || 0;
    return userBalance.crypto?.[pm as keyof typeof userBalance.crypto] || 0;
  };
  
  const paymentBalance = getPaymentBalance(paymentMethod);
  
  // Maliyet/Gelir hesaplama
  const grossValue = amountNum * effectivePrice;
  const spreadFee = grossValue * SPREAD[mode];
  const totalCostUSD = mode === "buy" ? grossValue + spreadFee : 0;
  const totalReceiveUSD = mode === "sell" ? grossValue - spreadFee : 0;
  
  // Payment method cinsinden maliyet
  const totalCostInPayment = totalCostUSD / paymentMethodPrice;
  const totalReceiveInPayment = totalReceiveUSD / paymentMethodPrice;

  // Bakiye kontrolü
  const totalAuxm = userBalance.auxm + userBalance.bonusAuxm;
  const metalBalance = userBalance.metals[metal] || 0;
  const canAfford = mode === "buy" ? totalCostInPayment <= paymentBalance : amountNum <= metalBalance;

  // Bonus kullanımı hesaplama (buy mode, sadece AUXM için)
  const calculateBonusUsage = () => {
    if (mode !== "buy" || paymentMethod !== "AUXM") return { usedBonus: 0, usedRegular: 0 };
    
    if (userBalance.bonusAuxm >= totalCostInPayment) {
      return { usedBonus: totalCostInPayment, usedRegular: 0 };
    } else {
      return { 
        usedBonus: userBalance.bonusAuxm, 
        usedRegular: totalCostInPayment - userBalance.bonusAuxm 
      };
    }
  };

  const bonusUsage = calculateBonusUsage();

  const handleTrade = async () => {
    if (!canAfford) {
      setErrorMessage(lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance");
      return;
    }

    if (amountNum <= 0) {
      setErrorMessage(lang === "tr" ? "Geçerli bir miktar girin" : "Enter a valid amount");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      // API call
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "0x123", // TODO: gerçek adres
          action: mode,
          metal,
          amount: amountNum,
          paymentMethod: mode === "buy" ? paymentMethod : "AUXM",
          paymentAmount: mode === "buy" ? totalCostInPayment : 0,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult("success");
        // 2 saniye sonra kapat
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setResult("error");
        setErrorMessage(data.error || (lang === "tr" ? "İşlem başarısız" : "Trade failed"));
      }
    } catch (error) {
      setResult("error");
      setErrorMessage(lang === "tr" ? "Bağlantı hatası" : "Connection error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxClick = () => {
    if (mode === "buy") {
      // Max alınabilecek miktar (payment method cinsinden)
      const maxUSD = paymentBalance * paymentMethodPrice;
      const maxGrams = maxUSD / (effectivePrice * (1 + SPREAD.buy));
      setAmount(maxGrams.toFixed(4));
    } else {
      // Max satılabilecek miktar
      setAmount(metalBalance.toFixed(4));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isProcessing ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{metalInfo.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "buy" ? (lang === "tr" ? "Al" : "Buy") : (lang === "tr" ? "Sat" : "Sell")} {metal}
              </h2>
              <p className="text-sm text-slate-400">{metalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {result === "success" && (
          <div className="p-8 text-center">
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
                ? `${amountNum.toFixed(4)}g ${metal} ${lang === "tr" ? "satın alındı" : "purchased"}`
                : `${amountNum.toFixed(4)}g ${metal} ${lang === "tr" ? "satıldı" : "sold"}`}
            </p>
            {mode === "buy" && bonusUsage.usedBonus > 0 && (
              <p className="text-purple-400 text-sm mt-2">
                🎁 {bonusUsage.usedBonus.toFixed(2)} Bonus AUXM {lang === "tr" ? "kullanıldı" : "used"}
              </p>
            )}
          </div>
        )}

        {/* Normal State */}
        {result !== "success" && (
          <div className="p-4 space-y-4">
            {/* Buy/Sell Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-lg">
              <button
                onClick={() => !isProcessing && setMode("buy")}
                disabled={isProcessing}
                className={`py-2.5 rounded-lg font-semibold transition-all ${
                  mode === "buy"
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Al" : "Buy"}
              </button>
              <button
                onClick={() => !isProcessing && setMode("sell")}
                disabled={isProcessing}
                className={`py-2.5 rounded-lg font-semibold transition-all ${
                  mode === "sell"
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang === "tr" ? "Sat" : "Sell"}
              </button>
            </div>

            {/* Balance Info */}
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              {mode === "buy" ? (
                <div className="space-y-1">
                  {paymentMethod === "AUXM" ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{lang === "tr" ? "AUXM Bakiye" : "AUXM Balance"}</span>
                        <span className="text-white font-mono">{userBalance.auxm.toFixed(2)}</span>
                      </div>
                      {userBalance.bonusAuxm > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-purple-400">🎁 Bonus AUXM</span>
                          <span className="text-purple-400 font-mono">+{userBalance.bonusAuxm.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-1 border-t border-slate-700">
                        <span className="text-slate-300 font-medium">{lang === "tr" ? "Toplam" : "Total"}</span>
                        <span className="text-white font-mono font-medium">{totalAuxm.toFixed(2)} AUXM</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">{paymentMethod} {lang === "tr" ? "Bakiye" : "Balance"}</span>
                      <span className="text-white font-mono">{paymentBalance.toFixed(paymentMethod === "USDT" ? 2 : 6)} {paymentMethod}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{metal} {lang === "tr" ? "Bakiye" : "Balance"}</span>
                  <span className="text-white font-mono">{metalBalance.toFixed(4)}g</span>
                </div>
              )}
            </div>

            {/* Current Price */}
            <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">
                  {mode === "buy" 
                    ? (lang === "tr" ? "Alış Fiyatı" : "Ask Price")
                    : (lang === "tr" ? "Satış Fiyatı" : "Bid Price")}
                </span>
                <span className="text-lg font-bold text-white font-mono">
                  ${effectivePrice.toFixed(2)}<span className="text-sm text-slate-400">/g</span>
                </span>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                {lang === "tr" ? "Miktar (gram)" : "Amount (grams)"}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="0.0001"
                  step="0.0001"
                  disabled={isProcessing}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  placeholder="1.0000"
                />
                <button
                  onClick={handleMaxClick}
                  disabled={isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded-lg text-emerald-400 font-semibold transition-colors"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Payment Method - Only for Buy */}
            {mode === "buy" && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  {lang === "tr" ? "Ödeme Yöntemi" : "Payment Method"}
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PAYMENT_METHODS.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      disabled={isProcessing}
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
            )}

            {/* Calculation */}
            <div className={`p-4 rounded-xl border ${
              mode === "buy" 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-red-500/10 border-red-500/30"
            }`}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "tr" ? "Brüt Değer" : "Gross Value"}</span>
                  <span className="text-white font-mono">${grossValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spread (%{(SPREAD[mode] * 100).toFixed(1)})</span>
                  <span className="text-slate-400 font-mono">${spreadFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className={`font-semibold ${mode === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                    {mode === "buy" 
                      ? (lang === "tr" ? "Toplam Ödeme" : "Total Cost")
                      : (lang === "tr" ? "Toplam Alacak" : "Total Receive")}
                  </span>
                  <span className={`text-lg font-bold font-mono ${mode === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                    {mode === "buy" 
                      ? `${totalCostInPayment.toFixed(paymentMethod === "USDT" || paymentMethod === "AUXM" ? 2 : 6)} ${paymentMethod}` 
                      : `${totalReceiveInPayment.toFixed(2)} AUXM`}
                  </span>
                </div>
              </div>

              {/* Bonus usage info - sadece AUXM için */}
              {mode === "buy" && paymentMethod === "AUXM" && userBalance.bonusAuxm > 0 && amountNum > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <p className="text-xs text-purple-400">
                    🎁 {bonusUsage.usedBonus.toFixed(2)} Bonus + {bonusUsage.usedRegular.toFixed(2)} AUXM {lang === "tr" ? "kullanılacak" : "will be used"}
                  </p>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{errorMessage}</p>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {!canAfford && amountNum > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm text-amber-400">
                  {mode === "buy" 
                    ? (lang === "tr" ? `Yetersiz ${paymentMethod} bakiyesi` : `Insufficient ${paymentMethod} balance`)
                    : (lang === "tr" ? `Yetersiz ${metal} bakiyesi` : `Insufficient ${metal} balance`)}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {lang === "tr" ? "İptal" : "Cancel"}
              </button>
              <button
                onClick={handleTrade}
                disabled={isProcessing || !canAfford || amountNum <= 0}
                className={`px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                  mode === "buy"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/25"
                }`}
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
                  mode === "buy" 
                    ? (lang === "tr" ? "Satın Al" : "Buy Now")
                    : (lang === "tr" ? "Şimdi Sat" : "Sell Now")
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetalTradeModal;
