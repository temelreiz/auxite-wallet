"use client";
import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@/components/WalletContext";
import Image from "next/image";

interface AllocationFinderProps {
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const metalIcons: Record<string, string> = {
  AUXG: "/images/metals/gold.png",
  AUXS: "/images/metals/silver.png",
  AUXPT: "/images/metals/platinum.png",
  AUXPD: "/images/metals/palladium.png",
};

const metalColors: Record<string, string> = {
  AUXG: "text-amber-500",
  AUXS: "text-slate-400",
  AUXPT: "text-blue-400",
  AUXPD: "text-purple-400",
};

const metalBorders: Record<string, string> = {
  AUXG: "border-amber-500 bg-amber-500/10",
  AUXS: "border-slate-400 bg-slate-400/10",
  AUXPT: "border-blue-400 bg-blue-400/10",
  AUXPD: "border-purple-400 bg-purple-400/10",
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    allocationTitle: "📍 Allocation Bulucu",
    allocationSubtitle: "Kayıtlı fiziksel metal varlıklarınız",
    noRecords: "Henüz varlık kaydı yok",
    noMetalRecords: "Bu metal için kayıt yok",
    records: "kayıt",
    loading: "Yükleniyor...",
    grams: "g",
    vault: "Kasa:",
    all: "Tümü",
    certTitle: "🔐 Mülkiyet Sertifikası Doğrulama",
    certSubtitle: "Dijital mülkiyet sertifikanızı doğrulayın",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Doğrula",
    verifying: "Doğrulanıyor...",
    enterCert: "Sertifika numarasını girin",
    certNotFound: "Sertifika bulunamadı",
    metal: "Metal:",
    weight: "Ağırlık:",
    purity: "Saflık:",
    issuedAt: "Düzenlenme:",
    anchored: "Blockchain'de Kayıtlı",
    pending: "Beklemede",
    viewExplorer: "Explorer'da Gör",
    viewPdf: "Mülkiyet Sertifikası PDF",
    gold: "Altın",
    silver: "Gümüş",
    platinum: "Platin",
    palladium: "Paladyum",
  },
  en: {
    allocationTitle: "📍 Allocation Finder",
    allocationSubtitle: "Your registered physical metal assets",
    noRecords: "No asset records yet",
    noMetalRecords: "No records for this metal",
    records: "records",
    loading: "Loading...",
    grams: "g",
    vault: "Vault:",
    all: "All",
    certTitle: "🔐 Ownership Certificate Verifier",
    certSubtitle: "Verify your digital ownership certificate",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Verify",
    verifying: "Verifying...",
    enterCert: "Enter certificate number",
    certNotFound: "Certificate not found",
    metal: "Metal:",
    weight: "Weight:",
    purity: "Purity:",
    issuedAt: "Issued:",
    anchored: "Anchored On-Chain",
    pending: "Pending",
    viewExplorer: "View on Explorer",
    viewPdf: "Ownership Certificate PDF",
    gold: "Gold",
    silver: "Silver",
    platinum: "Platinum",
    palladium: "Palladium",
  },
  de: {
    allocationTitle: "📍 Allokationsfinder",
    allocationSubtitle: "Ihre registrierten Metallbestände",
    noRecords: "Noch keine Aufzeichnungen",
    noMetalRecords: "Keine Einträge für dieses Metall",
    records: "Einträge",
    loading: "Wird geladen...",
    grams: "g",
    vault: "Tresor:",
    all: "Alle",
    certTitle: "🔐 Zertifikatsprüfung",
    certSubtitle: "Zertifikat überprüfen",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Prüfen",
    verifying: "Wird geprüft...",
    enterCert: "Zertifikatsnummer eingeben",
    certNotFound: "Zertifikat nicht gefunden",
    metal: "Metall:",
    weight: "Gewicht:",
    purity: "Reinheit:",
    issuedAt: "Ausgestellt:",
    anchored: "On-Chain verankert",
    pending: "Ausstehend",
    viewExplorer: "Im Explorer ansehen",
    viewPdf: "Zertifikat PDF",
    gold: "Gold",
    silver: "Silber",
    platinum: "Platin",
    palladium: "Palladium",
  },
  fr: {
    allocationTitle: "📍 Recherche d'Allocation",
    allocationSubtitle: "Vos actifs métalliques enregistrés",
    noRecords: "Aucun enregistrement",
    noMetalRecords: "Aucun enregistrement pour ce métal",
    records: "enregistrements",
    loading: "Chargement...",
    grams: "g",
    vault: "Coffre:",
    all: "Tous",
    certTitle: "🔐 Vérificateur de Certificat",
    certSubtitle: "Vérifiez votre certificat",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Vérifier",
    verifying: "Vérification...",
    enterCert: "Entrez le numéro",
    certNotFound: "Certificat non trouvé",
    metal: "Métal:",
    weight: "Poids:",
    purity: "Pureté:",
    issuedAt: "Émis le:",
    anchored: "Ancré on-chain",
    pending: "En attente",
    viewExplorer: "Voir sur Explorer",
    viewPdf: "Certificat PDF",
    gold: "Or",
    silver: "Argent",
    platinum: "Platine",
    palladium: "Palladium",
  },
  ar: {
    allocationTitle: "📍 باحث التخصيص",
    allocationSubtitle: "أصولك المعدنية المسجلة",
    noRecords: "لا توجد سجلات",
    noMetalRecords: "لا توجد سجلات لهذا المعدن",
    records: "سجلات",
    loading: "جاري التحميل...",
    grams: "جرام",
    vault: "الخزنة:",
    all: "الكل",
    certTitle: "🔐 التحقق من الشهادة",
    certSubtitle: "تحقق من شهادتك",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "تحقق",
    verifying: "جاري التحقق...",
    enterCert: "أدخل رقم الشهادة",
    certNotFound: "الشهادة غير موجودة",
    metal: "المعدن:",
    weight: "الوزن:",
    purity: "النقاء:",
    issuedAt: "صدرت في:",
    anchored: "مثبت على السلسلة",
    pending: "قيد الانتظار",
    viewExplorer: "عرض في المستكشف",
    viewPdf: "شهادة PDF",
    gold: "ذهب",
    silver: "فضة",
    platinum: "بلاتين",
    palladium: "بالاديوم",
  },
  ru: {
    allocationTitle: "📍 Поиск Распределения",
    allocationSubtitle: "Ваши зарегистрированные активы",
    noRecords: "Записей пока нет",
    noMetalRecords: "Нет записей для этого металла",
    records: "записей",
    loading: "Загрузка...",
    grams: "г",
    vault: "Хранилище:",
    all: "Все",
    certTitle: "🔐 Проверка Сертификата",
    certSubtitle: "Проверьте ваш сертификат",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Проверить",
    verifying: "Проверка...",
    enterCert: "Введите номер",
    certNotFound: "Сертификат не найден",
    metal: "Металл:",
    weight: "Вес:",
    purity: "Чистота:",
    issuedAt: "Выдан:",
    anchored: "Закреплен в блокчейне",
    pending: "Ожидание",
    viewExplorer: "Смотреть в Explorer",
    viewPdf: "Сертификат PDF",
    gold: "Золото",
    silver: "Серебро",
    platinum: "Платина",
    palladium: "Палладий",
  },
};

