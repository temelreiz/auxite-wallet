"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ConnectKitButton } from "connectkit";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MetalSpreadSettings {
  gold: { buy: number; sell: number };
  silver: { buy: number; sell: number };
  platinum: { buy: number; sell: number };
  palladium: { buy: number; sell: number };
}

interface CryptoSpreadSettings {
  btc: { buy: number; sell: number };
  eth: { buy: number; sell: number };
  xrp: { buy: number; sell: number };
  sol: { buy: number; sell: number };
  usdt: { buy: number; sell: number };
}

interface SpreadConfig {
  metals: MetalSpreadSettings;
  crypto: CryptoSpreadSettings;
}

interface OraclePrices {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
  ETH: number;
}

interface HotWallet {
  address: string;
  balanceETH: string;
  balanceUSDT: string;
  pendingWithdraws: number;
  network?: string;
  stats?: {
    totalDeposits: number;
    totalWithdraws: number;
    lastActivity: string | null;
  };
}

interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: "update" | "alert" | "promo";
  active: boolean;
  createdAt: string;
}

interface UserInfo {
  id: string;
  address: string;
  email?: string;
  kycStatus: "none" | "pending" | "verified";
  totalTrades: number;
  createdAt: string;
}

interface PendingWithdraw {
  id: string;
  oderId: string;
  address: string;
  amount: string;
  token: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
}

interface MobileAppConfig {
  ios: {
    minVersion: string;
    currentVersion: string;
    forceUpdate: boolean;
    storeUrl: string;
  };
  android: {
    minVersion: string;
    currentVersion: string;
    forceUpdate: boolean;
    storeUrl: string;
  };
}

interface MaintenanceConfig {
  enabled: boolean;
  message: { tr: string; en: string };
  estimatedEnd: string | null;
  allowedVersions: string[];
}

interface FeatureFlags {
  cryptoTrading: boolean;
  metalTrading: boolean;
  leasing: boolean;
  staking: boolean;
  p2pTransfer: boolean;
  fiatDeposit: boolean;
  fiatWithdraw: boolean;
  cryptoDeposit: boolean;
  cryptoWithdraw: boolean;
  biometricAuth: boolean;
  darkMode: boolean;
  priceAlerts: boolean;
  referralProgram: boolean;
  nftSupport: boolean;
}

interface PushNotification {
  id: string;
  title: string;
  body: string;
  target: string;
  sentAt: string;
  status: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACT ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════

const V7_CONTRACTS = {
  AUXG: "0xBF74Fc9f0dD50A79f9FaC2e9Aa05a268E3dcE6b6",
  AUXS: "0x705D9B193e5E349847C2Efb18E68fe989eC2C0e9",
  AUXPT: "0x1819447f624D8e22C1A4F3B14e96693625B6d74F",
  AUXPD: "0xb23545dE86bE9F65093D3a51a6ce52Ace0d8935E",
};

const ORACLE_ADDRESS = "0x7253c38967eFAcb0f929D700cf5815D8E717fDb6";

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN ALLOWED ADDRESSES
// ═══════════════════════════════════════════════════════════════════════════════

const ADMIN_ADDRESSES = [
  "0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944",
].map(a => a.toLowerCase());

// ═══════════════════════════════════════════════════════════════════════════════
// METAL & CRYPTO INFO
// ═══════════════════════════════════════════════════════════════════════════════

const METALS = [
  { key: "gold", symbol: "AUXG", name: "Altın", icon: "🥇", color: "text-amber-500" },
  { key: "silver", symbol: "AUXS", name: "Gümüş", icon: "🥈", color: "text-slate-400" },
  { key: "platinum", symbol: "AUXPT", name: "Platin", icon: "💎", color: "text-cyan-400" },
  { key: "palladium", symbol: "AUXPD", name: "Paladyum", icon: "💜", color: "text-purple-400" },
];

const CRYPTOS = [
  { key: "btc", symbol: "BTC", name: "Bitcoin", icon: "₿", color: "text-orange-500" },
  { key: "eth", symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "text-blue-400" },
  { key: "xrp", symbol: "XRP", name: "Ripple", icon: "✕", color: "text-slate-300" },
  { key: "sol", symbol: "SOL", name: "Solana", icon: "◎", color: "text-purple-500" },
  { key: "usdt", symbol: "USDT", name: "Tether", icon: "₮", color: "text-emerald-400" },
];

const FEATURE_LABELS: Record<string, { tr: string; en: string; icon: string }> = {
  cryptoTrading: { tr: "Kripto Trading", en: "Crypto Trading", icon: "₿" },
  metalTrading: { tr: "Metal Trading", en: "Metal Trading", icon: "🥇" },
  leasing: { tr: "Leasing", en: "Leasing", icon: "📈" },
  staking: { tr: "Staking", en: "Staking", icon: "🔒" },
  p2pTransfer: { tr: "P2P Transfer", en: "P2P Transfer", icon: "🔄" },
  fiatDeposit: { tr: "Fiat Yatırma", en: "Fiat Deposit", icon: "💵" },
  fiatWithdraw: { tr: "Fiat Çekme", en: "Fiat Withdraw", icon: "💸" },
  cryptoDeposit: { tr: "Kripto Yatırma", en: "Crypto Deposit", icon: "📥" },
  cryptoWithdraw: { tr: "Kripto Çekme", en: "Crypto Withdraw", icon: "📤" },
  biometricAuth: { tr: "Biyometrik Giriş", en: "Biometric Auth", icon: "👆" },
  darkMode: { tr: "Karanlık Mod", en: "Dark Mode", icon: "🌙" },
  priceAlerts: { tr: "Fiyat Uyarıları", en: "Price Alerts", icon: "🔔" },
  referralProgram: { tr: "Referans Programı", en: "Referral Program", icon: "👥" },
  nftSupport: { tr: "NFT Desteği", en: "NFT Support", icon: "🖼️" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  const { isConnected, address } = useAccount();
  
  // Auth
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"dashboard" | "spreads" | "oracle" | "wallet" | "news" | "users" | "withdraws" | "mint" | "mobile">("dashboard");

  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrades: 0,
    totalVolume: "$0",
    pendingWithdraws: 0,
    pendingKYC: 0,
    activeAlerts: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Spread settings
  const [spreadConfig, setSpreadConfigState] = useState<SpreadConfig>({
    metals: {
      gold: { buy: 1.5, sell: 1.5 },
      silver: { buy: 2.0, sell: 2.0 },
      platinum: { buy: 2.0, sell: 2.0 },
      palladium: { buy: 2.5, sell: 2.5 },
    },
    crypto: {
      btc: { buy: 1.0, sell: 1.0 },
      eth: { buy: 1.0, sell: 1.0 },
      xrp: { buy: 1.5, sell: 1.5 },
      sol: { buy: 1.5, sell: 1.5 },
      usdt: { buy: 0.1, sell: 0.1 },
    },
  });
  const [spreadLoading, setSpreadLoading] = useState(false);
  const [spreadSaving, setSpreadSaving] = useState<string | null>(null);

  // Oracle prices
  const [oraclePrices, setOraclePrices] = useState<OraclePrices>({
    AUXG: 65000,
    AUXS: 800,
    AUXPT: 30000,
    AUXPD: 35000,
    ETH: 3500,
  });
  const [oracleLoading, setOracleLoading] = useState(false);

  // Hot Wallet - Multi-Chain
  const [walletBalances, setWalletBalances] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletProcessing, setWalletProcessing] = useState<string | null>(null);
  const [pendingUserWithdraws, setPendingUserWithdraws] = useState<any[]>([]);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  // Send form
  const [sendToken, setSendToken] = useState("ETH");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMemo, setSendMemo] = useState("");

