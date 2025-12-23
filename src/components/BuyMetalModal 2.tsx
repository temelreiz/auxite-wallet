"use client";

import { useState, useEffect } from "react";
import { isLaunchCampaignActive } from "@/lib/auxm-bonus-service";

interface BuyMetalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
  userBalance?: {
    auxm: number;
    bonusAuxm: number;
  };
  metalPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
}

type MetalType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

const METALS = {
  AUXG: { 
    name: "Auxite Gold", 
    nameTr: "Auxite Altın", 
    icon: "🥇", 
    color: "from-yellow-500 to-amber-600",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30"
  },
  AUXS: { 
    name: "Auxite Silver", 
    nameTr: "Auxite Gümüş", 
    icon: "🥈", 
    color: "from-slate-400 to-slate-500",
    bgColor: "bg-slate-400/10",
    borderColor: "border-slate-400/30"
  },
  AUXPT: { 
    name: "Auxite Platinum", 
    nameTr: "Auxite Platin", 
    icon: "⚪", 
    color: "from-slate-300 to-slate-400",
    bgColor: "bg-slate-300/10",
    borderColor: "border-slate-300/30"
  },
  AUXPD: { 
    name: "Auxite Palladium", 
    nameTr: "Auxite Paladyum", 
    icon: "🔘", 
    color: "from-slate-500 to-slate-600",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/30"
  },
};

export function BuyMetalModal({
  isOpen,
  onClose,
  lang = "tr",
  userBalance = { auxm: 1250.50, bonusAuxm: 25.00 },
  metalPrices = { AUXG: 139.31, AUXS: 1.79, AUXPT: 54.14, AUXPD: 48.16 },
}: BuyMetalModalProps) {
  const [selectedMetal, setSelectedMetal] = useState<MetalType>("AUXG");
  const [amount, setAmount] = useState<string>("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const totalAuxm = userBalance.auxm + userBalance.bonusAuxm;
  const isCampaignActive = isLaunchCampaignActive();

  useEffect(() => {
    if (isOpen) {
      setAmount("1");
      setResult(null);
      setSelectedMetal("AUXG");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const metal = METALS[selectedMetal];
  const price = metalPrices[selectedMetal];
  const amountNum = parseFloat(amount) || 0;
  const totalCost = price * amountNum;
  const canAfford = totalCost <= totalAuxm;

  // Bonus kullanımı hesaplama
  const bonusUsage = userBalance.bonusAuxm >= totalCost 
    ? { usedBonus: totalCost, usedRegular: 0 }
    : { usedBonus: userBalance.bonusAuxm, usedRegular: totalCost - userBalance.bonusAuxm };

  const handleMaxClick = () => {
    const maxGrams = totalAuxm / price;
    setAmount(maxGrams.toFixed(4));
  };

  const handleBuy = async () => {
    if (!canAfford || amountNum <= 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "0x123",
          action: "buy",
          metal: selectedMetal,
          amount: amountNum,
        }),
      });

      if (response.ok) {
        setResult("success");
        setTimeout(() => onClose(), 2500);
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              {lang === "tr" ? "Değerli Metal Al" : "Buy Precious Metal"}
            </h2>
            <p className="text-sm text-slate-400">
              {lang === "tr" ? "AUXM ile metal token satın al" : "Buy metal tokens with AUXM"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Campaign Banner */}
          {isCampaignActive && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <div>
                  <div className="text-sm font-semibold text-purple-300">
                    {lang === "tr" ? "Lansman Kampanyası Aktif!" : "Launch Campaign Active!"}
                  </div>
                  <div className="text-xs text-purple-400">
                    {lang === "tr" 
                      ? "Bonus AUXM öncelikli olarak kullanılır" 
                      : "Bonus AUXM is used first"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success State */}
          {result === "success" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-2">
                {lang === "tr" ? "Satın Alma Başarılı!" : "Purchase Successful!"}
              </h3>
              <p className="text-slate-400">
                {amountNum.toFixed(4)}g {selectedMetal} {lang === "tr" ? "satın alındı" : "purchased"}
              </p>
              {bonusUsage.usedBonus > 0 && (
                <p className="text-purple-400 text-sm mt-2">
                  🎁 {bonusUsage.usedBonus.toFixed(2)} Bonus AUXM {lang === "tr" ? "kullanıldı" : "used"}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Metal Selection */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  {lang === "tr" ? "Metal Seç" : "Select Metal"}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(METALS) as MetalType[]).map((metalKey) => {
                    const m = METALS[metalKey];
                    const isSelected = selectedMetal === metalKey;
                    return (
                      <button
                        key={metalKey}
                        onClick={() => setSelectedMetal(metalKey)}
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? `bg-gradient-to-br ${m.color} border-transparent text-white shadow-lg`
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                        }`}
                      >
                        <div className="text-2xl mb-1">{m.icon}</div>
                        <div className="text-xs font-medium">{metalKey}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Metal Info */}
              <div className={`p-4 rounded-xl ${metal.bgColor} border ${metal.borderColor}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{metal.icon}</span>
                    <div>
                      <div className="font-semibold text-white">{selectedMetal}</div>
                      <div className="text-sm text-slate-400">
                        {lang === "tr" ? metal.nameTr : metal.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white font-mono">
                      ${price.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-400">/ gram</div>
                  </div>
                </div>
              </div>

              {/* AUXM Balance */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">AUXM {lang === "tr" ? "Bakiye" : "Balance"}</span>
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
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50"
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

              {/* Total Cost */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400">{lang === "tr" ? "Toplam Ödeme" : "Total Cost"}</span>
                  <span className="text-2xl font-bold text-purple-400 font-mono">
                    {totalCost.toFixed(2)} AUXM
                  </span>
                </div>
                {userBalance.bonusAuxm > 0 && amountNum > 0 && (
                  <div className="pt-2 border-t border-purple-500/20 space-y-1 text-sm">
                    <div className="flex justify-between text-purple-300">
                      <span>🎁 {lang === "tr" ? "Bonus Kullanımı" : "Bonus Usage"}</span>
                      <span className="font-mono">{bonusUsage.usedBonus.toFixed(2)} AUXM</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>{lang === "tr" ? "Normal AUXM" : "Regular AUXM"}</span>
                      <span className="font-mono">{bonusUsage.usedRegular.toFixed(2)} AUXM</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Insufficient Balance Warning */}
              {!canAfford && amountNum > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-400">
                    ⚠️ {lang === "tr" ? "Yetersiz AUXM bakiyesi" : "Insufficient AUXM balance"}
                  </p>
                </div>
              )}

              {/* What you get */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 text-sm">
                    {lang === "tr" ? "Alacağınız" : "You will receive"}
                  </span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {amountNum.toFixed(4)}g {selectedMetal} {metal.icon}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {result !== "success" && (
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleBuy}
              disabled={isProcessing || !canAfford || amountNum <= 0}
              className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
                  {metal.icon} {lang === "tr" ? `${selectedMetal} Satın Al` : `Buy ${selectedMetal}`}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyMetalModal;
