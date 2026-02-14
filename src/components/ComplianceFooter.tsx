"use client";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    compliance: "Uyumluluk",
    riskDisclosure: "Risk Bildirimi",
    custodyFramework: "Saklama Politikası",
    amlPolicy: "AML Politikası",
    dataSecurity: "Veri Güvenliği",
    privacyPolicy: "Gizlilik Politikası",
    terms: "Kullanım Koşulları",
    allRightsReserved: "Tüm hakları saklıdır.",
    institutionalText: "Auxite, kurumsal karşı taraflar ve küresel mali piyasa katılımcıları tarafından beklenen uyumluluk standartlarında faaliyet göstermeye kararlıdır.",
  },
  en: {
    compliance: "Compliance",
    riskDisclosure: "Risk Disclosure",
    custodyFramework: "Custody Framework",
    amlPolicy: "AML Policy",
    dataSecurity: "Data Security",
    privacyPolicy: "Privacy Policy",
    terms: "Terms of Service",
    allRightsReserved: "All rights reserved.",
    institutionalText: "Auxite is committed to operating at the compliance standards expected by institutional counterparties and global financial market participants.",
  },
  de: {
    compliance: "Compliance",
    riskDisclosure: "Risikoaufklärung",
    custodyFramework: "Verwahrungsrahmenwerk",
    amlPolicy: "AML-Richtlinie",
    dataSecurity: "Datensicherheit",
    privacyPolicy: "Datenschutzrichtlinie",
    terms: "Nutzungsbedingungen",
    allRightsReserved: "Alle Rechte vorbehalten.",
    institutionalText: "Auxite verpflichtet sich, die Compliance-Standards zu erfüllen, die von institutionellen Gegenparteien und globalen Finanzmarktteilnehmern erwartet werden.",
  },
  fr: {
    compliance: "Conformité",
    riskDisclosure: "Déclaration de Risques",
    custodyFramework: "Cadre de Conservation",
    amlPolicy: "Politique AML",
    dataSecurity: "Sécurité des Données",
    privacyPolicy: "Politique de Confidentialité",
    terms: "Conditions d'Utilisation",
    allRightsReserved: "Tous droits réservés.",
    institutionalText: "Auxite s'engage à opérer aux standards de conformité attendus par les contreparties institutionnelles et les participants des marchés financiers mondiaux.",
  },
  ar: {
    compliance: "الامتثال",
    riskDisclosure: "إفصاح المخاطر",
    custodyFramework: "إطار الحفظ",
    amlPolicy: "سياسة مكافحة غسل الأموال",
    dataSecurity: "أمن البيانات",
    privacyPolicy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
    allRightsReserved: "جميع الحقوق محفوظة.",
    institutionalText: "تلتزم Auxite بالعمل وفق معايير الامتثال المتوقعة من الأطراف المقابلة المؤسسية والمشاركين في الأسواق المالية العالمية.",
  },
  ru: {
    compliance: "Соответствие",
    riskDisclosure: "Раскрытие рисков",
    custodyFramework: "Система хранения",
    amlPolicy: "Политика AML",
    dataSecurity: "Безопасность данных",
    privacyPolicy: "Политика конфиденциальности",
    terms: "Условия использования",
    allRightsReserved: "Все права защищены.",
    institutionalText: "Auxite стремится работать в соответствии со стандартами соответствия, ожидаемыми институциональными контрагентами и участниками глобальных финансовых рынков.",
  },
};

const complianceLinks = [
  { key: "riskDisclosure", href: "/legal/risk-disclosure" },
  { key: "custodyFramework", href: "/legal/custody" },
  { key: "amlPolicy", href: "/legal/aml" },
  { key: "dataSecurity", href: "/legal/data-security" },
  { key: "privacyPolicy", href: "/legal/privacy" },
  { key: "terms", href: "/legal/terms" },
];

export default function ComplianceFooter() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Compliance Links */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#BFA181] mb-3">
            {t.compliance}
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {complianceLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                {t[link.key as keyof typeof t]}
              </Link>
            ))}
          </div>
        </div>

        {/* Institutional Statement */}
        <div className="border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-500 max-w-3xl">
            {t.institutionalText}
          </p>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#BFA181]/15 flex items-center justify-center">
                <svg className="w-3 h-3 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 tracking-widest font-medium">AUXITE</span>
            </div>
            <p className="text-xs text-slate-600">
              &copy; {new Date().getFullYear()} Auxite. {t.allRightsReserved}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
