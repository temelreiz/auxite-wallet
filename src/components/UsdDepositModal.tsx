// src/components/UsdDepositModal.tsx
"use client";

import { useState, useCallback } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface UsdDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  walletAddress: string;
}

interface TransakOrder {
  success: boolean;
  orderRef: string;
  widgetUrl: string;
  error?: string;
}

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

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Kripto Satın Al",
    subtitle: "Kredi/Banka Kartı ile",
    selectCrypto: "Almak istediğiniz kripto",
    amount: "Miktar",
    email: "E-posta (isteğe bağlı)",
    emailPlaceholder: "ornek@email.com",
    buy: "Satın Al",
    buying: "İşleniyor...",
    poweredBy: "Transak ile güvenli ödeme",
    receivingWallet: "Alıcı Cüzdan",
    minMax: "Min $30 - Max $10,000",
    error: "Bir hata oluştu",
    tryAgain: "Tekrar Dene",
    securityNote: "Ödemeniz Transak tarafından güvenli şekilde işlenir. Fonlarınız doğrudan cüzdanınıza gönderilir.",
  },
  en: {
    title: "Buy Crypto",
    subtitle: "Via Credit/Debit Card",
    selectCrypto: "Select crypto to buy",
    amount: "Amount",
    email: "Email (optional)",
    emailPlaceholder: "example@email.com",
    buy: "Buy Now",
    buying: "Processing...",
    poweredBy: "Secure payment via Transak",
    receivingWallet: "Receiving Wallet",
    minMax: "Min $30 - Max $10,000",
    error: "An error occurred",
    tryAgain: "Try Again",
    securityNote: "Your payment is securely processed by Transak. Funds will be sent directly to your wallet.",
  },
  de: {
    title: "Krypto Kaufen",
    subtitle: "Per Kredit-/Debitkarte",
    selectCrypto: "Krypto zum Kauf auswählen",
    amount: "Betrag",
    email: "E-Mail (optional)",
    emailPlaceholder: "beispiel@email.com",
    buy: "Jetzt Kaufen",
    buying: "Verarbeitung...",
    poweredBy: "Sichere Zahlung über Transak",
    receivingWallet: "Empfänger-Wallet",
    minMax: "Min $30 - Max $10.000",
    error: "Ein Fehler ist aufgetreten",
    tryAgain: "Erneut versuchen",
    securityNote: "Ihre Zahlung wird sicher von Transak verarbeitet. Die Mittel werden direkt an Ihre Wallet gesendet.",
  },
  fr: {
    title: "Acheter Crypto",
    subtitle: "Par Carte de Crédit/Débit",
    selectCrypto: "Sélectionner la crypto à acheter",
    amount: "Montant",
    email: "E-mail (optionnel)",
    emailPlaceholder: "exemple@email.com",
    buy: "Acheter",
    buying: "Traitement...",
    poweredBy: "Paiement sécurisé via Transak",
    receivingWallet: "Portefeuille Destinataire",
    minMax: "Min $30 - Max $10 000",
    error: "Une erreur s'est produite",
    tryAgain: "Réessayer",
    securityNote: "Votre paiement est traité en toute sécurité par Transak. Les fonds seront envoyés directement à votre portefeuille.",
  },
  ar: {
    title: "شراء العملات المشفرة",
    subtitle: "عبر بطاقة الائتمان/الخصم",
    selectCrypto: "اختر العملة المشفرة للشراء",
    amount: "المبلغ",
    email: "البريد الإلكتروني (اختياري)",
    emailPlaceholder: "example@email.com",
    buy: "اشتر الآن",
    buying: "جاري المعالجة...",
    poweredBy: "دفع آمن عبر Transak",
    receivingWallet: "محفظة الاستلام",
    minMax: "الحد الأدنى $30 - الحد الأقصى $10,000",
    error: "حدث خطأ",
    tryAgain: "حاول مرة أخرى",
    securityNote: "تتم معالجة دفعتك بشكل آمن بواسطة Transak. سيتم إرسال الأموال مباشرة إلى محفظتك.",
  },
  ru: {
    title: "Купить Крипто",
    subtitle: "Кредитной/Дебетовой Картой",
    selectCrypto: "Выберите криптовалюту",
    amount: "Сумма",
    email: "Email (необязательно)",
    emailPlaceholder: "example@email.com",
    buy: "Купить",
    buying: "Обработка...",
    poweredBy: "Безопасная оплата через Transak",
    receivingWallet: "Кошелек Получателя",
    minMax: "Мин $30 - Макс $10,000",
    error: "Произошла ошибка",
    tryAgain: "Попробовать снова",
    securityNote: "Ваш платеж безопасно обрабатывается Transak. Средства будут отправлены прямо на ваш кошелек.",
  },
};

