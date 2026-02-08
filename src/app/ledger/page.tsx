"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// CAPITAL LEDGER - Not "Transaction History"
// Institutional audit-friendly ledger view
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Sermaye Defteri",
    subtitle: "Tüm sermaye hareketlerinizin kurumsal kayıtları",
    filters: "Filtreler",
    all: "Tümü",
    allocations: "Tahsisler",
    settlements: "Takaslar",
    yield: "Getiri",
    redemptions: "İtfalar",
    export: "Dışa Aktar",
    exportPdf: "PDF İndir",
    exportCsv: "CSV İndir",
    event: "Olay",
    asset: "Varlık",
    amount: "Tutar",
    status: "Durum",
    timestamp: "Zaman",
    referenceId: "Referans ID",
    settled: "Takas Edildi",
    pending: "Beklemede",
    inReview: "İncelemede",
    noRecords: "Henüz sermaye hareketi yok",
    allocationEvent: "Metal Tahsisi",
    settlementEvent: "Fon Takası",
    yieldEvent: "Getiri Dağıtımı",
    redemptionEvent: "Fiziksel İtfa",
  },
  en: {
    title: "Capital Ledger",
    subtitle: "Institutional records of all your capital movements",
    filters: "Filters",
    all: "All",
    allocations: "Allocations",
    settlements: "Settlements",
    yield: "Yield",
    redemptions: "Redemptions",
    export: "Export",
    exportPdf: "Download PDF",
    exportCsv: "Download CSV",
    event: "Event",
    asset: "Asset",
    amount: "Amount",
    status: "Status",
    timestamp: "Timestamp",
    referenceId: "Reference ID",
    settled: "Settled",
    pending: "Pending",
    inReview: "In Review",
    noRecords: "No capital movements yet",
    allocationEvent: "Metal Allocation",
    settlementEvent: "Funds Settlement",
    yieldEvent: "Yield Distribution",
    redemptionEvent: "Physical Redemption",
  },
};

// Ledger entry type from API
interface LedgerEntry {
  id: string;
  event: string;
  asset: string;
  network?: string;
  amount: string;
  amountUsd?: string;
  status: string;
  fromAddress?: string;
  toAddress?: string;
  txHash?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  timestamp: number;
  settledAt?: number;
  referenceId?: string;
}

// Map custody transaction types to ledger event types
function mapEventType(event: string): string {
  switch (event) {
    case 'DEPOSIT': return 'settlement';
    case 'WITHDRAWAL': return 'redemption';
    case 'INTERNAL': return 'transfer';
    default: return event.toLowerCase();
  }
}

// Map custody status to ledger status
function mapStatus(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'settled';
    case 'PENDING_AML':
    case 'PENDING_CONFIRMATION':
    case 'CONFIRMING': return 'pending';
    case 'BLOCKED': return 'inReview';
    case 'FAILED':
    case 'CANCELLED': return 'failed';
    default: return status.toLowerCase();
  }
}

export default function LedgerPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [filter, setFilter] = useState("all");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load transactions from API
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/custody/transactions", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success && data.transactions) {
          setLedgerData(data.transactions);
        }
      } catch (error) {
        console.error("Failed to load transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const filteredData = filter === "all"
    ? ledgerData
    : ledgerData.filter((item) => mapEventType(item.event) === filter.slice(0, -1));

  const getEventLabel = (type: string) => {
    const mapped = mapEventType(type);
    switch (mapped) {
      case "allocation": return t.allocationEvent;
      case "settlement": return t.settlementEvent;
      case "yield": return t.yieldEvent;
      case "redemption": return t.redemptionEvent;
      case "deposit": return t.settlementEvent;
      case "withdrawal": return t.redemptionEvent;
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "settled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t.settled}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t.pending}
          </span>
        );
      case "inReview":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {t.inReview}
          </span>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (ts: string | number) => {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return date.toLocaleString(lang === "tr" ? "tr-TR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Export functions
  const exportToCsv = () => {
    const headers = ['Reference ID', 'Event', 'Asset', 'Amount', 'Status', 'Timestamp'];
    const rows = filteredData.map(item => [
      item.referenceId || item.id,
      getEventLabel(item.event),
      item.asset,
      item.amount,
      mapStatus(item.status),
      formatTimestamp(item.timestamp)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auxite-capital-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    setShowExportMenu(false);
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
            <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
          </div>

          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg hover:border-amber-500 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.export}</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg shadow-xl z-10">
                <button
                  onClick={() => setShowExportMenu(false)}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 rounded-t-lg"
                >
                  {t.exportPdf}
                </button>
                <button
                  onClick={exportToCsv}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-700 rounded-b-lg"
                >
                  {t.exportCsv}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 mr-2">{t.filters}:</span>
            {[
              { key: "all", label: t.all },
              { key: "allocations", label: t.allocations },
              { key: "settlements", label: t.settlements },
              { key: "yield", label: t.yield },
              { key: "redemptions", label: t.redemptions },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "bg-amber-500 text-white"
                    : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-6 py-4 bg-stone-50 dark:bg-slate-800/50 border-b border-stone-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-slate-500 uppercase">{t.event}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t.asset}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t.amount}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t.status}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t.timestamp}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">{t.referenceId}</div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Loading...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-500 dark:text-slate-400">{t.noRecords}</p>
            </div>
          ) : (
            filteredData.map((item, index) => {
              const eventType = mapEventType(item.event);
              const status = mapStatus(item.status);
              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 ${
                    index !== filteredData.length - 1 ? "border-b border-stone-100 dark:border-slate-800" : ""
                  } hover:bg-stone-50 dark:hover:bg-slate-800/30 transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      eventType === "allocation" ? "bg-amber-500/20" :
                      eventType === "settlement" || eventType === "deposit" ? "bg-emerald-500/20" :
                      eventType === "yield" ? "bg-blue-500/20" : "bg-purple-500/20"
                    }`}>
                      {eventType === "allocation" && (
                        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      )}
                      {(eventType === "settlement" || eventType === "deposit") && (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {eventType === "yield" && (
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      )}
                      {(eventType === "redemption" || eventType === "withdrawal") && (
                        <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{getEventLabel(item.event)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{item.asset}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{item.amount}</span>
                    {item.amountUsd && <span className="text-xs text-slate-500">${item.amountUsd}</span>}
                  </div>
                  <div className="flex items-center">
                    {getStatusBadge(status)}
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{formatTimestamp(item.timestamp)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-slate-500 bg-stone-100 dark:bg-slate-800 px-2 py-1 rounded truncate max-w-[150px]" title={item.referenceId || item.id}>
                      {(item.referenceId || item.id).slice(0, 16)}...
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
