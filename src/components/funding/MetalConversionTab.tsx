"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { TwoFactorGate } from "@/components/TwoFactorGate";
import { formatAmount } from "@/lib/format";

// ============================================
// METAL CONVERSION — Institutional Bullion Bank
// Architecture: SELL Metal_A → AUXM settlement → BUY Metal_B
// This is a CUSTODY MOVEMENT, not a trade.
// ============================================

// Metal configs
const METALS = [
  { symbol: "AUXG", name: "Gold", nameTr: "Altın", icon: "/auxg_icon.png", color: "#F59E0B", balanceKey: "auxg" },
  { symbol: "AUXS", name: "Silver", nameTr: "Gümüş", icon: "/auxs_icon.png", color: "#94A3B8", balanceKey: "auxs" },
  { symbol: "AUXPT", name: "Platinum", nameTr: "Platin", icon: "/auxpt_icon.png", color: "#CBD5E1", balanceKey: "auxpt" },
  { symbol: "AUXPD", name: "Palladium", nameTr: "Paladyum", icon: "/auxpd_icon.png", color: "#64748B", balanceKey: "auxpd" },
];

// ============================================
// TRANSLATIONS (6 languages)
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Metal Dönüşümü",
    subtitle: "Kıymetli metaller arasında dönüşüm yapın",
    convertFrom: "Kaynak Metal",
    convertTo: "Hedef Metal",
    selectSource: "Dönüştürmek istediğiniz metali seçin",
    selectTarget: "Hedef metalinizi seçin ve miktarı girin",
    available: "Kullanılabilir",
    encumbered: "Tahsis Edilmiş",
    total: "Toplam",
    amount: "Miktar (gram)",
    enterAmount: "Gram girin",
    max: "Maks",
    conversionRatio: "Gösterge Dönüşüm Oranı",
    estimatedOutput: "Tahmini Alınacak Miktar",
    indicativePricing: "Gösterge Fiyatlandırma",
    source: "Kaynak",
    target: "Hedef (tahmini)",
    executionSpread: "İşlem Spreadi",
    included: "Dahil",
    estimatedSettlement: "Tahmini Takas",
    immediate: "Anlık",
    pricingNote: "Fiyatlandırma kurumsal işlem koşullarını yansıtır.",
    marketNote: "Nihai işlem fiyatı piyasa koşullarına göre değişebilir.",
    executionCost: "İşlem Detayları",
    executionMethod: "İşlem Yöntemi",
    monetarySettlement: "Auxite likidite ağı üzerinden parasal takas",
    settlementCurrency: "Takas Birimi",
    auxmInternal: "AUXM (Dahili)",
    certificateAction: "Sertifika İşlemi",
    certRevoke: "Kaynak sertifika iptal edilir. Yeni sertifika düzenlenir.",
    confirmCheckbox: "Bu dönüşümün onaylandıktan sonra kesin olduğunu anlıyorum.",
    preview: "Dönüşüm Önizlemesi",
    youAreConverting: "Dönüştürüyorsunuz",
    from: "Kaynak",
    toEstimated: "Hedef (tahmini)",
    confirmConversion: "Dönüşümü Onayla",
    processing: "İşleniyor...",
    conversionCompleted: "Dönüşüm Tamamlandı",
    viewAllocation: "Yeni Tahsisi Görüntüle",
    downloadCert: "Sertifika İndir",
    newConversion: "Yeni Dönüşüm",
    recentConversions: "Son Dönüşümler",
    noConversions: "Henüz dönüşüm yapılmadı",
    step: "Adım",
    of: "/",
    back: "Geri",
    continue: "Devam",
    encumberedNote: "Tahsis edilmiş metaller dönüşüme uygun değildir.",
    vaultFrozen: "Kasa donduruldu. Dönüşüm yapılamaz.",
    indicativeOnly: "Yalnızca Gösterge — Büyük dönüşümler kurumsal masa onayı gerektirebilir.",
    insufficientBalance: "Yetersiz bakiye",
    minAmount: "Minimum dönüşüm: 1 gram",
    conversionFailed: "Dönüşüm başarısız oldu",
  },
  en: {
    title: "Metal Conversion",
    subtitle: "Convert between precious metals within your custody account",
    convertFrom: "Convert From",
    convertTo: "Convert To",
    selectSource: "Select the metal you want to convert",
    selectTarget: "Select target metal and enter amount",
    available: "Available",
    encumbered: "Encumbered",
    total: "Total",
    amount: "Amount (grams)",
    enterAmount: "Enter grams",
    max: "Max",
    conversionRatio: "Indicative Conversion Ratio",
    estimatedOutput: "Estimated Amount Received",
    indicativePricing: "Indicative Pricing",
    source: "Source",
    target: "Target (estimated)",
    executionSpread: "Execution Spread",
    included: "Included",
    estimatedSettlement: "Estimated Settlement",
    immediate: "Immediate",
    pricingNote: "Pricing reflects institutional execution conditions.",
    marketNote: "Final execution price may vary based on market conditions.",
    executionCost: "Execution Details",
    executionMethod: "Execution Method",
    monetarySettlement: "Monetary settlement via Auxite liquidity network",
    settlementCurrency: "Settlement Currency",
    auxmInternal: "AUXM (Internal)",
    certificateAction: "Certificate Action",
    certRevoke: "Source certificate revoked. New certificate issued.",
    confirmCheckbox: "I understand this conversion is final once executed.",
    preview: "Conversion Preview",
    youAreConverting: "You are converting",
    from: "From",
    toEstimated: "To (estimated)",
    confirmConversion: "Confirm Conversion",
    processing: "Processing...",
    conversionCompleted: "Conversion Completed",
    viewAllocation: "View New Allocation",
    downloadCert: "Download Certificate",
    newConversion: "New Conversion",
    recentConversions: "Recent Conversions",
    noConversions: "No conversions yet",
    step: "Step",
    of: "/",
    back: "Back",
    continue: "Continue",
    encumberedNote: "Encumbered metals are not eligible for conversion.",
    vaultFrozen: "Vault is frozen. Conversions are not permitted.",
    indicativeOnly: "Indicative Only — Large conversions may require institutional desk execution.",
    insufficientBalance: "Insufficient balance",
    minAmount: "Minimum conversion: 1 gram",
    conversionFailed: "Conversion failed",
  },
  de: {
    title: "Metallumwandlung",
    subtitle: "Wandeln Sie zwischen Edelmetallen um",
    convertFrom: "Umwandeln von",
    convertTo: "Umwandeln in",
    selectSource: "Wählen Sie das umzuwandelnde Metall",
    selectTarget: "Zielmetall wählen und Menge eingeben",
    available: "Verfügbar",
    encumbered: "Belastet",
    total: "Gesamt",
    amount: "Menge (Gramm)",
    enterAmount: "Gramm eingeben",
    max: "Max",
    conversionRatio: "Indikatives Umrechnungsverhältnis",
    estimatedOutput: "Geschätzte Menge",
    indicativePricing: "Indikative Preisgestaltung",
    source: "Quelle",
    target: "Ziel (geschätzt)",
    executionSpread: "Ausführungsspread",
    included: "Enthalten",
    estimatedSettlement: "Geschätzte Abwicklung",
    immediate: "Sofort",
    pricingNote: "Preise spiegeln institutionelle Ausführungsbedingungen wider.",
    marketNote: "Endpreis kann je nach Marktbedingungen variieren.",
    executionCost: "Ausführungsdetails",
    executionMethod: "Ausführungsmethode",
    monetarySettlement: "Monetäre Abwicklung über das Auxite-Liquiditätsnetzwerk",
    settlementCurrency: "Abwicklungswährung",
    auxmInternal: "AUXM (Intern)",
    certificateAction: "Zertifikatsmaßnahme",
    certRevoke: "Quellzertifikat widerrufen. Neues Zertifikat ausgestellt.",
    confirmCheckbox: "Ich verstehe, dass diese Umwandlung nach Ausführung endgültig ist.",
    preview: "Umwandlungsvorschau",
    youAreConverting: "Sie wandeln um",
    from: "Von",
    toEstimated: "Nach (geschätzt)",
    confirmConversion: "Umwandlung bestätigen",
    processing: "Verarbeitung...",
    conversionCompleted: "Umwandlung abgeschlossen",
    viewAllocation: "Neue Zuteilung anzeigen",
    downloadCert: "Zertifikat herunterladen",
    newConversion: "Neue Umwandlung",
    recentConversions: "Letzte Umwandlungen",
    noConversions: "Noch keine Umwandlungen",
    step: "Schritt",
    of: "/",
    back: "Zurück",
    continue: "Weiter",
    encumberedNote: "Belastete Metalle sind nicht umwandlungsfähig.",
    vaultFrozen: "Tresor eingefroren. Umwandlungen nicht erlaubt.",
    indicativeOnly: "Nur indikativ — Große Umwandlungen können institutionelle Ausführung erfordern.",
    insufficientBalance: "Unzureichendes Guthaben",
    minAmount: "Mindestumwandlung: 1 Gramm",
    conversionFailed: "Umwandlung fehlgeschlagen",
  },
  fr: {
    title: "Conversion de Métaux",
    subtitle: "Convertissez entre métaux précieux",
    convertFrom: "Convertir depuis",
    convertTo: "Convertir vers",
    selectSource: "Sélectionnez le métal à convertir",
    selectTarget: "Sélectionnez le métal cible et entrez le montant",
    available: "Disponible",
    encumbered: "Grevé",
    total: "Total",
    amount: "Montant (grammes)",
    enterAmount: "Entrez les grammes",
    max: "Max",
    conversionRatio: "Ratio de Conversion Indicatif",
    estimatedOutput: "Montant Estimé Reçu",
    indicativePricing: "Tarification Indicative",
    source: "Source",
    target: "Cible (estimé)",
    executionSpread: "Spread d'Exécution",
    included: "Inclus",
    estimatedSettlement: "Règlement Estimé",
    immediate: "Immédiat",
    pricingNote: "Les prix reflètent les conditions d'exécution institutionnelles.",
    marketNote: "Le prix final peut varier selon les conditions du marché.",
    executionCost: "Détails d'Exécution",
    executionMethod: "Méthode d'Exécution",
    monetarySettlement: "Règlement monétaire via le réseau de liquidité Auxite",
    settlementCurrency: "Devise de Règlement",
    auxmInternal: "AUXM (Interne)",
    certificateAction: "Action Certificat",
    certRevoke: "Certificat source révoqué. Nouveau certificat émis.",
    confirmCheckbox: "Je comprends que cette conversion est définitive une fois exécutée.",
    preview: "Aperçu de la Conversion",
    youAreConverting: "Vous convertissez",
    from: "De",
    toEstimated: "Vers (estimé)",
    confirmConversion: "Confirmer la Conversion",
    processing: "Traitement...",
    conversionCompleted: "Conversion Terminée",
    viewAllocation: "Voir Nouvelle Allocation",
    downloadCert: "Télécharger Certificat",
    newConversion: "Nouvelle Conversion",
    recentConversions: "Conversions Récentes",
    noConversions: "Aucune conversion",
    step: "Étape",
    of: "/",
    back: "Retour",
    continue: "Continuer",
    encumberedNote: "Les métaux grevés ne sont pas éligibles à la conversion.",
    vaultFrozen: "Coffre gelé. Conversions non autorisées.",
    indicativeOnly: "Indicatif uniquement — Les grandes conversions peuvent nécessiter une exécution institutionnelle.",
    insufficientBalance: "Solde insuffisant",
    minAmount: "Conversion minimale: 1 gramme",
    conversionFailed: "Conversion échouée",
  },
  ar: {
    title: "تحويل المعادن",
    subtitle: "حوّل بين المعادن الثمينة",
    convertFrom: "التحويل من",
    convertTo: "التحويل إلى",
    selectSource: "اختر المعدن للتحويل",
    selectTarget: "اختر المعدن المستهدف وأدخل الكمية",
    available: "متاح",
    encumbered: "مقيّد",
    total: "الإجمالي",
    amount: "الكمية (غرام)",
    enterAmount: "أدخل الغرامات",
    max: "الحد الأقصى",
    conversionRatio: "نسبة التحويل الإرشادية",
    estimatedOutput: "الكمية المقدرة المستلمة",
    indicativePricing: "التسعير الإرشادي",
    source: "المصدر",
    target: "الهدف (تقديري)",
    executionSpread: "هامش التنفيذ",
    included: "مشمول",
    estimatedSettlement: "التسوية المقدرة",
    immediate: "فوري",
    pricingNote: "تعكس الأسعار ظروف التنفيذ المؤسسي.",
    marketNote: "قد يختلف سعر التنفيذ النهائي حسب ظروف السوق.",
    executionCost: "تفاصيل التنفيذ",
    executionMethod: "طريقة التنفيذ",
    monetarySettlement: "تسوية نقدية عبر شبكة سيولة Auxite",
    settlementCurrency: "عملة التسوية",
    auxmInternal: "AUXM (داخلي)",
    certificateAction: "إجراء الشهادة",
    certRevoke: "تم إلغاء شهادة المصدر. تم إصدار شهادة جديدة.",
    confirmCheckbox: "أفهم أن هذا التحويل نهائي بمجرد تنفيذه.",
    preview: "معاينة التحويل",
    youAreConverting: "أنت تحوّل",
    from: "من",
    toEstimated: "إلى (تقديري)",
    confirmConversion: "تأكيد التحويل",
    processing: "جارٍ المعالجة...",
    conversionCompleted: "اكتمل التحويل",
    viewAllocation: "عرض التخصيص الجديد",
    downloadCert: "تحميل الشهادة",
    newConversion: "تحويل جديد",
    recentConversions: "التحويلات الأخيرة",
    noConversions: "لا توجد تحويلات بعد",
    step: "خطوة",
    of: "/",
    back: "رجوع",
    continue: "متابعة",
    encumberedNote: "المعادن المقيدة غير مؤهلة للتحويل.",
    vaultFrozen: "الخزنة مجمدة. التحويلات غير مسموح بها.",
    indicativeOnly: "إرشادي فقط — التحويلات الكبيرة قد تتطلب تنفيذ مؤسسي.",
    insufficientBalance: "رصيد غير كافٍ",
    minAmount: "الحد الأدنى للتحويل: 1 غرام",
    conversionFailed: "فشل التحويل",
  },
  ru: {
    title: "Конвертация металлов",
    subtitle: "Конвертируйте между драгоценными металлами",
    convertFrom: "Конвертировать из",
    convertTo: "Конвертировать в",
    selectSource: "Выберите металл для конвертации",
    selectTarget: "Выберите целевой металл и введите сумму",
    available: "Доступно",
    encumbered: "Обременено",
    total: "Всего",
    amount: "Количество (граммы)",
    enterAmount: "Введите граммы",
    max: "Макс",
    conversionRatio: "Индикативный коэффициент конвертации",
    estimatedOutput: "Ориентировочный объём",
    indicativePricing: "Индикативное ценообразование",
    source: "Источник",
    target: "Цель (ориентир.)",
    executionSpread: "Спред исполнения",
    included: "Включён",
    estimatedSettlement: "Расчётное время",
    immediate: "Мгновенно",
    pricingNote: "Цены отражают институциональные условия исполнения.",
    marketNote: "Финальная цена может меняться в зависимости от рыночных условий.",
    executionCost: "Детали исполнения",
    executionMethod: "Метод исполнения",
    monetarySettlement: "Денежный расчёт через сеть ликвидности Auxite",
    settlementCurrency: "Валюта расчёта",
    auxmInternal: "AUXM (Внутренний)",
    certificateAction: "Действие с сертификатом",
    certRevoke: "Исходный сертификат аннулирован. Выпущен новый сертификат.",
    confirmCheckbox: "Я понимаю, что эта конвертация необратима после исполнения.",
    preview: "Предпросмотр конвертации",
    youAreConverting: "Вы конвертируете",
    from: "Из",
    toEstimated: "В (ориентир.)",
    confirmConversion: "Подтвердить конвертацию",
    processing: "Обработка...",
    conversionCompleted: "Конвертация завершена",
    viewAllocation: "Посмотреть новое размещение",
    downloadCert: "Скачать сертификат",
    newConversion: "Новая конвертация",
    recentConversions: "Последние конвертации",
    noConversions: "Конвертаций пока нет",
    step: "Шаг",
    of: "/",
    back: "Назад",
    continue: "Далее",
    encumberedNote: "Обременённые металлы не подлежат конвертации.",
    vaultFrozen: "Хранилище заморожено. Конвертация невозможна.",
    indicativeOnly: "Только индикативно — Крупные конвертации могут потребовать институционального исполнения.",
    insufficientBalance: "Недостаточный баланс",
    minAmount: "Минимум: 1 грамм",
    conversionFailed: "Конвертация не удалась",
  },
};

