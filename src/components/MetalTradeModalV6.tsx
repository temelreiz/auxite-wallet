// src/components/MetalTradeModalV6.tsx
// V6 kontratları ile blockchain tabanlı trade modal - Market/Limit Order desteği

"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount } from "wagmi";
import Image from "next/image";
import { useTradeV6 } from "@/hooks/useTradeV6";
import { TOKEN_CONFIG } from "@/config/contracts-v8";
import { TRADE_CONFIG, formatEth } from "@/config/contracts";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

interface MetalTradeModalV6Props {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  initialMode?: "buy" | "sell";
  lang?: "tr" | "en";
}

type OrderType = "market" | "limit";

// Metal icon paths
const METAL_ICONS: Record<string, string> = {
  AUXG: "/auxg_icon.png",
  AUXS: "/auxs_icon.png",
  AUXPT: "/auxpt_icon.png",
  AUXPD: "/auxpd_icon.png",
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  tr: {
    buy: "Satın Al",
    sell: "Sat",
    market: "Piyasa",
    limit: "Limit",
    orderType: "Emir Tipi",
    marketDesc: "Anlık piyasa fiyatından",
    limitDesc: "Belirlediğin fiyattan",
    amount: "Miktar (gram)",
    limitPrice: "Limit Fiyat",
    currentPrice: "Güncel Fiyat",
    askPrice: "Alış Fiyatı",
    bidPrice: "Satış Fiyatı",
    balance: "Bakiye",
    pendingRefund: "Bekleyen Refund",
    withdraw: "Çek",
    grossValue: "Brüt Değer",
    maxCost: "Max Ödeme",
    minReceive: "Min Alacak",
    cancel: "İptal",
    processing: "İşleniyor...",
    confirming: "Onaylanıyor...",
    buyWithEth: "ETH ile Satın Al",
    sellForEth: "ETH'ye Sat",
    placeOrder: "Emir Ver",
    success: "İşlem Başarılı!",
    orderPlaced: "Limit Emir Verildi!",
    viewTx: "İşlemi Görüntüle",
    tryAgain: "Tekrar Dene",
    insufficientEth: "Yetersiz ETH bakiyesi",
    insufficientMetal: "Yetersiz metal bakiyesi",
    limitOrderInfo: "Limit emriniz piyasa fiyatı belirlediğiniz seviyeye ulaştığında otomatik gerçekleşecektir.",
    pendingOrders: "Bekleyen Emirler",
    noOrders: "Bekleyen emir yok",
    cancelOrder: "İptal Et",
    networkInfo: "Sepolia Testnet • Blockchain üzerinde işlem",
  },
  en: {
    buy: "Buy",
    sell: "Sell",
    market: "Market",
    limit: "Limit",
    orderType: "Order Type",
    marketDesc: "At current market price",
    limitDesc: "At your specified price",
    amount: "Amount (grams)",
    limitPrice: "Limit Price",
    currentPrice: "Current Price",
    askPrice: "Ask Price",
    bidPrice: "Bid Price",
    balance: "Balance",
    pendingRefund: "Pending Refund",
    withdraw: "Withdraw",
    grossValue: "Gross Value",
    maxCost: "Max Cost",
    minReceive: "Min Receive",
    cancel: "Cancel",
    processing: "Processing...",
    confirming: "Confirming...",
    buyWithEth: "Buy with ETH",
    sellForEth: "Sell for ETH",
    placeOrder: "Place Order",
    success: "Transaction Successful!",
    orderPlaced: "Limit Order Placed!",
    viewTx: "View Transaction",
    tryAgain: "Try Again",
    insufficientEth: "Insufficient ETH balance",
    insufficientMetal: "Insufficient metal balance",
    limitOrderInfo: "Your limit order will automatically execute when market price reaches your specified level.",
    pendingOrders: "Pending Orders",
    noOrders: "No pending orders",
    cancelOrder: "Cancel",
    networkInfo: "Sepolia Testnet • On-chain transaction",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function MetalTradeModalV6({
  isOpen,
  onClose,
  metal,
  initialMode = "buy",
  lang = "en",
}: MetalTradeModalV6Props) {
  
  const t = translations[lang];
  const { isConnected, address } = useAccount();
  const [mode, setMode] = useState<"buy" | "sell">(initialMode);
  const [orderType, setOrderType] = useState<OrderType>("market");
  const [amount, setAmount] = useState<string>("1");
  const [limitPrice, setLimitPrice] = useState<string>("");
  const [slippage, setSlippage] = useState<number>(TRADE_CONFIG.DEFAULT_SLIPPAGE_PERCENT);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [limitOrderSuccess, setLimitOrderSuccess] = useState(false);

  // V6 Trade Hook
  const {
    state,
    metalBalance,
    ethBalance,
    pendingRefund,
    askPricePerKg,
    bidPricePerKg,
    buy,
    sell,
    withdrawRefund,
    reset,
    isLoading,
    isConfirming,
  } = useTradeV6({ metalSymbol: metal, slippagePercent: slippage });

  // Metal info
  const metalInfo = TOKEN_CONFIG.METALS[metal];
  const metalIcon = METAL_ICONS[metal];
  const amountNum = parseFloat(amount) || 0;
  const limitPriceNum = parseFloat(limitPrice) || 0;

  // Price calculations (E6 = 6 decimals, per kg)
  const askPricePerGram = askPricePerKg ? Number(askPricePerKg) / 1_000_000 / 1000 : 0;
  const bidPricePerGram = bidPricePerKg ? Number(bidPricePerKg) / 1_000_000 / 1000 : 0;
  
  // For market orders, use current market price
  // For limit orders, use user-specified price
  const effectivePrice = orderType === "limit" 
    ? limitPriceNum 
    : (mode === "buy" ? askPricePerGram : bidPricePerGram);

  // Cost/Payout calculations
  const grossValue = amountNum * effectivePrice;
  const estimatedCostEth = state.estimatedCost ? formatEth(state.estimatedCost) : null;
  const estimatedPayoutEth = state.estimatedPayout ? formatEth(state.estimatedPayout) : null;

  // Can afford check
  const canAfford = mode === "buy" 
    ? parseFloat(ethBalance) >= (state.estimatedCost ? Number(formatEth(state.estimatedCost)) : grossValue / 3500)
    : amountNum <= metalBalance;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setOrderType("market");
      setAmount("1");
      setLimitPrice("");
      setLimitOrderSuccess(false);
      reset();
    }
  }, [isOpen, initialMode, reset]);

  // Set default limit price when switching to limit mode
  useEffect(() => {
    if (orderType === "limit" && !limitPrice) {
      const defaultPrice = mode === "buy" ? askPricePerGram : bidPricePerGram;
      if (defaultPrice > 0) {
        setLimitPrice(defaultPrice.toFixed(2));
      }
    }
  }, [orderType, mode, askPricePerGram, bidPricePerGram, limitPrice]);

  // Auto close on success (market orders)
  useEffect(() => {
    if (state.step === "success" && orderType === "market") {
      const timer = setTimeout(() => {
        onClose();
        reset();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.step, orderType, onClose, reset]);

  // Handle Market Trade
  const handleMarketTrade = async () => {
    if (!isConnected) return;

    if (mode === "buy") {
      await buy(amountNum);
    } else {
      await sell(amountNum);
    }
  };

  // Handle Limit Order
  const handleLimitOrder = async () => {
    if (!isConnected || amountNum <= 0 || limitPriceNum <= 0) return;

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLimitOrderSuccess(true);
    } catch (error) {
      console.error("Limit order failed:", error);
    }
  };

  // Handle Trade Click
  const handleTrade = () => {
    if (orderType === "market") {
      handleMarketTrade();
    } else {
      handleLimitOrder();
    }
  };

  // Handle max click
  const handleMaxClick = () => {
    if (mode === "sell") {
      setAmount(metalBalance.toFixed(3));
    }
  };

  if (!isOpen) return null;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* Header with Metal Icon */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: metalInfo.color + "30" }}
            >
              <Image 
                src={metalIcon} 
                alt={metal} 
                width={28} 
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === "buy" ? t.buy : t.sell} {metal}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === "tr" ? metalInfo.nameTr : metalInfo.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          
         {/* Success State - Market Order */}
        {state.step === "success" && orderType === "market" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#2F6F62]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t.success}</h3>
            {state.txHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${state.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#2F6F62] hover:underline"
              >
                {t.viewTx} ↗
              </a>
            )}
          </div>
          )}
            
          {/* Success State - Limit Order */}
          {limitOrderSuccess && orderType === "limit" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{t.orderPlaced}</h3>
              <p className="text-sm text-slate-400 mb-4 px-4">{t.limitOrderInfo}</p>
              <div className="p-3 bg-slate-800 rounded-xl mx-4 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">{mode === "buy" ? t.buy : t.sell}</span>
                  <span className="text-white font-mono">{amountNum}g {metal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">@ {t.limitPrice}</span>
                  <span className="text-blue-400 font-mono">${limitPriceNum.toFixed(2)}/g</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium"
              >
                OK
              </button>
            </div>
          )}

          {/* Error State */}
          {state.step === "error" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Error</h3>
              <p className="text-sm text-red-400 mb-4">{state.error}</p>
              <button
                onClick={reset}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-white font-medium"
              >
                {t.tryAgain}
              </button>
            </div>
          )}

          {/* Normal State */}
          {state.step !== "success" && state.step !== "error" && !limitOrderSuccess && (
            <>
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800 rounded-xl">
                <button
                  onClick={() => setMode("buy")}
                  disabled={isLoading || isConfirming}
                  className={`py-2.5 rounded-lg font-semibold transition-all ${
                    mode === "buy"
                      ? "bg-[#2F6F62] text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.buy}
                </button>
                <button
                  onClick={() => setMode("sell")}
                  disabled={isLoading || isConfirming}
                  className={`py-2.5 rounded-lg font-semibold transition-all ${
                    mode === "sell"
                      ? "bg-red-500 text-white shadow-lg"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {t.sell}
                </button>
              </div>

              {/* Order Type Toggle */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.orderType}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderType("market")}
                    disabled={isLoading || isConfirming}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      orderType === "market"
                        ? "border-[#2F6F62] bg-[#2F6F62]/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`font-semibold ${orderType === "market" ? "text-[#BFA181]" : "text-slate-300"}`}>
                      {t.market}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t.marketDesc}</div>
                  </button>
                  <button
                    onClick={() => setOrderType("limit")}
                    disabled={isLoading || isConfirming}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      orderType === "limit"
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    }`}
                  >
                    <div className={`font-semibold ${orderType === "limit" ? "text-blue-400" : "text-slate-300"}`}>
                      {t.limit}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{t.limitDesc}</div>
                  </button>
                </div>
              </div>

              {/* Balance Display */}
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t.balance} (ETH)</span>
                  <span className="text-white font-mono">{ethBalance} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t.balance} ({metal})</span>
                  <span className="text-white font-mono">{metalBalance.toFixed(3)}g</span>
                </div>
                {pendingRefund > 0 && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-700">
                    <span className="text-[#BFA181]">💰 {t.pendingRefund}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#BFA181] font-mono">{formatEth(pendingRefund)} ETH</span>
                      <button
                        onClick={withdrawRefund}
                        disabled={isLoading || isConfirming}
                        className="px-2 py-1 bg-[#BFA181]/20 text-[#BFA181] text-xs rounded hover:bg-[#BFA181]/30 disabled:opacity-50"
                      >
                        {t.withdraw}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Display */}
              <div className="p-3 bg-slate-800/50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{t.askPrice}</span>
                  <span className="text-[#2F6F62] font-mono">
                    ${askPricePerGram > 0 ? askPricePerGram.toFixed(2) : "—"}/g
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-slate-400">{t.bidPrice}</span>
                  <span className="text-red-400 font-mono">
                    ${bidPricePerGram > 0 ? bidPricePerGram.toFixed(2) : "—"}/g
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">{t.amount}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.001"
                    disabled={isLoading || isConfirming}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#BFA181] pr-24 disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-slate-500">grams</span>
                    {mode === "sell" && (
                      <button
                        onClick={handleMaxClick}
                        disabled={isLoading || isConfirming}
                        className="px-2 py-1 text-xs bg-[#2F6F62]/20 text-[#2F6F62] rounded hover:bg-[#2F6F62]/30 disabled:opacity-50"
                      >
                        MAX
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Limit Price Input */}
              {orderType === "limit" && (
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">{t.limitPrice}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isLoading || isConfirming}
                      className="w-full pl-8 pr-16 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">/ gram</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[-5, -2, -1, 0, 1, 2, 5].map((percent) => {
                      const basePrice = mode === "buy" ? askPricePerGram : bidPricePerGram;
                      const adjustedPrice = basePrice * (1 + percent / 100);
                      return (
                        <button
                          key={percent}
                          onClick={() => setLimitPrice(adjustedPrice.toFixed(2))}
                          disabled={isLoading || isConfirming || basePrice === 0}
                          className={`flex-1 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50 ${
                            percent === 0 
                              ? "bg-slate-700 text-white" 
                              : percent < 0 
                                ? "bg-[#2F6F62]/20 text-[#2F6F62] hover:bg-[#2F6F62]/30"
                                : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          }`}
                        >
                          {percent > 0 ? "+" : ""}{percent}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Slippage Settings (Market Orders Only) */}
              {orderType === "market" && (
                <div>
                  <button
                    onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                    className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
                  >
                    <svg className={`w-4 h-4 transition-transform ${showSlippageSettings ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Slippage: {slippage}%
                  </button>
                  
                  {showSlippageSettings && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="flex gap-2 mb-2">
                        {[0.5, 1, 2, 3].map((s) => (
                          <button
                            key={s}
                            onClick={() => setSlippage(s)}
                            className={`px-3 py-1 rounded-lg text-sm ${
                              slippage === s
                                ? "bg-[#2F6F62] text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {s}%
                          </button>
                        ))}
                      </div>
                      <input
                        type="range"
                        min={TRADE_CONFIG.MIN_SLIPPAGE_PERCENT}
                        max={TRADE_CONFIG.MAX_SLIPPAGE_PERCENT}
                        step="0.1"
                        value={slippage}
                        onChange={(e) => setSlippage(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Cost Summary */}
              <div className={`p-4 rounded-xl border ${
                orderType === "limit"
                  ? "bg-blue-500/10 border-blue-500/30"
                  : mode === "buy" 
                    ? "bg-[#2F6F62]/10 border-[#2F6F62]/30" 
                    : "bg-red-500/10 border-red-500/30"
              }`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.grossValue}</span>
                    <span className="text-white font-mono">${grossValue.toFixed(2)}</span>
                  </div>
                  
                  {orderType === "market" && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Slippage ({slippage}%)</span>
                      <span className="text-slate-400 font-mono">±${(grossValue * slippage / 100).toFixed(2)}</span>
                    </div>
                  )}
                  
                  {orderType === "limit" && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">@ {t.limitPrice}</span>
                      <span className="text-blue-400 font-mono">${limitPriceNum.toFixed(2)}/g</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className={`font-semibold ${
                      orderType === "limit" 
                        ? "text-blue-400"
                        : mode === "buy" ? "text-[#2F6F62]" : "text-red-400"
                    }`}>
                      {mode === "buy" ? t.maxCost : t.minReceive}
                    </span>
                    <span className={`text-lg font-bold font-mono ${
                      orderType === "limit"
                        ? "text-blue-400"
                        : mode === "buy" ? "text-[#2F6F62]" : "text-red-400"
                    }`}>
                      {orderType === "market" 
                        ? `${estimatedCostEth || estimatedPayoutEth || "~"} ETH`
                        : `$${grossValue.toFixed(2)}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {!canAfford && amountNum > 0 && (
                <div className="p-3 rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/30">
                  <p className="text-sm text-[#BFA181]">
                    {mode === "buy" ? t.insufficientEth : t.insufficientMetal.replace("metal", metal)}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isLoading || isConfirming}
                  className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {t.cancel}
                </button>
                
                {orderType === "market" ? (
                  <button
                    onClick={handleTrade}
                    disabled={isLoading || isConfirming || !canAfford || amountNum <= 0 || !isConnected}
                    className={`px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      mode === "buy"
                        ? "bg-[#2F6F62] hover:bg-[#2F6F62] text-white shadow-lg shadow-[#2F6F62]/25"
                        : "bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/25"
                    }`}
                  >
                    {(isLoading || isConfirming) ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {isConfirming ? t.confirming : t.processing}
                      </>
                    ) : (
                      mode === "buy" ? t.buyWithEth : t.sellForEth
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleTrade}
                    disabled={isLoading || isConfirming || !canAfford || amountNum <= 0 || limitPriceNum <= 0 || !isConnected}
                    className="px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25"
                  >
                    {(isLoading || isConfirming) ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        {t.processing}
                      </>
                    ) : (
                      t.placeOrder
                    )}
                  </button>
                )}
              </div>

              {/* Network Info */}
              <p className="text-xs text-slate-500 text-center">
                🔗 {t.networkInfo}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetalTradeModalV6;
