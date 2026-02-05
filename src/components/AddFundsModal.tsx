// src/components/AddFundsModal.tsx
// Birleştirilmiş Add Funds Modal - Kripto Yatır + Kart ile Kripto Al + Banka Transferi (Transak)
"use client";

import { useState, useEffect } from "react";
import { Transak } from "@transak/transak-sdk";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  walletAddress: string;
  defaultTab?: "crypto" | "card" | "bank";
  bankOnly?: boolean; // Sadece Bank Transfer göster (Deposit USD için)
}

// Deposit adresleri
const DEPOSIT_ADDRESSES: Record<string, { address: string; network: string; memo?: string; icon: string; color: string }> = {
  BTC: {
    address: "1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume",
    network: "Bitcoin",
    icon: "₿",
    color: "#F7931A"
  },
  ETH: {
    address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
    network: "Ethereum / Base",
    icon: "⟠",
    color: "#627EEA"
  },
  XRP: {
    address: "r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae",
    network: "XRP Ledger",
    memo: "123456",
    icon: "✕",
    color: "#23292F"
  },
  SOL: {
    address: "6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe",
    network: "Solana",
    icon: "◎",
    color: "#9945FF"
  },
  USDT: {
    address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
    network: "Ethereum / Base (ERC-20)",
    icon: "₮",
    color: "#26A17B"
  },
};

// Transak ile satın alınabilecek kriptolar (Kart ile)
const CRYPTO_OPTIONS = [
  { value: "BTC", label: "Bitcoin", icon: "₿" },
  { value: "ETH", label: "Ethereum", icon: "⟠" },
  { value: "USDT", label: "Tether", icon: "₮" },
  { value: "SOL", label: "Solana", icon: "◎" },
];

// Banka transferi için kripto seçenekleri
const BANK_CRYPTO_OPTIONS = [
  { value: "USDT", label: "Tether (USDT)", icon: "₮" },
  { value: "USDC", label: "USD Coin", icon: "◯" },
  { value: "ETH", label: "Ethereum", icon: "⟠" },
  { value: "BTC", label: "Bitcoin", icon: "₿" },
];

// Banka transferi için fiat seçenekleri
const BANK_FIAT_OPTIONS = [
  { value: "EUR", label: "Euro (SEPA)", symbol: "€" },
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "GBP", label: "British Pound", symbol: "£" },
];

const BANK_AMOUNT_PRESETS = [500, 1000, 2500, 5000, 10000];

const FIAT_OPTIONS = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "TRY", label: "Turkish Lira", symbol: "₺" },
];


const AMOUNT_PRESETS = [50, 100, 250, 500, 1000];

