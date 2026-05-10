"use client";

import { useState, useEffect } from "react";
import { formatAmount, getDecimalPlaces } from '@/lib/format';
import { useWallet } from "@/components/WalletContext";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { TwoFactorGate } from "@/components/TwoFactorGate";
import { useLanguage } from "@/components/LanguageContext";
import { getWithdrawFee, NETWORK_LABELS, DEFAULT_NETWORK } from "@/lib/withdraw-fees";
import { logEvent } from "@/lib/analytics";

const translations: Record<string, Record<string, string>> = {
  tr: {
    withdraw: "Para Çek",
    withdrawCrypto: "Kripto bakiyenizden çekin",
    confirmTx: "İşlemi onaylayın",
    availableBalance: "Kullanılabilir Bakiye",
    amount: "Çekilecek Miktar",
    selectCrypto: "Kripto Seçin",
    walletAddress: "Cüzdan Adresi",
    network: "Ağ",
    youWillReceive: "Alacağınız",
    networkFee: "Ağ Ücreti",
    netReceive: "Net Alacak",
    insufficientBalance: "Yetersiz bakiye",
    minimum: "Minimum çekim",
    address: "Adres",
    verifyAddress: "Adresi kontrol edin. İşlem geri alınamaz.",
    continue: "Devam Et",
    processing: "İşleniyor...",
    confirmWithdrawal: "Çekimi Onayla",
    withdrawalStarted: "Çekim Başlatıldı!",
    error: "Hata!",
    txComplete: "İşlem 10-30 dakika içinde tamamlanacak",
    close: "Kapat",
    max: "MAX",
    back: "Geri",
    destinationTag: "Hedef Etiketi",
    usdValue: "USD Değeri",
    tag: "Etiket",
    withdrawalFailed: "Çekim başarısız",
  },
  en: {
    withdraw: "Withdraw",
    withdrawCrypto: "Withdraw from your crypto balance",
    confirmTx: "Confirm transaction",
    availableBalance: "Available Balance",
    amount: "Amount to Withdraw",
    selectCrypto: "Select Crypto",
    walletAddress: "Wallet Address",
    network: "Network",
    youWillReceive: "You will receive",
    networkFee: "Network Fee",
    netReceive: "Net Receive",
    insufficientBalance: "Insufficient balance",
    minimum: "Minimum",
    address: "Address",
    verifyAddress: "Verify address. This cannot be reversed.",
    continue: "Continue",
    processing: "Processing...",
    confirmWithdrawal: "Confirm Withdrawal",
    withdrawalStarted: "Withdrawal Started!",
    error: "Error!",
    txComplete: "Transaction will complete in 10-30 minutes",
    close: "Close",
    max: "MAX",
    back: "Back",
    destinationTag: "Destination Tag",
    usdValue: "USD Value",
    tag: "Tag",
    withdrawalFailed: "Withdrawal failed",
  },
  de: {
    withdraw: "Abheben", withdrawCrypto: "Von Ihrem Krypto-Guthaben abheben", confirmTx: "Transaktion bestätigen",
    availableBalance: "Verfügbares Guthaben", amount: "Abzuhebender Betrag", selectCrypto: "Krypto auswählen",
    walletAddress: "Wallet-Adresse", network: "Netzwerk", youWillReceive: "Sie erhalten",
    networkFee: "Netzwerkgebühr", netReceive: "Netto-Empfang", insufficientBalance: "Unzureichendes Guthaben",
    minimum: "Minimum", address: "Adresse", verifyAddress: "Adresse prüfen. Nicht rückgängig machbar.",
    continue: "Weiter", processing: "Verarbeitung...", confirmWithdrawal: "Abhebung bestätigen",
    withdrawalStarted: "Abhebung gestartet!", error: "Fehler!", txComplete: "10-30 Minuten",
    close: "Schließen", max: "MAX", back: "Zurück",
    destinationTag: "Ziel-Tag", usdValue: "USD-Wert", tag: "Tag", withdrawalFailed: "Abhebung fehlgeschlagen",
  },
  fr: {
    withdraw: "Retirer", withdrawCrypto: "Retirer de votre solde crypto", confirmTx: "Confirmer la transaction",
    availableBalance: "Solde disponible", amount: "Montant à retirer", selectCrypto: "Sélectionner Crypto",
    walletAddress: "Adresse du portefeuille", network: "Réseau", youWillReceive: "Vous recevrez",
    networkFee: "Frais de réseau", netReceive: "Réception nette", insufficientBalance: "Solde insuffisant",
    minimum: "Minimum", address: "Adresse", verifyAddress: "Vérifiez l'adresse. Non réversible.",
    continue: "Continuer", processing: "Traitement...", confirmWithdrawal: "Confirmer le retrait",
    withdrawalStarted: "Retrait commencé!", error: "Erreur!", txComplete: "10-30 minutes",
    close: "Fermer", max: "MAX", back: "Retour",
    destinationTag: "Tag de destination", usdValue: "Valeur USD", tag: "Tag", withdrawalFailed: "Retrait échoué",
  },
  ar: {
    withdraw: "سحب", withdrawCrypto: "السحب من رصيدك المشفر", confirmTx: "تأكيد المعاملة",
    availableBalance: "الرصيد المتاح", amount: "المبلغ للسحب", selectCrypto: "اختر العملة",
    walletAddress: "عنوان المحفظة", network: "الشبكة", youWillReceive: "ستستلم",
    networkFee: "رسوم الشبكة", netReceive: "صافي الاستلام", insufficientBalance: "رصيد غير كافٍ",
    minimum: "الحد الأدنى", address: "العنوان", verifyAddress: "تحقق من العنوان.",
    continue: "متابعة", processing: "جاري المعالجة...", confirmWithdrawal: "تأكيد السحب",
    withdrawalStarted: "بدأ السحب!", error: "خطأ!", txComplete: "10-30 دقيقة",
    close: "إغلاق", max: "الأقصى", back: "رجوع",
    destinationTag: "علامة الوجهة", usdValue: "القيمة بالدولار", tag: "علامة", withdrawalFailed: "فشل السحب",
  },
  ru: {
    withdraw: "Вывод", withdrawCrypto: "Вывести с крипто баланса", confirmTx: "Подтвердить транзакцию",
    availableBalance: "Доступный баланс", amount: "Сумма для вывода", selectCrypto: "Выберите криптовалюту",
    walletAddress: "Адрес кошелька", network: "Сеть", youWillReceive: "Вы получите",
    networkFee: "Комиссия сети", netReceive: "Чистый доход", insufficientBalance: "Недостаточный баланс",
    minimum: "Минимум", address: "Адрес", verifyAddress: "Проверьте адрес.",
    continue: "Продолжить", processing: "Обработка...", confirmWithdrawal: "Подтвердить вывод",
    withdrawalStarted: "Вывод начат!", error: "Ошибка!", txComplete: "10-30 минут",
    close: "Закрыть", max: "МАКС", back: "Назад",
    destinationTag: "Тег назначения", usdValue: "Стоимость в USD", tag: "Тег", withdrawalFailed: "Вывод не удался",
  },
};

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type WithdrawCrypto = "USDT" | "USDC" | "BTC" | "ETH" | "XRP" | "SOL";