export function UsdDepositModal({
  isOpen,
  onClose,
  lang: langProp,
  walletAddress,
}: UsdDepositModalProps) {
  const { lang: ctxLang } = useLanguage();
  const lang = langProp || ctxLang || "en";
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [cryptoCurrency, setCryptoCurrency] = useState("ETH");
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [amount, setAmount] = useState("100");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWidget, setShowWidget] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const fiatSymbol = FIAT_OPTIONS.find(f => f.value === fiatCurrency)?.symbol || "$";

  const handleBuy = useCallback(async () => {
    if (!walletAddress) {
      setError("Wallet not connected");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 30 || amountNum > 10000) {
      setError(t("minMax"));
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

      // Open Transak in new window
      const popup = window.open(
        data.widgetUrl,
        "transak",
        "width=450,height=700,scrollbars=yes,resizable=yes"
      );

      if (!popup || popup.closed) {
        // Popup blocked - show in iframe
        setWidgetUrl(data.widgetUrl);
        setShowWidget(true);
      } else {
        // Popup opened - close modal after delay
        setTimeout(() => {
          onClose();
        }, 1000);
      }

    } catch (err: any) {
      setError(err.message || t("error"));
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, amount, cryptoCurrency, fiatCurrency, email, lang, onClose]);

  const handleCloseWidget = () => {
    setShowWidget(false);
    setWidgetUrl(null);
  };

  if (!isOpen) return null;

  // Show iframe widget if popup was blocked
  if (showWidget && widgetUrl) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 max-w-md w-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t("title")}</h3>
            <button
              onClick={handleCloseWidget}
              className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <iframe
            src={widgetUrl}
            className="w-full h-[600px] border-none"
            allow="camera;microphone;payment"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">{t("title")}</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Crypto Selection */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            {t("selectCrypto")}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {CRYPTO_OPTIONS.map((crypto) => (
              <button
                key={crypto.value}
                onClick={() => setCryptoCurrency(crypto.value)}
                className={`p-2 sm:p-3 rounded-lg border transition-all text-center ${
                  cryptoCurrency === crypto.value
                    ? "border-[#BFA181] bg-[#BFA181]/10 dark:bg-[#BFA181]/20"
                    : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
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
          <label className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            {t("amount")}
          </label>
          <div className="relative">
            <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">
              {fiatSymbol}
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={30}
              max={10000}
              className="w-full pl-8 sm:pl-10 pr-16 sm:pr-20 py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-[#BFA181] focus:border-transparent"
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
          <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1">{t("minMax")}</p>

          {/* Amount Presets */}
          <div className="flex gap-1.5 sm:gap-2 mt-2">
            {AMOUNT_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toString())}
                className={`flex-1 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded border transition-all ${
                  amount === preset.toString()
                    ? "border-[#BFA181] bg-[#BFA181]/10 dark:bg-[#BFA181]/20 text-[#BFA181] dark:text-[#BFA181]"
                    : "border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#BFA181]/50"
                }`}
              >
                {fiatSymbol}{preset}
              </button>
            ))}
          </div>
        </div>

        {/* Email (Optional) */}
        <div className="mb-4">
          <label className="block text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
            {t("email")}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm sm:text-base focus:ring-2 focus:ring-[#BFA181] focus:border-transparent"
            placeholder={t("emailPlaceholder")}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-2.5 sm:p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={isLoading}
          className="w-full py-3 sm:py-4 rounded-xl bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] hover:from-[#BFA181] hover:to-[#BFA181]/80 text-white font-semibold text-sm sm:text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t("buying")}
            </>
          ) : (
            <>
              {t("buy")} {cryptoCurrency}
            </>
          )}
        </button>

        {/* Wallet Address Display */}
        <div className="mt-4 p-2.5 sm:p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mb-1">{t("receivingWallet")}</p>
          <p className="text-xs sm:text-sm font-mono text-slate-700 dark:text-slate-300 truncate">
            {walletAddress}
          </p>
        </div>

        {/* Security Note & Powered By */}
        <div className="mt-4 text-center">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mb-2">
            {t("securityNote")}
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-600">{t("poweredBy")}</span>
            <svg className="w-14 sm:w-16 h-4 sm:h-5" viewBox="0 0 100 24" fill="none">
              <text x="0" y="17" className="text-xs font-bold fill-[#2F6F62]">TRANSAK</text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
