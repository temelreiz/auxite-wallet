"use client";

// ============================================
// PHYSICAL REDEMPTION - Full Blueprint Flow
// Cash Settlement | Vault Pickup | Insured Courier | Vault Transfer
// Synced with Mobile (auxite-vault)
// ============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { formatAmount, formatUSD, getDecimalPlaces } from "@/lib/format";

// ============================================
// TRANSLATIONS - 6 Languages
// ============================================
const translations: Record<string, Record<string, string>> = {
  en: {
    pageTitle: "Physical Redemption",
    pageSubtitle: "Convert allocated metals into physical delivery or cash settlement",
    // Steps
    step1: "Select Metal",
    step2: "Choose Method",
    step3: "Configure",
    step4: "Review & Confirm",
    // Metal selection
    selectMetal: "SELECT METAL FOR REDEMPTION",
    selectMetalDesc: "Choose which allocated metal you wish to redeem",
    gold: "Gold", silver: "Silver", platinum: "Platinum", palladium: "Palladium",
    yourBalance: "Your Balance", availableForRedemption: "Available for Redemption",
    encumberedLabel: "Encumbered (Staked/Leased)",
    minimumRequired: "Minimum Required",
    notEligible: "Not Eligible",
    eligible: "Eligible",
    belowMinimum: "Below minimum threshold",
    moreRequired: "more required for redemption",
    insufficientForRedemption: "Insufficient for Redemption",
    // Methods
    selectMethod: "REDEMPTION METHOD",
    selectMethodDesc: "Choose how you want to receive your physical metals",
    cashSettlement: "Cash Settlement",
    cashSettlementDesc: "Instant conversion to AUXM at live spot price. No minimum for cash.",
    vaultPickup: "Vault Pickup",
    vaultPickupDesc: "Collect fabricated bars/coins from a designated vault location.",
    insuredCourier: "Insured Courier",
    insuredCourierDesc: "Fully insured door-to-door delivery via armored transport.",
    vaultTransfer: "Vault Transfer",
    vaultTransferDesc: "Transfer allocated metal to another recognized vault facility.",
    kycTier2Required: "KYC Tier 2+ Required",
    inviteOnly: "Invite Only",
    instantSettlement: "Instant Settlement",
    // Configure
    configureRedemption: "CONFIGURE REDEMPTION",
    amount: "Amount",
    enterAmount: "Enter amount in grams",
    maxAvailable: "Max Available",
    useMax: "MAX",
    selectVault: "Select Vault Location",
    vaultLocation: "VAULT LOCATION",
    estimatedFee: "Estimated Fee",
    feeRate: "Fee Rate",
    netAmount: "Net Amount (After Fee)",
    estimatedDelivery: "Estimated Delivery",
    businessDays: "business days",
    instant: "Instant",
    fabricationNote: "FABRICATION NOTE",
    fabricationDesc: "Physical bars are fabricated to LBMA/LPPM standards. Fabrication included in fee.",
    // Cooling period
    coolingPeriod: "COOLING PERIOD ACTIVE",
    coolingDesc: "A T+3 cooling period is in effect. Please wait before submitting another redemption request.",
    // Review
    reviewTitle: "REVIEW & CONFIRM",
    reviewDesc: "Please verify all details before submitting your redemption request",
    metal: "Metal",
    method: "Method",
    grossAmount: "Gross Amount",
    redemptionFee: "Redemption Fee",
    netDelivery: "Net Delivery Amount",
    deliveryMethod: "Delivery Method",
    deliverySLA: "Delivery SLA",
    vaultLabel: "Vault",
    // Legal
    legalDisclosure: "LEGAL DISCLOSURE",
    legalText1: "By submitting this redemption request, you acknowledge that the referenced metals will be removed from your allocated holdings.",
    legalText2: "Physical delivery timelines are estimates and subject to fabrication and logistics availability.",
    legalText3: "All redemption fees are non-refundable once the request enters processing status.",
    agreeAndSubmit: "I Agree & Submit Redemption",
    // Status
    submitting: "Submitting...",
    successTitle: "Redemption Submitted",
    successMsg: "Your redemption request has been recorded. You will receive confirmation via email.",
    redemptionId: "Redemption ID",
    viewStatus: "View Status",
    newRedemption: "New Redemption",
    // Errors
    connectWallet: "Connect your wallet to initiate physical redemption",
    insufficientBalance: "Insufficient available balance",
    belowMinThreshold: "Amount is below the minimum threshold",
    redemptionUnavailable: "Physical redemption is currently unavailable",
    metalUnavailable: "Redemption for this metal is currently unavailable",
    // Common
    back: "Back",
    next: "Next",
    cancel: "Cancel",
    grams: "g",
    perGram: "/g",
  },
  tr: {
    pageTitle: "Fiziksel Teslimat",
    pageSubtitle: "Tahsisli metalleri fiziksel teslimata veya nakit takasa dönüştürün",
    step1: "Metal Seçin",
    step2: "Yöntem Seçin",
    step3: "Yapılandır",
    step4: "İncele & Onayla",
    selectMetal: "TESLIMAT İÇİN METAL SEÇİN",
    selectMetalDesc: "Hangi tahsisli metali teslim almak istediğinizi seçin",
    gold: "Altın", silver: "Gümüş", platinum: "Platin", palladium: "Paladyum",
    yourBalance: "Bakiyeniz", availableForRedemption: "Teslimat İçin Uygun",
    encumberedLabel: "Bloke (Stake/Kiralık)",
    minimumRequired: "Minimum Gerekli",
    notEligible: "Uygun Değil",
    eligible: "Uygun",
    belowMinimum: "Minimum eşiğin altında",
    moreRequired: "daha gerekli",
    insufficientForRedemption: "Teslimat İçin Yetersiz",
    selectMethod: "TESLIMAT YÖNTEMİ",
    selectMethodDesc: "Fiziksel metallerinizi nasıl almak istediğinizi seçin",
    cashSettlement: "Nakit Takas",
    cashSettlementDesc: "Canlı spot fiyattan anlık AUXM dönüşümü. Nakit için minimum yok.",
    vaultPickup: "Kasadan Teslim",
    vaultPickupDesc: "Belirlenen kasa lokasyonundan üretilmiş külçe/sikkeleri teslim alın.",
    insuredCourier: "Sigortalı Kurye",
    insuredCourierDesc: "Zırhlı taşıma ile tam sigortalı kapıdan kapıya teslimat.",
    vaultTransfer: "Kasa Transferi",
    vaultTransferDesc: "Tahsisli metali başka bir tanınmış kasa tesisine transfer edin.",
    kycTier2Required: "KYC Seviye 2+ Gerekli",
    inviteOnly: "Yalnızca Davetli",
    instantSettlement: "Anlık Takas",
    configureRedemption: "TESLİMATI YAPILANDIR",
    amount: "Miktar",
    enterAmount: "Gram cinsinden miktar girin",
    maxAvailable: "Maks. Kullanılabilir",
    useMax: "MAKS",
    selectVault: "Kasa Lokasyonu Seçin",
    vaultLocation: "KASA LOKASYONU",
    estimatedFee: "Tahmini Ücret",
    feeRate: "Ücret Oranı",
    netAmount: "Net Miktar (Ücret Sonrası)",
    estimatedDelivery: "Tahmini Teslimat",
    businessDays: "iş günü",
    instant: "Anlık",
    fabricationNote: "ÜRETİM NOTU",
    fabricationDesc: "Fiziksel külçeler LBMA/LPPM standartlarına göre üretilir. Üretim ücreti dahildir.",
    coolingPeriod: "BEKLEME SÜRESİ AKTİF",
    coolingDesc: "T+3 bekleme süresi yürürlüktedir. Yeni talep için lütfen bekleyin.",
    reviewTitle: "İNCELE & ONAYLA",
    reviewDesc: "Teslimat talebinizi göndermeden önce tüm detayları doğrulayın",
    metal: "Metal",
    method: "Yöntem",
    grossAmount: "Brüt Miktar",
    redemptionFee: "Teslimat Ücreti",
    netDelivery: "Net Teslimat Miktarı",
    deliveryMethod: "Teslimat Yöntemi",
    deliverySLA: "Teslimat Süresi",
    vaultLabel: "Kasa",
    legalDisclosure: "HUKUKİ BİLDİRİM",
    legalText1: "Bu teslimat talebini göndererek, ilgili metallerin tahsisli varlıklarınızdan düşüleceğini kabul etmektesiniz.",
    legalText2: "Fiziksel teslimat süreleri tahminidir ve üretim ile lojistik uygunluğuna bağlıdır.",
    legalText3: "Tüm teslimat ücretleri talep işleme durumuna geçtikten sonra iade edilemez.",
    agreeAndSubmit: "Kabul Ediyorum & Teslimata Gönder",
    submitting: "Gönderiliyor...",
    successTitle: "Teslimat Talebi Gönderildi",
    successMsg: "Teslimat talebiniz kaydedildi. E-posta ile onay alacaksınız.",
    redemptionId: "Teslimat ID",
    viewStatus: "Durumu Gör",
    newRedemption: "Yeni Teslimat",
    connectWallet: "Fiziksel teslimat başlatmak için cüzdanınızı bağlayın",
    insufficientBalance: "Yetersiz bakiye",
    belowMinThreshold: "Miktar minimum eşiğin altında",
    redemptionUnavailable: "Fiziksel teslimat şu anda kullanılamıyor",
    metalUnavailable: "Bu metal için teslimat şu anda kullanılamıyor",
    back: "Geri",
    next: "İleri",
    cancel: "İptal",
    grams: "g",
    perGram: "/g",
  },
  de: {
    pageTitle: "Physische Einlösung",
    pageSubtitle: "Zugeteiltes Metall in physische Lieferung oder Barausgleich umwandeln",
    step1: "Metall wählen",
    step2: "Methode wählen",
    step3: "Konfigurieren",
    step4: "Prüfen & Bestätigen",
    selectMetal: "METALL FÜR EINLÖSUNG WÄHLEN",
    selectMetalDesc: "Wählen Sie welches zugeteilte Metall Sie einlösen möchten",
    gold: "Gold", silver: "Silber", platinum: "Platin", palladium: "Palladium",
    yourBalance: "Ihr Guthaben", availableForRedemption: "Verfügbar zur Einlösung",
    encumberedLabel: "Belastet (Staking/Leasing)",
    minimumRequired: "Minimum erforderlich",
    notEligible: "Nicht berechtigt",
    eligible: "Berechtigt",
    belowMinimum: "Unter dem Mindestschwellenwert",
    moreRequired: "mehr erforderlich",
    insufficientForRedemption: "Unzureichend für Einlösung",
    selectMethod: "EINLÖSUNGSMETHODE",
    selectMethodDesc: "Wählen Sie wie Sie Ihre physischen Metalle erhalten möchten",
    cashSettlement: "Barausgleich",
    cashSettlementDesc: "Sofortige Umrechnung in AUXM zum Live-Spotpreis. Kein Minimum für Bar.",
    vaultPickup: "Tresorabholung",
    vaultPickupDesc: "Gefertigte Barren/Münzen an einem bestimmten Tresorstandort abholen.",
    insuredCourier: "Versicherter Kurier",
    insuredCourierDesc: "Voll versicherte Tür-zu-Tür-Lieferung per Sicherheitstransport.",
    vaultTransfer: "Tresortransfer",
    vaultTransferDesc: "Zugeteiltes Metall an eine andere anerkannte Tresoranlage übertragen.",
    kycTier2Required: "KYC Stufe 2+ Erforderlich",
    inviteOnly: "Nur auf Einladung",
    instantSettlement: "Sofortige Abwicklung",
    configureRedemption: "EINLÖSUNG KONFIGURIEREN",
    amount: "Menge",
    enterAmount: "Menge in Gramm eingeben",
    maxAvailable: "Max. Verfügbar",
    useMax: "MAX",
    selectVault: "Tresorstandort wählen",
    vaultLocation: "TRESORSTANDORT",
    estimatedFee: "Geschätzte Gebühr",
    feeRate: "Gebührsatz",
    netAmount: "Nettobetrag (nach Gebühr)",
    estimatedDelivery: "Geschätzte Lieferung",
    businessDays: "Werktage",
    instant: "Sofort",
    fabricationNote: "HERSTELLUNGSHINWEIS",
    fabricationDesc: "Physische Barren werden nach LBMA/LPPM-Standards gefertigt. Herstellung im Preis enthalten.",
    coolingPeriod: "WARTEZEIT AKTIV",
    coolingDesc: "Eine T+3 Wartezeit ist aktiv. Bitte warten Sie vor einer neuen Einlösung.",
    reviewTitle: "PRÜFEN & BESTÄTIGEN",
    reviewDesc: "Bitte überprüfen Sie alle Details vor der Einreichung",
    metal: "Metall",
    method: "Methode",
    grossAmount: "Bruttomenge",
    redemptionFee: "Einlösungsgebühr",
    netDelivery: "Nettoliefermenge",
    deliveryMethod: "Liefermethode",
    deliverySLA: "Liefer-SLA",
    vaultLabel: "Tresor",
    legalDisclosure: "RECHTLICHE OFFENLEGUNG",
    legalText1: "Mit der Einreichung dieses Einlösungsantrags bestätigen Sie die Entfernung der Metalle aus Ihren zugeteilten Beständen.",
    legalText2: "Physische Lieferzeiten sind Schätzungen und abhängig von Herstellung und Logistikverfügbarkeit.",
    legalText3: "Alle Einlösungsgebühren sind nach Verarbeitungsbeginn nicht erstattungsfähig.",
    agreeAndSubmit: "Ich stimme zu & Einlösung einreichen",
    submitting: "Wird eingereicht...",
    successTitle: "Einlösung eingereicht",
    successMsg: "Ihr Einlösungsantrag wurde erfasst. Bestätigung per E-Mail.",
    redemptionId: "Einlösungs-ID",
    viewStatus: "Status anzeigen",
    newRedemption: "Neue Einlösung",
    connectWallet: "Verbinden Sie Ihre Wallet für physische Einlösung",
    insufficientBalance: "Unzureichendes Guthaben",
    belowMinThreshold: "Betrag unter Mindestschwelle",
    redemptionUnavailable: "Physische Einlösung derzeit nicht verfügbar",
    metalUnavailable: "Einlösung für dieses Metall derzeit nicht verfügbar",
    back: "Zurück",
    next: "Weiter",
    cancel: "Abbrechen",
    grams: "g",
    perGram: "/g",
  },
  fr: {
    pageTitle: "Rachat Physique",
    pageSubtitle: "Convertir les métaux alloués en livraison physique ou règlement en espèces",
    step1: "Choisir le métal",
    step2: "Choisir la méthode",
    step3: "Configurer",
    step4: "Vérifier & Confirmer",
    selectMetal: "SÉLECTIONNER LE MÉTAL POUR LE RACHAT",
    selectMetalDesc: "Choisissez quel métal alloué vous souhaitez racheter",
    gold: "Or", silver: "Argent", platinum: "Platine", palladium: "Palladium",
    yourBalance: "Votre solde", availableForRedemption: "Disponible pour rachat",
    encumberedLabel: "Grevé (Staking/Location)",
    minimumRequired: "Minimum requis",
    notEligible: "Non éligible",
    eligible: "Éligible",
    belowMinimum: "En dessous du seuil minimum",
    moreRequired: "de plus requis",
    insufficientForRedemption: "Insuffisant pour le rachat",
    selectMethod: "MÉTHODE DE RACHAT",
    selectMethodDesc: "Choisissez comment vous souhaitez recevoir vos métaux physiques",
    cashSettlement: "Règlement en espèces",
    cashSettlementDesc: "Conversion instantanée en AUXM au prix spot en direct. Pas de minimum pour les espèces.",
    vaultPickup: "Retrait au coffre",
    vaultPickupDesc: "Récupérer les lingots/pièces fabriqués dans un coffre désigné.",
    insuredCourier: "Coursier assuré",
    insuredCourierDesc: "Livraison porte-à-porte entièrement assurée par transport blindé.",
    vaultTransfer: "Transfert de coffre",
    vaultTransferDesc: "Transférer le métal alloué vers une autre installation de coffre reconnue.",
    kycTier2Required: "KYC Niveau 2+ Requis",
    inviteOnly: "Sur invitation",
    instantSettlement: "Règlement instantané",
    configureRedemption: "CONFIGURER LE RACHAT",
    amount: "Montant",
    enterAmount: "Entrez le montant en grammes",
    maxAvailable: "Max. Disponible",
    useMax: "MAX",
    selectVault: "Sélectionner l'emplacement du coffre",
    vaultLocation: "EMPLACEMENT DU COFFRE",
    estimatedFee: "Frais estimés",
    feeRate: "Taux de frais",
    netAmount: "Montant net (après frais)",
    estimatedDelivery: "Livraison estimée",
    businessDays: "jours ouvrables",
    instant: "Instantané",
    fabricationNote: "NOTE DE FABRICATION",
    fabricationDesc: "Les lingots physiques sont fabriqués selon les normes LBMA/LPPM. Fabrication incluse dans les frais.",
    coolingPeriod: "PÉRIODE DE REFROIDISSEMENT ACTIVE",
    coolingDesc: "Une période de refroidissement T+3 est en vigueur. Veuillez patienter.",
    reviewTitle: "VÉRIFIER & CONFIRMER",
    reviewDesc: "Veuillez vérifier tous les détails avant de soumettre votre demande",
    metal: "Métal",
    method: "Méthode",
    grossAmount: "Montant brut",
    redemptionFee: "Frais de rachat",
    netDelivery: "Montant net de livraison",
    deliveryMethod: "Méthode de livraison",
    deliverySLA: "SLA de livraison",
    vaultLabel: "Coffre",
    legalDisclosure: "DIVULGATION JURIDIQUE",
    legalText1: "En soumettant cette demande, vous acceptez le retrait des métaux de vos avoirs alloués.",
    legalText2: "Les délais de livraison physique sont des estimations soumises à la disponibilité de fabrication.",
    legalText3: "Tous les frais de rachat sont non remboursables une fois la demande en traitement.",
    agreeAndSubmit: "J'accepte & Soumettre le rachat",
    submitting: "Soumission...",
    successTitle: "Rachat soumis",
    successMsg: "Votre demande de rachat a été enregistrée. Confirmation par e-mail.",
    redemptionId: "ID de rachat",
    viewStatus: "Voir le statut",
    newRedemption: "Nouveau rachat",
    connectWallet: "Connectez votre portefeuille pour le rachat physique",
    insufficientBalance: "Solde insuffisant",
    belowMinThreshold: "Montant en dessous du seuil minimum",
    redemptionUnavailable: "Rachat physique actuellement indisponible",
    metalUnavailable: "Rachat indisponible pour ce métal",
    back: "Retour",
    next: "Suivant",
    cancel: "Annuler",
    grams: "g",
    perGram: "/g",
  },
  ar: {
    pageTitle: "الاسترداد المادي",
    pageSubtitle: "تحويل المعادن المخصصة إلى تسليم مادي أو تسوية نقدية",
    step1: "اختيار المعدن",
    step2: "اختيار الطريقة",
    step3: "التكوين",
    step4: "المراجعة والتأكيد",
    selectMetal: "اختر المعدن للاسترداد",
    selectMetalDesc: "اختر المعدن المخصص الذي ترغب في استرداده",
    gold: "ذهب", silver: "فضة", platinum: "بلاتين", palladium: "بالاديوم",
    yourBalance: "رصيدك", availableForRedemption: "متاح للاسترداد",
    encumberedLabel: "مرهون (مقفل/مؤجر)",
    minimumRequired: "الحد الأدنى المطلوب",
    notEligible: "غير مؤهل",
    eligible: "مؤهل",
    belowMinimum: "أقل من الحد الأدنى",
    moreRequired: "إضافية مطلوبة",
    insufficientForRedemption: "غير كافٍ للاسترداد",
    selectMethod: "طريقة الاسترداد",
    selectMethodDesc: "اختر كيف تريد استلام معادنك المادية",
    cashSettlement: "تسوية نقدية",
    cashSettlementDesc: "تحويل فوري إلى AUXM بسعر السوق المباشر. لا حد أدنى للنقد.",
    vaultPickup: "الاستلام من الخزنة",
    vaultPickupDesc: "استلام السبائك/العملات المصنعة من موقع خزنة محدد.",
    insuredCourier: "ناقل مؤمن",
    insuredCourierDesc: "توصيل مؤمن بالكامل من الباب إلى الباب عبر نقل مدرع.",
    vaultTransfer: "تحويل الخزنة",
    vaultTransferDesc: "نقل المعدن المخصص إلى منشأة خزنة معترف بها أخرى.",
    kycTier2Required: "مطلوب KYC المستوى 2+",
    inviteOnly: "بدعوة فقط",
    instantSettlement: "تسوية فورية",
    configureRedemption: "تكوين الاسترداد",
    amount: "المبلغ",
    enterAmount: "أدخل المبلغ بالجرام",
    maxAvailable: "الحد الأقصى المتاح",
    useMax: "الأقصى",
    selectVault: "اختر موقع الخزنة",
    vaultLocation: "موقع الخزنة",
    estimatedFee: "الرسوم المقدرة",
    feeRate: "معدل الرسوم",
    netAmount: "المبلغ الصافي (بعد الرسوم)",
    estimatedDelivery: "التسليم المقدر",
    businessDays: "أيام عمل",
    instant: "فوري",
    fabricationNote: "ملاحظة التصنيع",
    fabricationDesc: "يتم تصنيع السبائك المادية وفقاً لمعايير LBMA/LPPM. التصنيع مشمول في الرسوم.",
    coolingPeriod: "فترة التهدئة نشطة",
    coolingDesc: "فترة تهدئة T+3 سارية المفعول. يرجى الانتظار قبل تقديم طلب جديد.",
    reviewTitle: "المراجعة والتأكيد",
    reviewDesc: "يرجى التحقق من جميع التفاصيل قبل إرسال طلب الاسترداد",
    metal: "المعدن",
    method: "الطريقة",
    grossAmount: "المبلغ الإجمالي",
    redemptionFee: "رسوم الاسترداد",
    netDelivery: "صافي مبلغ التسليم",
    deliveryMethod: "طريقة التسليم",
    deliverySLA: "وقت التسليم",
    vaultLabel: "الخزنة",
    legalDisclosure: "إفصاح قانوني",
    legalText1: "بتقديم هذا الطلب، تقر بأن المعادن المشار إليها ستُزال من ممتلكاتك المخصصة.",
    legalText2: "مواعيد التسليم المادي تقديرية وتخضع لتوافر التصنيع والخدمات اللوجستية.",
    legalText3: "جميع رسوم الاسترداد غير قابلة للاسترداد بمجرد دخول الطلب حالة المعالجة.",
    agreeAndSubmit: "أوافق وأقدم الاسترداد",
    submitting: "جارِ الإرسال...",
    successTitle: "تم تقديم الاسترداد",
    successMsg: "تم تسجيل طلب الاسترداد. ستتلقى تأكيداً عبر البريد الإلكتروني.",
    redemptionId: "رقم الاسترداد",
    viewStatus: "عرض الحالة",
    newRedemption: "استرداد جديد",
    connectWallet: "قم بتوصيل محفظتك لبدء الاسترداد المادي",
    insufficientBalance: "رصيد غير كافٍ",
    belowMinThreshold: "المبلغ أقل من الحد الأدنى",
    redemptionUnavailable: "الاسترداد المادي غير متاح حالياً",
    metalUnavailable: "الاسترداد غير متاح لهذا المعدن حالياً",
    back: "رجوع",
    next: "التالي",
    cancel: "إلغاء",
    grams: "غ",
    perGram: "/غ",
  },
  ru: {
    pageTitle: "Физическое погашение",
    pageSubtitle: "Конвертировать размещённые металлы в физическую доставку или расчёт наличными",
    step1: "Выбрать металл",
    step2: "Выбрать метод",
    step3: "Настроить",
    step4: "Проверить и подтвердить",
    selectMetal: "ВЫБЕРИТЕ МЕТАЛЛ ДЛЯ ПОГАШЕНИЯ",
    selectMetalDesc: "Выберите размещённый металл для погашения",
    gold: "Золото", silver: "Серебро", platinum: "Платина", palladium: "Палладий",
    yourBalance: "Ваш баланс", availableForRedemption: "Доступно для погашения",
    encumberedLabel: "Обременённые (Стейкинг/Лизинг)",
    minimumRequired: "Минимум требуется",
    notEligible: "Не подходит",
    eligible: "Подходит",
    belowMinimum: "Ниже минимального порога",
    moreRequired: "ещё необходимо",
    insufficientForRedemption: "Недостаточно для погашения",
    selectMethod: "МЕТОД ПОГАШЕНИЯ",
    selectMethodDesc: "Выберите как вы хотите получить физические металлы",
    cashSettlement: "Расчёт наличными",
    cashSettlementDesc: "Мгновенная конвертация в AUXM по спотовой цене. Нет минимума для наличных.",
    vaultPickup: "Получение в хранилище",
    vaultPickupDesc: "Получить изготовленные слитки/монеты в указанном хранилище.",
    insuredCourier: "Страховой курьер",
    insuredCourierDesc: "Полностью застрахованная доставка от двери до двери бронированным транспортом.",
    vaultTransfer: "Трансфер хранилища",
    vaultTransferDesc: "Перевести размещённый металл в другое признанное хранилище.",
    kycTier2Required: "Требуется KYC Уровень 2+",
    inviteOnly: "Только по приглашению",
    instantSettlement: "Мгновенный расчёт",
    configureRedemption: "НАСТРОЙКА ПОГАШЕНИЯ",
    amount: "Сумма",
    enterAmount: "Введите количество в граммах",
    maxAvailable: "Макс. доступно",
    useMax: "МАКС",
    selectVault: "Выберите хранилище",
    vaultLocation: "РАСПОЛОЖЕНИЕ ХРАНИЛИЩА",
    estimatedFee: "Ориентировочная комиссия",
    feeRate: "Ставка комиссии",
    netAmount: "Чистая сумма (после комиссии)",
    estimatedDelivery: "Ориентировочная доставка",
    businessDays: "рабочих дней",
    instant: "Мгновенно",
    fabricationNote: "ПРИМЕЧАНИЕ О ПРОИЗВОДСТВЕ",
    fabricationDesc: "Физические слитки изготавливаются по стандартам LBMA/LPPM. Изготовление включено в комиссию.",
    coolingPeriod: "ПЕРИОД ОЖИДАНИЯ АКТИВЕН",
    coolingDesc: "Действует период ожидания T+3. Пожалуйста, подождите.",
    reviewTitle: "ПРОВЕРКА И ПОДТВЕРЖДЕНИЕ",
    reviewDesc: "Пожалуйста, проверьте все детали перед отправкой",
    metal: "Металл",
    method: "Метод",
    grossAmount: "Сумма брутто",
    redemptionFee: "Комиссия за погашение",
    netDelivery: "Чистая сумма доставки",
    deliveryMethod: "Метод доставки",
    deliverySLA: "Срок доставки",
    vaultLabel: "Хранилище",
    legalDisclosure: "ЮРИДИЧЕСКОЕ РАСКРЫТИЕ",
    legalText1: "Отправляя запрос, вы подтверждаете удаление металлов из ваших размещённых активов.",
    legalText2: "Сроки физической доставки являются ориентировочными и зависят от производства и логистики.",
    legalText3: "Все комиссии за погашение не подлежат возврату после начала обработки.",
    agreeAndSubmit: "Согласен и отправить погашение",
    submitting: "Отправка...",
    successTitle: "Погашение отправлено",
    successMsg: "Ваш запрос записан. Вы получите подтверждение по электронной почте.",
    redemptionId: "ID погашения",
    viewStatus: "Просмотр статуса",
    newRedemption: "Новое погашение",
    connectWallet: "Подключите кошелёк для физического погашения",
    insufficientBalance: "Недостаточный баланс",
    belowMinThreshold: "Сумма ниже минимального порога",
    redemptionUnavailable: "Физическое погашение временно недоступно",
    metalUnavailable: "Погашение для этого металла временно недоступно",
    back: "Назад",
    next: "Далее",
    cancel: "Отмена",
    grams: "г",
    perGram: "/г",
  },
};

