"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface CryptoTradingDetailPageProps {
  cryptoId: "ETH" | "BTC";
  onClose: () => void;
  lang?: "tr" | "en";
}

type TimeFrame = "15m" | "1h" | "4h" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL";
type PanelIndicator = "VOL" | "MACD" | "RSI";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAME_SETTINGS: Record<TimeFrame, { candleCount: number; intervalMs: number }> = {
  "15m": { candleCount: 80, intervalMs: 900000 },
  "1h": { candleCount: 80, intervalMs: 3600000 },
  "4h": { candleCount: 80, intervalMs: 14400000 },
  "1D": { candleCount: 80, intervalMs: 86400000 },
  "1W": { candleCount: 80, intervalMs: 604800000 },
};

const CRYPTO_INFO = {
  ETH: { name: "Ethereum", color: "#627EEA", icon: "Ξ" },
  BTC: { name: "Bitcoin", color: "#F7931A", icon: "₿" },
};

function calculateMA(data: CandleData[], period: number = 20): number[] {
  const ma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) ma.push(data[i].close);
    else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
}

function calculateEMA(data: CandleData[], period: number = 20): number[] {
  const ema: number[] = [];
  const k = 2 / (period + 1);
  let emaVal = data[0]?.close || 0;
  for (let i = 0; i < data.length; i++) {
    emaVal = data[i].close * k + emaVal * (1 - k);
    ema.push(emaVal);
  }
  return ema;
}

function calculateBOLL(data: CandleData[], period: number = 20): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateMA(data, period);
  const upper: number[] = [], lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { upper.push(data[i].close); lower.push(data[i].close); }
    else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
      upper.push(mean + 2 * Math.sqrt(variance));
      lower.push(mean - 2 * Math.sqrt(variance));
    }
  }
  return { upper, middle, lower };
}

function calculateRSI(data: CandleData[], period: number = 14): number[] {
  const rsi: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) { rsi.push(50); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period; j < i; j++) {
      const change = data[j + 1].close - data[j].close;
      if (change > 0) gains += change; else losses -= change;
    }
    const rs = (gains / period) / ((losses / period) || 1);
    rsi.push(100 - (100 / (1 + rs)));
  }
  return rsi;
}

