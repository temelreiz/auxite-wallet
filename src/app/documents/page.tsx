"use client";

import { useState, useEffect, useCallback } from "react";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";

// ============================================
// DOCUMENT VAULT - Private Bank Grade
// Real certificates from /api/certificates
// ============================================

interface Certificate {
  id: string;
  certificateNumber: string;
  metal: string;
  metalName: string;
  grams: string;
  serialNumber: string;
  vault: string;
  vaultName: string;
  purity: string;
  issuedAt: string;
  status: string;
  issuer: string;
  issuerAddress: string;
  userUid: string;
  address: string;
  allocationId?: string;
  txHash?: string;
  barSize?: string;
}

const translations: Record<string, Record<string, string>> = {
  en: {
    title: "Document Vault",
    subtitle: "Allocation certificates, custody statements, and legal documents",
    categories: "Categories",
    all: "All",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
    preview: "Preview",
    download: "Download",
    noDocuments: "No documents yet",
    generated: "Issued",
    grams: "Grams",
    vault: "Vault",
    purity: "Purity",
    certificateNo: "Certificate No",
    allocationCertificate: "Allocation Certificate",
    loading: "Loading documents...",
    connectWallet: "Connect your wallet to view your documents",
    errorLoading: "Failed to load documents",
    retry: "Retry",
    secureStorage: "Secure Document Storage",
    secureStorageDesc: "All certificates are cryptographically signed and blockchain-anchored",
    documentsAvailable: "certificates available",
    documentPreview: "Document Preview",
    status: "Status",
    active: "Active",
    voided: "Voided",
  },
  tr: {
    title: "Belge Kasası",
    subtitle: "Tahsis sertifikaları, saklama özetleri ve yasal belgeler",
    categories: "Kategoriler",
    all: "Tümü",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
    preview: "Önizleme",
    download: "İndir",
    noDocuments: "Henüz belge yok",
    generated: "Düzenlenme",
    grams: "Gram",
    vault: "Kasa",
    purity: "Saflık",
    certificateNo: "Sertifika No",
    allocationCertificate: "Tahsis Sertifikası",
    loading: "Belgeler yükleniyor...",
    connectWallet: "Belgelerinizi görmek için cüzdanınızı bağlayın",
    errorLoading: "Belgeler yüklenemedi",
    retry: "Tekrar Dene",
    secureStorage: "Güvenli Belge Depolama",
    secureStorageDesc: "Tüm sertifikalar kriptografik olarak imzalanır ve blok zincirine kaydedilir",
    documentsAvailable: "sertifika hazır",
    documentPreview: "Belge Önizleme",
    status: "Durum",
    active: "Aktif",
    voided: "İptal Edilmiş",
  },
  de: {
    title: "Dokumententresor",
    subtitle: "Zuteilungszertifikate, Verwahrungsauszüge und rechtliche Dokumente",
    categories: "Kategorien",
    all: "Alle",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
    preview: "Vorschau",
    download: "Herunterladen",
    noDocuments: "Noch keine Dokumente",
    generated: "Ausgestellt",
    grams: "Gramm",
    vault: "Tresor",
    purity: "Reinheit",
    certificateNo: "Zertifikat-Nr",
    allocationCertificate: "Zuteilungszertifikat",
    loading: "Dokumente werden geladen...",
    connectWallet: "Verbinden Sie Ihre Wallet, um Ihre Dokumente anzuzeigen",
    errorLoading: "Dokumente konnten nicht geladen werden",
    retry: "Erneut versuchen",
    secureStorage: "Sichere Dokumentenspeicherung",
    secureStorageDesc: "Alle Zertifikate sind kryptographisch signiert und in der Blockchain verankert",
    documentsAvailable: "Zertifikate verfügbar",
    documentPreview: "Dokumentvorschau",
    status: "Status",
    active: "Aktiv",
    voided: "Ungültig",
  },
  fr: {
    title: "Coffre de documents",
    subtitle: "Certificats d'allocation, relevés de garde et documents légaux",
    categories: "Catégories",
    all: "Tous",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
    preview: "Aperçu",
    download: "Télécharger",
    noDocuments: "Aucun document pour le moment",
    generated: "Émis",
    grams: "Grammes",
    vault: "Coffre",
    purity: "Pureté",
    certificateNo: "N° de certificat",
    allocationCertificate: "Certificat d'allocation",
    loading: "Chargement des documents...",
    connectWallet: "Connectez votre portefeuille pour voir vos documents",
    errorLoading: "Impossible de charger les documents",
    retry: "Réessayer",
    secureStorage: "Stockage sécurisé des documents",
    secureStorageDesc: "Tous les certificats sont signés cryptographiquement et ancrés dans la blockchain",
    documentsAvailable: "certificats disponibles",
    documentPreview: "Aperçu du document",
    status: "Statut",
    active: "Actif",
    voided: "Annulé",
  },
  ar: {
    title: "خزنة المستندات",
    subtitle: "شهادات التخصيص وكشوف الحفظ والمستندات القانونية",
    categories: "الفئات",
    all: "الكل",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
    preview: "معاينة",
    download: "تحميل",
    noDocuments: "لا توجد مستندات بعد",
    generated: "صدر في",
    grams: "غرام",
    vault: "خزنة",
    purity: "نقاء",
    certificateNo: "رقم الشهادة",
    allocationCertificate: "شهادة التخصيص",
    loading: "جاري تحميل المستندات...",
    connectWallet: "اربط محفظتك لعرض مستنداتك",
    errorLoading: "فشل تحميل المستندات",
    retry: "إعادة المحاولة",
    secureStorage: "تخزين آمن للمستندات",
    secureStorageDesc: "جميع الشهادات موقعة تشفيرياً ومرتبطة بالبلوكتشين",
    documentsAvailable: "شهادات متاحة",
    documentPreview: "معاينة المستند",
    status: "الحالة",
    active: "نشط",
    voided: "ملغى",
  },
  ru: {
    title: "Хранилище документов",
    subtitle: "Сертификаты размещения, выписки хранения и юридические документы",
    categories: "Категории",
    all: "Все",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
    preview: "Просмотр",
    download: "Скачать",
    noDocuments: "Документов пока нет",
    generated: "Выдан",
    grams: "Грамм",
    vault: "Хранилище",
    purity: "Чистота",
    certificateNo: "№ сертификата",
    allocationCertificate: "Сертификат размещения",
    loading: "Загрузка документов...",
    connectWallet: "Подключите кошелёк для просмотра документов",
    errorLoading: "Не удалось загрузить документы",
    retry: "Повторить",
    secureStorage: "Безопасное хранение документов",
    secureStorageDesc: "Все сертификаты криптографически подписаны и закреплены в блокчейне",
    documentsAvailable: "сертификатов доступно",
    documentPreview: "Предварительный просмотр документа",
    status: "Статус",
    active: "Активный",
    voided: "Аннулирован",
  },
};

