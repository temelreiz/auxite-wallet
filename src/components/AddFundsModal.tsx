// src/components/AddFundsModal.tsx
// Birleştirilmiş Add Funds Modal - Kripto Yatır + Kart ile Al
"use client";

import { useState, useCallback, useEffect } from "react";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  walletAddress: string;
  defaultTab?: "crypto" | "card";
}

interface TransakOrder {
  success: boolean;
  orderRef: string;
  widgetUrl: string;
  error?: string;
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

const CRYPTO_OPTIONS = [
  { value: "ETH", label: "Ethereum", icon: "⟠" },
  { value: "USDT", label: "Tether", icon: "₮" },
  { value: "USDC", label: "USD Coin", icon: "$" },
  { value: "BTC", label: "Bitcoin", icon: "₿" },
];

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
    buying: "İşleniyor...",
    poweredBy: "Transak ile güvenli ödeme",
    receivingWallet: "Alıcı Cüzdan",
    minMax: "Min $30 - Max $10,000",
    securityNote: "Ödemeniz Transak tarafından güvenli şekilde işlenir.",
    continue: "Devam Et",
    back: "Geri",
    processing: "İşlem devam ediyor...",
    completePayment: "Ödemeyi Tamamla",
  },
  en: {
    title: "Add Funds",
    tabCrypto: "Deposit Crypto",
    tabCard: "Buy with Card",
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
    buy: "Buy Now",
    buying: "Processing...",
    poweredBy: "Secure payment via Transak",
    receivingWallet: "Receiving Wallet",
    minMax: "Min $30 - Max $10,000",
    securityNote: "Your payment is securely processed by Transak.",
    continue: "Continue",
    back: "Back",
    processing: "Transaction in progress...",
    completePayment: "Complete Payment",
  },
  de: {
    title: "Geld Einzahlen",
    tabCrypto: "Krypto Einzahlen",
    tabCard: "Mit Karte Kaufen",
    selectCoin: "Coin zum Einzahlen wählen",
    depositAddress: "Einzahlungsadresse",
    network: "Netzwerk",
    memo: "Memo / Tag",
    memoWarning: "Vergessen Sie nicht das Memo!",
    copied: "Kopiert!",
    copy: "Kopieren",
    qrCode: "QR-Code",
    warning: "Nur über {network} senden. Über andere Netzwerke gesendete Gelder können verloren gehen.",
    selectCrypto: "Krypto zum Kaufen auswählen",
    amount: "Betrag",
    email: "E-Mail (optional)",
    emailPlaceholder: "beispiel@email.com",
    buy: "Jetzt Kaufen",
    buying: "Verarbeitung...",
    poweredBy: "Sichere Zahlung über Transak",
    receivingWallet: "Empfänger-Wallet",
    minMax: "Min $30 - Max $10.000",
    securityNote: "Ihre Zahlung wird sicher von Transak verarbeitet.",
    continue: "Weiter",
    back: "Zurück",
    processing: "Transaktion läuft...",
    completePayment: "Zahlung Abschließen",
  },
  fr: {
    title: "Ajouter des Fonds",
    tabCrypto: "Déposer Crypto",
    tabCard: "Acheter par Carte",
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
    buying: "Traitement...",
    poweredBy: "Paiement sécurisé via Transak",
    receivingWallet: "Portefeuille Destinataire",
    minMax: "Min $30 - Max $10,000",
    securityNote: "Votre paiement est traité en toute sécurité par Transak.",
    continue: "Continuer",
    back: "Retour",
    processing: "Transaction en cours...",
    completePayment: "Terminer le Paiement",
  },
  ar: {
    title: "إضافة أموال",
    tabCrypto: "إيداع العملات المشفرة",
    tabCard: "شراء بالبطاقة",
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
    buy: "اشتر الآن",
    buying: "جاري المعالجة...",
    poweredBy: "دفع آمن عبر Transak",
    receivingWallet: "محفظة الاستلام",
    minMax: "الحد الأدنى $30 - الحد الأقصى $10,000",
    securityNote: "تتم معالجة دفعتك بشكل آمن بواسطة Transak.",
    continue: "متابعة",
    back: "رجوع",
    processing: "العملية جارية...",
    completePayment: "إتمام الدفع",
  },
  ru: {
    title: "Пополнить",
    tabCrypto: "Депозит Крипто",
    tabCard: "Купить Картой",
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
    buying: "Обработка...",
    poweredBy: "Безопасная оплата через Transak",
    receivingWallet: "Кошелек Получателя",
    minMax: "Мин $30 - Макс $10,000",
    securityNote: "Ваш платеж безопасно обрабатывается Transak.",
    continue: "Продолжить",
    back: "Назад",
    processing: "Транзакция выполняется...",
    completePayment: "Завершить Оплату",
  },
};

