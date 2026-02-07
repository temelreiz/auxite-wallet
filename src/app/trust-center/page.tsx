"use client";

import { useState } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// TRUST CENTER - Institutional Deep Architecture
// Not just "transparency" - Deep Institutional Trust
// ============================================

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Güven Merkezi",
    subtitle: "Kurumsal şeffaflık, saklama güvenceleri ve düzenleyici uyumluluk",
    // Core Principles
    coreArchitecture: "Temel Mimari",
    segregatedCustody: "Ayrılmış Saklama",
    segregatedCustodyDesc: "Müşteri varlıkları asla kurumsal fonlarla birleştirilmez. Her tahsis bağımsız olarak kaydedilir ve doğrulanabilir.",
    noRehypothecation: "Yeniden İpotek Yok",
    noRehypothecationDesc: "Müşteri varlıkları asla yeniden ipoteklenmez. Varlıklarınız her zaman sadece size aittir.",
    fullAllocation: "Tam Tahsis",
    fullAllocationDesc: "Tüm değerli metaller %100 fiziksel olarak tahsis edilmiş ve seri numaralı külçe bazında ayrılmıştır.",
    // Custody
    custodyNetwork: "Saklama Ağı",
    zurichVault: "Zürih Kasası",
    zurichVaultDesc: "İsviçre'nin en güvenli kasalarında, en yüksek güvenlik standartlarıyla saklama.",
    singaporeVault: "Singapur Kasası",
    singaporeVaultDesc: "Asya-Pasifik bölgesi için optimize edilmiş, uluslararası standartlarda saklama.",
    dubaiVault: "Dubai Kasası",
    dubaiVaultDesc: "DMCC lisanslı tesislerde, Orta Doğu ve Afrika için stratejik konum.",
    // Verification
    verification: "Doğrulama Sistemleri",
    proofOfReserves: "Rezerv Kanıtı",
    proofOfReservesDesc: "Gerçek zamanlı doğrulama ile toplam metal varlıklarını görüntüleyin.",
    auditReports: "Denetim Raporları",
    auditReportsDesc: "Bağımsız üçüncü taraf denetim sonuçlarına erişin.",
    certificateVerify: "Sertifika Doğrulama",
    certificateVerifyDesc: "Tahsis sertifikalarınızın orijinalliğini doğrulayın.",
    // Settlement
    settlementArchitecture: "Takas Mimarisi",
    auxmSettlement: "AUXM Takas Birimi",
    auxmSettlementDesc: "AUXM, Auxite altyapısı içinde yalnızca takas amaçlı kullanılan dahili bir birimdir. Kripto para veya stablecoin değildir.",
    settlementFlow: "Takas Akışı",
    settlementFlowDesc: "Fon Yatırma → AUXM Kredilendirme → Metal Tahsisi. Tüm tahsisler takas edilmiş sermaye ile yapılır.",
    settlementFinality: "Takas Kesinliği",
    settlementFinalityDesc: "Bir kez tahsis edildikten sonra, pozisyonunuz nihai ve geri alınamaz. Takas kesinliği kurumsal standartta garantilenir.",
    // Compliance
    compliance: "Düzenleyici Uyumluluk",
    amlKyc: "AML/KYC Prosedürleri",
    amlKycDesc: "Uluslararası kara para aklama önleme ve müşterini tanı standartlarına tam uyum.",
    dataProtection: "Veri Koruma",
    dataProtectionDesc: "GDPR ve uluslararası veri koruma standartlarına uygun veri işleme.",
    regulatoryReporting: "Düzenleyici Raporlama",
    regulatoryReportingDesc: "Gerekli yetki bölgelerinde düzenleyici raporlama yükümlülüklerine uyum.",
    // What Auxite Is
    whatIsAuxite: "Auxite Nedir — ve Ne Değildir",
    auxiteIs: "Auxite şudur:",
    auxiteIsNot: "Auxite değildir:",
    isDigitalPlatform: "Tahsisli değerli metalleri yönetmek için dijital bir platform",
    isRwaInfrastructure: "Şeffaflık öncelikli bir RWA altyapısı",
    isCustodyTech: "Kurumsal seviye saklama teknolojisi",
    notBank: "Bir banka",
    notStablecoin: "Bir stablecoin ihraççısı",
    notSecurities: "Bir menkul kıymet ihraççısı",
    notYieldGuarantee: "Getiri garantisi veren bir ürün",
    // Documents
    legalDocuments: "Yasal Belgeler",
    termsOfService: "Kullanım Koşulları",
    redemptionPolicy: "İtfa Politikası",
    privacyPolicy: "Gizlilik Politikası",
    // CTA
    verifyCertificate: "Sertifika Doğrula",
    verifyCertificateDesc: "Auxite dijital sertifikasının gerçekliğini ve geçerliliğini doğrulayın",
    goToVerification: "Doğrulama Sayfasına Git",
    viewReserves: "Rezervleri Görüntüle",
    viewAudits: "Denetimleri Görüntüle",
    viewCustody: "Saklama Detayları",
  },
  en: {
    title: "Trust Center",
    subtitle: "Institutional transparency, custody assurances, and regulatory compliance",
    // Core Principles
    coreArchitecture: "Core Architecture",
    segregatedCustody: "Segregated Custody",
    segregatedCustodyDesc: "Client assets are never commingled with corporate funds. Every allocation is independently recorded and verifiable.",
    noRehypothecation: "No Rehypothecation",
    noRehypothecationDesc: "Client assets are never rehypothecated. Your assets always belong solely to you.",
    fullAllocation: "Full Allocation",
    fullAllocationDesc: "All precious metals are 100% physically allocated and segregated by serial-numbered bar.",
    // Custody
    custodyNetwork: "Custody Network",
    zurichVault: "Zurich Vault",
    zurichVaultDesc: "Stored in Switzerland's most secure vaults with the highest security standards.",
    singaporeVault: "Singapore Vault",
    singaporeVaultDesc: "Optimized for Asia-Pacific region with international-grade custody.",
    dubaiVault: "Dubai Vault",
    dubaiVaultDesc: "DMCC-licensed facilities, strategically positioned for Middle East and Africa.",
    // Verification
    verification: "Verification Systems",
    proofOfReserves: "Proof of Reserves",
    proofOfReservesDesc: "View total metal holdings with real-time verification.",
    auditReports: "Audit Reports",
    auditReportsDesc: "Access independent third-party audit results.",
    certificateVerify: "Certificate Verification",
    certificateVerifyDesc: "Verify the authenticity of your allocation certificates.",
    // Settlement
    settlementArchitecture: "Settlement Architecture",
    auxmSettlement: "AUXM Settlement Unit",
    auxmSettlementDesc: "AUXM is an internal unit used exclusively for settlement within the Auxite infrastructure. It is not a cryptocurrency or stablecoin.",
    settlementFlow: "Settlement Flow",
    settlementFlowDesc: "Fund Deposit → AUXM Credit → Metal Allocation. All allocations are made with settled capital.",
    settlementFinality: "Settlement Finality",
    settlementFinalityDesc: "Once allocated, your position is final and irrevocable. Settlement finality is guaranteed at institutional standard.",
    // Compliance
    compliance: "Regulatory Compliance",
    amlKyc: "AML/KYC Procedures",
    amlKycDesc: "Full compliance with international anti-money laundering and know-your-customer standards.",
    dataProtection: "Data Protection",
    dataProtectionDesc: "GDPR-compliant and international data protection standard processing.",
    regulatoryReporting: "Regulatory Reporting",
    regulatoryReportingDesc: "Compliance with regulatory reporting obligations in required jurisdictions.",
    // What Auxite Is
    whatIsAuxite: "What Auxite Is — and Is Not",
    auxiteIs: "Auxite is:",
    auxiteIsNot: "Auxite is not:",
    isDigitalPlatform: "A digital platform for administering allocated precious metals",
    isRwaInfrastructure: "A transparency-first RWA infrastructure",
    isCustodyTech: "Institutional-grade custody technology",
    notBank: "A bank",
    notStablecoin: "A stablecoin issuer",
    notSecurities: "A securities issuer",
    notYieldGuarantee: "A yield-guaranteeing product",
    // Documents
    legalDocuments: "Legal Documents",
    termsOfService: "Terms of Service",
    redemptionPolicy: "Redemption Policy",
    privacyPolicy: "Privacy Policy",
    // CTA
    verifyCertificate: "Verify Certificate",
    verifyCertificateDesc: "Verify the authenticity and validity of an Auxite digital certificate",
    goToVerification: "Go to Verification Page",
    viewReserves: "View Reserves",
    viewAudits: "View Audits",
    viewCustody: "Custody Details",
  },
};

