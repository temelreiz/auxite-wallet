"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";

const AdvancedChart = dynamic(() => import("./AdvancedChart"), { ssr: false });
import type { MetalId } from "@/lib/metals";
import { AllocationModal } from "./AllocationModal";
import { getLeaseConfigBySymbol } from "@/lib/leaseRatesConfig";
import { LimitOrdersList } from "./LimitOrdersList";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";

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

// Metal icon paths
const METAL_ICONS: Record<string, string> = {
  AUXG: "/images/metals/gold.svg",
  AUXS: "/images/metals/silver.svg",
  AUXPT: "/images/metals/platinum.svg",
  AUXPD: "/images/metals/palladium.svg",
};

const metalBgColors: Record<string, string> = {
  AUXG: "bg-[#BFA181]/20",
  AUXS: "bg-slate-400/20",
  AUXPT: "bg-slate-300/20",
  AUXPD: "bg-zinc-400/20",
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
  chartData?: any[];
  lang?: string;
}

export default function TradingDetailPage({
  metalId, symbol, name, currentPrice, askPrice, bidPrice, change24h, direction,
  onClose, onBuy, onSell, chartData: propChartData, lang: propLang,
}: TradingDetailPageProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const { address } = useWallet();
  
  const safeRates = { 
    sofr: 3.66, 
    AUXG: { "3": 1.53, "6": 2.03, "12": 2.53 }, 
    AUXS: { "3": 1.23, "6": 1.73, "12": 2.23 }, 
    AUXPT: { "3": 2.03, "6": 2.53, "12": 3.03 }, 
    AUXPD: { "3": 1.83, "6": 2.33, "12": 2.83 } 
  };
  
  const t = useCallback((key: string) => translations[lang]?.[key] || translations.en[key] || key, [lang]);
  
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data" | "orders" | "lease">("price");
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeFrame>("4H");
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>([]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>(null);
  
  const leaseConfig = useMemo(() => getLeaseConfigBySymbol(symbol), [symbol]);
  const leaseOffer = useMemo(() => {
    if (!leaseConfig) return null;
    
    const metalTokenAddresses: Record<string, string> = {
      AUXG: "0x...",
      AUXS: "0x...",
      AUXPT: "0x...",
      AUXPD: "0x...",
    };
    
    const rates = safeRates[symbol as keyof typeof safeRates];
    const periods = typeof rates === 'object' && rates !== null ? [
      { months: 3, days: 90, apy: (rates as any)["3"] || 1.5 },
      { months: 6, days: 180, apy: (rates as any)["6"] || 2.0 },
      { months: 12, days: 365, apy: (rates as any)["12"] || 2.5 },
    ] : [
      { months: 3, days: 90, apy: 1.5 },
      { months: 6, days: 180, apy: 2.0 },
      { months: 12, days: 365, apy: 2.5 },
    ];
    
    return {
      metal: symbol,
      name: name,
      icon: METAL_ICONS[symbol] || "/auxg_icon.png",
      metalTokenAddress: metalTokenAddresses[symbol] || "0x...",
      periods: periods,
      minAmount: 1,
      maxAmount: 1000000,
      tvl: 0,
      contractAddress: "0x...",
    };
  }, [leaseConfig, symbol, name, safeRates]);

  const spreadPercent = 1.5;
  const liveAskPrice = askPrice || currentPrice * (1 + spreadPercent / 100);
  const liveBidPrice = bidPrice || currentPrice * (1 - spreadPercent / 100);
  
  const isPositive = change24h >= 0;
  
  const high24h = currentPrice * 1.012;
  const low24h = currentPrice * 0.988;

  const metalIcon = METAL_ICONS[symbol];
  const metalBg = metalBgColors[symbol] || "bg-[#BFA181]/20";

  const tabs = [
    { id: "price", label: t("price") },
    { id: "info", label: t("info") },
    { id: "data", label: t("tradingData") },
    { id: "orders", label: t("orders") },
    { id: "lease", label: t("stake") },
  ];

  const handleTimeframeChange = useCallback((tf: TimeFrame) => {
    setTimeframe(tf);
  }, []);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col border border-stone-200 dark:border-slate-800 overflow-hidden">
          {/* Header with Metal Icon */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-stone-200 dark:border-slate-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden ${metalBg}`}>
                {metalIcon ? (
                  <Image src={metalIcon} alt={symbol} width={28} height={28} className="object-contain" />
                ) : (
                  <span className="font-bold text-xs sm:text-sm">{symbol.replace("AUX", "")}</span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">{symbol}/USDT</span>
                  <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded ${isPositive ? "bg-[#2F6F62]/20 text-[#2F6F62]" : "bg-red-500/20 text-red-500"}`}>
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
                    ? "text-[#2F6F62] border-b-2 border-[#2F6F62]"
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
                {/* Price Header - NO TL */}
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div>
                    <div className="flex items-baseline gap-1 sm:gap-2">
                      <span className={`text-xl sm:text-2xl font-bold ${isPositive ? "text-[#2F6F62]" : "text-red-500"}`}>
                        ${currentPrice.toFixed(2)}
                      </span>
                      <span className="text-[#2F6F62] text-xs sm:text-sm font-medium animate-pulse">● LIVE</span>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5 sm:space-y-1">
                    <div className="text-[10px] sm:text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{t("high24h")} </span>
                      <span className="text-[#2F6F62] font-medium">${high24h.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{t("low24h")} </span>
                      <span className="text-red-500 font-medium">${low24h.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] sm:text-xs">
                      <span className="text-slate-500 dark:text-slate-400">{t("volume24h")} </span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">11.87M</span>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-[250px] sm:h-[300px] md:h-[350px]">
                  <AdvancedChart
                    data={propChartData || []}
                    symbol={symbol}
                    currentPrice={currentPrice}
                    priceChange={change24h}
                    lang={lang}
                    height={300}
                    timeframe={timeframe}
                    onTimeframeChange={handleTimeframeChange}
                    overlayIndicators={overlayIndicators}
                    onOverlayChange={setOverlayIndicators}
                    panelIndicator={panelIndicator}
                    onPanelChange={setPanelIndicator}
                    showControls={true}
                    showHeader={false}
                    embedded={true}
                    metalIcon={metalIcon}
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
                      <span className="text-[#2F6F62] font-medium">✓ {t("yes")}</span>
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
                      <div className="text-lg font-bold text-[#2F6F62]">${liveAskPrice.toFixed(2)}</div>
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
                  lang={lang as "tr" | "en" | "de" | "fr" | "ar" | "ru"}
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
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 sm:py-3 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <button onClick={onBuy} className="flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-semibold text-sm sm:text-base transition-colors">
              {t("buy")}
            </button>
            <button onClick={onSell} className="flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-sm sm:text-base transition-colors">
              {t("sell")}
            </button>
            <button onClick={() => setShowLeaseModal(true)} className="flex-1 px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-semibold text-sm sm:text-base transition-colors">
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
        />
      )}
    </>
  );
}