// Network labels + fees + minimums sourced from src/lib/withdraw-fees.ts.
// Modal currently uses DEFAULT_NETWORK per asset (no network picker yet).
const networkLabelFor = (asset: WithdrawCrypto): string => {
  const def = DEFAULT_NETWORK[asset];
  return def ? NETWORK_LABELS[def] : NETWORK_LABELS[getWithdrawFee(asset).network];
};

const WITHDRAW_CRYPTOS: Record<WithdrawCrypto, {
  name: string; icon: string; color: string; network: string; minWithdraw: number; fee: number;
}> = {
  USDT: { name: "Tether",    icon: "₮", color: "#26A17B", network: networkLabelFor("USDT"), minWithdraw: getWithdrawFee("USDT").minWithdraw, fee: getWithdrawFee("USDT").fee },
  USDC: { name: "USD Coin",  icon: "$", color: "#2775CA", network: networkLabelFor("USDC"), minWithdraw: getWithdrawFee("USDC").minWithdraw, fee: getWithdrawFee("USDC").fee },
  BTC:  { name: "Bitcoin",   icon: "₿", color: "#F7931A", network: networkLabelFor("BTC"),  minWithdraw: getWithdrawFee("BTC").minWithdraw,  fee: getWithdrawFee("BTC").fee  },
  ETH:  { name: "Ethereum",  icon: "Ξ", color: "#627EEA", network: networkLabelFor("ETH"),  minWithdraw: getWithdrawFee("ETH").minWithdraw,  fee: getWithdrawFee("ETH").fee  },
  XRP:  { name: "Ripple",    icon: "✕", color: "#23292F", network: networkLabelFor("XRP"),  minWithdraw: getWithdrawFee("XRP").minWithdraw,  fee: getWithdrawFee("XRP").fee  },
  SOL:  { name: "Solana",    icon: "◎", color: "#9945FF", network: networkLabelFor("SOL"),  minWithdraw: getWithdrawFee("SOL").minWithdraw,  fee: getWithdrawFee("SOL").fee  },
};

