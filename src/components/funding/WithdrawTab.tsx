"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { TwoFactorGate } from "@/components/TwoFactorGate";
import { WithdrawableAssetsPanel } from "./WithdrawableAssetsPanel";
import { FeePreviewPanel } from "./FeePreviewPanel";
import { formatAmount, getDecimalPlaces } from '@/lib/format';

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    selectWithdrawalType: "ÇEKİM TÜRÜ",
    internalTransfer: "Dahili Transfer",
    internalDesc: "Vault arası, anında, ücretsiz",
    externalWallet: "Harici Cüzdan",
    externalDesc: "Kripto çekimi, ücretler uygulanır",
    physicalRedemption: "Fiziksel İtfa",
    physicalDesc: "Metal teslimatı",
    comingSoon: "Yakında",
    // Internal form
    recipientAddress: "Alıcı Adresi",
    enterRecipientAddress: "0x... cüzdan adresi girin",
    selectAsset: "Varlık Seçin",
    amount: "Tutar",
    enterAmount: "Tutar girin",
    max: "Maks",
    balance: "Bakiye",
    noBlockchainTx: "Blockchain işlemi tetiklemez. Dahili vault transferi.",
    instantSettlement: "Anında takas, sıfır ücret",
    continue: "Devam Et",
    sending: "Gönderiliyor...",
    // External form
    destinationAddress: "Hedef Adres",
    enterDestinationAddress: "Hedef cüzdan adresi girin",
    selectCrypto: "Kripto Seçin",
    network: "Ağ",
    custodyExitWarning: "Saklama dışına çıkan varlıklar artık ayrılmış saklama korumalarından yararlanamaz.",
    verifyAddress: "Adresi kontrol edin. İşlem geri alınamaz.",
    confirmWithdrawal: "Çekimi Onayla",
    // Physical
    contactDesk: "Fiziksel itfa için kurumsal masayla iletişime geçin",
    minGold: "Min. 100g Altın",
    minSilver: "Min. 1,000oz Gümüş",
    // History
    withdrawalHistory: "Çekim Geçmişi",
    noWithdrawals: "Henüz çekim yok",
    pending: "Beklemede",
    completed: "Tamamlandı",
    processing: "İşleniyor",
    failed: "Başarısız",
    sent: "Gönderildi",
    // Success/Error
    transferSuccess: "Transfer başarılı!",
    withdrawalSuccess: "Çekim başlatıldı!",
    transferFailed: "Transfer başarısız",
    withdrawalFailed: "Çekim başarısız",
    insufficientBalance: "Yetersiz bakiye",
    invalidAddress: "Geçersiz adres",
  },
  en: {
    selectWithdrawalType: "WITHDRAWAL TYPE",
    internalTransfer: "Internal Transfer",
    internalDesc: "Vault-to-vault, instant, zero fee",
    externalWallet: "External Wallet",
    externalDesc: "Crypto withdrawal, fees apply",
    physicalRedemption: "Physical Redemption",
    physicalDesc: "Metal delivery",
    comingSoon: "Coming Soon",
    recipientAddress: "Recipient Address",
    enterRecipientAddress: "Enter 0x... wallet address",
    selectAsset: "Select Asset",
    amount: "Amount",
    enterAmount: "Enter amount",
    max: "Max",
    balance: "Balance",
    noBlockchainTx: "Does not trigger a blockchain transaction. Internal vault transfer.",
    instantSettlement: "Instant settlement, zero fee",
    continue: "Continue",
    sending: "Sending...",
    destinationAddress: "Destination Address",
    enterDestinationAddress: "Enter destination wallet address",
    selectCrypto: "Select Crypto",
    network: "Network",
    custodyExitWarning: "Assets leaving custody no longer benefit from segregation protections.",
    verifyAddress: "Verify address. This cannot be reversed.",
    confirmWithdrawal: "Confirm Withdrawal",
    contactDesk: "Contact institutional desk for physical redemption",
    minGold: "Min. 100g Gold",
    minSilver: "Min. 1,000oz Silver",
    withdrawalHistory: "Withdrawal History",
    noWithdrawals: "No withdrawals yet",
    pending: "Pending",
    completed: "Completed",
    processing: "Processing",
    failed: "Failed",
    sent: "Sent",
    transferSuccess: "Transfer successful!",
    withdrawalSuccess: "Withdrawal started!",
    transferFailed: "Transfer failed",
    withdrawalFailed: "Withdrawal failed",
    insufficientBalance: "Insufficient balance",
    invalidAddress: "Invalid address",
  },
  de: {
    selectWithdrawalType: "ABHEBUNGSART",
    internalTransfer: "Interner Transfer",
    internalDesc: "Tresor-zu-Tresor, sofort, gebührenfrei",
    externalWallet: "Externes Wallet",
    externalDesc: "Krypto-Abhebung, Gebühren",
    physicalRedemption: "Physische Einlösung",
    physicalDesc: "Metalllieferung",
    comingSoon: "Demnächst",
    recipientAddress: "Empfängeradresse",
    enterRecipientAddress: "0x... Adresse eingeben",
    selectAsset: "Vermögenswert wählen",
    amount: "Betrag",
    enterAmount: "Betrag eingeben",
    max: "Max",
    balance: "Guthaben",
    noBlockchainTx: "Keine Blockchain-Transaktion. Interner Transfer.",
    instantSettlement: "Sofortige Abwicklung, keine Gebühren",
    continue: "Weiter",
    sending: "Sende...",
    destinationAddress: "Zieladresse",
    enterDestinationAddress: "Ziel-Wallet-Adresse eingeben",
    selectCrypto: "Krypto wählen",
    network: "Netzwerk",
    custodyExitWarning: "Vermögenswerte ohne Verwahrungsschutz.",
    verifyAddress: "Adresse prüfen. Nicht rückgängig.",
    confirmWithdrawal: "Abhebung bestätigen",
    contactDesk: "Kontaktieren Sie den institutionellen Desk",
    minGold: "Min. 100g Gold",
    minSilver: "Min. 1.000oz Silber",
    withdrawalHistory: "Abhebungshistorie",
    noWithdrawals: "Keine Abhebungen",
    pending: "Ausstehend",
    completed: "Abgeschlossen",
    processing: "Verarbeitung",
    failed: "Fehlgeschlagen",
    sent: "Gesendet",
    transferSuccess: "Transfer erfolgreich!",
    withdrawalSuccess: "Abhebung gestartet!",
    transferFailed: "Transfer fehlgeschlagen",
    withdrawalFailed: "Abhebung fehlgeschlagen",
    insufficientBalance: "Unzureichendes Guthaben",
    invalidAddress: "Ungültige Adresse",
  },
  fr: {
    selectWithdrawalType: "TYPE DE RETRAIT",
    internalTransfer: "Transfert Interne",
    internalDesc: "Coffre-à-coffre, instantané, gratuit",
    externalWallet: "Portefeuille Externe",
    externalDesc: "Retrait crypto, frais applicables",
    physicalRedemption: "Rachat Physique",
    physicalDesc: "Livraison de métal",
    comingSoon: "Bientôt",
    recipientAddress: "Adresse du Destinataire",
    enterRecipientAddress: "Entrez l'adresse 0x...",
    selectAsset: "Sélectionner l'Actif",
    amount: "Montant",
    enterAmount: "Entrez le montant",
    max: "Max",
    balance: "Solde",
    noBlockchainTx: "Pas de transaction blockchain. Transfert interne.",
    instantSettlement: "Règlement instantané, sans frais",
    continue: "Continuer",
    sending: "Envoi...",
    destinationAddress: "Adresse de Destination",
    enterDestinationAddress: "Entrez l'adresse de destination",
    selectCrypto: "Sélectionner Crypto",
    network: "Réseau",
    custodyExitWarning: "Les actifs quittant la garde perdent les protections.",
    verifyAddress: "Vérifiez l'adresse. Non réversible.",
    confirmWithdrawal: "Confirmer le Retrait",
    contactDesk: "Contactez le bureau institutionnel",
    minGold: "Min. 100g Or",
    minSilver: "Min. 1 000oz Argent",
    withdrawalHistory: "Historique des Retraits",
    noWithdrawals: "Aucun retrait",
    pending: "En attente",
    completed: "Terminé",
    processing: "Traitement",
    failed: "Échoué",
    sent: "Envoyé",
    transferSuccess: "Transfert réussi!",
    withdrawalSuccess: "Retrait lancé!",
    transferFailed: "Transfert échoué",
    withdrawalFailed: "Retrait échoué",
    insufficientBalance: "Solde insuffisant",
    invalidAddress: "Adresse invalide",
  },
  ar: {
    selectWithdrawalType: "نوع السحب",
    internalTransfer: "تحويل داخلي",
    internalDesc: "بين الخزائن، فوري، بدون رسوم",
    externalWallet: "محفظة خارجية",
    externalDesc: "سحب كريبتو، رسوم مطبقة",
    physicalRedemption: "استرداد مادي",
    physicalDesc: "توصيل المعادن",
    comingSoon: "قريباً",
    recipientAddress: "عنوان المستلم",
    enterRecipientAddress: "أدخل عنوان 0x...",
    selectAsset: "اختر الأصل",
    amount: "المبلغ",
    enterAmount: "أدخل المبلغ",
    max: "الأقصى",
    balance: "الرصيد",
    noBlockchainTx: "لا يؤدي إلى معاملة بلوكتشين. تحويل داخلي.",
    instantSettlement: "تسوية فورية، بدون رسوم",
    continue: "متابعة",
    sending: "جاري الإرسال...",
    destinationAddress: "عنوان الوجهة",
    enterDestinationAddress: "أدخل عنوان محفظة الوجهة",
    selectCrypto: "اختر العملة",
    network: "الشبكة",
    custodyExitWarning: "الأصول المغادرة للحفظ تفقد حماية الفصل.",
    verifyAddress: "تحقق من العنوان. لا يمكن التراجع.",
    confirmWithdrawal: "تأكيد السحب",
    contactDesk: "تواصل مع المكتب المؤسسي",
    minGold: "الحد الأدنى 100 غ ذهب",
    minSilver: "الحد الأدنى 1,000 أوقية فضة",
    withdrawalHistory: "سجل السحوبات",
    noWithdrawals: "لا توجد سحوبات",
    pending: "معلق",
    completed: "مكتمل",
    processing: "قيد المعالجة",
    failed: "فشل",
    sent: "مرسل",
    transferSuccess: "تحويل ناجح!",
    withdrawalSuccess: "بدأ السحب!",
    transferFailed: "فشل التحويل",
    withdrawalFailed: "فشل السحب",
    insufficientBalance: "رصيد غير كافٍ",
    invalidAddress: "عنوان غير صالح",
  },
  ru: {
    selectWithdrawalType: "Тип Вывода",
    internalTransfer: "Внутренний Перевод",
    internalDesc: "Между хранилищами, мгновенно, бесплатно",
    externalWallet: "Внешний Кошелек",
    externalDesc: "Крипто-вывод, комиссии",
    physicalRedemption: "Физический Выкуп",
    physicalDesc: "Доставка металла",
    comingSoon: "Скоро",
    recipientAddress: "Адрес Получателя",
    enterRecipientAddress: "Введите адрес 0x...",
    selectAsset: "Выберите Актив",
    amount: "Сумма",
    enterAmount: "Введите сумму",
    max: "Макс",
    balance: "Баланс",
    noBlockchainTx: "Не запускает блокчейн-транзакцию. Внутренний перевод.",
    instantSettlement: "Мгновенный расчет, без комиссий",
    continue: "Продолжить",
    sending: "Отправка...",
    destinationAddress: "Адрес Назначения",
    enterDestinationAddress: "Введите адрес кошелька назначения",
    selectCrypto: "Выберите Крипто",
    network: "Сеть",
    custodyExitWarning: "Активы, покидающие хранение, теряют защиту.",
    verifyAddress: "Проверьте адрес. Необратимо.",
    confirmWithdrawal: "Подтвердить Вывод",
    contactDesk: "Свяжитесь с институциональным столом",
    minGold: "Мин. 100г Золото",
    minSilver: "Мин. 1 000oz Серебро",
    withdrawalHistory: "История Выводов",
    noWithdrawals: "Выводов нет",
    pending: "Ожидание",
    completed: "Завершено",
    processing: "Обработка",
    failed: "Ошибка",
    sent: "Отправлено",
    transferSuccess: "Перевод успешен!",
    withdrawalSuccess: "Вывод начат!",
    transferFailed: "Перевод не удался",
    withdrawalFailed: "Вывод не удался",
    insufficientBalance: "Недостаточный баланс",
    invalidAddress: "Неверный адрес",
  },
};

