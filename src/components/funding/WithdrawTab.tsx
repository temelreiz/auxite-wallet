"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { TwoFactorGate } from "@/components/TwoFactorGate";
import { FeePreviewPanel } from "./FeePreviewPanel";
import { formatAmount, getDecimalPlaces } from '@/lib/format';

// ============================================
// TRANSLATIONS (6 languages)
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    // Step headers
    withdrawAsset: "Varlık Çekim",
    selectAsset: "Varlık Seçin",
    assetBalance: "Varlık Bakiyesi",
    transferType: "Transfer Türü",
    transferDetails: "Transfer Detayları",
    transactionSummary: "İşlem Özeti",
    confirmation: "Onay",
    // Step indicators
    step: "Adım",
    of: "/",
    // Asset selection
    availableBalance: "Kullanılabilir Bakiye",
    noAvailableAssets: "Kullanılabilir varlık yok",
    fundsEncumbered: "Fonlar aktif yapılandırılmış getiri pozisyonlarında tahsis edilmiş.",
    // Balance panel
    total: "Toplam",
    available: "Kullanılabilir",
    encumbered: "Tahsis Edilmiş",
    pendingSettlement: "Bekleyen Takas",
    // Transfer type
    internalCustodyTransfer: "Dahili Saklama Transferi",
    internalDesc: "Auxite saklama hesapları arasında, Auxite saklama defterine kaydedilir.",
    externalSettlementTransfer: "Harici Takas Transferi",
    externalDesc: "Harici olarak transfer edilen varlıklar artık Auxite saklama yapıları altında tutulmayacaktır.",
    metalBlockedTitle: "Metal Varlıklar Harici Transfer Edilemez",
    metalBlockedDesc: "Metal varlıklar doğrudan harici transfere uygun değildir.",
    sellToAuxm: "AUXM'ye Sat",
    physicalRedemption: "Fiziksel İtfa",
    // Internal form
    recipientLabel: "Auxite Hesap ID / E-posta",
    enterRecipient: "Hesap ID veya e-posta girin",
    amount: "Tutar",
    enterAmount: "Tutar girin",
    max: "Maks",
    // External form
    settlementNetwork: "Takas Ağı",
    destinationAddress: "Hedef Adres",
    enterDestination: "Hedef adres girin",
    destinationTag: "Hedef Etiketi (Zorunlu)",
    enterDestinationTag: "Sayısal hedef etiketi girin",
    xrpTagRequired: "XRP transferleri için hedef etiketi zorunludur.",
    // Summary
    asset: "Varlık",
    transferAmount: "Transfer Tutarı",
    networkFee: "Ağ Ücreti",
    platformFee: "Platform Ücreti",
    settlementFee: "Takas Ücreti (Dahili)",
    netSettlementAmount: "Net Takas Tutarı",
    recipient: "Alıcı",
    destination: "Hedef",
    network: "Ağ",
    postTransferBalance: "Transfer Sonrası Bakiye",
    settlementWindow: "Takas Süresi",
    // Notices
    internalNotice: "Transferler Auxite saklama defterine kaydedildikten sonra kesinleşir.",
    externalNotice: "Harici olarak transfer edilen varlıklar artık Auxite saklama yapıları altında tutulmayacaktır.",
    securityReview: "Harici transferler saklama risk kontrollerine tabi olabilir.",
    verifyAddress: "Adresi kontrol edin. Bu işlem geri alınamaz.",
    // Buttons
    continue: "Devam Et",
    back: "Geri",
    confirm: "Onayla",
    sending: "Gönderiliyor...",
    confirmTransfer: "Transferi Onayla",
    confirmWithdrawal: "Çekimi Onayla",
    // Status & History
    withdrawalHistory: "Transfer Geçmişi",
    noWithdrawals: "Henüz transfer yok",
    pending: "Beklemede",
    completed: "Tamamlandı",
    processing: "İşleniyor",
    failed: "Başarısız",
    sent: "Gönderildi",
    // Results
    transferSuccess: "Dahili saklama transferi başarılı!",
    withdrawalSuccess: "Harici takas transferi başlatıldı!",
    transferFailed: "Transfer başarısız",
    withdrawalFailed: "Çekim başarısız",
    insufficientBalance: "Yetersiz bakiye",
    invalidAddress: "Geçersiz adres",
    invalidRecipient: "Geçersiz alıcı",
    minimumAmount: "Minimum tutar",
    free: "Ücretsiz",
    instant: "Anında",
    comingSoon: "Yakında",
  },
  en: {
    withdrawAsset: "Withdraw Asset",
    selectAsset: "Select Asset",
    assetBalance: "Asset Balance",
    transferType: "Transfer Type",
    transferDetails: "Transfer Details",
    transactionSummary: "Transaction Summary",
    confirmation: "Confirmation",
    step: "Step",
    of: "/",
    availableBalance: "Available Balance",
    noAvailableAssets: "No available assets",
    fundsEncumbered: "Funds are encumbered in active structured yield positions.",
    total: "Total",
    available: "Available",
    encumbered: "Encumbered",
    pendingSettlement: "Pending Settlement",
    internalCustodyTransfer: "Internal Custody Transfer",
    internalDesc: "Transfers between Auxite custody accounts, recorded in the Auxite custody ledger.",
    externalSettlementTransfer: "External Settlement Transfer",
    externalDesc: "Assets transferred externally will no longer be held within Auxite custody structures.",
    metalBlockedTitle: "Metal Assets Cannot Be Transferred Externally",
    metalBlockedDesc: "Metal assets are not eligible for direct external transfer.",
    sellToAuxm: "Sell to AUXM",
    physicalRedemption: "Physical Redemption",
    recipientLabel: "Auxite Account ID / Email",
    enterRecipient: "Enter account ID or email",
    amount: "Amount",
    enterAmount: "Enter amount",
    max: "Max",
    settlementNetwork: "Settlement Network",
    destinationAddress: "Destination Address",
    enterDestination: "Enter destination address",
    destinationTag: "Destination Tag (Required)",
    enterDestinationTag: "Enter numeric destination tag",
    xrpTagRequired: "A destination tag is required for XRP transfers.",
    asset: "Asset",
    transferAmount: "Transfer Amount",
    networkFee: "Network Fee",
    platformFee: "Platform Fee",
    settlementFee: "Settlement Fee (Internal)",
    netSettlementAmount: "Net Settlement Amount",
    recipient: "Recipient",
    destination: "Destination",
    network: "Network",
    postTransferBalance: "Post-Transfer Available Balance",
    settlementWindow: "Estimated Settlement Window",
    internalNotice: "Transfers are final once recorded in the Auxite custody ledger.",
    externalNotice: "Assets transferred externally will no longer be held within Auxite custody structures.",
    securityReview: "External transfers may be subject to security review in accordance with custody risk controls.",
    verifyAddress: "Verify address. This cannot be reversed.",
    continue: "Continue",
    back: "Back",
    confirm: "Confirm",
    sending: "Sending...",
    confirmTransfer: "Confirm Transfer",
    confirmWithdrawal: "Confirm Withdrawal",
    withdrawalHistory: "Transfer History",
    noWithdrawals: "No transfers yet",
    pending: "Pending",
    completed: "Completed",
    processing: "Processing",
    failed: "Failed",
    sent: "Sent",
    transferSuccess: "Internal custody transfer successful!",
    withdrawalSuccess: "External settlement transfer initiated!",
    transferFailed: "Transfer failed",
    withdrawalFailed: "Withdrawal failed",
    insufficientBalance: "Insufficient balance",
    invalidAddress: "Invalid address",
    invalidRecipient: "Invalid recipient",
    minimumAmount: "Minimum amount",
    free: "Free",
    instant: "Instant",
    comingSoon: "Coming Soon",
  },
  de: {
    withdrawAsset: "Vermögenswert abheben",
    selectAsset: "Vermögenswert wählen",
    assetBalance: "Vermögenssaldo",
    transferType: "Transferart",
    transferDetails: "Transferdetails",
    transactionSummary: "Transaktionsübersicht",
    confirmation: "Bestätigung",
    step: "Schritt",
    of: "/",
    availableBalance: "Verfügbares Guthaben",
    noAvailableAssets: "Keine verfügbaren Vermögenswerte",
    fundsEncumbered: "Mittel sind in aktiven Structured-Yield-Positionen gebunden.",
    total: "Gesamt",
    available: "Verfügbar",
    encumbered: "Belastet",
    pendingSettlement: "Ausstehende Abwicklung",
    internalCustodyTransfer: "Interner Verwahrungstransfer",
    internalDesc: "Transfers zwischen Auxite-Verwahrungskonten, im Auxite-Verwahrungsregister erfasst.",
    externalSettlementTransfer: "Externer Abwicklungstransfer",
    externalDesc: "Extern übertragene Vermögenswerte werden nicht mehr in Auxite-Verwahrungsstrukturen gehalten.",
    metalBlockedTitle: "Metallvermögen kann nicht extern transferiert werden",
    metalBlockedDesc: "Metallvermögen ist nicht für direkten externen Transfer berechtigt.",
    sellToAuxm: "Zu AUXM verkaufen",
    physicalRedemption: "Physische Einlösung",
    recipientLabel: "Auxite Konto-ID / E-Mail",
    enterRecipient: "Konto-ID oder E-Mail eingeben",
    amount: "Betrag",
    enterAmount: "Betrag eingeben",
    max: "Max",
    settlementNetwork: "Abwicklungsnetzwerk",
    destinationAddress: "Zieladresse",
    enterDestination: "Zieladresse eingeben",
    destinationTag: "Ziel-Tag (Erforderlich)",
    enterDestinationTag: "Numerisches Ziel-Tag eingeben",
    xrpTagRequired: "Ein Ziel-Tag ist für XRP-Transfers erforderlich.",
    asset: "Vermögenswert",
    transferAmount: "Transferbetrag",
    networkFee: "Netzwerkgebühr",
    platformFee: "Plattformgebühr",
    settlementFee: "Abwicklungsgebühr (Intern)",
    netSettlementAmount: "Nettoabwicklungsbetrag",
    recipient: "Empfänger",
    destination: "Ziel",
    network: "Netzwerk",
    postTransferBalance: "Verfügbares Guthaben nach Transfer",
    settlementWindow: "Geschätztes Abwicklungsfenster",
    internalNotice: "Transfers sind endgültig, sobald sie im Auxite-Verwahrungsregister erfasst sind.",
    externalNotice: "Extern übertragene Vermögenswerte werden nicht mehr in Auxite-Verwahrungsstrukturen gehalten.",
    securityReview: "Externe Transfers können einer Sicherheitsüberprüfung unterliegen.",
    verifyAddress: "Adresse überprüfen. Nicht rückgängig zu machen.",
    continue: "Weiter",
    back: "Zurück",
    confirm: "Bestätigen",
    sending: "Sende...",
    confirmTransfer: "Transfer bestätigen",
    confirmWithdrawal: "Abhebung bestätigen",
    withdrawalHistory: "Transferhistorie",
    noWithdrawals: "Keine Transfers",
    pending: "Ausstehend",
    completed: "Abgeschlossen",
    processing: "Verarbeitung",
    failed: "Fehlgeschlagen",
    sent: "Gesendet",
    transferSuccess: "Interner Verwahrungstransfer erfolgreich!",
    withdrawalSuccess: "Externer Abwicklungstransfer eingeleitet!",
    transferFailed: "Transfer fehlgeschlagen",
    withdrawalFailed: "Abhebung fehlgeschlagen",
    insufficientBalance: "Unzureichendes Guthaben",
    invalidAddress: "Ungültige Adresse",
    invalidRecipient: "Ungültiger Empfänger",
    minimumAmount: "Mindestbetrag",
    free: "Kostenlos",
    instant: "Sofort",
    comingSoon: "Demnächst",
  },
  fr: {
    withdrawAsset: "Retrait d'Actif",
    selectAsset: "Sélectionner l'Actif",
    assetBalance: "Solde de l'Actif",
    transferType: "Type de Transfert",
    transferDetails: "Détails du Transfert",
    transactionSummary: "Résumé de la Transaction",
    confirmation: "Confirmation",
    step: "Étape",
    of: "/",
    availableBalance: "Solde Disponible",
    noAvailableAssets: "Aucun actif disponible",
    fundsEncumbered: "Les fonds sont engagés dans des positions de rendement structuré actives.",
    total: "Total",
    available: "Disponible",
    encumbered: "Grevé",
    pendingSettlement: "Règlement en Attente",
    internalCustodyTransfer: "Transfert de Garde Interne",
    internalDesc: "Transferts entre comptes de garde Auxite, enregistrés dans le registre de garde Auxite.",
    externalSettlementTransfer: "Transfert de Règlement Externe",
    externalDesc: "Les actifs transférés en externe ne seront plus détenus dans les structures de garde Auxite.",
    metalBlockedTitle: "Les Métaux ne Peuvent pas être Transférés en Externe",
    metalBlockedDesc: "Les métaux ne sont pas éligibles au transfert externe direct.",
    sellToAuxm: "Vendre en AUXM",
    physicalRedemption: "Rachat Physique",
    recipientLabel: "ID de Compte Auxite / Email",
    enterRecipient: "Entrez l'ID de compte ou l'email",
    amount: "Montant",
    enterAmount: "Entrez le montant",
    max: "Max",
    settlementNetwork: "Réseau de Règlement",
    destinationAddress: "Adresse de Destination",
    enterDestination: "Entrez l'adresse de destination",
    destinationTag: "Tag de Destination (Requis)",
    enterDestinationTag: "Entrez le tag de destination numérique",
    xrpTagRequired: "Un tag de destination est requis pour les transferts XRP.",
    asset: "Actif",
    transferAmount: "Montant du Transfert",
    networkFee: "Frais de Réseau",
    platformFee: "Frais de Plateforme",
    settlementFee: "Frais de Règlement (Interne)",
    netSettlementAmount: "Montant Net de Règlement",
    recipient: "Destinataire",
    destination: "Destination",
    network: "Réseau",
    postTransferBalance: "Solde Disponible Après Transfert",
    settlementWindow: "Fenêtre de Règlement Estimée",
    internalNotice: "Les transferts sont définitifs une fois enregistrés dans le registre de garde Auxite.",
    externalNotice: "Les actifs transférés en externe ne seront plus détenus dans les structures de garde Auxite.",
    securityReview: "Les transferts externes peuvent faire l'objet d'un examen de sécurité.",
    verifyAddress: "Vérifiez l'adresse. Non réversible.",
    continue: "Continuer",
    back: "Retour",
    confirm: "Confirmer",
    sending: "Envoi...",
    confirmTransfer: "Confirmer le Transfert",
    confirmWithdrawal: "Confirmer le Retrait",
    withdrawalHistory: "Historique des Transferts",
    noWithdrawals: "Aucun transfert",
    pending: "En attente",
    completed: "Terminé",
    processing: "Traitement",
    failed: "Échoué",
    sent: "Envoyé",
    transferSuccess: "Transfert de garde interne réussi!",
    withdrawalSuccess: "Transfert de règlement externe initié!",
    transferFailed: "Transfert échoué",
    withdrawalFailed: "Retrait échoué",
    insufficientBalance: "Solde insuffisant",
    invalidAddress: "Adresse invalide",
    invalidRecipient: "Destinataire invalide",
    minimumAmount: "Montant minimum",
    free: "Gratuit",
    instant: "Instantané",
    comingSoon: "Bientôt",
  },
  ar: {
    withdrawAsset: "سحب الأصل",
    selectAsset: "اختر الأصل",
    assetBalance: "رصيد الأصل",
    transferType: "نوع التحويل",
    transferDetails: "تفاصيل التحويل",
    transactionSummary: "ملخص المعاملة",
    confirmation: "التأكيد",
    step: "خطوة",
    of: "/",
    availableBalance: "الرصيد المتاح",
    noAvailableAssets: "لا توجد أصول متاحة",
    fundsEncumbered: "الأموال مرتبطة بمراكز عائد هيكلي نشطة.",
    total: "الإجمالي",
    available: "متاح",
    encumbered: "مرهون",
    pendingSettlement: "تسوية معلقة",
    internalCustodyTransfer: "تحويل حفظ داخلي",
    internalDesc: "تحويلات بين حسابات حفظ Auxite، مسجلة في دفتر حفظ Auxite.",
    externalSettlementTransfer: "تحويل تسوية خارجي",
    externalDesc: "الأصول المحولة خارجياً لن تبقى ضمن هياكل حفظ Auxite.",
    metalBlockedTitle: "لا يمكن تحويل المعادن خارجياً",
    metalBlockedDesc: "الأصول المعدنية غير مؤهلة للتحويل الخارجي المباشر.",
    sellToAuxm: "بيع إلى AUXM",
    physicalRedemption: "استرداد مادي",
    recipientLabel: "معرف حساب Auxite / البريد الإلكتروني",
    enterRecipient: "أدخل معرف الحساب أو البريد الإلكتروني",
    amount: "المبلغ",
    enterAmount: "أدخل المبلغ",
    max: "الأقصى",
    settlementNetwork: "شبكة التسوية",
    destinationAddress: "عنوان الوجهة",
    enterDestination: "أدخل عنوان الوجهة",
    destinationTag: "علامة الوجهة (مطلوب)",
    enterDestinationTag: "أدخل علامة وجهة رقمية",
    xrpTagRequired: "علامة الوجهة مطلوبة لتحويلات XRP.",
    asset: "الأصل",
    transferAmount: "مبلغ التحويل",
    networkFee: "رسوم الشبكة",
    platformFee: "رسوم المنصة",
    settlementFee: "رسوم التسوية (داخلي)",
    netSettlementAmount: "صافي مبلغ التسوية",
    recipient: "المستلم",
    destination: "الوجهة",
    network: "الشبكة",
    postTransferBalance: "الرصيد المتاح بعد التحويل",
    settlementWindow: "نافذة التسوية المقدرة",
    internalNotice: "التحويلات نهائية بمجرد تسجيلها في دفتر حفظ Auxite.",
    externalNotice: "الأصول المحولة خارجياً لن تبقى ضمن هياكل حفظ Auxite.",
    securityReview: "قد تخضع التحويلات الخارجية لمراجعة أمنية وفقاً لضوابط مخاطر الحفظ.",
    verifyAddress: "تحقق من العنوان. لا يمكن التراجع.",
    continue: "متابعة",
    back: "رجوع",
    confirm: "تأكيد",
    sending: "جاري الإرسال...",
    confirmTransfer: "تأكيد التحويل",
    confirmWithdrawal: "تأكيد السحب",
    withdrawalHistory: "سجل التحويلات",
    noWithdrawals: "لا توجد تحويلات",
    pending: "معلق",
    completed: "مكتمل",
    processing: "قيد المعالجة",
    failed: "فشل",
    sent: "مرسل",
    transferSuccess: "تم تحويل الحفظ الداخلي بنجاح!",
    withdrawalSuccess: "تم بدء تحويل التسوية الخارجي!",
    transferFailed: "فشل التحويل",
    withdrawalFailed: "فشل السحب",
    insufficientBalance: "رصيد غير كافٍ",
    invalidAddress: "عنوان غير صالح",
    invalidRecipient: "مستلم غير صالح",
    minimumAmount: "الحد الأدنى للمبلغ",
    free: "مجاني",
    instant: "فوري",
    comingSoon: "قريباً",
  },
  ru: {
    withdrawAsset: "Вывод Актива",
    selectAsset: "Выберите Актив",
    assetBalance: "Баланс Актива",
    transferType: "Тип Перевода",
    transferDetails: "Детали Перевода",
    transactionSummary: "Обзор Транзакции",
    confirmation: "Подтверждение",
    step: "Шаг",
    of: "/",
    availableBalance: "Доступный Баланс",
    noAvailableAssets: "Нет доступных активов",
    fundsEncumbered: "Средства задействованы в активных позициях структурированной доходности.",
    total: "Всего",
    available: "Доступно",
    encumbered: "Обременено",
    pendingSettlement: "Ожидается Расчет",
    internalCustodyTransfer: "Внутренний Кастодиальный Перевод",
    internalDesc: "Переводы между счетами хранения Auxite, записанные в реестре хранения Auxite.",
    externalSettlementTransfer: "Внешний Расчетный Перевод",
    externalDesc: "Активы, переведенные вовне, больше не будут храниться в структурах хранения Auxite.",
    metalBlockedTitle: "Металлические активы не могут быть переведены вовне",
    metalBlockedDesc: "Металлические активы не подлежат прямому внешнему переводу.",
    sellToAuxm: "Продать в AUXM",
    physicalRedemption: "Физический Выкуп",
    recipientLabel: "ID Аккаунта Auxite / Email",
    enterRecipient: "Введите ID аккаунта или email",
    amount: "Сумма",
    enterAmount: "Введите сумму",
    max: "Макс",
    settlementNetwork: "Расчетная Сеть",
    destinationAddress: "Адрес Назначения",
    enterDestination: "Введите адрес назначения",
    destinationTag: "Тег Назначения (Обязательно)",
    enterDestinationTag: "Введите числовой тег назначения",
    xrpTagRequired: "Тег назначения обязателен для переводов XRP.",
    asset: "Актив",
    transferAmount: "Сумма Перевода",
    networkFee: "Комиссия Сети",
    platformFee: "Комиссия Платформы",
    settlementFee: "Комиссия Расчета (Внутр.)",
    netSettlementAmount: "Чистая Сумма Расчета",
    recipient: "Получатель",
    destination: "Назначение",
    network: "Сеть",
    postTransferBalance: "Доступный Баланс после Перевода",
    settlementWindow: "Расчетное Окно",
    internalNotice: "Переводы окончательны после записи в реестре хранения Auxite.",
    externalNotice: "Активы, переведенные вовне, больше не будут храниться в структурах хранения Auxite.",
    securityReview: "Внешние переводы могут подвергаться проверке безопасности.",
    verifyAddress: "Проверьте адрес. Необратимо.",
    continue: "Продолжить",
    back: "Назад",
    confirm: "Подтвердить",
    sending: "Отправка...",
    confirmTransfer: "Подтвердить Перевод",
    confirmWithdrawal: "Подтвердить Вывод",
    withdrawalHistory: "История Переводов",
    noWithdrawals: "Нет переводов",
    pending: "Ожидание",
    completed: "Завершено",
    processing: "Обработка",
    failed: "Ошибка",
    sent: "Отправлено",
    transferSuccess: "Внутренний кастодиальный перевод успешен!",
    withdrawalSuccess: "Внешний расчетный перевод инициирован!",
    transferFailed: "Перевод не удался",
    withdrawalFailed: "Вывод не удался",
    insufficientBalance: "Недостаточный баланс",
    invalidAddress: "Неверный адрес",
    invalidRecipient: "Неверный получатель",
    minimumAmount: "Минимальная сумма",
    free: "Бесплатно",
    instant: "Мгновенно",
    comingSoon: "Скоро",
  },
};

