// src/components/UsdConvertModal.tsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "./WalletContext";

interface UsdConvertModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  walletAddress: string;
  initialDirection?: "usd-to-usdt" | "usdt-to-usd";
}

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const texts: Record<string, Record<string, string>> = {
  tr: {
    title: "USD ↔ USDT Dönüştür",
    from: "Gönder",
    to: "Al",
    available: "Kullanılabilir",
    rate: "Piyasa Kuru",
    fee: "İşlem Ücreti",
    convert: "Dönüştür",
    processing: "İşleniyor...",
    success: "Dönüşüm başarılı!",
    insufficientBalance: "Yetersiz bakiye",
    minAmount: "Minimum: $1",
    swap: "Yönü Değiştir",
  },
  en: {
    title: "Convert USD ↔ USDT",
    from: "From",
    to: "To",
    available: "Available",
    rate: "Market Rate",
    fee: "Fee",
    convert: "Convert",
    processing: "Processing...",
    success: "Conversion successful!",
    insufficientBalance: "Insufficient balance",
    minAmount: "Minimum: $1",
    swap: "Swap Direction",
  },
  de: {
    title: "USD ↔ USDT Umwandeln",
    from: "Von",
    to: "Nach",
    available: "Verfügbar",
    rate: "Marktkurs",
    fee: "Gebühr",
    convert: "Umwandeln",
    processing: "Wird verarbeitet...",
    success: "Umwandlung erfolgreich!",
    insufficientBalance: "Unzureichendes Guthaben",
    minAmount: "Minimum: $1",
    swap: "Richtung wechseln",
  },
  fr: {
    title: "Convertir USD ↔ USDT",
    from: "De",
    to: "Vers",
    available: "Disponible",
    rate: "Taux du marché",
    fee: "Frais",
    convert: "Convertir",
    processing: "Traitement...",
    success: "Conversion réussie!",
    insufficientBalance: "Solde insuffisant",
    minAmount: "Minimum: 1$",
    swap: "Inverser la direction",
  },
  ar: {
    title: "تحويل USD ↔ USDT",
    from: "من",
    to: "إلى",
    available: "متاح",
    rate: "سعر السوق",
    fee: "الرسوم",
    convert: "تحويل",
    processing: "جاري المعالجة...",
    success: "تم التحويل بنجاح!",
    insufficientBalance: "رصيد غير كافٍ",
    minAmount: "الحد الأدنى: 1$",
    swap: "عكس الاتجاه",
  },
  ru: {
    title: "Конвертировать USD ↔ USDT",
    from: "От",
    to: "К",
    available: "Доступно",
    rate: "Рыночный курс",
    fee: "Комиссия",
    convert: "Конвертировать",
    processing: "Обработка...",
    success: "Конвертация успешна!",
    insufficientBalance: "Недостаточно средств",
    minAmount: "Минимум: $1",
    swap: "Сменить направление",
  },
};

