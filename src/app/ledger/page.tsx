"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// CAPITAL LEDGER - Institutional audit-friendly ledger view
// Uses /api/transactions (Redis-based, wallet address auth)
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
    failed: "Başarısız",
    inReview: "İncelemede",
    noRecords: "Henüz sermaye hareketi yok",
    connectWallet: "Defterinizi görüntülemek için cüzdanınızı bağlayın",
    allocationEvent: "Metal Tahsisi",
    settlementEvent: "Fon Takası",
    yieldEvent: "Getiri Dağıtımı",
    redemptionEvent: "Fiziksel İtfa",
    depositEvent: "Fon Girişi",
    withdrawalEvent: "Fon Çıkışı",
    transferEvent: "Transfer",
    tradeEvent: "İşlem",
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
    failed: "Failed",
    inReview: "In Review",
    noRecords: "No capital movements yet",
    connectWallet: "Connect your wallet to view your ledger",
    allocationEvent: "Metal Allocation",
    settlementEvent: "Funds Settlement",
    yieldEvent: "Yield Distribution",
    redemptionEvent: "Physical Redemption",
    depositEvent: "Funds Received",
    withdrawalEvent: "Funds Withdrawn",
    transferEvent: "Transfer",
    tradeEvent: "Trade Executed",
  },
  de: {
    title: "Kapitalbuch",
    subtitle: "Institutionelle Aufzeichnungen aller Ihrer Kapitalbewegungen",
    filters: "Filter",
    all: "Alle",
    allocations: "Zuteilungen",
    settlements: "Abrechnungen",
    yield: "Ertrag",
    redemptions: "Einlösungen",
    export: "Exportieren",
    exportPdf: "PDF herunterladen",
    exportCsv: "CSV herunterladen",
    event: "Ereignis",
    asset: "Vermögenswert",
    amount: "Betrag",
    status: "Status",
    timestamp: "Zeitstempel",
    referenceId: "Referenz-ID",
    settled: "Abgerechnet",
    pending: "Ausstehend",
    failed: "Fehlgeschlagen",
    inReview: "In Prüfung",
    noRecords: "Noch keine Kapitalbewegungen",
    connectWallet: "Verbinden Sie Ihr Wallet, um Ihr Hauptbuch anzuzeigen",
    allocationEvent: "Metallzuteilung",
    settlementEvent: "Fondsabrechnung",
    yieldEvent: "Ertragsausschüttung",
    redemptionEvent: "Physische Einlösung",
    depositEvent: "Eingang",
    withdrawalEvent: "Auszahlung",
    transferEvent: "Transfer",
    tradeEvent: "Handel",
  },
  fr: {
    title: "Grand Livre",
    subtitle: "Registres institutionnels de tous vos mouvements de capitaux",
    filters: "Filtres",
    all: "Tous",
    allocations: "Allocations",
    settlements: "Règlements",
    yield: "Rendement",
    redemptions: "Rachats",
    export: "Exporter",
    exportPdf: "Télécharger PDF",
    exportCsv: "Télécharger CSV",
    event: "Événement",
    asset: "Actif",
    amount: "Montant",
    status: "Statut",
    timestamp: "Horodatage",
    referenceId: "ID de Référence",
    settled: "Réglé",
    pending: "En attente",
    failed: "Échoué",
    inReview: "En révision",
    noRecords: "Pas encore de mouvements de capitaux",
    connectWallet: "Connectez votre portefeuille pour consulter votre grand livre",
    allocationEvent: "Allocation de Métal",
    settlementEvent: "Règlement de Fonds",
    yieldEvent: "Distribution de Rendement",
    redemptionEvent: "Rachat Physique",
    depositEvent: "Fonds Reçus",
    withdrawalEvent: "Fonds Retirés",
    transferEvent: "Transfert",
    tradeEvent: "Transaction",
  },
  ar: {
    title: "دفتر رأس المال",
    subtitle: "السجلات المؤسسية لجميع حركات رأس المال",
    filters: "الفلاتر",
    all: "الكل",
    allocations: "التخصيصات",
    settlements: "التسويات",
    yield: "العائد",
    redemptions: "الاستردادات",
    export: "تصدير",
    exportPdf: "تحميل PDF",
    exportCsv: "تحميل CSV",
    event: "الحدث",
    asset: "الأصل",
    amount: "المبلغ",
    status: "الحالة",
    timestamp: "الوقت",
    referenceId: "رقم المرجع",
    settled: "مسوّى",
    pending: "قيد الانتظار",
    failed: "فشل",
    inReview: "قيد المراجعة",
    noRecords: "لا توجد حركات رأسمالية بعد",
    connectWallet: "اربط محفظتك لعرض دفتر الأستاذ",
    allocationEvent: "تخصيص المعدن",
    settlementEvent: "تسوية الأموال",
    yieldEvent: "توزيع العائد",
    redemptionEvent: "استرداد مادي",
    depositEvent: "إيداع",
    withdrawalEvent: "سحب",
    transferEvent: "تحويل",
    tradeEvent: "صفقة",
  },
  ru: {
    title: "Книга Капитала",
    subtitle: "Институциональные записи всех ваших движений капитала",
    filters: "Фильтры",
    all: "Все",
    allocations: "Распределения",
    settlements: "Расчёты",
    yield: "Доходность",
    redemptions: "Погашения",
    export: "Экспорт",
    exportPdf: "Скачать PDF",
    exportCsv: "Скачать CSV",
    event: "Событие",
    asset: "Актив",
    amount: "Сумма",
    status: "Статус",
    timestamp: "Время",
    referenceId: "ID Ссылки",
    settled: "Завершено",
    pending: "В ожидании",
    failed: "Неудача",
    inReview: "На проверке",
    noRecords: "Движений капитала пока нет",
    connectWallet: "Подключите кошелёк для просмотра книги капитала",
    allocationEvent: "Распределение Металла",
    settlementEvent: "Расчёт Средств",
    yieldEvent: "Распределение Дохода",
    redemptionEvent: "Физическое Погашение",
    depositEvent: "Поступление",
    withdrawalEvent: "Вывод",
    transferEvent: "Перевод",
    tradeEvent: "Сделка",
  },
};

