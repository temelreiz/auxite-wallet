// src/app/admin/page.tsx
// Auxite Admin Dashboard - Full Version with Analytics, Campaigns, Alerts
// Part 1: Types, Config, Imports

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { METAL_TOKENS, ORACLE_ADDRESS } from "@/config/contracts-v8";

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

// NEW: Banner Type
interface Banner {
  id: string;
  title: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  subtitle?: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  actionType: 'none' | 'link' | 'screen' | 'promo';
  actionValue?: string;
  active: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
  platform: 'all' | 'mobile' | 'web';
  createdAt?: string;
}

// NEW: Campaign/Promo Type
interface Campaign {
  id: string;
  name: { tr: string; en: string };
  description: { tr: string; en: string };
  type: 'discount' | 'bonus' | 'cashback' | 'referral' | 'limited';
  value: number; // Percentage or fixed amount
  valueType: 'percentage' | 'fixed';
  code?: string;
  minAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  userLimit?: number;
  targetAssets?: string[]; // ['AUXG', 'AUXS'] or ['all']
  targetActions?: string[]; // ['buy', 'sell', 'stake']
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

// NEW: Alert/Announcement Type
interface Announcement {
  id: string;
  title: { tr: string; en: string; de?: string; fr?: string; ar?: string; ru?: string };
  message: { tr: string; en: string };
  type: 'info' | 'warning' | 'success' | 'error' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dismissible: boolean;
  showOnce: boolean;
  targetScreens?: string[]; // ['home', 'trade', 'all']
  targetUsers?: 'all' | 'verified' | 'unverified' | 'premium';
  platform: 'all' | 'mobile' | 'web';
  actionButton?: { text: { tr: string; en: string }; action: string };
  startDate?: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
}

// NEW: Analytics Types
interface AnalyticsOverview {
  totalUsers: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsers24h: number;
  newUsers7d: number;
  totalTrades: number;
  trades24h: number;
  trades7d: number;
  totalVolume: number;
  volume24h: number;
  volume7d: number;
  avgTradeSize: number;
  conversionRate: number;
}

interface AnalyticsChart {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

interface TopAsset {
  symbol: string;
  name: string;
  volume: number;
  trades: number;
  change: number;
}

interface UserSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface PlatformStats {
  platform: 'ios' | 'android' | 'web';
  users: number;
  sessions: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface GeoStats {
  country: string;
  code: string;
  users: number;
  percentage: number;
}

// Auxiteer Types
interface AuxiteerTierConfig {
  id: string;
  name: string;
  spread: number;
  fee: number;
  requirements: {
    kyc: boolean;
    minBalanceUsd: number;
    minDays: number;
    metalAsset: boolean;
    activeEarnLease: boolean;
    invitation: boolean;
  };
}

interface SovereignInvitation {
  walletAddress: string;
  invitedAt: string;
  invitedBy: string;
  status: 'active' | 'revoked';
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Contract addresses from central config
const V7_CONTRACTS = METAL_TOKENS;

// Admin addresses from environment variable
const ADMIN_ADDRESSES = (process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || "0x101bD08219773E0ff8cD3805542c0A2835Fec0FF")
  .split(",")
  .map(a => a.trim().toLowerCase());

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

// Auxiteer Constants
const DEFAULT_AUXITEER_TIERS: AuxiteerTierConfig[] = [
  {
    id: 'regular',
    name: 'Regular',
    spread: 1.00,
    fee: 0.35,
    requirements: { kyc: false, minBalanceUsd: 0, minDays: 0, metalAsset: false, activeEarnLease: false, invitation: false },
  },
  {
    id: 'core',
    name: 'Core',
    spread: 0.80,
    fee: 0.25,
    requirements: { kyc: true, minBalanceUsd: 10000, minDays: 7, metalAsset: false, activeEarnLease: false, invitation: false },
  },
  {
    id: 'reserve',
    name: 'Reserve',
    spread: 0.65,
    fee: 0.18,
    requirements: { kyc: true, minBalanceUsd: 100000, minDays: 30, metalAsset: true, activeEarnLease: false, invitation: false },
  },
  {
    id: 'vault',
    name: 'Vault',
    spread: 0.50,
    fee: 0.12,
    requirements: { kyc: true, minBalanceUsd: 500000, minDays: 90, metalAsset: true, activeEarnLease: true, invitation: false },
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    spread: 0,
    fee: 0,
    requirements: { kyc: true, minBalanceUsd: 1000000, minDays: 180, metalAsset: true, activeEarnLease: true, invitation: true },
  },
];

const TIER_COLORS: Record<string, string> = {
  regular: '#64748b',
  core: '#10b981',
  reserve: '#3b82f6',
  vault: '#8b5cf6',
  sovereign: '#f59e0b',
};

const TIER_ICONS: Record<string, string> = {
  regular: '👤',
  core: '🛡️',
  reserve: '📦',
  vault: '🏛️',
  sovereign: '⭐',
};

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "analytics", label: "Analitik", icon: "📈" },
  { id: "auxiteer", label: "Auxiteer", icon: "⭐" },
  { id: "spreads", label: "Spread", icon: "💹" },
  { id: "oracle", label: "Oracle", icon: "🔮" },
  { id: "wallet", label: "Hot Wallet", icon: "💰" },
  { id: "banners", label: "Banner", icon: "🖼️" },
  { id: "campaigns", label: "Kampanya", icon: "🎁" },
  { id: "alerts", label: "Duyuru", icon: "📢" },
  { id: "news", label: "Haberler", icon: "📰" },
  { id: "users", label: "Kullanıcı", icon: "👥" },
  { id: "withdraws", label: "Çekim", icon: "📤" },
  { id: "mobile", label: "Mobil", icon: "📱" },
  { id: "mint", label: "Mint", icon: "🏭" },
  { id: "website", label: "Website", icon: "🌐" },
  { id: "siteRoadmap", label: "Roadmap", icon: "🗺️" },
  { id: "siteTeam", label: "Site Ekip", icon: "👨‍👩‍👧‍👦" },
  { id: "siteVaults", label: "Kasalar", icon: "🏛️" },
] as const;

type TabId = typeof TABS[number]['id'];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function AdminDashboard() {
  // Wallet connection is optional now
  const { address } = useAccount();
  
  // Auth State
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrades: 0,
    totalVolume: "$0",
    pendingWithdraws: 0,
    pendingKYC: 0,
    activeAlerts: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Spread Settings
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

  // Oracle Prices
  const [oraclePrices, setOraclePrices] = useState<OraclePrices>({
    AUXG: 65000,
    AUXS: 800,
    AUXPT: 30000,
    AUXPD: 35000,
    ETH: 3500,
  });
  const [oracleLoading, setOracleLoading] = useState(false);

  // Hot Wallet
  const [walletBalances, setWalletBalances] = useState<any>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletProcessing, setWalletProcessing] = useState<string | null>(null);
  const [pendingUserWithdraws, setPendingUserWithdraws] = useState<any[]>([]);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [sendToken, setSendToken] = useState("ETH");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendMemo, setSendMemo] = useState("");

  // News
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

  // Mobile Config
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