export default function AllocationFinder({ lang = "en" }: AllocationFinderProps) {
  const t = translations[lang] || translations.en;
  const { address } = useWallet();

  // Allocation state
  const [allocations, setAllocations] = useState<any[]>([]);
  const [allocLoading, setAllocLoading] = useState(false);
  const [selectedMetal, setSelectedMetal] = useState<string | null>(null);

  // Certificate state
  const [certInput, setCertInput] = useState("");
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState("");
  const [certResult, setCertResult] = useState<any>(null);

  // Fetch allocations from API
  useEffect(() => {
    if (!address) {
      setAllocations([]);
      return;
    }

    const fetchAllocations = async () => {
      setAllocLoading(true);
      try {
        const res = await fetch(`/api/allocations?address=${address}`);
        const data = await res.json();
        if (data.allocations) {
          setAllocations(data.allocations);
        }
      } catch (err) {
        console.error("Failed to fetch allocations:", err);
      } finally {
        setAllocLoading(false);
      }
    };

    fetchAllocations();
  }, [address]);

  const handleCertVerify = async () => {
    const trimmed = certInput.trim().toUpperCase();
    if (!trimmed) return;
    setCertLoading(true);
    setCertError("");
    setCertResult(null);
    try {
      const res = await fetch(`/api/certificates/verify?certNumber=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.verified) {
        setCertResult(data);
      } else {
        setCertError(data.error || t.certNotFound);
      }
    } catch {
      setCertError("Error");
    } finally {
      setCertLoading(false);
    }
  };

  const isValidCert = certInput.trim().length > 5;

  const locale = lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US";

  const formatDate = (ts: number | string) => {
    if (!ts) return "-";
    const d = typeof ts === "string" ? new Date(ts) : new Date(ts * 1000);
    return d.toLocaleDateString(locale);
  };

  // Metal summaries
  const metalSummary = useMemo(() => {
    const summary: Record<string, { grams: number; count: number }> = {
      AUXG: { grams: 0, count: 0 },
      AUXS: { grams: 0, count: 0 },
      AUXPT: { grams: 0, count: 0 },
      AUXPD: { grams: 0, count: 0 },
    };
    allocations.forEach((a: any) => {
      const metal = a.metal || "AUXG";
      if (summary[metal]) {
        summary[metal].grams += parseFloat(a.grams) || 0;
        summary[metal].count += 1;
      }
    });
    return summary;
  }, [allocations]);

  // Filtered allocations based on selected metal
  const filteredAllocations = useMemo(() => {
    if (!selectedMetal) return allocations;
    return allocations.filter((a: any) => a.metal === selectedMetal);
  }, [allocations, selectedMetal]);

  const getPdfUrl = (certNum: string) => `/api/certificates/pdf?certNumber=${certNum}&format=html`;

  const metalNames: Record<string, string> = {
    AUXG: t.gold,
    AUXS: t.silver,
    AUXPT: t.platinum,
    AUXPD: t.palladium,
  };

  const handleMetalClick = (metal: string) => {
    if (selectedMetal === metal) {
      setSelectedMetal(null); // Deselect if already selected
    } else {
      setSelectedMetal(metal);
    }
  };

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Allocation Finder */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t.allocationTitle}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.allocationSubtitle}</p>
            </div>
            {selectedMetal && (
              <button
                onClick={() => setSelectedMetal(null)}
                className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                {t.all} ✕
              </button>
            )}
          </div>

          {/* Metal Summary Cards - Clickable */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {(["AUXG", "AUXS", "AUXPT", "AUXPD"] as const).map((metal) => {
              const isSelected = selectedMetal === metal;
              const hasRecords = metalSummary[metal].count > 0;
              
              return (
                <button
                  key={metal}
                  onClick={() => handleMetalClick(metal)}
                  className={`rounded-xl p-2 text-center border transition-all duration-200 ${
                    isSelected
                      ? metalBorders[metal]
                      : hasRecords
                      ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500 hover:bg-emerald-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600"
                  } ${hasRecords ? "" : "opacity-70"}`}
                  
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Image src={metalIcons[metal]} alt={metal} width={16} height={16} />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{metalNames[metal]}</span>
                  </div>
                  <p className={`text-sm font-bold ${metalColors[metal]}`}>
                    {metalSummary[metal].grams.toFixed(0)} {t.grams}
                  </p>
                  <p className="text-[9px] text-slate-400">{metalSummary[metal].count} {t.records}</p>
                  {isSelected && (
                    <div className={`w-full h-0.5 mt-1 rounded-full ${metalColors[metal].replace('text-', 'bg-')}`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Allocation List */}
          <div className="min-h-[140px] max-h-[220px] overflow-y-auto">
            {allocLoading ? (
              <p className="text-xs text-slate-400 text-center py-6">{t.loading}</p>
            ) : filteredAllocations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                {selectedMetal ? t.noMetalRecords : t.noRecords}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredAllocations.slice(0, 10).map((a: any, idx: number) => (
                  <div 
                    key={a.id || idx} 
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 transition-colors ${
                      selectedMetal === a.metal 
                        ? `${metalBorders[a.metal]} border-opacity-50` 
                        : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Image src={metalIcons[a.metal] || metalIcons.AUXG} alt={a.metal} width={20} height={20} />
                      <div>
                        <span className={`text-xs font-semibold ${metalColors[a.metal] || "text-slate-800 dark:text-white"}`}>
                          {a.metal}
                        </span>
                        <p className="text-[10px] text-slate-500">{parseFloat(a.grams).toFixed(2)}{t.grams} · {a.vaultName || a.vault || "-"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 truncate max-w-[100px]">{a.serialNumber || "-"}</p>
                      <p className="text-[9px] text-slate-500">{formatDate(a.allocatedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Certificate Verifier */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t.certTitle}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.certSubtitle}</p>
            </div>
          </div>

          {/* Certificate Input */}
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/60 uppercase"
              placeholder={t.certPlaceholder}
              value={certInput}
              onChange={(e) => setCertInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCertVerify()}
            />
            <button
              onClick={handleCertVerify}
              disabled={!isValidCert || certLoading}
              className={"rounded-xl px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap " + (isValidCert && !certLoading ? "bg-amber-500 text-white hover:bg-amber-400" : "cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-400")}
            >
              {certLoading ? t.verifying : t.verify}
            </button>
          </div>

          {/* Certificate Result */}
          <div className="min-h-[180px]">
            {certError && <p className="text-xs text-red-500 text-center py-4">{certError}</p>}
            
            {!certResult && !certError && (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[11px] text-slate-400">{t.enterCert}</p>
              </div>
            )}

            {certResult && certResult.verified && (
              <div className="space-y-3">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${certResult.blockchain?.anchored ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"}`}>
                    <div className={`w-2 h-2 rounded-full ${certResult.blockchain?.anchored ? "bg-emerald-500" : "bg-amber-500"}`} />
                    {certResult.blockchain?.anchored ? t.anchored : t.pending}
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t.metal}</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{certResult.certificate.metalName} ({certResult.certificate.metal})</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t.weight}</span>
                    <span className="font-semibold text-slate-800 dark:text-white">{certResult.certificate.grams}g</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t.purity}</span>
                    <span className="text-slate-800 dark:text-white">{certResult.certificate.purity}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t.issuedAt}</span>
                    <span className="text-slate-800 dark:text-white">{formatDate(certResult.certificate.issuedAt)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {certResult.blockchain?.explorerUrl && (
                    <a href={certResult.blockchain.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {t.viewExplorer}
                    </a>
                  )}
                  <a href={getPdfUrl(certResult.certificate.certificateNumber)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-[10px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t.viewPdf}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
