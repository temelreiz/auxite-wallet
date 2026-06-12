"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage, type LanguageCode } from "@/components/LanguageContext";

// Landing copy in every supported language so the public homepage matches the
// rest of the site (cookie banner, auth pages) for the visitor's language —
// previously this markup was hardcoded English, so a Turkish visitor saw an
// English landing but a Turkish cookie banner. Brand names (AUXITE, Google
// Play, App Store) are intentionally left untranslated.
type Copy = Record<string, string>;
const LANDING_COPY: Record<LanguageCode, Copy> = {
  en: {
    signIn: "Sign In", getStarted: "Get Started",
    badge: "Secure Digital Asset Custody",
    heroTitle1: "Tokenized Precious Metals,", heroTitle2: "Secured in Your Vault",
    heroSubtitle: "Auxite is a digital asset custody platform for tokenized precious metals. Buy, sell, and securely hold digital tokens backed by physical gold, silver, platinum, and palladium stored in audited vaults.",
    openVault: "Open Your Vault", clientSignIn: "Client Sign In",
    getApp: "Get the mobile app", getItOn: "Get it on", comingSoon: "Coming soon",
    f1Title: "Physical Metal Backed", f1Desc: "Every token is backed by allocated physical precious metals stored in secure, audited vaults.",
    f2Title: "Institutional Custody", f2Desc: "Enterprise-grade security with multi-signature wallets, 2FA authentication, and encrypted storage.",
    f3Title: "Trade 24/7", f3Desc: "Buy, sell, and exchange tokenized gold, silver, platinum, and palladium around the clock.",
    howTitle: "How Auxite Works",
    s1Title: "Create Account", s1Desc: "Sign up with email or Google and complete identity verification.",
    s2Title: "Fund Your Vault", s2Desc: "Deposit funds via bank transfer, crypto, or supported payment methods.",
    s3Title: "Buy Metals", s3Desc: "Purchase tokenized gold, silver, platinum, or palladium at live market prices.",
    s4Title: "Hold or Redeem", s4Desc: "Securely hold tokens in your vault or request physical metal delivery.",
    terms: "Terms of Service", privacy: "Privacy Policy", aml: "AML Policy",
    risk: "Risk Disclosure", dataSecurity: "Data Security", compliance: "Compliance",
    rights: "All rights reserved.",
  },
  tr: {
    signIn: "Giriş Yap", getStarted: "Başla",
    badge: "Güvenli Dijital Varlık Saklama",
    heroTitle1: "Tokenize Kıymetli Madenler,", heroTitle2: "Kasanızda Güvende",
    heroSubtitle: "Auxite, tokenize edilmiş kıymetli madenler için bir dijital varlık saklama platformudur. Denetlenen kasalarda saklanan fiziksel altın, gümüş, platin ve paladyumla desteklenen dijital tokenları alın, satın ve güvenle saklayın.",
    openVault: "Kasanı Aç", clientSignIn: "Müşteri Girişi",
    getApp: "Mobil uygulamayı indir", getItOn: "İndir", comingSoon: "Yakında",
    f1Title: "Fiziksel Maden Destekli", f1Desc: "Her token, güvenli ve denetlenen kasalarda saklanan tahsis edilmiş fiziksel kıymetli madenlerle desteklenir.",
    f2Title: "Kurumsal Saklama", f2Desc: "Çok imzalı cüzdanlar, 2FA kimlik doğrulama ve şifreli depolama ile kurumsal düzeyde güvenlik.",
    f3Title: "7/24 İşlem", f3Desc: "Tokenize altın, gümüş, platin ve paladyumu günün her saati alın, satın ve takas edin.",
    howTitle: "Auxite Nasıl Çalışır",
    s1Title: "Hesap Oluştur", s1Desc: "E-posta veya Google ile kaydolun ve kimlik doğrulamasını tamamlayın.",
    s2Title: "Kasanı Fonla", s2Desc: "Banka havalesi, kripto veya desteklenen ödeme yöntemleriyle para yatırın.",
    s3Title: "Maden Al", s3Desc: "Tokenize altın, gümüş, platin veya paladyumu canlı piyasa fiyatlarından satın alın.",
    s4Title: "Sakla veya Talep Et", s4Desc: "Tokenları kasanızda güvenle saklayın veya fiziksel maden teslimatı talep edin.",
    terms: "Kullanım Koşulları", privacy: "Gizlilik Politikası", aml: "AML Politikası",
    risk: "Risk Bildirimi", dataSecurity: "Veri Güvenliği", compliance: "Uyumluluk",
    rights: "Tüm hakları saklıdır.",
  },
  de: {
    signIn: "Anmelden", getStarted: "Loslegen",
    badge: "Sichere Verwahrung digitaler Vermögenswerte",
    heroTitle1: "Tokenisierte Edelmetalle,", heroTitle2: "sicher in Ihrem Tresor",
    heroSubtitle: "Auxite ist eine Verwahrungsplattform für tokenisierte Edelmetalle. Kaufen, verkaufen und verwahren Sie digitale Token, die durch physisches Gold, Silber, Platin und Palladium in auditierten Tresoren gedeckt sind.",
    openVault: "Tresor eröffnen", clientSignIn: "Kunden-Login",
    getApp: "Mobile App holen", getItOn: "Jetzt bei", comingSoon: "Demnächst",
    f1Title: "Physisch besichert", f1Desc: "Jeder Token ist durch allokierte physische Edelmetalle in sicheren, auditierten Tresoren gedeckt.",
    f2Title: "Institutionelle Verwahrung", f2Desc: "Sicherheit auf Unternehmensniveau mit Multi-Signatur-Wallets, 2FA und verschlüsselter Speicherung.",
    f3Title: "Handel rund um die Uhr", f3Desc: "Kaufen, verkaufen und tauschen Sie tokenisiertes Gold, Silber, Platin und Palladium jederzeit.",
    howTitle: "So funktioniert Auxite",
    s1Title: "Konto erstellen", s1Desc: "Mit E-Mail oder Google registrieren und Identität verifizieren.",
    s2Title: "Tresor aufladen", s2Desc: "Geld per Banküberweisung, Krypto oder unterstützten Zahlungsmethoden einzahlen.",
    s3Title: "Metalle kaufen", s3Desc: "Tokenisiertes Gold, Silber, Platin oder Palladium zu Live-Marktpreisen kaufen.",
    s4Title: "Halten oder Einlösen", s4Desc: "Token sicher im Tresor halten oder physische Metalllieferung anfordern.",
    terms: "Nutzungsbedingungen", privacy: "Datenschutz", aml: "AML-Richtlinie",
    risk: "Risikohinweis", dataSecurity: "Datensicherheit", compliance: "Compliance",
    rights: "Alle Rechte vorbehalten.",
  },
  fr: {
    signIn: "Se connecter", getStarted: "Commencer",
    badge: "Conservation sécurisée d'actifs numériques",
    heroTitle1: "Métaux précieux tokenisés,", heroTitle2: "sécurisés dans votre coffre",
    heroSubtitle: "Auxite est une plateforme de conservation d'actifs numériques pour les métaux précieux tokenisés. Achetez, vendez et conservez en toute sécurité des jetons numériques adossés à de l'or, de l'argent, du platine et du palladium physiques stockés dans des coffres audités.",
    openVault: "Ouvrir votre coffre", clientSignIn: "Connexion client",
    getApp: "Obtenir l'application mobile", getItOn: "Disponible sur", comingSoon: "Bientôt disponible",
    f1Title: "Adossé à du métal physique", f1Desc: "Chaque jeton est adossé à des métaux précieux physiques alloués, stockés dans des coffres sécurisés et audités.",
    f2Title: "Conservation institutionnelle", f2Desc: "Sécurité de niveau entreprise avec portefeuilles multi-signatures, authentification 2FA et stockage chiffré.",
    f3Title: "Échangez 24h/24 7j/7", f3Desc: "Achetez, vendez et échangez de l'or, de l'argent, du platine et du palladium tokenisés à toute heure.",
    howTitle: "Comment fonctionne Auxite",
    s1Title: "Créer un compte", s1Desc: "Inscrivez-vous par e-mail ou Google et complétez la vérification d'identité.",
    s2Title: "Alimenter votre coffre", s2Desc: "Déposez des fonds par virement bancaire, crypto ou moyens de paiement pris en charge.",
    s3Title: "Acheter des métaux", s3Desc: "Achetez de l'or, de l'argent, du platine ou du palladium tokenisés aux prix du marché en direct.",
    s4Title: "Conserver ou récupérer", s4Desc: "Conservez vos jetons en toute sécurité ou demandez la livraison physique du métal.",
    terms: "Conditions d'utilisation", privacy: "Politique de confidentialité", aml: "Politique LBC",
    risk: "Avertissement sur les risques", dataSecurity: "Sécurité des données", compliance: "Conformité",
    rights: "Tous droits réservés.",
  },
  ar: {
    signIn: "تسجيل الدخول", getStarted: "ابدأ الآن",
    badge: "حفظ آمن للأصول الرقمية",
    heroTitle1: "معادن ثمينة مرمّزة،", heroTitle2: "محفوظة في خزنتك",
    heroSubtitle: "Auxite منصة حفظ للأصول الرقمية للمعادن الثمينة المرمّزة. اشترِ وبِع واحتفظ بأمان برموز رقمية مدعومة بالذهب والفضة والبلاتين والبلاديوم الفعلي المخزّن في خزائن مدققة.",
    openVault: "افتح خزنتك", clientSignIn: "دخول العملاء",
    getApp: "احصل على التطبيق", getItOn: "متوفر على", comingSoon: "قريباً",
    f1Title: "مدعوم بمعدن فعلي", f1Desc: "كل رمز مدعوم بمعادن ثمينة فعلية مخصصة ومخزّنة في خزائن آمنة ومدققة.",
    f2Title: "حفظ مؤسسي", f2Desc: "أمان بمستوى المؤسسات مع محافظ متعددة التواقيع والمصادقة الثنائية والتخزين المشفّر.",
    f3Title: "تداول على مدار الساعة", f3Desc: "اشترِ وبِع وبادل الذهب والفضة والبلاتين والبلاديوم المرمّز في أي وقت.",
    howTitle: "كيف يعمل Auxite",
    s1Title: "إنشاء حساب", s1Desc: "سجّل عبر البريد الإلكتروني أو Google وأكمل التحقق من الهوية.",
    s2Title: "موّل خزنتك", s2Desc: "أودِع الأموال عبر التحويل البنكي أو العملات المشفّرة أو طرق الدفع المدعومة.",
    s3Title: "اشترِ المعادن", s3Desc: "اشترِ الذهب أو الفضة أو البلاتين أو البلاديوم المرمّز بأسعار السوق الحية.",
    s4Title: "احتفظ أو استرد", s4Desc: "احتفظ بالرموز بأمان في خزنتك أو اطلب تسليم المعدن فعلياً.",
    terms: "شروط الخدمة", privacy: "سياسة الخصوصية", aml: "سياسة مكافحة غسل الأموال",
    risk: "إفصاح المخاطر", dataSecurity: "أمن البيانات", compliance: "الامتثال",
    rights: "جميع الحقوق محفوظة.",
  },
  ru: {
    signIn: "Войти", getStarted: "Начать",
    badge: "Безопасное хранение цифровых активов",
    heroTitle1: "Токенизированные драгметаллы,", heroTitle2: "под защитой в вашем хранилище",
    heroSubtitle: "Auxite — платформа хранения цифровых активов для токенизированных драгоценных металлов. Покупайте, продавайте и безопасно храните цифровые токены, обеспеченные физическим золотом, серебром, платиной и палладием в аудированных хранилищах.",
    openVault: "Открыть хранилище", clientSignIn: "Вход для клиентов",
    getApp: "Скачать приложение", getItOn: "Доступно в", comingSoon: "Скоро",
    f1Title: "Обеспечено физическим металлом", f1Desc: "Каждый токен обеспечен аллоцированными физическими драгметаллами в защищённых аудированных хранилищах.",
    f2Title: "Институциональное хранение", f2Desc: "Безопасность корпоративного уровня: мультиподписные кошельки, 2FA и шифрованное хранение.",
    f3Title: "Торговля 24/7", f3Desc: "Покупайте, продавайте и обменивайте токенизированное золото, серебро, платину и палладий в любое время.",
    howTitle: "Как работает Auxite",
    s1Title: "Создать аккаунт", s1Desc: "Зарегистрируйтесь по e-mail или Google и пройдите верификацию личности.",
    s2Title: "Пополнить хранилище", s2Desc: "Внесите средства банковским переводом, криптовалютой или поддерживаемыми способами оплаты.",
    s3Title: "Купить металлы", s3Desc: "Покупайте токенизированное золото, серебро, платину или палладий по рыночным ценам.",
    s4Title: "Хранить или вывести", s4Desc: "Надёжно храните токены или закажите физическую доставку металла.",
    terms: "Условия использования", privacy: "Политика конфиденциальности", aml: "Политика ПОД",
    risk: "Уведомление о рисках", dataSecurity: "Безопасность данных", compliance: "Комплаенс",
    rights: "Все права защищены.",
  },
};

