"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";

const AdvancedChart = dynamic(() => import("./AdvancedChart"), { ssr: false });
import type { MetalId } from "@/lib/metals";
import { AllocationModal } from "./AllocationModal";
import { getLeaseConfigBySymbol } from "@/lib/leaseRatesConfig";
import { LimitOrdersList } from "./LimitOrdersList";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    today: "Bugün", days7: "7 Gün", days30: "30 Gün", days90: "90 Gün", days180: "180 Gün", year1: "1 Yıl",
    price: "Fiyat", info: "Bilgiler", tradingData: "İşlem Verileri", orders: "Emirler", stake: "Biriktir",
    metalInfo: "Metal Bilgileri", symbol: "Sembol", name: "Ad", type: "Tür", preciousMetal: "Değerli Metal",
    purity: "Saflık", chain: "Zincir", custodian: "Saklama", tokenDetails: "Token Detayları",
    standard: "Standart", circulatingSupply: "Dolaşımdaki Arz", audited: "Denetlenmiş", yes: "Evet",
    marketData: "Piyasa Verileri", bidPrice: "Alış Fiyatı", askPrice: "Satış Fiyatı", volume24h: "24s Hacim",
    tradingInfo: "İşlem Bilgileri", minTrade: "Min. İşlem", maxTrade: "Maks. İşlem", unlimited: "Sınırsız",
    tradingFee: "İşlem Ücreti", settlementTime: "Teslimat Süresi", instant: "Anlık",
    buy: "Al", sell: "Sat", high24h: "24s Yüksek", low24h: "24s Düşük", performance: "Performans",
  },
  en: {
    today: "Today", days7: "7 Days", days30: "30 Days", days90: "90 Days", days180: "180 Days", year1: "1 Year",
    price: "Price", info: "Info", tradingData: "Trading Data", orders: "Orders", stake: "Stake",
    metalInfo: "Metal Information", symbol: "Symbol", name: "Name", type: "Type", preciousMetal: "Precious Metal",
    purity: "Purity", chain: "Chain", custodian: "Custodian", tokenDetails: "Token Details",
    standard: "Standard", circulatingSupply: "Circulating Supply", audited: "Audited", yes: "Yes",
    marketData: "Market Data", bidPrice: "Bid Price", askPrice: "Ask Price", volume24h: "24h Volume",
    tradingInfo: "Trading Information", minTrade: "Min. Trade", maxTrade: "Max. Trade", unlimited: "Unlimited",
    tradingFee: "Trading Fee", settlementTime: "Settlement Time", instant: "Instant",
    buy: "Buy", sell: "Sell", high24h: "24h High", low24h: "24h Low", performance: "Performance",
  },
  de: {
    today: "Heute", days7: "7 Tage", days30: "30 Tage", days90: "90 Tage", days180: "180 Tage", year1: "1 Jahr",
    price: "Preis", info: "Info", tradingData: "Handelsdaten", orders: "Aufträge", stake: "Stake",
    metalInfo: "Metallinformationen", symbol: "Symbol", name: "Name", type: "Typ", preciousMetal: "Edelmetall",
    purity: "Reinheit", chain: "Blockchain", custodian: "Verwahrer", tokenDetails: "Token-Details",
    standard: "Standard", circulatingSupply: "Umlaufende Menge", audited: "Geprüft", yes: "Ja",
    marketData: "Marktdaten", bidPrice: "Geldkurs", askPrice: "Briefkurs", volume24h: "24h Volumen",
    tradingInfo: "Handelsinformationen", minTrade: "Min. Handel", maxTrade: "Max. Handel", unlimited: "Unbegrenzt",
    tradingFee: "Handelsgebühr", settlementTime: "Abwicklungszeit", instant: "Sofort",
    buy: "Kaufen", sell: "Verkaufen", high24h: "24h Hoch", low24h: "24h Tief", performance: "Leistung",
  },
  fr: {
    today: "Aujourd'hui", days7: "7 Jours", days30: "30 Jours", days90: "90 Jours", days180: "180 Jours", year1: "1 An",
    price: "Prix", info: "Info", tradingData: "Données de Trading", orders: "Ordres", stake: "Stake",
    metalInfo: "Informations Métal", symbol: "Symbole", name: "Nom", type: "Type", preciousMetal: "Métal Précieux",
    purity: "Pureté", chain: "Chaîne", custodian: "Dépositaire", tokenDetails: "Détails du Token",
    standard: "Standard", circulatingSupply: "Offre en Circulation", audited: "Audité", yes: "Oui",
    marketData: "Données de Marché", bidPrice: "Prix d'Achat", askPrice: "Prix de Vente", volume24h: "Volume 24h",
    tradingInfo: "Informations de Trading", minTrade: "Min. Trade", maxTrade: "Max. Trade", unlimited: "Illimité",
    tradingFee: "Frais de Trading", settlementTime: "Temps de Règlement", instant: "Instantané",
    buy: "Acheter", sell: "Vendre", high24h: "24h Haut", low24h: "24h Bas", performance: "Performance",
  },
  ar: {
    today: "اليوم", days7: "7 أيام", days30: "30 يوم", days90: "90 يوم", days180: "180 يوم", year1: "سنة",
    price: "السعر", info: "معلومات", tradingData: "بيانات التداول", orders: "الأوامر", stake: "التوفير",
    metalInfo: "معلومات المعدن", symbol: "الرمز", name: "الاسم", type: "النوع", preciousMetal: "معدن ثمين",
    purity: "النقاء", chain: "السلسلة", custodian: "الحافظ", tokenDetails: "تفاصيل التوكن",
    standard: "المعيار", circulatingSupply: "العرض المتداول", audited: "مدقق", yes: "نعم",
    marketData: "بيانات السوق", bidPrice: "سعر الشراء", askPrice: "سعر البيع", volume24h: "حجم 24س",
    tradingInfo: "معلومات التداول", minTrade: "أدنى تداول", maxTrade: "أقصى تداول", unlimited: "غير محدود",
    tradingFee: "رسوم التداول", settlementTime: "وقت التسوية", instant: "فوري",
    buy: "شراء", sell: "بيع", high24h: "أعلى 24س", low24h: "أدنى 24س", performance: "الأداء",
  },
  ru: {
    today: "Сегодня", days7: "7 дней", days30: "30 дней", days90: "90 дней", days180: "180 дней", year1: "1 год",
    price: "Цена", info: "Инфо", tradingData: "Торговые данные", orders: "Ордера", stake: "Стейкинг",
    metalInfo: "Информация о металле", symbol: "Символ", name: "Название", type: "Тип", preciousMetal: "Драгоценный металл",
    purity: "Чистота", chain: "Сеть", custodian: "Хранитель", tokenDetails: "Детали токена",
    standard: "Стандарт", circulatingSupply: "В обращении", audited: "Проверено", yes: "Да",
    marketData: "Рыночные данные", bidPrice: "Цена покупки", askPrice: "Цена продажи", volume24h: "Объём 24ч",
    tradingInfo: "Торговая информация", minTrade: "Мин. сделка", maxTrade: "Макс. сделка", unlimited: "Без лимита",
    tradingFee: "Комиссия", settlementTime: "Время расчёта", instant: "Мгновенно",
    buy: "Купить", sell: "Продать", high24h: "Макс 24ч", low24h: "Мин 24ч", performance: "Производительность",
  },
};

