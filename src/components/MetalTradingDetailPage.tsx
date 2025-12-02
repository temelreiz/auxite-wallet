"use client";

import { useState, useEffect, useRef } from "react";

interface MetalTradingDetailPageProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  change24h: number;
  lang?: "tr" | "en";
  userBalance?: {
    auxm: number;
    bonusAuxm: number;
    metals: Record<string, number>;
  };
}

const METAL_INFO = {
  AUXG: { name: "Gold", nameTr: "Altın", pair: "AUXG/USD", icon: "🥇", color: "#FFD700" },
  AUXS: { name: "Silver", nameTr: "Gümüş", pair: "AUXS/USD", icon: "🥈", color: "#C0C0C0" },
  AUXPT: { name: "Platinum", nameTr: "Platin", pair: "AUXPT/USD", icon: "⚪", color: "#E5E4E2" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", pair: "AUXPD/USD", icon: "🔘", color: "#CED0DD" },
};

const SPREAD = { buy: 0.01, sell: 0.01 };

function generateCandleData(basePrice: number, count: number = 40) {
  const candles = [];
  let price = basePrice * 0.97;
  
  for (let i = 0; i < count; i++) {
    const volatility = basePrice * 0.004;
    const open = price;
    const close = open + (Math.random() - 0.45) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    candles.push({ open, high, low, close, time: i });
    price = close;
  }
  
  if (candles.length > 0) {
    const lastCandle = candles[candles.length - 1];
    const diff = basePrice - lastCandle.close;
    candles.forEach((c, i) => {
      const factor = i / candles.length;
      c.open += diff * factor;
      c.high += diff * factor;
      c.low += diff * factor;
      c.close += diff * factor;
    });
  }
  
  return candles;
}

export function MetalTradingDetailPage({
  isOpen,
  onClose,
  metal,
  metalName,
  currentPrice,
  bidPrice,
  change24h,
  lang = "en",
  userBalance = { auxm: 1250.50, bonusAuxm: 25.00, metals: { AUXG: 15.75, AUXS: 500, AUXPT: 2.5, AUXPD: 1.25 } },
}: MetalTradingDetailPageProps) {
  const [activeTab, setActiveTab] = useState<"price" | "info" | "trades">("price");
  const [timeframe, setTimeframe] = useState("4h");
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tradeResult, setTradeResult] = useState<"success" | "error" | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [candles, setCandles] = useState<any[]>([]);

  const metalInfo = METAL_INFO[metal];
  const isPositive = change24h >= 0;

  useEffect(() => {
    if (isOpen) {
      setCandles(generateCandleData(currentPrice));
      setTradeResult(null);
      setAmount("1");
    }
  }, [isOpen, currentPrice]);

  // Draw chart
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 10, right: 50, bottom: 20, left: 5 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, width, height);

    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices) * 0.999;
    const maxPrice = Math.max(...prices) * 1.001;
    const priceRange = maxPrice - minPrice;

    // Grid
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 3; i++) {
      const y = padding.top + (chartHeight / 3) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      const price = maxPrice - (priceRange / 3) * i;
      ctx.fillStyle = "#64748b";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(2), width - padding.right + 3, y + 3);
    }

    // Candles
    const candleWidth = chartWidth / candles.length;
    const bodyWidth = candleWidth * 0.6;

    candles.forEach((candle, i) => {
      const x = padding.left + i * candleWidth + candleWidth / 2;
      const isGreen = candle.close >= candle.open;

      const highY = padding.top + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding.top + ((maxPrice - candle.low) / priceRange) * chartHeight;
      ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      const openY = padding.top + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding.top + ((maxPrice - candle.close) / priceRange) * chartHeight;
      ctx.fillStyle = isGreen ? "#10b981" : "#ef4444";
      ctx.fillRect(x - bodyWidth / 2, Math.min(openY, closeY), bodyWidth, Math.abs(closeY - openY) || 1);
    });

    // MA line
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const maLength = 8;
    candles.forEach((_, i) => {
      if (i < maLength) return;
      const ma = candles.slice(i - maLength, i).reduce((sum, c) => sum + c.close, 0) / maLength;
      const x = padding.left + i * candleWidth + candleWidth / 2;
      const y = padding.top + ((maxPrice - ma) / priceRange) * chartHeight;
      if (i === maLength) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current price
    const currentY = padding.top + ((maxPrice - currentPrice) / priceRange) * chartHeight;
    ctx.strokeStyle = "#f59e0b";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(padding.left, currentY);
    ctx.lineTo(width - padding.right, currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(width - padding.right, currentY - 8, 48, 16);
    ctx.fillStyle = "#000";
    ctx.font = "bold 9px monospace";
    ctx.fillText(currentPrice.toFixed(2), width - padding.right + 2, currentY + 3);

  }, [candles, currentPrice]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const askPrice = currentPrice;
  const sellPrice = bidPrice || currentPrice * (1 - SPREAD.sell);
  const effectivePrice = tradeMode === "buy" ? askPrice : sellPrice;
  const grossValue = amountNum * effectivePrice;
  const spreadFee = grossValue * SPREAD[tradeMode];
  const totalCost = tradeMode === "buy" ? grossValue + spreadFee : 0;
  const totalReceive = tradeMode === "sell" ? grossValue - spreadFee : 0;

  const totalAuxm = userBalance.auxm + userBalance.bonusAuxm;
  const metalBalance = userBalance.metals[metal] || 0;
  const canAfford = tradeMode === "buy" ? totalCost <= totalAuxm : amountNum <= metalBalance;

  const bonusUsage = tradeMode === "buy" 
    ? userBalance.bonusAuxm >= totalCost 
      ? { usedBonus: totalCost, usedRegular: 0 }
      : { usedBonus: userBalance.bonusAuxm, usedRegular: totalCost - userBalance.bonusAuxm }
    : { usedBonus: 0, usedRegular: 0 };

  const handleTrade = async () => {
    if (!canAfford || amountNum <= 0) return;
    setIsProcessing(true);
    try {
      const response = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: "0x123", action: tradeMode, metal, amount: amountNum }),
      });
      if (response.ok) {
        setTradeResult("success");
        setTimeout(() => { setTradeResult(null); setAmount("1"); }, 2000);
      } else {
        setTradeResult("error");
      }
    } catch {
      setTradeResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMaxClick = () => {
    if (tradeMode === "buy") {
      const maxGrams = totalAuxm / (effectivePrice * (1 + SPREAD.buy));
      setAmount(maxGrams.toFixed(4));
    } else {
      setAmount(metalBalance.toFixed(4));
    }
  };

  const high24h = currentPrice * (1 + Math.abs(change24h) / 100 + 0.01);
  const low24h = currentPrice * (1 - Math.abs(change24h) / 100 - 0.005);
  const volume24h = (Math.random() * 500 + 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">{metalInfo.icon}</span>
            <span className="font-bold text-white">{metalInfo.pair}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(change24h).toFixed(2)}%
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 text-sm">
          {[
            { id: "price", label: "Price" },
            { id: "info", label: lang === "tr" ? "Bilgiler" : "Info" },
            { id: "trades", label: lang === "tr" ? "İşlem Verileri" : "Trades" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id ? "text-white border-b-2 border-white" : "text-slate-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === "price" && (
            <div className="p-3">
              {/* Price */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold font-mono ${
                      change24h > 0 ? "text-emerald-400" : change24h < 0 ? "text-red-400" : "text-white"
                    }`}>
                      ${currentPrice.toFixed(2)}
                    </span>
                    <span className="text-emerald-400 text-xs">● LIVE</span>
                  </div>
                  <div className="text-slate-500 text-xs">₺{(currentPrice * 35.5).toFixed(2)}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-400">24h High <span className="text-emerald-400">${high24h.toFixed(2)}</span></div>
                  <div className="text-slate-400">24h Low <span className="text-red-400">${low24h.toFixed(2)}</span></div>
                  <div className="text-slate-400">24h Vol <span className="text-white">${volume24h}M</span></div>
                </div>
              </div>

              {/* Timeframe */}
              <div className="flex gap-1 mb-2">
                {["15m", "1h", "4h", "1D", "1W"].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      timeframe === tf ? "bg-slate-700 text-white" : "text-slate-400"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-lg bg-slate-950 border border-slate-800 overflow-hidden mb-3">
                <canvas ref={canvasRef} className="w-full" style={{ width: '100%', height: '160px' }} />
              </div>

              {/* Performance */}
              <div className="grid grid-cols-6 gap-1 text-center text-xs mb-2">
                {[
                  { label: lang === "tr" ? "Bugün" : "Today", value: change24h },
                  { label: "7G", value: change24h * 1.5 },
                  { label: "30G", value: change24h * 0.8 },
                  { label: "90G", value: change24h * 2 },
                  { label: "180G", value: change24h * 3 },
                  { label: "1Y", value: change24h * 5 },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="text-slate-500">{item.label}</div>
                    <div className={item.value >= 0 ? "text-emerald-400" : "text-red-400"}>
                      {item.value >= 0 ? "+" : ""}{item.value.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "info" && (
            <div className="p-3 space-y-2 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{lang === "tr" ? "Sembol" : "Symbol"}</span>
                <span className="text-white">{metal}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{lang === "tr" ? "İsim" : "Name"}</span>
                <span className="text-white">{metalName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">{lang === "tr" ? "Birim" : "Unit"}</span>
                <span className="text-white">Gram</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Spread</span>
                <span className="text-white">1%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">24h High</span>
                <span className="text-emerald-400">${high24h.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">24h Low</span>
                <span className="text-red-400">${low24h.toFixed(2)}</span>
              </div>
            </div>
          )}

          {activeTab === "trades" && (
            <div className="p-3 space-y-1 text-xs">
              {[...Array(8)].map((_, i) => {
                const isBuy = Math.random() > 0.5;
                const price = currentPrice * (0.998 + Math.random() * 0.004);
                const qty = (Math.random() * 10 + 0.5).toFixed(2);
                return (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-slate-800">
                    <span className={isBuy ? "text-emerald-400" : "text-red-400"}>{isBuy ? "BUY" : "SELL"}</span>
                    <span className="text-white font-mono">${price.toFixed(2)}</span>
                    <span className="text-slate-400">{qty}g</span>
                    <span className="text-slate-500">{Math.floor(Math.random() * 60)}s</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trade Panel */}
        <div className="border-t border-slate-800 p-3 bg-slate-900/50">
          {tradeResult === "success" ? (
            <div className="text-center py-2">
              <div className="text-emerald-400 font-semibold">✓ {lang === "tr" ? "İşlem Başarılı!" : "Trade Successful!"}</div>
              {tradeMode === "buy" && bonusUsage.usedBonus > 0 && (
                <div className="text-purple-400 text-xs">🎁 {bonusUsage.usedBonus.toFixed(2)} Bonus AUXM</div>
              )}
            </div>
          ) : (
            <>
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-800 rounded-lg mb-2">
                <button
                  onClick={() => setTradeMode("buy")}
                  className={`py-1.5 rounded-md text-sm font-semibold transition-all ${
                    tradeMode === "buy" ? "bg-emerald-500 text-white" : "text-slate-400"
                  }`}
                >
                  {lang === "tr" ? "Al" : "Buy"}
                </button>
                <button
                  onClick={() => setTradeMode("sell")}
                  className={`py-1.5 rounded-md text-sm font-semibold transition-all ${
                    tradeMode === "sell" ? "bg-red-500 text-white" : "text-slate-400"
                  }`}
                >
                  {lang === "tr" ? "Sat" : "Sell"}
                </button>
              </div>

              {/* Balance */}
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">
                  {tradeMode === "buy" ? "AUXM" : metal}
                </span>
                <span className="text-white">
                  {tradeMode === "buy" 
                    ? <>{totalAuxm.toFixed(2)} {userBalance.bonusAuxm > 0 && <span className="text-purple-400">(+{userBalance.bonusAuxm.toFixed(2)} bonus)</span>}</>
                    : `${metalBalance.toFixed(4)}g`}
                </span>
              </div>

              {/* Input */}
              <div className="relative mb-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleMaxClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-slate-700 rounded text-emerald-400 font-semibold"
                >
                  MAX
                </button>
              </div>

              {/* Cost */}
              <div className={`flex justify-between items-center p-2 rounded-lg mb-2 text-sm ${
                tradeMode === "buy" ? "bg-emerald-500/10" : "bg-red-500/10"
              }`}>
                <span className="text-slate-400">
                  {tradeMode === "buy" ? (lang === "tr" ? "Ödeme" : "Cost") : (lang === "tr" ? "Alacak" : "Receive")}
                </span>
                <div className="text-right">
                  <span className={`font-bold font-mono ${tradeMode === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                    {(tradeMode === "buy" ? totalCost : totalReceive).toFixed(2)} AUXM
                  </span>
                  {tradeMode === "buy" && userBalance.bonusAuxm > 0 && amountNum > 0 && (
                    <div className="text-purple-400 text-xs">
                      🎁 {bonusUsage.usedBonus.toFixed(2)} + {bonusUsage.usedRegular.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              {/* Button */}
              <button
                onClick={handleTrade}
                disabled={isProcessing || !canAfford || amountNum <= 0}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 transition-all ${
                  tradeMode === "buy" 
                    ? "bg-emerald-500 hover:bg-emerald-400 text-white"
                    : "bg-red-500 hover:bg-red-400 text-white"
                }`}
              >
                {isProcessing 
                  ? "..." 
                  : tradeMode === "buy" 
                    ? (lang === "tr" ? "Satın Al" : "Buy Now")
                    : (lang === "tr" ? "Şimdi Sat" : "Sell Now")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetalTradingDetailPage;