// ============================================
// ASSET & NETWORK CONFIG
// ============================================
const METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

interface AssetConfig {
  symbol: string;
  name: string;
  icon: string;
  iconImg?: string;   // PNG path for metal icons
  color: string;
  unit: string;
  balanceKey: string;
}

const ALL_ASSETS: AssetConfig[] = [
  { symbol: "AUXM", name: "Settlement Balance", icon: "◈", color: "#BFA181", unit: "", balanceKey: "auxm" },
  { symbol: "USDT", name: "Tether", icon: "₮", color: "#26A17B", unit: "", balanceKey: "usdt" },
  { symbol: "USDC", name: "USD Coin", icon: "$", color: "#2775CA", unit: "", balanceKey: "usdc" },
  { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A", unit: "", balanceKey: "btc" },
  { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA", unit: "", balanceKey: "eth" },
  { symbol: "AUXG", name: "Gold", icon: "Au", iconImg: "/auxg_icon.png", color: "#F59E0B", unit: "g", balanceKey: "auxg" },
  { symbol: "AUXS", name: "Silver", icon: "Ag", iconImg: "/auxs_icon.png", color: "#94A3B8", unit: "g", balanceKey: "auxs" },
  { symbol: "AUXPT", name: "Platinum", icon: "Pt", iconImg: "/auxpt_icon.png", color: "#CBD5E1", unit: "g", balanceKey: "auxpt" },
  { symbol: "AUXPD", name: "Palladium", icon: "Pd", iconImg: "/auxpd_icon.png", color: "#64748B", unit: "g", balanceKey: "auxpd" },
];

// Metal icon glow styles per asset
const METAL_GLOW: Record<string, string> = {
  AUXG: "drop-shadow(0 0 12px rgba(255,215,0,.18))",
  AUXS: "drop-shadow(0 0 12px rgba(180,190,210,.18))",
  AUXPT: "drop-shadow(0 0 12px rgba(180,190,210,.18))",
  AUXPD: "drop-shadow(0 0 12px rgba(180,190,210,.18))",
};

type WithdrawCrypto = "USDT" | "USDC" | "BTC" | "ETH";

const WITHDRAW_NETWORKS: Record<string, { networks: { id: string; name: string }[]; minWithdraw: number; fee: number; eta: string }> = {
  USDT: { networks: [{ id: "ethereum", name: "Ethereum" }, { id: "tron", name: "Tron" }, { id: "base", name: "Base" }], minWithdraw: 10, fee: 1, eta: "15-30" },
  USDC: { networks: [{ id: "ethereum", name: "Ethereum" }], minWithdraw: 10, fee: 1, eta: "15-30" },
  BTC: { networks: [{ id: "bitcoin", name: "Bitcoin Network" }], minWithdraw: 0.0005, fee: 0.0001, eta: "30-60" },
  ETH: { networks: [{ id: "ethereum", name: "Ethereum" }, { id: "base", name: "Base" }], minWithdraw: 0.005, fee: 0.001, eta: "15-30" },
};

// Internal-eligible assets (all)
const INTERNAL_ASSETS = ALL_ASSETS.map(a => a.symbol);
// External-eligible assets (no metals)
const EXTERNAL_ASSETS = ["AUXM", "USDT", "USDC", "BTC", "ETH"];

interface TransactionRecord {
  id: string;
  type: string;
  token: string;
  amount: string;
  amountUsd?: string;
  status: string;
  timestamp: number;
  toAddress?: string;
}

// ============================================
// COMPONENT
// ============================================
export function WithdrawTab() {
  const { lang } = useLanguage();
  const { address: ctxAddress, balances: ctxBalances, stakedAmounts: ctxStaked, allocationAmounts: ctxAllocations, refreshBalances } = useWallet();
  const t = translations[lang] || translations.en;

  // Belt & suspenders: fallback to localStorage address if WalletContext hasn't resolved
  const address = ctxAddress || (typeof window !== "undefined" ? localStorage.getItem("auxite_wallet_address") : null);

  // ── Wizard State ──
  const [step, setStep] = useState(1);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [transferType, setTransferType] = useState<"internal" | "external" | null>(null);

  // ── Form State ──
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [memo, setMemo] = useState("");

  // ── UI State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);

  // ── History ──
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Direct Balance Fetch (fallback when WalletContext fails) ──
  const [directBalances, setDirectBalances] = useState<Record<string, number> | null>(null);
  const [directStaked, setDirectStaked] = useState<Record<string, number> | null>(null);
  const [directAllocations, setDirectAllocations] = useState<Record<string, number> | null>(null);

  const fetchDirectBalances = useCallback(async () => {
    if (!address) return;
    try {
      const [balanceRes, allocRes] = await Promise.all([
        fetch(`/api/user/balance?address=${address}`),
        fetch(`/api/allocations?address=${address}`).catch(() => null),
      ]);

      const balanceData = await balanceRes.json().catch(() => null);

      if (balanceData?.balances) {
        // Parse string values to numbers (API may return "25000" instead of 25000)
        const parsed: Record<string, number> = {};
        for (const [k, v] of Object.entries(balanceData.balances)) {
          parsed[k] = parseFloat(String(v) || '0');
        }
        setDirectBalances(parsed);
      }

      if (balanceData?.stakedAmounts) {
        const parsedStaked: Record<string, number> = {};
        for (const [k, v] of Object.entries(balanceData.stakedAmounts)) {
          parsedStaked[k] = parseFloat(String(v) || '0');
        }
        setDirectStaked(parsedStaked);
      }

      // Parse allocations
      if (allocRes) {
        const allocData = await allocRes.json().catch(() => null);
        const allocTotals: Record<string, number> = { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };
        if (allocData?.allocations && Array.isArray(allocData.allocations)) {
          for (const a of allocData.allocations) {
            const metal = a.metal?.toLowerCase();
            const grams = Number(a.grams) || 0;
            if (metal && metal in allocTotals) {
              allocTotals[metal] += grams;
            }
          }
        }
        setDirectAllocations(allocTotals);
      }
    } catch (err) {
      console.error("Failed to fetch direct balances:", err);
    }
  }, [address]);

  useEffect(() => { fetchDirectBalances(); }, [fetchDirectBalances]);

  // Use WalletContext balances if they have real data, otherwise use direct fetch
  // BUG FIX: ctxBalances can be DEFAULT_BALANCES (all zeros, but truthy object)
  // when WalletContext fails — so we must check for actual values
  const hasRealCtxBalances = ctxBalances && Object.values(ctxBalances).some(v => typeof v === "number" && v > 0);
  const balances = hasRealCtxBalances ? ctxBalances : (directBalances || ctxBalances);
  const stakedAmounts = hasRealCtxBalances ? ctxStaked : (directStaked || ctxStaked);
  const allocationAmounts = hasRealCtxBalances ? ctxAllocations : (directAllocations || ctxAllocations);

  // ── Balance Helpers ──
  const getBalance = (symbol: string): number => {
    if (!balances) return 0;
    const key = ALL_ASSETS.find(a => a.symbol === symbol)?.balanceKey || symbol.toLowerCase();
    return parseFloat(String((balances as any)[key] || 0));
  };

  const getStaked = (symbol: string): number => {
    if (!stakedAmounts) return 0;
    const key = symbol.toLowerCase();
    return (stakedAmounts as any)?.[key] || 0;
  };

  const getAllocated = (symbol: string): number => {
    if (!allocationAmounts) return 0;
    const key = symbol.toLowerCase();
    return (allocationAmounts as any)?.[key] || 0;
  };

  const getAvailable = (symbol: string): number => {
    return Math.max(0, getBalance(symbol) - getStaked(symbol) - getAllocated(symbol));
  };

  const formatBal = (amount: number, symbol: string): string => {
    const asset = ALL_ASSETS.find(a => a.symbol === symbol);
    const val = formatAmount(amount, symbol);
    return asset?.unit ? `${val}${asset.unit}` : val;
  };

  // ── History ──
  const loadHistory = useCallback(async () => {
    if (!address) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/user/transactions?address=${address}&type=transfer_out,withdraw&limit=20`);
      const data = await res.json();
      if (data.success) setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [address]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Reset on step change ──
  useEffect(() => { setError(null); }, [step]);

  // ── Navigation ──
  const goBack = () => {
    if (step === 1) return;
    if (step === 4 && transferType) { setStep(3); return; }
    setStep(step - 1);
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedAsset(null);
    setTransferType(null);
    setRecipient("");
    setAmount("");
    setNetwork("");
    setDestinationAddress("");
    setMemo("");
    setError(null);
    setSuccess(null);
  };

  // ── Fee Calculation ──
  const getNetworkFee = (): number => {
    if (transferType === "internal") return 0;
    if (!selectedAsset) return 0;
    return WITHDRAW_NETWORKS[selectedAsset]?.fee || 0;
  };

  const getNetSettlement = (): number => {
    const amt = parseFloat(amount) || 0;
    return Math.max(0, amt - getNetworkFee());
  };

  const getEta = (): string => {
    if (transferType === "internal") return t.instant;
    if (!selectedAsset) return "";
    const data = WITHDRAW_NETWORKS[selectedAsset];
    return data ? `< ${data.eta} min` : "";
  };

  // ── Validation ──
  const validateStep4 = (): boolean => {
    setError(null);
    const amt = parseFloat(amount);

    if (!amt || amt <= 0) {
      setError(t.enterAmount);
      return false;
    }

    if (amt > getAvailable(selectedAsset!)) {
      setError(t.insufficientBalance);
      return false;
    }

    if (transferType === "internal") {
      if (!recipient || recipient.length < 3) {
        setError(t.invalidRecipient);
        return false;
      }
    } else {
      // External
      const config = WITHDRAW_NETWORKS[selectedAsset!];
      if (config && amt < config.minWithdraw) {
        setError(`${t.minimumAmount}: ${config.minWithdraw} ${selectedAsset}`);
        return false;
      }
      if (!destinationAddress || destinationAddress.length < 10) {
        setError(t.invalidAddress);
        return false;
      }
      if (!network) {
        setError(`${t.settlementNetwork}`);
        return false;
      }
    }

    return true;
  };

  // ── Submit Handlers ──
  const handleContinueToConfirm = () => {
    if (!validateStep4()) return;
    setStep(5);
  };

  const handleConfirm = () => {
    setShow2FA(true);
  };

  const handle2FAVerified = (verifiedCode?: string) => {
    setShow2FA(false);
    if (transferType === "internal") {
      executeInternalTransfer(verifiedCode);
    } else {
      executeExternalWithdrawal(verifiedCode);
    }
  };

  const executeInternalTransfer = async (verifiedCode?: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAddress: address,
          toAddress: recipient,
          token: selectedAsset,
          amount: parseFloat(amount),
          twoFactorCode: verifiedCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.transferFailed);

      setSuccess(t.transferSuccess);
      await Promise.all([refreshBalances(), fetchDirectBalances(), loadHistory()]);
      setTimeout(() => resetWizard(), 4000);
    } catch (err: any) {
      setError(err.message || t.transferFailed);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const executeExternalWithdrawal = async (verifiedCode?: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin: selectedAsset,
          amount: parseFloat(amount),
          withdrawAddress: destinationAddress,
          memo: memo || undefined,
          twoFactorCode: verifiedCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.withdrawalFailed);

      setSuccess(t.withdrawalSuccess);
      await Promise.all([refreshBalances(), fetchDirectBalances(), loadHistory()]);
      setTimeout(() => resetWizard(), 4000);
    } catch (err: any) {
      setError(err.message || t.withdrawalFailed);
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  // ── Date & Status Helpers ──
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-[#2F6F62] bg-[#2F6F62]/10";
      case "pending": return "text-[#BFA181] bg-[#BFA181]/10";
      case "failed": return "text-red-500 bg-red-500/10";
      default: return "text-slate-500 bg-slate-500/10";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return t.completed;
      case "pending": return t.pending;
      case "processing": return t.processing;
      case "failed": return t.failed;
      default: return status;
    }
  };

  // ══════════════════════════════════════
  // 2FA Gate
  // ══════════════════════════════════════
  if (show2FA) {
    return (
      <TwoFactorGate
        walletAddress={address || ""}
        isOpen={true}
        onClose={() => setShow2FA(false)}
        onVerified={handle2FAVerified}
        lang={lang as any}
      />
    );
  }

  // ══════════════════════════════════════
  // Success State
  // ══════════════════════════════════════
  if (success) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#2F6F62]/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-[#2F6F62] mb-2">{success}</p>
        <p className="text-sm text-slate-500">{transferType === "internal" ? t.internalNotice : t.externalNotice}</p>
      </div>
    );
  }

  // ══════════════════════════════════════
  // STEP PROGRESS BAR
  // ══════════════════════════════════════
  const stepLabels = [t.selectAsset, t.assetBalance, t.transferType, t.transferDetails, t.transactionSummary];
  const totalSteps = 5;

  const renderStepBar = () => (
    <div className="mb-6">
      {/* Step indicator text */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
          {t.step} {step}{t.of}{totalSteps}
        </span>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {stepLabels[step - 1] || ""}
        </span>
      </div>
      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < step ? "bg-[#BFA181]" : "bg-stone-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );

  // ══════════════════════════════════════
  // STEP 1: SELECT ASSET
  // ══════════════════════════════════════
  const renderStep1 = () => (
    <div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.withdrawAsset}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{t.selectAsset}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {ALL_ASSETS.map((asset) => {
          const available = getAvailable(asset.symbol);
          const total = getBalance(asset.symbol);
          const hasBalance = total > 0;

          return (
            <button
              key={asset.symbol}
              onClick={() => { setSelectedAsset(asset.symbol); setStep(2); }}
              className={`p-4 rounded-xl border-2 text-left transition-all group ${
                hasBalance
                  ? "border-stone-200 dark:border-slate-700 hover:border-[#BFA181] hover:bg-[#BFA181]/5"
                  : "border-stone-100 dark:border-slate-800 opacity-50"
              }`}
            >
              {asset.iconImg ? (
                <img
                  src={asset.iconImg}
                  alt={asset.symbol}
                  className="w-10 h-10 rounded-full object-cover mb-3"
                  style={{ filter: `drop-shadow(0 6px 18px rgba(0,0,0,.35)) ${METAL_GLOW[asset.symbol] || ""}` }}
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-3"
                  style={{ backgroundColor: asset.color }}
                >
                  {asset.icon}
                </div>
              )}
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{asset.symbol}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{asset.name}</p>
              <p className={`text-xs font-medium mt-1 ${hasBalance ? "text-[#2F6F62]" : "text-slate-400"}`}>
                {hasBalance ? formatBal(available, asset.symbol) : "0"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ══════════════════════════════════════
  // STEP 2: BALANCE PANEL
  // ══════════════════════════════════════
  const renderStep2 = () => {
    if (!selectedAsset) return null;

    const total = getBalance(selectedAsset);
    const staked = getStaked(selectedAsset);
    const allocated = getAllocated(selectedAsset);
    const available = getAvailable(selectedAsset);
    const pending = 0; // Future: settlement pending tracking
    const asset = ALL_ASSETS.find(a => a.symbol === selectedAsset)!;

    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.assetBalance}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{selectedAsset} — {asset.name}</p>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          {/* Asset Header */}
          <div className="flex items-center gap-4 mb-6">
            {asset.iconImg ? (
              <img
                src={asset.iconImg}
                alt={asset.symbol}
                className="w-12 h-12 rounded-full object-cover"
                style={{ filter: `drop-shadow(0 6px 18px rgba(0,0,0,.35)) ${METAL_GLOW[asset.symbol] || ""}` }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: asset.color }}
              >
                {asset.icon}
              </div>
            )}
            <div>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{formatBal(total, selectedAsset)}</p>
              <p className="text-sm text-slate-500">{t.total}</p>
            </div>
          </div>

          {/* Balance Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-[#2F6F62]/5 border border-[#2F6F62]/20">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.available}</p>
              <p className="text-sm font-bold text-[#2F6F62]">{formatBal(available, selectedAsset)}</p>
            </div>
            <div className="p-3 rounded-lg bg-[#BFA181]/5 border border-[#BFA181]/20">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.encumbered}</p>
              <p className="text-sm font-semibold text-[#BFA181]">
                {(staked + allocated) > 0 ? formatBal(staked + allocated, selectedAsset) : "—"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.pendingSettlement}</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {pending > 0 ? formatBal(pending, selectedAsset) : "—"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-stone-50 dark:bg-slate-800 border border-stone-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.total}</p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatBal(total, selectedAsset)}</p>
            </div>
          </div>

          {/* Zero available warning */}
          {available <= 0 && (
            <div className="mt-4 p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-[#BFA181] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-[#BFA181]">{t.noAvailableAssets}</p>
                  <p className="text-xs text-[#BFA181]/80 mt-0.5">{t.fundsEncumbered}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
            {t.back}
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={available <= 0}
            className="flex-1 py-3 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {t.continue}
          </button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════
  // STEP 3: TRANSFER TYPE
  // ══════════════════════════════════════
  const renderStep3 = () => {
    if (!selectedAsset) return null;
    const isMetal = METALS.includes(selectedAsset);
    const canExternal = EXTERNAL_ASSETS.includes(selectedAsset);

    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.transferType}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{selectedAsset}</p>

        <div className="space-y-3 mb-6">
          {/* Internal Custody Transfer — always available */}
          <button
            onClick={() => { setTransferType("internal"); setStep(4); }}
            className="w-full p-5 rounded-xl border-2 border-stone-200 dark:border-slate-700 hover:border-[#2F6F62] hover:bg-[#2F6F62]/5 text-left transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[#2F6F62]/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.internalCustodyTransfer}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.internalDesc}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F6F62]/10 text-[#2F6F62] font-medium">{t.free}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2F6F62]/10 text-[#2F6F62] font-medium">{t.instant}</span>
                </div>
              </div>
            </div>
          </button>

          {/* External Settlement Transfer */}
          {canExternal ? (
            <button
              onClick={() => {
                setTransferType("external");
                // Auto-select first network
                const nets = WITHDRAW_NETWORKS[selectedAsset]?.networks;
                if (nets && nets.length > 0) setNetwork(nets[0].id);
                setStep(4);
              }}
              className="w-full p-5 rounded-xl border-2 border-stone-200 dark:border-slate-700 hover:border-[#BFA181] hover:bg-[#BFA181]/5 text-left transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#BFA181]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.externalSettlementTransfer}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.externalDesc}</p>
                </div>
              </div>
            </button>
          ) : isMetal ? (
            // Metal blocked state
            <div className="w-full p-5 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t.metalBlockedTitle}</p>
                  <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">{t.metalBlockedDesc}</p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#BFA181] text-white hover:bg-[#BFA181]/90 transition-colors">
                      {t.sellToAuxm}
                    </button>
                    <button className="px-3 py-1.5 text-xs font-medium rounded-lg border border-stone-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
                      {t.physicalRedemption}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Back */}
        <button onClick={goBack} className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
          {t.back}
        </button>
      </div>
    );
  };

  // ══════════════════════════════════════
  // STEP 4: FORM
  // ══════════════════════════════════════
  const renderStep4 = () => {
    if (!selectedAsset || !transferType) return null;
    const available = getAvailable(selectedAsset);
    const asset = ALL_ASSETS.find(a => a.symbol === selectedAsset)!;

    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">
          {transferType === "internal" ? t.internalCustodyTransfer : t.externalSettlementTransfer}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{selectedAsset} — {asset.name}</p>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form — 2 cols */}
            <div className="lg:col-span-2 space-y-5">
              {transferType === "internal" ? (
                <>
                  {/* Recipient */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t.recipientLabel}</h3>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder={t.enterRecipient}
                      className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181] font-mono text-sm"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.amount}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{t.available}: {formatBal(available, selectedAsset)}</span>
                        <button
                          onClick={() => setAmount(available.toString())}
                          className="text-xs text-[#BFA181] hover:text-[#BFA181]/80 font-medium"
                        >
                          {t.max}
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t.enterAmount}
                      className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181]"
                    />
                  </div>

                  {/* Internal notice */}
                  <div className="p-3 rounded-lg bg-[#2F6F62]/5 border border-[#2F6F62]/20">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs text-[#2F6F62]">{t.internalNotice}</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Settlement Network */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t.settlementNetwork}</h3>
                    <div className="flex gap-2 flex-wrap">
                      {(WITHDRAW_NETWORKS[selectedAsset]?.networks || []).map((net) => (
                        <button
                          key={net.id}
                          onClick={() => setNetwork(net.id)}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            network === net.id
                              ? "border-[#BFA181] bg-[#BFA181]/10 text-[#BFA181]"
                              : "border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-[#BFA181]/50"
                          }`}
                        >
                          {net.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Destination Address */}
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">{t.destinationAddress}</h3>
                    <input
                      type="text"
                      value={destinationAddress}
                      onChange={(e) => setDestinationAddress(e.target.value)}
                      placeholder={
                        selectedAsset === "BTC" ? "bc1q..." :
                        "0x..."
                      }
                      className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181] font-mono text-sm"
                    />
                  </div>

                  {/* Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.amount}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{t.available}: {formatBal(available, selectedAsset)}</span>
                        <button
                          onClick={() => setAmount(available.toString())}
                          className="text-xs text-[#BFA181] hover:text-[#BFA181]/80 font-medium"
                        >
                          {t.max}
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#BFA181]"
                    />
                  </div>

                  {/* Custody exit warning */}
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-xs text-red-600 dark:text-red-400">{t.externalNotice}</p>
                    </div>
                  </div>

                  {/* Verify address */}
                  <div className="p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30">
                    <p className="text-xs text-[#BFA181]">{t.verifyAddress}</p>
                  </div>
                </>
              )}
            </div>

            {/* Fee Preview — right col */}
            <div>
              <FeePreviewPanel crypto={selectedAsset} amount={parseFloat(amount) || 0} isInternal={transferType === "internal"} />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={goBack} className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
            {t.back}
          </button>
          <button
            onClick={handleContinueToConfirm}
            className="flex-1 py-3 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {t.continue}
          </button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════
  // STEP 5: TRANSACTION SUMMARY + CONFIRM
  // ══════════════════════════════════════
  const renderStep5 = () => {
    if (!selectedAsset || !transferType) return null;
    const amt = parseFloat(amount) || 0;
    const fee = getNetworkFee();
    const netSettlement = getNetSettlement();
    const postBalance = getAvailable(selectedAsset) - amt;
    const asset = ALL_ASSETS.find(a => a.symbol === selectedAsset)!;

    return (
      <div>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{t.transactionSummary}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          {transferType === "internal" ? t.internalCustodyTransfer : t.externalSettlementTransfer}
        </p>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mb-6">
          {/* Summary rows */}
          <div className="space-y-3">
            {/* Asset */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t.asset}</span>
              <div className="flex items-center gap-2">
                {asset.iconImg ? (
                  <img src={asset.iconImg} alt={asset.symbol} className="w-6 h-6 rounded-full object-cover"
                    style={{ filter: `drop-shadow(0 4px 10px rgba(0,0,0,.3)) ${METAL_GLOW[asset.symbol] || ""}` }} />
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: asset.color }}>{asset.icon}</div>
                )}
                <span className="text-sm font-semibold text-slate-800 dark:text-white">{selectedAsset}</span>
              </div>
            </div>

            {/* Transfer Amount */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t.transferAmount}</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-white">{formatBal(amt, selectedAsset)}</span>
            </div>

            {/* Fees */}
            {transferType === "internal" ? (
              <>
                <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.settlementFee}</span>
                  <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.platformFee}</span>
                  <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.networkFee}</span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{fee} {selectedAsset}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">{t.platformFee}</span>
                  <span className="text-sm font-medium text-[#2F6F62]">{t.free}</span>
                </div>
              </>
            )}

            {/* Net Settlement */}
            <div className="flex items-center justify-between py-3 border-t-2 border-stone-200 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{t.netSettlementAmount}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">{formatBal(netSettlement, selectedAsset)}</span>
            </div>

            {/* Recipient / Destination */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {transferType === "internal" ? t.recipient : t.destination}
              </span>
              <span className="text-sm font-mono text-slate-800 dark:text-white truncate max-w-[200px]">
                {transferType === "internal" ? recipient : destinationAddress}
              </span>
            </div>

            {/* Network (external only) */}
            {transferType === "external" && (
              <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">{t.settlementNetwork}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {WITHDRAW_NETWORKS[selectedAsset]?.networks.find(n => n.id === network)?.name || network}
                </span>
              </div>
            )}

            {/* Post-Transfer Balance */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t.postTransferBalance}</span>
              <span className="text-sm font-semibold text-[#2F6F62]">{formatBal(Math.max(0, postBalance), selectedAsset)}</span>
            </div>

            {/* Settlement Window */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100 dark:border-slate-800">
              <span className="text-sm text-slate-500 dark:text-slate-400">{t.settlementWindow}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{getEta()}</span>
            </div>
          </div>

          {/* Notice */}
          <div className={`mt-4 p-3 rounded-lg ${
            transferType === "internal"
              ? "bg-[#2F6F62]/5 border border-[#2F6F62]/20"
              : "bg-red-500/5 border border-red-500/20"
          }`}>
            <div className="flex items-start gap-2">
              <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${transferType === "internal" ? "text-[#2F6F62]" : "text-red-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className={`text-xs ${transferType === "internal" ? "text-[#2F6F62]" : "text-red-600 dark:text-red-400"}`}>
                {transferType === "internal" ? t.internalNotice : t.externalNotice}
              </p>
            </div>
          </div>

          {/* Security review notice (external only) */}
          {transferType === "external" && (
            <div className="mt-3 p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/30">
              <p className="text-xs text-[#BFA181]">{t.securityReview}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={() => setStep(4)} className="px-6 py-3 rounded-xl border border-stone-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors">
            {t.back}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-[#BFA181] hover:bg-[#BFA181]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {t.sending}</>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {transferType === "internal" ? t.confirmTransfer : t.confirmWithdrawal}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════
  // TRANSFER HISTORY
  // ══════════════════════════════════════
  const renderHistory = () => (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-6 mt-6">
      <h3 className="font-semibold text-slate-800 dark:text-white mb-4">{t.withdrawalHistory}</h3>

      {historyLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
          </svg>
          <p className="text-slate-500 dark:text-slate-400">{t.noWithdrawals}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center gap-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-800/50 border border-stone-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500/10">
                <svg className="w-5 h-5 text-red-500 rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{t.sent} {tx.token}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                    {getStatusLabel(tx.status)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{formatDate(tx.timestamp)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-500">-{tx.amount} {tx.token}</p>
                {tx.amountUsd && <p className="text-xs text-slate-500">${parseFloat(tx.amountUsd).toFixed(2)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════
  return (
    <div>
      {/* Step progress bar */}
      {renderStepBar()}

      {/* Wizard Steps */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}

      {/* History (always visible on step 1) */}
      {step === 1 && renderHistory()}
    </div>
  );
}

export default WithdrawTab;
