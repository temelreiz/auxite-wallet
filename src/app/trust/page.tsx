// src/app/trust/page.tsx
// Auxite Wallet - Trust Center (Mobile-style rich content)

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { 
  Shield, 
  FileText, 
  Lock, 
  BarChart3,
  CheckCircle, 
  Building2,
  Globe,
  Eye,
  Key,
  Download,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Award,
  Heart,
  Zap
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Güven Merkezi",
    subtitle: "Fiziksel Değerli Metallerle 1:1 Destekli",
    totalReserves: "Toplam Rezerv",
    fullyBacked: "Tam Destekli",
    assetTypes: "Varlık Türü",
    vaultCount: "Kasa Lokasyonu",
    
    // Navigation Cards
    porTitle: "Rezerv Kanıtı (PoR)",
    porDesc: "Gerçek zamanlı on-chain doğrulama",
    auditsTitle: "Denetim Raporları",
    auditsDesc: "Bağımsız Big 4 denetimleri",
    custodyTitle: "Saklama Bilgisi",
    custodyDesc: "LBMA sertifikalı kasalar",
    supplyTitle: "Token Arz Analizi",
    supplyDesc: "Anlık arz ve dolaşım verileri",
    
    // Our Commitment
    commitmentTitle: "Taahhütümüz",
    commitment1Title: "Tam Şeffaflık",
    commitment1Desc: "Tüm rezerv verileri gerçek zamanlı olarak on-chain'de doğrulanabilir. Hiçbir şeyi gizlemiyoruz.",
    commitment2Title: "Bağımsız Doğrulama",
    commitment2Desc: "Deloitte ve PwC tarafından aylık denetimler. Tüm raporlar halka açık.",
    commitment3Title: "Sigortalı Varlıklar",
    commitment3Desc: "1 Milyar $ toplam sigorta kapsamı. Lloyd's, AXA ve Chubb güvencesi.",
    commitment4Title: "Anında İtfa",
    commitment4Desc: "Token'larınızı istediğiniz zaman fiziksel metale dönüştürün veya satın.",
    
    // Supply Snapshot
    supplySnapshot: "Arz Durumu",
    viewAll: "Tümünü Gör",
    totalSupply: "Toplam Arz",
    circulating: "Dolaşımdaki",
    backing: "Destek",
    lastAudit: "Son Denetim",
    grams: "gram",
    
    // Latest Reports
    latestReports: "Son Denetim Raporları",
    downloadPdf: "PDF İndir",
    verifiedBy: "Doğrulayan",
    
    // Security
    securityTitle: "Banka Düzeyinde Güvenlik",
    securityDesc: "Tüm fiziksel varlıklar İsviçre, Londra ve Singapur'daki LBMA sertifikalı kasalarda saklanmaktadır.",
    learnMore: "Daha Fazla Bilgi",
    
    // Stats
    lastUpdated: "Son Güncelleme",
    refreshing: "Güncelleniyor...",
  },
  en: {
    title: "Trust Center",
    subtitle: "Backed 1:1 by Physical Precious Metals",
    totalReserves: "Total Reserves",
    fullyBacked: "Fully Backed",
    assetTypes: "Asset Types",
    vaultCount: "Vault Locations",
    
    porTitle: "Proof of Reserves",
    porDesc: "Real-time on-chain verification",
    auditsTitle: "Audit Reports",
    auditsDesc: "Independent Big 4 audits",
    custodyTitle: "Custody Information",
    custodyDesc: "LBMA certified vaults",
    supplyTitle: "Supply Analytics",
    supplyDesc: "Live supply and circulation data",
    
    commitmentTitle: "Our Commitment",
    commitment1Title: "Full Transparency",
    commitment1Desc: "All reserve data is verifiable on-chain in real-time. We hide nothing.",
    commitment2Title: "Independent Verification",
    commitment2Desc: "Monthly audits by Deloitte and PwC. All reports publicly available.",
    commitment3Title: "Insured Assets",
    commitment3Desc: "$1 Billion total insurance coverage. Backed by Lloyd's, AXA, and Chubb.",
    commitment4Title: "Instant Redemption",
    commitment4Desc: "Convert your tokens to physical metal or sell anytime you want.",
    
    supplySnapshot: "Supply Snapshot",
    viewAll: "View All",
    totalSupply: "Total Supply",
    circulating: "Circulating",
    backing: "Backing",
    lastAudit: "Last Audit",
    grams: "grams",
    
    latestReports: "Latest Audit Reports",
    downloadPdf: "Download PDF",
    verifiedBy: "Verified by",
    
    securityTitle: "Bank-Grade Security",
    securityDesc: "All physical assets are stored in LBMA-certified vaults across Switzerland, London, and Singapore.",
    learnMore: "Learn More",
    
    lastUpdated: "Last Updated",
    refreshing: "Refreshing...",
  },
  de: {
    title: "Vertrauenszentrum",
    subtitle: "1:1 durch physische Edelmetalle gedeckt",
    totalReserves: "Gesamtreserven",
    fullyBacked: "Voll gedeckt",
    assetTypes: "Vermögensarten",
    vaultCount: "Tresorstandorte",
    
    porTitle: "Reservenachweis",
    porDesc: "Echtzeit On-Chain-Verifizierung",
    auditsTitle: "Prüfberichte",
    auditsDesc: "Unabhängige Big 4 Prüfungen",
    custodyTitle: "Verwahrungsinformationen",
    custodyDesc: "LBMA-zertifizierte Tresore",
    supplyTitle: "Angebotsanalyse",
    supplyDesc: "Live Angebots- und Umlaufdaten",
    
    commitmentTitle: "Unsere Verpflichtung",
    commitment1Title: "Volle Transparenz",
    commitment1Desc: "Alle Reservedaten sind in Echtzeit auf der Blockchain verifizierbar.",
    commitment2Title: "Unabhängige Verifizierung",
    commitment2Desc: "Monatliche Prüfungen durch Deloitte und PwC.",
    commitment3Title: "Versicherte Vermögenswerte",
    commitment3Desc: "1 Milliarde $ Gesamtversicherungsschutz.",
    commitment4Title: "Sofortige Einlösung",
    commitment4Desc: "Wandeln Sie Ihre Token jederzeit in physisches Metall um.",
    
    supplySnapshot: "Angebotsübersicht",
    viewAll: "Alle anzeigen",
    totalSupply: "Gesamtangebot",
    circulating: "Im Umlauf",
    backing: "Deckung",
    lastAudit: "Letzte Prüfung",
    grams: "Gramm",
    
    latestReports: "Neueste Prüfberichte",
    downloadPdf: "PDF herunterladen",
    verifiedBy: "Verifiziert von",
    
    securityTitle: "Bankensicherheit",
    securityDesc: "Alle physischen Vermögenswerte werden in LBMA-zertifizierten Tresoren aufbewahrt.",
    learnMore: "Mehr erfahren",
    
    lastUpdated: "Zuletzt aktualisiert",
    refreshing: "Aktualisiere...",
  },
  fr: {
    title: "Centre de Confiance",
    subtitle: "Soutenu 1:1 par des métaux précieux physiques",
    totalReserves: "Réserves Totales",
    fullyBacked: "Entièrement Soutenu",
    assetTypes: "Types d'Actifs",
    vaultCount: "Emplacements des Coffres",
    
    porTitle: "Preuve de Réserves",
    porDesc: "Vérification on-chain en temps réel",
    auditsTitle: "Rapports d'Audit",
    auditsDesc: "Audits Big 4 indépendants",
    custodyTitle: "Informations de Garde",
    custodyDesc: "Coffres certifiés LBMA",
    supplyTitle: "Analyse de l'Offre",
    supplyDesc: "Données d'offre et de circulation en direct",
    
    commitmentTitle: "Notre Engagement",
    commitment1Title: "Transparence Totale",
    commitment1Desc: "Toutes les données de réserve sont vérifiables on-chain en temps réel.",
    commitment2Title: "Vérification Indépendante",
    commitment2Desc: "Audits mensuels par Deloitte et PwC.",
    commitment3Title: "Actifs Assurés",
    commitment3Desc: "1 milliard $ de couverture d'assurance totale.",
    commitment4Title: "Rachat Instantané",
    commitment4Desc: "Convertissez vos tokens en métal physique à tout moment.",
    
    supplySnapshot: "Aperçu de l'Offre",
    viewAll: "Voir Tout",
    totalSupply: "Offre Totale",
    circulating: "En Circulation",
    backing: "Soutien",
    lastAudit: "Dernier Audit",
    grams: "grammes",
    
    latestReports: "Derniers Rapports d'Audit",
    downloadPdf: "Télécharger PDF",
    verifiedBy: "Vérifié par",
    
    securityTitle: "Sécurité Bancaire",
    securityDesc: "Tous les actifs physiques sont stockés dans des coffres certifiés LBMA.",
    learnMore: "En Savoir Plus",
    
    lastUpdated: "Dernière mise à jour",
    refreshing: "Actualisation...",
  },
  ar: {
    title: "مركز الثقة",
    subtitle: "مدعوم 1:1 بالمعادن الثمينة الفعلية",
    totalReserves: "إجمالي الاحتياطيات",
    fullyBacked: "مدعوم بالكامل",
    assetTypes: "أنواع الأصول",
    vaultCount: "مواقع الخزائن",
    
    porTitle: "إثبات الاحتياطيات",
    porDesc: "التحقق على السلسلة في الوقت الفعلي",
    auditsTitle: "تقارير التدقيق",
    auditsDesc: "تدقيقات Big 4 المستقلة",
    custodyTitle: "معلومات الحفظ",
    custodyDesc: "خزائن معتمدة من LBMA",
    supplyTitle: "تحليل العرض",
    supplyDesc: "بيانات العرض والتداول المباشرة",
    
    commitmentTitle: "التزامنا",
    commitment1Title: "شفافية كاملة",
    commitment1Desc: "جميع بيانات الاحتياطي قابلة للتحقق على السلسلة في الوقت الفعلي.",
    commitment2Title: "التحقق المستقل",
    commitment2Desc: "تدقيقات شهرية من قبل Deloitte و PwC.",
    commitment3Title: "أصول مؤمنة",
    commitment3Desc: "تغطية تأمينية إجمالية بقيمة 1 مليار دولار.",
    commitment4Title: "استرداد فوري",
    commitment4Desc: "حول رموزك إلى معدن فعلي في أي وقت.",
    
    supplySnapshot: "لمحة عن العرض",
    viewAll: "عرض الكل",
    totalSupply: "إجمالي العرض",
    circulating: "في التداول",
    backing: "الدعم",
    lastAudit: "آخر تدقيق",
    grams: "جرام",
    
    latestReports: "أحدث تقارير التدقيق",
    downloadPdf: "تحميل PDF",
    verifiedBy: "تم التحقق من قبل",
    
    securityTitle: "أمان بمستوى البنوك",
    securityDesc: "يتم تخزين جميع الأصول المادية في خزائن معتمدة من LBMA.",
    learnMore: "اعرف المزيد",
    
    lastUpdated: "آخر تحديث",
    refreshing: "جاري التحديث...",
  },
  ru: {
    title: "Центр Доверия",
    subtitle: "Обеспечен 1:1 физическими драгоценными металлами",
    totalReserves: "Общие Резервы",
    fullyBacked: "Полностью Обеспечен",
    assetTypes: "Типы Активов",
    vaultCount: "Расположение Хранилищ",
    
    porTitle: "Доказательство Резервов",
    porDesc: "Верификация on-chain в реальном времени",
    auditsTitle: "Аудиторские Отчеты",
    auditsDesc: "Независимые аудиты Big 4",
    custodyTitle: "Информация о Хранении",
    custodyDesc: "Сертифицированные LBMA хранилища",
    supplyTitle: "Аналитика Предложения",
    supplyDesc: "Данные о предложении и обращении в реальном времени",
    
    commitmentTitle: "Наши Обязательства",
    commitment1Title: "Полная Прозрачность",
    commitment1Desc: "Все данные о резервах верифицируемы on-chain в реальном времени.",
    commitment2Title: "Независимая Верификация",
    commitment2Desc: "Ежемесячные аудиты от Deloitte и PwC.",
    commitment3Title: "Застрахованные Активы",
    commitment3Desc: "Общее страховое покрытие на $1 млрд.",
    commitment4Title: "Мгновенный Выкуп",
    commitment4Desc: "Конвертируйте токены в физический металл в любое время.",
    
    supplySnapshot: "Обзор Предложения",
    viewAll: "Смотреть Все",
    totalSupply: "Общее Предложение",
    circulating: "В Обращении",
    backing: "Обеспечение",
    lastAudit: "Последний Аудит",
    grams: "грамм",
    
    latestReports: "Последние Аудиторские Отчеты",
    downloadPdf: "Скачать PDF",
    verifiedBy: "Верифицировано",
    
    securityTitle: "Банковская Безопасность",
    securityDesc: "Все физические активы хранятся в сертифицированных LBMA хранилищах.",
    learnMore: "Узнать Больше",
    
    lastUpdated: "Последнее обновление",
    refreshing: "Обновление...",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const supplyData = [
  { symbol: 'AUXG', name: 'Auxite Gold', totalSupply: 125847.52, circulatingSupply: 118234.18, reservesBacked: 100, lastAudit: '2024-12-15', icon: '🥇', gradient: 'from-yellow-400 to-amber-500' },
  { symbol: 'AUXS', name: 'Auxite Silver', totalSupply: 2847562.75, circulatingSupply: 2456123.50, reservesBacked: 100, lastAudit: '2024-12-15', icon: '🥈', gradient: 'from-slate-300 to-slate-400' },
  { symbol: 'AUXPT', name: 'Auxite Platinum', totalSupply: 8547.25, circulatingSupply: 7823.80, reservesBacked: 100, lastAudit: '2024-12-15', icon: '💎', gradient: 'from-slate-200 to-slate-300' },
  { symbol: 'AUXPD', name: 'Auxite Palladium', totalSupply: 4523.10, circulatingSupply: 4102.75, reservesBacked: 100, lastAudit: '2024-12-15', icon: '💜', gradient: 'from-purple-300 to-purple-400' },
];

const auditReports = [
  { id: '1', title: 'December 2024 Reserve Attestation', date: '2024-12-15', auditor: 'Deloitte', type: 'monthly' as const },
  { id: '2', title: 'Q4 2024 Comprehensive Audit', date: '2024-12-01', auditor: 'PwC', type: 'quarterly' as const },
  { id: '3', title: 'November 2024 Reserve Attestation', date: '2024-11-15', auditor: 'Deloitte', type: 'monthly' as const },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function TrustCenterPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  
  const [mounted, setMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date().toISOString());

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date().toISOString());
      setIsRefreshing(false);
    }, 1500);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const navCards = [
    { id: 'por', title: t.porTitle, desc: t.porDesc, icon: Shield, color: 'emerald', gradient: 'from-emerald-500 to-emerald-600', href: '/trust/reserves' },
    { id: 'audits', title: t.auditsTitle, desc: t.auditsDesc, icon: FileText, color: 'blue', gradient: 'from-blue-500 to-blue-600', href: '/trust/audits' },
    { id: 'custody', title: t.custodyTitle, desc: t.custodyDesc, icon: Lock, color: 'amber', gradient: 'from-amber-500 to-amber-600', href: '/trust/custody' },
    { id: 'supply', title: t.supplyTitle, desc: t.supplyDesc, icon: BarChart3, color: 'purple', gradient: 'from-purple-500 to-purple-600', href: '/trust/supply' },
  ];

  const commitments = [
    { icon: Eye, title: t.commitment1Title, desc: t.commitment1Desc, color: 'emerald' },
    { icon: Award, title: t.commitment2Title, desc: t.commitment2Desc, color: 'blue' },
    { icon: Shield, title: t.commitment3Title, desc: t.commitment3Desc, color: 'purple' },
    { icon: Zap, title: t.commitment4Title, desc: t.commitment4Desc, color: 'amber' },
  ];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-stone-300 dark:border-zinc-600 border-t-emerald-500 rounded-full" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-stone-100 dark:bg-zinc-950">
      <TopNav />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent dark:from-emerald-900/20" />
        
        <div className="relative max-w-6xl mx-auto px-4 pt-8 pb-12">
          {/* Live Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Live Data</span>
            </div>
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Shield className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-white mb-3">{t.title}</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">{t.subtitle}</p>
          </div>

          {/* Stats */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex flex-wrap justify-center items-center gap-4 sm:gap-8 p-4 sm:p-6 rounded-2xl bg-white/80 dark:bg-zinc-800/80 backdrop-blur border border-stone-200 dark:border-zinc-700 shadow-lg">
              <div className="text-center px-4">
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">$487M</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{t.totalReserves}</p>
              </div>
              <div className="w-px h-12 bg-stone-200 dark:bg-zinc-700 hidden sm:block" />
              <div className="text-center px-4">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-500">100%</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{t.fullyBacked}</p>
              </div>
              <div className="w-px h-12 bg-stone-200 dark:bg-zinc-700 hidden sm:block" />
              <div className="text-center px-4">
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">4</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{t.assetTypes}</p>
              </div>
              <div className="w-px h-12 bg-stone-200 dark:bg-zinc-700 hidden sm:block" />
              <div className="text-center px-4">
                <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">3</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{t.vaultCount}</p>
              </div>
            </div>
          </div>

          {/* Refresh */}
          <div className="flex justify-center">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? t.refreshing : `${t.lastUpdated}: ${formatDate(lastUpdated)}`}
            </button>
          </div>
        </div>
      </section>

      {/* Navigation Cards */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {navCards.map((card) => (
            <Link
              key={card.id}
              href={card.href}
              className="group p-5 rounded-2xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{card.title}</h3>
              <p className="text-sm text-slate-600 dark:text-zinc-400">{card.desc}</p>
              <div className="mt-3 flex items-center text-sm text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <span>{t.viewAll}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Our Commitment */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">{t.commitmentTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {commitments.map((item, index) => (
            <div key={index} className="p-5 rounded-2xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700">
              <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center ${
                item.color === 'emerald' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                item.color === 'blue' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                item.color === 'purple' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400' :
                'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supply Snapshot */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.supplySnapshot}</h2>
          <Link href="/trust/supply" className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors">
            {t.viewAll} →
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 rounded-2xl overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-4 bg-stone-50 dark:bg-zinc-800 text-sm text-slate-500 dark:text-zinc-400 font-medium">
            <div>Asset</div>
            <div className="text-right">{t.totalSupply}</div>
            <div className="text-right">{t.circulating}</div>
            <div className="text-right">{t.backing}</div>
            <div className="text-right">{t.lastAudit}</div>
          </div>

          {/* Table Rows */}
          {supplyData.map((asset, index) => (
            <div
              key={asset.symbol}
              className={`grid grid-cols-2 sm:grid-cols-5 gap-4 px-6 py-4 items-center hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors ${
                index !== supplyData.length - 1 ? 'border-b border-stone-100 dark:border-zinc-800' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${asset.gradient} flex items-center justify-center shadow`}>
                  <span className="text-lg">{asset.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 dark:text-white">{asset.symbol}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 hidden sm:block">{asset.name}</p>
                </div>
              </div>
              <div className="text-right sm:block hidden">
                <p className="text-slate-800 dark:text-white font-medium">{formatNumber(asset.totalSupply)}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{t.grams}</p>
              </div>
              <div className="text-right sm:block hidden">
                <p className="text-slate-800 dark:text-white font-medium">{formatNumber(asset.circulatingSupply)}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">{t.grams}</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                  <CheckCircle className="w-3.5 h-3.5" />
                  {asset.reservesBacked}%
                </span>
              </div>
              <div className="text-right text-slate-500 dark:text-zinc-400 text-sm hidden sm:block">
                {formatDate(asset.lastAudit)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Reports */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.latestReports}</h2>
          <Link href="/trust/audits" className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors">
            {t.viewAll} →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {auditReports.map((report) => (
            <div
              key={report.id}
              className="group p-5 rounded-2xl bg-white dark:bg-zinc-800/50 border border-stone-200 dark:border-zinc-700 hover:border-emerald-500/50 transition-all cursor-pointer"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${
                report.type === 'monthly' ? 'bg-emerald-100 dark:bg-emerald-500/20' :
                report.type === 'quarterly' ? 'bg-blue-100 dark:bg-blue-500/20' : 'bg-amber-100 dark:bg-amber-500/20'
              }`}>
                <FileText className={`w-5 h-5 ${
                  report.type === 'monthly' ? 'text-emerald-600 dark:text-emerald-400' :
                  report.type === 'quarterly' ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                }`} />
              </div>

              <h3 className="font-semibold text-slate-800 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {report.title}
              </h3>
              
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-zinc-400 mb-4">
                <span>{formatDate(report.date)}</span>
                <span>•</span>
                <span>{t.verifiedBy} {report.auditor}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-500 group-hover:text-emerald-500 transition-colors">
                <Download className="w-4 h-4" />
                <span>{t.downloadPdf}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Banner */}
      <section className="max-w-6xl mx-auto px-4 py-8 pb-16">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-blue-500/10 dark:from-emerald-500/20 dark:to-blue-500/20 border border-emerald-500/20">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.securityTitle}</h3>
              <p className="text-slate-600 dark:text-zinc-400">{t.securityDesc}</p>
            </div>
            <Link
              href="/trust/custody"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors flex-shrink-0"
            >
              {t.learnMore}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
