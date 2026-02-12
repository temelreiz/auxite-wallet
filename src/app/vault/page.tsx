"use client";

// ============================================
// VAULT - Main Holdings Screen
// Digital Private Bank Style - UBS meets Digital Gold
// Synced with Mobile (auxite-vault)
// ============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import TopNav from "@/components/TopNav";
import LiquidateModal from "@/components/LiquidateModal";
import { useLanguage } from "@/components/LanguageContext";

// Metal icons
const metalIcons: Record<string, string> = {
  AUXG: "/images/metals/gold.png",
  AUXS: "/images/metals/silver.png",
  AUXPT: "/images/metals/platinum.png",
  AUXPD: "/images/metals/palladium.png",
};

// Crypto asset definitions — institutional liquidity instruments
const cryptoAssets = [
  { symbol: "USDT", name: "Tether", color: "#26A17B", icon: "₮" },
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A", icon: "₿" },
  { symbol: "ETH", name: "Ethereum", color: "#627EEA", icon: "Ξ" },
  { symbol: "SOL", name: "Solana", color: "#9945FF", icon: "◎" },
  { symbol: "XRP", name: "Ripple", color: "#23292F", icon: "✕" },
];

interface MetalHolding {
  symbol: string;
  name: string;
  allocated: number;
  available: number;
  total: number;
  price: number;
  value: number;
}

