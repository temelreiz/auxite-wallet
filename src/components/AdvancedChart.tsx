"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  Time,
  LogicalRange,
} from "lightweight-charts";

interface ChartData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface LineData {
  time: Time;
  value: number;
}

interface HistogramData {
  time: Time;
  value: number;
  color?: string;
}

type TimeframeKey = "15m" | "1H" | "4H" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL" | "SAR";
type PanelIndicator = "VOL" | "RSI" | "MACD" | "AVL";

interface Props {
  data: ChartData[];
  symbol: string;
  currentPrice?: number;
  priceChange?: number;
  lang?: string;
  height?: number;
  timeframe?: TimeframeKey;
  onTimeframeChange?: (tf: TimeframeKey) => void;
  overlayIndicators?: OverlayIndicator[];
  onOverlayChange?: (indicators: OverlayIndicator[]) => void;
  panelIndicator?: PanelIndicator | null;
  onPanelChange?: (indicator: PanelIndicator | null) => void;
  showControls?: boolean;
  showHeader?: boolean;
  embedded?: boolean;
  metalIcon?: string; // Metal icon path
}

const translations: Record<string, { overlay: string; panel: string; volume: string; high: string; low: string; open: string; close: string }> = {
  tr: { overlay: "Overlay", panel: "Panel", volume: "Hacim", high: "Yüksek", low: "Düşük", open: "Açılış", close: "Kapanış" },
  en: { overlay: "Overlay", panel: "Panel", volume: "Volume", high: "High", low: "Low", open: "Open", close: "Close" },
  de: { overlay: "Overlay", panel: "Panel", volume: "Volumen", high: "Hoch", low: "Tief", open: "Eröffnung", close: "Schluss" },
  fr: { overlay: "Superposition", panel: "Panneau", volume: "Volume", high: "Haut", low: "Bas", open: "Ouverture", close: "Clôture" },
  ar: { overlay: "تراكب", panel: "لوحة", volume: "الحجم", high: "أعلى", low: "أدنى", open: "افتتاح", close: "إغلاق" },
  ru: { overlay: "Наложение", panel: "Панель", volume: "Объём", high: "Макс", low: "Мин", open: "Открытие", close: "Закрытие" },
};

// Metal icon mapping
const METAL_ICONS: Record<string, string> = {
  AUXG: "/images/metals/gold.svg",
  AUXS: "/images/metals/silver.svg",
  AUXPT: "/images/metals/platinum.svg",
  AUXPD: "/images/metals/palladium.svg",
  Gold: "/images/metals/gold.svg",
  Silver: "/images/metals/silver.svg",
  Platinum: "/images/metals/platinum.svg",
  Palladium: "/images/metals/palladium.svg",
};

