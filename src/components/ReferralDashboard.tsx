"use client";

import { useState, useEffect } from "react";

interface ReferralStats {
  code: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  commissionRate: number;
}

interface ReferralUsage {
  id: string;
  code: string;
  referrerAddress: string;
  referredAddress: string;
  usedAt: number;
  status: "pending" | "qualified" | "rewarded";
  firstTradeAt?: number;
  firstTradeAmount?: number;
  rewardAmount?: number;
}

interface ReferralDashboardProps {
  walletAddress: string;
  lang?: "tr" | "en";
}

const TIER_COLORS = {
  bronze: { bg: "bg-amber-700/20", text: "text-amber-600", border: "border-amber-700/30" },
  silver: { bg: "bg-slate-400/20", text: "text-slate-300", border: "border-slate-400/30" },
  gold: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/30" },
  platinum: { bg: "bg-cyan-400/20", text: "text-cyan-300", border: "border-cyan-400/30" },
};

const TIER_ICONS = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

export function ReferralDashboard({ walletAddress, lang = "en" }: ReferralDashboardProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralUsage[]>([]);
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showApplyCode, setShowApplyCode] = useState(false);
  const [applyCode, setApplyCode] = useState("");
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  const t = {
    title: lang === "tr" ? "Referans Programı" : "Referral Program",
    yourCode: lang === "tr" ? "Referans Kodunuz" : "Your Referral Code",
    copyCode: lang === "tr" ? "Kodu Kopyala" : "Copy Code",
    copied: lang === "tr" ? "Kopyalandı!" : "Copied!",
    shareLink: lang === "tr" ? "Paylaşım Linki" : "Share Link",
    stats: lang === "tr" ? "İstatistikler" : "Statistics",
    totalReferrals: lang === "tr" ? "Toplam Referans" : "Total Referrals",
    qualified: lang === "tr" ? "Onaylanan" : "Qualified",
    pending: lang === "tr" ? "Bekleyen" : "Pending",
    earnings: lang === "tr" ? "Kazançlar" : "Earnings",
    totalEarnings: lang === "tr" ? "Toplam Kazanç" : "Total Earnings",
    pendingEarnings: lang === "tr" ? "Bekleyen Kazanç" : "Pending Earnings",
    withdraw: lang === "tr" ? "Çek" : "Withdraw",
    tier: lang === "tr" ? "Seviye" : "Tier",
    commission: lang === "tr" ? "Komisyon" : "Commission",
    referrals: lang === "tr" ? "Referanslarım" : "My Referrals",
    noReferrals: lang === "tr" ? "Henüz referans yok" : "No referrals yet",
    applyCode: lang === "tr" ? "Kod Uygula" : "Apply Code",
    enterCode: lang === "tr" ? "Referans kodu girin" : "Enter referral code",
    apply: lang === "tr" ? "Uygula" : "Apply",
    referredByLabel: lang === "tr" ? "Referans Kodunuz" : "Referred By",
    howItWorks: lang === "tr" ? "Nasıl Çalışır?" : "How It Works?",
    step1: lang === "tr" ? "Arkadaşlarınızla kodunuzu paylaşın" : "Share your code with friends",
    step2: lang === "tr" ? "Arkadaşınız $50+ işlem yaptığında" : "When your friend makes a $50+ trade",
    step3: lang === "tr" ? "İkiniz de $10 AUXM bonus kazanın!" : "You both earn $10 AUXM bonus!",
  };

  useEffect(() => {
    fetchReferralData();
  }, [walletAddress]);

  const fetchReferralData = async () => {
    try {
      const res = await fetch(`/api/referral?address=${walletAddress}`);
      const data = await res.json();
      setStats(data.stats);
      setReferrals(data.referrals || []);
      setReferredBy(data.referredBy);
    } catch (err) {
      console.error("Referral fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    if (stats?.code) {
      navigator.clipboard.writeText(stats.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyShareLink = () => {
    if (stats?.code) {
      const link = `${window.location.origin}?ref=${stats.code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWithdraw = async () => {
    if (!stats?.pendingEarnings || stats.pendingEarnings <= 0) return;

    setWithdrawing(true);
    try {
      const res = await fetch("/api/referral", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, action: "withdraw" }),
      });

      if (res.ok) {
        fetchReferralData();
      }
    } catch (err) {
      console.error("Withdraw error:", err);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) return;

    setApplyError(null);
    setApplySuccess(null);

    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, referralCode: applyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setApplyError(data.error);
        return;
      }

      setApplySuccess(data.message);
      setShowApplyCode(false);
      setApplyCode("");
      fetchReferralData();
    } catch (err: any) {
      setApplyError(err.message);
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-slate-700 rounded w-1/3"></div>
        <div className="h-32 bg-slate-800 rounded"></div>
        <div className="h-24 bg-slate-800 rounded"></div>
      </div>
    );
  }

  const tierColor = stats?.tier ? TIER_COLORS[stats.tier] : TIER_COLORS.bronze;
  const tierIcon = stats?.tier ? TIER_ICONS[stats.tier] : TIER_ICONS.bronze;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white">{t.title}</h2>
      </div>

      {/* Success/Error Messages */}
      {applySuccess && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          ✓ {applySuccess}
        </div>
      )}

      {/* Your Code Card */}
      <div className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl">
        <div className="text-center">
          <p className="text-sm text-purple-300 mb-2">{t.yourCode}</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl font-bold text-white tracking-wider">{stats?.code || "..."}</span>
            <button
              onClick={copyCode}
              className="p-2 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg transition-colors"
            >
              {copied ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <button
            onClick={copyShareLink}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t.shareLink}
          </button>
        </div>
      </div>

      {/* Tier & Commission */}
      <div className={`p-4 ${tierColor.bg} border ${tierColor.border} rounded-xl flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{tierIcon}</span>
          <div>
            <p className={`font-semibold capitalize ${tierColor.text}`}>
              {t.tier}: {stats?.tier || "Bronze"}
            </p>
            <p className="text-sm text-slate-400">
              {t.commission}: {((stats?.commissionRate || 0.1) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            {lang === "tr" ? "Sonraki seviye için" : "Next tier at"}
          </p>
          <p className={`text-sm ${tierColor.text}`}>
            {stats?.tier === "bronze" ? "10" : stats?.tier === "silver" ? "50" : stats?.tier === "gold" ? "100" : "MAX"} referral
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-white">{stats?.totalReferrals || 0}</p>
          <p className="text-xs text-slate-400">{t.totalReferrals}</p>
        </div>
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats?.qualifiedReferrals || 0}</p>
          <p className="text-xs text-slate-400">{t.qualified}</p>
        </div>
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-amber-400">{stats?.pendingReferrals || 0}</p>
          <p className="text-xs text-slate-400">{t.pending}</p>
        </div>
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-purple-400">${(stats?.totalEarnings || 0).toFixed(2)}</p>
          <p className="text-xs text-slate-400">{t.totalEarnings}</p>
        </div>
      </div>

      {/* Pending Earnings */}
      {(stats?.pendingEarnings || 0) > 0 && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{t.pendingEarnings}</p>
            <p className="text-2xl font-bold text-emerald-400">${stats?.pendingEarnings.toFixed(2)}</p>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {withdrawing ? "..." : t.withdraw}
          </button>
        </div>
      )}

      {/* Apply Referral Code (if not referred) */}
      {!referredBy && (
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
          {!showApplyCode ? (
            <button
              onClick={() => setShowApplyCode(true)}
              className="w-full py-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
            >
              {t.applyCode}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                placeholder={t.enterCode}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none uppercase"
                maxLength={8}
              />
              {applyError && (
                <p className="text-sm text-red-400">{applyError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleApplyCode}
                  className="flex-1 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                >
                  {t.apply}
                </button>
                <button
                  onClick={() => {
                    setShowApplyCode(false);
                    setApplyCode("");
                    setApplyError(null);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Referred By */}
      {referredBy && (
        <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <p className="text-sm text-purple-300">
            {t.referredByLabel}: <span className="font-mono">{referredBy}</span>
          </p>
        </div>
      )}

      {/* Referrals List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">{t.referrals}</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t.noReferrals}
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((ref) => (
              <div
                key={ref.id}
                className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    ref.status === "rewarded" ? "bg-emerald-500" :
                    ref.status === "qualified" ? "bg-amber-500" : "bg-slate-500"
                  }`} />
                  <div>
                    <p className="text-white font-mono text-sm">{formatAddress(ref.referredAddress)}</p>
                    <p className="text-xs text-slate-500">{formatDate(ref.usedAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    ref.status === "rewarded" ? "bg-emerald-500/20 text-emerald-400" :
                    ref.status === "qualified" ? "bg-amber-500/20 text-amber-400" : "bg-slate-500/20 text-slate-400"
                  }`}>
                    {ref.status === "rewarded" ? "✓ Rewarded" :
                     ref.status === "qualified" ? "Ready" : "Pending"}
                  </span>
                  {ref.rewardAmount && (
                    <p className="text-xs text-emerald-400 mt-1">+${ref.rewardAmount.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-3">{t.howItWorks}</h4>
        <div className="space-y-2 text-sm text-slate-400">
          <p>1️⃣ {t.step1}</p>
          <p>2️⃣ {t.step2}</p>
          <p>3️⃣ {t.step3}</p>
        </div>
      </div>
    </div>
  );
}
