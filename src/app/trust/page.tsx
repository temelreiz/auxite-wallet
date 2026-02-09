"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const trustSections = [
  {
    title: "Proof of Reserves",
    titleTr: "Rezerv Kanıtı",
    description: "Real-time verification of physical metal backing all Auxite tokens",
    descriptionTr: "Tüm Auxite tokenlarını destekleyen fiziksel metalin gerçek zamanlı doğrulaması",
    href: "/trust/reserves",
    icon: "📊",
    color: "emerald",
  },
  {
    title: "Custody Information",
    titleTr: "Saklama Bilgileri",
    description: "Details about our approved custodians and vault locations",
    descriptionTr: "Onaylı saklama kuruluşları ve kasa lokasyonları hakkında detaylar",
    href: "/trust/custody",
    icon: "🏦",
    color: "blue",
  },
  {
    title: "Audit Reports",
    titleTr: "Denetim Raporları",
    description: "Third-party independent audit results and verification",
    descriptionTr: "Üçüncü taraf bağımsız denetim sonuçları ve doğrulama",
    href: "/trust/audits",
    icon: "🧾",
    color: "purple",
  },
  {
    title: "Token Supply",
    titleTr: "Token Arzı",
    description: "Circulating supply and allocation statistics",
    descriptionTr: "Dolaşımdaki arz ve tahsis istatistikleri",
    href: "/trust/supply",
    icon: "🪙",
    color: "gold",
  },
];

