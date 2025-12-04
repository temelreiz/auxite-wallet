"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface MetalConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  lang?: "tr" | "en";
}

type MetalType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type CryptoType = "ETH" | "BTC" | "XRP" | "SOL";
type TargetType = "AUXM" | "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "ETH" | "BTC" | "XRP" | "SOL";

const METAL_INFO: Record<MetalType, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  bgColor: string;
  borderColor: string;
}> = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/gold-favicon-32x32.png", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/silver-favicon-32x32.png", bgColor: "bg-slate-400/20", borderColor: "border-slate-400/50" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/platinum-favicon-32x32.png", bgColor: "bg-slate-300/20", borderColor: "border-slate-300/50" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/palladium-favicon-32x32.png", bgColor: "bg-slate-500/20", borderColor: "border-slate-500/50" },
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
  AUXM: { name: "Auxite Money", nameTr: "Auxite Para", emoji: "◈", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30", category: "fiat" },
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/gold-favicon-32x32.png", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", category: "metal" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/silver-favicon-32x32.png", bgColor: "bg-slate-400/10", borderColor: "border-slate-400/30", category: "metal" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/platinum-favicon-32x32.png", bgColor: "bg-slate-300/10", borderColor: "border-slate-300/30", category: "metal" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/palladium-favicon-32x32.png", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", category: "metal" },
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
}: MetalConvertModalProps) {
  const { balances, address, refreshBalances, isConnected } = useWallet();
  const { prices: metalAskPrices, bidPrices: metalBidPrices } = useMetalsPrices();
  const { prices: cryptoPrices } = useCryptoPrices();

  const [toAsset, setToAsset] = useState<TargetType>("AUXM");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message?: string } | null>(null);
  const [showToSelect, setShowToSelect] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFromAmount("");
      setToAsset("AUXM");
      setResult(null);
      setShowToSelect(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const metalBalances = {
    AUXG: balances?.auxg ?? 0,
    AUXS: balances?.auxs ?? 0,
    AUXPT: balances?.auxpt ?? 0,
    AUXPD: balances?.auxpd ?? 0,
  };

  const realCryptoPrices = {
    ETH: cryptoPrices?.eth ?? 3000,
    BTC: cryptoPrices?.btc ?? 95000,
    XRP: cryptoPrices?.xrp ?? 2.2,
    SOL: cryptoPrices?.sol ?? 200,
  };

  const metalInfo = METAL_INFO[metal];
  const fromBalance = metalBalances[metal];
  const metalBidPrice = metalBidPrices?.[metal] ?? 100;
  const targetInfo = TARGET_INFO[toAsset];

  const getTargetPrice = (target: TargetType): number => {
    if (target === "AUXM") return 1;
    if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(target)) {
      return metalAskPrices?.[target as MetalType] ?? 100;
    }
    if (["ETH", "BTC", "XRP", "SOL"].includes(target)) {
      return realCryptoPrices[target as CryptoType];
    }
    return 1;
  };

  const targetPrice = getTargetPrice(toAsset);
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * metalBidPrice;
  const spreadPercent = 0.5;
  const toAmount = (fromValueUSD / targetPrice) * (1 - spreadPercent / 100);
  const insufficientBalance = fromAmountNum > fromBalance;

  const handleConvert = async () => {
    if (!isConnected || !address || fromAmountNum <= 0 || insufficientBalance) return;
    
    setIsProcessing(true);
    setResult(null);

    try {
      let tradeType: "sell" | "swap" = "sell";
      if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(toAsset)) {
        tradeType = "swap";
      }

      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          type: tradeType,
          fromToken: metal,
          toToken: toAsset,
          fromAmount: fromAmountNum,
          price: toAsset === "AUXM" ? metalBidPrice : (metalBidPrice / targetPrice),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Trade failed");
      }

      setResult({ type: "success" });
      await refreshBalances();

      setTimeout(() => {
        setResult(null);
        setFromAmount("");
        onClose();
      }, 2000);

    } catch (err) {
      console.error("Convert error:", err);
      setResult({ type: "error", message: err instanceof Error ? err.message : "İşlem başarısız" });
    } finally {
      setIsProcessing(false);
    }
  };

  const allTargets: TargetType[] = ["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD"];
  const availableTargets = allTargets.filter(t => t !== metal);
  const fiatTargets = availableTargets.filter(t => TARGET_INFO[t].category === "fiat");
  const metalTargets = availableTargets.filter(t => TARGET_INFO[t].category === "metal");
  const cryptoTargets = availableTargets.filter(t => TARGET_INFO[t].category === "crypto");

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
    return (
      <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-lg">
        {info.emoji}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
            <div>
              <h2 className="text-lg font-bold text-white">{metal} {lang === "tr" ? "Dönüştür" : "Convert"}</h2>
              <p className="text-sm text-slate-400">
                {lang === "tr" ? `${metalInfo.nameTr} → Diğer Varlıklar` : `${metalInfo.name} → Other Assets`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {result && (
            <div className={`p-4 rounded-xl text-center ${
              result.type === "success" ? "bg-emerald-500/20 border border-emerald-500/50" : "bg-red-500/20 border border-red-500/50"
            }`}>
              <div className="text-3xl mb-2">{result.type === "success" ? "✅" : "❌"}</div>
              <p className={result.type === "success" ? "text-emerald-400" : "text-red-400"}>
                {result.type === "success" ? (lang === "tr" ? "Başarılı!" : "Success!") : result.message}
              </p>
            </div>
          )}

          {!result && (
            <>
              {/* From Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{lang === "tr" ? "Gönder" : "Send"}</span>
                  <span className="text-xs text-slate-500">
                    {lang === "tr" ? "Bakiye" : "Balance"}: {fromBalance.toFixed(4)} {metal}
                  </span>
                </div>
                
                <div className={`p-4 rounded-xl ${metalInfo.bgColor} border ${metalInfo.borderColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
                    <div>
                      <div className="text-white font-semibold">{metal}</div>
                      <div className="text-xs text-slate-400">{lang === "tr" ? metalInfo.nameTr : metalInfo.name}</div>
                    </div>
                    <span className="ml-auto text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                      {lang === "tr" ? "Sabit" : "Fixed"}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.0000"
                      className={`flex-1 bg-slate-800/50 border rounded-lg px-4 py-3 text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        insufficientBalance ? "border-red-500" : "border-slate-700"
                      }`}
                    />
                    <button
                      onClick={() => setFromAmount(fromBalance.toString())}
                      className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-semibold hover:bg-emerald-500/30"
                    >
                      MAX
                    </button>
                  </div>
                  
                  {insufficientBalance && (
                    <p className="text-red-400 text-xs mt-2">{lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}</p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">≈ ${fromValueUSD.toFixed(2)} USD</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 rounded-full bg-slate-800 text-emerald-400 text-xl">↓</div>
              </div>

              {/* To Section */}
              <div>
                <span className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Al" : "Receive"}</span>
                
                <div className="relative">
                  <button
                    onClick={() => setShowToSelect(!showToSelect)}
                    className={`w-full p-3 rounded-xl ${targetInfo.bgColor} border ${targetInfo.borderColor} hover:bg-slate-800/50`}
                  >
                    <div className="flex items-center gap-3">
                      {renderTargetIcon(toAsset)}
                      <div className="flex-1 text-left">
                        <div className="text-white font-semibold">{toAsset}</div>
                        <div className="text-xs text-slate-400">{lang === "tr" ? targetInfo.nameTr : targetInfo.name}</div>
                      </div>
                      <span className={`transition-transform ${showToSelect ? "rotate-180" : ""}`}>▼</span>
                    </div>
                  </button>

                  {showToSelect && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 max-h-80 overflow-y-auto">
                      {fiatTargets.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 bg-slate-900/50">{lang === "tr" ? "Platform Para" : "Platform Currency"}</div>
                          {fiatTargets.map((t) => (
                            <button key={t} onClick={() => { setToAsset(t); setShowToSelect(false); }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 ${toAsset === t ? "bg-slate-700/30" : ""}`}>
                              {renderTargetIcon(t)}
                              <div className="flex-1 text-left">
                                <div className="text-white font-medium">{t}</div>
                                <div className="text-xs text-slate-400">{lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}</div>
                              </div>
                              {toAsset === t && <span className="text-emerald-500">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {metalTargets.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 bg-slate-900/50">{lang === "tr" ? "Metaller" : "Metals"}</div>
                          {metalTargets.map((t) => (
                            <button key={t} onClick={() => { setToAsset(t); setShowToSelect(false); }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 ${toAsset === t ? "bg-slate-700/30" : ""}`}>
                              {renderTargetIcon(t)}
                              <div className="flex-1 text-left">
                                <div className="text-white font-medium">{t}</div>
                                <div className="text-xs text-slate-400">{lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}</div>
                              </div>
                              {toAsset === t && <span className="text-emerald-500">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {cryptoTargets.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 bg-slate-900/50">{lang === "tr" ? "Kriptolar" : "Cryptos"}</div>
                          {cryptoTargets.map((t) => (
                            <button key={t} onClick={() => { setToAsset(t); setShowToSelect(false); }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 ${toAsset === t ? "bg-slate-700/30" : ""}`}>
                              {renderTargetIcon(t)}
                              <div className="flex-1 text-left">
                                <div className="text-white font-medium">{t}</div>
                                <div className="text-xs text-slate-400">{lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}</div>
                              </div>
                              {toAsset === t && <span className="text-emerald-500">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">{lang === "tr" ? "Alacağınız" : "You'll receive"}</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-white">{toAmount.toFixed(4)}</span>
                      <span className="text-slate-400 ml-2">{toAsset}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 text-right mt-1">≈ ${(toAmount * targetPrice).toFixed(2)} USD</p>
                </div>
              </div>

              {fromAmountNum > 0 && (
                <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{lang === "tr" ? "Kur" : "Rate"}</span>
                    <span className="text-slate-200">1 {metal} = {(metalBidPrice / targetPrice).toFixed(4)} {toAsset}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-400">Spread</span>
                    <span className="text-amber-400">{spreadPercent}%</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConvert}
                disabled={!isConnected || fromAmountNum <= 0 || insufficientBalance || isProcessing}
                className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 ${
                  isProcessing ? "bg-slate-700 cursor-wait"
                    : !isConnected || fromAmountNum <= 0 || insufficientBalance ? "bg-slate-700 cursor-not-allowed opacity-50"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                }`}
              >
                {isProcessing ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> {lang === "tr" ? "İşleniyor..." : "Processing..."}</>
                ) : (
                  <>⇄ {lang === "tr" ? "Dönüştür" : "Convert"}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetalConvertModal;