  // News Feed
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [newNews, setNewNews] = useState({ title: "", content: "", category: "update" as const });

  // Users
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [userSearch, setUserSearch] = useState("");

  // Pending Withdraws
  const [pendingWithdraws, setPendingWithdraws] = useState<PendingWithdraw[]>([]);

  // Mint
  const [mintData, setMintData] = useState({
    address: "",
    amount: "",
    metal: "AUXG" as keyof typeof V7_CONTRACTS,
    custodian: "Zurich Vault",
  });

  // Mobile Management
  const [mobileAppConfig, setMobileAppConfig] = useState<MobileAppConfig>({
    ios: { minVersion: "1.0.0", currentVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
    android: { minVersion: "1.0.0", currentVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
  });
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig>({
    enabled: false,
    message: { tr: "Bakım çalışması yapılmaktadır.", en: "Maintenance in progress." },
    estimatedEnd: null,
    allowedVersions: [],
  });
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    cryptoTrading: true,
    metalTrading: true,
    leasing: true,
    staking: false,
    p2pTransfer: true,
    fiatDeposit: true,
    fiatWithdraw: true,
    cryptoDeposit: true,
    cryptoWithdraw: true,
    biometricAuth: true,
    darkMode: true,
    priceAlerts: true,
    referralProgram: false,
    nftSupport: false,
  });
  const [pushHistory, setPushHistory] = useState<PushNotification[]>([]);
  const [newPush, setNewPush] = useState({ title: "", body: "", target: "all" });
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileSaving, setMobileSaving] = useState<string | null>(null);

  // Messages
  const [message, setMessage] = useState({ type: "", text: "" });

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTH
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (address) {
      const isAdminWallet = ADMIN_ADDRESSES.includes(address.toLowerCase());
      setIsAdmin(isAdminWallet);
      if (isAdminWallet) {
        const token = sessionStorage.getItem("auxite_admin_token");
        if (token) {
          setAuthenticated(true);
          loadAllData();
        }
      }
    }
  }, [address]);

  // Hot Wallet otomatik yenileme (5 dakikada bir)
  useEffect(() => {
    if (!authenticated || activeTab !== "wallet") return;
    
    const interval = setInterval(() => {
      loadHotWallet(false); // Cache'den al, force refresh değil
    }, 300000); // 5 dakika (300 saniye)
    
    return () => clearInterval(interval);
  }, [authenticated, activeTab]);

  // Dashboard stats otomatik yenileme (60 saniyede bir)
  useEffect(() => {
    if (!authenticated || activeTab !== "dashboard") return;
    
    const interval = setInterval(() => {
      loadStats();
    }, 60000); // 60 saniye
    
    return () => clearInterval(interval);
  }, [authenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("auxite_admin_token", data.token);
        setAuthenticated(true);
        loadAllData();
      } else {
        setAuthError("Yanlış şifre");
      }
    } catch {
      setAuthError("Bağlantı hatası");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("auxite_admin_token");
    setAuthenticated(false);
    setPassword("");
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════════

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
  });

  const loadAllData = () => {
    loadStats();
    loadSpreadConfig();
    loadHotWallet();
    loadNews();
    loadMobileConfig();
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to load stats:", e);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadSpreadConfig = async () => {
    setSpreadLoading(true);
    try {
      const res = await fetch("/api/admin/spread");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSpreadConfigState(data.config);
        }
      }
    } catch (e) {
      console.error("Failed to load spread config:", e);
    } finally {
      setSpreadLoading(false);
    }
  };

  const loadHotWallet = async (forceRefresh = false) => {
    setWalletLoading(true);
    try {
      // Get balances
      const res = await fetch(`/api/admin/hot-wallet?type=balances${forceRefresh ? '&refresh=true' : ''}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWalletBalances(data.balances);
      }
      
      // Get pending withdraws
      const pendingRes = await fetch("/api/admin/hot-wallet?type=pending-withdraws", { headers: getAuthHeaders() });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingUserWithdraws(pendingData.withdraws || []);
      }
      
      // Get history
      const historyRes = await fetch("/api/admin/hot-wallet?type=history", { headers: getAuthHeaders() });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setWalletHistory([...(historyData.withdraws || []), ...(historyData.deposits || [])].slice(0, 30));
      }
    } catch (e) {
      console.error("Failed to load hot wallet:", e);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleSendCrypto = async () => {
    if (!sendAddress || !sendAmount) return;
    
    setWalletProcessing('send');
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch("/api/admin/hot-wallet", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'send',
          token: sendToken,
          toAddress: sendAddress,
          amount: sendAmount,
          memo: sendMemo || undefined,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: `${sendAmount} ${sendToken} gönderildi! TX: ${data.txHash?.slice(0, 10)}...` });
        setSendAddress("");
        setSendAmount("");
        setSendMemo("");
        loadHotWallet(true);
      } else {
        setMessage({ type: "error", text: data.error || "Gönderim başarısız" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Bağlantı hatası" });
    } finally {
      setWalletProcessing(null);
    }
  };

  const handleApproveWithdraw = async (withdrawId: string) => {
    setWalletProcessing(withdrawId);
    setMessage({ type: "", text: "" });
    
    try {
      const res = await fetch("/api/admin/hot-wallet", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'approve-withdraw', withdrawId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: `Çekim onaylandı! TX: ${data.txHash?.slice(0, 10)}...` });
        loadHotWallet(true);
      } else {
        setMessage({ type: "error", text: data.error || "Onay başarısız" });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Bağlantı hatası" });
    } finally {
      setWalletProcessing(null);
    }
  };

  const handleCancelWithdraw = async (withdrawId: string) => {
    try {
      const res = await fetch("/api/admin/hot-wallet", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'cancel-withdraw', withdrawId }),
      });
      
      if (res.ok) {
        loadHotWallet();
      }
    } catch (e) {
      console.error("Cancel failed:", e);
    }
  };

  const loadNews = async () => {
    try {
      const res = await fetch("/api/news");
      if (res.ok) {
        const data = await res.json();
        setNewsItems(data.items || []);
      }
    } catch (e) {
      console.error("Failed to load news:", e);
    }
  };

  const loadMobileConfig = async () => {
    setMobileLoading(true);
    try {
      const res = await fetch("/api/admin/mobile?type=all", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.appConfig) setMobileAppConfig(data.appConfig);
        if (data.maintenance) setMaintenanceConfig(data.maintenance);
        if (data.features) setFeatureFlags(data.features);
      }
      
      // Push history
      const pushRes = await fetch("/api/admin/mobile?type=push-history", { headers: getAuthHeaders() });
      if (pushRes.ok) {
        const pushData = await pushRes.json();
        setPushHistory(pushData.history || []);
      }
    } catch (e) {
      console.error("Failed to load mobile config:", e);
    } finally {
      setMobileLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleSpreadUpdate = async (type: 'metal' | 'crypto', key: string) => {
    setSpreadSaving(`${type}-${key}`);
    setMessage({ type: "", text: "" });

    const values = type === 'metal' 
      ? spreadConfig.metals[key as keyof MetalSpreadSettings]
      : spreadConfig.crypto[key as keyof CryptoSpreadSettings];

    try {
      const res = await fetch("/api/admin/spread", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type,
          asset: key,
          buy: values.buy,
          sell: values.sell,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `${key.toUpperCase()} spread güncellendi` });
        if (data.config) {
          setSpreadConfigState(data.config);
        }
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Güncelleme başarısız" });
      }
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setSpreadSaving(null);
    }
  };

  const handleOracleUpdate = async () => {
    setOracleLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/update-oracle", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(oraclePrices),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Oracle fiyatları güncellendi" });
      } else {
        setMessage({ type: "error", text: "Güncelleme başarısız" });
      }
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    } finally {
      setOracleLoading(false);
    }
  };

  const handleAddNews = async () => {
    if (!newNews.title || !newNews.content) return;

    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(newNews),
      });

      if (res.ok) {
        setNewNews({ title: "", content: "", category: "update" });
        loadNews();
        setMessage({ type: "success", text: "Haber eklendi" });
      }
    } catch {
      setMessage({ type: "error", text: "Haber eklenemedi" });
    }
  };

  const handleDeleteNews = async (id: string) => {
    try {
      await fetch(`/api/news?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      loadNews();
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleMint = async () => {
    if (!mintData.address || !mintData.amount) return;

    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/mint", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(mintData),
      });

      if (res.ok) {
        setMessage({ type: "success", text: `${mintData.amount}g ${mintData.metal} mint edildi` });
        setMintData({ ...mintData, address: "", amount: "" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Mint başarısız" });
      }
    } catch {
      setMessage({ type: "error", text: "Bağlantı hatası" });
    }
  };

  // Mobile Handlers
  const handleAppConfigUpdate = async () => {
    setMobileSaving("app-config");
    try {
      const res = await fetch("/api/admin/mobile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "update-app-config",
          ios: mobileAppConfig.ios,
          android: mobileAppConfig.android,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Uygulama ayarları güncellendi" });
      }
    } catch {
      setMessage({ type: "error", text: "Güncelleme başarısız" });
    } finally {
      setMobileSaving(null);
    }
  };

  const handleMaintenanceUpdate = async () => {
    setMobileSaving("maintenance");
    try {
      const res = await fetch("/api/admin/mobile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "set-maintenance",
          ...maintenanceConfig,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: `Bakım modu ${maintenanceConfig.enabled ? "açıldı" : "kapatıldı"}` });
      }
    } catch {
      setMessage({ type: "error", text: "Güncelleme başarısız" });
    } finally {
      setMobileSaving(null);
    }
  };

  const handleFeatureToggle = async (feature: keyof FeatureFlags) => {
    const newValue = !featureFlags[feature];
    setFeatureFlags({ ...featureFlags, [feature]: newValue });
    
    try {
      await fetch("/api/admin/mobile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "update-features",
          features: { [feature]: newValue },
        }),
      });
    } catch (e) {
      console.error("Feature toggle failed:", e);
      setFeatureFlags({ ...featureFlags, [feature]: !newValue }); // Rollback
    }
  };

  const handleSendPush = async () => {
    if (!newPush.title || !newPush.body) return;
    
    setMobileSaving("push");
    try {
      const res = await fetch("/api/admin/mobile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "send-push",
          ...newPush,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Push notification gönderildi" });
        setNewPush({ title: "", body: "", target: "all" });
        loadMobileConfig(); // Reload push history
      }
    } catch {
      setMessage({ type: "error", text: "Gönderim başarısız" });
    } finally {
      setMobileSaving(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("tr-TR");
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER - NOT CONNECTED
  // ═══════════════════════════════════════════════════════════════════════════════

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
            <span className="text-4xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Admin Paneli</h1>
          <p className="text-slate-400 mb-6">Admin cüzdanınızı bağlayın</p>
          <ConnectKitButton />
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER - NOT ADMIN
  // ═══════════════════════════════════════════════════════════════════════════════

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Yetkisiz Erişim</h1>
          <p className="text-slate-400 mb-6">Bu cüzdan admin yetkisine sahip değil</p>
          <p className="text-xs text-slate-500 font-mono mb-4">{address}</p>
          <Link href="/" className="text-amber-400 hover:underline">
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER - LOGIN REQUIRED
  // ═══════════════════════════════════════════════════════════════════════════════

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="text-xl font-bold">Admin Girişi</h1>
            <p className="text-slate-400 text-sm mt-2">Şifrenizi girin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin şifresi"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
            />
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 rounded-xl font-semibold text-black disabled:opacity-50"
            >
              {authLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-400 hover:text-white text-sm">
              ← Ana Sayfaya Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER - ADMIN DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════════

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "spreads", label: "Spread Ayarları", icon: "📈" },
    { id: "oracle", label: "Oracle", icon: "🔮" },
    { id: "wallet", label: "Hot Wallet", icon: "💰" },
    { id: "news", label: "Haber Feed", icon: "📰" },
    { id: "users", label: "Kullanıcılar", icon: "👥" },
    { id: "withdraws", label: "Çekimler", icon: "💸" },
    { id: "mint", label: "Manuel Mint", icon: "🏭" },
    { id: "mobile", label: "Mobil Yönetim", icon: "📱" },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Image src="/gold-favicon-32x32.png" alt="Auxite" width={32} height={32} />
              </Link>
              <h1 className="text-xl font-bold">Admin Panel</h1>
              <span className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-400">V7</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/admin/vault-assignment"
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 text-sm"
              >
                🏦 Vault Assignment
              </Link>
              <Link
                href="/admin/settings"
                className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-sm"
              >
                ⚙️ Ayarlar
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm"
              >
                Çıkış
              </button>
              <ConnectKitButton />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-amber-500 text-black"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between ${
            message.type === "success" 
              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
              : "bg-red-500/20 border border-red-500/50 text-red-400"
          }`}>
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })} className="ml-4 hover:opacity-70">✕</button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DASHBOARD TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Toplam Kullanıcı", value: stats.totalUsers, color: "text-blue-400" },
                { label: "Toplam İşlem", value: stats.totalTrades, color: "text-emerald-400" },
                { label: "Toplam Hacim", value: stats.totalVolume, color: "text-amber-400" },
                { label: "Bekleyen Çekim", value: stats.pendingWithdraws, color: "text-red-400" },
                { label: "Bekleyen KYC", value: stats.pendingKYC, color: "text-purple-400" },
                { label: "Aktif Uyarı", value: stats.activeAlerts, color: "text-orange-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Hızlı İşlemler</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button
                  onClick={() => setActiveTab("mint")}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-center transition-colors"
                >
                  <span className="text-2xl block mb-2">🏭</span>
                  <span className="text-sm">Manuel Mint</span>
                </button>
                <button
                  onClick={() => setActiveTab("withdraws")}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-center transition-colors"
                >
                  <span className="text-2xl block mb-2">💸</span>
                  <span className="text-sm">Çekimleri Onayla</span>
                </button>
                <Link
                  href="/admin/vault-assignment"
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-center transition-colors"
                >
                  <span className="text-2xl block mb-2">🏦</span>
                  <span className="text-sm">Vault Ata</span>
                </Link>
                <button
                  onClick={() => setActiveTab("spreads")}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-center transition-colors"
                >
                  <span className="text-2xl block mb-2">📈</span>
                  <span className="text-sm">Spread Ayarla</span>
                </button>
                <button
                  onClick={() => setActiveTab("mobile")}
                  className="p-4 bg-slate-800 hover:bg-slate-700 rounded-xl text-center transition-colors"
                >
                  <span className="text-2xl block mb-2">📱</span>
                  <span className="text-sm">Mobil Yönetim</span>
                </button>
              </div>
            </div>

            {/* Contract Addresses */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">V7 Contract Adresleri</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(V7_CONTRACTS).map(([metal, addr]) => (
                  <div key={metal} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="font-semibold">{metal}</span>
                    <a
                      href={`https://sepolia.etherscan.io/address/${addr}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-amber-400 hover:underline"
                    >
                      {addr.slice(0, 10)}...{addr.slice(-8)}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SPREADS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "spreads" && (
          <div className="space-y-6">
            {/* Metal Spreads */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">🥇 Metal Spreadleri</h3>
              <p className="text-sm text-slate-400 mb-6">
                Alış/Satış fiyatına uygulanacak yüzde oranları
              </p>

              <div className="space-y-4">
                {METALS.map((metal) => {
                  const config = spreadConfig.metals[metal.key as keyof MetalSpreadSettings];
                  const isSaving = spreadSaving === `metal-${metal.key}`;
                  
                  return (
                    <div key={metal.key} className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{metal.icon}</span>
                          <div>
                            <span className={`font-semibold ${metal.color}`}>{metal.symbol}</span>
                            <span className="text-slate-400 text-sm ml-2">{metal.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSpreadUpdate('metal', metal.key)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black text-sm font-medium disabled:opacity-50"
                        >
                          {isSaving ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Alış Spread (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={config?.buy || 0}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              metals: {
                                ...spreadConfig.metals,
                                [metal.key]: { ...config, buy: parseFloat(e.target.value) || 0 }
                              }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Satış Spread (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={config?.sell || 0}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              metals: {
                                ...spreadConfig.metals,
                                [metal.key]: { ...config, sell: parseFloat(e.target.value) || 0 }
                              }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Crypto Spreads */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">₿ Kripto Spreadleri</h3>
              <p className="text-sm text-slate-400 mb-6">
                Kripto alım/satım işlemlerinde uygulanacak yüzde oranları
              </p>

              <div className="space-y-4">
                {CRYPTOS.map((crypto) => {
                  const config = spreadConfig.crypto[crypto.key as keyof CryptoSpreadSettings];
                  const isSaving = spreadSaving === `crypto-${crypto.key}`;
                  
                  return (
                    <div key={crypto.key} className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl ${crypto.color}`}>{crypto.icon}</span>
                          <div>
                            <span className={`font-semibold ${crypto.color}`}>{crypto.symbol}</span>
                            <span className="text-slate-400 text-sm ml-2">{crypto.name}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSpreadUpdate('crypto', crypto.key)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                        >
                          {isSaving ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Alış Spread (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={config?.buy || 0}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              crypto: {
                                ...spreadConfig.crypto,
                                [crypto.key]: { ...config, buy: parseFloat(e.target.value) || 0 }
                              }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Satış Spread (%)</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            value={config?.sell || 0}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              crypto: {
                                ...spreadConfig.crypto,
                                [crypto.key]: { ...config, sell: parseFloat(e.target.value) || 0 }
                              }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ORACLE TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "oracle" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Oracle Fiyatları (USD/kg)</h3>
                <span className="text-xs text-slate-400 font-mono">{ORACLE_ADDRESS.slice(0, 10)}...</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {(Object.keys(oraclePrices) as Array<keyof OraclePrices>).map((key) => (
                  <div key={key} className="p-4 bg-slate-800/50 rounded-xl">
                    <label className="block text-sm text-slate-400 mb-2">{key}</label>
                    <input
                      type="number"
                      value={oraclePrices[key]}
                      onChange={(e) => setOraclePrices({
                        ...oraclePrices,
                        [key]: Number(e.target.value)
                      })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleOracleUpdate}
                disabled={oracleLoading}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-black font-semibold disabled:opacity-50"
              >
                {oracleLoading ? "Güncelleniyor..." : "Tüm Fiyatları Güncelle"}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* HOT WALLET TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "wallet" && (
          <div className="space-y-6">
            {/* Wallet Overview */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">💰 Multi-Chain Hot Wallet</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span>Otomatik (5dk)</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {walletBalances?.lastUpdated ? new Date(walletBalances.lastUpdated).toLocaleTimeString('tr-TR') : ''}
                  </span>
                  <button
                    onClick={() => loadHotWallet(true)}
                    disabled={walletLoading}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title="Şimdi Yenile"
                  >
                    <svg className={`w-4 h-4 text-slate-400 ${walletLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Multi-Chain Balances Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {/* ETH */}
                <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">Ξ</span>
                      <span className="text-xs text-slate-400">ETH</span>
                    </div>
                    <a
                      href={walletBalances?.ETH?.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="text-xl font-bold text-white">{parseFloat(walletBalances?.ETH?.balance || '0').toFixed(4)}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-1">{walletBalances?.ETH?.address?.slice(0, 8)}...</p>
                </div>

                {/* USDT */}
                <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">₮</span>
                      <span className="text-xs text-slate-400">USDT</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/60">ERC-20</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-400">${parseFloat(walletBalances?.USDT?.balance || '0').toLocaleString()}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-1">{walletBalances?.USDT?.address?.slice(0, 8)}...</p>
                </div>

                {/* BTC */}
                <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">₿</span>
                      <span className="text-xs text-slate-400">BTC</span>
                    </div>
                    <a
                      href={walletBalances?.BTC?.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:underline"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="text-xl font-bold text-orange-400">{parseFloat(walletBalances?.BTC?.balance || '0').toFixed(6)}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-1">{walletBalances?.BTC?.address?.slice(0, 8)}...</p>
                </div>

                {/* XRP */}
                <div className="p-4 bg-gradient-to-br from-slate-400/20 to-slate-500/10 border border-slate-400/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✕</span>
                      <span className="text-xs text-slate-400">XRP</span>
                    </div>
                    <a
                      href={walletBalances?.XRP?.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-300 hover:underline"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="text-xl font-bold text-white">{parseFloat(walletBalances?.XRP?.balance || '0').toFixed(2)}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-1">{walletBalances?.XRP?.address?.slice(0, 8)}...</p>
                  {walletBalances?.XRP?.memo && (
                    <p className="text-[10px] text-slate-500 mt-1">Memo: {walletBalances.XRP.memo}</p>
                  )}
                </div>

                {/* SOL */}
                <div className="p-4 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">◎</span>
                      <span className="text-xs text-slate-400">SOL</span>
                    </div>
                    <a
                      href={walletBalances?.SOL?.explorer}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:underline"
                    >
                      ↗
                    </a>
                  </div>
                  <p className="text-xl font-bold text-purple-400">{parseFloat(walletBalances?.SOL?.balance || '0').toFixed(4)}</p>
                  <p className="text-xs text-slate-500 font-mono truncate mt-1">{walletBalances?.SOL?.address?.slice(0, 8)}...</p>
                </div>
              </div>

              {/* Send Crypto Form */}
              <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <h4 className="font-medium mb-4">📤 Kripto Gönder</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Token</label>
                    <select
                      value={sendToken}
                      onChange={(e) => setSendToken(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                    >
                      <option value="ETH">ETH - Ethereum</option>
                      <option value="USDT">USDT - Tether</option>
                      <option value="BTC">BTC - Bitcoin</option>
                      <option value="XRP">XRP - Ripple</option>
                      <option value="SOL">SOL - Solana</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Alıcı Adresi</label>
                    <input
                      type="text"
                      value={sendAddress}
                      onChange={(e) => setSendAddress(e.target.value)}
                      placeholder={sendToken === 'BTC' ? '1xxx... veya bc1xxx...' : '0x...'}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Miktar</label>
                    <input
                      type="number"
                      step="any"
                      value={sendAmount}
                      onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                </div>
                {sendToken === 'XRP' && (
                  <div className="mt-3">
                    <label className="block text-xs text-slate-400 mb-1">Destination Tag (opsiyonel)</label>
                    <input
                      type="number"
                      value={sendMemo}
                      onChange={(e) => setSendMemo(e.target.value)}
                      placeholder="123456"
                      className="w-full md:w-48 bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Bakiye: {parseFloat(walletBalances?.[sendToken]?.balance || '0').toFixed(6)} {sendToken}
                  </p>
                  <button
                    onClick={handleSendCrypto}
                    disabled={!!walletProcessing || !sendAddress || !sendAmount}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-black font-medium transition-colors"
                  >
                    {walletProcessing === 'send' ? 'Gönderiliyor...' : `${sendToken} Gönder`}
                  </button>
                </div>
              </div>
            </div>

            {/* Pending Withdraws */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">⏳ Bekleyen Kullanıcı Çekimleri</h3>
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm">
                  {pendingUserWithdraws.length} bekliyor
                </span>
              </div>

              {pendingUserWithdraws.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <span className="text-3xl block mb-2">✓</span>
                  <p>Bekleyen çekim yok</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingUserWithdraws.map((withdraw: any, idx: number) => {
                    const tokenColors: Record<string, string> = {
                      ETH: 'bg-blue-500/20 text-blue-400',
                      USDT: 'bg-emerald-500/20 text-emerald-400',
                      BTC: 'bg-orange-500/20 text-orange-400',
                      XRP: 'bg-slate-400/20 text-slate-300',
                      SOL: 'bg-purple-500/20 text-purple-400',
                    };
                    const tokenIcons: Record<string, string> = {
                      ETH: 'Ξ', USDT: '₮', BTC: '₿', XRP: '✕', SOL: '◎'
                    };
                    
                    return (
                      <div key={idx} className="p-4 bg-slate-800/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${tokenColors[withdraw.token] || 'bg-slate-500/20'}`}>
                            {tokenIcons[withdraw.token] || '?'}
                          </div>
                          <div>
                            <p className="font-medium">{withdraw.amount} {withdraw.token}</p>
                            <p className="text-xs text-slate-400 font-mono">{withdraw.address?.slice(0, 12)}...{withdraw.address?.slice(-8)}</p>
                            {withdraw.memo && <p className="text-xs text-slate-500">Memo: {withdraw.memo}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">{formatDate(withdraw.createdAt)}</span>
                          <button
                            onClick={() => handleApproveWithdraw(withdraw.id)}
                            disabled={walletProcessing === withdraw.id}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm transition-colors"
                          >
                            {walletProcessing === withdraw.id ? '...' : '✓ Onayla'}
                          </button>
                          <button
                            onClick={() => handleCancelWithdraw(withdraw.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Transaction History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">📜 İşlem Geçmişi</h3>
              
              {walletHistory.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p>Henüz işlem yok</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {walletHistory.map((tx: any, idx: number) => {
                    const tokenIcons: Record<string, string> = {
                      ETH: 'Ξ', USDT: '₮', BTC: '₿', XRP: '✕', SOL: '◎'
                    };
                    const explorerUrls: Record<string, string> = {
                      ETH: 'https://etherscan.io/tx/',
                      USDT: 'https://etherscan.io/tx/',
                      BTC: 'https://www.blockchain.com/btc/tx/',
                      XRP: 'https://xrpscan.com/tx/',
                      SOL: 'https://solscan.io/tx/',
                    };
                    
                    return (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${tx.status === 'completed' ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                          <span className="text-lg">{tokenIcons[tx.token] || '?'}</span>
                          <div>
                            <p className="text-sm font-medium">{tx.amount} {tx.token}</p>
                            <p className="text-xs text-slate-500">→ {tx.to?.slice(0, 10)}...{tx.to?.slice(-6)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          {tx.txHash && (
                            <a
                              href={`${explorerUrls[tx.token] || ''}${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-amber-400 hover:underline"
                            >
                              {tx.txHash?.slice(0, 10)}...
                            </a>
                          )}
                          <p className="text-xs text-slate-500">{formatDate(tx.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* NEWS FEED TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "news" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Yeni Haber/Duyuru Ekle</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={newNews.title}
                  onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                  placeholder="Başlık"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                />
                <textarea
                  value={newNews.content}
                  onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                  placeholder="İçerik"
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                />
                <div className="flex items-center gap-4">
                  <select
                    value={newNews.category}
                    onChange={(e) => setNewNews({ ...newNews, category: e.target.value as any })}
                    className="bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                  >
                    <option value="update">Güncelleme</option>
                    <option value="alert">Uyarı</option>
                    <option value="promo">Promosyon</option>
                  </select>
                  <button
                    onClick={handleAddNews}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-black font-semibold"
                  >
                    Ekle
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Mevcut Haberler</h3>
              <div className="space-y-4">
                {newsItems.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Henüz haber yok</p>
                ) : (
                  newsItems.map((news) => (
                    <div key={news.id} className="p-4 bg-slate-800/50 rounded-xl flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            news.category === "alert" ? "bg-red-500/20 text-red-400" :
                            news.category === "promo" ? "bg-purple-500/20 text-purple-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {news.category}
                          </span>
                          <span className="text-xs text-slate-500">{formatDate(news.createdAt)}</span>
                        </div>
                        <h4 className="font-medium">{news.title}</h4>
                        <p className="text-sm text-slate-400 mt-1">{news.content}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteNews(news.id)}
                        className="text-red-400 hover:text-red-300 p-2 ml-4"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* USERS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Kullanıcılar</h3>
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Adres veya email ara..."
                  className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white text-sm w-64"
                />
              </div>

              <div className="text-center py-12 text-slate-400">
                <span className="text-4xl block mb-4">👥</span>
                Kullanıcı listesi API'si entegre edilecek
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* WITHDRAWS TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "withdraws" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Bekleyen Çekimler</h3>

              <div className="text-center py-12 text-slate-400">
                <span className="text-4xl block mb-4">💸</span>
                Çekim listesi API'si entegre edilecek
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MINT TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "mint" && (
          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Manuel Token Mint</h3>
              <p className="text-sm text-slate-400 mb-6">
                Off-chain satışlar veya özel durumlar için manuel token mint işlemi
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Alıcı Adresi</label>
                  <input
                    type="text"
                    value={mintData.address}
                    onChange={(e) => setMintData({ ...mintData, address: e.target.value })}
                    placeholder="0x..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Miktar (gram)</label>
                  <input
                    type="number"
                    value={mintData.amount}
                    onChange={(e) => setMintData({ ...mintData, amount: e.target.value })}
                    placeholder="100"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Metal</label>
                  <select
                    value={mintData.metal}
                    onChange={(e) => setMintData({ ...mintData, metal: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                  >
                    <option value="AUXG">AUXG (Altın)</option>
                    <option value="AUXS">AUXS (Gümüş)</option>
                    <option value="AUXPT">AUXPT (Platin)</option>
                    <option value="AUXPD">AUXPD (Paladyum)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Custodian/Vault</label>
                  <select
                    value={mintData.custodian}
                    onChange={(e) => setMintData({ ...mintData, custodian: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                  >
                    <option value="Zurich Vault">Zurich Vault</option>
                    <option value="Singapore Vault">Singapore Vault</option>
                    <option value="London Vault">London Vault</option>
                    <option value="Dubai Vault">Dubai Vault</option>
                    <option value="Pending">Pending (Sonra atanacak)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <p className="text-sm text-amber-400">
                  ⚠️ Bu işlem blockchain'e yazılacak ve geri alınamaz. Mint edilen tokenlar belirtilen adrese gönderilecek ve allocation kaydı oluşturulacak.
                </p>
              </div>

              <button
                onClick={handleMint}
                disabled={!mintData.address || !mintData.amount}
                className="mt-6 px-8 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🏭 Mint Et
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* MOBILE MANAGEMENT TAB */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "mobile" && (
          <div className="space-y-6">
            {/* Push Notification */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">📲 Push Notification Gönder</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Başlık</label>
                  <input
                    type="text"
                    value={newPush.title}
                    onChange={(e) => setNewPush({ ...newPush, title: e.target.value })}
                    placeholder="Bildirim başlığı"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Hedef</label>
                  <select
                    value={newPush.target}
                    onChange={(e) => setNewPush({ ...newPush, target: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                  >
                    <option value="all">Tüm Kullanıcılar</option>
                    <option value="ios">Sadece iOS</option>
                    <option value="android">Sadece Android</option>
                    <option value="premium">Premium Kullanıcılar</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">Mesaj</label>
                <textarea
                  value={newPush.body}
                  onChange={(e) => setNewPush({ ...newPush, body: e.target.value })}
                  placeholder="Bildirim içeriği"
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white"
                />
              </div>
              <button
                onClick={handleSendPush}
                disabled={!newPush.title || !newPush.body || mobileSaving === "push"}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 rounded-xl text-white font-semibold disabled:opacity-50"
              >
                {mobileSaving === "push" ? "Gönderiliyor..." : "📤 Gönder"}
              </button>

              {/* Push History */}
              {pushHistory.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">Son Gönderilen Bildirimler</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pushHistory.slice(0, 5).map((push: any, idx) => (
                      <div key={idx} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{push.title}</p>
                          <p className="text-xs text-slate-400">{push.body?.slice(0, 50)}...</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500">{formatDate(push.sentAt)}</span>
                          <span className="block text-xs text-emerald-400">{push.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* App Version Control */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">📦 Uygulama Versiyonu</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* iOS */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🍎</span>
                    <span className="font-semibold">iOS</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Minimum Versiyon</label>
                      <input
                        type="text"
                        value={mobileAppConfig.ios.minVersion}
                        onChange={(e) => setMobileAppConfig({
                          ...mobileAppConfig,
                          ios: { ...mobileAppConfig.ios, minVersion: e.target.value }
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Güncel Versiyon</label>
                      <input
                        type="text"
                        value={mobileAppConfig.ios.currentVersion}
                        onChange={(e) => setMobileAppConfig({
                          ...mobileAppConfig,
                          ios: { ...mobileAppConfig.ios, currentVersion: e.target.value }
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mobileAppConfig.ios.forceUpdate}
                        onChange={(e) => setMobileAppConfig({
                          ...mobileAppConfig,
                          ios: { ...mobileAppConfig.ios, forceUpdate: e.target.checked }
                        })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Zorunlu Güncelleme</span>
                    </label>
                  </div>
                </div>

                {/* Android */}
                <div className="p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🤖</span>
                    <span className="font-semibold">Android</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Minimum Versiyon</label>
                      <input
                        type="text"
                        value={mobileAppConfig.android.minVersion}
                        onChange={(e) => setMobileAppConfig({
                          ...mobileAppConfig,
                          android: { ...mobileAppConfig.android, minVersion: e.target.value }
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Güncel Versiyon</label>
                      <input
                        type="text"
                        value={mobileAppConfig.android.currentVersion}
                        onChange={(e) => setMobileAppConfig({
                          ...mobileAppConfig,
                          android: { ...mobileAppConfig.android, currentVersion: e.target.value }
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mobileAppConfig.android.forceUpdate}
                        onChange={(e) => setMobileAppConfig({
                          ...mobileAppConfig,
                          android: { ...mobileAppConfig.android, forceUpdate: e.target.checked }
                        })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Zorunlu Güncelleme</span>
                    </label>
                  </div>
                </div>
              </div>
              <button
                onClick={handleAppConfigUpdate}
                disabled={mobileSaving === "app-config"}
                className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium disabled:opacity-50"
              >
                {mobileSaving === "app-config" ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>

            {/* Maintenance Mode */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">🚧 Bakım Modu</h3>
                <button
                  onClick={() => {
                    setMaintenanceConfig({ ...maintenanceConfig, enabled: !maintenanceConfig.enabled });
                  }}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    maintenanceConfig.enabled ? "bg-red-500" : "bg-slate-600"
                  }`}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${
                    maintenanceConfig.enabled ? "left-8" : "left-1"
                  }`} />
                </button>
              </div>
              
              {maintenanceConfig.enabled && (
                <div className="space-y-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Türkçe Mesaj</label>
                      <input
                        type="text"
                        value={maintenanceConfig.message.tr}
                        onChange={(e) => setMaintenanceConfig({
                          ...maintenanceConfig,
                          message: { ...maintenanceConfig.message, tr: e.target.value }
                        })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">İngilizce Mesaj</label>
                      <input
                        type="text"
                        value={maintenanceConfig.message.en}
                        onChange={(e) => setMaintenanceConfig({
                          ...maintenanceConfig,
                          message: { ...maintenanceConfig.message, en: e.target.value }
                        })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tahmini Bitiş (opsiyonel)</label>
                    <input
                      type="datetime-local"
                      value={maintenanceConfig.estimatedEnd || ""}
                      onChange={(e) => setMaintenanceConfig({
                        ...maintenanceConfig,
                        estimatedEnd: e.target.value || null
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                    />
                  </div>
                </div>
              )}
              
              <button
                onClick={handleMaintenanceUpdate}
                disabled={mobileSaving === "maintenance"}
                className={`mt-4 px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${
                  maintenanceConfig.enabled
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
              >
                {mobileSaving === "maintenance" ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>

            {/* Feature Flags */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">🎛️ Özellik Ayarları</h3>
              <p className="text-sm text-slate-400 mb-6">
                Mobil uygulamada hangi özelliklerin aktif olacağını kontrol edin
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(featureFlags).map(([key, value]) => {
                  const label = FEATURE_LABELS[key] || { tr: key, icon: "⚙️" };
                  return (
                    <button
                      key={key}
                      onClick={() => handleFeatureToggle(key as keyof FeatureFlags)}
                      className={`p-3 rounded-xl border transition-all text-left ${
                        value
                          ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : "bg-slate-800/50 border-slate-700 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{label.icon}</span>
                        <span className={`w-2 h-2 rounded-full ${value ? "bg-emerald-400" : "bg-slate-600"}`} />
                      </div>
                      <p className="text-sm font-medium mt-2">{label.tr}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
