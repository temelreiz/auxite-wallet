"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    fundingOverview: "Fonlama Genel Bakış",
    totalDeposited30d: "Toplam Yatırım (30g)",
    pendingDeposits: "Bekleyen Yatırımlar",
    lastDeposit: "Son Yatırım",
    noData: "Veri yok",
    neverDeposited: "Henüz yatırım yok",
    ago: "önce",
    minutes: "dakika",
    hours: "saat",
    days: "gün",
  },
  en: {
    fundingOverview: "Funding Overview",
    totalDeposited30d: "Total Deposited (30d)",
    pendingDeposits: "Pending Deposits",
    lastDeposit: "Last Deposit",
    noData: "No data",
    neverDeposited: "No deposits yet",
    ago: "ago",
    minutes: "minutes",
    hours: "hours",
    days: "days",
  },
  de: {
    fundingOverview: "Finanzierungsübersicht",
    totalDeposited30d: "Gesamteinzahlung (30T)",
    pendingDeposits: "Ausstehende Einzahlungen",
    lastDeposit: "Letzte Einzahlung",
    noData: "Keine Daten",
    neverDeposited: "Noch keine Einzahlungen",
    ago: "vor",
    minutes: "Minuten",
    hours: "Stunden",
    days: "Tage",
  },
  fr: {
    fundingOverview: "Aperçu du Financement",
    totalDeposited30d: "Total Déposé (30j)",
    pendingDeposits: "Dépôts en Attente",
    lastDeposit: "Dernier Dépôt",
    noData: "Pas de données",
    neverDeposited: "Aucun dépôt",
    ago: "il y a",
    minutes: "minutes",
    hours: "heures",
    days: "jours",
  },
  ar: {
    fundingOverview: "نظرة عامة على التمويل",
    totalDeposited30d: "إجمالي الإيداع (30 يوم)",
    pendingDeposits: "إيداعات معلقة",
    lastDeposit: "آخر إيداع",
    noData: "لا توجد بيانات",
    neverDeposited: "لا توجد إيداعات",
    ago: "منذ",
    minutes: "دقائق",
    hours: "ساعات",
    days: "أيام",
  },
  ru: {
    fundingOverview: "Обзор Финансирования",
    totalDeposited30d: "Всего Внесено (30д)",
    pendingDeposits: "Ожидающие Депозиты",
    lastDeposit: "Последний Депозит",
    noData: "Нет данных",
    neverDeposited: "Депозитов пока нет",
    ago: "назад",
    minutes: "минут",
    hours: "часов",
    days: "дней",
  },
};

function formatTimeAgo(timestamp: number, t: Record<string, string>): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "< 1 " + t.minutes + " " + t.ago;
  if (minutes < 60) return `${minutes} ${t.minutes} ${t.ago}`;
  if (hours < 24) return `${hours} ${t.hours} ${t.ago}`;
  return `${days} ${t.days} ${t.ago}`;
}

function formatUSD(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

export function FundingOverviewPanel() {
  const { lang } = useLanguage();
  const { address } = useWallet();
  const t = translations[lang] || translations.en;

  const [totalDeposited, setTotalDeposited] = useState<number>(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [lastDepositTime, setLastDepositTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }

    const fetchData = async () => {
      try {
        const [historyRes, pendingRes] = await Promise.all([
          fetch(`/api/deposits/history?address=${address}`),
          fetch(`/api/deposits?status=pending&address=${address}`),
        ]);

        const historyData = await historyRes.json();
        const pendingData = await pendingRes.json();

        if (historyData.success) {
          setTotalDeposited(historyData.totalDeposited30d || 0);
          setLastDepositTime(historyData.lastDepositTimestamp || null);
        }
        if (pendingData.success) {
          setPendingAmount(pendingData.totalPendingUsd || 0);
        }
      } catch (error) {
        console.error("Failed to load funding overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  const metrics = [
    {
      label: t.totalDeposited30d,
      value: loading ? "..." : formatUSD(totalDeposited),
      icon: (
        <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
      ),
    },
    {
      label: t.pendingDeposits,
      value: loading ? "..." : formatUSD(pendingAmount),
      icon: (
        <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: t.lastDeposit,
      value: loading ? "..." : lastDepositTime ? formatTimeAgo(lastDepositTime, t) : t.neverDeposited,
      icon: (
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800"
        >
          <div className="flex items-center gap-2 mb-2">
            {metric.icon}
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
              {metric.label}
            </span>
          </div>
          <p className="text-xl font-bold text-slate-800 dark:text-white">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}

export default FundingOverviewPanel;
