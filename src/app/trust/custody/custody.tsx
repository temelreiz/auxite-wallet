// src/app/trust/custody/page.tsx
// Auxite Wallet - Custody Details Page

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, MapPin, Lock, Eye, CheckCircle, Building, Globe, Key } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

const translations = {
  tr: {
    backToTrust: "Güven Merkezine Dön",
    title: "Saklama ve Güvenlik",
    subtitle: "3 kıtada banka düzeyinde kasa depolama",
    totalVaultCapacity: "Toplam Kasa Kapasitesi",
    currentHoldings: "Mevcut Varlıklar",
    insuranceCoverage: "Sigorta Kapsamı",
    vaultLocationsCount: "Kasa Lokasyonları",
    vaultLocations: "Kasa Lokasyonları",
    operator: "Operatör",
    holdings: "Varlıklar",
    insurance: "Sigorta",
    securityStandards: "Güvenlik Standartları",
    physicalSecurity: "Fiziksel Güvenlik",
    accessControl: "Erişim Kontrolü",
    monitoring: "İzleme",
    insuranceCompliance: "Sigorta ve Uyumluluk",
    armedSecurity: "7/24 silahlı güvenlik personeli",
    biometricAccess: "Biyometrik erişim kontrolü",
    blastProofDoors: "Patlamaya dayanıklı kasa kapıları",
    undergroundStorage: "Yeraltı depolama tesisleri",
    multiSigAuth: "Çoklu imza yetkilendirmesi",
    timeLockedAccess: "Zamana bağlı erişim prosedürleri",
    segregatedStorage: "Müşteriye göre ayrılmış depolama",
    dualKeyAuth: "Çift anahtarlı kimlik doğrulama",
    realtimeCCTV: "Gerçek zamanlı CCTV gözetleme",
    seismicMonitoring: "Sismik aktivite izleme",
    environmentalControls: "Çevre kontrolleri",
    inventoryTracking: "Envanter takip sistemi",
    totalInsurance: "1 Milyar $ toplam sigorta kapsamı",
    lbmaCertified: "LBMA sertifikalı tesisler",
    soc2Compliant: "SOC 2 Type II uyumlu",
    regularAudits: "Düzenli üçüncü taraf denetimleri",
    certifications: "Sertifikalar",
    securityFeatures: "Güvenlik Özellikleri",
    capacity: "Kapasite",
    lastInspection: "Son Denetim",
    close: "Kapat",
  },
  en: {
    backToTrust: "Back to Trust Center",
    title: "Custody & Security",
    subtitle: "Bank-grade vault storage across 3 continents",
    totalVaultCapacity: "Total Vault Capacity",
    currentHoldings: "Current Holdings",
    insuranceCoverage: "Insurance Coverage",
    vaultLocationsCount: "Vault Locations",
    vaultLocations: "Vault Locations",
    operator: "Operator",
    holdings: "Holdings",
    insurance: "Insurance",
    securityStandards: "Security Standards",
    physicalSecurity: "Physical Security",
    accessControl: "Access Control",
    monitoring: "Monitoring",
    insuranceCompliance: "Insurance & Compliance",
    armedSecurity: "24/7 armed security personnel",
    biometricAccess: "Biometric access control",
    blastProofDoors: "Blast-proof vault doors",
    undergroundStorage: "Underground storage facilities",
    multiSigAuth: "Multi-signature authorization",
    timeLockedAccess: "Time-locked access procedures",
    segregatedStorage: "Segregated storage by client",
    dualKeyAuth: "Dual-key authentication",
    realtimeCCTV: "Real-time CCTV surveillance",
    seismicMonitoring: "Seismic activity monitoring",
    environmentalControls: "Environmental controls",
    inventoryTracking: "Inventory tracking system",
    totalInsurance: "$1B total insurance coverage",
    lbmaCertified: "LBMA certified facilities",
    soc2Compliant: "SOC 2 Type II compliant",
    regularAudits: "Regular third-party audits",
    certifications: "Certifications",
    securityFeatures: "Security Features",
    capacity: "Capacity",
    lastInspection: "Last Inspection",
    close: "Close",
  },
  de: {
    backToTrust: "Zurück zum Trust Center",
    title: "Verwahrung & Sicherheit",
    subtitle: "Tresorverwahrung auf Bankniveau auf 3 Kontinenten",
    totalVaultCapacity: "Gesamte Tresorkapazität",
    currentHoldings: "Aktuelle Bestände",
    insuranceCoverage: "Versicherungsschutz",
    vaultLocationsCount: "Tresorstandorte",
    vaultLocations: "Tresorstandorte",
    operator: "Betreiber",
    holdings: "Bestände",
    insurance: "Versicherung",
    securityStandards: "Sicherheitsstandards",
    physicalSecurity: "Physische Sicherheit",
    accessControl: "Zugangskontrolle",
    monitoring: "Überwachung",
    insuranceCompliance: "Versicherung & Compliance",
    armedSecurity: "24/7 bewaffnetes Sicherheitspersonal",
    biometricAccess: "Biometrische Zugangskontrolle",
    blastProofDoors: "Explosionssichere Tresortüren",
    undergroundStorage: "Unterirdische Lagereinrichtungen",
    multiSigAuth: "Multi-Signatur-Autorisierung",
    timeLockedAccess: "Zeitgesperrte Zugangsverfahren",
    segregatedStorage: "Getrennte Lagerung nach Kunde",
    dualKeyAuth: "Dual-Key-Authentifizierung",
    realtimeCCTV: "Echtzeit-CCTV-Überwachung",
    seismicMonitoring: "Seismische Aktivitätsüberwachung",
    environmentalControls: "Umgebungskontrollen",
    inventoryTracking: "Bestandsverfolgungssystem",
    totalInsurance: "1 Mrd. $ Gesamtversicherungsschutz",
    lbmaCertified: "LBMA-zertifizierte Einrichtungen",
    soc2Compliant: "SOC 2 Type II konform",
    regularAudits: "Regelmäßige Drittprüfungen",
    certifications: "Zertifizierungen",
    securityFeatures: "Sicherheitsmerkmale",
    capacity: "Kapazität",
    lastInspection: "Letzte Inspektion",
    close: "Schließen",
  },
  fr: {
    backToTrust: "Retour au Centre de Confiance",
    title: "Garde & Sécurité",
    subtitle: "Stockage en coffre-fort de niveau bancaire sur 3 continents",
    totalVaultCapacity: "Capacité totale des coffres",
    currentHoldings: "Avoirs actuels",
    insuranceCoverage: "Couverture d'assurance",
    vaultLocationsCount: "Emplacements des coffres",
    vaultLocations: "Emplacements des coffres",
    operator: "Opérateur",
    holdings: "Avoirs",
    insurance: "Assurance",
    securityStandards: "Normes de sécurité",
    physicalSecurity: "Sécurité physique",
    accessControl: "Contrôle d'accès",
    monitoring: "Surveillance",
    insuranceCompliance: "Assurance & Conformité",
    armedSecurity: "Personnel de sécurité armé 24h/24",
    biometricAccess: "Contrôle d'accès biométrique",
    blastProofDoors: "Portes de coffre anti-explosion",
    undergroundStorage: "Installations de stockage souterraines",
    multiSigAuth: "Autorisation multi-signatures",
    timeLockedAccess: "Procédures d'accès à verrouillage temporel",
    segregatedStorage: "Stockage séparé par client",
    dualKeyAuth: "Authentification à double clé",
    realtimeCCTV: "Surveillance CCTV en temps réel",
    seismicMonitoring: "Surveillance de l'activité sismique",
    environmentalControls: "Contrôles environnementaux",
    inventoryTracking: "Système de suivi d'inventaire",
    totalInsurance: "1 Md $ de couverture d'assurance totale",
    lbmaCertified: "Installations certifiées LBMA",
    soc2Compliant: "Conforme SOC 2 Type II",
    regularAudits: "Audits tiers réguliers",
    certifications: "Certifications",
    securityFeatures: "Caractéristiques de sécurité",
    capacity: "Capacité",
    lastInspection: "Dernière inspection",
    close: "Fermer",
  },
  ar: {
    backToTrust: "العودة إلى مركز الثقة",
    title: "الحفظ والأمان",
    subtitle: "تخزين في خزائن بمستوى مصرفي عبر 3 قارات",
    totalVaultCapacity: "السعة الإجمالية للخزائن",
    currentHoldings: "الممتلكات الحالية",
    insuranceCoverage: "التغطية التأمينية",
    vaultLocationsCount: "مواقع الخزائن",
    vaultLocations: "مواقع الخزائن",
    operator: "المشغّل",
    holdings: "الممتلكات",
    insurance: "التأمين",
    securityStandards: "معايير الأمان",
    physicalSecurity: "الأمن المادي",
    accessControl: "التحكم في الوصول",
    monitoring: "المراقبة",
    insuranceCompliance: "التأمين والامتثال",
    armedSecurity: "أفراد أمن مسلحون على مدار الساعة",
    biometricAccess: "التحكم في الوصول بالقياسات الحيوية",
    blastProofDoors: "أبواب خزائن مقاومة للانفجار",
    undergroundStorage: "مرافق تخزين تحت الأرض",
    multiSigAuth: "تفويض متعدد التوقيعات",
    timeLockedAccess: "إجراءات وصول مقيدة بالوقت",
    segregatedStorage: "تخزين منفصل حسب العميل",
    dualKeyAuth: "مصادقة بمفتاح مزدوج",
    realtimeCCTV: "مراقبة كاميرات في الوقت الحقيقي",
    seismicMonitoring: "مراقبة النشاط الزلزالي",
    environmentalControls: "ضوابط بيئية",
    inventoryTracking: "نظام تتبع المخزون",
    totalInsurance: "تغطية تأمينية إجمالية بقيمة 1 مليار دولار",
    lbmaCertified: "منشآت معتمدة من LBMA",
    soc2Compliant: "متوافق مع SOC 2 Type II",
    regularAudits: "عمليات تدقيق منتظمة من طرف ثالث",
    certifications: "الشهادات",
    securityFeatures: "ميزات الأمان",
    capacity: "السعة",
    lastInspection: "آخر فحص",
    close: "إغلاق",
  },
  ru: {
    backToTrust: "Назад в Центр Доверия",
    title: "Хранение и Безопасность",
    subtitle: "Хранилища банковского уровня на 3 континентах",
    totalVaultCapacity: "Общая вместимость хранилищ",
    currentHoldings: "Текущие активы",
    insuranceCoverage: "Страховое покрытие",
    vaultLocationsCount: "Расположение хранилищ",
    vaultLocations: "Расположение хранилищ",
    operator: "Оператор",
    holdings: "Активы",
    insurance: "Страхование",
    securityStandards: "Стандарты безопасности",
    physicalSecurity: "Физическая безопасность",
    accessControl: "Контроль доступа",
    monitoring: "Мониторинг",
    insuranceCompliance: "Страхование и Соответствие",
    armedSecurity: "Вооружённая охрана 24/7",
    biometricAccess: "Биометрический контроль доступа",
    blastProofDoors: "Взрывозащитные двери хранилищ",
    undergroundStorage: "Подземные хранилища",
    multiSigAuth: "Мультиподписная авторизация",
    timeLockedAccess: "Процедуры доступа с временной блокировкой",
    segregatedStorage: "Раздельное хранение по клиентам",
    dualKeyAuth: "Двухключевая аутентификация",
    realtimeCCTV: "Видеонаблюдение в реальном времени",
    seismicMonitoring: "Мониторинг сейсмической активности",
    environmentalControls: "Контроль окружающей среды",
    inventoryTracking: "Система отслеживания запасов",
    totalInsurance: "Общее страховое покрытие $1 млрд",
    lbmaCertified: "Сертифицированные LBMA объекты",
    soc2Compliant: "Соответствие SOC 2 Type II",
    regularAudits: "Регулярные сторонние аудиты",
    certifications: "Сертификаты",
    securityFeatures: "Функции безопасности",
    capacity: "Вместимость",
    lastInspection: "Последняя проверка",
    close: "Закрыть",
  },
};

