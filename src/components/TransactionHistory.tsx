"use client";

import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useState } from "react";

interface TransactionHistoryProps {
  lang?: "tr" | "en";
}

const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const cryptoSymbols: Record<string, string> = {
  ETH: "Ξ",
  BTC: "₿",
  USDT: "₮",
  TRY: "₺",
};

export function TransactionHistory({ lang = "en" }: TransactionHistoryProps) {
  const { transactions, loading } = useTransactionHistory();
  const [expanded, setExpanded] = useState(false);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTokenIcon = (symbol: string) => {
    if (metalIcons[symbol]) {
      return <img src={metalIcons[symbol]} alt={symbol} className="w-4 h-4 inline-block" />;
    }
    if (cryptoSymbols[symbol]) {
      return <span className="text-base font-bold text-white">{cryptoSymbols[symbol]}</span>;
    }
    return <span>●</span>;
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <span className="text-slate-400">
            {lang === "tr" ? "İşlemler yükleniyor..." : "Loading transactions..."}
          </span>
        </div>
      </div>
    );
  }

  const displayedTransactions = expanded ? transactions : transactions.slice(0, 5);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-100">
          {lang === "tr" ? "İşlem Geçmişi" : "Transaction History"}
        </h3>
        <span className="text-sm text-slate-400">
          {transactions.length} {lang === "tr" ? "işlem" : "swaps"}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-4xl">📊</div>
          <p className="text-slate-400">
            {lang === "tr"
              ? "Henüz işlem yok. İlk swap'ınızı yapın!"
              : "No transactions yet. Make your first swap!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedTransactions.map((tx) => (
            <div
              key={tx.hash}
              className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 transition-colors hover:bg-slate-800/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 flex items-center gap-1.5">
                      {getTokenIcon(tx.fromToken)} {parseFloat(tx.fromAmount).toFixed(4)} {tx.fromToken}
                    </span>
                    <svg
                      className="h-4 w-4 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                      {getTokenIcon(tx.toToken)} {parseFloat(tx.toAmount).toFixed(4)} {tx.toToken}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{formatDate(tx.timestamp)}</span>
                    <span>•</span>
                    <span>
                      {lang === "tr" ? "Ücret:" : "Fee:"} ${parseFloat(tx.fee).toFixed(2)}
                    </span>
                  </div>
                </div>

                <a
                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 transition-colors hover:text-emerald-400"
                  title="View on Etherscan"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          ))}

          {transactions.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/30 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/50"
            >
              {expanded
                ? lang === "tr"
                  ? "Daha Az Göster"
                  : "Show Less"
                : lang === "tr"
                ? `${transactions.length - 5} Daha Fazla Göster`
                : `Show ${transactions.length - 5} More`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}