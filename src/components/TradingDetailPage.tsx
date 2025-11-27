"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { MetalId } from "@/lib/metals";
import { AllocationModal } from "./AllocationModal";
import { getLeaseConfigBySymbol, getLocalizedName } from "@/lib/leaseRatesConfig";

interface TradingDetailPageProps {
  metalId: MetalId;
  symbol: string;
  name: string;
  currentPrice: number;
  bidPrice?: number;
  change24h: number;
  direction: "up" | "down" | "neutral";
  onClose: () => void;
  onBuy: () => void;
  onSell: () => void;
  lang?: "tr" | "en";
}

type TimeFrame = "15m" | "1h" | "4h" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL" | "SAR";
type PanelIndicator = "AVL" | "VOL" | "MACD" | "RSI";

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

function calculateMA(data: CandleData[], period: number = 20): number[] {
  const ma: number[] = [];
  if (data.length === 0) return ma;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(data[i].close);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
}

function calculateEMA(data: CandleData[], period: number = 20): number[] {
  const ema: number[] = [];
  if (data.length === 0) return ema;
  
  const k = 2 / (period + 1);
  let emaVal = data[0].close;
  
  for (let i = 0; i < data.length; i++) {
    emaVal = data[i].close * k + emaVal * (1 - k);
    ema.push(emaVal);
  }
  return ema;
}

function calculateBOLL(data: CandleData[], period: number = 20): { upper: number[]; middle: number[]; lower: number[] } {
  if (data.length === 0) return { upper: [], middle: [], lower: [] };
  
  const middle = calculateMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(data[i].close);
      lower.push(data[i].close);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      upper.push(mean + 2 * stdDev);
      lower.push(mean - 2 * stdDev);
    }
  }
  return { upper, middle, lower };
}

function calculateRSI(data: CandleData[], period: number = 14): number[] {
  const rsi: number[] = [];
  if (data.length < period + 1) return rsi;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(50);
      continue;
    }

    let gains = 0;
    let losses = 0;

    for (let j = i - period; j < i; j++) {
      const change = data[j + 1].close - data[j].close;
      if (change > 0) gains += change;
      else losses -= change;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 1);
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}

function calculateMACD(data: CandleData[]): { macd: number[]; signal: number[]; histogram: number[] } {
  if (data.length === 0) return { macd: [], signal: [], histogram: [] };
  
  const macd: number[] = [];
  const signal: number[] = [];
  const histogram: number[] = [];

  let ema12Val = data[0].close;
  let ema26Val = data[0].close;

  for (let i = 0; i < data.length; i++) {
    ema12Val = (data[i].close * 2) / 13 + ema12Val * 11 / 13;
    ema26Val = (data[i].close * 2) / 27 + ema26Val * 25 / 27;
    macd.push(ema12Val - ema26Val);
  }

  let signalVal = macd[0];
  for (let i = 0; i < macd.length; i++) {
    signalVal = (macd[i] * 2) / 10 + signalVal * 8 / 10;
    signal.push(signalVal);
    histogram.push(macd[i] - signalVal);
  }

  return { macd, signal, histogram };
}

