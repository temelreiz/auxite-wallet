"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { FundingOverviewPanel } from "./FundingOverviewPanel";
import { QRCodeSVG } from "qrcode.react";
import { BuyMetalCardModal } from "@/components/BuyMetalCardModal";

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
    cardPurchase: "Kartla Al",
    cardPurchaseDesc: "Kredi/banka kartı ile",
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
    cardPurchase: "Buy with Card",
    cardPurchaseDesc: "Credit/debit card",
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
    cardPurchase: "Mit Karte kaufen",
    cardPurchaseDesc: "Kredit-/Debitkarte",
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
    cardPurchase: "Acheter par carte",
    cardPurchaseDesc: "Carte de crédit/débit",
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
    cardPurchase: "شراء بالبطاقة",
    cardPurchaseDesc: "بطاقة ائتمان/خصم",
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
    cardPurchase: "Купить картой",
    cardPurchaseDesc: "Кредитная/дебетовая карта",
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

// Claim-flow copy (deposit confirmation by txid). Errors keyed by API code.
interface ClaimStrings {
  title: string;
  desc: string;
  placeholder: string;
  button: string;
  checking: string;
  success: string;
  errors: Record<string, string>;
}
const claimTranslations: Record<string, ClaimStrings> = {
  en: {
    title: "Already sent? Confirm your deposit",
    desc: "Sent from an exchange (Binance, Coinbase…)? Paste the transaction ID (hash) of your transfer and we'll credit your vault.",
    placeholder: "Transaction ID / hash (0x… or BTC txid)",
    button: "Confirm Deposit",
    checking: "Checking on-chain…",
    success: "Deposit credited",
    errors: {
      tx_not_found: "We couldn't find that transaction yet. If you just sent it, wait a minute and try again.",
      pending_confirmations: "Transaction found but still confirming on-chain. Try again shortly.",
      not_to_hot_wallet: "This transaction wasn't sent to your deposit address.",
      below_minimum: "That amount is below the minimum deposit.",
      already_claimed: "This deposit has already been credited.",
      processing: "This deposit is already being processed.",
      user_not_found: "Account not recognized. Please sign in again.",
      invalid_txhash: "That doesn't look like a valid transaction ID.",
      invalid_request: "That doesn't look like a valid transaction ID.",
      default: "Couldn't confirm this deposit. Please try again or contact support.",
    },
  },
  tr: {
    title: "Gönderdiniz mi? Yatırımınızı onaylayın",
    desc: "Borsadan mı gönderdiniz (Binance, Coinbase…)? Transferinizin işlem kimliğini (hash) yapıştırın, kasanıza ekleyelim.",
    placeholder: "İşlem kimliği / hash (0x… veya BTC txid)",
    button: "Yatırımı Onayla",
    checking: "Zincirde kontrol ediliyor…",
    success: "Yatırım eklendi",
    errors: {
      tx_not_found: "Bu işlemi henüz bulamadık. Az önce gönderdiyseniz bir dakika bekleyip tekrar deneyin.",
      pending_confirmations: "İşlem bulundu ama hâlâ onaylanıyor. Birazdan tekrar deneyin.",
      not_to_hot_wallet: "Bu işlem sizin yatırım adresinize gönderilmemiş.",
      below_minimum: "Bu tutar minimum yatırımın altında.",
      already_claimed: "Bu yatırım zaten eklenmiş.",
      processing: "Bu yatırım zaten işleniyor.",
      user_not_found: "Hesap tanınmadı. Lütfen tekrar giriş yapın.",
      invalid_txhash: "Bu geçerli bir işlem kimliği gibi görünmüyor.",
      invalid_request: "Bu geçerli bir işlem kimliği gibi görünmüyor.",
      default: "Bu yatırım onaylanamadı. Tekrar deneyin veya destek ile iletişime geçin.",
    },
  },
  de: {
    title: "Bereits gesendet? Einzahlung bestätigen",
    desc: "Von einer Börse gesendet (Binance, Coinbase…)? Fügen Sie die Transaktions-ID (Hash) ein, und wir schreiben sie gut.",
    placeholder: "Transaktions-ID / Hash (0x… oder BTC-txid)",
    button: "Einzahlung Bestätigen",
    checking: "On-Chain-Prüfung…",
    success: "Einzahlung gutgeschrieben",
    errors: {
      tx_not_found: "Wir konnten diese Transaktion noch nicht finden. Bitte warten Sie kurz und versuchen Sie es erneut.",
      pending_confirmations: "Transaktion gefunden, wird noch bestätigt. Bitte gleich erneut versuchen.",
      not_to_hot_wallet: "Diese Transaktion ging nicht an Ihre Einzahlungsadresse.",
      below_minimum: "Dieser Betrag liegt unter der Mindesteinzahlung.",
      already_claimed: "Diese Einzahlung wurde bereits gutgeschrieben.",
      processing: "Diese Einzahlung wird bereits verarbeitet.",
      user_not_found: "Konto nicht erkannt. Bitte erneut anmelden.",
      invalid_txhash: "Das sieht nicht nach einer gültigen Transaktions-ID aus.",
      invalid_request: "Das sieht nicht nach einer gültigen Transaktions-ID aus.",
      default: "Einzahlung konnte nicht bestätigt werden. Bitte erneut versuchen oder Support kontaktieren.",
    },
  },
  fr: {
    title: "Déjà envoyé ? Confirmez votre dépôt",
    desc: "Envoyé depuis une plateforme (Binance, Coinbase…) ? Collez l'ID de transaction (hash) et nous créditerons votre coffre.",
    placeholder: "ID de transaction / hash (0x… ou txid BTC)",
    button: "Confirmer le Dépôt",
    checking: "Vérification on-chain…",
    success: "Dépôt crédité",
    errors: {
      tx_not_found: "Transaction introuvable pour l'instant. Si vous venez de l'envoyer, attendez une minute et réessayez.",
      pending_confirmations: "Transaction trouvée mais en cours de confirmation. Réessayez bientôt.",
      not_to_hot_wallet: "Cette transaction n'a pas été envoyée à votre adresse de dépôt.",
      below_minimum: "Ce montant est inférieur au dépôt minimum.",
      already_claimed: "Ce dépôt a déjà été crédité.",
      processing: "Ce dépôt est déjà en cours de traitement.",
      user_not_found: "Compte non reconnu. Veuillez vous reconnecter.",
      invalid_txhash: "Cela ne ressemble pas à un ID de transaction valide.",
      invalid_request: "Cela ne ressemble pas à un ID de transaction valide.",
      default: "Impossible de confirmer ce dépôt. Réessayez ou contactez le support.",
    },
  },
  ar: {
    title: "هل أرسلت بالفعل؟ أكّد إيداعك",
    desc: "أرسلت من منصة (Binance، Coinbase…)؟ الصق معرّف المعاملة (hash) وسنضيفه إلى خزنتك.",
    placeholder: "معرّف المعاملة / hash (‏0x… أو BTC txid)",
    button: "تأكيد الإيداع",
    checking: "جارٍ التحقق على السلسلة…",
    success: "تمت إضافة الإيداع",
    errors: {
      tx_not_found: "لم نعثر على هذه المعاملة بعد. إذا أرسلتها للتو، انتظر دقيقة وحاول مجدداً.",
      pending_confirmations: "تم العثور على المعاملة لكنها قيد التأكيد. حاول بعد قليل.",
      not_to_hot_wallet: "لم تُرسل هذه المعاملة إلى عنوان الإيداع الخاص بك.",
      below_minimum: "هذا المبلغ أقل من الحد الأدنى للإيداع.",
      already_claimed: "تمت إضافة هذا الإيداع بالفعل.",
      processing: "هذا الإيداع قيد المعالجة بالفعل.",
      user_not_found: "الحساب غير معروف. يرجى تسجيل الدخول مجدداً.",
      invalid_txhash: "لا يبدو هذا معرّف معاملة صالحاً.",
      invalid_request: "لا يبدو هذا معرّف معاملة صالحاً.",
      default: "تعذّر تأكيد هذا الإيداع. حاول مجدداً أو تواصل مع الدعم.",
    },
  },
  ru: {
    title: "Уже отправили? Подтвердите депозит",
    desc: "Отправили с биржи (Binance, Coinbase…)? Вставьте ID транзакции (hash), и мы зачислим средства в ваше хранилище.",
    placeholder: "ID транзакции / hash (0x… или BTC txid)",
    button: "Подтвердить Депозит",
    checking: "Проверка в сети…",
    success: "Депозит зачислен",
    errors: {
      tx_not_found: "Пока не нашли эту транзакцию. Если только что отправили — подождите минуту и повторите.",
      pending_confirmations: "Транзакция найдена, но ещё подтверждается. Повторите чуть позже.",
      not_to_hot_wallet: "Эта транзакция была отправлена не на ваш адрес для депозита.",
      below_minimum: "Сумма ниже минимального депозита.",
      already_claimed: "Этот депозит уже зачислен.",
      processing: "Этот депозит уже обрабатывается.",
      user_not_found: "Аккаунт не распознан. Войдите снова.",
      invalid_txhash: "Это не похоже на корректный ID транзакции.",
      invalid_request: "Это не похоже на корректный ID транзакции.",
      default: "Не удалось подтвердить депозит. Повторите или обратитесь в поддержку.",
    },
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

type FundingRail = "crypto" | "bank" | "card" | "otc";

export function FundTab() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;
  const ct = claimTranslations[lang] || claimTranslations.en;

  const [selectedRail, setSelectedRail] = useState<FundingRail>("crypto");
  const [showCardModal, setShowCardModal] = useState(false);
  const [depositAddresses, setDepositAddresses] = useState<Record<string, DepositAddressInfo>>({});
  const [depositLoading, setDepositLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Promo code redemption — for users who didn't land via ?promo= URL
  // but heard about the code post-signup. The same endpoint that the
  // signup flow uses; attaches as pending if the user hasn't yet hit
  // the minPurchaseUSD floor, credits immediately if they have.
  const [promoInput, setPromoInput] = useState("");
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoResult, setPromoResult] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const handleApplyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || !address || promoSubmitting) return;
    setPromoSubmitting(true);
    setPromoResult(null);
    try {
      const res = await fetch("/api/promo/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, emailOrWallet: address }),
      });
      const data = await res.json();
      if (data?.ok) {
        const terms = data.terms || {};
        setPromoResult({
          type: data.status === "credited" ? "success" : "info",
          text:
            data.status === "credited"
              ? `${data.grams?.toFixed(4) ?? "?"}g ${data.asset} credited.`
              : `Code applied. Make a single $${terms.minPurchaseUSD ?? "?"}+ purchase to unlock $${terms.amountUSD ?? "?"} in ${terms.asset ?? "metal"}.`,
        });
        setPromoInput("");
      } else {
        setPromoResult({
          type: "error",
          text: data?.error || data?.message || "Could not apply promo code.",
        });
      }
    } catch {
      setPromoResult({ type: "error", text: "Network error. Try again." });
    } finally {
      setPromoSubmitting(false);
    }
  };

  // Deposit claim (confirm by txid)
  const [claimTx, setClaimTx] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimMsg, setClaimMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Load deposit addresses (per-user when wallet is known)
  useEffect(() => {
    const load = async () => {
      try {
        const qs = address ? `?address=${encodeURIComponent(address)}` : "";
        const res = await fetch(`/api/deposit${qs}`);
        const data = await res.json();
        if (data.success && data.addresses) setDepositAddresses(data.addresses);
      } catch (error) {
        console.error("Failed to load deposit addresses:", error);
      } finally {
        setDepositLoading(false);
      }
    };
    load();
  }, [address]);

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

  const submitClaim = async () => {
    const tx = claimTx.trim();
    if (!tx) return;
    if (!address) { setClaimMsg({ type: "error", text: ct.errors.user_not_found }); return; }
    setClaiming(true);
    setClaimMsg(null);
    try {
      const res = await fetch("/api/deposit/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, txHash: tx }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const credited = data.autoConverted
          ? `${Number(data.amountUsd).toFixed(2)} AUXM`
          : `${data.amount} ${data.coin}`;
        setClaimMsg({ type: "success", text: `${ct.success}: +${credited}` });
        setClaimTx("");
        loadHistory();
      } else {
        const code = String(data?.error || "default");
        const soft = code === "pending_confirmations" || code === "tx_not_found" || code === "processing";
        setClaimMsg({ type: soft ? "info" : "error", text: ct.errors[code] || ct.errors.default });
      }
    } catch {
      setClaimMsg({ type: "error", text: ct.errors.default });
    } finally {
      setClaiming(false);
    }
  };

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
      disabled: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: "card",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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
    card: t.cardPurchase,
    otc: t.otcDesk,
  };

  const railDescs: Record<FundingRail, string> = {
    crypto: t.cryptoFundingDesc,
    bank: t.bankWireDesc,
    card: t.cardPurchaseDesc,
    otc: t.otcDeskDesc,
  };

  return (
    <div>
      {/* Funding Overview */}
      <FundingOverviewPanel />

      {/* Promo code input — for users who heard about a campaign code
          (Product Hunt, X drop, partner) AFTER signing up. Code stays
          collapsed by default to avoid distracting users with no code;
          a small chevron-button reveals the input. The hint text on the
          collapsed row matches the Auxite voice. */}
      <div className="mb-6 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden">
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer px-4 py-3 text-sm select-none">
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">🎁</span>
              <span className="text-slate-700 dark:text-slate-300">Have a promo code?</span>
            </span>
            <span className="text-xs text-slate-400 group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="px-4 pb-4 pt-1 border-t border-stone-200 dark:border-slate-800">
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                placeholder="PHGOLD20"
                className="flex-1 px-3 py-2 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-mono tracking-wider text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181] focus:ring-1 focus:ring-[#BFA181]"
                maxLength={32}
                disabled={promoSubmitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleApplyPromo();
                }}
              />
              <button
                onClick={handleApplyPromo}
                disabled={!promoInput.trim() || promoSubmitting || !address}
                className="px-4 py-2 rounded-lg bg-[#BFA181] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                {promoSubmitting ? "…" : "Apply"}
              </button>
            </div>
            {promoResult && (
              <div
                className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                  promoResult.type === "success"
                    ? "bg-[#2F6F62]/10 text-[#2F6F62]"
                    : promoResult.type === "error"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-[#BFA181]/10 text-[#BFA181]"
                }`}
              >
                {promoResult.text}
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Funding Rail Selector */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
          {t.selectFundingRail}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rails.map((rail) => (
            <button
              key={rail.id}
              onClick={() => {
                if (rail.disabled) return;
                setSelectedRail(rail.id);
                // Card is a one-shot action → open the purchase modal directly
                // on selection instead of making the user click again in the panel.
                if (rail.id === "card") setShowCardModal(true);
              }}
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
      {/* HOW TO FUND GUIDE                      */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "crypto" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <h3 className="text-sm font-bold text-[#BFA181] tracking-wider mb-4">
            {{ en: 'HOW TO FUND YOUR VAULT', tr: 'KASANIZI NASIL FONLAYABİLİRSİNİZ', de: 'SO FINANZIEREN SIE IHREN TRESOR', fr: 'COMMENT FINANCER', ar: 'كيف تموّل خزنتك', ru: 'КАК ПОПОЛНИТЬ' }[lang] || 'HOW TO FUND YOUR VAULT'}
          </h3>
          <div className="space-y-3">
            {[
              { step: '1', en: 'Open Binance, Coinbase or any crypto exchange', tr: 'Binance, Coinbase veya herhangi bir kripto borsası açın' },
              { step: '2', en: 'Withdraw USDC on Base, or USDT on Tron (TRC20) — match the network to the address shown', tr: 'USDC için Base, USDT için Tron (TRC20) ağını seçin — gösterilen adresin ağıyla aynı olsun' },
              { step: '3', en: 'Paste the deposit address shown above and send', tr: 'Yukarıda gösterilen deposit adresini yapıştırın ve gönderin' },
              { step: '4', en: 'After sending, paste your transaction ID below to credit your vault', tr: 'Gönderdikten sonra işlem kimliğinizi (TX ID) aşağıya yapıştırarak kasanıza ekleyin' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#BFA181]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-[#BFA181]">{item.step}</span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{lang === 'tr' ? item.tr : item.en}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#2F6F62]/10 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {{ en: 'Sent from an exchange? Confirm it below with your transaction ID — it credits in seconds.', tr: 'Borsadan mı gönderdiniz? İşlem kimliğinizle aşağıdan onaylayın — saniyeler içinde eklenir.', de: 'Von einer Börse gesendet? Unten mit Ihrer Transaktions-ID bestätigen — Gutschrift in Sekunden.', fr: 'Envoyé depuis une plateforme ? Confirmez ci-dessous avec votre ID de transaction — crédité en quelques secondes.', ar: 'أرسلت من منصة؟ أكّد أدناه بمعرّف المعاملة — يُضاف خلال ثوانٍ.', ru: 'Отправили с биржи? Подтвердите ниже по ID транзакции — зачисление за секунды.' }[lang] || 'Sent from an exchange? Confirm it below with your transaction ID — it credits in seconds.'}
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* DEPOSIT CLAIM (confirm by txid)        */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "crypto" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">{ct.title}</h3>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{ct.desc}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={claimTx}
              onChange={(e) => setClaimTx(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !claiming) submitClaim(); }}
              placeholder={ct.placeholder}
              spellCheck={false}
              autoComplete="off"
              className="flex-1 px-4 py-3 rounded-lg bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-sm font-mono text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#BFA181]"
            />
            <button
              onClick={submitClaim}
              disabled={claiming || !claimTx.trim()}
              className="px-5 py-3 rounded-lg bg-[#BFA181] text-white text-sm font-semibold hover:bg-[#a98f6f] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {claiming ? ct.checking : ct.button}
            </button>
          </div>
          {claimMsg && (
            <div
              className={`mt-3 px-3 py-2 rounded-lg text-sm ${
                claimMsg.type === "success"
                  ? "bg-[#2F6F62]/10 text-[#2F6F62]"
                  : claimMsg.type === "info"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {claimMsg.text}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* BANK WIRE CONTENT                      */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "bank" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-8 mb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#BFA181]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#BFA181]/15 text-[#BFA181] text-sm font-semibold mb-3">
            Coming Soon
          </span>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Bank wire transfers will be available soon. In the meantime, you can fund your vault using cryptocurrency.
          </p>
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
      {/* CARD PURCHASE CONTENT                  */}
      {/* ═══════════════════════════════════════ */}
      {selectedRail === "card" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-8 mb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#BFA181]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.cardPurchase}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 max-w-sm mx-auto">{t.cardPurchaseDesc}</p>
          <button
            onClick={() => setShowCardModal(true)}
            className="px-6 py-3 rounded-lg bg-[#BFA181] text-white text-sm font-semibold hover:bg-[#a98f6f] transition-colors"
          >
            {t.cardPurchase}
          </button>
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

      {/* Card purchase modal (Stripe) */}
      <BuyMetalCardModal isOpen={showCardModal} onClose={() => setShowCardModal(false)} />
    </div>
  );
}

export default FundTab;