// Metal icon/color mapping
const METAL_CONFIG: Record<string, { icon: string; color: string }> = {
  AUXG: { icon: "🥇", color: "#D4A017" },
  AUXS: { icon: "🥈", color: "#A8A9AD" },
  AUXPT: { icon: "⬜", color: "#7B8794" },
  AUXPD: { icon: "🟫", color: "#B87333" },
};

export default function DocumentsPage() {
  const { lang } = useLanguage();
  const { address, isConnected } = useWallet();
  const t = translations[lang] || translations.en;

  const [filter, setFilter] = useState("all");
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch real certificates from API
  const fetchCertificates = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/certificates?address=${address}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.certificates)) {
        // Filter out voided certificates
        setCertificates(data.certificates.filter((c: Certificate) => c.status !== "VOID"));
      } else {
        setCertificates([]);
      }
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
      setError(t.errorLoading);
    } finally {
      setLoading(false);
    }
  }, [address, t.errorLoading]);

  useEffect(() => {
    if (address) {
      fetchCertificates();
    }
  }, [address, fetchCertificates]);

  // Metal-based categories
  const categories = [
    { key: "all", label: t.all, icon: "📁" },
    { key: "AUXG", label: t.gold, icon: "🥇" },
    { key: "AUXS", label: t.silver, icon: "🥈" },
    { key: "AUXPT", label: t.platinum, icon: "⬜" },
    { key: "AUXPD", label: t.palladium, icon: "🟫" },
  ];

  const filteredDocs = filter === "all"
    ? certificates
    : certificates.filter((cert) => cert.metal === filter);

  const getMetalColor = (metal: string) => METAL_CONFIG[metal]?.color || "#BFA181";

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(
        lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US",
        { year: "numeric", month: "short", day: "numeric" }
      );
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t.title}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 sticky top-4">
              <h3 className="text-xs font-semibold text-slate-500 mb-4">{t.categories}</h3>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const count = cat.key === "all"
                    ? certificates.length
                    : certificates.filter((c) => c.metal === cat.key).length;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setFilter(cat.key)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        filter === cat.key
                          ? "bg-[#BFA181]/20 text-[#BFA181] dark:text-[#BFA181]"
                          : "text-slate-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                      <span className={`ml-auto text-xs ${filter === cat.key ? "text-[#BFA181]" : "text-slate-400"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Secure Storage Info */}
              {certificates.length > 0 && (
                <div className="mt-6 p-3 bg-[#2F6F62]/10 rounded-lg border border-[#2F6F62]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-xs font-semibold text-[#2F6F62]">{t.secureStorage}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{t.secureStorageDesc}</p>
                  <p className="text-xs font-semibold text-[#2F6F62] mt-2">{certificates.length} {t.documentsAvailable}</p>
                </div>
              )}
            </div>
          </div>

          {/* Main - Documents */}
          <div className="lg:col-span-3">

            {/* Not connected state */}
            {!isConnected ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-12 text-center">
                <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 013 6v3" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">{t.connectWallet}</p>
              </div>
            ) : loading ? (
              /* Loading state */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-12 text-center">
                <div className="w-8 h-8 border-2 border-[#BFA181] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">{t.loading}</p>
              </div>
            ) : error ? (
              /* Error state */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-12 text-center">
                <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400 mb-4">{error}</p>
                <button
                  onClick={fetchCertificates}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#BFA181] rounded-lg hover:bg-[#a88e6e] transition-colors"
                >
                  {t.retry}
                </button>
              </div>
            ) : filteredDocs.length === 0 ? (
              /* Empty state */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-12 text-center">
                <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">{t.noDocuments}</p>
              </div>
            ) : (
              /* Certificate list */
              <div className="space-y-4">
                {filteredDocs.map((cert) => {
                  const metalColor = getMetalColor(cert.metal);
                  return (
                    <div
                      key={cert.id || cert.certificateNumber}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-stone-200 dark:border-slate-800 p-4 hover:border-[#BFA181]/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Metal Icon */}
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: metalColor + "15" }}
                        >
                          <svg className="w-6 h-6" style={{ color: metalColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>

                        {/* Certificate Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                            {cert.metalName} {t.allocationCertificate}
                          </h4>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            <span className="text-xs text-slate-500">
                              <span className="font-medium">{t.certificateNo}:</span>{" "}
                              <span className="font-mono">{cert.certificateNumber}</span>
                            </span>
                            <span className="text-xs text-slate-500">
                              {t.generated}: {formatDate(cert.issuedAt)}
                            </span>
                            <span className="text-xs text-slate-500">
                              {cert.grams}g · {t.purity} {cert.purity}
                            </span>
                            <span className="text-xs text-slate-500">
                              {t.vault}: {cert.vaultName || cert.vault}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => {
                              window.open(
                                `/api/certificates/pdf?certNumber=${cert.certificateNumber}&format=html`,
                                "_blank"
                              );
                            }}
                            className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-stone-100 dark:bg-slate-800 rounded-lg hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            {t.preview}
                          </button>
                          <button
                            onClick={() => {
                              window.open(
                                `/api/certificates/pdf?certNumber=${cert.certificateNumber}&format=pdf`,
                                "_blank"
                              );
                            }}
                            className="px-3 py-2 text-sm font-medium text-white bg-[#BFA181] rounded-lg hover:bg-[#a88e6e] transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            {t.download}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
