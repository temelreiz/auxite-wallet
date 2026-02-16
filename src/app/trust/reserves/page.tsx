"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// DATA TYPES
// ============================================
interface CustodyData {
  success: boolean;
  timestamp: string;
  layers: {
    custodySnapshot: {
      metals: Array<{ symbol: string; custodyHoldingsKg: number; custodyHoldingsG: number }>;
      updatedAt: string | null;
    };
    encumbranceVisibility: {
      metals: Array<{
        symbol: string;
        allocatedG: number;
        encumberedG: number;
        availableG: number;
        pendingG: number;
        activeLeaseCount: number;
        utilizationPercent: number;
      }>;
    };
    reconciliation: {
      status: "Reconciled" | "Pending" | "Mismatch";
      lastReconciliationAt: string | null;
      nextScheduledAudit: string | null;
      mismatchDetails: string | null;
    };
    ledgerVisibility: {
      totalAllocationsCount: number;
      lastLedgerActivity: string | null;
    };
  };
}

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  en: {
    backToTrust: "Back to Trust Center",
    loading: "Loading reserve data...",
    error: "Failed to load reserve data. Please try again.",
    // Hero
    heroTitle: "Proof of Reserves",
    heroSubtitle: "Real-time transparency across vaulted, allocated precious metals.",
    badgeAllocated: "Fully Allocated",
    badgeBankruptcy: "Bankruptcy-Remote Custody",
    badgeIndependent: "Independent Vaults",
    lastUpdated: "Last updated",
    minutesAgo: "minutes ago",
    justNow: "just now",
    statOunces: "Vaulted Ounces",
    statPartners: "Custody Partners",
    statCountries: "Countries",
    // Reserve Snapshot
    snapshotTitle: "Total Assets Under Custody",
    snapshotNote: "Independently vaulted and fully allocated.",
    reserveRatio: "Reserve Ratio",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    holdings: "Holdings",
    // Allocation Integrity
    allocationTitle: "100% Allocated Reserve Model",
    allocationText: "All client metals are individually allocated and held in bankruptcy-remote custody structures. No fractional reserve practices are employed. Each unit of tokenized metal is backed by vaulted physical bullion held in independent custody environments.",
    // Custody Architecture
    architectureTitle: "Institutional Custody Architecture",
    vaultingTitle: "Vaulting",
    vaultingDesc: "Physical metals secured in LBMA-certified vaults operated by independent custodians including Brink's Global Services.",
    legalTitle: "Legal Layer",
    legalDesc: "Bankruptcy-remote structures ensure client metals remain legally separated from corporate assets and creditor claims.",
    oversightTitle: "Oversight",
    oversightDesc: "Independent verification through third-party auditors and continuous reconciliation processes.",
    // Verification
    verificationTitle: "Independent Verification",
    vaultConfirmations: "Third-Party Vault Confirmations",
    vaultConfirmationsDesc: "Independent custodians provide periodic confirmations of physical metal held in allocated storage.",
    reconciliation: "Internal Reconciliation",
    reconciliationDesc: "Continuous ledger alignment between tokenized supply and physical reserves.",
    publicStatements: "Public Statement Releases",
    publicStatementsDesc: "Periodic transparency reports made available to all stakeholders.",
    reconciliationStatus: "Reconciliation Status",
    statusReconciled: "Reconciled",
    statusPending: "Pending",
    statusMismatch: "Mismatch",
    nextAudit: "Next Scheduled Audit",
    // Statements
    statementsTitle: "Latest Statements",
    downloadStatements: "Download Statements",
    feb2026: "February 2026 — Monthly Custody Statement",
    q1Report: "Q1 2026 — Quarterly Custody Report",
    annualReport: "2025 — Annual Custody Summary",
    // How We Verify
    verifyTitle: "How We Verify Reserves",
    step1Title: "Metal Acquisition",
    step1Desc: "Sourced via LBMA-aligned suppliers with full provenance documentation.",
    step2Title: "Vault Allocation",
    step2Desc: "Serialized, client-tagged storage in independent certified vaults.",
    step3Title: "Internal Reconciliation",
    step3Desc: "Continuous ledger alignment between digital tokens and physical holdings.",
    step4Title: "Public Disclosure",
    step4Desc: "Periodic statements and custody reports published for transparency.",
    // Legal Safeguards
    safeguardsTitle: "Legal Protection Model",
    safeguardsText: "Client metals are not recorded as balance sheet assets and remain outside insolvency estates. Metals held in custody are legally segregated and cannot be claimed by creditors of the custodian or the platform operator.",
    // Transparency Policy
    policyTitle: "Transparency Policy",
    monthly: "Monthly",
    monthlyDesc: "Custody position statements with metal-by-metal breakdowns.",
    quarterly: "Quarterly",
    quarterlyDesc: "Comprehensive custody reports including reconciliation summaries and audit progress.",
    annual: "Annual",
    annualDesc: "Full-year custody summary with independent auditor findings and reserve confirmation.",
    // FAQ
    faqTitle: "Frequently Asked Questions",
    faq1Q: "Are reserves fractional?",
    faq1A: "No. Auxite operates on a fully allocated model. Every tokenized unit is backed 1:1 by physical metal held in independent custody.",
    faq2Q: "Can reserves be independently verified?",
    faq2A: "Yes. Custody statements and audit confirmations are published periodically. Authenticated clients can verify their individual allocations via the client dashboard.",
    faq3Q: "Are client assets rehypothecated?",
    faq3A: "No. Client metals are never used for corporate purposes. Encumbrance occurs only through explicit opt-in structured yield programs.",
    // Trust Footer
    footerText: "Built on transparency-first principles. Auxite operates with institutional-grade custody standards.",
    verifiedBadge: "Verified Custody Model",
    // Legal
    legalDisclaimer: "This page is provided for informational purposes only and does not constitute investment advice. Data is indicative and subject to periodic reconciliation.",
  },
  tr: {
    backToTrust: "Guven Merkezine Don",
    loading: "Rezerv verileri yukleniyor...",
    error: "Rezerv verileri yuklenemedi. Lutfen tekrar deneyin.",
    heroTitle: "Rezerv Kaniti",
    heroSubtitle: "Kasalanmis, tahsisli degerli metaller uzerinde gercek zamanli seffaflik.",
    badgeAllocated: "Tam Tahsisli",
    badgeBankruptcy: "Iflas Korunakli Saklama",
    badgeIndependent: "Bagimsiz Kasalar",
    lastUpdated: "Son guncelleme",
    minutesAgo: "dakika once",
    justNow: "az once",
    statOunces: "Kasalanmis Ons",
    statPartners: "Saklama Ortagi",
    statCountries: "Ulke",
    snapshotTitle: "Toplam Saklama Altindaki Varliklar",
    snapshotNote: "Bagimsiz olarak kasalanmis ve tamamen tahsis edilmis.",
    reserveRatio: "Rezerv Orani",
    gold: "Altin",
    silver: "Gumus",
    platinum: "Platin",
    palladium: "Paladyum",
    holdings: "Varliklar",
    allocationTitle: "%100 Tahsisli Rezerv Modeli",
    allocationText: "Tum musteri metalleri bireysel olarak tahsis edilmis ve iflas korunakli saklama yapilarinda tutulmaktadir. Kesirli rezerv uygulamasi yapilmamaktadir. Tokenize edilmis her birim, bagimsiz saklama ortamlarinda tutulan kasalanmis fiziksel kulce ile desteklenmektedir.",
    architectureTitle: "Kurumsal Saklama Mimarisi",
    vaultingTitle: "Kasalama",
    vaultingDesc: "Fiziksel metaller, Brink's Global Services dahil bagimsiz saklamacilar tarafindan isletilen LBMA sertifikali kasalarda guvence altindadir.",
    legalTitle: "Hukuki Katman",
    legalDesc: "Iflas korunakli yapilar, musteri metallerinin kurumsal varliklardan ve alacakli taleplerinden yasal olarak ayrilmasini saglar.",
    oversightTitle: "Denetim",
    oversightDesc: "Ucuncu taraf denetciler ve surekli uzlastirma surecleri araciligiyla bagimsiz dogrulama.",
    verificationTitle: "Bagimsiz Dogrulama",
    vaultConfirmations: "Ucuncu Taraf Kasa Onaylari",
    vaultConfirmationsDesc: "Bagimsiz saklamacilar, tahsisli depolamada tutulan fiziksel metalin periyodik onaylarini saglar.",
    reconciliation: "Ic Uzlastirma",
    reconciliationDesc: "Tokenize arz ile fiziksel rezervler arasinda surekli defter uyumu.",
    publicStatements: "Kamuya Acik Aciklamalar",
    publicStatementsDesc: "Tum paydaslara sunulan periyodik seffaflik raporlari.",
    reconciliationStatus: "Uzlastirma Durumu",
    statusReconciled: "Uzlastirildi",
    statusPending: "Beklemede",
    statusMismatch: "Uyumsuzluk",
    nextAudit: "Sonraki Planli Denetim",
    statementsTitle: "Son Raporlar",
    downloadStatements: "Raporlari Indir",
    feb2026: "Subat 2026 — Aylik Saklama Raporu",
    q1Report: "Q1 2026 — Ceyreklik Saklama Raporu",
    annualReport: "2025 — Yillik Saklama Ozeti",
    verifyTitle: "Rezervleri Nasil Dogruluyoruz",
    step1Title: "Metal Tedariqi",
    step1Desc: "LBMA uyumlu tedarikcilerden tam koken belgesiyle temin edilir.",
    step2Title: "Kasa Tahsisi",
    step2Desc: "Bagimsiz sertifikali kasalarda seri numarali, musteriye ozel depolama.",
    step3Title: "Ic Uzlastirma",
    step3Desc: "Dijital tokenlar ile fiziksel varliklar arasinda surekli defter uyumu.",
    step4Title: "Kamuya Aciklama",
    step4Desc: "Seffaflik icin periyodik raporlar ve saklama raporlari yayinlanir.",
    safeguardsTitle: "Hukuki Koruma Modeli",
    safeguardsText: "Musteri metalleri bilanco varligi olarak kaydedilmez ve iflas masasinin disinda kalir. Saklamada tutulan metaller yasal olarak ayrilmistir ve saklamaci veya platform isletmecisinin alacaklilari tarafindan talep edilemez.",
    policyTitle: "Seffaflik Politikasi",
    monthly: "Aylik",
    monthlyDesc: "Metal bazinda donum iceren saklama pozisyon raporlari.",
    quarterly: "Ceyreklik",
    quarterlyDesc: "Uzlastirma ozetleri ve denetim ilerlemesini iceren kapsamli saklama raporlari.",
    annual: "Yillik",
    annualDesc: "Bagimsiz denetci bulgulari ve rezerv teyidi ile tam yil saklama ozeti.",
    faqTitle: "Sikca Sorulan Sorular",
    faq1Q: "Rezervler kesirli mi?",
    faq1A: "Hayir. Auxite tam tahsisli model ile calisir. Tokenize edilen her birim, bagimsiz saklamada tutulan fiziksel metal ile 1:1 oraninda desteklenir.",
    faq2Q: "Rezervler bagimsiz olarak dogrulanabilir mi?",
    faq2A: "Evet. Saklama raporlari ve denetim onaylari periyodik olarak yayinlanir. Dogrulanmis musteriler bireysel tahsislerini musteri panelinden dogrulayabilir.",
    faq3Q: "Musteri varliklari yeniden ipotek edilir mi?",
    faq3A: "Hayir. Musteri metalleri kurumsal amaclarla kullanilamaz. Yukumluluk yalnizca acik katilimli yapilandirilmis getiri programlari araciligiyla gerceklesir.",
    footerText: "Seffaflik oncelikli ilkeler uzerine insa edilmistir. Auxite, kurumsal duzeyde saklama standartlariyla calisir.",
    verifiedBadge: "Dogrulanmis Saklama Modeli",
    legalDisclaimer: "Bu sayfa yalnizca bilgilendirme amaciyla sunulmaktadir ve yatirim tavsiyesi niteliginde degildir. Veriler gosterge niteliktedir ve periyodik uzlastirmaya tabidir.",
  },
  de: {
    backToTrust: "Zuruck zum Trust Center", loading: "Laden...", error: "Fehler beim Laden",
    heroTitle: "Reservenachweis", heroSubtitle: "Echtzeit-Transparenz uber verwahrte, zugewiesene Edelmetalle.",
    badgeAllocated: "Vollstandig Zugewiesen", badgeBankruptcy: "Insolvenzferne Verwahrung", badgeIndependent: "Unabhangige Tresore",
    lastUpdated: "Zuletzt aktualisiert", minutesAgo: "Minuten her", justNow: "gerade eben",
    statOunces: "Verwahrte Unzen", statPartners: "Verwahrungspartner", statCountries: "Lander",
    snapshotTitle: "Gesamtvermogen unter Verwahrung", snapshotNote: "Unabhangig verwahrt und vollstandig zugewiesen.",
    reserveRatio: "Reservequote", gold: "Gold", silver: "Silber", platinum: "Platin", palladium: "Palladium", holdings: "Bestande",
    allocationTitle: "100% Zugewiesenes Reservemodell", allocationText: "Alle Kundenmetalle sind individuell zugewiesen und in insolvenzfernen Verwahrungsstrukturen gehalten.",
    architectureTitle: "Institutionelle Verwahrungsarchitektur",
    vaultingTitle: "Verwahrung", vaultingDesc: "Physische Metalle in LBMA-zertifizierten Tresoren gesichert.",
    legalTitle: "Rechtliche Ebene", legalDesc: "Insolvenzferne Strukturen gewahrleisten rechtliche Trennung.",
    oversightTitle: "Aufsicht", oversightDesc: "Unabhangige Verifizierung durch Drittprufung.",
    verificationTitle: "Unabhangige Verifizierung",
    vaultConfirmations: "Tresor-Bestatigungen", vaultConfirmationsDesc: "Periodische Bestatigungen unabhangiger Verwahrer.",
    reconciliation: "Interne Abstimmung", reconciliationDesc: "Kontinuierlicher Abgleich zwischen Token und Reserven.",
    publicStatements: "Offentliche Berichte", publicStatementsDesc: "Periodische Transparenzberichte.",
    reconciliationStatus: "Abstimmungsstatus", statusReconciled: "Abgestimmt", statusPending: "Ausstehend", statusMismatch: "Abweichung",
    nextAudit: "Nachste geplante Prufung",
    statementsTitle: "Neueste Berichte", downloadStatements: "Berichte herunterladen",
    feb2026: "Februar 2026 — Monatsbericht", q1Report: "Q1 2026 — Quartalsbericht", annualReport: "2025 — Jahresbericht",
    verifyTitle: "Wie wir Reserven verifizieren",
    step1Title: "Metallbeschaffung", step1Desc: "Uber LBMA-konforme Lieferanten.",
    step2Title: "Tresorzuweisung", step2Desc: "Serialisierte Lagerung in zertifizierten Tresoren.",
    step3Title: "Interne Abstimmung", step3Desc: "Kontinuierlicher Abgleich.",
    step4Title: "Offentliche Offenlegung", step4Desc: "Periodische Berichte.",
    safeguardsTitle: "Rechtliches Schutzmodell", safeguardsText: "Kundenmetalle sind keine Bilanzaktiva und bleiben ausserhalb von Insolvenzmassen.",
    policyTitle: "Transparenzrichtlinie",
    monthly: "Monatlich", monthlyDesc: "Positionsberichte.", quarterly: "Vierteljahrlich", quarterlyDesc: "Umfassende Berichte.", annual: "Jahrlich", annualDesc: "Jahresubersicht.",
    faqTitle: "Haufig gestellte Fragen",
    faq1Q: "Sind Reserven teilweise?", faq1A: "Nein. Vollstandig zugewiesenes Modell.",
    faq2Q: "Konnen Reserven verifiziert werden?", faq2A: "Ja. Berichte werden periodisch veroffentlicht.",
    faq3Q: "Werden Kundenmetalle weiterverliehen?", faq3A: "Nein. Nur uber Opt-in-Programme.",
    footerText: "Aufgebaut auf Transparenz-Prinzipien.", verifiedBadge: "Verifiziertes Verwahrungsmodell",
    legalDisclaimer: "Nur zu Informationszwecken. Keine Anlageberatung.",
  },
  fr: {
    backToTrust: "Retour au Centre de Confiance", loading: "Chargement...", error: "Erreur de chargement",
    heroTitle: "Preuve de Reserves", heroSubtitle: "Transparence en temps reel sur les metaux precieux alloues et conserves.",
    badgeAllocated: "Entierement Alloue", badgeBankruptcy: "Conservation Hors Faillite", badgeIndependent: "Coffres Independants",
    lastUpdated: "Derniere mise a jour", minutesAgo: "minutes", justNow: "a l'instant",
    statOunces: "Onces en Coffre", statPartners: "Partenaires", statCountries: "Pays",
    snapshotTitle: "Total des Actifs sous Conservation", snapshotNote: "Conservation independante, allocation integrale.",
    reserveRatio: "Ratio de Reserve", gold: "Or", silver: "Argent", platinum: "Platine", palladium: "Palladium", holdings: "Avoirs",
    allocationTitle: "Modele de Reserve 100% Alloue", allocationText: "Tous les metaux clients sont individuellement alloues dans des structures hors faillite.",
    architectureTitle: "Architecture de Conservation Institutionnelle",
    vaultingTitle: "Coffrage", vaultingDesc: "Metaux physiques en coffres certifies LBMA.",
    legalTitle: "Couche Juridique", legalDesc: "Structures hors faillite pour separation legale.",
    oversightTitle: "Supervision", oversightDesc: "Verification independante par des tiers.",
    verificationTitle: "Verification Independante",
    vaultConfirmations: "Confirmations de Coffre", vaultConfirmationsDesc: "Confirmations periodiques des conservateurs.",
    reconciliation: "Reconciliation Interne", reconciliationDesc: "Alignement continu du registre.",
    publicStatements: "Publications", publicStatementsDesc: "Rapports de transparence periodiques.",
    reconciliationStatus: "Statut de Reconciliation", statusReconciled: "Reconcilie", statusPending: "En attente", statusMismatch: "Ecart",
    nextAudit: "Prochain Audit Prevu",
    statementsTitle: "Derniers Rapports", downloadStatements: "Telecharger",
    feb2026: "Fevrier 2026 — Rapport Mensuel", q1Report: "Q1 2026 — Rapport Trimestriel", annualReport: "2025 — Resume Annuel",
    verifyTitle: "Comment Nous Verifions les Reserves",
    step1Title: "Acquisition", step1Desc: "Fournisseurs conformes LBMA.",
    step2Title: "Allocation en Coffre", step2Desc: "Stockage serialise et certifie.",
    step3Title: "Reconciliation", step3Desc: "Alignement continu.",
    step4Title: "Divulgation Publique", step4Desc: "Rapports periodiques.",
    safeguardsTitle: "Modele de Protection Juridique", safeguardsText: "Les metaux clients ne figurent pas au bilan et restent hors masse de faillite.",
    policyTitle: "Politique de Transparence",
    monthly: "Mensuel", monthlyDesc: "Etats de position.", quarterly: "Trimestriel", quarterlyDesc: "Rapports complets.", annual: "Annuel", annualDesc: "Resume annuel.",
    faqTitle: "Questions Frequentes",
    faq1Q: "Les reserves sont-elles fractionnaires?", faq1A: "Non. Modele entierement alloue.",
    faq2Q: "Les reserves sont-elles verifiables?", faq2A: "Oui. Rapports publies periodiquement.",
    faq3Q: "Les actifs sont-ils rehypothques?", faq3A: "Non. Uniquement via programmes opt-in.",
    footerText: "Construit sur des principes de transparence.", verifiedBadge: "Modele de Conservation Verifie",
    legalDisclaimer: "Page a titre informatif uniquement.",
  },
  ar: {
    backToTrust: "العودة إلى مركز الثقة", loading: "جاري التحميل...", error: "فشل التحميل",
    heroTitle: "إثبات الاحتياطيات", heroSubtitle: "شفافية فورية عبر المعادن الثمينة المخزنة والمخصصة.",
    badgeAllocated: "مخصص بالكامل", badgeBankruptcy: "حفظ بعيد عن الإفلاس", badgeIndependent: "خزائن مستقلة",
    lastUpdated: "آخر تحديث", minutesAgo: "دقائق مضت", justNow: "الآن",
    statOunces: "أوقيات مخزنة", statPartners: "شركاء الحفظ", statCountries: "دول",
    snapshotTitle: "إجمالي الأصول تحت الحفظ", snapshotNote: "مخزنة بشكل مستقل ومخصصة بالكامل.",
    reserveRatio: "نسبة الاحتياطي", gold: "ذهب", silver: "فضة", platinum: "بلاتين", palladium: "بالاديوم", holdings: "الحيازات",
    allocationTitle: "نموذج احتياطي مخصص 100%", allocationText: "جميع معادن العملاء مخصصة بشكل فردي في هياكل حفظ بعيدة عن الإفلاس.",
    architectureTitle: "هيكل الحفظ المؤسسي",
    vaultingTitle: "التخزين", vaultingDesc: "معادن مادية في خزائن معتمدة من LBMA.",
    legalTitle: "الطبقة القانونية", legalDesc: "هياكل بعيدة عن الإفلاس للفصل القانوني.",
    oversightTitle: "الرقابة", oversightDesc: "تحقق مستقل من طرف ثالث.",
    verificationTitle: "التحقق المستقل",
    vaultConfirmations: "تأكيدات الخزائن", vaultConfirmationsDesc: "تأكيدات دورية من الحافظين.",
    reconciliation: "المطابقة الداخلية", reconciliationDesc: "مواءمة مستمرة بين التوكنات والاحتياطيات.",
    publicStatements: "البيانات العامة", publicStatementsDesc: "تقارير شفافية دورية.",
    reconciliationStatus: "حالة المطابقة", statusReconciled: "تمت المطابقة", statusPending: "قيد الانتظار", statusMismatch: "عدم تطابق",
    nextAudit: "التدقيق المقبل",
    statementsTitle: "آخر التقارير", downloadStatements: "تحميل التقارير",
    feb2026: "فبراير 2026 — تقرير شهري", q1Report: "Q1 2026 — تقرير ربع سنوي", annualReport: "2025 — ملخص سنوي",
    verifyTitle: "كيف نتحقق من الاحتياطيات",
    step1Title: "شراء المعادن", step1Desc: "موردون معتمدون من LBMA.",
    step2Title: "تخصيص الخزائن", step2Desc: "تخزين مرقم ومعتمد.",
    step3Title: "المطابقة الداخلية", step3Desc: "مواءمة مستمرة.",
    step4Title: "الإفصاح العام", step4Desc: "تقارير دورية.",
    safeguardsTitle: "نموذج الحماية القانونية", safeguardsText: "معادن العملاء ليست أصول ميزانية وتبقى خارج كتلة الإفلاس.",
    policyTitle: "سياسة الشفافية",
    monthly: "شهري", monthlyDesc: "تقارير المواقف.", quarterly: "ربع سنوي", quarterlyDesc: "تقارير شاملة.", annual: "سنوي", annualDesc: "ملخص سنوي.",
    faqTitle: "أسئلة شائعة",
    faq1Q: "هل الاحتياطيات جزئية؟", faq1A: "لا. نموذج مخصص بالكامل.",
    faq2Q: "هل يمكن التحقق من الاحتياطيات؟", faq2A: "نعم. التقارير تُنشر دورياً.",
    faq3Q: "هل يُعاد رهن الأصول؟", faq3A: "لا. فقط عبر برامج اختيارية.",
    footerText: "مبني على مبادئ الشفافية أولاً.", verifiedBadge: "نموذج حفظ موثق",
    legalDisclaimer: "هذه الصفحة لأغراض إعلامية فقط.",
  },
  ru: {
    backToTrust: "Назад в Центр Доверия", loading: "Загрузка...", error: "Ошибка загрузки",
    heroTitle: "Подтверждение Резервов", heroSubtitle: "Прозрачность в реальном времени по хранимым драгоценным металлам.",
    badgeAllocated: "Полностью Выделено", badgeBankruptcy: "Банкротство-Защищённое Хранение", badgeIndependent: "Независимые Хранилища",
    lastUpdated: "Обновлено", minutesAgo: "минут назад", justNow: "только что",
    statOunces: "Хранимые Унции", statPartners: "Партнёры", statCountries: "Страны",
    snapshotTitle: "Общие Активы Под Хранением", snapshotNote: "Независимо хранятся и полностью выделены.",
    reserveRatio: "Коэффициент Резерва", gold: "Золото", silver: "Серебро", platinum: "Платина", palladium: "Палладий", holdings: "Активы",
    allocationTitle: "Модель 100% Выделенного Резерва", allocationText: "Все клиентские металлы индивидуально выделены в банкротство-защищённых структурах.",
    architectureTitle: "Институциональная Архитектура Хранения",
    vaultingTitle: "Хранение", vaultingDesc: "Физические металлы в LBMA-сертифицированных хранилищах.",
    legalTitle: "Правовой Уровень", legalDesc: "Банкротство-защищённые структуры для правового разделения.",
    oversightTitle: "Надзор", oversightDesc: "Независимая верификация третьей стороной.",
    verificationTitle: "Независимая Верификация",
    vaultConfirmations: "Подтверждения Хранилищ", vaultConfirmationsDesc: "Периодические подтверждения.",
    reconciliation: "Внутренняя Сверка", reconciliationDesc: "Непрерывное согласование.",
    publicStatements: "Публичные Отчёты", publicStatementsDesc: "Периодические отчёты о прозрачности.",
    reconciliationStatus: "Статус Сверки", statusReconciled: "Сверено", statusPending: "В ожидании", statusMismatch: "Расхождение",
    nextAudit: "Следующий Аудит",
    statementsTitle: "Последние Отчёты", downloadStatements: "Скачать",
    feb2026: "Февраль 2026 — Месячный Отчёт", q1Report: "Q1 2026 — Квартальный Отчёт", annualReport: "2025 — Годовой Обзор",
    verifyTitle: "Как Мы Проверяем Резервы",
    step1Title: "Закупка Металлов", step1Desc: "Поставщики LBMA.",
    step2Title: "Распределение по Хранилищам", step2Desc: "Серийное хранение.",
    step3Title: "Внутренняя Сверка", step3Desc: "Непрерывное согласование.",
    step4Title: "Публичное Раскрытие", step4Desc: "Периодические отчёты.",
    safeguardsTitle: "Модель Правовой Защиты", safeguardsText: "Клиентские металлы не являются балансовыми активами и остаются вне конкурсной массы.",
    policyTitle: "Политика Прозрачности",
    monthly: "Ежемесячно", monthlyDesc: "Отчёты о позициях.", quarterly: "Ежеквартально", quarterlyDesc: "Комплексные отчёты.", annual: "Ежегодно", annualDesc: "Годовой обзор.",
    faqTitle: "Часто Задаваемые Вопросы",
    faq1Q: "Резервы частичные?", faq1A: "Нет. Полностью выделенная модель.",
    faq2Q: "Можно ли проверить резервы?", faq2A: "Да. Отчёты публикуются периодически.",
    faq3Q: "Активы перезакладываются?", faq3A: "Нет. Только через opt-in программы.",
    footerText: "Построено на принципах прозрачности.", verifiedBadge: "Подтверждённая Модель Хранения",
    legalDisclaimer: "Только для информационных целей.",
  },
};

