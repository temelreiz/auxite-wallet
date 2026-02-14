"use client";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import ComplianceFooter from "@/components/ComplianceFooter";
import { useLanguage } from "@/components/LanguageContext";

const translations: Record<string, Record<string, string>> = {
  tr: {
    backToLegal: "\u2190 Yasal Belgelere Dön",
    pageTitle: "Auxite Platform Kullanım Koşulları",
    effective: "Yürürlük: 1 Ocak 2025 \u2022 Güncelleme: 20 Aralık 2025",
    intro: "Auxite platformuna erişerek veya kullanarak, bu Kullanım Koşullarını kabul etmiş olursunuz.",
    section1Title: "1. Tanımlar",
    defCertificate: "Sertifika",
    defCertificateDesc: "Auxite tarafından düzenlenen Dijital Tahsisli Metal Sertifikası",
    defTokens: "Tokenlar",
    defTokensDesc: "Tahsisli metal sahipliğini temsil eden dijital varlıklar",
    defPhysicalMetal: "Fiziksel Metal",
    defPhysicalMetalDesc: "Auxite saklama kuruluşları tarafından depolanan gerçek külçe barlar",
    defHolder: "Sahip",
    defHolderDesc: "Sertifika düzenlenen kullanıcı",
    section2Title: "2. Sertifika ve Tokenlerin Niteliği",
    section2Content: "Sertifikalar ve Tokenlar, fiziksel metal tahsisini temsil eder. Bunlar menkul kıymet, yatırım sözleşmesi, mevduat hesabı veya elektronik para DEĞİLDİR.",
    section3Title: "3. Sertifika Geçerliliği ve Tahsis Kayıtları",
    section3Content1: "Dijital Sertifikalar, tahsisi kanıtlayan bilgilendirme kayıtlarıdır. Yetkili kayıt, Auxite dahili defteri ve saklama kuruluşu kayıtlarıdır.",
    section3Content2: "Auxite, yeniden tahsis, konsolidasyon, geri ödeme veya saklama değişiklikleri durumunda sertifikaları değiştirebilir, birleştirebilir veya geçersiz kılabilir.",
    section4Title: "4. Saklama ve Denetim",
    section4Content: "Fiziksel metal, Onaylı Saklama Kuruluşları tarafından tamamen tahsisli, ayrılmış saklama koşullarında depolanır. Auxite, düzenli aralıklarla üçüncü taraf denetçilerle çalışır.",
    section5Title: "5. Geri Ödeme",
    section5Content: "Geri ödeme talepleri, Auxite'ın geri ödeme politikalarına uygun olmalıdır. Fiziksel teslimat, lojistik ve düzenleyici gereksinimlere tabidir.",
    section6Title: "6. Sorumluluk Sınırlaması",
    section6Content: "Auxite'ın toplam sorumluluğu, ilgili Tokenlar veya Sertifikalar için ödenen tutarı aşamaz. Auxite, dolaylı veya sonuç olarak ortaya çıkan zararlardan sorumlu değildir.",
    section7Title: "7. Değişiklikler",
    section7Content: "Auxite bu Kullanım Koşullarını güncelleyebilir. Güncellemeler yayınlandığında yürürlüğe girer. Kullanmaya devam etmeniz kabul anlamına gelir.",
  },
  en: {
    backToLegal: "\u2190 Back to Legal",
    pageTitle: "Auxite Platform Terms of Service",
    effective: "Effective: January 1, 2025 \u2022 Updated: December 20, 2025",
    intro: "By accessing or using the Auxite platform, you agree to these Terms of Service.",
    section1Title: "1. Definitions",
    defCertificate: "Certificate",
    defCertificateDesc: "Digital Allocated Metal Certificate issued by Auxite",
    defTokens: "Tokens",
    defTokensDesc: "Digital assets representing allocated metal ownership",
    defPhysicalMetal: "Physical Metal",
    defPhysicalMetalDesc: "Actual bullion bars stored by Auxite custodians",
    defHolder: "Holder",
    defHolderDesc: "User to whom a Certificate is issued",
    section2Title: "2. Nature of Certificates and Tokens",
    section2Content: "Certificates and Tokens represent an allocation of physical metal. They are NOT securities, investment contracts, deposit accounts, or electronic money.",
    section3Title: "3. Certificate Validity & Allocation Records",
    section3Content1: "Digital Certificates are informational records evidencing allocation. The authoritative record is the Auxite internal ledger and custodian records.",
    section3Content2: "Auxite may replace, consolidate, or void certificates in the event of reallocation, consolidation, redemption, or custody changes.",
    section4Title: "4. Custody and Audit",
    section4Content: "Physical metal is stored with Approved Custodians under fully allocated, segregated custody. Auxite engages third-party auditors at regular intervals.",
    section5Title: "5. Redemption",
    section5Content: "Redemption requests must comply with Auxite's redemption policies. Physical delivery is subject to logistical and regulatory requirements.",
    section6Title: "6. Limitation of Liability",
    section6Content: "Auxite's total liability shall not exceed the amount paid for related Tokens or Certificates. Auxite is not liable for indirect or consequential damages.",
    section7Title: "7. Amendments",
    section7Content: "Auxite may update these ToS. Updates are effective upon posting. Continued use constitutes acceptance.",
  },
  de: {
    backToLegal: "\u2190 Zurück zu Rechtliches",
    pageTitle: "Auxite Plattform Nutzungsbedingungen",
    effective: "Gültig ab: 1. Januar 2025 \u2022 Aktualisiert: 20. Dezember 2025",
    intro: "Durch den Zugang zur oder die Nutzung der Auxite-Plattform stimmen Sie diesen Nutzungsbedingungen zu.",
    section1Title: "1. Definitionen",
    defCertificate: "Zertifikat",
    defCertificateDesc: "Von Auxite ausgestelltes digitales zugewiesenes Metallzertifikat",
    defTokens: "Token",
    defTokensDesc: "Digitale Vermögenswerte, die zugewiesenes Metalleigentum repräsentieren",
    defPhysicalMetal: "Physisches Metall",
    defPhysicalMetalDesc: "Tatsächliche Barren, die von Auxite-Verwahrern gelagert werden",
    defHolder: "Inhaber",
    defHolderDesc: "Benutzer, dem ein Zertifikat ausgestellt wird",
    section2Title: "2. Art der Zertifikate und Token",
    section2Content: "Zertifikate und Token repräsentieren eine Zuweisung von physischem Metall. Sie sind KEINE Wertpapiere, Investitionsverträge, Einlagenkonten oder elektronisches Geld.",
    section3Title: "3. Zertifikatsgültigkeit und Zuweisungsaufzeichnungen",
    section3Content1: "Digitale Zertifikate sind Informationsaufzeichnungen, die eine Zuweisung belegen. Die maßgebliche Aufzeichnung ist das interne Auxite-Hauptbuch und die Verwahraufzeichnungen.",
    section3Content2: "Auxite kann Zertifikate im Falle einer Neuzuweisung, Konsolidierung, Rücknahme oder Verwahrungsänderung ersetzen, zusammenlegen oder für ungültig erklären.",
    section4Title: "4. Verwahrung und Prüfung",
    section4Content: "Physisches Metall wird bei zugelassenen Verwahrern unter vollständig zugewiesener, getrennter Verwahrung gelagert. Auxite beauftragt in regelmäßigen Abständen unabhängige Prüfer.",
    section5Title: "5. Rücknahme",
    section5Content: "Rücknahmeanträge müssen den Rücknahmerichtlinien von Auxite entsprechen. Die physische Lieferung unterliegt logistischen und regulatorischen Anforderungen.",
    section6Title: "6. Haftungsbeschränkung",
    section6Content: "Die Gesamthaftung von Auxite darf den für die betreffenden Token oder Zertifikate gezahlten Betrag nicht übersteigen. Auxite haftet nicht für indirekte oder Folgeschäden.",
    section7Title: "7. Änderungen",
    section7Content: "Auxite kann diese Nutzungsbedingungen aktualisieren. Aktualisierungen werden mit der Veröffentlichung wirksam. Die fortgesetzte Nutzung gilt als Zustimmung.",
  },
  fr: {
    backToLegal: "\u2190 Retour aux Documents Juridiques",
    pageTitle: "Conditions d'Utilisation de la Plateforme Auxite",
    effective: "En vigueur : 1er janvier 2025 \u2022 Mise à jour : 20 décembre 2025",
    intro: "En accédant ou en utilisant la plateforme Auxite, vous acceptez ces Conditions d'Utilisation.",
    section1Title: "1. Définitions",
    defCertificate: "Certificat",
    defCertificateDesc: "Certificat numérique de métal alloué émis par Auxite",
    defTokens: "Jetons",
    defTokensDesc: "Actifs numériques représentant la propriété de métal alloué",
    defPhysicalMetal: "Métal Physique",
    defPhysicalMetalDesc: "Barres de lingots réelles stockées par les dépositaires d'Auxite",
    defHolder: "Détenteur",
    defHolderDesc: "Utilisateur auquel un Certificat est délivré",
    section2Title: "2. Nature des Certificats et des Jetons",
    section2Content: "Les Certificats et les Jetons représentent une allocation de métal physique. Ils NE SONT PAS des valeurs mobilières, des contrats d'investissement, des comptes de dépôt ou de la monnaie électronique.",
    section3Title: "3. Validité des Certificats et Registres d'Allocation",
    section3Content1: "Les Certificats numériques sont des enregistrements informatifs attestant de l'allocation. L'enregistrement faisant autorité est le registre interne d'Auxite et les registres du dépositaire.",
    section3Content2: "Auxite peut remplacer, consolider ou annuler des certificats en cas de réallocation, de consolidation, de rachat ou de changement de garde.",
    section4Title: "4. Garde et Audit",
    section4Content: "Le métal physique est stocké auprès de Dépositaires Agréés sous garde entièrement allouée et séparée. Auxite fait appel à des auditeurs tiers à intervalles réguliers.",
    section5Title: "5. Rachat",
    section5Content: "Les demandes de rachat doivent être conformes aux politiques de rachat d'Auxite. La livraison physique est soumise aux exigences logistiques et réglementaires.",
    section6Title: "6. Limitation de Responsabilité",
    section6Content: "La responsabilité totale d'Auxite ne saurait excéder le montant payé pour les Jetons ou Certificats concernés. Auxite n'est pas responsable des dommages indirects ou consécutifs.",
    section7Title: "7. Modifications",
    section7Content: "Auxite peut mettre à jour ces Conditions d'Utilisation. Les mises à jour prennent effet dès leur publication. L'utilisation continue constitue une acceptation.",
  },
  ar: {
    backToLegal: "\u2190 العودة إلى الشؤون القانونية",
    pageTitle: "شروط خدمة منصة أوكسايت",
    effective: "تاريخ السريان: 1 يناير 2025 \u2022 التحديث: 20 ديسمبر 2025",
    intro: "بالوصول إلى منصة أوكسايت أو استخدامها، فإنك توافق على شروط الخدمة هذه.",
    section1Title: "1. التعريفات",
    defCertificate: "الشهادة",
    defCertificateDesc: "شهادة معدن مخصصة رقمية صادرة عن أوكسايت",
    defTokens: "الرموز",
    defTokensDesc: "أصول رقمية تمثل ملكية المعدن المخصص",
    defPhysicalMetal: "المعدن المادي",
    defPhysicalMetalDesc: "سبائك حقيقية مخزنة لدى أمناء حفظ أوكسايت",
    defHolder: "الحامل",
    defHolderDesc: "المستخدم الذي صدرت له الشهادة",
    section2Title: "2. طبيعة الشهادات والرموز",
    section2Content: "تمثل الشهادات والرموز تخصيصاً للمعدن المادي. وهي ليست أوراقاً مالية أو عقود استثمار أو حسابات ودائع أو نقوداً إلكترونية.",
    section3Title: "3. صلاحية الشهادات وسجلات التخصيص",
    section3Content1: "الشهادات الرقمية هي سجلات إعلامية تثبت التخصيص. السجل المعتمد هو دفتر أوكسايت الداخلي وسجلات أمين الحفظ.",
    section3Content2: "يجوز لأوكسايت استبدال أو دمج أو إبطال الشهادات في حالة إعادة التخصيص أو الدمج أو الاسترداد أو تغييرات الحفظ.",
    section4Title: "4. الحفظ والتدقيق",
    section4Content: "يتم تخزين المعدن المادي لدى أمناء حفظ معتمدين تحت حفظ مخصص بالكامل ومنفصل. تستعين أوكسايت بمدققين مستقلين على فترات منتظمة.",
    section5Title: "5. الاسترداد",
    section5Content: "يجب أن تتوافق طلبات الاسترداد مع سياسات الاسترداد الخاصة بأوكسايت. يخضع التسليم المادي للمتطلبات اللوجستية والتنظيمية.",
    section6Title: "6. تحديد المسؤولية",
    section6Content: "لا تتجاوز المسؤولية الإجمالية لأوكسايت المبلغ المدفوع مقابل الرموز أو الشهادات المعنية. لا تتحمل أوكسايت مسؤولية الأضرار غير المباشرة أو التبعية.",
    section7Title: "7. التعديلات",
    section7Content: "يجوز لأوكسايت تحديث شروط الخدمة هذه. تصبح التحديثات سارية المفعول عند نشرها. يعتبر الاستمرار في الاستخدام بمثابة قبول.",
  },
  ru: {
    backToLegal: "\u2190 Назад к Юридическим документам",
    pageTitle: "Условия использования платформы Auxite",
    effective: "Вступает в силу: 1 января 2025 \u2022 Обновлено: 20 декабря 2025",
    intro: "Получая доступ к платформе Auxite или используя её, вы соглашаетесь с настоящими Условиями использования.",
    section1Title: "1. Определения",
    defCertificate: "Сертификат",
    defCertificateDesc: "Цифровой сертификат выделенного металла, выданный Auxite",
    defTokens: "Токены",
    defTokensDesc: "Цифровые активы, представляющие право собственности на выделенный металл",
    defPhysicalMetal: "Физический металл",
    defPhysicalMetalDesc: "Реальные слитки, хранящиеся у хранителей Auxite",
    defHolder: "Держатель",
    defHolderDesc: "Пользователь, которому выдан Сертификат",
    section2Title: "2. Природа Сертификатов и Токенов",
    section2Content: "Сертификаты и Токены представляют собой распределение физического металла. Они НЕ являются ценными бумагами, инвестиционными контрактами, депозитными счетами или электронными деньгами.",
    section3Title: "3. Действительность Сертификатов и Записи о Распределении",
    section3Content1: "Цифровые Сертификаты являются информационными записями, подтверждающими распределение. Авторитетной записью является внутренний реестр Auxite и записи хранителя.",
    section3Content2: "Auxite может заменять, консолидировать или аннулировать сертификаты в случае перераспределения, консолидации, погашения или изменения условий хранения.",
    section4Title: "4. Хранение и Аудит",
    section4Content: "Физический металл хранится у Одобренных Хранителей на условиях полностью выделенного, обособленного хранения. Auxite привлекает сторонних аудиторов на регулярной основе.",
    section5Title: "5. Погашение",
    section5Content: "Запросы на погашение должны соответствовать политике погашения Auxite. Физическая доставка зависит от логистических и нормативных требований.",
    section6Title: "6. Ограничение Ответственности",
    section6Content: "Общая ответственность Auxite не может превышать сумму, уплаченную за соответствующие Токены или Сертификаты. Auxite не несёт ответственности за косвенные или последующие убытки.",
    section7Title: "7. Изменения",
    section7Content: "Auxite может обновлять настоящие Условия использования. Обновления вступают в силу с момента публикации. Продолжение использования означает принятие условий.",
  },
};

