"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useLanguage } from "@/components/LanguageContext";

interface MetalConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

type MetalType = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
type CryptoType = "ETH" | "BTC" | "XRP" | "SOL";
type TargetType = "AUXM" | "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "ETH" | "BTC" | "XRP" | "SOL";

// 6-language translations - INSTITUTIONAL LANGUAGE (Priority 8)
const translations: Record<string, Record<string, string>> = {
  tr: {
    convert: "Yeniden Tahsis Et",
    toOtherAssets: "Diğer Varlıklara",
    send: "Kaynak",
    receive: "Hedef",
    balance: "Mevcut Varlıklar",
    fixed: "Sabit",
    youllReceive: "Tahsis Edilecek",
    rate: "Uygulama Kuru",
    processing: "Tahsis İşleniyor...",
    success: "Tahsis Tamamlandı!",
    insufficientBalance: "Yetersiz varlık",
    platformCurrency: "Platform Bakiyesi",
    metals: "Tahsisli Metaller",
    cryptos: "Dijital Varlıklar",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    auxiteMoney: "AUXM Bakiyesi",
    executionSpread: "Uygulama Spreadi",
    internalExecution: "Dahili uygulama — dış piyasa riski yok",
  },
  en: {
    convert: "Reallocate",
    toOtherAssets: "To Other Holdings",
    send: "Source",
    receive: "Target",
    balance: "Current Holdings",
    fixed: "Fixed",
    youllReceive: "You'll Receive",
    rate: "Execution Rate",
    processing: "Processing Reallocation...",
    success: "Reallocation Complete!",
    insufficientBalance: "Insufficient holdings",
    platformCurrency: "Platform Balance",
    metals: "Allocated Metals",
    cryptos: "Digital Assets",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    auxiteMoney: "AUXM Balance",
    executionSpread: "Execution Spread",
    internalExecution: "Executed internally — no external market exposure",
  },
  de: {
    convert: "Neu Allokieren",
    toOtherAssets: "Zu anderen Beständen",
    send: "Quelle",
    receive: "Ziel",
    balance: "Aktuelle Bestände",
    fixed: "Fest",
    youllReceive: "Sie erhalten",
    rate: "Ausführungskurs",
    processing: "Reallokation wird verarbeitet...",
    success: "Reallokation abgeschlossen!",
    insufficientBalance: "Unzureichende Bestände",
    platformCurrency: "Plattform-Guthaben",
    metals: "Allokierte Metalle",
    cryptos: "Digitale Vermögenswerte",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    auxiteMoney: "AUXM Guthaben",
    executionSpread: "Ausführungs-Spread",
    internalExecution: "Intern ausgeführt — kein externes Marktrisiko",
  },
  fr: {
    convert: "Réallouer",
    toOtherAssets: "Vers d'autres actifs",
    send: "Source",
    receive: "Cible",
    balance: "Avoirs actuels",
    fixed: "Fixe",
    youllReceive: "Vous recevrez",
    rate: "Taux d'exécution",
    processing: "Réallocation en cours...",
    success: "Réallocation terminée!",
    insufficientBalance: "Avoirs insuffisants",
    platformCurrency: "Solde plateforme",
    metals: "Métaux alloués",
    cryptos: "Actifs numériques",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    auxiteMoney: "Solde AUXM",
    executionSpread: "Spread d'exécution",
    internalExecution: "Exécuté en interne — pas d'exposition au marché externe",
  },
  ar: {
    convert: "إعادة التخصيص",
    toOtherAssets: "إلى أصول أخرى",
    send: "المصدر",
    receive: "الهدف",
    balance: "الحيازات الحالية",
    fixed: "ثابت",
    youllReceive: "ستستلم",
    rate: "سعر التنفيذ",
    processing: "جاري إعادة التخصيص...",
    success: "تم إعادة التخصيص!",
    insufficientBalance: "حيازات غير كافية",
    platformCurrency: "رصيد المنصة",
    metals: "المعادن المخصصة",
    cryptos: "الأصول الرقمية",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    auxiteMoney: "رصيد AUXM",
    executionSpread: "هامش التنفيذ",
    internalExecution: "تنفيذ داخلي — لا تعرض للسوق الخارجي",
  },
  ru: {
    convert: "Переаллоцировать",
    toOtherAssets: "В другие активы",
    send: "Источник",
    receive: "Цель",
    balance: "Текущие активы",
    fixed: "Фикс.",
    youllReceive: "Вы получите",
    rate: "Курс исполнения",
    processing: "Переаллокация...",
    success: "Переаллокация завершена!",
    insufficientBalance: "Недостаточно активов",
    platformCurrency: "Баланс платформы",
    metals: "Аллоцированные металлы",
    cryptos: "Цифровые активы",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    auxiteMoney: "Баланс AUXM",
    executionSpread: "Спред исполнения",
    internalExecution: "Внутреннее исполнение — без внешнего рыночного риска",
  },
};