export function UsdConvertModal({
  isOpen,
  onClose,
  lang,
  walletAddress,
  initialDirection = "usd-to-usdt",
}: UsdConvertModalProps) {
  const { balances, refreshBalances } = useWallet();
  const [direction, setDirection] = useState<"usd-to-usdt" | "usdt-to-usd">(initialDirection);
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Piyasa fiyatları (gerçek API'den çekilecek)
  // USDT genelde $0.9995 - $1.0005 arasında
  const [usdtPrice, setUsdtPrice] = useState(0.9998);

  const usdBalance = balances?.usd ?? 0;
  const usdtBalance = balances?.usdt ?? 0;
  const parsedAmount = parseFloat(amount) || 0;

  // Dönüşüm hesaplama
  const isUsdToUsdt = direction === "usd-to-usdt";
  const fromBalance = isUsdToUsdt ? usdBalance : usdtBalance;
  const fromSymbol = isUsdToUsdt ? "USD" : "USDT";
  const toSymbol = isUsdToUsdt ? "USDT" : "USD";

  // USD → USDT: amount / usdtPrice (daha fazla USDT alırsın)
  // USDT → USD: amount * usdtPrice (biraz az USD alırsın)
  const outputAmount = isUsdToUsdt 
    ? parsedAmount / usdtPrice 
    : parsedAmount * usdtPrice;

  const fee = parsedAmount * 0.001; // %0.1 işlem ücreti
  const finalOutput = outputAmount - (outputAmount * 0.001);

  const t = texts[lang] || texts.en;

  // USDT fiyatını çek (gerçek API)
  useEffect(() => {
    const fetchUsdtPrice = async () => {
      try {
        // CoinGecko veya başka API'den USDT fiyatı
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd"
        );
        const data = await response.json();
        if (data.tether?.usd) {
          setUsdtPrice(data.tether.usd);
        }
      } catch (err) {
        console.error("USDT price fetch error:", err);
        // Fallback fiyat
        setUsdtPrice(0.9998);
      }
    };

    if (isOpen) {
      fetchUsdtPrice();
      // Her 30 saniyede güncelle
      const interval = setInterval(fetchUsdtPrice, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setError(null);
      setSuccess(null);
      setDirection(initialDirection);
    }
  }, [isOpen, initialDirection]);

  const handleSwapDirection = () => {
    setDirection(direction === "usd-to-usdt" ? "usdt-to-usd" : "usd-to-usdt");
    setAmount("");
    setError(null);
  };

  const handleConvert = async () => {
    if (parsedAmount < 1) {
      setError(t.minAmount);
      return;
    }

    if (parsedAmount > fromBalance) {
      setError(t.insufficientBalance);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/user/convert-usd-usdt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          direction,
          amount: parsedAmount,
          usdtPrice,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(t.success);
        setAmount("");
        if (refreshBalances) {
          await refreshBalances();
        }
        setTimeout(() => onClose(), 2000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError("Conversion failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 w-full max-w-[calc(100vw-24px)] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-white">{t.title}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors touch-manipulation"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* From Input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm text-slate-400">{t.from}</label>
            <span className="text-[10px] sm:text-xs text-slate-500">
              {t.available}: {fromBalance.toFixed(2)} {fromSymbol}
            </span>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
                className="bg-transparent text-lg sm:text-xl text-white outline-none w-full min-w-0"
              />
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-700 px-2 sm:px-3 py-1.5 rounded-lg flex-shrink-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${isUsdToUsdt ? 'bg-green-600' : 'bg-[#26A17B]'}`}>
                  <span className="text-white text-[10px] sm:text-xs font-bold">{isUsdToUsdt ? '$' : '₮'}</span>
                </div>
                <span className="text-white text-sm sm:text-base font-medium">{fromSymbol}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setAmount(fromBalance.toString())}
            className="text-xs text-emerald-500 hover:text-emerald-400 mt-2 touch-manipulation"
          >
            MAX
          </button>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center my-2">
          <button
            onClick={handleSwapDirection}
            className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all touch-manipulation"
            title={t.swap}
          >
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>
        </div>

        {/* To Output */}
        <div className="mb-4 sm:mb-5">
          <label className="text-xs sm:text-sm text-slate-400 mb-2 block">{t.to}</label>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg sm:text-xl text-white truncate">
                {finalOutput > 0 ? finalOutput.toFixed(4) : '0.00'}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-700 px-2 sm:px-3 py-1.5 rounded-lg flex-shrink-0">
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${isUsdToUsdt ? 'bg-[#26A17B]' : 'bg-green-600'}`}>
                  <span className="text-white text-[10px] sm:text-xs font-bold">{isUsdToUsdt ? '₮' : '$'}</span>
                </div>
                <span className="text-white text-sm sm:text-base font-medium">{toSymbol}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rate Info */}
        <div className="bg-slate-800/50 rounded-xl p-3 mb-4 sm:mb-5 space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-slate-400">{t.rate}</span>
            <span className="text-slate-300">1 USDT = ${usdtPrice.toFixed(4)} USD</span>
          </div>
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-slate-400">{t.fee}</span>
            <span className="text-yellow-400">0.1%</span>
          </div>
        </div>

        {/* Error/Success */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-xs sm:text-sm text-red-400">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 mb-4">
            <p className="text-xs sm:text-sm text-green-400">{success}</p>
          </div>
        )}

        {/* Convert Button */}
        <button
          onClick={handleConvert}
          disabled={isLoading || !parsedAmount || parsedAmount > fromBalance}
          className={`w-full py-3 sm:py-3.5 rounded-xl font-semibold text-sm sm:text-base transition-colors touch-manipulation ${
            isLoading || !parsedAmount || parsedAmount > fromBalance
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white"
          }`}
        >
          {isLoading ? t.processing : t.convert}
        </button>
      </div>
    </div>
  );
}
