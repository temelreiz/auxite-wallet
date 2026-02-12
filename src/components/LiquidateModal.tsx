"use client";

// ============================================
// LIQUIDATE HOLDINGS MODAL
// 3-Step Institutional Liquidation Flow
// Digital Gold Bank — NOT Trading Platform
// ============================================
// Kelime Sözlüğü:
//   Sell → Liquidate
//   Trade → Execution
//   Order → Request
//   Position → Holdings
//   PnL → Proceeds
//   Bid/Ask → Execution Price
//   Spread → (gömülü — gösterilmez)
//   Withdraw → Settlement
// ============================================

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// TYPES
// ============================================

interface LiquidateMetalInfo {
  symbol: string;
  name: string;
  allocated: number;
  price: number;
}

interface LiquidateModalProps {
  isOpen: boolean;
  onClose: () => void;
  metal: LiquidateMetalInfo;
  address: string;
  onSuccess?: () => void;
}

type SettlementType = "AUXM" | "USDT" | "BTC" | "ETH";
type Step = 1 | 2 | 3;

interface QuoteData {
  id: string;
  pricePerGram: number;
  totalValue: number;
  timeRemaining: number;
  expiresAt: number;
}

// ============================================
// TRANSLATIONS — 6 Languages
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Varlık Likidasyonu",
    subtitle: "Tahsisli metal varlıklarınızı likide edin",
    availableHoldings: "Kullanılabilir Varlıklar",
    allocatedGrams: "Tahsisli",
    currentValue: "Güncel Değer",
    amount: "Miktar",
    grams: "gram",
    max: "Maks",
    executionPrice: "İcra Fiyatı",
    perGram: "/gram",
    settlementMethod: "Takas Yöntemi",
    estimatedProceeds: "Tahmini Gelir",
    estimatedSettlement: "Tahmini Takas: T+0 / Aynı Gün",
    institutionalNotice: "İşlemler kurumsal likidite kanalları üzerinden gerçekleştirilir.",
    continue: "Devam Et",
    cancel: "İptal",
    back: "Geri",
    executionSummary: "İcra Özeti",
    metal: "Metal",
    quantity: "Miktar",
    price: "Fiyat",
    totalProceeds: "Toplam Gelir",
    settlementType: "Takas Türü",
    twoFactorRequired: "İki Faktörlü Doğrulama Gerekli",
    enterCode: "Doğrulama kodunuzu girin",
    confirmLiquidation: "Likidasyonu Onayla",
    processing: "İşleniyor...",
    liquidationComplete: "Likidasyon Tamamlandı",
    successMessage: "Varlık likidasyonu başarıyla gerçekleştirildi.",
    proceeds: "Gelir",
    settledTo: "Takas Edildi",
    viewActivity: "İşlem Geçmişini Görüntüle",
    close: "Kapat",
    insufficientBalance: "Yetersiz bakiye",
    invalidAmount: "Geçersiz miktar",
    quoteExpired: "Fiyat süresi doldu. Lütfen tekrar deneyin.",
    executionFailed: "İcra başarısız. Lütfen tekrar deneyin.",
    fetchingPrice: "Fiyat alınıyor...",
    priceRefresh: "Fiyat yenileniyor...",
    quoteTimer: "Fiyat kilidi",
    seconds: "saniye",
  },
  en: {
    title: "Liquidate Holdings",
    subtitle: "Liquidate your allocated metal holdings",
    availableHoldings: "Available Holdings",
    allocatedGrams: "Allocated",
    currentValue: "Current Value",
    amount: "Amount",
    grams: "grams",
    max: "Max",
    executionPrice: "Execution Price",
    perGram: "/gram",
    settlementMethod: "Settlement Method",
    estimatedProceeds: "Estimated Proceeds",
    estimatedSettlement: "Estimated Settlement: T+0 / Same Day",
    institutionalNotice: "Executions are performed through institutional liquidity venues.",
    continue: "Continue",
    cancel: "Cancel",
    back: "Back",
    executionSummary: "Execution Summary",
    metal: "Metal",
    quantity: "Quantity",
    price: "Price",
    totalProceeds: "Total Proceeds",
    settlementType: "Settlement Type",
    twoFactorRequired: "Two-Factor Authentication Required",
    enterCode: "Enter your verification code",
    confirmLiquidation: "Confirm Liquidation",
    processing: "Processing...",
    liquidationComplete: "Liquidation Complete",
    successMessage: "Your holdings have been successfully liquidated.",
    proceeds: "Proceeds",
    settledTo: "Settled To",
    viewActivity: "View Activity",
    close: "Close",
    insufficientBalance: "Insufficient balance",
    invalidAmount: "Invalid amount",
    quoteExpired: "Price expired. Please try again.",
    executionFailed: "Execution failed. Please try again.",
    fetchingPrice: "Fetching price...",
    priceRefresh: "Refreshing price...",
    quoteTimer: "Price lock",
    seconds: "seconds",
  },
  de: {
    title: "Bestände Liquidieren",
    subtitle: "Liquidieren Sie Ihre zugewiesenen Metallbestände",
    availableHoldings: "Verfügbare Bestände",
    allocatedGrams: "Zugewiesen",
    currentValue: "Aktueller Wert",
    amount: "Betrag",
    grams: "Gramm",
    max: "Max",
    executionPrice: "Ausführungspreis",
    perGram: "/Gramm",
    settlementMethod: "Abwicklungsmethode",
    estimatedProceeds: "Geschätzter Erlös",
    estimatedSettlement: "Geschätzte Abwicklung: T+0 / Gleicher Tag",
    institutionalNotice: "Ausführungen erfolgen über institutionelle Liquiditätskanäle.",
    continue: "Weiter",
    cancel: "Abbrechen",
    back: "Zurück",
    executionSummary: "Ausführungsübersicht",
    metal: "Metall",
    quantity: "Menge",
    price: "Preis",
    totalProceeds: "Gesamterlös",
    settlementType: "Abwicklungstyp",
    twoFactorRequired: "Zwei-Faktor-Authentifizierung Erforderlich",
    enterCode: "Geben Sie Ihren Bestätigungscode ein",
    confirmLiquidation: "Liquidation Bestätigen",
    processing: "Verarbeitung...",
    liquidationComplete: "Liquidation Abgeschlossen",
    successMessage: "Ihre Bestände wurden erfolgreich liquidiert.",
    proceeds: "Erlös",
    settledTo: "Abgewickelt An",
    viewActivity: "Aktivität Anzeigen",
    close: "Schließen",
    insufficientBalance: "Unzureichendes Guthaben",
    invalidAmount: "Ungültiger Betrag",
    quoteExpired: "Preis abgelaufen. Bitte versuchen Sie es erneut.",
    executionFailed: "Ausführung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    fetchingPrice: "Preis wird abgerufen...",
    priceRefresh: "Preis wird aktualisiert...",
    quoteTimer: "Preissperre",
    seconds: "Sekunden",
  },
  fr: {
    title: "Liquider les Avoirs",
    subtitle: "Liquidez vos avoirs métalliques alloués",
    availableHoldings: "Avoirs Disponibles",
    allocatedGrams: "Alloué",
    currentValue: "Valeur Actuelle",
    amount: "Montant",
    grams: "grammes",
    max: "Max",
    executionPrice: "Prix d'Exécution",
    perGram: "/gramme",
    settlementMethod: "Méthode de Règlement",
    estimatedProceeds: "Produit Estimé",
    estimatedSettlement: "Règlement Estimé: T+0 / Même Jour",
    institutionalNotice: "Les exécutions sont effectuées via des canaux de liquidité institutionnels.",
    continue: "Continuer",
    cancel: "Annuler",
    back: "Retour",
    executionSummary: "Résumé d'Exécution",
    metal: "Métal",
    quantity: "Quantité",
    price: "Prix",
    totalProceeds: "Produit Total",
    settlementType: "Type de Règlement",
    twoFactorRequired: "Authentification à Deux Facteurs Requise",
    enterCode: "Entrez votre code de vérification",
    confirmLiquidation: "Confirmer la Liquidation",
    processing: "Traitement...",
    liquidationComplete: "Liquidation Terminée",
    successMessage: "Vos avoirs ont été liquidés avec succès.",
    proceeds: "Produit",
    settledTo: "Réglé Vers",
    viewActivity: "Voir l'Activité",
    close: "Fermer",
    insufficientBalance: "Solde insuffisant",
    invalidAmount: "Montant invalide",
    quoteExpired: "Prix expiré. Veuillez réessayer.",
    executionFailed: "Exécution échouée. Veuillez réessayer.",
    fetchingPrice: "Récupération du prix...",
    priceRefresh: "Actualisation du prix...",
    quoteTimer: "Verrouillage du prix",
    seconds: "secondes",
  },
  ar: {
    title: "تصفية الحيازات",
    subtitle: "قم بتصفية حيازاتك المعدنية المخصصة",
    availableHoldings: "الحيازات المتاحة",
    allocatedGrams: "مخصص",
    currentValue: "القيمة الحالية",
    amount: "المبلغ",
    grams: "غرام",
    max: "الحد الأقصى",
    executionPrice: "سعر التنفيذ",
    perGram: "/غرام",
    settlementMethod: "طريقة التسوية",
    estimatedProceeds: "العائدات المقدرة",
    estimatedSettlement: "التسوية المقدرة: T+0 / نفس اليوم",
    institutionalNotice: "يتم تنفيذ العمليات من خلال قنوات السيولة المؤسسية.",
    continue: "متابعة",
    cancel: "إلغاء",
    back: "رجوع",
    executionSummary: "ملخص التنفيذ",
    metal: "المعدن",
    quantity: "الكمية",
    price: "السعر",
    totalProceeds: "إجمالي العائدات",
    settlementType: "نوع التسوية",
    twoFactorRequired: "المصادقة الثنائية مطلوبة",
    enterCode: "أدخل رمز التحقق",
    confirmLiquidation: "تأكيد التصفية",
    processing: "جاري المعالجة...",
    liquidationComplete: "تمت التصفية",
    successMessage: "تم تصفية حيازاتك بنجاح.",
    proceeds: "العائدات",
    settledTo: "تمت التسوية إلى",
    viewActivity: "عرض النشاط",
    close: "إغلاق",
    insufficientBalance: "رصيد غير كافٍ",
    invalidAmount: "مبلغ غير صالح",
    quoteExpired: "انتهت صلاحية السعر. يرجى المحاولة مرة أخرى.",
    executionFailed: "فشل التنفيذ. يرجى المحاولة مرة أخرى.",
    fetchingPrice: "جاري جلب السعر...",
    priceRefresh: "جاري تحديث السعر...",
    quoteTimer: "قفل السعر",
    seconds: "ثوانٍ",
  },
  ru: {
    title: "Ликвидация Активов",
    subtitle: "Ликвидируйте ваши выделенные металлические активы",
    availableHoldings: "Доступные Активы",
    allocatedGrams: "Выделено",
    currentValue: "Текущая Стоимость",
    amount: "Сумма",
    grams: "грамм",
    max: "Макс",
    executionPrice: "Цена Исполнения",
    perGram: "/грамм",
    settlementMethod: "Метод Расчёта",
    estimatedProceeds: "Ожидаемая Выручка",
    estimatedSettlement: "Ожидаемый Расчёт: T+0 / В тот же день",
    institutionalNotice: "Исполнение осуществляется через институциональные каналы ликвидности.",
    continue: "Продолжить",
    cancel: "Отмена",
    back: "Назад",
    executionSummary: "Сводка Исполнения",
    metal: "Металл",
    quantity: "Количество",
    price: "Цена",
    totalProceeds: "Общая Выручка",
    settlementType: "Тип Расчёта",
    twoFactorRequired: "Требуется Двухфакторная Аутентификация",
    enterCode: "Введите код подтверждения",
    confirmLiquidation: "Подтвердить Ликвидацию",
    processing: "Обработка...",
    liquidationComplete: "Ликвидация Завершена",
    successMessage: "Ваши активы успешно ликвидированы.",
    proceeds: "Выручка",
    settledTo: "Рассчитано В",
    viewActivity: "Просмотр Активности",
    close: "Закрыть",
    insufficientBalance: "Недостаточный баланс",
    invalidAmount: "Недопустимая сумма",
    quoteExpired: "Цена истекла. Пожалуйста, попробуйте снова.",
    executionFailed: "Исполнение не удалось. Пожалуйста, попробуйте снова.",
    fetchingPrice: "Получение цены...",
    priceRefresh: "Обновление цены...",
    quoteTimer: "Блокировка цены",
    seconds: "секунд",
  },
};

