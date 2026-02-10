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
    totalMetals: "Toplam Metal",
    vaults: "Kasa",
    backing: "Destek Oranı",
    backToTrust: "Güven Merkezine Dön",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    available: "Satılabilir",
    allocated: "Tahsis Edilmiş",
    total: "Toplam",
    lastUpdated: "Son Güncelleme",
    loading: "Yükleniyor...",
    error: "Rezervler yüklenemedi",
    vaultLocations: "Kasa Konumları",
    metalReserves: "Metal Rezervleri",
    pricePerGram: "Fiyat/g",
    stockHealthy: "Stok Sağlıklı",
    stockLow: "Düşük Stok",
    utilizationRate: "Kullanım Oranı",
    vaultDistribution: "Kasa Dağılımı",
    showHistory: "Geçmişi Göster",
    hideHistory: "Geçmişi Gizle",
    recentActivity: "Son Hareketler",
    noActivity: "Henüz hareket yok",
    liveStatus: "CANLI",
  },
  en: {
    title: "Proof of Reserves",
    subtitle: "Verification that Auxite tokens are 100% backed by physical metals",
    totalReserves: "Total Reserves",
    totalValue: "Total Value",
    totalMetals: "Total Metals",
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
    stockHealthy: "Stock Healthy",
    stockLow: "Low Stock",
    utilizationRate: "Utilization Rate",
    vaultDistribution: "Vault Distribution",
    showHistory: "Show History",
    hideHistory: "Hide History",
    recentActivity: "Recent Activity",
    noActivity: "No activity yet",
    liveStatus: "LIVE",
  },
};

const METAL_ICONS: Record<string, string> = {
  AUXG: '/images/metals/gold.png',
  AUXS: '/images/metals/silver.png',
  AUXPT: '/images/metals/platinum.png',
  AUXPD: '/images/metals/palladium.png',
};

const METAL_INFO: Record<string, { name: string; nameEn: string; color: string; gradient: string }> = {
  AUXG: { name: 'Altın', nameEn: 'Auxite Gold', color: '#C6A46C', gradient: 'from-[#C6A46C] to-[#E0C79A]' },
  AUXS: { name: 'Gümüş', nameEn: 'Auxite Silver', color: '#B7C0C8', gradient: 'from-[#B7C0C8] to-[#D1D7DD]' },
  AUXPT: { name: 'Platin', nameEn: 'Auxite Platinum', color: '#8FA3B0', gradient: 'from-[#8FA3B0] to-[#A7BAC6]' },
  AUXPD: { name: 'Paladyum', nameEn: 'Auxite Palladium', color: '#7E8A93', gradient: 'from-[#7E8A93] to-[#98A4AD]' },
};

interface Prices {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
}

interface PlatformStock {
  total: number;
  available: number;
  reserved: number;
  allocated: number;
  warningThreshold: number;
  warningAmount: number;
  isLowStock: boolean;
  lowStockAlertSent: boolean;
  lastUpdated: number | null;
  utilizationPercent: string;
  notInitialized?: boolean;
  byVault: Record<string, number>;
  metalName?: { tr: string; en: string };
  recentHistory?: Array<{
    action: string;
    amount: number;
    vault?: string;
    vaultName?: string;
    timestamp: number;
    reason?: string;
  }>;
}

interface VaultInfo {
  name: string;
  country: string;
  code: string;
}

