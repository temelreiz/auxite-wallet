"use client";

import { useState } from "react";

interface MetalConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  lang?: "tr" | "en";
  metalBalances?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
  cryptoBalances?: {
    ETH: number;
    BTC: number;
    XRP: number;
    SOL: number;
  };
  auxmBalance?: number;
  metalPrices?: {
    AUXG: { ask: number; bid: number };
    AUXS: { ask: number; bid: number };
    AUXPT: { ask: number; bid: number };
    AUXPD: { ask: number; bid: number };
  };
  cryptoPrices?: {
    ETH: number;
    BTC: number;
    XRP: number;
    SOL: number;
  };
}

type MetalType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type CryptoType = "ETH" | "BTC" | "XRP" | "SOL";
type TargetType = "AUXM" | "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "ETH" | "BTC" | "XRP" | "SOL";

const METAL_INFO: Record<MetalType, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/gold-favicon-32x32.png", color: "#FFD700", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/silver-favicon-32x32.png", color: "#C0C0C0", bgColor: "bg-slate-400/20", borderColor: "border-slate-400/50" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/platinum-favicon-32x32.png", color: "#E5E4E2", bgColor: "bg-slate-300/20", borderColor: "border-slate-300/50" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/palladium-favicon-32x32.png", color: "#CED0DD", bgColor: "bg-slate-500/20", borderColor: "border-slate-500/50" },
};