// Ledger entry type from API
interface LedgerEntry {
  id: string;
  type: string;
  event: string;
  asset: string;
  amount: string;
  amountUsd?: number;
  status: string;
  txHash?: string;
  timestamp: number;
  referenceId?: string;
}

// Map transaction types to ledger event categories
function mapEventType(type: string): string {
  const lower = (type || '').toLowerCase();
  if (lower.includes('buy') || lower.includes('allocat')) return 'allocation';
  if (lower.includes('deposit') || lower.includes('settle')) return 'settlement';
  if (lower.includes('yield') || lower.includes('stak') || lower.includes('earn') || lower.includes('lease')) return 'yield';
  if (lower.includes('sell') || lower.includes('withdraw') || lower.includes('redeem') || lower.includes('liquidat')) return 'redemption';
  if (lower.includes('transfer') || lower.includes('send') || lower.includes('receive')) return 'settlement';
  if (lower.includes('trade')) return 'allocation';
  return 'settlement';
}

// Map status values
function mapStatus(status: string): string {
  const lower = (status || '').toLowerCase();
  if (lower === 'completed' || lower === 'settled' || lower === 'final') return 'settled';
  if (lower === 'pending' || lower === 'processing') return 'pending';
  if (lower === 'failed' || lower === 'cancelled') return 'failed';
  if (lower === 'blocked' || lower === 'review') return 'inReview';
  return lower;
}

// Map transaction type to institutional event label
function getEventLabelKey(type: string): string {
  const lower = (type || '').toLowerCase();
  if (lower.includes('buy') || lower === 'trade_buy') return 'allocationEvent';
  if (lower.includes('sell') || lower === 'trade_sell') return 'redemptionEvent';
  if (lower.includes('deposit') || lower === 'receive') return 'depositEvent';
  if (lower.includes('withdraw') || lower === 'send') return 'withdrawalEvent';
  if (lower.includes('stake') || lower.includes('yield') || lower.includes('earn') || lower.includes('lease')) return 'yieldEvent';
  if (lower.includes('transfer')) return 'transferEvent';
  if (lower.includes('swap') || lower.includes('exchange') || lower.includes('convert')) return 'settlementEvent';
  if (lower.includes('liquidat') || lower.includes('redeem')) return 'redemptionEvent';
  return 'tradeEvent';
}

