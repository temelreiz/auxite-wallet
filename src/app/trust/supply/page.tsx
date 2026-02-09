"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const translations = {
  tr: {
    title: "Token Arz Metrikleri",
    subtitle: "Auxite tokenlarının gerçek zamanlı arz ve dağılım verileri",
    backToTrust: "Güven Merkezine Dön",
    totalSupply: "Toplam Arz",
    circulatingSupply: "Dolaşımdaki Arz",
    lockedSupply: "Kilitli Arz",
    burnedSupply: "Yakılmış Arz",
    supplyDistribution: "Arz Dağılımı",
    tokenMetrics: "Token Metrikleri",
    onChainData: "On-Chain Verileri",
    launchPhaseNotice: "Launch Phase Bildirimi",
    launchPhaseDesc: "Platform şu anda launch aşamasındadır. Arz verileri canlı yayına geçtiğinde gerçek zamanlı olarak güncellenecektir.",
    gold: "Altın (AUXG)",
    silver: "Gümüş (AUXS)",
    platinum: "Platin (AUXPT)",
    palladium: "Paladyum (AUXPD)",
    holders: "Sahip Sayısı",
    transactions: "İşlem Sayısı",
    contractAddress: "Kontrat Adresi",
    viewOnExplorer: "Explorer'da Görüntüle",
    comingSoon: "Yakında",
    liveDataSoon: "Canlı veriler yakında aktif olacak",
    maxSupply: "Maksimum Arz",
    unlimited: "Sınırsız",
    backedBy: "Destekleyen",
    physicalMetal: "Fiziksel Metal",
  },
  en: {
    title: "Token Supply Metrics",
    subtitle: "Real-time supply and distribution data for Auxite tokens",
    backToTrust: "Back to Trust Center",
    totalSupply: "Total Supply",
    circulatingSupply: "Circulating Supply",
    lockedSupply: "Locked Supply",
    burnedSupply: "Burned Supply",
    supplyDistribution: "Supply Distribution",
    tokenMetrics: "Token Metrics",
    onChainData: "On-Chain Data",
    launchPhaseNotice: "Launch Phase Notice",
    launchPhaseDesc: "Platform is currently in launch phase. Supply data will be updated in real-time once we go live.",
    gold: "Gold (AUXG)",
    silver: "Silver (AUXS)",
    platinum: "Platinum (AUXPT)",
    palladium: "Palladium (AUXPD)",
    holders: "Holders",
    transactions: "Transactions",
    contractAddress: "Contract Address",
    viewOnExplorer: "View on Explorer",
    comingSoon: "Coming Soon",
    liveDataSoon: "Live data will be active soon",
    maxSupply: "Max Supply",
    unlimited: "Unlimited",
    backedBy: "Backed By",
    physicalMetal: "Physical Metal",
  },
};

const tokenData = [
  { 
    key: "gold",
    symbol: "AUXG", 
    totalSupply: "0.00", 
    circulating: "0.00", 
    locked: "0.00",
    holders: 0,
    transactions: 0,
    contract: "0x...",
    color: "from-yellow-400 to-[#BFA181]",
    bgColor: "bg-yellow-500/10"
  },
  { 
    key: "silver",
    symbol: "AUXS", 
    totalSupply: "0.00", 
    circulating: "0.00", 
    locked: "0.00",
    holders: 0,
    transactions: 0,
    contract: "0x...",
    color: "from-gray-300 to-gray-400",
    bgColor: "bg-gray-500/10"
  },
  { 
    key: "platinum",
    symbol: "AUXPT", 
    totalSupply: "0.00", 
    circulating: "0.00", 
    locked: "0.00",
    holders: 0,
    transactions: 0,
    contract: "0x...",
    color: "from-slate-300 to-slate-400",
    bgColor: "bg-slate-500/10"
  },
  { 
    key: "palladium",
    symbol: "AUXPD", 
    totalSupply: "0.00", 
    circulating: "0.00", 
    locked: "0.00",
    holders: 0,
    transactions: 0,
    contract: "0x...",
    color: "from-orange-300 to-orange-400",
    bgColor: "bg-orange-500/10"
  },
];

export default function SupplyPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/trust" className="inline-flex items-center gap-2 text-[#2F6F62] dark:text-[#2F6F62] hover:underline mb-6">
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
        <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#BFA181] dark:text-[#BFA181] mb-1">{t.launchPhaseNotice}</h3>
              <p className="text-[#BFA181] dark:text-[#BFA181] text-sm">{t.launchPhaseDesc}</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalSupply}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">$0.00</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.circulatingSupply}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">$0.00</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.lockedSupply}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">$0.00</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-stone-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.maxSupply}</p>
            <p className="text-lg font-semibold text-[#2F6F62]">{t.unlimited}*</p>
          </div>
        </div>

        {/* Token Details */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{t.tokenMetrics}</h2>
          <div className="space-y-4">
            {tokenData.map((token) => (
              <div key={token.symbol} className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">{token.symbol.slice(-1)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 dark:text-white">{token.symbol}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {t[token.key as keyof typeof t]}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t.backedBy}</p>
                      <p className="text-sm font-medium text-[#2F6F62]">{t.physicalMetal}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.totalSupply}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{token.totalSupply}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.circulatingSupply}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{token.circulating}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.lockedSupply}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{token.locked}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.holders}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{token.holders}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.transactions}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{token.transactions}</p>
                    </div>
                  </div>

                  {/* Contract Address */}
                  <div className="mt-4 pt-4 border-t border-stone-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t.contractAddress}</p>
                        <code className="text-sm text-slate-600 dark:text-slate-400 font-mono">{token.contract}</code>
                      </div>
                      <button className="text-sm text-[#2F6F62] dark:text-[#2F6F62] hover:underline flex items-center gap-1">
                        {t.viewOnExplorer}
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            * {lang === "tr" 
              ? "Token arzı sınırsızdır çünkü her token 1:1 oranında fiziksel metal ile desteklenir. Yeni token mint edildiğinde, karşılığında eşdeğer fiziksel metal kasaya eklenir."
              : "Token supply is unlimited because each token is backed 1:1 by physical metal. When new tokens are minted, equivalent physical metal is added to the vault."
            }
          </p>
        </div>
      </main>
    </div>
  );
}
