"use client";

import { useState, useEffect } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { FundTab } from "@/components/funding/FundTab";
import { WithdrawTab } from "@/components/funding/WithdrawTab";
import { MetalConversionTab } from "@/components/funding/MetalConversionTab";
import { useDemoMode } from "@/hooks/useDemoMode";

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

const demoTranslations: Record<string, Record<string, string>> = {
  en: {
    demoBadge: "Demo Mode",
    demoWithdrawDisabled: "Withdrawals are not available in Demo Mode. Exit demo to use real transfers.",
    demoFundDisabled: "You're in Demo Mode. Real funding is not needed — you have $10,000 virtual balance.",
    demoConvertNote: "Metal conversions in demo mode use your virtual balance.",
    demoBackToVault: "Back to Vault",
  },
  tr: {
    demoBadge: "Demo Modu",
    demoWithdrawDisabled: "Demo Modunda çekim yapılamaz. Gerçek transferler için demo modundan çıkın.",
    demoFundDisabled: "Demo Modundasınız. Gerçek fonlama gerekmez — $10.000 sanal bakiyeniz var.",
    demoConvertNote: "Demo modunda metal dönüşümleri sanal bakiyenizi kullanır.",
    demoBackToVault: "Kasaya Dön",
  },
  de: {
    demoBadge: "Demo-Modus",
    demoWithdrawDisabled: "Abhebungen sind im Demo-Modus nicht verfügbar.",
    demoFundDisabled: "Sie sind im Demo-Modus. Keine Einzahlung nötig.",
    demoConvertNote: "Konvertierungen im Demo-Modus verwenden Ihr virtuelles Guthaben.",
    demoBackToVault: "Zurück zum Tresor",
  },
  fr: {
    demoBadge: "Mode Démo",
    demoWithdrawDisabled: "Les retraits ne sont pas disponibles en mode démo.",
    demoFundDisabled: "Vous êtes en mode démo. Pas besoin de financement réel.",
    demoConvertNote: "Les conversions en mode démo utilisent votre solde virtuel.",
    demoBackToVault: "Retour au Coffre",
  },
  ar: {
    demoBadge: "الوضع التجريبي",
    demoWithdrawDisabled: "السحوبات غير متاحة في الوضع التجريبي.",
    demoFundDisabled: "أنت في الوضع التجريبي. لا حاجة للتمويل الحقيقي.",
    demoConvertNote: "تحويلات المعادن في الوضع التجريبي تستخدم رصيدك الافتراضي.",
    demoBackToVault: "العودة إلى الخزنة",
  },
  ru: {
    demoBadge: "Демо-режим",
    demoWithdrawDisabled: "Вывод средств недоступен в демо-режиме.",
    demoFundDisabled: "Вы в демо-режиме. Реальное пополнение не требуется.",
    demoConvertNote: "Конвертации в демо-режиме используют виртуальный баланс.",
    demoBackToVault: "Назад к хранилищу",
  },
};

type ActiveTab = "fund" | "withdraw" | "convert";

export default function FundingWithdrawalsPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const dt = demoTranslations[lang] || demoTranslations.en;
  const [activeTab, setActiveTab] = useState<ActiveTab>("fund");

  // Get wallet address for demo check
  const [address, setAddress] = useState<string | null>(null);
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) setAddress(savedAddress);
  }, []);

  const { demoActive, demoBalance } = useDemoMode(address);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Demo Mode Banner */}
        {demoActive && (
          <div className="mb-6 flex items-center gap-2 px-4 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
            <span className="text-lg">🎮</span>
            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{dt.demoBadge}</span>
            {demoBalance && (
              <span className="ml-auto text-xs font-mono text-purple-600 dark:text-purple-300">
                ${(demoBalance.usdt + demoBalance.auxm + demoBalance.usdc).toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-8 bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-1">
          <button
            onClick={() => setActiveTab("fund")}
            className={`flex-1 py-3 px-2 sm:px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "fund"
                ? "bg-[#2F6F62] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.fundTab}
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3 px-2 sm:px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "withdraw"
                ? "bg-[#BFA181] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-7-7m7 7l7-7" />
            </svg>
            {t.withdrawTab}
          </button>
          <button
            onClick={() => setActiveTab("convert")}
            className={`flex-1 py-3 px-2 sm:px-6 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
              activeTab === "convert"
                ? "bg-[#2F6F62] text-white shadow-md"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            {t.convertTab}
          </button>
        </div>

        {/* Active Tab Content */}
        {demoActive && activeTab === "fund" ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.demoBadge}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{dt.demoFundDisabled}</p>
          </div>
        ) : demoActive && activeTab === "withdraw" ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.demoBadge}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{dt.demoWithdrawDisabled}</p>
          </div>
        ) : demoActive && activeTab === "convert" ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎮</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{dt.demoBadge}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{dt.demoConvertNote}</p>
          </div>
        ) : (
          activeTab === "fund" ? <FundTab /> : activeTab === "withdraw" ? <WithdrawTab /> : <MetalConversionTab />
        )}
      </div>
    </div>
  );
}