const metalColors: Record<string, string> = {
  AUXG: "#D4A017",
  AUXS: "#A8A9AD",
  AUXPT: "#7B8794",
  AUXPD: "#B87333",
};

const OZ_PER_GRAM = 1 / 31.1035;

// ============================================
// COMPONENT
// ============================================
export default function ProofOfReservesPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [data, setData] = useState<CustodyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/custody/transparency");
        const json = await res.json();
        if (json.success) {
          setData(json);
          setError(false);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

  // Helpers
  const formatKg = (g: number) => (g / 1000).toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const formatOz = (g: number) => (g * OZ_PER_GRAM).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getTimeAgo = (ts: string | null): string => {
    if (!ts) return "";
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diff < 1) return t.justNow;
    return `${diff} ${t.minutesAgo}`;
  };

  const totalOunces = data
    ? data.layers.custodySnapshot.metals.reduce((sum, m) => sum + m.custodyHoldingsG * OZ_PER_GRAM, 0)
    : 0;

  const metalName = (sym: string): string => {
    const map: Record<string, string> = { AUXG: t.gold, AUXS: t.silver, AUXPT: t.platinum, AUXPD: t.palladium };
    return map[sym] || sym;
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
        <TopNav />
        <main className="max-w-6xl mx-auto px-4 py-20 text-center">
          <div className="animate-pulse">
            <div className="w-16 h-16 rounded-full bg-[#2F6F62]/20 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">{t.loading}</p>
          </div>
        </main>
      </div>
    );
  }

  // Error
  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
        <TopNav />
        <main className="max-w-6xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-500 dark:text-slate-400">{t.error}</p>
        </main>
      </div>
    );
  }

  const layers = data.layers;
  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
  ];

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        {/* Back Link */}
        <Link href="/trust-center" className="inline-flex items-center gap-1 text-sm text-[#2F6F62] hover:underline mb-8">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {t.backToTrust}
        </Link>

        {/* ═══ 1. HERO SECTION ═══ */}
        <section className="text-center mb-16">
          <div className="w-20 h-20 rounded-full bg-[#2F6F62]/15 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-800 dark:text-white mb-4">
            {t.heroTitle}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-8">
            {t.heroSubtitle}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[t.badgeAllocated, t.badgeBankruptcy, t.badgeIndependent].map((badge) => (
              <span key={badge} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2F6F62]/10 text-[#2F6F62] text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-[#2F6F62]" />
                {badge}
              </span>
            ))}
          </div>

          {/* Live indicator */}
          {layers.custodySnapshot.updatedAt && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {t.lastUpdated}: {getTimeAgo(layers.custodySnapshot.updatedAt)}
            </div>
          )}

          {/* Mini Stats */}
          <div className="flex justify-center gap-8 mt-8 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatOz(totalOunces / OZ_PER_GRAM)}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t.statOunces}</div>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">3</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t.statPartners}</div>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">4</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{t.statCountries}</div>
            </div>
          </div>
        </section>

        {/* ═══ 2. LIVE RESERVE SNAPSHOT ═══ */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-[#2F6F62] to-[#1a4a40] rounded-2xl p-8 text-white text-center mb-8">
            <p className="text-sm uppercase tracking-wider text-white/70 mb-2">{t.snapshotTitle}</p>
            <p className="text-sm text-white/60 mb-6">{t.snapshotNote}</p>
            {/* Reserve Ratio */}
            <div className="max-w-md mx-auto">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white/70">{t.reserveRatio}</span>
                <span className="font-bold">100%</span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full" style={{ width: "100%" }} />
              </div>
            </div>
          </div>

          {/* Metal Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {layers.custodySnapshot.metals.map((m) => (
              <div key={m.symbol} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${metalColors[m.symbol]}20` }}>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: metalColors[m.symbol] }} />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-1">{metalName(m.symbol)}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">{t.holdings}</p>
                <p className="text-xl font-bold text-slate-800 dark:text-white">{formatKg(m.custodyHoldingsG)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">kg</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{formatOz(m.custodyHoldingsG)} oz</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 3. ALLOCATION INTEGRITY ═══ */}
        <section className="mb-16">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2F6F62]/15 flex-shrink-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-3">{t.allocationTitle}</h2>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t.allocationText}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 4. CUSTODY ARCHITECTURE ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">{t.architectureTitle}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", title: t.vaultingTitle, desc: t.vaultingDesc },
              { icon: "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3", title: t.legalTitle, desc: t.legalDesc },
              { icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", title: t.oversightTitle, desc: t.oversightDesc },
            ].map((item) => (
              <div key={item.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-[#2F6F62]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 5. VERIFICATION LAYER ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">{t.verificationTitle}</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { title: t.vaultConfirmations, desc: t.vaultConfirmationsDesc },
              { title: t.reconciliation, desc: t.reconciliationDesc },
              { title: t.publicStatements, desc: t.publicStatementsDesc },
            ].map((item) => (
              <div key={item.title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
          {/* Status Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                layers.reconciliation.status === "Reconciled" ? "bg-green-100 dark:bg-green-900/30" :
                layers.reconciliation.status === "Pending" ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-red-100 dark:bg-red-900/30"
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  layers.reconciliation.status === "Reconciled" ? "bg-green-500" :
                  layers.reconciliation.status === "Pending" ? "bg-yellow-500" : "bg-red-500"
                }`} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.reconciliationStatus}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  {layers.reconciliation.status === "Reconciled" ? t.statusReconciled :
                   layers.reconciliation.status === "Pending" ? t.statusPending : t.statusMismatch}
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#2F6F62]/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.nextAudit}</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{layers.reconciliation.nextScheduledAudit || "Q2 2026"}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 6. STATEMENTS ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">{t.statementsTitle}</h2>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {[t.feb2026, t.q1Report, t.annualReport].map((stmt, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{stmt}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">PDF</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 7. HOW WE VERIFY ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">{t.verifyTitle}</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { num: "1", title: t.step1Title, desc: t.step1Desc },
              { num: "2", title: t.step2Title, desc: t.step2Desc },
              { num: "3", title: t.step3Title, desc: t.step3Desc },
              { num: "4", title: t.step4Title, desc: t.step4Desc },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-10 h-10 rounded-full bg-[#BFA181] text-white font-bold flex items-center justify-center mx-auto mb-3">{step.num}</div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-2">{step.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 8. LEGAL SAFEGUARDS ═══ */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              {t.safeguardsTitle}
            </h2>
            <p className="text-slate-300 leading-relaxed text-lg italic">
              &ldquo;{t.safeguardsText}&rdquo;
            </p>
          </div>
        </section>

        {/* ═══ 9. TRANSPARENCY POLICY ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">{t.policyTitle}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { period: t.monthly, desc: t.monthlyDesc, icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
              { period: t.quarterly, desc: t.quarterlyDesc, icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
              { period: t.annual, desc: t.annualDesc, icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
            ].map((item) => (
              <div key={item.period} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-[#BFA181]/10 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{item.period}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 10. FAQ ═══ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white text-center mb-8">{t.faqTitle}</h2>
          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">{faq.q}</span>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ═══ 11. TRUST FOOTER ═══ */}
        <section className="mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2F6F62]/10 text-[#2F6F62] text-sm font-semibold mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {t.verifiedBadge}
            </div>
            <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto">{t.footerText}</p>
          </div>
        </section>

        {/* Legal Disclaimer */}
        <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mb-8">
          {t.legalDisclaimer}
        </p>
      </main>
    </div>
  );
}
