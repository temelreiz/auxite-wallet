// src/components/AddFundsModal.tsx
// Fund Vault Modal - Institutional Style (Synced with Mobile)
"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  walletAddress: string;
  vaultId?: string;
  auxmBalance?: number;
  onAuxmTransfer?: (amount: number) => boolean;
  defaultTab?: "crypto" | "card" | "bank";
  bankOnly?: boolean;
}

// Crypto sources for funding
const CRYPTO_SOURCES = [
  { id: "btc", symbol: "BTC", name: "Bitcoin", network: "Bitcoin Network", icon: "₿", color: "#F7931A", settlementTime: "~30 min" },
  { id: "eth", symbol: "ETH", name: "Ethereum", network: "Ethereum / Base", icon: "⟠", color: "#627EEA", settlementTime: "~15 min" },
  { id: "usdt", symbol: "USDT", name: "Tether", network: "ERC-20 / TRC-20", icon: "₮", color: "#26A17B", settlementTime: "~15 min" },
  { id: "usdc", symbol: "USDC", name: "USD Coin", network: "ERC-20", icon: "◯", color: "#2775CA", settlementTime: "~15 min" },
];

// Coin ID mapping for NowPayments API
const COIN_MAPPING: Record<string, string> = {
  btc: "BTC",
  eth: "ETH",
  usdt: "USDT_TRC20",
  usdc: "USDC",
};

