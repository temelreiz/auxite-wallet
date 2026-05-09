"use client";

// ════════════════════════════════════════════════════════════════════════════
// AUXM REDEEM MODAL
// User redeems internal AUXM settlement balance to on-chain crypto
// (USDC / USDT / ETH / BTC).
//
// Flow: form → confirm → 2fa → result
// API:  POST /api/withdraw
//   body: { address, coin: "AUXM", payoutAsset, amount, withdrawAddress, twoFactorCode }
//
// AUXM stays internal (no on-chain token). The /api/withdraw handler converts
// AUXM (1:1 USD) to the chosen payout asset and sends from the hot wallet.
// ════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from "react";
import { formatAmount } from "@/lib/format";
import { useWallet } from "@/components/WalletContext";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { TwoFactorGate } from "@/components/TwoFactorGate";
import { useLanguage } from "@/components/LanguageContext";
import { getWithdrawFee, NETWORK_LABELS, DEFAULT_NETWORK } from "@/lib/withdraw-fees";

// ────────────────────────────────────────────────────────────────────────────
// i18n
// ────────────────────────────────────────────────────────────────────────────
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Dönüştür & Çek",
    subtitle: "AUXM bakiyesini kripto olarak cüzdanına çek",
    confirmTx: "İşlemi onayla",
    auxmBalance: "AUXM Bakiyesi",
    receiveAs: "Hangi Kripto Olarak Alacaksın?",
    amount: "AUXM Miktarı",
    walletAddress: "Cüzdan Adresi",
    network: "Ağ",
    youWillReceive: "Alacağın",
    networkFee: "Ağ Ücreti",
    netReceive: "Net Alacak",
    insufficientBalance: "Yetersiz AUXM bakiyesi",
    minimum: "Minimum çekim",
    address: "Adres",
    verifyAddress: "Adresi kontrol et. İşlem geri alınamaz.",
    continue: "Devam Et",
    processing: "İşleniyor...",
    confirmWithdrawal: "Çekimi Onayla",
    withdrawalStarted: "Çekim Başlatıldı!",
    withdrawalQueued: "Çekim Kuyrukta",
    queuedExplain: "Hot wallet bakiyesi yetersiz. Hazine yenilenince işlem otomatik tamamlanacak (24-72s).",
    error: "Hata!",
    txComplete: "İşlem 10-30 dakika içinde tamamlanacak",
    close: "Kapat",
    max: "MAX",
    back: "Geri",
    usdValue: "USD Değeri",
    rate: "Dönüşüm Oranı",
    comingSoon: "Yakında",
    auxmInfo: "AUXM, Auxite içinde dahili takas birimidir. Çekim sırasında seçtiğin kripto'ya 1 AUXM = 1 USD oranıyla çevrilir ve adresine gönderilir.",
    notTransferable: "AUXM doğrudan transfer edilemez",
    redeemableAs: "USDC/USDT/ETH/BTC olarak çekilebilir",
  },
  en: {
    title: "Convert & Withdraw",
    subtitle: "Redeem your AUXM balance as crypto to your wallet",
    confirmTx: "Confirm transaction",
    auxmBalance: "AUXM Balance",
    receiveAs: "Receive as which crypto?",
    amount: "AUXM Amount",
    walletAddress: "Wallet Address",
    network: "Network",
    youWillReceive: "You will receive",
    networkFee: "Network Fee",
    netReceive: "Net Receive",
    insufficientBalance: "Insufficient AUXM balance",
    minimum: "Minimum",
    address: "Address",
    verifyAddress: "Verify address. This cannot be reversed.",
    continue: "Continue",
    processing: "Processing...",
    confirmWithdrawal: "Confirm Withdrawal",
    withdrawalStarted: "Withdrawal Started!",
    withdrawalQueued: "Withdrawal Queued",
    queuedExplain: "Hot wallet liquidity is low. Will complete automatically once treasury is refilled (24-72h).",
    error: "Error!",
    txComplete: "Transaction will complete in 10-30 minutes",
    close: "Close",
    max: "MAX",
    back: "Back",
    usdValue: "USD Value",
    rate: "Conversion Rate",
    comingSoon: "Coming Soon",
    auxmInfo: "AUXM is an internal settlement unit within Auxite. On withdrawal it is converted to your selected crypto at 1 AUXM = 1 USD and sent to your address.",
    notTransferable: "AUXM is not directly transferable",
    redeemableAs: "Redeemable as USDC/USDT/ETH/BTC",
  },
  de: {
    title: "Umwandeln & Abheben", subtitle: "AUXM-Guthaben als Krypto auf Ihre Wallet abheben",
    confirmTx: "Transaktion bestätigen", auxmBalance: "AUXM-Guthaben",
    receiveAs: "Als welche Krypto erhalten?", amount: "AUXM-Betrag",
    walletAddress: "Wallet-Adresse", network: "Netzwerk", youWillReceive: "Sie erhalten",
    networkFee: "Netzwerkgebühr", netReceive: "Netto-Empfang",
    insufficientBalance: "Unzureichendes AUXM-Guthaben", minimum: "Minimum",
    address: "Adresse", verifyAddress: "Adresse prüfen. Nicht rückgängig.",
    continue: "Weiter", processing: "Verarbeitung...", confirmWithdrawal: "Abhebung bestätigen",
    withdrawalStarted: "Abhebung gestartet!", withdrawalQueued: "Abhebung in Warteschlange",
    queuedExplain: "Hot-Wallet-Liquidität gering. Wird nach Auffüllen automatisch abgeschlossen (24-72h).",
    error: "Fehler!", txComplete: "10-30 Minuten", close: "Schließen", max: "MAX", back: "Zurück",
    usdValue: "USD-Wert", rate: "Umrechnungskurs", comingSoon: "Demnächst",
    auxmInfo: "AUXM ist eine interne Verrechnungseinheit innerhalb von Auxite. Bei Abhebung wird sie zu 1 AUXM = 1 USD in die gewählte Krypto umgerechnet.",
    notTransferable: "AUXM ist nicht direkt übertragbar", redeemableAs: "Einlösbar als USDC/USDT/ETH/BTC",
  },
  fr: {
    title: "Convertir & Retirer", subtitle: "Convertir votre solde AUXM en crypto sur votre portefeuille",
    confirmTx: "Confirmer la transaction", auxmBalance: "Solde AUXM",
    receiveAs: "Recevoir en quelle crypto?", amount: "Montant AUXM",
    walletAddress: "Adresse du portefeuille", network: "Réseau", youWillReceive: "Vous recevrez",
    networkFee: "Frais de réseau", netReceive: "Réception nette",
    insufficientBalance: "Solde AUXM insuffisant", minimum: "Minimum",
    address: "Adresse", verifyAddress: "Vérifiez l'adresse. Non réversible.",
    continue: "Continuer", processing: "Traitement...", confirmWithdrawal: "Confirmer le retrait",
    withdrawalStarted: "Retrait commencé!", withdrawalQueued: "Retrait en file d'attente",
    queuedExplain: "Liquidité du hot wallet faible. Se terminera automatiquement après ravitaillement (24-72h).",
    error: "Erreur!", txComplete: "10-30 minutes", close: "Fermer", max: "MAX", back: "Retour",
    usdValue: "Valeur USD", rate: "Taux de conversion", comingSoon: "Bientôt disponible",
    auxmInfo: "AUXM est une unité de règlement interne au sein d'Auxite. Lors du retrait, il est converti en crypto choisi au taux de 1 AUXM = 1 USD.",
    notTransferable: "AUXM n'est pas directement transférable", redeemableAs: "Convertible en USDC/USDT/ETH/BTC",
  },
  ar: {
    title: "تحويل وسحب", subtitle: "استرداد رصيد AUXM كعملة مشفرة إلى محفظتك",
    confirmTx: "تأكيد المعاملة", auxmBalance: "رصيد AUXM",
    receiveAs: "استلم بأي عملة مشفرة؟", amount: "كمية AUXM",
    walletAddress: "عنوان المحفظة", network: "الشبكة", youWillReceive: "ستستلم",
    networkFee: "رسوم الشبكة", netReceive: "صافي الاستلام",
    insufficientBalance: "رصيد AUXM غير كافٍ", minimum: "الحد الأدنى",
    address: "العنوان", verifyAddress: "تحقق من العنوان. لا يمكن التراجع.",
    continue: "متابعة", processing: "جاري المعالجة...", confirmWithdrawal: "تأكيد السحب",
    withdrawalStarted: "بدأ السحب!", withdrawalQueued: "السحب في قائمة الانتظار",
    queuedExplain: "سيولة المحفظة الساخنة منخفضة. سيكتمل تلقائياً بعد إعادة التمويل (24-72 ساعة).",
    error: "خطأ!", txComplete: "10-30 دقيقة", close: "إغلاق", max: "الأقصى", back: "رجوع",
    usdValue: "القيمة بالدولار", rate: "سعر التحويل", comingSoon: "قريباً",
    auxmInfo: "AUXM هي وحدة تسوية داخلية ضمن Auxite. عند السحب يتم تحويلها إلى العملة المشفرة المختارة بسعر 1 AUXM = 1 USD.",
    notTransferable: "AUXM غير قابل للتحويل المباشر", redeemableAs: "قابل للاسترداد كـ USDC/USDT/ETH/BTC",
  },
  ru: {
    title: "Конвертация и вывод", subtitle: "Вывести баланс AUXM как криптовалюту на ваш кошелек",
    confirmTx: "Подтвердить транзакцию", auxmBalance: "Баланс AUXM",
    receiveAs: "Получить в какой криптовалюте?", amount: "Сумма AUXM",
    walletAddress: "Адрес кошелька", network: "Сеть", youWillReceive: "Вы получите",
    networkFee: "Комиссия сети", netReceive: "Чистый доход",
    insufficientBalance: "Недостаточный баланс AUXM", minimum: "Минимум",
    address: "Адрес", verifyAddress: "Проверьте адрес. Необратимо.",
    continue: "Продолжить", processing: "Обработка...", confirmWithdrawal: "Подтвердить вывод",
    withdrawalStarted: "Вывод начат!", withdrawalQueued: "Вывод в очереди",
    queuedExplain: "Ликвидность горячего кошелька низкая. Завершится автоматически после пополнения (24-72ч).",
    error: "Ошибка!", txComplete: "10-30 минут", close: "Закрыть", max: "МАКС", back: "Назад",
    usdValue: "Стоимость в USD", rate: "Курс конвертации", comingSoon: "Скоро",
    auxmInfo: "AUXM — это внутренняя расчетная единица в Auxite. При выводе конвертируется в выбранную криптовалюту по курсу 1 AUXM = 1 USD.",
    notTransferable: "AUXM напрямую не передается", redeemableAs: "Можно вывести как USDC/USDT/ETH/BTC",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Asset config
// ────────────────────────────────────────────────────────────────────────────
type PayoutAsset = "USDC" | "USDT" | "ETH" | "BTC";

// Fees + default network sourced from src/lib/withdraw-fees.ts (single source of truth).
// Modal always uses the DEFAULT_NETWORK for each asset; if you later add a network
// picker, swap getWithdrawFee(asset) → getWithdrawFee(asset, selectedNetwork).
const networkLabelFor = (asset: PayoutAsset): string => {
  const net = DEFAULT_NETWORK[asset];
  // Single-network assets (BTC) have no DEFAULT_NETWORK entry; fall back to the
  // helper's `network` field directly.
  return net ? NETWORK_LABELS[net] : NETWORK_LABELS[getWithdrawFee(asset).network];
};

const PAYOUT_ASSETS: Record<PayoutAsset, {
  name: string;
  icon: string;
  color: string;
  network: string;
  networkFee: number;
  enabled: boolean;
}> = {
  USDC: { name: "USD Coin", icon: "$", color: "#2775CA", network: networkLabelFor("USDC"), networkFee: getWithdrawFee("USDC").fee, enabled: true },
  USDT: { name: "Tether",   icon: "₮", color: "#26A17B", network: networkLabelFor("USDT"), networkFee: getWithdrawFee("USDT").fee, enabled: true },
  ETH:  { name: "Ethereum", icon: "Ξ", color: "#627EEA", network: networkLabelFor("ETH"),  networkFee: getWithdrawFee("ETH").fee,  enabled: true },
  BTC:  { name: "Bitcoin",  icon: "₿", color: "#F7931A", network: networkLabelFor("BTC"),  networkFee: getWithdrawFee("BTC").fee,  enabled: true },
};

// AUXM is USD-pegged 1:1
const MIN_AUXM = 10;

// ────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────
interface AuxmRedeemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuxmRedeemModal({ isOpen, onClose }: AuxmRedeemModalProps) {
  const { balances, address, refreshBalances } = useWallet();
  const { prices: cryptoPrices } = useCryptoPrices();
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  type FlowStep = "form" | "confirm" | "2fa" | "result";
  const [flowStep, setFlowStep] = useState<FlowStep>("form");

  const [payoutAsset, setPayoutAsset] = useState<PayoutAsset>("USDC");
  const [amount, setAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error" | "queued";
    message?: string;
    txHash?: string;
    payoutAmount?: number;
    payoutAsset?: PayoutAsset;
  } | null>(null);

  // AUXM balance from WalletContext
  const auxmBalance: number = (balances as any)?.auxm ?? 0;
  const config = PAYOUT_ASSETS[payoutAsset];

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setWithdrawAddress("");
      setResult(null);
      setFlowStep("form");
      setPayoutAsset("USDC");
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const usdValue = amountNum; // 1 AUXM = 1 USD

  // Conversion: USD -> payout asset units
  let payoutAmount = 0;
  let conversionRate = 0; // payout-asset per 1 AUXM
  if (payoutAsset === "USDC" || payoutAsset === "USDT") {
    payoutAmount = usdValue;
    conversionRate = 1;
  } else if (payoutAsset === "ETH") {
    const ethPrice = cryptoPrices?.eth || 3000;
    payoutAmount = ethPrice > 0 ? usdValue / ethPrice : 0;
    conversionRate = ethPrice > 0 ? 1 / ethPrice : 0;
  } else if (payoutAsset === "BTC") {
    const btcPrice = cryptoPrices?.btc || 95000;
    payoutAmount = btcPrice > 0 ? usdValue / btcPrice : 0;
    conversionRate = btcPrice > 0 ? 1 / btcPrice : 0;
  }

  const networkFee = config.networkFee;
  const netReceive = Math.max(0, payoutAmount - networkFee);

  const canAfford = amountNum > 0 && amountNum <= auxmBalance;
  const meetsMinimum = amountNum >= MIN_AUXM;
  const hasValidAddress = withdrawAddress.length > 10;
  const assetEnabled = config.enabled;
  const netReceivePositive = netReceive > 0;

  const handleMaxClick = () => setAmount(auxmBalance.toString());

  const handleAssetChange = (asset: PayoutAsset) => {
    if (!PAYOUT_ASSETS[asset].enabled) return;
    setPayoutAsset(asset);
  };

  const handleContinue = () => {
    if (canAfford && meetsMinimum && hasValidAddress && assetEnabled && netReceivePositive) {
      setFlowStep("confirm");
    }
  };

  const handleConfirmClick = () => {
    setFlowStep("2fa");
  };

  const handle2FAVerified = async (verifiedCode?: string) => {
    setFlowStep("result");
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin: "AUXM",
          payoutAsset,
          amount: amountNum,
          withdrawAddress,
          twoFactorCode: verifiedCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("error"));
      }

      // Backend returns either completed (direct) or queued (deferred)
      if (data.deferred) {
        setResult({
          type: "queued",
          payoutAmount: data.withdrawal?.payoutAmount ?? netReceive,
          payoutAsset,
        });
      } else {
        setResult({
          type: "success",
          message: `${formatAmount(data.withdrawal?.payoutAmount ?? netReceive, payoutAsset)} ${payoutAsset}`,
          txHash: data.withdrawal?.txHash,
          payoutAmount: data.withdrawal?.payoutAmount ?? netReceive,
          payoutAsset,
        });
      }
      await refreshBalances();
    } catch (err) {
      console.error("AUXM redeem error:", err);
      setResult({
        type: "error",
        message: err instanceof Error ? err.message : t("error"),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── 2FA gate (renders TwoFactorGate as a separate full-screen modal) ────
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

  const assetList: PayoutAsset[] = ["USDC", "USDT", "ETH", "BTC"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50 dark:bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-stone-300 dark:border-slate-700 overflow-hidden max-h-[90vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2 sm:gap-3">
            {flowStep === "confirm" && (
              <button
                onClick={() => setFlowStep("form")}
                className="p-1 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
              >
                ←
              </button>
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                {t("title")}
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500">
                {flowStep === "form" ? t("subtitle") : t("confirmTx")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        {flowStep === "result" ? (
          <div className="p-4 sm:p-6 text-center">
            {isProcessing ? (
              <div className="py-8">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">{t("processing")}</p>
              </div>
            ) : result ? (
              <>
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center ${
                    result.type === "success"
                      ? "bg-[#2F6F62]/20"
                      : result.type === "queued"
                      ? "bg-[#BFA181]/20"
                      : "bg-red-100 dark:bg-red-500/20"
                  }`}
                >
                  <span className="text-2xl sm:text-3xl">
                    {result.type === "success" ? "✓" : result.type === "queued" ? "⏳" : "✕"}
                  </span>
                </div>
                <h3
                  className={`text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 ${
                    result.type === "success"
                      ? "text-[#2F6F62]"
                      : result.type === "queued"
                      ? "text-[#BFA181]"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {result.type === "success"
                    ? t("withdrawalStarted")
                    : result.type === "queued"
                    ? t("withdrawalQueued")
                    : t("error")}
                </h3>
                {result.message && (
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base mb-2">
                    {result.message}
                  </p>
                )}
                {result.type === "success" && (
                  <p className="text-xs sm:text-sm text-slate-500">{t("txComplete")}</p>
                )}
                {result.type === "queued" && (
                  <p className="text-xs sm:text-sm text-slate-500 px-2">{t("queuedExplain")}</p>
                )}
                {result.txHash && (
                  <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-2 font-mono break-all">
                    {result.txHash}
                  </p>
                )}
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  {t("close")}
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1 bg-stone-50 dark:bg-slate-900/50">
            {flowStep === "form" ? (
              <>
                {/* AUXM Balance card */}
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 dark:from-indigo-500/20 dark:to-indigo-500/10 border border-indigo-500/30">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <span className="text-indigo-500 text-base">◈</span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {t("auxmBalance")}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                      {formatAmount(auxmBalance, "AUXM")}{" "}
                      <span className="text-xs text-indigo-500">AUXM</span>
                    </span>
                  </div>
                </div>

                {/* Asset selector */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">
                    {t("receiveAs")}
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                    {assetList.map((a) => {
                      const info = PAYOUT_ASSETS[a];
                      const selected = payoutAsset === a && info.enabled;
                      return (
                        <button
                          key={a}
                          onClick={() => handleAssetChange(a)}
                          disabled={!info.enabled}
                          className={`relative p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 transition-all flex flex-col items-center gap-0.5 sm:gap-1 ${
                            selected
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                              : info.enabled
                              ? "border-stone-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50 bg-white dark:bg-slate-800"
                              : "border-stone-200 dark:border-slate-700 bg-stone-100 dark:bg-slate-800/50 opacity-50 cursor-not-allowed"
                          }`}
                        >
                          <span className="text-lg sm:text-xl" style={{ color: info.color }}>
                            {info.icon}
                          </span>
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-white">
                            {a}
                          </span>
                          {!info.enabled && (
                            <span className="absolute top-1 right-1 text-[7px] sm:text-[9px] font-bold text-[#BFA181] bg-[#BFA181]/15 rounded px-1">
                              {t("comingSoon")}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amount input (in AUXM) */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">
                    {t("amount")}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      step="any"
                      min={MIN_AUXM}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-16 sm:pr-20 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white text-base sm:text-lg font-semibold focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleMaxClick}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 sm:py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] sm:text-xs font-bold rounded-md sm:rounded-lg transition-colors"
                    >
                      {t("max")}
                    </button>
                  </div>
                  {amountNum > 0 && (
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">
                      ≈ ${usdValue.toFixed(2)} USD
                    </p>
                  )}
                </div>

                {/* Wallet address */}
                <div>
                  <label className="block text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-1.5 sm:mb-2">
                    {t("walletAddress")}
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={payoutAsset === "BTC" ? "bc1q..." : "0x..."}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800 border border-stone-300 dark:border-slate-700 text-slate-800 dark:text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">
                    {t("network")}: {config.network}
                  </p>
                </div>

                {/* Conversion preview */}
                {amountNum > 0 && assetEnabled && (
                  <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
                    <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                      <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {t("youWillReceive")}
                      </span>
                      <span className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                        {formatAmount(payoutAmount, payoutAsset)} {payoutAsset}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] sm:text-xs">
                      <span className="text-slate-500">{t("rate")}</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        1 AUXM = {formatAmount(conversionRate, payoutAsset)} {payoutAsset}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm mt-1">
                      <span className="text-slate-500">{t("networkFee")}</span>
                      <span className="text-slate-600 dark:text-slate-400">
                        -{networkFee} {payoutAsset}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm pt-1.5 sm:pt-2 mt-1.5 sm:mt-2 border-t border-indigo-200 dark:border-indigo-500/30">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        {t("netReceive")}
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                        {formatAmount(netReceive, payoutAsset)} {payoutAsset}
                      </span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {!canAfford && amountNum > 0 && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30">
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                      ⚠️ {t("insufficientBalance")}
                    </p>
                  </div>
                )}
                {!meetsMinimum && amountNum > 0 && canAfford && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/30">
                    <p className="text-xs sm:text-sm text-[#BFA181]">
                      ⚠️ {t("minimum")}: {MIN_AUXM} AUXM
                    </p>
                  </div>
                )}
                {amountNum > 0 && assetEnabled && canAfford && meetsMinimum && !netReceivePositive && (
                  <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/30">
                    <p className="text-xs sm:text-sm text-[#BFA181]">
                      ⚠️ {t("minimum")}: {MIN_AUXM} AUXM
                    </p>
                  </div>
                )}

                {/* Info */}
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 italic px-1 leading-relaxed">
                  {t("auxmInfo")}
                </p>
              </>
            ) : (
              /* Confirm step */
              <>
                <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800/50 border border-stone-300 dark:border-slate-700 space-y-2 sm:space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("amount")}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">
                      {formatAmount(amountNum, "AUXM")} AUXM
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("usdValue")}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">
                      ${usdValue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("receiveAs")}</span>
                    <span className="text-slate-800 dark:text-white font-semibold">
                      {payoutAsset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">{t("address")}</span>
                    <span className="text-slate-800 dark:text-white font-mono text-xs">
                      {withdrawAddress.slice(0, 8)}...{withdrawAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 sm:pt-2 border-t border-stone-300 dark:border-slate-700">
                    <span className="text-slate-600 dark:text-slate-400">{t("networkFee")}</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {networkFee} {payoutAsset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                      {t("netReceive")}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold text-base sm:text-lg">
                      {formatAmount(netReceive, payoutAsset)} {payoutAsset}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-[#BFA181]/10 border border-[#BFA181]/30">
                  <p className="text-xs sm:text-sm text-[#BFA181]">⚠️ {t("verifyAddress")}</p>
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
                disabled={
                  !canAfford ||
                  !meetsMinimum ||
                  !hasValidAddress ||
                  !assetEnabled ||
                  !netReceivePositive ||
                  amountNum <= 0
                }
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {t("continue")}
              </button>
            ) : (
              <button
                onClick={handleConfirmClick}
                className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center justify-center gap-2"
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

export default AuxmRedeemModal;