// ============================================
// TRANSLATIONS - Synced with Mobile
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    // Header - Custody Status
    custodyStatus: "Saklama Durumu",
    statusOffline: "Çevrimdışı",
    statusOnline: "Çevrimiçi",
    connectPrompt: "Güvenli varlık altyapısını aktifleştirmek için bağlanın",

    // Hero - Client Assets Under Custody
    clientAssetsUnderCustody: "SAKLAMA ALTINDAKİ MÜŞTERİ VARLIKLARI",
    heldWithinBankruptcy: "İflastan korumalı saklama yapıları altında tutulmaktadır.",
    lastStatement: "Son Özet",

    // Mini Balance Sheet — Institutional Metrics
    allocatedAssets: "TAHSİSLİ VARLIKLAR",
    allocatedAssetsDesc: "Adınıza ayrılmış saklama kasalarında tutulan fiziksel metaller.",
    availableLiquidity: "KULLANILABİLİR LİKİDİTE",
    availableLiquidityDesc: "Transfer, tahsis veya teslimat için hemen kullanılabilir varlıklar.",
    encumberedAssets: "TEMİNATLI VARLIKLAR",
    encumberedAssetsDesc: "Getiri programları, takas veya teslimat yükümlülüklerine bağlı varlıklar.",
    assetUtilization: "VARLIK KULLANIM ORANI",

    // Trust badges
    fullyAllocated: "Tam Tahsisli",
    fullyAllocatedDesc: "Her gram metal, benzersiz olarak tanımlanmış fiziksel külçelere karşılık gelir. Havuzlanmış varlık yok.",
    segregated: "Ayrılmış",
    segregatedDesc: "Müşteri varlıkları kurumsal bilançodan yasal olarak ayrılmıştır.",
    bankruptcyRemote: "İflastan Korumalı",
    bankruptcyRemoteDesc: "Kurumsal iflas durumunda bile varlıklarınız korunur ve erişilebilir kalır.",
    audited: "Denetlenmiş",
    auditedDesc: "Bağımsız üçüncü taraf denetçiler tarafından düzenli olarak doğrulanır.",
    close: "Kapat",

    // Capital Actions
    capitalActions: "SERMAYE İŞLEMLERİ",
    fundSettlement: "Takas Fonla",
    allocateMetal: "Metal Tahsis Et",
    enterYield: "Getiriye Gir",
    transfer: "Transfer",

    // Holdings
    holdings: "Varlıklarınız",
    metalsAllocated: "Metaller (Tahsisli)",
    liquidityCashCrypto: "Likidite (Nakit & Kripto)",
    allocated: "Tahsisli",
    noHoldings: "Henüz varlık yok",
    available: "Kullanılabilir",

    // Buy / Sell
    sell: "Sat",
    sellGold: "Altin Sat",
    sellSilver: "Gumus Sat",
    sellPlatinum: "Platin Sat",
    sellPalladium: "Paladyum Sat",
    buyGold: "Altin Al",
    buySilver: "Gumus Al",
    buyPlatinum: "Platin Al",
    buyPalladium: "Paladyum Al",

    // Holdings Detail
    holdingsLabel: "Varliklar",
    avgCost: "Ort. Maliyet",
    market: "Piyasa",
    unrealizedPL: "Gerceklesmemis K/Z",
    livePricing: "Canli Fiyat",

    // Physical Redemption
    physicalRedemption: "Fiziksel Teslimat",
    physicalRedemptionDesc: "Tahsisli metali fiziksel teslimata dönüştürün",

    // Protection Status
    protectionStatus: "KORUMA DURUMU",
    protectionLevel: "Koruma Seviyesi",
    elite: "ELITE",
    vaultSuspended: "KASA ASKIYA ALINDI",
    vaultId: "Kasa ID",

    // Settlement Balance (AUXM)
    settlementBalance: "Takas Bakiyesi",
    auxmUnit: "AUXM",
    auxmPrimaryCapital: "Sermaye hareketi için dahili takas birimi",
    fullyReserved: "Tam Rezervli",
    offBalanceSheet: "Bilanço Dışı",
    fundVault: "Kasayı Fonla",
    auxmDisclaimer: "AUXM, yalnızca Auxite altyapısı içinde kullanılan dahili takas birimidir. Kripto para veya transfer edilebilir varlık değildir.",

    // Capital Clarity
    capitalClarity: "SERMAYE DURUMU",

    // Trust Messages
    institutionalArchitecture: "Kurumsal saklama mimarisi üzerine inşa edilmiştir.",
    custodySeparation: "Saklama altındaki varlıklar hiçbir zaman kurumsal fonlarla birleştirilmez.",
    notRehypothecated: "Müşteri varlıkları asla yeniden teminatlandırılmaz.",
    unallocatedCapital: "TAHSİS EDİLMEMİŞ SERMAYE",
    availableForAllocation: "Tahsis için kullanılabilir",
    denominatedInUsd: "Takas amaçları için USD değerinde ifade edilir.",

    // Encumbered Breakdown
    encumberedBreakdown: "Teminat Dağılımı",
    yieldPrograms: "Getiri Programları",
    pendingDelivery: "Bekleyen Fiziksel Teslimat",
    tradeSettlement: "Takas İşlemleri",
  },
  en: {
    custodyStatus: "Custody Status",
    statusOffline: "Offline",
    statusOnline: "Online",
    connectPrompt: "Connect to activate safeguarded asset infrastructure",

    // Hero
    clientAssetsUnderCustody: "CLIENT ASSETS UNDER CUSTODY",
    heldWithinBankruptcy: "Held within bankruptcy-remote custody structures.",
    lastStatement: "Last Statement",

    // Mini Balance Sheet
    allocatedAssets: "ALLOCATED ASSETS",
    allocatedAssetsDesc: "Physical metals held in your name within segregated vault structures.",
    availableLiquidity: "AVAILABLE LIQUIDITY",
    availableLiquidityDesc: "Assets immediately available for transfer, allocation, or redemption.",
    encumberedAssets: "ENCUMBERED ASSETS",
    encumberedAssetsDesc: "Assets currently committed to yield programs, settlement, or delivery obligations.",
    assetUtilization: "ASSET UTILIZATION",

    fullyAllocated: "Fully Allocated",
    fullyAllocatedDesc: "Every gram of metal corresponds to uniquely identified physical bars. No pooled assets.",
    segregated: "Segregated",
    segregatedDesc: "Client assets are legally separated from corporate balance sheets.",
    bankruptcyRemote: "Bankruptcy Remote",
    bankruptcyRemoteDesc: "Your assets remain protected and accessible even in the event of corporate insolvency.",
    audited: "Audited",
    auditedDesc: "Regularly verified by independent third-party auditors.",
    close: "Close",
    capitalActions: "CAPITAL ACTIONS",
    fundSettlement: "Fund Settlement",
    allocateMetal: "Allocate Metal",
    enterYield: "Enter Yield",
    transfer: "Transfer",
    holdings: "Your Holdings",
    metalsAllocated: "Metals (Allocated)",
    liquidityCashCrypto: "Liquidity (Cash & Crypto)",
    allocated: "Allocated",
    noHoldings: "No holdings yet",
    available: "Available",
    sell: "Sell",
    sellGold: "Sell Gold",
    sellSilver: "Sell Silver",
    sellPlatinum: "Sell Platinum",
    sellPalladium: "Sell Palladium",
    buyGold: "Buy Gold",
    buySilver: "Buy Silver",
    buyPlatinum: "Buy Platinum",
    buyPalladium: "Buy Palladium",

    // Holdings Detail
    holdingsLabel: "Holdings",
    avgCost: "Avg Cost",
    market: "Market",
    unrealizedPL: "Unrealized P/L",
    livePricing: "Live Pricing",
    physicalRedemption: "Physical Redemption",
    physicalRedemptionDesc: "Convert allocated metal into physical delivery",
    protectionStatus: "PROTECTION STATUS",
    protectionLevel: "Protection Level",
    elite: "ELITE",
    vaultSuspended: "VAULT SUSPENDED",
    vaultId: "Vault ID",
    settlementBalance: "Settlement Balance",
    auxmUnit: "AUXM",
    auxmPrimaryCapital: "Internal settlement unit for capital movement",
    fullyReserved: "Fully Reserved",
    offBalanceSheet: "Off-Balance Sheet",
    fundVault: "Fund Vault",
    auxmDisclaimer: "AUXM is an internal settlement unit used exclusively within the Auxite infrastructure. It is not a cryptocurrency or a transferable asset.",
    capitalClarity: "CAPITAL STATUS",
    institutionalArchitecture: "Built on institutional custody architecture.",
    custodySeparation: "Assets under custody are never commingled with corporate funds.",
    notRehypothecated: "Client assets are never rehypothecated.",
    unallocatedCapital: "UNALLOCATED CAPITAL",
    availableForAllocation: "Available for Allocation",
    denominatedInUsd: "Denominated in USD value for settlement purposes.",

    // Encumbered Breakdown
    encumberedBreakdown: "Encumbered Breakdown",
    yieldPrograms: "Yield Programs",
    pendingDelivery: "Pending Physical Delivery",
    tradeSettlement: "Trade Settlement",
  },
};

