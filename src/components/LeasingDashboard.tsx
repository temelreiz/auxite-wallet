"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { AllocationModal } from "./AllocationModal";
import { PositionsTab } from "./PositionsTab";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useLeaseRates } from "@/hooks/useLeaseRates";

interface LeasingDashboardProps {
  lang?: "tr" | "en";
  onLanguageChange?: (lang: "tr" | "en") => void;
  walletAddress?: string;
  isWalletConnected?: boolean;
}

// Animated Stats Card
function StatsCard({ 
  label, 
  value, 
  suffix, 
  color, 
  icon,
  trend,
  lang 
}: { 
  label: string; 
  value: number | string; 
  suffix: string; 
  color: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  lang: "tr" | "en";
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const stepValue = numericValue / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [numericValue]);

  return (
    <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/50 p-5 relative overflow-hidden group hover:border-slate-700 transition-colors">
      {/* Background glow */}
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`}></div>
      
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="text-xs text-slate-500 mb-1">{label}</div>
          <div className={`text-2xl font-bold ${color}`}>
            {typeof value === 'string' ? value : (
              suffix === "USD" ? `$${displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : displayValue.toLocaleString(undefined, { maximumFractionDigits: 1 })
            )}
            {suffix !== "USD" && suffix !== "" && <span className="text-sm ml-1 font-normal text-slate-500">{suffix}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trend.isUp ? '↑' : '↓'}</span>
              <span>{trend.value}%</span>
              <span className="text-slate-500">{lang === "tr" ? "bu hafta" : "this week"}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// Metal Offer Card - Improved
function MetalOfferCard({ 
  offer, 
  formatAPYRange, 
  onAllocate, 
  lang 
}: { 
  offer: any; 
  formatAPYRange: (offer: any) => string;
  onAllocate: () => void;
  lang: "tr" | "en";
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const metalGradients: Record<string, string> = {
    AUXG: "from-amber-500/10 via-transparent to-transparent",
    AUXS: "from-slate-400/10 via-transparent to-transparent",
    AUXPT: "from-cyan-400/10 via-transparent to-transparent",
    AUXPD: "from-rose-400/10 via-transparent to-transparent",
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`rounded-xl border bg-gradient-to-br ${metalGradients[offer.metal]} backdrop-blur-sm p-6 transition-all duration-300 ${
        isHovered 
          ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10 -translate-y-1" 
          : "border-slate-800 bg-slate-900/50"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={offer.icon} alt={offer.name} className="w-12 h-12" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <div className="font-semibold text-slate-200 text-lg">{offer.metal}</div>
            <div className="text-xs text-slate-500">{offer.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-400">
            {formatAPYRange(offer)}
          </div>
          <div className="text-xs text-slate-500">APY</div>
        </div>
      </div>

      {/* Period Pills */}
      <div className="flex gap-2 mb-4">
        {offer.periods.map((period: any) => (
          <div 
            key={period.months}
            className="flex-1 text-center px-2 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700"
          >
            <div className="text-xs text-slate-500">{period.months} {lang === "tr" ? "Ay" : "Mo"}</div>
            <div className="text-sm font-semibold text-emerald-400">{period.apy}%</div>
          </div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="px-3 py-2 rounded-lg bg-slate-800/30">
          <div className="text-xs text-slate-500">{lang === "tr" ? "Min. Miktar" : "Min. Amount"}</div>
          <div className="text-sm font-medium text-slate-300">{offer.minAmount}g</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-slate-800/30">
          <div className="text-xs text-slate-500">TVL</div>
          <div className="text-sm font-medium text-slate-300">${offer.tvl.toLocaleString()}</div>
        </div>
      </div>

      <button
        onClick={onAllocate}
        className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {lang === "tr" ? "Kilitle ve Kazan" : "Lock & Earn"}
      </button>
    </div>
  );
}

export function LeasingDashboard({ 
  lang = "en", 
  onLanguageChange,
  walletAddress,
  isWalletConnected: propIsConnected
}: LeasingDashboardProps) {
  const { address: externalAddress, isConnected: externalIsConnected } = useAccount();
  
  const isConnected = propIsConnected !== undefined ? propIsConnected : externalIsConnected;
  const address = walletAddress || externalAddress;
  
  const [activeTab, setActiveTab] = useState<"allocate" | "positions">("allocate");
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = useDashboardStats();
  
  const { 
    leaseOffers: availableOffers, 
    formatAPYRange, 
    isLoading: ratesLoading, 
    lastUpdated, 
    source,
    sofr,
    gofo 
  } = useLeaseRates({ lang });

  const handleOpenModal = (offer: any) => {
    setSelectedOffer(offer);
    setIsModalOpen(true);
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-500/5 via-slate-900 to-slate-900 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {lang === "tr" ? "Auxite Earn" : "Auxite Earn"}
                </h2>
                <p className="text-sm text-slate-400">
                  {lang === "tr" ? "Metal Getiri Platformu" : "Metal Yield Platform"}
                </p>
              </div>
            </div>
            <p className="text-slate-300 max-w-xl mb-6">
              {lang === "tr"
                ? "Metal tokenlerinizi kilitleyin ve kurumsal ortaklardan yıllık %2-6 arasında metal cinsinden kazanç elde edin."
                : "Lock your metal tokens and earn 2-6% annual yield in metal from institutional partners."}
            </p>
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-xs text-slate-500">{lang === "tr" ? "Desteklenen" : "Supported"}</div>
                <div className="flex gap-1 mt-1">
                  <img src="/gold-favicon-32x32.png" alt="Gold" className="w-5 h-5" />
                  <img src="/silver-favicon-32x32.png" alt="Silver" className="w-5 h-5" />
                  <img src="/platinum-favicon-32x32.png" alt="Platinum" className="w-5 h-5" />
                  <img src="/palladium-favicon-32x32.png" alt="Palladium" className="w-5 h-5" />
                </div>
              </div>
              <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="text-xs text-slate-500">APY</div>
                <div className="text-lg font-bold text-emerald-400">2% - 6%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect Wallet Message */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              {lang === "tr" ? "Cüzdan Bağlantısı Gerekli" : "Wallet Connection Required"}
            </h3>
            <p className="text-sm text-slate-400 mb-6 max-w-sm mx-auto">
              {lang === "tr"
                ? "Earn özelliklerini kullanmak için cüzdanınızı bağlayın"
                : "Connect your wallet to access Earn features"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {lang === "tr" ? "Metal Earn" : "Metal Earn"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {lang === "tr"
                ? "Metallerinizi kilitleyin ve getiri kazanın"
                : "Lock your metals and earn yield"}
            </p>
          </div>
          {source && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                {source}
              </div>
              {sofr > 0 && (
                <div className="text-xs">
                  <span className="text-slate-500">SOFR:</span>{" "}
                  <span className="text-emerald-400 font-medium">{sofr.toFixed(2)}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            label={lang === "tr" ? "Toplam Kilitli" : "Total Locked"}
            value={stats.totalLocked}
            suffix="USD"
            color="text-emerald-400"
            icon={
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            trend={{ value: 12.5, isUp: true }}
            lang={lang}
          />
          <StatsCard
            label={lang === "tr" ? "Aktif Pozisyon" : "Active Positions"}
            value={stats.activePositions}
            suffix={lang === "tr" ? "adet" : "pos"}
            color="text-blue-400"
            icon={
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            lang={lang}
          />
          <StatsCard
            label={lang === "tr" ? "Yıllık Kazanç" : "Annual Earnings"}
            value={stats.totalEarnings}
            suffix="USD"
            color="text-amber-400"
            icon={
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            }
            lang={lang}
          />
          <StatsCard
            label={lang === "tr" ? "Ortalama APY" : "Average APY"}
            value={stats.avgAPY > 0 ? `${stats.avgAPY}%` : "-"}
            suffix=""
            color="text-purple-400"
            icon={
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            lang={lang}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("allocate")}
              className={`px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === "allocate" 
                  ? "text-emerald-400" 
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {lang === "tr" ? "Kazan" : "Earn"}
              </span>
              {activeTab === "allocate" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("positions")}
              className={`px-6 py-3 text-sm font-medium transition-all relative ${
                activeTab === "positions" 
                  ? "text-emerald-400" 
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {lang === "tr" ? "Pozisyonlarım" : "My Positions"}
              </span>
              {stats.activePositions > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                  {stats.activePositions}
                </span>
              )}
              {activeTab === "positions" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "allocate" && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                {lang === "tr" ? "Mevcut Teklifler" : "Available Offers"}
              </h3>
              <p className="text-sm text-slate-400">
                {lang === "tr"
                  ? "Metal tokenlerinizi seçin ve kazanmaya başlayın"
                  : "Select your metal tokens and start earning"}
              </p>
            </div>

            {ratesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
                    <div className="h-24 bg-slate-800 rounded mb-4"></div>
                    <div className="h-12 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableOffers.map((offer) => (
                  <MetalOfferCard
                    key={offer.metal}
                    offer={offer}
                    formatAPYRange={formatAPYRange}
                    onAllocate={() => handleOpenModal(offer)}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "positions" && <PositionsTab lang={lang} />}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* How It Works */}
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-blue-300">
                {lang === "tr" ? "Nasıl Çalışır?" : "How It Works"}
              </span>
            </div>
            <ul className="text-xs text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs shrink-0">1</span>
                <span>{lang === "tr" ? "Metal tokenlerinizi seçin" : "Select your metal tokens"}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs shrink-0">2</span>
                <span>{lang === "tr" ? "3, 6 veya 12 ay seçin" : "Choose 3, 6 or 12 months"}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs shrink-0">3</span>
                <span>{lang === "tr" ? "APY bazında getiri kazanın" : "Earn yield based on APY"}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs shrink-0">4</span>
                <span>{lang === "tr" ? "Süre sonunda otomatik iade" : "Auto-return after period"}</span>
              </li>
            </ul>
          </div>

          {/* Features */}
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-emerald-300">
                {lang === "tr" ? "Özellikler" : "Features"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "🔒", text: lang === "tr" ? "Sigortalı" : "Insured" },
                { icon: "📦", text: lang === "tr" ? "Fiziksel" : "Physical" },
                { icon: "🏢", text: lang === "tr" ? "Kurumsal" : "Institutional" },
                { icon: "💰", text: lang === "tr" ? "Metal Getiri" : "Metal Yield" },
                { icon: "📊", text: lang === "tr" ? "Şeffaf" : "Transparent" },
                { icon: "⛓️", text: lang === "tr" ? "On-Chain" : "On-Chain" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Modal */}
      <AllocationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        offer={selectedOffer}
        lang={lang}
      />
    </>
  );
}

export default LeasingDashboard;
