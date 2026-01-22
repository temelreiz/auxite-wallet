"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "@/components/WalletContext";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface DepositAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    deposit: "Yatır",
    address: "Adres",
    copy: "Kopyala",
    copied: "Kopyalandı!",
    minDeposit: "Min. Yatırım",
    confirmTime: "Onay Süresi",
    price: "Güncel Fiyat",
    testDeposit: "Test Yatırımı",
    convertToAuxm: "AUXM'e Dönüştür",
    conversionDesc: "1 AUXM = 1 USD + bonus",
    depositValue: "Yatırım",
    value: "Değer",
    total: "Toplam",
    receive: "Alacağınız",
    depositBtn: "Yatır",
    processing: "İşleniyor...",
    close: "Kapat",
    depositSuccess: "Yatırım Başarılı!",
    depositFailed: "Yatırım Başarısız",
    errorOccurred: "Bir hata oluştu. Lütfen tekrar deneyin.",
    tryAgain: "Tekrar Dene",
    received: "Alındı",
    bonus: "Bonus",
    autoClose: "saniye sonra otomatik kapanacak",
    viewWallet: "Cüzdanı Görüntüle",
    destinationTag: "Destination Tag",
  },
  en: {
    deposit: "Deposit",
    address: "Address",
    copy: "Copy",
    copied: "Copied!",
    minDeposit: "Min. Deposit",
    confirmTime: "Confirm Time",
    price: "Price",
    testDeposit: "Test Deposit",
    convertToAuxm: "Convert to AUXM",
    conversionDesc: "1 AUXM = 1 USD + bonus",
    depositValue: "Deposit",
    value: "Value",
    total: "Total",
    receive: "Receive",
    depositBtn: "Deposit",
    processing: "Processing...",
    close: "Close",
    depositSuccess: "Deposit Successful!",
    depositFailed: "Deposit Failed",
    errorOccurred: "An error occurred. Please try again.",
    tryAgain: "Try Again",
    received: "Received",
    bonus: "Bonus",
    autoClose: "seconds until auto-close",
    viewWallet: "View Wallet",
    destinationTag: "Destination Tag",
  },
  de: {
    deposit: "Einzahlung",
    address: "Adresse",
    copy: "Kopieren",
    copied: "Kopiert!",
    minDeposit: "Min. Einzahlung",
    confirmTime: "Bestätigungszeit",
    price: "Preis",
    testDeposit: "Test Einzahlung",
    convertToAuxm: "Zu AUXM umwandeln",
    conversionDesc: "1 AUXM = 1 USD + Bonus",
    depositValue: "Einzahlung",
    value: "Wert",
    total: "Gesamt",
    receive: "Erhalten",
    depositBtn: "Einzahlen",
    processing: "Verarbeitung...",
    close: "Schließen",
    depositSuccess: "Einzahlung Erfolgreich!",
    depositFailed: "Einzahlung Fehlgeschlagen",
    errorOccurred: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    tryAgain: "Erneut Versuchen",
    received: "Erhalten",
    bonus: "Bonus",
    autoClose: "Sekunden bis zum automatischen Schließen",
    viewWallet: "Wallet Anzeigen",
    destinationTag: "Destination Tag",
  },
  fr: {
    deposit: "Dépôt",
    address: "Adresse",
    copy: "Copier",
    copied: "Copié!",
    minDeposit: "Dépôt Min.",
    confirmTime: "Temps de Confirmation",
    price: "Prix",
    testDeposit: "Dépôt Test",
    convertToAuxm: "Convertir en AUXM",
    conversionDesc: "1 AUXM = 1 USD + bonus",
    depositValue: "Dépôt",
    value: "Valeur",
    total: "Total",
    receive: "Recevoir",
    depositBtn: "Déposer",
    processing: "Traitement...",
    close: "Fermer",
    depositSuccess: "Dépôt Réussi!",
    depositFailed: "Dépôt Échoué",
    errorOccurred: "Une erreur s'est produite. Veuillez réessayer.",
    tryAgain: "Réessayer",
    received: "Reçu",
    bonus: "Bonus",
    autoClose: "secondes avant fermeture automatique",
    viewWallet: "Voir le Portefeuille",
    destinationTag: "Destination Tag",
  },
  ar: {
    deposit: "إيداع",
    address: "العنوان",
    copy: "نسخ",
    copied: "تم النسخ!",
    minDeposit: "الحد الأدنى للإيداع",
    confirmTime: "وقت التأكيد",
    price: "السعر",
    testDeposit: "إيداع تجريبي",
    convertToAuxm: "تحويل إلى AUXM",
    conversionDesc: "1 AUXM = 1 USD + مكافأة",
    depositValue: "الإيداع",
    value: "القيمة",
    total: "المجموع",
    receive: "ستحصل على",
    depositBtn: "إيداع",
    processing: "جاري المعالجة...",
    close: "إغلاق",
    depositSuccess: "تم الإيداع بنجاح!",
    depositFailed: "فشل الإيداع",
    errorOccurred: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    tryAgain: "حاول مرة أخرى",
    received: "تم الاستلام",
    bonus: "مكافأة",
    autoClose: "ثانية حتى الإغلاق التلقائي",
    viewWallet: "عرض المحفظة",
    destinationTag: "علامة الوجهة",
  },
  ru: {
    deposit: "Депозит",
    address: "Адрес",
    copy: "Копировать",
    copied: "Скопировано!",
    minDeposit: "Мин. Депозит",
    confirmTime: "Время Подтверждения",
    price: "Цена",
    testDeposit: "Тестовый Депозит",
    convertToAuxm: "Конвертировать в AUXM",
    conversionDesc: "1 AUXM = 1 USD + бонус",
    depositValue: "Депозит",
    value: "Стоимость",
    total: "Итого",
    receive: "Получить",
    depositBtn: "Внести",
    processing: "Обработка...",
    close: "Закрыть",
    depositSuccess: "Депозит Успешен!",
    depositFailed: "Депозит Не Удался",
    errorOccurred: "Произошла ошибка. Пожалуйста, попробуйте снова.",
    tryAgain: "Попробовать Снова",
    received: "Получено",
    bonus: "Бонус",
    autoClose: "секунд до автоматического закрытия",
    viewWallet: "Просмотр Кошелька",
    destinationTag: "Тег Назначения",
  },
};

