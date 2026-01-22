"use client";

import { useState } from "react";

interface CoinbaseDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onSuccess?: () => void;
}

const translations = {
  tr: {
    title: "Kripto ile Yatır",
    subtitle: "Bitcoin, Ethereum ve daha fazlası ile yatırım yapın",
    amountLabel: "Yatırım Tutarı (USD)",
    amountPlaceholder: "Miktar girin",
    quickAmounts: "Hızlı Seçim",
    youWillReceive: "Alacağınız",
    bonus: "Bonus",
    total: "Toplam",
    continue: "Devam Et",
    processing: "İşleniyor...",
    supportedCoins: "Desteklenen Kripto Paralar",
    bonusTiers: "Bonus Oranları",
    minDeposit: "Min. $10",
    securePayment: "Coinbase Commerce ile güvenli ödeme",
    redirectInfo: "Coinbase ödeme sayfasına yönlendirileceksiniz",
    error: "Bir hata oluştu. Lütfen tekrar deneyin.",
    close: "Kapat",
  },
  en: {
    title: "Deposit with Crypto",
    subtitle: "Deposit with Bitcoin, Ethereum and more",
    amountLabel: "Deposit Amount (USD)",
    amountPlaceholder: "Enter amount",
    quickAmounts: "Quick Select",
    youWillReceive: "You will receive",
    bonus: "Bonus",
    total: "Total",
    continue: "Continue",
    processing: "Processing...",
    supportedCoins: "Supported Cryptocurrencies",
    bonusTiers: "Bonus Tiers",
    minDeposit: "Min. $10",
    securePayment: "Secure payment via Coinbase Commerce",
    redirectInfo: "You will be redirected to Coinbase payment page",
    error: "An error occurred. Please try again.",
    close: "Close",
  },
  de: {
    title: "Mit Krypto einzahlen",
    subtitle: "Einzahlung mit Bitcoin, Ethereum und mehr",
    amountLabel: "Einzahlungsbetrag (USD)",
    amountPlaceholder: "Betrag eingeben",
    quickAmounts: "Schnellauswahl",
    youWillReceive: "Sie erhalten",
    bonus: "Bonus",
    total: "Gesamt",
    continue: "Weiter",
    processing: "Verarbeitung...",
    supportedCoins: "Unterstützte Kryptowährungen",
    bonusTiers: "Bonus-Stufen",
    minDeposit: "Min. $10",
    securePayment: "Sichere Zahlung über Coinbase Commerce",
    redirectInfo: "Sie werden zur Coinbase-Zahlungsseite weitergeleitet",
    error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    close: "Schließen",
  },
  fr: {
    title: "Dépôt en Crypto",
    subtitle: "Déposez avec Bitcoin, Ethereum et plus",
    amountLabel: "Montant du dépôt (USD)",
    amountPlaceholder: "Entrez le montant",
    quickAmounts: "Sélection rapide",
    youWillReceive: "Vous recevrez",
    bonus: "Bonus",
    total: "Total",
    continue: "Continuer",
    processing: "Traitement...",
    supportedCoins: "Cryptomonnaies supportées",
    bonusTiers: "Niveaux de bonus",
    minDeposit: "Min. $10",
    securePayment: "Paiement sécurisé via Coinbase Commerce",
    redirectInfo: "Vous serez redirigé vers la page de paiement Coinbase",
    error: "Une erreur s'est produite. Veuillez réessayer.",
    close: "Fermer",
  },
  ar: {
    title: "الإيداع بالعملات المشفرة",
    subtitle: "قم بالإيداع باستخدام البيتكوين والإيثريوم والمزيد",
    amountLabel: "مبلغ الإيداع (دولار)",
    amountPlaceholder: "أدخل المبلغ",
    quickAmounts: "اختيار سريع",
    youWillReceive: "ستحصل على",
    bonus: "مكافأة",
    total: "المجموع",
    continue: "متابعة",
    processing: "جاري المعالجة...",
    supportedCoins: "العملات المشفرة المدعومة",
    bonusTiers: "مستويات المكافآت",
    minDeposit: "الحد الأدنى $10",
    securePayment: "دفع آمن عبر Coinbase Commerce",
    redirectInfo: "سيتم توجيهك إلى صفحة الدفع Coinbase",
    error: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    close: "إغلاق",
  },
  ru: {
    title: "Депозит криптовалютой",
    subtitle: "Пополните счет Bitcoin, Ethereum и другими",
    amountLabel: "Сумма депозита (USD)",
    amountPlaceholder: "Введите сумму",
    quickAmounts: "Быстрый выбор",
    youWillReceive: "Вы получите",
    bonus: "Бонус",
    total: "Итого",
    continue: "Продолжить",
    processing: "Обработка...",
    supportedCoins: "Поддерживаемые криптовалюты",
    bonusTiers: "Бонусные уровни",
    minDeposit: "Мин. $10",
    securePayment: "Безопасная оплата через Coinbase Commerce",
    redirectInfo: "Вы будете перенаправлены на страницу оплаты Coinbase",
    error: "Произошла ошибка. Пожалуйста, попробуйте снова.",
    close: "Закрыть",
  },
};

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 5000];