// ============================================
// TYPES
// ============================================
interface MetalConfig {
  symbol: string;
  name: string;
  icon: string;
  color: string;
}

interface RedemptionConfig {
  enabled: boolean;
  minThreshold: number;
  feePercent: number;
  sla: { min: number; max: number };
  vaults: { id: string; name: string; country: string; active: boolean }[];
  methods: Record<string, { available: boolean; label: string; kycTier?: number; inviteOnly?: boolean }>;
}

interface UserEligibility {
  balance: number;
  encumbered: number;
  available: number;
  eligible: boolean;
  coolingActive: boolean;
  estimatedFee: number;
}

type RedemptionMethod = "cash" | "pickup" | "courier" | "vault_transfer";

const METALS: MetalConfig[] = [
  { symbol: "AUXG", name: "gold", icon: "/auxg_icon.png", color: "#D4AF37" },
  { symbol: "AUXS", name: "silver", icon: "/auxs_icon.png", color: "#C0C0C0" },
  { symbol: "AUXPT", name: "platinum", icon: "/auxpt_icon.png", color: "#E5E4E2" },
  { symbol: "AUXPD", name: "palladium", icon: "/auxpd_icon.png", color: "#CED0CE" },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function RedeemPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;
  const isRTL = lang === "ar";

  // State
  const [address, setAddress] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [selectedMetal, setSelectedMetal] = useState<string>("AUXG");
  const [selectedMethod, setSelectedMethod] = useState<RedemptionMethod | null>(null);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [config, setConfig] = useState<RedemptionConfig | null>(null);
  const [userInfo, setUserInfo] = useState<UserEligibility | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; netAmount: number; method: string; estimatedDelivery: string } | null>(null);

  // Load wallet address from localStorage
  useEffect(() => {
    const savedAddress = localStorage.getItem("auxite_wallet_address");
    if (savedAddress) setAddress(savedAddress);
  }, []);

  // Fetch config when metal changes
  const fetchConfig = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/redeem?metal=${selectedMetal}&address=${address}`);
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setUserInfo(data.user);
      } else {
        setError(data.error || t.redemptionUnavailable);
      }
    } catch {
      setError(t.redemptionUnavailable);
    } finally {
      setLoading(false);
    }
  }, [address, selectedMetal, t.redemptionUnavailable]);

  useEffect(() => {
    if (address) fetchConfig();
  }, [address, selectedMetal, fetchConfig]);

  // Submit redemption
  const handleSubmit = async () => {
    if (!address || !selectedMethod || !amount) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          metal: selectedMetal,
          amount: parseFloat(amount),
          method: selectedMethod,
          vault: selectedVault,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess({
          id: data.redemption.id,
          netAmount: data.redemption.netAmount,
          method: data.redemption.method,
          estimatedDelivery: data.redemption.estimatedDelivery,
        });
      } else {
        setError(data.error || "Failed to submit redemption");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Computed values
  const amt = parseFloat(amount) || 0;
  const feeRate = config?.feePercent ? config.feePercent / 100 : 0;
  const fee = amt * feeRate;
  const netAmt = amt - fee;
  const minThreshold = config?.minThreshold || 100;
  const sla = config?.sla || { min: 5, max: 15 };
  const activeVaults = config?.vaults || [];

  const metalNames: Record<string, string> = {
    AUXG: t.gold, AUXS: t.silver, AUXPT: t.platinum, AUXPD: t.palladium,
  };

  const methodLabels: Record<string, string> = {
    cash: t.cashSettlement,
    pickup: t.vaultPickup,
    courier: t.insuredCourier,
    vault_transfer: t.vaultTransfer,
  };

  // Step indicator
  const steps = [t.step1, t.step2, t.step3, t.step4];

  // ============================================
  // RENDER
  // ============================================

  // Not connected
  if (!address) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <TopNav />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-12">
            <div className="w-16 h-16 bg-[#BFA181]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{t.connectWallet}</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F1A]">
        <TopNav />
        <div className="max-w-2xl mx-auto px-4 pt-24">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-800 p-8 text-center">
            <div className="w-20 h-20 bg-[#2F6F62]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{t.successTitle}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t.successMsg}</p>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.redemptionId}</span>
                <span className="text-xs font-mono text-[#BFA181]">{success.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.metal}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-white">{metalNames[selectedMetal]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.netDelivery}</span>
                <span className="text-xs font-semibold text-[#2F6F62]">{success.netAmount.toFixed(2)}{t.grams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.deliveryMethod}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-white">{methodLabels[success.method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.estimatedDelivery}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-white">{success.estimatedDelivery}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/vault" className="flex-1 py-3 text-center rounded-xl border border-stone-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                {t.viewStatus}
              </Link>
              <button
                onClick={() => { setSuccess(null); setStep(1); setAmount(""); setSelectedMethod(null); setSelectedVault(null); fetchConfig(); }}
                className="flex-1 py-3 text-center rounded-xl bg-[#BFA181] text-sm font-semibold text-black hover:bg-[#D4B47A] transition-colors"
              >
                {t.newRedemption}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-[#0B0F1A] ${isRTL ? "rtl" : ""}`}>
      <TopNav />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-32">
        {/* Header */}
        <div className="mb-8">
          <Link href="/vault" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#BFA181] mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.back}
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t.pageTitle}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.pageSubtitle}</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {steps.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i + 1 <= step ? "bg-[#BFA181] text-black" : "bg-slate-200 dark:bg-slate-700 text-slate-500"
              }`}>
                {i + 1 < step ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${
                i + 1 <= step ? "text-[#BFA181]" : "text-slate-400"
              }`}>{label}</span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 ${i + 1 < step ? "bg-[#BFA181]" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10">
            <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Cooling Period Warning */}
        {userInfo?.coolingActive && (
          <div className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10">
            <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{t.coolingPeriod}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">{t.coolingDesc}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 1: Select Metal */}
        {/* ═══════════════════════════════════════════════ */}
        {!loading && step === 1 && (
          <div>
            <div className="mb-4">
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500">{t.selectMetal}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.selectMetalDesc}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {METALS.map((metal) => {
                const isSelected = selectedMetal === metal.symbol;
                return (
                  <button
                    key={metal.symbol}
                    onClick={() => setSelectedMetal(metal.symbol)}
                    className={`relative p-5 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? "border-[#BFA181] bg-[#BFA181]/5 dark:bg-[#BFA181]/10"
                        : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-stone-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <img src={metal.icon} alt={metal.symbol} className="w-10 h-10 rounded-full" />
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{metalNames[metal.symbol]}</p>
                        <p className="text-xs text-slate-400">{metal.symbol}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-auto w-6 h-6 bg-[#BFA181] rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Balance Info */}
                    {userInfo && isSelected && (
                      <div className="mt-3 pt-3 border-t border-stone-100 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">{t.yourBalance}</span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-white">{userInfo.balance.toFixed(2)}{t.grams}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">{t.encumberedLabel}</span>
                          <span className="text-xs font-semibold text-amber-500">{userInfo.encumbered.toFixed(2)}{t.grams}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">{t.minimumRequired}</span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{minThreshold}{t.grams}</span>
                        </div>
                        <div className="flex justify-end mt-1">
                          {userInfo.eligible ? (
                            <span className="text-xs font-bold text-[#2F6F62] bg-[#2F6F62]/10 px-2 py-0.5 rounded">{t.eligible}</span>
                          ) : userInfo.coolingActive ? (
                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded">
                              {t.coolingPeriod}
                            </span>
                          ) : (
                            <div className="w-full mt-1 p-2 rounded-lg bg-red-500/5 border border-red-500/15">
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-red-500 font-semibold">{t.insufficientForRedemption}</span>
                                <span className="text-xs font-bold text-red-500">{userInfo.available.toFixed(2)}{t.grams} / {minThreshold}{t.grams}</span>
                              </div>
                              <p className="text-[11px] text-red-400 mt-1">
                                {(minThreshold - userInfo.available).toFixed(2)}{t.grams} {t.moreRequired}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!config?.enabled}
                className="px-8 py-3 rounded-xl bg-[#BFA181] text-sm font-bold text-black hover:bg-[#D4B47A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 2: Choose Method */}
        {/* ═══════════════════════════════════════════════ */}
        {!loading && step === 2 && (
          <div>
            <div className="mb-4">
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500">{t.selectMethod}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.selectMethodDesc}</p>
            </div>

            <div className="space-y-3">
              {/* Cash Settlement */}
              <button
                onClick={() => setSelectedMethod("cash")}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === "cash"
                    ? "border-[#2F6F62] bg-[#2F6F62]/5 dark:bg-[#2F6F62]/10"
                    : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-stone-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#2F6F62]/10 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{t.cashSettlement}</p>
                      <span className="text-[10px] font-bold text-[#2F6F62] bg-[#2F6F62]/10 px-2 py-0.5 rounded">{t.instantSettlement}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.cashSettlementDesc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedMethod === "cash" ? "border-[#2F6F62]" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {selectedMethod === "cash" && <div className="w-3 h-3 rounded-full bg-[#2F6F62]" />}
                  </div>
                </div>
              </button>

              {/* Vault Pickup */}
              <button
                onClick={() => setSelectedMethod("pickup")}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === "pickup"
                    ? "border-[#BFA181] bg-[#BFA181]/5 dark:bg-[#BFA181]/10"
                    : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-stone-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#BFA181]/10 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-white mb-1">{t.vaultPickup}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.vaultPickupDesc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedMethod === "pickup" ? "border-[#BFA181]" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {selectedMethod === "pickup" && <div className="w-3 h-3 rounded-full bg-[#BFA181]" />}
                  </div>
                </div>
              </button>

              {/* Insured Courier */}
              <button
                onClick={() => setSelectedMethod("courier")}
                className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
                  selectedMethod === "courier"
                    ? "border-[#BFA181] bg-[#BFA181]/5 dark:bg-[#BFA181]/10"
                    : "border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-stone-300 dark:hover:border-slate-600"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#BFA181]/10 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{t.insuredCourier}</p>
                      <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/20 px-2 py-0.5 rounded">{t.kycTier2Required}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.insuredCourierDesc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedMethod === "courier" ? "border-[#BFA181]" : "border-slate-300 dark:border-slate-600"
                  }`}>
                    {selectedMethod === "courier" && <div className="w-3 h-3 rounded-full bg-[#BFA181]" />}
                  </div>
                </div>
              </button>

              {/* Vault Transfer (Invite Only) */}
              <div className="p-5 rounded-xl border-2 border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-900 opacity-50 cursor-not-allowed">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{t.vaultTransfer}</p>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{t.inviteOnly}</span>
                    </div>
                    <p className="text-xs text-slate-400">{t.vaultTransferDesc}</p>
                  </div>
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t.back}
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!selectedMethod}
                className="px-8 py-3 rounded-xl bg-[#BFA181] text-sm font-bold text-black hover:bg-[#D4B47A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 3: Configure */}
        {/* ═══════════════════════════════════════════════ */}
        {!loading && step === 3 && (
          <div>
            <div className="mb-4">
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500">{t.configureRedemption}</h2>
            </div>

            <div className="space-y-4">
              {/* Amount Input */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-5">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.amount} ({t.grams})</label>
                  <span className="text-xs text-slate-400">
                    {t.maxAvailable}: <span className="font-bold text-[#2F6F62]">{userInfo?.available.toFixed(2) || "0"}{t.grams}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(null); }}
                    placeholder={t.enterAmount}
                    className="flex-1 text-2xl font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-lg text-slate-400 font-semibold">{t.grams}</span>
                  <button
                    onClick={() => setAmount(userInfo?.available.toFixed(2) || "0")}
                    className="px-3 py-1.5 rounded-lg bg-[#BFA181]/10 text-xs font-bold text-[#BFA181] hover:bg-[#BFA181]/20 transition-colors"
                  >
                    {t.useMax}
                  </button>
                </div>

                {/* Minimum threshold notice for physical methods */}
                {selectedMethod !== "cash" && amt > 0 && amt < minThreshold && (
                  <p className="text-xs text-red-500 mt-2">{t.belowMinThreshold} ({minThreshold}{t.grams} {t.minimumRequired.toLowerCase()})</p>
                )}
              </div>

              {/* Vault Selection (for pickup & courier) */}
              {selectedMethod !== "cash" && activeVaults.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-5">
                  <p className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t.vaultLocation}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activeVaults.map((vault) => (
                      <button
                        key={vault.id}
                        onClick={() => setSelectedVault(vault.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          selectedVault === vault.id
                            ? "border-[#BFA181] bg-[#BFA181]/5"
                            : "border-stone-200 dark:border-slate-700 hover:border-stone-300"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{vault.name}</p>
                            <p className="text-xs text-slate-400">{vault.country}</p>
                          </div>
                          {selectedVault === vault.id && (
                            <div className="ml-auto">
                              <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Fee Breakdown */}
              {amt > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-5 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{t.grossAmount}</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{amt.toFixed(2)}{t.grams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{t.feeRate}</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{config?.feePercent?.toFixed(2) || "0.75"}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{t.estimatedFee}</span>
                    <span className="text-sm text-amber-500 font-semibold">-{fee.toFixed(2)}{t.grams}</span>
                  </div>
                  <div className="border-t border-stone-100 dark:border-slate-800 pt-3 flex justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{t.netAmount}</span>
                    <span className="text-sm font-bold text-[#2F6F62]">{netAmt.toFixed(2)}{t.grams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">{t.estimatedDelivery}</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-white">
                      {selectedMethod === "cash" ? t.instant : `${sla.min}-${sla.max} ${t.businessDays}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Fabrication Note (for physical methods) */}
              {selectedMethod !== "cash" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#BFA181]/5 dark:bg-[#BFA181]/10 border border-[#BFA181]/20">
                  <svg className="w-5 h-5 text-[#BFA181] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-semibold text-[#BFA181] mb-1">{t.fabricationNote}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t.fabricationDesc}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t.back}
              </button>
              <button
                onClick={() => {
                  // Validate
                  if (amt <= 0) { setError(t.enterAmount); return; }
                  if (userInfo && amt > userInfo.available) { setError(t.insufficientBalance); return; }
                  if (selectedMethod !== "cash" && amt < minThreshold) { setError(t.belowMinThreshold); return; }
                  setError(null);
                  setStep(4);
                }}
                disabled={!amount || amt <= 0}
                className="px-8 py-3 rounded-xl bg-[#BFA181] text-sm font-bold text-black hover:bg-[#D4B47A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t.next}
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════ */}
        {/* STEP 4: Review & Confirm */}
        {/* ═══════════════════════════════════════════════ */}
        {!loading && step === 4 && (
          <div>
            <div className="mb-4">
              <h2 className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500">{t.reviewTitle}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.reviewDesc}</p>
            </div>

            {/* Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 space-y-4 mb-6">
              <div className="flex justify-between items-center pb-3 border-b border-stone-100 dark:border-slate-800">
                <span className="text-xs text-slate-500">{t.metal}</span>
                <div className="flex items-center gap-2">
                  <img src={METALS.find(m => m.symbol === selectedMetal)?.icon} alt="" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{metalNames[selectedMetal]} ({selectedMetal})</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.method}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{methodLabels[selectedMethod || "cash"]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.grossAmount}</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{amt.toFixed(2)}{t.grams}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.redemptionFee} ({config?.feePercent?.toFixed(2)}%)</span>
                <span className="text-sm text-amber-500 font-semibold">-{fee.toFixed(2)}{t.grams}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-stone-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{t.netDelivery}</span>
                <span className="text-lg font-bold text-[#2F6F62]">{netAmt.toFixed(2)}{t.grams}</span>
              </div>
              {selectedVault && (
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">{t.vaultLabel}</span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white">
                    {activeVaults.find(v => v.id === selectedVault)?.name || selectedVault}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">{t.deliverySLA}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-white">
                  {selectedMethod === "cash" ? t.instant : `${sla.min}-${sla.max} ${t.businessDays}`}
                </span>
              </div>
            </div>

            {/* Legal Disclosure */}
            <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-stone-200 dark:border-slate-700 p-5 mb-6">
              <p className="text-xs font-semibold tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t.legalDisclosure}</p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.legalText1}</p>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.legalText2}</p>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                  </svg>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.legalText3}</p>
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 rounded-xl border border-stone-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t.back}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (userInfo?.coolingActive ?? false)}
                className="flex-[2] py-3.5 rounded-xl bg-[#BFA181] text-sm font-bold text-black hover:bg-[#D4B47A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    {t.submitting}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    {t.agreeAndSubmit}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
