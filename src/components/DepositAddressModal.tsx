"use client";

import { useState } from "react";
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

const DEPOSIT_ADDRESSES: Record<string, { 
  address: string; 
  network: string; 
  memo?: string;
  color: string;
  icon: string;
  minDeposit: string;
  confirmTime: string;
}> = {
  BTC: { 
    address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", 
    network: "Bitcoin",
    color: "#F7931A",
    icon: "₿",
    minDeposit: "0.0001 BTC",
    confirmTime: "~30 min (3 conf)",
  },
  ETH: { 
    address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", 
    network: "Ethereum / Base",
    color: "#627EEA",
    icon: "Ξ",
    minDeposit: "0.001 ETH",
    confirmTime: "~5 min (12 conf)",
  },
  XRP: { 
    address: "r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae", 
    network: "XRP Ledger",
    memo: "123456",
    color: "#23292F",
    icon: "✕",
    minDeposit: "10 XRP",
    confirmTime: "~10 sec",
  },
  SOL: { 
    address: "6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe", 
    network: "Solana",
    color: "#9945FF",
    icon: "◎",
    minDeposit: "0.01 SOL",
    confirmTime: "~30 sec",
  },
  USDT: {
    address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
    network: "Ethereum / Tron",
    color: "#26A17B",
    icon: "₮",
    minDeposit: "10 USDT",
    confirmTime: "~5 min",
  },
};

