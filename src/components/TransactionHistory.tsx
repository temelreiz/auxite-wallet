"use client";

import { useState } from "react";
import { useTransactionHistory, Transaction } from "@/hooks/useTransactionHistory";

interface TransactionHistoryProps {
  lang?: "tr" | "en";
}

const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const typeIcons: Record<string, { icon: string; color: string }> = {
  deposit: { icon: "↓", color: "text-emerald-400" },
  withdraw: { icon: "↑", color: "text-red-400" },
  swap: { icon: "⇄", color: "text-blue-400" },
  transfer: { icon: "→", color: "text-purple-400" },
  bonus: { icon: "🎁", color: "text-yellow-400" },
  buy: { icon: "🛒", color: "text-emerald-400" },
  sell: { icon: "💰", color: "text-orange-400" },
};

const typeLabels: Record<string, { tr: string; en: string }> = {
  deposit: { tr: "Yatırma", en: "Deposit" },
  withdraw: { tr: "Çekme", en: "Withdraw" },
  swap: { tr: "Takas", en: "Swap" },
  transfer: { tr: "Transfer", en: "Transfer" },
  bonus: { tr: "Bonus", en: "Bonus" },
  buy: { tr: "Satın Alma", en: "Buy" },
  sell: { tr: "Satış", en: "Sell" },
};

const INITIAL_VISIBLE_COUNT = 3;

export function TransactionHistory({ lang = "en" }: TransactionHistoryProps) {
  const { transactions, loading, error, hasMore, loadMore, refresh } = useTransactionHistory(20);
  const [filter, setFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTokenIcon = (symbol: string) => {
    if (metalIcons[symbol]) {
      return <img src={metalIcons[symbol]} alt={symbol} className="w-5 h-5" />;
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
      <div className={`w-5 h-5 rounded-full ${color} flex items-center justify-center`}>
        <span className="text-white text-xs font-bold">{symbol?.charAt(0)}</span>
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

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">
          {lang === "tr" ? "İşlem Geçmişi" : "Transaction History"}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {filteredTransactions.length} {lang === "tr" ? "işlem" : "transactions"}
          </span>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
            title={lang === "tr" ? "Yenile" : "Refresh"}
          >
            <svg 
              className={`w-4 h-4 text-slate-400 ${loading ? "animate-spin" : ""}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { id: "all", label: { tr: "Tümü", en: "All" } },
          { id: "deposit", label: { tr: "Yatırma", en: "Deposits" } },
          { id: "withdraw", label: { tr: "Çekme", en: "Withdrawals" } },
          { id: "swap", label: { tr: "Takas", en: "Swaps" } },
          { id: "buy", label: { tr: "Alım", en: "Buys" } },
          { id: "bonus", label: { tr: "Bonus", en: "Bonus" } },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setFilter(tab.id); setShowAll(false); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.id
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
            }`}
          >
            {tab.label[lang]}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 mb-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="py-8 text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-slate-400">{lang === "tr" ? "İşlemler yükleniyor..." : "Loading transactions..."}</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-3 text-4xl">📊</div>
          <p className="text-slate-400">
            {filter === "all"
              ? (lang === "tr" ? "Henüz işlem yok." : "No transactions yet.")
              : (lang === "tr" ? "Bu kategoride işlem yok." : "No transactions in this category.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleTransactions.map((tx) => {
            const typeInfo = typeIcons[tx.type] || { icon: "•", color: "text-slate-400" };
            const typeLabel = typeLabels[tx.type]?.[lang] || tx.type;
            return (
              <div key={tx.id} className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`text-2xl ${typeInfo.color}`}>{typeInfo.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-medium ${typeInfo.color}`}>{typeLabel}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          tx.status === "completed" ? "bg-emerald-500/20 text-emerald-400" 
                          : tx.status === "pending" ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                        }`}>
                          {tx.status === "completed" ? (lang === "tr" ? "Tamamlandı" : "Completed")
                            : tx.status === "pending" ? (lang === "tr" ? "Bekliyor" : "Pending")
                            : (lang === "tr" ? "Başarısız" : "Failed")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {tx.type === "swap" && tx.fromToken && tx.toToken ? (
                          <>
                            <span className="flex items-center gap-1 text-slate-300">{getTokenIcon(tx.fromToken)} {parseFloat(tx.fromAmount || "0").toFixed(4)} {tx.fromToken}</span>
                            <span className="text-slate-500">→</span>
                            <span className="flex items-center gap-1 text-emerald-400">{getTokenIcon(tx.toToken)} {parseFloat(tx.toAmount || "0").toFixed(4)} {tx.toToken}</span>
                          </>
                        ) : tx.type === "withdraw" && tx.toToken ? (
                          <span className="flex items-center gap-1 text-slate-300">{getTokenIcon(tx.toToken)} {parseFloat(tx.toAmount || "0").toFixed(4)} {tx.toToken}</span>
                        ) : tx.type === "buy" && tx.fromToken && tx.toToken ? (
                          <>
                            <span className="flex items-center gap-1 text-slate-300">{getTokenIcon(tx.fromToken)} {parseFloat(tx.fromAmount || "0").toFixed(2)} {tx.fromToken}</span>
                            <span className="text-slate-500">→</span>
                            <span className="flex items-center gap-1 text-emerald-400">{getTokenIcon(tx.toToken)} {parseFloat(tx.toAmount || "0").toFixed(4)}g {tx.toToken}</span>
                          </>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-300">{tx.token && getTokenIcon(tx.token)} {parseFloat(tx.amount || "0").toFixed(4)} {tx.token}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>{formatDate(tx.timestamp)}</span>
                        {tx.fee && parseFloat(tx.fee) > 0 && (<><span>•</span><span>{lang === "tr" ? "Ücret:" : "Fee:"} ${parseFloat(tx.fee).toFixed(2)}</span></>)}
                        {tx.description && (<><span>•</span><span>{tx.description}</span></>)}
                      </div>
                    </div>
                  </div>
                  {tx.hash && (
                    <a href={`https://sepolia.basescan.org/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 transition-colors hover:text-emerald-400 p-1" title={lang === "tr" ? "Explorer'da Görüntüle" : "View on Explorer"}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {hiddenCount > 0 && (
            <button onClick={() => setShowAll(!showAll)} className="w-full py-3 rounded-lg border border-slate-700 bg-slate-800/30 text-sm text-slate-300 transition-colors hover:bg-slate-700/50 hover:border-emerald-500/50 flex items-center justify-center gap-2">
              {showAll ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>{lang === "tr" ? "Daha Az Göster" : "View Less"}</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>{lang === "tr" ? `${hiddenCount} İşlem Daha Göster` : `View ${hiddenCount} More`}</>
              )}
            </button>
          )}

          {showAll && hasMore && (
            <button onClick={loadMore} disabled={loading} className="w-full py-3 rounded-lg border border-dashed border-slate-700 bg-transparent text-sm text-slate-400 transition-colors hover:bg-slate-800/30 disabled:opacity-50">
              {loading ? (lang === "tr" ? "Yükleniyor..." : "Loading...") : (lang === "tr" ? "Daha Eski İşlemleri Yükle" : "Load Older Transactions")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TransactionHistory;
