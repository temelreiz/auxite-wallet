"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    pageTitle: "Yasal Belgeler ve Uyumluluk",
    pageSubtitle: "Auxite platform politikaları, uyumluluk çerçeveleri ve yasal belgeler",
    updated: "Güncelleme",
    institutionalBanner: "Auxite, kurumsal karşı taraflar ve küresel mali piyasa katılımcıları tarafından beklenen uyumluluk standartlarında faaliyet göstermeye kararlıdır.",
  },
  en: {
    pageTitle: "Legal Documents & Compliance",
    pageSubtitle: "Auxite platform policies, compliance frameworks, and legal documentation",
    updated: "Updated",
    institutionalBanner: "Auxite is committed to operating at the compliance standards expected by institutional counterparties and global financial market participants.",
  },
  de: {
    pageTitle: "Rechtliche Dokumente & Compliance",
    pageSubtitle: "Auxite Plattformrichtlinien, Compliance-Rahmenwerke und rechtliche Dokumentation",
    updated: "Aktualisiert",
    institutionalBanner: "Auxite verpflichtet sich, die Compliance-Standards zu erfüllen, die von institutionellen Gegenparteien und globalen Finanzmarktteilnehmern erwartet werden.",
  },
  fr: {
    pageTitle: "Documents Juridiques & Conformité",
    pageSubtitle: "Politiques de la plateforme Auxite, cadres de conformité et documentation juridique",
    updated: "Mis à jour",
    institutionalBanner: "Auxite s'engage à opérer aux standards de conformité attendus par les contreparties institutionnelles et les participants des marchés financiers mondiaux.",
  },
  ar: {
    pageTitle: "الوثائق القانونية والامتثال",
    pageSubtitle: "سياسات منصة Auxite وأطر الامتثال والوثائق القانونية",
    updated: "محدث",
    institutionalBanner: "تلتزم Auxite بالعمل وفق معايير الامتثال المتوقعة من الأطراف المقابلة المؤسسية والمشاركين في الأسواق المالية العالمية.",
  },
  ru: {
    pageTitle: "Правовые документы и соответствие",
    pageSubtitle: "Политики платформы Auxite, нормативные рамки и правовая документация",
    updated: "Обновлено",
    institutionalBanner: "Auxite стремится работать в соответствии со стандартами соответствия, ожидаемыми институциональными контрагентами и участниками глобальных финансовых рынков.",
  },
};

const legalDocs = [
  {
    title: "Terms of Service",
    titleTr: "Kullanım Koşulları",
    titleDe: "Nutzungsbedingungen",
    titleFr: "Conditions d'Utilisation",
    titleAr: "شروط الخدمة",
    titleRu: "Условия использования",
    description: "Platform usage terms, token and certificate definitions, liability limitations",
    descriptionTr: "Platform kullanım koşulları, token ve sertifika tanımları, sorumluluk sınırlamaları",
    href: "/legal/terms",
    icon: "📜",
    updated: "December 20, 2025",
    category: "legal",
  },
  {
    title: "Redemption Policy",
    titleTr: "Geri Ödeme Politikası",
    titleDe: "Einlösungsrichtlinie",
    titleFr: "Politique de Rachat",
    titleAr: "سياسة الاسترداد",
    titleRu: "Политика погашения",
    description: "Physical metal redemption terms, eligibility, fees, and delivery process",
    descriptionTr: "Fiziksel metal geri ödeme koşulları, uygunluk, ücretler ve teslimat süreci",
    href: "/legal/redemption",
    icon: "📦",
    updated: "December 20, 2025",
    category: "legal",
  },
  {
    title: "AML & CFT Policy",
    titleTr: "AML ve CFT Politikası",
    titleDe: "AML- und CFT-Richtlinie",
    titleFr: "Politique AML et CFT",
    titleAr: "سياسة مكافحة غسل الأموال وتمويل الإرهاب",
    titleRu: "Политика AML и CFT",
    description: "Anti-money laundering and counter-terrorist financing compliance framework",
    descriptionTr: "Kara para aklama ve terörizmin finansmanının önlenmesi uyumluluk çerçevesi",
    href: "/legal/aml",
    icon: "🛡️",
    updated: "February 14, 2026",
    category: "compliance",
  },
  {
    title: "Risk Disclosure",
    titleTr: "Risk Açıklaması",
    titleDe: "Risikoaufklärung",
    titleFr: "Déclaration de Risques",
    titleAr: "إفصاح المخاطر",
    titleRu: "Раскрытие рисков",
    description: "Investment risks, market conditions, custody and technology risk factors",
    descriptionTr: "Yatırım riskleri, piyasa koşulları, saklama ve teknoloji risk faktörleri",
    href: "/legal/risk-disclosure",
    icon: "⚠️",
    updated: "February 14, 2026",
    category: "compliance",
  },
  {
    title: "Custody Framework",
    titleTr: "Saklama Çerçevesi",
    titleDe: "Verwahrungsrahmenwerk",
    titleFr: "Cadre de Conservation",
    titleAr: "إطار الحفظ",
    titleRu: "Система хранения",
    description: "Asset segregation, allocated ownership, no rehypothecation, independent vaulting",
    descriptionTr: "Varlık ayrımı, tahsisli mülkiyet, yeniden rehin yasağı, bağımsız kasalama",
    href: "/legal/custody",
    icon: "🏦",
    updated: "February 14, 2026",
    category: "compliance",
  },
  {
    title: "Data Security",
    titleTr: "Veri Güvenliği",
    titleDe: "Datensicherheit",
    titleFr: "Sécurité des Données",
    titleAr: "أمن البيانات",
    titleRu: "Безопасность данных",
    description: "Infrastructure protection, access control, encryption and incident response",
    descriptionTr: "Altyapı koruması, erişim kontrolü, şifreleme ve olay müdahalesi",
    href: "/legal/data-security",
    icon: "🔒",
    updated: "February 14, 2026",
    category: "security",
  },
  {
    title: "Privacy Policy",
    titleTr: "Gizlilik Politikası",
    titleDe: "Datenschutzrichtlinie",
    titleFr: "Politique de Confidentialité",
    titleAr: "سياسة الخصوصية",
    titleRu: "Политика конфиденциальности",
    description: "Personal data protection, GDPR alignment, client rights, data retention",
    descriptionTr: "Kişisel veri koruması, GDPR uyumu, müşteri hakları, veri saklama",
    href: "/legal/privacy",
    icon: "🔐",
    updated: "February 14, 2026",
    category: "security",
  },
];

function getTitle(doc: typeof legalDocs[0], lang: string) {
  switch (lang) {
    case 'tr': return doc.titleTr;
    case 'de': return doc.titleDe;
    case 'fr': return doc.titleFr;
    case 'ar': return doc.titleAr;
    case 'ru': return doc.titleRu;
    default: return doc.title;
  }
}

export default function LegalPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            {t.pageTitle}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {t.pageSubtitle}
          </p>
        </header>

        {/* Institutional Trust Banner */}
        <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl p-4 mb-8">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200 text-center">
            {t.institutionalBanner}
          </p>
        </div>

        <div className="grid gap-4">
          {legalDocs.map((doc) => (
            <Link key={doc.href} href={doc.href} className="block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 hover:border-[#2F6F62] hover:shadow-lg transition-all">
              <div className="flex items-start gap-4">
                <span className="text-3xl">{doc.icon}</span>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white">{getTitle(doc, lang)}</h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{lang === 'tr' ? doc.descriptionTr : doc.description}</p>
                  <p className="text-xs text-slate-400 mt-2">{t.updated}: {doc.updated}</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <ComplianceFooter />
    </div>
  );
}
