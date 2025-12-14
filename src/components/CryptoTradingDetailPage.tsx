"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useCryptoChart, CandleData } from "@/hooks/useCryptoChart";
import { CryptoConvertModal } from "./CryptoConvertModal";
import { useLanguage } from "@/components/LanguageContext";

interface CryptoTradingDetailPageProps {
  cryptoId: "ETH" | "BTC" | "XRP" | "SOL";
  onClose: () => void;
  lang?: string;
  cryptoBalances?: {
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

type TimeFrame = "15m" | "1h" | "4h" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL";
type PanelIndicator = "VOL" | "MACD" | "RSI";

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    price: "Fiyat",
    info: "Bilgi",
    market: "Piyasa",
    convert: "Dönüştür",
    cryptoInfo: "Kripto Bilgileri",
    symbol: "Sembol",
    name: "Ad",
    type: "Tür",
    consensus: "Konsensüs",
    network: "Ağ",
    marketData: "Piyasa Verileri",
    bidPrice: "Alış Fiyatı",
    askPrice: "Satış Fiyatı",
    volume24h: "24s Hacim",
    live: "CANLI",
  },
  en: {
    price: "Price",
    info: "Info",
    market: "Market",
    convert: "Convert",
    cryptoInfo: "Crypto Information",
    symbol: "Symbol",
    name: "Name",
    type: "Type",
    consensus: "Consensus",
    network: "Network",
    marketData: "Market Data",
    bidPrice: "Bid Price",
    askPrice: "Ask Price",
    volume24h: "24h Volume",
    live: "LIVE",
  },
  de: {
    price: "Preis",
    info: "Info",
    market: "Markt",
    convert: "Konvertieren",
    cryptoInfo: "Krypto-Informationen",
    symbol: "Symbol",
    name: "Name",
    type: "Typ",
    consensus: "Konsens",
    network: "Netzwerk",
    marketData: "Marktdaten",
    bidPrice: "Geldkurs",
    askPrice: "Briefkurs",
    volume24h: "24h Volumen",
    live: "LIVE",
  },
  fr: {
    price: "Prix",
    info: "Info",
    market: "Marché",
    convert: "Convertir",
    cryptoInfo: "Informations Crypto",
    symbol: "Symbole",
    name: "Nom",
    type: "Type",
    consensus: "Consensus",
    network: "Réseau",
    marketData: "Données du Marché",
    bidPrice: "Prix Achat",
    askPrice: "Prix Vente",
    volume24h: "Volume 24h",
    live: "EN DIRECT",
  },
  ar: {
    price: "السعر",
    info: "معلومات",
    market: "السوق",
    convert: "تحويل",
    cryptoInfo: "معلومات العملة المشفرة",
    symbol: "الرمز",
    name: "الاسم",
    type: "النوع",
    consensus: "الإجماع",
    network: "الشبكة",
    marketData: "بيانات السوق",
    bidPrice: "سعر الشراء",
    askPrice: "سعر البيع",
    volume24h: "حجم 24س",
    live: "مباشر",
  },
  ru: {
    price: "Цена",
    info: "Инфо",
    market: "Рынок",
    convert: "Конвертировать",
    cryptoInfo: "Информация о криптовалюте",
    symbol: "Символ",
    name: "Название",
    type: "Тип",
    consensus: "Консенсус",
    network: "Сеть",
    marketData: "Рыночные Данные",
    bidPrice: "Цена покупки",
    askPrice: "Цена продажи",
    volume24h: "Объём 24ч",
    live: "LIVE",
  },
};

const CRYPTO_INFO = {
  ETH: { name: "Ethereum", color: "#627EEA", icon: "Ξ" },
  BTC: { name: "Bitcoin", color: "#F7931A", icon: "₿" },
  XRP: { name: "Ripple", color: "#23292F", icon: "✕" },
  SOL: { name: "Solana", color: "#9945FF", icon: "◎" },
};

