"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";

// ============================================
// TRANSFERS PAGE - Deposit, Internal Transfer, External Redemption
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Transferler",
    subtitle: "Varlık yatırma ve transfer işlemleri",
    depositAddresses: "Yatırım Adresleri",
    depositAddressesDesc: "Tüm yatırımlar aşağıdaki platform adreslerine yapılmalıdır.",
    networkWarning: "Sadece belirtilen ağ üzerinden gönderin. Yanlış transferler kalıcı kayba neden olabilir.",
    copyAddress: "Adresi Kopyala",
    copied: "Kopyalandı!",
    internalTransfer: "Dahili Transfer",
    internalTransferDesc: "Auxite hesapları arasında varlık transferi",
    externalRedemption: "Harici İtfa",
    externalRedemptionDesc: "Varlıkları saklama dışına çıkar",
    physicalDelivery: "Fiziksel Teslimat",
    physicalDeliveryDesc: "Tahsisli metali fiziksel teslimata dönüştür",
    selectType: "Transfer türü seçin",
    recipient: "Alıcı",
    recipientAddress: "Alıcı Adresi",
    asset: "Varlık",
    amount: "Tutar",
    securityVerification: "Güvenlik Doğrulaması",
    whitelistRequired: "Beyaz liste gerekli",
    coolingPeriod: "24 saat bekleme süresi",
    twoFactorRequired: "2FA gerekli",
    custodyExitWarning: "Saklama dışına çıkan varlıklar artık ayrılmış saklama korumalarından yararlanamaz.",
    continue: "Devam Et",
    selectAsset: "Varlık seçin",
    enterAmount: "Tutar girin",
    enterAddress: "Adres girin",
    transferHistory: "Transfer Geçmişi",
    noTransfers: "Henüz transfer yok",
    pending: "Beklemede",
    completed: "Tamamlandı",
    processing: "İşleniyor",
    failed: "Başarısız",
    outboundTransfers: "Çıkış Transferleri",
    confirmTransfer: "Transferi Onayla",
    cancel: "İptal",
    transferSummary: "Transfer Özeti",
    from: "Gönderen",
    to: "Alıcı",
    token: "Token",
    twoFactorCode: "2FA Kodu",
    enter2FA: "6 haneli kodu girin",
    transferSuccess: "Transfer başarılı!",
    transferFailed: "Transfer başarısız",
    sending: "Gönderiliyor...",
    balance: "Bakiye",
    connectWallet: "Lütfen cüzdanınızı bağlayın",
    max: "Maks",
    deposit: "Yatırım",
    withdraw: "Çekim",
    transfer: "Transfer",
    sent: "Gönderildi",
    received: "Alındı",
  },
  en: {
    title: "Transfers",
    subtitle: "Asset deposits and transfer operations",
    depositAddresses: "Deposit Addresses",
    depositAddressesDesc: "All deposits must be sent to the platform addresses below.",
    networkWarning: "Only send via the specified network. Incorrect transfers may result in permanent loss.",
    copyAddress: "Copy Address",
    copied: "Copied!",
    internalTransfer: "Internal Transfer",
    internalTransferDesc: "Transfer assets between Auxite accounts",
    externalRedemption: "External Redemption",
    externalRedemptionDesc: "Move assets outside of custody",
    physicalDelivery: "Physical Delivery",
    physicalDeliveryDesc: "Convert allocated metal into physical delivery",
    selectType: "Select transfer type",
    recipient: "Recipient",
    recipientAddress: "Recipient Address",
    asset: "Asset",
    amount: "Amount",
    securityVerification: "Security Verification",
    whitelistRequired: "Whitelist required",
    coolingPeriod: "24-hour cooling period",
    twoFactorRequired: "2FA required",
    custodyExitWarning: "Assets leaving custody no longer benefit from segregation protections.",
    continue: "Continue",
    selectAsset: "Select asset",
    enterAmount: "Enter amount",
    enterAddress: "Enter address",
    transferHistory: "Transfer History",
    noTransfers: "No transfers yet",
    pending: "Pending",
    completed: "Completed",
    processing: "Processing",
    failed: "Failed",
    outboundTransfers: "Outbound Transfers",
    confirmTransfer: "Confirm Transfer",
    cancel: "Cancel",
    transferSummary: "Transfer Summary",
    from: "From",
    to: "To",
    token: "Token",
    twoFactorCode: "2FA Code",
    enter2FA: "Enter 6-digit code",
    transferSuccess: "Transfer successful!",
    transferFailed: "Transfer failed",
    sending: "Sending...",
    balance: "Balance",
    connectWallet: "Please connect your wallet",
    max: "Max",
    deposit: "Deposit",
    withdraw: "Withdraw",
    transfer: "Transfer",
    sent: "Sent",
    received: "Received",
  },
};