// ============================================
// SETTLEMENT OPTIONS
// ============================================

const settlementOptions: { id: SettlementType; label: string; icon: string; color: string }[] = [
  { id: "AUXM", label: "AUXM", icon: "◈", color: "indigo" },
  { id: "USDT", label: "USDT", icon: "₮", color: "emerald" },
  { id: "BTC", label: "BTC", icon: "₿", color: "amber" },
  { id: "ETH", label: "ETH", icon: "Ξ", color: "blue" },
];

// Metal icons
const metalIcons: Record<string, string> = {
  AUXG: "/images/metals/gold.png",
  AUXS: "/images/metals/silver.png",
  AUXPT: "/images/metals/platinum.png",
  AUXPD: "/images/metals/palladium.png",
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LiquidateModal({ isOpen, onClose, metal, address, onSuccess }: LiquidateModalProps) {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  // State
  const [step, setStep] = useState<Step>(1);
  const [grams, setGrams] = useState("");
  const [settlement, setSettlement] = useState<SettlementType>("AUXM");
  const [executionPrice, setExecutionPrice] = useState<number>(metal.price);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteTimer, setQuoteTimer] = useState(0);
  const [successData, setSuccessData] = useState<{ proceeds: number; settlement: string } | null>(null);
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [fetchingPrice, setFetchingPrice] = useState(false);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setGrams("");
      setSettlement("AUXM");
      setExecutionPrice(metal.price);
      setError(null);
      setTwoFACode("");
      setQuote(null);
      setSuccessData(null);
      setLoading(false);
    }
  }, [isOpen, metal.price]);

  // Fetch execution price & 2FA status on mount
  useEffect(() => {
    if (!isOpen || !address) return;

    const fetchData = async () => {
      try {
        // Fetch execution price
        const priceRes = await fetch(`/api/prices?chain=84532`);
        const priceData = await priceRes.json();
        if (priceData.basePrices?.[metal.symbol]) {
          setExecutionPrice(priceData.basePrices[metal.symbol]);
        }

        // Fetch 2FA status
        const twoFARes = await fetch("/api/security/2fa/status", {
          headers: { "x-wallet-address": address },
        });
        const twoFAData = await twoFARes.json();
        setTwoFAEnabled(twoFAData.enabled || false);
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };

    fetchData();
  }, [isOpen, address, metal.symbol]);

  // Fetch crypto prices for settlement conversion
  useEffect(() => {
    if (!isOpen || settlement === "AUXM") return;

    const fetchCryptoPrices = async () => {
      try {
        const res = await fetch(`/api/trade?type=sell&fromToken=${metal.symbol}&toToken=${settlement}&amount=${parseFloat(grams) || 1}&address=${address}`);
        const data = await res.json();
        if (data.success && data.preview) {
          setCryptoPrices((prev) => ({
            ...prev,
            [settlement]: data.preview.toAmount / (parseFloat(grams) || 1),
          }));
        }
      } catch {
        // Silently fail — use execution price fallback
      }
    };

    if (parseFloat(grams) > 0) {
      fetchCryptoPrices();
    }
  }, [isOpen, settlement, grams, metal.symbol, address]);

  // Quote timer countdown
  useEffect(() => {
    if (!quote || quoteTimer <= 0) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((quote.expiresAt - Date.now()) / 1000));
      setQuoteTimer(remaining);

      if (remaining <= 0) {
        setQuote(null);
        setStep(1);
        setError(t.quoteExpired);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [quote, quoteTimer, t.quoteExpired]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const gramsNum = parseFloat(grams) || 0;
  const totalValue = gramsNum * executionPrice;

  const estimatedProceeds = useCallback(() => {
    if (settlement === "AUXM") return totalValue;
    if (cryptoPrices[settlement]) return gramsNum * (cryptoPrices[settlement] || 0);
    // Fallback — rough estimate using execution price
    return totalValue;
  }, [settlement, totalValue, gramsNum, cryptoPrices]);

  const proceedsUnit = settlement === "AUXM" ? "AUXM" : settlement;

  const formatCurrency = (value: number) => {
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatAmount = (value: number, decimals = 6) => {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: decimals });
  };

  // ============================================
  // STEP 1 → STEP 2 (Get Quote)
  // ============================================

  const handleContinue = async () => {
    // Validation
    if (gramsNum <= 0) {
      setError(t.invalidAmount);
      return;
    }
    if (gramsNum > metal.allocated) {
      setError(t.insufficientBalance);
      return;
    }

    setError(null);
    setFetchingPrice(true);

    try {
      // Get locked quote
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "sell",
          metal: metal.symbol,
          grams: gramsNum,
          address,
        }),
      });

      const data = await res.json();

      if (!data.success || !data.quote) {
        setError(data.error || t.executionFailed);
        return;
      }

      setQuote({
        id: data.quote.id,
        pricePerGram: data.quote.pricePerGram,
        totalValue: data.quote.totalValue,
        timeRemaining: data.quote.timeRemaining,
        expiresAt: Date.now() + (data.quote.timeRemaining * 1000),
      });
      setQuoteTimer(data.quote.timeRemaining);
      setExecutionPrice(data.quote.pricePerGram);
      setStep(2);
    } catch {
      setError(t.executionFailed);
    } finally {
      setFetchingPrice(false);
    }
  };

  // ============================================
  // STEP 2 → STEP 3 (Execute Trade)
  // ============================================

  const handleConfirm = async () => {
    if (twoFAEnabled && twoFACode.length < 6) {
      setError(t.enterCode);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Determine trade parameters based on settlement
      let fromToken = metal.symbol;
      let toToken = settlement === "AUXM" ? "AUXM" : settlement;

      const tradeBody: Record<string, unknown> = {
        address,
        type: "sell",
        fromToken,
        toToken,
        fromAmount: gramsNum,
        executeOnChain: true,
        quoteId: quote?.id,
      };

      if (twoFAEnabled && twoFACode) {
        tradeBody.twoFACode = twoFACode;
      }

      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tradeBody),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || t.executionFailed);
        return;
      }

      // Success
      setSuccessData({
        proceeds: data.transaction.toAmount,
        settlement: toToken,
      });
      setStep(3);

      // Refresh parent balances
      onSuccess?.();
    } catch {
      setError(t.executionFailed);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================ */}
        {/* STEP 1: Amount & Settlement */}
        {/* ============================================ */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#BFA181]/10 flex items-center justify-center">
                  {metalIcons[metal.symbol] ? (
                    <Image
                      src={metalIcons[metal.symbol]}
                      alt={metal.name}
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-[#BFA181] font-bold text-lg">{metal.symbol[0]}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.title}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{metal.name} ({metal.symbol})</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Available Holdings Card */}
            <div className="bg-stone-50 dark:bg-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                    {t.availableHoldings}
                  </p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
                    {metal.allocated.toFixed(2)}
                    <span className="text-sm font-normal text-slate-500 ml-1">{t.grams}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                    {t.currentValue}
                  </p>
                  <p className="text-lg font-bold text-[#BFA181] mt-1">
                    {formatCurrency(metal.allocated * executionPrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">
                {t.amount} ({t.grams})
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={grams}
                    onChange={(e) => {
                      setGrams(e.target.value);
                      setError(null);
                    }}
                    placeholder="0.00"
                    min="0"
                    max={metal.allocated}
                    step="0.01"
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-semibold text-lg focus:outline-none focus:border-[#BFA181] focus:ring-1 focus:ring-[#BFA181] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">
                    g
                  </span>
                </div>
                <button
                  onClick={() => setGrams(metal.allocated.toFixed(2))}
                  className="px-4 py-3 bg-[#BFA181]/15 text-[#BFA181] font-semibold text-sm rounded-xl hover:bg-[#BFA181]/25 transition-colors"
                >
                  {t.max}
                </button>
              </div>
            </div>

            {/* Execution Price */}
            <div className="flex items-center justify-between py-3 border-t border-stone-200 dark:border-slate-700">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t.executionPrice}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {formatCurrency(executionPrice)}
                <span className="text-xs font-normal text-slate-500">{t.perGram}</span>
              </span>
            </div>

            {/* Settlement Method */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">
                {t.settlementMethod}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {settlementOptions.map((opt) => {
                  const isActive = settlement === opt.id;
                  const colorMap: Record<string, string> = {
                    indigo: isActive ? "border-indigo-500 bg-indigo-500/10" : "border-stone-200 dark:border-slate-700",
                    emerald: isActive ? "border-[#2F6F62] bg-[#2F6F62]/10" : "border-stone-200 dark:border-slate-700",
                    amber: isActive ? "border-amber-500 bg-amber-500/10" : "border-stone-200 dark:border-slate-700",
                    blue: isActive ? "border-blue-500 bg-blue-500/10" : "border-stone-200 dark:border-slate-700",
                  };
                  const textColorMap: Record<string, string> = {
                    indigo: isActive ? "text-indigo-500" : "text-slate-500",
                    emerald: isActive ? "text-[#2F6F62]" : "text-slate-500",
                    amber: isActive ? "text-amber-500" : "text-slate-500",
                    blue: isActive ? "text-blue-500" : "text-slate-500",
                  };
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSettlement(opt.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${colorMap[opt.color]} hover:border-[#BFA181]/50`}
                    >
                      <span className={`text-lg mb-1 ${textColorMap[opt.color]}`}>{opt.icon}</span>
                      <span className={`text-[11px] font-semibold ${isActive ? "text-slate-800 dark:text-white" : "text-slate-500"}`}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estimated Proceeds */}
            {gramsNum > 0 && (
              <div className="bg-[#2F6F62]/10 rounded-xl p-4 border border-[#2F6F62]/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#2F6F62]">{t.estimatedProceeds}</span>
                  <span className="text-lg font-bold text-[#2F6F62]">
                    {settlement === "AUXM"
                      ? formatCurrency(estimatedProceeds())
                      : `${formatAmount(estimatedProceeds(), 8)} ${proceedsUnit}`}
                  </span>
                </div>
                <p className="text-[10px] text-[#2F6F62]/70">{t.estimatedSettlement}</p>
              </div>
            )}

            {/* Institutional Notice */}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center italic">
              {t.institutionalNotice}
            </p>

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={gramsNum <= 0 || gramsNum > metal.allocated || fetchingPrice}
              className="w-full py-3.5 bg-[#BFA181] text-white font-semibold rounded-xl hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {fetchingPrice ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.fetchingPrice}
                </>
              ) : (
                t.continue
              )}
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2: Confirmation */}
        {/* ============================================ */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.executionSummary}</h2>
                {quote && quoteTimer > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-[#2F6F62] animate-pulse" />
                    <span className="text-[10px] text-[#2F6F62] font-medium">
                      {t.quoteTimer}: {quoteTimer}{t.seconds}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setQuote(null);
                  setError(null);
                }}
                className="text-sm text-[#BFA181] font-medium hover:underline"
              >
                {t.back}
              </button>
            </div>

            {/* Summary Card */}
            <div className="bg-stone-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.metal}</span>
                <div className="flex items-center gap-2">
                  {metalIcons[metal.symbol] && (
                    <Image
                      src={metalIcons[metal.symbol]}
                      alt={metal.name}
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  )}
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">
                    {metal.name} ({metal.symbol})
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.quantity}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {gramsNum.toFixed(2)}g
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.executionPrice}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {formatCurrency(quote?.pricePerGram || executionPrice)}{t.perGram}
                </span>
              </div>
              <div className="border-t border-stone-200 dark:border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{t.settlementType}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{settlement}</span>
                </div>
              </div>
              <div className="border-t border-stone-200 dark:border-slate-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.totalProceeds}</span>
                  <span className="text-xl font-bold text-[#2F6F62]">
                    {settlement === "AUXM"
                      ? formatCurrency(quote?.totalValue || totalValue)
                      : `${formatAmount(estimatedProceeds(), 8)} ${proceedsUnit}`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2FA Input */}
            {twoFAEnabled && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                  {t.twoFactorRequired}
                </label>
                <input
                  type="text"
                  value={twoFACode}
                  onChange={(e) => {
                    setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setError(null);
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-[#BFA181] focus:ring-1 focus:ring-[#BFA181]"
                />
                <p className="text-[10px] text-slate-500 text-center">{t.enterCode}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}

            {/* Confirm Button */}
            <button
              onClick={handleConfirm}
              disabled={loading || (twoFAEnabled && twoFACode.length < 6)}
              className="w-full py-3.5 bg-[#BFA181] text-white font-semibold rounded-xl hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t.processing}
                </>
              ) : (
                t.confirmLiquidation
              )}
            </button>

            {/* Cancel */}
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-2.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium text-sm transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3: Success */}
        {/* ============================================ */}
        {step === 3 && successData && (
          <div className="p-6 space-y-5 text-center">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-[#2F6F62]/15 flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Title */}
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.liquidationComplete}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.successMessage}</p>
            </div>

            {/* Summary */}
            <div className="bg-stone-50 dark:bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.metal}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {gramsNum.toFixed(2)}g {metal.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.proceeds}</span>
                <span className="text-lg font-bold text-[#2F6F62]">
                  {successData.settlement === "AUXM"
                    ? formatCurrency(successData.proceeds)
                    : `${formatAmount(successData.proceeds, 8)} ${successData.settlement}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.settledTo}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {successData.settlement}
                </span>
              </div>
            </div>

            {/* View Activity */}
            <a
              href="/activity"
              className="inline-flex items-center gap-2 text-sm text-[#BFA181] font-semibold hover:underline"
            >
              {t.viewActivity}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* Close */}
            <button
              onClick={onClose}
              className="w-full py-3 border border-stone-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t.close}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