interface Vault {
  id: string;
  name: string;
  location: string;
  country: string;
  flag: string;
  operator: string;
  certification: string[];
  capacity: string;
  currentHoldings: string;
  securityFeatures: string[];
  insurance: string;
  lastInspection: string;
}

const VAULTS: Vault[] = [
  {
    id: 'zurich',
    name: 'Zurich Secure Vault',
    location: 'Zurich',
    country: 'Switzerland',
    flag: '🇨🇭',
    operator: 'Swiss Vault AG',
    certification: ['LBMA Certified', 'ISO 27001', 'SOC 2 Type II'],
    capacity: '500 tonnes',
    currentHoldings: '$320M',
    securityFeatures: [
      '24/7 Armed Security',
      'Biometric Access Control',
      'Motion Detection Sensors',
      'Seismic Monitoring',
      'Air-gapped Networks',
      'Multi-signature Access',
    ],
    insurance: 'Lloyd\'s of London - $500M',
    lastInspection: '2024-12-10',
  },
  {
    id: 'london',
    name: 'London Bullion Vault',
    location: 'London',
    country: 'United Kingdom',
    flag: '🇬🇧',
    operator: 'Brink\'s UK',
    certification: ['LBMA Certified', 'ISO 9001', 'ISO 27001'],
    capacity: '300 tonnes',
    currentHoldings: '$145M',
    securityFeatures: [
      '24/7 Surveillance',
      'Vault Depth: 30m Underground',
      'Blast-proof Construction',
      'Independent Power Supply',
      'Dual-key Access System',
    ],
    insurance: 'AXA Corporate - $300M',
    lastInspection: '2024-12-05',
  },
  {
    id: 'istanbul',
    name: 'Istanbul Precious Metals Vault',
    location: 'Istanbul',
    country: 'Turkey',
    flag: '🇹🇷',
    operator: 'Borsa Istanbul',
    certification: ['Borsa Istanbul Approved', 'LBMA Regulated'],
    capacity: '200 tonnes',
    currentHoldings: '$42M',
    securityFeatures: [
      'Military-grade Security',
      'Climate Controlled',
      'Earthquake Resistant',
      'Fire Suppression System',
      'Real-time Inventory Tracking',
    ],
    insurance: 'Chubb - $200M',
    lastInspection: '2024-11-28',
  },
];