export function AddFundsModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
  defaultTab = "crypto",
}: AddFundsModalProps) {
  const [activeTab, setActiveTab] = useState<"crypto" | "card">(defaultTab);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Card purchase states
  const [cryptoCurrency, setCryptoCurrency] = useState("ETH");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [amount, setAmount] = useState("100");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTransakWidget, setShowTransakWidget] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);

  const t = texts[lang] || texts.en;
  const fiatSymbol = FIAT_OPTIONS.find(f => f.value === fiatCurrency)?.symbol || "$";

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCoin(null);
      setShowTransakWidget(false);
      setWidgetUrl(null);
      setError(null);
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

  const handleBuyWithCard = useCallback(async () => {
    if (!walletAddress) {
      setError("Wallet not connected");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 30 || amountNum > 10000) {
      setError(t.minMax);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/transak/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          cryptoCurrency,
          fiatCurrency,
          fiatAmount: amountNum,
          email: email || undefined,
        }),
      });

      const data: TransakOrder = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to create order");
      }

      // Show Transak widget in modal (not popup)
      setWidgetUrl(data.widgetUrl);
      setShowTransakWidget(true);

    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, amount, cryptoCurrency, fiatCurrency, email, t]);

  const handleBackFromWidget = () => {
    setShowTransakWidget(false);
    setWidgetUrl(null);
  };

  if (!isOpen) return null;

  // Show Transak iframe widget
  if (showTransakWidget && widgetUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-700">
            <button
              onClick={handleBackFromWidget}
              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">{t.back}</span>
            </button>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{t.completePayment}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Transak iframe */}
          <iframe
            src={widgetUrl}
            className="w-full h-[550px] sm:h-[600px] border-none"
            allow="camera;microphone;payment"
          />

          {/* Footer */}
          <div className="p-3 border-t border-stone-200 dark:border-slate-700 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-500">{t.poweredBy}</p>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Tabs */}
        <div className="flex border-b border-stone-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={() => { setActiveTab("crypto"); setSelectedCoin(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "crypto"
                ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.tabCrypto}
          </button>
          <button
            onClick={() => { setActiveTab("card"); setSelectedCoin(null); }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "card"
                ? "text-amber-600 dark:text-amber-400 border-b-2 border-amber-500"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.tabCard}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "crypto" && !selectedCoin && (
            /* Crypto Coin Selection */
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
            /* Crypto Deposit Address */
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

              {/* Deposit Address */}
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
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
                  >
                    {copiedAddress ? t.copied : t.copy}
                  </button>
                </div>
              </div>

              {/* Memo if exists */}
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
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium transition-colors"
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

              {/* Warning */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {t.warning.replace("{network}", DEPOSIT_ADDRESSES[selectedCoin].network)}
                </p>
              </div>
            </div>
          )}

          {activeTab === "card" && (
            /* Card Purchase Form */
            <div>
              {/* Crypto Selection */}
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

              {/* Amount Input */}
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

                {/* Amount Presets */}
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

              {/* Email */}
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

              {/* Error */}
              {error && (
                <div className="mb-4 p-2.5 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Buy Button */}
              <button
                onClick={handleBuyWithCard}
                disabled={isLoading}
                className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    {t.buy} {cryptoCurrency}
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
              <p className="mt-3 text-[10px] sm:text-xs text-center text-slate-500 dark:text-slate-500">
                {t.securityNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
