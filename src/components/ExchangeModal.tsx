"use client";

import { useState, useEffect, useRef, memo } from "react";
import { isLaunchCampaignActive } from "@/lib/auxm-bonus-service";

type AssetCategory = "metal" | "platform" | "crypto" | "fiat";

type AssetType = 
  | "AUXG" | "AUXS" | "AUXPT" | "AUXPD"
  | "AUXM"
  | "ETH" | "BTC" | "XRP" | "SOL" | "USDT"
  | "USD" | "EUR" | "TRY";

interface AssetInfo {
  name: string;
  nameTr: string;
  icon: string;
  category: AssetCategory;
  color: string;
  unit: string;
}

const ASSETS: Record<AssetType, AssetInfo> = {
  AUXG: { name: "Gold", nameTr: "Altın", icon: "🥇", category: "metal", color: "#F59E0B", unit: "gram" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "🥈", category: "metal", color: "#94A3B8", unit: "gram" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "⚪", category: "metal", color: "#CBD5E1", unit: "gram" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "🔘", category: "metal", color: "#64748B", unit: "gram" },
  AUXM: { name: "Auxite Money", nameTr: "Auxite Para", icon: "◈", category: "platform", color: "#A855F7", unit: "AUXM" },
  ETH: { name: "Ethereum", nameTr: "Ethereum", icon: "Ξ", category: "crypto", color: "#627EEA", unit: "ETH" },
  BTC: { name: "Bitcoin", nameTr: "Bitcoin", icon: "₿", category: "crypto", color: "#F7931A", unit: "BTC" },
  XRP: { name: "Ripple", nameTr: "Ripple", icon: "✕", category: "crypto", color: "#23292F", unit: "XRP" },
  SOL: { name: "Solana", nameTr: "Solana", icon: "◎", category: "crypto", color: "#9945FF", unit: "SOL" },
  USDT: { name: "Tether", nameTr: "Tether", icon: "₮", category: "crypto", color: "#26A17B", unit: "USDT" },
  USD: { name: "US Dollar", nameTr: "ABD Doları", icon: "$", category: "fiat", color: "#22C55E", unit: "USD" },
  EUR: { name: "Euro", nameTr: "Euro", icon: "€", category: "fiat", color: "#3B82F6", unit: "EUR" },
  TRY: { name: "Turkish Lira", nameTr: "Türk Lirası", icon: "₺", category: "fiat", color: "#EF4444", unit: "TRY" },
};

