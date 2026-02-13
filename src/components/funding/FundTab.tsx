"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { FundingOverviewPanel } from "./FundingOverviewPanel";
import { QRCodeSVG } from "qrcode.react";

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    selectFundingRail: "FONLAMA YÖNTEMİ",
    cryptoFunding: "Dijital Varlık",
    cryptoFundingDesc: "Kripto ile fonlama",
    bankWire: "Banka Havalesi",
    bankWireDesc: "Uluslararası banka transferi",
    otcDesk: "OTC Masa",
    otcDeskDesc: "Kurumsal yüksek hacim",
    comingSoon: "Yakında",
    // Deposit addresses
    depositAddresses: "Yatırım Adresleri",
    depositAddressesDesc: "Tüm yatırımlar aşağıdaki platform adreslerine yapılmalıdır.",
    networkWarning: "Sadece belirtilen ağ üzerinden gönderin. Yanlış transferler kalıcı kayba neden olabilir.",
    copyAddress: "Kopyala",
    copied: "Kopyalandı!",
    network: "Ağ",
    confirmations: "ONAYLAR",
    minDeposit: "MİN. YATIRIM",
    creditTime: "TAHMİNİ KREDİ",
    travelRule: "Travel Rule: Eşleşen adresler gerekli olabilir.",
    // Bank Wire
    bankDetails: "Banka Bilgileri",
    beneficiary: "Alıcı",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Banka",
    reference: "Referans",
    referenceNote: "Referans kodunu ödeme açıklamasına eklemeyi unutmayın.",
    copyAll: "Tümünü Kopyala",
    settlement: "Takas: 1-3 iş günü",
    // History
    depositHistory: "Yatırım Geçmişi",
    noDeposits: "Henüz yatırım yok",
    pending: "Beklemede",
    completed: "Tamamlandı",
    processing: "İşleniyor",
    failed: "Başarısız",
    received: "Alındı",
  },
  en: {
    selectFundingRail: "FUNDING RAIL",
    cryptoFunding: "Digital Asset",
    cryptoFundingDesc: "Fund via crypto",
    bankWire: "Bank Wire",
    bankWireDesc: "International bank transfer",
    otcDesk: "OTC Desk",
    otcDeskDesc: "Institutional high-volume",
    comingSoon: "Coming Soon",
    depositAddresses: "Deposit Addresses",
    depositAddressesDesc: "All deposits must be sent to the platform addresses below.",
    networkWarning: "Only send via the specified network. Incorrect transfers may result in permanent loss.",
    copyAddress: "Copy",
    copied: "Copied!",
    network: "Network",
    confirmations: "CONFIRMATIONS",
    minDeposit: "MIN. DEPOSIT",
    creditTime: "EST. CREDIT",
    travelRule: "Travel Rule: Matching addresses may be required.",
    bankDetails: "Bank Details",
    beneficiary: "Beneficiary",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Bank",
    reference: "Reference",
    referenceNote: "Include the reference code in your payment description.",
    copyAll: "Copy All Details",
    settlement: "Settlement: 1-3 business days",
    depositHistory: "Deposit History",
    noDeposits: "No deposits yet",
    pending: "Pending",
    completed: "Completed",
    processing: "Processing",
    failed: "Failed",
    received: "Received",
  },
  de: {
    selectFundingRail: "FINANZIERUNGSMETHODE",
    cryptoFunding: "Digitale Vermögenswerte",
    cryptoFundingDesc: "Krypto-Finanzierung",
    bankWire: "Banküberweisung",
    bankWireDesc: "Internationale Überweisung",
    otcDesk: "OTC Desk",
    otcDeskDesc: "Institutionelles Volumen",
    comingSoon: "Demnächst",
    depositAddresses: "Einzahlungsadressen",
    depositAddressesDesc: "Alle Einzahlungen müssen an die Plattformadressen gesendet werden.",
    networkWarning: "Nur über das angegebene Netzwerk senden.",
    copyAddress: "Kopieren",
    copied: "Kopiert!",
    network: "Netzwerk",
    confirmations: "BESTÄTIGUNGEN",
    minDeposit: "MIN. EINZAHLUNG",
    creditTime: "GESCH. GUTSCHRIFT",
    travelRule: "Travel Rule: Übereinstimmende Adressen können erforderlich sein.",
    bankDetails: "Bankdaten",
    beneficiary: "Empfänger",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Bank",
    reference: "Referenz",
    referenceNote: "Referenzcode in die Zahlungsbeschreibung aufnehmen.",
    copyAll: "Alle Details Kopieren",
    settlement: "Abwicklung: 1-3 Werktage",
    depositHistory: "Einzahlungshistorie",
    noDeposits: "Noch keine Einzahlungen",
    pending: "Ausstehend",
    completed: "Abgeschlossen",
    processing: "Verarbeitung",
    failed: "Fehlgeschlagen",
    received: "Empfangen",
  },
  fr: {
    selectFundingRail: "MÉTHODE DE FINANCEMENT",
    cryptoFunding: "Actif Numérique",
    cryptoFundingDesc: "Financement crypto",
    bankWire: "Virement Bancaire",
    bankWireDesc: "Virement international",
    otcDesk: "Bureau OTC",
    otcDeskDesc: "Volume institutionnel",
    comingSoon: "Bientôt",
    depositAddresses: "Adresses de Dépôt",
    depositAddressesDesc: "Tous les dépôts doivent être envoyés aux adresses ci-dessous.",
    networkWarning: "Envoyez uniquement via le réseau spécifié.",
    copyAddress: "Copier",
    copied: "Copié!",
    network: "Réseau",
    confirmations: "CONFIRMATIONS",
    minDeposit: "DÉPÔT MIN.",
    creditTime: "CRÉDIT EST.",
    travelRule: "Travel Rule: Des adresses correspondantes peuvent être requises.",
    bankDetails: "Coordonnées Bancaires",
    beneficiary: "Bénéficiaire",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Banque",
    reference: "Référence",
    referenceNote: "Incluez le code de référence dans la description du paiement.",
    copyAll: "Copier Tout",
    settlement: "Règlement: 1-3 jours ouvrables",
    depositHistory: "Historique des Dépôts",
    noDeposits: "Aucun dépôt",
    pending: "En attente",
    completed: "Terminé",
    processing: "Traitement",
    failed: "Échoué",
    received: "Reçu",
  },
  ar: {
    selectFundingRail: "طريقة التمويل",
    cryptoFunding: "الأصول الرقمية",
    cryptoFundingDesc: "التمويل بالعملات المشفرة",
    bankWire: "تحويل بنكي",
    bankWireDesc: "تحويل بنكي دولي",
    otcDesk: "مكتب OTC",
    otcDeskDesc: "حجم مؤسسي",
    comingSoon: "قريباً",
    depositAddresses: "عناوين الإيداع",
    depositAddressesDesc: "يجب إرسال جميع الإيداعات إلى عناوين المنصة أدناه.",
    networkWarning: "أرسل فقط عبر الشبكة المحددة.",
    copyAddress: "نسخ",
    copied: "تم النسخ!",
    network: "الشبكة",
    confirmations: "التأكيدات",
    minDeposit: "الحد الأدنى",
    creditTime: "وقت الإيداع",
    travelRule: "قاعدة السفر: قد تكون العناوين المطابقة مطلوبة.",
    bankDetails: "تفاصيل البنك",
    beneficiary: "المستفيد",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "البنك",
    reference: "المرجع",
    referenceNote: "قم بتضمين رمز المرجع في وصف الدفع.",
    copyAll: "نسخ الكل",
    settlement: "التسوية: 1-3 أيام عمل",
    depositHistory: "سجل الإيداعات",
    noDeposits: "لا توجد إيداعات",
    pending: "معلق",
    completed: "مكتمل",
    processing: "قيد المعالجة",
    failed: "فشل",
    received: "مستلم",
  },
  ru: {
    selectFundingRail: "Метод Финансирования",
    cryptoFunding: "Цифровые Активы",
    cryptoFundingDesc: "Крипто-финансирование",
    bankWire: "Банковский Перевод",
    bankWireDesc: "Международный перевод",
    otcDesk: "OTC Стол",
    otcDeskDesc: "Институциональный объем",
    comingSoon: "Скоро",
    depositAddresses: "Адреса Депозитов",
    depositAddressesDesc: "Все депозиты должны быть отправлены на адреса платформы ниже.",
    networkWarning: "Отправляйте только через указанную сеть.",
    copyAddress: "Копировать",
    copied: "Скопировано!",
    network: "Сеть",
    confirmations: "Подтверждения",
    minDeposit: "Мин. Депозит",
    creditTime: "Прибл. Зачисление",
    travelRule: "Travel Rule: Могут потребоваться соответствующие адреса.",
    bankDetails: "Банковские Реквизиты",
    beneficiary: "Получатель",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Банк",
    reference: "Референс",
    referenceNote: "Укажите референс-код в описании платежа.",
    copyAll: "Копировать Все",
    settlement: "Расчет: 1-3 рабочих дня",
    depositHistory: "История Депозитов",
    noDeposits: "Депозитов нет",
    pending: "Ожидание",
    completed: "Завершено",
    processing: "Обработка",
    failed: "Ошибка",
    received: "Получено",
  },
};

