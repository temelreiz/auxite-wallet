"use client";

/**
 * Allocation Wizard Component
 * 3-Step institutional capital allocation flow
 *
 * Step 1: Select Asset - Choose which metal to allocate
 * Step 2: Define Allocation - Enter amount and see value breakdown
 * Step 3: Review & Confirm - Trust checklist and final confirmation
 */

import { useState, useEffect } from "react";
import { Shield, Building, Lock, MapPin, Check, ChevronRight, ArrowLeft, FileText, Award } from "lucide-react";
import { VaultVisibility, TrustBadges, AllocationMessage } from "./ui/TrustSignature";
import { useWallet } from "@/components/WalletContext";
import { useToast } from "@/components/ui/Toast";
import { useLanguage } from "@/components/LanguageContext";

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const translations = {
  tr: {
    // Header
    capitalAllocation: "Sermaye Tahsisi",
    step: "Adım",
    of: "/",

    // Step 1
    selectAsset: "Varlık Seçin",
    selectAssetDesc: "Sermayenizi tahsis etmek istediğiniz metali seçin.",

    // Asset Cards
    goldTitle: "Altın",
    goldDesc: "En likit ve tarihsel olarak en güvenli değer deposu. Kurumsal portföylerin temel yapı taşı.",
    silverTitle: "Gümüş",
    silverDesc: "Endüstriyel talep ve parasal değer birleşimi. Stratejik çeşitlendirme için ideal.",
    platinumTitle: "Platin",
    platinumDesc: "Nadir endüstriyel metal. Otomotiv ve yeşil enerji sektörlerinde artan talep.",
    palladiumTitle: "Paladyum",
    palladiumDesc: "En nadir kıymetli metal. Katalizör ve elektronik sektörlerinde kritik öneme sahip.",

    // Step 2
    defineAllocation: "Tahsisi Tanımlayın",
    defineAllocationDesc: "Tahsis etmek istediğiniz miktarı girin.",
    amount: "Miktar",
    grams: "gram",
    allocationValue: "Tahsis Değeri",
    referencePrice: "Referans Fiyat",
    executionSpread: "İşlem Farkı",
    finalPrice: "Nihai Tahsis Fiyatı",
    totalValue: "Toplam Değer",
    availableBalance: "Kullanılabilir Bakiye",
    insufficientBalance: "Yetersiz bakiye",
    minimumAllocation: "Minimum Tahsis",

    // Step 3
    reviewConfirm: "İncele & Onayla",
    reviewConfirmDesc: "Tahsis detaylarınızı doğrulayın.",
    allocationSummary: "Tahsis Özeti",
    asset: "Varlık",
    quantity: "Miktar",
    value: "Değer",
    vaultDetails: "Kasa Detayları",
    trustChecklist: "Güven Kontrol Listesi",
    checkFullyAllocated: "Fiziksel metal adınıza tam tahsisli",
    checkIndependentCustody: "Bağımsız saklama yapısında korunuyor",
    checkBankruptcyRemote: "Auxite iflas durumundan korumalı",
    checkSegregated: "Havuzlanmış varlıklardan ayrılmış",
    checkAudited: "Üçüncü taraf denetimli rezervler",
    checkInsured: "Fiziksel varlık sigortası",
    checkBlockchainAnchored: "Blockchain'de kayıtlı mülkiyet sertifikası",
    confirmAllocation: "Tahsisi Onayla",
    viewCertificate: "Sertifikayı Görüntüle",
    downloadCertificate: "Sertifikayı İndir",

    // Buttons
    continue: "Devam",
    back: "Geri",
    cancel: "İptal",

    // Status
    processing: "İşleniyor...",
    success: "Tahsis Tamamlandı!",
    error: "Bir hata oluştu",

    // Ownership
    ownershipDisplay: "Sahiplik Gösterimi",
    youWillOwn: "Sahip olacağınız:",
    gramsOf: "gram",
    inYourName: "Adınıza kayıtlı fiziksel metal",

    // Certificate
    certificateNumberLabel: "Sertifika Numarası",

    // Private Client
    privateClientThreshold: "100.000 USD üzeri tahsisler için Özel Müşteri Masası hizmeti sunulmaktadır.",
    contactPrivateDesk: "Özel Müşteri Masası ile İletişime Geçin",
  },
  en: {
    // Header
    capitalAllocation: "Capital Allocation",
    step: "Step",
    of: "of",

    // Step 1
    selectAsset: "Select Asset",
    selectAssetDesc: "Choose the metal you wish to allocate capital into.",

    // Asset Cards
    goldTitle: "Gold",
    goldDesc: "The most liquid and historically secure store of value. Cornerstone of institutional portfolios.",
    silverTitle: "Silver",
    silverDesc: "Industrial demand meets monetary value. Ideal for strategic diversification.",
    platinumTitle: "Platinum",
    platinumDesc: "Rare industrial metal. Growing demand in automotive and green energy sectors.",
    palladiumTitle: "Palladium",
    palladiumDesc: "The rarest precious metal. Critical in catalyst and electronics industries.",

    // Step 2
    defineAllocation: "Define Allocation",
    defineAllocationDesc: "Enter the amount you wish to allocate.",
    amount: "Amount",
    grams: "grams",
    allocationValue: "Allocation Value",
    referencePrice: "Reference Price",
    executionSpread: "Execution Spread",
    finalPrice: "Final Allocation Price",
    totalValue: "Total Value",
    availableBalance: "Available Balance",
    insufficientBalance: "Insufficient balance",
    minimumAllocation: "Minimum Allocation",

    // Step 3
    reviewConfirm: "Review & Confirm",
    reviewConfirmDesc: "Verify your allocation details.",
    allocationSummary: "Allocation Summary",
    asset: "Asset",
    quantity: "Quantity",
    value: "Value",
    vaultDetails: "Vault Details",
    trustChecklist: "Trust Checklist",
    checkFullyAllocated: "Physical metal fully allocated in your name",
    checkIndependentCustody: "Held under independent custody structure",
    checkBankruptcyRemote: "Bankruptcy remote from Auxite operations",
    checkSegregated: "Segregated from pooled assets",
    checkAudited: "Third-party audited reserves",
    checkInsured: "Physical asset insurance coverage",
    checkBlockchainAnchored: "Blockchain-anchored ownership certificate",
    confirmAllocation: "Confirm Allocation",
    viewCertificate: "View Certificate",
    downloadCertificate: "Download Certificate",

    // Buttons
    continue: "Continue",
    back: "Back",
    cancel: "Cancel",

    // Status
    processing: "Processing...",
    success: "Allocation Complete!",
    error: "An error occurred",

    // Ownership
    ownershipDisplay: "Ownership Display",
    youWillOwn: "You will own:",
    gramsOf: "grams of",
    inYourName: "Physical metal registered in your name",

    // Certificate
    certificateNumberLabel: "Certificate Number",

    // Private Client
    privateClientThreshold: "For allocations above $100,000, Private Client Desk services are available.",
    contactPrivateDesk: "Contact Private Client Desk",
  },
  de: {
    capitalAllocation: "Kapitalallokation",
    step: "Schritt",
    of: "von",
    selectAsset: "Vermögenswert Auswählen",
    selectAssetDesc: "Wählen Sie das Metall, in das Sie Kapital allokieren möchten.",
    goldTitle: "Gold",
    goldDesc: "Der liquideste und historisch sicherste Wertaufbewahrungsmittel. Eckpfeiler institutioneller Portfolios.",
    silverTitle: "Silber",
    silverDesc: "Industrielle Nachfrage trifft auf monetären Wert. Ideal für strategische Diversifikation.",
    platinumTitle: "Platin",
    platinumDesc: "Seltenes Industriemetall. Wachsende Nachfrage in Automobil- und grünen Energiesektoren.",
    palladiumTitle: "Palladium",
    palladiumDesc: "Das seltenste Edelmetall. Kritisch in Katalysator- und Elektronikindustrien.",
    defineAllocation: "Allokation Definieren",
    defineAllocationDesc: "Geben Sie den Betrag ein, den Sie allokieren möchten.",
    amount: "Betrag",
    grams: "Gramm",
    allocationValue: "Allokationswert",
    referencePrice: "Referenzpreis",
    executionSpread: "Ausführungsspread",
    finalPrice: "Endgültiger Allokationspreis",
    totalValue: "Gesamtwert",
    availableBalance: "Verfügbares Guthaben",
    insufficientBalance: "Unzureichendes Guthaben",
    minimumAllocation: "Mindestallokation",
    reviewConfirm: "Überprüfen & Bestätigen",
    reviewConfirmDesc: "Überprüfen Sie Ihre Allokationsdetails.",
    allocationSummary: "Allokationsübersicht",
    asset: "Vermögenswert",
    quantity: "Menge",
    value: "Wert",
    vaultDetails: "Tresordetails",
    trustChecklist: "Vertrauens-Checkliste",
    checkFullyAllocated: "Physisches Metall vollständig auf Ihren Namen allokiert",
    checkIndependentCustody: "Unter unabhängiger Verwahrungsstruktur gehalten",
    checkBankruptcyRemote: "Insolvenzfern von Auxite-Operationen",
    checkSegregated: "Von gepoolten Vermögenswerten getrennt",
    checkAudited: "Drittanbieter-geprüfte Reserven",
    checkInsured: "Physische Vermögensversicherung",
    checkBlockchainAnchored: "Blockchain-verankertes Eigentumszertifikat",
    confirmAllocation: "Allokation Bestätigen",
    viewCertificate: "Zertifikat Anzeigen",
    downloadCertificate: "Zertifikat Herunterladen",
    continue: "Weiter",
    back: "Zurück",
    cancel: "Abbrechen",
    processing: "Verarbeitung...",
    success: "Allokation Abgeschlossen!",
    error: "Ein Fehler ist aufgetreten",
    ownershipDisplay: "Eigentumsanzeige",
    youWillOwn: "Sie werden besitzen:",
    gramsOf: "Gramm",
    inYourName: "Physisches Metall auf Ihren Namen registriert",
    certificateNumberLabel: "Zertifikatsnummer",
    privateClientThreshold: "Für Allokationen über 100.000 USD stehen Private Client Desk-Dienste zur Verfügung.",
    contactPrivateDesk: "Private Client Desk Kontaktieren",
  },
  fr: {
    capitalAllocation: "Allocation de Capital",
    step: "Étape",
    of: "sur",
    selectAsset: "Sélectionner l'Actif",
    selectAssetDesc: "Choisissez le métal dans lequel vous souhaitez allouer du capital.",
    goldTitle: "Or",
    goldDesc: "La réserve de valeur la plus liquide et historiquement la plus sûre. Pierre angulaire des portefeuilles institutionnels.",
    silverTitle: "Argent",
    silverDesc: "La demande industrielle rencontre la valeur monétaire. Idéal pour la diversification stratégique.",
    platinumTitle: "Platine",
    platinumDesc: "Métal industriel rare. Demande croissante dans les secteurs automobile et énergies vertes.",
    palladiumTitle: "Palladium",
    palladiumDesc: "Le métal précieux le plus rare. Critique dans les industries des catalyseurs et de l'électronique.",
    defineAllocation: "Définir l'Allocation",
    defineAllocationDesc: "Entrez le montant que vous souhaitez allouer.",
    amount: "Montant",
    grams: "grammes",
    allocationValue: "Valeur d'Allocation",
    referencePrice: "Prix de Référence",
    executionSpread: "Spread d'Exécution",
    finalPrice: "Prix Final d'Allocation",
    totalValue: "Valeur Totale",
    availableBalance: "Solde Disponible",
    insufficientBalance: "Solde insuffisant",
    minimumAllocation: "Allocation Minimum",
    reviewConfirm: "Vérifier & Confirmer",
    reviewConfirmDesc: "Vérifiez les détails de votre allocation.",
    allocationSummary: "Résumé de l'Allocation",
    asset: "Actif",
    quantity: "Quantité",
    value: "Valeur",
    vaultDetails: "Détails du Coffre",
    trustChecklist: "Liste de Contrôle de Confiance",
    checkFullyAllocated: "Métal physique entièrement alloué à votre nom",
    checkIndependentCustody: "Détenu sous structure de garde indépendante",
    checkBankruptcyRemote: "Protection faillite d'Auxite",
    checkSegregated: "Séparé des actifs mutualisés",
    checkAudited: "Réserves auditées par tiers",
    checkInsured: "Couverture d'assurance des actifs physiques",
    checkBlockchainAnchored: "Certificat de propriété ancré blockchain",
    confirmAllocation: "Confirmer l'Allocation",
    viewCertificate: "Voir le Certificat",
    downloadCertificate: "Télécharger le Certificat",
    continue: "Continuer",
    back: "Retour",
    cancel: "Annuler",
    processing: "Traitement...",
    success: "Allocation Terminée!",
    error: "Une erreur s'est produite",
    ownershipDisplay: "Affichage de Propriété",
    youWillOwn: "Vous posséderez:",
    gramsOf: "grammes de",
    inYourName: "Métal physique enregistré à votre nom",
    certificateNumberLabel: "Numéro de Certificat",
    privateClientThreshold: "Pour les allocations supérieures à 100 000 USD, les services du Bureau Client Privé sont disponibles.",
    contactPrivateDesk: "Contacter le Bureau Client Privé",
  },
  ar: {
    capitalAllocation: "تخصيص رأس المال",
    step: "خطوة",
    of: "من",
    selectAsset: "اختر الأصل",
    selectAssetDesc: "اختر المعدن الذي ترغب في تخصيص رأس المال فيه.",
    goldTitle: "ذهب",
    goldDesc: "أكثر مخزون قيمة سيولة وأماناً تاريخياً. حجر الزاوية في المحافظ المؤسسية.",
    silverTitle: "فضة",
    silverDesc: "الطلب الصناعي يلتقي بالقيمة النقدية. مثالي للتنويع الاستراتيجي.",
    platinumTitle: "بلاتين",
    platinumDesc: "معدن صناعي نادر. طلب متزايد في قطاعي السيارات والطاقة الخضراء.",
    palladiumTitle: "بالاديوم",
    palladiumDesc: "أندر المعادن الثمينة. حاسم في صناعات المحفزات والإلكترونيات.",
    defineAllocation: "تحديد التخصيص",
    defineAllocationDesc: "أدخل المبلغ الذي ترغب في تخصيصه.",
    amount: "المبلغ",
    grams: "غرام",
    allocationValue: "قيمة التخصيص",
    referencePrice: "السعر المرجعي",
    executionSpread: "فارق التنفيذ",
    finalPrice: "سعر التخصيص النهائي",
    totalValue: "القيمة الإجمالية",
    availableBalance: "الرصيد المتاح",
    insufficientBalance: "رصيد غير كافٍ",
    minimumAllocation: "الحد الأدنى للتخصيص",
    reviewConfirm: "مراجعة وتأكيد",
    reviewConfirmDesc: "تحقق من تفاصيل التخصيص الخاصة بك.",
    allocationSummary: "ملخص التخصيص",
    asset: "الأصل",
    quantity: "الكمية",
    value: "القيمة",
    vaultDetails: "تفاصيل الخزنة",
    trustChecklist: "قائمة التحقق من الثقة",
    checkFullyAllocated: "المعدن الفعلي مخصص بالكامل باسمك",
    checkIndependentCustody: "محفوظ تحت هيكل حفظ مستقل",
    checkBankruptcyRemote: "محمي من إفلاس Auxite",
    checkSegregated: "منفصل عن الأصول المجمعة",
    checkAudited: "احتياطيات مدققة من طرف ثالث",
    checkInsured: "تغطية تأمين الأصول المادية",
    checkBlockchainAnchored: "شهادة ملكية مرتبطة بالبلوكتشين",
    confirmAllocation: "تأكيد التخصيص",
    viewCertificate: "عرض الشهادة",
    downloadCertificate: "تحميل الشهادة",
    continue: "متابعة",
    back: "رجوع",
    cancel: "إلغاء",
    processing: "جاري المعالجة...",
    success: "اكتمل التخصيص!",
    error: "حدث خطأ",
    ownershipDisplay: "عرض الملكية",
    youWillOwn: "ستمتلك:",
    gramsOf: "غرام من",
    inYourName: "معدن فعلي مسجل باسمك",
    certificateNumberLabel: "رقم الشهادة",
    privateClientThreshold: "للتخصيصات التي تزيد عن 100,000 دولار، تتوفر خدمات مكتب العملاء الخاصين.",
    contactPrivateDesk: "اتصل بمكتب العملاء الخاصين",
  },
  ru: {
    capitalAllocation: "Распределение Капитала",
    step: "Шаг",
    of: "из",
    selectAsset: "Выберите Актив",
    selectAssetDesc: "Выберите металл, в который хотите распределить капитал.",
    goldTitle: "Золото",
    goldDesc: "Самое ликвидное и исторически надежное средство сохранения стоимости. Краеугольный камень институциональных портфелей.",
    silverTitle: "Серебро",
    silverDesc: "Промышленный спрос встречается с денежной стоимостью. Идеально для стратегической диверсификации.",
    platinumTitle: "Платина",
    platinumDesc: "Редкий промышленный металл. Растущий спрос в автомобильной отрасли и секторе зеленой энергетики.",
    palladiumTitle: "Палладий",
    palladiumDesc: "Самый редкий драгоценный металл. Критически важен в производстве катализаторов и электроники.",
    defineAllocation: "Определите Распределение",
    defineAllocationDesc: "Введите сумму, которую хотите распределить.",
    amount: "Сумма",
    grams: "грамм",
    allocationValue: "Стоимость Распределения",
    referencePrice: "Справочная Цена",
    executionSpread: "Спред Исполнения",
    finalPrice: "Итоговая Цена Распределения",
    totalValue: "Общая Стоимость",
    availableBalance: "Доступный Баланс",
    insufficientBalance: "Недостаточный баланс",
    minimumAllocation: "Минимальное Распределение",
    reviewConfirm: "Проверить и Подтвердить",
    reviewConfirmDesc: "Проверьте детали вашего распределения.",
    allocationSummary: "Сводка Распределения",
    asset: "Актив",
    quantity: "Количество",
    value: "Стоимость",
    vaultDetails: "Детали Хранилища",
    trustChecklist: "Контрольный Список Доверия",
    checkFullyAllocated: "Физический металл полностью распределен на ваше имя",
    checkIndependentCustody: "Хранится под независимой структурой хранения",
    checkBankruptcyRemote: "Защита от банкротства Auxite",
    checkSegregated: "Отделен от объединенных активов",
    checkAudited: "Резервы проверены третьей стороной",
    checkInsured: "Страхование физических активов",
    checkBlockchainAnchored: "Сертификат собственности в блокчейне",
    confirmAllocation: "Подтвердить Распределение",
    viewCertificate: "Просмотр Сертификата",
    downloadCertificate: "Скачать Сертификат",
    continue: "Продолжить",
    back: "Назад",
    cancel: "Отмена",
    processing: "Обработка...",
    success: "Распределение Завершено!",
    error: "Произошла ошибка",
    ownershipDisplay: "Отображение Собственности",
    youWillOwn: "Вы будете владеть:",
    gramsOf: "грамм",
    inYourName: "Физический металл зарегистрирован на ваше имя",
    certificateNumberLabel: "Номер Сертификата",
    privateClientThreshold: "Для распределений свыше $100,000 доступны услуги Частного Клиентского Отдела.",
    contactPrivateDesk: "Связаться с Частным Клиентским Отделом",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface Asset {
  id: string;
  symbol: string;
  name: string;
  color: string;
  gradient: string;
  icon: string;
}

const assets: Asset[] = [
  {
    id: "gold",
    symbol: "XAUt",
    name: "Gold",
    color: "#FFD700",
    gradient: "from-[#BFA181]/20 to-yellow-600/20",
    icon: "🥇",
  },
  {
    id: "silver",
    symbol: "XAGt",
    name: "Silver",
    color: "#C0C0C0",
    gradient: "from-slate-300/20 to-slate-500/20",
    icon: "🥈",
  },
  {
    id: "platinum",
    symbol: "XPTt",
    name: "Platinum",
    color: "#E5E4E2",
    gradient: "from-slate-200/20 to-slate-400/20",
    icon: "💎",
  },
  {
    id: "palladium",
    symbol: "XPDt",
    name: "Palladium",
    color: "#CED0DD",
    gradient: "from-indigo-200/20 to-indigo-400/20",
    icon: "🔷",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface AllocationWizardProps {
  onClose: () => void;
  onComplete?: (data: AllocationResult) => void;
  prices: Record<string, number>;
  initialAsset?: string;
}

interface AllocationResult {
  asset: string;
  symbol: string;
  amount: number;
  totalValue: number;
  certificateNumber?: string;
  txHash?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AllocationWizard({
  onClose,
  onComplete,
  prices,
  initialAsset,
}: AllocationWizardProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const toast = useToast();
  const { address, balances, refreshBalances } = useWallet();

  // Wizard State
  const [currentStep, setCurrentStep] = useState(initialAsset ? 2 : 1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(
    initialAsset ? assets.find(a => a.symbol === initialAsset) || null : null
  );
  const [amount, setAmount] = useState<string>("1");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<AllocationResult | null>(null);
  const [trustChecks, setTrustChecks] = useState<boolean[]>([false, false, false, false, false, false, false]);

  // Calculations
  const amountNum = parseFloat(amount) || 0;
  const assetPrice = selectedAsset ? prices[selectedAsset.symbol] || 0 : 0;
  const executionSpread = 0.5; // 0.5% spread
  const finalPrice = assetPrice * (1 + executionSpread / 100);
  const totalValue = amountNum * finalPrice;
  const auxmBalance = balances?.auxm || 0;
  const canAfford = totalValue <= auxmBalance;
  const isWhaleThreshold = totalValue >= 100000;
  const allTrustChecked = trustChecks.every(Boolean);

  // Asset Descriptions based on language
  const getAssetDescription = (assetId: string) => {
    switch (assetId) {
      case "gold": return t("goldDesc");
      case "silver": return t("silverDesc");
      case "platinum": return t("platinumDesc");
      case "palladium": return t("palladiumDesc");
      default: return "";
    }
  };

  const getAssetName = (assetId: string) => {
    switch (assetId) {
      case "gold": return t("goldTitle");
      case "silver": return t("silverTitle");
      case "platinum": return t("platinumTitle");
      case "palladium": return t("palladiumTitle");
      default: return "";
    }
  };

  // Handlers
  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    setCurrentStep(2);
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const handleContinueToReview = () => {
    if (amountNum > 0 && canAfford) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTrustCheck = (index: number) => {
    const newChecks = [...trustChecks];
    newChecks[index] = !newChecks[index];
    setTrustChecks(newChecks);
  };

  const handleConfirmAllocation = async () => {
    if (!selectedAsset || !address || !allTrustChecked) return;

    setIsProcessing(true);

    try {
      // Call allocation API
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "buy",
          fromToken: "AUXM",
          toToken: selectedAsset.symbol,
          fromAmount: totalValue,
          address,
          executeOnChain: true,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Allocation failed");

      // Create allocation certificate
      const allocRes = await fetch("/api/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          metal: selectedAsset.symbol,
          grams: amountNum,
          txHash: data.txHash,
        }),
      });
      const allocData = await allocRes.json();

      const allocationResult: AllocationResult = {
        asset: selectedAsset.name,
        symbol: selectedAsset.symbol,
        amount: amountNum,
        totalValue,
        certificateNumber: allocData.certificateNumber,
        txHash: data.txHash,
      };

      setResult(allocationResult);
      setIsComplete(true);
      await refreshBalances();
      toast.success(t("success"));

      if (onComplete) {
        onComplete(allocationResult);
      }
    } catch (error: any) {
      toast.error(t("error"), error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Trust Checklist Items - 7 Trust Signals (Capital Gravity Blueprint)
  const trustChecklistItems = [
    t("checkFullyAllocated"),
    t("checkIndependentCustody"),
    t("checkBankruptcyRemote"),
    t("checkSegregated"),
    t("checkAudited"),
    t("checkInsured"),
    t("checkBlockchainAnchored"),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 backdrop-institutional" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl institutional-card shadow-institutional overflow-hidden">
        {/* Header with Progress */}
        <div className="border-b border-slate-800">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">{t("capitalAllocation")}</h2>
              {!isComplete && (
                <p className="text-sm text-slate-400 mt-0.5">
                  {t("step")} {currentStep} {t("of")} 3
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          {!isComplete && (
            <div className="px-6 pb-4">
              <div className="flex gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      step <= currentStep ? "bg-[#2F6F62]" : "bg-slate-700"
                    }`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span className={currentStep >= 1 ? "text-[#2F6F62]" : ""}>{t("selectAsset")}</span>
                <span className={currentStep >= 2 ? "text-[#2F6F62]" : ""}>{t("defineAllocation")}</span>
                <span className={currentStep >= 3 ? "text-[#2F6F62]" : ""}>{t("reviewConfirm")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Step 1: Select Asset */}
          {currentStep === 1 && !isComplete && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-white">{t("selectAsset")}</h3>
                <p className="text-sm text-slate-400 mt-1">{t("selectAssetDesc")}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => handleAssetSelect(asset)}
                    className="p-5 rounded-xl border border-slate-700/30 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{asset.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-white">{getAssetName(asset.id)}</h4>
                          <span className="text-xs text-slate-500 font-mono">{asset.symbol}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {getAssetDescription(asset.id)}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-medium text-white">
                            {formatCurrency(prices[asset.symbol] || 0)}/g
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#2F6F62] transition-colors" />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Define Allocation */}
          {currentStep === 2 && selectedAsset && !isComplete && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-sm mb-3">
                  <span className="text-xl">{selectedAsset.icon}</span>
                  <span className="text-white font-medium">{getAssetName(selectedAsset.id)}</span>
                  <span className="text-slate-500 font-mono text-xs">{selectedAsset.symbol}</span>
                </div>
                <h3 className="text-lg font-medium text-white">{t("defineAllocation")}</h3>
                <p className="text-sm text-slate-400 mt-1">{t("defineAllocationDesc")}</p>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <label className="block text-sm text-slate-400">{t("amount")} ({t("grams")})</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="1"
                    min="0.01"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg font-mono focus:outline-none focus:border-[#2F6F62] transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {t("grams")}
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">{t("minimumAllocation")}: 0.01g</span>
                  <span className="text-slate-500">
                    {t("availableBalance")}: {formatCurrency(auxmBalance)}
                  </span>
                </div>
              </div>

              {/* Ownership Preview */}
              {amountNum > 0 && (
                <div className="p-4 rounded-xl bg-[#2F6F62]/10 border border-[#2F6F62]/20">
                  <div className="text-sm text-[#2F6F62] mb-1">{t("youWillOwn")}</div>
                  <div className="text-2xl font-bold text-white">
                    {amountNum.toLocaleString()} {t("gramsOf")} {getAssetName(selectedAsset.id)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{t("inYourName")}</div>
                </div>
              )}

              {/* Pricing Breakdown */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 divide-y divide-slate-700/50">
                <div className="px-4 py-3">
                  <h4 className="text-sm font-medium text-white">{t("allocationValue")}</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{t("referencePrice")}</span>
                    <span className="text-white font-mono">{formatCurrency(assetPrice)}/g</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">{t("executionSpread")}</span>
                    <span className="text-[#BFA181] font-mono">+{executionSpread.toFixed(2)}%</span>
                  </div>
                  <div className="h-px bg-slate-700/50" />
                  <div className="flex justify-between text-sm">
                    <span className="text-white font-medium">{t("finalPrice")}</span>
                    <span className="text-[#2F6F62] font-mono">{formatCurrency(finalPrice)}/g</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700/50">
                    <span className="text-white font-semibold">{t("totalValue")}</span>
                    <span className="text-xl font-bold text-white">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>

              {/* Whale Threshold Notice */}
              {isWhaleThreshold && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm text-purple-300">{t("privateClientThreshold")}</p>
                  <button className="mt-2 text-sm text-purple-400 hover:text-purple-300 underline">
                    {t("contactPrivateDesk")}
                  </button>
                </div>
              )}

              {/* Insufficient Balance Warning */}
              {!canAfford && amountNum > 0 && (
                <div className="p-3 rounded-lg bg-[#BFA181]/10 border border-[#BFA181]/20">
                  <p className="text-sm text-[#BFA181]">⚠️ {t("insufficientBalance")}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("back")}
                </button>
                <button
                  onClick={handleContinueToReview}
                  disabled={amountNum <= 0 || !canAfford}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#2F6F62] text-white font-semibold hover:bg-[#2F6F62] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {t("continue")}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {currentStep === 3 && selectedAsset && !isComplete && (
            <div className="space-y-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-medium text-white">{t("reviewConfirm")}</h3>
                <p className="text-sm text-slate-400 mt-1">{t("reviewConfirmDesc")}</p>
              </div>

              {/* Allocation Summary */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30">
                <div className="px-4 py-3 border-b border-slate-700/50">
                  <h4 className="text-sm font-medium text-white">{t("allocationSummary")}</h4>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("asset")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{selectedAsset.icon}</span>
                      <span className="text-white font-medium">{getAssetName(selectedAsset.id)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("quantity")}</span>
                    <span className="text-white font-mono">{amountNum.toLocaleString()} {t("grams")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t("finalPrice")}</span>
                    <span className="text-white font-mono">{formatCurrency(finalPrice)}/g</span>
                  </div>
                  <div className="h-px bg-slate-700/50" />
                  <div className="flex justify-between">
                    <span className="text-white font-semibold">{t("value")}</span>
                    <span className="text-xl font-bold text-[#2F6F62]">{formatCurrency(totalValue)}</span>
                  </div>
                </div>
              </div>

              {/* Vault Details */}
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30">
                <div className="px-4 py-3 border-b border-slate-700/50">
                  <h4 className="text-sm font-medium text-white">{t("vaultDetails")}</h4>
                </div>
                <div className="p-4">
                  <VaultVisibility compact />
                </div>
              </div>

              {/* Trust Checklist */}
              <div className="rounded-xl border border-[#2F6F62]/20 bg-[#2F6F62]/5">
                <div className="px-4 py-3 border-b border-[#2F6F62]/20">
                  <h4 className="text-sm font-medium text-[#2F6F62] flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {t("trustChecklist")}
                  </h4>
                </div>
                <div className="p-4 space-y-3">
                  {trustChecklistItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleTrustCheck(index)}
                      className="w-full flex items-center gap-3 text-left group"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        trustChecks[index]
                          ? "bg-[#2F6F62] border-[#2F6F62]"
                          : "border-slate-600 group-hover:border-slate-500"
                      }`}>
                        {trustChecks[index] && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${trustChecks[index] ? "text-white" : "text-slate-400"}`}>
                        {item}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleBack}
                  disabled={isProcessing}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t("back")}
                </button>
                <button
                  onClick={handleConfirmAllocation}
                  disabled={!allTrustChecked || isProcessing}
                  className="flex-1 px-4 py-3 rounded-xl bg-[#2F6F62] text-white font-semibold hover:bg-[#2F6F62] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t("processing")}
                    </span>
                  ) : (
                    t("confirmAllocation")
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Success State */}
          {isComplete && result && (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
                <Check className="w-10 h-10 text-[#2F6F62]" />
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">{t("success")}</h3>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 text-sm mb-6">
                <span className="text-xl">{selectedAsset?.icon}</span>
                <span className="text-white font-medium">
                  {result.amount.toLocaleString()} {t("grams")} {result.asset}
                </span>
              </div>

              {/* Certificate Info */}
              {result.certificateNumber && (
                <div className="mb-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-[#BFA181]" />
                    <span className="text-sm text-slate-400">{t("certificateNumberLabel")}</span>
                  </div>
                  <div className="text-lg font-mono text-white">{result.certificateNumber}</div>
                </div>
              )}

              {/* Trust Badges */}
              <div className="mb-6">
                <TrustBadges size="sm" />
              </div>

              {/* Allocation Message */}
              <AllocationMessage className="justify-center mb-6" />

              {/* Actions */}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 transition-colors"
                >
                  {t("cancel")}
                </button>
                {result.certificateNumber && (
                  <button className="px-6 py-2.5 rounded-xl bg-[#2F6F62] text-white font-semibold hover:bg-[#2F6F62] transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t("viewCertificate")}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AllocationWizard;