const transferTypes = [
  {
    id: "internal",
    icon: "🔄",
    security: ["whitelist"],
  },
  {
    id: "external",
    icon: "📤",
    security: ["whitelist", "cooling", "2fa"],
  },
  {
    id: "physical",
    icon: "📦",
    security: ["whitelist", "2fa"],
  },
];

// Deposit address type
interface DepositAddressInfo {
  address: string;
  network: string;
  memo?: string;
}

// Asset icons and info for deposit addresses
const depositAssetInfo: Record<string, { icon: string; name: string; color: string }> = {
  BTC: { icon: "₿", name: "Bitcoin", color: "bg-orange-500" },
  ETH: { icon: "Ξ", name: "Ethereum", color: "bg-blue-500" },
  USDT: { icon: "₮", name: "Tether", color: "bg-[#2F6F62]" },
  XRP: { icon: "✕", name: "XRP", color: "bg-slate-700" },
  SOL: { icon: "◎", name: "Solana", color: "bg-purple-500" },
};

// Transferable assets (from user balance)
interface TransferAsset {
  symbol: string;
  name: string;
  balance: number;
}

// Transaction type from API
interface TransactionRecord {
  id: string;
  type: string;
  token: string;
  amount: string;
  amountUsd?: string;
  status: string;
  timestamp: number;
  toAddress?: string;
  fromAddress?: string;
  txHash?: string;
}

