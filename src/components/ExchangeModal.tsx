"use client";

import { useState, useEffect } from "react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useSwap } from "@/hooks/useSwap";
import { useAccount, useBalance } from "wagmi";

interface ExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
}

type Asset = "AUXG" | "AUXS" | "AUXPT" | "AUXPD" | "ETH" | "BTC" | "USDT" | "TRY";

const assetIcons: Record<Asset, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
  ETH: "Ξ",
  BTC: "₿",
  USDT: "₮",
  TRY: "₺",
};

const SPREADS = {
  "metal-to-metal": 0.005,
  "metal-to-crypto": 0.01,
  "metal-to-fiat": 0.02,
  "crypto-to-metal": 0.01,
  "crypto-to-crypto": 0.003,
  "crypto-to-fiat": 0.015,
};

const metalAssets: Asset[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
const cryptoAssets: Asset[] = ["ETH", "BTC", "USDT"];
const fiatAssets: Asset[] = ["TRY"];

export function ExchangeModal({ isOpen, onClose, lang = "en" }: ExchangeModalProps) {
  const [fromAsset, setFromAsset] = useState<Asset>("AUXG");
  const [toAsset, setToAsset] = useState<Asset>("AUXS");
  const [fromAmount, setFromAmount] = useState<string>("1");
  const [mounted, setMounted] = useState(false);

  const { address } = useAccount();
  const { prices: cryptoPrices } = useCryptoPrices();
  const { prices: metalPrices } = useMetalsPrices();
  const { balances: tokenBalances, refetch: refetchBalances } = useTokenBalances();
  const { swapTokens, isProcessing, currentStep, errorMessage, txHash, reset: resetSwap } = useSwap();

  const { data: ethBalanceData } = useBalance({ address });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto close on success
  useEffect(() => {
    if (currentStep === "success") {
      // Refetch balances
      refetchBalances();
      
      // Auto close after 3 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      resetSwap();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetSwap();
    setFromAmount("1");
    onClose();
  };

  const getBalance = (asset: Asset): number => {
    if (metalAssets.includes(asset)) {
      const balance = tokenBalances[asset];
      return balance ? parseFloat(balance) : 0;
    }
    if (asset === "ETH") {
      return ethBalanceData ? parseFloat(ethBalanceData.formatted) : 0;
    }
    return 0;
  };

  const getAssetPrice = (asset: Asset): number => {
    if (metalAssets.includes(asset)) {
      return metalPrices[asset] || 0;
    }
    switch (asset) {
      case "ETH": return cryptoPrices.eth;
      case "BTC": return cryptoPrices.btc;
      case "USDT": return 1.0;
      case "TRY": return cryptoPrices.try;
      default: return 0;
    }
  };

  const getSpreadRate = (from: Asset, to: Asset): number => {
    const fromIsMetal = metalAssets.includes(from);
    const fromIsCrypto = cryptoAssets.includes(from);
    const toIsMetal = metalAssets.includes(to);
    const toIsCrypto = cryptoAssets.includes(to);

    if (fromIsMetal && toIsMetal) return SPREADS["metal-to-metal"];
    if (fromIsMetal && toIsCrypto) return SPREADS["metal-to-crypto"];
    if (fromIsMetal) return SPREADS["metal-to-fiat"];
    if (fromIsCrypto && toIsMetal) return SPREADS["crypto-to-metal"];
    if (fromIsCrypto && toIsCrypto) return SPREADS["crypto-to-crypto"];
    return 0.01;
  };

  const calculateExchange = () => {
    const fromAmountNum = parseFloat(fromAmount) || 0;
    if (fromAmountNum === 0) return { toAmount: 0, spread: 0, fee: 0, rate: 0 };

    const fromPrice = getAssetPrice(fromAsset);
    const toPrice = getAssetPrice(toAsset);
    if (fromPrice === 0 || toPrice === 0) return { toAmount: 0, spread: 0, fee: 0, rate: 0 };

    const spreadRate = getSpreadRate(fromAsset, toAsset);
    const valueInUSD = fromAmountNum * fromPrice;
    const valueAfterSpread = valueInUSD * (1 - spreadRate);
    const toAmount = valueAfterSpread / toPrice;
    const fee = valueInUSD * spreadRate;
    const rate = toAmount / fromAmountNum;

    return { toAmount, spread: spreadRate, fee, rate };
  };

  const result = calculateExchange();
  const fromBalance = getBalance(fromAsset);
  const toBalance = getBalance(toAsset);
  const isInsufficientBalance = parseFloat(fromAmount) > fromBalance;

  const handleSwap = async () => {
    if (!address) return;
    if (isInsufficientBalance) return;
    if (!metalAssets.includes(fromAsset) || !metalAssets.includes(toAsset)) {
      alert(lang === "tr" ? "Şu anda sadece metal tokenleri değiştirebilirsiniz" : "Only metal token swaps are supported");
      return;
    }

    await swapTokens(
      fromAsset as "AUXG" | "AUXS" | "AUXPT" | "AUXPD",
      toAsset as "AUXG" | "AUXS" | "AUXPT" | "AUXPD",
      fromAmount
    );
  };

  const getAssetIcon = (asset: Asset) => {
    const icon = assetIcons[asset];
    if (metalAssets.includes(asset)) {
      return <img src={icon} alt={asset} className="w-5 h-5" />;
    }
    return <span className="text-lg text-white font-bold">{icon}</span>;
  };

  const allAssets: Asset[] = [...metalAssets, ...cryptoAssets, ...fiatAssets];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={!isProcessing ? handleClose : undefined}></div>

      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100">
              {lang === "tr" ? "Token Değiştir" : "Exchange Tokens"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {lang === "tr" ? "Tokenlerinizi değiştirin" : "Swap your tokens instantly"}
            </p>
          </div>
          <button 
            onClick={handleClose} 
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-300 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {currentStep === "success" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">
              {lang === "tr" ? "Dönüştürme Başarılı!" : "Swap Successful!"}
            </h3>
            <p className="text-slate-400 mb-4">
              {fromAmount} {fromAsset} → {result.toAmount.toFixed(4)} {toAsset}
            </p>
            {txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {lang === "tr" ? "İşlemi görüntüle →" : "View transaction →"}
              </a>
            )}
          </div>
        )}

        {/* Error State */}
        {currentStep === "error" && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="text-red-400 text-xl">⚠️</div>
              <div className="flex-1">
                <div className="font-medium text-red-400">
                  {lang === "tr" ? "İşlem Başarısız" : "Swap Failed"}
                </div>
                <div className="text-sm text-red-300 mt-1">{errorMessage}</div>
                <button
                  onClick={resetSwap}
                  className="mt-2 text-sm text-red-400 hover:text-red-300 underline"
                >
                  {lang === "tr" ? "Tekrar dene" : "Try again"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Normal/Processing State */}
        {currentStep !== "success" && currentStep !== "error" && (
          <>
            {/* Processing Indicator */}
            {isProcessing && (
              <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-blue-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <div>
                    <div className="font-medium text-blue-300">
                      {currentStep === "approving" 
                        ? (lang === "tr" ? "Token onayı bekleniyor..." : "Waiting for token approval...")
                        : (lang === "tr" ? "Dönüşüm işleniyor..." : "Processing swap...")
                      }
                    </div>
                    <div className="text-xs text-blue-200">
                      {lang === "tr" ? "MetaMask'ı kontrol edin" : "Check MetaMask"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* From Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-slate-400">
                  {lang === "tr" ? "Göndereceğiniz" : "You send"}
                </label>
                {mounted && (
                  <div className="text-xs text-slate-500">
                    {lang === "tr" ? "Bakiye:" : "Balance:"} {fromBalance.toFixed(4)} {fromAsset}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  disabled={isProcessing}
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                  placeholder="0.00"
                />
                <button
                  onClick={() => setFromAmount(fromBalance.toString())}
                  disabled={isProcessing}
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium disabled:opacity-50"
                >
                  MAX
                </button>
                <div className="relative">
                  <select
                    value={fromAsset}
                    onChange={(e) => setFromAsset(e.target.value as Asset)}
                    disabled={isProcessing}
                    className="appearance-none pl-12 pr-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 min-w-[140px] disabled:opacity-50"
                  >
                    {allAssets.map((asset) => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {getAssetIcon(fromAsset)}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              {isInsufficientBalance && mounted && (
                <div className="text-xs text-red-400 mt-1">
                  ⚠️ {lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance"}
                </div>
              )}
              <div className="text-xs text-slate-500 mt-1">
                ≈ ${(parseFloat(fromAmount || "0") * getAssetPrice(fromAsset)).toFixed(2)} USD
              </div>
            </div>

            {/* Swap Icon */}
            <div className="flex justify-center mb-4">
              <button
                onClick={() => {
                  const temp = fromAsset;
                  setFromAsset(toAsset);
                  setToAsset(temp);
                }}
                disabled={isProcessing}
                className="p-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </button>
            </div>

            {/* To Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-slate-400">
                  {lang === "tr" ? "Alacağınız" : "You receive"}
                </label>
                {mounted && (
                  <div className="text-xs text-slate-500">
                    {lang === "tr" ? "Bakiye:" : "Balance:"} {toBalance.toFixed(4)} {toAsset}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={result.toAmount.toFixed(6)}
                  readOnly
                  className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100"
                />
                <div className="relative">
                  <select
                    value={toAsset}
                    onChange={(e) => setToAsset(e.target.value as Asset)}
                    disabled={isProcessing}
                    className="appearance-none pl-12 pr-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-emerald-500 min-w-[140px] disabled:opacity-50"
                  >
                    {allAssets.map((asset) => (
                      <option key={asset} value={asset}>{asset}</option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {getAssetIcon(toAsset)}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                ≈ ${(result.toAmount * getAssetPrice(toAsset)).toFixed(2)} USD
              </div>
            </div>

            {/* Exchange Details */}
            <div className="mb-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{lang === "tr" ? "Dönüşüm Oranı" : "Exchange Rate"}</span>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    {getAssetIcon(fromAsset)}
                    <span className="text-slate-200 font-mono">1 {fromAsset}</span>
                  </div>
                  <span className="text-slate-400">=</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-200 font-mono">{result.rate.toFixed(6)} {toAsset}</span>
                    {getAssetIcon(toAsset)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Spread</span>
                <span className="text-amber-400 font-mono">{(result.spread * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">{lang === "tr" ? "Toplam Ücret" : "Total Fee"}</span>
                <span className="text-slate-200 font-mono">${result.fee.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {lang === "tr" ? "İptal" : "Cancel"}
              </button>
              <button
                onClick={handleSwap}
                disabled={parseFloat(fromAmount) <= 0 || isInsufficientBalance || isProcessing || !address}
                className="px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing 
                  ? currentStep === "approving"
                    ? (lang === "tr" ? "Onaylanıyor..." : "Approving...")
                    : (lang === "tr" ? "Dönüştürülüyor..." : "Swapping...")
                  : !address
                  ? (lang === "tr" ? "Cüzdan Bağla" : "Connect Wallet")
                  : (lang === "tr" ? "Dönüştür" : "Exchange")
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}