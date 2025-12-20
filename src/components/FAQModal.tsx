"use client";

import React, { useState } from "react";
import { X, ChevronDown, ChevronUp, Search, HelpCircle, MessageCircle, Shield, Wallet, TrendingUp, Truck, CreditCard } from "lucide-react";

// ============================================
// FAQ DATA - 6 LANGUAGES
// ============================================

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface FAQCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const categories: Record<string, FAQCategory[]> = {
  tr: [
    { id: "general", name: "Genel", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "account", name: "Hesap", icon: <Wallet className="w-4 h-4" /> },
    { id: "trading", name: "İşlemler", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "security", name: "Güvenlik", icon: <Shield className="w-4 h-4" /> },
    { id: "delivery", name: "Teslimat", icon: <Truck className="w-4 h-4" /> },
    { id: "payment", name: "Ödeme", icon: <CreditCard className="w-4 h-4" /> },
  ],
  en: [
    { id: "general", name: "General", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "account", name: "Account", icon: <Wallet className="w-4 h-4" /> },
    { id: "trading", name: "Trading", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "security", name: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "delivery", name: "Delivery", icon: <Truck className="w-4 h-4" /> },
    { id: "payment", name: "Payment", icon: <CreditCard className="w-4 h-4" /> },
  ],
  de: [
    { id: "general", name: "Allgemein", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "account", name: "Konto", icon: <Wallet className="w-4 h-4" /> },
    { id: "trading", name: "Handel", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "security", name: "Sicherheit", icon: <Shield className="w-4 h-4" /> },
    { id: "delivery", name: "Lieferung", icon: <Truck className="w-4 h-4" /> },
    { id: "payment", name: "Zahlung", icon: <CreditCard className="w-4 h-4" /> },
  ],
  fr: [
    { id: "general", name: "Général", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "account", name: "Compte", icon: <Wallet className="w-4 h-4" /> },
    { id: "trading", name: "Trading", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "security", name: "Sécurité", icon: <Shield className="w-4 h-4" /> },
    { id: "delivery", name: "Livraison", icon: <Truck className="w-4 h-4" /> },
    { id: "payment", name: "Paiement", icon: <CreditCard className="w-4 h-4" /> },
  ],
  ar: [
    { id: "general", name: "عام", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "account", name: "الحساب", icon: <Wallet className="w-4 h-4" /> },
    { id: "trading", name: "التداول", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "security", name: "الأمان", icon: <Shield className="w-4 h-4" /> },
    { id: "delivery", name: "التوصيل", icon: <Truck className="w-4 h-4" /> },
    { id: "payment", name: "الدفع", icon: <CreditCard className="w-4 h-4" /> },
  ],
  ru: [
    { id: "general", name: "Общие", icon: <HelpCircle className="w-4 h-4" /> },
    { id: "account", name: "Аккаунт", icon: <Wallet className="w-4 h-4" /> },
    { id: "trading", name: "Торговля", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "security", name: "Безопасность", icon: <Shield className="w-4 h-4" /> },
    { id: "delivery", name: "Доставка", icon: <Truck className="w-4 h-4" /> },
    { id: "payment", name: "Оплата", icon: <CreditCard className="w-4 h-4" /> },
  ],
};

