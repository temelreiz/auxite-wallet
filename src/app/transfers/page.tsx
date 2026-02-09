"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// TRANSFERS PAGE - Not "Withdraw"!
// Internal transfers & external redemption
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Transferler",
    subtitle: "Varlık yatırma ve transfer işlemleri",
    depositAddresses: "Yatırım Adresleri",
    depositAddressesDesc: "Her kasa için özel saklama adresleri atanmıştır.",
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
    outboundTransfers: "Çıkış Transferleri",
    noVault: "Henüz kasanız yok",
    createVault: "Kasa Oluştur",
  },
  en: {
    title: "Transfers",
    subtitle: "Asset deposits and transfer operations",
    depositAddresses: "Deposit Addresses",
    depositAddressesDesc: "Each vault is assigned dedicated custody addresses for secure transfers.",
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
    outboundTransfers: "Outbound Transfers",
    noVault: "No vault found",
    createVault: "Create Vault",
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

const assets = [
  { symbol: "AUXG", name: "Gold", balance: "2.5000g" },
  { symbol: "AUXS", name: "Silver", balance: "50.0000g" },
  { symbol: "AUXPT", name: "Platinum", balance: "0.5000g" },
  { symbol: "AUXM", name: "Settlement Balance", balance: "5,000.00" },
];

// Deposit address type
interface DepositAddressInfo {
  asset: string;
  network: string;
  address: string;
  tag?: string;
}

// Asset icons and info
const assetInfo: Record<string, { icon: string; name: string; color: string }> = {
  BTC: { icon: "₿", name: "Bitcoin", color: "bg-orange-500" },
  ETH: { icon: "Ξ", name: "Ethereum", color: "bg-blue-500" },
  USDC: { icon: "$", name: "USD Coin", color: "bg-blue-400" },
  USDT: { icon: "₮", name: "Tether", color: "bg-[#2F6F62]" },
};

export default function TransfersPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [depositAddresses, setDepositAddresses] = useState<DepositAddressInfo[]>([]);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [hasVault, setHasVault] = useState(false);

  // Load vault and deposit addresses
  useEffect(() => {
    const loadVaultData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/custody/vault", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success && data.vault) {
          setHasVault(true);
          setDepositAddresses(data.addresses || []);
          setBalances(data.balances || {});
        }
      } catch (error) {
        console.error("Failed to load vault:", error);
      } finally {
        setLoading(false);
      }
    };

    loadVaultData();
  }, []);

  // Copy address to clipboard
  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

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

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Deposit Addresses Section */}
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

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !hasVault ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t.noVault}</p>
              <button className="px-6 py-2 bg-[#BFA181] hover:bg-[#BFA181] text-white rounded-lg font-medium transition-colors">
                {t.createVault}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {depositAddresses.map((addr) => {
                const info = assetInfo[addr.asset] || { icon: "?", name: addr.asset, color: "bg-slate-500" };
                return (
                  <div
                    key={addr.asset}
                    className="p-4 rounded-xl border border-stone-200 dark:border-slate-700 hover:border-[#BFA181]/50 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full ${info.color} flex items-center justify-center text-white font-bold`}>
                        {info.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 dark:text-white">{info.name}</h4>
                        <p className="text-xs text-slate-500">{addr.network} Network</p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">
                          {balances[addr.asset] || "0.00"}
                        </p>
                        <p className="text-xs text-slate-500">{addr.asset}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                        {addr.address}
                      </code>
                      <button
                        onClick={() => copyToClipboard(addr.address)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          copiedAddress === addr.address
                            ? "bg-[#2F6F62] text-white"
                            : "bg-stone-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#BFA181] hover:text-white"
                        }`}
                      >
                        {copiedAddress === addr.address ? t.copied : t.copyAddress}
                      </button>
                    </div>

                    {addr.tag && (
                      <div className="mt-2 px-3 py-2 bg-blue-500/10 rounded-lg">
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          Memo/Tag: <span className="font-mono">{addr.tag}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Outbound Transfers Section */}
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
                onClick={() => setSelectedType(type.id)}
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

        {/* Transfer Form - Only show if type is selected */}
        {selectedType && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
            {/* Asset Selection */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">{t.asset}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {assets.map((asset) => (
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
                    <p className="text-xs text-slate-500">{asset.balance}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-slate-500 mb-3">{t.amount}</h3>
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
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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

            {/* Continue Button */}
            <button className="w-full py-4 rounded-xl bg-[#BFA181] hover:bg-[#BFA181] text-white font-semibold transition-colors">
              {t.continue}
            </button>
          </div>
        )}

        {/* Transfer History */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.transferHistory}</h3>
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400">{t.noTransfers}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