// Coin metadata (adresler NowPayments'tan dinamik olarak alınacak)
const COIN_METADATA: Record<string, { 
  network: string; 
  color: string;
  icon: string;
  minDeposit: string;
  confirmTime: string;
  nowpaymentsCurrency: string;
}> = {
  BTC: { 
    network: "Bitcoin",
    color: "#F7931A",
    icon: "₿",
    minDeposit: "0.0001 BTC",
    confirmTime: "~30 min (3 conf)",
    nowpaymentsCurrency: "btc",
  },
  ETH: { 
    network: "Ethereum",
    color: "#627EEA",
    icon: "Ξ",
    minDeposit: "0.001 ETH",
    confirmTime: "~5 min (12 conf)",
    nowpaymentsCurrency: "eth",
  },
  XRP: { 
    network: "XRP Ledger",
    color: "#23292F",
    icon: "✕",
    minDeposit: "10 XRP",
    confirmTime: "~10 sec",
    nowpaymentsCurrency: "xrp",
  },
  SOL: { 
    network: "Solana",
    color: "#9945FF",
    icon: "◎",
    minDeposit: "0.1 SOL",
    confirmTime: "~30 sec",
    nowpaymentsCurrency: "sol",
  },
  USDT: {
    network: "Tron (TRC20)",
    color: "#26A17B",
    icon: "₮",
    minDeposit: "10 USDT",
    confirmTime: "~1 min",
    nowpaymentsCurrency: "usdttrc20",
  },
};

