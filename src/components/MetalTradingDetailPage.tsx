"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/LanguageContext";

// AdvancedChart'ı client-side only yükle
const AdvancedChart = dynamic(() => import("./AdvancedChart"), { ssr: false });

interface MetalTradingDetailPageProps {
  isOpen: boolean;
  onClose: () => void;
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  metalName: string;
  currentPrice: number;
  bidPrice?: number;
  change24h: number;
  lang?: string;
  userBalance?: {
    auxm: number;
    bonusAuxm: number;
    metals: Record<string, number>;
  };
}

const METAL_INFO: Record<string, { name: string; nameTr: string; nameDE: string; nameFR: string; nameAR: string; nameRU: string; pair: string; icon: string; color: string }> = {
  AUXG: { name: "Gold", nameTr: "Altın", nameDE: "Gold", nameFR: "Or", nameAR: "ذهب", nameRU: "Золото", pair: "AUXG/USD", icon: "🥇", color: "#FFD700" },
  AUXS: { name: "Silver", nameTr: "Gümüş", nameDE: "Silber", nameFR: "Argent", nameAR: "فضة", nameRU: "Серебро", pair: "AUXS/USD", icon: "🥈", color: "#C0C0C0" },
  AUXPT: { name: "Platinum", nameTr: "Platin", nameDE: "Platin", nameFR: "Platine", nameAR: "بلاتين", nameRU: "Платина", pair: "AUXPT/USD", icon: "⚪", color: "#E5E4E2" },
  AUXPD: { name: "Palladium", nameTr: "Paladyum", nameDE: "Palladium", nameFR: "Palladium", nameAR: "بالاديوم", nameRU: "Палладий", pair: "AUXPD/USD", icon: "🔘", color: "#CED0DD" },
};

// Helper function for metal name by language
const getMetalName = (metal: string, lang: string): string => {
  const info = METAL_INFO[metal];
  if (!info) return metal;
  
  switch (lang) {
    case "tr": return info.nameTr;
    case "de": return info.nameDE;
    case "fr": return info.nameFR;
    case "ar": return info.nameAR;
    case "ru": return info.nameRU;
    default: return info.name;
  }
};

const SPREAD = { buy: 0.01, sell: 0.01 };

