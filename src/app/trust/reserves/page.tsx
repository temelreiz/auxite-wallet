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
    platformStock: "Platform Stoğu",
    platformStockDesc: "Satışa hazır metal stoğu - Anlık durum",
    stockAvailable: "Satılabilir",
    stockReserved: "Ayrılmış",
    stockTotal: "Toplam Stok",
    stockHistory: "Stok Hareketleri",
    showHistory: "Geçmişi Göster",
    hideHistory: "Geçmişi Gizle",
    userBought: "satın aldı",
    userSold: "sattı",
    stockHealthy: "Stok Sağlıklı",
    stockLow: "Düşük Stok",
    utilizationRate: "Kullanım Oranı",
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
    platformStock: "Platform Stock",
    platformStockDesc: "Metal inventory ready for sale - Live status",
    stockAvailable: "Available",
    stockReserved: "Reserved",
    stockTotal: "Total Stock",
    stockHistory: "Stock Movements",
    showHistory: "Show History",
    hideHistory: "Hide History",
    userBought: "bought",
    userSold: "sold",
    stockHealthy: "Stock Healthy",
    stockLow: "Low Stock",
    utilizationRate: "Utilization Rate",
  },
};

const METAL_ICONS: Record<string, string> = {
  AUXG: '/images/metals/gold.png',
  AUXS: '/images/metals/silver.png',
  AUXPT: '/images/metals/platinum.png',
  AUXPD: '/images/metals/palladium.png',
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
  recentHistory?: Array<{
    type: string;
    userId: string;
    amount: number;
    previousAvailable: number;
    newAvailable: number;
    timestamp: number;
  }>;
}

export default function ReservesPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;
  
  const [loading, setLoading] = useState(true);
  const [reserves, setReserves] = useState<ReservesData | null>(null);
  const [prices, setPrices] = useState<Prices>({ AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 });
  const [platformStock, setPlatformStock] = useState<Record<string, PlatformStock>>({});
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [reservesRes, pricesRes, stockRes] = await Promise.all([
          fetch('/api/reserves'),
          fetch('/api/prices'),
          fetch('/api/admin/platform-stock?detailed=true'),
        ]);

        const reservesData = await reservesRes.json();
        const pricesData = await pricesRes.json();
        const stockData = await stockRes.json();

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

        if (stockData.success && stockData.stocks) {
          setPlatformStock(stockData.stocks);
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
                          <Image src={METAL_ICONS[metal] || "/images/metals/gold.png"} alt={metal} width={32} height={32} className="drop-shadow-lg" />
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

            {/* Platform Stock - Live Inventory */}
            {Object.keys(platformStock).length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      📦 {t.platformStock}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        LIVE
                      </span>
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{t.platformStockDesc}</p>
                  </div>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="px-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {showHistory ? t.hideHistory : t.showHistory}
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(platformStock).map(([metal, stock]) => {
                    const info = METAL_INFO[metal];
                    const price = prices[metal as keyof Prices] || 0;
                    const value = stock.available * price;
                    const usagePercent = stock.total > 0 ? parseFloat(stock.utilizationPercent) : 0;

                    if (stock.notInitialized) return null;

                    return (
                      <div key={metal} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${info?.gradient || 'from-gray-300 to-gray-400'} flex items-center justify-center`}>
                                <Image src={METAL_ICONS[metal] || "/images/metals/gold.png"} alt={metal} width={20} height={20} />
                              </div>
                              <span className="font-bold text-slate-800 dark:text-white">{metal}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              stock.isLowStock
                                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {stock.isLowStock ? t.stockLow : t.stockHealthy}
                            </span>
                          </div>

                          {/* Available Stock */}
                          <div className="mb-3">
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">
                              {formatGrams(stock.available)}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t.stockAvailable} • ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>

                          {/* Usage Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-500 dark:text-slate-400">{t.utilizationRate}</span>
                              <span className="text-slate-600 dark:text-slate-300">{usagePercent.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  usagePercent > 80 ? 'bg-red-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded p-2">
                              <p className="text-slate-500 dark:text-slate-400">{t.stockTotal}</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{formatGrams(stock.total)}</p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded p-2">
                              <p className="text-slate-500 dark:text-slate-400">{t.stockReserved}</p>
                              <p className="font-medium text-slate-700 dark:text-slate-200">{formatGrams(stock.reserved)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Recent History */}
                        {showHistory && stock.recentHistory && stock.recentHistory.length > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-800/50">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.stockHistory}</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {stock.recentHistory.slice(0, 5).map((entry, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <span className={entry.type === 'user_buy' ? 'text-red-500' : 'text-emerald-500'}>
                                    {entry.type === 'user_buy' ? '↓' : '↑'} {entry.amount.toFixed(2)}g
                                  </span>
                                  <span className="text-slate-400">
                                    {new Date(entry.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
