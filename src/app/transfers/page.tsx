"use client";

import { useState } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { FundTab } from "@/components/funding/FundTab";
import { WithdrawTab } from "@/components/funding/WithdrawTab";
import { MetalConversionTab } from "@/components/funding/MetalConversionTab";

// ============================================
// FUNDING, WITHDRAWALS & METAL CONVERSION — Thin Orchestrator
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Fonlama & Çekim",
    subtitle: "Saklama hesabınıza sermaye ekleyin, varlıklarınızı çekin veya metaller arası dönüşüm yapın",
    fundTab: "Fonlama",
    withdrawTab: "Çekim",
    convertTab: "Dönüşüm",
  },
  en: {
    title: "Funding & Withdrawals",
    subtitle: "Add capital to your custody account, withdraw your assets, or convert between metals",
    fundTab: "Fund",
    withdrawTab: "Withdraw",
    convertTab: "Convert",
  },
  de: {
    title: "Finanzierung & Abhebungen",
    subtitle: "Fügen Sie Kapital hinzu, heben Sie Vermögenswerte ab oder konvertieren Sie zwischen Metallen",
    fundTab: "Einzahlung",
    withdrawTab: "Abhebung",
    convertTab: "Konvertieren",
  },
  fr: {
    title: "Financement & Retraits",
    subtitle: "Ajoutez du capital, retirez vos actifs ou convertissez entre métaux",
    fundTab: "Financer",
    withdrawTab: "Retirer",
    convertTab: "Convertir",
  },
  ar: {
    title: "التمويل والسحوبات",
    subtitle: "أضف رأس المال أو اسحب أصولك أو حوّل بين المعادن",
    fundTab: "التمويل",
    withdrawTab: "السحب",
    convertTab: "تحويل",
  },
  ru: {
    title: "Финансирование и вывод",
    subtitle: "Пополните капитал, выведите активы или конвертируйте между металлами",
    fundTab: "Пополнение",
    withdrawTab: "Вывод",
    convertTab: "Конвертация",
  },
};

type ActiveTab = "fund" | "withdraw" | "convert";

export default function FundingWithdrawalsPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const [activeTab, setActiveTab] = useState<ActiveTab>("fund");

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-8 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setActiveTab("fund")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === "fund"
                ? "bg-[#2F6F62] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.fundTab}
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === "withdraw"
                ? "bg-[#BFA181] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-7-7m7 7l7-7" />
            </svg>
            {t.withdrawTab}
          </button>
          <button
            onClick={() => setActiveTab("convert")}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              activeTab === "convert"
                ? "bg-[#2F6F62] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {t.convertTab}
          </button>
        </div>

        {/* Active Tab Content */}
        {activeTab === "fund" ? <FundTab /> : activeTab === "withdraw" ? <WithdrawTab /> : <MetalConversionTab />}
      </div>
    </div>
  );
}