const texts: Record<string, Record<string, string>> = {
  tr: {
    title: "Para Yatır",
    tabCrypto: "Kripto Yatır",
    tabCard: "Kart ile Al",
    tabBank: "Banka Transferi",
    selectCoin: "Yatırmak istediğiniz coin",
    depositAddress: "Yatırma Adresi",
    network: "Ağ",
    memo: "Memo / Tag",
    memoWarning: "Memo'yu girmeyi unutmayın!",
    copied: "Kopyalandı!",
    copy: "Kopyala",
    qrCode: "QR Kod",
    warning: "Sadece {network} ağından gönderin. Diğer ağlardan gönderilen fonlar kaybolabilir.",
    selectCrypto: "Almak istediğiniz kripto",
    amount: "Miktar",
    email: "E-posta (isteğe bağlı)",
    emailPlaceholder: "ornek@email.com",
    buy: "Satın Al",
    buying: "Yönlendiriliyor...",
    poweredBy: "Transak ile güvenli ödeme",
    receivingWallet: "Alıcı Cüzdan",
    minMax: "Min $30 - Max $10,000",
    minMaxBank: "Min $100 - Max $50,000",
    securityNote: "Ödemeniz Transak tarafından güvenli şekilde işlenir. Satın alınan kripto cüzdanınıza aktarılır.",
    continue: "Devam Et",
    back: "Geri",
    holdingNotice: "Not: Transak ile satın alınan kriptolar 30 gün boyunca sadece platform içi işlemlerde kullanılabilir.",
    bankInfo: "SEPA/Banka transferi ile kripto satın alın.",
    bankNote: "İşlem 1-3 iş günü sürebilir. Daha yüksek limitler.",
    selectBankCrypto: "Almak istediğiniz kripto",
    bankTransfer: "Banka Transferi ile Al",
  },
  en: {
    title: "Add Funds",
    tabCrypto: "Deposit Crypto",
    tabCard: "Buy with Card",
    tabBank: "Bank Transfer",
    selectCoin: "Select coin to deposit",
    depositAddress: "Deposit Address",
    network: "Network",
    memo: "Memo / Tag",
    memoWarning: "Don't forget to include the Memo!",
    copied: "Copied!",
    copy: "Copy",
    qrCode: "QR Code",
    warning: "Only send via {network} network. Funds sent from other networks may be lost.",
    selectCrypto: "Select crypto to buy",
    amount: "Amount",
    email: "Email (optional)",
    emailPlaceholder: "example@email.com",
    buy: "Buy",
    buying: "Redirecting...",
    poweredBy: "Secure payment via Transak",
    receivingWallet: "Receiving Wallet",
    minMax: "Min $30 - Max $10,000",
    minMaxBank: "Min $100 - Max $50,000",
    securityNote: "Your payment is securely processed by Transak. Purchased crypto will be transferred to your wallet.",
    continue: "Continue",
    back: "Back",
    holdingNotice: "Note: Crypto purchased via Transak can only be used for platform transactions for 30 days.",
    bankInfo: "Buy crypto with SEPA/Bank transfer.",
    bankNote: "Transaction may take 1-3 business days. Higher limits available.",
    selectBankCrypto: "Select crypto to buy",
    bankTransfer: "Buy with Bank Transfer",
  },
  de: {
    title: "Geld Einzahlen",
    tabCrypto: "Krypto Einzahlen",
    tabCard: "Mit Karte Kaufen",
    tabBank: "Banküberweisung",
    selectCoin: "Coin zum Einzahlen wählen",
    depositAddress: "Einzahlungsadresse",
    network: "Netzwerk",
    memo: "Memo / Tag",
    memoWarning: "Vergessen Sie nicht das Memo!",
    copied: "Kopiert!",
    copy: "Kopieren",
    qrCode: "QR-Code",
    warning: "Nur über {network} senden. Über andere Netzwerke gesendete Gelder können verloren gehen.",
    selectCrypto: "Krypto zum Kaufen wählen",
    amount: "Betrag",
    email: "E-Mail (optional)",
    emailPlaceholder: "beispiel@email.com",
    buy: "Kaufen",
    buying: "Weiterleitung...",
    poweredBy: "Sichere Zahlung über Transak",
    receivingWallet: "Empfangs-Wallet",
    minMax: "Min $30 - Max $10.000",
    minMaxBank: "Min $100 - Max $50.000",
    securityNote: "Ihre Zahlung wird sicher von Transak verarbeitet. Gekaufte Krypto wird in Ihr Wallet übertragen.",
    continue: "Weiter",
    back: "Zurück",
    holdingNotice: "Hinweis: Über Transak gekaufte Krypto kann 30 Tage lang nur für Plattformtransaktionen verwendet werden.",
    bankInfo: "Kaufen Sie Krypto per SEPA/Banküberweisung.",
    bankNote: "Die Transaktion kann 1-3 Werktage dauern. Höhere Limits verfügbar.",
    selectBankCrypto: "Krypto zum Kaufen wählen",
    bankTransfer: "Per Banküberweisung kaufen",
  },
  fr: {
    title: "Ajouter des Fonds",
    tabCrypto: "Déposer Crypto",
    tabCard: "Acheter par Carte",
    tabBank: "Virement Bancaire",
    selectCoin: "Sélectionner la crypto à déposer",
    depositAddress: "Adresse de Dépôt",
    network: "Réseau",
    memo: "Memo / Tag",
    memoWarning: "N'oubliez pas d'inclure le Memo!",
    copied: "Copié!",
    copy: "Copier",
    qrCode: "Code QR",
    warning: "Envoyez uniquement via le réseau {network}. Les fonds envoyés depuis d'autres réseaux peuvent être perdus.",
    selectCrypto: "Sélectionner la crypto à acheter",
    amount: "Montant",
    email: "E-mail (optionnel)",
    emailPlaceholder: "exemple@email.com",
    buy: "Acheter",
    buying: "Redirection...",
    poweredBy: "Paiement sécurisé via Transak",
    receivingWallet: "Portefeuille de Réception",
    minMax: "Min $30 - Max $10,000",
    minMaxBank: "Min $100 - Max $50,000",
    securityNote: "Votre paiement est traité en toute sécurité par Transak. La crypto achetée sera transférée dans votre portefeuille.",
    continue: "Continuer",
    back: "Retour",
    holdingNotice: "Note: Les cryptos achetées via Transak ne peuvent être utilisées que pour les transactions de la plateforme pendant 30 jours.",
    bankInfo: "Achetez des cryptos par virement SEPA/bancaire.",
    bankNote: "La transaction peut prendre 1 à 3 jours ouvrables. Limites plus élevées.",
    selectBankCrypto: "Sélectionner la crypto à acheter",
    bankTransfer: "Acheter par Virement",
  },
  ar: {
    title: "إضافة أموال",
    tabCrypto: "إيداع العملات المشفرة",
    tabCard: "شراء بالبطاقة",
    tabBank: "تحويل بنكي",
    selectCoin: "اختر العملة للإيداع",
    depositAddress: "عنوان الإيداع",
    network: "الشبكة",
    memo: "المذكرة / العلامة",
    memoWarning: "لا تنس تضمين المذكرة!",
    copied: "تم النسخ!",
    copy: "نسخ",
    qrCode: "رمز QR",
    warning: "أرسل فقط عبر شبكة {network}. قد تُفقد الأموال المرسلة من شبكات أخرى.",
    selectCrypto: "اختر العملة المشفرة للشراء",
    amount: "المبلغ",
    email: "البريد الإلكتروني (اختياري)",
    emailPlaceholder: "example@email.com",
    buy: "شراء",
    buying: "جاري التحويل...",
    poweredBy: "دفع آمن عبر Transak",
    receivingWallet: "محفظة الاستلام",
    minMax: "الحد الأدنى $30 - الحد الأقصى $10,000",
    minMaxBank: "الحد الأدنى $100 - الحد الأقصى $50,000",
    securityNote: "تتم معالجة دفعتك بشكل آمن بواسطة Transak. سيتم تحويل العملة المشفرة المشتراة إلى محفظتك.",
    continue: "متابعة",
    back: "رجوع",
    holdingNotice: "ملاحظة: يمكن استخدام العملات المشفرة المشتراة عبر Transak فقط لمعاملات المنصة لمدة 30 يومًا.",
    bankInfo: "اشترِ العملات المشفرة عبر التحويل البنكي/SEPA.",
    bankNote: "قد تستغرق المعاملة 1-3 أيام عمل. حدود أعلى متاحة.",
    selectBankCrypto: "اختر العملة المشفرة للشراء",
    bankTransfer: "شراء بالتحويل البنكي",
  },
  ru: {
    title: "Пополнить",
    tabCrypto: "Депозит Крипто",
    tabCard: "Купить Картой",
    tabBank: "Банковский Перевод",
    selectCoin: "Выберите криптовалюту для депозита",
    depositAddress: "Адрес для Депозита",
    network: "Сеть",
    memo: "Memo / Tag",
    memoWarning: "Не забудьте указать Memo!",
    copied: "Скопировано!",
    copy: "Копировать",
    qrCode: "QR-код",
    warning: "Отправляйте только через сеть {network}. Средства, отправленные через другие сети, могут быть потеряны.",
    selectCrypto: "Выберите криптовалюту для покупки",
    amount: "Сумма",
    email: "Email (необязательно)",
    emailPlaceholder: "example@email.com",
    buy: "Купить",
    buying: "Перенаправление...",
    poweredBy: "Безопасная оплата через Transak",
    receivingWallet: "Кошелек Получения",
    minMax: "Мин $30 - Макс $10,000",
    minMaxBank: "Мин $100 - Макс $50,000",
    securityNote: "Ваш платеж безопасно обрабатывается Transak. Купленная крипта будет переведена в ваш кошелек.",
    continue: "Продолжить",
    back: "Назад",
    holdingNotice: "Примечание: Криптовалюта, купленная через Transak, может использоваться только для платформенных транзакций в течение 30 дней.",
    bankInfo: "Покупайте криптовалюту через SEPA/банковский перевод.",
    bankNote: "Транзакция может занять 1-3 рабочих дня. Доступны более высокие лимиты.",
    selectBankCrypto: "Выберите криптовалюту для покупки",
    bankTransfer: "Купить через Банк",
  },
};

