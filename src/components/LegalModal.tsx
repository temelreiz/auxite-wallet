"use client";

import React, { useState } from "react";
import { X, FileText, Shield, Scale, AlertTriangle, ScrollText, BookOpen } from "lucide-react";

// ============================================
// LEGAL SECTIONS
// ============================================

type LegalSection = "terms" | "privacy" | "disclaimer" | "aml" | "cookies";

interface LegalTab {
  id: LegalSection;
  name: string;
  icon: React.ReactNode;
}

const legalTabs: Record<string, LegalTab[]> = {
  tr: [
    { id: "terms", name: "Kullanım Koşulları", icon: <FileText className="w-4 h-4" /> },
    { id: "privacy", name: "Gizlilik Politikası", icon: <Shield className="w-4 h-4" /> },
    { id: "disclaimer", name: "Sorumluluk Reddi", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "aml", name: "AML Politikası", icon: <Scale className="w-4 h-4" /> },
    { id: "cookies", name: "Çerez Politikası", icon: <ScrollText className="w-4 h-4" /> },
  ],
  en: [
    { id: "terms", name: "Terms of Service", icon: <FileText className="w-4 h-4" /> },
    { id: "privacy", name: "Privacy Policy", icon: <Shield className="w-4 h-4" /> },
    { id: "disclaimer", name: "Disclaimer", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "aml", name: "AML Policy", icon: <Scale className="w-4 h-4" /> },
    { id: "cookies", name: "Cookie Policy", icon: <ScrollText className="w-4 h-4" /> },
  ],
  de: [
    { id: "terms", name: "Nutzungsbedingungen", icon: <FileText className="w-4 h-4" /> },
    { id: "privacy", name: "Datenschutzrichtlinie", icon: <Shield className="w-4 h-4" /> },
    { id: "disclaimer", name: "Haftungsausschluss", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "aml", name: "AML-Richtlinie", icon: <Scale className="w-4 h-4" /> },
    { id: "cookies", name: "Cookie-Richtlinie", icon: <ScrollText className="w-4 h-4" /> },
  ],
  fr: [
    { id: "terms", name: "Conditions d'Utilisation", icon: <FileText className="w-4 h-4" /> },
    { id: "privacy", name: "Politique de Confidentialité", icon: <Shield className="w-4 h-4" /> },
    { id: "disclaimer", name: "Avertissement", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "aml", name: "Politique AML", icon: <Scale className="w-4 h-4" /> },
    { id: "cookies", name: "Politique de Cookies", icon: <ScrollText className="w-4 h-4" /> },
  ],
  ar: [
    { id: "terms", name: "شروط الخدمة", icon: <FileText className="w-4 h-4" /> },
    { id: "privacy", name: "سياسة الخصوصية", icon: <Shield className="w-4 h-4" /> },
    { id: "disclaimer", name: "إخلاء المسؤولية", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "aml", name: "سياسة مكافحة غسيل الأموال", icon: <Scale className="w-4 h-4" /> },
    { id: "cookies", name: "سياسة ملفات تعريف الارتباط", icon: <ScrollText className="w-4 h-4" /> },
  ],
  ru: [
    { id: "terms", name: "Условия Использования", icon: <FileText className="w-4 h-4" /> },
    { id: "privacy", name: "Политика Конфиденциальности", icon: <Shield className="w-4 h-4" /> },
    { id: "disclaimer", name: "Отказ от Ответственности", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "aml", name: "Политика AML", icon: <Scale className="w-4 h-4" /> },
    { id: "cookies", name: "Политика Cookies", icon: <ScrollText className="w-4 h-4" /> },
  ],
};

// ============================================
// LEGAL CONTENT
// ============================================