const faqData: Record<string, FAQItem[]> = {
  tr: [
    { category: "general", question: "Auxite nedir?", answer: "Auxite, fiziksel değerli metallerle desteklenen dijital tokenlar sunan bir platformdur. Her token, güvenli kasalarda saklanan gerçek altın, gümüş, platin veya paladyum ile 1:1 oranında desteklenir." },
    { category: "general", question: "Auxite tokenları nasıl desteklenir?", answer: "Her Auxite tokenı, dünya çapında güvenli kasalarda saklanan fiziksel metallerle %100 desteklenir. Rezervlerimiz düzenli olarak denetlenir ve şeffaflık için blockchain üzerinde doğrulanabilir." },
    { category: "general", question: "Hangi metaller mevcut?", answer: "Altın (AUXG), Gümüş (AUXS), Platin (AUXPT) ve Paladyum (AUXPD) tokenları sunuyoruz. Her token, ilgili metalin 1 gram'ını temsil eder." },
    { category: "account", question: "Hesap nasıl oluşturulur?", answer: "Web3 cüzdanınızı (MetaMask, WalletConnect vb.) bağlayarak hesap oluşturabilirsiniz. KYC doğrulaması tamamlandıktan sonra tüm özelliklere erişebilirsiniz." },
    { category: "account", question: "KYC neden gerekli?", answer: "KYC (Müşterini Tanı) doğrulaması, yasal düzenlemelere uyum sağlamak ve platformumuzu güvenli tutmak için gereklidir. Doğrulama seviyenize göre işlem limitleriniz artar." },
    { category: "account", question: "Auxiteer seviyeleri nelerdir?", answer: "Regular, Core, Reserve, Vault ve Sovereign olmak üzere 5 seviye vardır. Her seviye, daha düşük spread oranları ve özel avantajlar sunar." },
    { category: "trading", question: "Metal nasıl satın alınır?", answer: "Cüzdanınıza USDT veya desteklenen kripto para yatırarak metal tokenları satın alabilirsiniz. Markets sayfasından istediğiniz metali seçip işlem yapabilirsiniz." },
    { category: "trading", question: "Spread oranları nedir?", answer: "Spread, alış ve satış fiyatı arasındaki farktır. Auxiteer seviyenize göre %0.50 ile %1.00 arasında değişir." },
    { category: "trading", question: "Minimum işlem tutarı nedir?", answer: "Minimum işlem tutarı metal türüne göre değişir. Genellikle 10 USD karşılığı metalden işlem yapabilirsiniz." },
    { category: "security", question: "Varlıklarım güvende mi?", answer: "Evet. Fiziksel metaller sigortalı kasalarda saklanır, dijital varlıklarınız ise akıllı kontratlarla korunur. 2FA ve cihaz yönetimi ile hesabınızı ekstra koruyabilirsiniz." },
    { category: "security", question: "2FA nasıl etkinleştirilir?", answer: "Profil > Güvenlik bölümünden İki Faktörlü Doğrulamayı etkinleştirebilirsiniz. Google Authenticator veya benzeri bir uygulama kullanmanız önerilir." },
    { category: "security", question: "Şüpheli aktivite fark edersem ne yapmalıyım?", answer: "Hemen destek ekibimizle iletişime geçin ve 2FA'yı etkinleştirin. Gerekirse hesabınızı geçici olarak dondurabiliriz." },
    { category: "delivery", question: "Fiziksel teslimat mümkün mü?", answer: "Evet, belirli miktarların üzerinde fiziksel metal teslimatı talep edebilirsiniz. Teslimat, sigortalı kargo ile yapılır." },
    { category: "delivery", question: "Teslimat ücretleri nedir?", answer: "Teslimat ücretleri lokasyona ve miktara göre değişir. Teslimat talebi sırasında detaylı fiyat bilgisi gösterilir." },
    { category: "delivery", question: "Hangi ülkelere teslimat yapılıyor?", answer: "Şu anda Türkiye, AB ülkeleri, ABD, BAE ve seçili Asya ülkelerine teslimat yapıyoruz." },
    { category: "payment", question: "Hangi ödeme yöntemleri kabul ediliyor?", answer: "USDT (ERC-20, TRC-20), ETH, BTC ve banka havalesi kabul ediyoruz. Kredi kartı desteği yakında eklenecek." },
    { category: "payment", question: "Para çekme ne kadar sürer?", answer: "Kripto para çekimleri genellikle 30 dakika içinde işlenir. Banka transferleri 1-3 iş günü sürebilir." },
    { category: "payment", question: "İşlem ücretleri nedir?", answer: "İşlem ücretleri Auxiteer seviyenize göre %0.12 ile %0.35 arasında değişir. Ağ ücretleri ayrıca uygulanır." },
  ],
  en: [
    { category: "general", question: "What is Auxite?", answer: "Auxite is a platform offering digital tokens backed by physical precious metals. Each token is backed 1:1 by real gold, silver, platinum, or palladium stored in secure vaults." },
    { category: "general", question: "How are Auxite tokens backed?", answer: "Every Auxite token is 100% backed by physical metals stored in secure vaults worldwide. Our reserves are regularly audited and verifiable on blockchain for transparency." },
    { category: "general", question: "Which metals are available?", answer: "We offer Gold (AUXG), Silver (AUXS), Platinum (AUXPT), and Palladium (AUXPD) tokens. Each token represents 1 gram of the respective metal." },
    { category: "account", question: "How do I create an account?", answer: "You can create an account by connecting your Web3 wallet (MetaMask, WalletConnect, etc.). After completing KYC verification, you'll have access to all features." },
    { category: "account", question: "Why is KYC required?", answer: "KYC (Know Your Customer) verification is required for regulatory compliance and to keep our platform secure. Your transaction limits increase based on your verification level." },
    { category: "account", question: "What are Auxiteer tiers?", answer: "There are 5 tiers: Regular, Core, Reserve, Vault, and Sovereign. Each tier offers lower spread rates and exclusive benefits." },
    { category: "trading", question: "How do I buy metals?", answer: "You can buy metal tokens by depositing USDT or supported cryptocurrencies to your wallet. Select your desired metal from the Markets page to trade." },
    { category: "trading", question: "What are spread rates?", answer: "Spread is the difference between buy and sell prices. It varies from 0.50% to 1.00% depending on your Auxiteer tier." },
    { category: "trading", question: "What is the minimum trade amount?", answer: "Minimum trade amount varies by metal type. Generally, you can trade from as low as $10 worth of metal." },
    { category: "security", question: "Are my assets safe?", answer: "Yes. Physical metals are stored in insured vaults, and your digital assets are protected by smart contracts. You can add extra protection with 2FA and device management." },
    { category: "security", question: "How do I enable 2FA?", answer: "You can enable Two-Factor Authentication from Profile > Security. We recommend using Google Authenticator or a similar app." },
    { category: "security", question: "What should I do if I notice suspicious activity?", answer: "Contact our support team immediately and enable 2FA. We can temporarily freeze your account if necessary." },
    { category: "delivery", question: "Is physical delivery possible?", answer: "Yes, you can request physical metal delivery for amounts above certain thresholds. Delivery is made via insured courier." },
    { category: "delivery", question: "What are delivery fees?", answer: "Delivery fees vary by location and amount. Detailed pricing is shown during the delivery request." },
    { category: "delivery", question: "Which countries do you deliver to?", answer: "We currently deliver to Turkey, EU countries, USA, UAE, and select Asian countries." },
    { category: "payment", question: "Which payment methods are accepted?", answer: "We accept USDT (ERC-20, TRC-20), ETH, BTC, and bank transfer. Credit card support coming soon." },
    { category: "payment", question: "How long do withdrawals take?", answer: "Crypto withdrawals are typically processed within 30 minutes. Bank transfers may take 1-3 business days." },
    { category: "payment", question: "What are transaction fees?", answer: "Transaction fees range from 0.12% to 0.35% depending on your Auxiteer tier. Network fees apply separately." },
  ],
  de: [
    { category: "general", question: "Was ist Auxite?", answer: "Auxite ist eine Plattform, die digitale Token anbietet, die durch physische Edelmetalle gedeckt sind. Jeder Token ist 1:1 durch echtes Gold, Silber, Platin oder Palladium gedeckt." },
    { category: "general", question: "Wie werden Auxite-Token gedeckt?", answer: "Jeder Auxite-Token ist zu 100% durch physische Metalle gedeckt, die in sicheren Tresoren weltweit gelagert werden. Unsere Reserven werden regelmäßig geprüft." },
    { category: "account", question: "Wie erstelle ich ein Konto?", answer: "Sie können ein Konto erstellen, indem Sie Ihre Web3-Wallet verbinden. Nach Abschluss der KYC-Verifizierung haben Sie Zugang zu allen Funktionen." },
    { category: "trading", question: "Wie kaufe ich Metalle?", answer: "Sie können Metal-Token kaufen, indem Sie USDT oder unterstützte Kryptowährungen einzahlen. Wählen Sie Ihr gewünschtes Metall auf der Markets-Seite." },
    { category: "security", question: "Sind meine Vermögenswerte sicher?", answer: "Ja. Physische Metalle werden in versicherten Tresoren gelagert, und Ihre digitalen Vermögenswerte sind durch Smart Contracts geschützt." },
    { category: "payment", question: "Welche Zahlungsmethoden werden akzeptiert?", answer: "Wir akzeptieren USDT, ETH, BTC und Banküberweisung. Kreditkartenunterstützung kommt bald." },
  ],
  fr: [
    { category: "general", question: "Qu'est-ce qu'Auxite?", answer: "Auxite est une plateforme proposant des jetons numériques adossés à des métaux précieux physiques. Chaque jeton est soutenu 1:1 par de l'or, de l'argent, du platine ou du palladium réel." },
    { category: "general", question: "Comment les jetons Auxite sont-ils garantis?", answer: "Chaque jeton Auxite est garanti à 100% par des métaux physiques stockés dans des coffres sécurisés dans le monde entier. Nos réserves sont régulièrement auditées." },
    { category: "account", question: "Comment créer un compte?", answer: "Vous pouvez créer un compte en connectant votre portefeuille Web3. Après avoir terminé la vérification KYC, vous aurez accès à toutes les fonctionnalités." },
    { category: "trading", question: "Comment acheter des métaux?", answer: "Vous pouvez acheter des jetons métalliques en déposant des USDT ou des cryptomonnaies prises en charge. Sélectionnez votre métal souhaité sur la page Markets." },
    { category: "security", question: "Mes actifs sont-ils en sécurité?", answer: "Oui. Les métaux physiques sont stockés dans des coffres assurés, et vos actifs numériques sont protégés par des contrats intelligents." },
    { category: "payment", question: "Quels modes de paiement sont acceptés?", answer: "Nous acceptons USDT, ETH, BTC et virement bancaire. Le support par carte de crédit arrive bientôt." },
  ],
  ar: [
    { category: "general", question: "ما هو Auxite؟", answer: "Auxite هي منصة تقدم رموزًا رقمية مدعومة بالمعادن الثمينة الفعلية. كل رمز مدعوم بنسبة 1:1 بالذهب أو الفضة أو البلاتين أو البلاديوم الحقيقي." },
    { category: "general", question: "كيف يتم دعم رموز Auxite؟", answer: "كل رمز Auxite مدعوم بنسبة 100٪ بالمعادن الفعلية المخزنة في خزائن آمنة حول العالم. يتم تدقيق احتياطياتنا بانتظام." },
    { category: "account", question: "كيف أقوم بإنشاء حساب؟", answer: "يمكنك إنشاء حساب عن طريق توصيل محفظة Web3 الخاصة بك. بعد إكمال التحقق من الهوية، ستتمكن من الوصول إلى جميع الميزات." },
    { category: "trading", question: "كيف أشتري المعادن؟", answer: "يمكنك شراء رموز المعادن عن طريق إيداع USDT أو العملات المشفرة المدعومة. حدد المعدن المطلوب من صفحة الأسواق." },
    { category: "security", question: "هل أصولي آمنة؟", answer: "نعم. يتم تخزين المعادن الفعلية في خزائن مؤمنة، وأصولك الرقمية محمية بالعقود الذكية." },
    { category: "payment", question: "ما هي طرق الدفع المقبولة؟", answer: "نقبل USDT و ETH و BTC والتحويل البنكي. دعم بطاقة الائتمان قريبًا." },
  ],
  ru: [
    { category: "general", question: "Что такое Auxite?", answer: "Auxite — это платформа, предлагающая цифровые токены, обеспеченные физическими драгоценными металлами. Каждый токен обеспечен 1:1 реальным золотом, серебром, платиной или палладием." },
    { category: "general", question: "Как обеспечены токены Auxite?", answer: "Каждый токен Auxite на 100% обеспечен физическими металлами, хранящимися в защищенных хранилищах по всему миру. Наши резервы регулярно проверяются." },
    { category: "account", question: "Как создать аккаунт?", answer: "Вы можете создать аккаунт, подключив свой Web3-кошелек. После прохождения KYC-верификации вам будут доступны все функции." },
    { category: "trading", question: "Как купить металлы?", answer: "Вы можете купить токены металлов, внеся USDT или поддерживаемые криптовалюты. Выберите нужный металл на странице Markets." },
    { category: "security", question: "В безопасности ли мои активы?", answer: "Да. Физические металлы хранятся в застрахованных хранилищах, а ваши цифровые активы защищены смарт-контрактами." },
    { category: "payment", question: "Какие способы оплаты принимаются?", answer: "Мы принимаем USDT, ETH, BTC и банковский перевод. Поддержка кредитных карт скоро." },
  ],
};