const BALANCE_KEYS: Record<WithdrawCrypto, string> = {
  USDT: "usdt", USDC: "usdc", BTC: "btc", ETH: "eth", XRP: "xrp", SOL: "sol",
};

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { balances, address, refreshBalances, isConnected } = useWallet();
  const { prices: cryptoPrices } = useCryptoPrices();
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  // Flow: "form" -> "confirm" -> "2fa" -> "result"
  const [flowStep, setFlowStep] = useState<"form" | "confirm" | "2fa" | "result">("form");
  
  const [selectedCrypto, setSelectedCrypto] = useState<WithdrawCrypto>("USDT");
  const [amount, setAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [xrpMemo, setXrpMemo] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message?: string; txHash?: string } | null>(null);
  const [verified2FACode, setVerified2FACode] = useState<string | undefined>();

  const getCryptoBalance = (crypto: WithdrawCrypto): number => {
    const key = BALANCE_KEYS[crypto];
    return (balances as any)?.[key] ?? 0;
  };

  const currentBalance = getCryptoBalance(selectedCrypto);
  const crypto = WITHDRAW_CRYPTOS[selectedCrypto];

  const realCryptoPrices: Record<WithdrawCrypto, number> = {
    USDT: 1, USDC: 1, BTC: cryptoPrices?.btc ?? 95000, ETH: cryptoPrices?.eth ?? 3500,
    XRP: cryptoPrices?.xrp ?? 2.2, SOL: cryptoPrices?.sol ?? 200,
  };

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setWithdrawAddress("");
      setXrpMemo("");
      setResult(null);
      setFlowStep("form");
      setSelectedCrypto("USDT");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const feeAmount = crypto.fee;
  const netReceiveAmount = Math.max(0, amountNum - feeAmount);
  const usdValue = amountNum * realCryptoPrices[selectedCrypto];

  const canAfford = amountNum <= currentBalance && amountNum > 0;
  const meetsMinimum = amountNum >= crypto.minWithdraw;
  const hasValidAddress = withdrawAddress.length > 10;
  const hasXrpMemo = selectedCrypto !== "XRP" || xrpMemo.length > 0;

  const handleMaxClick = () => setAmount(currentBalance.toString());
  const handleCryptoChange = (newCrypto: WithdrawCrypto) => { setSelectedCrypto(newCrypto); setAmount(""); };

  // Form dolduruldu, Confirm ekranına geç
  const handleContinue = () => {
    if (canAfford && meetsMinimum && hasValidAddress && hasXrpMemo) {
      setFlowStep("confirm");
    }
  };

  // Confirm ekranından 2FA'ya geç
  const handleConfirmClick = () => {
    setFlowStep("2fa");
  };

  // 2FA doğrulandı, işlemi gerçekleştir
  const handle2FAVerified = async (verifiedCode?: string) => {
    setVerified2FACode(verifiedCode); // Store for API call
    setFlowStep("result");
    setIsProcessing(true);
    setResult(null);
    logEvent("crypto_withdraw_attempted", { surface: "web", coin: selectedCrypto, amount: amountNum });

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin: selectedCrypto,
          amount: amountNum,
          withdrawAddress,
          memo: selectedCrypto === "XRP" ? xrpMemo : undefined,
          twoFactorCode: verifiedCode, // Include 2FA code for backend verification
        }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("withdrawalFailed"));
      }

      setResult({
        type: "success",
        message: `${data.withdrawal?.netAmount ? formatAmount(data.withdrawal.netAmount, selectedCrypto) : formatAmount(amountNum, selectedCrypto)} ${selectedCrypto}`,
        txHash: data.withdrawal?.txHash
      });
      logEvent("crypto_withdraw_succeeded", { surface: "web", coin: selectedCrypto, amount: amountNum });
      await refreshBalances();

    } catch (err) {
      console.error("Withdraw error:", err);
      const msg = err instanceof Error ? err.message : t("error");
      setResult({ type: "error", message: msg });
      logEvent("crypto_withdraw_failed", { surface: "web", coin: selectedCrypto, amount: amountNum, error: msg });
    } finally {
      setIsProcessing(false);
    }
  };

  const cryptoList: WithdrawCrypto[] = ["USDT", "USDC", "ETH", "XRP", "SOL", "BTC"];

  // 2FA Modal
  if (flowStep === "2fa") {
    return (
      <TwoFactorGate
        walletAddress={address || ""}
        isOpen={true}
        onClose={() => setFlowStep("confirm")}
        onVerified={handle2FAVerified}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 sm:gap-3">
            {flowStep === "confirm" && (
              <button onClick={() => setFlowStep("form")} className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">←</button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{t("withdraw")}</h2>
              <p className="text-[10px] sm:text-xs text-slate-500">{flowStep === "form" ? t("withdrawCrypto") : t("confirmTx")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">✕</button>
        </div>

        {/* Content */}
        {flowStep === "result" ? (
          <div className="p-4 sm:p-6 text-center">
            {isProcessing ? (
              <div className="py-8">
                <div className="w-12 h-12 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">{t("processing")}</p>
              </div>
            ) : result ? (
              <>
                <div className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center ${result.type === "success" ? "bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20" : "bg-red-100 dark:bg-red-500/20"}`}>
                  <span className="text-2xl sm:text-3xl">{result.type === "success" ? "✓" : "✕"}</span>
                </div>
                <h3 className={`text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 ${result.type === "success" ? "text-[#2F6F62] dark:text-[#2F6F62]" : "text-red-600 dark:text-red-400"}`}>
                  {result.type === "success" ? t("withdrawalStarted") : t("error")}
                </h3>
                {result.message && <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mb-2">{result.message}</p>}
                {result.type === "success" && <p className="text-xs sm:text-sm text-slate-500">{t("txComplete")}</p>}
                <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                  {t("close")}
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1 bg-stone-50 dark:bg-slate-900/50">
            {flowStep === "form" ? (
              <>
                {/* Crypto Selection */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">{t("selectCrypto")}</label>
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {cryptoList.map((c) => {
                      const cryptoInfo = WITHDRAW_CRYPTOS[c];
                      const balance = getCryptoBalance(c);
                      return (
                        <button
                          key={c}
                          onClick={() => handleCryptoChange(c)}
                          className={`p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center gap-0.5 sm:gap-1 ${
                            selectedCrypto === c ? "border-red-500 bg-red-50 dark:bg-red-500/10" : "border-stone-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-500/50 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <span className="text-lg sm:text-xl" style={{ color: cryptoInfo.color }}>{cryptoInfo.icon}</span>
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-white">{c}</span>
                          <span className="text-[8px] sm:text-[10px] text-slate-500">{balance > 0 ? formatAmount(balance, c) : "0"}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Balance */}
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-slate-100 to-stone-100 dark:from-slate-800 dark:to-slate-800/50 border border-stone-200 dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{t("availableBalance")}</span>
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">{formatAmount(currentBalance, selectedCrypto)} {selectedCrypto}</span>
                      <p className="text-[10px] sm:text-xs text-slate-500">≈ ${(currentBalance * realCryptoPrices[selectedCrypto]).toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">{t("amount")}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="any"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-16 sm:pr-20 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white text-base sm:text-lg font-semibold focus:outline-none focus:border-red-500"
                    />
                    <button onClick={handleMaxClick} className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 hover:bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-colors">
                      {t("max")}
                    </button>
                  </div>
                  {amountNum > 0 && <p className="text-[10px] sm:text-xs text-slate-500 mt-1">≈ ${usdValue.toFixed(2)} USD</p>}
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">{t("walletAddress")}</label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={selectedCrypto === "BTC" ? "bc1q..." : selectedCrypto === "XRP" ? "r..." : "0x..."}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-red-500"
                  />
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">{t("network")}: {crypto.network}</p>
                </div>

                {/* XRP Memo */}
                {selectedCrypto === "XRP" && (
                  <div>
                    <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">{t("destinationTag")} <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={xrpMemo}
                      onChange={(e) => setXrpMemo(e.target.value)}
                      placeholder="123456789"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}

                {/* You Will Receive */}
                {amountNum > 0 && (
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">{t("youWillReceive")}</span>
                      <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">{formatAmount(amountNum, selectedCrypto)} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">{t("networkFee")}</span>
                      <span className="text-slate-600 dark:text-slate-400">-{feeAmount} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-red-200 dark:border-red-500/30">
                      <span className="text-red-600 dark:text-red-400 font-semibold">{t("netReceive")}</span>
                      <span className="text-red-600 dark:text-red-400 font-bold">{formatAmount(netReceiveAmount, selectedCrypto)} {selectedCrypto}</span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {!canAfford && amountNum > 0 && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">⚠️ {t("insufficientBalance")}</p>
                  </div>
                )}
                {!meetsMinimum && amountNum > 0 && canAfford && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#BFA181]/10 dark:bg-[#BFA181]/10 border border-[#BFA181]/30 dark:border-[#BFA181]/30">
                    <p className="text-xs sm:text-sm text-[#BFA181] dark:text-[#BFA181]">⚠️ {t("minimum")}: {crypto.minWithdraw} {selectedCrypto}</p>
                  </div>
                )}
              </>
            ) : (
              /* Confirm Step */
              <>
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("amount")}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">{formatAmount(amountNum, selectedCrypto)} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("usdValue")}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">${usdValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("address")}</span>
                    <span className="text-slate-800 dark:text-white font-mono text-xs sm:text-sm">{withdrawAddress.slice(0, 8)}...{withdrawAddress.slice(-6)}</span>
                  </div>
                  {selectedCrypto === "XRP" && xrpMemo && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-400">{t("tag")}</span>
                      <span className="text-slate-800 dark:text-white font-mono">{xrpMemo}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1.5 sm:pt-2 border-t border-stone-300 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{t("networkFee")}</span>
                    <span className="text-slate-700 dark:text-slate-300">{feeAmount} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400 font-semibold">{t("netReceive")}</span>
                    <span className="text-red-600 dark:text-red-400 font-bold text-base sm:text-lg">{formatAmount(netReceiveAmount, selectedCrypto)} {selectedCrypto}</span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#BFA181]/10 dark:bg-[#BFA181]/10 border border-[#BFA181]/30 dark:border-[#BFA181]/30">
                  <p className="text-xs sm:text-sm text-[#BFA181] dark:text-[#BFA181]">⚠️ {t("verifyAddress")}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {flowStep !== "result" && (
          <div className="p-3 sm:p-4 border-t border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            {flowStep === "form" ? (
              <button
                onClick={handleContinue}
                disabled={!canAfford || !meetsMinimum || !hasValidAddress || !hasXrpMemo || amountNum <= 0}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t("continue")}
              </button>
            ) : (
              <button
                onClick={handleConfirmClick}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
              >
                🔐 {t("confirmWithdrawal")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WithdrawModal;