const texts: Record<string, Record<string, string>> = {
  tr: {
    title: "Kasayı Fonla",
    subtitle: "Saklama hesabınıza sermaye ekleyin",
    fundingSources: "FONLAMA KAYNAKLARI",
    bankWire: "Banka Havalesi",
    bankWireDesc: "Uluslararası banka transferi",
    auxmFunding: "AUXM ile Fonla",
    auxmFundingDesc: "Dahili takas birimi ile anında fonlama",
    cryptoFunding: "DİJİTAL VARLIK FONLAMA",
    settlementTime: "Takas Süresi",
    businessDays: "iş günü",
    instant: "Anında",

    // Bank Wire Modal
    bankDetails: "BANKA BİLGİLERİ",
    beneficiary: "Alıcı",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Banka",
    reference: "Referans",
    importantNote: "ÖNEMLİ",
    referenceNote: "Referans kodunu ödeme açıklamasına eklemeyi unutmayın.",
    copyAll: "Tümünü Kopyala",

    // Crypto Modal
    depositAddress: "Yatırım Adresi",
    network: "Ağ",
    minAmount: "Min. Miktar",
    copyAddress: "Adresi Kopyala",
    copied: "Kopyalandı!",
    warningTitle: "ÖNEMLİ UYARI",
    warningText: "Sadece {network} ağı üzerinden gönderim yapın. Farklı ağ kullanımı fonlarınızın kaybına neden olabilir.",
    generatingAddress: "Adres oluşturuluyor...",

    // AUXM Modal
    auxmTitle: "AUXM ile Fonla",
    auxmSubtitle: "AUXM dahili takas birimi ile anında fonlama",
    auxmBalance: "AUXM Bakiyeniz",
    auxmAmount: "Fonlama Miktarı",
    auxmRate: "AUXM Kuru",
    auxmEquivalent: "USD Karşılığı",
    auxmFund: "Kasayı Fonla",
    auxmInsufficient: "Yetersiz AUXM bakiyesi",
    auxmMin: "Min. 100 AUXM",
    auxmNote: "AUXM, yalnızca Auxite altyapısı içinde kullanılan dahili takas birimidir.",

    // Settlement
    settlementCredit: "Takas Kredisi",
    fundsSettled: "Fonlar takas bakiyenize kredilenecektir.",
    creditedAsAuxm: "AUXM olarak kredilenir",
    custodyNote: "Dijital varlıklar, tahsis için kullanılana kadar saklama altında tutulur.",
    fundsCredited: "Fonlar alındıktan sonra hesabınıza aktarılır.",

    // Confirmation
    pendingSettlement: "Takas Bekleniyor",
    returnToVault: "Kasaya Dön",
    back: "Geri",
  },
  en: {
    title: "Fund Vault",
    subtitle: "Add capital to your custody account",
    fundingSources: "FUNDING SOURCES",
    bankWire: "Bank Wire",
    bankWireDesc: "International bank transfer",
    auxmFunding: "Fund with AUXM",
    auxmFundingDesc: "Instant funding with internal settlement unit",
    cryptoFunding: "DIGITAL ASSET FUNDING",
    settlementTime: "Settlement",
    businessDays: "business days",
    instant: "Instant",

    // Bank Wire Modal
    bankDetails: "BANK DETAILS",
    beneficiary: "Beneficiary",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Bank",
    reference: "Reference",
    importantNote: "IMPORTANT",
    referenceNote: "Include the reference code in your payment description.",
    copyAll: "Copy All Details",

    // Crypto Modal
    depositAddress: "Deposit Address",
    network: "Network",
    minAmount: "Min. Amount",
    copyAddress: "Copy Address",
    copied: "Copied!",
    warningTitle: "IMPORTANT WARNING",
    warningText: "Only send via {network} network. Using a different network may result in permanent loss of funds.",
    generatingAddress: "Generating address...",

    // AUXM Modal
    auxmTitle: "Fund with AUXM",
    auxmSubtitle: "Instant funding with AUXM internal settlement unit",
    auxmBalance: "Your AUXM Balance",
    auxmAmount: "Funding Amount",
    auxmRate: "AUXM Rate",
    auxmEquivalent: "USD Equivalent",
    auxmFund: "Fund Vault",
    auxmInsufficient: "Insufficient AUXM balance",
    auxmMin: "Min. 100 AUXM",
    auxmNote: "AUXM is an internal settlement unit used exclusively within the Auxite infrastructure.",

    // Settlement
    settlementCredit: "Settlement Credit",
    fundsSettled: "Funds will be credited to your settlement balance.",
    creditedAsAuxm: "Credited as AUXM",
    custodyNote: "Digital assets are held in custody until deployed for allocation.",
    fundsCredited: "Funds are credited upon receipt.",

    // Confirmation
    pendingSettlement: "Pending Settlement",
    returnToVault: "Return to Vault",
    back: "Back",
  },
  de: {
    title: "Tresor Aufladen",
    subtitle: "Kapital zu Ihrem Verwahrungskonto hinzufügen",
    fundingSources: "FINANZIERUNGSQUELLEN",
    bankWire: "Banküberweisung",
    bankWireDesc: "Internationale Banküberweisung",
    auxmFunding: "Mit AUXM Aufladen",
    auxmFundingDesc: "Sofortige Finanzierung mit interner Abrechnungseinheit",
    cryptoFunding: "DIGITALE VERMÖGENSWERTE",
    settlementTime: "Abwicklung",
    businessDays: "Werktage",
    instant: "Sofort",
    bankDetails: "BANKDATEN",
    beneficiary: "Empfänger",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Bank",
    reference: "Referenz",
    importantNote: "WICHTIG",
    referenceNote: "Fügen Sie den Referenzcode in Ihre Zahlungsbeschreibung ein.",
    copyAll: "Alle Details Kopieren",
    depositAddress: "Einzahlungsadresse",
    network: "Netzwerk",
    minAmount: "Min. Betrag",
    copyAddress: "Adresse Kopieren",
    copied: "Kopiert!",
    warningTitle: "WICHTIGER HINWEIS",
    warningText: "Senden Sie nur über das {network} Netzwerk. Die Verwendung eines anderen Netzwerks kann zu dauerhaftem Verlust führen.",
    generatingAddress: "Adresse wird generiert...",
    auxmTitle: "Mit AUXM Aufladen",
    auxmSubtitle: "Sofortige Finanzierung mit AUXM",
    auxmBalance: "Ihr AUXM Guthaben",
    auxmAmount: "Finanzierungsbetrag",
    auxmRate: "AUXM Kurs",
    auxmEquivalent: "USD Äquivalent",
    auxmFund: "Tresor Aufladen",
    auxmInsufficient: "Unzureichendes AUXM Guthaben",
    auxmMin: "Min. 100 AUXM",
    auxmNote: "AUXM ist eine interne Abrechnungseinheit.",
    settlementCredit: "Abrechnungskredit",
    fundsSettled: "Mittel werden Ihrem Abrechnungssaldo gutgeschrieben.",
    creditedAsAuxm: "Als AUXM gutgeschrieben",
    custodyNote: "Digitale Vermögenswerte werden bis zur Zuweisung verwahrt.",
    fundsCredited: "Mittel werden nach Erhalt gutgeschrieben.",
    pendingSettlement: "Abwicklung Ausstehend",
    returnToVault: "Zurück zum Tresor",
    back: "Zurück",
  },
  fr: {
    title: "Alimenter le Coffre",
    subtitle: "Ajoutez du capital à votre compte de garde",
    fundingSources: "SOURCES DE FINANCEMENT",
    bankWire: "Virement Bancaire",
    bankWireDesc: "Virement bancaire international",
    auxmFunding: "Financer avec AUXM",
    auxmFundingDesc: "Financement instantané avec unité de règlement interne",
    cryptoFunding: "FINANCEMENT ACTIFS NUMÉRIQUES",
    settlementTime: "Règlement",
    businessDays: "jours ouvrables",
    instant: "Instantané",
    bankDetails: "COORDONNÉES BANCAIRES",
    beneficiary: "Bénéficiaire",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Banque",
    reference: "Référence",
    importantNote: "IMPORTANT",
    referenceNote: "Incluez le code de référence dans la description de votre paiement.",
    copyAll: "Copier Tous les Détails",
    depositAddress: "Adresse de Dépôt",
    network: "Réseau",
    minAmount: "Montant Min.",
    copyAddress: "Copier l'Adresse",
    copied: "Copié!",
    warningTitle: "AVERTISSEMENT IMPORTANT",
    warningText: "Envoyez uniquement via le réseau {network}. L'utilisation d'un autre réseau peut entraîner une perte permanente.",
    generatingAddress: "Génération de l'adresse...",
    auxmTitle: "Financer avec AUXM",
    auxmSubtitle: "Financement instantané avec AUXM",
    auxmBalance: "Votre Solde AUXM",
    auxmAmount: "Montant du Financement",
    auxmRate: "Taux AUXM",
    auxmEquivalent: "Équivalent USD",
    auxmFund: "Alimenter le Coffre",
    auxmInsufficient: "Solde AUXM insuffisant",
    auxmMin: "Min. 100 AUXM",
    auxmNote: "AUXM est une unité de règlement interne.",
    settlementCredit: "Crédit de Règlement",
    fundsSettled: "Les fonds seront crédités à votre solde.",
    creditedAsAuxm: "Crédité en AUXM",
    custodyNote: "Les actifs numériques sont conservés jusqu'à l'allocation.",
    fundsCredited: "Les fonds sont crédités à réception.",
    pendingSettlement: "Règlement en Attente",
    returnToVault: "Retour au Coffre",
    back: "Retour",
  },
  ar: {
    title: "تمويل الخزينة",
    subtitle: "أضف رأس المال إلى حساب الحفظ الخاص بك",
    fundingSources: "مصادر التمويل",
    bankWire: "تحويل بنكي",
    bankWireDesc: "تحويل بنكي دولي",
    auxmFunding: "التمويل بـ AUXM",
    auxmFundingDesc: "تمويل فوري بوحدة التسوية الداخلية",
    cryptoFunding: "تمويل الأصول الرقمية",
    settlementTime: "التسوية",
    businessDays: "أيام عمل",
    instant: "فوري",
    bankDetails: "تفاصيل البنك",
    beneficiary: "المستفيد",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "البنك",
    reference: "المرجع",
    importantNote: "مهم",
    referenceNote: "قم بتضمين رمز المرجع في وصف الدفع.",
    copyAll: "نسخ جميع التفاصيل",
    depositAddress: "عنوان الإيداع",
    network: "الشبكة",
    minAmount: "الحد الأدنى",
    copyAddress: "نسخ العنوان",
    copied: "تم النسخ!",
    warningTitle: "تحذير مهم",
    warningText: "أرسل فقط عبر شبكة {network}. قد يؤدي استخدام شبكة مختلفة إلى خسارة دائمة.",
    generatingAddress: "جاري إنشاء العنوان...",
    auxmTitle: "التمويل بـ AUXM",
    auxmSubtitle: "تمويل فوري بـ AUXM",
    auxmBalance: "رصيد AUXM الخاص بك",
    auxmAmount: "مبلغ التمويل",
    auxmRate: "سعر AUXM",
    auxmEquivalent: "ما يعادله بالدولار",
    auxmFund: "تمويل الخزينة",
    auxmInsufficient: "رصيد AUXM غير كافٍ",
    auxmMin: "الحد الأدنى 100 AUXM",
    auxmNote: "AUXM هي وحدة تسوية داخلية.",
    settlementCredit: "ائتمان التسوية",
    fundsSettled: "سيتم إضافة الأموال إلى رصيدك.",
    creditedAsAuxm: "يُضاف كـ AUXM",
    custodyNote: "يتم الاحتفاظ بالأصول الرقمية حتى التخصيص.",
    fundsCredited: "تُضاف الأموال عند الاستلام.",
    pendingSettlement: "تسوية معلقة",
    returnToVault: "العودة للخزينة",
    back: "رجوع",
  },
  ru: {
    title: "Пополнить Хранилище",
    subtitle: "Добавьте капитал на ваш счет хранения",
    fundingSources: "ИСТОЧНИКИ ФИНАНСИРОВАНИЯ",
    bankWire: "Банковский Перевод",
    bankWireDesc: "Международный банковский перевод",
    auxmFunding: "Пополнить с AUXM",
    auxmFundingDesc: "Мгновенное пополнение с внутренней расчетной единицей",
    cryptoFunding: "ЦИФРОВЫЕ АКТИВЫ",
    settlementTime: "Расчет",
    businessDays: "рабочих дней",
    instant: "Мгновенно",
    bankDetails: "БАНКОВСКИЕ РЕКВИЗИТЫ",
    beneficiary: "Получатель",
    iban: "IBAN",
    swift: "SWIFT/BIC",
    bank: "Банк",
    reference: "Референс",
    importantNote: "ВАЖНО",
    referenceNote: "Укажите референс-код в описании платежа.",
    copyAll: "Копировать Все",
    depositAddress: "Адрес Депозита",
    network: "Сеть",
    minAmount: "Мин. Сумма",
    copyAddress: "Копировать Адрес",
    copied: "Скопировано!",
    warningTitle: "ВАЖНОЕ ПРЕДУПРЕЖДЕНИЕ",
    warningText: "Отправляйте только через сеть {network}. Использование другой сети может привести к потере средств.",
    generatingAddress: "Генерация адреса...",
    auxmTitle: "Пополнить с AUXM",
    auxmSubtitle: "Мгновенное пополнение с AUXM",
    auxmBalance: "Ваш Баланс AUXM",
    auxmAmount: "Сумма Пополнения",
    auxmRate: "Курс AUXM",
    auxmEquivalent: "Эквивалент USD",
    auxmFund: "Пополнить Хранилище",
    auxmInsufficient: "Недостаточный баланс AUXM",
    auxmMin: "Мин. 100 AUXM",
    auxmNote: "AUXM - внутренняя расчетная единица.",
    settlementCredit: "Расчетный Кредит",
    fundsSettled: "Средства будут зачислены на ваш баланс.",
    creditedAsAuxm: "Зачисляется как AUXM",
    custodyNote: "Цифровые активы хранятся до распределения.",
    fundsCredited: "Средства зачисляются при получении.",
    pendingSettlement: "Ожидание Расчета",
    returnToVault: "Вернуться в Хранилище",
    back: "Назад",
  },
};