export default function TrustCenterPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [activeTab, setActiveTab] = useState<"architecture" | "custody" | "settlement" | "compliance">("architecture");

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-1">
            {[
              { key: "architecture", label: t.coreArchitecture, icon: "🏛" },
              { key: "custody", label: t.custodyNetwork, icon: "🏦" },
              { key: "settlement", label: t.settlementArchitecture, icon: "💎" },
              { key: "compliance", label: t.compliance, icon: "📋" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? "bg-emerald-500 text-white"
                    : "text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800"
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mb-12">
          {/* Architecture Tab */}
          {activeTab === "architecture" && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.segregatedCustody}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.segregatedCustodyDesc}</p>
                <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Assets never commingled with corporate funds
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.noRehypothecation}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.noRehypothecationDesc}</p>
                <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    ✓ Client assets are never rehypothecated
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.fullAllocation}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.fullAllocationDesc}</p>
                <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    ✓ 100% physically allocated
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Custody Tab */}
          {activeTab === "custody" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🇨🇭</span>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{t.zurichVault}</h3>
                      <p className="text-xs text-slate-500">Primary Vault</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.zurichVaultDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-600">LBMA Approved</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600">ISO 9001</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🇸🇬</span>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{t.singaporeVault}</h3>
                      <p className="text-xs text-slate-500">APAC Hub</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.singaporeVaultDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-600">MAS Regulated</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600">Freeport Zone</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🇦🇪</span>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{t.dubaiVault}</h3>
                      <p className="text-xs text-slate-500">MENA Hub</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.dubaiVaultDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-600">DMCC Licensed</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600">Sharia Compliant</span>
                  </div>
                </div>
              </div>

              {/* Verification Links */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.verification}</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link href="/trust/reserves" className="p-4 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-emerald-500 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-emerald-500">{t.proofOfReserves}</p>
                        <p className="text-xs text-slate-500">{t.proofOfReservesDesc}</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/trust/audits" className="p-4 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-emerald-500 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧾</span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-emerald-500">{t.auditReports}</p>
                        <p className="text-xs text-slate-500">{t.auditReportsDesc}</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/verify" className="p-4 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-emerald-500 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔍</span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-emerald-500">{t.certificateVerify}</p>
                        <p className="text-xs text-slate-500">{t.certificateVerifyDesc}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Settlement Tab */}
          {activeTab === "settlement" && (
            <div className="space-y-6">
              {/* Settlement Architecture */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-6">{t.settlementArchitecture}</h3>

                {/* Settlement Flow Diagram */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                  <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-center">
                    <p className="text-xs text-slate-500 mb-1">Step 1</p>
                    <p className="font-medium text-slate-800 dark:text-white">Fund Deposit</p>
                    <p className="text-xs text-slate-500">USDC/USDT/BTC/ETH</p>
                  </div>
                  <svg className="w-6 h-6 text-emerald-500 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-center">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Step 2</p>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">AUXM Credit</p>
                    <p className="text-xs text-emerald-600/70">Settled Capital</p>
                  </div>
                  <svg className="w-6 h-6 text-emerald-500 rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-lg text-center">
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Step 3</p>
                    <p className="font-semibold text-amber-600 dark:text-amber-400">Metal Allocation</p>
                    <p className="text-xs text-amber-600/70">AUXG/AUXS/AUXPT</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">{t.auxmSettlement}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.auxmSettlementDesc}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">{t.settlementFlow}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.settlementFlowDesc}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <h4 className="font-medium text-slate-800 dark:text-white mb-2">{t.settlementFinality}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.settlementFinalityDesc}</p>
                  </div>
                </div>
              </div>

              {/* AUXM Disclaimer */}
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">AUXM Settlement Unit</p>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                      AUXM is an internal settlement unit used exclusively within the Auxite infrastructure. It is denominated in USD value for settlement purposes only. It is not a cryptocurrency, stablecoin, or transferable asset outside the Auxite ecosystem.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compliance Tab */}
          {activeTab === "compliance" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.amlKyc}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t.amlKycDesc}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.dataProtection}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t.dataProtectionDesc}</p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.regulatoryReporting}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{t.regulatoryReportingDesc}</p>
                </div>
              </div>

              {/* Legal Documents */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.legalDocuments}</h3>
                <div className="flex flex-wrap gap-3">
                  <Link href="/legal/terms" className="px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
                    📄 {t.termsOfService}
                  </Link>
                  <Link href="/legal/redemption" className="px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
                    📄 {t.redemptionPolicy}
                  </Link>
                  <Link href="/legal" className="px-4 py-2 bg-stone-100 dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
                    📄 {t.privacyPolicy}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What Auxite Is / Is Not */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-6">⚖️ {t.whatIsAuxite}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-emerald-100">{t.auxiteIs}</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-200">✓</span>
                  <span>{t.isDigitalPlatform}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-200">✓</span>
                  <span>{t.isRwaInfrastructure}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-200">✓</span>
                  <span>{t.isCustodyTech}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-emerald-100">{t.auxiteIsNot}</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{t.notBank}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{t.notStablecoin}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{t.notSecurities}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{t.notYieldGuarantee}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Verify Certificate CTA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">🔍 {t.verifyCertificate}</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{t.verifyCertificateDesc}</p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
          >
            {t.goToVerification}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