export default function CustodyPage() {
  const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  return (
    <main className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Link href="/trust-center" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4">
            <ArrowLeft className="w-4 h-4" />
            {t.backToTrust}
          </Link>
          <h1 className="text-3xl font-bold text-white">{t.title}</h1>
          <p className="text-slate-400 mt-2">{t.subtitle}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t.totalVaultCapacity, value: '1,000 tonnes', icon: Building },
            { label: t.currentHoldings, value: '$507M', icon: Lock },
            { label: t.insuranceCoverage, value: '$1B', icon: Shield },
            { label: t.vaultLocationsCount, value: '3', icon: Globe },
          ].map((stat, i) => (
            <div key={i} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <stat.icon className="w-5 h-5 text-[#BFA181] mb-2" />
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Vaults Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <h2 className="text-xl font-semibold text-white mb-6">{t.vaultLocations}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {VAULTS.map((vault) => (
            <div
              key={vault.id}
              className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-[#BFA181]/50 transition-all cursor-pointer"
              onClick={() => setSelectedVault(vault)}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{vault.flag}</span>
                <div>
                  <h3 className="font-semibold text-white">{vault.name}</h3>
                  <p className="text-sm text-slate-400">{vault.location}, {vault.country}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{t.operator}</span>
                  <span className="text-sm text-white">{vault.operator}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{t.holdings}</span>
                  <span className="text-sm text-[#2F6F62] font-semibold">{vault.currentHoldings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{t.insurance}</span>
                  <span className="text-sm text-white">{vault.insurance.split(' - ')[1]}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {vault.certification.slice(0, 2).map((cert, i) => (
                  <span key={i} className="px-2 py-1 text-xs bg-[#BFA181]/10 text-[#BFA181] rounded">
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Features */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-xl font-semibold text-white mb-6">{t.securityStandards}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#2F6F62]/10 to-[#2F6F62]/5 border border-[#2F6F62]/20">
            <div className="w-12 h-12 rounded-xl bg-[#2F6F62]/20 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-[#2F6F62]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t.physicalSecurity}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> {t.armedSecurity}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> {t.biometricAccess}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> {t.blastProofDoors}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#2F6F62]" /> {t.undergroundStorage}</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
              <Key className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t.accessControl}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> {t.multiSigAuth}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> {t.timeLockedAccess}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> {t.segregatedStorage}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-blue-400" /> {t.dualKeyAuth}</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t.monitoring}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> {t.realtimeCCTV}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> {t.seismicMonitoring}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> {t.environmentalControls}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-purple-400" /> {t.inventoryTracking}</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#BFA181]/10 to-[#BFA181]/80/5 border border-[#BFA181]/20">
            <div className="w-12 h-12 rounded-xl bg-[#BFA181]/20 flex items-center justify-center mb-4">
              <Building className="w-6 h-6 text-[#BFA181]" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{t.insuranceCompliance}</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#BFA181]" /> {t.totalInsurance}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#BFA181]" /> {t.lbmaCertified}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#BFA181]" /> {t.soc2Compliant}</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-[#BFA181]" /> {t.regularAudits}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Vault Detail Modal */}
      {selectedVault && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedVault(null)}>
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedVault.flag}</span>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedVault.name}</h2>
                  <p className="text-slate-400">{selectedVault.location}, {selectedVault.country}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">{t.operator}</p>
                <p className="text-white">{selectedVault.operator}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">{t.certifications}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedVault.certification.map((cert, i) => (
                    <span key={i} className="px-2 py-1 text-xs bg-[#2F6F62]/10 text-[#2F6F62] rounded">{cert}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">{t.securityFeatures}</p>
                <ul className="space-y-1">
                  {selectedVault.securityFeatures.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-white">
                      <CheckCircle className="w-3 h-3 text-[#2F6F62]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-400 mb-1">{t.capacity}</p>
                  <p className="text-white font-semibold">{selectedVault.capacity}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">{t.currentHoldings}</p>
                  <p className="text-[#2F6F62] font-semibold">{selectedVault.currentHoldings}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">{t.insurance}</p>
                <p className="text-white">{selectedVault.insurance}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-1">{t.lastInspection}</p>
                <p className="text-white">{new Date(selectedVault.lastInspection).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-800">
              <button
                onClick={() => setSelectedVault(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