const ALL_ASSETS: AssetType[] = ["AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "BTC", "XRP", "SOL", "USDT", "USD", "EUR", "TRY"];

const DEFAULT_BALANCES = {
  AUXG: 15.75, AUXS: 250.00, AUXPT: 5.25, AUXPD: 3.50,
  AUXM: 5000,
  ETH: 1.5, BTC: 0.025, XRP: 500, SOL: 10, USDT: 1000,
  USD: 2500, EUR: 1500, TRY: 50000,
};

const DEFAULT_PRICES = {
  AUXG: 139.31, AUXS: 1.79, AUXPT: 54.14, AUXPD: 48.16,
  ETH: 3650, BTC: 97500, XRP: 2.20, SOL: 235, USDT: 1,
  USD: 1, EUR: 1.08, TRY: 0.029,
};

// Ayrı dropdown component - memoized
interface DropdownProps {
  isOpen: boolean;
  onSelect: (asset: AssetType) => void;
  exclude: AssetType;
  currentAsset: AssetType;
  position: "top" | "bottom";
  lang: "tr" | "en";
  balances: typeof DEFAULT_BALANCES;
}

const AssetDropdown = memo(function AssetDropdown({ 
  isOpen, 
  onSelect, 
  exclude, 
  currentAsset, 
  position, 
  lang,
  balances 
}: DropdownProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  if (!isOpen) return null;

  const formatBal = (asset: AssetType): string => {
    const bal = balances[asset] || 0;
    const info = ASSETS[asset];
    if (info.category === "metal") return bal.toFixed(4);
    if (info.category === "crypto" && asset !== "USDT") return bal.toFixed(6);
    return bal.toFixed(2);
  };

  const posClass = position === "top" 
    ? "absolute bottom-full left-0 right-0 mb-2" 
    : "absolute top-full left-0 right-0 mt-2";

  const categories: { key: AssetCategory; assets: AssetType[]; label: string; color: string }[] = [
    { key: "metal", assets: ["AUXG", "AUXS", "AUXPT", "AUXPD"], label: lang === "tr" ? "Metaller" : "Metals", color: "text-yellow-400" },
    { key: "platform", assets: ["AUXM"], label: "Platform", color: "text-purple-400" },
    { key: "crypto", assets: ["ETH", "BTC", "XRP", "SOL", "USDT"], label: lang === "tr" ? "Kripto" : "Crypto", color: "text-blue-400" },
    { key: "fiat", assets: ["USD", "EUR", "TRY"], label: "Fiat", color: "text-green-400" },
  ];

  return (
    <div 
      ref={scrollRef}
      className={`${posClass} bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto`}
      style={{ overscrollBehavior: 'contain' }}
    >
      {categories.map(cat => {
        const filteredAssets = cat.assets.filter(a => a !== exclude);
        if (filteredAssets.length === 0) return null;
        
        return (
          <div key={cat.key}>
            <div className={`px-3 py-1 text-[10px] font-semibold ${cat.color} bg-slate-900`}>
              {cat.label}
            </div>
            {filteredAssets.map(asset => {
              const info = ASSETS[asset];
              const isSpecial = ["Ξ", "₿", "✕", "◎", "₮", "◈"].includes(info.icon);
              
              return (
                <button
                  key={asset}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(asset);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-700 transition-colors ${
                    currentAsset === asset ? "bg-slate-700" : ""
                  }`}
                >
                  {isSpecial ? (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px]"
                      style={{ backgroundColor: info.color }}
                    >
                      {info.icon}
                    </div>
                  ) : (
                    <span className="text-sm w-5 text-center">{info.icon}</span>
                  )}
                  <span className="font-medium text-white text-sm flex-1 text-left">{asset}</span>
                  <span className="text-xs text-slate-400">{formatBal(asset)}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
});

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
  defaultFrom?: AssetType;
  defaultTo?: AssetType;
  balances?: typeof DEFAULT_BALANCES;
  prices?: typeof DEFAULT_PRICES;
}

export function ExchangeModal({
  isOpen,
  onClose,
  lang = "tr",
  defaultFrom = "AUXG",
  defaultTo = "AUXS",
  balances = DEFAULT_BALANCES,
  prices = DEFAULT_PRICES,
}: ExchangeModalProps) {
  const [fromAsset, setFromAsset] = useState<AssetType>(defaultFrom);
  const [toAsset, setToAsset] = useState<AssetType>(defaultTo);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showFromSelect, setShowFromSelect] = useState(false);
  const [showToSelect, setShowToSelect] = useState(false);

  const isCampaignActive = isLaunchCampaignActive();

  useEffect(() => {
    if (isOpen) {
      setFromAmount("");
      setResult(null);
      setFromAsset(defaultFrom);
      setToAsset(defaultTo);
      setShowFromSelect(false);
      setShowToSelect(false);
    }
  }, [isOpen, defaultFrom, defaultTo]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = () => {
      setShowFromSelect(false);
      setShowToSelect(false);
    };
    if (showFromSelect || showToSelect) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showFromSelect, showToSelect]);

  if (!isOpen) return null;

  const getUSDPrice = (asset: AssetType): number => {
    if (asset === "AUXM") return 1;
    return prices[asset] || 1;
  };

  const fromPrice = getUSDPrice(fromAsset);
  const toPrice = getUSDPrice(toAsset);
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * fromPrice;

  const fromCategory = ASSETS[fromAsset].category;
  const toCategory = ASSETS[toAsset].category;
  const bonusApplies = isCampaignActive && fromCategory === "crypto" && (toAsset === "AUXM" || toCategory === "metal");
  const bonusPercent = bonusApplies ? 2 : 0;
  const bonusUSD = fromValueUSD * (bonusPercent / 100);
  const totalValueUSD = fromValueUSD + bonusUSD;

  const spreadPercent = fromCategory === toCategory ? 0.5 : 1;
  const netValueUSD = totalValueUSD * (1 - spreadPercent / 100);
  const toAmount = netValueUSD / toPrice;

  const fromBalance = balances[fromAsset] || 0;
  const canAfford = fromAmountNum <= fromBalance && fromAmountNum > 0 && fromAsset !== toAsset;

  const handleSwap = () => {
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setFromAmount("");
  };

  const handleMaxClick = () => {
    setFromAmount(fromBalance.toString());
  };

  const handleExchange = async () => {
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

  const formatAmount = (amount: number, asset: AssetType): string => {
    const info = ASSETS[asset];
    if (info.category === "metal") return amount.toFixed(4);
    if (info.category === "crypto" && asset !== "USDT") return amount.toFixed(6);
    return amount.toFixed(2);
  };

  const formatBalance = (asset: AssetType): string => {
    return formatAmount(balances[asset] || 0, asset);
  };

  const getAssetUnit = (asset: AssetType): string => {
    return ASSETS[asset].category === "metal" ? "gram" : asset;
  };

  const handleFromSelect = (asset: AssetType) => {
    setFromAsset(asset);
    setShowFromSelect(false);
  };

  const handleToSelect = (asset: AssetType) => {
    setToAsset(asset);
    setShowToSelect(false);
  };

  const renderAssetButton = (asset: AssetType, onClick: () => void, label: string) => {
    const info = ASSETS[asset];
    const isSpecial = ["Ξ", "₿", "✕", "◎", "₮", "◈"].includes(info.icon);
    
    return (
      <div className="relative">
        <div className="text-xs text-slate-500 mb-1">{label}</div>
        <button
          type="button"
          onClick={onClick}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-all w-full"
        >
          {isSpecial ? (
            <div 
              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: info.color }}
            >
              {info.icon}
            </div>
          ) : (
            <span className="text-xl">{info.icon}</span>
          )}
          <div className="flex-1 text-left">
            <div className="font-semibold text-white text-sm">{asset}</div>
            <div className="text-xs text-slate-400">
              {lang === "tr" ? info.nameTr : info.name}
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              {lang === "tr" ? "Dönüştür" : "Exchange"}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === "tr" ? "Varlıklarınızı anında dönüştürün" : "Instantly convert your assets"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Campaign Banner with Calculation */}
          {bonusApplies && fromAmountNum > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🎁</span>
                <span className="text-sm font-semibold text-purple-300">
                  {lang === "tr" ? "Lansman Kampanyası Bonusu" : "Launch Campaign Bonus"}
                </span>
                <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-300">
                  +%{bonusPercent}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>{lang === "tr" ? "İşlem Değeri:" : "Trade Value:"}</span>
                  <span>${fromValueUSD.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-purple-400 font-medium">
                  <span>{lang === "tr" ? "Bonus Kazanç:" : "Bonus Earned:"}</span>
                  <span>+${bonusUSD.toFixed(2)} AUXM</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-slate-700/50">
                  <span>{lang === "tr" ? "Toplam Değer:" : "Total Value:"}</span>
                  <span>${totalValueUSD.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Campaign Banner (no amount or not applicable) */}
          {isCampaignActive && fromCategory === "crypto" && (fromAmountNum === 0 || !bonusApplies) && (
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center gap-2">
              <span>🎁</span>
              <span className="text-xs text-purple-300">
                {lang === "tr" ? "Kripto → AUXM/Metal: +%2 Bonus!" : "Crypto → AUXM/Metal: +2% Bonus!"}
              </span>
            </div>
          )}

          {/* Success State */}
          {result === "success" ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-emerald-400 mb-2">
                {lang === "tr" ? "Dönüşüm Başarılı!" : "Exchange Successful!"}
              </h3>
              <p className="text-slate-400 text-sm">
                {formatAmount(fromAmountNum, fromAsset)} {getAssetUnit(fromAsset)} → {formatAmount(toAmount, toAsset)} {getAssetUnit(toAsset)}
              </p>
              {bonusUSD > 0 && (
                <p className="text-purple-400 text-xs mt-2">🎁 +${bonusUSD.toFixed(2)} Bonus!</p>
              )}
            </div>
          ) : (
            <>
              {/* From Section */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 relative">
                {renderAssetButton(
                  fromAsset, 
                  () => { setShowFromSelect(!showFromSelect); setShowToSelect(false); },
                  lang === "tr" ? "Gönder" : "From"
                )}
                
                <AssetDropdown
                  isOpen={showFromSelect}
                  onSelect={handleFromSelect}
                  exclude={toAsset}
                  currentAsset={fromAsset}
                  position="bottom"
                  lang={lang}
                  balances={balances}
                />
                
                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-xs text-slate-500">
                    {lang === "tr" ? "Bakiye" : "Balance"}: {formatBalance(fromAsset)} {getAssetUnit(fromAsset)}
                  </span>
                  <button onClick={handleMaxClick} className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
                    MAX
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={isProcessing}
                    className="w-full bg-slate-900 rounded-lg px-3 py-2.5 text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    {getAssetUnit(fromAsset)}
                  </div>
                </div>
                
                <div className="text-right text-xs text-slate-500 mt-1">
                  ≈ ${fromValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1 relative z-10">
                <button
                  onClick={handleSwap}
                  disabled={isProcessing}
                  className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 border-4 border-slate-900 flex items-center justify-center transition-colors shadow-lg"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* To Section */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 relative">
                {renderAssetButton(
                  toAsset,
                  () => { setShowToSelect(!showToSelect); setShowFromSelect(false); },
                  lang === "tr" ? "Al" : "To"
                )}
                
                <AssetDropdown
                  isOpen={showToSelect}
                  onSelect={handleToSelect}
                  exclude={fromAsset}
                  currentAsset={toAsset}
                  position="top"
                  lang={lang}
                  balances={balances}
                />
                
                <div className="text-xs text-slate-500 mt-2 mb-1">
                  {lang === "tr" ? "Alacağınız" : "You will receive"}
                </div>
                
                <div className="bg-slate-900 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono text-white">
                      {fromAmountNum > 0 ? formatAmount(toAmount, toAsset) : "0.00"}
                    </span>
                    <span className="text-xs text-slate-400">{getAssetUnit(toAsset)}</span>
                  </div>
                </div>
                
                <div className="text-right text-xs text-slate-500 mt-1">
                  ≈ ${(toAmount * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Exchange Info */}
              <div className="px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "tr" ? "Dönüşüm Oranı" : "Rate"}</span>
                  <span className="text-slate-300">
                    1 {fromAsset} = {(fromPrice / toPrice).toFixed(ASSETS[toAsset].category === "metal" ? 4 : 2)} {toAsset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spread</span>
                  <span className="text-slate-300">{spreadPercent}%</span>
                </div>
                {bonusApplies && fromAmountNum > 0 && (
                  <div className="flex justify-between text-purple-400">
                    <span>🎁 Bonus</span>
                    <span>+${bonusUSD.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Warnings */}
              {fromAsset === toAsset && (
                <div className="px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
                  ⚠️ {lang === "tr" ? "Aynı varlığı seçemezsiniz" : "Cannot select same asset"}
                </div>
              )}
              
              {!canAfford && fromAmountNum > 0 && fromAsset !== toAsset && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  ⚠️ {lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}
                </div>
              )}

              {/* Exchange Button */}
              <button
                onClick={handleExchange}
                disabled={isProcessing || !canAfford}
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "tr" ? "İşleniyor..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {lang === "tr" ? "Dönüştür" : "Exchange"}
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

export default ExchangeModal;