function generateCandleData(basePrice: number, days: number = 90) {
  const data = [];
  let price = basePrice * 0.92;
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;

  for (let i = days; i >= 0; i--) {
    const volatility = basePrice * 0.015;
    const change = (Math.random() - 0.48) * volatility;
    price = Math.max(price + change, basePrice * 0.8);
    
    const open = price;
    const close = price + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;
    const volume = Math.floor(Math.random() * 500000) + 50000;

    data.push({
      time: now - (i * dayInSeconds),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    price = close;
  }

  // Son fiyatı currentPrice'a yaklaştır
  if (data.length > 0) {
    const lastCandle = data[data.length - 1];
    const adjustment = basePrice - lastCandle.close;
    data.forEach((d, i) => {
      const factor = i / data.length;
      d.open += adjustment * factor;
      d.high += adjustment * factor;
      d.low += adjustment * factor;
      d.close += adjustment * factor;
    });
  }

  return data;
}

// 6 Language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    buy: "Al", sell: "Sat", amount: "Miktar", total: "Toplam",
    balance: "Bakiye", fee: "İşlem Ücreti", confirm: "Onayla",
    price: "Fiyat", askPrice: "Alış", bidPrice: "Satış",
    high24: "24s Yüksek", low24: "24s Düşük", volume24: "24s Hacim",
    yourBalance: "Bakiyeniz", available: "Kullanılabilir",
    processing: "İşleniyor...", success: "İşlem Başarılı!",
    error: "İşlem Başarısız", tryAgain: "Tekrar Dene",
    close: "Kapat", marketInfo: "Piyasa Bilgisi",
    spread: "Spread", leverage: "Kaldıraç", minOrder: "Min. İşlem",
    maxOrder: "Max. İşlem", tradingHours: "İşlem Saatleri",
    allDay: "7/24", chart: "Grafik", info: "Bilgi", trades: "İşlemler",
    recentTrades: "Son İşlemler", noTrades: "Henüz işlem yok",
    time: "Zaman", type: "Tip", orderBook: "Emir Defteri",
  },
  en: {
    buy: "Buy", sell: "Sell", amount: "Amount", total: "Total",
    balance: "Balance", fee: "Trading Fee", confirm: "Confirm",
    price: "Price", askPrice: "Ask", bidPrice: "Bid",
    high24: "24h High", low24: "24h Low", volume24: "24h Volume",
    yourBalance: "Your Balance", available: "Available",
    processing: "Processing...", success: "Trade Successful!",
    error: "Trade Failed", tryAgain: "Try Again",
    close: "Close", marketInfo: "Market Info",
    spread: "Spread", leverage: "Leverage", minOrder: "Min. Order",
    maxOrder: "Max. Order", tradingHours: "Trading Hours",
    allDay: "24/7", chart: "Chart", info: "Info", trades: "Trades",
    recentTrades: "Recent Trades", noTrades: "No trades yet",
    time: "Time", type: "Type", orderBook: "Order Book",
  },
  de: {
    buy: "Kaufen", sell: "Verkaufen", amount: "Menge", total: "Gesamt",
    balance: "Guthaben", fee: "Handelsgebühr", confirm: "Bestätigen",
    price: "Preis", askPrice: "Briefkurs", bidPrice: "Geldkurs",
    high24: "24h Hoch", low24: "24h Tief", volume24: "24h Volumen",
    yourBalance: "Ihr Guthaben", available: "Verfügbar",
    processing: "Verarbeitung...", success: "Handel erfolgreich!",
    error: "Handel fehlgeschlagen", tryAgain: "Erneut versuchen",
    close: "Schließen", marketInfo: "Marktinfo",
    spread: "Spread", leverage: "Hebel", minOrder: "Min. Auftrag",
    maxOrder: "Max. Auftrag", tradingHours: "Handelszeiten",
    allDay: "24/7", chart: "Chart", info: "Info", trades: "Trades",
    recentTrades: "Letzte Trades", noTrades: "Noch keine Trades",
    time: "Zeit", type: "Typ", orderBook: "Orderbuch",
  },
  fr: {
    buy: "Acheter", sell: "Vendre", amount: "Montant", total: "Total",
    balance: "Solde", fee: "Frais de trading", confirm: "Confirmer",
    price: "Prix", askPrice: "Demande", bidPrice: "Offre",
    high24: "Haut 24h", low24: "Bas 24h", volume24: "Volume 24h",
    yourBalance: "Votre solde", available: "Disponible",
    processing: "Traitement...", success: "Transaction réussie!",
    error: "Transaction échouée", tryAgain: "Réessayer",
    close: "Fermer", marketInfo: "Info marché",
    spread: "Spread", leverage: "Effet de levier", minOrder: "Ordre min.",
    maxOrder: "Ordre max.", tradingHours: "Heures de trading",
    allDay: "24/7", chart: "Graphique", info: "Info", trades: "Trades",
    recentTrades: "Trades récents", noTrades: "Pas encore de trades",
    time: "Heure", type: "Type", orderBook: "Carnet d'ordres",
  },
  ar: {
    buy: "شراء", sell: "بيع", amount: "الكمية", total: "المجموع",
    balance: "الرصيد", fee: "رسوم التداول", confirm: "تأكيد",
    price: "السعر", askPrice: "الطلب", bidPrice: "العرض",
    high24: "أعلى 24س", low24: "أدنى 24س", volume24: "حجم 24س",
    yourBalance: "رصيدك", available: "متاح",
    processing: "جاري المعالجة...", success: "تمت الصفقة بنجاح!",
    error: "فشلت الصفقة", tryAgain: "حاول مرة أخرى",
    close: "إغلاق", marketInfo: "معلومات السوق",
    spread: "الفارق", leverage: "الرافعة", minOrder: "الحد الأدنى",
    maxOrder: "الحد الأقصى", tradingHours: "ساعات التداول",
    allDay: "24/7", chart: "الرسم البياني", info: "معلومات", trades: "الصفقات",
    recentTrades: "الصفقات الأخيرة", noTrades: "لا توجد صفقات",
    time: "الوقت", type: "النوع", orderBook: "سجل الأوامر",
  },
  ru: {
    buy: "Купить", sell: "Продать", amount: "Сумма", total: "Итого",
    balance: "Баланс", fee: "Комиссия", confirm: "Подтвердить",
    price: "Цена", askPrice: "Аск", bidPrice: "Бид",
    high24: "Макс 24ч", low24: "Мин 24ч", volume24: "Объём 24ч",
    yourBalance: "Ваш баланс", available: "Доступно",
    processing: "Обработка...", success: "Сделка успешна!",
    error: "Сделка не удалась", tryAgain: "Повторить",
    close: "Закрыть", marketInfo: "Информация о рынке",
    spread: "Спред", leverage: "Плечо", minOrder: "Мин. ордер",
    maxOrder: "Макс. ордер", tradingHours: "Часы торговли",
    allDay: "24/7", chart: "График", info: "Инфо", trades: "Сделки",
    recentTrades: "Последние сделки", noTrades: "Сделок пока нет",
    time: "Время", type: "Тип", orderBook: "Книга ордеров",
  },
};