export function DepositAddressModal({ isOpen, onClose, coin, lang = "en" }: DepositAddressModalProps) {
  const { address, refreshBalances, isConnected } = useWallet();
  const { prices: cryptoPrices } = useCryptoPrices();
  
  const [copied, setCopied] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const [testAmount, setTestAmount] = useState("");
  const [convertToAuxm, setConvertToAuxm] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositResult, setDepositResult] = useState<{
    success: boolean;
    converted?: boolean;
    auxmReceived?: number;
    bonusReceived?: number;
    coinReceived?: number;
    coin?: string;
  } | null>(null);

  const t = translations[lang] || translations.en;

  if (!isOpen) return null;

  const coinData = DEPOSIT_ADDRESSES[coin];
  if (!coinData) return null;

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
    switch (coin) {
      case "BTC": return `bitcoin:${coinData.address}`;
      case "ETH": return `ethereum:${coinData.address}`;
      case "XRP": return coinData.memo ? `https://xrpl.to/${coinData.address}?dt=${coinData.memo}` : coinData.address;
      case "SOL": return `solana:${coinData.address}`;
      default: return coinData.address;
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

  const testAmountNum = parseFloat(testAmount) || 0;
  const testAmountUsd = testAmountNum * getCryptoPrice();
  
  const getBonusPercent = (usd: number) => {
    if (usd >= 10000) return 15;
    if (usd >= 5000) return 12;
    if (usd >= 1000) return 10;
    if (usd >= 100) return 5;
    return 0;
  };
  
  const bonusPercent = getBonusPercent(testAmountUsd);
  const bonusAmount = testAmountUsd * (bonusPercent / 100);

  const handleTestDeposit = async () => {
    if (!isConnected || !address || !testAmount) return;

    const amount = parseFloat(testAmount);
    if (amount <= 0) return;

    setIsDepositing(true);
    setDepositResult(null);

    try {
      const response = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin,
          amount,
          convertToAuxm,
          txHash: `test_${Date.now()}`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Deposit failed");
      }

      setDepositResult({
        success: true,
        converted: data.deposit.converted,
        auxmReceived: data.deposit.auxmReceived,
        bonusReceived: data.deposit.bonusReceived,
        coinReceived: data.deposit.coinReceived,
        coin: data.deposit.coin,
      });

      await refreshBalances();

      setTimeout(() => {
        onClose();
      }, 3000);

      setTestAmount("");

    } catch (err) {
      console.error("Test deposit error:", err);
      setDepositResult({ success: false });
    } finally {
      setIsDepositing(false);
    }
  };

  // Success Screen
  if (depositResult?.success) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-sm">
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {t.depositSuccess}
            </h2>
            
            <div className="bg-stone-100 dark:bg-slate-800 rounded-xl p-4 mb-4">
              {depositResult.converted ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-slate-600 dark:text-slate-400">AUXM {t.received}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      +{depositResult.auxmReceived?.toFixed(2)}
                    </span>
                  </div>
                  {depositResult.bonusReceived && depositResult.bonusReceived > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{t.bonus}</span>
                      <span className="text-purple-600 dark:text-purple-400 font-bold">
                        +{depositResult.bonusReceived?.toFixed(2)}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{depositResult.coin} {t.received}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    +{depositResult.coinReceived}
                  </span>
                </div>
              )}
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
              3 {t.autoClose}
            </p>
            
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
            >
              {t.viewWallet}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error Screen
  if (depositResult && !depositResult.success) {
    return (
      <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-sm">
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
              {t.depositFailed}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              {t.errorOccurred}
            </p>
            
            <button
              onClick={() => setDepositResult(null)}
              className="w-full py-3 rounded-xl bg-stone-200 dark:bg-slate-700 hover:bg-stone-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold transition-colors"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal Deposit Form
  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-300 dark:border-slate-700 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: coinData.color }}
            >
              {coinData.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {coin} {t.deposit}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{coinData.network}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center border border-stone-200 dark:border-transparent">
            <QRCodeSVG
              value={getQRValue()}
              size={140}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Address */}
          <div className="bg-stone-100 dark:bg-slate-800 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                {t.address}
              </span>
              <button
                onClick={() => copyToClipboard(coinData.address, "address")}
                className={`text-xs font-medium ${copied ? "text-emerald-500" : "text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400"}`}
              >
                {copied ? `✓ ${t.copied}` : t.copy}
              </button>
            </div>
            <p className="text-slate-800 dark:text-white font-mono text-xs break-all select-all leading-relaxed">
              {coinData.address}
            </p>
          </div>

          {/* Memo (XRP) */}
          {coinData.memo && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-amber-600 dark:text-amber-500 text-xs font-medium">⚠️ {t.destinationTag}</span>
                <button
                  onClick={() => copyToClipboard(coinData.memo!, "memo")}
                  className={`text-xs font-medium ${copiedMemo ? "text-amber-500" : "text-amber-600 dark:text-amber-500"}`}
                >
                  {copiedMemo ? "✓" : t.copy}
                </button>
              </div>
              <p className="text-slate-800 dark:text-white font-mono text-lg font-bold">{coinData.memo}</p>
            </div>
          )}

          {/* Deposit Info */}
          <div className="bg-stone-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4 text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500 dark:text-slate-400">{t.minDeposit}</span>
              <span className="text-slate-700 dark:text-slate-300">{coinData.minDeposit}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500 dark:text-slate-400">{t.confirmTime}</span>
              <span className="text-slate-700 dark:text-slate-300">{coinData.confirmTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">{t.price}</span>
              <span className="text-slate-700 dark:text-slate-300">${getCryptoPrice().toLocaleString()}</span>
            </div>
          </div>

          {/* Test Deposit */}
          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl p-3 mb-4">
            <p className="text-purple-600 dark:text-purple-400 text-xs font-medium mb-3">
              🧪 {t.testDeposit}
            </p>
            
            {/* Amount Input */}
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                placeholder={`0.00 ${coin}`}
                className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white text-sm font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Conversion Option */}
            <div className="mb-3">
              <label className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700 cursor-pointer hover:border-purple-400 dark:hover:border-slate-600 transition-colors">
                <input
                  type="checkbox"
                  checked={convertToAuxm}
                  onChange={(e) => setConvertToAuxm(e.target.checked)}
                  className="w-4 h-4 rounded bg-stone-200 dark:bg-slate-700 border-stone-400 dark:border-slate-600 text-purple-500 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <p className="text-sm text-slate-800 dark:text-white font-medium">
                    {t.convertToAuxm}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.conversionDesc}
                  </p>
                </div>
                {convertToAuxm && bonusPercent > 0 && (
                  <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold">
                    +{bonusPercent}% 🎁
                  </span>
                )}
              </label>
            </div>

            {/* Preview */}
            {testAmountNum > 0 && (
              <div className="p-3 rounded-lg bg-white dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 mb-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{t.depositValue}</span>
                  <span className="text-slate-800 dark:text-white">{testAmountNum} {coin}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{t.value}</span>
                  <span className="text-slate-800 dark:text-white">${testAmountUsd.toFixed(2)}</span>
                </div>
                <div className="border-t border-stone-200 dark:border-slate-700 my-2"></div>
                {convertToAuxm ? (
                  <>
                    <div className="flex justify-between mb-1">
                      <span className="text-slate-500 dark:text-slate-400">AUXM</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{testAmountUsd.toFixed(2)}</span>
                    </div>
                    {bonusPercent > 0 && (
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-500 dark:text-slate-400">{t.bonus} (+{bonusPercent}%)</span>
                        <span className="text-purple-600 dark:text-purple-400">+{bonusAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold">
                      <span className="text-slate-800 dark:text-white">{t.total}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{(testAmountUsd + bonusAmount).toFixed(2)} AUXM</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-800 dark:text-white">{t.receive}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{testAmountNum} {coin}</span>
                  </div>
                )}
              </div>
            )}

            {/* Deposit Button */}
            <button
              onClick={handleTestDeposit}
              disabled={!isConnected || !testAmount || isDepositing || testAmountNum <= 0}
              className="w-full py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDepositing ? `⏳ ${t.processing}` : t.depositBtn}
            </button>
          </div>

          {/* Done Button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-semibold transition-colors border border-stone-300 dark:border-slate-700"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DepositAddressModal;