const METAL_INFO: Record<MetalType, { 
  nameKey: string; 
  icon: string; 
  bgColor: string;
  borderColor: string;
}> = {
  AUXG: { nameKey: "gold", icon: "/gold-favicon-32x32.png", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  AUXS: { nameKey: "silver", icon: "/silver-favicon-32x32.png", bgColor: "bg-slate-400/20", borderColor: "border-slate-400/50" },
  AUXPT: { nameKey: "platinum", icon: "/platinum-favicon-32x32.png", bgColor: "bg-slate-300/20", borderColor: "border-slate-300/50" },
  AUXPD: { nameKey: "palladium", icon: "/palladium-favicon-32x32.png", bgColor: "bg-slate-500/20", borderColor: "border-slate-500/50" },
};

const TARGET_INFO: Record<TargetType, { 
  nameKey: string; 
  icon?: string;
  emoji?: string;
  bgColor: string;
  borderColor: string;
  category: "fiat" | "metal" | "crypto";
}> = {
  AUXM: { nameKey: "auxiteMoney", emoji: "◈", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30", category: "fiat" },
  AUXG: { nameKey: "gold", icon: "/gold-favicon-32x32.png", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30", category: "metal" },
  AUXS: { nameKey: "silver", icon: "/silver-favicon-32x32.png", bgColor: "bg-slate-400/10", borderColor: "border-slate-400/30", category: "metal" },
  AUXPT: { nameKey: "platinum", icon: "/platinum-favicon-32x32.png", bgColor: "bg-slate-300/10", borderColor: "border-slate-300/30", category: "metal" },
  AUXPD: { nameKey: "palladium", icon: "/palladium-favicon-32x32.png", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", category: "metal" },
  ETH: { nameKey: "Ethereum", emoji: "Ξ", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30", category: "crypto" },
  BTC: { nameKey: "Bitcoin", emoji: "₿", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30", category: "crypto" },
  XRP: { nameKey: "Ripple", emoji: "✕", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30", category: "crypto" },
  SOL: { nameKey: "Solana", emoji: "◎", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", category: "crypto" },
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

  console.log("MetalConvertModal lang:", lang);
  const { lang: currentLang } = useLanguage();
  const effectiveLang = currentLang;
  const t = translations[effectiveLang] || translations.en;

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

  const getTargetName = (target: TargetType): string => {
    const info = TARGET_INFO[target];
    // For crypto, use the nameKey directly as it's the same in all languages
    if (info.category === "crypto") {
      return info.nameKey;
    }
    // For metals and fiat, get translated name
    return t[info.nameKey] || info.nameKey;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{metal} {t.convert}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t[metalInfo.nameKey]} → {t.toOtherAssets}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {result && (
            <div className={`p-4 rounded-xl text-center ${
              result.type === "success" ? "bg-[#2F6F62]/20 border border-[#2F6F62]/50" : "bg-red-500/20 border border-red-500/50"
            }`}>
              <div className="text-3xl mb-2">{result.type === "success" ? "✅" : "❌"}</div>
              <p className={result.type === "success" ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-red-600 dark:text-red-400"}>
                {result.type === "success" ? t.success : result.message}
              </p>
            </div>
          )}

          {!result && (
            <>
              {/* From Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.send}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    {t.balance}: {fromBalance.toFixed(4)} {metal}
                  </span>
                </div>
                
                <div className={`p-4 rounded-xl ${metalInfo.bgColor} border ${metalInfo.borderColor}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <img src={metalInfo.icon} alt={metal} className="w-10 h-10" />
                    <div>
                      <div className="text-slate-800 dark:text-white font-semibold">{metal}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{t[metalInfo.nameKey]}</div>
                    </div>
                    <span className="ml-auto text-xs px-2 py-1 rounded bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {t.fixed}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={fromAmount}
                      onChange={(e) => setFromAmount(e.target.value)}
                      placeholder="0.0000"
                      className={`flex-1 bg-white/50 dark:bg-slate-800/50 border rounded-lg px-4 py-3 text-slate-800 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#BFA181] ${
                        insufficientBalance ? "border-red-500" : "border-stone-300 dark:border-slate-700"
                      }`}
                    />
                    <button
                      onClick={() => setFromAmount(fromBalance.toString())}
                      className="px-4 py-2 bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62] rounded-lg font-semibold hover:bg-[#2F6F62]/30"
                    >
                      MAX
                    </button>
                  </div>
                  
                  {insufficientBalance && (
                    <p className="text-red-500 dark:text-red-400 text-xs mt-2">{t.insufficientBalance}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">≈ ${fromValueUSD.toFixed(2)} USD</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <div className="p-2 rounded-full bg-stone-100 dark:bg-slate-800 text-[#2F6F62] dark:text-[#2F6F62] text-xl">↓</div>
              </div>

              {/* To Section */}
              <div>
                <span className="text-sm text-slate-500 dark:text-slate-400 mb-2 block">{t.receive}</span>
                
                <div className="relative">
                  <button
                    onClick={() => setShowToSelect(!showToSelect)}
                    className={`w-full p-3 rounded-xl ${targetInfo.bgColor} border ${targetInfo.borderColor} hover:bg-stone-50 dark:hover:bg-slate-800/50`}
                  >
                    <div className="flex items-center gap-3">
                      {renderTargetIcon(toAsset)}
                      <div className="flex-1 text-left">
                        <div className="text-slate-800 dark:text-white font-semibold">{toAsset}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{getTargetName(toAsset)}</div>
                      </div>
                      <span className={`text-slate-500 dark:text-slate-400 transition-transform ${showToSelect ? "rotate-180" : ""}`}>▼</span>
                    </div>
                  </button>

                  {showToSelect && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl shadow-xl z-10 max-h-80 overflow-y-auto">
                      {fiatTargets.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500 bg-stone-50 dark:bg-slate-900/50">{t.platformCurrency}</div>
                          {fiatTargets.map((target) => (
                            <button key={target} onClick={() => { setToAsset(target); setShowToSelect(false); }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-slate-700/50 ${toAsset === target ? "bg-stone-100 dark:bg-slate-700/30" : ""}`}>
                              {renderTargetIcon(target)}
                              <div className="flex-1 text-left">
                                <div className="text-slate-800 dark:text-white font-medium">{target}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{getTargetName(target)}</div>
                              </div>
                              {toAsset === target && <span className="text-[#2F6F62]">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {metalTargets.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500 bg-stone-50 dark:bg-slate-900/50">{t.metals}</div>
                          {metalTargets.map((target) => (
                            <button key={target} onClick={() => { setToAsset(target); setShowToSelect(false); }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-slate-700/50 ${toAsset === target ? "bg-stone-100 dark:bg-slate-700/30" : ""}`}>
                              {renderTargetIcon(target)}
                              <div className="flex-1 text-left">
                                <div className="text-slate-800 dark:text-white font-medium">{target}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{getTargetName(target)}</div>
                              </div>
                              {toAsset === target && <span className="text-[#2F6F62]">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                      {cryptoTargets.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500 bg-stone-50 dark:bg-slate-900/50">{t.cryptos}</div>
                          {cryptoTargets.map((target) => (
                            <button key={target} onClick={() => { setToAsset(target); setShowToSelect(false); }}
                              className={`w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-slate-700/50 ${toAsset === target ? "bg-stone-100 dark:bg-slate-700/30" : ""}`}>
                              {renderTargetIcon(target)}
                              <div className="flex-1 text-left">
                                <div className="text-slate-800 dark:text-white font-medium">{target}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{getTargetName(target)}</div>
                              </div>
                              {toAsset === target && <span className="text-[#2F6F62]">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-3 p-3 bg-stone-100 dark:bg-slate-800/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-sm">{t.youllReceive}</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-slate-800 dark:text-white">{toAmount.toFixed(4)}</span>
                      <span className="text-slate-500 dark:text-slate-400 ml-2">{toAsset}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-500 text-right mt-1">≈ ${(toAmount * targetPrice).toFixed(2)} USD</p>
                </div>
              </div>

              {fromAmountNum > 0 && (
                <div className="p-3 rounded-xl bg-stone-100 dark:bg-slate-800/30 border border-stone-200 dark:border-slate-700/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t.rate}</span>
                    <span className="text-slate-700 dark:text-slate-200">1 {metal} = {(metalBidPrice / targetPrice).toFixed(4)} {toAsset}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-500 dark:text-slate-400">Spread</span>
                    <span className="text-[#BFA181] dark:text-[#BFA181]">{spreadPercent}%</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleConvert}
                disabled={!isConnected || fromAmountNum <= 0 || insufficientBalance || isProcessing}
                className={`w-full py-4 rounded-xl font-semibold text-white flex items-center justify-center gap-2 ${
                  isProcessing ? "bg-slate-400 dark:bg-slate-700 cursor-wait"
                    : !isConnected || fromAmountNum <= 0 || insufficientBalance ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-50"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                }`}
              >
                {isProcessing ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> {t.processing}</>
                ) : (
                  <>⇄ {t.convert}</>
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
