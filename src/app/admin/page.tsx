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
import { formatAmount, getDecimalPlaces } from '@/lib/format';

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

interface UserDetailData {
  user: {
    address: string;
    info: Record<string, any>;
    balance: Record<string, any>;
    totalValueUsd: number;
    tier: { id: string; name: string };
    transactionCount: number;
    allocationCount: number;
  };
  transactions: any[];
  allocations: any[];
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
  { key: "gold", symbol: "AUXG", name: "Auxite Altın", icon: "🥇", color: "text-[#C6A15B]" },
  { key: "silver", symbol: "AUXS", name: "Auxite Gümüş", icon: "🥈", color: "text-[#A6B0BF]" },
  { key: "platinum", symbol: "AUXPT", name: "Auxite Platin", icon: "💎", color: "text-[#8FA3B8]" },
  { key: "palladium", symbol: "AUXPD", name: "Auxite Paladyum", icon: "💜", color: "text-[#6E7C8A]" },
];

const CRYPTOS = [
  { key: "btc", symbol: "BTC", name: "Bitcoin", icon: "₿", color: "text-orange-500" },
  { key: "eth", symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "text-blue-400" },
  { key: "xrp", symbol: "XRP", name: "Ripple", icon: "✕", color: "text-slate-300" },
  { key: "sol", symbol: "SOL", name: "Solana", icon: "◎", color: "text-purple-500" },
  { key: "usdt", symbol: "USDT", name: "Tether", icon: "₮", color: "text-[#2F6F62]" },
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
  { id: "pending", label: "Pending TX", icon: "⏳" },
  { id: "fees", label: "Fees", icon: "💵" },
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
  { id: "mint", label: "Platform Stok", icon: "📦" },
  { id: "website", label: "Website", icon: "🌐" },
  { id: "siteRoadmap", label: "Roadmap", icon: "🗺️" },
  { id: "siteTeam", label: "Site Ekip", icon: "👨‍👩‍👧‍👦" },
  { id: "siteVaults", label: "Kasalar", icon: "🏛️" },
  { id: "risk", label: "Risk", icon: "🛡️" },
  { id: "leasing", label: "Leasing", icon: "🏦" },
  { id: "treasury", label: "AUXM Treasury", icon: "🏛️" },
  { id: "depositMonitor", label: "Deposit Scanner", icon: "📡" },
  { id: "redemption", label: "Redemption", icon: "📦" },
  { id: "cashSettlement", label: "Cash Settlement", icon: "💰" },
  { id: "relationshipManagers", label: "RM / CRM", icon: "🤝" },
  { id: "statements", label: "Raporlar", icon: "📑" },
  { id: "pushNotifications", label: "Push Bildirim", icon: "🔔" },
  { id: "notificationHistory", label: "Bildirim Geçmişi", icon: "📋" },
  { id: "oracleWatcher", label: "Oracle Watcher", icon: "👁️" },
  { id: "supportSettings", label: "Destek", icon: "💬" },
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

  // Platform Fees
  const [platformFees, setPlatformFees] = useState<{
    fees: Record<string, { total: number; pending: number; transferred: number; transactionCount: number; valueUsd: number }>;
    summary: { totalValueUsd: number; tokenCount: number };
    recentTransfers: any[];
  } | null>(null);
  const [feesLoading, setFeesLoading] = useState(false);
  const [transferModal, setTransferModal] = useState<{ token: string; pending: number } | null>(null);
  const [transferForm, setTransferForm] = useState({ amount: 0, ledgerAddress: '', txHash: '', note: '' });

  // Real Crypto Transfer (On-chain)
  const [sendCryptoModal, setSendCryptoModal] = useState(false);
  const [sendCryptoForm, setSendCryptoForm] = useState({ token: 'ETH', amount: '', toAddress: '', note: '' });
  const [sendCryptoLoading, setSendCryptoLoading] = useState(false);

  // Pending Transactions
  const [pendingTransactions, setPendingTransactions] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [verifyingTx, setVerifyingTx] = useState<string | null>(null);

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
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PER_PAGE = 100;
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserDetailData | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);

  // Pending Withdraws
  const [pendingWithdraws, setPendingWithdraws] = useState<PendingWithdraw[]>([]);

  // Platform Stock Management
  const [stockData, setStockData] = useState({
    metal: "AUXG",
    amount: "",
    action: "add" as "add" | "remove" | "set" | "initialize" | "transfer",
    reason: "",
    vault: "IST" as string,
    fromVault: "" as string,
    toVault: "" as string,
  });
  const [platformStock, setPlatformStock] = useState<Record<string, any>>({});
  const [stockLoading, setStockLoading] = useState(false);
  const [availableVaults] = useState<Record<string, { name: string; country: string; code: string }>>({
    DXB: { name: 'Dubai Vault', country: 'UAE', code: 'DXB' },
    IST: { name: 'Istanbul Vault', country: 'Turkey', code: 'IST' },
    ZRH: { name: 'Zurich Vault', country: 'Switzerland', code: 'ZRH' },
    LDN: { name: 'London Vault', country: 'UK', code: 'LDN' },
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

  // ── Statements State ──
  const [adminStatements, setAdminStatements] = useState<any[]>([]);
  const [stmtLangTab, setStmtLangTab] = useState("tr");
  const [stmtSaving, setStmtSaving] = useState(false);
  const [newStmt, setNewStmt] = useState<any>({
    type: "monthly",
    title: { tr: "", en: "", de: "", fr: "", ar: "", ru: "" },
    period: { tr: "", en: "", de: "", fr: "", ar: "", ru: "" },
    periodEnding: "",
    fileSize: "",
    pdfUrl: "",
  });

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

  // Support Contact Settings
  const [supportContactSettings, setSupportContactSettings] = useState({
    whatsappNumber: '447520637591',
    telegramLink: '',
    supportEmail: 'support@auxite.io',
    phoneNumber: '',
    businessHours: 'Mon-Fri 9:00-18:00 CET',
  });
  const [supportSettingsLoading, setSupportSettingsLoading] = useState(false);
  const [supportSettingsSaving, setSupportSettingsSaving] = useState(false);

  // Relationship Manager CRM
  const [rmList, setRmList] = useState<any[]>([]);
  const [rmStats, setRmStats] = useState<any>(null);
  const [rmLoading, setRmLoading] = useState(false);
  const [showRmForm, setShowRmForm] = useState(false);
  const [editingRm, setEditingRm] = useState<any>(null);
  const [rmFormData, setRmFormData] = useState({ name: '', title: 'Relationship Manager', email: '', phone: '', whatsapp: '', capacity: 100, languages: 'en', specializations: '' });
  const [rmSaving, setRmSaving] = useState(false);
  const [rmClients, setRmClients] = useState<string[]>([]);
  const [viewingRmClients, setViewingRmClients] = useState<string | null>(null);

  const loadSupportSettings = async () => {
    setSupportSettingsLoading(true);
    try {
      const res = await fetch("/api/admin/support-settings", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) setSupportContactSettings(data.settings);
      }
    } catch (e) { console.error("Support settings load error:", e); }
    setSupportSettingsLoading(false);
  };

  const saveSupportSettings = async () => {
    setSupportSettingsSaving(true);
    try {
      const res = await fetch("/api/admin/support-settings", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(supportContactSettings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Destek ayarları kaydedildi" });
      } else {
        setMessage({ type: "error", text: "Kaydetme başarısız" });
      }
    } catch (e) {
      console.error("Support settings save error:", e);
      setMessage({ type: "error", text: "Kaydetme hatası" });
    }
    setSupportSettingsSaving(false);
  };

  const loadRelationshipManagers = async () => {
    setRmLoading(true);
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch("/api/admin/relationship-managers", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRmList(data.managers || []);
        setRmStats(data.stats || null);
      }
    } catch (e) { console.error("RM load error:", e); }
    setRmLoading(false);
  };

  const saveRM = async () => {
    setRmSaving(true);
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      const langs = rmFormData.languages.split(',').map((l: string) => l.trim()).filter(Boolean);
      const specs = rmFormData.specializations ? rmFormData.specializations.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      const body = editingRm
        ? { action: 'update', id: editingRm.id, ...rmFormData, languages: langs, specializations: specs }
        : { action: 'create', ...rmFormData, languages: langs, specializations: specs };
      const res = await fetch("/api/admin/relationship-managers", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowRmForm(false);
        setEditingRm(null);
        setRmFormData({ name: '', title: 'Relationship Manager', email: '', phone: '', whatsapp: '', capacity: 100, languages: 'en', specializations: '' });
        loadRelationshipManagers();
      }
    } catch (e) { console.error("RM save error:", e); }
    setRmSaving(false);
  };

  const deactivateRM = async (id: string) => {
    if (!confirm('Bu RM devre dışı bırakılacak ve müşterileri yeniden atanacak. Emin misiniz?')) return;
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      await fetch("/api/admin/relationship-managers", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'deactivate', id }),
      });
      loadRelationshipManagers();
    } catch (e) { console.error("RM deactivate error:", e); }
  };

  const deleteRM = async (id: string) => {
    if (!confirm('Bu ilişki yöneticisini silmek istediğinize emin misiniz? Tüm müşterileri yeniden atanacak.')) return;
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      await fetch("/api/admin/relationship-managers", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete', id }),
      });
      loadRelationshipManagers();
    } catch (e) { console.error("RM delete error:", e); }
  };

  const viewRmClients = async (rmId: string) => {
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch(`/api/admin/relationship-managers?id=${rmId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setRmClients(data.clients || []);
        setViewingRmClients(rmId);
      }
    } catch (e) { console.error("RM clients error:", e); }
  };

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
    if (activeTab === "fees") {
      loadFees();
      intervals.push(setInterval(loadFees, 60000));
    }
    if (activeTab === "pending") {
      loadPendingTransactions();
      intervals.push(setInterval(loadPendingTransactions, 30000));
    }
    if (activeTab === "mint") {
      loadPlatformStock();
      intervals.push(setInterval(loadPlatformStock, 60000));
    }
    if (activeTab === "relationshipManagers") {
      loadRelationshipManagers();
    }
    if (activeTab === "supportSettings") {
      loadSupportSettings();
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
  "x-admin-address": "0x101bD08219773E0ff8cD3805542c0A2835Fec0FF",
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
    loadStatements();
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
      const res = await fetch("/api/admin/spread", { headers: getAuthHeaders() });
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

  // Load Platform Fees
  const loadFees = async () => {
    setFeesLoading(true);
    try {
      const res = await fetch("/api/admin/fees", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlatformFees(data);
      }
    } catch (e) {
      console.error("Failed to load fees:", e);
    } finally {
      setFeesLoading(false);
    }
  };

  // Transfer fees to Ledger
  const transferFeesToLedger = async () => {
    if (!transferModal) return;
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          token: transferModal.token,
          amount: transferForm.amount,
          ledgerAddress: transferForm.ledgerAddress,
          txHash: transferForm.txHash,
          note: transferForm.note,
        }),
      });
      if (res.ok) {
        alert("Transfer kaydedildi!");
        setTransferModal(null);
        setTransferForm({ amount: 0, ledgerAddress: '', txHash: '', note: '' });
        loadFees();
      } else {
        const data = await res.json();
        alert(data.error || "Transfer başarısız");
      }
    } catch (e) {
      console.error("Transfer error:", e);
      alert("Transfer hatası");
    }
  };

  // Send REAL on-chain crypto from hot wallet
  const sendRealCrypto = async () => {
    if (!sendCryptoForm.toAddress || !sendCryptoForm.amount || parseFloat(sendCryptoForm.amount) <= 0) {
      alert("Adres ve miktar gerekli!");
      return;
    }

    const confirmed = window.confirm(
      `UYARI: ${sendCryptoForm.amount} ${sendCryptoForm.token} gerçek kripto olarak ${sendCryptoForm.toAddress} adresine gönderilecek.\n\nBu işlem geri alınamaz! Devam etmek istiyor musunuz?`
    );
    if (!confirmed) return;

    setSendCryptoLoading(true);
    try {
      const res = await fetch("/api/admin/fees", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sendOnChain",
          token: sendCryptoForm.token,
          amount: parseFloat(sendCryptoForm.amount),
          toAddress: sendCryptoForm.toAddress,
          note: sendCryptoForm.note || `Admin transfer`,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Başarılı! TX Hash: ${data.txHash}\n\nGönderilen: ${sendCryptoForm.amount} ${sendCryptoForm.token}\nNetwork Fee: ${data.networkFee || 0}`);
        setSendCryptoModal(false);
        setSendCryptoForm({ token: 'ETH', amount: '', toAddress: '', note: '' });
        loadFees();
      } else {
        alert(`Hata: ${data.error || "Transfer başarısız"}`);
      }
    } catch (e: any) {
      console.error("Send crypto error:", e);
      alert(`Transfer hatası: ${e.message}`);
    } finally {
      setSendCryptoLoading(false);
    }
  };

  // Load Pending Transactions
  const loadPendingTransactions = async () => {
    setPendingLoading(true);
    try {
      const res = await fetch("/api/admin/pending-transactions", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPendingTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error("Failed to load pending transactions:", e);
    } finally {
      setPendingLoading(false);
    }
  };

  // Verify pending transactions (trigger cron manually)
  const verifyPendingTransactions = async () => {
    setVerifyingTx('all');
    try {
      const res = await fetch("/api/cron/verify-pending-transfers", { 
        method: "POST",
        headers: getAuthHeaders() 
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Doğrulama tamamlandı: ${data.results?.verified || 0} onaylandı, ${data.results?.failed || 0} başarısız, ${data.results?.stillPending || 0} bekliyor`);
        loadPendingTransactions();
      } else {
        const data = await res.json();
        alert(data.error || "Doğrulama başarısız");
      }
    } catch (e) {
      console.error("Verify error:", e);
      alert("Doğrulama hatası");
    } finally {
      setVerifyingTx(null);
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

  // ── Statements Loaders & Handlers ──
  const loadStatements = async () => {
    try {
      const res = await fetch("/api/admin/statements?admin=true", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAdminStatements(data.statements || []);
      }
    } catch (e) {
      console.error("Failed to load statements:", e);
    }
  };

  const handleCreateStatement = async () => {
    if (!newStmt.title?.tr || !newStmt.title?.en || !newStmt.period?.tr || !newStmt.period?.en || !newStmt.periodEnding) {
      setMessage({ type: "error", text: "Başlık (TR+EN), Dönem (TR+EN) ve Dönem Bitiş tarihi gerekli" });
      return;
    }
    setStmtSaving(true);
    try {
      const res = await fetch("/api/admin/statements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "create", ...newStmt }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Rapor oluşturuldu" });
        setNewStmt({
          type: "monthly",
          title: { tr: "", en: "", de: "", fr: "", ar: "", ru: "" },
          period: { tr: "", en: "", de: "", fr: "", ar: "", ru: "" },
          periodEnding: "",
          fileSize: "",
          pdfUrl: "",
        });
        loadStatements();
      }
    } catch (e) {
      setMessage({ type: "error", text: "Rapor oluşturulamadı" });
    } finally {
      setStmtSaving(false);
    }
  };

  const handleToggleStatementPublish = async (id: string) => {
    try {
      await fetch("/api/admin/statements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "toggle-publish", id }),
      });
      loadStatements();
    } catch (e) {
      console.error("Toggle publish failed:", e);
    }
  };

  const handleDeleteStatement = async (id: string) => {
    if (!confirm("Bu raporu silmek istediğinize emin misiniz?")) return;
    try {
      await fetch("/api/admin/statements", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "delete", id }),
      });
      loadStatements();
      setMessage({ type: "success", text: "Rapor silindi" });
    } catch (e) {
      console.error("Delete failed:", e);
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
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        console.error("Users API error:", res.status, data);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    }
  };
  const loadUserDetail = async (address: string) => {
    setUserDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users?address=${address}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.user) setSelectedUserDetail(data);
      }
    } catch (e) {
      console.error("Failed to load user detail:", e);
    } finally {
      setUserDetailLoading(false);
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

  // Load platform stock data
  const loadPlatformStock = async () => {
    setStockLoading(true);
    try {
      const res = await fetch("/api/admin/platform-stock?detailed=true", { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPlatformStock(data.stocks || {});
      }
    } catch (err) {
      console.error("Failed to load platform stock:", err);
    } finally {
      setStockLoading(false);
    }
  };

  const handleStockOperation = async () => {
    if (!stockData.amount && stockData.action !== "initialize" && stockData.action !== "transfer") return;
    if (stockData.action === "transfer" && (!stockData.fromVault || !stockData.toVault)) {
      setMessage({ type: "error", text: "Transfer için kaynak ve hedef kasa seçilmeli" });
      return;
    }
    setMessage({ type: "", text: "" });

    try {
      const bodyData: any = {
        metal: stockData.metal,
        amount: parseFloat(stockData.amount) || 0,
        action: stockData.action,
        reason: stockData.reason,
      };

      // Vault info for add/remove operations
      if (["add", "remove", "initialize", "set"].includes(stockData.action) && stockData.vault) {
        bodyData.vault = stockData.vault;
      }

      // Transfer specific fields
      if (stockData.action === "transfer") {
        bodyData.fromVault = stockData.fromVault;
        bodyData.toVault = stockData.toVault;
        bodyData.transferAmount = parseFloat(stockData.amount) || 0;
      }

      const res = await fetch("/api/admin/platform-stock", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "İşlem başarılı" });
        setStockData({ ...stockData, amount: "", reason: "", fromVault: "", toVault: "" });
        loadPlatformStock(); // Refresh stock data
      } else {
        setMessage({ type: "error", text: data.error || "Stok işlemi başarısız" });
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#BFA181]/20 flex items-center justify-center">
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white mb-4 focus:outline-none focus:border-[#BFA181]"
              autoFocus
            />
            {authError && <p className="text-red-400 text-sm mb-4">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full bg-[#2F6F62] hover:bg-[#2F6F62] text-black font-semibold py-3 rounded-xl disabled:opacity-50 transition-colors"
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
            <span className="px-2 py-1 bg-[#BFA181]/20 text-[#BFA181] text-xs font-medium rounded">
              v2.0
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#2F6F62] font-medium">
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
          message.type === "success" ? "bg-[#2F6F62]/90" : "bg-red-500/90"
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
                    ? "bg-[#BFA181]/20 text-[#BFA181]"
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
                  { label: "Toplam İşlem", value: formatNumber(stats.totalTrades), icon: "📊", color: "text-[#2F6F62]" },
                  { label: "Toplam Hacim", value: stats.totalVolume, icon: "💰", color: "text-[#BFA181]" },
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

          {/* Fees Tab */}
          {activeTab === "fees" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">💵 Platform Fee'leri</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSendCryptoModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] hover:from-[#2F6F62] hover:to-[#D4B47A] rounded-lg text-sm font-semibold flex items-center gap-2"
                  >
                    🚀 Gerçek Kripto Gönder
                  </button>
                  <button
                    onClick={loadFees}
                    disabled={feesLoading}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2"
                  >
                    <span className={feesLoading ? "animate-spin" : ""}>🔄</span>
                    Yenile
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              {platformFees && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-[#2F6F62]/30 to-[#2F6F62]/20 border border-[#2F6F62]/50 rounded-xl p-6">
                    <div className="text-[#2F6F62] text-sm mb-1">Toplam Fee (USD)</div>
                    <div className="text-3xl font-bold text-white">${platformFees.summary.totalValueUsd.toFixed(2)}</div>
                  </div>
                  <div className="bg-gradient-to-r from-[#BFA181]/30 to-[#BFA181]/20 border border-[#BFA181]/30 rounded-xl p-6">
                    <div className="text-[#BFA181] text-sm mb-1">Bekleyen (Ledger'a aktarılmamış)</div>
                    <div className="text-3xl font-bold text-white">${platformFees.summary.totalValueUsd.toFixed(2)}</div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-6">
                    <div className="text-blue-400 text-sm mb-1">Token Çeşidi</div>
                    <div className="text-3xl font-bold text-white">{platformFees.summary.tokenCount}</div>
                  </div>
                </div>
              )}

              {/* Fees by Token */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="font-semibold">Token Bazlı Fee'ler</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/50">
                      <tr>
                        <th className="text-left p-4 text-slate-400 text-sm">Token</th>
                        <th className="text-right p-4 text-slate-400 text-sm">Toplam</th>
                        <th className="text-right p-4 text-slate-400 text-sm">Bekleyen</th>
                        <th className="text-right p-4 text-slate-400 text-sm">Transfer Edilmiş</th>
                        <th className="text-right p-4 text-slate-400 text-sm">İşlem Sayısı</th>
                        <th className="text-right p-4 text-slate-400 text-sm">USD Değeri</th>
                        <th className="text-center p-4 text-slate-400 text-sm">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformFees && Object.entries(platformFees.fees).map(([token, data]) => (
                        <tr key={token} className="border-t border-slate-800 hover:bg-slate-800/30">
                          <td className="p-4 font-medium">{token}</td>
                          <td className="p-4 text-right font-mono">{formatAmount(data.total, token)}</td>
                          <td className="p-4 text-right font-mono text-[#BFA181]">{formatAmount(data.pending, token)}</td>
                          <td className="p-4 text-right font-mono text-[#2F6F62]">{formatAmount(data.transferred, token)}</td>
                          <td className="p-4 text-right">{data.transactionCount}</td>
                          <td className="p-4 text-right font-semibold">${data.valueUsd.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            {data.pending > 0 && (
                              <button
                                onClick={() => {
                                  setTransferModal({ token, pending: data.pending });
                                  setTransferForm({ amount: data.pending, ledgerAddress: '', txHash: '', note: '' });
                                }}
                                className="px-3 py-1 bg-[#2F6F62] hover:bg-[#2F6F62] rounded text-black text-sm font-medium"
                              >
                                Transfer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!platformFees || Object.keys(platformFees.fees).length === 0) && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            Henüz fee toplanmamış
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Transfers */}
              {platformFees && platformFees.recentTransfers.length > 0 && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800">
                    <h3 className="font-semibold">Son Transferler (Ledger'a)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-800/50">
                        <tr>
                          <th className="text-left p-4 text-slate-400 text-sm">Tarih</th>
                          <th className="text-left p-4 text-slate-400 text-sm">Token</th>
                          <th className="text-right p-4 text-slate-400 text-sm">Miktar</th>
                          <th className="text-left p-4 text-slate-400 text-sm">Ledger Adresi</th>
                          <th className="text-left p-4 text-slate-400 text-sm">TX Hash</th>
                          <th className="text-left p-4 text-slate-400 text-sm">Not</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformFees.recentTransfers.map((transfer: any, i: number) => (
                          <tr key={transfer.id || i} className="border-t border-slate-800">
                            <td className="p-4 text-sm">{new Date(transfer.timestamp).toLocaleString('tr-TR')}</td>
                            <td className="p-4 font-medium">{transfer.token}</td>
                            <td className="p-4 text-right font-mono">{transfer.amount}</td>
                            <td className="p-4 font-mono text-xs">{transfer.ledgerAddress?.slice(0, 20)}...</td>
                            <td className="p-4 font-mono text-xs">{transfer.txHash?.slice(0, 16)}...</td>
                            <td className="p-4 text-sm text-slate-400">{transfer.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Transfer Modal */}
              {transferModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
                    <div className="p-6 border-b border-slate-800">
                      <h3 className="text-xl font-bold">💵 Fee Transfer - {transferModal.token}</h3>
                      <p className="text-slate-400 text-sm mt-1">Bekleyen: {formatAmount(transferModal.pending, transferModal.token)} {transferModal.token}</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Miktar</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Ledger Adresi</label>
                        <input
                          type="text"
                          value={transferForm.ledgerAddress}
                          onChange={(e) => setTransferForm({ ...transferForm, ledgerAddress: e.target.value })}
                          placeholder="0x..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">TX Hash (opsiyonel)</label>
                        <input
                          type="text"
                          value={transferForm.txHash}
                          onChange={(e) => setTransferForm({ ...transferForm, txHash: e.target.value })}
                          placeholder="0x..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Not</label>
                        <input
                          type="text"
                          value={transferForm.note}
                          onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                          placeholder="Weekly fee withdrawal"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        />
                      </div>
                    </div>
                    <div className="p-6 border-t border-slate-800 flex gap-3">
                      <button
                        onClick={() => setTransferModal(null)}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl"
                      >
                        İptal
                      </button>
                      <button
                        onClick={transferFeesToLedger}
                        className="flex-1 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-xl text-black font-semibold"
                      >
                        ✅ Transfer Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Send Real Crypto Modal */}
              {sendCryptoModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md">
                    <div className="p-6 border-b border-slate-800">
                      <h3 className="text-xl font-bold">🚀 Gerçek Kripto Gönder</h3>
                      <p className="text-[#BFA181] text-sm mt-1">Hot wallet'tan blockchain üzerinden transfer</p>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="bg-[#BFA181]/20 border border-[#BFA181]/30 rounded-lg p-3 text-[#BFA181] text-sm">
                        ⚠️ DİKKAT: Bu işlem gerçek kripto gönderir ve geri alınamaz!
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Token</label>
                        <select
                          value={sendCryptoForm.token}
                          onChange={(e) => setSendCryptoForm({ ...sendCryptoForm, token: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        >
                          <option value="ETH">ETH (Ethereum)</option>
                          <option value="USDT">USDT (Tether)</option>
                          <option value="XRP">XRP (Ripple)</option>
                          <option value="SOL">SOL (Solana)</option>
                          <option value="BTC">BTC (Bitcoin)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Miktar</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={sendCryptoForm.amount}
                          onChange={(e) => setSendCryptoForm({ ...sendCryptoForm, amount: e.target.value })}
                          placeholder="0.1"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Hedef Adres</label>
                        <input
                          type="text"
                          value={sendCryptoForm.toAddress}
                          onChange={(e) => setSendCryptoForm({ ...sendCryptoForm, toAddress: e.target.value })}
                          placeholder="0x... veya uygun format"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white font-mono text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Not (opsiyonel)</label>
                        <input
                          type="text"
                          value={sendCryptoForm.note}
                          onChange={(e) => setSendCryptoForm({ ...sendCryptoForm, note: e.target.value })}
                          placeholder="Transfer açıklaması"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        />
                      </div>
                    </div>
                    <div className="p-6 border-t border-slate-800 flex gap-3">
                      <button
                        onClick={() => {
                          setSendCryptoModal(false);
                          setSendCryptoForm({ token: 'ETH', amount: '', toAddress: '', note: '' });
                        }}
                        className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl"
                        disabled={sendCryptoLoading}
                      >
                        İptal
                      </button>
                      <button
                        onClick={sendRealCrypto}
                        disabled={sendCryptoLoading || !sendCryptoForm.amount || !sendCryptoForm.toAddress}
                        className="flex-1 py-3 bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] hover:from-[#2F6F62] hover:to-[#D4B47A] rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendCryptoLoading ? "Gönderiliyor..." : "🚀 Gönder"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Transactions Tab */}
          {activeTab === "pending" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">⏳ Pending Transactions</h2>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm">
                    {pendingTransactions.length} bekleyen işlem
                  </span>
                  <button
                    onClick={loadPendingTransactions}
                    disabled={pendingLoading}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
                  >
                    {pendingLoading ? "Yükleniyor..." : "🔄 Yenile"}
                  </button>
                  <button
                    onClick={verifyPendingTransactions}
                    disabled={verifyingTx === 'all'}
                    className="px-4 py-2 bg-[#BFA181] text-white rounded-lg hover:bg-[#BFA181] disabled:opacity-50"
                  >
                    {verifyingTx === 'all' ? "Doğrulanıyor..." : "✅ Tümünü Doğrula"}
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-sm mb-1">Bekleyen</div>
                  <div className="text-2xl font-bold text-[#BFA181]">
                    {pendingTransactions.filter(t => t.status === 'pending_confirmation').length}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-sm mb-1">Onaylanan</div>
                  <div className="text-2xl font-bold text-green-400">
                    {pendingTransactions.filter(t => t.status === 'completed').length}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-sm mb-1">Başarısız</div>
                  <div className="text-2xl font-bold text-red-400">
                    {pendingTransactions.filter(t => t.status === 'failed').length}
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-4">
                  <div className="text-slate-400 text-sm mb-1">Toplam ETH</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatAmount(pendingTransactions.reduce((sum, t) => sum + parseFloat(t.fromAmount || 0), 0), 'ETH')}
                  </div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="bg-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="text-left p-3 text-slate-300">Tarih</th>
                      <th className="text-left p-3 text-slate-300">Kullanıcı</th>
                      <th className="text-left p-3 text-slate-300">İşlem</th>
                      <th className="text-left p-3 text-slate-300">Miktar</th>
                      <th className="text-left p-3 text-slate-300">TX Hash</th>
                      <th className="text-left p-3 text-slate-300">Durum</th>
                      <th className="text-left p-3 text-slate-300">Yaş</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLoading ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Yükleniyor...
                        </td>
                      </tr>
                    ) : pendingTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Bekleyen işlem yok 🎉
                        </td>
                      </tr>
                    ) : (
                      pendingTransactions.map((tx, i) => {
                        const age = Date.now() - tx.timestamp;
                        const ageMin = Math.floor(age / 60000);
                        const isOld = ageMin > 5;
                        
                        return (
                          <tr key={tx.id || i} className="border-t border-slate-700 hover:bg-slate-750">
                            <td className="p-3 text-slate-300 text-sm">
                              {new Date(tx.timestamp).toLocaleString('tr-TR')}
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-xs text-slate-400">
                                {tx.address?.slice(0, 6)}...{tx.address?.slice(-4)}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="text-[#BFA181]">{tx.fromToken}</span>
                              <span className="text-slate-500 mx-1">→</span>
                              <span className="text-green-400">{tx.toToken}</span>
                            </td>
                            <td className="p-3">
                              <div className="text-white">{formatAmount(parseFloat(tx.fromAmount), tx.fromToken)} {tx.fromToken}</div>
                              <div className="text-slate-400 text-xs">→ {formatAmount(parseFloat(tx.toAmount), tx.toToken)} {tx.toToken}</div>
                            </td>
                            <td className="p-3">
                              {tx.ethTransferTxHash || tx.txHash ? (
                                <a
                                  href={`https://etherscan.io/tx/${tx.ethTransferTxHash || tx.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs text-blue-400 hover:underline"
                                >
                                  {(tx.ethTransferTxHash || tx.txHash)?.slice(0, 10)}...
                                </a>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                tx.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                tx.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                'bg-[#BFA181]/20 text-[#BFA181]'
                              }`}>
                                {tx.status === 'completed' ? '✅ Onaylı' :
                                 tx.status === 'failed' ? '❌ Başarısız' :
                                 '⏳ Bekliyor'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`text-sm ${isOld ? 'text-red-400' : 'text-slate-400'}`}>
                                {ageMin < 1 ? '<1 dk' : `${ageMin} dk`}
                                {isOld && ' ⚠️'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="text-blue-400 font-medium mb-2">ℹ️ Optimistic Trading Nasıl Çalışır?</h4>
                <ul className="text-slate-300 text-sm space-y-1">
                  <li>• Kullanıcı ETH gönderir ve TX hash alınır</li>
                  <li>• AUXG anında (optimistic) kullanıcıya verilir</li>
                  <li>• Cron job her 2 dakikada TX onayını kontrol eder</li>
                  <li>• Onaylanırsa status = completed, başarısızsa AUXG geri alınır</li>
                  <li>• 10 dakikadan eski bekleyen işlemler timeout sayılır</li>
                </ul>
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
                          ? "bg-[#BFA181] text-black"
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
                      <p className="text-xs text-[#2F6F62] mt-1">+{formatNumber(analyticsOverview.newUsers7d)} bu hafta</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#2F6F62]/20 to-[#2F6F62]/10 border border-[#2F6F62]/30 rounded-xl p-4">
                      <p className="text-[#2F6F62] text-sm mb-1">Aktif Kullanıcı (24s)</p>
                      <p className="text-2xl font-bold">{formatNumber(analyticsOverview.activeUsers24h)}</p>
                      <p className="text-xs text-slate-400 mt-1">{((analyticsOverview.activeUsers24h / analyticsOverview.totalUsers) * 100).toFixed(1)}% aktif</p>
                    </div>
                    <div className="bg-gradient-to-br from-[#BFA181]/20 to-[#BFA181]/80/10 border border-[#BFA181]/30 rounded-xl p-4">
                      <p className="text-[#BFA181] text-sm mb-1">Toplam Hacim</p>
                      <p className="text-2xl font-bold">{formatCurrency(analyticsOverview.totalVolume)}</p>
                      <p className="text-xs text-[#2F6F62] mt-1">{formatCurrency(analyticsOverview.volume24h)} bugün</p>
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
                              <p className={`text-xs ${asset.change >= 0 ? 'text-[#2F6F62]' : 'text-red-400'}`}>
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

          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">👥 Kullanıcı Yönetimi</h2>

              {/* Search */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Adres, email veya isim ile ara..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500"
                    onChange={(e) => {
                      const search = e.target.value.toLowerCase();
                      if (search.length > 2) {
                        fetch(`/api/admin/users?search=${search}`, { headers: getAuthHeaders() })
                          .then(r => r.json())
                          .then(d => d.users && setUsers(d.users));
                      } else if (search.length === 0) {
                        loadUsers();
                      }
                    }}
                  />
                  <button
                    onClick={loadUsers}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                  >
                    🔄 Yenile
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full min-w-[1400px]">
                  <thead className="bg-slate-800">
                    <tr>
                      <th className="text-left p-3 text-slate-300">Kullanıcı</th>
                      <th className="text-left p-3 text-slate-400">Kayıt Tarihi</th>
                      <th className="text-left p-3 text-slate-300">AUXM</th>
                      <th className="text-left p-3 text-blue-400">ETH</th>
                      <th className="text-left p-3 text-orange-400">BTC</th>
                      <th className="text-left p-3 text-[#BFA181]">AUXG</th>
                      <th className="text-left p-3 text-slate-400">AUXS</th>
                      <th className="text-left p-3 text-green-400">Toplam USD</th>
                      <th className="text-left p-3 text-slate-300">İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          Kullanıcı yükleniyor...
                        </td>
                      </tr>
                    ) : (
                      users.slice((usersPage - 1) * USERS_PER_PAGE, usersPage * USERS_PER_PAGE).map((user, i) => (
                        <tr key={user.address || i} className="border-t border-slate-800 hover:bg-slate-800/50 cursor-pointer" onClick={() => loadUserDetail(user.address)}>
                          <td className="p-3">
                            <div className="flex flex-col">
                              {(user as any).name && (
                                <span className="text-sm text-white font-medium">{(user as any).name}</span>
                              )}
                              {(user as any).email && (
                                <span className="text-xs text-blue-400">{(user as any).email}</span>
                              )}
                              {(user as any).phone && (
                                <span className="text-xs text-slate-500">{(user as any).phone}</span>
                              )}
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-xs text-slate-500">
                                  {user.address?.slice(0, 8)}...{user.address?.slice(-6)}
                                </span>
                                {(user as any).platform && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                    (user as any).platform === 'mobile'
                                      ? 'bg-green-500/20 text-green-400'
                                      : (user as any).platform === 'web'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-slate-600/30 text-slate-400'
                                  }`}>
                                    {(user as any).platform === 'mobile' ? '📱 Mobile' : (user as any).platform === 'web' ? '🌐 Web' : (user as any).platform}
                                  </span>
                                )}
                                {(user as any).source && (
                                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-purple-500/20 text-purple-400">
                                    {(user as any).source}
                                  </span>
                                )}
                                {(user as any).kycStatus && (user as any).kycStatus !== 'none' && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                    (user as any).kycStatus === 'approved'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : (user as any).kycStatus === 'pending'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : (user as any).kycStatus === 'rejected'
                                      ? 'bg-red-500/20 text-red-400'
                                      : 'bg-slate-600/30 text-slate-400'
                                  }`}>
                                    {(user as any).kycStatus === 'approved' ? '✅ KYC' : (user as any).kycStatus === 'pending' ? '⏳ KYC' : (user as any).kycStatus === 'rejected' ? '❌ KYC' : (user as any).kycStatus}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-slate-400 text-xs">
                            {(user as any).createdAt ? (() => {
                              const d = new Date(typeof (user as any).createdAt === 'string' && !(user as any).createdAt.includes('-') ? parseInt((user as any).createdAt) : (user as any).createdAt);
                              return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                            })() : '—'}
                          </td>
                          <td className="p-3 text-slate-300">
                            {formatAmount((user as any).auxmBalance || 0, 'AUXM')}
                          </td>
                          <td className="p-3 text-blue-400">
                            {formatAmount((user as any).ethBalance || 0, 'ETH')}
                          </td>
                          <td className="p-3 text-orange-400">
                            {formatAmount((user as any).btcBalance || 0, 'BTC')}
                          </td>
                          <td className="p-3 text-[#BFA181] font-medium">
                            {formatAmount((user as any).auxgBalance || 0, 'AUXG')}
                          </td>
                          <td className="p-3 text-slate-400">
                            {formatAmount((user as any).auxsBalance || 0, 'AUXS')}
                          </td>
                          <td className="p-3 text-green-400 font-semibold">
                            ${((user as any).totalValueUsd || 0).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={(e) => { e.stopPropagation(); loadUserDetail(user.address); }}
                              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                            >
                              Detay
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {users.length > 0 && (
                <div className="flex items-center justify-between px-2">
                  <p className="text-slate-500 text-sm">
                    Toplam {users.length} kullanıcı • Sayfa {usersPage} / {Math.ceil(users.length / USERS_PER_PAGE)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white"
                    >
                      ← Önceki
                    </button>
                    {Array.from({ length: Math.ceil(users.length / USERS_PER_PAGE) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(users.length / USERS_PER_PAGE) || Math.abs(p - usersPage) <= 2)
                      .map((p, idx, arr) => (
                        <span key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-slate-600 text-xs mx-1">...</span>}
                          <button
                            onClick={() => setUsersPage(p)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium ${
                              p === usersPage
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {p}
                          </button>
                        </span>
                      ))}
                    <button
                      onClick={() => setUsersPage(p => Math.min(Math.ceil(users.length / USERS_PER_PAGE), p + 1))}
                      disabled={usersPage >= Math.ceil(users.length / USERS_PER_PAGE)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs text-white"
                    >
                      Sonraki →
                    </button>
                  </div>
                </div>
              )}

              {/* User Detail Modal */}
              {(selectedUserDetail || userDetailLoading) && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !userDetailLoading && setSelectedUserDetail(null)}>
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    {userDetailLoading && !selectedUserDetail ? (
                      <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
                    ) : selectedUserDetail ? (
                      <>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-700">
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {selectedUserDetail.user.info?.name || "Kullanıcı Detayı"}
                            </h3>
                            <p className="font-mono text-sm text-slate-400 mt-1">{selectedUserDetail.user.address}</p>
                            {selectedUserDetail.user.info?.vaultId && (
                              <p className="text-xs text-[#BFA181] mt-0.5">Vault: {selectedUserDetail.user.info.vaultId}</p>
                            )}
                          </div>
                          <button onClick={() => setSelectedUserDetail(null)} className="text-slate-400 hover:text-white text-2xl leading-none">&times;</button>
                        </div>

                        {/* Info */}
                        <div className="p-5 space-y-5">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Email</p>
                              <p className="text-sm text-white truncate">{selectedUserDetail.user.info?.email || "—"}</p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">İsim</p>
                              <p className="text-sm text-white">{selectedUserDetail.user.info?.name || "—"}</p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Telefon</p>
                              <p className="text-sm text-white">{selectedUserDetail.user.info?.phone || "—"}</p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Kayıt Tarihi</p>
                              <p className="text-sm text-white">
                                {selectedUserDetail.user.info?.createdAt ? (() => {
                                  const raw = selectedUserDetail.user.info.createdAt;
                                  const d = new Date(typeof raw === 'string' && !raw.includes('-') ? parseInt(raw) : raw);
                                  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                })() : "—"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Tier</p>
                              <p className="text-sm text-white">{selectedUserDetail.user.tier?.name || "Regular"}</p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">İşlem Sayısı</p>
                              <p className="text-sm text-white">{selectedUserDetail.user.transactionCount}</p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Toplam USD</p>
                              <p className="text-sm text-green-400 font-semibold">${selectedUserDetail.user.totalValueUsd.toFixed(2)}</p>
                            </div>
                            <div className="bg-slate-800 rounded-lg p-3">
                              <p className="text-xs text-slate-500">Giriş Yöntemi</p>
                              <p className="text-sm text-white capitalize">{selectedUserDetail.user.info?.authProvider || "—"}</p>
                            </div>
                          </div>

                          {/* Balances */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Bakiyeler</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {Object.entries(selectedUserDetail.user.balance || {})
                                .filter(([token]) => {
                                  // Filter out metadata/internal keys that are not actual token balances
                                  const excluded = ['bonusexpiresat', 'totalauxm', 'bonusauxm', 'totalvalueusd', 'lastupdated', 'createdat'];
                                  return !excluded.includes(token.toLowerCase());
                                })
                                .filter(([, amount]) => {
                                  // Also filter out NaN values
                                  const val = parseFloat(String(amount) || "0");
                                  return !isNaN(val);
                                })
                                .sort(([, a], [, b]) => parseFloat(String(b) || "0") - parseFloat(String(a) || "0"))
                                .map(([token, amount]) => (
                                <div key={token} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5">
                                  <span className="text-xs text-slate-500 uppercase">{token}</span>
                                  <p className="text-sm text-white font-mono">{parseFloat(String(amount) || "0").toFixed(token === "eth" || token === "btc" ? 6 : 2)}</p>
                                </div>
                              ))}
                              {Object.keys(selectedUserDetail.user.balance || {}).length === 0 && (
                                <p className="text-sm text-slate-500 col-span-4">Bakiye yok</p>
                              )}
                            </div>
                          </div>

                          {/* Allocations */}
                          {selectedUserDetail.allocations.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-300 mb-2">Allocation&apos;lar ({selectedUserDetail.allocations.length})</h4>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                {selectedUserDetail.allocations.map((a: any, i: number) => (
                                  <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg p-2.5 text-xs flex justify-between">
                                    <span className="text-slate-300">{a.metal || a.token} — {a.amount} oz</span>
                                    <span className="text-slate-500">{a.vault || a.location || "—"}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Transactions */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-2">Son İşlemler ({selectedUserDetail.transactions.length})</h4>
                            {selectedUserDetail.transactions.length === 0 ? (
                              <p className="text-sm text-slate-500">İşlem yok</p>
                            ) : (
                              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                                {selectedUserDetail.transactions.map((tx: any, i: number) => {
                                  const txId = `tx-${i}`;
                                  return (
                                    <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-lg overflow-hidden">
                                      <div
                                        className="p-2.5 text-xs flex items-center justify-between cursor-pointer hover:bg-slate-700/40 transition-colors"
                                        onClick={() => {
                                          const el = document.getElementById(txId);
                                          if (el) el.classList.toggle('hidden');
                                        }}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                            tx.type === "buy" || tx.type === "deposit" || tx.type === "admin_adjustment" ? "bg-green-500/20 text-green-400" :
                                            tx.type === "sell" || tx.type === "withdraw" ? "bg-red-500/20 text-red-400" :
                                            tx.type === "exchange" || tx.type === "convert" ? "bg-blue-500/20 text-blue-400" :
                                            "bg-slate-700 text-slate-400"
                                          }`}>
                                            {tx.type?.toUpperCase() || "TX"}
                                          </span>
                                          <span className="text-slate-300">{tx.token || tx.asset || tx.fromToken || "—"}</span>
                                          <span className="text-white font-mono">{tx.amount || "—"}</span>
                                          {tx.toToken && <span className="text-slate-500">→ {tx.toToken} {tx.toAmount || ""}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-500">
                                            {tx.timestamp ? (() => {
                                              const d = new Date(tx.timestamp);
                                              return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                                            })() : "—"}
                                          </span>
                                          <span className="text-slate-600">▼</span>
                                        </div>
                                      </div>
                                      <div id={txId} className="hidden border-t border-slate-700 p-2.5 bg-slate-900/50 text-xs">
                                        <div className="grid grid-cols-2 gap-2">
                                          {Object.entries(tx).map(([key, val]) => (
                                            <div key={key}>
                                              <span className="text-slate-500">{key}: </span>
                                              <span className="text-slate-300 font-mono break-all">
                                                {key === 'timestamp' && typeof val === 'number'
                                                  ? new Date(val).toLocaleString('tr-TR')
                                                  : String(val)}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
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
                                  ? "bg-[#2F6F62]/20 text-[#2F6F62] hover:bg-[#2F6F62]/30"
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
                          ? 'bg-[#2F6F62] text-white'
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
                              ? 'bg-[#2F6F62]/20 text-[#2F6F62]' 
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
                <button onClick={handleAddBanner} disabled={bannerSaving} className="mt-4 px-6 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-white font-medium disabled:opacity-50">
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
                                campaign.type === 'bonus' ? 'bg-[#2F6F62]/20 text-[#2F6F62]' :
                                campaign.type === 'cashback' ? 'bg-[#BFA181]/20 text-[#BFA181]' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {campaign.type}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400 mb-2">{campaign.description.tr}</p>
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <span className="px-2 py-1 bg-[#BFA181]/20 text-[#BFA181] rounded font-bold">
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
                            <button onClick={() => handleToggleCampaign(campaign.id)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${campaign.active ? "bg-[#2F6F62]/20 text-[#2F6F62]" : "bg-slate-700 text-slate-400"}`}>
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

                <button onClick={handleAddCampaign} disabled={campaignSaving} className="mt-4 px-6 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-black font-medium disabled:opacity-50">
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
                        announcement.type === 'warning' ? 'border-l-[#BFA181] bg-[#BFA181]/10' :
                        announcement.type === 'success' ? 'border-l-[#2F6F62] bg-[#2F6F62]/10' :
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
                                announcement.priority === 'medium' ? 'bg-[#BFA181]/30 text-[#BFA181]' :
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
                            <button onClick={() => handleToggleAnnouncement(announcement.id)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${announcement.active ? "bg-[#2F6F62]/20 text-[#2F6F62]" : "bg-slate-700 text-slate-400"}`}>
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
          {/* Spreads Tab - Institutional Pricing Engine v2 */}
          {activeTab === "spreads" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">⚡ Institutional Pricing Engine</h2>
              <p className="text-slate-400 text-sm">Execution = Spot × (1 + base margin) + floor + volatility + market hours + optimization</p>
              <p className="text-[10px] text-slate-600">Execution price = risk engine. Spread değil, komisyon değil, risk sigortası.</p>

              {/* Volatility Mode — ADDITIVE */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">🌊 Volatility Mode (Additive)</h3>
                <p className="text-xs text-slate-500 mb-4">Base margin&apos;a EKLENİR. Extreme günlerde liquidity pahalanır — genişletmek normal.</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { mode: 'calm', label: 'Calm', add: '+0.00%', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                    { mode: 'elevated', label: 'Elevated', add: '+0.20%', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                    { mode: 'high', label: 'High', add: '+0.40%', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                    { mode: 'extreme', label: 'Extreme', add: '+0.80%', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                  ].map((v) => (
                    <button
                      key={v.mode}
                      onClick={async () => {
                        try {
                          await fetch('/api/admin/pricing', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ volatilityMode: v.mode }),
                          });
                          setMessage({ type: 'success', text: `Volatility → ${v.label} (${v.add})` });
                        } catch { setMessage({ type: 'error', text: 'Failed' }); }
                      }}
                      className={`p-3 rounded-xl border text-center ${v.color}`}
                    >
                      <p className="font-bold text-sm">{v.label}</p>
                      <p className="text-xs opacity-75">{v.add}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Market Hours — ADDITIVE */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">🕐 Market Hours (Additive)</h3>
                <p className="text-xs text-slate-500 mb-4">Metals liquidity 24/7 değildir. Asia/weekend = thinner book.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { mode: 'london_ny', label: 'London/NY', add: '+0.00%', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                    { mode: 'asia', label: 'Asia Hours', add: '+0.15%', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
                    { mode: 'weekend', label: 'Weekend', add: '+0.30%', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                  ].map((h) => (
                    <button
                      key={h.mode}
                      onClick={async () => {
                        try {
                          await fetch('/api/admin/pricing', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ marketHoursMode: h.mode }),
                          });
                          setMessage({ type: 'success', text: `Market hours → ${h.label} (${h.add})` });
                        } catch { setMessage({ type: 'error', text: 'Failed' }); }
                      }}
                      className={`p-3 rounded-xl border text-center ${h.color}`}
                    >
                      <p className="font-bold text-sm">{h.label}</p>
                      <p className="text-xs opacity-75">{h.add}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Depth Multiplier */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">📊 Market Depth (Additive)</h3>
                <p className="text-xs text-slate-500 mb-4">Flash move&apos;larda hayat kurtarır. Thin liquidity = daha geniş execution.</p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { mode: 'deep', label: 'Deep', add: '+0.00%', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                    { mode: 'normal', label: 'Normal', add: '+0.00%', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
                    { mode: 'thin', label: 'Thin', add: '+0.25%', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                    { mode: 'shock', label: 'Shock', add: '+0.45%', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                  ].map((dp) => (
                    <button
                      key={dp.mode}
                      onClick={async () => {
                        try {
                          await fetch('/api/admin/pricing', {
                            method: 'POST',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ depthMode: dp.mode }),
                          });
                          setMessage({ type: 'success', text: `Depth → ${dp.label} (${dp.add})` });
                        } catch { setMessage({ type: 'error', text: 'Failed' }); }
                      }}
                      className={`p-3 rounded-xl border text-center ${dp.color}`}
                    >
                      <p className="font-bold text-sm">{dp.label}</p>
                      <p className="text-xs opacity-75">{dp.add}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Metal Base Margin + Absolute Floor */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">🥇 Base Margin + Absolute Floor</h3>
                <p className="text-xs text-slate-500 mb-4">Floor yoksa tek trade zarar yazdırır. Floor = hedge slippage + liquidity gap + fill risk koruması.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'gold', symbol: 'AUXG', name: 'Auxite Gold', icon: '🥇', defBase: 0.95, defFloor: 1.25 },
                    { key: 'silver', symbol: 'AUXS', name: 'Auxite Silver', icon: '🥈', defBase: 1.45, defFloor: 0.04 },
                    { key: 'platinum', symbol: 'AUXPT', name: 'Auxite Platinum', icon: '⬜', defBase: 1.85, defFloor: 1.80 },
                    { key: 'palladium', symbol: 'AUXPD', name: 'Auxite Palladium', icon: '🔶', defBase: 2.40, defFloor: 4.20 },
                  ].map((metal) => (
                    <div key={metal.key} className="p-4 bg-slate-800/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{metal.icon}</span>
                        <span className="font-medium">{metal.name}</span>
                        <span className="text-xs text-slate-500">{metal.symbol}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Base Margin %</label>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={metal.defBase}
                            id={`margin-base-${metal.key}`}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">Absolute Floor $/g</label>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={metal.defFloor}
                            id={`margin-floor-${metal.key}`}
                            className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white text-sm"
                          />
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const base = parseFloat((document.getElementById(`margin-base-${metal.key}`) as HTMLInputElement)?.value || '0');
                          const floor = parseFloat((document.getElementById(`margin-floor-${metal.key}`) as HTMLInputElement)?.value || '0');
                          try {
                            await fetch('/api/admin/pricing', {
                              method: 'POST',
                              headers: getAuthHeaders(),
                              body: JSON.stringify({ metal: metal.symbol, baseMargin: base, absoluteFloor: floor }),
                            });
                            setMessage({ type: 'success', text: `${metal.name}: base ${base}%, floor $${floor}/g` });
                          } catch { setMessage({ type: 'error', text: 'Failed' }); }
                        }}
                        className="mt-3 w-full py-2 bg-[#BFA181]/20 hover:bg-[#BFA181]/30 text-[#BFA181] rounded-lg text-sm font-medium"
                      >
                        Kaydet
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ticket Curve */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-2">📊 Ticket Curve</h3>
                <p className="text-xs text-slate-500 mb-4">Küçük müşteri operasyonu fonlar. Whale volume getirir.</p>
                <div className="space-y-2">
                  {[
                    { range: '< $50K', adj: 'Base + 0.20%', desc: 'Micro — operations funded', color: 'text-orange-400' },
                    { range: '$50K – $250K', adj: 'Base', desc: 'Standard execution', color: 'text-slate-300' },
                    { range: '$250K – $1M', adj: 'Base − 0.10%', desc: 'Preferred client', color: 'text-green-400' },
                    { range: '$1M – $1.5M', adj: 'Base − 0.15%', desc: 'Institutional', color: 'text-emerald-400' },
                    { range: '$1.5M+', adj: 'RFQ', desc: 'Desk-priced — LP quote, hedge, tighter', color: 'text-[#BFA181]' },
                  ].map((tier) => (
                    <div key={tier.range} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
                      <span className="text-sm text-slate-300 w-32">{tier.range}</span>
                      <span className={`text-sm font-bold w-28 text-center ${tier.color}`}>{tier.adj}</span>
                      <span className="text-xs text-slate-500 flex-1 text-right">{tier.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legacy Spread Config - Crypto */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">₿ Kripto Spread (Legacy)</h3>
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
                    <button onClick={handleAddNews} className="px-6 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-white font-medium">
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
                            ? "bg-[#2F6F62]/20 border-[#2F6F62]/50 text-[#2F6F62]"
                            : "bg-slate-800/50 border-slate-700 text-slate-400"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{label.icon}</span>
                          <span className={`w-2 h-2 rounded-full ${value ? "bg-[#2F6F62]" : "bg-slate-600"}`} />
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
                  className="px-6 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-xl font-medium disabled:opacity-50"
                >
                  {auxiteerSaving ? 'Kaydediliyor...' : '💾 Kaydet'}
                </button>
              </div>

              {/* Success/Error Message */}
              {auxiteerMessage && (
                <div className={`p-4 rounded-xl ${
                  auxiteerMessage.type === 'success' ? 'bg-[#2F6F62]/20 text-[#2F6F62]' : 'bg-red-500/20 text-red-400'
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
                        <span className="px-3 py-1 bg-[#BFA181]/20 text-[#BFA181] rounded-full text-sm">
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
                                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-[#BFA181] focus:ring-[#BFA181]"
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
                    className="px-6 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] text-black font-medium rounded-xl disabled:opacity-50"
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
                          inv.status === 'active' ? 'bg-[#BFA181]/10 border border-[#BFA181]/30' : 'bg-slate-800/50'
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
                            inv.status === 'active' ? 'bg-[#BFA181]/20 text-[#BFA181]' : 'bg-slate-600 text-slate-400'
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

          {/* Platform Stock Tab */}
          {activeTab === "mint" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">📦 Platform Stok Yönetimi</h2>
                <button
                  onClick={loadPlatformStock}
                  disabled={stockLoading}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm"
                >
                  {stockLoading ? "Yükleniyor..." : "🔄 Yenile"}
                </button>
              </div>

              {/* Current Stock Display */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {["AUXG", "AUXS", "AUXPT", "AUXPD"].map((metal) => {
                  const stock = platformStock[metal];
                  const isLow = stock?.isLowStock;
                  const notInit = stock?.notInitialized;
                  const metalNames: Record<string, string> = {
                    AUXG: "🥇 Altın",
                    AUXS: "🥈 Gümüş",
                    AUXPT: "⚪ Platin",
                    AUXPD: "🔘 Paladyum"
                  };

                  return (
                    <div
                      key={metal}
                      className={`p-4 rounded-xl border ${
                        notInit ? "bg-slate-900/50 border-slate-700" :
                        isLow ? "bg-red-900/30 border-red-700" : "bg-[#2F6F62]/30 border-[#2F6F62]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-bold">{metalNames[metal]}</span>
                          <span className="text-xs text-slate-500 ml-1">({metal})</span>
                        </div>
                        {notInit ? (
                          <span className="text-xs bg-slate-700 px-2 py-1 rounded">Başlatılmadı</span>
                        ) : isLow ? (
                          <span className="text-xs bg-red-600 px-2 py-1 rounded animate-pulse">Düşük Stok!</span>
                        ) : (
                          <span className="text-xs bg-[#2F6F62] px-2 py-1 rounded">OK</span>
                        )}
                      </div>
                      <div className="text-2xl font-bold">
                        {stock?.available?.toFixed(2) || "0"} <span className="text-sm text-slate-400">g</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Toplam: {stock?.total?.toFixed(2) || "0"}g | Rezerve: {stock?.reserved?.toFixed(2) || "0"}g
                      </div>
                      {stock?.utilizationPercent && (
                        <div className="mt-2 bg-slate-800 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isLow ? "bg-red-500" : "bg-[#2F6F62]"}`}
                            style={{ width: `${Math.min(100, parseFloat(stock.utilizationPercent))}%` }}
                          />
                        </div>
                      )}
                      {/* Vault Breakdown */}
                      {stock?.byVault && Object.keys(stock.byVault).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <div className="text-xs text-slate-400 mb-2">Kasa Dağılımı:</div>
                          <div className="space-y-1">
                            {Object.entries(stock.byVault).map(([vaultCode, amount]: [string, any]) => (
                              <div key={vaultCode} className="flex justify-between text-xs">
                                <span className="text-slate-300">{availableVaults[vaultCode]?.name || vaultCode}</span>
                                <span className="font-medium">{amount.toFixed(2)}g</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stock Operation Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Stok İşlemi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Metal</label>
                    <select
                      value={stockData.metal}
                      onChange={(e) => setStockData({ ...stockData, metal: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    >
                      <option value="AUXG">🥇 Altın</option>
                      <option value="AUXS">🥈 Gümüş</option>
                      <option value="AUXPT">⚪ Platin</option>
                      <option value="AUXPD">🔘 Paladyum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">İşlem</label>
                    <select
                      value={stockData.action}
                      onChange={(e) => setStockData({ ...stockData, action: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    >
                      <option value="initialize">🆕 Başlat</option>
                      <option value="add">➕ Stok Ekle</option>
                      <option value="remove">➖ Stok Çıkar</option>
                      <option value="set">📝 Stoku Ayarla</option>
                      <option value="transfer">🔄 Kasalar Arası Transfer</option>
                    </select>
                  </div>

                  {/* Vault Selection - for add/remove/initialize/set */}
                  {["add", "remove", "initialize", "set"].includes(stockData.action) && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Kasa</label>
                      <select
                        value={stockData.vault}
                        onChange={(e) => setStockData({ ...stockData, vault: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                      >
                        {Object.entries(availableVaults).map(([code, vault]) => (
                          <option key={code} value={code}>
                            {vault.name} ({vault.country})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Transfer Vaults */}
                  {stockData.action === "transfer" && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Kaynak Kasa</label>
                        <select
                          value={stockData.fromVault}
                          onChange={(e) => setStockData({ ...stockData, fromVault: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        >
                          <option value="">Seçin...</option>
                          {Object.entries(availableVaults).map(([code, vault]) => (
                            <option key={code} value={code}>
                              {vault.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-2">Hedef Kasa</label>
                        <select
                          value={stockData.toVault}
                          onChange={(e) => setStockData({ ...stockData, toVault: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                        >
                          <option value="">Seçin...</option>
                          {Object.entries(availableVaults)
                            .filter(([code]) => code !== stockData.fromVault)
                            .map(([code, vault]) => (
                              <option key={code} value={code}>
                                {vault.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Miktar (gram)</label>
                    <input
                      type="number"
                      value={stockData.amount}
                      onChange={(e) => setStockData({ ...stockData, amount: e.target.value })}
                      placeholder="1000"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Açıklama</label>
                    <input
                      type="text"
                      value={stockData.reason}
                      onChange={(e) => setStockData({ ...stockData, reason: e.target.value })}
                      placeholder="Fiziksel alım..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleStockOperation}
                  className="mt-4 px-6 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-white font-medium"
                >
                  İşlemi Uygula
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4 text-sm">
                <div className="font-semibold text-blue-400 mb-2">ℹ️ Platform Stok Sistemi</div>
                <ul className="text-slate-300 space-y-1">
                  <li>• <strong>Başlat:</strong> Yeni metal stoğu oluşturur (ilk kurulum)</li>
                  <li>• <strong>Stok Ekle:</strong> Fiziksel metal alımında belirli kasaya ekler</li>
                  <li>• <strong>Stok Çıkar:</strong> Fiziksel teslimat yapıldığında kasadan düşer</li>
                  <li>• <strong>Stoku Ayarla:</strong> Fiziksel sayım sonrası stoğu düzeltir</li>
                  <li>• <strong>Kasalar Arası Transfer:</strong> Bir kasadan diğerine metal transferi</li>
                  <li className="text-[#BFA181]">• Stok %20 altına düşünce otomatik uyarı gönderilir</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-blue-800">
                  <div className="font-semibold text-blue-400 mb-2">🏛️ Kasalar</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(availableVaults).map(([code, vault]) => (
                      <div key={code} className="text-xs">
                        <span className="font-medium">{code}:</span> {vault.name} ({vault.country})
                      </div>
                    ))}
                  </div>
                </div>
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
                <h3 className="font-semibold mb-4 text-[#BFA181]">📍 Hot Wallet Adresleri</h3>
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
                        href={`https://etherscan.io/address/0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-blue-400 hover:text-blue-300"
                      >
                        0x3B76...edcA
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
                        href={`https://etherscan.io/address/0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-green-400 hover:text-green-300"
                      >
                        0x3B76...edcA
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
                        href={`https://blockstream.info/address/1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-orange-400 hover:text-orange-300"
                      >
                        1L4h8...yume
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
                        href={`https://solscan.io/account/EoEojSR2NDeekVG3HFCzTAtyeg1n29JNW4f6Ezzg6FQe`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-purple-400 hover:text-purple-300"
                      >
                        EoEoj...6FQe
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
                        href={`https://xrpscan.com/account/rPcUd8sGKrs46MtndLuVWC93f3pypAiHB`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sm text-slate-300 hover:text-white"
                      >
                        rPcUd...iHB
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bakiyeler */}
              {walletBalances && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-[#2F6F62]">💎 Bakiyeler</h3>
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
                <h3 className="font-semibold mb-4 text-[#BFA181]">📤 Kripto Gönder</h3>
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
                    className="bg-[#2F6F62] hover:bg-[#2F6F62] text-black font-medium rounded-lg disabled:opacity-50"
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
                <div className="bg-slate-900/50 border border-[#BFA181]/30 rounded-xl p-6">
                  <h3 className="font-semibold mb-4 text-[#BFA181]">⏳ Bekleyen Çekimler ({pendingUserWithdraws.length})</h3>
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
                            className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-white text-sm disabled:opacity-50"
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
                className="w-full py-3 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-xl text-black font-semibold disabled:opacity-50"
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
                  className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-black font-medium"
                >
                  + Yeni Faz Ekle
                </button>
              </div>

              <div className="space-y-4">
                {roadmapPhases.map((phase: any) => (
                  <div
                    key={phase.id}
                    className={`bg-slate-900/50 border rounded-xl p-6 ${
                      phase.status === 'current' ? 'border-[#BFA181]/50' : 
                      phase.status === 'completed' ? 'border-green-500/30' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          phase.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          phase.status === 'current' ? 'bg-[#BFA181]/20 text-[#BFA181]' :
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
                  className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-black font-medium"
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
                      <div className="w-16 h-16 bg-gradient-to-br from-[#BFA181]/20 to-[#BFA181]/10 rounded-xl flex items-center justify-center text-2xl">
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
                        <p className="text-sm text-[#BFA181]">{member.role?.tr || member.role?.en}</p>
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
                      <div className="w-12 h-12 bg-[#BFA181]/10 rounded-full mx-auto mb-3 flex items-center justify-center text-xl">👤</div>
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <p className="text-xs text-[#BFA181]">{member.role?.tr || member.role?.en}</p>
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
                  className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-lg text-black font-medium"
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
                        'bg-[#BFA181]/20 text-[#BFA181]'
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
                        <span key={metal} className="px-2 py-1 bg-[#BFA181]/10 rounded text-[#BFA181] text-xs">
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

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* RISK DASHBOARD TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "risk" && (
            <RiskDashboardTab />
          )}

          {activeTab === "leasing" && (
            <LeasingEngineTab />
          )}

          {activeTab === "treasury" && (
            <AuxmTreasuryTab />
          )}

          {activeTab === "depositMonitor" && (
            <DepositMonitorTab />
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* REDEMPTION TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          {activeTab === "redemption" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Physical Redemption Controls</h2>
                  <p className="text-sm text-slate-400">Manage physical redemption settings, toggles, and pending requests</p>
                </div>
              </div>

              {/* Global Toggles */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Global Settings</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'redemption_enabled', label: 'Redemption Enabled', desc: 'Global kill switch', active: true },
                    { key: 'courier_enabled', label: 'Courier Enabled', desc: 'Insured delivery option', active: true },
                    { key: 'manual_approval', label: 'Manual Approval', desc: 'Require admin approval', active: true },
                    { key: 'soft_launch', label: 'Soft Launch Mode', desc: 'Request-only mode', active: true },
                  ].map((toggle) => (
                    <div key={toggle.key} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{toggle.label}</span>
                        <div className={`w-10 h-5 ${toggle.active ? 'bg-green-600' : 'bg-slate-600'} rounded-full relative cursor-pointer`}>
                          <div className={`w-4 h-4 bg-white rounded-full absolute ${toggle.active ? 'right-0.5' : 'left-0.5'} top-0.5`} />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">{toggle.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-Metal Config */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Per-Metal Configuration</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left py-2 px-3">Metal</th>
                      <th className="text-left py-2 px-3">Min Threshold</th>
                      <th className="text-left py-2 px-3">Fee %</th>
                      <th className="text-left py-2 px-3">SLA (days)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sym: 'AUXG', name: 'Gold', min: '100g', fee: '0.75%', sla: '5-15' },
                      { sym: 'AUXS', name: 'Silver', min: '31,000g', fee: '1.25%', sla: '10-25' },
                      { sym: 'AUXPT', name: 'Platinum', min: '100g', fee: '1.50%', sla: '5-20' },
                      { sym: 'AUXPD', name: 'Palladium', min: '100g', fee: '1.50%', sla: '5-20' },
                    ].map((m) => (
                      <tr key={m.sym} className="border-b border-slate-700/50">
                        <td className="py-3 px-3 text-white font-semibold">{m.sym} <span className="text-slate-500 text-xs">{m.name}</span></td>
                        <td className="py-3 px-3 text-slate-300">{m.min}</td>
                        <td className="py-3 px-3 text-[#D4B47A]">{m.fee}</td>
                        <td className="py-3 px-3 text-slate-300">{m.sla}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vault Locations */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Vault Locations</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { id: 'zurich', name: 'Zurich', country: 'Switzerland', active: true },
                    { id: 'dubai', name: 'Dubai', country: 'UAE', active: true },
                    { id: 'london', name: 'London', country: 'UK', active: false },
                    { id: 'singapore', name: 'Singapore', country: 'Singapore', active: false },
                  ].map((v) => (
                    <div key={v.id} className={`bg-slate-900/50 rounded-lg p-4 border ${v.active ? 'border-[#2F6F62]/40' : 'border-slate-700'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-white">{v.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${v.active ? 'bg-[#2F6F62]/20 text-[#2F6F62]' : 'bg-slate-700 text-slate-400'}`}>
                          {v.active ? 'Active' : 'Soon'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{v.country}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Redemptions */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Pending Redemption Requests</h3>
                <p className="text-sm text-slate-500 text-center py-6">No pending redemption requests</p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* CASH SETTLEMENT TAB */}
          {/* ═══════════════════════════════════════════ */}
          {activeTab === "cashSettlement" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Cash Settlement Controls</h2>
                  <p className="text-sm text-slate-400">Custody unwind — LBMA spot minus exit spread, T+1 settlement</p>
                </div>
                <button
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors"
                  onClick={async () => {
                    if (confirm('EMERGENCY FREEZE: Disable all cash settlements?')) {
                      try {
                        await fetch('/api/admin/settlement', {
                          method: 'POST',
                          headers: getAuthHeaders(),
                          body: JSON.stringify({ action: 'emergency_freeze' }),
                        });
                        alert('Cash settlement FROZEN');
                      } catch {}
                    }
                  }}
                >
                  🚨 Emergency Freeze
                </button>
              </div>

              {/* Feature Flag Toggles */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Feature Flags</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { key: 'cash_settlement_enabled', label: 'Cash Settlement', desc: 'Global on/off', icon: '💰' },
                    { key: 'rail_auxm', label: 'AUXM Rail', desc: 'Internal settlement unit', icon: '🪙' },
                    { key: 'rail_usdt', label: 'USDT Rail', desc: 'Tether stablecoin', icon: '💵' },
                    { key: 'instant_settlement', label: 'Instant Mode', desc: 'Phase 2 — skip T+1', icon: '⚡' },
                  ].map((flag) => (
                    <div key={flag.key} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400">{flag.icon} {flag.label}</span>
                        <div className="w-10 h-5 bg-green-600 rounded-full relative cursor-pointer">
                          <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500">{flag.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exit Spread Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Exit Spread Configuration</h3>
                <p className="text-xs text-slate-500 mb-4">Settlement Price = LBMA Spot − Exit Spread%. Separate from trading spreads.</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs border-b border-slate-700">
                      <th className="text-left py-2 px-3">Metal</th>
                      <th className="text-left py-2 px-3">Exit Spread %</th>
                      <th className="text-left py-2 px-3">vs Trading Spread</th>
                      <th className="text-left py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { sym: 'AUXG', name: 'Gold', spread: '0.65%', trading: '1.50%' },
                      { sym: 'AUXS', name: 'Silver', spread: '0.80%', trading: '2.00%' },
                      { sym: 'AUXPT', name: 'Platinum', spread: '0.80%', trading: '2.00%' },
                      { sym: 'AUXPD', name: 'Palladium', spread: '0.80%', trading: '2.50%' },
                    ].map((m) => (
                      <tr key={m.sym} className="border-b border-slate-700/50">
                        <td className="py-3 px-3 text-white font-semibold">{m.sym} <span className="text-slate-500 text-xs">{m.name}</span></td>
                        <td className="py-3 px-3 text-[#D4B47A] font-bold">{m.spread}</td>
                        <td className="py-3 px-3 text-slate-500">{m.trading}</td>
                        <td className="py-3 px-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2F6F62]/20 text-[#2F6F62]">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Daily Cap & Quote TTL */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Daily Settlement Cap</h3>
                  <div className="text-2xl font-bold text-[#D4B47A]">$500,000</div>
                  <p className="text-xs text-slate-500 mt-1">Today: $0 / 0 orders</p>
                  <div className="mt-3 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2F6F62] rounded-full" style={{ width: '0%' }} />
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                  <h3 className="text-sm font-bold text-slate-300 mb-3">Settlement Parameters</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Quote TTL</span>
                      <span className="text-white font-semibold">120 seconds</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Settlement Cycle</span>
                      <span className="text-white font-semibold">T+1 (24h)</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Cancelable</span>
                      <span className="text-red-400 font-semibold">No</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Price Source</span>
                      <span className="text-white font-semibold">LBMA / GoldAPI</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending Settlements */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-300 mb-4">Pending Settlements (T+1 Queue)</h3>
                <p className="text-sm text-slate-500 text-center py-6">No pending settlements. Orders auto-complete after T+1.</p>
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
                    className="flex-1 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] rounded-xl text-black font-semibold"
                  >
                    💾 Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* RELATIONSHIP MANAGERS / CRM TAB                                        */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {activeTab === "relationshipManagers" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">Relationship Managers</h2>
                  <p className="text-xs text-slate-400">Müşteri ilişki yönetimi ve CRM</p>
                </div>
                <div className="flex gap-2">
                  {rmStats?.unassignedUsers > 0 && (
                    <button
                      onClick={async () => {
                        if (!confirm(`${rmStats.unassignedUsers} atanmamış müşteri tüm RM'lere otomatik atanacak. Devam?`)) return;
                        try {
                          const token = sessionStorage.getItem("auxite_admin_token");
                          const res = await fetch("/api/admin/relationship-managers", {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ action: 'assign-all-unassigned' }),
                          });
                          if (res.ok) { const data = await res.json(); alert(`${data.assigned} müşteri atandı`); loadRelationshipManagers(); }
                          else { const err = await res.json(); alert('Hata: ' + err.error); }
                        } catch (e: any) { alert('Hata: ' + e.message); }
                      }}
                      className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg text-sm hover:bg-amber-500"
                    >
                      Tümünü Ata ({rmStats.unassignedUsers})
                    </button>
                  )}
                  <button
                    onClick={() => { setEditingRm(null); setRmFormData({ name: '', title: 'Relationship Manager', email: '', phone: '', whatsapp: '', capacity: 100, languages: 'en', specializations: '' }); setShowRmForm(true); }}
                    className="px-4 py-2 bg-[#2F6F62] text-white font-semibold rounded-lg text-sm hover:bg-[#2F6F62]/80"
                  >
                    + Yeni RM Ekle
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              {rmStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Toplam RM</p>
                    <p className="text-2xl font-bold text-white">{rmStats.totalManagers}</p>
                    <p className="text-xs text-[#2F6F62]">{rmStats.activeManagers} aktif</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Atanmış Müşteri</p>
                    <p className="text-2xl font-bold text-white">{rmStats.totalClients}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Ort. Yük</p>
                    <p className="text-2xl font-bold text-white">{rmStats.averageLoad}</p>
                    <p className="text-xs text-slate-500">müşteri/RM</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <p className="text-xs text-slate-400 mb-1">Atanmamış</p>
                    <p className="text-2xl font-bold text-amber-400">{rmStats.unassignedUsers}</p>
                  </div>
                </div>
              )}

              {/* RM List */}
              {rmLoading ? (
                <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
              ) : rmList.length === 0 ? (
                <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700 text-center">
                  <p className="text-slate-400 mb-4">Henüz ilişki yöneticisi eklenmedi</p>
                  <button
                    onClick={() => setShowRmForm(true)}
                    className="px-4 py-2 bg-[#2F6F62] text-white font-semibold rounded-lg text-sm"
                  >
                    İlk RM&apos;yi Ekle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rmList.map((rm: any) => (
                    <div key={rm.id} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#BFA181]/20 flex items-center justify-center text-[#BFA181] font-bold text-lg flex-shrink-0">
                          {rm.initials || rm.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{rm.name}</p>
                          <p className="text-xs text-slate-400">{rm.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{rm.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          rm.status === 'active' ? 'bg-[#2F6F62]/20 text-[#2F6F62]' :
                          rm.status === 'on_leave' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {rm.status === 'active' ? 'Aktif' : rm.status === 'on_leave' ? 'İzinde' : 'Pasif'}
                        </span>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Müşteri Yükü</span>
                          <span>{rm.currentLoad || 0} / {rm.capacity}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (rm.utilization || 0) > 90 ? 'bg-red-500' :
                              (rm.utilization || 0) > 70 ? 'bg-amber-500' : 'bg-[#2F6F62]'
                            }`}
                            style={{ width: `${Math.min(rm.utilization || 0, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {rm.languages?.map((l: string) => (
                          <span key={l} className="px-1.5 py-0.5 text-[10px] bg-slate-700 text-slate-300 rounded">{l.toUpperCase()}</span>
                        ))}
                        {rm.phone && <span className="text-[10px] text-slate-500 ml-auto">{rm.phone}</span>}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRm(rm);
                            setRmFormData({
                              name: rm.name, title: rm.title, email: rm.email, phone: rm.phone || '',
                              whatsapp: rm.whatsapp || '', capacity: rm.capacity || 100,
                              languages: (rm.languages || []).join(', '),
                              specializations: (rm.specializations || []).join(', '),
                            });
                            setShowRmForm(true);
                          }}
                          className="flex-1 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => viewRmClients(rm.id)}
                          className="flex-1 py-1.5 text-xs font-medium bg-[#BFA181]/15 text-[#BFA181] rounded-lg hover:bg-[#BFA181]/25"
                        >
                          Müşteriler ({rm.currentLoad || 0})
                        </button>
                        <button
                          onClick={() => rm.status === 'active' ? deactivateRM(rm.id) : deleteRM(rm.id)}
                          className="py-1.5 px-3 text-xs font-medium bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20"
                        >
                          {rm.status === 'active' ? 'Deaktif' : 'Sil'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add/Edit RM Modal */}
              {showRmForm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowRmForm(false)}>
                  <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={(e) => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-white mb-4">{editingRm ? 'RM Düzenle' : 'Yeni RM Ekle'}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">İsim *</label>
                        <input value={rmFormData.name} onChange={(e) => setRmFormData(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Ahmet Yılmaz" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Ünvan</label>
                        <input value={rmFormData.title} onChange={(e) => setRmFormData(p => ({ ...p, title: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="Relationship Manager" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">E-posta *</label>
                        <input value={rmFormData.email} onChange={(e) => setRmFormData(p => ({ ...p, email: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="ahmet@auxite.io" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Telefon</label>
                          <input value={rmFormData.phone} onChange={(e) => setRmFormData(p => ({ ...p, phone: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="+90 5xx xxx xx xx" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">WhatsApp</label>
                          <input value={rmFormData.whatsapp} onChange={(e) => setRmFormData(p => ({ ...p, whatsapp: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="905xxxxxxxxx" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Kapasite (max müşteri)</label>
                          <input type="number" value={rmFormData.capacity} onChange={(e) => setRmFormData(p => ({ ...p, capacity: parseInt(e.target.value) || 100 }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Diller (virgülle)</label>
                          <input value={rmFormData.languages} onChange={(e) => setRmFormData(p => ({ ...p, languages: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="en, tr, de" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Uzmanlık Alanları (virgülle)</label>
                        <input value={rmFormData.specializations} onChange={(e) => setRmFormData(p => ({ ...p, specializations: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" placeholder="institutional, metals, crypto" />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-5">
                      <button onClick={() => setShowRmForm(false)} className="flex-1 py-2.5 text-sm font-medium bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">İptal</button>
                      <button onClick={saveRM} disabled={rmSaving || !rmFormData.name || !rmFormData.email} className="flex-1 py-2.5 text-sm font-semibold bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62]/80 disabled:opacity-50">
                        {rmSaving ? 'Kaydediliyor...' : editingRm ? 'Güncelle' : 'Ekle'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* View Clients Modal */}
              {viewingRmClients && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewingRmClients(null)}>
                  <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Atanmış Müşteriler</h3>
                      <span className="text-sm text-[#BFA181] font-semibold">{rmClients.length} müşteri</span>
                    </div>
                    {rmClients.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">Henüz atanmış müşteri yok</p>
                    ) : (
                      <div className="space-y-2">
                        {rmClients.map((addr: string) => (
                          <div key={addr} className="flex items-center justify-between py-2 px-3 bg-slate-800 rounded-lg">
                            <span className="text-xs font-mono text-slate-300">{addr.slice(0, 8)}...{addr.slice(-6)}</span>
                            <button
                              onClick={() => { navigator.clipboard.writeText(addr); }}
                              className="text-xs text-slate-500 hover:text-white"
                            >
                              Kopyala
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setViewingRmClients(null)} className="w-full mt-4 py-2.5 text-sm font-medium bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">Kapat</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ STATEMENTS TAB ═══════════════ */}
          {/* ═══════════════ PUSH NOTIFICATIONS TAB ═══════════════ */}
          {activeTab === "pushNotifications" && (
            <PushNotificationsTab />
          )}

          {/* ═══════════════ NOTIFICATION HISTORY TAB ═══════════════ */}
          {activeTab === "notificationHistory" && (
            <NotificationHistoryTab />
          )}

          {/* Oracle Watcher Tab */}
          {activeTab === "oracleWatcher" && (
            <OracleWatcherTab />
          )}

          {activeTab === "statements" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">📑 Rapor Yönetimi</h2>
              <p className="text-sm text-slate-400">Saklama beyanları, aylık/çeyreklik/yıllık raporları buradan oluşturup yayınlayın. Çoklu dil desteğiyle.</p>

              {/* Existing Statements */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Mevcut Raporlar ({adminStatements.length})</h3>

                {adminStatements.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">Henüz rapor eklenmemiş</p>
                ) : (
                  <div className="space-y-3">
                    {adminStatements.map((stmt: any) => (
                      <div
                        key={stmt.id}
                        className={`p-4 rounded-xl border ${
                          stmt.published ? "bg-slate-800/50 border-[#2F6F62]/50" : "bg-slate-900/50 border-slate-800 opacity-70"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="font-medium text-white">{stmt.title?.tr || stmt.title?.en}</p>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                stmt.type === 'monthly' ? 'bg-[#BFA181]/20 text-[#BFA181]' :
                                stmt.type === 'quarterly' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {stmt.type === 'monthly' ? 'Aylık' : stmt.type === 'quarterly' ? 'Çeyreklik' : 'Yıllık'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                stmt.published ? 'bg-[#2F6F62]/20 text-[#2F6F62]' : 'bg-red-500/20 text-red-400'
                              }`}>
                                {stmt.published ? '✅ Yayında' : '⏸ Taslak'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400">{stmt.title?.en}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                              <span>Dönem: {stmt.period?.tr || stmt.period?.en}</span>
                              <span>Bitiş: {stmt.periodEnding}</span>
                              {stmt.fileSize && <span>Boyut: {stmt.fileSize}</span>}
                              {stmt.pdfUrl && <span className="text-blue-400">PDF ✓</span>}
                            </div>
                            {/* Show which languages are filled */}
                            <div className="flex gap-1 mt-2">
                              {['tr', 'en', 'de', 'fr', 'ar', 'ru'].map(lang => (
                                <span key={lang} className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  stmt.title?.[lang] ? 'bg-[#2F6F62]/20 text-[#2F6F62]' : 'bg-slate-700 text-slate-500'
                                }`}>
                                  {lang.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleStatementPublish(stmt.id)}
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                stmt.published
                                  ? "bg-[#2F6F62]/20 text-[#2F6F62] hover:bg-[#2F6F62]/30"
                                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                              }`}
                              title={stmt.published ? 'Yayından kaldır' : 'Yayınla'}
                            >
                              {stmt.published ? "📢" : "📤"}
                            </button>
                            <button
                              onClick={() => handleDeleteStatement(stmt.id)}
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

              {/* New Statement Form */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Yeni Rapor Ekle</h3>

                {/* Language Tabs */}
                <div className="flex gap-1 mb-4 flex-wrap">
                  {['TR', 'EN', 'DE', 'FR', 'AR', 'RU'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setStmtLangTab(lang.toLowerCase())}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        stmtLangTab === lang.toLowerCase()
                          ? 'bg-[#2F6F62] text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title — Active Language */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Başlık ({stmtLangTab.toUpperCase()}) {(stmtLangTab === 'tr' || stmtLangTab === 'en') && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={newStmt.title?.[stmtLangTab] || ""}
                      onChange={e => setNewStmt({ ...newStmt, title: { ...newStmt.title, [stmtLangTab]: e.target.value } })}
                      placeholder={stmtLangTab === 'tr' ? 'Ocak 2026 Saklama Beyanı' : stmtLangTab === 'en' ? 'January 2026 Custody Statement' : `Title (${stmtLangTab.toUpperCase()})`}
                    />
                  </div>

                  {/* Period — Active Language */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Dönem ({stmtLangTab.toUpperCase()}) {(stmtLangTab === 'tr' || stmtLangTab === 'en') && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={newStmt.period?.[stmtLangTab] || ""}
                      onChange={e => setNewStmt({ ...newStmt, period: { ...newStmt.period, [stmtLangTab]: e.target.value } })}
                      placeholder={stmtLangTab === 'tr' ? 'Ocak 2026' : stmtLangTab === 'en' ? 'January 2026' : `Period (${stmtLangTab.toUpperCase()})`}
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tür</label>
                    <select
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={newStmt.type}
                      onChange={e => setNewStmt({ ...newStmt, type: e.target.value })}
                    >
                      <option value="monthly">Aylık</option>
                      <option value="quarterly">Çeyreklik</option>
                      <option value="annual">Yıllık</option>
                    </select>
                  </div>

                  {/* Period Ending Date */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dönem Bitiş Tarihi <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={newStmt.periodEnding}
                      onChange={e => setNewStmt({ ...newStmt, periodEnding: e.target.value })}
                    />
                  </div>

                  {/* File Size */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Dosya Boyutu</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={newStmt.fileSize}
                      onChange={e => setNewStmt({ ...newStmt, fileSize: e.target.value })}
                      placeholder="245 KB"
                    />
                  </div>

                  {/* PDF URL */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">PDF URL (opsiyonel)</label>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={newStmt.pdfUrl}
                      onChange={e => setNewStmt({ ...newStmt, pdfUrl: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreateStatement}
                  disabled={stmtSaving}
                  className="mt-4 px-6 py-2.5 bg-[#2F6F62] text-white rounded-lg font-semibold text-sm hover:bg-[#2F6F62]/80 disabled:opacity-50 transition-colors"
                >
                  {stmtSaving ? "Kaydediliyor..." : "📋 Rapor Oluştur"}
                </button>
              </div>
            </div>
          )}

          {/* Support Settings Tab */}
          {activeTab === "supportSettings" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">💬 Destek Kanalları Yönetimi</h2>
              <p className="text-slate-400 text-sm">Mobil uygulama ve web sitesinde gösterilecek iletişim bilgilerini buradan yönetin.</p>

              {supportSettingsLoading ? (
                <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
              ) : (
                <>
                  {/* WhatsApp */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#25D366]/15 flex items-center justify-center text-lg">📱</div>
                      <div>
                        <h3 className="font-semibold text-white">WhatsApp Numarası</h3>
                        <p className="text-xs text-slate-500">Uluslararası format: ülke kodu + numara (örn: 447520637591)</p>
                      </div>
                    </div>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500"
                      value={supportContactSettings.whatsappNumber}
                      onChange={(e) => setSupportContactSettings({ ...supportContactSettings, whatsappNumber: e.target.value })}
                      placeholder="447520637591"
                    />
                    {supportContactSettings.whatsappNumber && (
                      <p className="text-xs text-slate-500 mt-2">
                        Link: <span className="text-[#25D366]">wa.me/{supportContactSettings.whatsappNumber}</span>
                      </p>
                    )}
                  </div>

                  {/* Telegram */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#0088cc]/15 flex items-center justify-center text-lg">✈️</div>
                      <div>
                        <h3 className="font-semibold text-white">Telegram Linki</h3>
                        <p className="text-xs text-slate-500">Kullanıcı adı veya tam link (örn: AuxiteSupport veya https://t.me/AuxiteSupport)</p>
                      </div>
                    </div>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500"
                      value={supportContactSettings.telegramLink}
                      onChange={(e) => setSupportContactSettings({ ...supportContactSettings, telegramLink: e.target.value })}
                      placeholder="AuxiteSupport"
                    />
                    {supportContactSettings.telegramLink && (
                      <p className="text-xs text-slate-500 mt-2">
                        Link: <span className="text-[#0088cc]">
                          {supportContactSettings.telegramLink.startsWith('http') ? supportContactSettings.telegramLink : `t.me/${supportContactSettings.telegramLink}`}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center text-lg">📧</div>
                      <div>
                        <h3 className="font-semibold text-white">Destek E-posta</h3>
                        <p className="text-xs text-slate-500">Kullanıcıların destek talebi göndereceği e-posta adresi</p>
                      </div>
                    </div>
                    <input
                      type="email"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500"
                      value={supportContactSettings.supportEmail}
                      onChange={(e) => setSupportContactSettings({ ...supportContactSettings, supportEmail: e.target.value })}
                      placeholder="support@auxite.io"
                    />
                  </div>

                  {/* Phone */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center text-lg">📞</div>
                      <div>
                        <h3 className="font-semibold text-white">Telefon Numarası</h3>
                        <p className="text-xs text-slate-500">Destek hattı telefon numarası</p>
                      </div>
                    </div>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500"
                      value={supportContactSettings.phoneNumber}
                      onChange={(e) => setSupportContactSettings({ ...supportContactSettings, phoneNumber: e.target.value })}
                      placeholder="+90 533 506 28 56"
                    />
                  </div>

                  {/* Business Hours */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#BFA181]/15 flex items-center justify-center text-lg">🕐</div>
                      <div>
                        <h3 className="font-semibold text-white">Çalışma Saatleri</h3>
                        <p className="text-xs text-slate-500">Destek ekibinin aktif olduğu saatler</p>
                      </div>
                    </div>
                    <input
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500"
                      value={supportContactSettings.businessHours}
                      onChange={(e) => setSupportContactSettings({ ...supportContactSettings, businessHours: e.target.value })}
                      placeholder="Mon-Fri 9:00-18:00 CET"
                    />
                  </div>

                  {/* Preview */}
                  <div className="bg-slate-900/50 border border-[#BFA181]/20 rounded-xl p-6">
                    <h3 className="font-semibold text-[#BFA181] mb-4">Önizleme</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[#25D366]">WhatsApp:</span>
                        <span className="text-white">{supportContactSettings.whatsappNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#0088cc]">Telegram:</span>
                        <span className="text-white">{supportContactSettings.telegramLink || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-400">Email:</span>
                        <span className="text-white">{supportContactSettings.supportEmail || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">Telefon:</span>
                        <span className="text-white">{supportContactSettings.phoneNumber || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <span className="text-[#BFA181]">Saatler:</span>
                        <span className="text-white">{supportContactSettings.businessHours || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={saveSupportSettings}
                    disabled={supportSettingsSaving}
                    className="w-full py-3 bg-[#BFA181] text-white rounded-xl font-semibold text-sm hover:bg-[#BFA181]/80 disabled:opacity-50 transition-colors"
                  >
                    {supportSettingsSaving ? "Kaydediliyor..." : "💾 Destek Ayarlarını Kaydet"}
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RISK DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function RiskDashboardTab() {
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchRisk = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch('/api/admin/risk', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setRiskData(data);
    } catch (e) {
      console.error('Risk fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRisk();
    const interval = setInterval(fetchRisk, 10000);
    return () => clearInterval(interval);
  }, [fetchRisk]);

  if (loading) return <div className="text-center py-12 text-slate-400">Loading risk data...</div>;
  if (!riskData) return <div className="text-center py-12 text-red-400">Failed to load risk data</div>;

  const { matching, hedging, inventory, health } = riskData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Risk Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${health?.isHealthy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {health?.isHealthy ? 'HEALTHY' : 'ALERT'}
          </span>
          <button onClick={fetchRisk} className="px-3 py-1 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
            Refresh
          </button>
        </div>
      </div>

      {/* Health Alerts */}
      {health?.alerts?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <h3 className="text-sm font-bold text-red-400 mb-2">Active Alerts</h3>
          {health.alerts.map((a: string, i: number) => (
            <p key={i} className="text-xs text-red-300 mb-1">• {a}</p>
          ))}
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Match Ratio</p>
          <p className="text-2xl font-bold text-blue-400">{matching?.stats?.matchRatio || 0}%</p>
          <p className="text-xs text-slate-500 mt-1">Target: 30-60%</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Net Exposure</p>
          <p className="text-2xl font-bold text-white">${Math.abs(health?.totalNetExposureUSD || 0).toFixed(0)}</p>
          <p className="text-xs text-slate-500 mt-1">Target: ~$0</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Open Hedges</p>
          <p className="text-2xl font-bold text-amber-400">{hedging?.stats?.openPositionCount || 0}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Match Revenue</p>
          <p className="text-2xl font-bold text-green-400">${(matching?.stats?.revenueFromMatching || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Matching Stats */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4">Internal Matching Engine</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Total Orders</p>
            <p className="text-lg font-bold text-white">{matching?.stats?.totalOrders || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Matched</p>
            <p className="text-lg font-bold text-green-400">{matching?.stats?.matchedOrders || 0}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Sent to LP</p>
            <p className="text-lg font-bold text-amber-400">{(matching?.stats?.totalOrders || 0) - (matching?.stats?.matchedOrders || 0)}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">Total Volume</p>
            <p className="text-sm font-bold text-white">${(matching?.stats?.totalVolumeUSD || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">LP Volume</p>
            <p className="text-sm font-bold text-white">${(matching?.stats?.lpVolumeUSD || 0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Exposure by Metal */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4">Metal Exposure (must be ~0)</h3>
        <div className="space-y-3">
          {(hedging?.exposure || []).map((exp: any) => (
            <div key={exp.metal} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  exp.riskLevel === 'flat' ? 'bg-green-400' :
                  exp.riskLevel === 'hedged' ? 'bg-blue-400' :
                  exp.riskLevel === 'exposed' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
                <span className="text-sm font-bold text-white">{exp.metal}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-mono text-white">{formatAmount(exp.netExposureGrams || 0, exp.metal || 'AUXG')}g</p>
                <p className="text-xs text-slate-500">${Math.abs(exp.netExposureUSD || 0).toFixed(2)}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                exp.riskLevel === 'flat' ? 'bg-green-500/20 text-green-400' :
                exp.riskLevel === 'hedged' ? 'bg-blue-500/20 text-blue-400' :
                exp.riskLevel === 'exposed' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {exp.riskLevel?.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Positions */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
        <h3 className="text-sm font-bold text-slate-300 mb-4">Inventory Positions (Zero-Inventory Policy)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2">Metal</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2">Client</th>
                <th className="text-right py-2">Leased</th>
                <th className="text-right py-2">Net Dir.</th>
              </tr>
            </thead>
            <tbody>
              {(inventory?.positions || []).map((pos: any) => (
                <tr key={pos.metal} className="border-b border-slate-800">
                  <td className="py-2 text-white font-bold">{pos.metal}</td>
                  <td className="py-2 text-right text-slate-300">{pos.totalGrams?.toFixed(2)}g</td>
                  <td className="py-2 text-right text-slate-300">{pos.allocatedToClients?.toFixed(2)}g</td>
                  <td className="py-2 text-right text-slate-300">{pos.leasedOut?.toFixed(2)}g</td>
                  <td className={`py-2 text-right font-bold ${Math.abs(pos.netDirectional) < 0.01 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatAmount(pos.netDirectional || 0, pos.metal || 'AUXG')}g
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Hedge Positions */}
      {hedging?.openPositions?.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Open Hedge Positions</h3>
          <div className="space-y-2">
            {hedging.openPositions.map((pos: any) => (
              <div key={pos.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 text-xs">
                <div>
                  <span className="text-white font-bold">{pos.metal}</span>
                  <span className="text-slate-500 ml-2">{pos.side} {pos.instrument}</span>
                </div>
                <div className="text-right">
                  <span className="text-white">{formatAmount(pos.grams || 0, pos.metal || 'AUXG')}g</span>
                  <span className="text-slate-500 ml-2">${pos.notionalUSD?.toFixed(0)}</span>
                </div>
                <span className="text-amber-400">{pos.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Violations */}
      {inventory?.violations?.length > 0 && (
        <div className="bg-red-500/10 rounded-xl p-5 border border-red-500/30">
          <h3 className="text-sm font-bold text-red-400 mb-4">Inventory Violations (Blocked)</h3>
          <div className="space-y-2">
            {inventory.violations.map((v: any, i: number) => (
              <div key={i} className="text-xs text-red-300">
                {new Date(v.timestamp).toLocaleString()} — {v.metal} {v.side} {v.grams}g blocked (would create {v.wouldBeNet?.toFixed(2)}g net, max: {v.maxAllowed}g)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Master Strategy Reminder */}
      <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 text-center">
        <p className="text-sm text-slate-400 font-mono">
          Match first. Hedge immediately. Allocate physically. Lease what is idle. Never bet on price.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEPOSIT MONITOR TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DepositMonitorTab() {
  const [scannerData, setScannerData] = useState<any>(null);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [orphanDeposits, setOrphanDeposits] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [reconcileAddress, setReconcileAddress] = useState('');

  const adminToken = typeof window !== 'undefined' ? sessionStorage.getItem('auxite_admin_token') : null;

  const fetchData = useCallback(async () => {
    if (!adminToken) return;
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${adminToken}` };

      const [scannerRes, recentRes, orphanRes, statsRes] = await Promise.all([
        fetch('/api/admin/deposit-monitor?type=scanner', { headers }),
        fetch('/api/admin/deposit-monitor?type=recent', { headers }),
        fetch('/api/admin/deposit-monitor?type=orphan', { headers }),
        fetch('/api/admin/deposit-monitor?type=stats', { headers }),
      ]);

      const [scanner, recent, orphan, statsData] = await Promise.all([
        scannerRes.json(),
        recentRes.json(),
        orphanRes.json(),
        statsRes.json(),
      ]);

      setScannerData(scanner);
      setRecentDeposits(recent.deposits || []);
      setOrphanDeposits(orphan.orphans || []);
      setStats(statsData.stats || []);
    } catch (err) {
      console.error('Deposit monitor fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleScanner = async () => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/deposit-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'toggle' }),
      });
      const data = await res.json();
      setActionMsg(data.message || 'Done');
      fetchData();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Error toggling scanner');
    }
  };

  const resetChain = async (chain: string) => {
    if (!adminToken) return;
    try {
      const res = await fetch('/api/admin/deposit-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'rescan', chain }),
      });
      const data = await res.json();
      setActionMsg(data.message || 'Done');
      fetchData();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg('Error resetting chain');
    }
  };

  const reconcileOrphan = async (txHash: string) => {
    if (!adminToken || !reconcileAddress) {
      setActionMsg('Enter user address');
      return;
    }
    try {
      const res = await fetch('/api/admin/deposit-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ action: 'reconcile', txHash, userAddress: reconcileAddress }),
      });
      const data = await res.json();
      setActionMsg(data.message || 'Reconciled');
      setReconcileAddress('');
      fetchData();
      setTimeout(() => setActionMsg(''), 5000);
    } catch (err) {
      setActionMsg('Error reconciling');
    }
  };

  if (loading && !scannerData) {
    return <div className="text-center py-20 text-slate-400">Yükleniyor...</div>;
  }

  const scannerEnabled = scannerData?.scanner?.enabled !== false;
  const lastRun = scannerData?.scanner?.lastRun;
  const chains = scannerData?.chains || {};

  return (
    <div className="space-y-6">
      {/* Action Message */}
      {actionMsg && (
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm text-center">
          {actionMsg}
        </div>
      )}

      {/* Scanner Status */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            📡 Deposit Scanner
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              scannerEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${scannerEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {scannerEnabled ? 'ACTIVE' : 'PAUSED'}
            </span>
          </h3>
          <button
            onClick={toggleScanner}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              scannerEnabled
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {scannerEnabled ? '⏸ Pause' : '▶ Activate'}
          </button>
        </div>

        {lastRun && (
          <p className="text-xs text-slate-500 mb-4">
            Last scan: {new Date(lastRun).toLocaleString()} —
            Deposits: {scannerData?.scanner?.depositCount || 0} |
            Orphan: {scannerData?.scanner?.orphanCount || 0} |
            Errors: {scannerData?.scanner?.errorCount || 0}
          </p>
        )}

        {/* Chain Status Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['eth', 'btc', 'xrp', 'sol'] as const).map((chain) => (
            <div key={chain} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold uppercase text-slate-400">{chain}</span>
                <button
                  onClick={() => resetChain(chain)}
                  className="text-[10px] text-slate-500 hover:text-amber-400 transition-colors"
                  title="Reset scanner state"
                >
                  🔄
                </button>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {chain === 'eth' && `Block: ${chains.eth?.lastBlock || '—'}`}
                {chain === 'btc' && `TX: ${String(chains.btc?.lastTxid || '—').slice(0, 12)}...`}
                {chain === 'xrp' && `Ledger: ${chains.xrp?.lastLedger || '—'}`}
                {chain === 'sol' && `Sig: ${String(chains.sol?.lastSignature || '—').slice(0, 12)}...`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Stats */}
      {stats.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-semibold mb-4">📊 Daily Stats (7 days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase">
                  <th className="text-left py-2">Date</th>
                  <th className="text-right py-2">Total</th>
                  <th className="text-right py-2">ETH</th>
                  <th className="text-right py-2">BTC</th>
                  <th className="text-right py-2">XRP</th>
                  <th className="text-right py-2">SOL</th>
                  <th className="text-right py-2">AUXM</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((day: any) => (
                  <tr key={day.date} className="border-t border-slate-800">
                    <td className="py-2 text-slate-300">{day.date}</td>
                    <td className="py-2 text-right text-white font-semibold">{day.total || 0}</td>
                    <td className="py-2 text-right text-slate-400">{day.eth || 0}</td>
                    <td className="py-2 text-right text-slate-400">{day.btc || 0}</td>
                    <td className="py-2 text-right text-slate-400">{day.xrp || 0}</td>
                    <td className="py-2 text-right text-slate-400">{day.sol || 0}</td>
                    <td className="py-2 text-right text-[#BFA181]">{formatAmount(Number(day.totalAuxm || 0), 'AUXM')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Deposits */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">📥 Recent Deposits ({recentDeposits.length})</h3>
        {recentDeposits.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No deposits detected yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs uppercase">
                  <th className="text-left py-2">Time</th>
                  <th className="text-left py-2">Chain</th>
                  <th className="text-left py-2">Coin</th>
                  <th className="text-right py-2">Amount</th>
                  <th className="text-right py-2">USD</th>
                  <th className="text-right py-2">AUXM</th>
                  <th className="text-left py-2">From</th>
                  <th className="text-left py-2">TX</th>
                </tr>
              </thead>
              <tbody>
                {recentDeposits.slice(0, 20).map((d: any, i: number) => (
                  <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="py-2 text-slate-400 text-xs">
                      {d.processedAt ? new Date(d.processedAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-700">
                        {d.chain}
                      </span>
                    </td>
                    <td className="py-2 text-white font-semibold">{d.coin}</td>
                    <td className="py-2 text-right text-slate-300">{formatAmount(Number(d.amount), d.coin || 'ETH')}</td>
                    <td className="py-2 text-right text-slate-300">${Number(d.amountUsd || 0).toFixed(2)}</td>
                    <td className="py-2 text-right text-[#BFA181] font-semibold">
                      {formatAmount(Number(d.auxmCredited || 0), 'AUXM')}
                      {d.bonusCredited > 0 && (
                        <span className="text-emerald-400 text-xs ml-1">+{formatAmount(Number(d.bonusCredited), 'AUXM')}</span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-slate-500 font-mono truncate max-w-[100px]">
                      {d.fromAddress?.slice(0, 8)}...
                    </td>
                    <td className="py-2 text-xs text-slate-500 font-mono truncate max-w-[100px]">
                      {d.txHash?.slice(0, 10)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Orphan Deposits */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">⚠️ Orphan Deposits ({orphanDeposits.length})</h3>
        <p className="text-xs text-slate-500 mb-4">
          Kullanıcı ile eşleşemeyen deposit&apos;ler. Manuel olarak kullanıcıya atayabilirsiniz.
        </p>
        {orphanDeposits.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No orphan deposits</p>
        ) : (
          <div className="space-y-3">
            {orphanDeposits.map((d: any, i: number) => (
              <div key={i} className="bg-slate-900/50 border border-amber-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-700">
                      {d.chain}
                    </span>
                    <span className="text-white font-semibold">{d.coin}</span>
                    <span className="text-slate-300">{formatAmount(Number(d.amount), d.coin || 'ETH')}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {d.receivedAt ? new Date(d.receivedAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 font-mono mb-2">
                  From: {d.fromAddress} | TX: {d.txHash?.slice(0, 20)}...
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="User address (0x...)"
                    value={reconcileAddress}
                    onChange={(e) => setReconcileAddress(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg py-1.5 px-3 text-sm text-white"
                  />
                  <button
                    onClick={() => reconcileOrphan(d.txHash)}
                    className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-semibold hover:bg-amber-500/30 transition-colors"
                  >
                    Reconcile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEASING ENGINE TAB
// ═══════════════════════════════════════════════════════════════════════════════
function LeasingEngineTab() {
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch(`/api/admin/leasing?section=${activeSection === 'overview' ? '' : activeSection}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setData(json);
    } catch (e) {
      console.error('Leasing data fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const doAction = async (section: string, action: string, extra: any = {}) => {
    try {
      setActionMsg('Processing...');
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch('/api/admin/leasing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ section, action, ...extra }),
      });
      const json = await res.json();
      setActionMsg(json.success ? '✅ Done' : `❌ ${json.error || 'Failed'}`);
      fetchData();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (e) {
      setActionMsg('❌ Error');
    }
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'counterparties', label: 'Counterparties', icon: '🏦' },
    { id: 'yield', label: 'Yield Engine', icon: '📈' },
    { id: 'risk', label: 'Risk & Buffer', icon: '🛡️' },
    { id: 'rfq', label: 'RFQ', icon: '📋' },
    { id: 'encumbrance', label: 'Encumbrance', icon: '🔒' },
    { id: 'config', label: 'Config', icon: '⚙️' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">🏦 Leasing Engine</h2>
        {actionMsg && <span className="text-sm px-3 py-1 rounded bg-slate-800 text-slate-300">{actionMsg}</span>}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 flex-wrap">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeSection === s.id ? 'bg-[#d4a574] text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {/* OVERVIEW */}
          {activeSection === 'overview' && data?.overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500">Counterparties</div>
                <div className="text-2xl font-bold text-white">{data.overview.counterparties?.active || 0}</div>
                <div className="text-xs text-slate-500">of {data.overview.counterparties?.total || 0} total</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500">Total Exposure</div>
                <div className="text-2xl font-bold text-[#d4a574]">${(data.overview.risk?.totalExposure || 0).toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500">Active Alerts</div>
                <div className="text-2xl font-bold text-red-400">{data.overview.risk?.activeAlerts || 0}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500">Buffer Pool</div>
                <div className="text-2xl font-bold text-green-400">${(data.overview.bufferPool?.totalAccrued || 0).toLocaleString()}</div>
                <div className="text-xs text-slate-500">target: ${(data.overview.bufferPool?.target || 0).toLocaleString()}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500">Yield Source</div>
                <div className="text-lg font-bold text-slate-300">{data.overview.yield?.source || 'N/A'}</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="text-xs text-slate-500">Active RFQs</div>
                <div className="text-2xl font-bold text-blue-400">{data.overview.rfq?.active || 0}</div>
              </div>
            </div>
          )}

          {/* COUNTERPARTIES */}
          {activeSection === 'counterparties' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Counterparty Registry</h3>
                <button onClick={() => doAction('counterparty', 'register', { data: { name: 'New Counterparty', shortName: 'NEW', tier: 'otc_dealer', active: true, metals: ['AUXG','AUXS','AUXPT','AUXPD'], minLotSizeOz: 10, maxExposureUSD: 10000000, collateralTypes: ['metal_for_metal'], haircut: 5, creditRating: 'A', contactEmail: '', notes: '' } })} className="px-3 py-1.5 rounded-lg bg-[#d4a574] text-white text-xs">+ Add Counterparty</button>
              </div>
              {data?.counterparties?.length > 0 ? data.counterparties.map((cp: any) => (
                <div key={cp.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">{cp.name} <span className="text-xs text-slate-500">({cp.shortName})</span></div>
                    <div className="text-xs text-slate-400">Tier: {cp.tier} | Score: {cp.riskScore}/100 | Metals: {cp.metals?.join(', ')}</div>
                    <div className="text-xs text-slate-500">Exposure: ${(cp.currentExposureUSD || 0).toLocaleString()} / ${(cp.maxExposureUSD || 0).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${cp.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{cp.active ? 'Active' : 'Inactive'}</span>
                    {cp.active && <button onClick={() => doAction('counterparty', 'deactivate', { cpId: cp.id })} className="text-xs text-red-400 hover:text-red-300">Deactivate</button>}
                  </div>
                </div>
              )) : <div className="text-slate-500 text-center py-8">No counterparties registered</div>}
            </div>
          )}

          {/* YIELD ENGINE */}
          {activeSection === 'yield' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => doAction('yield', 'compute')} className="px-3 py-1.5 rounded-lg bg-[#d4a574] text-white text-xs">Compute All Yields</button>
                <button onClick={() => doAction('yield', 'reset_smoother')} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs">Reset Smoother</button>
              </div>

              {data?.yieldConfig && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-2">Yield Config</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-slate-500">Auxite Spread:</span> <span className="text-white">{data.yieldConfig.auxiteSpreadBps} bps</span></div>
                    <div><span className="text-slate-500">Risk Buffer:</span> <span className="text-white">{data.yieldConfig.riskBufferBps} bps</span></div>
                    <div><span className="text-slate-500">Range Width:</span> <span className="text-white">{data.yieldConfig.rangeWidthBps} bps</span></div>
                    <div><span className="text-slate-500">Min Quotes:</span> <span className="text-white">{data.yieldConfig.minQuotesForBlend}</span></div>
                    <div><span className="text-slate-500">Display Range:</span> <span className="text-white">{data.yieldConfig.displayAsRange ? 'Yes' : 'No'}</span></div>
                    <div><span className="text-slate-500">Fallback:</span> <span className="text-white">{data.yieldConfig.fallbackEnabled ? 'Enabled' : 'Disabled'}</span></div>
                  </div>
                </div>
              )}

              {data?.snapshot && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-2">Current Yield Snapshot <span className="text-xs text-slate-500">({data.snapshot.source})</span></h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="text-slate-500"><th className="text-left p-1">Metal</th><th className="p-1">3M</th><th className="p-1">6M</th><th className="p-1">12M</th></tr></thead>
                      <tbody>
                        {Object.entries(data.snapshot.metals || {}).map(([metal, tenors]: [string, any]) => (
                          <tr key={metal} className="border-t border-slate-700">
                            <td className="p-1 text-white font-medium">{metal}</td>
                            {['3M', '6M', '12M'].map(t => {
                              const y = tenors?.[t];
                              return <td key={t} className="p-1 text-center text-[#d4a574]">{y ? `${y.displayRateLow}% - ${y.displayRateHigh}%` : '-'}</td>;
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RISK & BUFFER */}
          {activeSection === 'risk' && data?.dashboard && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-xs text-slate-500">Platform Exposure</div>
                  <div className="text-xl font-bold text-white">${(data.dashboard.totalPlatformExposureUSD || 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-xs text-slate-500">Active CPs</div>
                  <div className="text-xl font-bold text-white">{data.dashboard.activeCounterparties}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-xs text-slate-500">Active Alerts</div>
                  <div className="text-xl font-bold text-red-400">{data.dashboard.activeAlerts?.length || 0}</div>
                </div>
              </div>

              {/* Alerts */}
              {data.dashboard.activeAlerts?.length > 0 && (
                <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/30 space-y-2">
                  <h4 className="text-sm font-semibold text-red-400">Active Alerts</h4>
                  {data.dashboard.activeAlerts.map((alert: any) => (
                    <div key={alert.id} className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2">
                      <div className="text-xs text-slate-300">{alert.message}</div>
                      <button onClick={() => doAction('risk', 'acknowledge_alert', { alertId: alert.id })} className="text-xs text-slate-500 hover:text-white">Dismiss</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Exposures */}
              {data.dashboard.topExposures?.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-2">Top Exposures</h4>
                  {data.dashboard.topExposures.map((exp: any) => (
                    <div key={exp.counterpartyId} className="flex items-center justify-between py-1.5 border-b border-slate-700 last:border-0 text-xs">
                      <span className="text-white">{exp.counterpartyName}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400">{exp.utilizationPercent}%</span>
                        <span className={`px-1.5 py-0.5 rounded ${exp.alertLevel === 'normal' ? 'bg-green-500/20 text-green-400' : exp.alertLevel === 'warning' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>{exp.alertLevel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Buffer Pool */}
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">Buffer Pool</h4>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div><span className="text-slate-500">Accrued:</span> <span className="text-green-400">${(data.dashboard.bufferPool?.totalAccruedUSD || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-500">Target:</span> <span className="text-white">${(data.dashboard.bufferPool?.targetUSD || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-500">Utilization:</span> <span className="text-white">{data.dashboard.bufferPool?.utilizationPercent || 0}%</span></div>
                </div>
              </div>
            </div>
          )}

          {/* RFQ */}
          {activeSection === 'rfq' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => doAction('rfq', 'expire_stale')} className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs">Expire Stale RFQs</button>
              </div>
              {data?.summary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-500">Active RFQs</div>
                    <div className="text-xl font-bold text-blue-400">{data.summary.active}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-500">Awarded</div>
                    <div className="text-xl font-bold text-green-400">{data.summary.awarded}</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="text-xs text-slate-500">Avg Response Rate</div>
                    <div className="text-xl font-bold text-white">{data.summary.avgResponseRate}%</div>
                  </div>
                </div>
              )}
              {data?.rfqs?.length > 0 ? data.rfqs.map((rfq: any) => (
                <div key={rfq.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-white font-medium">{rfq.metal}/{rfq.tenor}</span>
                      <span className="text-xs text-slate-500 ml-2">{rfq.targetSizeOz} oz</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${rfq.status === 'open' ? 'bg-blue-500/20 text-blue-400' : rfq.status === 'awarded' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/20 text-slate-400'}`}>{rfq.status}</span>
                  </div>
                </div>
              )) : <div className="text-slate-500 text-center py-8">No RFQs created yet</div>}
            </div>
          )}

          {/* ENCUMBRANCE */}
          {activeSection === 'encumbrance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Platform Metal State</h3>
              {data?.platform && Object.entries(data.platform).map(([metal, state]: [string, any]) => (
                <div key={metal} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <div className="text-white font-medium mb-2">{metal}</div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-slate-500">Allocated:</span> <span className="text-white">{state.totalAllocatedOz} oz</span></div>
                    <div><span className="text-slate-500">Encumbered:</span> <span className="text-[#d4a574]">{state.totalEncumberedOz} oz</span></div>
                    <div><span className="text-slate-500">Pending:</span> <span className="text-yellow-400">{state.totalPendingOz} oz</span></div>
                    <div><span className="text-slate-500">Utilization:</span> <span className="text-white">{state.utilizationPercent}%</span></div>
                  </div>
                </div>
              ))}
              {data?.recentLog?.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-2">Recent Ledger Activity</h4>
                  {data.recentLog.map((log: any, i: number) => (
                    <div key={i} className="text-xs text-slate-400 py-1 border-b border-slate-700 last:border-0">
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span> — {log.note}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CONFIG */}
          {activeSection === 'config' && data?.configs && (
            <div className="space-y-4">
              {Object.entries(data.configs).map(([section, config]: [string, any]) => (
                <div key={section} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <h4 className="text-sm font-semibold text-white mb-2 capitalize">{section} Config</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {Object.entries(config).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <span className="text-slate-500">{key}:</span>{' '}
                        <span className="text-white">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUXM TREASURY DASHBOARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function AuxmTreasuryTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'float' | 'settlement' | 'exposure' | 'yield' | 'log'>('overview');
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);

  const fetchTreasury = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch('/api/admin/treasury', {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success) setData(result);
    } catch (e) {
      console.error('Treasury fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreasury();
    const interval = setInterval(fetchTreasury, 15000);
    return () => clearInterval(interval);
  }, [fetchTreasury]);

  const addLogEntry = async () => {
    if (!logNote.trim()) return;
    setLogSaving(true);
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      await fetch('/api/admin/treasury', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'addLog', type: 'note', message: logNote }),
      });
      setLogNote('');
      fetchTreasury();
    } catch (e) {
      console.error('Log save error:', e);
    } finally {
      setLogSaving(false);
    }
  };

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
    return `$${n.toFixed(2)}`;
  };

  const fmtGrams = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(2)} kg` : `${n.toFixed(2)} g`;

  if (loading) return <div className="text-center py-12 text-slate-400">Loading AUXM Treasury...</div>;
  if (!data) return <div className="text-center py-12 text-red-400">Failed to load treasury data</div>;

  const { summary, clientFloat, operatingCapital, yieldPrograms, settlement, metalExposure, recentLog } = data;

  const sections = [
    { id: 'overview', label: 'Overview', icon: '🏛️' },
    { id: 'float', label: 'AUXM Float', icon: '💰' },
    { id: 'settlement', label: 'Settlement', icon: '🔄' },
    { id: 'exposure', label: 'Exposure', icon: '📊' },
    { id: 'yield', label: 'Yield Programs', icon: '📈' },
    { id: 'log', label: 'Treasury Log', icon: '📋' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">AUXM Treasury Dashboard</h2>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            (summary?.liquidityCoverageRatio || 0) >= 10 ? 'bg-green-500/20 text-green-400' :
            (summary?.liquidityCoverageRatio || 0) >= 5 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            LCR: {summary?.liquidityCoverageRatio?.toFixed(1) || 0}%
          </span>
          <button onClick={fetchTreasury} className="px-3 py-1 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
            Refresh
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeSection === s.id
                ? 'bg-[#D4B47A] text-black'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* OVERVIEW */}
      {/* ══════════════════════════════════════════════════ */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-[#D4B47A]/20 to-[#BFA181]/10 rounded-xl p-4 border border-[#D4B47A]/30">
              <p className="text-[10px] text-[#D4B47A] mb-1 uppercase tracking-wider">Total AUXM Float</p>
              <p className="text-xl font-bold text-white">{fmt(summary?.totalAuxmFloat || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Available</p>
              <p className="text-xl font-bold text-green-400">{fmt(summary?.available || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Reserved (Yield)</p>
              <p className="text-xl font-bold text-[#D4B47A]">{fmt(summary?.reserved || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Pending Settlement</p>
              <p className="text-xl font-bold text-yellow-400">{fmt(summary?.pendingSettlement || 0)}</p>
            </div>
            <div className={`rounded-xl p-4 border ${
              (summary?.liquidityCoverageRatio || 0) >= 10
                ? 'bg-green-500/10 border-green-500/30'
                : (summary?.liquidityCoverageRatio || 0) >= 5
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-red-500/10 border-red-500/30'
            }`}>
              <p className="text-[10px] text-slate-400 mb-1 uppercase tracking-wider">Liquidity Coverage</p>
              <p className="text-xl font-bold text-white">{summary?.liquidityCoverageRatio?.toFixed(1) || 0}%</p>
            </div>
          </div>

          {/* Client Float vs Operating Capital */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-bold text-[#D4B47A] mb-3">Client Float</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Total Client Deposits</span>
                <span className="text-sm font-semibold text-white">{fmt(clientFloat?.total || 0)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Active Clients</span>
                <span className="text-sm font-semibold text-white">{clientFloat?.clientCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Avg per Client</span>
                <span className="text-sm font-semibold text-white">
                  {clientFloat?.clientCount > 0 ? fmt((clientFloat?.total || 0) / clientFloat.clientCount) : '$0'}
                </span>
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-bold text-[#2F6F62] mb-3">Operating Capital</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Total Operating</span>
                <span className="text-sm font-semibold text-white">{fmt(operatingCapital?.totalOperatingUsd || 0)}</span>
              </div>
              {operatingCapital?.breakdown && Object.entries(operatingCapital.breakdown).map(([token, info]: [string, any]) => (
                <div key={token} className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">{token}</span>
                  <span className="text-xs text-slate-300">
                    {info.pending?.toFixed(2)} ({fmt(info.valueUsd || 0)})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Quick View */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Settlement Overview (24h)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Buys</p>
                <p className="text-lg font-bold text-green-400">{settlement?.buys24h || 0}</p>
                <p className="text-[10px] text-slate-500">{fmt(settlement?.buyVolume24h || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Sells</p>
                <p className="text-lg font-bold text-red-400">{settlement?.sells24h || 0}</p>
                <p className="text-[10px] text-slate-500">{fmt(settlement?.sellVolume24h || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Net Position</p>
                <p className={`text-lg font-bold ${(settlement?.netSettlement24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(settlement?.netSettlement24h || 0) >= 0 ? '+' : ''}{fmt(settlement?.netSettlement24h || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Netting Ratio</p>
                <p className="text-lg font-bold text-blue-400">{(settlement?.nettingRatio || 0).toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500">Internal match</p>
              </div>
            </div>
          </div>

          {/* Metal Exposure Quick View */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Metal Exposure</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {metalExposure && Object.entries(metalExposure).map(([metal, exp]: [string, any]) => {
                const metalColors: Record<string, string> = {
                  AUXG: 'text-[#C6A15B]',
                  AUXS: 'text-[#A6B0BF]',
                  AUXPT: 'text-[#8FA3B8]',
                  AUXPD: 'text-[#6E7C8A]',
                };
                return (
                  <div key={metal} className="text-center">
                    <p className={`text-sm font-bold ${metalColors[metal] || 'text-white'}`}>{metal}</p>
                    <p className="text-xs text-slate-400 mt-1">Allocated: {fmtGrams(exp.totalAllocated)}</p>
                    <p className="text-xs text-slate-400">Staked: {fmtGrams(exp.totalStaked)}</p>
                    <p className="text-xs text-white font-medium">Net: {fmt(exp.netExposureUsd)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* AUXM FLOAT DETAIL */}
      {/* ══════════════════════════════════════════════════ */}
      {activeSection === 'float' && (
        <div className="space-y-6">
          {/* Float Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-[#D4B47A]/20 to-[#BFA181]/10 rounded-xl p-5 border border-[#D4B47A]/30">
              <p className="text-xs text-[#D4B47A] mb-1">Total Client Float</p>
              <p className="text-2xl font-bold text-white">{fmt(clientFloat?.total || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">{clientFloat?.clientCount || 0} clients</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <p className="text-xs text-[#2F6F62] mb-1">Operating Capital</p>
              <p className="text-2xl font-bold text-white">{fmt(operatingCapital?.totalOperatingUsd || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Platform fees reserve</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Combined Float</p>
              <p className="text-2xl font-bold text-white">{fmt(summary?.totalAuxmFloat || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">Client + Operating</p>
            </div>
          </div>

          {/* Top Holders */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Top 10 AUXM Holders</h3>
            <div className="space-y-2">
              {clientFloat?.topHolders?.map((holder: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-6">#{i + 1}</span>
                    <span className="text-xs text-slate-300 font-mono">
                      {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white">{fmt(holder.balance)}</span>
                </div>
              ))}
              {(!clientFloat?.topHolders || clientFloat.topHolders.length === 0) && (
                <p className="text-xs text-slate-500 text-center py-4">No holders found</p>
              )}
            </div>
          </div>

          {/* Operating Capital Breakdown */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-[#2F6F62] mb-3">Operating Capital Breakdown</h3>
            {operatingCapital?.breakdown && Object.entries(operatingCapital.breakdown).map(([token, info]: [string, any]) => (
              <div key={token} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-sm text-white font-medium">{token}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{fmt(info.valueUsd || 0)}</p>
                  <p className="text-[10px] text-slate-500">
                    Total: {info.amount?.toFixed(4)} | Pending: {info.pending?.toFixed(4)} | Transferred: {info.transferred?.toFixed(4)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* SETTLEMENT & NETTING */}
      {/* ══════════════════════════════════════════════════ */}
      {activeSection === 'settlement' && (
        <div className="space-y-6">
          {/* Net Settlement Position */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Total Trades</p>
              <p className="text-2xl font-bold text-white">{settlement?.totalTrades || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Total Volume</p>
              <p className="text-2xl font-bold text-white">{fmt(settlement?.totalVolume || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Netting Ratio</p>
              <p className="text-2xl font-bold text-blue-400">{(settlement?.nettingRatio || 0).toFixed(1)}%</p>
              <p className="text-[10px] text-slate-500">Higher = better</p>
            </div>
            <div className={`rounded-xl p-4 border ${
              (settlement?.netSettlement24h || 0) >= 0
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Net Position (24h)</p>
              <p className={`text-2xl font-bold ${(settlement?.netSettlement24h || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(settlement?.netSettlement24h || 0) >= 0 ? '+' : ''}{fmt(settlement?.netSettlement24h || 0)}
              </p>
            </div>
          </div>

          {/* Buy vs Sell Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-bold text-green-400 mb-3">Buy Side (24h)</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Trade Count</span>
                <span className="text-lg font-bold text-green-400">{settlement?.buys24h || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Volume</span>
                <span className="text-lg font-bold text-green-400">{fmt(settlement?.buyVolume24h || 0)}</span>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-bold text-red-400 mb-3">Sell Side (24h)</h3>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Trade Count</span>
                <span className="text-lg font-bold text-red-400">{settlement?.sells24h || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Volume</span>
                <span className="text-lg font-bold text-red-400">{fmt(settlement?.sellVolume24h || 0)}</span>
              </div>
            </div>
          </div>

          {/* 7d Activity */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">7 Day Activity</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Buys (7d)</p>
                <p className="text-xl font-bold text-green-400">{settlement?.buys7d || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Sells (7d)</p>
                <p className="text-xl font-bold text-red-400">{settlement?.sells7d || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* METAL EXPOSURE */}
      {/* ══════════════════════════════════════════════════ */}
      {activeSection === 'exposure' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Per-Metal Net Exposure</h3>
          {metalExposure && Object.entries(metalExposure).map(([metal, exp]: [string, any]) => {
            const metalColors: Record<string, string> = {
              AUXG: '#C6A15B',
              AUXS: '#A6B0BF',
              AUXPT: '#8FA3B8',
              AUXPD: '#6E7C8A',
            };
            const color = metalColors[metal] || '#fff';
            const hedgedPct = exp.hedgedPercent || 0;

            return (
              <div key={metal} className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold" style={{ color }}>{metal}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    hedgedPct >= 80 ? 'bg-green-500/20 text-green-400' :
                    hedgedPct >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {hedgedPct.toFixed(1)}% Hedged
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-[10px] text-slate-500">Allocated</p>
                    <p className="text-sm font-semibold text-white">{fmtGrams(exp.totalAllocated)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Staked</p>
                    <p className="text-sm font-semibold" style={{ color }}>{fmtGrams(exp.totalStaked)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Net Exposure</p>
                    <p className="text-sm font-semibold text-white">{fmtGrams(exp.netExposure)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">USD Value</p>
                    <p className="text-sm font-semibold text-white">{fmt(exp.netExposureUsd)}</p>
                  </div>
                </div>

                {/* Hedged bar */}
                <div className="mt-3">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(hedgedPct, 100)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* YIELD PROGRAMS */}
      {/* ══════════════════════════════════════════════════ */}
      {activeSection === 'yield' && (
        <div className="space-y-6">
          {/* Yield Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#D4B47A]/20 to-[#BFA181]/10 rounded-xl p-4 border border-[#D4B47A]/30">
              <p className="text-[10px] text-[#D4B47A] mb-1 uppercase">Total Staked Value</p>
              <p className="text-xl font-bold text-white">{fmt(yieldPrograms?.totalStakedValueUsd || 0)}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Active Stakes</p>
              <p className="text-xl font-bold text-white">{yieldPrograms?.activeStakeCount || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Unique Stakers</p>
              <p className="text-xl font-bold text-white">{yieldPrograms?.totalStakers || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <p className="text-[10px] text-slate-400 mb-1 uppercase">Avg per Staker</p>
              <p className="text-xl font-bold text-white">
                {yieldPrograms?.totalStakers > 0 ? fmt((yieldPrograms?.totalStakedValueUsd || 0) / yieldPrograms.totalStakers) : '$0'}
              </p>
            </div>
          </div>

          {/* By Metal */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-[#D4B47A] mb-3">Staked by Metal</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {yieldPrograms?.stakedByMetal && Object.entries(yieldPrograms.stakedByMetal).map(([metal, info]: [string, any]) => {
                const metalColors: Record<string, string> = {
                  AUXG: 'text-[#C6A15B]',
                  AUXS: 'text-[#A6B0BF]',
                  AUXPT: 'text-[#8FA3B8]',
                  AUXPD: 'text-[#6E7C8A]',
                };
                return (
                  <div key={metal} className="text-center">
                    <p className={`text-sm font-bold ${metalColors[metal] || 'text-white'}`}>{metal}</p>
                    <p className="text-xs text-white mt-1">{fmtGrams(info.grams)}</p>
                    <p className="text-[10px] text-slate-400">{fmt(info.valueUsd)}</p>
                    <p className="text-[10px] text-slate-500">{info.count} stakes</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* By Term */}
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Distribution by Term</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">3 Month</p>
                <p className="text-xl font-bold text-green-400">{yieldPrograms?.stakedByTerm?.['3m'] || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">6 Month</p>
                <p className="text-xl font-bold text-blue-400">{yieldPrograms?.stakedByTerm?.['6m'] || 0}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">12 Month</p>
                <p className="text-xl font-bold text-purple-400">{yieldPrograms?.stakedByTerm?.['12m'] || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TREASURY LOG */}
      {/* ══════════════════════════════════════════════════ */}
      {activeSection === 'log' && (
        <div className="space-y-4">
          {/* Add Log Entry */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Add Treasury Note</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value)}
                placeholder="Treasury operation note..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm"
                onKeyDown={(e) => e.key === 'Enter' && addLogEntry()}
              />
              <button
                onClick={addLogEntry}
                disabled={logSaving || !logNote.trim()}
                className="px-4 py-2 bg-[#D4B47A] text-black font-semibold rounded-lg text-sm hover:bg-[#C6A15B] disabled:opacity-50"
              >
                {logSaving ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Log Entries */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Recent Treasury Activity</h3>
            <div className="space-y-2">
              {recentLog?.map((log: any, i: number) => (
                <div key={log.id || i} className="flex items-start gap-3 py-2 border-b border-slate-700/50 last:border-0">
                  <span className="text-xs text-slate-500 whitespace-nowrap mt-0.5">
                    {new Date(log.timestamp || log.date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-xs text-white">{log.message || log.note || JSON.stringify(log)}</span>
                  {log.amount > 0 && (
                    <span className="text-xs text-[#D4B47A] whitespace-nowrap ml-auto">
                      {log.amount} {log.token}
                    </span>
                  )}
                </div>
              ))}
              {(!recentLog || recentLog.length === 0) && (
                <p className="text-xs text-slate-500 text-center py-4">No treasury log entries yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PushNotificationsTab() {
  const [mode, setMode] = useState<"single" | "broadcast">("single");
  const [walletAddress, setWalletAddress] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notifType, setNotifType] = useState("system");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState<number>(0);

  // Fetch notification log
  const fetchLogs = useCallback(async () => {
    try {
      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch("/api/admin/push-log", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setRegisteredUsers(data.registeredUsers || 0);
      }
    } catch (e) {
      console.error("Push log fetch error:", e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    if (mode === "single" && !walletAddress.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const payload: any = {
        title,
        body,
        type: notifType,
        data: { category: notifType },
      };

      if (mode === "single") {
        payload.walletAddress = walletAddress.trim();
      } else {
        // For broadcast, we send to all registered users
        payload.broadcast = true;
      }

      const token = sessionStorage.getItem("auxite_admin_token");
      const res = await fetch("/api/admin/push-send", {
        method: "POST",
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setResult(data);

      if (data.success) {
        setTitle("");
        setBody("");
        setWalletAddress("");
        fetchLogs();
      }
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setSending(false);
    }
  };

  const notifTypes = [
    { value: "system", label: "Sistem", icon: "⚙️" },
    { value: "security", label: "Güvenlik", icon: "🛡️" },
    { value: "trade", label: "İşlem", icon: "💱" },
    { value: "deposit", label: "Yatırma", icon: "📥" },
    { value: "withdrawal", label: "Çekim", icon: "📤" },
    { value: "price_alert", label: "Fiyat Uyarısı", icon: "📊" },
    { value: "statement", label: "Rapor", icon: "📑" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🔔 Push Bildirim Yönetimi</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            📱 {registeredUsers} kayıtlı cihaz
          </span>
          <button
            onClick={fetchLogs}
            className="px-3 py-1 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700"
          >
            Yenile
          </button>
        </div>
      </div>

      {/* Send Notification Form */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Bildirim Gönder</h3>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("single")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "single"
                ? "bg-[#BFA181]/20 text-[#BFA181] border border-[#BFA181]/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            👤 Tek Kullanıcı
          </button>
          <button
            onClick={() => setMode("broadcast")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === "broadcast"
                ? "bg-[#BFA181]/20 text-[#BFA181] border border-[#BFA181]/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            📢 Tüm Kullanıcılar
          </button>
        </div>

        {/* Wallet Address (single mode) */}
        {mode === "single" && (
          <div className="mb-4">
            <label className="block text-xs text-slate-400 mb-1">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#BFA181]/50"
            />
          </div>
        )}

        {mode === "broadcast" && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400">
              ⚠️ Bu bildirim tüm kayıtlı {registeredUsers} cihaza gönderilecek.
            </p>
          </div>
        )}

        {/* Notification Type */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Bildirim Tipi</label>
          <div className="flex flex-wrap gap-2">
            {notifTypes.map((t) => (
              <button
                key={t.value}
                onClick={() => setNotifType(t.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  notifType === t.value
                    ? "bg-[#2F6F62]/20 text-[#2F6F62] border border-[#2F6F62]/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">Başlık</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bildirim başlığı..."
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#BFA181]/50"
          />
        </div>

        {/* Body */}
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-1">İçerik</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Bildirim içeriği..."
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#BFA181]/50 resize-none"
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !body.trim() || (mode === "single" && !walletAddress.trim())}
          className="px-6 py-2.5 bg-[#BFA181] text-[#0D1421] rounded-lg font-semibold text-sm hover:bg-[#BFA181]/80 disabled:opacity-50 transition-colors"
        >
          {sending ? "Gönderiliyor..." : mode === "broadcast" ? "📢 Herkese Gönder" : "📤 Gönder"}
        </button>

        {/* Result */}
        {result && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            result.success
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {result.success ? (
              <p>
                ✅ Gönderildi — Web: {result.web?.sent || 0}, Mobil: {result.mobile?.sent || 0}
                {(result.web?.failed > 0 || result.mobile?.failed > 0) && (
                  <span className="text-yellow-400 ml-2">
                    (Başarısız: Web {result.web?.failed || 0}, Mobil {result.mobile?.failed || 0})
                  </span>
                )}
              </p>
            ) : (
              <p>❌ Hata: {result.error || "Gönderim başarısız"}</p>
            )}
          </div>
        )}
      </div>

      {/* Notification Log */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="font-semibold mb-4">📋 Gönderim Geçmişi</h3>

        {logsLoading ? (
          <p className="text-slate-400 text-center py-8">Yükleniyor...</p>
        ) : logs.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Henüz bildirim gönderilmemiş</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logs.map((log, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
              >
                <div className="text-lg">
                  {log.type === "security" ? "🛡️" :
                   log.type === "trade" ? "💱" :
                   log.type === "deposit" ? "📥" :
                   log.type === "withdrawal" ? "📤" :
                   log.type === "price_alert" ? "📊" :
                   log.type === "statement" ? "📑" : "⚙️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{log.title}</p>
                  <p className="text-xs text-slate-400 truncate">{log.body}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString("tr-TR")}
                    </span>
                    <span className="text-xs text-blue-400">
                      Web: {log.webSent || 0}
                    </span>
                    <span className="text-xs text-green-400">
                      Mobil: {log.mobileSent || 0}
                    </span>
                    <span className="text-xs text-slate-500">
                      → {log.recipients || 0} alıcı
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORACLE WATCHER TAB
// ═══════════════════════════════════════════════════════════════════════════════

const WATCHER_URL = process.env.NEXT_PUBLIC_ORACLE_WATCHER_URL || "";
const PROXY_BASE = "/api/admin/watcher-proxy";

function watcherProxy(path: string, method: "GET" | "POST" | "DELETE" = "GET", body?: any) {
  const url = `${PROXY_BASE}?path=${encodeURIComponent(path)}`;
  const token = sessionStorage.getItem("auxite_admin_token");
  const opts: RequestInit = { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts);
}

function NotificationHistoryTab() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/push-log", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionStorage.getItem("auxite_admin_token")}`,
          "x-admin-address": "0x101bD08219773E0ff8cD3805542c0A2835Fec0FF",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to fetch logs", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const typeIcons: Record<string, string> = {
    system: "⚙️", security: "🛡️", transaction: "💱",
    deposit: "📥", withdrawal: "📤", price_alert: "📊",
    report: "📑", welcome: "🎉",
  };

  const typeColors: Record<string, string> = {
    system: "bg-blue-500/20 text-blue-400",
    security: "bg-red-500/20 text-red-400",
    transaction: "bg-green-500/20 text-green-400",
    deposit: "bg-emerald-500/20 text-emerald-400",
    withdrawal: "bg-orange-500/20 text-orange-400",
    price_alert: "bg-purple-500/20 text-purple-400",
    welcome: "bg-amber-500/20 text-amber-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">📋 Bildirim Geçmişi</h2>
        <button
          onClick={() => { setLoading(true); fetchLogs(); }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
        >
          🔄 Yenile
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Yükleniyor...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-400">Henüz bildirim gönderilmemiş.</div>
      ) : (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase">
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3">Tip</th>
                  <th className="px-4 py-3">Başlık</th>
                  <th className="px-4 py-3">İçerik</th>
                  <th className="px-4 py-3">Hedef</th>
                  <th className="px-4 py-3">Web</th>
                  <th className="px-4 py-3">Mobil</th>
                  <th className="px-4 py-3">Durum</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any, i: number) => {
                  const date = new Date(log.timestamp);
                  const typeKey = log.type || "system";
                  const totalSent = (log.webSent || 0) + (log.mobileSent || 0);
                  const totalFailed = (log.webFailed || 0) + (log.mobileFailed || 0);
                  return (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 text-sm">
                      <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                        {date.toLocaleDateString("tr-TR")} {date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${typeColors[typeKey] || "bg-slate-500/20 text-slate-400"}`}>
                          {typeIcons[typeKey] || "📌"} {typeKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{log.title}</td>
                      <td className="px-4 py-3 text-slate-400 max-w-[250px] truncate">{log.body}</td>
                      <td className="px-4 py-3">
                        {log.broadcast ? (
                          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">📢 Herkese</span>
                        ) : log.targetWallet ? (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">👤 {log.targetWallet.slice(0, 8)}...</span>
                        ) : (
                          <span className="text-xs text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-300">{log.webSent || 0}</span>
                        {(log.webFailed || 0) > 0 && <span className="text-xs text-red-400 ml-1">({log.webFailed}✗)</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-300">{log.mobileSent || 0}</span>
                        {(log.mobileFailed || 0) > 0 && <span className="text-xs text-red-400 ml-1">({log.mobileFailed}✗)</span>}
                      </td>
                      <td className="px-4 py-3">
                        {totalFailed === 0 && totalSent > 0 ? (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">✅ Başarılı</span>
                        ) : totalFailed > 0 ? (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">⚠️ {totalFailed} Başarısız</span>
                        ) : (
                          <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-1 rounded-full">0 Gönderim</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
            Son {logs.length} bildirim gösteriliyor (maks. 50)
          </div>
        </div>
      )}
    </div>
  );
}

function OracleWatcherTab() {
  const [status, setWatcherStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  // Override form
  const [overrideGold, setOverrideGold] = useState("");
  const [overrideSilver, setOverrideSilver] = useState("");
  const [overridePlatinum, setOverridePlatinum] = useState("");
  const [overridePalladium, setOverridePalladium] = useState("");
  const [overrideDuration, setOverrideDuration] = useState("60");

  const fetchWatcherStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, historyRes] = await Promise.all([
        watcherProxy("/status"),
        watcherProxy("/history?limit=20"),
      ]);
      if (statusRes.ok) setWatcherStatus(await statusRes.json());
      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data.history || []);
      }
    } catch (err: any) {
      setActionMsg(`Bağlantı hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatcherStatus();
    const interval = setInterval(fetchWatcherStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchWatcherStatus]);

  const toggleKillSwitch = async () => {
    if (!status) return;
    const newState = !status.killSwitch;
    try {
      const res = await watcherProxy("/admin/kill-switch", "POST", { active: newState });
      if (res.ok) {
        setActionMsg(`Kill switch ${newState ? "AKTİF" : "KAPALI"}`);
        fetchWatcherStatus();
      }
    } catch (err: any) {
      setActionMsg(`Hata: ${err.message}`);
    }
  };

  const forceUpdate = async () => {
    try {
      const res = await watcherProxy("/admin/force-update", "POST");
      if (res.ok) {
        setActionMsg("Force update tetiklendi");
        setTimeout(fetchWatcherStatus, 5000);
      }
    } catch (err: any) {
      setActionMsg(`Hata: ${err.message}`);
    }
  };

  const submitOverride = async () => {
    const prices = {
      gold: parseFloat(overrideGold),
      silver: parseFloat(overrideSilver),
      platinum: parseFloat(overridePlatinum),
      palladium: parseFloat(overridePalladium),
    };
    if (isNaN(prices.gold) || isNaN(prices.silver)) {
      setActionMsg("Fiyatları doğru girin ($/oz)");
      return;
    }
    try {
      const res = await watcherProxy("/admin/override", "POST", { prices, expiresInMinutes: parseInt(overrideDuration) || 60 });
      if (res.ok) {
        setActionMsg("Override ayarlandı");
        fetchWatcherStatus();
      }
    } catch (err: any) {
      setActionMsg(`Hata: ${err.message}`);
    }
  };

  const clearOverride = async () => {
    try {
      const res = await watcherProxy("/admin/override", "DELETE");
      if (res.ok) {
        setActionMsg("Override temizlendi");
        fetchWatcherStatus();
      }
    } catch (err: any) {
      setActionMsg(`Hata: ${err.message}`);
    }
  };

  const metalLabels: Record<string, string> = { gold: "Altın", silver: "Gümüş", platinum: "Platin", palladium: "Paladyum" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">👁️ Oracle Watcher</h2>
        <div className="flex items-center gap-3">
          {loading && <span className="text-xs text-slate-400 animate-pulse">Yenileniyor...</span>}
          <button onClick={fetchWatcherStatus} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm">
            🔄 Yenile
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-400">
          {actionMsg}
        </div>
      )}

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Durum</p>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                status.state === "running" ? "bg-green-500" :
                status.state === "paused" ? "bg-yellow-500" : "bg-red-500"
              }`} />
              <span className="font-semibold capitalize">{status.state}</span>
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Kill Switch</p>
            <button onClick={toggleKillSwitch}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                status.killSwitch
                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                  : "bg-green-500/20 text-green-400 border border-green-500/30"
              }`}>
              {status.killSwitch ? "🛑 AKTİF" : "✅ KAPALI"}
            </button>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Ardışık Hata</p>
            <span className={`text-lg font-bold ${status.consecutiveErrors > 0 ? "text-red-400" : "text-green-400"}`}>
              {status.consecutiveErrors}
            </span>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Son Cycle</p>
            <span className="text-lg font-bold">{status.lastCycleMs}ms</span>
          </div>
        </div>
      )}

      {/* Last Update Info */}
      {status?.lastUpdate && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">Son Oracle Güncelleme:</span>
              <span className="text-white">{new Date(status.lastUpdate.timestamp).toLocaleString("tr-TR")}</span>
              <span className="text-slate-400">ETH: <span className="text-white">${status.lastUpdate.ethPrice?.toFixed(2) || "—"}</span></span>
            </div>
            <a href={`https://basescan.org/tx/${status.lastUpdate.txHash}`} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-xs font-mono truncate max-w-[200px]">
              {status.lastUpdate.txHash?.slice(0, 10)}...
            </a>
          </div>
        </div>
      )}

      {/* Price Comparison Table */}
      {status?.prices?.current && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Fiyat Karşılaştırma</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2">Metal</th>
                  <th className="text-right py-2">Spot ($/oz)</th>
                  <th className="text-right py-2">On-Chain ($/oz)</th>
                  <th className="text-right py-2">Deviation</th>
                </tr>
              </thead>
              <tbody>
                {(["gold", "silver", "platinum", "palladium"] as const).map((metal) => {
                  const current = status.prices.current?.[metal] || 0;
                  const onChain = status.prices.onChain?.[metal] || 0;
                  const dev = status.prices.deviations?.[metal] || 0;
                  return (
                    <tr key={metal} className="border-b border-slate-800">
                      <td className="py-2 font-medium">{metalLabels[metal]}</td>
                      <td className="py-2 text-right">${current.toFixed(2)}</td>
                      <td className="py-2 text-right">${onChain.toFixed(2)}</td>
                      <td className={`py-2 text-right font-medium ${dev > 0.5 ? "text-yellow-400" : "text-green-400"}`}>
                        {dev.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={forceUpdate} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium">
              ⚡ Force Update
            </button>
            <p className="text-xs text-slate-500 self-center">
              Kaynak: {status.lastFetch?.source || "—"} · Son fetch: {status.lastFetch?.timestamp ? new Date(status.lastFetch.timestamp).toLocaleTimeString("tr-TR") : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Override Form */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Manuel Fiyat Override</h3>
        {status?.overrideActive && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
            <span className="text-sm text-yellow-400">⚠️ Override aktif</span>
            <button onClick={clearOverride} className="text-xs text-red-400 hover:text-red-300">Temizle</button>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Altın ($/oz)", value: overrideGold, set: setOverrideGold },
            { label: "Gümüş ($/oz)", value: overrideSilver, set: setOverrideSilver },
            { label: "Platin ($/oz)", value: overridePlatinum, set: setOverridePlatinum },
            { label: "Paladyum ($/oz)", value: overridePalladium, set: setOverridePalladium },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input type="number" step="0.01" value={value} onChange={(e) => set(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Süre (dk)</label>
            <input type="number" value={overrideDuration} onChange={(e) => setOverrideDuration(e.target.value)}
              className="w-20 bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white" />
          </div>
          <button onClick={submitOverride}
            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium">
            Override Uygula
          </button>
        </div>
      </div>

      {/* Price History */}
      {history.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Son Fiyat Geçmişi</h3>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 px-1">Zaman</th>
                  <th className="text-right py-2 px-1">Altın</th>
                  <th className="text-right py-2 px-1">Gümüş</th>
                  <th className="text-right py-2 px-1">Platin</th>
                  <th className="text-right py-2 px-1">Paladyum</th>
                  <th className="text-right py-2 px-1">Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {history.map((snap: any, i: number) => (
                  <tr key={i} className="border-b border-slate-800/50">
                    <td className="py-1.5 px-1 text-slate-400">
                      {new Date(snap.timestamp).toLocaleTimeString("tr-TR")}
                    </td>
                    <td className="py-1.5 px-1 text-right">${snap.fetched?.gold?.toFixed(2)}/oz</td>
                    <td className="py-1.5 px-1 text-right">${snap.fetched?.silver?.toFixed(2)}/oz</td>
                    <td className="py-1.5 px-1 text-right">${snap.fetched?.platinum?.toFixed(2)}/oz</td>
                    <td className="py-1.5 px-1 text-right">${snap.fetched?.palladium?.toFixed(2)}/oz</td>
                    <td className="py-1.5 px-1 text-right text-slate-400">{snap.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Connection Info */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>Watcher URL: {WATCHER_URL}</p>
        <p>Auto-refresh: 15s · Threshold: {status?.config?.deviationThresholdPct || "—"}% · Poll: {status?.config?.pollIntervalMs || "—"}ms</p>
      </div>
    </div>
  );
}