// Asset info for deposit addresses
const depositAssetInfo: Record<string, { icon: string; name: string; color: string; confirmations: string; minDeposit: string; creditTime: string }> = {
  BTC: { icon: "₿", name: "Bitcoin", color: "bg-orange-500", confirmations: "3", minDeposit: "0.0005 BTC", creditTime: "~30 min" },
  ETH: { icon: "Ξ", name: "Ethereum", color: "bg-blue-500", confirmations: "12", minDeposit: "0.005 ETH", creditTime: "~15 min" },
  USDT: { icon: "₮", name: "Tether", color: "bg-[#2F6F62]", confirmations: "12", minDeposit: "10 USDT", creditTime: "~15 min" },
  USDC: { icon: "$", name: "USD Coin", color: "bg-blue-600", confirmations: "12", minDeposit: "10 USDC", creditTime: "~15 min" },
};

interface DepositAddressInfo {
  address: string;
  network: string;
  memo?: string;
}

interface TransactionRecord {
  id: string;
  type: string;
  token: string;
  amount: string;
  amountUsd?: string;
  status: string;
  timestamp: number;
  toAddress?: string;
  fromAddress?: string;
  txHash?: string;
}

type FundingRail = "crypto" | "bank" | "otc";

export function FundTab() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;

  const [selectedRail, setSelectedRail] = useState<FundingRail>("crypto");
  const [depositAddresses, setDepositAddresses] = useState<Record<string, DepositAddressInfo>>({});
  const [depositLoading, setDepositLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load deposit addresses
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/deposit");
        const data = await res.json();
        if (data.success && data.addresses) setDepositAddresses(data.addresses);
      } catch (error) {
        console.error("Failed to load deposit addresses:", error);
      } finally {
        setDepositLoading(false);
      }
    };
    load();
  }, []);

  // Load deposit history
  const loadHistory = useCallback(async () => {
    if (!address) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/user/transactions?address=${address}&type=deposit&limit=20`);
      const data = await res.json();
      if (data.success) setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Failed to load deposit history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [address]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) { console.error("Copy failed:", error); }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-[#2F6F62] bg-[#2F6F62]/10";
      case "pending": return "text-[#BFA181] bg-[#BFA181]/10";
      case "failed": return "text-red-500 bg-red-500/10";
      default: return "text-slate-500 bg-slate-500/10";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return t.completed;
      case "pending": return t.pending;
      case "processing": return t.processing;
      case "failed": return t.failed;
      default: return status;
    }
  };

  const rails: { id: FundingRail; icon: ReactNode; disabled?: boolean }[] = [
    {
      id: "crypto",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: "bank",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "otc",
      disabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
  ];

  const railLabels: Record<FundingRail, string> = {
    crypto: t.cryptoFunding,
    bank: t.bankWire,
    otc: t.otcDesk,
  };

  const railDescs: Record<FundingRail, string> = {
    crypto: t.cryptoFundingDesc,
    bank: t.bankWireDesc,
    otc: t.otcDeskDesc,
  };

  return (
    <div>
      {/* Funding Overview */}
      <FundingOverviewPanel />

      {/* Funding Rail Selector */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
          {t.selectFundingRail}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {rails.map((rail) => (
            <button
              key={rail.id}
              onClick={() => !rail.disabled && setSelectedRail(rail.id)}
              disabled={rail.disabled}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                rail.disabled
                  ? "border-stone-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
                  : selectedRail === rail.id
                  ? "border-[#BFA181] bg-[#BFA181]/5"
                  : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
              }`}
            >
              {rail.disabled && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#BFA181]/20 text-[#BFA181]">
                  {t.comingSoon}
                </span>
              )}
              <div className={`mb-2 ${selectedRail === rail.id ? "text-[#BFA181]" : "text-slate-400"}`}>
                {rail.icon}
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{railLabels[rail.id]}</p>
              <p className="text-xs text-slate-500 mt-0.5">{railDescs[rail.id]}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* CRYPTO RAIL CONTENT                    */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "crypto" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t.depositAddresses}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.depositAddressesDesc}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>

          {/* Network Warning */}
          <div className="mb-4 p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#BFA181] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-[#BFA181]">{t.networkWarning}</p>
            </div>
          </div>

          {depositLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(depositAddresses).map(([coin, info]) => {
                const meta = depositAssetInfo[coin] || { icon: "?", name: coin, color: "bg-slate-500", confirmations: "—", minDeposit: "—", creditTime: "—" };
                return (
                  <div key={coin} className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50 transition-all">
                    {/* Coin Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${meta.color} flex items-center justify-center text-white font-bold`}>
                        {meta.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800 dark:text-white">{meta.name}</h4>
                        <p className="text-xs text-slate-500">{info.network}</p>
                      </div>
                      {/* QR Button */}
                      <div className="hidden sm:block">
                        <QRCodeSVG value={info.address} size={48} />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-center gap-2 mb-3">
                      <code className="flex-1 px-3 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                        {info.address}
                      </code>
                      <button
                        onClick={() => copyToClipboard(info.address, `addr-${coin}`)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          copiedField === `addr-${coin}`
                            ? "bg-[#2F6F62] text-white"
                            : "bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#BFA181] hover:text-white"
                        }`}
                      >
                        {copiedField === `addr-${coin}` ? t.copied : t.copyAddress}
                      </button>
                    </div>

                    {/* Memo if exists */}
                    {info.memo && (
                      <div className="mb-3 px-3 py-2 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Memo/Tag: <span className="font-mono">{info.memo}</span>
                        </p>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                        <p className="text-[10px] text-slate-500">{t.confirmations}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{meta.confirmations}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                        <p className="text-[10px] text-slate-500">{t.minDeposit}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{meta.minDeposit}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-stone-50 dark:bg-slate-800/50">
                        <p className="text-[10px] text-slate-500">{t.creditTime}</p>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{meta.creditTime}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Travel Rule Notice */}
          <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.travelRule}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* BANK WIRE CONTENT                      */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "bank" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.bankDetails}</h2>

          <div className="space-y-4 mb-6">
            {[
              { label: t.beneficiary, value: "Auxite Custody Ltd.", mono: false },
              { label: t.iban, value: "CH93 0076 2011 6238 5295 7", mono: true },
              { label: t.swift, value: "UBSWCHZH80A", mono: true },
              { label: t.bank, value: "UBS Switzerland AG", mono: false },
              { label: t.reference, value: address ? `AX-${address.slice(2, 8).toUpperCase()}` : "AX-VLT-XXXX", mono: false, highlight: true },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-stone-100 dark:border-slate-800 last:border-0">
                <span className="text-sm text-slate-500 dark:text-slate-400">{row.label}</span>
                <span className={`text-sm font-medium ${row.highlight ? "text-[#BFA181]" : "text-slate-800 dark:text-white"} ${row.mono ? "font-mono" : ""}`}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Important Note */}
          <div className="p-3 rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/20 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#BFA181] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-slate-600 dark:text-slate-400">{t.referenceNote}</p>
            </div>
          </div>

          {/* Settlement */}
          <div className="p-3 rounded-xl bg-[#2F6F62]/5 border border-[#2F6F62]/20 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-[#2F6F62] font-medium">{t.settlement}</p>
            </div>
          </div>

          {/* Copy All */}
          <button
            onClick={() => {
              const details = `Beneficiary: Auxite Custody Ltd.\nIBAN: CH93 0076 2011 6238 5295 7\nSWIFT: UBSWCHZH80A\nBank: UBS Switzerland AG\nReference: ${address ? `AX-${address.slice(2, 8).toUpperCase()}` : "AX-VLT-XXXX"}`;
              copyToClipboard(details, "bank-all");
            }}
            className="w-full py-3 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copiedField === "bank-all" ? t.copied : t.copyAll}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* OTC DESK - Coming Soon                 */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "otc" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-8 mb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#BFA181]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.otcDesk}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.otcDeskDesc}</p>
          <span className="inline-block px-4 py-2 rounded-full bg-[#BFA181]/20 text-[#BFA181] text-sm font-semibold">
            {t.comingSoon}
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* DEPOSIT HISTORY                        */}
      {/* ═══════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.depositHistory}</h3>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">{t.noDeposits}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2F6F62]/10">
                  <svg className="w-5 h-5 text-[#2F6F62] -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.received} {tx.token}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {getStatusLabel(tx.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.timestamp)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#2F6F62]">+{tx.amount} {tx.token}</p>
                  {tx.amountUsd && <p className="text-xs text-slate-500">${parseFloat(tx.amountUsd).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FundTab;
