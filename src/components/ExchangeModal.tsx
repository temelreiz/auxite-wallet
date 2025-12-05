"use client";

import { useState, useEffect, memo } from "react";
import { useWallet } from "@/components/WalletContext";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

type AssetCategory = "metal" | "platform" | "crypto" | "fiat";

type AssetType = 
  | "AUXG" | "AUXS" | "AUXPT" | "AUXPD"
  | "AUXM"
  | "ETH" | "BTC" | "XRP" | "SOL" | "USDT"
  | "USD";

interface AssetInfo {
  name: string;
  nameTr: string;
  icon: string;
  iconType: "image" | "symbol";
  category: AssetCategory;
  color: string;
  unit: string;
}

const ASSETS: Record<AssetType, AssetInfo> = {
  // Fiat
  USD: { name: "US Dollar", nameTr: "Amerikan Doları", icon: "$", iconType: "symbol", category: "fiat", color: "#22C55E", unit: "USD" },
  // Metals - use image icons
  AUXG: { name: "Gold", nameTr: "Altın", icon: "/gold-favicon-32x32.png", iconType: "image", category: "metal", color: "#F59E0B", unit: "gram" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "/silver-favicon-32x32.png", iconType: "image", category: "metal", color: "#94A3B8", unit: "gram" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "/platinum-favicon-32x32.png", iconType: "image", category: "metal", color: "#CBD5E1", unit: "gram" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "/palladium-favicon-32x32.png", iconType: "image", category: "metal", color: "#64748B", unit: "gram" },
  // Platform
  AUXM: { name: "Auxite Money", nameTr: "Auxite Para", icon: "◈", iconType: "symbol", category: "platform", color: "#A855F7", unit: "AUXM" },
  // Crypto - use symbols
  ETH: { name: "Ethereum", nameTr: "Ethereum", icon: "Ξ", iconType: "symbol", category: "crypto", color: "#627EEA", unit: "ETH" },
  BTC: { name: "Bitcoin", nameTr: "Bitcoin", icon: "₿", iconType: "symbol", category: "crypto", color: "#F7931A", unit: "BTC" },
  XRP: { name: "Ripple", nameTr: "Ripple", icon: "✕", iconType: "symbol", category: "crypto", color: "#23292F", unit: "XRP" },
  SOL: { name: "Solana", nameTr: "Solana", icon: "◎", iconType: "symbol", category: "crypto", color: "#9945FF", unit: "SOL" },
  USDT: { name: "Tether", nameTr: "Tether", icon: "₮", iconType: "symbol", category: "crypto", color: "#26A17B", unit: "USDT" },
};

// İş kuralları: Hangi dönüşümler izinli?
function isConversionAllowed(from: AssetType, to: AssetType): boolean {
  const fromInfo = ASSETS[from];
  const toInfo = ASSETS[to];
  
  if (from === to) return false;
  
  // USD → Crypto YASAK (sadece USDT hariç)
  if (from === "USD" && toInfo.category === "crypto" && to !== "USDT") {
    return false;
  }
  
  // Crypto → USD YASAK (sadece USDT hariç)
  if (fromInfo.category === "crypto" && to === "USD" && from !== "USDT") {
    return false;
  }
  
  // Crypto → Crypto YASAK (USDT ↔ USD hariç)
  if (fromInfo.category === "crypto" && toInfo.category === "crypto") {
    return false;
  }
  
  // AUXM → Crypto YASAK (withdraw kullanılmalı)
  if (from === "AUXM" && toInfo.category === "crypto") {
    return false;
  }
  
  // Diğer tüm kombinasyonlar izinli
  return true;
}

