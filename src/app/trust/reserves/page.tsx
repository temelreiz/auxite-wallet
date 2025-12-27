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
    totalValue: "Toplam Değer",
    totalBars: "Toplam Külçe",
    vaults: "Kasalar",
    backing: "Destek Oranı",
    backToTrust: "Güven Merkezine Dön",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    available: "Mevcut",
    allocated: "Tahsis Edilmiş",
    total: "Toplam",
    lastUpdated: "Son Güncelleme",
    loading: "Yükleniyor...",
    error: "Rezervler yüklenemedi",
    vaultLocations: "Kasa Konumları",
    metalReserves: "Metal Rezervleri",
    pricePerGram: "Fiyat/g",
  },
  en: {
    title: "Proof of Reserves",
    subtitle: "Verification that Auxite tokens are 100% backed by physical metals",
    totalReserves: "Total Reserves",
    totalValue: "Total Value",
    totalBars: "Total Bars",
    vaults: "Vaults",
    backing: "Backing Ratio",
    backToTrust: "Back to Trust Center",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    available: "Available",
    allocated: "Allocated",
    total: "Total",
    lastUpdated: "Last Updated",
    loading: "Loading...",
    error: "Failed to load reserves",
    vaultLocations: "Vault Locations",
    metalReserves: "Metal Reserves",
    pricePerGram: "Price/g",
  },
};

const METAL_INFO: Record<string, { name: string; nameEn: string; color: string; gradient: string }> = {
  AUXG: { name: 'Altın', nameEn: 'Gold', color: '#EAB308', gradient: 'from-yellow-400 to-amber-500' },
  AUXS: { name: 'Gümüş', nameEn: 'Silver', color: '#94A3B8', gradient: 'from-gray-300 to-gray-400' },
  AUXPT: { name: 'Platin', nameEn: 'Platinum', color: '#E2E8F0', gradient: 'from-slate-300 to-slate-400' },
  AUXPD: { name: 'Paladyum', nameEn: 'Palladium', color: '#64748B', gradient: 'from-violet-400 to-purple-500' },
};

interface ReserveSummary {
  total: number;
  allocated: number;
  available: number;
  byVault: Record<string, number>;
}

interface ReservesData {
  summary: Record<string, ReserveSummary>;
  vaults: Record<string, { name: string; country: string; code: string }>;
  totalBars: number;
  lastUpdated: string;
}

interface Prices {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
}

export default function ReservesPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const [loading, setLoading] = useState(true);
  const [reserves, setReserves] = useState<ReservesData | null>(null);
  const [prices, setPrices] = useState<Prices>({ AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservesRes, pricesRes] = await Promise.all([
          fetch('/api/reserves'),
          fetch('/api/prices'),
        ]);
        
        const reservesData = await reservesRes.json();
        const pricesData = await pricesRes.json();
        
        if (reservesData.success) {
          setReserves(reservesData);
        }
        
        if (pricesData.prices) {
          setPrices({
            AUXG: pricesData.prices.AUXG || 0,
            AUXS: pricesData.prices.AUXS || 0,
            AUXPT: pricesData.prices.AUXPT || 0,
            AUXPD: pricesData.prices.AUXPD || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch reserves:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const formatGrams = (g: number) => {
    if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
    return `${g.toFixed(2)} g`;
  };

  const getTotalValue = () => {
    if (!reserves?.summary) return 0;
    let total = 0;
    for (const [metal, data] of Object.entries(reserves.summary)) {
      total += data.total * (prices[metal as keyof Prices] || 0);
    }
    return total;
  };

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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
          </div>
        ) : reserves ? (
          <>
            {/* Hero Stats */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-8 mb-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-emerald-100 text-sm">{t.totalValue}</p>
                  <p className="text-4xl font-bold">${getTotalValue().toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{reserves.totalBars?.toLocaleString()}</p>
                  <p className="text-emerald-100 text-sm">{t.totalBars}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{Object.keys(reserves.vaults || {}).length}</p>
                  <p className="text-emerald-100 text-sm">{t.vaults}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">1:1</p>
                  <p className="text-emerald-100 text-sm">{t.backing}</p>
                </div>
              </div>
            </div>

            {/* Metal Reserves */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t.metalReserves}</h2>
            <div className="grid gap-4 mb-8">
              {Object.entries(reserves.summary).map(([metal, data]) => {
                const info = METAL_INFO[metal];
                const price = prices[metal as keyof Prices] || 0;
                const value = data.total * price;
                const allocatedPercent = data.total > 0 ? (data.allocated / data.total * 100).toFixed(1) : '0';
                
                return (
                  <div key={metal} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${info.gradient} flex items-center justify-center`}>
                          <Image src={`/metals/${metal.toLowerCase().replace('aux', '')}.png`} alt={metal} width={32} height={32} className="drop-shadow-lg" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{metal}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">{lang === 'tr' ? info.name : info.nameEn} • ${price.toFixed(2)}/g</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatGrams(data.total)}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500 dark:text-slate-400">{t.allocated}: {formatGrams(data.allocated)}</span>
                          <span className="text-slate-500 dark:text-slate-400">{allocatedPercent}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${info.gradient} transition-all duration-500`}
                            style={{ width: `${allocatedPercent}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Vault Distribution */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(data.byVault).map(([vaultCode, grams]) => {
                          const vault = reserves.vaults[vaultCode];
                          return (
                            <div key={vaultCode} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
                              <p className="text-xs text-slate-500 dark:text-slate-400">{vault?.name || vaultCode}</p>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatGrams(grams)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vault Locations */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t.vaultLocations}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Object.entries(reserves.vaults).map(([code, vault]) => (
                <div key={code} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-white">{vault.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{vault.country}</p>
                </div>
              ))}
            </div>

            {/* Last Updated */}
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {t.lastUpdated}: {new Date(reserves.lastUpdated).toLocaleString()}
              </p>
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">{t.error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