export function AddFundsModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
  vaultId,
  auxmBalance = 0,
  onAuxmTransfer,
  defaultTab,
  bankOnly = false,
}: AddFundsModalProps) {
  // Map old tab names to new modal names
  const getInitialModal = () => {
    if (bankOnly) return "bank";
    if (defaultTab === "bank") return "bank";
    if (defaultTab === "crypto") return "main"; // crypto tab shows main with crypto options
    return "main";
  };

  const [activeModal, setActiveModal] = useState<"main" | "bank" | "auxm" | "crypto">(getInitialModal());
  const [selectedCrypto, setSelectedCrypto] = useState<typeof CRYPTO_SOURCES[0] | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [auxmAmount, setAuxmAmount] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  // NowPayments deposit address state
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [depositAddress, setDepositAddress] = useState<{
    address: string;
    network: string;
    minDeposit: string;
    confirmTime: string;
    paymentId: string;
  } | null>(null);

  const t = texts[lang] || texts.en;

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveModal(getInitialModal());
      setSelectedCrypto(null);
      setDepositAddress(null);
      setAuxmAmount("");
    }
  }, [isOpen, bankOnly, defaultTab]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (e) {
      console.error("Copy failed:", e);
    }
  };

  const fetchDepositAddress = async (coinId: string) => {
    setIsLoadingAddress(true);
    setDepositAddress(null);

    try {
      const coin = COIN_MAPPING[coinId] || coinId.toUpperCase();

      const response = await fetch("/api/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin,
          address: vaultId || walletAddress || "guest",
          amount: 100,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        console.error("NowPayments error:", data.error);
        setIsLoadingAddress(false);
        return;
      }

      setDepositAddress({
        address: data.payment.address,
        network: data.payment.name || data.payment.network,
        minDeposit: data.payment.minDeposit,
        confirmTime: data.payment.confirmTime,
        paymentId: data.payment.id,
      });
    } catch (error) {
      console.error("Fetch deposit address error:", error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const handleCryptoSelect = (crypto: typeof CRYPTO_SOURCES[0]) => {
    setSelectedCrypto(crypto);
    fetchDepositAddress(crypto.id);
    setActiveModal("crypto");
  };

  const handleAuxmFund = () => {
    const amount = parseFloat(auxmAmount);
    if (amount >= 100 && amount <= auxmBalance && onAuxmTransfer) {
      const success = onAuxmTransfer(amount);
      if (success) {
        setActiveModal("main");
        setAuxmAmount("");
        setShowConfirmation(true);
      }
    }
  };

  if (!isOpen) return null;

  // Confirmation Modal
  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#121A2A] rounded-2xl border border-stone-200 dark:border-white/10 w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-[#BFA181]/15 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl text-[#BFA181]">◈</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.pendingSettlement}</h3>
          <p className="text-[#BFA181] font-semibold mb-4">{t.creditedAsAuxm}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t.fundsSettled}</p>

          {/* Settlement Flow */}
          <div className="flex items-center justify-center gap-3 bg-slate-50 dark:bg-white/5 rounded-xl p-4 mb-6">
            <div className="text-center">
              <span className="text-slate-500 text-lg">💳</span>
              <p className="text-xs text-slate-500 mt-1">Asset</p>
            </div>
            <span className="text-slate-300">→</span>
            <div className="text-center">
              <span className="text-[#BFA181] text-lg">◈</span>
              <p className="text-xs text-[#BFA181] mt-1">AUXM</p>
            </div>
            <span className="text-slate-300">→</span>
            <div className="text-center">
              <span className="text-[#2F6F62] text-lg">📦</span>
              <p className="text-xs text-slate-500 mt-1">Allocate</p>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex gap-2 justify-center mb-6">
            <span className="px-3 py-1.5 rounded-lg bg-[#2F6F62]/10 text-[#2F6F62] text-xs font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Fully Segregated
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-[#BFA181]/10 text-[#BFA181] text-xs font-semibold flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Bankruptcy Remote
            </span>
          </div>

          <button
            onClick={() => {
              setShowConfirmation(false);
              onClose();
            }}
            className="w-full py-4 rounded-xl bg-[#BFA181] text-black font-bold hover:bg-[#D4B47A] transition-colors"
          >
            {t.returnToVault}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#121A2A] rounded-2xl border border-stone-200 dark:border-white/10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-white/10 flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* MAIN VIEW - Funding Sources */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeModal === "main" && (
            <div className="space-y-6">
              {/* Vault ID */}
              {vaultId && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Vault ID:</span>
                  <span className="text-xs font-semibold text-[#BFA181]">{vaultId}</span>
                </div>
              )}

              {/* Primary Funding Sources */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">{t.fundingSources}</p>
                <div className="space-y-3">
                  {/* Bank Wire */}
                  <button
                    onClick={() => setActiveModal("bank")}
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#BFA181]/50 transition-all flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#BFA181]/15 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800 dark:text-white">{t.bankWire}</p>
                        <span className="text-xs font-semibold text-[#BFA181]">USD/EUR</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.bankWireDesc}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {t.settlementTime}: <span className="text-[#2F6F62]">1-3 {t.businessDays}</span>
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* AUXM */}
                  <button
                    onClick={() => setActiveModal("auxm")}
                    className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#BFA181]/50 transition-all flex items-center gap-4 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#BFA181]/15 flex items-center justify-center">
                      <span className="text-2xl text-[#BFA181]">◈</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-slate-800 dark:text-white">{t.auxmFunding}</p>
                        <span className="text-xs font-semibold text-[#BFA181]">AUXM</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.auxmFundingDesc}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {t.settlementTime}: <span className="text-[#2F6F62]">{t.instant}</span>
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Crypto Funding */}
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">{t.cryptoFunding}</p>
                <div className="space-y-3">
                  {CRYPTO_SOURCES.map((crypto) => (
                    <button
                      key={crypto.id}
                      onClick={() => handleCryptoSelect(crypto)}
                      className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#BFA181]/50 transition-all flex items-center gap-4 text-left"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl"
                        style={{ backgroundColor: crypto.color + "20", color: crypto.color }}
                      >
                        {crypto.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-800 dark:text-white">{crypto.name}</p>
                          <span className="text-xs font-semibold text-[#BFA181]">{crypto.symbol}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{crypto.network}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          {t.settlementTime}: <span className="text-[#2F6F62]">{crypto.settlementTime}</span>
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Institutional Note */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#2F6F62]/10">
                <svg className="w-5 h-5 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-[#2F6F62] font-medium">{t.fundsCredited}</p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* BANK WIRE MODAL */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeModal === "bank" && (
            <div>
              <button
                onClick={() => setActiveModal("main")}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{t.back}</span>
              </button>

              <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-4">{t.bankDetails}</h4>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.beneficiary}</p>
                  <p className="font-medium text-slate-800 dark:text-white">Auxite Custody Ltd.</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.iban}</p>
                  <p className="font-medium text-slate-800 dark:text-white font-mono">CH93 0076 2011 6238 5295 7</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.swift}</p>
                  <p className="font-medium text-slate-800 dark:text-white font-mono">UBSWCHZH80A</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.bank}</p>
                  <p className="font-medium text-slate-800 dark:text-white">UBS Switzerland AG</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.reference}</p>
                  <p className="font-medium text-[#BFA181]">{vaultId || "AX-VLT-XXXX-XXXX"}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/20">
                  <p className="text-xs font-bold text-[#BFA181] mb-1">{t.importantNote}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t.referenceNote}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  const details = `Beneficiary: Auxite Custody Ltd.\nIBAN: CH93 0076 2011 6238 5295 7\nSWIFT: UBSWCHZH80A\nBank: UBS Switzerland AG\nReference: ${vaultId || "AX-VLT-XXXX-XXXX"}`;
                  copyToClipboard(details, "bank");
                  setShowConfirmation(true);
                }}
                className="w-full mt-6 py-4 rounded-xl bg-[#BFA181] text-black font-bold hover:bg-[#D4B47A] transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {t.copyAll}
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* AUXM FUNDING MODAL */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeModal === "auxm" && (
            <div>
              <button
                onClick={() => setActiveModal("main")}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{t.back}</span>
              </button>

              {/* AUXM Balance Card */}
              <div className="p-5 rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/20 text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className="text-2xl text-[#BFA181]">◈</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.auxmBalance}</span>
                </div>
                <p className="text-3xl font-bold text-[#BFA181]">{auxmBalance.toLocaleString()} AUXM</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">≈ ${auxmBalance.toLocaleString()} USD</p>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                  {t.auxmAmount}
                </label>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                  <input
                    type="number"
                    value={auxmAmount}
                    onChange={(e) => setAuxmAmount(e.target.value)}
                    placeholder="0"
                    className="flex-1 bg-transparent text-2xl font-bold text-slate-800 dark:text-white outline-none"
                  />
                  <button
                    onClick={() => setAuxmAmount(auxmBalance.toString())}
                    className="px-3 py-1.5 rounded-lg bg-[#BFA181]/20 text-[#BFA181] text-xs font-bold hover:bg-[#BFA181]/30 transition-colors"
                  >
                    MAX
                  </button>
                  <span className="text-lg font-semibold text-[#BFA181]">AUXM</span>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{t.auxmMin}</p>
              </div>

              {/* Rate Info */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 mb-6">
                <div className="flex justify-between py-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.auxmRate}</span>
                  <span className="text-sm font-medium text-slate-800 dark:text-white">USD equivalent</span>
                </div>
                <div className="border-t border-slate-200 dark:border-white/10 my-1"></div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.auxmEquivalent}</span>
                  <span className="text-sm font-medium text-[#2F6F62]">
                    ${(parseFloat(auxmAmount) || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Info Note */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-[#2F6F62]/10 mb-6">
                <svg className="w-5 h-5 text-[#2F6F62] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t.auxmNote}</p>
              </div>

              {/* Fund Button */}
              <button
                onClick={handleAuxmFund}
                disabled={parseFloat(auxmAmount) < 100 || parseFloat(auxmAmount) > auxmBalance}
                className="w-full py-4 rounded-xl bg-[#BFA181] text-black font-bold hover:bg-[#D4B47A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {t.auxmFund}
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════ */}
          {/* CRYPTO DEPOSIT MODAL */}
          {/* ════════════════════════════════════════════════════════════════════ */}
          {activeModal === "crypto" && selectedCrypto && (
            <div>
              <button
                onClick={() => {
                  setActiveModal("main");
                  setSelectedCrypto(null);
                  setDepositAddress(null);
                }}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-700 dark:hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{t.back}</span>
              </button>

              {/* Crypto Header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: selectedCrypto.color + "20", color: selectedCrypto.color }}
                >
                  {selectedCrypto.icon}
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-800 dark:text-white">{selectedCrypto.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCrypto.network}</p>
                </div>
              </div>

              {isLoadingAddress ? (
                <div className="py-12 text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.generatingAddress}</p>
                </div>
              ) : depositAddress ? (
                <>
                  {/* QR Code */}
                  <div className="flex justify-center mb-6">
                    <div className="p-4 bg-white rounded-xl border border-slate-200 dark:border-white/10">
                      <QRCodeSVG value={depositAddress.address} size={150} />
                    </div>
                  </div>

                  {/* Network Badge */}
                  <div className="flex justify-center mb-6">
                    <span
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                      style={{ backgroundColor: selectedCrypto.color + "15", color: selectedCrypto.color }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {depositAddress.network}
                    </span>
                  </div>

                  {/* Deposit Address */}
                  <div className="mb-6">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                      {t.depositAddress}
                    </label>
                    <button
                      onClick={() => copyToClipboard(depositAddress.address, "address")}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center gap-3 hover:border-[#BFA181]/50 transition-colors"
                    >
                      <p className="flex-1 text-sm font-mono text-slate-700 dark:text-slate-300 break-all text-left">
                        {depositAddress.address}
                      </p>
                      <span className={`text-xs font-semibold ${copiedField === "address" ? "text-[#2F6F62]" : "text-[#BFA181]"}`}>
                        {copiedField === "address" ? t.copied : t.copyAddress}
                      </span>
                    </button>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.minAmount}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{depositAddress.minDeposit}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.settlementTime}</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{depositAddress.confirmTime}</p>
                    </div>
                  </div>

                  {/* Settlement Credit Info */}
                  <div className="p-4 rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/20 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg text-[#BFA181]">◈</span>
                      <span className="text-sm font-bold text-[#BFA181]">{t.settlementCredit}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">{t.fundsSettled}</p>
                    <span className="px-3 py-1.5 rounded-lg bg-[#BFA181]/20 text-[#BFA181] text-xs font-semibold">
                      {t.creditedAsAuxm}
                    </span>
                  </div>

                  {/* Custody Note */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#2F6F62]/10 mb-4">
                    <svg className="w-5 h-5 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic">{t.custodyNote}</p>
                  </div>

                  {/* Warning */}
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-xs font-bold text-red-500 mb-1">{t.warningTitle}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {t.warningText.replace("{network}", depositAddress.network)}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-red-500">
                  Failed to generate address. Please try again.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