const legalContent: Record<string, Record<LegalSection, { title: string; lastUpdated: string; content: string[] }>> = {
  tr: {
    terms: {
      title: "Kullanım Koşulları",
      lastUpdated: "Son güncelleme: 1 Aralık 2024",
      content: [
        "1. KABUL VE BAĞLAYICILIK\n\nBu web sitesini veya Auxite platformunu kullanarak, bu Kullanım Koşullarını okuduğunuzu, anladığınızı ve bunlara bağlı kalmayı kabul ettiğinizi beyan edersiniz. Bu koşulları kabul etmiyorsanız, platformumuzu kullanmayınız.",
        "2. HİZMET TANIMI\n\nAuxite, fiziksel değerli metallerle desteklenen dijital tokenlar sunan bir platformdur. Platformumuz aracılığıyla altın (AUXG), gümüş (AUXS), platin (AUXPT) ve paladyum (AUXPD) tokenları satın alabilir, satabilir ve saklayabilirsiniz.",
        "3. HESAP OLUŞTURMA VE KYC\n\nPlatformumuzun tüm özelliklerini kullanabilmek için bir hesap oluşturmanız ve KYC (Müşterini Tanı) doğrulama sürecini tamamlamanız gerekmektedir. Sağladığınız tüm bilgilerin doğru ve güncel olmasından siz sorumlusunuz.",
        "4. RİSK UYARISI\n\nDeğerli metal yatırımları risk içerir ve geçmiş performans gelecekteki sonuçları garanti etmez. Yatırım kararlarınızı vermeden önce kendi araştırmanızı yapmanız ve gerekirse finansal danışmanlık almanız önerilir.",
        "5. FİYATLANDIRMA VE ÜCRETLER\n\nİşlem ücretleri, spread oranları ve diğer masraflar platformumuzda açıkça belirtilmektedir. Auxiteer seviyenize göre ücretler değişiklik gösterebilir.",
        "6. FİZİKSEL TESLİMAT\n\nBelirli koşullar altında fiziksel metal teslimatı talep edebilirsiniz. Teslimat koşulları, ücretleri ve süreleri bölgenize göre değişiklik gösterebilir.",
        "7. HESAP GÜVENLİĞİ\n\nHesabınızın güvenliğinden siz sorumlusunuz. İki faktörlü doğrulama (2FA) kullanmanızı ve şüpheli aktiviteleri derhal bildirmenizi öneririz.",
        "8. YASAKLI FAALİYETLER\n\nPlatformumuz yasa dışı faaliyetler, kara para aklama, terör finansmanı veya herhangi bir dolandırıcılık faaliyeti için kullanılamaz.",
        "9. FİKRİ MÜLKİYET\n\nAuxite markası, logosu ve tüm platform içeriği Auxite'a aittir ve telif hakkı ile korunmaktadır.",
        "10. SORUMLULUK SINIRLAMASI\n\nAuxite, platformun kullanımından kaynaklanan doğrudan veya dolaylı zararlardan sorumlu tutulamaz. Yatırım kararlarınızın sorumluluğu size aittir.",
      ],
    },
    privacy: {
      title: "Gizlilik Politikası",
      lastUpdated: "Son güncelleme: 1 Aralık 2024",
      content: [
        "1. TOPLANAN BİLGİLER\n\nKimlik bilgileri (ad, soyad, doğum tarihi), iletişim bilgileri (e-posta, telefon), KYC belgeleri, işlem geçmişi ve cihaz bilgileri dahil olmak üzere çeşitli kişisel veriler toplanmaktadır.",
        "2. VERİ KULLANIMI\n\nToplanan veriler; hesap yönetimi, KYC doğrulama, işlem gerçekleştirme, müşteri desteği, yasal uyumluluk ve platform iyileştirme amacıyla kullanılmaktadır.",
        "3. VERİ PAYLAŞIMI\n\nKişisel verileriniz, yasal zorunluluklar dışında üçüncü taraflarla paylaşılmaz. KYC doğrulama için Sumsub gibi güvenilir ortaklarla çalışmaktayız.",
        "4. VERİ GÜVENLİĞİ\n\nVerileriniz endüstri standardı şifreleme yöntemleri ile korunmaktadır. Sunucularımız güvenli veri merkezlerinde barındırılmaktadır.",
        "5. ÇEREZLER\n\nPlatformumuz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır. Çerez tercihlerinizi tarayıcı ayarlarından yönetebilirsiniz.",
        "6. VERİ SAKLAMA\n\nKişisel verileriniz, yasal gereklilikler ve iş ihtiyaçları doğrultusunda saklanmaktadır. Hesabınızı kapatmanız halinde verileriniz yasal süre sonunda silinir.",
        "7. HAKLARINIZ\n\nGDPR ve KVKK kapsamında verilerinize erişim, düzeltme, silme ve taşınabilirlik haklarına sahipsiniz. Bu haklarınızı kullanmak için bizimle iletişime geçebilirsiniz.",
        "8. İLETİŞİM\n\nGizlilik ile ilgili sorularınız için privacy@auxite.com adresine e-posta gönderebilirsiniz.",
      ],
    },
    disclaimer: {
      title: "Sorumluluk Reddi",
      lastUpdated: "Son güncelleme: 1 Aralık 2024",
      content: [
        "YATIRIM RİSKİ\n\nDeğerli metal yatırımları, fiyat dalgalanmaları nedeniyle kayıplara yol açabilir. Yatırımınızın değeri artabileceği gibi azalabilir de. Kaybetmeyi göze alamayacağınız parayla yatırım yapmayınız.",
        "FİNANSAL TAVSİYE DEĞİLDİR\n\nBu platform üzerinde sunulan hiçbir bilgi, finansal, yatırım veya vergi tavsiyesi olarak değerlendirilmemelidir. Yatırım kararlarınızı vermeden önce bağımsız finansal danışmanlık almanız önerilir.",
        "GEÇMİŞ PERFORMANS\n\nGeçmiş performans, gelecekteki sonuçları garanti etmez. Tarihsel fiyat hareketleri, gelecekteki fiyat hareketlerinin göstergesi değildir.",
        "TEKNİK RİSKLER\n\nBlockchain teknolojisi ve akıllı kontratlar teknik riskler içerir. Sistem arızaları, siber saldırılar veya diğer teknik sorunlar varlıklarınızı etkileyebilir.",
        "DÜZENLEYICI RİSKLER\n\nKripto varlıklar ve tokenize edilmiş metallerle ilgili düzenlemeler değişebilir. Bu değişiklikler platformumuzun işleyişini ve varlıklarınızın değerini etkileyebilir.",
        "PLATFORM SORUMLULUĞU\n\nAuxite, platformun kullanımından kaynaklanan doğrudan veya dolaylı zararlardan sorumlu tutulamaz. Platform 'olduğu gibi' sunulmaktadır.",
      ],
    },
    aml: {
      title: "AML/KYC Politikası",
      lastUpdated: "Son güncelleme: 1 Aralık 2024",
      content: [
        "1. AMAÇ\n\nBu politika, Auxite'ın kara para aklama ve terör finansmanını önleme taahhüdünü ortaya koymaktadır. Tüm kullanıcılarımızın bu politikaya uyması zorunludur.",
        "2. KYC GEREKSİNİMLERİ\n\nTüm kullanıcıların kimlik doğrulama sürecini tamamlaması gerekmektedir. Bu süreç; kimlik belgesi, adres kanıtı ve selfie doğrulamasını içerir.",
        "3. İŞLEM İZLEME\n\nTüm işlemler, şüpheli aktiviteleri tespit etmek için izlenmektedir. Şüpheli işlemler incelemeye alınabilir ve yetkililere bildirilebilir.",
        "4. RİSK DEĞERLENDİRMESİ\n\nHer kullanıcı için risk değerlendirmesi yapılmaktadır. Yüksek riskli kullanıcılar için ek doğrulama gerekebilir.",
        "5. KAYIT TUTMA\n\nTüm KYC belgeleri ve işlem kayıtları, yasal gereklilikler doğrultusunda saklanmaktadır.",
        "6. EĞİTİM\n\nÇalışanlarımız, AML/KYC prosedürleri konusunda düzenli olarak eğitilmektedir.",
        "7. BİLDİRİM YÜKÜMLÜLÜĞÜ\n\nŞüpheli işlemler, ilgili düzenleyici kurumlara bildirilmektedir.",
      ],
    },
    cookies: {
      title: "Çerez Politikası",
      lastUpdated: "Son güncelleme: 1 Aralık 2024",
      content: [
        "1. ÇEREZ NEDİR?\n\nÇerezler, web sitemizi ziyaret ettiğinizde cihazınıza yerleştirilen küçük metin dosyalarıdır. Kullanıcı deneyimini iyileştirmek ve platform işlevselliğini sağlamak için kullanılırlar.",
        "2. KULLANILAN ÇEREZ TÜRLERİ\n\n• Zorunlu Çerezler: Platform işlevselliği için gerekli\n• Performans Çerezleri: Kullanım istatistikleri toplama\n• İşlevsel Çerezler: Tercihlerinizi hatırlama\n• Analitik Çerezler: Site kullanımını analiz etme",
        "3. ÇEREZ YÖNETİMİ\n\nTarayıcı ayarlarınızdan çerezleri devre dışı bırakabilirsiniz. Ancak bu, platformun bazı özelliklerinin düzgün çalışmamasına neden olabilir.",
        "4. ÜÇÜNCÜ TARAF ÇEREZLERİ\n\nAnalitik ve performans ölçümü için üçüncü taraf hizmetleri (Google Analytics vb.) kullanılabilir.",
        "5. ÇEREZ SÜRESİ\n\nOturum çerezleri tarayıcınızı kapattığınızda silinir. Kalıcı çerezler belirtilen süre boyunca cihazınızda kalır.",
      ],
    },
  },
  en: {
    terms: {
      title: "Terms of Service",
      lastUpdated: "Last updated: December 1, 2024",
      content: [
        "1. ACCEPTANCE AND BINDING\n\nBy using this website or the Auxite platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not accept these terms, do not use our platform.",
        "2. SERVICE DESCRIPTION\n\nAuxite is a platform offering digital tokens backed by physical precious metals. Through our platform, you can buy, sell, and store gold (AUXG), silver (AUXS), platinum (AUXPT), and palladium (AUXPD) tokens.",
        "3. ACCOUNT CREATION AND KYC\n\nTo use all features of our platform, you must create an account and complete the KYC (Know Your Customer) verification process. You are responsible for ensuring all information provided is accurate and up-to-date.",
        "4. RISK WARNING\n\nPrecious metal investments carry risks, and past performance does not guarantee future results. It is recommended that you conduct your own research and seek financial advice if necessary before making investment decisions.",
        "5. PRICING AND FEES\n\nTransaction fees, spread rates, and other charges are clearly stated on our platform. Fees may vary according to your Auxiteer tier.",
        "6. PHYSICAL DELIVERY\n\nYou may request physical metal delivery under certain conditions. Delivery terms, fees, and timeframes may vary by region.",
        "7. ACCOUNT SECURITY\n\nYou are responsible for your account security. We recommend using two-factor authentication (2FA) and reporting suspicious activities immediately.",
        "8. PROHIBITED ACTIVITIES\n\nOur platform may not be used for illegal activities, money laundering, terrorism financing, or any fraudulent activity.",
        "9. INTELLECTUAL PROPERTY\n\nThe Auxite brand, logo, and all platform content belong to Auxite and are protected by copyright.",
        "10. LIMITATION OF LIABILITY\n\nAuxite cannot be held responsible for direct or indirect damages arising from the use of the platform. You are responsible for your investment decisions.",
      ],
    },
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "Last updated: December 1, 2024",
      content: [
        "1. INFORMATION COLLECTED\n\nWe collect various personal data including identity information (name, date of birth), contact information (email, phone), KYC documents, transaction history, and device information.",
        "2. DATA USAGE\n\nCollected data is used for account management, KYC verification, transaction processing, customer support, legal compliance, and platform improvement.",
        "3. DATA SHARING\n\nYour personal data is not shared with third parties except for legal requirements. We work with trusted partners like Sumsub for KYC verification.",
        "4. DATA SECURITY\n\nYour data is protected with industry-standard encryption methods. Our servers are hosted in secure data centers.",
        "5. COOKIES\n\nOur platform uses cookies to improve user experience. You can manage your cookie preferences through browser settings.",
        "6. DATA RETENTION\n\nYour personal data is retained in accordance with legal requirements and business needs. If you close your account, your data will be deleted after the legal retention period.",
        "7. YOUR RIGHTS\n\nUnder GDPR and similar regulations, you have rights to access, rectify, delete, and port your data. Contact us to exercise these rights.",
        "8. CONTACT\n\nFor privacy-related questions, email privacy@auxite.com.",
      ],
    },
    disclaimer: {
      title: "Disclaimer",
      lastUpdated: "Last updated: December 1, 2024",
      content: [
        "INVESTMENT RISK\n\nPrecious metal investments may result in losses due to price fluctuations. The value of your investment can go up as well as down. Do not invest money you cannot afford to lose.",
        "NOT FINANCIAL ADVICE\n\nNo information provided on this platform should be considered financial, investment, or tax advice. It is recommended to seek independent financial advice before making investment decisions.",
        "PAST PERFORMANCE\n\nPast performance does not guarantee future results. Historical price movements are not indicative of future price movements.",
        "TECHNICAL RISKS\n\nBlockchain technology and smart contracts involve technical risks. System failures, cyber attacks, or other technical issues may affect your assets.",
        "REGULATORY RISKS\n\nRegulations regarding crypto assets and tokenized metals may change. Such changes may affect our platform's operation and the value of your assets.",
        "PLATFORM LIABILITY\n\nAuxite cannot be held responsible for direct or indirect damages arising from the use of the platform. The platform is provided 'as is'.",
      ],
    },
    aml: {
      title: "AML/KYC Policy",
      lastUpdated: "Last updated: December 1, 2024",
      content: [
        "1. PURPOSE\n\nThis policy outlines Auxite's commitment to preventing money laundering and terrorism financing. All users must comply with this policy.",
        "2. KYC REQUIREMENTS\n\nAll users must complete identity verification. This process includes ID document, proof of address, and selfie verification.",
        "3. TRANSACTION MONITORING\n\nAll transactions are monitored to detect suspicious activities. Suspicious transactions may be reviewed and reported to authorities.",
        "4. RISK ASSESSMENT\n\nRisk assessment is conducted for each user. Additional verification may be required for high-risk users.",
        "5. RECORD KEEPING\n\nAll KYC documents and transaction records are retained in accordance with legal requirements.",
        "6. TRAINING\n\nOur employees are regularly trained on AML/KYC procedures.",
        "7. REPORTING OBLIGATION\n\nSuspicious transactions are reported to relevant regulatory authorities.",
      ],
    },
    cookies: {
      title: "Cookie Policy",
      lastUpdated: "Last updated: December 1, 2024",
      content: [
        "1. WHAT ARE COOKIES?\n\nCookies are small text files placed on your device when you visit our website. They are used to improve user experience and ensure platform functionality.",
        "2. TYPES OF COOKIES USED\n\n• Essential Cookies: Required for platform functionality\n• Performance Cookies: Collect usage statistics\n• Functional Cookies: Remember your preferences\n• Analytics Cookies: Analyze site usage",
        "3. COOKIE MANAGEMENT\n\nYou can disable cookies through your browser settings. However, this may cause some platform features to not work properly.",
        "4. THIRD-PARTY COOKIES\n\nThird-party services (Google Analytics, etc.) may be used for analytics and performance measurement.",
        "5. COOKIE DURATION\n\nSession cookies are deleted when you close your browser. Persistent cookies remain on your device for the specified duration.",
      ],
    },
  },
  de: {
    terms: {
      title: "Nutzungsbedingungen",
      lastUpdated: "Zuletzt aktualisiert: 1. Dezember 2024",
      content: [
        "1. ANNAHME UND VERBINDLICHKEIT\n\nDurch die Nutzung dieser Website oder der Auxite-Plattform erkennen Sie an, dass Sie diese Nutzungsbedingungen gelesen und verstanden haben und sich daran gebunden fühlen.",
        "2. DIENSTBESCHREIBUNG\n\nAuxite ist eine Plattform, die digitale Token anbietet, die durch physische Edelmetalle gedeckt sind.",
        "3. RISIKOHINWEIS\n\nEdelmetallinvestitionen bergen Risiken. Vergangene Leistungen garantieren keine zukünftigen Ergebnisse.",
      ],
    },
    privacy: {
      title: "Datenschutzrichtlinie",
      lastUpdated: "Zuletzt aktualisiert: 1. Dezember 2024",
      content: [
        "1. GESAMMELTE INFORMATIONEN\n\nWir sammeln verschiedene personenbezogene Daten, darunter Identitätsinformationen, Kontaktinformationen, KYC-Dokumente und Transaktionshistorie.",
        "2. DATENNUTZUNG\n\nGesammelte Daten werden für Kontoverwaltung, KYC-Verifizierung, Transaktionsverarbeitung und Kundenunterstützung verwendet.",
        "3. IHRE RECHTE\n\nGemäß DSGVO haben Sie Rechte auf Zugang, Berichtigung, Löschung und Übertragbarkeit Ihrer Daten.",
      ],
    },
    disclaimer: {
      title: "Haftungsausschluss",
      lastUpdated: "Zuletzt aktualisiert: 1. Dezember 2024",
      content: [
        "INVESTITIONSRISIKO\n\nEdelmetallinvestitionen können aufgrund von Preisschwankungen zu Verlusten führen.",
        "KEINE FINANZBERATUNG\n\nKeine auf dieser Plattform bereitgestellten Informationen sollten als Finanz-, Anlage- oder Steuerberatung angesehen werden.",
      ],
    },
    aml: {
      title: "AML/KYC-Richtlinie",
      lastUpdated: "Zuletzt aktualisiert: 1. Dezember 2024",
      content: [
        "1. ZWECK\n\nDiese Richtlinie beschreibt das Engagement von Auxite zur Verhinderung von Geldwäsche und Terrorismusfinanzierung.",
        "2. KYC-ANFORDERUNGEN\n\nAlle Benutzer müssen die Identitätsverifizierung abschließen.",
      ],
    },
    cookies: {
      title: "Cookie-Richtlinie",
      lastUpdated: "Zuletzt aktualisiert: 1. Dezember 2024",
      content: [
        "1. WAS SIND COOKIES?\n\nCookies sind kleine Textdateien, die auf Ihrem Gerät platziert werden, wenn Sie unsere Website besuchen.",
        "2. COOKIE-VERWALTUNG\n\nSie können Cookies über Ihre Browsereinstellungen deaktivieren.",
      ],
    },
  },
  fr: {
    terms: {
      title: "Conditions d'Utilisation",
      lastUpdated: "Dernière mise à jour: 1 décembre 2024",
      content: [
        "1. ACCEPTATION ET ENGAGEMENT\n\nEn utilisant ce site Web ou la plateforme Auxite, vous reconnaissez avoir lu, compris et accepté d'être lié par ces Conditions d'Utilisation.",
        "2. DESCRIPTION DU SERVICE\n\nAuxite est une plateforme proposant des jetons numériques adossés à des métaux précieux physiques.",
        "3. AVERTISSEMENT SUR LES RISQUES\n\nLes investissements dans les métaux précieux comportent des risques. Les performances passées ne garantissent pas les résultats futurs.",
      ],
    },
    privacy: {
      title: "Politique de Confidentialité",
      lastUpdated: "Dernière mise à jour: 1 décembre 2024",
      content: [
        "1. INFORMATIONS COLLECTÉES\n\nNous collectons diverses données personnelles, notamment les informations d'identité, les coordonnées, les documents KYC et l'historique des transactions.",
        "2. VOS DROITS\n\nConformément au RGPD, vous avez des droits d'accès, de rectification, de suppression et de portabilité de vos données.",
      ],
    },
    disclaimer: {
      title: "Avertissement",
      lastUpdated: "Dernière mise à jour: 1 décembre 2024",
      content: [
        "RISQUE D'INVESTISSEMENT\n\nLes investissements dans les métaux précieux peuvent entraîner des pertes en raison des fluctuations de prix.",
        "PAS UN CONSEIL FINANCIER\n\nAucune information fournie sur cette plateforme ne doit être considérée comme un conseil financier, d'investissement ou fiscal.",
      ],
    },
    aml: {
      title: "Politique AML/KYC",
      lastUpdated: "Dernière mise à jour: 1 décembre 2024",
      content: [
        "1. OBJECTIF\n\nCette politique décrit l'engagement d'Auxite à prévenir le blanchiment d'argent et le financement du terrorisme.",
      ],
    },
    cookies: {
      title: "Politique de Cookies",
      lastUpdated: "Dernière mise à jour: 1 décembre 2024",
      content: [
        "1. QUE SONT LES COOKIES?\n\nLes cookies sont de petits fichiers texte placés sur votre appareil lorsque vous visitez notre site Web.",
      ],
    },
  },
  ar: {
    terms: {
      title: "شروط الخدمة",
      lastUpdated: "آخر تحديث: 1 ديسمبر 2024",
      content: [
        "1. القبول والالتزام\n\nباستخدام هذا الموقع أو منصة Auxite، فإنك تقر بأنك قرأت وفهمت ووافقت على الالتزام بشروط الخدمة هذه.",
        "2. وصف الخدمة\n\nAuxite هي منصة تقدم رموزًا رقمية مدعومة بمعادن ثمينة مادية.",
        "3. تحذير من المخاطر\n\nتنطوي استثمارات المعادن الثمينة على مخاطر. الأداء السابق لا يضمن النتائج المستقبلية.",
      ],
    },
    privacy: {
      title: "سياسة الخصوصية",
      lastUpdated: "آخر تحديث: 1 ديسمبر 2024",
      content: [
        "1. المعلومات المجمعة\n\nنقوم بجمع بيانات شخصية متنوعة بما في ذلك معلومات الهوية ومعلومات الاتصال ووثائق KYC وسجل المعاملات.",
        "2. حقوقك\n\nبموجب اللائحة العامة لحماية البيانات، لديك حقوق الوصول والتصحيح والحذف ونقل بياناتك.",
      ],
    },
    disclaimer: {
      title: "إخلاء المسؤولية",
      lastUpdated: "آخر تحديث: 1 ديسمبر 2024",
      content: [
        "مخاطر الاستثمار\n\nقد تؤدي استثمارات المعادن الثمينة إلى خسائر بسبب تقلبات الأسعار.",
        "ليست نصيحة مالية\n\nلا ينبغي اعتبار أي معلومات مقدمة على هذه المنصة نصيحة مالية أو استثمارية أو ضريبية.",
      ],
    },
    aml: {
      title: "سياسة مكافحة غسيل الأموال",
      lastUpdated: "آخر تحديث: 1 ديسمبر 2024",
      content: [
        "1. الغرض\n\nتوضح هذه السياسة التزام Auxite بمنع غسيل الأموال وتمويل الإرهاب.",
      ],
    },
    cookies: {
      title: "سياسة ملفات تعريف الارتباط",
      lastUpdated: "آخر تحديث: 1 ديسمبر 2024",
      content: [
        "1. ما هي ملفات تعريف الارتباط?\n\nملفات تعريف الارتباط هي ملفات نصية صغيرة يتم وضعها على جهازك عند زيارة موقعنا.",
      ],
    },
  },
  ru: {
    terms: {
      title: "Условия Использования",
      lastUpdated: "Последнее обновление: 1 декабря 2024",
      content: [
        "1. ПРИНЯТИЕ И ОБЯЗАТЕЛЬНОСТЬ\n\nИспользуя этот веб-сайт или платформу Auxite, вы подтверждаете, что прочитали, поняли и согласны соблюдать настоящие Условия использования.",
        "2. ОПИСАНИЕ УСЛУГИ\n\nAuxite — это платформа, предлагающая цифровые токены, обеспеченные физическими драгоценными металлами.",
        "3. ПРЕДУПРЕЖДЕНИЕ О РИСКАХ\n\nИнвестиции в драгоценные металлы сопряжены с рисками. Прошлые результаты не гарантируют будущих результатов.",
      ],
    },
    privacy: {
      title: "Политика Конфиденциальности",
      lastUpdated: "Последнее обновление: 1 декабря 2024",
      content: [
        "1. СОБИРАЕМАЯ ИНФОРМАЦИЯ\n\nМы собираем различные персональные данные, включая идентификационную информацию, контактную информацию, документы KYC и историю транзакций.",
        "2. ВАШИ ПРАВА\n\nВ соответствии с GDPR вы имеете права на доступ, исправление, удаление и перенос ваших данных.",
      ],
    },
    disclaimer: {
      title: "Отказ от Ответственности",
      lastUpdated: "Последнее обновление: 1 декабря 2024",
      content: [
        "ИНВЕСТИЦИОННЫЙ РИСК\n\nИнвестиции в драгоценные металлы могут привести к убыткам из-за колебаний цен.",
        "НЕ ФИНАНСОВАЯ КОНСУЛЬТАЦИЯ\n\nНикакая информация, представленная на этой платформе, не должна рассматриваться как финансовая, инвестиционная или налоговая консультация.",
      ],
    },
    aml: {
      title: "Политика AML/KYC",
      lastUpdated: "Последнее обновление: 1 декабря 2024",
      content: [
        "1. ЦЕЛЬ\n\nЭта политика описывает обязательство Auxite по предотвращению отмывания денег и финансирования терроризма.",
      ],
    },
    cookies: {
      title: "Политика Cookies",
      lastUpdated: "Последнее обновление: 1 декабря 2024",
      content: [
        "1. ЧТО ТАКОЕ COOKIES?\n\nCookies — это небольшие текстовые файлы, размещаемые на вашем устройстве при посещении нашего веб-сайта.",
      ],
    },
  },
};

