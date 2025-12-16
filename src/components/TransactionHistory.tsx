"use client";

import { useState } from "react";
import { useTransactionHistory, Transaction } from "@/hooks/useTransactionHistory";

interface TransactionHistoryProps {
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const typeIcons: Record<string, { icon: string; color: string }> = {
  deposit: { icon: "↓", color: "text-emerald-600 dark:text-emerald-400" },
  withdraw: { icon: "↑", color: "text-red-600 dark:text-red-400" },
  swap: { icon: "⇄", color: "text-blue-600 dark:text-blue-400" },
  transfer: { icon: "→", color: "text-purple-600 dark:text-purple-400" },
  bonus: { icon: "🎁", color: "text-yellow-600 dark:text-yellow-400" },
  buy: { icon: "🛒", color: "text-emerald-600 dark:text-emerald-400" },
  sell: { icon: "💰", color: "text-orange-600 dark:text-orange-400" },
};

// 6-Language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "İşlem Geçmişi",
    transactions: "işlem",
    all: "Tümü",
    deposits: "Yatırma",
    withdrawals: "Çekme",
    swaps: "Takas",
    buys: "Alım",
    sells: "Satış",
    bonus: "Bonus",
    loading: "İşlemler yükleniyor...",
    noTransactions: "Henüz işlem yok.",
    noCategory: "Bu kategoride işlem yok.",
    completed: "Tamamlandı",
    pending: "Bekliyor",
    failed: "Başarısız",
    fee: "Ücret:",
    viewMore: "İşlem Daha Göster",
    viewLess: "Daha Az Göster",
    loadOlder: "Daha Eski İşlemleri Yükle",
    loadingMore: "Yükleniyor...",
    deposit: "Yatırma",
    withdraw: "Çekme",
    swap: "Takas",
    transfer: "Transfer",
    buy: "Alım",
    sell: "Satış",
  },
  en: {
    title: "Transaction History",
    transactions: "transactions",
    all: "All",
    deposits: "Deposits",
    withdrawals: "Withdrawals",
    swaps: "Swaps",
    buys: "Buys",
    sells: "Sells",
    bonus: "Bonus",
    loading: "Loading transactions...",
    noTransactions: "No transactions yet.",
    noCategory: "No transactions in this category.",
    completed: "Completed",
    pending: "Pending",
    failed: "Failed",
    fee: "Fee:",
    viewMore: "More Transactions",
    viewLess: "View Less",
    loadOlder: "Load Older Transactions",
    loadingMore: "Loading...",
    deposit: "Deposit",
    withdraw: "Withdraw",
    swap: "Swap",
    transfer: "Transfer",
    buy: "Buy",
    sell: "Sell",
  },
  de: {
    title: "Transaktionsverlauf",
    transactions: "Transaktionen",
    all: "Alle",
    deposits: "Einzahlungen",
    withdrawals: "Auszahlungen",
    swaps: "Swaps",
    buys: "Käufe",
    sells: "Verkäufe",
    bonus: "Bonus",
    loading: "Transaktionen werden geladen...",
    noTransactions: "Noch keine Transaktionen.",
    noCategory: "Keine Transaktionen in dieser Kategorie.",
    completed: "Abgeschlossen",
    pending: "Ausstehend",
    failed: "Fehlgeschlagen",
    fee: "Gebühr:",
    viewMore: "Mehr Transaktionen",
    viewLess: "Weniger anzeigen",
    loadOlder: "Ältere Transaktionen laden",
    loadingMore: "Wird geladen...",
    deposit: "Einzahlung",
    withdraw: "Auszahlung",
    swap: "Tausch",
    transfer: "Transfer",
    buy: "Kauf",
    sell: "Verkauf",
  },
  fr: {
    title: "Historique des Transactions",
    transactions: "transactions",
    all: "Tout",
    deposits: "Dépôts",
    withdrawals: "Retraits",
    swaps: "Échanges",
    buys: "Achats",
    sells: "Ventes",
    bonus: "Bonus",
    loading: "Chargement des transactions...",
    noTransactions: "Aucune transaction.",
    noCategory: "Aucune transaction dans cette catégorie.",
    completed: "Terminé",
    pending: "En attente",
    failed: "Échoué",
    fee: "Frais:",
    viewMore: "Plus de transactions",
    viewLess: "Voir moins",
    loadOlder: "Charger les anciennes transactions",
    loadingMore: "Chargement...",
    deposit: "Dépôt",
    withdraw: "Retrait",
    swap: "Échange",
    transfer: "Transfert",
    buy: "Achat",
    sell: "Vente",
  },
  ar: {
    title: "سجل المعاملات",
    transactions: "معاملات",
    all: "الكل",
    deposits: "إيداعات",
    withdrawals: "سحوبات",
    swaps: "تبادلات",
    buys: "مشتريات",
    sells: "مبيعات",
    bonus: "مكافأة",
    loading: "جاري تحميل المعاملات...",
    noTransactions: "لا توجد معاملات بعد.",
    noCategory: "لا توجد معاملات في هذه الفئة.",
    completed: "مكتمل",
    pending: "معلق",
    failed: "فشل",
    fee: "الرسوم:",
    viewMore: "المزيد من المعاملات",
    viewLess: "عرض أقل",
    loadOlder: "تحميل المعاملات القديمة",
    loadingMore: "جاري التحميل...",
    deposit: "إيداع",
    withdraw: "سحب",
    swap: "تبادل",
    transfer: "تحويل",
    buy: "شراء",
    sell: "بيع",
  },
  ru: {
    title: "История Транзакций",
    transactions: "транзакций",
    all: "Все",
    deposits: "Пополнения",
    withdrawals: "Выводы",
    swaps: "Обмены",
    buys: "Покупки",
    sells: "Продажи",
    bonus: "Бонус",
    loading: "Загрузка транзакций...",
    noTransactions: "Транзакций пока нет.",
    noCategory: "Нет транзакций в этой категории.",
    completed: "Завершено",
    pending: "В ожидании",
    failed: "Ошибка",
    fee: "Комиссия:",
    viewMore: "Больше транзакций",
    viewLess: "Показать меньше",
    loadOlder: "Загрузить старые транзакции",
    loadingMore: "Загрузка...",
    deposit: "Пополнение",
    withdraw: "Вывод",
    swap: "Обмен",
    transfer: "Перевод",
    buy: "Покупка",
    sell: "Продажа",
  },
};