type WithdrawalType = "internal" | "external" | "physical";
type WithdrawCrypto = "USDT" | "BTC" | "ETH" | "XRP" | "SOL";

const WITHDRAW_CRYPTOS: Record<WithdrawCrypto, { name: string; icon: string; color: string; network: string; minWithdraw: number; fee: number }> = {
  USDT: { name: "Tether", icon: "₮", color: "#26A17B", network: "Ethereum / Tron", minWithdraw: 10, fee: 1 },
  BTC: { name: "Bitcoin", icon: "₿", color: "#F7931A", network: "Bitcoin Network", minWithdraw: 0.0005, fee: 0.0001 },
  ETH: { name: "Ethereum", icon: "Ξ", color: "#627EEA", network: "Ethereum / Base", minWithdraw: 0.005, fee: 0.001 },
  XRP: { name: "Ripple", icon: "✕", color: "#23292F", network: "XRP Ledger", minWithdraw: 10, fee: 0.1 },
  SOL: { name: "Solana", icon: "◎", color: "#9945FF", network: "Solana", minWithdraw: 0.1, fee: 0.01 },
};

interface TransactionRecord {
  id: string;
  type: string;
  token: string;
  amount: string;
  amountUsd?: string;
  status: string;
  timestamp: number;
  toAddress?: string;
}