export default function TermsPage() {
  const { lang } = useLanguage();
  const t = (key: string) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/legal" className="inline-flex items-center gap-2 text-[#2F6F62] hover:underline mb-6">
          {t("backToLegal")}
        </Link>
        <article className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12">
          <header className="mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t("pageTitle")}</h1>
            <p className="text-sm text-slate-500">{t("effective")}</p>
          </header>
          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
            <p>{t("intro")}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section1Title")}</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>&ldquo;{t("defCertificate")}&rdquo;</strong> - {t("defCertificateDesc")}</li>
              <li><strong>&ldquo;{t("defTokens")}&rdquo;</strong> - {t("defTokensDesc")}</li>
              <li><strong>&ldquo;{t("defPhysicalMetal")}&rdquo;</strong> - {t("defPhysicalMetalDesc")}</li>
              <li><strong>&ldquo;{t("defHolder")}&rdquo;</strong> - {t("defHolderDesc")}</li>
            </ul>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section2Title")}</h2>
            <p>{t("section2Content")}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section3Title")}</h2>
            <div className="bg-[#BFA181]/10 dark:bg-[#BFA181]/20 border border-[#BFA181]/30 dark:border-[#BFA181]/30 rounded-lg p-4">
              <p className="text-sm">{t("section3Content1")}</p>
              <p className="text-sm mt-2">{t("section3Content2")}</p>
            </div>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section4Title")}</h2>
            <p>{t("section4Content")}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section5Title")}</h2>
            <p>{t("section5Content")}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section6Title")}</h2>
            <p>{t("section6Content")}</p>

            <h2 className="text-xl font-bold text-slate-800 dark:text-white mt-8">{t("section7Title")}</h2>
            <p>{t("section7Content")}</p>
          </div>
        </article>
      </main>
      <ComplianceFooter />
    </div>
  );
}