const translations = {
  tr: { title: "Yasal Bilgiler", close: "Kapat", downloadPdf: "PDF İndir" },
  en: { title: "Legal Information", close: "Close", downloadPdf: "Download PDF" },
  de: { title: "Rechtliche Informationen", close: "Schließen", downloadPdf: "PDF herunterladen" },
  fr: { title: "Informations Légales", close: "Fermer", downloadPdf: "Télécharger PDF" },
  ar: { title: "المعلومات القانونية", close: "إغلاق", downloadPdf: "تحميل PDF" },
  ru: { title: "Юридическая Информация", close: "Закрыть", downloadPdf: "Скачать PDF" },
};

// ============================================
// COMPONENT
// ============================================

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  initialSection?: LegalSection;
}

export default function LegalModal({ isOpen, onClose, lang = "en", initialSection = "terms" }: LegalModalProps) {
  const t = translations[lang] || translations.en;
  const tabs = legalTabs[lang] || legalTabs.en;
  const content = legalContent[lang] || legalContent.en;

  const [activeSection, setActiveSection] = useState<LegalSection>(initialSection);

  if (!isOpen) return null;

  const currentContent = content[activeSection];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.title}</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">{currentContent.lastUpdated}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-stone-200 dark:border-zinc-800 overflow-x-auto">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSection === tab.id
                    ? "bg-purple-500 text-white"
                    : "bg-stone-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-stone-200 dark:hover:bg-zinc-700"
                }`}
              >
                {tab.icon}
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{currentContent.title}</h3>
          <div className="space-y-6">
            {currentContent.content.map((paragraph, index) => (
              <div key={index} className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                {paragraph}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-stone-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium hover:bg-stone-300 dark:hover:bg-zinc-600 transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