export function WithdrawTab() {
  const { lang } = useLanguage();
  const { address, balances, refreshBalances } = useWallet();
  const t = translations[lang] || translations.en;

  // Type selection
  const [withdrawalType, setWithdrawalType] = useState<WithdrawalType>("internal");

  // Internal transfer form
  const [internalRecipient, setInternalRecipient] = useState("");
  const [internalAsset, setInternalAsset] = useState<string | null>(null);
  const [internalAmount, setInternalAmount] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [internalSuccess, setInternalSuccess] = useState(false);

  // External withdrawal form
  const [externalCrypto, setExternalCrypto] = useState<WithdrawCrypto>("USDT");
  const [externalAddress, setExternalAddress] = useState("");
  const [externalAmount, setExternalAmount] = useState("");
  const [externalLoading, setExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [externalSuccess, setExternalSuccess] = useState(false);

  // 2FA
  const [show2FA, setShow2FA] = useState(false);
  const [pending2FAAction, setPending2FAAction] = useState<"internal" | "external" | null>(null);

  // History
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Transferable assets for internal transfer
  const transferableAssets = balances
    ? [
        { symbol: "AUXM", name: "Settlement Balance", balance: (balances as any).auxm || 0 },
        { symbol: "AUXG", name: "Gold", balance: (balances as any).auxg || 0 },
        { symbol: "AUXS", name: "Silver", balance: (balances as any).auxs || 0 },
        { symbol: "AUXPT", name: "Platinum", balance: (balances as any).auxpt || 0 },
        { symbol: "AUXPD", name: "Palladium", balance: (balances as any).auxpd || 0 },
        { symbol: "ETH", name: "Ethereum", balance: (balances as any).eth || 0 },
        { symbol: "BTC", name: "Bitcoin", balance: (balances as any).btc || 0 },
        { symbol: "USDT", name: "Tether", balance: (balances as any).usdt || 0 },
      ].filter((a) => a.balance > 0 || ["AUXM", "AUXG"].includes(a.symbol))
    : [];

  const formatBalance = (bal: number, symbol: string) => {
    if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(symbol)) return `${formatAmount(bal, symbol)}g`;
    return formatAmount(bal, symbol);
  };

  // Load withdrawal history
  const loadHistory = useCallback(async () => {
    if (!address) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/user/transactions?address=${address}&type=transfer_out,withdraw&limit=20`);
      const data = await res.json();
      if (data.success) setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Failed to load withdrawal history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [address]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Reset forms when type changes
  useEffect(() => {
    setInternalError(null);
    setInternalSuccess(false);
    setExternalError(null);
    setExternalSuccess(false);
  }, [withdrawalType]);

  // ──────────────────────────────────────────
  // Internal Transfer Handler
  // ──────────────────────────────────────────
  const handleInternalContinue = () => {
    setInternalError(null);
    if (!internalAsset || !internalAmount || parseFloat(internalAmount) <= 0) {
      setInternalError(t.selectAsset + " & " + t.enterAmount);
      return;
    }
    if (!internalRecipient || !internalRecipient.startsWith("0x") || internalRecipient.length < 42) {
      setInternalError(t.invalidAddress);
      return;
    }
    const asset = transferableAssets.find((a) => a.symbol === internalAsset);
    if (asset && parseFloat(internalAmount) > asset.balance) {
      setInternalError(t.insufficientBalance);
      return;
    }
    setPending2FAAction("internal");
    setShow2FA(true);
  };

  const executeInternalTransfer = async (verifiedCode?: string) => {
    setShow2FA(false);
    setInternalLoading(true);
    setInternalError(null);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: address,
          toAddress: internalRecipient,
          token: internalAsset,
          amount: parseFloat(internalAmount),
          twoFactorCode: verifiedCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.transferFailed);

      setInternalSuccess(true);
      setInternalRecipient("");
      setInternalAsset(null);
      setInternalAmount("");
      await Promise.all([refreshBalances(), loadHistory()]);
      setTimeout(() => setInternalSuccess(false), 5000);
    } catch (error: any) {
      setInternalError(error.message || t.transferFailed);
    } finally {
      setInternalLoading(false);
    }
  };

  // ──────────────────────────────────────────
  // External Withdrawal Handler
  // ──────────────────────────────────────────
  const handleExternalContinue = () => {
    setExternalError(null);
    const amountNum = parseFloat(externalAmount);
    const crypto = WITHDRAW_CRYPTOS[externalCrypto];
    const balance = (balances as any)?.[externalCrypto.toLowerCase()] || 0;

    if (!amountNum || amountNum <= 0) {
      setExternalError(t.enterAmount);
      return;
    }
    if (amountNum > balance) {
      setExternalError(t.insufficientBalance);
      return;
    }
    if (amountNum < crypto.minWithdraw) {
      setExternalError(`Minimum: ${crypto.minWithdraw} ${externalCrypto}`);
      return;
    }
    if (!externalAddress || externalAddress.length < 10) {
      setExternalError(t.invalidAddress);
      return;
    }
    setPending2FAAction("external");
    setShow2FA(true);
  };

  const executeExternalWithdrawal = async (verifiedCode?: string) => {
    setShow2FA(false);
    setExternalLoading(true);
    setExternalError(null);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin: externalCrypto,
          amount: parseFloat(externalAmount),
          withdrawAddress: externalAddress,
          twoFactorCode: verifiedCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.withdrawalFailed);

      setExternalSuccess(true);
      setExternalAddress("");
      setExternalAmount("");
      await Promise.all([refreshBalances(), loadHistory()]);
      setTimeout(() => setExternalSuccess(false), 5000);
    } catch (error: any) {
      setExternalError(error.message || t.withdrawalFailed);
    } finally {
      setExternalLoading(false);
    }
  };

  // 2FA callback
  const handle2FAVerified = (verifiedCode?: string) => {
    if (pending2FAAction === "internal") executeInternalTransfer(verifiedCode);
    else if (pending2FAAction === "external") executeExternalWithdrawal(verifiedCode);
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-[#2F6F62] bg-[#2F6F62]/10";
      case "pending": return "text-[#BFA181] bg-[#BFA181]/10";
      case "failed": return "text-red-500 bg-red-500/10";
      default: return "text-slate-500 bg-slate-500/10";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return t.completed;
      case "pending": return t.pending;
      case "processing": return t.processing;
      case "failed": return t.failed;
      default: return status;
    }
  };

  // 2FA Gate
  if (show2FA) {
    return (
      <TwoFactorGate
        walletAddress={address || ""}
        isOpen={true}
        onClose={() => { setShow2FA(false); setPending2FAAction(null); }}
        onVerified={handle2FAVerified}
        lang={lang as any}
      />
    );
  }

  const cryptoList: WithdrawCrypto[] = ["USDT", "ETH", "XRP", "SOL", "BTC"];

  return (
    <div>
      {/* Withdrawable Assets Panel */}
      <WithdrawableAssetsPanel />

      {/* Withdrawal Type Selector */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
          {t.selectWithdrawalType}
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Internal */}
          <button
            onClick={() => setWithdrawalType("internal")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              withdrawalType === "internal" ? "border-[#BFA181] bg-[#BFA181]/5" : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
            }`}
          >
            <svg className={`w-5 h-5 mb-2 ${withdrawalType === "internal" ? "text-[#BFA181]" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.internalTransfer}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.internalDesc}</p>
          </button>

          {/* External */}
          <button
            onClick={() => setWithdrawalType("external")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              withdrawalType === "external" ? "border-[#BFA181] bg-[#BFA181]/5" : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
            }`}
          >
            <svg className={`w-5 h-5 mb-2 ${withdrawalType === "external" ? "text-[#BFA181]" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.externalWallet}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.externalDesc}</p>
          </button>

          {/* Physical */}
          <button
            onClick={() => setWithdrawalType("physical")}
            className={`relative p-4 rounded-xl border-2 text-left transition-all ${
              withdrawalType === "physical" ? "border-[#BFA181] bg-[#BFA181]/5" : "border-stone-200 dark:border-slate-800 opacity-60 cursor-not-allowed"
            }`}
            disabled
          >
            <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#BFA181]/20 text-[#BFA181]">
              {t.comingSoon}
            </span>
            <svg className="w-5 h-5 mb-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.physicalRedemption}</p>
            <p className="text-xs text-slate-500 mt-0.5">{t.physicalDesc}</p>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* INTERNAL TRANSFER FORM                 */}
      {/* ═══════════════════════════════════════ */}
      {withdrawalType === "internal" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          {/* Success Banner */}
          {internalSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-[#2F6F62]/10 border border-[#2F6F62]/30">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-[#2F6F62]">{t.transferSuccess}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form — 2 cols */}
            <div className="lg:col-span-2 space-y-5">
              {/* Recipient */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">{t.recipientAddress}</h3>
                <input
                  type="text"
                  value={internalRecipient}
                  onChange={(e) => setInternalRecipient(e.target.value)}
                  placeholder={t.enterRecipientAddress}
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181] font-mono text-sm"
                />
              </div>

              {/* Asset Selection */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">{t.selectAsset}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {transferableAssets.map((asset) => (
                    <button
                      key={asset.symbol}
                      onClick={() => setInternalAsset(asset.symbol)}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        internalAsset === asset.symbol
                          ? "border-[#BFA181] bg-[#BFA181]/10"
                          : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
                      }`}
                    >
                      <p className="font-semibold text-slate-800 dark:text-white text-sm">{asset.symbol}</p>
                      <p className="text-xs text-[#2F6F62] font-medium mt-0.5">{formatBalance(asset.balance, asset.symbol)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500">{t.amount}</h3>
                  {internalAsset && (
                    <button
                      onClick={() => {
                        const asset = transferableAssets.find((a) => a.symbol === internalAsset);
                        if (asset) setInternalAmount(asset.balance.toString());
                      }}
                      className="text-xs text-[#BFA181] hover:text-[#BFA181]/80 font-medium"
                    >
                      {t.max}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={internalAmount}
                  onChange={(e) => setInternalAmount(e.target.value)}
                  placeholder={t.enterAmount}
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181]"
                />
              </div>

              {/* No blockchain tx note */}
              <div className="p-3 rounded-lg bg-[#2F6F62]/5 border border-[#2F6F62]/20">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-[#2F6F62]">{t.noBlockchainTx}</p>
                </div>
              </div>
            </div>

            {/* Fee Preview — right col */}
            <div>
              <FeePreviewPanel crypto={internalAsset || "AUXM"} amount={parseFloat(internalAmount) || 0} isInternal={true} />
            </div>
          </div>

          {/* Error */}
          {internalError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{internalError}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleInternalContinue}
            disabled={internalLoading || !internalAsset || !internalAmount}
            className="w-full mt-4 py-4 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {internalLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t.sending}</>
            ) : (
              t.continue
            )}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* EXTERNAL WALLET FORM                   */}
      {/* ═══════════════════════════════════════ */}
      {withdrawalType === "external" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          {/* Success Banner */}
          {externalSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-[#2F6F62]/10 border border-[#2F6F62]/30">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-[#2F6F62]">{t.withdrawalSuccess}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form — 2 cols */}
            <div className="lg:col-span-2 space-y-5">
              {/* Crypto Selection */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">{t.selectCrypto}</h3>
                <div className="grid grid-cols-5 gap-2">
                  {cryptoList.map((c) => {
                    const info = WITHDRAW_CRYPTOS[c];
                    const balance = (balances as any)?.[c.toLowerCase()] || 0;
                    return (
                      <button
                        key={c}
                        onClick={() => { setExternalCrypto(c); setExternalAmount(""); }}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          externalCrypto === c ? "border-[#BFA181] bg-[#BFA181]/5" : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
                        }`}
                      >
                        <span className="text-lg" style={{ color: info.color }}>{info.icon}</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{c}</span>
                        <span className="text-[10px] text-slate-500">{balance > 0 ? formatAmount(balance, c) : "0"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-slate-500">{t.amount}</h3>
                  <button
                    onClick={() => {
                      const bal = (balances as any)?.[externalCrypto.toLowerCase()] || 0;
                      setExternalAmount(bal.toString());
                    }}
                    className="text-xs text-[#BFA181] hover:text-[#BFA181]/80 font-medium"
                  >
                    {t.max}
                  </button>
                </div>
                <input
                  type="number"
                  value={externalAmount}
                  onChange={(e) => setExternalAmount(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181]"
                />
                <p className="text-xs text-slate-500 mt-1">{t.network}: {WITHDRAW_CRYPTOS[externalCrypto].network}</p>
              </div>

              {/* Destination Address */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-2">{t.destinationAddress}</h3>
                <input
                  type="text"
                  value={externalAddress}
                  onChange={(e) => setExternalAddress(e.target.value)}
                  placeholder={externalCrypto === "BTC" ? "bc1q..." : externalCrypto === "XRP" ? "r..." : "0x..."}
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181] font-mono text-sm"
                />
              </div>

              {/* Custody Exit Warning */}
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-red-600 dark:text-red-400">{t.custodyExitWarning}</p>
                </div>
              </div>

              {/* Verify Address */}
              <div className="p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30">
                <p className="text-xs text-[#BFA181]">{t.verifyAddress}</p>
              </div>
            </div>

            {/* Fee Preview — right col */}
            <div>
              <FeePreviewPanel crypto={externalCrypto} amount={parseFloat(externalAmount) || 0} />
            </div>
          </div>

          {/* Error */}
          {externalError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{externalError}</p>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleExternalContinue}
            disabled={externalLoading || !externalAmount || !externalAddress}
            className="w-full mt-4 py-4 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {externalLoading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t.sending}</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> {t.confirmWithdrawal}</>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* PHYSICAL REDEMPTION - Placeholder       */}
      {/* ═══════════════════════════════════════ */}
      {withdrawalType === "physical" && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-8 mb-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#BFA181]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.physicalRedemption}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.contactDesk}</p>
          <div className="flex justify-center gap-3">
            <span className="px-3 py-1.5 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] text-xs font-semibold">{t.minGold}</span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold">{t.minSilver}</span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* WITHDRAWAL HISTORY                      */}
      {/* ═══════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
        <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.withdrawalHistory}</h3>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">{t.noWithdrawals}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10">
                  <svg className="w-5 h-5 text-red-500 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.sent} {tx.token}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {getStatusLabel(tx.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.timestamp)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-500">-{tx.amount} {tx.token}</p>
                  {tx.amountUsd && <p className="text-xs text-slate-500">${parseFloat(tx.amountUsd).toFixed(2)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WithdrawTab;