// Metal colors for icons
const metalColors: Record<string, { bg: string; text: string }> = {
  AUXG: { bg: "bg-gradient-to-br from-yellow-400 to-amber-600", text: "text-amber-900" },
  AUXS: { bg: "bg-gradient-to-br from-gray-300 to-slate-400", text: "text-slate-700" },
  AUXPT: { bg: "bg-gradient-to-br from-slate-200 to-slate-400", text: "text-slate-600" },
  AUXPD: { bg: "bg-gradient-to-br from-zinc-300 to-zinc-500", text: "text-zinc-700" },
};

type TimeFrame = "15m" | "1H" | "4H" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL" | "SAR";
type PanelIndicator = "VOL" | "RSI" | "MACD" | "AVL";

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
  chartData?: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  lang?: string;
}

export default function TradingDetailPage({
  metalId, symbol, name, currentPrice, askPrice, bidPrice, change24h, direction,
  onClose, onBuy, onSell, chartData: propChartData, lang: propLang,
}: TradingDetailPageProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const { address } = useWallet();
  
  // Default rates
  const safeRates = { 
    sofr: 3.66, 
    AUXG: { "3": 1.53, "6": 2.03, "12": 2.53 }, 
    AUXS: { "3": 1.23, "6": 1.73, "12": 2.23 }, 
    AUXPT: { "3": 2.03, "6": 2.53, "12": 3.03 }, 
    AUXPD: { "3": 1.83, "6": 2.33, "12": 2.83 } 
  };
  
  const t = useCallback((key: string) => translations[lang]?.[key] || translations.en[key] || key, [lang]);
  
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data" | "orders" | "lease">("price");
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("4H");
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>(["MA"]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>("RSI");
  const [showLeaseModal, setShowLeaseModal] = useState(false);

  // Price simulation - use currentPrice prop
  const initialPriceRef = useRef(currentPrice);
  const initialChange24hRef = useRef(change24h ?? 0);
  const [livePrice, setLivePrice] = useState(currentPrice);
  const isPositive = direction === "up" || (change24h ?? 0) >= 0;

  // Sync livePrice when currentPrice prop changes
  useEffect(() => {
    if (currentPrice && currentPrice > 0) {
      setLivePrice(currentPrice);
      initialPriceRef.current = currentPrice;
    }
  }, [currentPrice]);

  useEffect(() => {
    if (!livePrice || livePrice <= 0) return;
    const interval = setInterval(() => {
      setLivePrice(prev => {
        const change = (Math.random() - 0.5) * 0.1;
        return Math.max(prev * 0.95, Math.min(prev * 1.05, prev + change));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [livePrice]);

  // Chart data
  const chartData = useMemo(() => {
    if (propChartData && propChartData.length > 0) return propChartData;
    const data = [];
    const now = Math.floor(Date.now() / 1000);
    let basePrice = initialPriceRef.current || currentPrice || 1;
    for (let i = 100; i >= 0; i--) {
      const time = now - i * 3600;
      const change = (Math.random() - 0.5) * basePrice * 0.02;
      const open = basePrice;
      const close = basePrice + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000000;
      data.push({ time, open, high, low, close, volume });
      basePrice = close;
    }
    return data;
  }, [propChartData, currentPrice]);

  // Lease config
  const leaseConfig = getLeaseConfigBySymbol(symbol);
  const leaseOffer = useMemo(() => {
    if (!leaseConfig) return null;
    
    // Get APY rates
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
      minAmount: leaseConfig.minAmount,
      maxAmount: 1000,
      tvl: 0,
      metalTokenAddress: leaseConfig.metalTokenAddress || "0x",
      contractAddress: leaseConfig.contractAddress || "0x",
      periods: [
        { months: 3, days: 90, apy: apy3 },
        { months: 6, days: 180, apy: apy6 },
        { months: 12, days: 365, apy: apy12 },
      ],
    };
  }, [symbol, leaseConfig]);

  // Bid/Ask prices - use props if available, otherwise calculate
  const liveBidPrice = bidPrice || (livePrice || 0) * 0.995;
  const liveAskPrice = askPrice || (livePrice || 0) * 1.005;

  const tabs = [
    { id: "price", label: t("price") },
    { id: "info", label: t("info") },
    { id: "data", label: t("tradingData") },
    { id: "orders", label: t("orders") },
    { id: "lease", label: t("stake") },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col border border-stone-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-stone-200 dark:border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm ${metalColors[symbol]?.bg || "bg-gradient-to-br from-yellow-400 to-amber-600"} ${metalColors[symbol]?.text || "text-amber-900"}`}>
                {symbol.replace("AUX", "")}
              </div>
              <div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">{symbol}/USDT</span>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"}`}>
                    {isPositive ? "↑" : "↓"} {Math.abs(change24h ?? 0).toFixed(2)}%
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{name}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-stone-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "text-emerald-500 border-b-2 border-emerald-500"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
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
              <div className="p-2 sm:p-3 md:p-4">
                {/* Price Header */}
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className={`text-xl sm:text-2xl md:text-3xl font-bold ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                        ${(livePrice || 0).toFixed(2)}
                      </span>
                      <span className="text-emerald-500 text-[10px] sm:text-xs">● LIVE</span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5 sm:mt-1">
                      ₺{((livePrice || 0) * 34.5).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="text-right text-[10px] sm:text-xs md:text-sm space-y-0.5 sm:space-y-1">
                    <div className="text-slate-500 dark:text-slate-400">{t("high24h")} <span className="text-emerald-500">${((initialPriceRef.current || 0) * 1.008).toFixed(2)}</span></div>
                    <div className="text-slate-500 dark:text-slate-400">{t("low24h")} <span className="text-red-500">${((initialPriceRef.current || 0) * 0.992).toFixed(2)}</span></div>
                    <div className="text-slate-500 dark:text-slate-400">{t("volume24h")} <span className="text-slate-900 dark:text-white">11.87M</span></div>
                  </div>
                </div>

                {/* Chart */}
                <div className="rounded-xl overflow-hidden">
                  <AdvancedChart
                    data={chartData.map(c => ({ 
                      time: c.time as any, 
                      open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume 
                    }))}
                    symbol={`${symbol}/USDT`}
                    currentPrice={livePrice || 0}
                    priceChange={initialChange24hRef.current}
                    lang={lang}
                    height={250}
                    timeframe={timeFrame}
                    onTimeframeChange={setTimeFrame}
                    overlayIndicators={overlayIndicators}
                    onOverlayChange={setOverlayIndicators}
                    panelIndicator={panelIndicator}
                    onPanelChange={setPanelIndicator}
                    showControls={true}
                    showHeader={false}
                  />
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
                      <span className="text-emerald-500 font-medium">✓ {t("yes")}</span>
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
                      <div className="text-lg font-bold text-red-500">${liveBidPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-center p-3 bg-stone-200 dark:bg-slate-800/50 rounded-lg">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("askPrice")}</div>
                      <div className="text-lg font-bold text-emerald-500">${liveAskPrice.toFixed(2)}</div>
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
                  address={address || undefined}
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
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button onClick={onBuy} className="flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm sm:text-base transition-colors">
              {t("buy")}
            </button>
            <button onClick={onSell} className="flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-sm sm:text-base transition-colors">
              {t("sell")}
            </button>
            <button onClick={() => setShowLeaseModal(true)} className="flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm sm:text-base transition-colors">
              {t("stake")}
            </button>
          </div>
        </div>
      </div>

      {showLeaseModal && leaseOffer && (
        <AllocationModal
          isOpen={showLeaseModal}
          onClose={() => setShowLeaseModal(false)}
          offer={leaseOffer}
          lang={lang}
        />
      )}
    </>
  );
}
