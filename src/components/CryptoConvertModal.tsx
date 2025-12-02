"use client";

import { useState, useEffect } from "react";
import { isLaunchCampaignActive } from "@/lib/auxm-bonus-service";

interface CryptoConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  crypto: "ETH" | "BTC" | "XRP" | "SOL";
  lang?: "tr" | "en";
  cryptoBalances?: {
    ETH: number;
    BTC: number;
    XRP: number;
    SOL: number;
  };
  cryptoPrices?: {
    ETH: number;
    BTC: number;
    XRP: number;
    SOL: number;
  };
  metalBidPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
}

type CryptoType = "ETH" | "BTC" | "XRP" | "SOL";
type TargetType = "AUXM" | "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

const CRYPTO_INFO: Record<CryptoType, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  color: string;
}> = {
  ETH: { name: "Ethereum", nameTr: "Ethereum", icon: "Ξ", color: "#627EEA" },
  BTC: { name: "Bitcoin", nameTr: "Bitcoin", icon: "₿", color: "#F7931A" },
  XRP: { name: "Ripple", nameTr: "Ripple", icon: "✕", color: "#23292F" },
  SOL: { name: "Solana", nameTr: "Solana", icon: "◎", color: "#9945FF" },
};

const TARGET_INFO: Record<TargetType, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  bgColor: string;
  borderColor: string;
}> = {
  AUXM: { name: "Auxite Money", nameTr: "Auxite Para", icon: "◈", bgColor: "bg-purple-500/20", borderColor: "border-purple-500/30" },
  AUXG: { name: "Gold", nameTr: "Altın", icon: "🥇", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/30" },
  AUXS: { name: "Silver", nameTr: "Gümüş", icon: "🥈", bgColor: "bg-slate-400/10", borderColor: "border-slate-400/30" },
  AUXPT: { name: "Platinum", nameTr: "Platin", icon: "⚪", bgColor: "bg-slate-300/10", borderColor: "border-slate-300/30" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "🔘", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/30" },
};

export function CryptoConvertModal({
  isOpen,
  onClose,
  crypto,
  lang = "tr",
  cryptoBalances = { ETH: 0, BTC: 0, XRP: 0, SOL: 0 },
  cryptoPrices = { ETH: 3650, BTC: 97500, XRP: 2.20, SOL: 235 },
  metalBidPrices = { AUXG: 134.69, AUXS: 1.82, AUXPT: 52.92, AUXPD: 45.57 },
}: CryptoConvertModalProps) {
  const [toAsset, setToAsset] = useState<TargetType>("AUXM");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [showToSelect, setShowToSelect] = useState(false);

  const isCampaignActive = isLaunchCampaignActive();

  // Kaynak kripto SABİT - prop'tan geliyor, değiştirilemez
  const fromCrypto = crypto;
  const cryptoInfo = CRYPTO_INFO[fromCrypto];

  useEffect(() => {
    if (isOpen) {
      setFromAmount("");
      setResult(null);
      setToAsset("AUXM");
    }
  }, [isOpen, crypto]);

  if (!isOpen) return null;

  // Fiyat hesaplama - metalBidPrices (satış fiyatı) kullanılıyor
  const fromPrice = cryptoPrices[fromCrypto];
  const toPrice = toAsset === "AUXM" ? 1 : metalBidPrices[toAsset as keyof typeof metalBidPrices];
  
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const fromValueUSD = fromAmountNum * fromPrice;
  
  // Bonus hesaplama
  const bonusPercent = isCampaignActive ? 2 : 0;
  const bonusUSD = fromValueUSD * (bonusPercent / 100);
  const totalValueUSD = fromValueUSD + bonusUSD;
  
  // Dönüşüm hesaplama - metalBidPrices üzerinden
  const toAmount = totalValueUSD / toPrice;

  // Spread hesaplama (%0.5)
  const spreadPercent = 0.5;
  const netToAmount = toAmount * (1 - spreadPercent / 100);

  // Bakiye kontrolü
  const fromBalance = cryptoBalances[fromCrypto];
  const canAfford = fromAmountNum <= fromBalance && fromAmountNum > 0;

  const handleMaxClick = () => {
    setFromAmount(fromBalance.toString());
  };

  const handleConvert = async () => {
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

  // Hedef varlık seçici (AUXM, AUXG, AUXS, AUXPT, AUXPD)
  const TargetSelector = ({ 
    asset, 
    onSelect, 
    show, 
    setShow,
    label
  }: { 
    asset: TargetType; 
    onSelect: (a: TargetType) => void;
    show: boolean;
    setShow: (s: boolean) => void;
    label: string;
  }) => (
    <div className="relative">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <button
        onClick={() => setShow(!show)}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg ${TARGET_INFO[asset].bgColor} border ${TARGET_INFO[asset].borderColor} hover:opacity-80 transition-all w-full`}
      >
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-lg">
          {TARGET_INFO[asset].icon}
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-white">{asset}</div>
          <div className="text-xs text-slate-400">
            {lang === "tr" ? TARGET_INFO[asset].nameTr : TARGET_INFO[asset].name}
          </div>
        </div>
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {show && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-10 overflow-hidden">
          {(["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD"] as TargetType[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                onSelect(t);
                setShow(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-700 transition-colors ${
                asset === t ? "bg-slate-700" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-lg">
                {TARGET_INFO[t].icon}
              </div>
              <div className="text-left flex-1">
                <div className="font-medium text-white">{t}</div>
                <div className="text-xs text-slate-400">
                  {lang === "tr" ? TARGET_INFO[t].nameTr : TARGET_INFO[t].name}
                </div>
              </div>
              {asset === t && (
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: cryptoInfo.color }}
            >
              {cryptoInfo.icon}
            </div>
            <div>
              <h3 className="font-bold text-white">
                {fromCrypto} {lang === "tr" ? "Dönüştür" : "Convert"}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === "tr" ? `${cryptoInfo.nameTr} → AUXM/Metal` : `${cryptoInfo.name} → AUXM/Metal`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Campaign Bonus Indicator */}
          {isCampaignActive && fromAmountNum > 0 && (
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30">
              <div className="flex items-center justify-between text-sm">
                <span className="text-purple-300">🎁 Bonus AUXM</span>
                <span className="text-purple-400 font-semibold">
                  +{bonusPercent}% (+${bonusUSD.toFixed(2)})
                </span>
              </div>
              <div className="space-y-1 text-xs mt-2">
                <div className="flex justify-between text-slate-400">
                  <span>{lang === "tr" ? "Dönüşüm Değeri:" : "Conversion Value:"}</span>
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
          
          {/* Campaign Banner (no amount) */}
          {isCampaignActive && fromAmountNum === 0 && (
            <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center gap-2">
              <span>🎁</span>
              <span className="text-sm text-purple-300">
                {lang === "tr" ? `+%${bonusPercent} Bonus AUXM kazanın!` : `Earn +${bonusPercent}% Bonus AUXM!`}
              </span>
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
                {lang === "tr" ? "Dönüşüm Başarılı!" : "Conversion Successful!"}
              </h3>
              <p className="text-slate-400">
                {fromAmountNum.toFixed(6)} {fromCrypto} → {netToAmount.toFixed(toAsset === "AUXM" ? 2 : 4)}{toAsset !== "AUXM" ? "g" : ""} {toAsset}
              </p>
              {bonusUSD > 0 && (
                <p className="text-purple-400 text-sm mt-2">
                  🎁 +{bonusUSD.toFixed(2)} Bonus AUXM {lang === "tr" ? "kazandınız!" : "earned!"}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* From Section - SABİT, değiştirilemez */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="text-xs text-slate-500 mb-1">{lang === "tr" ? "Gönder" : "From"}</div>
                <div 
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600"
                >
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: cryptoInfo.color }}
                  >
                    {cryptoInfo.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{fromCrypto}</div>
                    <div className="text-xs text-slate-400">
                      {lang === "tr" ? cryptoInfo.nameTr : cryptoInfo.name}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 mb-1">
                  <span className="text-xs text-slate-500">
                    {lang === "tr" ? "Bakiye" : "Balance"}: {fromBalance.toFixed(4)} {fromCrypto}
                  </span>
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                  >
                    MAX
                  </button>
                </div>
                
                <div className="relative">
                  <input
                    type="number"
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value)}
                    placeholder="0.0000"
                    disabled={isProcessing}
                    className="w-full bg-slate-900 rounded-lg px-3 py-2.5 text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    {fromCrypto}
                  </div>
                </div>
                
                <div className="text-right text-xs text-slate-500 mt-1">
                  ≈ ${fromValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Arrow Indicator */}
              <div className="flex justify-center -my-1 relative z-10">
                <div className="w-10 h-10 rounded-full bg-purple-500 border-4 border-slate-900 flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </div>

              {/* To Section - AUXM veya Metaller */}
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                <TargetSelector 
                  asset={toAsset} 
                  onSelect={setToAsset}
                  show={showToSelect}
                  setShow={setShowToSelect}
                  label={lang === "tr" ? "Al" : "To"}
                />
                
                <div className="text-xs text-slate-500 mt-2 mb-1">
                  {lang === "tr" ? "Alacağınız" : "You will receive"}
                </div>
                
                <div className="bg-slate-900 rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-mono text-white">
                      {fromAmountNum > 0 ? netToAmount.toFixed(toAsset === "AUXM" ? 2 : 4) : "0.0000"}
                    </span>
                    <span className="text-sm text-slate-400">
                      {toAsset !== "AUXM" ? "gram" : toAsset}
                    </span>
                  </div>
                </div>
                
                <div className="text-right text-xs text-slate-500 mt-1">
                  ≈ ${(netToAmount * toPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>

              {/* Exchange Rate & Fee Info */}
              <div className="px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">{lang === "tr" ? "Dönüşüm Oranı" : "Exchange Rate"}</span>
                  <span className="text-slate-300">
                    1 {fromCrypto} = {(fromPrice / toPrice).toFixed(toAsset === "AUXM" ? 2 : 4)}{toAsset !== "AUXM" ? "g" : ""} {toAsset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Spread</span>
                  <span className="text-slate-300">{spreadPercent}%</span>
                </div>
                {toAsset !== "AUXM" && (
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-700/50">
                    <span className="text-slate-500">{lang === "tr" ? "Metal Satış Fiyatı" : "Metal Bid Price"}</span>
                    <span className="text-slate-400">${toPrice.toFixed(2)}/g</span>
                  </div>
                )}
              </div>

              {/* Insufficient Balance Warning */}
              {!canAfford && fromAmountNum > 0 && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
                  ⚠️ {lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}
                </div>
              )}

              {/* Convert Button */}
              <button
                onClick={handleConvert}
                disabled={isProcessing || !canAfford}
                className="w-full py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    {lang === "tr" ? "Dönüştür" : "Convert"}
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

export default CryptoConvertModal;
