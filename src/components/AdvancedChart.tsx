"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
  theme?: 'light' | 'dark';
}

const translations: Record<string, { overlay: string; panel: string; volume: string; high: string; low: string; open: string; close: string }> = {
  tr: {
    overlay: "Overlay",
    panel: "Panel",
    volume: "Hacim",
    high: "Yüksek",
    low: "Düşük",
    open: "Açılış",
    close: "Kapanış",
  },
  en: {
    overlay: "Overlay",
    panel: "Panel",
    volume: "Volume",
    high: "High",
    low: "Low",
    open: "Open",
    close: "Close",
  },
  de: {
    overlay: "Overlay",
    panel: "Panel",
    volume: "Volumen",
    high: "Hoch",
    low: "Tief",
    open: "Eröffnung",
    close: "Schluss",
  },
  fr: {
    overlay: "Superposition",
    panel: "Panneau",
    volume: "Volume",
    high: "Haut",
    low: "Bas",
    open: "Ouverture",
    close: "Clôture",
  },
  ar: {
    overlay: "تراكب",
    panel: "لوحة",
    volume: "الحجم",
    high: "أعلى",
    low: "أدنى",
    open: "افتتاح",
    close: "إغلاق",
  },
  ru: {
    overlay: "Наложение",
    panel: "Панель",
    volume: "Объём",
    high: "Макс",
    low: "Мин",
    open: "Открытие",
    close: "Закрытие",
  },
};

// =====================
// Indicator Calculations
// =====================

function calculateMA(data: ChartData[], period: number): LineData[] {
  const result: LineData[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
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
  const upper: LineData[] = [];
  const lower: LineData[] = [];

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
      if (data[i].low < sar) {
        isUptrend = false;
        sar = ep;
        ep = data[i].low;
        currentAf = af;
      } else {
        if (data[i].high > ep) {
          ep = data[i].high;
          currentAf = Math.min(currentAf + af, maxAf);
        }
      }
    } else {
      if (data[i].high > sar) {
        isUptrend = true;
        sar = ep;
        ep = data[i].high;
        currentAf = af;
      } else {
        if (data[i].low < ep) {
          ep = data[i].low;
          currentAf = Math.min(currentAf + af, maxAf);
        }
      }
    }
  }

  return result;
}

function calculateRSI(data: ChartData[], period: number = 14): LineData[] {
  const result: LineData[] = [];
  if (data.length < period + 1) return result;

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push({ time: data[i].time, value: 50 });
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
    const rs = avgGain / (avgLoss || 0.001);
    const rsi = 100 - (100 / (1 + rs));
    result.push({ time: data[i].time, value: rsi });
  }

  return result;
}

function calculateMACD(data: ChartData[]): { macd: LineData[]; signal: LineData[]; histogram: HistogramData[] } {
  const macd: LineData[] = [];
  const signal: LineData[] = [];
  const histogram: HistogramData[] = [];

  if (data.length === 0) return { macd, signal, histogram };

  let ema12 = data[0].close;
  let ema26 = data[0].close;
  const macdValues: number[] = [];

  for (let i = 0; i < data.length; i++) {
    ema12 = (data[i].close * 2) / 13 + ema12 * 11 / 13;
    ema26 = (data[i].close * 2) / 27 + ema26 * 25 / 27;
    const macdVal = ema12 - ema26;
    macdValues.push(macdVal);
    macd.push({ time: data[i].time, value: macdVal });
  }

  let signalVal = macdValues[0];
  for (let i = 0; i < macdValues.length; i++) {
    signalVal = (macdValues[i] * 2) / 10 + signalVal * 8 / 10;
    signal.push({ time: data[i].time, value: signalVal });
    const histVal = macdValues[i] - signalVal;
    histogram.push({
      time: data[i].time,
      value: histVal,
      color: histVal >= 0 ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)",
    });
  }

  return { macd, signal, histogram };
}

// =====================
// Utils
// =====================