const translations = {
  tr: {
    title: "Sıkça Sorulan Sorular",
    subtitle: "Yardıma mı ihtiyacınız var?",
    searchPlaceholder: "Soru ara...",
    allCategories: "Tümü",
    noResults: "Sonuç bulunamadı",
    contactSupport: "Destek ile İletişime Geç",
    close: "Kapat",
  },
  en: {
    title: "Frequently Asked Questions",
    subtitle: "Need help?",
    searchPlaceholder: "Search questions...",
    allCategories: "All",
    noResults: "No results found",
    contactSupport: "Contact Support",
    close: "Close",
  },
  de: {
    title: "Häufig gestellte Fragen",
    subtitle: "Brauchen Sie Hilfe?",
    searchPlaceholder: "Fragen suchen...",
    allCategories: "Alle",
    noResults: "Keine Ergebnisse gefunden",
    contactSupport: "Support kontaktieren",
    close: "Schließen",
  },
  fr: {
    title: "Questions Fréquemment Posées",
    subtitle: "Besoin d'aide?",
    searchPlaceholder: "Rechercher des questions...",
    allCategories: "Tout",
    noResults: "Aucun résultat trouvé",
    contactSupport: "Contacter le Support",
    close: "Fermer",
  },
  ar: {
    title: "الأسئلة الشائعة",
    subtitle: "هل تحتاج مساعدة؟",
    searchPlaceholder: "البحث عن أسئلة...",
    allCategories: "الكل",
    noResults: "لم يتم العثور على نتائج",
    contactSupport: "اتصل بالدعم",
    close: "إغلاق",
  },
  ru: {
    title: "Часто Задаваемые Вопросы",
    subtitle: "Нужна помощь?",
    searchPlaceholder: "Поиск вопросов...",
    allCategories: "Все",
    noResults: "Результаты не найдены",
    contactSupport: "Связаться с поддержкой",
    close: "Закрыть",
  },
};

// ============================================
// COMPONENT
// ============================================

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

export default function FAQModal({ isOpen, onClose, lang = "en" }: FAQModalProps) {
  const t = translations[lang] || translations.en;
  const faqs = faqData[lang] || faqData.en;
  const cats = categories[lang] || categories.en;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredFaqs = faqs.filter((faq) => {
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.title}</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Search & Categories */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-zinc-800 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                !selectedCategory
                  ? "bg-blue-500 text-white"
                  : "bg-stone-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
              }`}
            >
              {t.allCategories}
            </button>
            {cats.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-blue-500 text-white"
                    : "bg-stone-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
                }`}
              >
                {cat.icon}
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-zinc-400">{t.noResults}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-stone-200 dark:border-zinc-700 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-stone-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 dark:text-white pr-4">{faq.question}</span>
                    {expandedIndex === index ? (
                      <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  {expandedIndex === index && (
                    <div className="px-4 pb-4">
                      <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 dark:border-zinc-800">
          <button
            onClick={() => window.open("mailto:support@auxite.com", "_blank")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {t.contactSupport}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium hover:bg-stone-300 dark:hover:bg-zinc-600 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