// Dropdown için izinli hedefleri getir
function getAllowedTargets(from: AssetType): AssetType[] {
  const all: AssetType[] = ["USD", "AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "BTC", "XRP", "SOL", "USDT"];
  return all.filter(t => isConversionAllowed(from, t));
}

interface DropdownProps {
  isOpen: boolean;
  onSelect: (asset: AssetType) => void;
  allowedAssets: AssetType[];
  currentAsset: AssetType;
  position: "top" | "bottom";
  lang: "tr" | "en";
  getBalance: (asset: AssetType) => number;
}

const AssetDropdown = memo(function AssetDropdown({ 
  isOpen, 
  onSelect, 
  allowedAssets,
  currentAsset, 
  position, 
  lang,
  getBalance 
}: DropdownProps) {
  if (!isOpen) return null;

  const formatBal = (asset: AssetType): string => {
    const bal = getBalance(asset);
    const info = ASSETS[asset];
    if (info.category === "metal") return bal.toFixed(4);
    if (info.category === "crypto" && asset !== "USDT") return bal.toFixed(6);
    return bal.toFixed(2);
  };

  const posClass = position === "top" 
    ? "absolute bottom-full left-0 right-0 mb-1" 
    : "absolute left-0 right-0 mt-1";

  const categories: { key: AssetCategory; assets: AssetType[]; label: string; color: string }[] = [
    { key: "fiat", assets: ["USD"], label: "Fiat", color: "text-green-400" },
    { key: "metal", assets: ["AUXG", "AUXS", "AUXPT", "AUXPD"], label: lang === "tr" ? "Metaller" : "Metals", color: "text-yellow-400" },
    { key: "platform", assets: ["AUXM"], label: "Platform", color: "text-purple-400" },
    { key: "crypto", assets: ["ETH", "BTC", "XRP", "SOL", "USDT"], label: lang === "tr" ? "Kripto" : "Crypto", color: "text-blue-400" },
  ];

  const renderIcon = (asset: AssetType, size: "sm" | "md" = "sm") => {
    const info = ASSETS[asset];
    const sizeClass = size === "sm" ? "w-5 h-5" : "w-8 h-8";
    const textSize = size === "sm" ? "text-[10px]" : "text-sm";
    
    if (info.iconType === "image") {
      return <img src={info.icon} alt={asset} className={sizeClass} />;
    }
    return (
      <div 
        className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold ${textSize}`}
        style={{ backgroundColor: info.color }}
      >
        {info.icon}
      </div>
    );
  };

  return (
    <div 
      className={`${posClass} bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-52 overflow-y-auto`}
      style={{ overscrollBehavior: 'contain' }}
    >
      {categories.map(cat => {
        const filteredAssets = cat.assets.filter(a => allowedAssets.includes(a));
        if (filteredAssets.length === 0) return null;
        
        return (
          <div key={cat.key}>
            <div className={`px-3 py-1 text-[10px] font-semibold ${cat.color} bg-slate-900 sticky top-0`}>
              {cat.label}
            </div>
            {filteredAssets.map(asset => {
              const info = ASSETS[asset];
              return (
                <button
                  key={asset}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelect(asset);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 transition-colors ${
                    currentAsset === asset ? "bg-slate-700" : ""
                  }`}
                >
                  {renderIcon(asset, "sm")}
                  <div className="flex-1 text-left">
                    <span className="font-medium text-white text-sm">{asset}</span>
                    <span className="text-xs text-slate-400 ml-1">
                      {lang === "tr" ? info.nameTr : info.name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{asset === "USD" ? "$" : ""}{formatBal(asset)}</span>
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
}

export function ExchangeModal({
  isOpen,
  onClose,
  lang = "tr",
  defaultFrom = "USD",
  defaultTo = "AUXG",
}: ExchangeModalProps) {
  const { balances, refreshBalances, address: walletAddress } = useWallet();
  const { prices: metalPrices } = useMetalsPrices();
  const { prices: cryptoPrices } = useCryptoPrices();
  
  const [fromAsset, setFromAsset] = useState<AssetType>(defaultFrom);
  const [toAsset, setToAsset] = useState<AssetType>(defaultTo);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showFromSelect, setShowFromSelect] = useState(false);
  const [showToSelect, setShowToSelect] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFromAmount("");
      setResult(null);
      setFromAsset(defaultFrom);
      // İlk izinli hedefi bul
      const allowed = getAllowedTargets(defaultFrom);
      setToAsset(allowed.includes(defaultTo) ? defaultTo : allowed[0] || "AUXM");
    }
  }, [isOpen, defaultFrom, defaultTo]);

  if (!isOpen) return null;

  // Bakiye getir
  const getBalance = (asset: AssetType): number => {
    if (!balances) return 0;
    const map: Record<AssetType, number> = {
      USD: balances.usd || 0,
      AUXG: balances.auxg || 0,
      AUXS: balances.auxs || 0,
      AUXPT: balances.auxpt || 0,
      AUXPD: balances.auxpd || 0,
      AUXM: (balances.auxm || 0) + (balances.bonusAuxm || 0),
      ETH: balances.eth || 0,
      BTC: balances.btc || 0,
      XRP: balances.xrp || 0,
      SOL: balances.sol || 0,
      USDT: balances.usdt || 0,
    };
    return map[asset];
  };

  // Fiyat getir (USD cinsinden)
  const getPrice = (asset: AssetType): number => {
    const metalMap: Record<string, number> = {
      AUXG: metalPrices?.gold || 90,
      AUXS: metalPrices?.silver || 1.05,
      AUXPT: metalPrices?.platinum || 32,
      AUXPD: metalPrices?.palladium || 33,
    };
    const cryptoMap: Record<string, number> = {
      ETH: cryptoPrices?.eth || 3500,
      BTC: cryptoPrices?.btc || 95000,
      XRP: cryptoPrices?.xrp || 2.2,
      SOL: cryptoPrices?.sol || 200,
      USDT: 1,
    };
    if (asset === "USD") return 1;
    if (asset === "AUXM") return 1;
    if (metalMap[asset]) return metalMap[asset];
    if (cryptoMap[asset]) return cryptoMap[asset];
    return 1;
  };

  const fromPrice = getPrice(fromAsset);
  const toPrice = getPrice(toAsset);
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * fromPrice;
  
  // Spread: %0.5
  const spreadPercent = 0.5;
  const spreadMultiplier = 1 - (spreadPercent / 100);
  const toAmount = (fromValueUSD * spreadMultiplier) / toPrice;
  
  const fromBalance = getBalance(fromAsset);
  const canAfford = fromAmountNum <= fromBalance && fromAmountNum > 0;

  const handleFromSelect = (asset: AssetType) => {
    setFromAsset(asset);
    setShowFromSelect(false);
    // Eğer aynı varlık seçildiyse veya izinli değilse hedefi güncelle
    const allowed = getAllowedTargets(asset);
    if (asset === toAsset || !allowed.includes(toAsset)) {
      // Farklı bir varlık seç
      const newTo = allowed.find(a => a !== asset) || "AUXM";
      setToAsset(newTo);
    }
  };

  const handleToSelect = (asset: AssetType) => {
    // Aynı varlık seçilemez
    if (asset === fromAsset) return;
    setToAsset(asset);
    setShowToSelect(false);
  };

  const handleSwap = () => {
    if (isConversionAllowed(toAsset, fromAsset)) {
      const temp = fromAsset;
      setFromAsset(toAsset);
      setToAsset(temp);
      setFromAmount("");
    }
  };

  const handleMaxClick = () => {
    setFromAmount(fromBalance.toString());
  };

  const handleExchange = async () => {
    if (!canAfford || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // USD için özel endpoint
      if (fromAsset === "USD") {
        const response = await fetch("/api/user/buy-with-usd", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-wallet-address": walletAddress || "",
          },
          body: JSON.stringify({
            targetToken: toAsset.toLowerCase(),
            usdAmount: fromAmountNum,
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Exchange failed");
        }
      } else {
        // Diğer dönüşümler için mevcut trade API
        const response = await fetch("/api/trade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: walletAddress,
            type: "swap",
            fromToken: fromAsset,
            toToken: toAsset,
            fromAmount: fromAmountNum,
            price: fromPrice,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Exchange failed");
        }
      }

      setResult("success");
      await refreshBalances();
      
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      console.error("Exchange error:", err);
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
    return formatAmount(getBalance(asset), asset);
  };

  const getAssetUnit = (asset: AssetType): string => {
    return ASSETS[asset].unit;
  };

  const renderIcon = (asset: AssetType) => {
    const info = ASSETS[asset];
    if (info.iconType === "image") {
      return <img src={info.icon} alt={asset} className="w-8 h-8" />;
    }
    return (
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: info.color }}
      >
        {info.icon}
      </div>
    );
  };

  const renderAssetButton = (
    asset: AssetType,
    onClick: () => void,
    label: string
  ) => {
    const info = ASSETS[asset];
    return (
      <>
        <span className="text-xs text-slate-500 mb-1 block">{label}</span>
        <button
          type="button"
          onClick={onClick}
          className="w-full flex items-center gap-3 p-2 rounded-lg bg-slate-800 border border-slate-600 hover:border-slate-500 transition-colors"
        >
          {renderIcon(asset)}
          <div className="flex-1 text-left">
            <div className="font-semibold text-white">{asset}</div>
            <div className="text-xs text-slate-400">
              {lang === "tr" ? info.nameTr : info.name}
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </>
    );
  };

  // İzinli hedefler - tüm varlıkları göster
  const allAssets: AssetType[] = ["USD", "AUXG", "AUXS", "AUXPT", "AUXPD", "AUXM", "ETH", "BTC", "XRP", "SOL", "USDT"];
  const allowedToTargets = getAllowedTargets(fromAsset);

  // Crypto-to-crypto uyarısı
  const isCryptoToCrypto = ASSETS[fromAsset].category === "crypto" && ASSETS[toAsset].category === "crypto";
  
  // AUXM → Crypto uyarısı
  const isAuxmToCrypto = fromAsset === "AUXM" && ASSETS[toAsset].category === "crypto";
  
  // USD → Crypto uyarısı (USDT hariç)
  const isUsdToCrypto = fromAsset === "USD" && ASSETS[toAsset].category === "crypto" && toAsset !== "USDT";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div>
            <h2 className="text-lg font-bold text-white">
              {lang === "tr" ? "Dönüştür" : "Exchange"}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === "tr" ? "Varlıklarınızı anında dönüştürün" : "Convert your assets instantly"}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Info Banner */}
          <div className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300">
            <p className="font-medium mb-1">
              {lang === "tr" ? "ℹ️ Dönüşüm Kuralları" : "ℹ️ Conversion Rules"}
            </p>
            <ul className="space-y-0.5 text-blue-400/80">
              <li>• {lang === "tr" ? "USD → AUXM, Metaller, USDT dönüşümü yapılabilir" : "USD → AUXM, Metals, USDT conversions allowed"}</li>
              <li>• {lang === "tr" ? "USD → Crypto (BTC, ETH vb.) YAPILAMAZ" : "USD → Crypto (BTC, ETH etc.) NOT allowed"}</li>
              <li>• {lang === "tr" ? "Kripto → AUXM veya Metal dönüşümü yapılabilir" : "Crypto → AUXM or Metal conversions allowed"}</li>
              <li>• {lang === "tr" ? "Kripto ↔ Kripto dönüşümü desteklenmiyor" : "Crypto ↔ Crypto not supported"}</li>
            </ul>
          </div>

          {/* Success State */}
          {result === "success" ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-2">
                {lang === "tr" ? "Dönüşüm Başarılı!" : "Exchange Successful!"}
              </h3>
              <p className="text-slate-400 text-sm">
                {fromAsset === "USD" ? "$" : ""}{formatAmount(fromAmountNum, fromAsset)} {getAssetUnit(fromAsset)} → {formatAmount(toAmount, toAsset)} {getAssetUnit(toAsset)}
              </p>
            </div>
          ) : (
            <>
              {/* From Section */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="relative">
                  {renderAssetButton(
                    fromAsset, 
                    () => { setShowFromSelect(!showFromSelect); setShowToSelect(false); },
                    lang === "tr" ? "Gönder" : "From"
                  )}
                  
                  <AssetDropdown
                    isOpen={showFromSelect}
                    onSelect={handleFromSelect}
                    allowedAssets={allAssets.filter(a => a !== fromAsset)}
                    currentAsset={fromAsset}
                    position="bottom"
                    lang={lang}
                    getBalance={getBalance}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-3 mb-1">
                  <span className="text-xs text-slate-500">
                    {lang === "tr" ? "Bakiye" : "Balance"}: {fromAsset === "USD" ? "$" : ""}{formatBalance(fromAsset)} {fromAsset !== "USD" ? getAssetUnit(fromAsset) : ""}
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
                    className="w-full bg-slate-900 rounded-lg px-3 py-3 pr-16 text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {getAssetUnit(fromAsset)}
                  </span>
                </div>
                
                <div className="text-right text-xs text-slate-500 mt-1">
                  ≈ ${fromValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center -my-1 relative z-10">
                <button
                  onClick={handleSwap}
                  disabled={isProcessing || !isConversionAllowed(toAsset, fromAsset)}
                  className="w-10 h-10 rounded-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed border-4 border-slate-900 flex items-center justify-center transition-colors shadow-lg"
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
                  allowedAssets={allowedToTargets.filter(a => a !== toAsset)}
                  currentAsset={toAsset}
                  position="top"
                  lang={lang}
                  getBalance={getBalance}
                />
                
                <div className="text-xs text-slate-500 mt-3 mb-1">
                  {lang === "tr" ? "Alacağınız" : "You will receive"}
                </div>
                
                <div className="bg-slate-900 rounded-lg px-3 py-3 relative">
                  <span className="text-lg font-mono text-white">
                    {fromAmountNum > 0 ? formatAmount(toAmount, toAsset) : "0.00"}
                  </span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {getAssetUnit(toAsset)}
                  </span>
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
              </div>

              {/* Warnings */}
              {isCryptoToCrypto && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  ⚠️ {lang === "tr" ? "Kripto-kripto dönüşümü desteklenmiyor" : "Crypto-to-crypto conversion not supported"}
                </div>
              )}
              
              {isAuxmToCrypto && (
                <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
                  ⚠️ {lang === "tr" ? "AUXM → Kripto için Çekim bölümünü kullanın" : "Use Withdraw section for AUXM → Crypto"}
                </div>
              )}
              
              {isUsdToCrypto && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  ⚠️ {lang === "tr" ? "USD ile kripto alınamaz" : "Cannot buy crypto with USD"}
                </div>
              )}
              
              {!canAfford && fromAmountNum > 0 && !isCryptoToCrypto && !isAuxmToCrypto && !isUsdToCrypto && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                  ⚠️ {lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}
                </div>
              )}

              {/* Exchange Button */}
              <button
                onClick={handleExchange}
                disabled={isProcessing || !canAfford || isCryptoToCrypto || isAuxmToCrypto || isUsdToCrypto}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
