"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    withdraw: "Para Çek",
    withdrawAuxm: "AUXM'i kripto olarak çekin",
    confirmTx: "İşlemi onaylayın",
    withdrawableBalance: "Çekilebilir Bakiye",
    bonusLocked: "Bonus (çekilemez)",
    auxmAmount: "Çekilecek AUXM Miktarı",
    selectCrypto: "Kripto Seçin",
    walletAddress: "Cüzdan Adresi",
    network: "Ağ",
    youWillReceive: "Alacağınız",
    networkFee: "Ağ Ücreti",
    netReceive: "Net Alacak",
    insufficientBalance: "Yetersiz AUXM bakiyesi",
    minimum: "Minimum çekim",
    auxmToWithdraw: "Çekilecek AUXM",
    convertTo: "Dönüşüm",
    address: "Adres",
    verifyAddress: "Adresi kontrol edin. İşlem geri alınamaz.",
    twoFaCode: "2FA Doğrulama Kodu",
    twoFaRequired: "2FA kodu gerekli",
    continue: "Devam Et",
    processing: "İşleniyor...",
    confirmWithdrawal: "Çekimi Onayla",
    withdrawalStarted: "Çekim Başlatıldı!",
    error: "Hata!",
    txComplete: "İşlem 10-30 dakika içinde tamamlanacak",
    close: "Kapat",
  },
  en: {
    withdraw: "Withdraw",
    withdrawAuxm: "Withdraw AUXM as crypto",
    confirmTx: "Confirm transaction",
    withdrawableBalance: "Withdrawable Balance",
    bonusLocked: "Bonus (locked)",
    auxmAmount: "AUXM Amount to Withdraw",
    selectCrypto: "Select Crypto",
    walletAddress: "Wallet Address",
    network: "Network",
    youWillReceive: "You will receive",
    networkFee: "Network Fee",
    netReceive: "Net Receive",
    insufficientBalance: "Insufficient AUXM balance",
    minimum: "Minimum",
    auxmToWithdraw: "AUXM to Withdraw",
    convertTo: "Convert to",
    address: "Address",
    verifyAddress: "Verify address. This cannot be reversed.",
    twoFaCode: "2FA Verification Code",
    twoFaRequired: "2FA code required",
    continue: "Continue",
    processing: "Processing...",
    confirmWithdrawal: "Confirm Withdrawal",
    withdrawalStarted: "Withdrawal Started!",
    error: "Error!",
    txComplete: "Transaction will complete in 10-30 minutes",
    close: "Close",
  },
  de: {
    withdraw: "Abheben",
    withdrawAuxm: "AUXM als Krypto abheben",
    confirmTx: "Transaktion bestätigen",
    withdrawableBalance: "Abhebares Guthaben",
    bonusLocked: "Bonus (gesperrt)",
    auxmAmount: "Abzuhebender AUXM Betrag",
    selectCrypto: "Krypto auswählen",
    walletAddress: "Wallet-Adresse",
    network: "Netzwerk",
    youWillReceive: "Sie erhalten",
    networkFee: "Netzwerkgebühr",
    netReceive: "Netto-Empfang",
    insufficientBalance: "Unzureichendes AUXM Guthaben",
    minimum: "Minimum",
    auxmToWithdraw: "AUXM zum Abheben",
    convertTo: "Umwandeln in",
    address: "Adresse",
    verifyAddress: "Adresse prüfen. Nicht rückgängig machbar.",
    twoFaCode: "2FA Verifizierungscode",
    twoFaRequired: "2FA Code erforderlich",
    continue: "Weiter",
    processing: "Verarbeitung...",
    confirmWithdrawal: "Abhebung bestätigen",
    withdrawalStarted: "Abhebung gestartet!",
    error: "Fehler!",
    txComplete: "Transaktion wird in 10-30 Minuten abgeschlossen",
    close: "Schließen",
  },
  fr: {
    withdraw: "Retirer",
    withdrawAuxm: "Retirer AUXM en crypto",
    confirmTx: "Confirmer la transaction",
    withdrawableBalance: "Solde retirable",
    bonusLocked: "Bonus (verrouillé)",
    auxmAmount: "Montant AUXM à retirer",
    selectCrypto: "Sélectionner Crypto",
    walletAddress: "Adresse du portefeuille",
    network: "Réseau",
    youWillReceive: "Vous recevrez",
    networkFee: "Frais de réseau",
    netReceive: "Réception nette",
    insufficientBalance: "Solde AUXM insuffisant",
    minimum: "Minimum",
    auxmToWithdraw: "AUXM à retirer",
    convertTo: "Convertir en",
    address: "Adresse",
    verifyAddress: "Vérifiez l'adresse. Non réversible.",
    twoFaCode: "Code de vérification 2FA",
    twoFaRequired: "Code 2FA requis",
    continue: "Continuer",
    processing: "Traitement...",
    confirmWithdrawal: "Confirmer le retrait",
    withdrawalStarted: "Retrait commencé!",
    error: "Erreur!",
    txComplete: "Transaction terminée dans 10-30 minutes",
    close: "Fermer",
  },
  ar: {
    withdraw: "سحب",
    withdrawAuxm: "سحب AUXM كعملة مشفرة",
    confirmTx: "تأكيد المعاملة",
    withdrawableBalance: "الرصيد القابل للسحب",
    bonusLocked: "المكافأة (مقفلة)",
    auxmAmount: "مبلغ AUXM للسحب",
    selectCrypto: "اختر العملة",
    walletAddress: "عنوان المحفظة",
    network: "الشبكة",
    youWillReceive: "ستستلم",
    networkFee: "رسوم الشبكة",
    netReceive: "صافي الاستلام",
    insufficientBalance: "رصيد AUXM غير كافٍ",
    minimum: "الحد الأدنى",
    auxmToWithdraw: "AUXM للسحب",
    convertTo: "تحويل إلى",
    address: "العنوان",
    verifyAddress: "تحقق من العنوان. لا يمكن التراجع.",
    twoFaCode: "رمز التحقق 2FA",
    twoFaRequired: "مطلوب رمز 2FA",
    continue: "متابعة",
    processing: "جاري المعالجة...",
    confirmWithdrawal: "تأكيد السحب",
    withdrawalStarted: "بدأ السحب!",
    error: "خطأ!",
    txComplete: "ستكتمل المعاملة خلال 10-30 دقيقة",
    close: "إغلاق",
  },
  ru: {
    withdraw: "Вывод",
    withdrawAuxm: "Вывести AUXM как крипто",
    confirmTx: "Подтвердить транзакцию",
    withdrawableBalance: "Доступный баланс",
    bonusLocked: "Бонус (заблокирован)",
    auxmAmount: "Сумма AUXM для вывода",
    selectCrypto: "Выберите криптовалюту",
    walletAddress: "Адрес кошелька",
    network: "Сеть",
    youWillReceive: "Вы получите",
    networkFee: "Комиссия сети",
    netReceive: "Чистый доход",
    insufficientBalance: "Недостаточный баланс AUXM",
    minimum: "Минимум",
    auxmToWithdraw: "AUXM для вывода",
    convertTo: "Конвертировать в",
    address: "Адрес",
    verifyAddress: "Проверьте адрес. Необратимо.",
    twoFaCode: "Код подтверждения 2FA",
    twoFaRequired: "Требуется код 2FA",
    continue: "Продолжить",
    processing: "Обработка...",
    confirmWithdrawal: "Подтвердить вывод",
    withdrawalStarted: "Вывод начат!",
    error: "Ошибка!",
    txComplete: "Транзакция завершится через 10-30 минут",
    close: "Закрыть",
  },
};

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

