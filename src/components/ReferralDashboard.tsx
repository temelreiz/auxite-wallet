"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

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
}

const TIER_COLORS = {
  bronze: { bg: "bg-[#BFA181]/20", text: "text-[#BFA181]", border: "border-[#BFA181]/30" },
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

const translations = {
  tr: {
    title: "Referans Programi",
    yourCode: "Referans Kodunuz",
    copyCode: "Kodu Kopyala",
    copied: "Kopyalandi!",
    shareLink: "Paylasim Linki",
    stats: "Istatistikler",
    totalReferrals: "Toplam Referans",
    qualified: "Onaylanan",
    pending: "Bekleyen",
    earnings: "Kazanclar",
    totalEarnings: "Toplam Kazanc",
    pendingEarnings: "Bekleyen Kazanc",
    withdraw: "Cek",
    tier: "Seviye",
    commission: "Komisyon",
    referrals: "Referanslarim",
    noReferrals: "Henuz referans yok",
    applyCode: "Kod Uygula",
    enterCode: "Referans kodu girin",
    apply: "Uygula",
    referredByLabel: "Referans Kodunuz",
    howItWorks: "Nasil Calisir?",
    step1: "Arkadaslarinizla kodunuzu paylasin",
    step2: "Arkadasiniz $50+ islem yaptiginda",
    step3: "Ikiniz de $10 AUXM bonus kazanin!",
    nextTierAt: "Sonraki seviye icin",
    referral: "referans",
    statusRewarded: "Odullendirildi",
    statusReady: "Hazir",
    statusPending: "Bekliyor",
  },
  en: {
    title: "Referral Program",
    yourCode: "Your Referral Code",
    copyCode: "Copy Code",
    copied: "Copied!",
    shareLink: "Share Link",
    stats: "Statistics",
    totalReferrals: "Total Referrals",
    qualified: "Qualified",
    pending: "Pending",
    earnings: "Earnings",
    totalEarnings: "Total Earnings",
    pendingEarnings: "Pending Earnings",
    withdraw: "Withdraw",
    tier: "Tier",
    commission: "Commission",
    referrals: "My Referrals",
    noReferrals: "No referrals yet",
    applyCode: "Apply Code",
    enterCode: "Enter referral code",
    apply: "Apply",
    referredByLabel: "Referred By",
    howItWorks: "How It Works?",
    step1: "Share your code with friends",
    step2: "When your friend makes a $50+ trade",
    step3: "You both earn $10 AUXM bonus!",
    nextTierAt: "Next tier at",
    referral: "referral",
    statusRewarded: "Rewarded",
    statusReady: "Ready",
    statusPending: "Pending",
  },
  de: {
    title: "Empfehlungsprogramm",
    yourCode: "Ihr Empfehlungscode",
    copyCode: "Code kopieren",
    copied: "Kopiert!",
    shareLink: "Link teilen",
    stats: "Statistiken",
    totalReferrals: "Gesamt Empfehlungen",
    qualified: "Qualifiziert",
    pending: "Ausstehend",
    earnings: "Einnahmen",
    totalEarnings: "Gesamteinnahmen",
    pendingEarnings: "Ausstehende Einnahmen",
    withdraw: "Abheben",
    tier: "Stufe",
    commission: "Provision",
    referrals: "Meine Empfehlungen",
    noReferrals: "Noch keine Empfehlungen",
    applyCode: "Code einlosen",
    enterCode: "Empfehlungscode eingeben",
    apply: "Anwenden",
    referredByLabel: "Empfohlen von",
    howItWorks: "Wie funktioniert es?",
    step1: "Teilen Sie Ihren Code mit Freunden",
    step2: "Wenn Ihr Freund einen $50+ Trade macht",
    step3: "Sie beide verdienen $10 AUXM Bonus!",
    nextTierAt: "Nachste Stufe bei",
    referral: "Empfehlung",
    statusRewarded: "Belohnt",
    statusReady: "Bereit",
    statusPending: "Ausstehend",
  },
  fr: {
    title: "Programme de Parrainage",
    yourCode: "Votre Code de Parrainage",
    copyCode: "Copier le code",
    copied: "Copie !",
    shareLink: "Partager le lien",
    stats: "Statistiques",
    totalReferrals: "Total des Parrainages",
    qualified: "Qualifie",
    pending: "En attente",
    earnings: "Gains",
    totalEarnings: "Gains Totaux",
    pendingEarnings: "Gains en attente",
    withdraw: "Retirer",
    tier: "Niveau",
    commission: "Commission",
    referrals: "Mes Parrainages",
    noReferrals: "Pas encore de parrainages",
    applyCode: "Appliquer le code",
    enterCode: "Entrez le code de parrainage",
    apply: "Appliquer",
    referredByLabel: "Parraine par",
    howItWorks: "Comment ca marche ?",
    step1: "Partagez votre code avec vos amis",
    step2: "Quand votre ami effectue un trade de $50+",
    step3: "Vous gagnez tous les deux $10 AUXM bonus !",
    nextTierAt: "Prochain niveau a",
    referral: "parrainage",
    statusRewarded: "Recompense",
    statusReady: "Pret",
    statusPending: "En attente",
  },
  ar: {
    title: "برنامج الاحالة",
    yourCode: "رمز الاحالة الخاص بك",
    copyCode: "نسخ الرمز",
    copied: "تم النسخ!",
    shareLink: "مشاركة الرابط",
    stats: "الاحصائيات",
    totalReferrals: "اجمالي الاحالات",
    qualified: "مؤهل",
    pending: "قيد الانتظار",
    earnings: "الارباح",
    totalEarnings: "اجمالي الارباح",
    pendingEarnings: "ارباح معلقة",
    withdraw: "سحب",
    tier: "المستوى",
    commission: "العمولة",
    referrals: "احالاتي",
    noReferrals: "لا توجد احالات بعد",
    applyCode: "تطبيق الرمز",
    enterCode: "ادخل رمز الاحالة",
    apply: "تطبيق",
    referredByLabel: "تمت الاحالة بواسطة",
    howItWorks: "كيف يعمل؟",
    step1: "شارك رمزك مع الاصدقاء",
    step2: "عندما يقوم صديقك بصفقة بقيمة $50+",
    step3: "كلاكما يكسب $10 AUXM مكافأة!",
    nextTierAt: "المستوى التالي عند",
    referral: "احالة",
    statusRewarded: "تمت المكافأة",
    statusReady: "جاهز",
    statusPending: "قيد الانتظار",
  },
  ru: {
    title: "Реферальная Программа",
    yourCode: "Ваш Реферальный Код",
    copyCode: "Копировать код",
    copied: "Скопировано!",
    shareLink: "Поделиться ссылкой",
    stats: "Статистика",
    totalReferrals: "Всего Рефералов",
    qualified: "Подтвержденные",
    pending: "Ожидающие",
    earnings: "Доходы",
    totalEarnings: "Общий Доход",
    pendingEarnings: "Ожидающий Доход",
    withdraw: "Вывести",
    tier: "Уровень",
    commission: "Комиссия",
    referrals: "Мои Рефералы",
    noReferrals: "Рефералов пока нет",
    applyCode: "Применить код",
    enterCode: "Введите реферальный код",
    apply: "Применить",
    referredByLabel: "Приглашен",
    howItWorks: "Как это работает?",
    step1: "Поделитесь кодом с друзьями",
    step2: "Когда ваш друг совершит сделку на $50+",
    step3: "Вы оба получите $10 AUXM бонус!",
    nextTierAt: "Следующий уровень при",
    referral: "реферал",
    statusRewarded: "Вознагражден",
    statusReady: "Готов",
    statusPending: "Ожидание",
  },
};

export function ReferralDashboard({ walletAddress }: ReferralDashboardProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

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

  const LOCALE_MAP: Record<string, string> = {
    tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", ar: "ar-SA", ru: "ru-RU",
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(LOCALE_MAP[lang] || "en-US", {
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
        <h2 className="text-xl font-bold text-white">{t("title")}</h2>
      </div>

      {/* Success/Error Messages */}
      {applySuccess && (
        <div className="p-3 bg-[#2F6F62]/20 border border-[#2F6F62]/30 rounded-lg text-[#2F6F62] text-sm">
          ✓ {applySuccess}
        </div>
      )}

      {/* Your Code Card */}
      <div className="p-5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl">
        <div className="text-center">
          <p className="text-sm text-purple-300 mb-2">{t("yourCode")}</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-3xl font-bold text-white tracking-wider">{stats?.code || "..."}</span>
            <button
              onClick={copyCode}
              className="p-2 bg-purple-500/30 hover:bg-purple-500/50 rounded-lg transition-colors"
            >
              {copied ? (
                <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            {t("shareLink")}
          </button>
        </div>
      </div>

      {/* Tier & Commission */}
      <div className={`p-4 ${tierColor.bg} border ${tierColor.border} rounded-xl flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{tierIcon}</span>
          <div>
            <p className={`font-semibold capitalize ${tierColor.text}`}>
              {t("tier")}: {stats?.tier || "Bronze"}
            </p>
            <p className="text-sm text-slate-400">
              {t("commission")}: {((stats?.commissionRate || 0.1) * 100).toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">
            {t("nextTierAt")}
          </p>
          <p className={`text-sm ${tierColor.text}`}>
            {stats?.tier === "bronze" ? "10" : stats?.tier === "silver" ? "50" : stats?.tier === "gold" ? "100" : "MAX"} {t("referral")}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-white">{stats?.totalReferrals || 0}</p>
          <p className="text-xs text-slate-400">{t("totalReferrals")}</p>
        </div>
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-[#2F6F62]">{stats?.qualifiedReferrals || 0}</p>
          <p className="text-xs text-slate-400">{t("qualified")}</p>
        </div>
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-[#BFA181]">{stats?.pendingReferrals || 0}</p>
          <p className="text-xs text-slate-400">{t("pending")}</p>
        </div>
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
          <p className="text-2xl font-bold text-purple-400">${(stats?.totalEarnings || 0).toFixed(2)}</p>
          <p className="text-xs text-slate-400">{t("totalEarnings")}</p>
        </div>
      </div>

      {/* Pending Earnings */}
      {(stats?.pendingEarnings || 0) > 0 && (
        <div className="p-4 bg-[#2F6F62]/10 border border-[#2F6F62]/30 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{t("pendingEarnings")}</p>
            <p className="text-2xl font-bold text-[#2F6F62]">${stats?.pendingEarnings.toFixed(2)}</p>
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {withdrawing ? "..." : t("withdraw")}
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
              {t("applyCode")}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                placeholder={t("enterCode")}
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
                  {t("apply")}
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
            {t("referredByLabel")}: <span className="font-mono">{referredBy}</span>
          </p>
        </div>
      )}

      {/* Referrals List */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">{t("referrals")}</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-6 text-slate-500">
            <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t("noReferrals")}
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
                    ref.status === "rewarded" ? "bg-[#2F6F62]" :
                    ref.status === "qualified" ? "bg-[#BFA181]" : "bg-slate-500"
                  }`} />
                  <div>
                    <p className="text-white font-mono text-sm">{formatAddress(ref.referredAddress)}</p>
                    <p className="text-xs text-slate-500">{formatDate(ref.usedAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded ${
                    ref.status === "rewarded" ? "bg-[#2F6F62]/20 text-[#2F6F62]" :
                    ref.status === "qualified" ? "bg-[#BFA181]/20 text-[#BFA181]" : "bg-slate-500/20 text-slate-400"
                  }`}>
                    {ref.status === "rewarded" ? `✓ ${t("statusRewarded")}` :
                     ref.status === "qualified" ? t("statusReady") : t("statusPending")}
                  </span>
                  {ref.rewardAmount && (
                    <p className="text-xs text-[#2F6F62] mt-1">+${ref.rewardAmount.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
        <h4 className="text-sm font-semibold text-white mb-3">{t("howItWorks")}</h4>
        <div className="space-y-2 text-sm text-slate-400">
          <p>1️⃣ {t("step1")}</p>
          <p>2️⃣ {t("step2")}</p>
          <p>3️⃣ {t("step3")}</p>
        </div>
      </div>
    </div>
  );
}