export default function ReservesPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  const [loading, setLoading] = useState(true);
  const [prices, setPrices] = useState<Prices>({ AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 });
  const [platformStock, setPlatformStock] = useState<Record<string, PlatformStock>>({});
  const [vaults, setVaults] = useState<Record<string, VaultInfo>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pricesRes, stockRes] = await Promise.all([
          fetch('/api/prices'),
          fetch('/api/admin/platform-stock?detailed=true'),
        ]);

        const pricesData = await pricesRes.json();
        const stockData = await stockRes.json();

        if (pricesData.prices) {
          setPrices({
            AUXG: pricesData.prices.AUXG || 0,
            AUXS: pricesData.prices.AUXS || 0,
            AUXPT: pricesData.prices.AUXPT || 0,
            AUXPD: pricesData.prices.AUXPD || 0,
          });
        }

        if (stockData.success && stockData.stocks) {
          setPlatformStock(stockData.stocks);
          setVaults(stockData.vaults || {});
          setLastUpdated(stockData.timestamp);
        }
      } catch (err) {
        console.error('Failed to fetch reserves:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatGrams = (g: number) => {
    if (g >= 1000) return `${(g / 1000).toFixed(2)} kg`;
    return `${g.toFixed(2)} g`;
  };

  const getTotalValue = () => {
    let total = 0;
    for (const [metal, stock] of Object.entries(platformStock)) {
      if (!stock.notInitialized) {
        total += stock.total * (prices[metal as keyof Prices] || 0);
      }
    }
    return total;
  };

  const getTotalGrams = () => {
    let total = 0;
    for (const stock of Object.values(platformStock)) {
      if (!stock.notInitialized) {
        total += stock.total;
      }
    }
    return total;
  };

  const getActiveVaultsCount = () => {
    const activeVaults = new Set<string>();
    for (const stock of Object.values(platformStock)) {
      if (stock.byVault) {
        for (const vault of Object.keys(stock.byVault)) {
          if (stock.byVault[vault] > 0) {
            activeVaults.add(vault);
          }
        }
      }
    }
    return activeVaults.size;
  };

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-3">
              {t.title}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#2F6F62]/10 text-[#2F6F62] dark:text-[#2F6F62] text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-[#2F6F62] rounded-full animate-pulse"></span>
                {t.liveStatus}
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            {showHistory ? t.hideHistory : t.showHistory}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2F6F62]"></div>
          </div>
        ) : Object.keys(platformStock).length > 0 ? (
          <>
            {/* Hero Stats */}
            <div className="bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] rounded-2xl p-8 mb-8 text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm">{t.totalValue}</p>
                  <p className="text-4xl font-bold">${getTotalValue().toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{formatGrams(getTotalGrams())}</p>
                  <p className="text-white text-sm">{t.totalMetals}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">{getActiveVaultsCount()}</p>
                  <p className="text-white text-sm">{t.vaults}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold">1:1</p>
                  <p className="text-white text-sm">{t.backing}</p>
                </div>
              </div>
            </div>

            {/* Metal Reserves - Platform Stock Based */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t.metalReserves}</h2>
            <div className="grid gap-4 mb-8">
              {Object.entries(platformStock).map(([metal, stock]) => {
                if (stock.notInitialized) return null;

                const info = METAL_INFO[metal];
                const price = prices[metal as keyof Prices] || 0;
                const value = stock.total * price;
                const usagePercent = parseFloat(stock.utilizationPercent || '0');
                const metalName = lang === 'tr' ? (stock.metalName?.tr || info?.name) : (stock.metalName?.en || info?.nameEn);

                return (
                  <div key={metal} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${info?.gradient || 'from-gray-300 to-gray-400'} flex items-center justify-center`}>
                          <Image src={METAL_ICONS[metal] || "/images/metals/gold.png"} alt={metal} width={32} height={32} className="drop-shadow-lg" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{metalName}</h3>
                            <span className="text-xs text-slate-500">({metal})</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              stock.isLowStock
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-[#2F6F62]/10 text-[#2F6F62] dark:text-[#2F6F62]'
                            }`}>
                              {stock.isLowStock ? t.stockLow : t.stockHealthy}
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">${price.toFixed(2)}/g</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatGrams(stock.total)}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-sm">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-500 dark:text-slate-400">{t.available}: {formatGrams(stock.available)}</span>
                          <span className="text-slate-500 dark:text-slate-400">{t.utilizationRate}: {usagePercent.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-[#BFA181]' : `bg-gradient-to-r ${info?.gradient || 'from-[#BFA181] to-[#2F6F62]'}`
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Vault Distribution */}
                      {stock.byVault && Object.keys(stock.byVault).length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{t.vaultDistribution}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(stock.byVault).map(([vaultCode, grams]) => {
                              const vault = vaults[vaultCode];
                              const percent = stock.total > 0 ? ((grams / stock.total) * 100).toFixed(1) : '0';
                              return (
                                <div key={vaultCode} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">{vault?.name || vaultCode}</span>
                                  </div>
                                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatGrams(grams)}</p>
                                  <p className="text-xs text-slate-400">{percent}%</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Recent History */}
                      {showHistory && stock.recentHistory && stock.recentHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{t.recentActivity}</p>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {stock.recentHistory.slice(0, 10).map((entry, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800 rounded p-2">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    entry.action === 'add' ? 'bg-[#2F6F62]/20 text-[#2F6F62]' :
                                    entry.action === 'remove' ? 'bg-red-500/20 text-red-500' :
                                    entry.action === 'transfer' ? 'bg-blue-500/20 text-blue-500' :
                                    'bg-slate-500/20 text-slate-500'
                                  }`}>
                                    {entry.action === 'add' ? '↑' : entry.action === 'remove' ? '↓' : entry.action === 'transfer' ? '↔' : '•'}
                                  </span>
                                  <div>
                                    <span className="font-medium">{entry.amount?.toFixed(2)}g</span>
                                    {entry.vaultName && <span className="text-slate-400 ml-1">• {entry.vaultName}</span>}
                                  </div>
                                </div>
                                <span className="text-slate-400">
                                  {new Date(entry.timestamp).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Vault Locations */}
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">{t.vaultLocations}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {Object.entries(vaults).map(([code, vault]) => {
                // Calculate total for this vault across all metals
                let vaultTotal = 0;
                for (const stock of Object.values(platformStock)) {
                  if (stock.byVault && stock.byVault[code]) {
                    vaultTotal += stock.byVault[code];
                  }
                }

                return (
                  <div key={code} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-[#2F6F62] dark:text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="font-semibold text-slate-800 dark:text-white">{vault.name}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{vault.country}</p>
                    {vaultTotal > 0 && (
                      <p className="text-xs text-[#2F6F62] dark:text-[#2F6F62] mt-2 font-medium">
                        {formatGrams(vaultTotal)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {t.lastUpdated}: {new Date(lastUpdated).toLocaleString()}
                </p>
              </div>
            )}
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
