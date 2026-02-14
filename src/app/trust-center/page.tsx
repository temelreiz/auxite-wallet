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
    istanbulVault: "İstanbul Kasası",
    istanbulVaultDesc: "Borsa İstanbul onaylı, LBMA düzenlemeli tesislerde kurumsal saklama.",
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
    // Cash Settlement
    cashSettlement: "Nakit Takas",
    cashSettlementSubtitle: "Saklama Çözümü — Ticaret Değil",
    cashSettlementDesc: "Nakit takas, pozisyonunuzdan çıkmanızı sağlayan bir saklama çözümüdür — bir ticaret değildir. Tahsis edilmiş metaliniz LBMA spot fiyatlaması üzerinden tasfiye edilir ve gelirleri hesabınıza yatırılır.",
    cashSettlementPricing: "LBMA Spot Fiyatlama",
    cashSettlementPricingDesc: "Çıkış fiyatı, LBMA anlık spot fiyatından %0,60–0,80 çıkış marjı düşülerek belirlenir. Fiyat teklifi 120 saniye kilitlenir.",
    cashSettlementTimeline: "T+1 Takas Süresi",
    cashSettlementTimelineDesc: "Metal bakiyesi fiyat kilidi onayında anında düşülür. Gelirler 1 iş günü içinde hesabınıza yatırılır.",
    cashSettlementFinality: "İptal Edilemez Kesinlik",
    cashSettlementFinalityDesc: "Fiyat kilidi onaylandıktan sonra takas iptal edilemez. Bu, piyasa manipülasyonunu ve önceden alım satımı önler.",
    cashSettlementRails: "Takas Kanalları",
    cashSettlementRailsDesc: "Gelirler AUXM (dahili) veya USDT aracılığıyla yatırılır. Günlük takas limiti geçerlidir.",
    cashSettlementAudit: "Denetim İzi",
    cashSettlementAuditDesc: "Fiyat, zaman damgası, tutar ve takas durumu dahil olmak üzere tam denetim izi tutulur.",
    cashSettlementQuoteLock: "120 saniyelik fiyat kilidi",
    cashSettlementNonCancelable: "Onay sonrası iptal edilemez",
    cashSettlementDailyCap: "Günlük takas limiti geçerlidir",
    cashSettlementFullAudit: "Tam denetim izi tutulur",
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
    istanbulVault: "Istanbul Vault",
    istanbulVaultDesc: "Borsa Istanbul approved, LBMA regulated institutional custody facilities.",
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
    // Cash Settlement
    cashSettlement: "Cash Settlement",
    cashSettlementSubtitle: "Custody Unwind — Not a Trade",
    cashSettlementDesc: "Cash settlement is a custody unwind that allows you to exit your position — it is not a trade. Your allocated metal is liquidated at LBMA spot pricing, and the proceeds are credited to your account.",
    cashSettlementPricing: "LBMA Spot Pricing",
    cashSettlementPricingDesc: "Exit price is determined from the LBMA live spot price, minus an exit spread of 0.60–0.80%. Price quotes are locked for 120 seconds.",
    cashSettlementTimeline: "T+1 Settlement Timeline",
    cashSettlementTimelineDesc: "Metal balance is deducted immediately upon price lock confirmation. Proceeds are credited to your account within 1 business day.",
    cashSettlementFinality: "Non-Cancelable Finality",
    cashSettlementFinalityDesc: "Once the price lock is confirmed, the settlement cannot be canceled. This prevents market manipulation and front-running.",
    cashSettlementRails: "Settlement Rails",
    cashSettlementRailsDesc: "Proceeds are credited via AUXM (internal) or USDT. A daily settlement cap applies.",
    cashSettlementAudit: "Audit Trail",
    cashSettlementAuditDesc: "A full audit trail is maintained including price, timestamp, amount, and settlement status.",
    cashSettlementQuoteLock: "120-second price quote lock",
    cashSettlementNonCancelable: "Non-cancelable after confirmation",
    cashSettlementDailyCap: "Daily settlement cap applies",
    cashSettlementFullAudit: "Full audit trail maintained",
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
  de: {
    title: "Vertrauenszentrum",
    subtitle: "Institutionelle Transparenz, Verwahrungsgarantien und regulatorische Compliance",
    coreArchitecture: "Kernarchitektur",
    segregatedCustody: "Getrennte Verwahrung",
    segregatedCustodyDesc: "Kundenvermogen werden nie mit Unternehmensgeldern vermischt. Jede Zuteilung wird unabhangig erfasst und ist verifizierbar.",
    noRehypothecation: "Keine Weiterverpfandung",
    noRehypothecationDesc: "Kundenvermogen werden nie weiterverpfandet. Ihre Vermogenswerte gehoren immer nur Ihnen.",
    fullAllocation: "Vollstandige Zuteilung",
    fullAllocationDesc: "Alle Edelmetalle sind zu 100% physisch zugeteilt und nach Seriennummer getrennt.",
    custodyNetwork: "Verwahrungsnetzwerk",
    zurichVault: "Tresor Zurich",
    zurichVaultDesc: "Gelagert in den sichersten Tresoren der Schweiz mit hochsten Sicherheitsstandards.",
    istanbulVault: "Tresor Istanbul",
    istanbulVaultDesc: "Von der Borsa Istanbul zugelassene, LBMA-regulierte institutionelle Verwahrung.",
    dubaiVault: "Tresor Dubai",
    dubaiVaultDesc: "DMCC-lizenzierte Einrichtungen, strategisch positioniert fur Nahen Osten und Afrika.",
    verification: "Verifizierungssysteme",
    proofOfReserves: "Reservennachweis",
    proofOfReservesDesc: "Gesamte Metallbestande mit Echtzeitverifizierung anzeigen.",
    auditReports: "Prufungsberichte",
    auditReportsDesc: "Zugang zu unabhangigen Prufungsergebnissen Dritter.",
    certificateVerify: "Zertifikatsverifizierung",
    certificateVerifyDesc: "Uberprufen Sie die Echtheit Ihrer Zuteilungszertifikate.",
    settlementArchitecture: "Abwicklungsarchitektur",
    auxmSettlement: "AUXM-Abwicklungseinheit",
    auxmSettlementDesc: "AUXM ist eine interne Einheit, die ausschliesslich fur die Abwicklung innerhalb der Auxite-Infrastruktur verwendet wird. Es ist keine Kryptowahrung oder Stablecoin.",
    settlementFlow: "Abwicklungsablauf",
    settlementFlowDesc: "Einzahlung → AUXM-Gutschrift → Metallzuteilung. Alle Zuteilungen erfolgen mit abgewickeltem Kapital.",
    settlementFinality: "Abwicklungsendgultigkeit",
    settlementFinalityDesc: "Nach Zuteilung ist Ihre Position endgultig und unwiderruflich. Die Abwicklungsendgultigkeit wird auf institutionellem Niveau garantiert.",
    cashSettlement: "Barabwicklung",
    cashSettlementSubtitle: "Verwahrungsauflosung — Kein Handel",
    cashSettlementDesc: "Die Barabwicklung ist eine Verwahrungsauflosung, die Ihnen den Ausstieg aus Ihrer Position ermoglicht — kein Handel. Ihr zugeteiltes Metall wird zum LBMA-Spotpreis liquidiert und der Erlos Ihrem Konto gutgeschrieben.",
    cashSettlementPricing: "LBMA-Spotpreise",
    cashSettlementPricingDesc: "Der Ausstiegspreis wird vom LBMA-Live-Spotpreis abzuglich eines Ausstiegsspreads von 0,60–0,80% bestimmt. Preisangebote werden fur 120 Sekunden gesperrt.",
    cashSettlementTimeline: "T+1 Abwicklungszeitraum",
    cashSettlementTimelineDesc: "Der Metallbestand wird bei Bestatigung der Preissperre sofort abgezogen. Erlose werden innerhalb von 1 Geschaftstag gutgeschrieben.",
    cashSettlementFinality: "Unwiderrufliche Endgultigkeit",
    cashSettlementFinalityDesc: "Nach Bestatigung der Preissperre kann die Abwicklung nicht storniert werden. Dies verhindert Marktmanipulation und Front-Running.",
    cashSettlementRails: "Abwicklungskanale",
    cashSettlementRailsDesc: "Erlose werden uber AUXM (intern) oder USDT gutgeschrieben. Ein tagliches Abwicklungslimit gilt.",
    cashSettlementAudit: "Prufpfad",
    cashSettlementAuditDesc: "Ein vollstandiger Prufpfad wird gefuhrt, einschliesslich Preis, Zeitstempel, Betrag und Abwicklungsstatus.",
    cashSettlementQuoteLock: "120-Sekunden-Preissperre",
    cashSettlementNonCancelable: "Nach Bestatigung nicht stornierbar",
    cashSettlementDailyCap: "Tagliches Abwicklungslimit gilt",
    cashSettlementFullAudit: "Vollstandiger Prufpfad gefuhrt",
    compliance: "Regulatorische Compliance",
    amlKyc: "AML/KYC-Verfahren",
    amlKycDesc: "Vollstandige Einhaltung internationaler Geldwasche- und Kundenidentifizierungsstandards.",
    dataProtection: "Datenschutz",
    dataProtectionDesc: "DSGVO-konforme und internationale Datenschutzstandardverarbeitung.",
    regulatoryReporting: "Regulatorische Berichterstattung",
    regulatoryReportingDesc: "Einhaltung regulatorischer Berichtspflichten in erforderlichen Rechtsgebieten.",
    whatIsAuxite: "Was Auxite ist — und was nicht",
    auxiteIs: "Auxite ist:",
    auxiteIsNot: "Auxite ist nicht:",
    isDigitalPlatform: "Eine digitale Plattform zur Verwaltung zugeteilter Edelmetalle",
    isRwaInfrastructure: "Eine Transparenz-orientierte RWA-Infrastruktur",
    isCustodyTech: "Institutionelle Verwahrungstechnologie",
    notBank: "Eine Bank",
    notStablecoin: "Ein Stablecoin-Emittent",
    notSecurities: "Ein Wertpapieremittent",
    notYieldGuarantee: "Ein renditegarantierendes Produkt",
    legalDocuments: "Rechtliche Dokumente",
    termsOfService: "Nutzungsbedingungen",
    redemptionPolicy: "Einlosungsrichtlinie",
    privacyPolicy: "Datenschutzrichtlinie",
    verifyCertificate: "Zertifikat verifizieren",
    verifyCertificateDesc: "Uberprufen Sie die Echtheit und Gultigkeit eines Auxite-Digitalzertifikats",
    goToVerification: "Zur Verifizierungsseite",
    viewReserves: "Reserven anzeigen",
    viewAudits: "Prufungen anzeigen",
    viewCustody: "Verwahrungsdetails",
  },
  fr: {
    title: "Centre de Confiance",
    subtitle: "Transparence institutionnelle, garanties de conservation et conformite reglementaire",
    coreArchitecture: "Architecture Fondamentale",
    segregatedCustody: "Conservation Segreguee",
    segregatedCustodyDesc: "Les actifs des clients ne sont jamais melanges aux fonds de l'entreprise. Chaque allocation est enregistree independamment et verifiable.",
    noRehypothecation: "Pas de Rehypotheque",
    noRehypothecationDesc: "Les actifs des clients ne sont jamais rehypotheques. Vos actifs vous appartiennent toujours exclusivement.",
    fullAllocation: "Allocation Complete",
    fullAllocationDesc: "Tous les metaux precieux sont alloues physiquement a 100% et segregues par lingot numerote.",
    custodyNetwork: "Reseau de Conservation",
    zurichVault: "Coffre de Zurich",
    zurichVaultDesc: "Stocke dans les coffres les plus securises de Suisse avec les normes de securite les plus elevees.",
    istanbulVault: "Coffre d'Istanbul",
    istanbulVaultDesc: "Approuve par Borsa Istanbul, conservation institutionnelle reglementee LBMA.",
    dubaiVault: "Coffre de Dubai",
    dubaiVaultDesc: "Installations licenciees DMCC, positionnement strategique pour le Moyen-Orient et l'Afrique.",
    verification: "Systemes de Verification",
    proofOfReserves: "Preuve de Reserves",
    proofOfReservesDesc: "Consultez les avoirs totaux en metaux avec verification en temps reel.",
    auditReports: "Rapports d'Audit",
    auditReportsDesc: "Acces aux resultats d'audit independants de tiers.",
    certificateVerify: "Verification de Certificat",
    certificateVerifyDesc: "Verifiez l'authenticite de vos certificats d'allocation.",
    settlementArchitecture: "Architecture de Reglement",
    auxmSettlement: "Unite de Reglement AUXM",
    auxmSettlementDesc: "AUXM est une unite interne utilisee exclusivement pour le reglement au sein de l'infrastructure Auxite. Ce n'est ni une cryptomonnaie ni un stablecoin.",
    settlementFlow: "Flux de Reglement",
    settlementFlowDesc: "Depot → Credit AUXM → Allocation Metal. Toutes les allocations sont effectuees avec du capital regle.",
    settlementFinality: "Finalite du Reglement",
    settlementFinalityDesc: "Une fois alloue, votre position est definitive et irrevocable. La finalite du reglement est garantie au niveau institutionnel.",
    cashSettlement: "Reglement en Especes",
    cashSettlementSubtitle: "Denouement de Conservation — Pas un Echange",
    cashSettlementDesc: "Le reglement en especes est un denouement de conservation qui vous permet de sortir de votre position — ce n'est pas un echange. Votre metal alloue est liquide au prix spot LBMA et le produit est credite sur votre compte.",
    cashSettlementPricing: "Tarification Spot LBMA",
    cashSettlementPricingDesc: "Le prix de sortie est determine a partir du prix spot LBMA en direct, moins un ecart de sortie de 0,60–0,80%. Les cotations sont verrouillees pendant 120 secondes.",
    cashSettlementTimeline: "Delai de Reglement T+1",
    cashSettlementTimelineDesc: "Le solde metal est deduit immediatement a la confirmation du verrouillage du prix. Le produit est credite sur votre compte sous 1 jour ouvrable.",
    cashSettlementFinality: "Finalite Non-Annulable",
    cashSettlementFinalityDesc: "Une fois le verrouillage du prix confirme, le reglement ne peut etre annule. Cela empeche la manipulation du marche et le front-running.",
    cashSettlementRails: "Canaux de Reglement",
    cashSettlementRailsDesc: "Le produit est credite via AUXM (interne) ou USDT. Un plafond quotidien de reglement s'applique.",
    cashSettlementAudit: "Piste d'Audit",
    cashSettlementAuditDesc: "Une piste d'audit complete est maintenue incluant prix, horodatage, montant et statut du reglement.",
    cashSettlementQuoteLock: "Verrouillage du prix pendant 120 secondes",
    cashSettlementNonCancelable: "Non annulable apres confirmation",
    cashSettlementDailyCap: "Plafond quotidien de reglement applicable",
    cashSettlementFullAudit: "Piste d'audit complete maintenue",
    compliance: "Conformite Reglementaire",
    amlKyc: "Procedures AML/KYC",
    amlKycDesc: "Conformite totale aux normes internationales de lutte contre le blanchiment et de connaissance du client.",
    dataProtection: "Protection des Donnees",
    dataProtectionDesc: "Traitement conforme au RGPD et aux normes internationales de protection des donnees.",
    regulatoryReporting: "Rapports Reglementaires",
    regulatoryReportingDesc: "Conformite aux obligations de reporting reglementaire dans les juridictions requises.",
    whatIsAuxite: "Ce qu'Auxite est — et n'est pas",
    auxiteIs: "Auxite est :",
    auxiteIsNot: "Auxite n'est pas :",
    isDigitalPlatform: "Une plateforme numerique pour la gestion des metaux precieux alloues",
    isRwaInfrastructure: "Une infrastructure RWA axee sur la transparence",
    isCustodyTech: "Technologie de conservation de niveau institutionnel",
    notBank: "Une banque",
    notStablecoin: "Un emetteur de stablecoin",
    notSecurities: "Un emetteur de valeurs mobilieres",
    notYieldGuarantee: "Un produit garantissant un rendement",
    legalDocuments: "Documents Juridiques",
    termsOfService: "Conditions d'Utilisation",
    redemptionPolicy: "Politique de Rachat",
    privacyPolicy: "Politique de Confidentialite",
    verifyCertificate: "Verifier le Certificat",
    verifyCertificateDesc: "Verifiez l'authenticite et la validite d'un certificat numerique Auxite",
    goToVerification: "Aller a la Page de Verification",
    viewReserves: "Voir les Reserves",
    viewAudits: "Voir les Audits",
    viewCustody: "Details de Conservation",
  },
  ar: {
    title: "مركز الثقة",
    subtitle: "الشفافية المؤسسية وضمانات الحفظ والامتثال التنظيمي",
    coreArchitecture: "البنية الأساسية",
    segregatedCustody: "الحفظ المنفصل",
    segregatedCustodyDesc: "لا يتم خلط أصول العملاء أبداً مع أموال الشركة. يتم تسجيل كل تخصيص بشكل مستقل وقابل للتحقق.",
    noRehypothecation: "لا إعادة رهن",
    noRehypothecationDesc: "لا يتم إعادة رهن أصول العملاء أبداً. أصولك ملك لك دائماً.",
    fullAllocation: "تخصيص كامل",
    fullAllocationDesc: "جميع المعادن الثمينة مخصصة مادياً بنسبة 100% ومفصولة حسب رقم السبيكة التسلسلي.",
    custodyNetwork: "شبكة الحفظ",
    zurichVault: "خزنة زيورخ",
    zurichVaultDesc: "مخزنة في أكثر خزائن سويسرا أماناً بأعلى معايير الأمان.",
    istanbulVault: "خزنة إسطنبول",
    istanbulVaultDesc: "معتمدة من بورصة إسطنبول، حفظ مؤسسي منظم وفق LBMA.",
    dubaiVault: "خزنة دبي",
    dubaiVaultDesc: "منشآت مرخصة من DMCC، موقع استراتيجي للشرق الأوسط وأفريقيا.",
    verification: "أنظمة التحقق",
    proofOfReserves: "إثبات الاحتياطيات",
    proofOfReservesDesc: "عرض إجمالي حيازات المعادن مع التحقق في الوقت الفعلي.",
    auditReports: "تقارير التدقيق",
    auditReportsDesc: "الوصول إلى نتائج التدقيق المستقلة من أطراف ثالثة.",
    certificateVerify: "التحقق من الشهادة",
    certificateVerifyDesc: "تحقق من صحة شهادات التخصيص الخاصة بك.",
    settlementArchitecture: "بنية التسوية",
    auxmSettlement: "وحدة تسوية AUXM",
    auxmSettlementDesc: "AUXM هي وحدة داخلية تُستخدم حصرياً للتسوية ضمن بنية Auxite التحتية. ليست عملة مشفرة أو عملة مستقرة.",
    settlementFlow: "تدفق التسوية",
    settlementFlowDesc: "إيداع الأموال → رصيد AUXM → تخصيص المعادن. جميع التخصيصات تتم برأس مال مُسوّى.",
    settlementFinality: "نهائية التسوية",
    settlementFinalityDesc: "بمجرد التخصيص، يكون مركزك نهائياً وغير قابل للإلغاء. نهائية التسوية مضمونة بمعايير مؤسسية.",
    cashSettlement: "التسوية النقدية",
    cashSettlementSubtitle: "فك الحفظ — ليست صفقة تداول",
    cashSettlementDesc: "التسوية النقدية هي عملية فك حفظ تتيح لك الخروج من مركزك — وليست صفقة تداول. يتم تصفية معدنك المخصص بسعر LBMA الفوري ويُضاف العائد إلى حسابك.",
    cashSettlementPricing: "تسعير LBMA الفوري",
    cashSettlementPricingDesc: "يُحدد سعر الخروج من سعر LBMA الفوري المباشر، مطروحاً منه هامش خروج بنسبة 0.60–0.80%. يتم تثبيت عروض الأسعار لمدة 120 ثانية.",
    cashSettlementTimeline: "جدول تسوية T+1",
    cashSettlementTimelineDesc: "يُخصم رصيد المعدن فوراً عند تأكيد تثبيت السعر. يُضاف العائد إلى حسابك خلال يوم عمل واحد.",
    cashSettlementFinality: "نهائية غير قابلة للإلغاء",
    cashSettlementFinalityDesc: "بمجرد تأكيد تثبيت السعر، لا يمكن إلغاء التسوية. هذا يمنع التلاعب بالسوق والتداول المسبق.",
    cashSettlementRails: "قنوات التسوية",
    cashSettlementRailsDesc: "يُضاف العائد عبر AUXM (داخلي) أو USDT. ينطبق حد تسوية يومي.",
    cashSettlementAudit: "مسار التدقيق",
    cashSettlementAuditDesc: "يتم الاحتفاظ بمسار تدقيق كامل يشمل السعر والطابع الزمني والمبلغ وحالة التسوية.",
    cashSettlementQuoteLock: "تثبيت عرض السعر لمدة 120 ثانية",
    cashSettlementNonCancelable: "غير قابل للإلغاء بعد التأكيد",
    cashSettlementDailyCap: "ينطبق حد التسوية اليومي",
    cashSettlementFullAudit: "مسار تدقيق كامل محفوظ",
    compliance: "الامتثال التنظيمي",
    amlKyc: "إجراءات مكافحة غسل الأموال/اعرف عميلك",
    amlKycDesc: "امتثال كامل لمعايير مكافحة غسل الأموال وتحديد هوية العملاء الدولية.",
    dataProtection: "حماية البيانات",
    dataProtectionDesc: "معالجة متوافقة مع GDPR ومعايير حماية البيانات الدولية.",
    regulatoryReporting: "التقارير التنظيمية",
    regulatoryReportingDesc: "الامتثال لالتزامات التقارير التنظيمية في الولايات القضائية المطلوبة.",
    whatIsAuxite: "ما هي Auxite — وما ليست عليه",
    auxiteIs: "Auxite هي:",
    auxiteIsNot: "Auxite ليست:",
    isDigitalPlatform: "منصة رقمية لإدارة المعادن الثمينة المخصصة",
    isRwaInfrastructure: "بنية تحتية RWA تعطي الأولوية للشفافية",
    isCustodyTech: "تكنولوجيا حفظ بمستوى مؤسسي",
    notBank: "بنك",
    notStablecoin: "مُصدر عملات مستقرة",
    notSecurities: "مُصدر أوراق مالية",
    notYieldGuarantee: "منتج يضمن العائد",
    legalDocuments: "الوثائق القانونية",
    termsOfService: "شروط الخدمة",
    redemptionPolicy: "سياسة الاسترداد",
    privacyPolicy: "سياسة الخصوصية",
    verifyCertificate: "التحقق من الشهادة",
    verifyCertificateDesc: "تحقق من صحة وصلاحية شهادة Auxite الرقمية",
    goToVerification: "الذهاب إلى صفحة التحقق",
    viewReserves: "عرض الاحتياطيات",
    viewAudits: "عرض التدقيقات",
    viewCustody: "تفاصيل الحفظ",
  },
  ru: {
    title: "Центр Доверия",
    subtitle: "Институциональная прозрачность, гарантии хранения и нормативное соответствие",
    coreArchitecture: "Основная Архитектура",
    segregatedCustody: "Раздельное Хранение",
    segregatedCustodyDesc: "Активы клиентов никогда не смешиваются с корпоративными средствами. Каждое распределение регистрируется независимо и поддается проверке.",
    noRehypothecation: "Без Перезалога",
    noRehypothecationDesc: "Активы клиентов никогда не перезакладываются. Ваши активы всегда принадлежат только вам.",
    fullAllocation: "Полное Распределение",
    fullAllocationDesc: "Все драгоценные металлы на 100% физически распределены и разделены по серийному номеру слитка.",
    custodyNetwork: "Сеть Хранения",
    zurichVault: "Хранилище Цюриха",
    zurichVaultDesc: "Хранение в самых безопасных хранилищах Швейцарии с высочайшими стандартами безопасности.",
    istanbulVault: "Хранилище Стамбула",
    istanbulVaultDesc: "Одобрено Borsa Istanbul, институциональное хранение под регулированием LBMA.",
    dubaiVault: "Хранилище Дубая",
    dubaiVaultDesc: "Объекты с лицензией DMCC, стратегически расположенные для Ближнего Востока и Африки.",
    verification: "Системы Верификации",
    proofOfReserves: "Доказательство Резервов",
    proofOfReservesDesc: "Просмотр общих запасов металлов с верификацией в реальном времени.",
    auditReports: "Аудиторские Отчеты",
    auditReportsDesc: "Доступ к результатам независимого аудита третьих сторон.",
    certificateVerify: "Верификация Сертификата",
    certificateVerifyDesc: "Проверьте подлинность ваших сертификатов распределения.",
    settlementArchitecture: "Архитектура Расчетов",
    auxmSettlement: "Расчетная Единица AUXM",
    auxmSettlementDesc: "AUXM — внутренняя единица, используемая исключительно для расчетов в инфраструктуре Auxite. Это не криптовалюта и не стейблкоин.",
    settlementFlow: "Поток Расчетов",
    settlementFlowDesc: "Внесение средств → Кредит AUXM → Распределение металла. Все распределения осуществляются с помощью рассчитанного капитала.",
    settlementFinality: "Окончательность Расчета",
    settlementFinalityDesc: "После распределения ваша позиция окончательна и безотзывна. Окончательность расчета гарантируется на институциональном уровне.",
    cashSettlement: "Денежный Расчет",
    cashSettlementSubtitle: "Ликвидация Хранения — Не Сделка",
    cashSettlementDesc: "Денежный расчет — это ликвидация хранения, позволяющая выйти из позиции — это не сделка. Ваш распределенный металл ликвидируется по спотовой цене LBMA, а выручка зачисляется на ваш счет.",
    cashSettlementPricing: "Спотовая Цена LBMA",
    cashSettlementPricingDesc: "Цена выхода определяется по текущей спотовой цене LBMA за вычетом спреда выхода 0,60–0,80%. Котировки фиксируются на 120 секунд.",
    cashSettlementTimeline: "Срок Расчета T+1",
    cashSettlementTimelineDesc: "Баланс металла списывается немедленно при подтверждении фиксации цены. Выручка зачисляется на ваш счет в течение 1 рабочего дня.",
    cashSettlementFinality: "Безотзывная Окончательность",
    cashSettlementFinalityDesc: "После подтверждения фиксации цены расчет не может быть отменен. Это предотвращает манипуляции рынком и фронтраннинг.",
    cashSettlementRails: "Каналы Расчета",
    cashSettlementRailsDesc: "Выручка зачисляется через AUXM (внутренний) или USDT. Применяется дневной лимит расчетов.",
    cashSettlementAudit: "Аудиторский След",
    cashSettlementAuditDesc: "Ведется полный аудиторский след, включая цену, временную метку, сумму и статус расчета.",
    cashSettlementQuoteLock: "Фиксация котировки на 120 секунд",
    cashSettlementNonCancelable: "Безотзывно после подтверждения",
    cashSettlementDailyCap: "Применяется дневной лимит расчетов",
    cashSettlementFullAudit: "Полный аудиторский след ведется",
    compliance: "Нормативное Соответствие",
    amlKyc: "Процедуры ПОД/KYC",
    amlKycDesc: "Полное соответствие международным стандартам противодействия отмыванию денег и идентификации клиентов.",
    dataProtection: "Защита Данных",
    dataProtectionDesc: "Обработка в соответствии с GDPR и международными стандартами защиты данных.",
    regulatoryReporting: "Нормативная Отчетность",
    regulatoryReportingDesc: "Соответствие обязательствам нормативной отчетности в требуемых юрисдикциях.",
    whatIsAuxite: "Что такое Auxite — и чем не является",
    auxiteIs: "Auxite — это:",
    auxiteIsNot: "Auxite — это не:",
    isDigitalPlatform: "Цифровая платформа для управления распределенными драгоценными металлами",
    isRwaInfrastructure: "RWA-инфраструктура с приоритетом прозрачности",
    isCustodyTech: "Технология хранения институционального уровня",
    notBank: "Банк",
    notStablecoin: "Эмитент стейблкоинов",
    notSecurities: "Эмитент ценных бумаг",
    notYieldGuarantee: "Продукт с гарантией доходности",
    legalDocuments: "Юридические Документы",
    termsOfService: "Условия Использования",
    redemptionPolicy: "Политика Погашения",
    privacyPolicy: "Политика Конфиденциальности",
    verifyCertificate: "Проверить Сертификат",
    verifyCertificateDesc: "Проверьте подлинность и действительность цифрового сертификата Auxite",
    goToVerification: "Перейти на Страницу Проверки",
    viewReserves: "Просмотр Резервов",
    viewAudits: "Просмотр Аудитов",
    viewCustody: "Детали Хранения",
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
          <div className="w-20 h-20 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#2F6F62] dark:text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    ? "bg-[#2F6F62] text-white"
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
                <div className="w-12 h-12 rounded-xl bg-[#2F6F62]/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.segregatedCustody}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.segregatedCustodyDesc}</p>
                <div className="mt-4 p-3 bg-[#2F6F62]/10 rounded-lg border border-[#2F6F62]/30">
                  <p className="text-xs text-[#2F6F62] dark:text-[#2F6F62] font-medium">
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
                <div className="w-12 h-12 rounded-xl bg-[#BFA181]/20 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">{t.fullAllocation}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t.fullAllocationDesc}</p>
                <div className="mt-4 p-3 bg-[#BFA181]/10 rounded-lg border border-[#BFA181]/30">
                  <p className="text-xs text-[#BFA181] dark:text-[#BFA181] font-medium">
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
                    <span className="px-2 py-1 text-xs rounded-full bg-[#2F6F62]/20 text-[#2F6F62]">LBMA Approved</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600">ISO 9001</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">🇹🇷</span>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white">{t.istanbulVault}</h3>
                      <p className="text-xs text-slate-500">Turkey Hub</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t.istanbulVaultDesc}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-[#2F6F62]/20 text-[#2F6F62]">Borsa Istanbul Approved</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600">LBMA Regulated</span>
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
                    <span className="px-2 py-1 text-xs rounded-full bg-[#2F6F62]/20 text-[#2F6F62]">DMCC Licensed</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-600">Sharia Compliant</span>
                  </div>
                </div>
              </div>

              {/* Verification Links */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.verification}</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link href="/trust/reserves" className="p-4 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-[#2F6F62] transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📊</span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-[#2F6F62]">{t.proofOfReserves}</p>
                        <p className="text-xs text-slate-500">{t.proofOfReservesDesc}</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/trust/audits" className="p-4 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-[#2F6F62] transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🧾</span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-[#2F6F62]">{t.auditReports}</p>
                        <p className="text-xs text-slate-500">{t.auditReportsDesc}</p>
                      </div>
                    </div>
                  </Link>
                  <Link href="/verify" className="p-4 rounded-lg border border-stone-200 dark:border-slate-700 hover:border-[#2F6F62] transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔍</span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white group-hover:text-[#2F6F62]">{t.certificateVerify}</p>
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
                  <svg className="w-6 h-6 text-[#2F6F62] rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="px-4 py-3 bg-[#2F6F62]/20 border border-[#2F6F62]/30 rounded-lg text-center">
                    <p className="text-xs text-[#2F6F62] dark:text-[#2F6F62] mb-1">Step 2</p>
                    <p className="font-semibold text-[#2F6F62] dark:text-[#2F6F62]">AUXM Credit</p>
                    <p className="text-xs text-[#2F6F62]/70">Settled Capital</p>
                  </div>
                  <svg className="w-6 h-6 text-[#2F6F62] rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="px-4 py-3 bg-[#BFA181]/20 border border-[#BFA181]/30 rounded-lg text-center">
                    <p className="text-xs text-[#BFA181] dark:text-[#BFA181] mb-1">Step 3</p>
                    <p className="font-semibold text-[#BFA181] dark:text-[#BFA181]">Metal Allocation</p>
                    <p className="text-xs text-[#BFA181]/70">AUXG/AUXS/AUXPT</p>
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

              {/* Cash Settlement Section */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#BFA181]/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-white">{t.cashSettlement}</h3>
                    <p className="text-xs text-[#BFA181] font-medium">{t.cashSettlementSubtitle}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{t.cashSettlementDesc}</p>

                {/* Cash Settlement Flow Diagram */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                  <div className="px-4 py-3 bg-[#BFA181]/20 border border-[#BFA181]/30 rounded-lg text-center">
                    <p className="text-xs text-[#BFA181] mb-1">Step 1</p>
                    <p className="font-semibold text-[#BFA181]">Price Lock</p>
                    <p className="text-xs text-[#BFA181]/70">120s quote window</p>
                  </div>
                  <svg className="w-6 h-6 text-[#2F6F62] rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                    <p className="text-xs text-red-500 mb-1">Step 2</p>
                    <p className="font-semibold text-red-500">Metal Deducted</p>
                    <p className="text-xs text-red-500/70">Immediate & final</p>
                  </div>
                  <svg className="w-6 h-6 text-[#2F6F62] rotate-90 md:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div className="px-4 py-3 bg-[#2F6F62]/20 border border-[#2F6F62]/30 rounded-lg text-center">
                    <p className="text-xs text-[#2F6F62] mb-1">Step 3</p>
                    <p className="font-semibold text-[#2F6F62]">Proceeds Credited</p>
                    <p className="text-xs text-[#2F6F62]/70">T+1 via AUXM/USDT</p>
                  </div>
                </div>

                {/* Cash Settlement Detail Cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <h4 className="font-medium text-slate-800 dark:text-white">{t.cashSettlementPricing}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.cashSettlementPricingDesc}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h4 className="font-medium text-slate-800 dark:text-white">{t.cashSettlementTimeline}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.cashSettlementTimelineDesc}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <h4 className="font-medium text-slate-800 dark:text-white">{t.cashSettlementFinality}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.cashSettlementFinalityDesc}</p>
                  </div>
                  <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      <h4 className="font-medium text-slate-800 dark:text-white">{t.cashSettlementRails}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{t.cashSettlementRailsDesc}</p>
                  </div>
                </div>

                {/* Audit Trail */}
                <div className="p-4 bg-stone-50 dark:bg-slate-800/50 rounded-lg mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <h4 className="font-medium text-slate-800 dark:text-white">{t.cashSettlementAudit}</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{t.cashSettlementAuditDesc}</p>
                </div>

                {/* Key Parameters Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#2F6F62]/10 rounded-lg border border-[#2F6F62]/30 text-center">
                    <p className="text-xs text-[#2F6F62] font-medium">{t.cashSettlementQuoteLock}</p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 text-center">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{t.cashSettlementNonCancelable}</p>
                  </div>
                  <div className="p-3 bg-[#BFA181]/10 rounded-lg border border-[#BFA181]/30 text-center">
                    <p className="text-xs text-[#BFA181] font-medium">{t.cashSettlementDailyCap}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t.cashSettlementFullAudit}</p>
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
                  <div className="w-12 h-12 rounded-xl bg-[#2F6F62]/20 flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] rounded-2xl p-8 text-white mb-8">
          <h2 className="text-2xl font-bold mb-6">⚖️ {t.whatIsAuxite}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-white">{t.auxiteIs}</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-white/80">✓</span>
                  <span>{t.isDigitalPlatform}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/80">✓</span>
                  <span>{t.isRwaInfrastructure}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-white/80">✓</span>
                  <span>{t.isCustodyTech}</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-white">{t.auxiteIsNot}</h3>
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-semibold rounded-xl transition-colors"
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
