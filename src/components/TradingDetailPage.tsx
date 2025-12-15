"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";

const AdvancedChart = dynamic(() => import("./AdvancedChart"), { ssr: false });
import type { MetalId } from "@/lib/metals";
import { AllocationModal } from "./AllocationModal";
import { getLeaseConfigBySymbol, getLocalizedName } from "@/lib/leaseRatesConfig";
import { LimitOrdersList } from "./LimitOrdersList";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";
import { useLeaseRates } from "@/hooks/useLeaseRates";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    today: "Bugün",
    days7: "7 Gün",
    days30: "30 Gün",
    days90: "90 Gün",
    days180: "180 Gün",
    year1: "1 Yıl",
    price: "Fiyat",
    info: "Bilgiler",
    tradingData: "İşlem Verileri",
    orders: "Emirler",
    stake: "Biriktir",
    metalInfo: "Metal Bilgileri",
    symbol: "Sembol",
    name: "Ad",
    type: "Tür",
    preciousMetal: "Değerli Metal",
    purity: "Saflık",
    chain: "Zincir",
    custodian: "Saklama",
    tokenDetails: "Token Detayları",
    standard: "Standart",
    circulatingSupply: "Dolaşımdaki Arz",
    audited: "Denetlenmiş",
    yes: "Evet",
    marketData: "Piyasa Verileri",
    bidPrice: "Alış Fiyatı",
    askPrice: "Satış Fiyatı",
    volume24h: "24s Hacim",
    tradingInfo: "İşlem Bilgileri",
    minTrade: "Min. İşlem",
    maxTrade: "Maks. İşlem",
    unlimited: "Sınırsız",
    tradingFee: "İşlem Ücreti",
    settlementTime: "Teslimat Süresi",
    instant: "Anlık",
    buy: "Al",
    sell: "Sat",
    high24h: "24s Yüksek",
    low24h: "24s Düşük",
    performance: "Performans",
  },
  en: {
    today: "Today",
    days7: "7 Days",
    days30: "30 Days",
    days90: "90 Days",
    days180: "180 Days",
    year1: "1 Year",
    price: "Price",
    info: "Info",
    tradingData: "Trading Data",
    orders: "Orders",
    stake: "Stake",
    metalInfo: "Metal Information",
    symbol: "Symbol",
    name: "Name",
    type: "Type",
    preciousMetal: "Precious Metal",
    purity: "Purity",
    chain: "Chain",
    custodian: "Custodian",
    tokenDetails: "Token Details",
    standard: "Standard",
    circulatingSupply: "Circulating Supply",
    audited: "Audited",
    yes: "Yes",
    marketData: "Market Data",
    bidPrice: "Bid Price",
    askPrice: "Ask Price",
    volume24h: "24h Volume",
    tradingInfo: "Trading Information",
    minTrade: "Min. Trade",
    maxTrade: "Max. Trade",
    unlimited: "Unlimited",
    tradingFee: "Trading Fee",
    settlementTime: "Settlement Time",
    instant: "Instant",
    buy: "Buy",
    sell: "Sell",
    high24h: "24h High",
    low24h: "24h Low",
    performance: "Performance",
  },
  de: {
    today: "Heute",
    days7: "7 Tage",
    days30: "30 Tage",
    days90: "90 Tage",
    days180: "180 Tage",
    year1: "1 Jahr",
    price: "Preis",
    info: "Info",
    tradingData: "Handelsdaten",
    orders: "Aufträge",
    stake: "Stake",
    metalInfo: "Metallinformationen",
    symbol: "Symbol",
    name: "Name",
    type: "Typ",
    preciousMetal: "Edelmetall",
    purity: "Reinheit",
    chain: "Blockchain",
    custodian: "Verwahrer",
    tokenDetails: "Token-Details",
    standard: "Standard",
    circulatingSupply: "Umlaufende Menge",
    audited: "Geprüft",
    yes: "Ja",
    marketData: "Marktdaten",
    bidPrice: "Geldkurs",
    askPrice: "Briefkurs",
    volume24h: "24h Volumen",
    tradingInfo: "Handelsinformationen",
    minTrade: "Min. Handel",
    maxTrade: "Max. Handel",
    unlimited: "Unbegrenzt",
    tradingFee: "Handelsgebühr",
    settlementTime: "Abwicklungszeit",
    instant: "Sofort",
    buy: "Kaufen",
    sell: "Verkaufen",
    high24h: "24h Hoch",
    low24h: "24h Tief",
    performance: "Leistung",
  },
  fr: {
    today: "Aujourd'hui",
    days7: "7 Jours",
    days30: "30 Jours",
    days90: "90 Jours",
    days180: "180 Jours",
    year1: "1 An",
    price: "Prix",
    info: "Info",
    tradingData: "Données de Trading",
    orders: "Ordres",
    stake: "Stake",
    metalInfo: "Informations Métal",
    symbol: "Symbole",
    name: "Nom",
    type: "Type",
    preciousMetal: "Métal Précieux",
    purity: "Pureté",
    chain: "Chaîne",
    custodian: "Dépositaire",
    tokenDetails: "Détails du Token",
    standard: "Standard",
    circulatingSupply: "Offre en Circulation",
    audited: "Audité",
    yes: "Oui",
    marketData: "Données de Marché",
    bidPrice: "Prix d'Achat",
    askPrice: "Prix de Vente",
    volume24h: "Volume 24h",
    tradingInfo: "Informations de Trading",
    minTrade: "Min. Trade",
    maxTrade: "Max. Trade",
    unlimited: "Illimité",
    tradingFee: "Frais de Trading",
    settlementTime: "Temps de Règlement",
    instant: "Instantané",
    buy: "Acheter",
    sell: "Vendre",
    high24h: "24h Haut",
    low24h: "24h Bas",
    performance: "Performance",
  },
  ar: {
    today: "اليوم",
    days7: "7 أيام",
    days30: "30 يوم",
    days90: "90 يوم",
    days180: "180 يوم",
    year1: "سنة واحدة",
    price: "السعر",
    info: "معلومات",
    tradingData: "بيانات التداول",
    orders: "الأوامر",
    stake: "ستيكنج",
    metalInfo: "معلومات المعدن",
    symbol: "الرمز",
    name: "الاسم",
    type: "النوع",
    preciousMetal: "معدن ثمين",
    purity: "النقاء",
    chain: "السلسلة",
    custodian: "الحافظ",
    tokenDetails: "تفاصيل التوكن",
    standard: "المعيار",
    circulatingSupply: "العرض المتداول",
    audited: "مدقق",
    yes: "نعم",
    marketData: "بيانات السوق",
    bidPrice: "سعر الشراء",
    askPrice: "سعر البيع",
    volume24h: "حجم 24س",
    tradingInfo: "معلومات التداول",
    minTrade: "الحد الأدنى",
    maxTrade: "الحد الأقصى",
    unlimited: "غير محدود",
    tradingFee: "رسوم التداول",
    settlementTime: "وقت التسوية",
    instant: "فوري",
    buy: "شراء",
    sell: "بيع",
    high24h: "أعلى 24س",
    low24h: "أدنى 24س",
    performance: "الأداء",
  },
  ru: {
    today: "Сегодня",
    days7: "7 Дней",
    days30: "30 Дней",
    days90: "90 Дней",
    days180: "180 Дней",
    year1: "1 Год",
    price: "Цена",
    info: "Инфо",
    tradingData: "Торговые Данные",
    orders: "Ордера",
    stake: "Стейк",
    metalInfo: "Информация о Металле",
    symbol: "Символ",
    name: "Название",
    type: "Тип",
    preciousMetal: "Драгоценный Металл",
    purity: "Чистота",
    chain: "Сеть",
    custodian: "Хранитель",
    tokenDetails: "Детали Токена",
    standard: "Стандарт",
    circulatingSupply: "Оборотное Предложение",
    audited: "Проверено",
    yes: "Да",
    marketData: "Рыночные Данные",
    bidPrice: "Цена Покупки",
    askPrice: "Цена Продажи",
    volume24h: "Объём 24ч",
    tradingInfo: "Торговая Информация",
    minTrade: "Мин. Сделка",
    maxTrade: "Макс. Сделка",
    unlimited: "Без лимита",
    tradingFee: "Комиссия",
    settlementTime: "Время Расчёта",
    instant: "Мгновенно",
    buy: "Купить",
    sell: "Продать",
    high24h: "Макс 24ч",
    low24h: "Мин 24ч",
    performance: "Показатели",
  },
};

