"use client";

import { useState } from "react";

interface MetalExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  lang?: string;
  metalBalances?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
  auxmBalance?: number;
  metalPrices?: {
    AUXG: { ask: number; bid: number };
    AUXS: { ask: number; bid: number };
    AUXPT: { ask: number; bid: number };
    AUXPD: { ask: number; bid: number };
  };
}

type MetalType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type TargetType = "AUXM" | "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type ModeType = "sell" | "buy"; // sell: Metal → AUXM, buy: AUXM → Metal

const METAL_INFO: Record<MetalType, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/auxg_icon.png", color: "#FFD700", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/auxs_icon.png", color: "#C0C0C0", bgColor: "bg-slate-400/20", borderColor: "border-slate-400/50" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/auxpt_icon.png", color: "#E5E4E2", bgColor: "bg-slate-300/20", borderColor: "border-slate-300/50" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/auxpd_icon.png", color: "#CED0DD", bgColor: "bg-slate-500/20", borderColor: "border-slate-500/50" },
};

const TARGET_INFO: Record<TargetType, { 
  name: string; 
  nameTr: string; 
  emoji: string;
  bgColor: string;
  borderColor: string;
}> = {
  AUXM: { name: "Auxite Money", nameTr: "Auxite Para", emoji: "◈", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30" },
  AUXG: { name: "Gold", nameTr: "Altın", emoji: "🥇", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  AUXS: { name: "Silver", nameTr: "Gümüş", emoji: "🥈", bgColor: "bg-slate-400/10", borderColor: "border-slate-400/30" },
  AUXPT: { name: "Platinum", nameTr: "Platin", emoji: "⚪", bgColor: "bg-slate-300/10", borderColor: "border-slate-300/30" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", emoji: "🔘", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30" },
};

export function MetalExchangeModal({
  isOpen,
  onClose,
  metal,
  lang = "tr",
  metalBalances = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 },
  auxmBalance = 5000,
  metalPrices = { 
    AUXG: { ask: 139.04, bid: 134.69 }, 
    AUXS: { ask: 1.93, bid: 1.82 }, 
    AUXPT: { ask: 54.85, bid: 52.92 }, 
    AUXPD: { ask: 47.09, bid: 45.57 } 
  },
}: MetalExchangeModalProps) {
  const [mode, setMode] = useState<ModeType>("buy"); // buy: AUXM → Metal, sell: Metal → AUXM
  const [amount, setAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showTargetSelect, setShowTargetSelect] = useState(false);
  const [targetAsset, setTargetAsset] = useState<TargetType>("AUXM");

  // Kaynak metal SABİT - prop'tan geliyor
  const metalInfo = METAL_INFO[metal];
  
  // Fiyatlar
  const askPrice = metalPrices[metal].ask; // Alış fiyatı (kullanıcı alırken)
  const bidPrice = metalPrices[metal].bid; // Satış fiyatı (kullanıcı satarken)
  
  // Spread hesaplama
  const spread = ((askPrice - bidPrice) / askPrice * 100).toFixed(2);

  // Hesaplamalar
  const amountNum = parseFloat(amount) || 0;
  
  let fromValue = 0;
  let toValue = 0;
  let fromBalance = 0;
  let toBalance = 0;
  let fromSymbol = "";
  let toSymbol = "";
  let price = 0;

  if (mode === "buy") {
    // AUXM → Metal (Kullanıcı AUXM veriyor, metal alıyor)
    fromSymbol = "AUXM";
    toSymbol = metal;
    fromBalance = auxmBalance;
    toBalance = metalBalances[metal];
    price = askPrice; // Ask fiyatı kullan
    fromValue = amountNum; // AUXM miktarı
    toValue = amountNum / askPrice; // Alınacak metal gram
  } else {
    // Metal → AUXM (Kullanıcı metal veriyor, AUXM alıyor)
    fromSymbol = metal;
    toSymbol = "AUXM";
    fromBalance = metalBalances[metal];
    toBalance = auxmBalance;
    price = bidPrice; // Bid fiyatı kullan
    fromValue = amountNum; // Metal gram miktarı
    toValue = amountNum * bidPrice; // Alınacak AUXM
  }

  const insufficientBalance = amountNum > fromBalance;

  // İşlem
  const handleExchange = async () => {
    if (amountNum <= 0 || insufficientBalance) return;
    
    setIsProcessing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setResult("success");
    setIsProcessing(false);
    
    // Auto close after success
    setTimeout(() => {
      setResult(null);
      setAmount("");
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  // Hedef seçenekleri (kaynak metal hariç)
  const targetOptions: TargetType[] = ["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD"].filter(t => t !== metal) as TargetType[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img src={metalInfo.icon} alt={metal} className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {metal} {lang === "tr" ? "Dönüştür" : "Exchange"}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "tr" ? `${metalInfo.nameTr} → AUXM/Metal` : `${metalInfo.name} → AUXM/Metal`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-stone-200 dark:border-slate-800">
          <div className="flex gap-2 p-1 bg-stone-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => { setMode("buy"); setAmount(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "buy"
                  ? "bg-[#2F6F62] text-white shadow-lg"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {lang === "tr" ? `${metal} Al` : `Buy ${metal}`}
            </button>
            <button
              onClick={() => { setMode("sell"); setAmount(""); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "sell"
                  ? "bg-red-500 text-white shadow-lg"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {lang === "tr" ? `${metal} Sat` : `Sell ${metal}`}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Price Info */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-slate-800/50">
            <div>
              <div className="text-xs text-slate-500">
                {mode === "buy" 
                  ? (lang === "tr" ? "Alış Fiyatı" : "Buy Price")
                  : (lang === "tr" ? "Satış Fiyatı" : "Sell Price")}
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                ${mode === "buy" ? askPrice.toFixed(2) : bidPrice.toFixed(2)}
                <span className="text-xs text-slate-400 ml-1">/g</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Spread</div>
              <div className="text-sm text-[#BFA181]">{spread}%</div>
            </div>
          </div>

          {/* From Section (SABİT) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                {lang === "tr" ? "Gönder" : "From"}
              </span>
              <span className="text-xs text-slate-500">
                {lang === "tr" ? "Bakiye" : "Balance"}: {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {fromSymbol}
              </span>
            </div>
            
            {/* Kaynak Asset - SABİT görünüm */}
            <div className={`p-3 rounded-xl ${mode === "buy" ? "bg-purple-500/10 border border-purple-500/30" : `${metalInfo.bgColor} border ${metalInfo.borderColor}`}`}>
              <div className="flex items-center gap-3">
                {mode === "buy" ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    ◈
                  </div>
                ) : (
                  <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
                )}
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-semibold">{fromSymbol}</div>
                  <div className="text-xs text-slate-400">
                    {mode === "buy" ? "Auxite Para" : metalInfo.nameTr}
                  </div>
                </div>
                <div className="px-2 py-1 rounded bg-stone-200 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400">
                  {lang === "tr" ? "Sabit" : "Fixed"}
                </div>
              </div>
            </div>

            {/* Miktar Input */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0000"
                    className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-lg font-mono placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-slate-600"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {fromSymbol}
                  </span>
                </div>
                <button
                  onClick={() => setAmount(fromBalance.toString())}
                  className="px-3 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl text-[#2F6F62] text-sm font-medium hover:bg-stone-200 dark:hover:bg-slate-700"
                >
                  MAX
                </button>
              </div>
              {insufficientBalance && (
                <p className="text-xs text-red-400 mt-1">
                  {lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                ≈ ${(mode === "buy" ? amountNum : amountNum * bidPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* To Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">
                {lang === "tr" ? "Al" : "To"}
              </span>
              <span className="text-xs text-slate-500">
                {lang === "tr" ? "Bakiye" : "Balance"}: {toBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {toSymbol}
              </span>
            </div>

            {/* Hedef Asset - SABİT görünüm */}
            <div className={`p-3 rounded-xl ${mode === "sell" ? "bg-purple-500/10 border border-purple-500/30" : `${metalInfo.bgColor} border ${metalInfo.borderColor}`}`}>
              <div className="flex items-center gap-3">
                {mode === "sell" ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                    ◈
                  </div>
                ) : (
                  <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
                )}
                <div className="flex-1">
                  <div className="text-slate-900 dark:text-white font-semibold">{toSymbol}</div>
                  <div className="text-xs text-slate-400">
                    {mode === "sell" ? "Auxite Para" : metalInfo.nameTr}
                  </div>
                </div>
              </div>
            </div>

            {/* Alınacak Miktar */}
            <div className="mt-3 p-3 bg-stone-50 dark:bg-slate-800/50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">
                  {lang === "tr" ? "Alacağınız" : "You'll receive"}
                </span>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {toValue.toLocaleString(undefined, { minimumFractionDigits: mode === "buy" ? 4 : 2, maximumFractionDigits: mode === "buy" ? 4 : 2 })}
                  </span>
                  <span className="text-slate-400 ml-2">{toSymbol}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-right mt-1">
                ≈ ${(mode === "sell" ? toValue : toValue * askPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </p>
            </div>
          </div>

          {/* Exchange Summary */}
          {amountNum > 0 && (
            <div className="p-3 rounded-xl bg-stone-50 dark:bg-slate-800/30 border border-stone-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{lang === "tr" ? "Kur" : "Rate"}</span>
                <span className="text-slate-200">
                  1 {metal} = ${price.toFixed(2)} AUXM
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">{lang === "tr" ? "İşlem Ücreti" : "Fee"}</span>
                <span className="text-[#2F6F62]">
                  {lang === "tr" ? "Ücretsiz" : "Free"}
                </span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleExchange}
            disabled={amountNum <= 0 || insufficientBalance || isProcessing}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              isProcessing
                ? "bg-stone-300 dark:bg-slate-700 cursor-wait"
                : result === "success"
                ? "bg-[#2F6F62]"
                : amountNum <= 0 || insufficientBalance
                ? "bg-stone-300 dark:bg-slate-700 cursor-not-allowed opacity-50"
                : mode === "buy"
                ? "bg-[#2F6F62] hover:bg-[#2F6F62]"
                : "bg-red-500 hover:bg-red-400"
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                {lang === "tr" ? "İşleniyor..." : "Processing..."}
              </>
            ) : result === "success" ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {lang === "tr" ? "Başarılı!" : "Success!"}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {mode === "buy" 
                  ? (lang === "tr" ? `${metal} Al` : `Buy ${metal}`)
                  : (lang === "tr" ? `${metal} Sat` : `Sell ${metal}`)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