type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

// ============================================
// COMPONENT
// ============================================
export function MetalConversionTab() {
  const { lang } = useLanguage();
  const { address: ctxAddress, balances: ctxBalances, stakedAmounts: ctxStaked, allocationAmounts: ctxAllocations, refreshBalances } = useWallet();
  const t = translations[lang] || translations.en;

  // Belt & suspenders: fallback to localStorage address if WalletContext hasn't resolved
  const address = ctxAddress || (typeof window !== "undefined" ? localStorage.getItem("auxite_wallet_address") : null);

  // ── Wizard State ──
  const [step, setStep] = useState(1);
  const [fromMetal, setFromMetal] = useState<MetalSymbol | null>(null);
  const [toMetal, setToMetal] = useState<MetalSymbol | null>(null);
  const [amount, setAmount] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  // ── Pricing ──
  const [metalPrices, setMetalPrices] = useState<Record<string, { ask: number; bid: number }>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // ── UI State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ from: string; to: string; fromGrams: number; toGrams: number; newCert: string | null } | null>(null);
  const [show2FA, setShow2FA] = useState(false);

  // ── Direct Balance Fetch (fallback) ──
  const [directBalances, setDirectBalances] = useState<Record<string, number> | null>(null);
  const [directStaked, setDirectStaked] = useState<Record<string, number> | null>(null);
  const [directAllocations, setDirectAllocations] = useState<Record<string, number> | null>(null);

  // ── History ──
  const [history, setHistory] = useState<any[]>([]);

  // ── Fetch Prices ──
  const fetchPrices = useCallback(async () => {
    try {
      setPricesLoading(true);
      const res = await fetch("/api/convert-metal");
      const data = await res.json();
      if (data.prices) setMetalPrices(data.prices);
    } catch (e) {
      console.error("Failed to fetch conversion prices:", e);
    } finally {
      setPricesLoading(false);
    }
  }, []);

  // ── Fetch Balances ──
  const fetchDirectBalances = useCallback(async () => {
    if (!address) return;
    try {
      const [balanceRes, allocRes] = await Promise.all([
        fetch(`/api/user/balance?address=${address}`),
        fetch(`/api/allocations?address=${address}`).catch(() => null),
      ]);
      const balanceData = await balanceRes.json().catch(() => null);
      if (balanceData?.balances) {
        const parsed: Record<string, number> = {};
        for (const [k, v] of Object.entries(balanceData.balances)) {
          parsed[k] = parseFloat(String(v) || "0");
        }
        setDirectBalances(parsed);
      }
      if (balanceData?.stakedAmounts) {
        const parsedStaked: Record<string, number> = {};
        for (const [k, v] of Object.entries(balanceData.stakedAmounts)) {
          parsedStaked[k] = parseFloat(String(v) || "0");
        }
        setDirectStaked(parsedStaked);
      }
      if (allocRes) {
        const allocData = await allocRes.json().catch(() => null);
        const allocTotals: Record<string, number> = { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };
        if (allocData?.allocations && Array.isArray(allocData.allocations)) {
          for (const a of allocData.allocations) {
            const metal = a.metal?.toLowerCase();
            const grams = Number(a.grams) || 0;
            if (metal && metal in allocTotals) allocTotals[metal] += grams;
          }
        }
        setDirectAllocations(allocTotals);
      }
    } catch (e) {
      console.error("Failed to fetch balances:", e);
    }
  }, [address]);

  // Load history
  const fetchHistory = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/transactions?address=${address}&type=metal_conversion&limit=10`);
      const data = await res.json();
      if (data.transactions) setHistory(data.transactions);
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  }, [address]);

  useEffect(() => { fetchPrices(); fetchDirectBalances(); fetchHistory(); }, [fetchPrices, fetchDirectBalances, fetchHistory]);

  // Refresh prices every 5 seconds when on step 2-3
  useEffect(() => {
    if (step < 2 || step > 3) return;
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [step, fetchPrices]);

  // ── Balance Helpers ──
  const hasRealCtxBalances = ctxBalances && Object.values(ctxBalances).some((v) => typeof v === "number" && v > 0);
  const balances = hasRealCtxBalances ? ctxBalances : (directBalances || ctxBalances);
  const stakedAmounts = hasRealCtxBalances ? ctxStaked : (directStaked || ctxStaked);
  const allocationAmounts = hasRealCtxBalances ? ctxAllocations : (directAllocations || ctxAllocations);

  const getBalance = (symbol: string): number => {
    if (!balances) return 0;
    const key = symbol.toLowerCase();
    return parseFloat(String((balances as any)[key] || 0));
  };

  const getEncumbered = (symbol: string): number => {
    const key = symbol.toLowerCase();
    const staked = parseFloat(String((stakedAmounts as any)?.[key] || 0));
    const allocated = 0; // Metal allocations are the balance itself
    return staked + allocated;
  };

  const getAvailable = (symbol: string): number => {
    return Math.max(0, getBalance(symbol) - getEncumbered(symbol));
  };

  // ── Pricing Helpers ──
  const fromCfg = METALS.find((m) => m.symbol === fromMetal);
  const toCfg = METALS.find((m) => m.symbol === toMetal);
  const fromPrice = fromMetal ? metalPrices[fromMetal] : null;
  const toPrice = toMetal ? metalPrices[toMetal] : null;
  const ratio = fromPrice && toPrice ? fromPrice.bid / toPrice.ask : 0;
  const parsedAmount = parseFloat(amount) || 0;
  const estimatedOutput = parsedAmount * ratio;
  const usdEquivalent = fromPrice ? parsedAmount * fromPrice.bid : 0;
  const isLargeConversion = usdEquivalent > 50000;

  // ── Execute Conversion ──
  const handleConvert = async () => {
    if (!address || !fromMetal || !toMetal || parsedAmount <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/convert-metal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, fromMetal, toMetal, amount: parsedAmount }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess({
          from: fromMetal,
          to: toMetal,
          fromGrams: parsedAmount,
          toGrams: data.conversion.to.grams,
          newCert: data.conversion.newCertificate,
        });
        refreshBalances();
        fetchDirectBalances();
        fetchHistory();
      } else {
        setError(data.error || t.conversionFailed);
      }
    } catch (e: any) {
      setError(e.message || t.conversionFailed);
    } finally {
      setLoading(false);
    }
  };

  // ── Reset ──
  const handleReset = () => {
    setStep(1);
    setFromMetal(null);
    setToMetal(null);
    setAmount("");
    setConfirmed(false);
    setError(null);
    setSuccess(null);
    setShow2FA(false);
  };

  // ── Step Navigation ──
  const canContinue = (): boolean => {
    if (step === 1) return !!fromMetal;
    if (step === 2) return !!toMetal && parsedAmount >= 1 && parsedAmount <= getAvailable(fromMetal!);
    if (step === 3) return true;
    if (step === 4) return confirmed;
    return false;
  };

  const handleNext = () => {
    if (!canContinue()) return;
    if (step === 4) {
      setShow2FA(true);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // ── SUCCESS VIEW ──
  if (success) {
    const fromMetalCfg = METALS.find((m) => m.symbol === success.from);
    const toMetalCfg = METALS.find((m) => m.symbol === success.to);
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2F6F62]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t.conversionCompleted}</h2>
          <div className="flex items-center justify-center gap-3 mt-4 mb-6">
            <div className="text-center">
              {fromMetalCfg && <Image src={fromMetalCfg.icon} alt={fromMetalCfg.symbol} width={40} height={40} className="rounded-full mx-auto mb-1" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,.25))" }} />}
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{success.fromGrams}g</p>
              <p className="text-xs text-slate-500">{fromMetalCfg?.symbol}</p>
            </div>
            <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            <div className="text-center">
              {toMetalCfg && <Image src={toMetalCfg.icon} alt={toMetalCfg.symbol} width={40} height={40} className="rounded-full mx-auto mb-1" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,.25))" }} />}
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatAmount(success.toGrams, success.to)}g</p>
              <p className="text-xs text-slate-500">{toMetalCfg?.symbol}</p>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <Link href="/vault" className="px-4 py-2 rounded-lg bg-[#2F6F62] text-white text-sm font-semibold hover:bg-[#245a50] transition-colors">{t.viewAllocation}</Link>
            <button onClick={handleReset} className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t.newConversion}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? "bg-[#BFA181]" : "bg-slate-200 dark:bg-slate-800"}`} />
        ))}
        <span className="text-xs text-slate-500 ml-2">{t.step} {step}{t.of}4</span>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* ═══════════════════════════════ STEP 1 — Convert From ═══════════════════════════════ */}
      {step === 1 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.convertFrom}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t.selectSource}</p>
          <div className="grid grid-cols-2 gap-3">
            {METALS.map((metal) => {
              const bal = getBalance(metal.symbol);
              const enc = getEncumbered(metal.symbol);
              const avail = getAvailable(metal.symbol);
              const isSelected = fromMetal === metal.symbol;
              const isDisabled = avail <= 0;
              return (
                <button
                  key={metal.symbol}
                  onClick={() => { if (!isDisabled) { setFromMetal(metal.symbol as MetalSymbol); setToMetal(null); setAmount(""); } }}
                  disabled={isDisabled}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? "border-[#BFA181] bg-[#BFA181]/5 shadow-md"
                      : isDisabled
                      ? "border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed"
                      : "border-stone-200 dark:border-slate-800 hover:border-[#BFA181]/50 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Image src={metal.icon} alt={metal.symbol} width={44} height={44} className="rounded-full object-cover" style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,.35))" }} />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{metal.symbol}</p>
                      <p className="text-xs text-slate-500">{lang === "tr" ? metal.nameTr : metal.name}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">{t.available}</span>
                      <span className={`font-semibold ${avail > 0 ? "text-[#2F6F62]" : "text-slate-400"}`}>{formatAmount(avail, metal.symbol)}g</span>
                    </div>
                    {enc > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{t.encumbered}</span>
                        <span className="text-amber-500 font-semibold">{formatAmount(enc, metal.symbol)}g</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {METALS.some((m) => getEncumbered(m.symbol) > 0) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              {t.encumberedNote}
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════ STEP 2 — Convert To + Amount ═══════════════════════════════ */}
      {step === 2 && fromCfg && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.convertTo}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">{t.selectTarget}</p>

          {/* Target Metal Selection */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {METALS.filter((m) => m.symbol !== fromMetal).map((metal) => {
              const isSelected = toMetal === metal.symbol;
              return (
                <button
                  key={metal.symbol}
                  onClick={() => setToMetal(metal.symbol as MetalSymbol)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected ? "border-[#BFA181] bg-[#BFA181]/5 shadow-md" : "border-stone-200 dark:border-slate-800 hover:border-[#BFA181]/50"
                  }`}
                >
                  <Image src={metal.icon} alt={metal.symbol} width={36} height={36} className="rounded-full mx-auto mb-1" style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,.25))" }} />
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{metal.symbol}</p>
                  <p className="text-[10px] text-slate-500">{lang === "tr" ? metal.nameTr : metal.name}</p>
                </button>
              );
            })}
          </div>

          {/* Amount Input */}
          {toMetal && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{t.amount}</label>
                  <span className="text-xs text-slate-500">{t.available}: {formatAmount(getAvailable(fromMetal!), fromMetal!)}g</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t.enterAmount}
                    min="1"
                    max={getAvailable(fromMetal!)}
                    step="0.01"
                    className="flex-1 bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg px-4 py-3 text-slate-800 dark:text-white text-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#BFA181]"
                  />
                  <button
                    onClick={() => setAmount(getAvailable(fromMetal!).toString())}
                    className="px-4 py-2 rounded-lg bg-[#BFA181]/10 text-[#BFA181] text-sm font-semibold hover:bg-[#BFA181]/20 transition-colors"
                  >
                    {t.max}
                  </button>
                </div>
                {parsedAmount > 0 && parsedAmount < 1 && <p className="text-xs text-red-500 mt-1">{t.minAmount}</p>}
                {parsedAmount > getAvailable(fromMetal!) && <p className="text-xs text-red-500 mt-1">{t.insufficientBalance}</p>}
              </div>

              {/* Conversion Preview */}
              {parsedAmount >= 1 && ratio > 0 && (
                <div className="p-4 rounded-xl bg-[#0B1420] border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400">{t.conversionRatio}</span>
                    <span className="text-sm font-mono text-white">{(lang === "tr" ? fromCfg.nameTr : fromCfg.name)} / {(lang === "tr" ? toCfg?.nameTr : toCfg?.name)}: {ratio.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">{t.estimatedOutput}</span>
                    <span className="text-lg font-bold font-mono text-[#BFA181]">{formatAmount(estimatedOutput, toMetal)}g {toMetal}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">{t.marketNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════ STEP 3 — Indicative Pricing ═══════════════════════════════ */}
      {step === 3 && fromCfg && toCfg && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.indicativePricing}</h3>

          {isLargeConversion && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 mb-4">
              <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                {t.indicativeOnly}
              </p>
            </div>
          )}

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-4">
            {/* Source */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t.source}</span>
              <div className="flex items-center gap-2">
                <Image src={fromCfg.icon} alt={fromCfg.symbol} width={24} height={24} className="rounded-full" />
                <span className="font-bold text-slate-800 dark:text-white">{parsedAmount}g {fromCfg.symbol}</span>
              </div>
            </div>
            {/* Target */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t.target}</span>
              <div className="flex items-center gap-2">
                <Image src={toCfg.icon} alt={toCfg.symbol} width={24} height={24} className="rounded-full" />
                <span className="font-bold text-[#BFA181]">{formatAmount(estimatedOutput, toCfg.symbol)}g {toCfg.symbol}</span>
              </div>
            </div>
            <div className="h-px bg-stone-200 dark:bg-slate-800" />
            {/* Ratio */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t.conversionRatio}</span>
              <span className="text-sm font-mono text-slate-800 dark:text-white">{ratio.toFixed(4)}</span>
            </div>
            {/* Spread */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t.executionSpread}</span>
              <span className="text-sm text-[#2F6F62] font-semibold">{t.included}</span>
            </div>
            {/* Settlement */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{t.estimatedSettlement}</span>
              <span className="text-sm text-[#2F6F62] font-semibold">{t.immediate}</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">{t.pricingNote}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ STEP 4 — Execution Details + Confirm ═══════════════════════════════ */}
      {step === 4 && fromCfg && toCfg && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.executionCost}</h3>

          <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 space-y-4 mb-4">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">{t.executionMethod}</span>
              <span className="text-sm text-slate-800 dark:text-white text-right max-w-[60%]">{t.monetarySettlement}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">{t.settlementCurrency}</span>
              <span className="text-sm font-semibold text-[#BFA181]">{t.auxmInternal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">{t.certificateAction}</span>
              <span className="text-sm text-slate-800 dark:text-white text-right max-w-[60%]">{t.certRevoke}</span>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-slate-300 text-[#2F6F62] focus:ring-[#2F6F62]"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t.confirmCheckbox}</span>
          </label>
        </div>
      )}

      {/* ═══════════════════════════════ 2FA MODAL ═══════════════════════════════ */}
      {show2FA && fromCfg && toCfg && (
        <>
          <TwoFactorGate
            walletAddress={address || ""}
            isOpen={true}
            onClose={() => setShow2FA(false)}
            onVerified={handleConvert}
            lang={lang as any}
          />
          {/* Conversion Summary overlay behind 2FA */}
          <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-stone-200 dark:border-slate-800 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">{t.preview}</h3>
              <div className="p-4 rounded-xl bg-stone-50 dark:bg-slate-800 mb-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.from}</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{parsedAmount}g {fromCfg.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">{t.toEstimated}</span>
                  <span className="font-semibold text-[#BFA181]">{formatAmount(estimatedOutput, toCfg.symbol)}g {toCfg.symbol}</span>
                </div>
                <div className="h-px bg-stone-200 dark:bg-slate-700" />
                <p className="text-xs text-slate-500">{t.monetarySettlement}</p>
              </div>
              <button onClick={() => setShow2FA(false)} className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                {t.back}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════ Navigation ═══════════════════════════════ */}
      {!show2FA && (
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={handleBack} className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-semibold hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
              {t.back}
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canContinue()}
            className="flex-1 py-3 rounded-xl bg-[#BFA181] text-white font-bold text-sm hover:bg-[#a8896e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {step === 4 ? t.confirmConversion : t.continue}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════ History ═══════════════════════════════ */}
      {step === 1 && history.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.recentConversions}</h3>
          <div className="space-y-2">
            {history.slice(0, 5).map((tx: any, i: number) => {
              const fromM = METALS.find((m) => m.symbol === tx.fromToken);
              const toM = METALS.find((m) => m.symbol === tx.toToken);
              return (
                <div key={tx.id || i} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {fromM && <Image src={fromM.icon} alt={fromM.symbol} width={24} height={24} className="rounded-full border-2 border-white dark:border-slate-900" />}
                      {toM && <Image src={toM.icon} alt={toM.symbol} width={24} height={24} className="rounded-full border-2 border-white dark:border-slate-900" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{tx.fromToken} → {tx.toToken}</p>
                      <p className="text-[10px] text-slate-500">{new Date(tx.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{parseFloat(tx.fromAmount).toFixed(2)}g → {parseFloat(tx.toAmount).toFixed(2)}g</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F6F62]/10 text-[#2F6F62] font-semibold">Settled</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