const TARGET_INFO: Record<TargetType, { 
  name: string; 
  nameTr: string; 
  icon?: string;
  emoji?: string;
  bgColor: string;
  borderColor: string;
  category: "fiat" | "metal" | "crypto";
}> = {
  // Fiat
  AUXM: { name: "Auxite Money", nameTr: "Auxite Para", emoji: "◈", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30", category: "fiat" },
  // Metals
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/gold-favicon-32x32.png", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", category: "metal" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/silver-favicon-32x32.png", bgColor: "bg-slate-400/10", borderColor: "border-slate-400/30", category: "metal" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/platinum-favicon-32x32.png", bgColor: "bg-slate-300/10", borderColor: "border-slate-300/30", category: "metal" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/palladium-favicon-32x32.png", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", category: "metal" },
  // Cryptos
  ETH: { name: "Ethereum", nameTr: "Ethereum", emoji: "Ξ", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", category: "crypto" },
  BTC: { name: "Bitcoin", nameTr: "Bitcoin", emoji: "₿", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", category: "crypto" },
  XRP: { name: "Ripple", nameTr: "Ripple", emoji: "✕", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", category: "crypto" },
  SOL: { name: "Solana", nameTr: "Solana", emoji: "◎", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", category: "crypto" },
};

const CRYPTO_COLORS: Record<CryptoType, string> = {
  ETH: "#627EEA",
  BTC: "#F7931A",
  XRP: "#23292F",
  SOL: "#9945FF",
};

export function MetalConvertModal({
  isOpen,
  onClose,
  metal,
  lang = "tr",
  metalBalances = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 },
  cryptoBalances = { ETH: 0, BTC: 0, XRP: 0, SOL: 0 },
  auxmBalance = 5000,
  metalPrices = { 
    AUXG: { ask: 139.04, bid: 134.69 }, 
    AUXS: { ask: 1.93, bid: 1.82 }, 
    AUXPT: { ask: 54.85, bid: 52.92 }, 
    AUXPD: { ask: 47.09, bid: 45.57 } 
  },
  cryptoPrices = { ETH: 3650, BTC: 97500, XRP: 2.20, SOL: 235 },
}: MetalConvertModalProps) {
  const [toAsset, setToAsset] = useState<TargetType>("AUXM");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showToSelect, setShowToSelect] = useState(false);

  // Kaynak metal SABİT
  const metalInfo = METAL_INFO[metal];
  const fromBalance = metalBalances[metal];
  const metalBidPrice = metalPrices[metal].bid; // Metal satış fiyatı (USD/g)

  // Hedef varlık bilgisi
  const targetInfo = TARGET_INFO[toAsset];

  // Hedef fiyatı hesapla
  const getTargetPrice = (target: TargetType): number => {
    if (target === "AUXM") return 1;
    if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(target)) {
      return metalPrices[target as MetalType].ask;
    }
    if (["ETH", "BTC", "XRP", "SOL"].includes(target)) {
      return cryptoPrices[target as CryptoType];
    }
    return 1;
  };

  const targetPrice = getTargetPrice(toAsset);

  // Hesaplamalar
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * metalBidPrice;
  
  // Spread %0.5
  const spreadPercent = 0.5;
  const toAmount = (fromValueUSD / targetPrice) * (1 - spreadPercent / 100);

  const insufficientBalance = fromAmountNum > fromBalance;

  // İşlem
  const handleConvert = async () => {
    if (fromAmountNum <= 0 || insufficientBalance) return;
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setResult("success");
    setIsProcessing(false);
    
    setTimeout(() => {
      setResult(null);
      setFromAmount("");
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;

  // Hedef seçenekleri (kaynak metal hariç)
  const allTargets: TargetType[] = ["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD", "ETH", "BTC", "XRP", "SOL"];
  const availableTargets = allTargets.filter(t => t !== metal);

  // Kategorilere göre grupla
  const fiatTargets = availableTargets.filter(t => TARGET_INFO[t].category === "fiat");
  const metalTargets = availableTargets.filter(t => TARGET_INFO[t].category === "metal");
  const cryptoTargets = availableTargets.filter(t => TARGET_INFO[t].category === "crypto");

  // Hedef için ikon renderla
  const renderTargetIcon = (target: TargetType) => {
    const info = TARGET_INFO[target];
    if (info.icon) {
      return <img src={info.icon} alt={target} className="w-8 h-8" />;
    }
    if (info.category === "crypto") {
      return (
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ backgroundColor: CRYPTO_COLORS[target as CryptoType] }}
        >
          {info.emoji}
        </div>
      );
    }
    // AUXM
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
        {info.emoji}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={metalInfo.icon} alt={metal} className="w-8 h-8" />
            <div>
              <h2 className="text-lg font-bold text-white">
                {metal} {lang === "tr" ? "Dönüştür" : "Convert"}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "tr" ? `${metalInfo.nameTr} → Diğer Varlıklar` : `${metalInfo.name} → Other Assets`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* From Section - SABİT */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{lang === "tr" ? "Gönder" : "From"}</span>
              <span className="text-xs text-slate-500">
                {lang === "tr" ? "Bakiye" : "Balance"}: {fromBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {metal}
              </span>
            </div>
            
            {/* Kaynak Metal - SABİT */}
            <div className={`p-3 rounded-xl ${metalInfo.bgColor} border ${metalInfo.borderColor}`}>
              <div className="flex items-center gap-3">
                <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
                <div className="flex-1">
                  <div className="text-white font-semibold">{metal}</div>
                  <div className="text-xs text-slate-400">{lang === "tr" ? metalInfo.nameTr : metalInfo.name}</div>
                </div>
                <div className="px-2 py-1 rounded bg-slate-700/50 text-xs text-slate-400">
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
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.0000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-lg font-mono placeholder-slate-600 focus:outline-none focus:border-slate-600"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{metal}</span>
                </div>
                <button
                  onClick={() => setFromAmount(fromBalance.toString())}
                  className="px-3 py-3 bg-slate-800 border border-slate-700 rounded-xl text-emerald-500 text-sm font-medium hover:bg-slate-700"
                >
                  MAX
                </button>
              </div>
              {insufficientBalance && (
                <p className="text-xs text-red-400 mt-1">{lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                ≈ ${fromValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* To Section - SEÇİLEBİLİR */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">{lang === "tr" ? "Al" : "To"}</span>
            </div>
            
            {/* Hedef Seçici */}
            <div className="relative">
              <button
                onClick={() => setShowToSelect(!showToSelect)}
                className={`w-full p-3 rounded-xl ${targetInfo.bgColor} border ${targetInfo.borderColor} hover:bg-slate-800/50 transition-all`}
              >
                <div className="flex items-center gap-3">
                  {renderTargetIcon(toAsset)}
                  <div className="flex-1 text-left">
                    <div className="text-white font-semibold">{toAsset}</div>
                    <div className="text-xs text-slate-400">{lang === "tr" ? targetInfo.nameTr : targetInfo.name}</div>
                  </div>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform ${showToSelect ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Dropdown */}
              {showToSelect && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden max-h-80 overflow-y-auto">
                  {/* Fiat */}
                  {fiatTargets.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs text-slate-500 bg-slate-900/50">
                        {lang === "tr" ? "Platform Para Birimi" : "Platform Currency"}
                      </div>
                      {fiatTargets.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setToAsset(t); setShowToSelect(false); }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors ${toAsset === t ? "bg-slate-700/30" : ""}`}
                        >
                          {renderTargetIcon(t)}
                          <div className="flex-1 text-left">
                            <div className="text-white font-medium">{t}</div>
                            <div className="text-xs text-slate-400">{lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}</div>
                          </div>
                          {toAsset === t && (
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Metals */}
                  {metalTargets.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs text-slate-500 bg-slate-900/50">
                        {lang === "tr" ? "Metaller" : "Metals"}
                      </div>
                      {metalTargets.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setToAsset(t); setShowToSelect(false); }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors ${toAsset === t ? "bg-slate-700/30" : ""}`}
                        >
                          {renderTargetIcon(t)}
                          <div className="flex-1 text-left">
                            <div className="text-white font-medium">{t}</div>
                            <div className="text-xs text-slate-400">{lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}</div>
                          </div>
                          {toAsset === t && (
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </>
                  )}

                  {/* Cryptos */}
                  {cryptoTargets.length > 0 && (
                    <>
                      <div className="px-3 py-2 text-xs text-slate-500 bg-slate-900/50">
                        {lang === "tr" ? "Kriptolar" : "Cryptos"}
                      </div>
                      {cryptoTargets.map((t) => (
                        <button
                          key={t}
                          onClick={() => { setToAsset(t); setShowToSelect(false); }}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 transition-colors ${toAsset === t ? "bg-slate-700/30" : ""}`}
                        >
                          {renderTargetIcon(t)}
                          <div className="flex-1 text-left">
                            <div className="text-white font-medium">{t}</div>
                            <div className="text-xs text-slate-400">{lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}</div>
                          </div>
                          {toAsset === t && (
                            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Alınacak Miktar */}
            <div className="mt-3 p-3 bg-slate-800/50 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">{lang === "tr" ? "Alacağınız" : "You'll receive"}</span>
                <div className="text-right">
                  <span className="text-xl font-bold text-white">
                    {toAmount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-slate-400 ml-2">{toAsset}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 text-right mt-1">
                ≈ ${(toAmount * targetPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD
              </p>
            </div>
          </div>

          {/* Summary */}
          {fromAmountNum > 0 && (
            <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{lang === "tr" ? "Kur" : "Rate"}</span>
                <span className="text-slate-200">
                  1 {metal} = {(metalBidPrice / targetPrice).toFixed(4)} {toAsset}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-400">Spread</span>
                <span className="text-amber-400">{spreadPercent}%</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleConvert}
            disabled={fromAmountNum <= 0 || insufficientBalance || isProcessing}
            className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${
              isProcessing
                ? "bg-slate-700 cursor-wait"
                : result === "success"
                ? "bg-emerald-500"
                : fromAmountNum <= 0 || insufficientBalance
                ? "bg-slate-700 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
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
                {lang === "tr" ? "Dönüştür" : "Convert"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