  // NEW: Banners State
  const [banners, setBanners] = useState<Banner[]>([]);
  const [newBanner, setNewBanner] = useState<Partial<Banner>>({
    title: { tr: '', en: '' },
    subtitle: { tr: '', en: '' },
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    actionType: 'none',
    actionValue: '',
    active: true,
    priority: 50,
    platform: 'all',
  });
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerLangTab, setBannerLangTab] = useState("tr");

  // NEW: Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaign, setNewCampaign] = useState<Partial<Campaign>>({
    name: { tr: '', en: '' },
    description: { tr: '', en: '' },
    type: 'bonus',
    value: 10,
    valueType: 'percentage',
    code: '',
    targetAssets: ['all'],
    targetActions: ['buy'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    active: true,
  });
  const [campaignSaving, setCampaignSaving] = useState(false);

  // NEW: Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState<Partial<Announcement>>({
    title: { tr: '', en: '' },
    message: { tr: '', en: '' },
    type: 'info',
    priority: 'medium',
    dismissible: true,
    showOnce: false,
    targetScreens: ['all'],
    targetUsers: 'all',
    platform: 'all',
    active: true,
  });
  const [announcementSaving, setAnnouncementSaving] = useState(false);

  // NEW: Analytics State
  const [analyticsOverview, setAnalyticsOverview] = useState<AnalyticsOverview | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [userChart, setUserChart] = useState<AnalyticsChart | null>(null);
  const [volumeChart, setVolumeChart] = useState<AnalyticsChart | null>(null);
  const [topAssets, setTopAssets] = useState<TopAsset[]>([]);
  const [userSegments, setUserSegments] = useState<UserSegment[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [geoStats, setGeoStats] = useState<GeoStats[]>([]);

  // Messages
  const [message, setMessage] = useState({ type: "", text: "" });

  // Auxiteer States
  const [auxiteerTiers, setAuxiteerTiers] = useState<AuxiteerTierConfig[]>(DEFAULT_AUXITEER_TIERS);
  const [auxiteerEditingTier, setAuxiteerEditingTier] = useState<string | null>(null);
  const [auxiteerSaving, setAuxiteerSaving] = useState(false);
  const [auxiteerMessage, setAuxiteerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sovereignInvitations, setSovereignInvitations] = useState<SovereignInvitation[]>([]);
  const [newSovereignAddress, setNewSovereignAddress] = useState("");
  const [sovereignLoading, setSovereignLoading] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════════
  // WEBSITE MANAGEMENT STATES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const [websiteSettings, setWebsiteSettings] = useState({
    maintenanceMode: false,
    maintenanceMessage: { en: '', tr: '' },
    announcementBar: null as any,
    socialLinks: { twitter: '', telegram: '', discord: '', linkedin: '' },
    contactEmail: 'hello@auxite.io',
    supportEmail: 'support@auxite.io',
  });
  const [roadmapPhases, setRoadmapPhases] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [vaultLocations, setVaultLocations] = useState<any[]>([]);
  const [websiteSEO, setWebsiteSEO] = useState<any[]>([]);
  const [websiteLoading, setWebsiteLoading] = useState(false);
  const [websiteSaving, setWebsiteSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showWebsiteModal, setShowWebsiteModal] = useState<string | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // AUTH LOGIC - Only password based
  // ═══════════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Check for existing session
    const token = sessionStorage.getItem("auxite_admin_token");
    if (token) {
      // Verify token is still valid
      fetch("/api/admin/auth", {
        headers: { "Authorization": `Bearer ${token}` }
      }).then(res => {
        if (res.ok) {
          setAuthenticated(true);
          loadAllData();
        } else {
          sessionStorage.removeItem("auxite_admin_token");
        }
      }).catch(() => {
        sessionStorage.removeItem("auxite_admin_token");
      });
    }
  }, []);

  // Auto refresh intervals
  useEffect(() => {
    if (!authenticated) return;
    
    const intervals: NodeJS.Timeout[] = [];
    
    if (activeTab === "dashboard") {
      intervals.push(setInterval(loadStats, 60000));
    }
    if (activeTab === "wallet") {
      intervals.push(setInterval(() => loadHotWallet(false), 300000));
    }
    if (activeTab === "users") {
      loadUsers();
    }
    if (activeTab === "analytics") {
      intervals.push(setInterval(loadAnalytics, 120000));
    }
    
    return () => intervals.forEach(clearInterval);
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

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA LOADING FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const loadAllData = () => {
    loadStats();
    loadSpreadConfig();
    loadHotWallet();
    loadNews();
    loadMobileConfig();
    loadBanners();
    loadCampaigns();
    loadAnnouncements();
    loadAnalytics();
    loadAuxiteerConfig();
    loadSovereignInvitations();
    loadWebsiteData();
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
        if (data.config) setSpreadConfigState(data.config);
      }
    } catch (e) {
      console.error("Failed to load spread:", e);
    } finally {
      setSpreadLoading(false);
    }
  };

  const loadHotWallet = async (forceRefresh = false) => {
    setWalletLoading(true);
    try {
      const res = await fetch(`/api/admin/hot-wallet?type=balances${forceRefresh ? '&refresh=true' : ''}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setWalletBalances(data.balances);
      }
      
      const pendingRes = await fetch("/api/admin/hot-wallet?type=pending-withdraws", { headers: getAuthHeaders() });
      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        setPendingUserWithdraws(pendingData.withdraws || []);
      }
      
      const historyRes = await fetch("/api/admin/hot-wallet?type=history", { headers: getAuthHeaders() });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setWalletHistory([...(historyData.withdraws || []), ...(historyData.deposits || [])].slice(0, 30));
      }
    } catch (e) {
      console.error("Failed to load wallet:", e);
    } finally {
      setWalletLoading(false);
    }
  };

  const loadNews = async () => {
    try {
      const res = await fetch("/api/news?all=true");
      if (res.ok) {
        const data = await res.json();
        setNewsItems(data.allNews?.tr || []);
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

  const loadBanners = async () => {
    try {
      const res = await fetch("/api/mobile/banners?all=true", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch (e) {
      console.error("Failed to load banners:", e);
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/admin/campaigns", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (e) {
      console.error("Failed to load campaigns:", e);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const res = await fetch("/api/admin/announcements", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (e) {
      console.error("Failed to load announcements:", e);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${analyticsRange}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsOverview(data.overview);
        setUserChart(data.userChart);
        setVolumeChart(data.volumeChart);
        setTopAssets(data.topAssets || []);
        setUserSegments(data.userSegments || []);
        setPlatformStats(data.platformStats || []);
        setGeoStats(data.geoStats || []);
      }
    } catch (e) {
      console.error("Failed to load analytics:", e);
      // Mock data for demo
      setAnalyticsOverview({
        totalUsers: 12847,
        activeUsers24h: 2341,
        activeUsers7d: 8924,
        activeUsers30d: 11203,
        newUsers24h: 127,
        newUsers7d: 892,
        totalTrades: 156789,
        trades24h: 1234,
        trades7d: 8567,
        totalVolume: 45678900,
        volume24h: 1234567,
        volume7d: 8765432,
        avgTradeSize: 291,
        conversionRate: 23.5,
      });
      setTopAssets([
        { symbol: 'AUXG', name: 'Altın', volume: 2345678, trades: 4567, change: 12.5 },
        { symbol: 'AUXS', name: 'Gümüş', volume: 1234567, trades: 2345, change: -3.2 },
        { symbol: 'AUXPT', name: 'Platin', volume: 567890, trades: 890, change: 5.7 },
        { symbol: 'AUXPD', name: 'Paladyum', volume: 234567, trades: 456, change: -1.2 },
      ]);
      setUserSegments([
        { name: 'Aktif Trader', count: 3421, percentage: 26.6, color: '#10b981' },
        { name: 'Casual', count: 5234, percentage: 40.7, color: '#3b82f6' },
        { name: 'HODLer', count: 2891, percentage: 22.5, color: '#f59e0b' },
        { name: 'Yeni', count: 1301, percentage: 10.2, color: '#8b5cf6' },
      ]);
      setPlatformStats([
        { platform: 'ios', users: 5234, sessions: 12456, avgSessionDuration: 8.5, bounceRate: 23.4 },
        { platform: 'android', users: 4892, sessions: 10234, avgSessionDuration: 7.2, bounceRate: 28.1 },
        { platform: 'web', users: 2721, sessions: 6789, avgSessionDuration: 12.3, bounceRate: 18.7 },
      ]);
      setGeoStats([
        { country: 'Türkiye', code: 'TR', users: 8234, percentage: 64.1 },
        { country: 'Almanya', code: 'DE', users: 1892, percentage: 14.7 },
        { country: 'ABD', code: 'US', users: 1234, percentage: 9.6 },
        { country: 'İngiltere', code: 'GB', users: 892, percentage: 6.9 },
        { country: 'Diğer', code: 'XX', users: 595, percentage: 4.7 },
      ]);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && activeTab === 'analytics') {
      loadAnalytics();
    }
  }, [analyticsRange, authenticated, activeTab]);


  // ═══════════════════════════════════════════════════════════════════════════════
  // USERS FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  };
  // ═══════════════════════════════════════════════════════════════════════════════
  // AUXITEER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const loadAuxiteerConfig = async () => {
    try {
      const res = await fetch("/api/admin/auxiteer/config", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.tiers) setAuxiteerTiers(data.tiers);
      }
    } catch (e) {
      console.error("Failed to load auxiteer config:", e);
    }
  };

  const loadSovereignInvitations = async () => {
    try {
      const res = await fetch("/api/admin/auxiteer/invitations", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.invitations) setSovereignInvitations(data.invitations);
      }
    } catch (e) {
      console.error("Failed to load invitations:", e);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // WEBSITE MANAGEMENT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  const loadWebsiteData = async () => {
    setWebsiteLoading(true);
    try {
      const [settingsRes, roadmapRes, teamRes, vaultsRes, seoRes] = await Promise.all([
        fetch('/api/admin/website/settings', { headers: getAuthHeaders() }),
        fetch('/api/admin/website/roadmap', { headers: getAuthHeaders() }),
        fetch('/api/admin/website/team', { headers: getAuthHeaders() }),
        fetch('/api/admin/website/vaults', { headers: getAuthHeaders() }),
        fetch('/api/admin/website/seo', { headers: getAuthHeaders() }),
      ]);
      
      if (settingsRes.ok) setWebsiteSettings(await settingsRes.json());
      if (roadmapRes.ok) setRoadmapPhases(await roadmapRes.json());
      if (teamRes.ok) setTeamMembers(await teamRes.json());
      if (vaultsRes.ok) setVaultLocations(await vaultsRes.json());
      if (seoRes.ok) setWebsiteSEO(await seoRes.json());
    } catch (err) {
      console.error('Website data load error:', err);
    }
    setWebsiteLoading(false);
  };

  const saveWebsiteSettings = async () => {
    setWebsiteSaving(true);
    try {
      const res = await fetch('/api/admin/website/settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(websiteSettings),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Website ayarları kaydedildi!' });
      } else {
        setMessage({ type: 'error', text: 'Kaydetme hatası!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Bağlantı hatası!' });
    }
    setWebsiteSaving(false);
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const saveRoadmapPhase = async (phase: any) => {
    try {
      const res = await fetch('/api/admin/website/roadmap', {
        method: phase.id && !phase.id.startsWith('phase_') ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(phase),
      });
      if (res.ok) {
        loadWebsiteData();
        setShowWebsiteModal(null);
        setEditingItem(null);
      }
    } catch (err) {
      alert('Kaydetme hatası!');
    }
  };

  const saveTeamMember = async (member: any) => {
    try {
      const res = await fetch('/api/admin/website/team', {
        method: member.id && !member.id.startsWith('member_') ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(member),
      });
      if (res.ok) {
        loadWebsiteData();
        setShowWebsiteModal(null);
        setEditingItem(null);
      }
    } catch (err) {
      alert('Kaydetme hatası!');
    }
  };

  const saveVaultLocation = async (vault: any) => {
    try {
      const res = await fetch('/api/admin/website/vaults', {
        method: vault.id && !vault.id.startsWith('vault_') ? 'PUT' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(vault),
      });
      if (res.ok) {
        loadWebsiteData();
        setShowWebsiteModal(null);
        setEditingItem(null);
      }
    } catch (err) {
      alert('Kaydetme hatası!');
    }
  };

  const deleteWebsiteItem = async (type: string, id: string) => {
    if (!confirm('Silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/admin/website/${type}/${id}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      loadWebsiteData();
    } catch (err) {
      alert('Silme hatası!');
    }
  };

  const updateAuxiteerTierValue = (tierId: string, field: string, value: number | boolean) => {
    setAuxiteerTiers(prev => prev.map(tier => {
      if (tier.id !== tierId) return tier;
      
      if (field === 'spread' || field === 'fee') {
        return { ...tier, [field]: value as number };
      }
      
      if (field.startsWith('req_')) {
        const reqField = field.replace('req_', '') as keyof typeof tier.requirements;
        return {
          ...tier,
          requirements: { ...tier.requirements, [reqField]: value },
        };
      }
      
      return tier;
    }));
  };

  const saveAuxiteerConfig = async () => {
    setAuxiteerSaving(true);
    setAuxiteerMessage(null);
    
    try {
      const res = await fetch("/api/admin/auxiteer/config", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ tiers: auxiteerTiers }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setAuxiteerMessage({ type: 'success', text: 'Tier ayarları kaydedildi!' });
        setAuxiteerEditingTier(null);
      } else {
        setAuxiteerMessage({ type: 'error', text: data.error || 'Kaydetme başarısız' });
      }
    } catch (e) {
      setAuxiteerMessage({ type: 'error', text: 'Bağlantı hatası' });
    } finally {
      setAuxiteerSaving(false);
      setTimeout(() => setAuxiteerMessage(null), 3000);
    }
  };

  const inviteToSovereign = async () => {
    if (!newSovereignAddress || !newSovereignAddress.startsWith('0x')) {
      alert('Geçerli bir cüzdan adresi girin');
      return;
    }
    
    setSovereignLoading(true);
    
    try {
      const res = await fetch("/api/admin/auxiteer/invite", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ walletAddress: newSovereignAddress }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setNewSovereignAddress("");
        loadSovereignInvitations();
        alert('Kullanıcı Sovereign tier\'a davet edildi!');
      } else {
        alert(data.error || 'Davet başarısız');
      }
    } catch (e) {
      alert('Bağlantı hatası');
    } finally {
      setSovereignLoading(false);
    }
  };

  const revokeSovereignInvitation = async (walletAddress: string) => {
    if (!confirm('Bu kullanıcının Sovereign davetini iptal etmek istediğinize emin misiniz?')) {
      return;
    }
    
    try {
      const res = await fetch("/api/admin/auxiteer/invite", {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ walletAddress }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        loadSovereignInvitations();
      } else {
        alert(data.error || 'İptal başarısız');
      }
    } catch (e) {
      alert('Bağlantı hatası');
    }
  };
  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLER FUNCTIONS
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
        body: JSON.stringify({ type, asset: key, buy: values.buy, sell: values.sell }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessage({ type: "success", text: `${key.toUpperCase()} spread güncellendi` });
        if (data.config) setSpreadConfigState(data.config);
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
      await fetch(`/api/news?id=${id}`, { method: "DELETE", headers: getAuthHeaders() });
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

  // Mobile Config Handlers
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
        body: JSON.stringify({ action: "set-maintenance", ...maintenanceConfig }),
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
        body: JSON.stringify({ action: "update-features", features: { [feature]: newValue } }),
      });
    } catch (e) {
      setFeatureFlags({ ...featureFlags, [feature]: !newValue });
    }
  };

  const handleSendPush = async () => {
    if (!newPush.title || !newPush.body) return;
    
    setMobileSaving("push");
    try {
      const res = await fetch("/api/admin/mobile", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "send-push", ...newPush }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Push notification gönderildi" });
        setNewPush({ title: "", body: "", target: "all" });
        loadMobileConfig();
      }
    } catch {
      setMessage({ type: "error", text: "Gönderim başarısız" });
    } finally {
      setMobileSaving(null);
    }
  };

  // Banner Handlers
  const handleAddBanner = async () => {
    if (!newBanner.title?.tr || !newBanner.title?.en) {
      setMessage({ type: "error", text: "Başlık (TR ve EN) gerekli" });
      return;
    }
    
    setBannerSaving(true);
    try {
      const res = await fetch("/api/mobile/banners", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "add", banner: newBanner }),
      });
      
      if (res.ok) {
        setMessage({ type: "success", text: "Banner eklendi" });
        setNewBanner({
          title: { tr: '', en: '' },
          subtitle: { tr: '', en: '' },
          backgroundColor: '#10b981',
          textColor: '#ffffff',
          actionType: 'none',
          actionValue: '',
          active: true,
          priority: 50,
          platform: 'all',
        });
        loadBanners();
      }
    } catch {
      setMessage({ type: "error", text: "Banner eklenemedi" });
    } finally {
      setBannerSaving(false);
    }
  };

  const handleToggleBanner = async (bannerId: string) => {
    try {
      await fetch("/api/mobile/banners", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "toggle", bannerId }),
      });
      loadBanners();
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!confirm("Bu banner'ı silmek istediğinize emin misiniz?")) return;
    
    try {
      await fetch("/api/mobile/banners", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "delete", bannerId }),
      });
      loadBanners();
      setMessage({ type: "success", text: "Banner silindi" });
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  // Campaign Handlers
  const handleAddCampaign = async () => {
    if (!newCampaign.name?.tr || !newCampaign.name?.en) {
      setMessage({ type: "error", text: "Kampanya adı (TR ve EN) gerekli" });
      return;
    }
    
    setCampaignSaving(true);
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "add", campaign: { ...newCampaign, usageCount: 0 } }),
      });
      
      if (res.ok) {
        setMessage({ type: "success", text: "Kampanya oluşturuldu" });
        setNewCampaign({
          name: { tr: '', en: '' },
          description: { tr: '', en: '' },
          type: 'bonus',
          value: 10,
          valueType: 'percentage',
          code: '',
          targetAssets: ['all'],
          targetActions: ['buy'],
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          active: true,
        });
        loadCampaigns();
      }
    } catch {
      setMessage({ type: "error", text: "Kampanya oluşturulamadı" });
    } finally {
      setCampaignSaving(false);
    }
  };

  const handleToggleCampaign = async (campaignId: string) => {
    try {
      await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "toggle", campaignId }),
      });
      loadCampaigns();
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Bu kampanyayı silmek istediğinize emin misiniz?")) return;
    
    try {
      await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "delete", campaignId }),
      });
      loadCampaigns();
      setMessage({ type: "success", text: "Kampanya silindi" });
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  // Announcement Handlers
  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title?.tr || !newAnnouncement.title?.en) {
      setMessage({ type: "error", text: "Duyuru başlığı (TR ve EN) gerekli" });
      return;
    }
    
    setAnnouncementSaving(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "add", announcement: newAnnouncement }),
      });
      
      if (res.ok) {
        setMessage({ type: "success", text: "Duyuru oluşturuldu" });
        setNewAnnouncement({
          title: { tr: '', en: '' },
          message: { tr: '', en: '' },
          type: 'info',
          priority: 'medium',
          dismissible: true,
          showOnce: false,
          targetScreens: ['all'],
          targetUsers: 'all',
          platform: 'all',
          active: true,
        });
        loadAnnouncements();
      }
    } catch {
      setMessage({ type: "error", text: "Duyuru oluşturulamadı" });
    } finally {
      setAnnouncementSaving(false);
    }
  };

  const handleToggleAnnouncement = async (announcementId: string) => {
    try {
      await fetch("/api/admin/announcements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "toggle", announcementId }),
      });
      loadAnnouncements();
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm("Bu duyuruyu silmek istediğinize emin misiniz?")) return;
    
    try {
      await fetch("/api/admin/announcements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "delete", announcementId }),
      });
      loadAnnouncements();
      setMessage({ type: "success", text: "Duyuru silindi" });
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  // Utility Functions
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("tr-TR");
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER - AUTH CHECK
  // ═══════════════════════════════════════════════════════════════════════════════

  // NOT AUTHENTICATED - Show password login
  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="w-full max-w-sm p-8 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-xl font-bold">Auxite Admin</h1>
            <p className="text-slate-400 text-sm mt-2">Yönetim paneline giriş yapın</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Şifresi"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white mb-4 focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {authError && <p className="text-red-400 text-sm mb-4">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors"
            >
              {authLoading ? "Kontrol ediliyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.svg" alt="Auxite" width={32} height={32} />
              <span className="font-bold text-lg">Admin</span>
            </Link>
            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded">
              v2.0
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-emerald-400 font-medium">
              ● Admin Oturumu Aktif
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
            >
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* Message Toast */}
      {message.text && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-xl shadow-lg ${
          message.type === "success" ? "bg-emerald-500/90" : "bg-red-500/90"
        }`}>
          <div className="flex items-center gap-2">
            <span>{message.type === "success" ? "✓" : "✕"}</span>
            <span className="text-sm font-medium">{message.text}</span>
            <button onClick={() => setMessage({ type: "", text: "" })} className="ml-2">✕</button>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 min-h-[calc(100vh-57px)] bg-slate-900/50 border-r border-slate-800 p-4 sticky top-[57px]">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  activeTab === tab.id
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <button
                  onClick={loadStats}
                  disabled={statsLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2"
                >
                  <span className={statsLoading ? "animate-spin" : ""}>🔄</span>
                  Yenile
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: "Toplam Kullanıcı", value: formatNumber(stats.totalUsers), icon: "👥", color: "text-blue-400" },
                  { label: "Toplam İşlem", value: formatNumber(stats.totalTrades), icon: "📊", color: "text-emerald-400" },
                  { label: "Toplam Hacim", value: stats.totalVolume, icon: "💰", color: "text-amber-400" },
                  { label: "Bekleyen Çekim", value: stats.pendingWithdraws, icon: "⏳", color: "text-orange-400" },
                  { label: "Bekleyen KYC", value: stats.pendingKYC, icon: "📋", color: "text-purple-400" },
                  { label: "Aktif Uyarı", value: stats.activeAlerts, icon: "🔔", color: "text-red-400" },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{stat.icon}</span>
                      <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
                    </div>
                    <p className="text-xs text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Yeni Banner", icon: "🖼️", tab: "banners" },
                  { label: "Kampanya Oluştur", icon: "🎁", tab: "campaigns" },
                  { label: "Duyuru Yayınla", icon: "📢", tab: "alerts" },
                  { label: "Analitik", icon: "📈", tab: "analytics" },
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTab(action.tab as TabId)}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <p className="mt-2 font-medium">{action.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">📈 Analitik Dashboard</h2>
                <div className="flex items-center gap-2">
                  {(['24h', '7d', '30d', '90d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setAnalyticsRange(range)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        analyticsRange === range
                          ? "bg-amber-500 text-black"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>

              {analyticsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin text-4xl mb-4">⏳</div>
                    <p className="text-slate-400">Yükleniyor...</p>
                  </div>
                </div>
              ) : analyticsOverview ? (
                <>
                  {/* Overview Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                      <p className="text-blue-400 text-sm mb-1">Toplam Kullanıcı</p>
                      <p className="text-2xl font-bold">{formatNumber(analyticsOverview.totalUsers)}</p>
                      <p className="text-xs text-emerald-400 mt-1">+{formatNumber(analyticsOverview.newUsers7d)} bu hafta</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl p-4">
                      <p className="text-emerald-400 text-sm mb-1">Aktif Kullanıcı (24s)</p>
                      <p className="text-2xl font-bold">{formatNumber(analyticsOverview.activeUsers24h)}</p>
                      <p className="text-xs text-slate-400 mt-1">{((analyticsOverview.activeUsers24h / analyticsOverview.totalUsers) * 100).toFixed(1)}% aktif</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
                      <p className="text-amber-400 text-sm mb-1">Toplam Hacim</p>
                      <p className="text-2xl font-bold">{formatCurrency(analyticsOverview.totalVolume)}</p>
                      <p className="text-xs text-emerald-400 mt-1">{formatCurrency(analyticsOverview.volume24h)} bugün</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
                      <p className="text-purple-400 text-sm mb-1">Toplam İşlem</p>
                      <p className="text-2xl font-bold">{formatNumber(analyticsOverview.totalTrades)}</p>
                      <p className="text-xs text-slate-400 mt-1">Ort: {formatCurrency(analyticsOverview.avgTradeSize)}</p>
                    </div>
                  </div>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Segments */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                      <h3 className="font-semibold mb-4">👥 Kullanıcı Segmentleri</h3>
                      <div className="space-y-3">
                        {userSegments.map((segment, i) => (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm">{segment.name}</span>
                              <span className="text-sm text-slate-400">{formatNumber(segment.count)} ({segment.percentage}%)</span>
                            </div>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${segment.percentage}%`, backgroundColor: segment.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Assets */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                      <h3 className="font-semibold mb-4">🏆 En Çok İşlem Gören</h3>
                      <div className="space-y-3">
                        {topAssets.map((asset, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{METALS.find(m => m.symbol === asset.symbol)?.icon || '💎'}</span>
                              <div>
                                <p className="font-medium">{asset.symbol}</p>
                                <p className="text-xs text-slate-400">{asset.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(asset.volume)}</p>
                              <p className={`text-xs ${asset.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {formatPercentage(asset.change)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Platform Stats */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="font-semibold mb-4">📱 Platform İstatistikleri</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {platformStats.map((stat, i) => (
                        <div key={i} className="p-4 bg-slate-800/50 rounded-xl">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">
                              {stat.platform === 'ios' ? '🍎' : stat.platform === 'android' ? '🤖' : '🌐'}
                            </span>
                            <span className="font-semibold capitalize">{stat.platform}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-slate-400">Kullanıcı</p>
                              <p className="font-medium">{formatNumber(stat.users)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Oturum</p>
                              <p className="font-medium">{formatNumber(stat.sessions)}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Ort. Süre</p>
                              <p className="font-medium">{stat.avgSessionDuration.toFixed(1)} dk</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Bounce</p>
                              <p className="font-medium">{stat.bounceRate}%</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Geo Stats */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <h3 className="font-semibold mb-4">🌍 Coğrafi Dağılım</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {geoStats.map((geo, i) => (
                        <div key={i} className="p-3 bg-slate-800/50 rounded-lg text-center">
                          <p className="text-2xl mb-1">
                            {geo.code === 'TR' ? '🇹🇷' : geo.code === 'DE' ? '🇩🇪' : geo.code === 'US' ? '🇺🇸' : geo.code === 'GB' ? '🇬🇧' : '🌍'}
                          </p>
                          <p className="font-medium">{geo.country}</p>
                          <p className="text-sm text-slate-400">{formatNumber(geo.users)} ({geo.percentage}%)</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Analitik verisi yüklenemedi
                </div>
              )}
            </div>
          )}
          {/* Banners Tab */}
          {activeTab === "banners" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">🖼️ Banner Yönetimi</h2>

              {/* Existing Banners */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Mevcut Banner'lar ({banners.length})</h3>
                
                {banners.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Henüz banner eklenmemiş</p>
                ) : (
                  <div className="space-y-3">
                    {banners.map((banner) => (
                      <div
                        key={banner.id}
                        className={`p-4 rounded-xl border ${
                          banner.active ? "bg-slate-800/50 border-slate-700" : "bg-slate-900/50 border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Preview */}
                          <div
                            className="w-40 h-20 rounded-lg flex flex-col items-center justify-center text-xs shrink-0 p-2"
                            style={{ backgroundColor: banner.backgroundColor, color: banner.textColor }}
                          >
                            <p className="font-semibold text-center line-clamp-1">{banner.title.tr}</p>
                            {banner.subtitle?.tr && <p className="opacity-80 text-center line-clamp-1">{banner.subtitle.tr}</p>}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-white">{banner.title.tr}</p>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                banner.platform === 'mobile' ? 'bg-purple-500/20 text-purple-400' :
                                banner.platform === 'web' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-700 text-slate-300'
                              }`}>
                                {banner.platform}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 truncate">{banner.title.en}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span>Öncelik: {banner.priority}</span>
                              <span>Aksiyon: {banner.actionType}</span>
                              {banner.actionValue && <span className="text-blue-400">{banner.actionValue}</span>}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleBanner(banner.id)}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                banner.active
                                  ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                              }`}
                            >
                              {banner.active ? "✓" : "○"}
                            </button>
                            <button
                              onClick={() => handleDeleteBanner(banner.id)}
                              className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Banner Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Yeni Banner Ekle</h3>
                
                {/* Dil Seçici Tabs */}
                <div className="flex gap-1 mb-4 flex-wrap">
                  {['TR', 'EN', 'DE', 'FR', 'AR', 'RU'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setBannerLangTab(lang.toLowerCase())}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        bannerLangTab === lang.toLowerCase()
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Başlık - Aktif Dil */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Başlık ({bannerLangTab.toUpperCase()}) {['tr', 'en'].includes(bannerLangTab) && '*'}
                    </label>
                    <input
                      type="text"
                      value={(newBanner.title as any)?.[bannerLangTab] || ''}
                      onChange={(e) => setNewBanner({ 
                        ...newBanner, 
                        title: { ...newBanner.title!, [bannerLangTab]: e.target.value } 
                      })}
                      placeholder={bannerLangTab === 'tr' ? '🎉 Hoş Geldiniz!' : bannerLangTab === 'en' ? '🎉 Welcome!' : bannerLangTab === 'de' ? '🎉 Willkommen!' : bannerLangTab === 'fr' ? '🎉 Bienvenue!' : bannerLangTab === 'ar' ? '🎉 مرحباً!' : '🎉 Добро пожаловать!'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                      dir={bannerLangTab === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>
                  
                  {/* Alt Başlık - Aktif Dil */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Alt Başlık ({bannerLangTab.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      value={(newBanner.subtitle as any)?.[bannerLangTab] || ''}
                      onChange={(e) => setNewBanner({ 
                        ...newBanner, 
                        subtitle: { tr: newBanner.subtitle?.tr || '', en: newBanner.subtitle?.en || '', ...newBanner.subtitle, [bannerLangTab]: e.target.value } 
                      })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                      dir={bannerLangTab === 'ar' ? 'rtl' : 'ltr'}
                    />
                  </div>

                  {/* Dil Durumu Göstergesi */}
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500 mb-2">Dil Durumu:</p>
                    <div className="flex gap-2 flex-wrap">
                      {['tr', 'en', 'de', 'fr', 'ar', 'ru'].map((lang) => (
                        <span 
                          key={lang}
                          className={`px-2 py-0.5 rounded text-xs ${
                            (newBanner.title as any)?.[lang] 
                              ? 'bg-emerald-500/20 text-emerald-400' 
                              : 'bg-slate-700 text-slate-500'
                          }`}
                        >
                          {lang.toUpperCase()}: {(newBanner.title as any)?.[lang] ? '✓' : '—'}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Arka Plan Rengi</label>
                    <div className="flex gap-2">
                      <input type="color" value={newBanner.backgroundColor || '#10b981'} onChange={(e) => setNewBanner({ ...newBanner, backgroundColor: e.target.value })} className="w-12 h-10 rounded cursor-pointer" />
                      <input type="text" value={newBanner.backgroundColor || '#10b981'} onChange={(e) => setNewBanner({ ...newBanner, backgroundColor: e.target.value })} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Yazı Rengi</label>
                    <div className="flex gap-2">
                      <input type="color" value={newBanner.textColor || '#ffffff'} onChange={(e) => setNewBanner({ ...newBanner, textColor: e.target.value })} className="w-12 h-10 rounded cursor-pointer" />
                      <input type="text" value={newBanner.textColor || '#ffffff'} onChange={(e) => setNewBanner({ ...newBanner, textColor: e.target.value })} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Platform</label>
                    <select value={newBanner.platform || 'all'} onChange={(e) => setNewBanner({ ...newBanner, platform: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="all">Tümü</option>
                      <option value="mobile">Sadece Mobil</option>
                      <option value="web">Sadece Web</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Öncelik (1-100)</label>
                    <input type="number" min="1" max="100" value={newBanner.priority || 50} onChange={(e) => setNewBanner({ ...newBanner, priority: parseInt(e.target.value) || 50 })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Aksiyon Tipi</label>
                    <select value={newBanner.actionType || 'none'} onChange={(e) => setNewBanner({ ...newBanner, actionType: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="none">Yok</option>
                      <option value="screen">Sayfa Aç</option>
                      <option value="link">Link Aç</option>
                      <option value="promo">Promo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Aksiyon Değeri</label>
                    <input type="text" value={newBanner.actionValue || ''} onChange={(e) => setNewBanner({ ...newBanner, actionValue: e.target.value })} placeholder="trade, convert..." disabled={newBanner.actionType === 'none'} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm disabled:opacity-50" />
                  </div>
                </div>

                {/* Preview */}
                <div className="mt-4 p-4 bg-slate-800/50 rounded-xl">
                  <p className="text-xs text-slate-400 mb-2">Önizleme ({bannerLangTab.toUpperCase()})</p>
                  <div className="h-20 rounded-lg flex items-center justify-between px-4" style={{ backgroundColor: newBanner.backgroundColor || '#10b981', color: newBanner.textColor || '#ffffff' }}>
                    <div style={{ direction: bannerLangTab === 'ar' ? 'rtl' : 'ltr' }}>
                      <p className="font-semibold">{(newBanner.title as any)?.[bannerLangTab] || 'Banner Başlığı'}</p>
                      <p className="text-sm opacity-80">{(newBanner.subtitle as any)?.[bannerLangTab] || 'Alt başlık'}</p>
                    </div>
                    {newBanner.actionType !== 'none' && <span className="text-xl">→</span>}
                  </div>
                </div>
                <button onClick={handleAddBanner} disabled={bannerSaving} className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium disabled:opacity-50">
                  {bannerSaving ? "Ekleniyor..." : "Banner Ekle"}
                </button>
              </div>
            </div>
          )}

          {/* Campaigns Tab */}
          {activeTab === "campaigns" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">🎁 Kampanya Yönetimi</h2>

              {/* Existing Campaigns */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Aktif Kampanyalar ({campaigns.filter(c => c.active).length}/{campaigns.length})</h3>
                
                {campaigns.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Henüz kampanya oluşturulmamış</p>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <div key={campaign.id} className={`p-4 rounded-xl border ${campaign.active ? "bg-slate-800/50 border-slate-700" : "bg-slate-900/50 border-slate-800 opacity-60"}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">
                                {campaign.type === 'discount' ? '🏷️' : campaign.type === 'bonus' ? '🎁' : campaign.type === 'cashback' ? '💰' : campaign.type === 'referral' ? '👥' : '⭐'}
                              </span>
                              <p className="font-semibold">{campaign.name.tr}</p>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                campaign.type === 'discount' ? 'bg-red-500/20 text-red-400' :
                                campaign.type === 'bonus' ? 'bg-emerald-500/20 text-emerald-400' :
                                campaign.type === 'cashback' ? 'bg-amber-500/20 text-amber-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {campaign.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 mb-2">{campaign.description.tr}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded font-bold">
                                {campaign.valueType === 'percentage' ? `%${campaign.value}` : `$${campaign.value}`}
                              </span>
                              {campaign.code && <span className="px-2 py-1 bg-slate-700 rounded font-mono">{campaign.code}</span>}
                              <span className="text-slate-500">
                                {new Date(campaign.startDate).toLocaleDateString('tr')} - {new Date(campaign.endDate).toLocaleDateString('tr')}
                              </span>
                              <span className="text-slate-500">Kullanım: {campaign.usageCount}{campaign.usageLimit ? `/${campaign.usageLimit}` : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleCampaign(campaign.id)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${campaign.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                              {campaign.active ? "✓" : "○"}
                            </button>
                            <button onClick={() => handleDeleteCampaign(campaign.id)} className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center">
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Campaign Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Yeni Kampanya Oluştur</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kampanya Adı (TR) *</label>
                    <input type="text" value={newCampaign.name?.tr || ''} onChange={(e) => setNewCampaign({ ...newCampaign, name: { ...newCampaign.name!, tr: e.target.value } })} placeholder="Hoş Geldin Bonusu" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kampanya Adı (EN) *</label>
                    <input type="text" value={newCampaign.name?.en || ''} onChange={(e) => setNewCampaign({ ...newCampaign, name: { ...newCampaign.name!, en: e.target.value } })} placeholder="Welcome Bonus" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kampanya Tipi</label>
                    <select value={newCampaign.type || 'bonus'} onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="bonus">🎁 Bonus</option>
                      <option value="discount">🏷️ İndirim</option>
                      <option value="cashback">💰 Cashback</option>
                      <option value="referral">👥 Referral</option>
                      <option value="limited">⭐ Sınırlı</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Açıklama (TR)</label>
                    <input type="text" value={newCampaign.description?.tr || ''} onChange={(e) => setNewCampaign({ ...newCampaign, description: { ...newCampaign.description!, tr: e.target.value } })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Değer Tipi</label>
                    <select value={newCampaign.valueType || 'percentage'} onChange={(e) => setNewCampaign({ ...newCampaign, valueType: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="percentage">Yüzde (%)</option>
                      <option value="fixed">Sabit ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Değer</label>
                    <input type="number" value={newCampaign.value || 10} onChange={(e) => setNewCampaign({ ...newCampaign, value: parseFloat(e.target.value) })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Promo Kodu (opsiyonel)</label>
                    <input type="text" value={newCampaign.code || ''} onChange={(e) => setNewCampaign({ ...newCampaign, code: e.target.value.toUpperCase() })} placeholder="WELCOME2024" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Başlangıç</label>
                    <input type="date" value={newCampaign.startDate || ''} onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bitiş</label>
                    <input type="date" value={newCampaign.endDate || ''} onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kullanım Limiti (opsiyonel)</label>
                    <input type="number" value={newCampaign.usageLimit || ''} onChange={(e) => setNewCampaign({ ...newCampaign, usageLimit: parseInt(e.target.value) || undefined })} placeholder="Sınırsız" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                </div>

                <button onClick={handleAddCampaign} disabled={campaignSaving} className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-medium disabled:opacity-50">
                  {campaignSaving ? "Oluşturuluyor..." : "Kampanya Oluştur"}
                </button>
              </div>
            </div>
          )}

          {/* Alerts/Announcements Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">📢 Duyuru & Alert Yönetimi</h2>

              {/* Existing Announcements */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Aktif Duyurular ({announcements.filter(a => a.active).length}/{announcements.length})</h3>
                
                {announcements.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Henüz duyuru oluşturulmamış</p>
                ) : (
                  <div className="space-y-3">
                    {announcements.map((announcement) => (
                      <div key={announcement.id} className={`p-4 rounded-xl border-l-4 ${
                        announcement.type === 'error' ? 'border-l-red-500 bg-red-500/10' :
                        announcement.type === 'warning' ? 'border-l-amber-500 bg-amber-500/10' :
                        announcement.type === 'success' ? 'border-l-emerald-500 bg-emerald-500/10' :
                        announcement.type === 'maintenance' ? 'border-l-purple-500 bg-purple-500/10' :
                        'border-l-blue-500 bg-blue-500/10'
                      } ${!announcement.active && 'opacity-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">
                                {announcement.type === 'error' ? '🚨' : announcement.type === 'warning' ? '⚠️' : announcement.type === 'success' ? '✅' : announcement.type === 'maintenance' ? '🔧' : 'ℹ️'}
                              </span>
                              <p className="font-semibold">{announcement.title.tr}</p>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                announcement.priority === 'critical' ? 'bg-red-500/30 text-red-400' :
                                announcement.priority === 'high' ? 'bg-orange-500/30 text-orange-400' :
                                announcement.priority === 'medium' ? 'bg-amber-500/30 text-amber-400' :
                                'bg-slate-600 text-slate-300'
                              }`}>
                                {announcement.priority}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                announcement.platform === 'mobile' ? 'bg-purple-500/20 text-purple-400' :
                                announcement.platform === 'web' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-slate-700 text-slate-300'
                              }`}>
                                {announcement.platform}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400">{announcement.message.tr}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              {announcement.dismissible && <span>✕ Kapatılabilir</span>}
                              {announcement.showOnce && <span>👁 Bir kez göster</span>}
                              <span>📍 {announcement.targetScreens?.join(', ')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleAnnouncement(announcement.id)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${announcement.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
                              {announcement.active ? "✓" : "○"}
                            </button>
                            <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 flex items-center justify-center">
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New Announcement Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Yeni Duyuru Oluştur</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Başlık (TR) *</label>
                    <input type="text" value={newAnnouncement.title?.tr || ''} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: { ...newAnnouncement.title!, tr: e.target.value } })} placeholder="Önemli Duyuru" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Başlık (EN) *</label>
                    <input type="text" value={newAnnouncement.title?.en || ''} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: { ...newAnnouncement.title!, en: e.target.value } })} placeholder="Important Notice" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tip</label>
                    <select value={newAnnouncement.type || 'info'} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, type: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="info">ℹ️ Bilgi</option>
                      <option value="success">✅ Başarı</option>
                      <option value="warning">⚠️ Uyarı</option>
                      <option value="error">🚨 Hata</option>
                      <option value="maintenance">🔧 Bakım</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Mesaj (TR) *</label>
                    <textarea value={newAnnouncement.message?.tr || ''} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, message: { ...newAnnouncement.message!, tr: e.target.value } })} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Öncelik</label>
                    <select value={newAnnouncement.priority || 'medium'} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="critical">Kritik</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Platform</label>
                    <select value={newAnnouncement.platform || 'all'} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, platform: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="all">Tümü</option>
                      <option value="mobile">Sadece Mobil</option>
                      <option value="web">Sadece Web</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hedef Kullanıcı</label>
                    <select value={newAnnouncement.targetUsers || 'all'} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, targetUsers: e.target.value as any })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm">
                      <option value="all">Herkes</option>
                      <option value="verified">KYC Onaylı</option>
                      <option value="unverified">KYC Bekleyen</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newAnnouncement.dismissible !== false} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, dismissible: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm">Kapatılabilir</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newAnnouncement.showOnce || false} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, showOnce: e.target.checked })} className="w-4 h-4 rounded" />
                      <span className="text-sm">Bir kez göster</span>
                    </label>
                  </div>
                </div>

                <button onClick={handleAddAnnouncement} disabled={announcementSaving} className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium disabled:opacity-50">
                  {announcementSaving ? "Oluşturuluyor..." : "Duyuru Yayınla"}
                </button>
              </div>
            </div>
          )}
          {/* Spreads Tab */}
          {activeTab === "spreads" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">💹 Spread Ayarları</h2>
              
              {/* Metals */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">🥇 Değerli Metaller</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {METALS.map((metal) => (
                    <div key={metal.key} className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{metal.icon}</span>
                        <span className="font-medium">{metal.name}</span>
                        <span className="text-xs text-slate-500">{metal.symbol}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Alış Spread %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={spreadConfig.metals[metal.key as keyof MetalSpreadSettings].buy}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              metals: { ...spreadConfig.metals, [metal.key]: { ...spreadConfig.metals[metal.key as keyof MetalSpreadSettings], buy: parseFloat(e.target.value) } }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Satış Spread %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={spreadConfig.metals[metal.key as keyof MetalSpreadSettings].sell}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              metals: { ...spreadConfig.metals, [metal.key]: { ...spreadConfig.metals[metal.key as keyof MetalSpreadSettings], sell: parseFloat(e.target.value) } }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleSpreadUpdate('metal', metal.key)}
                        disabled={spreadSaving === `metal-${metal.key}`}
                        className="mt-3 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {spreadSaving === `metal-${metal.key}` ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptos */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">₿ Kripto Paralar</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CRYPTOS.map((crypto) => (
                    <div key={crypto.key} className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xl ${crypto.color}`}>{crypto.icon}</span>
                        <span className="font-medium">{crypto.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Alış %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={spreadConfig.crypto[crypto.key as keyof CryptoSpreadSettings].buy}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              crypto: { ...spreadConfig.crypto, [crypto.key]: { ...spreadConfig.crypto[crypto.key as keyof CryptoSpreadSettings], buy: parseFloat(e.target.value) } }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Satış %</label>
                          <input
                            type="number"
                            step="0.1"
                            value={spreadConfig.crypto[crypto.key as keyof CryptoSpreadSettings].sell}
                            onChange={(e) => setSpreadConfigState({
                              ...spreadConfig,
                              crypto: { ...spreadConfig.crypto, [crypto.key]: { ...spreadConfig.crypto[crypto.key as keyof CryptoSpreadSettings], sell: parseFloat(e.target.value) } }
                            })}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleSpreadUpdate('crypto', crypto.key)}
                        disabled={spreadSaving === `crypto-${crypto.key}`}
                        className="mt-3 w-full py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {spreadSaving === `crypto-${crypto.key}` ? "Kaydediliyor..." : "Kaydet"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* News Tab */}
          {activeTab === "news" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">📰 Haber Yönetimi</h2>
              
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Yeni Haber Ekle</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Başlık"
                    value={newNews.title}
                    onChange={(e) => setNewNews({ ...newNews, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                  />
                  <textarea
                    placeholder="İçerik"
                    value={newNews.content}
                    onChange={(e) => setNewNews({ ...newNews, content: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white resize-none"
                  />
                  <div className="flex gap-4">
                    <select
                      value={newNews.category}
                      onChange={(e) => setNewNews({ ...newNews, category: e.target.value as any })}
                      className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    >
                      <option value="update">Güncelleme</option>
                      <option value="alert">Uyarı</option>
                      <option value="promo">Promosyon</option>
                    </select>
                    <button onClick={handleAddNews} className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium">
                      Ekle
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Mevcut Haberler ({newsItems.length})</h3>
                <div className="space-y-3">
                  {newsItems.map((news) => (
                    <div key={news.id} className="p-4 bg-slate-800/50 rounded-xl flex items-start justify-between">
                      <div>
                        <p className="font-medium">{news.title}</p>
                        <p className="text-sm text-slate-400 mt-1">{news.content}</p>
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                          news.category === 'alert' ? 'bg-red-500/20 text-red-400' :
                          news.category === 'promo' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>{news.category}</span>
                      </div>
                      <button onClick={() => handleDeleteNews(news.id)} className="text-red-400 hover:text-red-300">🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Tab */}
          {activeTab === "mobile" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">📱 Mobil Uygulama Ayarları</h2>

              {/* App Config */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">📲 Uygulama Versiyonu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* iOS */}
                  <div className="p-4 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">🍎</span>
                      <span className="font-semibold">iOS</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Min Versiyon</label>
                        <input type="text" value={mobileAppConfig.ios.minVersion} onChange={(e) => setMobileAppConfig({ ...mobileAppConfig, ios: { ...mobileAppConfig.ios, minVersion: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Güncel Versiyon</label>
                        <input type="text" value={mobileAppConfig.ios.currentVersion} onChange={(e) => setMobileAppConfig({ ...mobileAppConfig, ios: { ...mobileAppConfig.ios, currentVersion: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={mobileAppConfig.ios.forceUpdate} onChange={(e) => setMobileAppConfig({ ...mobileAppConfig, ios: { ...mobileAppConfig.ios, forceUpdate: e.target.checked } })} className="w-4 h-4 rounded" />
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
                        <label className="block text-xs text-slate-400 mb-1">Min Versiyon</label>
                        <input type="text" value={mobileAppConfig.android.minVersion} onChange={(e) => setMobileAppConfig({ ...mobileAppConfig, android: { ...mobileAppConfig.android, minVersion: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Güncel Versiyon</label>
                        <input type="text" value={mobileAppConfig.android.currentVersion} onChange={(e) => setMobileAppConfig({ ...mobileAppConfig, android: { ...mobileAppConfig.android, currentVersion: e.target.value } })} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={mobileAppConfig.android.forceUpdate} onChange={(e) => setMobileAppConfig({ ...mobileAppConfig, android: { ...mobileAppConfig.android, forceUpdate: e.target.checked } })} className="w-4 h-4 rounded" />
                        <span className="text-sm">Zorunlu Güncelleme</span>
                      </label>
                    </div>
                  </div>
                </div>
                <button onClick={handleAppConfigUpdate} disabled={mobileSaving === "app-config"} className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white font-medium disabled:opacity-50">
                  {mobileSaving === "app-config" ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>

              {/* Maintenance Mode */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">🚧 Bakım Modu</h3>
                  <button
                    onClick={() => setMaintenanceConfig({ ...maintenanceConfig, enabled: !maintenanceConfig.enabled })}
                    className={`relative w-14 h-7 rounded-full transition-colors ${maintenanceConfig.enabled ? "bg-red-500" : "bg-slate-600"}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${maintenanceConfig.enabled ? "left-8" : "left-1"}`} />
                  </button>
                </div>
                {maintenanceConfig.enabled && (
                  <div className="space-y-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Türkçe Mesaj</label>
                        <input type="text" value={maintenanceConfig.message.tr} onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, message: { ...maintenanceConfig.message, tr: e.target.value } })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">İngilizce Mesaj</label>
                        <input type="text" value={maintenanceConfig.message.en} onChange={(e) => setMaintenanceConfig({ ...maintenanceConfig, message: { ...maintenanceConfig.message, en: e.target.value } })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm" />
                      </div>
                    </div>
                  </div>
                )}
                <button onClick={handleMaintenanceUpdate} disabled={mobileSaving === "maintenance"} className={`mt-4 px-6 py-2 rounded-lg font-medium disabled:opacity-50 ${maintenanceConfig.enabled ? "bg-red-500 hover:bg-red-600 text-white" : "bg-slate-700 hover:bg-slate-600 text-white"}`}>
                  {mobileSaving === "maintenance" ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>

              {/* Feature Flags */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">🎛️ Özellik Ayarları</h3>
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

              {/* Push Notification */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">🔔 Push Notification Gönder</h3>
                <div className="space-y-4">
                  <input type="text" placeholder="Başlık" value={newPush.title} onChange={(e) => setNewPush({ ...newPush, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white" />
                  <textarea placeholder="Mesaj" value={newPush.body} onChange={(e) => setNewPush({ ...newPush, body: e.target.value })} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white resize-none" />
                  <div className="flex gap-4">
                    <select value={newPush.target} onChange={(e) => setNewPush({ ...newPush, target: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white">
                      <option value="all">Tüm Kullanıcılar</option>
                      <option value="ios">Sadece iOS</option>
                      <option value="android">Sadece Android</option>
                    </select>
                    <button onClick={handleSendPush} disabled={mobileSaving === "push"} className="px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium disabled:opacity-50">
                      {mobileSaving === "push" ? "Gönderiliyor..." : "Gönder"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Auxiteer Tab */}
          {activeTab === "auxiteer" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">⭐ Auxiteer Program Yönetimi</h2>
                <button
                  onClick={saveAuxiteerConfig}
                  disabled={auxiteerSaving}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-medium disabled:opacity-50"
                >
                  {auxiteerSaving ? 'Kaydediliyor...' : '💾 Kaydet'}
                </button>
              </div>

              {/* Success/Error Message */}
              {auxiteerMessage && (
                <div className={`p-4 rounded-xl ${
                  auxiteerMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {auxiteerMessage.text}
                </div>
              )}

              {/* Tier Cards */}
              <div className="grid gap-6">
                {auxiteerTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6"
                  >
                    {/* Tier Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: TIER_COLORS[tier.id] + '20' }}
                        >
                          {TIER_ICONS[tier.id]}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold" style={{ color: TIER_COLORS[tier.id] }}>
                            {tier.name}
                          </h3>
                          <p className="text-slate-400 text-sm">ID: {tier.id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAuxiteerEditingTier(auxiteerEditingTier === tier.id ? null : tier.id)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                      >
                        {auxiteerEditingTier === tier.id ? '✕ Kapat' : '✏️ Düzenle'}
                      </button>
                    </div>

                    {/* Fee & Spread Display */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <p className="text-slate-400 text-sm mb-1">Spread</p>
                        <p className="text-2xl font-bold" style={{ color: TIER_COLORS[tier.id] }}>
                          {tier.spread === 0 ? 'Custom' : `${tier.spread.toFixed(2)}%`}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <p className="text-slate-400 text-sm mb-1">İşlem Ücreti</p>
                        <p className="text-2xl font-bold" style={{ color: TIER_COLORS[tier.id] }}>
                          {tier.fee === 0 ? 'Custom' : `${tier.fee.toFixed(2)}%`}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <p className="text-slate-400 text-sm mb-1">Min. Bakiye</p>
                        <p className="text-lg font-bold text-white">
                          ${tier.requirements.minBalanceUsd.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <p className="text-slate-400 text-sm mb-1">Min. Gün</p>
                        <p className="text-lg font-bold text-white">
                          {tier.requirements.minDays}
                        </p>
                      </div>
                    </div>

                    {/* Requirements Pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {tier.requirements.kyc && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                          KYC Gerekli
                        </span>
                      )}
                      {tier.requirements.metalAsset && (
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm">
                          Metal Varlık
                        </span>
                      )}
                      {tier.requirements.activeEarnLease && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                          Aktif Earn/Lease
                        </span>
                      )}
                      {tier.requirements.invitation && (
                        <span className="px-3 py-1 bg-rose-500/20 text-rose-400 rounded-full text-sm">
                          Sadece Davetli
                        </span>
                      )}
                    </div>

                    {/* Edit Form */}
                    {auxiteerEditingTier === tier.id && (
                      <div className="mt-6 pt-6 border-t border-slate-700">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Spread */}
                          <div>
                            <label className="block text-sm text-slate-400 mb-2">Spread (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="10"
                              value={tier.spread}
                              onChange={(e) => updateAuxiteerTierValue(tier.id, 'spread', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                            />
                          </div>
                          
                          {/* Fee */}
                          <div>
                            <label className="block text-sm text-slate-400 mb-2">Fee (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="5"
                              value={tier.fee}
                              onChange={(e) => updateAuxiteerTierValue(tier.id, 'fee', parseFloat(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                            />
                          </div>
                          
                          {/* Min Balance */}
                          <div>
                            <label className="block text-sm text-slate-400 mb-2">Min. Bakiye ($)</label>
                            <input
                              type="number"
                              step="1000"
                              min="0"
                              value={tier.requirements.minBalanceUsd}
                              onChange={(e) => updateAuxiteerTierValue(tier.id, 'req_minBalanceUsd', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                            />
                          </div>
                          
                          {/* Min Days */}
                          <div>
                            <label className="block text-sm text-slate-400 mb-2">Min. Gün</label>
                            <input
                              type="number"
                              min="0"
                              value={tier.requirements.minDays}
                              onChange={(e) => updateAuxiteerTierValue(tier.id, 'req_minDays', parseInt(e.target.value) || 0)}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                            />
                          </div>
                        </div>

                        {/* Boolean Requirements */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          {[
                            { key: 'kyc', label: 'KYC Gerekli' },
                            { key: 'metalAsset', label: 'Metal Varlık' },
                            { key: 'activeEarnLease', label: 'Aktif Earn/Lease' },
                            { key: 'invitation', label: 'Davet Gerekli' },
                          ].map(({ key, label }) => (
                            <label key={key} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800">
                              <input
                                type="checkbox"
                                checked={tier.requirements[key as keyof typeof tier.requirements] as boolean}
                                onChange={(e) => updateAuxiteerTierValue(tier.id, `req_${key}`, e.target.checked)}
                                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                              />
                              <span className="text-sm">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Sovereign Invitations */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <span>⭐</span> Sovereign Tier Davetleri
                </h3>
                
                {/* Invite Form */}
                <div className="flex gap-4 mb-6">
                  <input
                    type="text"
                    placeholder="Cüzdan adresi (0x...)"
                    value={newSovereignAddress}
                    onChange={(e) => setNewSovereignAddress(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white font-mono"
                  />
                  <button
                    onClick={inviteToSovereign}
                    disabled={sovereignLoading || !newSovereignAddress}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl disabled:opacity-50"
                  >
                    {sovereignLoading ? 'Gönderiliyor...' : '⭐ Davet Et'}
                  </button>
                </div>

                {/* Invitations List */}
                {sovereignInvitations.length === 0 ? (
                  <p className="text-slate-400 text-center py-4">Henüz davet yok</p>
                ) : (
                  <div className="space-y-3">
                    {sovereignInvitations.map((inv) => (
                      <div
                        key={inv.walletAddress}
                        className={`p-4 rounded-xl flex items-center justify-between ${
                          inv.status === 'active' ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800/50'
                        }`}
                      >
                        <div>
                          <p className="font-mono text-sm">
                            {inv.walletAddress.slice(0, 10)}...{inv.walletAddress.slice(-8)}
                          </p>
                          <p className="text-slate-400 text-xs mt-1">
                            Davet: {new Date(inv.invitedAt).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            inv.status === 'active' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600 text-slate-400'
                          }`}>
                            {inv.status === 'active' ? 'Aktif' : 'İptal'}
                          </span>
                          {inv.status === 'active' && (
                            <button
                              onClick={() => revokeSovereignInvitation(inv.walletAddress)}
                              className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30"
                            >
                              İptal Et
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Note */}
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <p className="text-blue-300 text-sm">
                  ℹ️ Tier ayarları kaydedildiğinde tüm kullanıcılar için anlık olarak geçerli olur. 
                  Spread ve fee değerleri trade işlemlerinde otomatik uygulanır.
                </p>
              </div>
            </div>
          )}

          {/* Oracle Tab */}
          {activeTab === "oracle" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">🔮 Oracle Fiyatları</h2>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(oraclePrices).map(([key, value]) => (
                    <div key={key} className="p-4 bg-slate-800/50 rounded-xl">
                      <label className="block text-sm text-slate-400 mb-2">{key} ($/oz)</label>
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => setOraclePrices({ ...oraclePrices, [key]: parseFloat(e.target.value) })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white"
                      />
                    </div>
                  ))}
                </div>
                <button onClick={handleOracleUpdate} disabled={oracleLoading} className="mt-4 px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium disabled:opacity-50">
                  {oracleLoading ? "Güncelleniyor..." : "Oracle Güncelle"}
                </button>
              </div>
            </div>
          )}

          {/* Mint Tab */}
          {activeTab === "mint" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">🏭 Token Mint</h2>
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Alıcı Adresi</label>
                    <input
                      type="text"
                      value={mintData.address}
                      onChange={(e) => setMintData({ ...mintData, address: e.target.value })}
                      placeholder="0x..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Miktar (gram)</label>
                    <input
                      type="number"
                      value={mintData.amount}
                      onChange={(e) => setMintData({ ...mintData, amount: e.target.value })}
                      placeholder="100"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Metal</label>
                    <select
                      value={mintData.metal}
                      onChange={(e) => setMintData({ ...mintData, metal: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    >
                      {METALS.filter(m => m.symbol !== 'AUXM').map((metal) => (
                        <option key={metal.symbol} value={metal.symbol}>{metal.icon} {metal.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Custodian</label>
                    <select
                      value={mintData.custodian}
                      onChange={(e) => setMintData({ ...mintData, custodian: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    >
                      <option>Zurich Vault</option>
                      <option>London Vault</option>
                      <option>Istanbul Vault</option>
                      <option>Dubai Vault</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleMint} className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white font-medium">
                  Mint Et
                </button>
              </div>
            </div>
          )}

          {/* Wallet Tab */}
          {activeTab === "wallet" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">💰 Hot Wallet</h2>
                <button onClick={() => loadHotWallet(true)} disabled={walletLoading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">
                  {walletLoading ? "Yükleniyor..." : "🔄 Yenile"}
                </button>
              </div>

              {/* Wallet Adresleri */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4 text-amber-400">📍 Hot Wallet Adresleri</h3>
                <div className="space-y-3">
                  {/* ETH */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔷</span>
                      <div>
                        <p className="font-medium">ETH (Ethereum)</p>
                        <p className="text-xs text-slate-400">Ethereum Mainnet</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <a 
                        href={`https://etherscan.io/address/0x7227130EAaad17a35300A90631984676d303f5A0`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300"
                      >
                        0x7227...f5A0
                      </a>
                    </div>
                  </div>

                  {/* USDT */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">💵</span>
                      <div>
                        <p className="font-medium">USDT (Tether)</p>
                        <p className="text-xs text-slate-400">ERC-20 (ETH ile aynı)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <a 
                        href={`https://etherscan.io/address/0x7227130EAaad17a35300A90631984676d303f5A0`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-green-400 hover:text-green-300"
                      >
                        0x7227...f5A0
                      </a>
                    </div>
                  </div>

                  {/* BTC */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🟠</span>
                      <div>
                        <p className="font-medium">BTC (Bitcoin)</p>
                        <p className="text-xs text-slate-400">Bitcoin Mainnet</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <a 
                        href={`https://blockstream.info/address/bc1qs3yecqqtxps7hqay2gqjs9yxs6eh3vtw90ln45`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-orange-400 hover:text-orange-300"
                      >
                        bc1qs3...ln45
                      </a>
                    </div>
                  </div>

                  {/* SOL */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🟣</span>
                      <div>
                        <p className="font-medium">SOL (Solana)</p>
                        <p className="text-xs text-slate-400">Solana Mainnet</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <a 
                        href={`https://solscan.io/account/FtiPuYiukZvkNM7gTamEa8wohSqrbytvvANsg6j9YSjJ`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-purple-400 hover:text-purple-300"
                      >
                        FtiPu...YSjJ
                      </a>
                    </div>
                  </div>

                  {/* XRP */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">⚪</span>
                      <div>
                        <p className="font-medium">XRP (Ripple)</p>
                        <p className="text-xs text-slate-400">XRP Ledger</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <a 
                        href={`https://xrpscan.com/account/r4RUrt23xkfN1urecHLetqdxXNgrnqi5x5`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-slate-300 hover:text-white"
                      >
                        r4RUr...qi5x5
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bakiyeler */}
              {walletBalances && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-emerald-400">💎 Bakiyeler</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(walletBalances).map(([token, data]: [string, any]) => {
                      const icons: Record<string, string> = {
                        ETH: '🔷',
                        USDT: '💵',
                        BTC: '🟠',
                        SOL: '🟣',
                        XRP: '⚪'
                      };
                      const colors: Record<string, string> = {
                        ETH: 'text-blue-400',
                        USDT: 'text-green-400',
                        BTC: 'text-orange-400',
                        SOL: 'text-purple-400',
                        XRP: 'text-slate-300'
                      };
                      return (
                        <div key={token} className="bg-slate-800/50 rounded-xl p-4 text-center">
                          <span className="text-2xl">{icons[token] || '💰'}</span>
                          <p className={`text-xl font-bold mt-2 ${colors[token] || 'text-white'}`}>
                            {typeof data === 'object' ? data.balance : data}
                          </p>
                          <p className="text-slate-400 text-sm">{token}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Send Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4 text-amber-400">📤 Kripto Gönder</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <select value={sendToken} onChange={(e) => setSendToken(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white">
                    <option value="ETH">🔷 ETH</option>
                    <option value="USDT">💵 USDT</option>
                    <option value="BTC">🟠 BTC</option>
                    <option value="SOL">🟣 SOL</option>
                    <option value="XRP">⚪ XRP</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Alıcı Adresi" 
                    value={sendAddress} 
                    onChange={(e) => setSendAddress(e.target.value)} 
                    className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-mono text-sm" 
                  />
                  <input 
                    type="text" 
                    placeholder="Miktar" 
                    value={sendAmount} 
                    onChange={(e) => setSendAmount(e.target.value)} 
                    className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white" 
                  />
                  <button 
                    onClick={handleSendCrypto} 
                    disabled={walletProcessing === 'send'} 
                    className="bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg disabled:opacity-50"
                  >
                    {walletProcessing === 'send' ? "Gönderiliyor..." : "🚀 Gönder"}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  ⚠️ Dikkat: Bu işlem geri alınamaz. Adresi doğru girdiğinizden emin olun.
                </p>
              </div>

              {/* Pending Withdraws */}
              {pendingUserWithdraws.length > 0 && (
                <div className="bg-slate-900/50 border border-amber-800/50 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-amber-400">⏳ Bekleyen Çekimler ({pendingUserWithdraws.length})</h3>
                  <div className="space-y-3">
                    {pendingUserWithdraws.map((w: any) => (
                      <div key={w.id} className="p-4 bg-slate-800/50 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm">{w.address?.slice(0, 10)}...{w.address?.slice(-6)}</p>
                          <p className="text-lg font-bold">{w.amount} {w.token}</p>
                          <p className="text-xs text-slate-400">{new Date(w.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApproveWithdraw(w.id)} 
                            disabled={walletProcessing === w.id} 
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white text-sm disabled:opacity-50"
                          >
                            {walletProcessing === w.id ? "..." : "✅ Onayla"}
                          </button>
                          
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History */}
              {walletHistory.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-4">📜 Son İşlemler</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {walletHistory.slice(0, 10).map((tx: any, i: number) => (
                      <div key={tx.id || i} className="p-3 bg-slate-800/50 rounded-lg flex items-center justify-between text-sm">
                        <div>
                          <span className={tx.type === 'withdraw' ? 'text-red-400' : 'text-green-400'}>
                            {tx.type === 'withdraw' ? '📤' : '📥'} {tx.type}
                          </span>
                          <span className="ml-2 font-medium">{tx.amount} {tx.token}</span>
                        </div>
                        <div className="text-right">
                          {tx.txHash && (
                            <a href={`https://etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-mono text-xs">
                              {tx.txHash.slice(0, 10)}...
                            </a>
                          )}
                          <p className="text-xs text-slate-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════════════ */}
          {/* WEBSITE MANAGEMENT TABS */}
          {/* ═══════════════════════════════════════════════════════════════════════════════ */}

          {/* Website Settings Tab */}
          {activeTab === "website" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">🌐 Website Ayarları</h2>
                <button onClick={loadWebsiteData} disabled={websiteLoading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">
                  {websiteLoading ? "Yükleniyor..." : "🔄 Yenile"}
                </button>
              </div>

              {/* Maintenance Mode */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  🚧 Bakım Modu
                  <span className={`px-2 py-1 rounded text-xs ${websiteSettings.maintenanceMode ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {websiteSettings.maintenanceMode ? 'AKTİF' : 'KAPALI'}
                  </span>
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={websiteSettings.maintenanceMode}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, maintenanceMode: e.target.checked })}
                      className="w-5 h-5 rounded bg-slate-700 border-slate-600"
                    />
                    <span>Bakım modunu aktif et</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Mesaj (EN)</label>
                      <input
                        type="text"
                        value={websiteSettings.maintenanceMessage?.en || ''}
                        onChange={(e) => setWebsiteSettings({
                          ...websiteSettings,
                          maintenanceMessage: { ...websiteSettings.maintenanceMessage, en: e.target.value }
                        })}
                        placeholder="We're currently under maintenance..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Mesaj (TR)</label>
                      <input
                        type="text"
                        value={websiteSettings.maintenanceMessage?.tr || ''}
                        onChange={(e) => setWebsiteSettings({
                          ...websiteSettings,
                          maintenanceMessage: { ...websiteSettings.maintenanceMessage, tr: e.target.value }
                        })}
                        placeholder="Şu anda bakımdayız..."
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">🔗 Sosyal Medya Linkleri</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(websiteSettings.socialLinks || {}).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm text-slate-400 mb-2 capitalize">{key}</label>
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) => setWebsiteSettings({
                          ...websiteSettings,
                          socialLinks: { ...websiteSettings.socialLinks, [key]: e.target.value }
                        })}
                        placeholder={`https://${key}.com/...`}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Emails */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">📧 İletişim E-postaları</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Genel İletişim</label>
                    <input
                      type="email"
                      value={websiteSettings.contactEmail || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, contactEmail: e.target.value })}
                      placeholder="hello@auxite.io"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Destek</label>
                    <input
                      type="email"
                      value={websiteSettings.supportEmail || ''}
                      onChange={(e) => setWebsiteSettings({ ...websiteSettings, supportEmail: e.target.value })}
                      placeholder="support@auxite.io"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={saveWebsiteSettings}
                disabled={websiteSaving}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-black font-semibold disabled:opacity-50"
              >
                {websiteSaving ? 'Kaydediliyor...' : '💾 Ayarları Kaydet'}
              </button>
            </div>
          )}

          {/* Roadmap Tab */}
          {activeTab === "siteRoadmap" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">🗺️ Roadmap Yönetimi</h2>
                <button
                  onClick={() => {
                    setEditingItem({
                      id: '',
                      phase: '',
                      title: { en: '', tr: '' },
                      status: 'upcoming',
                      items: []
                    });
                    setShowWebsiteModal('roadmap');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-medium"
                >
                  + Yeni Faz Ekle
                </button>
              </div>

              <div className="space-y-4">
                {roadmapPhases.map((phase: any) => (
                  <div
                    key={phase.id}
                    className={`bg-slate-900/50 border rounded-xl p-6 ${
                      phase.status === 'current' ? 'border-amber-500/50' : 
                      phase.status === 'completed' ? 'border-green-500/30' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          phase.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          phase.status === 'current' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {phase.phase}
                        </span>
                        <h3 className="font-semibold text-lg">{phase.title?.tr || phase.title?.en}</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingItem(phase);
                            setShowWebsiteModal('roadmap');
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteWebsiteItem('roadmap', phase.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {phase.items?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
                            item.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-600'
                          }`}>
                            {item.done && '✓'}
                          </span>
                          <span className={item.done ? 'text-slate-500 line-through' : 'text-white'}>
                            {item.text?.tr || item.text?.en}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === "siteTeam" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">👨‍👩‍👧‍👦 Site Ekip Yönetimi</h2>
                <button
                  onClick={() => {
                    setEditingItem({
                      id: '',
                      name: '',
                      role: { en: '', tr: '' },
                      bio: { en: '', tr: '' },
                      type: 'team',
                      order: teamMembers.length,
                      active: true
                    });
                    setShowWebsiteModal('team');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-medium"
                >
                  + Yeni Üye Ekle
                </button>
              </div>

              {/* Team Members */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Ekip Üyeleri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.filter((m: any) => m.type === 'team').map((member: any) => (
                    <div key={member.id} className="p-4 bg-slate-800/50 rounded-xl flex gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-xl flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{member.name}</h4>
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setEditingItem(member); setShowWebsiteModal('team'); }}
                              className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs"
                            >✏️</button>
                            <button
                              onClick={() => deleteWebsiteItem('team', member.id)}
                              className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded text-xs text-red-400"
                            >🗑️</button>
                          </div>
                        </div>
                        <p className="text-sm text-amber-400">{member.role?.tr || member.role?.en}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{member.bio?.tr || member.bio?.en}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisors */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Danışmanlar</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {teamMembers.filter((m: any) => m.type === 'advisor').map((member: any) => (
                    <div key={member.id} className="p-4 bg-slate-800/50 rounded-xl text-center">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-full mx-auto mb-3 flex items-center justify-center text-xl">👤</div>
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-xs text-amber-400">{member.role?.tr || member.role?.en}</p>
                      <div className="flex justify-center gap-2 mt-2">
                        <button onClick={() => { setEditingItem(member); setShowWebsiteModal('team'); }} className="text-xs text-slate-400 hover:text-white">✏️</button>
                        <button onClick={() => deleteWebsiteItem('team', member.id)} className="text-xs text-red-400">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partners */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Partnerler</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {teamMembers.filter((m: any) => m.type === 'partner').map((member: any) => (
                    <div key={member.id} className="p-4 bg-slate-800/50 rounded-xl text-center">
                      <div className="text-3xl mb-2">{member.avatar || '🏢'}</div>
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-xs text-slate-400">{member.role?.tr || member.role?.en}</p>
                      <div className="flex justify-center gap-2 mt-2">
                        <button onClick={() => { setEditingItem(member); setShowWebsiteModal('team'); }} className="text-xs text-slate-400 hover:text-white">✏️</button>
                        <button onClick={() => deleteWebsiteItem('team', member.id)} className="text-xs text-red-400">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Vaults Tab */}
          {activeTab === "siteVaults" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">🏛️ Kasa Lokasyonları</h2>
                <button
                  onClick={() => {
                    setEditingItem({
                      id: '',
                      city: '',
                      country: '',
                      flag: '🏳️',
                      status: 'coming',
                      capacity: '',
                      metals: ['AUXG'],
                      coordinates: { x: 50, y: 50 }
                    });
                    setShowWebsiteModal('vault');
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg text-black font-medium"
                >
                  + Yeni Kasa Ekle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vaultLocations.map((vault: any) => (
                  <div
                    key={vault.id}
                    className={`bg-slate-900/50 border rounded-xl p-6 ${
                      vault.status === 'active' ? 'border-green-500/30' :
                      vault.status === 'maintenance' ? 'border-red-500/30' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{vault.flag}</span>
                        <div>
                          <h3 className="font-semibold text-lg">{vault.city}</h3>
                          <p className="text-sm text-slate-400">{vault.country}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        vault.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        vault.status === 'maintenance' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {vault.status === 'active' ? 'Aktif' : vault.status === 'maintenance' ? 'Bakımda' : 'Yakında'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-400">Kapasite</p>
                        <p className="font-semibold">{vault.capacity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Koordinatlar</p>
                        <p className="font-mono text-sm">{vault.coordinates?.x}, {vault.coordinates?.y}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {vault.metals?.map((metal: string) => (
                        <span key={metal} className="px-2 py-1 bg-amber-500/10 rounded text-amber-400 text-xs">
                          {metal}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditingItem(vault); setShowWebsiteModal('vault'); }}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                      >
                        ✏️ Düzenle
                      </button>
                      <button
                        onClick={() => deleteWebsiteItem('vaults', vault.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Website Edit Modal */}
          {showWebsiteModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">
                    {showWebsiteModal === 'roadmap' && '🗺️ Roadmap Fazı'}
                    {showWebsiteModal === 'team' && '👨‍👩‍👧‍👦 Ekip Üyesi'}
                    {showWebsiteModal === 'vault' && '🏛️ Kasa Lokasyonu'}
                  </h3>
                  <button onClick={() => { setShowWebsiteModal(null); setEditingItem(null); }} className="text-slate-400 hover:text-white text-xl">✕</button>
                </div>
                
                <div className="p-6 space-y-4">
                  {showWebsiteModal === 'roadmap' && editingItem && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Faz (örn: Q1 2025)</label>
                          <input
                            type="text"
                            value={editingItem.phase || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, phase: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Durum</label>
                          <select
                            value={editingItem.status || 'upcoming'}
                            onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          >
                            <option value="upcoming">Yakında</option>
                            <option value="current">Devam Ediyor</option>
                            <option value="completed">Tamamlandı</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Başlık (EN)</label>
                          <input
                            type="text"
                            value={editingItem.title?.en || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, title: { ...editingItem.title, en: e.target.value } })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Başlık (TR)</label>
                          <input
                            type="text"
                            value={editingItem.title?.tr || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, title: { ...editingItem.title, tr: e.target.value } })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Maddeler (her satır bir madde, [x] tamamlanmış)</label>
                        <textarea
                          value={editingItem.items?.map((i: any) => `${i.done ? '[x] ' : '[ ] '}${i.text?.tr || i.text?.en}`).join('\n') || ''}
                          onChange={(e) => {
                            const items = e.target.value.split('\n').filter(line => line.trim()).map(line => ({
                              text: { en: line.replace(/^\[.\] /, ''), tr: line.replace(/^\[.\] /, '') },
                              done: line.startsWith('[x]')
                            }));
                            setEditingItem({ ...editingItem, items });
                          }}
                          rows={6}
                          placeholder="[ ] Madde 1&#10;[x] Tamamlanmış madde"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-mono text-sm"
                        />
                      </div>
                    </>
                  )}

                  {showWebsiteModal === 'team' && editingItem && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">İsim</label>
                          <input
                            type="text"
                            value={editingItem.name || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Tip</label>
                          <select
                            value={editingItem.type || 'team'}
                            onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          >
                            <option value="team">Ekip Üyesi</option>
                            <option value="advisor">Danışman</option>
                            <option value="partner">Partner</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Rol (EN)</label>
                          <input
                            type="text"
                            value={editingItem.role?.en || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, role: { ...editingItem.role, en: e.target.value } })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Rol (TR)</label>
                          <input
                            type="text"
                            value={editingItem.role?.tr || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, role: { ...editingItem.role, tr: e.target.value } })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Bio (EN)</label>
                          <textarea
                            value={editingItem.bio?.en || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, bio: { ...editingItem.bio, en: e.target.value } })}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Bio (TR)</label>
                          <textarea
                            value={editingItem.bio?.tr || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, bio: { ...editingItem.bio, tr: e.target.value } })}
                            rows={3}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">LinkedIn</label>
                          <input
                            type="text"
                            value={editingItem.linkedin || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, linkedin: e.target.value })}
                            placeholder="https://linkedin.com/in/..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Twitter</label>
                          <input
                            type="text"
                            value={editingItem.twitter || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, twitter: e.target.value })}
                            placeholder="https://twitter.com/..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {showWebsiteModal === 'vault' && editingItem && (
                    <>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Şehir</label>
                          <input
                            type="text"
                            value={editingItem.city || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, city: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Ülke</label>
                          <input
                            type="text"
                            value={editingItem.country || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, country: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Bayrak Emoji</label>
                          <input
                            type="text"
                            value={editingItem.flag || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, flag: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white text-center text-2xl"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Kapasite</label>
                          <input
                            type="text"
                            value={editingItem.capacity || ''}
                            onChange={(e) => setEditingItem({ ...editingItem, capacity: e.target.value })}
                            placeholder="10,000 kg"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Durum</label>
                          <select
                            value={editingItem.status || 'coming'}
                            onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          >
                            <option value="active">Aktif</option>
                            <option value="coming">Yakında</option>
                            <option value="maintenance">Bakımda</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">X Koordinatı (%)</label>
                          <input
                            type="number"
                            value={editingItem.coordinates?.x || 50}
                            onChange={(e) => setEditingItem({ ...editingItem, coordinates: { ...editingItem.coordinates, x: Number(e.target.value) } })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-slate-400 mb-2">Y Koordinatı (%)</label>
                          <input
                            type="number"
                            value={editingItem.coordinates?.y || 50}
                            onChange={(e) => setEditingItem({ ...editingItem, coordinates: { ...editingItem.coordinates, y: Number(e.target.value) } })}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Desteklenen Metaller</label>
                        <div className="flex flex-wrap gap-3">
                          {['AUXG', 'AUXS', 'AUXPT', 'AUXPD'].map((metal) => (
                            <label key={metal} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingItem.metals?.includes(metal)}
                                onChange={(e) => {
                                  const metals = e.target.checked
                                    ? [...(editingItem.metals || []), metal]
                                    : (editingItem.metals || []).filter((m: string) => m !== metal);
                                  setEditingItem({ ...editingItem, metals });
                                }}
                                className="w-4 h-4 rounded bg-slate-700"
                              />
                              <span>{metal}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="p-6 border-t border-slate-800 flex gap-3">
                  <button
                    onClick={() => { setShowWebsiteModal(null); setEditingItem(null); }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl"
                  >
                    İptal
                  </button>
                  <button
                    onClick={() => {
                      if (showWebsiteModal === 'roadmap') saveRoadmapPhase(editingItem);
                      if (showWebsiteModal === 'team') saveTeamMember(editingItem);
                      if (showWebsiteModal === 'vault') saveVaultLocation(editingItem);
                    }}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-black font-semibold"
                  >
                    💾 Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
