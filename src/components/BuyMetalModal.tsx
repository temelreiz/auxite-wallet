"use client";
import { useState, useEffect } from "react";

interface BuyMetalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

// 6-Language Translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    buyMetal: "Metal Satın Al",
    selectMetal: "Metal Seçin",
    youPay: "Ödeme",
    youReceive: "Alacağınız",
    balance: "Bakiye",
    total: "Toplam",
    transactionFee: "İşlem Ücreti",
    getQuote: "Fiyat Al",
    confirm: "Onayla",
    processing: "İşleniyor...",
    success: "Başarılı!",
    insufficientBalance: "Yetersiz bakiye",
    minAmount: "Minimum miktar",
    maxAmount: "Maksimum miktar",
    enterAmount: "Miktar girin",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
  },
  en: {
    buyMetal: "Buy Metal",
    selectMetal: "Select Metal",
    youPay: "You Pay",
    youReceive: "You Receive",
    balance: "Balance",
    total: "Total",
    transactionFee: "Transaction fee",
    getQuote: "Get Quote",
    confirm: "Confirm",
    processing: "Processing...",
    success: "Success!",
    insufficientBalance: "Insufficient balance",
    minAmount: "Minimum amount",
    maxAmount: "Maximum amount",
    enterAmount: "Enter amount",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
  },
  de: {
    buyMetal: "Metall kaufen",
    selectMetal: "Metall auswählen",
    youPay: "Sie zahlen",
    youReceive: "Sie erhalten",
    balance: "Guthaben",
    total: "Gesamt",
    transactionFee: "Transaktionsgebühr",
    getQuote: "Angebot anfordern",
    confirm: "Bestätigen",
    processing: "Verarbeitung...",
    success: "Erfolgreich!",
    insufficientBalance: "Unzureichendes Guthaben",
    minAmount: "Mindestbetrag",
    maxAmount: "Höchstbetrag",
    enterAmount: "Betrag eingeben",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
  },
  fr: {
    buyMetal: "Acheter du Métal",
    selectMetal: "Sélectionner le métal",
    youPay: "Vous payez",
    youReceive: "Vous recevez",
    balance: "Solde",
    total: "Total",
    transactionFee: "Frais de transaction",
    getQuote: "Obtenir un devis",
    confirm: "Confirmer",
    processing: "Traitement...",
    success: "Succès !",
    insufficientBalance: "Solde insuffisant",
    minAmount: "Montant minimum",
    maxAmount: "Montant maximum",
    enterAmount: "Entrez le montant",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
  },
  ar: {
    buyMetal: "شراء المعدن",
    selectMetal: "اختر المعدن",
    youPay: "تدفع",
    youReceive: "تستلم",
    balance: "الرصيد",
    total: "المجموع",
    transactionFee: "رسوم المعاملة",
    getQuote: "احصل على عرض",
    confirm: "تأكيد",
    processing: "جاري المعالجة...",
    success: "نجاح!",
    insufficientBalance: "رصيد غير كافٍ",
    minAmount: "الحد الأدنى للمبلغ",
    maxAmount: "الحد الأقصى للمبلغ",
    enterAmount: "أدخل المبلغ",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
  },
  ru: {
    buyMetal: "Купить металл",
    selectMetal: "Выберите металл",
    youPay: "Вы платите",
    youReceive: "Вы получите",
    balance: "Баланс",
    total: "Итого",
    transactionFee: "Комиссия",
    getQuote: "Получить котировку",
    confirm: "Подтвердить",
    processing: "Обработка...",
    success: "Успешно!",
    insufficientBalance: "Недостаточно средств",
    minAmount: "Минимальная сумма",
    maxAmount: "Максимальная сумма",
    enterAmount: "Введите сумму",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
  },
};

const METALS = [
  { symbol: "AUXG", name: "gold", icon: "/gold-favicon-32x32.png", price: 140 },
  { symbol: "AUXS", name: "silver", icon: "/silver-favicon-32x32.png", price: 2 },
  { symbol: "AUXPT", name: "platinum", icon: "/platinum-favicon-32x32.png", price: 58 },
  { symbol: "AUXPD", name: "palladium", icon: "/palladium-favicon-32x32.png", price: 50 },
];

const PAYMENT_METHODS = [
  { symbol: "AUXM", icon: "💵", name: "AUXM" },
  { symbol: "ETH", icon: "Ξ", name: "ETH" },
  { symbol: "BTC", icon: "₿", name: "BTC" },
];