export function DepositAddressModal({ isOpen, onClose, coin, lang = "en" }: DepositAddressModalProps) {
  const { address, refreshBalances, isConnected } = useWallet();
  const { prices: cryptoPrices } = useCryptoPrices();
  
  const [copied, setCopied] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  
  // NowPayments dynamic address state
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [extraId, setExtraId] = useState<string | null>(null); // For XRP memo etc
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const t = translations[lang] || translations.en;
  const coinMeta = COIN_METADATA[coin];

  // Fetch deposit address from NowPayments when modal opens
  useEffect(() => {
    if (isOpen && coin && address && coinMeta && !depositAddress) {
      fetchDepositAddress();
    }
  }, [isOpen, coin, address]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDepositAddress(null);
      setExtraId(null);
      setPaymentId(null);
      setAddressError(null);
    }
  }, [isOpen]);

  const fetchDepositAddress = async () => {
    if (!address || !coinMeta) return;
    
    setIsLoadingAddress(true);
    setAddressError(null);
    
    try {
      const response = await fetch("/api/nowpayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coin: coin,
          address: address,
          amount: 100, // Default amount for address generation
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.payment?.address) {
        setDepositAddress(data.payment.address);
        setPaymentId(data.payment.id);
        if (data.payment.extraId) {
          setExtraId(data.payment.extraId);
        }
      } else {
        setAddressError(data.error || "Failed to generate address");
      }
    } catch (error) {
      console.error("Error fetching deposit address:", error);
      setAddressError("Network error. Please try again.");
    } finally {
      setIsLoadingAddress(false);
    }
  };

  if (!isOpen) return null;
  if (!coinMeta) return null;

  const copyToClipboard = async (text: string, type: "address" | "memo") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedMemo(true);
        setTimeout(() => setCopiedMemo(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getQRValue = () => {
    if (!depositAddress) return "";
    switch (coin) {
      case "BTC": return `bitcoin:${depositAddress}`;
      case "ETH": return `ethereum:${depositAddress}`;
      case "XRP": return extraId ? `https://xrpl.to/${depositAddress}?dt=${extraId}` : depositAddress;
      case "SOL": return `solana:${depositAddress}`;
      default: return depositAddress;
    }
  };

  const getCryptoPrice = () => {
    const priceMap: Record<string, number> = {
      BTC: cryptoPrices?.btc ?? 95000,
      ETH: cryptoPrices?.eth ?? 3500,
      XRP: cryptoPrices?.xrp ?? 2.2,
      SOL: cryptoPrices?.sol ?? 200,
      USDT: 1,
    };
    return priceMap[coin] || 1;
  };

  // Normal Deposit Form
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-2 sm:gap-3">
            <div 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-base sm:text-lg"
              style={{ backgroundColor: coinMeta.color }}
            >
              {coinMeta.icon}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                {coin} {t.deposit}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{coinMeta.network}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 text-lg sm:text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4">
          {/* Loading State */}
          {isLoadingAddress && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {lang === "tr" ? "Adres oluşturuluyor..." : "Generating address..."}
              </p>
            </div>
          )}

          {/* Error State */}
          {addressError && !isLoadingAddress && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm mb-4">{addressError}</p>
              <button
                onClick={fetchDepositAddress}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                {lang === "tr" ? "Tekrar Dene" : "Try Again"}
              </button>
            </div>
          )}

          {/* Address Loaded */}
          {depositAddress && !isLoadingAddress && !addressError && (
            <>
              {/* QR Code */}
              <div className="bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl mb-3 sm:mb-4 flex items-center justify-center border border-stone-200 dark:border-transparent">
                <QRCodeSVG
                  value={getQRValue()}
                  size={120}
                  level="H"
                  includeMargin={true}
                  className="sm:hidden"
                />
                <QRCodeSVG
                  value={getQRValue()}
                  size={140}
                  level="H"
                  includeMargin={true}
                  className="hidden sm:block"
                />
              </div>

              {/* Address */}
              <div className="bg-stone-100 dark:bg-slate-800 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3">
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-medium">
                    {t.address}
                  </span>
                  <button
                    onClick={() => copyToClipboard(depositAddress, "address")}
                    className={`text-[10px] sm:text-xs font-medium ${copied ? "text-emerald-500" : "text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"}`}
                  >
                    {copied ? `✓ ${t.copied}` : t.copy}
                  </button>
                </div>
                <p className="text-slate-800 dark:text-white font-mono text-[10px] sm:text-xs break-all select-all leading-relaxed">
                  {depositAddress}
                </p>
              </div>

              {/* Extra ID / Memo (XRP etc) */}
              {extraId && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3">
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <span className="text-amber-600 dark:text-amber-500 text-[10px] sm:text-xs font-medium">⚠️ {t.destinationTag}</span>
                    <button
                      onClick={() => copyToClipboard(extraId, "memo")}
                      className={`text-[10px] sm:text-xs font-medium ${copiedMemo ? "text-amber-500" : "text-amber-600 dark:text-amber-500"}`}
                    >
                      {copiedMemo ? "✓" : t.copy}
                    </button>
                  </div>
                  <p className="text-slate-800 dark:text-white font-mono text-base sm:text-lg font-bold">{extraId}</p>
                </div>
              )}

              {/* Bonus Info */}
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-2.5 sm:mb-3">
                <p className="text-emerald-700 dark:text-emerald-400 text-xs font-medium mb-2">
                  🎁 {lang === "tr" ? "AUXM Bonus Oranları" : "AUXM Bonus Rates"}
                </p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <span className="text-slate-600 dark:text-slate-400">$10-99:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+15%</span>
                  <span className="text-slate-600 dark:text-slate-400">$100-499:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+10%</span>
                  <span className="text-slate-600 dark:text-slate-400">$500-999:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+7%</span>
                  <span className="text-slate-600 dark:text-slate-400">$1,000-4,999:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+5%</span>
                  <span className="text-slate-600 dark:text-slate-400">$5,000+:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">+3%</span>
                </div>
              </div>

              {/* Deposit Info */}
              <div className="bg-stone-50 dark:bg-slate-800/50 rounded-lg sm:rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 text-[10px] sm:text-xs">
                <div className="flex justify-between mb-0.5 sm:mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{t.minDeposit}</span>
                  <span className="text-slate-700 dark:text-slate-300">{coinMeta.minDeposit}</span>
                </div>
                <div className="flex justify-between mb-0.5 sm:mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{t.confirmTime}</span>
                  <span className="text-slate-700 dark:text-slate-300">{coinMeta.confirmTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t.price}</span>
                  <span className="text-slate-700 dark:text-slate-300">${getCryptoPrice().toLocaleString()}</span>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-2.5 mb-3">
                <p className="text-blue-700 dark:text-blue-400 text-[10px] sm:text-xs">
                  ℹ️ {lang === "tr" 
                    ? "Bu adrese sadece " + coin + " gönderin. Bakiyeniz otomatik güncellenecektir."
                    : "Only send " + coin + " to this address. Your balance will update automatically."}
                </p>
              </div>
            </>
          )}

          {/* Done Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold text-sm sm:text-base transition-colors border border-stone-300 dark:border-slate-700"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DepositAddressModal;