export function MetalTradingDetailPage({
  isOpen,
  onClose,
  metal,
  metalName,
  currentPrice,
  bidPrice,
  change24h,
  lang: propLang,
  userBalance = { auxm: 1250.50, bonusAuxm: 25.00, metals: { AUXG: 15.75, AUXS: 500, AUXPT: 2.5, AUXPD: 1.25 } },
}: MetalTradingDetailPageProps) {
  // Use language context with prop fallback
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const labels = translations[lang] || translations.en;
  
  const [activeTab, setActiveTab] = useState<"price" | "info" | "trades">("price");
  const [tradeMode, setTradeMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tradeResult, setTradeResult] = useState<"success" | "error" | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);

  const metalInfo = METAL_INFO[metal];
  const localizedMetalName = getMetalName(metal, lang);
  const isPositive = change24h >= 0;
  
  const askPrice = currentPrice * (1 + SPREAD.buy);
  const actualBidPrice = bidPrice || currentPrice * (1 - SPREAD.sell);

  useEffect(() => {
    if (isOpen) {
      setChartData(generateCandleData(currentPrice));
    }
  }, [isOpen, currentPrice]);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const tradePrice = tradeMode === "buy" ? askPrice : actualBidPrice;
  const totalCost = parsedAmount * tradePrice;
  const fee = totalCost * 0.001;
  const finalTotal = tradeMode === "buy" ? totalCost + fee : totalCost - fee;

  const availableBalance = tradeMode === "buy" 
    ? userBalance.auxm 
    : userBalance.metals[metal] || 0;

  const canTrade = tradeMode === "buy" 
    ? finalTotal <= userBalance.auxm && parsedAmount > 0
    : parsedAmount <= (userBalance.metals[metal] || 0) && parsedAmount > 0;

  const handleTrade = async () => {
    if (!canTrade) return;
    
    setIsProcessing(true);
    setTradeResult(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTradeResult(Math.random() > 0.1 ? "success" : "error");
    } catch {
      setTradeResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const setPercentage = (pct: number) => {
    if (tradeMode === "buy") {
      const maxAmount = (userBalance.auxm * pct) / askPrice;
      setAmount(maxAmount.toFixed(4));
    } else {
      const metalBalance = userBalance.metals[metal] || 0;
      setAmount((metalBalance * pct).toFixed(4));
    }
  };

  // Mock recent trades
  const recentTrades = Array.from({ length: 10 }, (_, i) => ({
    time: new Date(Date.now() - i * 60000).toLocaleTimeString(),
    type: Math.random() > 0.5 ? "buy" : "sell",
    price: currentPrice * (1 + (Math.random() - 0.5) * 0.002),
    amount: (Math.random() * 10).toFixed(2),
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[95vh] rounded-2xl border border-stone-200 dark:border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{metalInfo.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{metal}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{localizedMetalName}</p>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">${currentPrice.toFixed(2)}</p>
              <p className={`text-sm ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? "+" : ""}{change24h.toFixed(2)}%
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Chart & Info */}
            <div className="lg:col-span-2 space-y-4">
              {/* Tabs */}
              <div className="flex gap-2">
                {[
                  { id: "price", label: labels.chart },
                  { id: "info", label: labels.info },
                  { id: "trades", label: labels.trades },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-emerald-500 text-white"
                        : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Chart Tab */}
              {activeTab === "price" && chartData.length > 0 && (
                <AdvancedChart
                  data={chartData}
                  symbol={metalInfo.pair}
                  currentPrice={currentPrice}
                  priceChange={change24h}
                  lang={lang}
                  height={400}
                />
              )}

              {/* Info Tab */}
              {activeTab === "info" && (
                <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{labels.marketInfo}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: labels.askPrice, value: `$${askPrice.toFixed(2)}`, color: "text-emerald-400" },
                      { label: labels.bidPrice, value: `$${actualBidPrice.toFixed(2)}`, color: "text-red-400" },
                      { label: labels.spread, value: "0.1%", color: "text-slate-900 dark:text-white" },
                      { label: labels.high24, value: `$${(currentPrice * 1.02).toFixed(2)}`, color: "text-emerald-400" },
                      { label: labels.low24, value: `$${(currentPrice * 0.98).toFixed(2)}`, color: "text-red-400" },
                      { label: labels.volume24, value: "$2.4B", color: "text-slate-900 dark:text-white" },
                      { label: labels.minOrder, value: "0.001", color: "text-slate-900 dark:text-white" },
                      { label: labels.tradingHours, value: labels.allDay, color: "text-slate-900 dark:text-white" },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between">
                        <span className="text-slate-400 text-sm">{item.label}</span>
                        <span className={`text-sm font-medium ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trades Tab */}
              {activeTab === "trades" && (
                <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-4">{labels.recentTrades}</h3>
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    <div className="grid grid-cols-4 text-xs text-slate-600 dark:text-slate-500 pb-2 border-b border-stone-200 dark:border-slate-700">
                      <span>{labels.time}</span>
                      <span>{labels.type}</span>
                      <span>{labels.price}</span>
                      <span>{labels.amount}</span>
                    </div>
                    {recentTrades.map((trade, i) => (
                      <div key={i} className="grid grid-cols-4 text-sm">
                        <span className="text-slate-400">{trade.time}</span>
                        <span className={trade.type === "buy" ? "text-emerald-400" : "text-red-400"}>
                          {trade.type === "buy" ? labels.buy : labels.sell}
                        </span>
                        <span className="text-slate-900 dark:text-white">${trade.price.toFixed(2)}</span>
                        <span className="text-slate-700 dark:text-slate-300">{trade.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right - Trading Panel */}
            <div className="space-y-4">
              {/* Buy/Sell Toggle */}
              <div className="flex bg-stone-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                  onClick={() => setTradeMode("buy")}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                    tradeMode === "buy"
                      ? "bg-emerald-500 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {labels.buy}
                </button>
                <button
                  onClick={() => setTradeMode("sell")}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                    tradeMode === "sell"
                      ? "bg-red-500 text-white"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {labels.sell}
                </button>
              </div>

              {/* Balance Info */}
              <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">{labels.available}</span>
                  <span className="text-slate-900 dark:text-white font-medium">
                    {tradeMode === "buy" 
                      ? `$${userBalance.auxm.toFixed(2)} AUXM`
                      : `${(userBalance.metals[metal] || 0).toFixed(4)} ${metal}`
                    }
                  </span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-500 dark:text-slate-400">{labels.amount} ({metal})</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-lg"
                  placeholder="0.00"
                  step="0.0001"
                  min="0"
                />
                
                {/* Quick Percentages */}
                <div className="flex gap-2">
                  {[0.25, 0.5, 0.75, 1].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setPercentage(pct)}
                      className="flex-1 py-1.5 bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-400"
                    >
                      {pct * 100}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Price & Total */}
              <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{labels.price}</span>
                  <span className={tradeMode === "buy" ? "text-emerald-400" : "text-red-400"}>
                    ${tradePrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">{labels.fee} (0.1%)</span>
                  <span className="text-slate-700 dark:text-slate-300">${fee.toFixed(2)}</span>
                </div>
                <div className="border-t border-stone-200 dark:border-slate-700 pt-3 flex justify-between">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{labels.total}</span>
                  <span className="text-slate-900 dark:text-white font-bold text-lg">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Trade Result */}
              {tradeResult && (
                <div className={`p-4 rounded-xl text-center ${
                  tradeResult === "success" 
                    ? "bg-emerald-500/20 border border-emerald-500/50" 
                    : "bg-red-500/20 border border-red-500/50"
                }`}>
                  <p className={tradeResult === "success" ? "text-emerald-400" : "text-red-400"}>
                    {tradeResult === "success" ? labels.success : labels.error}
                  </p>
                  {tradeResult === "error" && (
                    <button 
                      onClick={() => setTradeResult(null)}
                      className="mt-2 text-sm text-slate-500 dark:text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    >
                      {labels.tryAgain}
                    </button>
                  )}
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handleTrade}
                disabled={!canTrade || isProcessing}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  tradeMode === "buy"
                    ? "bg-amber-500 hover:bg-amber-600 disabled:bg-emerald-500/50"
                    : "bg-red-500 hover:bg-red-600 disabled:bg-red-500/50"
                } text-white disabled:cursor-not-allowed`}
              >
                {isProcessing ? labels.processing : `${tradeMode === "buy" ? labels.buy : labels.sell} ${metal}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MetalTradingDetailPage;
