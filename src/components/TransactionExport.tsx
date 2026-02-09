"use client";

import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface TransactionExportProps {
  walletAddress: string;
  lang?: string;
}

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "İşlem Geçmişini Dışa Aktar",
    exportBtn: "Dışa Aktar",
    downloading: "İndiriliyor...",
    dateRange: "Tarih Aralığı",
    startDate: "Başlangıç",
    endDate: "Bitiş",
    transactionTypes: "İşlem Türleri",
    allTypes: "Tümü",
    format: "Format",
    download: "CSV İndir",
    cancel: "İptal",
    buy: "Alım",
    sell: "Satım",
    deposit: "Yatırım",
    withdraw: "Çekim",
    exchange: "Dönüşüm",
    stake: "Stake",
    transfer: "Transfer",
    noData: "Dışa aktarılacak işlem bulunamadı",
  },
  en: {
    title: "Export Transaction History",
    exportBtn: "Export",
    downloading: "Downloading...",
    dateRange: "Date Range",
    startDate: "Start Date",
    endDate: "End Date",
    transactionTypes: "Transaction Types",
    allTypes: "All Types",
    format: "Format",
    download: "Download CSV",
    cancel: "Cancel",
    buy: "Buy",
    sell: "Sell",
    deposit: "Deposit",
    withdraw: "Withdrawal",
    exchange: "Exchange",
    stake: "Stake",
    transfer: "Transfer",
    noData: "No transactions to export",
  },
  de: {
    title: "Transaktionsverlauf exportieren",
    exportBtn: "Exportieren",
    downloading: "Wird heruntergeladen...",
    dateRange: "Zeitraum",
    startDate: "Startdatum",
    endDate: "Enddatum",
    transactionTypes: "Transaktionstypen",
    allTypes: "Alle Typen",
    format: "Format",
    download: "CSV herunterladen",
    cancel: "Abbrechen",
    buy: "Kauf",
    sell: "Verkauf",
    deposit: "Einzahlung",
    withdraw: "Auszahlung",
    exchange: "Tausch",
    stake: "Staking",
    transfer: "Transfer",
    noData: "Keine Transaktionen zum Exportieren",
  },
  fr: {
    title: "Exporter l'Historique des Transactions",
    exportBtn: "Exporter",
    downloading: "Téléchargement...",
    dateRange: "Plage de Dates",
    startDate: "Date de Début",
    endDate: "Date de Fin",
    transactionTypes: "Types de Transactions",
    allTypes: "Tous les Types",
    format: "Format",
    download: "Télécharger CSV",
    cancel: "Annuler",
    buy: "Achat",
    sell: "Vente",
    deposit: "Dépôt",
    withdraw: "Retrait",
    exchange: "Échange",
    stake: "Staking",
    transfer: "Transfert",
    noData: "Aucune transaction à exporter",
  },
  ar: {
    title: "تصدير سجل المعاملات",
    exportBtn: "تصدير",
    downloading: "جاري التحميل...",
    dateRange: "نطاق التاريخ",
    startDate: "تاريخ البدء",
    endDate: "تاريخ الانتهاء",
    transactionTypes: "أنواع المعاملات",
    allTypes: "جميع الأنواع",
    format: "التنسيق",
    download: "تحميل CSV",
    cancel: "إلغاء",
    buy: "شراء",
    sell: "بيع",
    deposit: "إيداع",
    withdraw: "سحب",
    exchange: "تبادل",
    stake: "تخزين",
    transfer: "تحويل",
    noData: "لا توجد معاملات للتصدير",
  },
  ru: {
    title: "Экспорт Истории Транзакций",
    exportBtn: "Экспорт",
    downloading: "Загрузка...",
    dateRange: "Период",
    startDate: "Дата начала",
    endDate: "Дата окончания",
    transactionTypes: "Типы Транзакций",
    allTypes: "Все Типы",
    format: "Формат",
    download: "Скачать CSV",
    cancel: "Отмена",
    buy: "Покупка",
    sell: "Продажа",
    deposit: "Депозит",
    withdraw: "Вывод",
    exchange: "Обмен",
    stake: "Стейкинг",
    transfer: "Перевод",
    noData: "Нет транзакций для экспорта",
  },
};

export function TransactionExport({ walletAddress, lang: propLang }: TransactionExportProps) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;
  
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transactionTypes = [
    { value: "buy", label: t.buy },
    { value: "sell", label: t.sell },
    { value: "deposit", label: t.deposit },
    { value: "withdraw", label: t.withdraw },
    { value: "exchange", label: t.exchange },
    { value: "stake", label: t.stake },
    { value: "transfer", label: t.transfer },
  ];

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        address: walletAddress,
        format: "csv",
        lang,
      });

      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedTypes.length > 0) params.set("type", selectedTypes.join(","));

      const response = await fetch(`/api/transactions/export?${params}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `auxite_transactions_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span className="text-sm text-slate-300">{t.exportBtn}</span>
      </button>

      {/* Export Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">{t.title}</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t.dateRange}</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-[#2F6F62] focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">{t.startDate}</span>
                  </div>
                  <div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-[#2F6F62] focus:outline-none"
                    />
                    <span className="text-xs text-slate-500">{t.endDate}</span>
                  </div>
                </div>
              </div>

              {/* Transaction Types */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">{t.transactionTypes}</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTypes([])}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      selectedTypes.length === 0
                        ? "bg-[#2F6F62] text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {t.allTypes}
                  </button>
                  {transactionTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleType(type.value)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedTypes.includes(type.value)
                          ? "bg-[#2F6F62] text-white"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-700 flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleExport}
                disabled={loading}
                className="flex-1 py-2.5 bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t.downloading}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t.download}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