export function BuyMetalModal({ isOpen, onClose, lang = "en" }: BuyMetalModalProps) {
  const t = translations[lang] || translations.en;
  
  const [selectedMetal, setSelectedMetal] = useState(METALS[0]);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mock balances
  const balances: Record<string, number> = {
    AUXM: 375.01,
    ETH: 0.658,
    BTC: 0.000001,
  };

  const balance = balances[selectedPayment.symbol] || 0;
  const amountNum = parseFloat(amount) || 0;
  const receiveAmount = selectedPayment.symbol === "AUXM" 
    ? amountNum / selectedMetal.price 
    : amountNum * (selectedPayment.symbol === "ETH" ? 3100 : 95000) / selectedMetal.price;

  if (!isOpen) return null;

  const handleGetQuote = () => {
    if (amountNum <= 0 || amountNum > balance) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      // Quote logic here
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 dark:bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-200 dark:border-slate-700 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{t.buyMetal}</h3>
          <button 
            onClick={onClose} 
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-stone-100 dark:bg-slate-800 hover:bg-stone-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5">
          {/* Select Metal */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 block">
              {t.selectMetal}
            </label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {METALS.map((metal) => (
                <button
                  key={metal.symbol}
                  onClick={() => setSelectedMetal(metal)}
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center gap-0.5 sm:gap-1 ${
                    selectedMetal.symbol === metal.symbol
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/20"
                      : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-stone-300 dark:hover:border-slate-600"
                  }`}
                >
                  <img src={metal.icon} alt={metal.symbol} className="w-6 h-6 sm:w-8 sm:h-8" />
                  <span className={`text-[10px] sm:text-xs font-semibold ${
                    selectedMetal.symbol === metal.symbol 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {metal.symbol}
                  </span>
                  <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-500">
                    ${metal.price}/g
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* You Pay */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 block">
              {t.youPay}
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.symbol}
                  onClick={() => setSelectedPayment(method)}
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center gap-0.5 sm:gap-1 ${
                    selectedPayment.symbol === method.symbol
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-500/20"
                      : "border-stone-200 dark:border-slate-700 bg-stone-50 dark:bg-slate-800/50 hover:border-stone-300 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="text-lg sm:text-xl">{method.icon}</span>
                  <span className={`text-[10px] sm:text-xs font-semibold ${
                    selectedPayment.symbol === method.symbol 
                      ? "text-purple-600 dark:text-purple-400" 
                      : "text-slate-700 dark:text-slate-300"
                  }`}>
                    {method.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Balance & Total */}
            <div className="flex justify-between text-xs sm:text-sm mb-1.5 sm:mb-2">
              <span className="text-slate-500 dark:text-slate-500">{t.balance}:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{balance.toFixed(2)} {selectedPayment.symbol}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm mb-2 sm:mb-3">
              <span className="text-slate-500 dark:text-slate-500">{t.total}:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{balance.toFixed(2)} {selectedPayment.symbol}</span>
            </div>

            {/* Amount Input */}
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-16 sm:pr-20 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-base sm:text-lg font-medium"
              />
              <button
                onClick={() => setAmount(balance.toString())}
                className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-stone-300 dark:hover:bg-slate-600 text-xs sm:text-sm font-medium transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* You Receive */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2 block">
              {t.youReceive}
            </label>
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
              <div className="flex items-center gap-2 sm:gap-3">
                <img src={selectedMetal.icon} alt={selectedMetal.symbol} className="w-8 h-8 sm:w-10 sm:h-10" />
                <div>
                  <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                    {receiveAmount.toFixed(4)}g
                  </span>
                  <span className="text-base sm:text-lg text-slate-600 dark:text-slate-400 ml-1.5 sm:ml-2">
                    {selectedMetal.symbol}
                  </span>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500">
                    @ ${selectedMetal.price.toFixed(2)}/gram
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Fee */}
          <div className="flex justify-between text-xs sm:text-sm p-2.5 sm:p-3 rounded-lg bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-500">{t.transactionFee}:</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">0.1%</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-stone-200 dark:border-slate-800">
          <button
            onClick={handleGetQuote}
            disabled={amountNum <= 0 || amountNum > balance || isProcessing}
            className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white disabled:text-slate-500 font-semibold text-sm sm:text-base transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t.processing}
              </>
            ) : (
              <>
                <span>🔒</span>
                {t.getQuote}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuyMetalModal;
