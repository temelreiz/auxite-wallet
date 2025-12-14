// src/components/BuyWithUsdModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./WalletContext";

interface BuyWithUsdModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  walletAddress: string;
}

// ============================================
// MOONPAY CONFIGURATION - Future Integration
// ============================================
const MOONPAY_CONFIG = {
  enabled: false, // Set to true when ready to enable MoonPay
  apiKey: process.env.NEXT_PUBLIC_MOONPAY_API_KEY || "",
  environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
  baseUrl: "https://buy.moonpay.com",
  // Supported currencies for deposit
  supportedCurrencies: ["usd", "eur", "gbp", "try"],
  // Default currency
  defaultCurrency: "usd",
  // Min/Max amounts
  minAmount: 30,
  maxAmount: 10000,
};

// Sadece AUXM ve Metaller (Crypto YOK)
const TOKENS = [
  {
    id: "auxm",
    name: "Auxite Token",
    symbol: "AUXM",
    price: 0.1,
    icon: "◆",
    color: "#10B981",
  },
  {
    id: "auxg",
    name: "Dijital Altın",
    symbol: "AUXG",
    price: 90,
    icon: "🥇",
    color: "#F59E0B",
  },
  {
    id: "auxs",
    name: "Dijital Gümüş",
    symbol: "AUXS",
    price: 1.1,
    icon: "🥈",
    color: "#9CA3AF",
  },
  {
    id: "auxpt",
    name: "Dijital Platin",
    symbol: "AUXPT",
    price: 35,
    icon: "⬡",
    color: "#E5E7EB",
  },
  {
    id: "auxpd",
    name: "Dijital Paladyum",
    symbol: "AUXPD",
    price: 32,
    icon: "⬢",
    color: "#F472B6",
  },
];

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const texts: Record<string, Record<string, string>> = {
  tr: {
    title: "USD ile Satın Al",
    selectToken: "Token Seç",
    amount: "Miktar",
    usdBalance: "USD Bakiye",
    youWillReceive: "Alacağınız",
    rate: "Kur",
    buyButton: "Satın Al",
    processing: "İşleniyor...",
    insufficientBalance: "Yetersiz USD bakiyesi",
    minAmount: "Minimum: $1",
    maxAmount: "Maksimum: $100,000",
    success: "Başarılı! Token bakiyenize eklendi.",
    error: "İşlem başarısız oldu",
    depositFirst: "USD Yatır",
    paymentMethod: "Ödeme Yöntemi",
    usdBalanceOption: "USD Bakiyesi",
    cardOption: "Kredi/Banka Kartı",
    moonpayOption: "MoonPay ile",
    moonpayDesc: "Kredi kartı ile anında USD yatırın",
    moonpayComingSoon: "Yakında",
    moonpayMinAmount: "Min. $30",
    noUsdBalance: "USD bakiyeniz yok",
    depositUsdFirst: "Önce USD yatırın veya MoonPay kullanın",
    bonus: "Bonus",
    totalReceive: "Toplam Alacağınız",
  },
  en: {
    title: "Buy with USD",
    selectToken: "Select Token",
    amount: "Amount",
    usdBalance: "USD Balance",
    youWillReceive: "You will receive",
    rate: "Rate",
    buyButton: "Buy",
    processing: "Processing...",
    insufficientBalance: "Insufficient USD balance",
    minAmount: "Minimum: $1",
    maxAmount: "Maximum: $100,000",
    success: "Success! Tokens added to your balance.",
    error: "Transaction failed",
    depositFirst: "Deposit USD",
    paymentMethod: "Payment Method",
    usdBalanceOption: "USD Balance",
    cardOption: "Credit/Debit Card",
    moonpayOption: "via MoonPay",
    moonpayDesc: "Instantly deposit USD with credit card",
    moonpayComingSoon: "Coming Soon",
    moonpayMinAmount: "Min. $30",
    noUsdBalance: "No USD balance",
    depositUsdFirst: "Deposit USD first or use MoonPay",
    bonus: "Bonus",
    totalReceive: "Total to Receive",
  },
  de: {
    title: "Mit USD kaufen",
    selectToken: "Token auswählen",
    amount: "Betrag",
    usdBalance: "USD Guthaben",
    youWillReceive: "Sie erhalten",
    rate: "Kurs",
    buyButton: "Kaufen",
    processing: "Wird verarbeitet...",
    insufficientBalance: "Unzureichendes USD-Guthaben",
    minAmount: "Minimum: $1",
    maxAmount: "Maximum: $100.000",
    success: "Erfolg! Token wurden Ihrem Guthaben hinzugefügt.",
    error: "Transaktion fehlgeschlagen",
    depositFirst: "USD einzahlen",
    paymentMethod: "Zahlungsmethode",
    usdBalanceOption: "USD Guthaben",
    cardOption: "Kredit-/Debitkarte",
    moonpayOption: "über MoonPay",
    moonpayDesc: "Sofortige USD-Einzahlung per Kreditkarte",
    moonpayComingSoon: "Demnächst",
    moonpayMinAmount: "Min. $30",
    noUsdBalance: "Kein USD-Guthaben",
    depositUsdFirst: "Zuerst USD einzahlen oder MoonPay verwenden",
    bonus: "Bonus",
    totalReceive: "Gesamt zu erhalten",
  },
  fr: {
    title: "Acheter avec USD",
    selectToken: "Sélectionner Token",
    amount: "Montant",
    usdBalance: "Solde USD",
    youWillReceive: "Vous recevrez",
    rate: "Taux",
    buyButton: "Acheter",
    processing: "Traitement...",
    insufficientBalance: "Solde USD insuffisant",
    minAmount: "Minimum: 1$",
    maxAmount: "Maximum: 100 000$",
    success: "Succès! Tokens ajoutés à votre solde.",
    error: "Transaction échouée",
    depositFirst: "Déposer USD",
    paymentMethod: "Mode de Paiement",
    usdBalanceOption: "Solde USD",
    cardOption: "Carte de Crédit/Débit",
    moonpayOption: "via MoonPay",
    moonpayDesc: "Déposez USD instantanément par carte de crédit",
    moonpayComingSoon: "Bientôt",
    moonpayMinAmount: "Min. 30$",
    noUsdBalance: "Pas de solde USD",
    depositUsdFirst: "Déposez d'abord USD ou utilisez MoonPay",
    bonus: "Bonus",
    totalReceive: "Total à recevoir",
  },
  ar: {
    title: "شراء بالدولار",
    selectToken: "اختر التوكن",
    amount: "المبلغ",
    usdBalance: "رصيد الدولار",
    youWillReceive: "ستحصل على",
    rate: "السعر",
    buyButton: "شراء",
    processing: "جاري المعالجة...",
    insufficientBalance: "رصيد الدولار غير كافٍ",
    minAmount: "الحد الأدنى: 1$",
    maxAmount: "الحد الأقصى: 100,000$",
    success: "نجاح! تمت إضافة التوكنات إلى رصيدك.",
    error: "فشلت المعاملة",
    depositFirst: "إيداع USD",
    paymentMethod: "طريقة الدفع",
    usdBalanceOption: "رصيد USD",
    cardOption: "بطاقة ائتمان/خصم",
    moonpayOption: "عبر MoonPay",
    moonpayDesc: "أودع USD فوراً ببطاقة الائتمان",
    moonpayComingSoon: "قريباً",
    moonpayMinAmount: "الحد الأدنى $30",
    noUsdBalance: "لا يوجد رصيد USD",
    depositUsdFirst: "أودع USD أولاً أو استخدم MoonPay",
    bonus: "مكافأة",
    totalReceive: "المجموع المستلم",
  },
  ru: {
    title: "Купить за USD",
    selectToken: "Выбрать Токен",
    amount: "Сумма",
    usdBalance: "Баланс USD",
    youWillReceive: "Вы получите",
    rate: "Курс",
    buyButton: "Купить",
    processing: "Обработка...",
    insufficientBalance: "Недостаточный баланс USD",
    minAmount: "Минимум: $1",
    maxAmount: "Максимум: $100,000",
    success: "Успех! Токены добавлены на ваш баланс.",
    error: "Транзакция не удалась",
    depositFirst: "Внести USD",
    paymentMethod: "Способ Оплаты",
    usdBalanceOption: "Баланс USD",
    cardOption: "Кредитная/Дебетовая Карта",
    moonpayOption: "через MoonPay",
    moonpayDesc: "Мгновенный депозит USD кредитной картой",
    moonpayComingSoon: "Скоро",
    moonpayMinAmount: "Мин. $30",
    noUsdBalance: "Нет баланса USD",
    depositUsdFirst: "Сначала внесите USD или используйте MoonPay",
    bonus: "Бонус",
    totalReceive: "Всего к получению",
  },
};