export default function LedgerPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [address, setAddress] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load wallet address from localStorage (same as vault page)
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);

  // Load transactions from /api/transactions (Redis-based, address param)
  const loadTransactions = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/transactions?address=${address}&limit=100`);
      const data = await response.json();

      if (data.transactions && Array.isArray(data.transactions)) {
        const mapped: LedgerEntry[] = data.transactions.map((tx: any) => ({
          id: tx.id || `tx_${tx.timestamp || Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          type: tx.type || 'trade',
          event: tx.type || 'trade',
          asset: tx.coin || tx.token || tx.fromToken || tx.toToken || 'USD',
          amount: String(tx.amount || tx.fromAmount || tx.toAmount || 0),
          amountUsd: tx.amountUsd || tx.value || 0,
          status: tx.status || 'completed',
          txHash: tx.txHash || '',
          timestamp: tx.timestamp || (tx.createdAt ? new Date(tx.createdAt).getTime() : Date.now()),
          referenceId: tx.id || tx.txHash || '',
        }));
        setLedgerData(mapped);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredData = filter === "all"
    ? ledgerData
    : ledgerData.filter((item) => mapEventType(item.type) === filter.replace(/s$/, ''));

  const getEventLabel = (type: string) => {
    const key = getEventLabelKey(type);
    return t[key] || type;
  };

  const getStatusBadge = (rawStatus: string) => {
    const status = mapStatus(rawStatus);
    switch (status) {
      case "settled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#2F6F62]/20 text-[#2F6F62] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F62]" />
            {t.settled}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#BFA181]/20 text-[#BFA181] dark:text-[#BFA181] text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#BFA181]" />
            {t.pending}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-500 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {t.failed}
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
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-500/20 text-slate-500 text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getEventIcon = (type: string) => {
    const eventType = mapEventType(type);
    switch (eventType) {
      case "allocation":
        return (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#BFA181]/20">
            <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        );
      case "settlement":
        return (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#2F6F62]/20">
            <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case "yield":
        return (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#D4B47A]/20">
            <svg className="w-4 h-4 text-[#D4B47A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        );
      case "redemption":
        return (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20">
            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-500/20">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
        );
    }
  };

  const formatTimestamp = (ts: string | number) => {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return date.toLocaleString(lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount: string, asset: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const upper = (asset || '').toUpperCase();
    // Metals: 2 decimal
    if (['AUXG', 'AUXS', 'AUXPT', 'AUXPD'].includes(upper)) return num.toFixed(2);
    // Stablecoins / AUXM / USD: 2 decimal
    if (['USDT', 'USDC', 'AUXM', 'USD', 'DAI', 'BUSD'].includes(upper)) return num.toFixed(2);
    // BTC: 6 decimal
    if (upper === 'BTC') return num.toFixed(6);
    // ETH: 4 decimal
    if (upper === 'ETH') return num.toFixed(4);
    // Default: 2 decimal
    return num.toFixed(2);
  };

  // Export functions
  const exportToCsv = () => {
    const headers = ['Reference ID', 'Event', 'Asset', 'Amount', 'Status', 'Timestamp'];
    const rows = filteredData.map(item => [
      item.referenceId || item.id,
      getEventLabel(item.type),
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
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg hover:border-[#BFA181] transition-colors"
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
                    ? "bg-[#BFA181] text-white"
                    : "bg-stone-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Connect Wallet Notice */}
        {!address && !loading && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 px-6 py-12 text-center">
            <svg className="w-12 h-12 text-[#BFA181] mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">{t.connectWallet}</p>
          </div>
        )}

        {/* Ledger Table */}
        {address && (
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
                <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              filteredData.map((item, index) => (
                <div
                  key={item.id + '-' + index}
                  className={`grid grid-cols-6 gap-4 px-6 py-4 ${
                    index !== filteredData.length - 1 ? "border-b border-stone-100 dark:border-slate-800" : ""
                  } hover:bg-stone-50 dark:hover:bg-slate-800/30 transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    {getEventIcon(item.type)}
                    <span className="text-sm font-medium text-slate-800 dark:text-white">{getEventLabel(item.type)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">{item.asset?.toUpperCase()}</span>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="text-sm font-medium text-slate-800 dark:text-white">
                      {formatAmount(item.amount, item.asset)}
                    </span>
                    {item.amountUsd && item.amountUsd > 0 && (
                      <span className="text-xs text-slate-500">${typeof item.amountUsd === 'number' ? item.amountUsd.toFixed(2) : item.amountUsd}</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm text-slate-600 dark:text-slate-400">{formatTimestamp(item.timestamp)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-xs font-mono text-slate-500 bg-stone-100 dark:bg-slate-800 px-2 py-1 rounded truncate max-w-[150px]" title={item.referenceId || item.id}>
                      {(item.referenceId || item.id).slice(0, 16)}{(item.referenceId || item.id).length > 16 ? '...' : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