export default function Home() {
  const router = useRouter();
  const { lang } = useLanguage();
  const c = LANDING_COPY[lang] || LANDING_COPY.en;

  useEffect(() => {
    // Client-side enhancement: send already-authenticated users straight to
    // their vault. The landing markup below is always server-rendered so that
    // crawlers (and pre-hydration users) get real, indexable content instead
    // of a loading spinner.
    if (localStorage.getItem("authToken")) {
      router.replace("/vault");
    }
  }, [router]);

  const steps = [
    { step: "1", title: c.s1Title, desc: c.s1Desc },
    { step: "2", title: c.s2Title, desc: c.s2Desc },
    { step: "3", title: c.s3Title, desc: c.s3Desc },
    { step: "4", title: c.s4Title, desc: c.s4Desc },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#BFA181]/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[#BFA181] tracking-widest">AUXITE</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/auth/login"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {c.signIn}
          </Link>
          <Link
            href="/auth/register"
            className="text-sm bg-[#BFA181] text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-[#BFA181]/90 transition-colors"
          >
            {c.getStarted}
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#BFA181]/10 border border-[#BFA181]/20 mb-8">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-[#BFA181]">{c.badge}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
          {c.heroTitle1}{" "}
          <span className="text-[#BFA181]">{c.heroTitle2}</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          {c.heroSubtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/auth/register"
            className="w-full sm:w-auto px-8 py-4 bg-[#BFA181] text-black font-bold rounded-xl hover:bg-[#BFA181]/90 transition-colors text-base"
          >
            {c.openVault}
          </Link>
          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-8 py-4 bg-zinc-900 border border-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-800 transition-colors text-base"
          >
            {c.clientSignIn}
          </Link>
        </div>

        {/* App store badges — Google Play live, iOS coming soon */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <p className="text-xs text-slate-500 sm:mr-2">{c.getApp}</p>
          <div className="flex items-center gap-3">
            {/* Google Play — active */}
            <a
              href="https://play.google.com/store/apps/details?id=io.auxite.vault"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-black border border-zinc-700 hover:border-zinc-500 transition-colors"
              aria-label="Get it on Google Play"
            >
              <svg className="w-6 h-6" viewBox="0 0 512 512" aria-hidden="true">
                <path fill="#00D2FF" d="M47 12.7C42.3 17.6 39.6 25.3 39.6 35.2v441.6c0 9.9 2.7 17.6 7.4 22.5l1.5 1.4 247.4-247.4v-5.8L48.5 11.3z" />
                <path fill="#FFCE00" d="M378.6 338.4l-82.6-82.6v-5.8l82.7-82.7 1.9 1.1 97.9 55.6c28 15.9 28 41.9 0 57.9l-97.9 55.6z" />
                <path fill="#FF3B30" d="M380.5 337.3L296 252.8 47 501.8c9.2 9.8 24.5 11 41.7 1.2l291.8-165.7" />
                <path fill="#00C853" d="M380.5 168.3L88.7 2.6C71.5-7.2 56.2-6 47 3.8l249 249z" />
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[9px] text-slate-300 uppercase tracking-wide">{c.getItOn}</span>
                <span className="block text-base font-semibold text-white -mt-0.5">Google Play</span>
              </span>
            </a>

            {/* App Store — coming soon (inactive) */}
            <div
              className="relative inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-black border border-zinc-800 opacity-50 cursor-not-allowed select-none"
              aria-label="iOS App Store — coming soon"
              title="Coming soon"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
              </svg>
              <span className="text-left leading-tight">
                <span className="block text-[9px] text-slate-400 uppercase tracking-wide">{c.comingSoon}</span>
                <span className="block text-base font-semibold text-slate-300 -mt-0.5">App Store</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">{c.f1Title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {c.f1Desc}
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">{c.f2Title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {c.f2Desc}
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">{c.f3Title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {c.f3Desc}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">{c.howTitle}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {steps.map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-[#BFA181]/20 text-[#BFA181] font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#BFA181]/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-bold text-[#BFA181] tracking-widest text-sm">AUXITE</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <Link href="/legal/terms" className="hover:text-white transition-colors">
                {c.terms}
              </Link>
              <Link href="/privacy-policy" className="hover:text-white transition-colors">
                {c.privacy}
              </Link>
              <Link href="/legal/aml" className="hover:text-white transition-colors">
                {c.aml}
              </Link>
              <Link href="/legal/risk-disclosure" className="hover:text-white transition-colors">
                {c.risk}
              </Link>
              <Link href="/legal/data-security" className="hover:text-white transition-colors">
                {c.dataSecurity}
              </Link>
              <Link href="/legal" className="hover:text-white transition-colors">
                {c.compliance}
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Auxite. {c.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
