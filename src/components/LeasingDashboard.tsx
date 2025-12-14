"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { AllocationModal } from "./AllocationModal";
import { PositionsTab } from "./PositionsTab";
import RecurringStakeManager from "./RecurringStakeManager";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useLeaseRates } from "@/hooks/useLeaseRates";
import { useLanguage } from "@/components/LanguageContext";

interface LeasingDashboardProps {
  walletAddress?: string;
  isWalletConnected?: boolean;
}

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    metalStaking: "Metal Biriktir",
    stakeAndEarn: "Metallerinizi stake edin ve getiri kazanın",
    totalLocked: "Toplam Kilitli",
    activePositions: "Aktif Pozisyonlar",
    annualEarnings: "Yıllık Kazanç",
    averageAPY: "Ortalama APY",
    thisWeek: "bu hafta",
    earn: "Biriktir",
    myPositions: "Pozisyonlarım",
    autoInvest: "Otomatik Alım",
    availableOffers: "Mevcut Teklifler",
    selectMetalTokens: "Metal tokenlerinizi seçin ve kazanmaya başlayın",
    stakeEarn: "Biriktir & Kazan",
    minAmount: "Min. Miktar",
    months: "Ay",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    dcaTitle: "Düzenli Yatırım Planları",
    dcaDesc: "Otomatik periyodik alımlar oluşturun",
    noDcaPlans: "Henüz düzenli yatırım planınız yok",
    createDca: "Yeni Plan Oluştur",
    howItWorks: "Nasıl Çalışır",
    step1: "Metal tokenlerinizi seçin",
    step2: "3, 6 veya 12 ay seçin",
    step3: "APY'ye göre getiri kazanın",
    step4: "Süre sonunda otomatik iade",
    features: "Özellikler",
    insured: "Sigortalı",
    institutional: "Kurumsal",
    transparent: "Şeffaf",
    physical: "Fiziksel",
    metalYield: "Metal Getiri",
    onChain: "Zincir Üstü",
  },
  en: {
    metalStaking: "Metal Staking",
    stakeAndEarn: "Stake your metals and earn yield",
    totalLocked: "Total Locked",
    activePositions: "Active Positions",
    annualEarnings: "Annual Earnings",
    averageAPY: "Average APY",
    thisWeek: "this week",
    earn: "Earn",
    myPositions: "My Positions",
    autoInvest: "Auto-Invest",
    availableOffers: "Available Offers",
    selectMetalTokens: "Select your metal tokens and start earning",
    stakeEarn: "Stake & Earn",
    minAmount: "Min. Amount",
    months: "Mo",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    dcaTitle: "Auto-Invest Plans",
    dcaDesc: "Create automatic recurring purchases",
    noDcaPlans: "No auto-invest plans yet",
    createDca: "Create New Plan",
    howItWorks: "How It Works",
    step1: "Select your metal tokens",
    step2: "Choose 3, 6 or 12 months",
    step3: "Earn yield based on APY",
    step4: "Auto-return after period",
    features: "Features",
    insured: "Insured",
    institutional: "Institutional",
    transparent: "Transparent",
    physical: "Physical",
    metalYield: "Metal Yield",
    onChain: "On-Chain",
  },
  de: {
    metalStaking: "Metall-Staking",
    stakeAndEarn: "Staken Sie Ihre Metalle und verdienen Sie Rendite",
    totalLocked: "Gesamt Gesperrt",
    activePositions: "Aktive Positionen",
    annualEarnings: "Jährliche Einnahmen",
    averageAPY: "Durchschn. APY",
    thisWeek: "diese Woche",
    earn: "Verdienen",
    myPositions: "Meine Positionen",
    autoInvest: "Auto-Invest",
    availableOffers: "Verfügbare Angebote",
    selectMetalTokens: "Wählen Sie Ihre Metall-Token und beginnen Sie zu verdienen",
    stakeEarn: "Staken & Verdienen",
    minAmount: "Min. Betrag",
    months: "Mo",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    dcaTitle: "Auto-Invest Pläne",
    dcaDesc: "Erstellen Sie automatische wiederkehrende Käufe",
    noDcaPlans: "Noch keine Auto-Invest Pläne",
    createDca: "Neuen Plan erstellen",
    howItWorks: "So funktioniert's",
    step1: "Wählen Sie Ihre Metall-Token",
    step2: "Wählen Sie 3, 6 oder 12 Monate",
    step3: "Verdienen Sie Rendite basierend auf APY",
    step4: "Automatische Rückgabe nach Ablauf",
    features: "Funktionen",
    insured: "Versichert",
    institutional: "Institutionell",
    transparent: "Transparent",
    physical: "Physisch",
    metalYield: "Metall-Rendite",
    onChain: "On-Chain",
  },
  fr: {
    metalStaking: "Staking de Métaux",
    stakeAndEarn: "Stakez vos métaux et gagnez des rendements",
    totalLocked: "Total Verrouillé",
    activePositions: "Positions Actives",
    annualEarnings: "Gains Annuels",
    averageAPY: "APY Moyen",
    thisWeek: "cette semaine",
    earn: "Gagner",
    myPositions: "Mes Positions",
    autoInvest: "Auto-Invest",
    availableOffers: "Offres Disponibles",
    selectMetalTokens: "Sélectionnez vos tokens métalliques et commencez à gagner",
    stakeEarn: "Staker & Gagner",
    minAmount: "Montant Min.",
    months: "Mois",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    dcaTitle: "Plans d'Auto-Invest",
    dcaDesc: "Créez des achats récurrents automatiques",
    noDcaPlans: "Pas encore de plans d'auto-invest",
    createDca: "Créer un nouveau plan",
    howItWorks: "Comment ça marche",
    step1: "Sélectionnez vos tokens métalliques",
    step2: "Choisissez 3, 6 ou 12 mois",
    step3: "Gagnez des rendements basés sur l'APY",
    step4: "Retour automatique après la période",
    features: "Caractéristiques",
    insured: "Assuré",
    institutional: "Institutionnel",
    transparent: "Transparent",
    physical: "Physique",
    metalYield: "Rendement Métal",
    onChain: "On-Chain",
  },
  ar: {
    metalStaking: "تخزين المعادن",
    stakeAndEarn: "خزّن معادنك واكسب عائدًا",
    totalLocked: "إجمالي المقفل",
    activePositions: "المراكز النشطة",
    annualEarnings: "الأرباح السنوية",
    averageAPY: "متوسط APY",
    thisWeek: "هذا الأسبوع",
    earn: "اكسب",
    myPositions: "مراكزي",
    autoInvest: "الاستثمار التلقائي",
    availableOffers: "العروض المتاحة",
    selectMetalTokens: "اختر رموز المعادن وابدأ في الكسب",
    stakeEarn: "خزّن واكسب",
    minAmount: "الحد الأدنى",
    months: "شهر",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    dcaTitle: "خطط الاستثمار التلقائي",
    dcaDesc: "أنشئ عمليات شراء متكررة تلقائية",
    noDcaPlans: "لا توجد خطط استثمار تلقائي بعد",
    createDca: "إنشاء خطة جديدة",
    howItWorks: "كيف يعمل",
    step1: "اختر رموز المعادن الخاصة بك",
    step2: "اختر 3 أو 6 أو 12 شهرًا",
    step3: "اكسب عائدًا بناءً على APY",
    step4: "إرجاع تلقائي بعد الفترة",
    features: "المميزات",
    insured: "مؤمّن",
    institutional: "مؤسسي",
    transparent: "شفاف",
    physical: "فعلي",
    metalYield: "عائد المعدن",
    onChain: "على السلسلة",
  },
  ru: {
    metalStaking: "Стейкинг Металлов",
    stakeAndEarn: "Стейкайте ваши металлы и зарабатывайте",
    totalLocked: "Всего Заблокировано",
    activePositions: "Активные Позиции",
    annualEarnings: "Годовой Доход",
    averageAPY: "Средний APY",
    thisWeek: "на этой неделе",
    earn: "Заработать",
    myPositions: "Мои Позиции",
    autoInvest: "Авто-инвест",
    availableOffers: "Доступные Предложения",
    selectMetalTokens: "Выберите токены металлов и начните зарабатывать",
    stakeEarn: "Стейк & Заработок",
    minAmount: "Мин. Сумма",
    months: "Мес",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    dcaTitle: "Планы авто-инвестирования",
    dcaDesc: "Создавайте автоматические повторяющиеся покупки",
    noDcaPlans: "Пока нет планов авто-инвестирования",
    createDca: "Создать новый план",
    howItWorks: "Как это работает",
    step1: "Выберите токены металлов",
    step2: "Выберите 3, 6 или 12 месяцев",
    step3: "Зарабатывайте доход на основе APY",
    step4: "Автовозврат после периода",
    features: "Особенности",
    insured: "Застраховано",
    institutional: "Институциональный",
    transparent: "Прозрачный",
    physical: "Физический",
    metalYield: "Доход в Металле",
    onChain: "В Сети",
  },
};