// ============================================
// MOONPAY HELPER FUNCTIONS
// ============================================
const generateMoonPayUrl = (walletAddress: string, amount?: number): string => {
  const params = new URLSearchParams({
    apiKey: MOONPAY_CONFIG.apiKey,
    currencyCode: "usdc", // We'll convert to USD internally
    walletAddress: walletAddress,
    colorCode: "#10B981", // Emerald color to match Auxite branding
    language: "en",
  });
  
  if (amount && amount >= MOONPAY_CONFIG.minAmount) {
    params.append("baseCurrencyAmount", amount.toString());
  }
  
  return `${MOONPAY_CONFIG.baseUrl}?${params.toString()}`;
};

export function BuyWithUsdModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
}: BuyWithUsdModalProps) {
  const { balances, refreshBalances } = useWallet();
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [usdAmount, setUsdAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"balance" | "moonpay">("balance");

  const usdBalance = balances?.usd ?? 0;
  const parsedAmount = parseFloat(usdAmount) || 0;
  const tokenAmount = parsedAmount / selectedToken.price;
  const hasInsufficientBalance = paymentMethod === "balance" && parsedAmount > usdBalance;

  // Bonus calculation for AUXM purchases
  const getBonusPercent = (amount: number): number => {
    if (selectedToken.symbol !== "AUXM") return 0;
    if (amount >= 10000) return 15;
    if (amount >= 5000) return 12;
    if (amount >= 1000) return 10;
    if (amount >= 100) return 5;
    return 0;
  };

  const bonusPercent = getBonusPercent(parsedAmount);
  const bonusAmount = selectedToken.symbol === "AUXM" ? parsedAmount * (bonusPercent / 100) : 0;
  const totalTokenAmount = tokenAmount + (bonusAmount / selectedToken.price);

  const t = texts[lang] || texts.en;

  useEffect(() => {
    if (isOpen) {
      setUsdAmount("");
      setError(null);
      setSuccess(null);
      setPaymentMethod(usdBalance > 0 ? "balance" : "moonpay");
    }
  }, [isOpen, usdBalance]);

  const handleBuy = async () => {
    if (!parsedAmount || parsedAmount < 1) {
      setError(t.minAmount);
      return;
    }

    if (parsedAmount > 100000) {
      setError(t.maxAmount);
      return;
    }

    if (paymentMethod === "balance" && hasInsufficientBalance) {
      setError(t.insufficientBalance);
      return;
    }

    // If MoonPay is selected, open MoonPay widget
    if (paymentMethod === "moonpay") {
      if (!MOONPAY_CONFIG.enabled) {
        setError("MoonPay integration coming soon!");
        return;
      }
      const moonPayUrl = generateMoonPayUrl(walletAddress, parsedAmount);
      window.open(moonPayUrl, "_blank", "width=500,height=700");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/user/buy-with-usd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          targetToken: selectedToken.id,
          usdAmount: parsedAmount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t.success);
        setUsdAmount("");
        if (refreshBalances) {
          await refreshBalances();
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(data.error || t.error);
      }
    } catch (err) {
      console.error("Buy with USD error:", err);
      setError(t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    if (paymentMethod === "balance") {
      setUsdAmount(usdBalance.toString());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t.title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-500 dark:text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-5">
          <label className="text-sm text-slate-500 dark:text-slate-400 mb-2 block">
            {t.paymentMethod}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* USD Balance Option */}
            <button
              onClick={() => setPaymentMethod("balance")}
              disabled={usdBalance <= 0}
              className={`p-3 rounded-xl border transition-all text-left ${
                paymentMethod === "balance"
                  ? "bg-green-500/10 border-green-500"
                  : usdBalance > 0
                  ? "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600"
                  : "bg-stone-100 dark:bg-slate-800/50 border-stone-200 dark:border-slate-700 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-500">💵</span>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{t.usdBalanceOption}</span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                ${usdBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </button>

            {/* MoonPay Option */}
            <button
              onClick={() => MOONPAY_CONFIG.enabled && setPaymentMethod("moonpay")}
              className={`p-3 rounded-xl border transition-all text-left relative ${
                paymentMethod === "moonpay"
                  ? "bg-purple-500/10 border-purple-500"
                  : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600"
              } ${!MOONPAY_CONFIG.enabled ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-purple-500">💳</span>
                <span className="text-sm font-medium text-slate-800 dark:text-white">{t.cardOption}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.moonpayMinAmount}
              </p>
              {!MOONPAY_CONFIG.enabled && (
                <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-semibold rounded">
                  {t.moonpayComingSoon}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* USD Balance Display (only show when balance method selected) */}
        {paymentMethod === "balance" && (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-400">{t.usdBalance}</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                ${usdBalance.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}

        {/* Token Selection */}
        <div className="mb-5">
          <label className="text-sm text-slate-500 dark:text-slate-400 mb-2 block">
            {t.selectToken}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TOKENS.map((token) => (
              <button
                key={token.id}
                onClick={() => setSelectedToken(token)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                  selectedToken.id === token.id
                    ? "bg-emerald-500/20 border-emerald-500"
                    : "bg-stone-50 dark:bg-slate-800 border-stone-200 dark:border-slate-700 hover:border-stone-300 dark:hover:border-slate-600"
                }`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: token.color + "30" }}
                >
                  <span style={{ color: token.color }}>{token.icon}</span>
                </div>
                <span className="text-xs text-slate-700 dark:text-slate-300">{token.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-500 dark:text-slate-400">{t.amount} (USD)</label>
            {paymentMethod === "balance" && (
              <button
                onClick={handleMaxClick}
                className="text-xs text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"
              >
                MAX
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
              $
            </span>
            <input
              type="number"
              value={usdAmount}
              onChange={(e) => setUsdAmount(e.target.value)}
              placeholder="0.00"
              className={`w-full bg-stone-50 dark:bg-slate-800 border rounded-xl pl-8 pr-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 ${
                hasInsufficientBalance ? "border-red-500" : "border-stone-200 dark:border-slate-700"
              }`}
            />
          </div>
          {hasInsufficientBalance && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{t.insufficientBalance}</p>
          )}
        </div>

        {/* You Will Receive */}
        {parsedAmount > 0 && (
          <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t.youWillReceive}</span>
              <span className="text-lg font-bold text-slate-800 dark:text-white">
                {tokenAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 6,
                })}{" "}
                {selectedToken.symbol}
              </span>
            </div>
            
            {/* Bonus Display for AUXM */}
            {selectedToken.symbol === "AUXM" && bonusPercent > 0 && (
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-purple-600 dark:text-purple-400">{t.bonus} (+{bonusPercent}%)</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">
                  +{(bonusAmount / selectedToken.price).toFixed(2)} AUXM
                </span>
              </div>
            )}

            {/* Total with Bonus */}
            {bonusPercent > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-slate-700">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.totalReceive}</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {totalTokenAmount.toFixed(2)} {selectedToken.symbol}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-stone-200 dark:border-slate-700">
              <span className="text-slate-400 dark:text-slate-500">{t.rate}</span>
              <span className="text-slate-500 dark:text-slate-400">
                1 {selectedToken.symbol} = ${selectedToken.price}
              </span>
            </div>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 mb-5">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl p-3 mb-5">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Buy Button */}
        <button
          onClick={handleBuy}
          disabled={isLoading || !parsedAmount || (paymentMethod === "balance" && hasInsufficientBalance)}
          className={`w-full py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
            isLoading || !parsedAmount || (paymentMethod === "balance" && hasInsufficientBalance)
              ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : paymentMethod === "moonpay"
              ? "bg-purple-500 hover:bg-purple-600 text-white"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {t.processing}
            </>
          ) : paymentMethod === "moonpay" ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {t.cardOption} {parsedAmount > 0 && `$${parsedAmount}`}
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {t.buyButton} {parsedAmount > 0 && `$${parsedAmount}`}
            </>
          )}
        </button>

        {/* MoonPay Info */}
        {paymentMethod === "moonpay" && MOONPAY_CONFIG.enabled && (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-3">
            {t.moonpayDesc}
          </p>
        )}
      </div>
    </div>
  );
}
