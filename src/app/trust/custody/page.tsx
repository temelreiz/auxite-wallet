"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const translations = {
  tr: {
    title: "Saklama Güvenliği",
    subtitle: "Fiziksel metal varlıklarınız nasıl güvende tutulur",
    backToTrust: "Güven Merkezine Dön",
    vaultLocations: "Kasa Konumları",
    securityFeatures: "Güvenlik Özellikleri",
    insuranceCoverage: "Sigorta Kapsamı",
    custodyPartners: "Saklama Ortakları",
    launchPhaseNotice: "Launch Phase Bildirimi",
    launchPhaseDesc: "Platform şu anda launch aşamasındadır. Saklama detayları canlı yayına geçtiğinde güncellenecektir.",
    zurich: "Zürih, İsviçre",
    singapore: "Singapur",
    london: "Londra, İngiltere",
    dubai: "Dubai, BAE",
    security247: "7/24 Güvenlik",
    biometricAccess: "Biyometrik Erişim",
    armoredVaults: "Zırhlı Kasalar",
    fullInsurance: "Tam Sigorta",
    vaultCapacity: "Kasa Kapasitesi",
    securityLevel: "Güvenlik Seviyesi",
    certification: "Sertifikasyon",
    comingSoon: "Yakında",
    maximum: "Maksimum",
    lbmaCertified: "LBMA Sertifikalı",
    sgxCertified: "SGX Sertifikalı",
    dmccCertified: "DMCC Sertifikalı",
  },
  en: {
    title: "Custody Security",
    subtitle: "How your physical metal assets are kept safe",
    backToTrust: "Back to Trust Center",
    vaultLocations: "Vault Locations",
    securityFeatures: "Security Features",
    insuranceCoverage: "Insurance Coverage",
    custodyPartners: "Custody Partners",
    launchPhaseNotice: "Launch Phase Notice",
    launchPhaseDesc: "Platform is currently in launch phase. Custody details will be updated once we go live.",
    zurich: "Zurich, Switzerland",
    singapore: "Singapore",
    london: "London, UK",
    dubai: "Dubai, UAE",
    security247: "24/7 Security",
    biometricAccess: "Biometric Access",
    armoredVaults: "Armored Vaults",
    fullInsurance: "Full Insurance",
    vaultCapacity: "Vault Capacity",
    securityLevel: "Security Level",
    certification: "Certification",
    comingSoon: "Coming Soon",
    maximum: "Maximum",
    lbmaCertified: "LBMA Certified",
    sgxCertified: "SGX Certified",
    dmccCertified: "DMCC Certified",
  },
};

const vaultLocations = [
  { 
    city: "zurich", 
    country: "Switzerland", 
    flag: "🇨🇭", 
    metals: ["Gold", "Platinum"],
    capacity: "10,000 kg",
    security: "maximum",
    certification: "lbmaCertified",
    color: "from-red-500 to-red-600"
  },
  { 
    city: "singapore", 
    country: "Singapore", 
    flag: "🇸🇬", 
    metals: ["Gold", "Silver"],
    capacity: "15,000 kg",
    security: "maximum",
    certification: "sgxCertified",
    color: "from-red-600 to-white"
  },
  { 
    city: "london", 
    country: "UK", 
    flag: "🇬🇧", 
    metals: ["Gold", "Silver", "Platinum"],
    capacity: "20,000 kg",
    security: "maximum",
    certification: "lbmaCertified",
    color: "from-blue-600 to-red-600"
  },
  { 
    city: "dubai", 
    country: "UAE", 
    flag: "🇦🇪", 
    metals: ["Gold", "Palladium"],
    capacity: "8,000 kg",
    security: "maximum",
    certification: "dmccCertified",
    color: "from-green-600 to-red-600"
  },
];

const securityFeatures = [
  { icon: "🔒", titleKey: "security247", desc: "Armed guards and surveillance" },
  { icon: "👆", titleKey: "biometricAccess", desc: "Multi-factor authentication" },
  { icon: "🏦", titleKey: "armoredVaults", desc: "Military-grade protection" },
  { icon: "📋", titleKey: "fullInsurance", desc: "Lloyd's of London coverage" },
];

export default function CustodyPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

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

        {/* Launch Phase Notice */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-1">{t.launchPhaseNotice}</h3>
              <p className="text-amber-600 dark:text-amber-300 text-sm">{t.launchPhaseDesc}</p>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{t.securityFeatures}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {securityFeatures.map((feature, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-stone-200 dark:border-slate-800 text-center">
                <div className="text-4xl mb-3">{feature.icon}</div>
                <h3 className="font-medium text-slate-800 dark:text-white mb-1">{t[feature.titleKey as keyof typeof t]}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Vault Locations */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">{t.vaultLocations}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {vaultLocations.map((vault) => (
              <div key={vault.city} className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${vault.color}`} />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{vault.flag}</span>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{t[vault.city as keyof typeof t]}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{vault.metals.join(", ")}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.vaultCapacity}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{vault.capacity}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.securityLevel}</p>
                      <p className="font-medium text-emerald-500">{t[vault.security as keyof typeof t]}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">{t.certification}</p>
                      <p className="font-medium text-slate-800 dark:text-white">{t[vault.certification as keyof typeof t]}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insurance Info */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl p-8 border border-emerald-500/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.insuranceCoverage}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {lang === "tr" 
                  ? "Tüm fiziksel metal varlıkları, Lloyd's of London tarafından tam değer üzerinden sigortalanmıştır. Bu, hırsızlık, doğal afetler ve diğer risklere karşı koruma sağlar."
                  : "All physical metal assets are fully insured at full value by Lloyd's of London. This provides protection against theft, natural disasters, and other risks."
                }
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