const getT = (lang: string) => translations[lang] || translations.en;

function StatsCard({ label, value, suffix, color, icon, trend, t }: { label: string; value: number | string; suffix: string; color: string; icon: React.ReactNode; trend?: { value: number; isUp: boolean }; t: Record<string, string> }) {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  
  useEffect(() => {
    const duration = 1500, steps = 60, stepValue = numericValue / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= numericValue) { setDisplayValue(numericValue); clearInterval(timer); } 
      else { setDisplayValue(current); }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [numericValue]);

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-gradient-to-br from-white to-stone-50 dark:from-slate-900/80 dark:to-slate-900/50 p-5 relative overflow-hidden group hover:border-stone-300 dark:hover:border-slate-700 transition-colors shadow-sm dark:shadow-none">
      <div className={`absolute -top-10 -right-10 w-32 h-32 ${color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`}></div>
      <div className="flex items-start justify-between relative z-10">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-500 mb-1">{label}</div>
          <div className={`text-2xl font-bold ${color}`}>
            {typeof value === 'string' ? value : (suffix === "USD" ? `$${displayValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : displayValue.toLocaleString(undefined, { maximumFractionDigits: 1 }))}
            {suffix !== "USD" && suffix !== "" && <span className="text-sm ml-1 font-normal text-slate-500">{suffix}</span>}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend.isUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              <span>{trend.isUp ? '↑' : '↓'}</span><span>{trend.value}%</span><span className="text-slate-500">{t.thisWeek}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl ${color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  );
}

function MetalOfferCard({ offer, formatAPYRange, onAllocate, t }: { offer: any; formatAPYRange: (offer: any) => string; onAllocate: () => void; t: Record<string, string> }) {
  const [isHovered, setIsHovered] = useState(false);
  const metalGradients: Record<string, string> = { AUXG: "from-amber-500/10 via-transparent to-transparent", AUXS: "from-slate-400/10 via-transparent to-transparent", AUXPT: "from-cyan-400/10 via-transparent to-transparent", AUXPD: "from-rose-400/10 via-transparent to-transparent" };
  
  // Metal icon mapping for high quality icons
  const metalIcons: Record<string, string> = {
    AUXG: "/gold-favicon-32x32.png",
    AUXS: "/silver-favicon-32x32.png", 
    AUXPT: "/platinum-favicon-32x32.png",
    AUXPD: "/palladium-favicon-32x32.png"
  };

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} className={`rounded-xl border bg-gradient-to-br ${metalGradients[offer.metal]} backdrop-blur-sm p-6 transition-all duration-300 ${isHovered ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10 -translate-y-1" : "border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src={metalIcons[offer.metal] || offer.icon} 
              alt={offer.name} 
              width={48} 
              height={48} 
              className="w-12 h-12 object-contain"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
          </div>
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200 text-lg">{offer.metal}</div>
            <div className="text-xs text-slate-500">{offer.name}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">{formatAPYRange(offer)}</div>
          <div className="text-xs text-slate-500">APY</div>
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {offer.periods.map((period: any) => (
          <div key={period.months} className="flex-1 text-center px-2 py-1.5 rounded-lg bg-stone-100 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700">
            <div className="text-xs text-slate-500">{period.months} {t.months}</div>
            <div className="text-sm font-semibold text-emerald-500 dark:text-emerald-400">{period.apy}%</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-slate-800/30">
          <div className="text-xs text-slate-500">{t.minAmount}</div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{offer.minAmount}g</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-stone-100 dark:bg-slate-800/30">
          <div className="text-xs text-slate-500">TVL</div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">${offer.tvl.toLocaleString()}</div>
        </div>
      </div>
      <button onClick={onAllocate} className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 flex items-center justify-center gap-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        {t.stakeEarn}
      </button>
    </div>
  );
}

export function LeasingDashboard({ walletAddress, isWalletConnected: propIsConnected }: LeasingDashboardProps) {
  const { lang } = useLanguage();
  const { address, isConnected: wagmiConnected } = useAccount();
  const isConnected = propIsConnected ?? wagmiConnected;
  const effectiveAddress = walletAddress || address;
  
  const [activeTab, setActiveTab] = useState<"allocate" | "positions" | "dca">("allocate");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [showRecurringStake, setShowRecurringStake] = useState(false);

  const { stats: rawStats, loading: statsLoading } = useDashboardStats(effectiveAddress);
  const { rates, loading: ratesLoading } = useLeaseRates();
  
  const t = getT(lang);
  
  const stats = rawStats || { totalLocked: 0, activePositions: 0, annualEarnings: 0, avgAPY: 0 };
  const safeRates = rates || { sofr: 3.66, AUXG: { "3": 1.53, "6": 2.03, "12": 2.53 }, AUXS: { "3": 1.23, "6": 1.73, "12": 2.23 }, AUXPT: { "3": 2.03, "6": 2.53, "12": 3.03 }, AUXPD: { "3": 1.83, "6": 2.33, "12": 2.83 } };

  const availableOffers = [
    { metal: "AUXG", name: t.gold, icon: "/gold-favicon-32x32.png", metalTokenAddress: "0xE425A9923250E94Fe2F4cB99cbc0896Aea24933a", minAmount: 10, tvl: 500000, periods: [{ months: 3, apy: safeRates?.AUXG?.["3"] || 1.53 }, { months: 6, apy: safeRates?.AUXG?.["6"] || 2.03 }, { months: 12, apy: safeRates?.AUXG?.["12"] || 2.53 }] },
    { metal: "AUXS", name: t.silver, icon: "/silver-favicon-32x32.png", metalTokenAddress: "0xaE583c98c833a0B4b1B23e58209E697d95F05D23", minAmount: 100, tvl: 250000, periods: [{ months: 3, apy: safeRates?.AUXS?.["3"] || 1.23 }, { months: 6, apy: safeRates?.AUXS?.["6"] || 1.73 }, { months: 12, apy: safeRates?.AUXS?.["12"] || 2.23 }] },
    { metal: "AUXPT", name: t.platinum, icon: "/platinum-favicon-32x32.png", metalTokenAddress: "0xeCfD88bE4f93C9379644B303444943e636A35F66", minAmount: 5, tvl: 350000, periods: [{ months: 3, apy: safeRates?.AUXPT?.["3"] || 2.03 }, { months: 6, apy: safeRates?.AUXPT?.["6"] || 2.53 }, { months: 12, apy: safeRates?.AUXPT?.["12"] || 3.03 }] },
    { metal: "AUXPD", name: t.palladium, icon: "/palladium-favicon-32x32.png", metalTokenAddress: "0x6F4E027B42E14e06f3eaeA39d574122188eab1D4", minAmount: 5, tvl: 150000, periods: [{ months: 3, apy: safeRates?.AUXPD?.["3"] || 1.83 }, { months: 6, apy: safeRates?.AUXPD?.["6"] || 2.33 }, { months: 12, apy: safeRates?.AUXPD?.["12"] || 2.83 }] },
  ];

  const formatAPYRange = (offer: any) => {
    const min = Math.min(...offer.periods.map((p: any) => p.apy));
    const max = Math.max(...offer.periods.map((p: any) => p.apy));
    return `${min.toFixed(2)}% - ${max.toFixed(2)}%`;
  };

  const handleOpenModal = (offer: any) => { setSelectedOffer(offer); setIsModalOpen(true); };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 dark:from-emerald-500/20 dark:to-cyan-500/20 border border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.metalStaking}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t.stakeAndEarn}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm text-slate-600 dark:text-slate-400">NY Fed + Calculated</span>
            <span className="text-lg font-bold text-emerald-500 dark:text-emerald-400">SOFR: {(safeRates?.sofr || 3.66).toFixed(2)}%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label={t.totalLocked} value={stats.totalLocked} suffix="USD" color="text-emerald-500 dark:text-emerald-400" icon={<svg className="w-5 h-5 text-emerald-500 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>} trend={{ value: 12.5, isUp: true }} t={t} />
          <StatsCard label={t.activePositions} value={stats.activePositions} suffix="pos" color="text-blue-500 dark:text-blue-400" icon={<svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>} t={t} />
          <StatsCard label={t.annualEarnings} value={stats.annualEarnings} suffix="USD" color="text-amber-500 dark:text-amber-400" icon={<svg className="w-5 h-5 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} t={t} />
          <StatsCard label={t.averageAPY} value={stats.avgAPY > 0 ? `${stats.avgAPY}%` : "-"} suffix="" color="text-purple-500 dark:text-purple-400" icon={<svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} t={t} />
        </div>

        {/* Tabs */}
        <div className="border-b border-stone-200 dark:border-slate-800">
          <div className="flex gap-1">
            <button onClick={() => setActiveTab("allocate")} className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === "allocate" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
              <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>{t.earn}</span>
              {activeTab === "allocate" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>}
            </button>
            <button onClick={() => setActiveTab("positions")} className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === "positions" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
              <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>{t.myPositions}</span>
              {stats.activePositions > 0 && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">{stats.activePositions}</span>}
              {activeTab === "positions" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>}
            </button>
            <button onClick={() => setActiveTab("dca")} className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === "dca" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
              <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>{t.autoInvest}</span>
              {activeTab === "dca" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></div>}
            </button>
          </div>
        </div>

        {activeTab === "allocate" && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t.availableOffers}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.selectMetalTokens}</p>
            </div>
            {ratesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map((i) => <div key={i} className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 animate-pulse"><div className="h-24 bg-stone-200 dark:bg-slate-800 rounded mb-4"></div><div className="h-12 bg-stone-200 dark:bg-slate-800 rounded"></div></div>)}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{availableOffers.map((offer) => <MetalOfferCard key={offer.metal} offer={offer} formatAPYRange={formatAPYRange} onAllocate={() => handleOpenModal(offer)} t={t} />)}</div>
            )}
          </div>
        )}

        {activeTab === "positions" && <PositionsTab lang={lang} />}

        {activeTab === "dca" && (
          showRecurringStake ? (
            <RecurringStakeManager walletAddress={effectiveAddress || ""} lang={lang} />
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-stone-100 dark:bg-slate-800 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">{t.dcaTitle}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.noDcaPlans}</p>
              <button 
                onClick={() => setShowRecurringStake(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/20"
              >
                {t.createDca}
              </button>
            </div>
          )
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-50 dark:from-blue-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center"><span className="text-sm">💡</span></div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-300">{t.howItWorks}</span>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs shrink-0">1</span><span>{t.step1}</span></li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs shrink-0">2</span><span>{t.step2}</span></li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs shrink-0">3</span><span>{t.step3}</span></li>
              <li className="flex items-start gap-2"><span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs shrink-0">4</span><span>{t.step4}</span></li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 dark:from-emerald-500/5 to-transparent p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center"><span className="text-sm">✓</span></div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-300">{t.features}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[{ icon: "🔒", key: "insured" }, { icon: "🏢", key: "institutional" }, { icon: "📊", key: "transparent" }, { icon: "📦", key: "physical" }, { icon: "💰", key: "metalYield" }, { icon: "⛓️", key: "onChain" }].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"><span>{item.icon}</span><span>{t[item.key]}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AllocationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} offer={selectedOffer} lang={lang} />
    </>
  );
}

export default LeasingDashboard;
