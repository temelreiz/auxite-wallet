"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useCryptoChart, CandleData } from "@/hooks/useCryptoChart";
import { CryptoConvertModal } from "./CryptoConvertModal";
import { useLanguage } from "@/components/LanguageContext";

const AdvancedChart = dynamic(() => import("./AdvancedChart"), { ssr: false });

interface CryptoTradingDetailPageProps {
  cryptoId: "ETH" | "BTC" | "XRP" | "SOL";
  onClose: () => void;
  lang?: string;
  cryptoBalances?: { ETH: number; BTC: number; XRP: number; SOL: number };
  metalBidPrices?: { AUXG: number; AUXS: number; AUXPT: number; AUXPD: number };
}

type TimeFrame = "15m" | "1H" | "4H" | "1D" | "1W";
type OverlayIndicator = "MA" | "EMA" | "BOLL" | "SAR";
type PanelIndicator = "VOL" | "RSI" | "MACD" | "AVL";

const translations: Record<string, Record<string, string>> = {
  tr: { price: "Fiyat", info: "Bilgi", market: "Piyasa", convert: "Dönüştür", cryptoInfo: "Kripto Bilgileri", symbol: "Sembol", name: "Ad", type: "Tür", consensus: "Konsensüs", network: "Ağ", marketData: "Piyasa Verileri", bidPrice: "Alış Fiyatı", askPrice: "Satış Fiyatı", volume24h: "24s Hacim", live: "CANLI" },
  en: { price: "Price", info: "Info", market: "Market", convert: "Convert", cryptoInfo: "Crypto Information", symbol: "Symbol", name: "Name", type: "Type", consensus: "Consensus", network: "Network", marketData: "Market Data", bidPrice: "Bid Price", askPrice: "Ask Price", volume24h: "24h Volume", live: "LIVE" },
  de: { price: "Preis", info: "Info", market: "Markt", convert: "Konvertieren", cryptoInfo: "Krypto-Informationen", symbol: "Symbol", name: "Name", type: "Typ", consensus: "Konsens", network: "Netzwerk", marketData: "Marktdaten", bidPrice: "Geldkurs", askPrice: "Briefkurs", volume24h: "24h Volumen", live: "LIVE" },
  fr: { price: "Prix", info: "Info", market: "Marché", convert: "Convertir", cryptoInfo: "Informations Crypto", symbol: "Symbole", name: "Nom", type: "Type", consensus: "Consensus", network: "Réseau", marketData: "Données du Marché", bidPrice: "Prix Achat", askPrice: "Prix Vente", volume24h: "Volume 24h", live: "EN DIRECT" },
  ar: { price: "السعر", info: "معلومات", market: "السوق", convert: "تحويل", cryptoInfo: "معلومات العملة المشفرة", symbol: "الرمز", name: "الاسم", type: "النوع", consensus: "الإجماع", network: "الشبكة", marketData: "بيانات السوق", bidPrice: "سعر الشراء", askPrice: "سعر البيع", volume24h: "حجم 24س", live: "مباشر" },
  ru: { price: "Цена", info: "Инфо", market: "Рынок", convert: "Конвертировать", cryptoInfo: "Информация о криптовалюте", symbol: "Символ", name: "Название", type: "Тип", consensus: "Консенсус", network: "Сеть", marketData: "Рыночные Данные", bidPrice: "Цена покупки", askPrice: "Цена продажи", volume24h: "Объём 24ч", live: "LIVE" },
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

export default function CryptoTradingDetailPage({
  cryptoId, onClose, lang: propLang,
  cryptoBalances = { ETH: 0, BTC: 0, XRP: 0, SOL: 0 },
  metalBidPrices = { AUXG: 134.69, AUXS: 1.82, AUXPT: 52.92, AUXPD: 45.57 },
}: CryptoTradingDetailPageProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;
  
  const { prices, changes } = useCryptoPrices();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("4H");
  const [activeTab, setActiveTab] = useState<"price" | "info" | "data">("price");
  const [overlayIndicators, setOverlayIndicators] = useState<OverlayIndicator[]>(["MA"]);
  const [panelIndicator, setPanelIndicator] = useState<PanelIndicator | null>("RSI");
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Map timeframe for API
  const apiTimeFrame = useMemo(() => {
    const mapping: Record<TimeFrame, string> = { "15m": "15m", "1H": "1h", "4H": "4h", "1D": "1D", "1W": "1W" };
    return mapping[timeFrame] || "4h";
  }, [timeFrame]);

  const { candles, loading: chartLoading, error: chartError, refresh: refreshChart } = useCryptoChart({
    symbol: cryptoId,
    interval: apiTimeFrame as any,
    limit: 100,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  const cryptoInfo = CRYPTO_INFO[cryptoId];
  const cryptoDetails = CRYPTO_DETAILS[cryptoId];

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

  const currentPrice = getBasePrice();
  const change24h = getChange24h();
  const isPositive = change24h >= 0;

  const askPrice = currentPrice * 1.01;
  const bidPrice = currentPrice * 0.995;

  const chartData = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    return candles.map((c: CandleData) => ({
      time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
    }));
  }, [candles]);

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

  const volume24h = useMemo(() => {
    if (!candles || candles.length === 0) return 0;
    return candles.slice(-24).reduce((sum, c) => sum + c.volume * c.close, 0);
  }, [candles]);

  const cryptoPrices = { ETH: prices.eth, BTC: prices.btc, XRP: prices.xrp, SOL: prices.sol };

  const tabs = [
    { id: "price", label: t.price },
    { id: "info", label: t.info },
    { id: "data", label: t.market },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 dark:bg-black/80 flex items-end justify-center sm:items-center">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col border border-stone-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-lg" style={{ backgroundColor: cryptoInfo.color }}>
              {cryptoInfo.icon}
            </div>
            <div>
              <div className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white">{cryptoId}/USDT</div>
              <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{cryptoInfo.name}</div>
            </div>
            <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded ${isPositive ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(change24h).toFixed(2)}%
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-purple-500 border-b-2 border-purple-500"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1">
          {activeTab === "price" && (
            <div className="p-2">
              {chartLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-slate-600 border-t-purple-500 rounded-full" />
                </div>
              ) : chartError ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-red-500 text-sm">
                  <p>{chartError}</p>
                  <button onClick={refreshChart} className="mt-2 text-purple-500 underline">Retry</button>
                </div>
              ) : (
                <AdvancedChart
                  data={chartData}
                  symbol={`${cryptoId}/USDT`}
                  currentPrice={currentPrice}
                  priceChange={change24h}
                  lang={lang}
                  height={250}
                  timeframe={timeFrame}
                  onTimeframeChange={setTimeFrame}
                  overlayIndicators={overlayIndicators}
                  onOverlayChange={setOverlayIndicators}
                  panelIndicator={panelIndicator}
                  onPanelChange={setPanelIndicator}
                  showControls={true}
                  showHeader={true}
                />
              )}
            </div>
          )}

          {activeTab === "info" && (
            <div className="px-4 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.cryptoInfo}</h3>
              <div className="space-y-2 text-sm">
                {[
                  [t.symbol, cryptoId],
                  [t.name, cryptoInfo.name],
                  [t.type, cryptoDetails.type],
                  [t.consensus, cryptoDetails.consensus],
                  [t.network, cryptoDetails.network],
                ].map(([label, value], i, arr) => (
                  <div key={label} className={`flex justify-between py-2 ${i < arr.length - 1 ? "border-b border-stone-200 dark:border-slate-800" : ""}`}>
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="px-4 py-4 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">{t.marketData}</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.bidPrice}</div>
                  <div className="text-lg font-bold text-emerald-500">${formatPrice(bidPrice)}</div>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.askPrice}</div>
                  <div className="text-lg font-bold text-red-500">${formatPrice(askPrice)}</div>
                </div>
                <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.volume24h}</div>
                  <div className="text-lg font-bold text-blue-500">{formatVolume(volume24h)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Button */}
        <div className="px-2 sm:px-4 py-2 sm:py-3 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            onClick={() => setShowConvertModal(true)}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {t.convert}
          </button>
        </div>
      </div>

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