export function AddFundsModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
  defaultTab = "crypto",
  bankOnly = false,
}: AddFundsModalProps) {
  const [activeTab, setActiveTab] = useState<"crypto" | "card" | "bank">(defaultTab);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Card purchase states (Transak)
  const [cryptoCurrency, setCryptoCurrency] = useState("BTC");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [amount, setAmount] = useState("100");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Bank transfer states (Transak SEPA)
  const [bankCryptoCurrency, setBankCryptoCurrency] = useState("USDT");
  const [bankFiatCurrency, setBankFiatCurrency] = useState("EUR");
  const [bankAmount, setBankAmount] = useState("1000");
  const [bankEmail, setBankEmail] = useState("");
  const [isBankLoading, setIsBankLoading] = useState(false);

  const t = texts[lang] || texts.en;
  const fiatSymbol = FIAT_OPTIONS.find(f => f.value === fiatCurrency)?.symbol || "$";
  const bankFiatSymbol = BANK_FIAT_OPTIONS.find(f => f.value === bankFiatCurrency)?.symbol || "€";

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCoin(null);
    }
  }, [isOpen]);

  const handleCopyAddress = async (text: string, type: "address" | "memo") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedMemo(true);
        setTimeout(() => setCopiedMemo(false), 2000);
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Kart ile kripto al (Transak SDK Modal)
  const handleBuyWithCard = () => {
    if (!walletAddress) return;

    setIsLoading(true);

    const transakApiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY || "5911d9ec-46b5-48fa-a755-d59a3f4b4039";

    const params = new URLSearchParams({
      apiKey: transakApiKey,
      environment: "STAGING",
      cryptoCurrencyCode: cryptoCurrency,
      fiatCurrency: fiatCurrency,
      fiatAmount: amount,
      walletAddress: walletAddress,
      disableWalletAddressForm: "true",
      hideMenu: "true",
      paymentMethod: "credit_debit_card",
      ...(email && { email }),
    });

    const widgetUrl = `https://global-stg.transak.com/?${params.toString()}`;

    try {
      const transak = new Transak({
        widgetUrl: widgetUrl,
        referrer: window.location.origin,
        themeColor: "f59e0b",
        widgetWidth: "450px",
        widgetHeight: "700px",
      });

      transak.init();

      // Event listeners
      Transak.on("TRANSAK_WIDGET_CLOSE", () => {
        setIsLoading(false);
        transak.close();
      });

      Transak.on("TRANSAK_ORDER_SUCCESSFUL", () => {
        setIsLoading(false);
        transak.close();
        onClose();
      });

      Transak.on("TRANSAK_ORDER_FAILED", () => {
        setIsLoading(false);
        transak.close();
      });
    } catch (error) {
      console.error("Transak error:", error);
      // Fallback to window.open if SDK fails
      window.open(widgetUrl, "_blank");
      setIsLoading(false);
      onClose();
    }
  };

  // Banka transferi ile kripto al (Transak SDK Modal - sadece SEPA)
  const handleBuyWithBank = () => {
    if (!walletAddress) return;

    setIsBankLoading(true);

    const transakApiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY || "5911d9ec-46b5-48fa-a755-d59a3f4b4039";

    const params = new URLSearchParams({
      apiKey: transakApiKey,
      environment: "STAGING",
      cryptoCurrencyCode: bankCryptoCurrency,
      fiatCurrency: bankFiatCurrency,
      fiatAmount: bankAmount,
      walletAddress: walletAddress,
      disableWalletAddressForm: "true",
      hideMenu: "true",
      paymentMethod: "sepa_bank_transfer",
      disablePaymentMethods: "credit_debit_card,apple_pay,google_pay",
      ...(bankEmail && { email: bankEmail }),
    });

    const widgetUrl = `https://global-stg.transak.com/?${params.toString()}`;

    try {
      const transak = new Transak({
        widgetUrl: widgetUrl,
        referrer: window.location.origin,
        themeColor: "3b82f6",
        widgetWidth: "450px",
        widgetHeight: "700px",
      });

      transak.init();

      // Event listeners
      Transak.on("TRANSAK_WIDGET_CLOSE", () => {
        setIsBankLoading(false);
        transak.close();
      });

      Transak.on("TRANSAK_ORDER_SUCCESSFUL", () => {
        setIsBankLoading(false);
        transak.close();
        onClose();
      });

      Transak.on("TRANSAK_ORDER_FAILED", () => {
        setIsBankLoading(false);
        transak.close();
      });
    } catch (error) {
      console.error("Transak error:", error);
      // Fallback to window.open if SDK fails
      window.open(widgetUrl, "_blank");
      setIsBankLoading(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-700 flex-shrink-0">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{t.title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs - 3 seçenek (bankOnly modunda gizle) */}
        {!bankOnly && (
          <div className="flex border-b border-stone-200 dark:border-slate-700 flex-shrink-0">
            <button
              onClick={() => { setActiveTab("crypto"); setSelectedCoin(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "crypto"
                  ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t.tabCrypto}
            </button>
            <button
              onClick={() => { setActiveTab("card"); setSelectedCoin(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "card"
                  ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t.tabCard}
            </button>
            <button
              onClick={() => { setActiveTab("bank"); setSelectedCoin(null); }}
              className={`flex-1 py-2.5 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "bank"
                  ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {t.tabBank}
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: Kripto Yatır */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "crypto" && !selectedCoin && (
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.selectCoin}</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(DEPOSIT_ADDRESSES).map(([coin, data]) => (
                  <button
                    key={coin}
                    onClick={() => setSelectedCoin(coin)}
                    className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-amber-500/50 transition-all flex items-center gap-3 text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                      style={{ backgroundColor: data.color }}
                    >
                      {data.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white">{coin}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{data.network}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "crypto" && selectedCoin && (
            <div>
              <button
                onClick={() => setSelectedCoin(null)}
                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white mb-4 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">{t.back}</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl"
                  style={{ backgroundColor: DEPOSIT_ADDRESSES[selectedCoin].color }}
                >
                  {DEPOSIT_ADDRESSES[selectedCoin].icon}
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-800 dark:text-white">{selectedCoin}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{DEPOSIT_ADDRESSES[selectedCoin].network}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.depositAddress}
                </label>
                <div className="bg-stone-100 dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-mono text-slate-700 dark:text-slate-300 break-all flex-1">
                    {DEPOSIT_ADDRESSES[selectedCoin].address}
                  </p>
                  <button
                    onClick={() => handleCopyAddress(DEPOSIT_ADDRESSES[selectedCoin].address, "address")}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                  >
                    {copiedAddress ? t.copied : t.copy}
                  </button>
                </div>
              </div>

              {DEPOSIT_ADDRESSES[selectedCoin].memo && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                    {t.memo}
                  </label>
                  <div className="bg-stone-100 dark:bg-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                    <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                      {DEPOSIT_ADDRESSES[selectedCoin].memo}
                    </p>
                    <button
                      onClick={() => handleCopyAddress(DEPOSIT_ADDRESSES[selectedCoin].memo!, "memo")}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                    >
                      {copiedMemo ? t.copied : t.copy}
                    </button>
                  </div>
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {t.memoWarning}
                  </p>
                </div>
              )}

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t.warning.replace("{network}", DEPOSIT_ADDRESSES[selectedCoin].network)}
                </p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: Kart ile Al */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "card" && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.selectCrypto}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {CRYPTO_OPTIONS.map((crypto) => (
                    <button
                      key={crypto.value}
                      onClick={() => setCryptoCurrency(crypto.value)}
                      className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
                        cryptoCurrency === crypto.value
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                          : "border-stone-200 dark:border-slate-700 hover:border-amber-300"
                      }`}
                    >
                      <span className="text-lg sm:text-xl">{crypto.icon}</span>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                        {crypto.value}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.amount}
                </label>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    {fiatSymbol}
                  </span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={30}
                    max={10000}
                    className="w-full pl-8 sm:pl-10 pr-16 sm:pr-20 py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="100"
                  />
                  <select
                    value={fiatCurrency}
                    onChange={(e) => setFiatCurrency(e.target.value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-stone-100 dark:bg-slate-700 border-none rounded px-2 py-1 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    {FIAT_OPTIONS.map((fiat) => (
                      <option key={fiat.value} value={fiat.value}>
                        {fiat.value}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">{t.minMax}</p>

                <div className="flex gap-1.5 sm:gap-2 mt-2">
                  {AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setAmount(preset.toString())}
                      className={`flex-1 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded border transition-all ${
                        amount === preset.toString()
                          ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                          : "border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300"
                      }`}
                    >
                      {fiatSymbol}{preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder={t.emailPlaceholder}
                />
              </div>

              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t.holdingNotice}
                </p>
              </div>

              <button
                onClick={handleBuyWithCard}
                disabled={isLoading}
                className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.buying}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    {t.buy} {cryptoCurrency}
                  </>
                )}
              </button>

              <div className="mt-4 p-2.5 sm:p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mb-1">{t.receivingWallet}</p>
                <p className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                  {walletAddress}
                </p>
              </div>

              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-[10px] sm:text-xs text-center text-slate-500 dark:text-slate-500">
                  {t.securityNote}
                </p>
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs font-medium">{t.poweredBy}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: Banka Transferi - Transak SEPA (yeni pencerede açılır) */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "bank" && (
            <div>
              {/* Bank Info Banner */}
              <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <div>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">
                      {t.bankInfo}
                    </p>
                    <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {t.bankNote}
                    </p>
                  </div>
                </div>
              </div>

              {/* Crypto Selection for Bank */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.selectBankCrypto}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BANK_CRYPTO_OPTIONS.map((crypto) => (
                    <button
                      key={crypto.value}
                      onClick={() => setBankCryptoCurrency(crypto.value)}
                      className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
                        bankCryptoCurrency === crypto.value
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-stone-200 dark:border-slate-700 hover:border-blue-300"
                      }`}
                    >
                      <span className="text-lg sm:text-xl">{crypto.icon}</span>
                      <p className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                        {crypto.value}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Input for Bank */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.amount}
                </label>
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    {bankFiatSymbol}
                  </span>
                  <input
                    type="number"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                    min={100}
                    max={50000}
                    className="w-full pl-8 sm:pl-10 pr-16 sm:pr-20 py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="1000"
                  />
                  <select
                    value={bankFiatCurrency}
                    onChange={(e) => setBankFiatCurrency(e.target.value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-stone-100 dark:bg-slate-700 border-none rounded px-2 py-1 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    {BANK_FIAT_OPTIONS.map((fiat) => (
                      <option key={fiat.value} value={fiat.value}>
                        {fiat.value}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">{t.minMaxBank}</p>

                {/* Bank Amount Presets */}
                <div className="flex gap-1.5 sm:gap-2 mt-2">
                  {BANK_AMOUNT_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setBankAmount(preset.toString())}
                      className={`flex-1 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded border transition-all ${
                        bankAmount === preset.toString()
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400"
                          : "border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-blue-300"
                      }`}
                    >
                      {bankFiatSymbol}{preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Email for Bank */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={bankEmail}
                  onChange={(e) => setBankEmail(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t.emailPlaceholder}
                />
              </div>

              {/* Holding Period Notice */}
              <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t.holdingNotice}
                </p>
              </div>

              {/* Bank Transfer Button */}
              <button
                onClick={handleBuyWithBank}
                disabled={isBankLoading}
                className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isBankLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.buying}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {t.bankTransfer} {bankCryptoCurrency}
                  </>
                )}
              </button>

              {/* Receiving Wallet */}
              <div className="mt-4 p-2.5 sm:p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mb-1">{t.receivingWallet}</p>
                <p className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
                  {walletAddress}
                </p>
              </div>

              {/* Security Note */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-[10px] sm:text-xs text-center text-slate-500 dark:text-slate-500">
                  {t.securityNote}
                </p>
                <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-xs font-medium">{t.poweredBy}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
