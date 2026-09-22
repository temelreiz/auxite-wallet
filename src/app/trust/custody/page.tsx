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
    vaultLocations: "Hedeflenen Kasa Konumları",
    securityFeatures: "Güvenlik Özellikleri",
    insuranceCoverage: "Sigorta Durumu",
    custodyPartners: "Saklama Ortakları",
    launchPhaseNotice: "Launch Phase Bildirimi",
    launchPhaseDesc: "Auxite launch aşamasındadır. Şu an itibarıyla imzalanmış bir saklama (custody) veya sigorta sözleşmesi bulunmamaktadır; aşağıdaki konumlar hedeflenen saklama konumlarıdır, faal tesis beyanı değildir. Saklama ve sigorta anlaşmaları imzalandığında karşı tarafların adları, sözleşme kapsamları ve doğrulama belgeleri bu sayfada yayınlanacaktır.",
    zurich: "Zürih, İsviçre",
    istanbul: "İstanbul, Türkiye",
    london: "Londra, İngiltere",
    dubai: "Dubai, BAE",
    security247: "7/24 Güvenlik",
    biometricAccess: "Biyometrik Erişim",
    armoredVaults: "Zırhlı Kasalar",
    fullInsurance: "Tam Sigorta",
    vaultCapacity: "Kasa Kapasitesi",
    securityLevel: "Güvenlik Seviyesi",
    comingSoon: "Yakında",
    maximum: "Maksimum",
    lbmaCertified: "LBMA Sertifikalı",
    bistApproved: "Borsa İstanbul Onaylı",
    dmccCertified: "DMCC Sertifikalı",
  },
  en: {
    title: "Custody Security",
    subtitle: "How your physical metal assets are kept safe",
    backToTrust: "Back to Trust Center",
    vaultLocations: "Target Vault Locations",
    securityFeatures: "Security Features",
    insuranceCoverage: "Insurance Status",
    custodyPartners: "Custody Partners",
    launchPhaseNotice: "Launch Phase Notice",
    launchPhaseDesc: "Auxite is in its launch phase. As of today no custody or insurance agreement has been executed. The locations below are target custody locations, not a representation of active facilities. Once custody and insurance agreements are signed, the counterparty names, scope and verification documents will be published on this page.",
    zurich: "Zurich, Switzerland",
    istanbul: "Istanbul, Turkey",
    london: "London, UK",
    dubai: "Dubai, UAE",
    security247: "24/7 Security",
    biometricAccess: "Biometric Access",
    armoredVaults: "Armored Vaults",
    fullInsurance: "Full Insurance",
    vaultCapacity: "Vault Capacity",
    securityLevel: "Security Level",
    comingSoon: "Coming Soon",
    maximum: "Maximum",
    lbmaCertified: "LBMA Certified",
    bistApproved: "Borsa Istanbul Approved",
    dmccCertified: "DMCC Certified",
  },
};

const vaultLocations = [
  { 
    city: "zurich", 
    country: "Switzerland", 
    flag: "🇨🇭", 
    metals: ["Gold", "Platinum"],
    security: "maximum",
    color: "from-red-500 to-red-600"
  },
  {
    city: "istanbul",
    country: "Turkey",
    flag: "🇹🇷",
    metals: ["Gold", "Silver"],
    security: "maximum",
    color: "from-red-600 to-white"
  },
  { 
    city: "london", 
    country: "UK", 
    flag: "🇬🇧", 
    metals: ["Gold", "Silver", "Platinum"],
    security: "maximum",
    color: "from-blue-600 to-red-600"
  },
  { 
    city: "dubai", 
    country: "UAE", 
    flag: "🇦🇪", 
    metals: ["Gold", "Palladium"],
    security: "maximum",
    color: "from-green-600 to-red-600"
  },
];

const securityFeatures = [
  { icon: "🔒", titleKey: "security247", desc: "Armed guards and surveillance" },
  { icon: "👆", titleKey: "biometricAccess", desc: "Multi-factor authentication" },
  { icon: "🏦", titleKey: "armoredVaults", desc: "Military-grade protection" },
];

export default function CustodyPage() {
  const { lang } = useLanguage();
  const t = translations[lang as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Back Link */}
        <Link href="/trust-center" className="inline-flex items-center gap-2 text-[#2F6F62] dark:text-[#2F6F62] hover:underline mb-6">
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
        <div className="bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#BFA181] dark:text-[#BFA181] mb-1">{t.launchPhaseNotice}</h3>
              <p className="text-[#BFA181] dark:text-[#BFA181] text-sm">{t.launchPhaseDesc}</p>
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
                  
                  <div className="text-sm">
                    <p className="text-slate-500 dark:text-slate-400">{t.comingSoon}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insurance Info */}
        <div className="bg-gradient-to-r from-[#2F6F62]/10 to-blue-500/10 rounded-xl p-8 border border-[#2F6F62]/20">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-[#2F6F62]/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-7 h-7 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.insuranceCoverage}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                {lang === "tr"
                  ? "Şu an itibarıyla yürürlükte olan bir metal sigorta poliçesi bulunmamaktadır. Sigorta kapsamı, saklama sağlayıcısı sözleşmesi ile birlikte kurulacaktır; poliçe yürürlüğe girdiğinde sigortacı adı, kapsamı ve limiti burada yayınlanacaktır."
                  : "No metal insurance policy is currently in force. Insurance coverage will be put in place together with the custody provider agreement; once a policy is bound, the insurer, scope and limit will be published here."
                }
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