function formatPrice(price: number): string {
  return `$${price.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

// =====================
// Main Component
// =====================

export function AdvancedChart({
  data,
  symbol,
  currentPrice,
  priceChange,
  lang = "tr",
  height = 400,
  timeframe: controlledTimeframe,
  onTimeframeChange,
  overlayIndicators: controlledOverlay,
  onOverlayChange,
  panelIndicator: controlledPanel,
  onPanelChange,
  showControls = true,
  theme: propTheme,
}: Props) {
  const labels = translations[lang] || translations.en;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const panelContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const panelChartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const panelSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const isFirstRenderRef = useRef(true);
  const panelFirstRenderRef = useRef(true);

  // Detect theme from document or use prop
  const [detectedTheme, setDetectedTheme] = useState<'light' | 'dark'>('dark');
  
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setDetectedTheme(isDark ? 'dark' : 'light');
    };
    checkTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);
  
  const theme = propTheme || detectedTheme;
  const isDark = theme === 'dark';
  
  // Theme colors - memoized to prevent unnecessary re-renders
  const colors = useMemo(() => ({
    background: isDark ? "#0f172a" : "#ffffff",
    text: isDark ? "#94a3b8" : "#64748b",
    gridLines: isDark ? "#1e293b" : "#e2e8f0",
    borderColor: isDark ? "#334155" : "#cbd5e1",
    crosshairLine: isDark ? "#64748b" : "#94a3b8",
    crosshairLabel: isDark ? "#475569" : "#64748b",
  }), [isDark]);

  // Internal state
  const [internalTimeframe, setInternalTimeframe] = useState<TimeframeKey>("4H");
  const [internalOverlay, setInternalOverlay] = useState<OverlayIndicator[]>(["MA"]);
  const [internalPanel, setInternalPanel] = useState<PanelIndicator | null>("RSI");
  const [crosshairData, setCrosshairData] = useState<ChartData | null>(null);

  // Set initial crosshair data to last candle
  useEffect(() => {
    if (data.length > 0 && !crosshairData) {
      setCrosshairData(data[data.length - 1]);
    }
  }, [data]);

  // Use controlled or internal state
  const timeframe = controlledTimeframe ?? internalTimeframe;
  const overlayIndicators = controlledOverlay ?? internalOverlay;
  const panelIndicator = controlledPanel !== undefined ? controlledPanel : internalPanel;

  const setTimeframe = onTimeframeChange ?? setInternalTimeframe;
  const setOverlayIndicators = onOverlayChange ?? setInternalOverlay;
  const setPanelIndicator = onPanelChange ?? setInternalPanel;

  const toggleOverlay = useCallback((ind: OverlayIndicator) => {
    const newIndicators = overlayIndicators.includes(ind)
      ? overlayIndicators.filter(i => i !== ind)
      : [...overlayIndicators, ind];
    setOverlayIndicators(newIndicators);
  }, [overlayIndicators, setOverlayIndicators]);

  const togglePanel = useCallback((ind: PanelIndicator) => {
    setPanelIndicator(panelIndicator === ind ? null : ind);
  }, [panelIndicator, setPanelIndicator]);

  // Data is already in grams - no conversion needed
  const displayData = useMemo(() => data, [data]);

  // Calculate chart height
  const mainChartHeight = panelIndicator ? height - 100 : height;

  // Initialize and update main chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // If chart exists, update options for theme change
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
        },
        grid: {
          vertLines: { color: colors.gridLines },
          horzLines: { color: colors.gridLines },
        },
        crosshair: {
          vertLine: { color: colors.crosshairLine, labelBackgroundColor: colors.crosshairLabel },
          horzLine: { color: colors.crosshairLine, labelBackgroundColor: colors.crosshairLabel },
        },
        rightPriceScale: {
          borderColor: colors.borderColor,
        },
        timeScale: {
          borderColor: colors.borderColor,
        },
      });
      return;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: colors.background },
        textColor: colors.text,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: colors.gridLines },
        horzLines: { color: colors.gridLines },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: colors.crosshairLine, width: 1, style: 2, labelBackgroundColor: colors.crosshairLabel },
        horzLine: { color: colors.crosshairLine, width: 1, style: 2, labelBackgroundColor: colors.crosshairLabel },
      },
      rightPriceScale: {
        borderColor: colors.borderColor,
        scaleMargins: { top: 0.05, bottom: 0.15 },
      },
      timeScale: {
        borderColor: colors.borderColor,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: mainChartHeight,
    });

    chartRef.current = chart;

    // Crosshair subscription - use displayData (already in grams)
    // When mouse leaves, show last candle data instead of null
    chart.subscribeCrosshairMove((param) => {
      if (param.time) {
        const dataPoint = displayData.find(d => d.time === param.time);
        if (dataPoint) {
          setCrosshairData(dataPoint);
        }
      } else {
        // Show last candle when mouse leaves
        if (displayData.length > 0) {
          setCrosshairData(displayData[displayData.length - 1]);
        }
      }
    });

    // Resize handler with debounce
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (chartContainerRef.current && chartRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
          });
        }
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  // Update chart height when panel changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({ height: mainChartHeight });
    }
  }, [mainChartHeight]);

  // Update chart theme when isDark changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
        },
        grid: {
          vertLines: { color: colors.gridLines },
          horzLines: { color: colors.gridLines },
        },
        crosshair: {
          vertLine: { color: colors.crosshairLine, labelBackgroundColor: colors.crosshairLabel },
          horzLine: { color: colors.crosshairLine, labelBackgroundColor: colors.crosshairLabel },
        },
        rightPriceScale: {
          borderColor: colors.borderColor,
        },
        timeScale: {
          borderColor: colors.borderColor,
        },
      });
    }
    
    // Also update panel chart
    if (panelChartRef.current) {
      panelChartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
        },
        grid: {
          vertLines: { color: colors.gridLines },
          horzLines: { color: colors.gridLines },
        },
        rightPriceScale: {
          borderColor: colors.borderColor,
        },
        timeScale: {
          borderColor: colors.borderColor,
        },
      });
    }
  }, [isDark, colors]);

  // Update series data and indicators
  useEffect(() => {
    if (!chartRef.current || displayData.length === 0) return;

    const chart = chartRef.current;

    // Clear existing series
    seriesRef.current.forEach((series) => {
      try {
        chart.removeSeries(series);
      } catch (e) {}
    });
    seriesRef.current.clear();

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    candleSeries.setData(displayData);
    seriesRef.current.set("candle", candleSeries);

    // Volume (subtle at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.9, bottom: 0 },
    });
    const volumeData: HistogramData[] = displayData.map(d => ({
      time: d.time,
      value: d.volume || 0,
      color: d.close >= d.open ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
    }));
    volumeSeries.setData(volumeData);
    seriesRef.current.set("volume", volumeSeries);

    // MA Indicator
    if (overlayIndicators.includes("MA") && displayData.length >= 20) {
      const ma7 = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 1 });
      ma7.setData(calculateMA(displayData, 7));
      seriesRef.current.set("ma7", ma7);
      
      const ma25 = chart.addSeries(LineSeries, { color: "#3b82f6", lineWidth: 1 });
      ma25.setData(calculateMA(displayData, 25));
      seriesRef.current.set("ma25", ma25);
    }

    // EMA Indicator
    if (overlayIndicators.includes("EMA") && displayData.length >= 20) {
      const ema12 = chart.addSeries(LineSeries, { color: "#06b6d4", lineWidth: 1 });
      ema12.setData(calculateEMA(displayData, 12));
      seriesRef.current.set("ema12", ema12);
      
      const ema26 = chart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 1 });
      ema26.setData(calculateEMA(displayData, 26));
      seriesRef.current.set("ema26", ema26);
    }

    // Bollinger Bands
    if (overlayIndicators.includes("BOLL") && displayData.length >= 20) {
      const boll = calculateBollinger(displayData, 20);
      
      const upperBand = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1 });
      upperBand.setData(boll.upper);
      seriesRef.current.set("bollUpper", upperBand);
      
      const lowerBand = chart.addSeries(LineSeries, { color: "#94a3b8", lineWidth: 1 });
      lowerBand.setData(boll.lower);
      seriesRef.current.set("bollLower", lowerBand);
    }

    // Parabolic SAR
    if (overlayIndicators.includes("SAR") && displayData.length >= 5) {
      const sarData = calculateSAR(displayData);
      const sarSeries = chart.addSeries(LineSeries, { 
        color: "#fbbf24", 
        lineWidth: 0,
        pointMarkersVisible: true,
        pointMarkersRadius: 2,
      });
      sarSeries.setData(sarData);
      seriesRef.current.set("sar", sarSeries);
    }

    // Fit content only on first load or when timeframe changes
    if (isFirstRenderRef.current) {
      chart.timeScale().fitContent();
      isFirstRenderRef.current = false;
    }

  }, [displayData, overlayIndicators]);

  // Reset fit on timeframe change
  useEffect(() => {
    isFirstRenderRef.current = true;
    panelFirstRenderRef.current = true;
  }, [timeframe]);

  // Panel Chart (RSI, MACD, VOL)
  useEffect(() => {
    if (!panelContainerRef.current) return;

    // Remove panel chart if no indicator selected
    if (!panelIndicator) {
      if (panelChartRef.current) {
        panelChartRef.current.remove();
        panelChartRef.current = null;
      }
      return;
    }

    // Create panel chart if not exists
    if (!panelChartRef.current) {
      const panelChart = createChart(panelContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
          attributionLogo: false,
        },
        grid: {
          vertLines: { color: colors.gridLines },
          horzLines: { color: colors.gridLines },
        },
        rightPriceScale: {
          borderColor: colors.borderColor,
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: colors.borderColor,
          visible: false,
        },
        handleScale: false,
        handleScroll: false,
        width: panelContainerRef.current.clientWidth,
        height: 80,
      });

      panelChartRef.current = panelChart;
    } else {
      // Update panel chart colors for theme change
      panelChartRef.current.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: colors.background },
          textColor: colors.text,
        },
        grid: {
          vertLines: { color: colors.gridLines },
          horzLines: { color: colors.gridLines },
        },
        rightPriceScale: {
          borderColor: colors.borderColor,
        },
        timeScale: {
          borderColor: colors.borderColor,
        },
      });
    }

    const panelChart = panelChartRef.current;

    // Clear existing panel series
    panelSeriesRef.current.forEach((series) => {
      try {
        panelChart.removeSeries(series);
      } catch (e) {}
    });
    panelSeriesRef.current.clear();

    if (panelIndicator === "RSI" && displayData.length > 0) {
      const rsiData = calculateRSI(displayData);
      const rsiSeries = panelChart.addSeries(LineSeries, { color: "#8b5cf6", lineWidth: 2 });
      rsiSeries.setData(rsiData);
      panelSeriesRef.current.set("rsi", rsiSeries);
    }

    if (panelIndicator === "MACD" && displayData.length > 0) {
      const macdData = calculateMACD(displayData);
      
      const histSeries = panelChart.addSeries(HistogramSeries, {
        priceScaleId: "macd",
      });
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
      const volSeries = panelChart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
      });
      const volData: HistogramData[] = displayData.map(d => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)",
      }));
      volSeries.setData(volData);
      panelSeriesRef.current.set("vol", volSeries);
    }

    // Fit content only once per panel type
    if (panelFirstRenderRef.current) {
      panelChart.timeScale().fitContent();
      panelFirstRenderRef.current = false;
    }

    // Sync with main chart
    if (chartRef.current) {
      const mainChart = chartRef.current;
      const syncHandler = (range: any) => {
        if (range && panelChartRef.current) {
          panelChartRef.current.timeScale().setVisibleLogicalRange(range);
        }
      };
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncHandler);
    }

  }, [displayData, panelIndicator, isDark, colors]);

  // Cleanup panel on unmount
  useEffect(() => {
    return () => {
      if (panelChartRef.current) {
        panelChartRef.current.remove();
        panelChartRef.current = null;
      }
    };
  }, []);

  const isPositive = (priceChange || 0) >= 0;
  const displayPrice = currentPrice || null;

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
      {/* Header with Price */}
      <div className={`px-3 py-2 border-b ${isDark ? 'border-slate-800' : 'border-stone-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{symbol}</span>
            {displayPrice && (
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  ${displayPrice.toFixed(2)}
                </span>
                {priceChange !== undefined && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {isPositive ? "+" : ""}{priceChange.toFixed(2)}%
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Crosshair Data - Always visible */}
        <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
          {crosshairData ? (
            <>
              <span className="text-slate-500">{labels.open}: <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatPrice(crosshairData.open)}</span></span>
              <span className="text-slate-500">{labels.high}: <span className="text-emerald-500 dark:text-emerald-400">{formatPrice(crosshairData.high)}</span></span>
              <span className="text-slate-500">{labels.low}: <span className="text-red-500 dark:text-red-400">{formatPrice(crosshairData.low)}</span></span>
              <span className="text-slate-500">{labels.close}: <span className={isDark ? 'text-white' : 'text-slate-900'}>{formatPrice(crosshairData.close)}</span></span>
            </>
          ) : (
            <span className="text-slate-500">{lang === "tr" ? "Grafik üzerine gelin" : "Hover over chart"}</span>
          )}
        </div>
      </div>

      {/* Timeframe Controls */}
      {showControls && (
        <div className={`px-3 py-1.5 border-b flex items-center gap-1 ${isDark ? 'border-slate-800/50' : 'border-stone-200/50'}`}>
          {(["15m", "1H", "4H", "1D", "1W"] as TimeframeKey[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
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

      {/* Chart Container - hidden overflow */}
      <div 
        ref={chartContainerRef} 
        className="w-full"
        style={{ overflow: 'hidden' }}
      />

      {/* Panel Indicator Chart */}
      {panelIndicator && (
        <div className={`border-t ${isDark ? 'border-slate-800' : 'border-stone-200'}`}>
          <div className="px-3 py-1 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {panelIndicator === "RSI" && "RSI (14)"}
              {panelIndicator === "MACD" && "MACD (12, 26, 9)"}
              {panelIndicator === "VOL" && labels.volume}
              {panelIndicator === "AVL" && "AVL"}
            </span>
          </div>
          <div 
            ref={panelContainerRef} 
            className="w-full"
            style={{ overflow: 'hidden' }}
          />
        </div>
      )}

      {/* Indicator Controls */}
      {showControls && (
        <div className={`px-3 py-2 border-t space-y-1.5 ${isDark ? 'border-slate-800' : 'border-stone-200'}`}>
          {/* Overlay Indicators */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 w-12">{labels.overlay}:</span>
            {(["MA", "EMA", "BOLL", "SAR"] as OverlayIndicator[]).map(ind => (
              <button
                key={ind}
                onClick={() => toggleOverlay(ind)}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
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

          {/* Panel Indicators */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 w-12">{labels.panel}:</span>
            {(["VOL", "RSI", "MACD"] as PanelIndicator[]).map(ind => (
              <button
                key={ind}
                onClick={() => togglePanel(ind)}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
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

          {/* MA Legend */}
          {overlayIndicators.includes("MA") && (
            <div className="flex items-center gap-3 text-[10px] pt-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-amber-500"></span>
                <span className="text-slate-400">MA(7)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-500"></span>
                <span className="text-slate-400">MA(25)</span>
              </span>
            </div>
          )}

          {/* EMA Legend */}
          {overlayIndicators.includes("EMA") && (
            <div className="flex items-center gap-3 text-[10px] pt-1">
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-cyan-500"></span>
                <span className="text-slate-400">EMA(12)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-purple-500"></span>
                <span className="text-slate-400">EMA(26)</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdvancedChart;