const CRYPTO_DETAILS: Record<string, { type: string; consensus: string; network: string }> = {
  ETH: { type: "Smart Contract Platform", consensus: "Proof of Stake", network: "Ethereum Mainnet" },
  BTC: { type: "Digital Currency", consensus: "Proof of Work", network: "Bitcoin Network" },
  XRP: { type: "Payment Protocol", consensus: "RPCA", network: "XRP Ledger" },
  SOL: { type: "Smart Contract Platform", consensus: "Proof of History", network: "Solana Mainnet" },
};

// Technical Indicator Functions
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

export default function CryptoTradingDetailPage({
  cryptoId,
  onClose,
  lang: propLang,
  cryptoBalances = { ETH: 0, BTC: 0, XRP: 0, SOL: 0 },
  metalBidPrices = { AUXG: 134.69, AUXS: 1.82, AUXPT: 52.92, AUXPD: 45.57 },
}: CryptoTradingDetailPageProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;
  
  const { prices, changes, directions } = useCryptoPrices();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("4h");
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data">("price");
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>(["MA"]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Binance'den gerçek chart verisi çek
  const { candles, loading: chartLoading, error: chartError, refresh: refreshChart } = useCryptoChart({
    symbol: cryptoId,
    interval: timeFrame,
    limit: 100,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const cryptoInfo = CRYPTO_INFO[cryptoId];
  const cryptoDetails = CRYPTO_DETAILS[cryptoId];

  // Get price based on crypto type
  const getBasePrice = () => {
    switch (cryptoId) {
      case "ETH": return prices.eth;
      case "BTC": return prices.btc;
      case "XRP": return prices.xrp;
      case "SOL": return prices.sol;
      default: return 0;
    }
  };

  const getChange24h = () => {
    switch (cryptoId) {
      case "ETH": return changes.eth;
      case "BTC": return changes.btc;
      case "XRP": return changes.xrp;
      case "SOL": return changes.sol;
      default: return 0;
    }
  };

  const getDirection = () => {
    switch (cryptoId) {
      case "ETH": return directions.eth;
      case "BTC": return directions.btc;
      case "XRP": return directions.xrp;
      case "SOL": return directions.sol;
      default: return "neutral";
    }
  };

  const currentPrice = getBasePrice();
  const change24h = getChange24h();
  const direction = getDirection();
  const isPositive = change24h >= 0;

  // Spread settings
  const spreadSettings = { askAdjust: 1, bidAdjust: -0.5 };
  const askPrice = currentPrice * (1 + spreadSettings.askAdjust / 100);
  const bidPrice = currentPrice * (1 + spreadSettings.bidAdjust / 100);

  // Chart data from Binance
  const candleData = candles;

  // Calculate indicators
  const ma20 = useMemo(() => calculateMA(candleData, 20), [candleData]);
  const ema20 = useMemo(() => calculateEMA(candleData, 20), [candleData]);
  const boll = useMemo(() => calculateBOLL(candleData, 20), [candleData]);
  const rsi = useMemo(() => calculateRSI(candleData, 14), [candleData]);
  const macdData = useMemo(() => calculateMACD(candleData), [candleData]);

  // Chart dimensions
  const chartWidth = 400;
  const chartHeight = 220;
  const indicatorHeight = 60;
  const padding = { top: 10, right: 50, bottom: 20, left: 10 };

  // Visible data range
  const visibleCount = Math.min(80, candleData.length);
  const startIndex = Math.max(0, candleData.length - visibleCount);
  const visibleData = candleData.slice(startIndex);
  const visibleMA = ma20.slice(startIndex);
  const visibleEMA = ema20.slice(startIndex);
  const visibleBOLL = {
    upper: boll.upper.slice(startIndex),
    middle: boll.middle.slice(startIndex),
    lower: boll.lower.slice(startIndex),
  };
  const visibleRSI = rsi.slice(startIndex);
  const visibleMACD = {
    macd: macdData.macd.slice(startIndex),
    signal: macdData.signal.slice(startIndex),
    histogram: macdData.histogram.slice(startIndex),
  };

  // Price range
  const priceMax = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.high)) * 1.002 : currentPrice * 1.05;
  const priceMin = visibleData.length > 0 ? Math.min(...visibleData.map(c => c.low)) * 0.998 : currentPrice * 0.95;
  const priceRange = priceMax - priceMin || 1;
  const volumeMax = visibleData.length > 0 ? Math.max(...visibleData.map(c => c.volume)) || 1 : 1;

  // Scale functions
  const scaleX = (i: number) => padding.left + (i / (visibleCount - 1)) * (chartWidth - padding.left - padding.right);
  const scaleY = (price: number) => padding.top + ((priceMax - price) / priceRange) * (chartHeight - padding.top - padding.bottom);

  const candleWidth = Math.max(2, (chartWidth - padding.left - padding.right) / visibleCount * 0.7);

  // Toggle functions
  const toggleOverlay = (indicator: OverlayIndicator) => {
    setOverlayIndicators(prev =>
      prev.includes(indicator) ? prev.filter(i => i !== indicator) : [...prev, indicator]
    );
  };

  // Format functions
  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  const formatVolume = (v: number) => {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return v.toFixed(2);
  };

  // Calculate 24h volume
  const volume24h = visibleData.slice(-24).reduce((sum, c) => sum + c.volume * c.close, 0);

  // Timeframe change handler
  const handleTimeFrameChange = (tf: TimeFrame) => {
    setTimeFrame(tf);
  };

  // Performance periods
  const performancePeriods = [
    { label: "1H", value: change24h * 0.04 },
    { label: "4H", value: change24h * 0.16 },
    { label: "24H", value: change24h },
    { label: "7D", value: change24h * 2.5 },
    { label: "30D", value: change24h * 8 },
    { label: "1Y", value: change24h * 30 },
  ];

  const overlayList: OverlayIndicator[] = ["MA", "EMA", "BOLL"];
  const panelList: PanelIndicator[] = ["VOL", "MACD", "RSI"];

  // Crypto prices for convert modal
  const cryptoPrices = {
    ETH: prices.eth,
    BTC: prices.btc,
    XRP: prices.xrp,
    SOL: prices.sol,
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/80 flex items-end justify-center sm:items-center">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col border border-stone-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: cryptoInfo.color }}
            >
              {cryptoInfo.icon}
            </div>
            <div>
              <h2 className="text-slate-900 dark:text-white font-semibold">{cryptoId}</h2>
              <p className="text-xs text-slate-400">{cryptoInfo.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-4 text-sm border-b border-stone-200 dark:border-slate-800">
          {[
            { id: "price", label: t.price },
            { id: "info", label: t.info },
            { id: "data", label: t.market },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 border-b-2 transition-colors ${
                activeTab === tab.id ? "border-purple-500 text-slate-900 dark:text-white" : "border-transparent text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {activeTab === "price" && (
            <>
              {/* Price Header */}
              <div className="px-4 py-3 border-b border-stone-200 dark:border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold font-mono ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        ${formatPrice(currentPrice)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    <div className={`text-sm mt-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {isPositive ? "↑" : "↓"} {Math.abs(change24h).toFixed(2)}% (24h)
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>Binance</div>
                    <div>{new Date().toLocaleTimeString()}</div>
                  </div>
                </div>
              </div>

              {/* Timeframe Selector */}
              <div className="flex gap-1 px-4 py-2 border-b border-stone-200 dark:border-slate-800/50">
                {(["15m", "1h", "4h", "1D", "1W"] as TimeFrame[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => handleTimeFrameChange(tf)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      timeFrame === tf ? "bg-purple-500 text-white" : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {/* Chart */}
              <div className="px-2 py-2">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[220px]">
                    <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-purple-500 rounded-full" />
                  </div>
                ) : chartError ? (
                  <div className="flex items-center justify-center h-[220px] text-red-400 text-sm">
                    {chartError}
                    <button onClick={refreshChart} className="ml-2 text-purple-400 underline">Retry</button>
                  </div>
                ) : (
                  <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
                    {/* Grid */}
                    {[0.25, 0.5, 0.75].map((ratio) => (
                      <line
                        key={ratio}
                        x1={padding.left}
                        y1={padding.top + ratio * (chartHeight - padding.top - padding.bottom)}
                        x2={chartWidth - padding.right}
                        y2={padding.top + ratio * (chartHeight - padding.top - padding.bottom)}
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Bollinger Bands */}
                    {overlayIndicators.includes("BOLL") && visibleBOLL.upper.length > 0 && (
                      <>
                        <polyline
                          points={visibleBOLL.upper.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ")}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1"
                          opacity="0.5"
                        />
                        <polyline
                          points={visibleBOLL.lower.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ")}
                          fill="none"
                          stroke="#94a3b8"
                          strokeWidth="1"
                          opacity="0.5"
                        />
                      </>
                    )}

                    {/* Candlesticks */}
                    {visibleData.map((candle, i) => {
                      const x = scaleX(i);
                      const openY = scaleY(candle.open);
                      const closeY = scaleY(candle.close);
                      const highY = scaleY(candle.high);
                      const lowY = scaleY(candle.low);
                      const isBullish = candle.close >= candle.open;
                      const color = isBullish ? "#22c55e" : "#ef4444";

                      return (
                        <g key={i}>
                          <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" />
                          <rect
                            x={x - candleWidth / 2}
                            y={Math.min(openY, closeY)}
                            width={candleWidth}
                            height={Math.abs(closeY - openY) || 1}
                            fill={color}
                          />
                        </g>
                      );
                    })}

                    {/* MA Line */}
                    {overlayIndicators.includes("MA") && visibleMA.length > 0 && (
                      <polyline
                        points={visibleMA.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ")}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* EMA Line */}
                    {overlayIndicators.includes("EMA") && visibleEMA.length > 0 && (
                      <polyline
                        points={visibleEMA.map((v, i) => `${scaleX(i)},${scaleY(v)}`).join(" ")}
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="1.5"
                      />
                    )}

                    {/* Current Price Line */}
                    <line
                      x1={padding.left}
                      y1={scaleY(currentPrice)}
                      x2={chartWidth - padding.right}
                      y2={scaleY(currentPrice)}
                      stroke={isPositive ? "#22c55e" : "#ef4444"}
                      strokeWidth="1"
                      strokeDasharray="4,2"
                    />
                    <rect
                      x={chartWidth - padding.right}
                      y={scaleY(currentPrice) - 10}
                      width={50}
                      height={20}
                      fill={isPositive ? "#22c55e" : "#ef4444"}
                      rx="3"
                    />
                    <text
                      x={chartWidth - padding.right + 25}
                      y={scaleY(currentPrice) + 4}
                      textAnchor="middle"
                      className="text-[10px] fill-white font-medium"
                    >
                      {formatPrice(currentPrice)}
                    </text>

                    {/* Y-axis labels */}
                    {[priceMax, (priceMax + priceMin) / 2, priceMin].map((price, i) => (
                      <text key={i} x={chartWidth - 5} y={scaleY(price)} textAnchor="end" className="text-[9px] fill-slate-500">
                        {formatPrice(price)}
                      </text>
                    ))}
                  </svg>
                )}
              </div>

              {/* Indicators */}
              <div className="px-2 border-t border-stone-200 dark:border-slate-800/30">
                <div className="py-1 space-y-1">
                  <div className="flex gap-1 items-center">
                    <span className="text-[9px] text-slate-500 px-1">Overlay:</span>
                    {overlayList.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => toggleOverlay(ind)}
                        className={`px-2 py-1 text-[10px] rounded transition-colors ${
                          overlayIndicators.includes(ind) ? "bg-purple-500 text-white" : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 items-center">
                    <span className="text-[9px] text-slate-500 px-1">Panel:</span>
                    {panelList.map((ind) => (
                      <button
                        key={ind}
                        onClick={() => setPanelIndicator(panelIndicator === ind ? null : ind)}
                        className={`px-2 py-1 text-[10px] rounded transition-colors ${
                          panelIndicator === ind ? "bg-emerald-500 text-white" : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Indicator Panel */}
              {panelIndicator && (
                <div className="px-2 border-t border-stone-200 dark:border-slate-800/30">
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
                        <text x={10} y={12} className="text-[9px] fill-slate-400">MACD</text>
                        <line x1={padding.left} y1={indicatorHeight / 2} x2={chartWidth - padding.right} y2={indicatorHeight / 2} stroke="#334155" strokeWidth="1" />
                        {visibleMACD.histogram.map((val, i) => {
                          const x = scaleX(i);
                          const maxH = Math.max(...visibleMACD.histogram.map(Math.abs)) || 1;
                          const h = (Math.abs(val) / maxH) * (indicatorHeight / 2 - 10);
                          const y = val >= 0 ? indicatorHeight / 2 - h : indicatorHeight / 2;
                          return <rect key={i} x={x - candleWidth / 2} y={y} width={candleWidth} height={h} fill={val >= 0 ? "#22c55e" : "#ef4444"} opacity="0.5" />;
                        })}
                      </>
                    )}
                    {panelIndicator === "VOL" && visibleData.length > 0 && (
                      <>
                        <text x={10} y={12} className="text-[9px] fill-slate-400">Volume</text>
                        {visibleData.map((c, i) => {
                          const x = scaleX(i);
                          const h = (c.volume / volumeMax) * (indicatorHeight - 10);
                          return <rect key={i} x={x - candleWidth / 2} y={indicatorHeight - h - 5} width={candleWidth} height={h} fill={c.close >= c.open ? "#22c55e" : "#ef4444"} opacity="0.6" />;
                        })}
                      </>
                    )}
                  </svg>
                </div>
              )}

              {/* Performance */}
              <div className="px-4 py-3 grid grid-cols-6 gap-2 border-t border-stone-200 dark:border-slate-800">
                {performancePeriods.map((stat) => (
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
              <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.cryptoInfo}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                  <span className="text-slate-400">{t.symbol}</span>
                  <span className="text-slate-200 font-medium">{cryptoId}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                  <span className="text-slate-400">{t.name}</span>
                  <span className="text-slate-200 font-medium">{cryptoInfo.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                  <span className="text-slate-400">{t.type}</span>
                  <span className="text-slate-200 font-medium">{cryptoDetails.type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                  <span className="text-slate-400">{t.consensus}</span>
                  <span className="text-slate-200 font-medium">{cryptoDetails.consensus}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">{t.network}</span>
                  <span className="text-slate-200 font-medium">{cryptoDetails.network}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="px-4 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">{t.marketData}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">{t.bidPrice}</div>
                  <div className="text-lg font-bold text-emerald-400">${formatPrice(bidPrice)}</div>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">{t.askPrice}</div>
                  <div className="text-lg font-bold text-red-400">${formatPrice(askPrice)}</div>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="text-xs text-slate-400 mb-1">{t.volume24h}</div>
                  <div className="text-lg font-bold text-blue-400">{formatVolume(volume24h)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Button */}
        <div className="px-4 py-3 border-t border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
          <button
            onClick={() => setShowConvertModal(true)}
            className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-slate-900 dark:text-white font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
                        {t.convert}
          </button>
        </div>
      </div>

      {/* Convert Modal */}
      {showConvertModal && (
        <CryptoConvertModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          crypto={cryptoId}
          lang={lang as 'tr' | 'en' | 'de' | 'fr' | 'ar' | 'ru'}
          cryptoBalances={cryptoBalances}
          cryptoPrices={cryptoPrices}
          metalBidPrices={metalBidPrices}
        />
      )}
    </div>
  );
}