const INITIAL_VISIBLE_COUNT = 3;

export function TransactionHistory({ lang = "en" }: TransactionHistoryProps) {
  const { transactions, loading, error, hasMore, loadMore, refresh } = useTransactionHistory(20);
  const [filter, setFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const t = translations[lang] || translations.en;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const localeMap: Record<string, string> = {
      tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU"
    };
    return date.toLocaleDateString(localeMap[lang] || "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTokenIcon = (symbol: string) => {
    if (metalIcons[symbol]) {
      return <img src={metalIcons[symbol]} alt={symbol} className="w-4 h-4 sm:w-5 sm:h-5" />;
    }
    const cryptoColors: Record<string, string> = {
      ETH: "bg-[#627EEA]",
      BTC: "bg-[#F7931A]",
      XRP: "bg-[#23292F]",
      SOL: "bg-[#9945FF]",
      USDT: "bg-[#26A17B]",
      AUXM: "bg-purple-500",
    };
    const color = cryptoColors[symbol] || "bg-slate-600";
    return (
      <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${color} flex items-center justify-center`}>
        <span className="text-white text-[10px] sm:text-xs font-bold">{symbol?.charAt(0)}</span>
      </div>
    );
  };

  const filteredTransactions = filter === "all" 
    ? transactions 
    : transactions.filter(tx => tx.type === filter);

  const visibleTransactions = showAll 
    ? filteredTransactions 
    : filteredTransactions.slice(0, INITIAL_VISIBLE_COUNT);
  
  const hiddenCount = filteredTransactions.length - INITIAL_VISIBLE_COUNT;

  const tabs = [
    { id: "all", label: t.all },
    { id: "deposit", label: t.deposits },
    { id: "withdraw", label: t.withdrawals },
    { id: "swap", label: t.swaps },
    { id: "buy", label: t.buys },
    { id: "sell", label: t.sells },
    { id: "bonus", label: t.bonus },
  ];

  return (
    <div className="rounded-lg sm:rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-4 sm:p-6 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
          {t.title}
        </h3>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <span className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {filteredTransactions.length} {t.transactions}
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 sm:p-1.5 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg 
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-slate-400 ${loading ? "animate-spin" : ""}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4 overflow-x-auto pb-2 -mx-1 px-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setFilter(tab.id); setShowAll(false); }}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.id
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50"
                : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 sm:p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-3 sm:mb-4">
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="py-6 sm:py-8 text-center">
          <div className="h-5 w-5 sm:h-6 sm:w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto mb-2 sm:mb-3"></div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{t.loading}</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-6 sm:py-8 text-center">
          <div className="mb-2 sm:mb-3 text-3xl sm:text-4xl">📊</div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {filter === "all" ? t.noTransactions : t.noCategory}
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {visibleTransactions.map((tx) => {
            const typeInfo = typeIcons[tx.type] || { icon: "•", color: "text-slate-500 dark:text-slate-400" };
            const typeLabel = t[tx.type as keyof typeof t] || tx.type;
            return (
              <div key={tx.id} className="rounded-lg border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-800/30 p-3 sm:p-4 transition-colors hover:bg-stone-100 dark:hover:bg-slate-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className={`text-xl sm:text-2xl ${typeInfo.color}`}>{typeInfo.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 flex-wrap">
                        <span className={`text-xs sm:text-sm font-medium ${typeInfo.color}`}>{typeLabel}</span>
                        <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                          tx.status === "completed" ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                          : tx.status === "pending" ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                          : "bg-red-500/20 text-red-600 dark:text-red-400"
                        }`}>
                          {tx.status === "completed" ? t.completed
                            : tx.status === "pending" ? t.pending
                            : t.failed}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
                        {tx.type === "swap" && tx.fromToken && tx.toToken ? (
                          <>
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">{getTokenIcon(tx.fromToken)} {parseFloat(tx.fromAmount || "0").toFixed(4)} {tx.fromToken}</span>
                            <span className="text-slate-400 dark:text-slate-500">→</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">{getTokenIcon(tx.toToken)} {parseFloat(tx.toAmount || "0").toFixed(4)} {tx.toToken}</span>
                          </>
                        ) : tx.type === "buy" && tx.fromToken && tx.toToken ? (
                          <>
                            <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">{getTokenIcon(tx.fromToken)} {parseFloat(tx.fromAmount || "0").toFixed(2)} {tx.fromToken}</span>
                            <span className="text-slate-400 dark:text-slate-500">→</span>
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">{getTokenIcon(tx.toToken)} {parseFloat(tx.toAmount || "0").toFixed(4)}g {tx.toToken}</span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">{tx.token && getTokenIcon(tx.token)} {parseFloat(tx.amount || "0").toFixed(4)} {tx.token}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-500">
                        <span>{formatDate(tx.timestamp)}</span>
                        {tx.fee && parseFloat(tx.fee) > 0 && (<><span>•</span><span>{t.fee} ${parseFloat(tx.fee).toFixed(2)}</span></>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/30 text-xs sm:text-sm text-slate-600 dark:text-slate-300 transition-colors hover:bg-stone-100 dark:hover:bg-slate-700/50 hover:border-emerald-500/50 flex items-center justify-center gap-1.5 sm:gap-2">
              {showAll ? (
                <><svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>{t.viewLess}</>
              ) : (
                <><svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>{hiddenCount} {t.viewMore}</>
              )}
            </button>
          )}

          {showAll && hasMore && (
            <button onClick={loadMore} disabled={loading} className="w-full py-2.5 sm:py-3 rounded-lg border border-dashed border-stone-300 dark:border-slate-700 bg-transparent text-xs sm:text-sm text-slate-500 dark:text-slate-400 transition-colors hover:bg-stone-50 dark:hover:bg-slate-800/30 disabled:opacity-50">
              {loading ? t.loadingMore : t.loadOlder}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