type WithdrawCrypto = "USDT" | "BTC" | "ETH" | "XRP" | "SOL";

const WITHDRAW_CRYPTOS: Record<WithdrawCrypto, { 
  name: string; 
  icon: string; 
  color: string; 
  network: string;
  minWithdraw: number;
  fee: number;
}> = {
  USDT: { name: "Tether", icon: "₮", color: "#26A17B", network: "Ethereum / Tron", minWithdraw: 10, fee: 1 },
  BTC: { name: "Bitcoin", icon: "₿", color: "#F7931A", network: "Bitcoin Network", minWithdraw: 0.0005, fee: 0.0001 },
  ETH: { name: "Ethereum", icon: "Ξ", color: "#627EEA", network: "Ethereum / Base", minWithdraw: 0.001, fee: 0.001 },
  XRP: { name: "Ripple", icon: "✕", color: "#23292F", network: "XRP Ledger", minWithdraw: 1, fee: 0.1 },
  SOL: { name: "Solana", icon: "◎", color: "#9945FF", network: "Solana", minWithdraw: 0.1, fee: 0.01 },
};

export function WithdrawModal({ isOpen, onClose, lang = "en" }: WithdrawModalProps) {
  const { balances, address, refreshBalances, isConnected } = useWallet();
  const { prices: cryptoPrices } = useCryptoPrices();
  const t = translations[lang] || translations.en;

  const [selectedCrypto, setSelectedCrypto] = useState<WithdrawCrypto>("USDT");
  const [auxmAmount, setAuxmAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [xrpMemo, setXrpMemo] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message?: string } | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  // Gerçek bakiyeler
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const withdrawableAuxm = auxmBalance;

  // Crypto fiyatları
  const realCryptoPrices: Record<WithdrawCrypto, number> = {
    USDT: 1,
    BTC: cryptoPrices?.btc ?? 95000,
    ETH: cryptoPrices?.eth ?? 3500,
    XRP: cryptoPrices?.xrp ?? 2.2,
    SOL: cryptoPrices?.sol ?? 200,
  };

  useEffect(() => {
    if (isOpen) {
      setAuxmAmount("");
      setWithdrawAddress("");
      setXrpMemo("");
      setResult(null);
      setStep("select");
      setSelectedCrypto("USDT");
      setTwoFactorCode("");
      setRequires2FA(false);
      
      if (address) {
        fetch(`/api/security/2fa?address=${address}`)
          .then(res => res.json())
          .then(data => setIs2FAEnabled(data.enabled))
          .catch(() => setIs2FAEnabled(false));
      }
    }
  }, [isOpen, address]);

  if (!isOpen) return null;

  const crypto = WITHDRAW_CRYPTOS[selectedCrypto];
  const auxmAmountNum = parseFloat(auxmAmount) || 0;
  const cryptoPrice = realCryptoPrices[selectedCrypto];
  
  const receiveAmount = auxmAmountNum / cryptoPrice;
  const feeInCrypto = crypto.fee;
  const netReceiveAmount = Math.max(0, receiveAmount - feeInCrypto);

  const canAfford = auxmAmountNum <= withdrawableAuxm && auxmAmountNum > 0;
  const meetsMinimum = receiveAmount >= crypto.minWithdraw;
  const hasValidAddress = withdrawAddress.length > 10;
  const hasXrpMemo = selectedCrypto !== "XRP" || xrpMemo.length > 0;

  const handleMaxClick = () => {
    setAuxmAmount(withdrawableAuxm.toFixed(2));
  };

  const handleContinue = () => {
    if (canAfford && meetsMinimum && hasValidAddress && hasXrpMemo) {
      setStep("confirm");
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin: selectedCrypto,
          auxmAmount: auxmAmountNum,
          withdrawAddress,
          memo: selectedCrypto === "XRP" ? xrpMemo : undefined,
          twoFactorCode: is2FAEnabled ? twoFactorCode : undefined,
        }),
      });
      
      const data = await response.json();

      if (data.requires2FA) {
        setRequires2FA(true);
        setIsProcessing(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      setResult({ type: "success", message: `${data.withdrawal.cryptoAmount.toFixed(6)} ${selectedCrypto}` });
      await refreshBalances();
      
      setTimeout(() => onClose(), 3000);

    } catch (err) {
      console.error("Withdraw error:", err);
      setResult({ type: "error", message: err instanceof Error ? err.message : t.error });
    } finally {
      setIsProcessing(false);
    }
  };

  const cryptoList: WithdrawCrypto[] = ["USDT", "BTC", "ETH", "XRP", "SOL"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 sm:gap-3">
            {step === "confirm" && (
              <button onClick={() => setStep("select")} className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
                ←
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{t.withdraw}</h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                {step === "select" ? t.withdrawAuxm : t.confirmTx}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 text-lg sm:text-xl">✕</button>
        </div>

        {/* Result */}
        {result && (
          <div className="p-4 sm:p-6 text-center">
            <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">
              {result.type === "success" ? "✅" : "❌"}
            </div>
            <h3 className={`text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 ${result.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {result.type === "success" ? t.withdrawalStarted : t.error}
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">{result.message}</p>
            {result.type === "success" && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 mt-1.5 sm:mt-2">{t.txComplete}</p>
            )}
          </div>
        )}

        {/* Content */}
        {!result && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {step === "select" ? (
              <>
                {/* AUXM Balance */}
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{t.withdrawableBalance}</p>
                      <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">{withdrawableAuxm.toFixed(2)} <span className="text-purple-600 dark:text-purple-400">AUXM</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500">{t.bonusLocked}</p>
                      <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400">{bonusAuxm.toFixed(2)} AUXM</p>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">{t.auxmAmount}</label>
                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="number"
                      value={auxmAmount}
                      onChange={(e) => setAuxmAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white text-base sm:text-lg font-mono focus:outline-none focus:border-red-500 dark:focus:border-red-500"
                    />
                    <button
                      onClick={handleMaxClick}
                      className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold text-sm sm:text-base hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mt-0.5 sm:mt-1">≈ ${auxmAmountNum.toFixed(2)} USD</p>
                </div>

                {/* Crypto Selection */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">{t.selectCrypto}</label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {cryptoList.map((cryptoKey) => {
                      const c = WITHDRAW_CRYPTOS[cryptoKey];
                      const isSelected = selectedCrypto === cryptoKey;
                      return (
                        <button
                          key={cryptoKey}
                          onClick={() => setSelectedCrypto(cryptoKey)}
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border flex flex-col items-center gap-0.5 sm:gap-1 transition-all ${
                            isSelected 
                              ? "border-red-500 bg-red-50 dark:bg-red-500/20" 
                              : "border-stone-300 dark:border-slate-700 bg-stone-100 dark:bg-slate-800 hover:border-stone-400 dark:hover:border-slate-600"
                          }`}
                        >
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm" style={{ backgroundColor: c.color }}>
                            {c.icon}
                          </div>
                          <span className="text-[10px] sm:text-xs text-slate-700 dark:text-slate-300">{cryptoKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Withdraw Address */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">
                    {selectedCrypto} {t.walletAddress}
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={selectedCrypto === "BTC" ? "bc1q..." : selectedCrypto === "XRP" ? "r..." : "0x..."}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-red-500 dark:focus:border-red-500"
                  />
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mt-0.5 sm:mt-1">{t.network}: {crypto.network}</p>
                </div>

                {/* XRP Memo */}
                {selectedCrypto === "XRP" && (
                  <div>
                    <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">
                      Destination Tag <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={xrpMemo}
                      onChange={(e) => setXrpMemo(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-red-500 dark:focus:border-red-500"
                    />
                  </div>
                )}

                {/* You Will Receive */}
                {auxmAmountNum > 0 && (
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{t.youWillReceive}</span>
                      <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">{receiveAmount.toFixed(6)} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500 dark:text-slate-500">{t.networkFee}</span>
                      <span className="text-slate-600 dark:text-slate-400">-{feeInCrypto} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-red-200 dark:border-red-500/30">
                      <span className="text-red-600 dark:text-red-400 font-semibold">{t.netReceive}</span>
                      <span className="text-red-600 dark:text-red-400 font-bold">{netReceiveAmount.toFixed(6)} {selectedCrypto}</span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {!canAfford && auxmAmountNum > 0 && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">⚠️ {t.insufficientBalance}</p>
                  </div>
                )}

                {!meetsMinimum && auxmAmountNum > 0 && canAfford && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                    <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400">⚠️ {t.minimum}: {crypto.minWithdraw} {selectedCrypto}</p>
                  </div>
                )}
              </>
            ) : (
              /* Confirm Step */
              <>
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.auxmToWithdraw}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">{auxmAmountNum.toFixed(2)} AUXM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.convertTo}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">{selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t.address}</span>
                    <span className="text-slate-800 dark:text-white font-mono text-xs sm:text-sm">{withdrawAddress.slice(0, 8)}...{withdrawAddress.slice(-6)}</span>
                  </div>
                  {selectedCrypto === "XRP" && xrpMemo && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">Tag</span>
                      <span className="text-slate-800 dark:text-white font-mono">{xrpMemo}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 sm:pt-2 border-t border-stone-300 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{t.networkFee}</span>
                    <span className="text-slate-700 dark:text-slate-300">{feeInCrypto} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400 font-semibold">{t.netReceive}</span>
                    <span className="text-red-600 dark:text-red-400 font-bold text-base sm:text-lg">{netReceiveAmount.toFixed(6)} {selectedCrypto}</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                  <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">⚠️ {t.verifyAddress}</p>
                </div>

                {/* 2FA Input */}
                {(is2FAEnabled || requires2FA) && (
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800/50 border border-emerald-300 dark:border-emerald-500/30">
                    <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">🔐 {t.twoFaCode}</label>
                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white dark:bg-slate-900 border border-stone-300 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-800 dark:text-white text-center text-lg sm:text-xl font-mono tracking-widest focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500"
                      maxLength={6}
                    />
                    {requires2FA && (
                      <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 mt-1.5 sm:mt-2">{t.twoFaRequired}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {!result && (
          <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {step === "select" ? (
              <button
                onClick={handleContinue}
                disabled={!canAfford || !meetsMinimum || !hasValidAddress || !hasXrpMemo || auxmAmountNum <= 0}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t.continue}
              </button>
            ) : (
              <button
                onClick={handleWithdraw}
                disabled={isProcessing || (is2FAEnabled && twoFactorCode.length !== 6)}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
              >
                {isProcessing ? (
                  <><span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> {t.processing}</>
                ) : (
                  t.confirmWithdrawal
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WithdrawModal;