export default function TradingDetailPage({
  metalId,
  symbol,
  name,
  currentPrice,
  bidPrice,
  change24h,
  direction,
  onClose,
  onBuy,
  onSell,
  lang = "en",
}: TradingDetailPageProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("4h");
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data" | "lease">("price");
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>(["MA"]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>("RSI");

  // Store initial values to prevent re-generation on every price update
  const initialPriceRef = useRef(currentPrice);
  const initialChange24hRef = useRef(change24h);
  const initialDirectionRef = useRef(direction);

  const isPositive = initialDirectionRef.current === "up";

  // Stabilize candle data generation with deterministic seed
  const generateCandleData = useCallback((basePrice: number, timeFrame: TimeFrame, seed: string): CandleData[] => {
    const { candleCount, intervalMs } = TIMEFRAME_SETTINGS[timeFrame];
    const data: CandleData[] = [];
    
    // Create deterministic seed from symbol and timeframe
    const numericSeed = (seed + timeFrame).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    let price = basePrice * 0.97;
    
    for (let i = 0; i < candleCount; i++) {
      // Use sine wave for deterministic pseudo-random values
      const pseudoRandom1 = Math.sin(numericSeed + i * 0.7) * 10000;
      const pseudoRandom2 = Math.sin(numericSeed + i * 1.3) * 10000;
      const pseudoRandom3 = Math.sin(numericSeed + i * 0.5) * 10000;
      
      const random1 = pseudoRandom1 - Math.floor(pseudoRandom1);
      const random2 = pseudoRandom2 - Math.floor(pseudoRandom2);
      const random3 = pseudoRandom3 - Math.floor(pseudoRandom3);
      
      const volatility = 0.012;
      const trend = (i / candleCount) * 0.03;
      const change = (random1 - 0.45) * volatility * price + trend * price / candleCount;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) * (1 + random2 * 0.006);
      const low = Math.min(open, close) * (1 - random3 * 0.006);
      const volume = (random1 * 600000) + 200000;
      
      data.push({ 
        time: Date.now() - (candleCount - i) * intervalMs, 
        open, 
        high, 
        low, 
        close, 
        volume 
      });
      price = close;
    }
    
    if (data.length > 0) {
      data[data.length - 1].close = basePrice;
    }
    
    return data;
  }, []);

  // Memoize candle data - only regenerate when timeframe or symbol changes
  const candleData = useMemo(() => {
    return generateCandleData(initialPriceRef.current, timeFrame, symbol);
  }, [timeFrame, symbol, generateCandleData]);

  // Stabilize performance periods - calculate based on actual change24h
  const performancePeriods = useMemo(() => {
    // Use deterministic multipliers based on symbol
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseChange = initialChange24hRef.current;
    
    return [
      { label: lang === "tr" ? "Bugün" : "Today", days: 1, value: baseChange },
      { label: lang === "tr" ? "7 Gün" : "7 Days", days: 7, value: baseChange * (2.1 + Math.sin(seed) * 0.3) },
      { label: lang === "tr" ? "30 Gün" : "30 Days", days: 30, value: baseChange * (-1.8 + Math.sin(seed + 1) * 0.5) },
      { label: lang === "tr" ? "90 Gün" : "90 Days", days: 90, value: baseChange * (3.2 + Math.sin(seed + 2) * 0.8) },
      { label: lang === "tr" ? "180 Gün" : "180 Days", days: 180, value: baseChange * (5.8 + Math.sin(seed + 3) * 1.2) },
      { label: lang === "tr" ? "1 Yıl" : "1 Year", days: 365, value: baseChange * (12.5 + Math.sin(seed + 4) * 2.5) },
    ];
  }, [change24h, symbol, lang]);

  useEffect(() => {
    setLivePrice(currentPrice);
  }, [currentPrice]);

  // Keep livePrice in sync with currentPrice (no animation)
  useEffect(() => {
    setLivePrice(currentPrice);
  }, [currentPrice]);

  const high24h = candleData.length > 0 ? Math.max(...candleData.slice(-24).map(c => c.high)) : currentPrice * 1.02;
  const low24h = candleData.length > 0 ? Math.min(...candleData.slice(-24).map(c => c.low)) : currentPrice * 0.98;
  const volume24h = candleData.length > 0 ? candleData.slice(-24).reduce((sum, c) => sum + c.volume, 0) : 0;
  const lastCandle = candleData[candleData.length - 1];

  const visibleCandleCount = Math.floor(60 / zoom);
  const visibleData = candleData.slice(-visibleCandleCount);

  const chartWidth = 700;
  const mainChartHeight = 200;
  const indicatorHeight = 60;
  const padding = { top: 15, right: 55, bottom: 20, left: 10 };

  const priceMin = visibleData.length > 0 ? Math.min(...visibleData.map(c => c.low)) * 0.998 : currentPrice * 0.95;
  const priceMax = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.high)) * 1.002 : currentPrice * 1.05;
  const volumeMax = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.volume)) : 1;

  const scaleX = (i: number) => padding.left + (i / (visibleData.length - 1 || 1)) * (chartWidth - padding.left - padding.right);
  const scaleY = (price: number) => padding.top + (1 - (price - priceMin) / (priceMax - priceMin || 1)) * (mainChartHeight - padding.top - padding.bottom);

  const candleWidth = Math.max(3, Math.min(12, (chartWidth - padding.left - padding.right) / visibleData.length * 0.7));

  const timeFrames: TimeFrame[] = ["15m", "1h", "4h", "1D", "1W"];
  const overlayIndicatorsList: OverlayIndicator[] = ["MA", "EMA", "BOLL", "SAR"];
  const panelIndicatorsList: PanelIndicator[] = ["AVL", "VOL", "MACD", "RSI"];

  const toggleOverlayIndicator = (ind: OverlayIndicator) => {
    setOverlayIndicators(prev => 
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const maData = calculateMA(candleData, 20);
  const emaData = calculateEMA(candleData, 20);
  const bollData = calculateBOLL(candleData, 20);
  const rsiData = calculateRSI(candleData);
  const macdData = calculateMACD(candleData);

  const visibleMA = maData.slice(-visibleCandleCount);
  const visibleEMA = emaData.slice(-visibleCandleCount);
  const visibleBOLL = {
    upper: bollData.upper.slice(-visibleCandleCount),
    middle: bollData.middle.slice(-visibleCandleCount),
    lower: bollData.lower.slice(-visibleCandleCount),
  };
  const visibleRSI = rsiData.slice(-visibleCandleCount);
  const visibleMACD = {
    macd: macdData.macd.slice(-visibleCandleCount),
    signal: macdData.signal.slice(-visibleCandleCount),
    histogram: macdData.histogram.slice(-visibleCandleCount),
  };

  const leaseConfig = getLeaseConfigBySymbol(symbol);
  const leaseOffer = leaseConfig ? {
    ...leaseConfig,
    name: getLocalizedName(leaseConfig, lang),
  } : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white">{symbol}/USDT</span>
              <span className={`text-xs px-2 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {isPositive ? "↑" : "↓"} {Math.abs(initialChange24hRef.current).toFixed(2)}%
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-6 px-4 text-sm border-b border-slate-800">
            {[
              { id: "price", label: "Price" },
              { id: "info", label: lang === "tr" ? "Bilgiler" : "Info" },
              { id: "data", label: lang === "tr" ? "İşlem Verileri" : "Trading Data" },
              { id: "lease", label: lang === "tr" ? "Tahsis Et" : "Allocate", highlight: true },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "lease") {
                    setShowLeaseModal(true);
                  } else {
                    setActiveTab(tab.id as any);
                  }
                }}
                className={`py-2.5 border-b-2 transition-colors ${
                  activeTab === tab.id ? "border-yellow-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
                } ${tab.highlight ? "text-amber-400 hover:text-amber-300" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
            {activeTab === "price" && (
              <>
                <div className="px-4 py-3 border-b border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white font-mono">${livePrice.toFixed(2)}</span>
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        ₺{(livePrice * 34.5).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="text-right text-xs space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">24h High</span>
                        <span className="text-emerald-400 font-mono">${high24h.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">24h Low</span>
                        <span className="text-red-400 font-mono">${low24h.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">24h Vol</span>
                        <span className="text-white font-mono">{(volume24h / 1000000).toFixed(2)}M</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50">
                  <div className="flex items-center gap-1">
                    {timeFrames.map(tf => (
                      <button key={tf} onClick={() => setTimeFrame(tf)} className={`px-3 py-1 text-xs rounded transition-colors ${timeFrame === tf ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                        {tf}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setZoom(Math.max(0.5, zoom - 0.25))} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <span className="text-xs text-slate-500 w-8 text-center">{zoom.toFixed(1)}x</span>
                    <button onClick={() => setZoom(Math.min(3, zoom + 0.25))} className="p-1 hover:bg-slate-800 rounded text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="px-2 py-2">
                  <svg width="100%" viewBox={`0 0 ${chartWidth} ${mainChartHeight}`} className="overflow-visible" onMouseLeave={() => setHoveredCandle(null)}>
                    {[0.2, 0.4, 0.6, 0.8].map((ratio, i) => {
                      const y = padding.top + ratio * (mainChartHeight - padding.top - padding.bottom);
                      const price = priceMax - ratio * (priceMax - priceMin);
                      return (
                        <g key={i}>
                          <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#1e293b" strokeWidth="1" />
                          <text x={chartWidth - padding.right + 5} y={y + 4} className="text-[10px] fill-slate-600">{price.toFixed(2)}</text>
                        </g>
                      );
                    })}

                    {overlayIndicators.includes("MA") && visibleMA.length > 0 && <polyline points={visibleMA.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" />}
                    {overlayIndicators.includes("EMA") && visibleEMA.length > 0 && <polyline points={visibleEMA.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="2" />}
                    {overlayIndicators.includes("BOLL") && visibleBOLL.upper.length > 0 && (
                      <>
                        <polyline points={visibleBOLL.upper.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.6" />
                        <polyline points={visibleBOLL.middle.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
                        <polyline points={visibleBOLL.lower.map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ')} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.6" />
                      </>
                    )}

                    {visibleData.map((candle, i) => {
                      const x = scaleX(i);
                      const isGreen = candle.close >= candle.open;
                      const color = isGreen ? "#22c55e" : "#ef4444";
                      const bodyTop = scaleY(Math.max(candle.open, candle.close));
                      const bodyBottom = scaleY(Math.min(candle.open, candle.close));
                      const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
                      return (
                        <g key={i} onMouseEnter={() => setHoveredCandle(i)} className="cursor-crosshair">
                          <line x1={x} y1={scaleY(candle.high)} x2={x} y2={scaleY(candle.low)} stroke={color} strokeWidth="1.5" />
                          <rect x={x - candleWidth / 2} y={bodyTop} width={candleWidth} height={bodyHeight} fill={color} />
                          {hoveredCandle === i && <line x1={x} y1={padding.top} x2={x} y2={mainChartHeight - padding.bottom} stroke="#475569" strokeDasharray="2,2" />}
                        </g>
                      );
                    })}

                    {lastCandle && (
                      <g>
                        <line x1={padding.left} y1={scaleY(lastCandle.close)} x2={chartWidth - padding.right} y2={scaleY(lastCandle.close)} stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" />
                        <rect x={chartWidth - padding.right} y={scaleY(lastCandle.close) - 10} width="50" height="20" fill={lastCandle.close >= lastCandle.open ? "#22c55e" : "#ef4444"} rx="3" />
                        <text x={chartWidth - padding.right + 5} y={scaleY(lastCandle.close) + 4} className="text-[10px] fill-white font-mono">{lastCandle.close.toFixed(2)}</text>
                      </g>
                    )}

                    {hoveredCandle !== null && visibleData[hoveredCandle] && (
                      <g>
                        <rect x={Math.min(scaleX(hoveredCandle) - 50, chartWidth - 110)} y={8} width="100" height="58" fill="#1e293b" stroke="#334155" rx="4" />
                        <text x={Math.min(scaleX(hoveredCandle) - 45, chartWidth - 105)} y={22} className="text-[9px] fill-slate-400">
                          O: <tspan className="fill-white font-mono">{visibleData[hoveredCandle].open.toFixed(2)}</tspan>
                        </text>
                        <text x={Math.min(scaleX(hoveredCandle) - 45, chartWidth - 105)} y={34} className="text-[9px] fill-slate-400">
                          H: <tspan className="fill-emerald-400 font-mono">{visibleData[hoveredCandle].high.toFixed(2)}</tspan>
                        </text>
                        <text x={Math.min(scaleX(hoveredCandle) - 45, chartWidth - 105)} y={46} className="text-[9px] fill-slate-400">
                          L: <tspan className="fill-red-400 font-mono">{visibleData[hoveredCandle].low.toFixed(2)}</tspan>
                        </text>
                        <text x={Math.min(scaleX(hoveredCandle) - 45, chartWidth - 105)} y={58} className="text-[9px] fill-slate-400">
                          C: <tspan className="fill-white font-mono">{visibleData[hoveredCandle].close.toFixed(2)}</tspan>
                        </text>
                      </g>
                    )}
                  </svg>
                </div>

                <div className="px-2 border-t border-slate-800/30">
                  <div className="py-1 space-y-1">
                    <div className="flex gap-1 overflow-x-auto items-center">
                      <span className="text-[9px] text-slate-500 px-1 py-1 whitespace-nowrap">Overlay:</span>
                      {overlayIndicatorsList.map(ind => (
                        <button key={ind} onClick={() => toggleOverlayIndicator(ind)} className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${overlayIndicators.includes(ind) ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-300"}`}>
                          {ind}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 overflow-x-auto items-center">
                      <span className="text-[9px] text-slate-500 px-1 py-1 whitespace-nowrap">Panel:</span>
                      {panelIndicatorsList.map(ind => (
                        <button key={ind} onClick={() => setPanelIndicator(panelIndicator === ind ? null : ind)} className={`px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap ${panelIndicator === ind ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-300"}`}>
                          {ind}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {panelIndicator && (
                  <div className="px-2 border-t border-slate-800/30">
                    <svg width="100%" viewBox={`0 0 ${chartWidth} ${indicatorHeight}`}>
                      {panelIndicator === "RSI" && visibleRSI.length > 0 && (
                        <>
                          <text x={10} y={12} className="text-[9px] fill-slate-400">RSI (14)</text>
                          <line x1={padding.left} y1={indicatorHeight * 0.3} x2={chartWidth - padding.right} y2={indicatorHeight * 0.3} stroke="#dc2626" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                          <line x1={padding.left} y1={indicatorHeight * 0.7} x2={chartWidth - padding.right} y2={indicatorHeight * 0.7} stroke="#22c55e" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                          <polyline points={visibleRSI.map((val, i) => `${scaleX(i)},${indicatorHeight - (val / 100) * (indicatorHeight - 10) - 5}`).join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2" />
                        </>
                      )}
                      {panelIndicator === "MACD" && visibleMACD.histogram.length > 0 && (
                        <>
                          <text x={10} y={12} className="text-[9px] fill-slate-400">MACD (12,26,9)</text>
                          <line x1={padding.left} y1={indicatorHeight / 2} x2={chartWidth - padding.right} y2={indicatorHeight / 2} stroke="#334155" strokeWidth="1" />
                          {visibleMACD.histogram.map((val, i) => {
                            const x = scaleX(i);
                            const maxHist = Math.max(...visibleMACD.histogram.map(Math.abs));
                            const h = (Math.abs(val) / maxHist) * (indicatorHeight / 2 - 10);
                            const y = val >= 0 ? indicatorHeight / 2 - h : indicatorHeight / 2;
                            return <rect key={i} x={x - candleWidth / 2} y={y} width={candleWidth} height={h} fill={val >= 0 ? "#22c55e" : "#ef4444"} opacity="0.5" />;
                          })}
                          <polyline points={visibleMACD.macd.map((val, i) => {
                            const maxVal = Math.max(...visibleMACD.macd.map(Math.abs));
                            const y = indicatorHeight / 2 - (val / maxVal) * (indicatorHeight / 2 - 10);
                            return `${scaleX(i)},${y}`;
                          }).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
                          <polyline points={visibleMACD.signal.map((val, i) => {
                            const maxVal = Math.max(...visibleMACD.macd.map(Math.abs));
                            const y = indicatorHeight / 2 - (val / maxVal) * (indicatorHeight / 2 - 10);
                            return `${scaleX(i)},${y}`;
                          }).join(' ')} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                        </>
                      )}
                      {panelIndicator === "VOL" && visibleData.length > 0 && (
                        <>
                          <text x={10} y={12} className="text-[9px] fill-slate-400">Volume</text>
                          {visibleData.map((candle, i) => {
                            const x = scaleX(i);
                            const isGreen = candle.close >= candle.open;
                            const height = (candle.volume / volumeMax) * (indicatorHeight - 10);
                            return <rect key={i} x={x - candleWidth / 2} y={indicatorHeight - height - 5} width={candleWidth} height={height} fill={isGreen ? "#22c55e" : "#ef4444"} opacity="0.6" />;
                          })}
                        </>
                      )}
                      {panelIndicator === "AVL" && visibleData.length > 0 && (
                        <>
                          <text x={10} y={12} className="text-[9px] fill-slate-400">AVL</text>
                          <line x1={padding.left} y1={indicatorHeight / 2} x2={chartWidth - padding.right} y2={indicatorHeight / 2} stroke="#334155" strokeWidth="1" />
                          <polyline points={visibleData.map((candle, i) => `${scaleX(i)},${indicatorHeight / 2 + Math.sin(i * 0.3) * 15}`).join(' ')} fill="none" stroke="#06b6d4" strokeWidth="2" />
                        </>
                      )}
                    </svg>
                  </div>
                )}

                <div className="px-4 py-3 grid grid-cols-6 gap-2 border-t border-slate-800">
                  {performancePeriods.map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-[9px] text-slate-500">{stat.label}</div>
                      <div className={`text-xs font-medium ${stat.value >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {stat.value >= 0 ? "+" : ""}{stat.value.toFixed(2)}%
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "info" && (
              <div className="px-4 py-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">{lang === "tr" ? "Metal Bilgileri" : "Metal Information"}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Sembol" : "Symbol"}</span>
                      <span className="text-slate-200 font-medium">{symbol}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Ad" : "Name"}</span>
                      <span className="text-slate-200 font-medium">{name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Tür" : "Type"}</span>
                      <span className="text-slate-200 font-medium">{lang === "tr" ? "Değerli Metal" : "Precious Metal"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Saflık" : "Purity"}</span>
                      <span className="text-slate-200 font-medium">99.99%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Zincir" : "Chain"}</span>
                      <span className="text-slate-200 font-medium">Base Sepolia</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">{lang === "tr" ? "Saklama" : "Custodian"}</span>
                      <span className="text-slate-200 font-medium text-xs">Swiss, Dubai, Istanbul Vaults</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">{lang === "tr" ? "Token Detayları" : "Token Details"}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Standart" : "Standard"}</span>
                      <span className="text-slate-200 font-medium">ERC-20</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Dolaşımdaki Arz" : "Circulating Supply"}</span>
                      <span className="text-slate-200 font-medium">{(volume24h / currentPrice).toFixed(0)} {symbol}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">{lang === "tr" ? "Denetlenmiş" : "Audited"}</span>
                      <span className="text-emerald-400 font-medium">✓ {lang === "tr" ? "Evet" : "Yes"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "data" && (
              <div className="px-4 py-4 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">{lang === "tr" ? "Piyasa Verileri" : "Market Data"}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">{lang === "tr" ? "Alış Fiyatı" : "Bid Price"}</div>
                      <div className="text-lg font-bold text-emerald-400">${(livePrice * 0.9962).toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">{lang === "tr" ? "Satış Fiyatı" : "Ask Price"}</div>
                      <div className="text-lg font-bold text-red-400">${livePrice.toFixed(2)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">Spread</div>
                      <div className="text-lg font-bold text-amber-400">0.38%</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="text-xs text-slate-400 mb-1">{lang === "tr" ? "24s Hacim" : "24h Volume"}</div>
                      <div className="text-lg font-bold text-blue-400">${(volume24h / 1000).toFixed(0)}K</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">{lang === "tr" ? "İşlem Bilgileri" : "Trading Information"}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Min. İşlem" : "Min. Trade"}</span>
                      <span className="text-slate-200 font-medium">1g</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "Maks. İşlem" : "Max. Trade"}</span>
                      <span className="text-slate-200 font-medium">{lang === "tr" ? "Sınırsız" : "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-800">
                      <span className="text-slate-400">{lang === "tr" ? "İşlem Ücreti" : "Trading Fee"}</span>
                      <span className="text-slate-200 font-medium">0.1%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400">{lang === "tr" ? "Teslimat Süresi" : "Settlement Time"}</span>
                      <span className="text-slate-200 font-medium">{lang === "tr" ? "Anlık" : "Instant"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/95">
            <button onClick={onBuy} className="flex-1 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors">{lang === "tr" ? "Al" : "Buy"}</button>
            <button onClick={onSell} className="flex-1 px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors">{lang === "tr" ? "Sat" : "Sell"}</button>
            <button onClick={() => setShowLeaseModal(true)} className="flex-1 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors">{lang === "tr" ? "Tahsis Et" : "Allocate"}</button>
          </div>
        </div>
      </div>

      {showLeaseModal && leaseOffer && <AllocationModal isOpen={showLeaseModal} onClose={() => setShowLeaseModal(false)} offer={leaseOffer} lang={lang} />}
    </>
  );
}