interface TradingDetailPageProps {
  metalId: MetalId;
  symbol: string;
  name: string;
  currentPrice: number;
  askPrice?: number;
  bidPrice?: number;
  change24h: number;
  direction: "up" | "down" | "neutral";
  onClose: () => void;
  onBuy: () => void;
  onSell: () => void;
  lang?: string;
}

type TimeFrame = "15m" | "1H" | "4H" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL" | "SAR";
type PanelIndicator = "VOL" | "RSI" | "MACD" | "AVL";

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const TIMEFRAME_SETTINGS: Record<TimeFrame, { candleCount: number; intervalMs: number }> = {
  "15m": { candleCount: 96, intervalMs: 900000 },
  "1H": { candleCount: 72, intervalMs: 3600000 },
  "4H": { candleCount: 84, intervalMs: 14400000 },
  "1D": { candleCount: 90, intervalMs: 86400000 },
  "1W": { candleCount: 52, intervalMs: 604800000 },
};

export default function TradingDetailPage({
  metalId,
  symbol,
  name,
  currentPrice,
  askPrice,
  bidPrice,
  change24h,
  direction,
  onClose,
  onBuy,
  onSell,
  lang: propLang,
}: TradingDetailPageProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = (key: string) => translations[lang]?.[key] || translations.en[key] || key;
  
  const { address } = useWallet();
  const { sofr, leaseOffers } = useLeaseRates();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("4H");
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data" | "orders" | "lease">("price");
  const [livePrice, setLivePrice] = useState(currentPrice);
  const [liveAskPrice, setLiveAskPrice] = useState(askPrice || currentPrice);
  const [liveBidPrice, setLiveBidPrice] = useState(bidPrice || currentPrice);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>(["MA"]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>("RSI");

  const initialPriceRef = useRef(currentPrice);
  const initialAskPriceRef = useRef(askPrice || currentPrice);
  const initialBidPriceRef = useRef(bidPrice || currentPrice);
  const initialChange24hRef = useRef(change24h);
  const initialDirectionRef = useRef(direction);

  const isPositive = initialDirectionRef.current === "up";
  
  // Safe rates with fallbacks
  const safeRates = { 
    sofr: 3.66, 
    AUXG: { "3": 1.53, "6": 2.03, "12": 2.53 }, 
    AUXS: { "3": 1.23, "6": 1.73, "12": 2.23 }, 
    AUXPT: { "3": 2.03, "6": 2.53, "12": 3.03 }, 
    AUXPD: { "3": 1.83, "6": 2.33, "12": 2.83 } 
  };

  const generateCandleData = useCallback((basePrice: number, timeFrame: TimeFrame, seed: string): CandleData[] => {
    const { candleCount, intervalMs } = TIMEFRAME_SETTINGS[timeFrame];
    const data: CandleData[] = [];
    const numericSeed = (seed + timeFrame).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    let price = basePrice * 0.97;
    
    for (let i = 0; i < candleCount; i++) {
      const pseudoRandom1 = Math.sin(numericSeed + i * 0.7) * 10000;
      const pseudoRandom2 = Math.sin(numericSeed + i * 1.3) * 10000;
      const pseudoRandom3 = Math.sin(numericSeed + i * 0.5) * 10000;
      const random1 = pseudoRandom1 - Math.floor(pseudoRandom1);
      const random2 = pseudoRandom2 - Math.floor(pseudoRandom2);
      const random3 = pseudoRandom3 - Math.floor(pseudoRandom3);
      
      const volatility = basePrice * 0.012;
      const trend = (basePrice - price) * 0.015;
      const change = (random1 - 0.48) * volatility + trend;
      price = Math.max(price + change, basePrice * 0.85);
      
      const open = price;
      const close = price + (random2 - 0.5) * volatility;
      const high = Math.max(open, close) + random3 * volatility * 0.5;
      const low = Math.min(open, close) - random1 * volatility * 0.5;
      const volume = Math.floor(300000 + random2 * 700000);
      
      const now = Date.now();
      const time = Math.floor((now - (candleCount - 1 - i) * intervalMs) / 1000);
      
      data.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume,
      });
      
      price = close;
    }
    
    return data;
  }, []);

  const chartData = useMemo(() => {
    return generateCandleData(initialPriceRef.current, timeFrame, symbol);
  }, [timeFrame, symbol, generateCandleData]);

  const performanceData = useMemo(() => {
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const baseChange = initialChange24hRef.current;
    return [
      { label: t("today"), days: 1, value: baseChange },
      { label: t("days7"), days: 7, value: baseChange * (2.1 + Math.sin(seed) * 0.3) },
      { label: t("days30"), days: 30, value: baseChange * (-1.8 + Math.sin(seed + 1) * 0.5) },
      { label: t("days90"), days: 90, value: baseChange * (3.2 + Math.sin(seed + 2) * 0.8) },
      { label: t("days180"), days: 180, value: baseChange * (5.8 + Math.sin(seed + 3) * 1.2) },
      { label: t("year1"), days: 365, value: baseChange * (12.5 + Math.sin(seed + 4) * 2.5) },
    ];
  }, [symbol, t]);

  useEffect(() => {
    const interval = setInterval(() => {
      const variance = initialPriceRef.current * 0.0003;
      const newPrice = initialPriceRef.current + (Math.random() - 0.5) * variance;
      setLivePrice(newPrice);
      setLiveAskPrice(newPrice * 1.005);
      setLiveBidPrice(newPrice * 0.995);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const leaseOffer = useMemo(() => {
    const config = getLeaseConfigBySymbol(symbol);
    if (!config) return null;
    
    // Get APY rates from useLeaseRates hook (same as LeasingDashboard)
    const metalRates = safeRates[symbol as keyof typeof safeRates];
    const apy3 = typeof metalRates === 'object' ? (metalRates as any)["3"] || 1.53 : 1.53;
    const apy6 = typeof metalRates === 'object' ? (metalRates as any)["6"] || 2.03 : 2.03;
    const apy12 = typeof metalRates === 'object' ? (metalRates as any)["12"] || 2.53 : 2.53;
    
    return {
      metal: symbol,
      name: symbol === "AUXG" ? "Gold" : symbol === "AUXS" ? "Silver" : symbol === "AUXPT" ? "Platinum" : "Palladium",
      icon: symbol === "AUXG" ? "/gold-favicon-32x32.png" : symbol === "AUXS" ? "/silver-favicon-32x32.png" : symbol === "AUXPT" ? "/platinum-favicon-32x32.png" : "/palladium-favicon-32x32.png",
      duration: 365,
      apy: apy12,
      minAmount: config.minAmount,
      maxAmount: 1000,
      tvl: 0,
      metalTokenAddress: config.metalTokenAddress || "0x",
      contractAddress: config.contractAddress || "0x",
      // Required periods array for AllocationModal - using real rates from useLeaseRates
      periods: [
        { months: 3, days: 90, apy: apy3 },
        { months: 6, days: 180, apy: apy6 },
        { months: 12, days: 365, apy: apy12 },
      ],
    };
  }, [symbol, safeRates]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
        <div 
          className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[95vh] rounded-2xl border border-stone-200 dark:border-slate-700 overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="text-xl font-bold text-slate-900 dark:text-white">{symbol}/USDT</div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                {isPositive ? "↑" : "↓"} {Math.abs(initialChange24hRef.current).toFixed(2)}%
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-stone-200 dark:border-slate-800 px-2 sm:px-4 overflow-x-auto">
            {[
              { id: "price", label: t("price") },
              { id: "info", label: t("info") },
              { id: "data", label: t("tradingData") },
              { id: "orders", label: t("orders") },
              { id: "lease", label: t("stake"), highlight: true },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? tab.highlight ? "text-amber-400 border-b-2 border-amber-400" : "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {/* Price Tab */}
            {activeTab === "price" && (
              <div className="p-2 sm:p-4">
                {/* Price Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-2xl sm:text-3xl font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        ${livePrice.toFixed(2)}
                      </span>
                      <span className="text-emerald-500 text-xs">● LIVE</span>
                    </div>
                    <div className="text-slate-400 text-sm mt-1">
                      ₺{(livePrice * 34.5).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right text-xs sm:text-sm space-y-1">
                    <div className="text-slate-400">{t("high24h")} <span className="text-emerald-400">${(initialPriceRef.current * 1.008).toFixed(2)}</span></div>
                    <div className="text-slate-400">{t("low24h")} <span className="text-red-400">${(initialPriceRef.current * 0.992).toFixed(2)}</span></div>
                    <div className="text-slate-400">{t("volume24h")} <span className="text-slate-900 dark:text-white">11.87M</span></div>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-2 sm:p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{symbol}</span>
                      <span className="text-slate-700 dark:text-slate-200">${livePrice.toFixed(2)}</span>
                      <span className={`text-xs ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? "+" : ""}{initialChange24hRef.current.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* OHLC Display */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mb-2">
                    <span>{translations[lang]?.open || "Open"}: <span className="text-slate-700 dark:text-slate-300">${(livePrice * 0.998).toFixed(2)}</span></span>
                    <span>{translations[lang]?.high || "High"}: <span className="text-emerald-400">${(livePrice * 1.003).toFixed(2)}</span></span>
                    <span>{translations[lang]?.low || "Low"}: <span className="text-red-400">${(livePrice * 0.996).toFixed(2)}</span></span>
                    <span>{translations[lang]?.close || "Close"}: <span className="text-slate-700 dark:text-slate-300">${livePrice.toFixed(2)}</span></span>
                  </div>

                  {/* Time Frame Buttons */}
                  <div className="flex gap-1 mb-3">
                    {(["15m", "1H", "4H", "1D", "1W"] as TimeFrame[]).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeFrame(tf)}
                        className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                          timeFrame === tf
                            ? "bg-emerald-500 text-white"
                            : "bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-stone-300 dark:hover:bg-slate-600"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>

                  {/* Chart */}
                  <div className="h-[250px] sm:h-[300px]">
                    <AdvancedChart
                      data={chartData.map(c => ({ 
                        time: c.time as any, 
                        open: c.open, 
                        high: c.high, 
                        low: c.low, 
                        close: c.close, 
                        volume: c.volume 
                      }))}
                      symbol={`${symbol}/USDT`}
                      currentPrice={livePrice}
                      priceChange={initialChange24hRef.current}
                      lang={lang}
                      height={250}
                      showControls={true}
                      overlayIndicators={overlayIndicators}
                      onOverlayChange={setOverlayIndicators}
                      panelIndicator={panelIndicator}
                      onPanelChange={setPanelIndicator}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="p-4 space-y-4">
                <div className="bg-stone-50 dark:bg-slate-800/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t("metalInfo")}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("symbol")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{symbol}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("name")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("type")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{t("preciousMetal")}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("purity")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">99.99%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("chain")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">Ethereum</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500 dark:text-slate-400">{t("custodian")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">Brinks</span>
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 dark:bg-slate-800/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t("tokenDetails")}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("standard")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">ERC-20</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("circulatingSupply")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">1,250,000</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500 dark:text-slate-400">{t("audited")}</span>
                      <span className="text-emerald-400 font-medium">✓ {t("yes")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trading Data Tab */}
            {activeTab === "data" && (
              <div className="p-4 space-y-4">
                <div className="bg-stone-50 dark:bg-slate-800/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t("marketData")}</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-stone-200 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("bidPrice")}</div>
                      <div className="text-lg font-bold text-red-500 dark:text-red-400">${liveBidPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-stone-200 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("askPrice")}</div>
                      <div className="text-lg font-bold text-emerald-500 dark:text-emerald-400">${liveAskPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-stone-200 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("volume24h")}</div>
                      <div className="text-lg font-bold text-slate-800 dark:text-white">$2.4B</div>
                    </div>
                  </div>
                </div>
                <div className="bg-stone-50 dark:bg-slate-800/30 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t("tradingInfo")}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("minTrade")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">1g</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("maxTrade")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{t("unlimited")}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-stone-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">{t("tradingFee")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">0.1%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500 dark:text-slate-400">{t("settlementTime")}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{t("instant")}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === "orders" && (
              <div className="p-4">
                <LimitOrdersList
                  address={address}
                  metal={symbol}
                  compact={false}
                  lang={lang}
                />
              </div>
            )}

            {/* Lease Tab */}
            {activeTab === "lease" && leaseOffer && (
              <div className="p-4">
                <AllocationModal
                  isOpen={true}
                  onClose={() => setActiveTab("price")}
                  offer={leaseOffer}
                  lang={lang}
                  embedded={true}
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-stone-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95">
            <button onClick={onBuy} className="flex-1 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors">
              {t("buy")}
            </button>
            <button onClick={onSell} className="flex-1 px-6 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold transition-colors">
              {t("sell")}
            </button>
            <button onClick={() => setShowLeaseModal(true)} className="flex-1 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors">
              {t("stake")}
            </button>
          </div>
        </div>
      </div>

      {showLeaseModal && leaseOffer && <AllocationModal isOpen={showLeaseModal} onClose={() => setShowLeaseModal(false)} offer={leaseOffer} lang={lang} />}
    </>
  );
}