export default function VaultPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  // Auxite Vault Wallet - no external wallet connect
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load wallet address from localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) {
      setAddress(savedAddress);
    }
  }, []);
  const [totalVaultValue, setTotalVaultValue] = useState(0);
  const [allocatedHoldings, setAllocatedHoldings] = useState(0);
  const [encumberedAssetsValue, setEncumberedAssetsValue] = useState(0);
  const [liquidityValue, setLiquidityValue] = useState(0);
  const [holdings, setHoldings] = useState<MetalHolding[]>([]);
  const [settlementBalance, setSettlementBalance] = useState(0);
  const [cryptoBalances, setCryptoBalances] = useState<Record<string, number>>({});
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [trustBadgeModal, setTrustBadgeModal] = useState<string | null>(null);
  const [showEncumberedModal, setShowEncumberedModal] = useState(false);
  const [encumberedBreakdown, setEncumberedBreakdown] = useState({ yieldPrograms: 0, pendingDelivery: 0, tradeSettlement: 0 });
  const [sellModal, setSellModal] = useState<{ open: boolean; metal: MetalHolding | null }>({ open: false, metal: null });
  const [custodyStatus, setCustodyStatus] = useState<'active' | 'pending' | 'offline'>('offline');
  const [custodyProvider, setCustodyProvider] = useState<string>('');
  const [realVaultId, setRealVaultId] = useState<string | null>(null);

  const vaultId = realVaultId || (address ? `AUX-${address.slice(2, 8).toUpperCase()}` : null);
  const protectionLevel = custodyStatus === 'active' ? 85 : 50;

  // Fetch custody vault data
  useEffect(() => {
    const fetchCustodyData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const response = await fetch("/api/custody/vault", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (data.success && data.vault) {
          setCustodyStatus(data.vault.status === 'active' ? 'active' : 'pending');
          setCustodyProvider(data.vault.provider || 'fireblocks');
          setRealVaultId(data.vault.id?.slice(0, 16));
        }
      } catch (error) {
        console.error("Failed to fetch custody data:", error);
      }
    };

    fetchCustodyData();
  }, []);

  // Fetch vault data
  const fetchVaultData = useCallback(async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      const [balanceRes, allocRes, priceRes, stakeRes, cryptoRes] = await Promise.all([
        fetch(`/api/user/balance?address=${address}`),
        fetch(`/api/allocations?address=${address}`),
        fetch(`/api/prices?chain=84532`),
        fetch(`/api/stakes?address=${address}`),
        fetch(`/api/crypto`),
      ]);

      const balanceData = await balanceRes.json().catch(() => ({ success: false, balances: {} }));
      const allocData = await allocRes.json().catch(() => ({ success: false, allocations: [], summary: {} }));
      const priceData = await priceRes.json().catch(() => ({ success: false, basePrices: {} }));
      const stakeData = await stakeRes.json().catch(() => ({ success: false, stakes: [] }));
      const cryptoData = await cryptoRes.json().catch(() => ({}));

      const metalSymbols = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
      const metalNames: Record<string, string> = {
        AUXG: "Gold",
        AUXS: "Silver",
        AUXPT: "Platinum",
        AUXPD: "Palladium",
      };

      let totalValue = 0;
      let allocatedValue = 0;
      let encumberedValue = 0;
      const holdingsList: MetalHolding[] = [];

      for (const symbol of metalSymbols) {
        const lowerSymbol = symbol.toLowerCase();
        const balance = balanceData.balances?.[lowerSymbol] || 0;
        const allocatedGrams = allocData.summary?.[symbol] || 0;
        const price = priceData.basePrices?.[symbol] || 0;

        const availableGrams = Math.max(0, balance - allocatedGrams);
        const value = balance * price;
        const allocValue = allocatedGrams * price;

        holdingsList.push({
          symbol,
          name: metalNames[symbol],
          allocated: allocatedGrams,
          available: availableGrams,
          total: balance,
          price,
          value,
        });

        totalValue += value;
        allocatedValue += allocValue;
      }

      // Encumbered positions (yield programs)
      let yieldProgramsValue = 0;
      if (stakeData.success && stakeData.stakes) {
        for (const stake of stakeData.stakes) {
          const amount = parseFloat(stake.amount) || 0;
          const metal = stake.metal?.toUpperCase() || "AUXG";
          const price = priceData.basePrices?.[metal] || 0;
          yieldProgramsValue += amount * price;
        }
      }
      encumberedValue = yieldProgramsValue;
      setEncumberedBreakdown({
        yieldPrograms: yieldProgramsValue,
        pendingDelivery: 0,
        tradeSettlement: 0,
      });

      // Crypto prices
      const cPrices: Record<string, number> = { usdt: 1.0 };
      if (cryptoData.bitcoin?.usd) cPrices.btc = cryptoData.bitcoin.usd;
      if (cryptoData.ethereum?.usd) cPrices.eth = cryptoData.ethereum.usd;
      if (cryptoData.solana?.usd) cPrices.sol = cryptoData.solana.usd;
      if (cryptoData.ripple?.usd) cPrices.xrp = cryptoData.ripple.usd;
      setCryptoPrices(cPrices);

      // Crypto balances from balance API
      const cryptoSymbols = ["usdt", "btc", "eth", "sol", "xrp"];
      const cBalances: Record<string, number> = {};
      let cryptoTotalValue = 0;
      for (const sym of cryptoSymbols) {
        const bal = balanceData.balances?.[sym] || 0;
        cBalances[sym] = bal;
        cryptoTotalValue += bal * (cPrices[sym] || 0);
      }
      setCryptoBalances(cBalances);

      // AUXM Settlement Balance
      const auxmBalance = balanceData.balances?.auxm || balanceData.balances?.AUXM || 0;
      setSettlementBalance(auxmBalance);

      // Liquidity = AUXM + crypto
      const totalLiquidity = auxmBalance + cryptoTotalValue;
      setLiquidityValue(totalLiquidity);

      // Total vault value = metals + crypto + AUXM
      totalValue += cryptoTotalValue + auxmBalance;

      setHoldings(holdingsList);
      setTotalVaultValue(totalValue);
      setAllocatedHoldings(allocatedValue);
      setEncumberedAssetsValue(encumberedValue);
    } catch (error) {
      console.warn("Valuation temporarily unavailable:", error);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchVaultData();
    const interval = setInterval(fetchVaultData, 30000);
    return () => clearInterval(interval);
  }, [fetchVaultData]);

  const formatCurrency = (value: number) => {
    return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatGrams = (grams: number) => {
    if (grams >= 1) return grams.toFixed(2) + "g";
    return (grams * 1000).toFixed(1) + "mg";
  };

  const utilizationRatio = totalVaultValue > 0
    ? ((encumberedAssetsValue / totalVaultValue) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Hero Card - Client Assets Under Custody */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-stone-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-2">
            {t.clientAssetsUnderCustody}
          </p>
          {loading ? (
            <div className="h-12 flex items-center">
              <div className="w-6 h-6 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <p className="text-4xl font-bold text-slate-800 dark:text-white mb-1">
              {formatCurrency(totalVaultValue)}
            </p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{t.heldWithinBankruptcy}</p>

          {/* Statement Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs text-[#2F6F62] font-medium">{t.lastStatement}: February 2026</span>
          </div>

          {/* Stats Row — Mini Balance Sheet: Allocated | Liquidity | Encumbered | Utilization */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t border-stone-200 dark:border-slate-700">
            <div className="text-center">
              <p className="text-lg font-semibold text-[#BFA181]">{formatCurrency(allocatedHoldings)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.allocatedAssets}</p>
            </div>
            <div className="text-center border-x border-stone-200 dark:border-slate-700">
              <p className="text-lg font-semibold text-[#2F6F62]">{formatCurrency(liquidityValue)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.availableLiquidity}</p>
            </div>
            <div className="text-center border-r border-stone-200 dark:border-slate-700">
              <button onClick={() => setShowEncumberedModal(true)} className="hover:opacity-80 transition-opacity">
                <p className="text-lg font-semibold text-orange-500">{formatCurrency(encumberedAssetsValue)}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.encumberedAssets}</p>
              </button>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-500">{utilizationRatio}%</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide">{t.assetUtilization}</p>
            </div>
          </div>
        </div>

        {/* Institutional Architecture Message */}
        <div className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 rounded-xl border border-[#BFA181]/30">
          <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span className="text-sm font-semibold text-[#BFA181]">{t.institutionalArchitecture}</span>
        </div>

        {/* Capital Clarity Bar — Allocated | Liquidity | Encumbered */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.capitalClarity}
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#BFA181]" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(allocatedHoldings)}</p>
                <p className="text-[10px] text-slate-500">{t.allocatedAssets}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2F6F62]" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(liquidityValue)}</p>
                <p className="text-[10px] text-slate-500">{t.availableLiquidity}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCurrency(encumberedAssetsValue)}</p>
                <p className="text-[10px] text-slate-500">{t.encumberedAssets}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Protection Status Widget */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                {t.protectionStatus}
              </p>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${
                custodyStatus === 'active'
                  ? 'bg-[#2F6F62]/15 text-[#2F6F62]'
                  : custodyStatus === 'pending'
                  ? 'bg-[#BFA181]/15 text-[#BFA181]'
                  : 'bg-slate-500/15 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  custodyStatus === 'active' ? 'bg-[#2F6F62]' :
                  custodyStatus === 'pending' ? 'bg-[#BFA181]' : 'bg-slate-500'
                }`} />
                {custodyStatus === 'active' ? 'Active' : custodyStatus === 'pending' ? 'Pending' : 'Offline'}
              </span>
            </div>
            {vaultId && (
              <span className="px-2 py-1 bg-[#BFA181]/15 rounded text-[10px] font-semibold text-[#BFA181]">
                {vaultId}
              </span>
            )}
          </div>

          {/* Protection Level Meter */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-800 dark:text-white">{t.protectionLevel}</span>
              <span className={`text-sm font-bold ${protectionLevel >= 80 ? "text-[#2F6F62]" : "text-[#BFA181]"}`}>
                {protectionLevel >= 80 ? t.elite : `${protectionLevel}%`}
              </span>
            </div>
            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${protectionLevel >= 80 ? "bg-[#2F6F62]" : "bg-[#BFA181]"}`}
                style={{ width: `${protectionLevel}%` }}
              />
            </div>
          </div>

          {/* Trust Checklist */}
          <div className="flex flex-wrap gap-3">
            {[
              { key: "fullyAllocated", label: t.fullyAllocated },
              { key: "bankruptcyRemote", label: t.bankruptcyRemote },
              { key: "segregated", label: t.segregated },
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Strip - 4 Badges */}
        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 rounded-xl border border-[#2F6F62]/30 dark:border-[#2F6F62]/30">
          {[
            { key: "fullyAllocated", label: t.fullyAllocated },
            { key: "segregated", label: t.segregated },
            { key: "bankruptcyRemote", label: t.bankruptcyRemote },
            { key: "audited", label: t.audited },
          ].map((badge, i) => (
            <button
              key={badge.key}
              onClick={() => setTrustBadgeModal(badge.key)}
              className="flex items-center gap-1 px-2 py-1 hover:bg-[#2F6F62]/20 dark:hover:bg-[#2F6F62]/20 rounded transition-colors"
            >
              <svg className="w-3 h-3 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400">{badge.label}</span>
              {i < 3 && <span className="ml-2 text-slate-300 dark:text-slate-600">|</span>}
            </button>
          ))}
        </div>

        {/* Unallocated Capital (AUXM) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
              {t.unallocatedCapital}
            </p>
            <span className="px-2 py-1 bg-[#2F6F62]/15 rounded text-[10px] font-semibold text-[#2F6F62]">
              {t.availableForAllocation}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-indigo-500/15 flex items-center justify-center">
                <span className="text-lg text-indigo-500">◈</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {t.settlementBalance} ({t.auxmUnit})
                </p>
                <p className="text-[11px] text-slate-500">{t.denominatedInUsd}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-800 dark:text-white">
                {settlementBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs font-semibold text-indigo-500">{t.auxmUnit}</p>
            </div>
          </div>

          {/* AUXM Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="flex items-center gap-1 px-2 py-1 bg-[#2F6F62]/15 rounded text-[9px] font-semibold text-[#2F6F62]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t.fullyReserved}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-indigo-500/15 rounded text-[9px] font-semibold text-indigo-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t.offBalanceSheet}
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-[#BFA181]/15 rounded text-[9px] font-semibold text-[#BFA181]">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t.bankruptcyRemote}
            </span>
          </div>

          {/* AUXM Disclaimer */}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mb-4">{t.auxmDisclaimer}</p>

          {/* Fund Vault Button */}
          <Link
            href="/fund-vault"
            className="flex items-center justify-center gap-2 w-full py-3 border border-indigo-500 rounded-xl text-indigo-500 font-semibold hover:bg-indigo-500/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t.fundVault}
          </Link>
        </div>

        {/* Trust Messages */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 bg-[#2F6F62]/10 dark:bg-[#2F6F62]/10 rounded-xl border border-[#2F6F62]/30 dark:border-[#2F6F62]/30">
            <svg className="w-4 h-4 text-[#2F6F62] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-semibold text-[#2F6F62] dark:text-[#2F6F62]">{t.custodySeparation}</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-[#BFA181]/10 dark:bg-[#BFA181]/10 rounded-xl border border-[#BFA181]/30 dark:border-[#BFA181]/30">
            <svg className="w-4 h-4 text-[#BFA181] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs font-semibold text-[#BFA181] dark:text-[#BFA181]">{t.notRehypothecated}</span>
          </div>
        </div>

        {/* Capital Actions */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider mb-3">
            {t.capitalActions}
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: "wallet", label: t.fundSettlement, href: "/fund-vault" },
              { icon: "cube", label: t.allocateMetal, href: "/allocate" },
              { icon: "trending-up", label: t.enterYield, href: "/stake" },
              { icon: "arrows", label: t.transfer, href: "/transfers" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex flex-col items-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-[#BFA181] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center mb-2">
                  {action.icon === "wallet" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  )}
                  {action.icon === "cube" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  )}
                  {action.icon === "trending-up" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  )}
                  {action.icon === "arrows" && (
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Holdings Section — Split into Metals + Liquidity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">{t.holdings}</h3>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Section 1 — Metals (Allocated) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#BFA181]" />
                  <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                    {t.metalsAllocated}
                  </h4>
                </div>

                {holdings.length === 0 ? (
                  <p className="text-center py-6 text-slate-500 dark:text-slate-400">{t.noHoldings}</p>
                ) : (
                  <div className="space-y-3">
                    {holdings.map((holding) => (
                      <div
                        key={holding.symbol}
                        className="p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Link
                          href={`/asset/${holding.symbol}`}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-[#BFA181]/10 flex items-center justify-center relative">
                              {metalIcons[holding.symbol] ? (
                                <Image
                                  src={metalIcons[holding.symbol]}
                                  alt={holding.name}
                                  width={28}
                                  height={28}
                                  className="object-contain"
                                />
                              ) : (
                                <span className="text-[#BFA181] font-bold">{holding.symbol[0]}</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white">{holding.name}</p>
                                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#2F6F62]/10 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2F6F62] animate-pulse" />
                                  <span className="text-[8px] font-semibold text-[#2F6F62]">{t.livePricing}</span>
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">{holding.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(holding.value)}</p>
                            <p className="text-xs text-[#2F6F62] font-medium">
                              {formatGrams(holding.allocated)} {t.allocated}
                            </p>
                          </div>
                        </Link>

                        {/* Holdings Detail Row */}
                        <div className="grid grid-cols-4 gap-2 mt-3 pl-14 pr-2">
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.holdingsLabel}</p>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{formatGrams(holding.total)}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.avgCost}</p>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                              {holding.total > 0 ? formatCurrency(holding.value / holding.total) : "--"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.market}</p>
                            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(holding.price)}/g</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">{t.unrealizedPL}</p>
                            <p className={`text-[11px] font-semibold ${holding.total > 0 ? "text-[#2F6F62]" : "text-slate-400"}`}>
                              {"--"}
                            </p>
                          </div>
                        </div>
                        {/* Buy / Sell Buttons */}
                        <div className="flex items-center gap-2 mt-3 pl-14">
                            <Link
                              href="/allocate"
                              className="flex-1 py-2 text-center text-xs font-semibold bg-[#BFA181] text-white rounded-lg hover:bg-[#BFA181]/90 transition-colors"
                            >
                              {holding.symbol === "AUXG" ? t.buyGold : holding.symbol === "AUXS" ? t.buySilver : holding.symbol === "AUXPT" ? t.buyPlatinum : t.buyPalladium}
                            </Link>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSellModal({ open: true, metal: holding });
                              }}
                              className="flex-1 py-2 text-center text-xs font-semibold border border-[#BFA181] text-[#BFA181] rounded-lg hover:bg-[#BFA181]/10 transition-colors"
                            >
                              {holding.symbol === "AUXG" ? t.sellGold : holding.symbol === "AUXS" ? t.sellSilver : holding.symbol === "AUXPT" ? t.sellPlatinum : t.sellPalladium}
                            </button>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2 — Liquidity (Cash & Crypto) */}
              {(settlementBalance > 0 || cryptoAssets.some(c => (cryptoBalances[c.symbol.toLowerCase()] || 0) > 0)) && (
                <div>
                  <div className="flex items-center gap-2 mb-3 pt-4 border-t border-stone-200 dark:border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-[#2F6F62]" />
                    <h4 className="text-[11px] font-semibold text-[#2F6F62] tracking-wider">
                      {t.liquidityCashCrypto}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {/* AUXM Settlement Balance Row */}
                    {settlementBalance > 0 && (
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full bg-indigo-500/15 flex items-center justify-center">
                            <span className="text-lg font-bold text-indigo-500">◈</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.settlementBalance}</p>
                            <p className="text-xs text-slate-500">{t.auxmUnit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(settlementBalance)}</p>
                          <div className="flex items-center gap-1.5 justify-end">
                            <p className="text-xs text-[#2F6F62] font-medium">
                              {settlementBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t.auxmUnit}
                            </p>
                            <span className="px-1.5 py-0.5 bg-[#2F6F62]/10 rounded text-[8px] font-semibold text-[#2F6F62]">
                              {t.available}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Crypto Balance Rows */}
                    {cryptoAssets.map((crypto) => {
                      const bal = cryptoBalances[crypto.symbol.toLowerCase()] || 0;
                      if (bal <= 0) return null;
                      const price = cryptoPrices[crypto.symbol.toLowerCase()] || 0;
                      const value = bal * price;
                      return (
                        <div
                          key={crypto.symbol}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: crypto.color + "15" }}
                            >
                              <span className="text-lg font-bold" style={{ color: crypto.color }}>{crypto.icon}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800 dark:text-white">{crypto.name}</p>
                              <p className="text-xs text-slate-500">{crypto.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{formatCurrency(value)}</p>
                            <div className="flex items-center gap-1.5 justify-end">
                              <p className="text-xs text-[#2F6F62] font-medium">
                                {bal < 1 ? bal.toFixed(6) : bal.toFixed(2)} {crypto.symbol}
                              </p>
                              <span className="px-1.5 py-0.5 bg-[#2F6F62]/10 rounded text-[8px] font-semibold text-[#2F6F62]">
                                {t.available}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Physical Redemption Card */}
        <Link
          href="/physical-delivery"
          className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 hover:border-[#BFA181] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/15 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.physicalRedemption}</p>
              <p className="text-xs text-slate-500">{t.physicalRedemptionDesc}</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Sell Modal */}
      {sellModal.metal && (
        <LiquidateModal
          isOpen={sellModal.open}
          onClose={() => setSellModal({ open: false, metal: null })}
          metal={{
            symbol: sellModal.metal.symbol,
            name: sellModal.metal.name,
            allocated: sellModal.metal.available,
            price: sellModal.metal.price,
          }}
          address={address || ""}
          onSuccess={fetchVaultData}
        />
      )}

      {/* Trust Badge Modal */}
      {trustBadgeModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => setTrustBadgeModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-[#2F6F62]/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">
              {trustBadgeModal === "fullyAllocated" && t.fullyAllocated}
              {trustBadgeModal === "segregated" && t.segregated}
              {trustBadgeModal === "bankruptcyRemote" && t.bankruptcyRemote}
              {trustBadgeModal === "audited" && t.audited}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              {trustBadgeModal === "fullyAllocated" && t.fullyAllocatedDesc}
              {trustBadgeModal === "segregated" && t.segregatedDesc}
              {trustBadgeModal === "bankruptcyRemote" && t.bankruptcyRemoteDesc}
              {trustBadgeModal === "audited" && t.auditedDesc}
            </p>
            <button
              onClick={() => setTrustBadgeModal(null)}
              className="px-6 py-2.5 bg-[#2F6F62] text-white font-semibold rounded-xl hover:bg-[#2F6F62]/80 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* Encumbered Breakdown Modal */}
      {showEncumberedModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => setShowEncumberedModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 text-center">{t.encumberedBreakdown}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-6">{t.encumberedAssetsDesc}</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t.yieldPrograms}</span>
                <span className="text-sm font-bold text-orange-500">{formatCurrency(encumberedBreakdown.yieldPrograms)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t.pendingDelivery}</span>
                <span className="text-sm font-bold text-orange-500">{formatCurrency(encumberedBreakdown.pendingDelivery)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-500/5 rounded-lg">
                <span className="text-sm text-slate-700 dark:text-slate-300">{t.tradeSettlement}</span>
                <span className="text-sm font-bold text-orange-500">{formatCurrency(encumberedBreakdown.tradeSettlement)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border-t-2 border-orange-500">
                <span className="text-sm font-semibold text-slate-800 dark:text-white">Total</span>
                <span className="text-lg font-bold text-orange-500">{formatCurrency(encumberedAssetsValue)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowEncumberedModal(false)}
              className="w-full mt-6 px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-500/80 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