// Indicator calculations
function calculateMA(data: ChartData[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateEMA(data: ChartData[], period: number): LineData[] {
  const result: LineData[] = [];
  if (data.length === 0) return result;
  const k = 2 / (period + 1);
  let emaVal = data[0].close;
  for (let i = 0; i < data.length; i++) {
    emaVal = data[i].close * k + emaVal * (1 - k);
    result.push({ time: data[i].time, value: emaVal });
  }
  return result;
}

function calculateBollinger(data: ChartData[], period: number = 20): { upper: LineData[]; middle: LineData[]; lower: LineData[] } {
  const middle = calculateMA(data, period);
  const upper: LineData[] = [], lower: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = middle[i - period + 1]?.value || data[i].close;
    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    upper.push({ time: data[i].time, value: mean + 2 * stdDev });
    lower.push({ time: data[i].time, value: mean - 2 * stdDev });
  }
  return { upper, middle, lower };
}

function calculateSAR(data: ChartData[], af: number = 0.02, maxAf: number = 0.2): LineData[] {
  const result: LineData[] = [];
  if (data.length < 2) return result;
  let isUptrend = data[1].close > data[0].close;
  let sar = isUptrend ? data[0].low : data[0].high;
  let ep = isUptrend ? data[0].high : data[0].low;
  let currentAf = af;
  for (let i = 0; i < data.length; i++) {
    result.push({ time: data[i].time, value: sar });
    if (i === 0) continue;
    const prevSar = sar;
    sar = prevSar + currentAf * (ep - prevSar);
    if (isUptrend) {
      if (data[i].low < sar) { isUptrend = false; sar = ep; ep = data[i].low; currentAf = af; }
      else if (data[i].high > ep) { ep = data[i].high; currentAf = Math.min(currentAf + af, maxAf); }
    } else {
      if (data[i].high > sar) { isUptrend = true; sar = ep; ep = data[i].high; currentAf = af; }
      else if (data[i].low < ep) { ep = data[i].low; currentAf = Math.min(currentAf + af, maxAf); }
    }
  }
  return result;
}

function calculateRSI(data: ChartData[], period: number = 14): LineData[] {
  const result: LineData[] = [];
  if (data.length < period + 1) return result;
  for (let i = 0; i < data.length; i++) {
    if (i < period) { result.push({ time: data[i].time, value: 50 }); continue; }
    let gains = 0, losses = 0;
    for (let j = i - period; j < i; j++) {
      const change = data[j + 1].close - data[j].close;
      if (change > 0) gains += change; else losses -= change;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 0.001);
    result.push({ time: data[i].time, value: 100 - (100 / (1 + rs)) });
  }
  return result;
}

function calculateMACD(data: ChartData[]): { macd: LineData[]; signal: LineData[]; histogram: HistogramData[] } {
  const macd: LineData[] = [], signal: LineData[] = [], histogram: HistogramData[] = [];
  if (data.length === 0) return { macd, signal, histogram };
  let ema12 = data[0].close, ema26 = data[0].close;
  const macdValues: number[] = [];
  for (let i = 0; i < data.length; i++) {
    ema12 = (data[i].close * 2) / 13 + ema12 * 11 / 13;
    ema26 = (data[i].close * 2) / 27 + ema26 * 25 / 27;
    const macdVal = ema12 - ema26;
    macdValues.push(macdVal);
    macd.push({ time: data[i].time, value: macdVal });
  }
  let signalEma = macdValues[0] || 0;
  for (let i = 0; i < macdValues.length; i++) {
    signalEma = (macdValues[i] * 2) / 10 + signalEma * 8 / 10;
    signal.push({ time: data[i].time, value: signalEma });
    const histVal = macdValues[i] - signalEma;
    histogram.push({ time: data[i].time, value: histVal, color: histVal >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)" });
  }
  return { macd, signal, histogram };
}

export default function AdvancedChart({
  data, symbol, currentPrice, priceChange, lang = "en", height = 300,
  timeframe: propTimeframe, onTimeframeChange,
  overlayIndicators: propOverlay, onOverlayChange,
  panelIndicator: propPanel, onPanelChange,
  showControls = true, showHeader = true, embedded = false,
  metalIcon,
}: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const panelChartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const panelSeriesRef = useRef<Map<string, ISeriesApi<"Line" | "Histogram">>>(new Map());
  
  const isFirstMountRef = useRef(true);
  const savedVisibleRangeRef = useRef<LogicalRange | null>(null);

  const [isDark, setIsDark] = useState(true);

  // Get icon for the symbol
  const iconSrc = metalIcon || METAL_ICONS[symbol] || METAL_ICONS[symbol.replace('AUX', '')] || null;

  useEffect(() => {
    const checkTheme = () => {
      if (typeof window === 'undefined') return true;
      const html = document.documentElement;
      const hasDarkClass = html.classList.contains('dark');
      const hasLightClass = html.classList.contains('light');
      
      if (hasDarkClass) return setIsDark(true);
      if (hasLightClass) return setIsDark(false);
      
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') return setIsDark(true);
      if (stored === 'light') return setIsDark(false);
      
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    window.addEventListener('storage', checkTheme);
    window.addEventListener('themeChange', checkTheme);
    
    const interval = setInterval(checkTheme, 300);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', checkTheme);
      window.removeEventListener('themeChange', checkTheme);
      clearInterval(interval);
    };
  }, []);

  const [timeframe, setLocalTimeframe] = useState<TimeframeKey>(propTimeframe || "4H");
  const [overlayIndicators, setLocalOverlay] = useState<OverlayIndicator[]>(propOverlay || []);
  const [panelIndicator, setLocalPanel] = useState<PanelIndicator | null>(propPanel || null);
  const [crosshairData, setCrosshairData] = useState<ChartData | null>(null);

  useEffect(() => { if (propTimeframe) setLocalTimeframe(propTimeframe); }, [propTimeframe]);
  useEffect(() => { if (propOverlay) setLocalOverlay(propOverlay); }, [propOverlay]);
  useEffect(() => { if (propPanel !== undefined) setLocalPanel(propPanel); }, [propPanel]);

  const setTimeframe = useCallback((tf: TimeframeKey) => { 
    isFirstMountRef.current = true;
    savedVisibleRangeRef.current = null;
    setLocalTimeframe(tf); 
    onTimeframeChange?.(tf); 
  }, [onTimeframeChange]);
  
  const toggleOverlay = useCallback((ind: OverlayIndicator) => {
    const newIndicators = overlayIndicators.includes(ind) ? overlayIndicators.filter(i => i !== ind) : [...overlayIndicators, ind];
    setLocalOverlay(newIndicators); onOverlayChange?.(newIndicators);
  }, [overlayIndicators, onOverlayChange]);
  
  const togglePanel = useCallback((ind: PanelIndicator) => {
    const newIndicator = panelIndicator === ind ? null : ind;
    setLocalPanel(newIndicator); onPanelChange?.(newIndicator);
  }, [panelIndicator, onPanelChange]);

  const labels = translations[lang] || translations.en;

  const colors = useMemo(() => ({
    background: isDark ? '#0f172a' : '#ffffff',
    textColor: isDark ? '#94a3b8' : '#64748b',
    borderColor: isDark ? '#1e293b' : '#e2e8f0',
    gridColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(226, 232, 240, 0.5)',
    upColor: '#22c55e',
    downColor: '#ef4444',
    volumeUp: 'rgba(34, 197, 94, 0.3)',
    volumeDown: 'rgba(239, 68, 68, 0.3)',
  }), [isDark]);

  const displayData = useMemo(() => {
    if (data && data.length > 0) return data;
    const now = Math.floor(Date.now() / 1000);
    const sample: ChartData[] = [];
    let price = currentPrice || 100;
    for (let i = 100; i >= 0; i--) {
      const time = (now - i * 3600) as Time;
      const change = (Math.random() - 0.5) * price * 0.02;
      const open = price, close = price + change;
      const high = Math.max(open, close) + Math.random() * price * 0.01;
      const low = Math.min(open, close) - Math.random() * price * 0.01;
      sample.push({ time, open, high, low, close, volume: Math.random() * 1000000 });
      price = close;
    }
    return sample;
  }, [data, currentPrice]);

  const formatPrice = (price: number) => price >= 1 ? price.toFixed(2) : price.toFixed(6);

  const panelHeight = 80;
  const mainChartHeight = panelIndicator ? height - panelHeight - 30 : height;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      try {
        const currentRange = chartRef.current.timeScale().getVisibleLogicalRange();
        if (currentRange) {
          savedVisibleRangeRef.current = currentRange;
        }
      } catch (e) {}
      
      chartRef.current.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current.clear();
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: mainChartHeight,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: colors.borderColor },
      timeScale: { borderColor: colors.borderColor, timeVisible: true, secondsVisible: false },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upColor, downColor: colors.downColor,
      borderUpColor: colors.upColor, borderDownColor: colors.downColor,
      wickUpColor: colors.upColor, wickDownColor: colors.downColor,
    });
    candleSeries.setData(displayData);
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeries.setData(displayData.map(d => ({
      time: d.time,
      value: d.volume || 0,
      color: d.close >= d.open ? colors.volumeUp : colors.volumeDown,
    })));
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData.size > 0) {
        const candleData = param.seriesData.get(candleSeries);
        if (candleData && 'open' in candleData) setCrosshairData(candleData as ChartData);
      } else setCrosshairData(null);
    });

    if (isFirstMountRef.current) {
      chart.timeScale().fitContent();
      isFirstMountRef.current = false;
    } else if (savedVisibleRangeRef.current) {
      setTimeout(() => {
        try {
          if (chartRef.current && savedVisibleRangeRef.current) {
            chartRef.current.timeScale().setVisibleLogicalRange(savedVisibleRangeRef.current);
          }
        } catch (e) {}
      }, 10);
    }

    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [displayData, height, colors, isDark, panelIndicator]);

  useEffect(() => {
    if (!chartRef.current || displayData.length === 0) return;
    const chart = chartRef.current;

    overlaySeriesRef.current.forEach((series) => {
      try { chart.removeSeries(series); } catch (e) {}
    });
    overlaySeriesRef.current.clear();

    if (overlayIndicators.includes("MA")) {
      const ma7Series = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1 });
      ma7Series.setData(calculateMA(displayData, 7));
      overlaySeriesRef.current.set("ma7", ma7Series);
      const ma25Series = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1 });
      ma25Series.setData(calculateMA(displayData, 25));
      overlaySeriesRef.current.set("ma25", ma25Series);
    }
    if (overlayIndicators.includes("EMA")) {
      const ema12Series = chart.addSeries(LineSeries, { color: "#06b6d4", lineWidth: 1 });
      ema12Series.setData(calculateEMA(displayData, 12));
      overlaySeriesRef.current.set("ema12", ema12Series);
      const ema26Series = chart.addSeries(LineSeries, { color: "#a855f7", lineWidth: 1 });
      ema26Series.setData(calculateEMA(displayData, 26));
      overlaySeriesRef.current.set("ema26", ema26Series);
    }
    if (overlayIndicators.includes("BOLL")) {
      const boll = calculateBollinger(displayData);
      const upperSeries = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1 });
      upperSeries.setData(boll.upper);
      overlaySeriesRef.current.set("bollUpper", upperSeries);
      const middleSeries = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1, lineStyle: 2 });
      middleSeries.setData(boll.middle);
      overlaySeriesRef.current.set("bollMiddle", middleSeries);
      const lowerSeries = chart.addSeries(LineSeries, { color: "#f97316", lineWidth: 1 });
      lowerSeries.setData(boll.lower);
      overlaySeriesRef.current.set("bollLower", lowerSeries);
    }
    if (overlayIndicators.includes("SAR")) {
      const sarSeries = chart.addSeries(LineSeries, { color: "#ec4899", lineWidth: 1, lineStyle: 1 });
      sarSeries.setData(calculateSAR(displayData));
      overlaySeriesRef.current.set("sar", sarSeries);
    }
  }, [displayData, overlayIndicators, isDark]);

  useEffect(() => {
    if (!panelContainerRef.current || !panelIndicator) {
      if (panelChartRef.current) {
        panelChartRef.current.remove();
        panelChartRef.current = null;
        panelSeriesRef.current.clear();
      }
      return;
    }

    if (panelChartRef.current) {
      panelChartRef.current.remove();
      panelChartRef.current = null;
      panelSeriesRef.current.clear();
    }

    const panelChart = createChart(panelContainerRef.current, {
      width: panelContainerRef.current.clientWidth,
      height: panelHeight,
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.textColor,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: colors.gridColor },
        horzLines: { color: colors.gridColor },
      },
      rightPriceScale: { borderColor: colors.borderColor },
      timeScale: { borderColor: colors.borderColor, visible: false },
      handleScroll: false,
      handleScale: false,
    });
    panelChartRef.current = panelChart;

    if (panelIndicator === "RSI" && displayData.length > 0) {
      const rsiSeries = panelChart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 2 });
      rsiSeries.setData(calculateRSI(displayData));
      panelSeriesRef.current.set("rsi", rsiSeries);
    }
    if (panelIndicator === "MACD" && displayData.length > 0) {
      const macdData = calculateMACD(displayData);
      const histSeries = panelChart.addSeries(HistogramSeries, { priceScaleId: "macd" });
      histSeries.setData(macdData.histogram);
      panelSeriesRef.current.set("macdHist", histSeries);
      const macdLine = panelChart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1, priceScaleId: "macd" });
      macdLine.setData(macdData.macd);
      panelSeriesRef.current.set("macdLine", macdLine);
      const signalLine = panelChart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1, priceScaleId: "macd" });
      signalLine.setData(macdData.signal);
      panelSeriesRef.current.set("signalLine", signalLine);
    }
    if (panelIndicator === "VOL" && displayData.length > 0) {
      const volSeries = panelChart.addSeries(HistogramSeries, { priceFormat: { type: "volume" } });
      volSeries.setData(displayData.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)",
      })));
      panelSeriesRef.current.set("vol", volSeries);
    }

    panelChart.timeScale().fitContent();

    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
        if (range && panelChartRef.current) {
          panelChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      });
    }
  }, [displayData, panelIndicator, colors, isDark]);

  useEffect(() => {
    return () => {
      if (panelChartRef.current) {
        panelChartRef.current.remove();
        panelChartRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  const isPositive = (priceChange || 0) >= 0;
  const displayPrice = currentPrice || null;

  const containerClass = embedded
    ? "w-full"
    : `rounded-xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`;

  return (
    <div className={containerClass}>
      {/* Header with Metal Icon */}
      {showHeader && !embedded && (
        <div className={`px-3 py-2 border-b ${isDark ? 'border-slate-800' : 'border-stone-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Metal Icon */}
              {iconSrc && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-stone-100'}`}>
                  <Image 
                    src={iconSrc} 
                    alt={symbol} 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
              )}
              <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{symbol}</span>
              {displayPrice && (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>${displayPrice.toFixed(2)}</span>
                  {priceChange !== undefined && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"}`}>
                      {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
            {crosshairData ? (
              <>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{labels.open}: <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatPrice(crosshairData.open)}</span></span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{labels.high}: <span className="text-emerald-500">{formatPrice(crosshairData.high)}</span></span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{labels.low}: <span className="text-red-500">{formatPrice(crosshairData.low)}</span></span>
                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{labels.close}: <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatPrice(crosshairData.close)}</span></span>
              </>
            ) : (
              <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>{lang === "tr" ? "Grafik üzerine gelin" : "Hover over chart"}</span>
            )}
          </div>
        </div>
      )}

      {/* Timeframe Controls */}
      {showControls && (
        <div className={`px-2 sm:px-3 py-1 sm:py-1.5 border-b flex items-center gap-0.5 sm:gap-1 ${isDark ? 'border-slate-800/50 bg-slate-900' : 'border-stone-200/50 bg-white'}`}>
          {(["15m", "1H", "4H", "1D", "1W"] as TimeframeKey[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs rounded transition-colors ${
                timeframe === tf
                  ? "bg-emerald-500 text-white"
                  : isDark
                    ? "text-slate-400 hover:text-white hover:bg-slate-800"
                    : "text-slate-600 hover:text-slate-900 hover:bg-stone-100"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div ref={chartContainerRef} className="w-full" style={{ overflow: 'hidden' }} />

      {/* Panel Indicator */}
      {panelIndicator && (
        <div className={`border-t ${isDark ? 'border-slate-800' : 'border-stone-200'}`}>
          <div className={`px-3 py-1 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {panelIndicator === "RSI" && "RSI (14)"}
              {panelIndicator === "MACD" && "MACD (12, 26, 9)"}
              {panelIndicator === "VOL" && labels.volume}
            </span>
          </div>
          <div ref={panelContainerRef} className="w-full" style={{ overflow: 'hidden' }} />
        </div>
      )}

      {/* Indicator Controls */}
      {showControls && (
        <div className={`px-2 sm:px-3 py-1.5 sm:py-2 border-t space-y-1 sm:space-y-1.5 ${isDark ? 'border-slate-800 bg-slate-900' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className={`text-[9px] sm:text-[10px] w-10 sm:w-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{labels.overlay}:</span>
            {(["MA", "EMA", "BOLL", "SAR"] as OverlayIndicator[]).map(ind => (
              <button
                key={ind}
                onClick={() => toggleOverlay(ind)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] rounded transition-colors ${
                  overlayIndicators.includes(ind)
                    ? "bg-blue-500 text-white"
                    : isDark
                      ? "bg-slate-800 text-slate-400 hover:text-white"
                      : "bg-stone-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className={`text-[9px] sm:text-[10px] w-10 sm:w-12 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{labels.panel}:</span>
            {(["VOL", "RSI", "MACD"] as PanelIndicator[]).map(ind => (
              <button
                key={ind}
                onClick={() => togglePanel(ind)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] rounded transition-colors ${
                  panelIndicator === ind
                    ? "bg-emerald-500 text-white"
                    : isDark
                      ? "bg-slate-800 text-slate-400 hover:text-white"
                      : "bg-stone-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
          {overlayIndicators.includes("MA") && (
            <div className="flex items-center gap-3 text-[10px] pt-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-500"></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>MA(7)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-500"></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>MA(25)</span>
              </span>
            </div>
          )}
          {overlayIndicators.includes("EMA") && (
            <div className="flex items-center gap-3 text-[10px] pt-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-cyan-500"></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>EMA(12)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-purple-500"></span>
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>EMA(26)</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