export default function TrustPage() {
  const { lang } = useLanguage();
  const isTr = lang === 'tr';

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <header className="text-center mb-12">
          <div className="w-20 h-20 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#2F6F62] dark:text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-slate-800 dark:text-white mb-4">
            🔐 Trust Center
          </h1>
          <p className="text-xl text-[#2F6F62] dark:text-[#2F6F62] font-medium mb-4">
            Transparency. Allocation. Verification.
          </p>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {isTr 
              ? 'Auxite, dijital varlıkların fiziksel gerçekliğe karşı doğrulanabilir olması gerektiği ilkesi üzerine kurulmuştur. Her Auxite tokeni, güvenli bir şekilde saklanan ve denetlenebilir fiziksel değerli metali temsil eder.'
              : 'Auxite is built on the principle that digital assets must be verifiable against physical reality. Every Auxite token represents physically allocated precious metal, securely stored and auditable.'
            }
          </p>
        </header>

        {/* Navigation Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {trustSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-[#2F6F62] hover:shadow-xl transition-all group"
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl">{section.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-[#2F6F62] dark:group-hover:text-[#2F6F62] transition-colors">
                    {isTr ? section.titleTr : section.title}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    {isTr ? section.descriptionTr : section.description}
                  </p>
                </div>
                <svg className="w-6 h-6 text-slate-400 group-hover:text-[#2F6F62] group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Key Principles */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-12 h-12 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🏦</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isTr ? 'Fiziksel Tahsis' : 'Physical Allocation'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isTr 
                ? 'Tüm değerli metaller fiziksel olarak tutulur, tam tahsis edilir, külçe bazında ayrılır ve onaylı saklama kuruluşlarında depolanır.'
                : 'All precious metals are physically held, fully allocated, segregated by bar, and stored with approved custodians.'
              }
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isTr ? 'Dijital Sertifikalar' : 'Digital Certificates'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isTr 
                ? 'Her uygun tahsis için tahsis numarası, külçe seri numaraları, metal türü ve doğrulama hash içeren bir Dijital Sertifika düzenlenir.'
                : 'For every eligible allocation, a Digital Certificate is issued with allocation number, bar serial numbers, metal type, and verification hash.'
              }
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isTr ? 'Doğrulama & Bütünlük' : 'Verification & Integrity'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isTr 
                ? 'Tüm sertifikalar Auxite doğrulama servisi üzerinden bağımsız olarak doğrulanabilir. Sertifika hashleri veri bütünlüğünü sağlar.'
                : 'All certificates can be independently verified via the Auxite verification service. Certificate hashes ensure data integrity.'
              }
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-12 h-12 rounded-full bg-[#BFA181]/15 dark:bg-[#BFA181]/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🧾</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isTr ? 'Rezerv Kanıtı & Denetim' : 'Proof of Reserves & Audit'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isTr 
                ? 'Auxite, toplam metal varlıklarını, tahsis doğruluğunu ve dolaşımdaki token arzını doğrulamak için bağımsız üçüncü taraf denetçilerle çalışır.'
                : 'Auxite engages independent third-party auditors to verify total metal holdings, allocation accuracy, and circulating token supply.'
              }
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <span className="text-2xl">🛡</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isTr ? 'Saklama & Risk' : 'Custody & Risk'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isTr 
                ? 'Metaller yeniden ipoteklenmeyen saklama altında tutulur. Sahibi tarafından açıkça onaylanmadıkça hiçbir metal kiralanmaz veya yükümlülük altına alınmaz.'
                : 'Metals are held under non-rehypothecated custody. No metal is leased or encumbered unless explicitly opted-in by the holder.'
              }
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <span className="text-2xl">🔄</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
              {isTr ? 'Yaşam Döngüsü Şeffaflığı' : 'Lifecycle Transparency'}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              {isTr 
                ? 'Her tahsis net bir yaşam döngüsü izler: Ayrılmış → Tahsis Edilmiş → İtfa Edilmiş / Arşivlenmiş. Geçmiş veriler denetlenebilir kalır.'
                : 'Every allocation follows a clear lifecycle: Reserved → Allocated → Redeemed / Archived. Historical data remains auditable.'
              }
            </p>
          </div>
        </div>

        {/* What Auxite Is */}
        <div className="bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] rounded-2xl p-8 text-white mb-12">
          <h2 className="text-2xl font-bold mb-6">
            ⚖️ {isTr ? 'Auxite Nedir — ve Ne Değildir' : 'What Auxite Is — and Is Not'}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-white">Auxite {isTr ? 'şudur' : 'is'}:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-white/80">✓</span>
                  <span>{isTr ? 'Tahsisli değerli metalleri yönetmek için dijital bir platform' : 'A digital platform for administering allocated precious metals'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/80">✓</span>
                  <span>{isTr ? 'Şeffaflık öncelikli bir RWA altyapısı' : 'A transparency-first RWA infrastructure'}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-white">Auxite {isTr ? 'değildir' : 'is not'}:</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{isTr ? 'Bir banka' : 'A bank'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{isTr ? 'Bir stablecoin ihraççısı' : 'A stablecoin issuer'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{isTr ? 'Bir menkul kıymet ihraççısı' : 'A securities issuer'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300">✗</span>
                  <span>{isTr ? 'Getiri garantisi veren bir ürün' : 'A yield-guaranteeing product'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Verify Certificate CTA */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
            🔍 {isTr ? 'Sertifika Doğrula' : 'Verify a Certificate'}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {isTr 
              ? 'Auxite dijital sertifikasının gerçekliğini ve geçerliliğini doğrulayın'
              : 'Verify the authenticity and validity of an Auxite digital certificate'
            }
          </p>
          <Link
            href="/verify"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-semibold rounded-xl transition-colors"
          >
            {isTr ? 'Doğrulama Sayfasına Git' : 'Go to Verification Page'}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Legal Links */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {isTr ? 'Yasal belgeler için:' : 'For legal documentation:'}
            <Link href="/legal/terms" className="text-[#2F6F62] dark:text-[#2F6F62] hover:underline mx-2">
              {isTr ? 'Kullanım Koşulları' : 'Terms of Service'}
            </Link>
            •
            <Link href="/legal/redemption" className="text-[#2F6F62] dark:text-[#2F6F62] hover:underline mx-2">
              {isTr ? 'Geri Ödeme Politikası' : 'Redemption Policy'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