function calculateMACD(data: CandleData[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const macd: number[] = [], signal: number[] = [], histogram: number[] = [];
  let ema12 = data[0]?.close || 0, ema26 = data[0]?.close || 0;
  for (let i = 0; i < data.length; i++) {
    ema12 = (data[i].close * 2) / 13 + ema12 * 11 / 13;
    ema26 = (data[i].close * 2) / 27 + ema26 * 25 / 27;
    macd.push(ema12 - ema26);
  }
  let sig = macd[0] || 0;
  for (let i = 0; i < macd.length; i++) {
    sig = (macd[i] * 2) / 10 + sig * 8 / 10;
    signal.push(sig);
    histogram.push(macd[i] - sig);
  }
  return { macd, signal, histogram };
}

export default function CryptoTradingDetailPage({ cryptoId, onClose, lang = "en" }: CryptoTradingDetailPageProps) {
  const { prices, changes, directions } = useCryptoPrices();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("4h");
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data">("price");
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>(["MA"]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>(null);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell" | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  
  // Spread settings from admin
  const [spreadSettings, setSpreadSettings] = useState<{ askAdjust: number; bidAdjust: number }>({ askAdjust: 1, bidAdjust: -0.5 });

  const cryptoInfo = CRYPTO_INFO[cryptoId];
  const basePrice = cryptoId === "ETH" ? prices.eth : prices.btc;
  const change24h = cryptoId === "ETH" ? changes.eth : changes.btc;
  const direction = cryptoId === "ETH" ? directions.eth : directions.btc;
  const tryRate = prices.try;
  
  // Apply spread to get ask/bid prices
  const askPrice = basePrice * (1 + spreadSettings.askAdjust / 100);
  const bidPrice = basePrice * (1 + spreadSettings.bidAdjust / 100);
  // Use ask price as the display price (what user pays to buy)
  const currentPrice = askPrice;

  const initialPriceRef = useRef(currentPrice);
  
  // Fetch spread settings from admin API
  useEffect(() => {
    const fetchSpreads = async () => {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const settings = await res.json();
          if (settings[cryptoId]) {
            setSpreadSettings({
              askAdjust: settings[cryptoId].askAdjust ?? 1,
              bidAdjust: settings[cryptoId].bidAdjust ?? -0.5,
            });
          }
        }
      } catch (err) {
        console.log("Failed to fetch crypto spreads");
      }
    };
    fetchSpreads();
    const interval = setInterval(fetchSpreads, 30000);
    return () => clearInterval(interval);
  }, [cryptoId]);
  
  useEffect(() => {
    if (currentPrice > 0 && initialPriceRef.current === 0) {
      initialPriceRef.current = currentPrice;
    }
  }, [currentPrice]);

  const generateCandleData = useCallback((basePrice: number, timeFrame: TimeFrame, seed: string): CandleData[] => {
    const { candleCount, intervalMs } = TIMEFRAME_SETTINGS[timeFrame];
    const data: CandleData[] = [];
    const numericSeed = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let price = basePrice * 0.95;
    
    for (let i = 0; i < candleCount; i++) {
      const r1 = Math.sin(numericSeed + i * 0.7) * 10000;
      const r2 = Math.sin(numericSeed + i * 1.3) * 10000;
      const r3 = Math.sin(numericSeed + i * 0.5) * 10000;
      const random1 = r1 - Math.floor(r1), random2 = r2 - Math.floor(r2), random3 = r3 - Math.floor(r3);
      
      const volatility = cryptoId === "BTC" ? 0.015 : 0.02;
      const trend = (i / candleCount) * 0.05;
      const change = (random1 - 0.45) * volatility * price + trend * price / candleCount;
      const open = price, close = price + change;
      const high = Math.max(open, close) * (1 + random2 * 0.008);
      const low = Math.min(open, close) * (1 - random3 * 0.008);
      const volume = (random1 * (cryptoId === "BTC" ? 5e9 : 5e8)) + 1e8;
      
      data.push({ time: Date.now() - (candleCount - i) * intervalMs, open, high, low, close, volume });
      price = close;
    }
    
    if (data.length > 0 && basePrice > 0) data[data.length - 1].close = basePrice;
    return data;
  }, [cryptoId]);

  const candleData = useMemo(() => {
    const base = initialPriceRef.current || currentPrice || (cryptoId === "ETH" ? 3000 : 90000);
    return generateCandleData(base, timeFrame, cryptoId + timeFrame);
  }, [timeFrame, cryptoId, generateCandleData, currentPrice]);

  const performancePeriods = useMemo(() => {
    const seed = cryptoId.charCodeAt(0);
    const base = change24h || 0;
    return [
      { label: lang === "tr" ? "Bugün" : "Today", value: base },
      { label: lang === "tr" ? "7 Gün" : "7 Days", value: base * (2.5 + Math.sin(seed) * 0.5) },
      { label: lang === "tr" ? "30 Gün" : "30 Days", value: base * (-0.5 + Math.sin(seed + 1) * 1.5) },
      { label: lang === "tr" ? "90 Gün" : "90 Days", value: base * (5.2 + Math.sin(seed + 2) * 2) },
      { label: lang === "tr" ? "180 Gün" : "180 Days", value: base * (12 + Math.sin(seed + 3) * 4) },
      { label: lang === "tr" ? "1 Yıl" : "1 Year", value: base * (40 + Math.sin(seed + 4) * 15) },
    ];
  }, [change24h, cryptoId, lang]);

  const high24h = candleData.length > 0 ? Math.max(...candleData.slice(-24).map(c => c.high)) : currentPrice * 1.02;
  const low24h = candleData.length > 0 ? Math.min(...candleData.slice(-24).map(c => c.low)) : currentPrice * 0.98;
  const volume24h = candleData.length > 0 ? candleData.slice(-24).reduce((sum, c) => sum + c.volume, 0) : 0;
  const lastCandle = candleData[candleData.length - 1];

  const visibleCandleCount = Math.floor(60 / zoom);
  const visibleData = candleData.slice(-visibleCandleCount);

  const chartWidth = 700, mainChartHeight = 200, indicatorHeight = 60;
  const padding = { top: 15, right: 55, bottom: 20, left: 10 };

  const priceMin = visibleData.length > 0 ? Math.min(...visibleData.map(c => c.low)) * 0.998 : currentPrice * 0.95;
  const priceMax = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.high)) * 1.002 : currentPrice * 1.05;
  const volumeMax = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.volume)) : 1;

  const scaleX = (i: number) => padding.left + (i / (visibleData.length - 1 || 1)) * (chartWidth - padding.left - padding.right);
  const scaleY = (price: number) => padding.top + (1 - (price - priceMin) / (priceMax - priceMin || 1)) * (mainChartHeight - padding.top - padding.bottom);
  const candleWidth = Math.max(3, Math.min(12, (chartWidth - padding.left - padding.right) / visibleData.length * 0.7));

  const timeFrames: TimeFrame[] = ["15m", "1h", "4h", "1D", "1W"];
  const overlayList: OverlayIndicator[] = ["MA", "EMA", "BOLL"];
  const panelList: PanelIndicator[] = ["VOL", "MACD", "RSI"];

  const toggleOverlay = (ind: OverlayIndicator) => setOverlayIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);

  const maData = calculateMA(candleData, 20), emaData = calculateEMA(candleData, 20), bollData = calculateBOLL(candleData, 20);
  const rsiData = calculateRSI(candleData), macdData = calculateMACD(candleData);
  const visibleMA = maData.slice(-visibleCandleCount), visibleEMA = emaData.slice(-visibleCandleCount);
  const visibleBOLL = { upper: bollData.upper.slice(-visibleCandleCount), middle: bollData.middle.slice(-visibleCandleCount), lower: bollData.lower.slice(-visibleCandleCount) };
  const visibleRSI = rsiData.slice(-visibleCandleCount);
  const visibleMACD = { macd: macdData.macd.slice(-visibleCandleCount), signal: macdData.signal.slice(-visibleCandleCount), histogram: macdData.histogram.slice(-visibleCandleCount) };

  const isPositive = change24h >= 0;
  const formatPrice = (p: number) => p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatVolume = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`;

  const handleTrade = () => {
    const amount = parseFloat(tradeAmount);
    if (!amount || amount <= 0) return;
    alert(`${tradeMode === "buy" ? (lang === "tr" ? "Alım" : "Buy") : (lang === "tr" ? "Satım" : "Sell")} ${amount} ${cryptoId} @ $${formatPrice(currentPrice)}\nToplam: $${formatPrice(amount * currentPrice)}`);
    setTradeMode(null);
    setTradeAmount("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: cryptoInfo.color }}>
              {cryptoId === "ETH" ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white"><path d="M12 1.5l-6.5 11L12 17l6.5-4.5L12 1.5z"/><path d="M12 18.5l-6.5-4.5L12 22.5l6.5-8.5L12 18.5z" fillOpacity="0.6"/></svg>
              ) : <span className="text-white font-bold">₿</span>}
            </div>
            <span className="text-xl font-bold text-white">{cryptoId}/USDT</span>
            <span className={`text-xs px-2 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(change24h).toFixed(2)}%
            </span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-4 text-sm border-b border-slate-800">
          {[
            { id: "price", label: "Price" },
            { id: "info", label: lang === "tr" ? "Bilgiler" : "Info" },
            { id: "data", label: lang === "tr" ? "İşlem Verileri" : "Trading Data" },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-2.5 border-b-2 transition-colors ${activeTab === tab.id ? "border-yellow-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === "price" && (
            <>
              {/* Price Header */}
              <div className="px-4 py-3 border-b border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold font-mono transition-colors duration-300 ${direction === "up" ? "text-emerald-400" : direction === "down" ? "text-red-400" : "text-white"}`}>
                        ${formatPrice(currentPrice)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE
                      </span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">₺{formatPrice(currentPrice * tryRate)}</div>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div className="flex justify-between gap-4"><span className="text-slate-500">24h High</span><span className="text-emerald-400 font-mono">${formatPrice(high24h)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">24h Low</span><span className="text-red-400 font-mono">${formatPrice(low24h)}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-slate-500">24h Vol</span><span className="text-white font-mono">{formatVolume(volume24h)}</span></div>
                  </div>
                </div>
              </div>

              {/* Timeframe & Zoom */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50">
                <div className="flex items-center gap-1">
                  {timeFrames.map(tf => (
                    <button key={tf} onClick={() => setTimeFrame(tf)} className={`px-3 py-1 text-xs rounded transition-colors ${timeFrame === tf ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>{tf}</button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
                  </button>
                  <span className="text-xs text-slate-500 w-8 text-center">{zoom.toFixed(1)}x</span>
                  <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" /></svg>
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="px-2 py-2">
                <svg width="100%" viewBox={`0 0 ${chartWidth} ${mainChartHeight}`} className="overflow-visible" onMouseLeave={() => setHoveredCandle(null)}>
                  {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                    const y = padding.top + ratio * (mainChartHeight - padding.top - padding.bottom);
                    const price = priceMax - ratio * (priceMax - priceMin);
                    return (<g key={i}><line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#1e293b" strokeWidth="1" /><text x={chartWidth - padding.right + 5} y={y + 4} className="text-[10px] fill-slate-600">{formatPrice(price)}</text></g>);
                  })}
                  {overlayIndicators.includes("MA") && visibleMA.length > 0 && <polyline points={visibleMA.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" />}
                  {overlayIndicators.includes("EMA") && visibleEMA.length > 0 && <polyline points={visibleEMA.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="2" />}
                  {overlayIndicators.includes("BOLL") && visibleBOLL.upper.length > 0 && (<><polyline points={visibleBOLL.upper.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" /><polyline points={visibleBOLL.middle.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="1.5" /><polyline points={visibleBOLL.lower.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" /></>)}
                  {visibleData.map((candle, i) => {
                    const x = scaleX(i), isGreen = candle.close >= candle.open, color = isGreen ? "#22c55e" : "#ef4444";
                    const bodyTop = scaleY(Math.max(candle.open, candle.close)), bodyBottom = scaleY(Math.min(candle.open, candle.close));
                    return (<g key={i} onMouseEnter={() => setHoveredCandle(i)} className="cursor-crosshair"><line x1={x} y1={scaleY(candle.high)} x2={x} y2={scaleY(candle.low)} stroke={color} strokeWidth="1.5" /><rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={Math.max(bodyBottom - bodyTop, 1)} fill={color} /></g>);
                  })}
                  {lastCandle && (<g><line x1={padding.left} y1={scaleY(currentPrice)} x2={chartWidth - padding.right} y2={scaleY(currentPrice)} stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" /><rect x={chartWidth - padding.right} y={scaleY(currentPrice) - 10} width="55" height="20" fill={direction === "up" ? "#22c55e" : direction === "down" ? "#ef4444" : "#64748b"} rx="3" /><text x={chartWidth - padding.right + 3} y={scaleY(currentPrice) + 4} className="text-[9px] fill-white font-mono">{formatPrice(currentPrice)}</text></g>)}
                  {hoveredCandle !== null && visibleData[hoveredCandle] && (<g><rect x={Math.min(scaleX(hoveredCandle) - 55, chartWidth - 120)} y={8} width="110" height="58" fill="#1e293b" stroke="#334155" rx="4" /><text x={Math.min(scaleX(hoveredCandle) - 50, chartWidth - 115)} y={22} className="text-[9px] fill-slate-400">O: <tspan className="fill-white font-mono">{formatPrice(visibleData[hoveredCandle].open)}</tspan></text><text x={Math.min(scaleX(hoveredCandle) - 50, chartWidth - 115)} y={34} className="text-[9px] fill-slate-400">H: <tspan className="fill-emerald-400 font-mono">{formatPrice(visibleData[hoveredCandle].high)}</tspan></text><text x={Math.min(scaleX(hoveredCandle) - 50, chartWidth - 115)} y={46} className="text-[9px] fill-slate-400">L: <tspan className="fill-red-400 font-mono">{formatPrice(visibleData[hoveredCandle].low)}</tspan></text><text x={Math.min(scaleX(hoveredCandle) - 50, chartWidth - 115)} y={58} className="text-[9px] fill-slate-400">C: <tspan className="fill-white font-mono">{formatPrice(visibleData[hoveredCandle].close)}</tspan></text></g>)}
                </svg>
              </div>

              {/* Indicators */}
              <div className="px-2 border-t border-slate-800/30">
                <div className="py-1 space-y-1">
                  <div className="flex gap-1 items-center"><span className="text-[9px] text-slate-500 px-1">Overlay:</span>{overlayList.map(ind => (<button key={ind} onClick={() => toggleOverlay(ind)} className={`px-2 py-1 text-[10px] rounded transition-colors ${overlayIndicators.includes(ind) ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400"}`}>{ind}</button>))}</div>
                  <div className="flex gap-1 items-center"><span className="text-[9px] text-slate-500 px-1">Panel:</span>{panelList.map(ind => (<button key={ind} onClick={() => setPanelIndicator(panelIndicator === ind ? null : ind)} className={`px-2 py-1 text-[10px] rounded transition-colors ${panelIndicator === ind ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400"}`}>{ind}</button>))}</div>
                </div>
              </div>

              {panelIndicator && (
                <div className="px-2 border-t border-slate-800/30">
                  <svg width="100%" viewBox={`0 0 ${chartWidth} ${indicatorHeight}`}>
                    {panelIndicator === "RSI" && visibleRSI.length > 0 && (<><text x={10} y={12} className="text-[9px] fill-slate-400">RSI (14)</text><line x1={padding.left} y1={indicatorHeight * 0.3} x2={chartWidth - padding.right} y2={indicatorHeight * 0.3} stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" /><line x1={padding.left} y1={indicatorHeight * 0.7} x2={chartWidth - padding.right} y2={indicatorHeight * 0.7} stroke="#22c55e" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" /><polyline points={visibleRSI.map((val, i) => `${scaleX(i)},${indicatorHeight - (val / 100) * (indicatorHeight - 10) - 5}`).join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2" /></>)}
                    {panelIndicator === "MACD" && visibleMACD.histogram.length > 0 && (<><text x={10} y={12} className="text-[9px] fill-slate-400">MACD</text><line x1={padding.left} y1={indicatorHeight / 2} x2={chartWidth - padding.right} y2={indicatorHeight / 2} stroke="#334155" strokeWidth="1" />{visibleMACD.histogram.map((val, i) => { const x = scaleX(i), maxH = Math.max(...visibleMACD.histogram.map(Math.abs)) || 1, h = (Math.abs(val) / maxH) * (indicatorHeight / 2 - 10), y = val >= 0 ? indicatorHeight / 2 - h : indicatorHeight / 2; return <rect key={i} x={x - candleWidth / 2} y={y} width={candleWidth} height={h} fill={val >= 0 ? "#22c55e" : "#ef4444"} opacity="0.5" />; })}</>)}
                    {panelIndicator === "VOL" && visibleData.length > 0 && (<><text x={10} y={12} className="text-[9px] fill-slate-400">Volume</text>{visibleData.map((c, i) => { const x = scaleX(i), h = (c.volume / volumeMax) * (indicatorHeight - 10); return <rect key={i} x={x - candleWidth / 2} y={indicatorHeight - h - 5} width={candleWidth} height={h} fill={c.close >= c.open ? "#22c55e" : "#ef4444"} opacity="0.6" />; })}</>)}
                  </svg>
                </div>
              )}

              {/* Performance */}
              <div className="px-4 py-3 grid grid-cols-6 gap-2 border-t border-slate-800">
                {performancePeriods.map(stat => (<div key={stat.label} className="text-center"><div className="text-[9px] text-slate-500">{stat.label}</div><div className={`text-xs font-medium ${stat.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>{stat.value >= 0 ? "+" : ""}{stat.value.toFixed(2)}%</div></div>))}
              </div>
            </>
          )}

          {activeTab === "info" && (
            <div className="px-4 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">{lang === "tr" ? "Kripto Bilgileri" : "Crypto Information"}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">{lang === "tr" ? "Sembol" : "Symbol"}</span><span className="text-slate-200 font-medium">{cryptoId}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">{lang === "tr" ? "Ad" : "Name"}</span><span className="text-slate-200 font-medium">{cryptoInfo.name}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">{lang === "tr" ? "Tür" : "Type"}</span><span className="text-slate-200 font-medium">{cryptoId === "ETH" ? "Smart Contract Platform" : "Cryptocurrency"}</span></div>
                <div className="flex justify-between py-2 border-b border-slate-800"><span className="text-slate-400">{lang === "tr" ? "Konsensüs" : "Consensus"}</span><span className="text-slate-200 font-medium">{cryptoId === "ETH" ? "Proof of Stake" : "Proof of Work"}</span></div>
                <div className="flex justify-between py-2"><span className="text-slate-400">{lang === "tr" ? "Ağ" : "Network"}</span><span className="text-slate-200 font-medium">{cryptoId === "ETH" ? "Ethereum Mainnet" : "Bitcoin Mainnet"}</span></div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="px-4 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">{lang === "tr" ? "Piyasa Verileri" : "Market Data"}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"><div className="text-xs text-slate-400 mb-1">{lang === "tr" ? "Alış Fiyatı" : "Bid Price"}</div><div className="text-lg font-bold text-emerald-400">${formatPrice(bidPrice)}</div></div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"><div className="text-xs text-slate-400 mb-1">{lang === "tr" ? "Satış Fiyatı" : "Ask Price"}</div><div className="text-lg font-bold text-red-400">${formatPrice(askPrice)}</div></div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"><div className="text-xs text-slate-400 mb-1">Spread</div><div className="text-lg font-bold text-amber-400">{(spreadSettings.askAdjust - spreadSettings.bidAdjust).toFixed(2)}%</div></div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700"><div className="text-xs text-slate-400 mb-1">{lang === "tr" ? "24s Hacim" : "24h Volume"}</div><div className="text-lg font-bold text-blue-400">{formatVolume(volume24h)}</div></div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Buttons */}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/95">
          <button onClick={() => setTradeMode("buy")} className="flex-1 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors">
            {lang === "tr" ? "Al" : "Buy"}
          </button>
          <button onClick={() => setTradeMode("sell")} className="flex-1 px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors">
            {lang === "tr" ? "Sat" : "Sell"}
          </button>
        </div>
      </div>

      {/* Trade Modal */}
      {tradeMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setTradeMode(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">
                {tradeMode === "buy" ? (lang === "tr" ? "Al" : "Buy") : (lang === "tr" ? "Sat" : "Sell")} {cryptoId}
              </h3>
              <button onClick={() => setTradeMode(null)} className="p-2 hover:bg-slate-800 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">{lang === "tr" ? "Güncel Fiyat" : "Current Price"}</span>
                <span className="text-lg font-bold text-white">${formatPrice(currentPrice)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">{lang === "tr" ? "Miktar" : "Amount"} ({cryptoId})</label>
              <input
                type="number"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500"
              />
              {tradeAmount && parseFloat(tradeAmount) > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  ≈ ${formatPrice(parseFloat(tradeAmount) * currentPrice)} USD
                </p>
              )}
            </div>

            <div className="flex gap-2 mb-6">
              {[0.25, 0.5, 0.75, 1].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTradeAmount((1 * pct).toFixed(4))}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                >
                  {pct * 100}%
                </button>
              ))}
            </div>

            <button
              onClick={handleTrade}
              disabled={!tradeAmount || parseFloat(tradeAmount) <= 0}
              className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                tradeMode === "buy"
                  ? "bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50"
                  : "bg-red-500 hover:bg-red-400 disabled:bg-red-500/50"
              } text-white`}
            >
              {tradeMode === "buy" ? (lang === "tr" ? "Al" : "Buy") : (lang === "tr" ? "Sat" : "Sell")} {cryptoId}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}