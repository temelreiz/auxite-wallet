"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const translations = {
  tr: {
    title: "Rezerv Kanıtı",
    subtitle: "Auxite tokenlarının %100 fiziksel metallerle desteklendiğinin kanıtı",
    totalReserves: "Toplam Rezervler",
    lastVerified: "Son Doğrulama",
    verificationMethod: "Doğrulama Yöntemi",
    thirdPartyAudit: "3. Parti Denetim",
    backToTrust: "Güven Merkezine Dön",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    tokenSupply: "Token Arzı",
    physicalBacking: "Fiziksel Destek",
    collateralRatio: "Teminat Oranı",
    vaultLocation: "Kasa Konumu",
    launchPhaseNotice: "Launch Phase Bildirimi",
    launchPhaseDesc: "Platform şu anda launch aşamasındadır. Rezerv verileri canlı yayına geçtiğinde gerçek zamanlı olarak güncellenecektir.",
    comingSoon: "Yakında",
    liveDataSoon: "Canlı veriler yakında aktif olacak",
  },
  en: {
    title: "Proof of Reserves",
    subtitle: "Verification that Auxite tokens are 100% backed by physical metals",
    totalReserves: "Total Reserves",
    lastVerified: "Last Verified",
    verificationMethod: "Verification Method",
    thirdPartyAudit: "Third-Party Audit",
    backToTrust: "Back to Trust Center",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    tokenSupply: "Token Supply",
    physicalBacking: "Physical Backing",
    collateralRatio: "Collateral Ratio",
    vaultLocation: "Vault Location",
    launchPhaseNotice: "Launch Phase Notice",
    launchPhaseDesc: "Platform is currently in launch phase. Reserve data will be updated in real-time once we go live.",
    comingSoon: "Coming Soon",
    liveDataSoon: "Live data will be active soon",
  },
};

const mockReserves = [
  { metal: "gold", symbol: "AUXG", tokenSupply: "0.00", physicalKg: "0.00", ratio: "100%", vault: "Zurich, Switzerland", color: "from-yellow-400 to-amber-500" },
  { metal: "silver", symbol: "AUXS", tokenSupply: "0.00", physicalKg: "0.00", ratio: "100%", vault: "Singapore", color: "from-gray-300 to-gray-400" },
  { metal: "platinum", symbol: "AUXPT", tokenSupply: "0.00", physicalKg: "0.00", ratio: "100%", vault: "London, UK", color: "from-slate-300 to-slate-400" },
  { metal: "palladium", symbol: "AUXPD", tokenSupply: "0.00", physicalKg: "0.00", ratio: "100%", vault: "Dubai, UAE", color: "from-orange-300 to-orange-400" },
];

export default function ReservesPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/trust" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.backToTrust}
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Launch Phase Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">{t.launchPhaseNotice}</h3>
              <p className="text-amber-600 dark:text-amber-300 text-sm">{t.launchPhaseDesc}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalReserves}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">$0.00</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.collateralRatio}</p>
            <p className="text-2xl font-bold text-emerald-500">100%</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.lastVerified}</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">{t.comingSoon}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.verificationMethod}</p>
            <p className="text-lg font-semibold text-slate-800 dark:text-white">{t.thirdPartyAudit}</p>
          </div>
        </div>

        {/* Reserve Details */}
        <div className="space-y-4">
          {mockReserves.map((reserve) => (
            <div key={reserve.symbol} className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${reserve.color} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">{reserve.symbol.slice(-1)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{reserve.symbol}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t[reserve.metal as keyof typeof t]}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                    {reserve.ratio} {lang === "tr" ? "Destekli" : "Backed"}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{t.tokenSupply}</p>
                    <p className="font-medium text-slate-800 dark:text-white">{reserve.tokenSupply} {reserve.symbol}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{t.physicalBacking}</p>
                    <p className="font-medium text-slate-800 dark:text-white">{reserve.physicalKg} kg</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{t.collateralRatio}</p>
                    <p className="font-medium text-emerald-500">{reserve.ratio}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">{t.vaultLocation}</p>
                    <p className="font-medium text-slate-800 dark:text-white">{reserve.vault}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Banner */}
        <div className="mt-8 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-8 text-center border border-emerald-500/20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">{t.liveDataSoon}</h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {t.launchPhaseDesc}
          </p>
        </div>
      </main>
    </div>
  );
}