const SUPPORTED_COINS = [
  { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA" },
  { symbol: "USDC", name: "USD Coin", icon: "$", color: "#2775CA" },
  { symbol: "LTC", name: "Litecoin", icon: "Ł", color: "#BFBBBB" },
  { symbol: "DOGE", name: "Dogecoin", icon: "Ð", color: "#C2A633" },
];

const BONUS_TIERS = [
  { min: 10, max: 99, percent: 15 },
  { min: 100, max: 499, percent: 10 },
  { min: 500, max: 999, percent: 7 },
  { min: 1000, max: 4999, percent: 5 },
  { min: 5000, max: Infinity, percent: 3 },
];

export function CoinbaseDepositModal({
  isOpen,
  onClose,
  walletAddress,
  lang = "tr",
  onSuccess,
}: CoinbaseDepositModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const t = translations[lang] || translations.en;
  const amountNum = parseFloat(amount) || 0;

  // Calculate bonus
  const getBonusPercent = (amt: number) => {
    const tier = BONUS_TIERS.find((t) => amt >= t.min && amt <= t.max);
    return tier?.percent || 0;
  };

  const bonusPercent = getBonusPercent(amountNum);
  const bonusAmount = amountNum * (bonusPercent / 100);
  const totalReceive = amountNum + bonusAmount;

  const handleDeposit = async () => {
    if (amountNum < 10) {
      setError(t.minDeposit);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/coinbase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          amount: amountNum,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create deposit");
      }

      // Redirect to Coinbase hosted checkout
      if (data.charge?.hostedUrl) {
        window.location.href = data.charge.hostedUrl;
      }
    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || t.error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-xl">💳</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Supported Coins */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.supportedCoins}</p>
            <div className="flex gap-2 flex-wrap">
              {SUPPORTED_COINS.map((coin) => (
                <div
                  key={coin.symbol}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100 dark:bg-slate-800"
                >
                  <span style={{ color: coin.color }}>{coin.icon}</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {coin.symbol}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
              {t.amountLabel}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t.amountPlaceholder}
                className="w-full pl-8 pr-4 py-3 rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 text-slate-800 dark:text-white text-lg font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t.quickAmounts}</p>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    amountNum === amt
                      ? "bg-blue-500 text-white"
                      : "bg-stone-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700"
                  }`}
                >
                  ${amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Bonus Tiers Info */}
          <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-3 border border-purple-200 dark:border-purple-500/30">
            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2">
              🎁 {t.bonusTiers}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {BONUS_TIERS.map((tier, i) => (
                <div
                  key={i}
                  className={`flex justify-between ${
                    amountNum >= tier.min && amountNum <= tier.max
                      ? "text-purple-600 dark:text-purple-400 font-semibold"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  <span>
                    ${tier.min.toLocaleString()}
                    {tier.max === Infinity ? "+" : `-$${tier.max.toLocaleString()}`}
                  </span>
                  <span>+{tier.percent}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {amountNum >= 10 && (
            <div className="bg-stone-100 dark:bg-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t.youWillReceive}</span>
                <span className="text-slate-700 dark:text-slate-300">{amountNum.toFixed(2)} AUXM</span>
              </div>
              {bonusPercent > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t.bonus} (+{bonusPercent}%)
                  </span>
                  <span className="text-purple-600 dark:text-purple-400">
                    +{bonusAmount.toFixed(2)} AUXM
                  </span>
                </div>
              )}
              <div className="border-t border-stone-200 dark:border-slate-700 pt-2 flex justify-between">
                <span className="font-semibold text-slate-800 dark:text-white">{t.total}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {totalReceive.toFixed(2)} AUXM
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{t.redirectInfo}</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleDeposit}
            disabled={isLoading || amountNum < 10}
            className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>{t.processing}</span>
              </>
            ) : (
              <>
                <span>{t.continue}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          {/* Secure badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>{t.securePayment}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CoinbaseDepositModal;
