"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    pageTitle: "Saklama Seffafligi",
    backToTrust: "Guven Merkezine Don",
    updatedAt: "Guncelleme",
    loading: "Yukleniyor...",
    error: "Veri yuklenemedi",

    // Layer 1
    layer1Title: "1. Saklama Gorunumu",
    metalColumn: "Metal",
    custodyHoldingsColumn: "Saklama Varliklari (kg)",
    layer1Disclaimer: "Rakamlar saklamadaki tahsisli musteri metalini yansitir. Periyodik olarak guncellenir.",

    // Layer 2
    layer2Title: "2. Yukumluluk Gorunurlugu",
    allocatedColumn: "Tahsis Edilen (Toplam)",
    encumberedColumn: "Yukumluluk Altinda (Yapilandirilmis Getiri)",
    availableColumn: "Kullanilabilir",
    utilizationColumn: "Kullanim",
    encumbranceTooltip: "Yukumluluk altindaki metal, sahibinin acik onayi ile kurumsal degerli metal yapilandirilmis getiri programlarinda konuslandirilmistir.",

    // Layer 3
    layer3Title: "3. Uzlastirma ve Denetim",
    metric: "Olcum",
    value: "Deger",
    reconciliationStatus: "Uzlastirma Durumu",
    lastReconciliation: "Son Uzlastirma",
    externalAudit: "Harici Denetim",
    statusReconciled: "Uzlastirildi",
    statusPending: "Beklemede",
    statusMismatch: "Uyumsuzluk",
    scheduledQ2: "Q2 2026 Planli",

    // Layer 4
    layer4Title: "4. Defter Gorunurlugu",
    scopeColumn: "Kapsam",
    accessColumn: "Erisim Duzeyi",
    publicScope: "Kamuya Acik",
    authenticatedScope: "Dogrulanmis Musteri",
    publicAccessDesc: "Toplu saklama verileri (bu sayfa)",
    authenticatedAccessDesc: "Tahsis sertifikasi, kulce referansi, kasa, dogrulama, islem gecmisi",
    layer4Note: "Bireysel varliklar kamuya aciklanmaz. Dogrulanmis musteriler kendi tahsis ve saklama verilerini musteri panelinden goruntuleyebilir.",

    // Trust statements
    trustStatement1: "Auxite, goruntuye degil dogruluga oncelik verir.",
    trustStatement2: "Musteri metalleri, musterinin acik onayi olmadan kurumsal amaclarla kullanilamaz.",
    trustStatement3: "Yukumluluk yalnizca katilima dayali yapilandirilmis getiri programlari araciligiyla gerceklesir.",

    // Legal
    legalDisclaimer: "Bu sayfa yalnizca bilgilendirme amaciyla sunulmaktadir ve yatirim tavsiyesi niteliginde degildir. Veriler gosterge niteliktedir ve periyodik uzlastirmaya tabidir.",
  },
  en: {
    pageTitle: "Custody Transparency",
    backToTrust: "Back to Trust Center",
    updatedAt: "Updated",
    loading: "Loading...",
    error: "Failed to load data",

    // Layer 1
    layer1Title: "1. Custody Snapshot",
    metalColumn: "Metal",
    custodyHoldingsColumn: "Custody Holdings (kg)",
    layer1Disclaimer: "Figures reflect allocated client metal held in custody. Updated periodically.",

    // Layer 2
    layer2Title: "2. Encumbrance Visibility",
    allocatedColumn: "Allocated (Total)",
    encumberedColumn: "Encumbered (Structured Yield)",
    availableColumn: "Available",
    utilizationColumn: "Utilization",
    encumbranceTooltip: "Encumbered metal is deployed in institutional precious metals structured yield programs with the explicit consent of the holder.",

    // Layer 3
    layer3Title: "3. Reconciliation & Audit",
    metric: "Metric",
    value: "Value",
    reconciliationStatus: "Reconciliation Status",
    lastReconciliation: "Last Reconciliation",
    externalAudit: "External Audit",
    statusReconciled: "Reconciled",
    statusPending: "Pending",
    statusMismatch: "Mismatch",
    scheduledQ2: "Scheduled Q2 2026",

    // Layer 4
    layer4Title: "4. Ledger Visibility",
    scopeColumn: "Scope",
    accessColumn: "Access Level",
    publicScope: "Public",
    authenticatedScope: "Authenticated Client",
    publicAccessDesc: "Aggregate custody data (this page)",
    authenticatedAccessDesc: "Allocation certificate, bar reference, vault, verification hash, transaction history",
    layer4Note: "Individual holdings are not disclosed publicly. Authenticated clients may view their own allocation and custody data via the client dashboard.",

    // Trust statements
    trustStatement1: "Auxite prioritizes accuracy over optics.",
    trustStatement2: "Client metals are never used for corporate purposes without explicit client consent.",
    trustStatement3: "Encumbrance occurs only through opt-in structured yield programs.",

    // Legal
    legalDisclaimer: "This page is provided for informational purposes only and does not constitute investment advice. Data is indicative and subject to periodic reconciliation.",
  },
  de: {
    pageTitle: "Verwahrungstransparenz",
    backToTrust: "Zuruck zum Trust Center",
    updatedAt: "Aktualisiert",
    loading: "Laden...",
    error: "Daten konnten nicht geladen werden",

    layer1Title: "1. Verwahrungsubersicht",
    metalColumn: "Metall",
    custodyHoldingsColumn: "Verwahrungsbestande (kg)",
    layer1Disclaimer: "Die Zahlen spiegeln zugewiesenes Kundenmetall in Verwahrung wider. Periodisch aktualisiert.",

    layer2Title: "2. Belastungsubersicht",
    allocatedColumn: "Zugewiesen (Gesamt)",
    encumberedColumn: "Belastet (Strukturierte Rendite)",
    availableColumn: "Verfugbar",
    utilizationColumn: "Auslastung",
    encumbranceTooltip: "Belastetes Metall wird in institutionellen Edelmetall-Strukturierten-Rendite-Programmen mit ausdrucklicher Zustimmung des Inhabers eingesetzt.",

    layer3Title: "3. Abstimmung & Prufung",
    metric: "Kennzahl",
    value: "Wert",
    reconciliationStatus: "Abstimmungsstatus",
    lastReconciliation: "Letzte Abstimmung",
    externalAudit: "Externe Prufung",
    statusReconciled: "Abgestimmt",
    statusPending: "Ausstehend",
    statusMismatch: "Abweichung",
    scheduledQ2: "Geplant Q2 2026",

    layer4Title: "4. Hauptbuchtransparenz",
    scopeColumn: "Bereich",
    accessColumn: "Zugangsstufe",
    publicScope: "Offentlich",
    authenticatedScope: "Authentifizierter Kunde",
    publicAccessDesc: "Aggregierte Verwahrungsdaten (diese Seite)",
    authenticatedAccessDesc: "Zuweisungszertifikat, Barrenreferenz, Tresor, Verifizierungshash, Transaktionsverlauf",
    layer4Note: "Individuelle Bestande werden nicht offentlich offengelegt. Authentifizierte Kunden konnen ihre eigenen Zuweisungs- und Verwahrungsdaten uber das Kunden-Dashboard einsehen.",

    trustStatement1: "Auxite priorisiert Genauigkeit uber Optik.",
    trustStatement2: "Kundenmetalle werden ohne ausdruckliche Kundenzustimmung nicht fur Unternehmenszwecke verwendet.",
    trustStatement3: "Belastung erfolgt ausschliesslich uber Opt-in-Strukturierte-Rendite-Programme.",

    legalDisclaimer: "Diese Seite dient ausschliesslich Informationszwecken und stellt keine Anlageberatung dar. Die Daten sind indikativ und unterliegen der periodischen Abstimmung.",
  },
  fr: {
    pageTitle: "Transparence de la Conservation",
    backToTrust: "Retour au Centre de Confiance",
    updatedAt: "Mis a jour",
    loading: "Chargement...",
    error: "Echec du chargement des donnees",

    layer1Title: "1. Apercu de la Conservation",
    metalColumn: "Metal",
    custodyHoldingsColumn: "Avoirs en Conservation (kg)",
    layer1Disclaimer: "Les chiffres refletent le metal client alloue en conservation. Mis a jour periodiquement.",

    layer2Title: "2. Visibilite des Engagements",
    allocatedColumn: "Alloue (Total)",
    encumberedColumn: "Engage (Rendement Structure)",
    availableColumn: "Disponible",
    utilizationColumn: "Utilisation",
    encumbranceTooltip: "Le metal engage est deploye dans des programmes institutionnels de rendement structure de metaux precieux avec le consentement explicite du detenteur.",

    layer3Title: "3. Reconciliation & Audit",
    metric: "Indicateur",
    value: "Valeur",
    reconciliationStatus: "Statut de Reconciliation",
    lastReconciliation: "Derniere Reconciliation",
    externalAudit: "Audit Externe",
    statusReconciled: "Reconcilie",
    statusPending: "En attente",
    statusMismatch: "Ecart",
    scheduledQ2: "Prevu Q2 2026",

    layer4Title: "4. Visibilite du Registre",
    scopeColumn: "Portee",
    accessColumn: "Niveau d'Acces",
    publicScope: "Public",
    authenticatedScope: "Client Authentifie",
    publicAccessDesc: "Donnees de conservation agregees (cette page)",
    authenticatedAccessDesc: "Certificat d'allocation, reference de lingot, coffre, hash de verification, historique des transactions",
    layer4Note: "Les avoirs individuels ne sont pas divulgues publiquement. Les clients authentifies peuvent consulter leurs propres donnees d'allocation et de conservation via le tableau de bord client.",

    trustStatement1: "Auxite donne la priorite a la precision plutot qu'a l'apparence.",
    trustStatement2: "Les metaux des clients ne sont jamais utilises a des fins d'entreprise sans le consentement explicite du client.",
    trustStatement3: "L'engagement n'intervient que par le biais de programmes de rendement structure sur option.",

    legalDisclaimer: "Cette page est fournie a titre informatif uniquement et ne constitue pas un conseil en investissement. Les donnees sont indicatives et soumises a reconciliation periodique.",
  },
  ar: {
    pageTitle: "شفافية الحفظ",
    backToTrust: "العودة إلى مركز الثقة",
    updatedAt: "تم التحديث",
    loading: "جاري التحميل...",
    error: "فشل تحميل البيانات",

    layer1Title: "1. لمحة عن الحفظ",
    metalColumn: "المعدن",
    custodyHoldingsColumn: "حيازات الحفظ (كجم)",
    layer1Disclaimer: "تعكس الأرقام المعدن المخصص للعميل المحتفظ به في الحفظ. يتم التحديث دورياً.",

    layer2Title: "2. رؤية الأعباء",
    allocatedColumn: "المخصص (الإجمالي)",
    encumberedColumn: "المرهون (العائد المهيكل)",
    availableColumn: "المتاح",
    utilizationColumn: "الاستخدام",
    encumbranceTooltip: "يتم نشر المعدن المرهون في برامج العائد المهيكل المؤسسية للمعادن الثمينة بموافقة صريحة من المالك.",

    layer3Title: "3. المطابقة والتدقيق",
    metric: "المقياس",
    value: "القيمة",
    reconciliationStatus: "حالة المطابقة",
    lastReconciliation: "آخر مطابقة",
    externalAudit: "التدقيق الخارجي",
    statusReconciled: "تمت المطابقة",
    statusPending: "قيد الانتظار",
    statusMismatch: "عدم تطابق",
    scheduledQ2: "مجدول Q2 2026",

    layer4Title: "4. رؤية السجل",
    scopeColumn: "النطاق",
    accessColumn: "مستوى الوصول",
    publicScope: "عام",
    authenticatedScope: "عميل موثق",
    publicAccessDesc: "بيانات الحفظ المجمعة (هذه الصفحة)",
    authenticatedAccessDesc: "شهادة التخصيص، مرجع السبيكة، الخزنة، تجزئة التحقق، سجل المعاملات",
    layer4Note: "لا يتم الكشف عن الحيازات الفردية علناً. يمكن للعملاء الموثقين عرض بيانات التخصيص والحفظ الخاصة بهم عبر لوحة العميل.",

    trustStatement1: "تعطي Auxite الأولوية للدقة على المظهر.",
    trustStatement2: "لا تُستخدم معادن العملاء لأغراض الشركة بدون موافقة صريحة من العميل.",
    trustStatement3: "لا يحدث الرهن إلا من خلال برامج العائد المهيكل القائمة على الاشتراك.",

    legalDisclaimer: "هذه الصفحة مقدمة لأغراض إعلامية فقط ولا تشكل نصيحة استثمارية. البيانات إرشادية وتخضع للمطابقة الدورية.",
  },
  ru: {
    pageTitle: "Прозрачность Хранения",
    backToTrust: "Назад в Центр Доверия",
    updatedAt: "Обновлено",
    loading: "Загрузка...",
    error: "Не удалось загрузить данные",

    layer1Title: "1. Обзор Хранения",
    metalColumn: "Металл",
    custodyHoldingsColumn: "Хранимые Активы (кг)",
    layer1Disclaimer: "Цифры отражают выделенный клиентский металл на хранении. Обновляется периодически.",

    layer2Title: "2. Обзор Обременений",
    allocatedColumn: "Выделено (Всего)",
    encumberedColumn: "Обременено (Структурированная Доходность)",
    availableColumn: "Доступно",
    utilizationColumn: "Использование",
    encumbranceTooltip: "Обремененный металл размещен в институциональных программах структурированной доходности драгоценных металлов с явного согласия владельца.",

    layer3Title: "3. Сверка и Аудит",
    metric: "Показатель",
    value: "Значение",
    reconciliationStatus: "Статус Сверки",
    lastReconciliation: "Последняя Сверка",
    externalAudit: "Внешний Аудит",
    statusReconciled: "Сверено",
    statusPending: "В ожидании",
    statusMismatch: "Расхождение",
    scheduledQ2: "Запланировано Q2 2026",

    layer4Title: "4. Прозрачность Реестра",
    scopeColumn: "Область",
    accessColumn: "Уровень Доступа",
    publicScope: "Публичный",
    authenticatedScope: "Аутентифицированный Клиент",
    publicAccessDesc: "Агрегированные данные хранения (эта страница)",
    authenticatedAccessDesc: "Сертификат распределения, ссылка на слиток, хранилище, хэш верификации, история транзакций",
    layer4Note: "Индивидуальные активы не раскрываются публично. Аутентифицированные клиенты могут просматривать свои данные распределения и хранения через клиентскую панель.",

    trustStatement1: "Auxite ставит точность выше внешнего вида.",
    trustStatement2: "Металлы клиентов никогда не используются в корпоративных целях без явного согласия клиента.",
    trustStatement3: "Обременение происходит только через программы структурированной доходности с согласия участника.",

    legalDisclaimer: "Эта страница предоставлена исключительно в информационных целях и не является инвестиционной рекомендацией. Данные являются индикативными и подлежат периодической сверке.",
  },
};

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
// COMPONENT
// ============================================
export default function CustodyTransparencyPage() {
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [data, setData] = useState<CustodyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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
    const interval = setInterval(fetchData, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const formatKg = (g: number): string => {
    return (g / 1000).toFixed(3);
  };

  const formatG = (g: number): string => {
    if (g >= 1000) return `${(g / 1000).toFixed(3)} kg`;
    return `${g.toFixed(2)} g`;
  };

  const formatTimestamp = (ts: string | null): string => {
    if (!ts) return "—";
    try {
      return new Date(ts).toISOString().replace("T", " ").substring(0, 19) + " UTC";
    } catch {
      return "—";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "Reconciled": return t.statusReconciled;
      case "Pending": return t.statusPending;
      case "Mismatch": return t.statusMismatch;
      default: return status;
    }
  };

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <TopNav />
        <main className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-sm text-gray-400 dark:text-gray-500">{t.loading}</p>
        </main>
      </div>
    );
  }

  // ── ERROR STATE ──
  if (error || !data) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <TopNav />
        <main className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.error}</p>
        </main>
      </div>
    );
  }

  const layers = data.layers;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <TopNav />

      <main className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Back Link */}
        <Link
          href="/trust"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-block"
        >
          &larr; {t.backToTrust}
        </Link>

        {/* Page Header */}
        <div className="flex items-baseline justify-between mb-10 border-b border-gray-200 dark:border-gray-800 pb-4">
          <h1 className="text-lg font-medium uppercase tracking-wide text-gray-900 dark:text-gray-100">
            {t.pageTitle}
          </h1>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
            {t.updatedAt}: {formatTimestamp(data.timestamp)}
          </span>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* LAYER 1: CUSTODY SNAPSHOT               */}
        {/* ═══════════════════════════════════════ */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            {t.layer1Title}
          </h2>

          <div className="border border-gray-200 dark:border-gray-800 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.metalColumn}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.custodyHoldingsColumn}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {layers.custodySnapshot.metals.map((m) => (
                  <tr key={m.symbol}>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100">
                      {m.symbol}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                      {formatKg(m.custodyHoldingsG)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {t.layer1Disclaimer}
          </p>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* LAYER 2: ENCUMBRANCE VISIBILITY         */}
        {/* ═══════════════════════════════════════ */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            {t.layer2Title}
          </h2>

          <div className="border border-gray-200 dark:border-gray-800 rounded-sm overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.metalColumn}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.allocatedColumn}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider group relative">
                    {t.encumberedColumn}
                    <span className="hidden group-hover:block absolute z-10 right-0 top-full mt-1 w-72 p-2 bg-gray-800 dark:bg-gray-700 text-white text-xs font-normal normal-case tracking-normal rounded shadow-lg">
                      {t.encumbranceTooltip}
                    </span>
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.availableColumn}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.utilizationColumn}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {layers.encumbranceVisibility.metals.map((m) => (
                  <tr key={m.symbol}>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100">
                      {m.symbol}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                      {formatG(m.allocatedG)}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                      {formatG(m.encumberedG)}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                      {formatG(m.availableG)}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                      {m.utilizationPercent.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* LAYER 3: RECONCILIATION & AUDIT         */}
        {/* ═══════════════════════════════════════ */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            {t.layer3Title}
          </h2>

          <div className="border border-gray-200 dark:border-gray-800 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.metric}
                  </th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.value}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.reconciliationStatus}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-right">
                    <span className={
                      layers.reconciliation.status === "Reconciled"
                        ? "text-gray-900 dark:text-gray-100"
                        : layers.reconciliation.status === "Pending"
                          ? "text-gray-400 dark:text-gray-500"
                          : "text-red-600 dark:text-red-400"
                    }>
                      {getStatusLabel(layers.reconciliation.status)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.lastReconciliation}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                    {formatTimestamp(layers.reconciliation.lastReconciliationAt)}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.externalAudit}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-mono text-gray-900 dark:text-gray-100 text-right">
                    {t.scheduledQ2}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* LAYER 4: LEDGER VISIBILITY              */}
        {/* ═══════════════════════════════════════ */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
            {t.layer4Title}
          </h2>

          <div className="border border-gray-200 dark:border-gray-800 rounded-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.scopeColumn}
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t.accessColumn}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.publicScope}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.publicAccessDesc}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.authenticatedScope}
                  </td>
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">
                    {t.authenticatedAccessDesc}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {t.layer4Note}
          </p>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/* TRUST STATEMENTS                        */}
        {/* ═══════════════════════════════════════ */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mb-6">
          <ul className="space-y-1.5">
            <li className="text-xs text-gray-500 dark:text-gray-400">
              {t.trustStatement1}
            </li>
            <li className="text-xs text-gray-500 dark:text-gray-400">
              {t.trustStatement2}
            </li>
            <li className="text-xs text-gray-500 dark:text-gray-400">
              {t.trustStatement3}
            </li>
          </ul>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* LEGAL DISCLAIMER                        */}
        {/* ═══════════════════════════════════════ */}
        <p className="text-[10px] text-gray-400 dark:text-gray-600">
          {t.legalDisclaimer}
        </p>
      </main>
    </div>
  );
}