export default function TransfersPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const { address: walletAddress, balances: walletBalances, refreshBalances } = useWallet();

  // Deposit addresses
  const [depositAddresses, setDepositAddresses] = useState<Record<string, DepositAddressInfo>>({});
  const [depositLoading, setDepositLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Transfer form
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  // Transfer execution
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [show2FAInput, setShow2FAInput] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState(false);

  // Transfer history
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Build assets list from real balances
  const transferableAssets: TransferAsset[] = walletBalances
    ? [
        { symbol: "AUXM", name: "Settlement Balance", balance: walletBalances.auxm || 0 },
        { symbol: "AUXG", name: "Auxite Gold", balance: walletBalances.auxg || 0 },
        { symbol: "AUXS", name: "Auxite Silver", balance: walletBalances.auxs || 0 },
        { symbol: "AUXPT", name: "Auxite Platinum", balance: walletBalances.auxpt || 0 },
        { symbol: "AUXPD", name: "Auxite Palladium", balance: walletBalances.auxpd || 0 },
        { symbol: "ETH", name: "Ethereum", balance: walletBalances.eth || 0 },
        { symbol: "BTC", name: "Bitcoin", balance: walletBalances.btc || 0 },
        { symbol: "USDT", name: "Tether", balance: walletBalances.usdt || 0 },
      ].filter((a) => a.balance > 0 || ["AUXM", "AUXG", "AUXS", "AUXPT"].includes(a.symbol))
    : [];

  // ──────────────────────────────────────────
  // Load deposit addresses from /api/deposit
  // ──────────────────────────────────────────
  useEffect(() => {
    const loadDepositAddresses = async () => {
      try {
        const res = await fetch("/api/deposit");
        const data = await res.json();
        if (data.success && data.addresses) {
          setDepositAddresses(data.addresses);
        }
      } catch (error) {
        console.error("Failed to load deposit addresses:", error);
      } finally {
        setDepositLoading(false);
      }
    };
    loadDepositAddresses();
  }, []);

  // ──────────────────────────────────────────
  // Check 2FA status
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!walletAddress) return;
    const check2FA = async () => {
      try {
        const res = await fetch("/api/security/2fa/status", {
          headers: { "x-wallet-address": walletAddress },
        });
        const data = await res.json();
        setTwoFAEnabled(data.enabled || false);
      } catch {
        setTwoFAEnabled(false);
      }
    };
    check2FA();
  }, [walletAddress]);

  // ──────────────────────────────────────────
  // Load transfer history
  // ──────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!walletAddress) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `/api/user/transactions?address=${walletAddress}&type=transfer_in,transfer_out,withdraw&limit=20`
      );
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ──────────────────────────────────────────
  // Copy address
  // ──────────────────────────────────────────
  const copyToClipboard = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(addr);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  // ──────────────────────────────────────────
  // Handle Continue → show confirmation
  // ──────────────────────────────────────────
  const handleContinue = () => {
    setTransferError(null);
    setTransferSuccess(false);

    if (!selectedAsset || !amount || parseFloat(amount) <= 0) {
      setTransferError(lang === "tr" ? "Varlık ve tutar seçin" : "Select asset and amount");
      return;
    }

    if (selectedType !== "physical" && !recipientAddress) {
      setTransferError(lang === "tr" ? "Alıcı adresi girin" : "Enter recipient address");
      return;
    }

    // Check balance
    const asset = transferableAssets.find((a) => a.symbol === selectedAsset);
    if (asset && parseFloat(amount) > asset.balance) {
      setTransferError(lang === "tr" ? "Yetersiz bakiye" : "Insufficient balance");
      return;
    }

    setShowConfirmation(true);
  };

  // ──────────────────────────────────────────
  // Execute transfer
  // ──────────────────────────────────────────
  const handleConfirmTransfer = async () => {
    if (!walletAddress) return;

    // Check 2FA
    if (twoFAEnabled && !twoFactorCode) {
      setShow2FAInput(true);
      setTransferError(lang === "tr" ? "2FA kodunu girin" : "Enter 2FA code");
      return;
    }

    setTransferLoading(true);
    setTransferError(null);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: walletAddress,
          toAddress: recipientAddress,
          token: selectedAsset,
          amount: parseFloat(amount),
          twoFactorCode: twoFactorCode || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle 2FA required
        if (data.code === "2FA_REQUIRED") {
          setShow2FAInput(true);
          setTransferError(lang === "tr" ? "2FA kodu gerekli" : "2FA code required");
          setTransferLoading(false);
          return;
        }
        throw new Error(data.error || t.transferFailed);
      }

      // Success
      setTransferSuccess(true);
      setShowConfirmation(false);
      setSelectedAsset(null);
      setAmount("");
      setRecipientAddress("");
      setTwoFactorCode("");
      setShow2FAInput(false);

      // Refresh balances and history
      await Promise.all([refreshBalances(), loadHistory()]);

      // Auto-hide success after 5s
      setTimeout(() => setTransferSuccess(false), 5000);
    } catch (error: any) {
      setTransferError(error.message || t.transferFailed);
    } finally {
      setTransferLoading(false);
    }
  };

  // ──────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────
  const getTypeLabel = (id: string) => {
    switch (id) {
      case "internal": return t.internalTransfer;
      case "external": return t.externalRedemption;
      case "physical": return t.physicalDelivery;
      default: return id;
    }
  };

  const getTypeDesc = (id: string) => {
    switch (id) {
      case "internal": return t.internalTransferDesc;
      case "external": return t.externalRedemptionDesc;
      case "physical": return t.physicalDeliveryDesc;
      default: return "";
    }
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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

  const formatBalance = (bal: number, symbol: string) => {
    if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(symbol)) {
      return `${bal.toFixed(4)}g`;
    }
    if (["BTC"].includes(symbol)) return bal.toFixed(6);
    if (["ETH"].includes(symbol)) return bal.toFixed(4);
    return bal.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Success Banner */}
        {transferSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-[#2F6F62]/10 border border-[#2F6F62]/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#2F6F62] flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-[#2F6F62]">{t.transferSuccess}</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* DEPOSIT ADDRESSES SECTION                              */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{t.depositAddresses}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.depositAddressesDesc}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>

          {/* Network Warning */}
          <div className="mb-4 p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-[#BFA181] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-[#BFA181] dark:text-[#BFA181]">{t.networkWarning}</p>
            </div>
          </div>

          {depositLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(depositAddresses).map(([coin, info]) => {
                const assetMeta = depositAssetInfo[coin] || { icon: "?", name: coin, color: "bg-slate-500" };
                return (
                  <div
                    key={coin}
                    className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${assetMeta.color} flex items-center justify-center text-white font-bold`}>
                        {assetMeta.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-white">{assetMeta.name}</h4>
                        <p className="text-xs text-slate-500">{info.network}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                        {info.address}
                      </code>
                      <button
                        onClick={() => copyToClipboard(info.address)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          copiedAddress === info.address
                            ? "bg-[#2F6F62] text-white"
                            : "bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#BFA181] hover:text-white"
                        }`}
                      >
                        {copiedAddress === info.address ? t.copied : t.copyAddress}
                      </button>
                    </div>

                    {info.memo && (
                      <div className="mt-2 px-3 py-2 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Memo/Tag: <span className="font-mono">{info.memo}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* OUTBOUND TRANSFERS SECTION                             */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t.outboundTransfers}</h2>
        </div>

        {/* Transfer Types */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <h3 className="text-xs font-semibold text-slate-500 mb-4">{t.selectType}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {transferTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setSelectedAsset(null);
                  setAmount("");
                  setRecipientAddress("");
                  setTransferError(null);
                  setTransferSuccess(false);
                  setShowConfirmation(false);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedType === type.id
                    ? "border-[#BFA181] bg-[#BFA181]/10"
                    : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
                }`}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <h4 className="font-semibold text-slate-800 dark:text-white mb-1">{getTypeLabel(type.id)}</h4>
                <p className="text-xs text-slate-500 mb-3">{getTypeDesc(type.id)}</p>

                {/* Security badges */}
                <div className="flex flex-wrap gap-1">
                  {type.security.includes("whitelist") && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400">
                      {t.whitelistRequired}
                    </span>
                  )}
                  {type.security.includes("cooling") && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#BFA181]/20 text-[#BFA181] dark:text-[#BFA181]">
                      {t.coolingPeriod}
                    </span>
                  )}
                  {type.security.includes("2fa") && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]">
                      {t.twoFactorRequired}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TRANSFER FORM - Only show if type is selected          */}
        {/* ═══════════════════════════════════════════════════════ */}
        {selectedType && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
            {/* Asset Selection */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">{t.asset}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {transferableAssets.map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => setSelectedAsset(asset.symbol)}
                    className={`p-3 rounded-lg border transition-all text-left ${
                      selectedAsset === asset.symbol
                        ? "border-[#BFA181] bg-[#BFA181]/10"
                        : "border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50"
                    }`}
                  >
                    <p className="font-semibold text-slate-800 dark:text-white">{asset.symbol}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{asset.name}</p>
                    <p className="text-xs text-[#2F6F62] font-medium mt-1">
                      {formatBalance(asset.balance, asset.symbol)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-500">{t.amount}</h3>
                {selectedAsset && (
                  <button
                    onClick={() => {
                      const asset = transferableAssets.find((a) => a.symbol === selectedAsset);
                      if (asset) setAmount(asset.balance.toString());
                    }}
                    className="text-xs text-[#BFA181] hover:text-[#BFA181]/80 font-medium"
                  >
                    {t.max}
                  </button>
                )}
              </div>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t.enterAmount}
                className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181]"
              />
            </div>

            {/* Recipient Address - Only for internal/external */}
            {selectedType !== "physical" && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-slate-500 mb-3">{t.recipientAddress}</h3>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder={t.enterAddress}
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181] font-mono text-sm"
                />
              </div>
            )}

            {/* Custody Exit Warning - Only for external */}
            {selectedType === "external" && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm text-red-600 dark:text-red-400">{t.custodyExitWarning}</p>
                </div>
              </div>
            )}

            {/* Security Verification */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">{t.securityVerification}</h3>
              <div className="space-y-2">
                {transferTypes.find((tt) => tt.id === selectedType)?.security.map((sec) => (
                  <div key={sec} className="flex items-center gap-2 p-3 bg-stone-100 dark:bg-slate-800 rounded-lg">
                    <div className="w-5 h-5 rounded-full border-2 border-[#2F6F62] flex items-center justify-center">
                      <svg className="w-3 h-3 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {sec === "whitelist" && t.whitelistRequired}
                      {sec === "cooling" && t.coolingPeriod}
                      {sec === "2fa" && t.twoFactorRequired}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Error */}
            {transferError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-600 dark:text-red-400">{transferError}</p>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!selectedAsset || !amount}
              className="w-full py-4 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
            >
              {t.continue}
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CONFIRMATION MODAL                                     */}
        {/* ═══════════════════════════════════════════════════════ */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">{t.transferSummary}</h3>

              {/* Summary */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{t.token}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{selectedAsset}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{t.amount}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{amount}</span>
                </div>
                {recipientAddress && (
                  <div className="py-2 border-b border-stone-100 dark:border-slate-800">
                    <span className="text-sm text-slate-500 block mb-1">{t.to}</span>
                    <span className="text-xs font-mono text-slate-800 dark:text-white break-all">{recipientAddress}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500">{t.from}</span>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "—"}
                  </span>
                </div>
              </div>

              {/* 2FA Input */}
              {(twoFAEnabled || show2FAInput) && (
                <div className="mb-6">
                  <h4 className="text-xs font-semibold text-slate-500 mb-2">{t.twoFactorCode}</h4>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder={t.enter2FA}
                    maxLength={6}
                    className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-center text-xl tracking-widest font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181]"
                  />
                </div>
              )}

              {/* Error in modal */}
              {transferError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-600 dark:text-red-400">{transferError}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setTransferError(null);
                    setTwoFactorCode("");
                    setShow2FAInput(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleConfirmTransfer}
                  disabled={transferLoading}
                  className="flex-1 py-3 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {transferLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t.sending}
                    </div>
                  ) : (
                    t.confirmTransfer
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* TRANSFER HISTORY                                       */}
        {/* ═══════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.transferHistory}</h3>

          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-slate-500 dark:text-slate-400">{t.noTransfers}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isSent = tx.type === "transfer_out" || tx.type === "withdraw";
                return (
                  <div
                    key={tx.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-100 dark:border-slate-800"
                  >
                    {/* Direction Icon */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSent ? "bg-red-500/10" : "bg-[#2F6F62]/10"
                    }`}>
                      <svg
                        className={`w-5 h-5 ${isSent ? "text-red-500 rotate-45" : "text-[#2F6F62] -rotate-45"}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                      </svg>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {isSent ? t.sent : t.received} {tx.token}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.timestamp)}</p>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${isSent ? "text-red-500" : "text-[#2F6F62]"}`}>
                        {isSent ? "-" : "+"}{tx.amount} {tx.token}
                      </p>
                      {tx.amountUsd && (
                        <p className="text-xs text-slate-500">${parseFloat(tx.amountUsd).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
