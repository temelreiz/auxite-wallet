"use client";

import { useState } from "react";
import { useAllocationChecker } from "@/hooks/useAllocationChecker";
import { METALS } from "@/lib/metals";
import { useLanguage } from "@/components/LanguageContext";

type Props = {
  lang?: string;
};

const translations: Record<string, Record<string, string>> = {
  tr: {
    allocationTitle: "Allocation Bulucu",
    allocationSubtitle: "Cüzdan adresinizi girerek varlıklarınızın hangi allocation'larda olduğunu görün.",
    placeholder: "0x ile başlayan cüzdan adresi",
    check: "Sorgula",
    checking: "Sorgulanıyor…",
    error: "Hata:",
    enterAddress: "Cüzdan adresinizi girin.",
    noRecords: "Bu adres için allocation bulunamadı.",
    allocation: "Allocation",
    grams: "Gram:",
    custodian: "Saklayıcı:",
    purchaseTime: "Alım Tarihi",
    vault: "Kasa:",
    certTitle: "Sertifika Doğrulama",
    certSubtitle: "Sertifika numarasıyla dijital sertifikanızı doğrulayın.",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Doğrula",
    verifying: "Doğrulanıyor…",
    enterCert: "Sertifika numarasını girin.",
    certNotFound: "Sertifika bulunamadı.",
    verified: "Doğrulandı",
    notVerified: "Doğrulanmadı",
    metal: "Metal:",
    weight: "Ağırlık:",
    purity: "Saflık:",
    serialNo: "Seri No:",
    issuedAt: "Düzenlenme:",
    onChain: "Blockchain:",
    anchored: "Zincire Kayıtlı",
    pending: "Beklemede",
    viewExplorer: "Explorer'da Gör",
    viewPdf: "Sertifika PDF",
  },
  en: {
    allocationTitle: "Allocation Finder",
    allocationSubtitle: "Enter your wallet address to see which allocations hold your assets.",
    placeholder: "Wallet address starting with 0x",
    check: "Check",
    checking: "Checking…",
    error: "Error:",
    enterAddress: "Enter your wallet address.",
    noRecords: "No allocations found for this address.",
    allocation: "Allocation",
    grams: "Grams:",
    custodian: "Custodian:",
    purchaseTime: "Purchase Time",
    vault: "Vault:",
    certTitle: "Certificate Verifier",
    certSubtitle: "Verify your digital certificate by entering the certificate number.",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Verify",
    verifying: "Verifying…",
    enterCert: "Enter a certificate number.",
    certNotFound: "Certificate not found.",
    verified: "Verified",
    notVerified: "Not Verified",
    metal: "Metal:",
    weight: "Weight:",
    purity: "Purity:",
    serialNo: "Serial No:",
    issuedAt: "Issued:",
    onChain: "Blockchain:",
    anchored: "Anchored On-Chain",
    pending: "Pending",
    viewExplorer: "View on Explorer",
    viewPdf: "Certificate PDF",
  },
  de: {
    allocationTitle: "Allokationsfinder",
    allocationSubtitle: "Geben Sie Ihre Wallet-Adresse ein, um Ihre Allokationen zu sehen.",
    placeholder: "Wallet-Adresse beginnend mit 0x",
    check: "Prüfen",
    checking: "Wird geprüft…",
    error: "Fehler:",
    enterAddress: "Geben Sie Ihre Wallet-Adresse ein.",
    noRecords: "Keine Allokationen gefunden.",
    allocation: "Allokation",
    grams: "Gramm:",
    custodian: "Verwahrer:",
    purchaseTime: "Kaufzeit",
    vault: "Tresor:",
    certTitle: "Zertifikatsprüfung",
    certSubtitle: "Überprüfen Sie Ihr Zertifikat durch Eingabe der Nummer.",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Prüfen",
    verifying: "Wird geprüft…",
    enterCert: "Geben Sie eine Zertifikatsnummer ein.",
    certNotFound: "Zertifikat nicht gefunden.",
    verified: "Verifiziert",
    notVerified: "Nicht verifiziert",
    metal: "Metall:",
    weight: "Gewicht:",
    purity: "Reinheit:",
    serialNo: "Seriennr.:",
    issuedAt: "Ausgestellt:",
    onChain: "Blockchain:",
    anchored: "On-Chain verankert",
    pending: "Ausstehend",
    viewExplorer: "Im Explorer ansehen",
    viewPdf: "Zertifikat PDF",
  },
  fr: {
    allocationTitle: "Recherche d'Allocation",
    allocationSubtitle: "Entrez votre adresse pour voir vos allocations.",
    placeholder: "Adresse commençant par 0x",
    check: "Vérifier",
    checking: "Vérification…",
    error: "Erreur:",
    enterAddress: "Entrez votre adresse.",
    noRecords: "Aucune allocation trouvée.",
    allocation: "Allocation",
    grams: "Grammes:",
    custodian: "Dépositaire:",
    purchaseTime: "Date d'achat",
    vault: "Coffre:",
    certTitle: "Vérificateur de Certificat",
    certSubtitle: "Vérifiez votre certificat en entrant le numéro.",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Vérifier",
    verifying: "Vérification…",
    enterCert: "Entrez un numéro de certificat.",
    certNotFound: "Certificat non trouvé.",
    verified: "Vérifié",
    notVerified: "Non vérifié",
    metal: "Métal:",
    weight: "Poids:",
    purity: "Pureté:",
    serialNo: "N° série:",
    issuedAt: "Émis le:",
    onChain: "Blockchain:",
    anchored: "Ancré on-chain",
    pending: "En attente",
    viewExplorer: "Voir sur Explorer",
    viewPdf: "Certificat PDF",
  },
  ar: {
    allocationTitle: "باحث التخصيص",
    allocationSubtitle: "أدخل عنوان محفظتك لمعرفة التخصيصات.",
    placeholder: "عنوان يبدأ بـ 0x",
    check: "تحقق",
    checking: "جاري التحقق…",
    error: "خطأ:",
    enterAddress: "أدخل عنوان محفظتك.",
    noRecords: "لم يتم العثور على تخصيصات.",
    allocation: "التخصيص",
    grams: "جرام:",
    custodian: "الأمين:",
    purchaseTime: "وقت الشراء",
    vault: "الخزنة:",
    certTitle: "التحقق من الشهادة",
    certSubtitle: "تحقق من شهادتك بإدخال الرقم.",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "تحقق",
    verifying: "جاري التحقق…",
    enterCert: "أدخل رقم الشهادة.",
    certNotFound: "الشهادة غير موجودة.",
    verified: "تم التحقق",
    notVerified: "لم يتم التحقق",
    metal: "المعدن:",
    weight: "الوزن:",
    purity: "النقاء:",
    serialNo: "الرقم التسلسلي:",
    issuedAt: "صدرت في:",
    onChain: "البلوكتشين:",
    anchored: "مثبت على السلسلة",
    pending: "قيد الانتظار",
    viewExplorer: "عرض في المستكشف",
    viewPdf: "شهادة PDF",
  },
  ru: {
    allocationTitle: "Поиск Распределения",
    allocationSubtitle: "Введите адрес кошелька, чтобы увидеть распределения.",
    placeholder: "Адрес начинающийся с 0x",
    check: "Проверить",
    checking: "Проверка…",
    error: "Ошибка:",
    enterAddress: "Введите адрес кошелька.",
    noRecords: "Распределения не найдены.",
    allocation: "Распределение",
    grams: "Граммы:",
    custodian: "Хранитель:",
    purchaseTime: "Время покупки",
    vault: "Хранилище:",
    certTitle: "Проверка Сертификата",
    certSubtitle: "Проверьте сертификат, введя номер.",
    certPlaceholder: "AUX-CERT-2025-XXXXXX",
    verify: "Проверить",
    verifying: "Проверка…",
    enterCert: "Введите номер сертификата.",
    certNotFound: "Сертификат не найден.",
    verified: "Подтверждено",
    notVerified: "Не подтверждено",
    metal: "Металл:",
    weight: "Вес:",
    purity: "Чистота:",
    serialNo: "Серийный №:",
    issuedAt: "Выдан:",
    onChain: "Блокчейн:",
    anchored: "Закреплен в блокчейне",
    pending: "Ожидание",
    viewExplorer: "Смотреть в Explorer",
    viewPdf: "Сертификат PDF",
  },
};

export default function AssetCheckerPanel({ lang: propLang }: Props) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const t = translations[lang] || translations.en;

  const [addressInput, setAddressInput] = useState("");
  const [activeAddress, setActiveAddress] = useState<string | undefined>();
  const { records, loading: allocLoading, error: allocError } = useAllocationChecker(activeAddress);

  const [certInput, setCertInput] = useState("");
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState("");
  const [certResult, setCertResult] = useState<any>(null);

  const handleAddressSearch = () => {
    const trimmed = addressInput.trim();
    if (trimmed) setActiveAddress(trimmed);
  };

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
      setCertError(t.error);
    } finally {
      setCertLoading(false);
    }
  };

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(addressInput.trim());
  const isValidCert = certInput.trim().length > 5;

  const getMetalLabel = (id: string) => {
    const m = METALS.find((x) => x.id === id);
    return m ? m.symbol : id;
  };

  const locale = lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US";

  const formatDate = (ts: bigint | string) => {
    const d = typeof ts === "string" ? new Date(ts) : new Date(Number(ts) * 1000);
    return d.toLocaleDateString(locale);
  };

  const getPdfUrl = (certNum: string) => `/api/certificates/pdf?certNumber=${certNum}&format=html`;

  return (
    <section className="mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* LEFT: Allocation Finder */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#2F6F62] dark:text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{t.allocationTitle}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.allocationSubtitle}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#BFA181]/60"
              placeholder={t.placeholder}
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddressSearch()}
            />
            <button
              onClick={handleAddressSearch}
              disabled={!isValidAddress || allocLoading}
              className={"rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap " + (isValidAddress && !allocLoading ? "bg-[#2F6F62] text-white hover:bg-[#2F6F62]" : "cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-400")}
            >
              {allocLoading ? t.checking : t.check}
            </button>
          </div>

          <div className="min-h-[120px]">
            {allocError && <p className="text-xs text-red-500">{t.error} {allocError}</p>}
            {!activeAddress && !allocError && <p className="text-[11px] text-slate-400">{t.enterAddress}</p>}
            {activeAddress && !allocLoading && records.length === 0 && !allocError && <p className="text-[11px] text-slate-400">{t.noRecords}</p>}
            {records.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {records.map((r) => (
                  <div key={`${r.metalId}-${r.id.toString()}`} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-white">{getMetalLabel(r.metalId)} · #{r.id.toString()}</span>
                      <p className="text-[10px] text-slate-500">{r.grams.toString()}g · {r.custodian || "-"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">{t.purchaseTime}</p>
                      <p className="text-[10px] font-mono text-slate-600 dark:text-slate-300">{formatDate(r.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Certificate Verifier */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#BFA181]/15 dark:bg-[#BFA181]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#BFA181] dark:text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{t.certTitle}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.certSubtitle}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#BFA181]/60 uppercase"
              placeholder={t.certPlaceholder}
              value={certInput}
              onChange={(e) => setCertInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleCertVerify()}
            />
            <button
              onClick={handleCertVerify}
              disabled={!isValidCert || certLoading}
              className={"rounded-xl px-4 py-2 text-xs font-semibold transition whitespace-nowrap " + (isValidCert && !certLoading ? "bg-[#2F6F62] text-white hover:bg-[#2F6F62]" : "cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-400")}
            >
              {certLoading ? t.verifying : t.verify}
            </button>
          </div>

          <div className="min-h-[120px]">
            {certError && <p className="text-xs text-red-500">{certError}</p>}
            {!certResult && !certError && <p className="text-[11px] text-slate-400">{t.enterCert}</p>}
            {certResult && certResult.verified && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${certResult.blockchain?.anchored ? "bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]" : "bg-[#BFA181]/15 dark:bg-[#BFA181]/20 text-[#BFA181] dark:text-[#BFA181]"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${certResult.blockchain?.anchored ? "bg-[#2F6F62]" : "bg-[#BFA181]"}`} />
                    {certResult.blockchain?.anchored ? t.anchored : t.pending}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-1.5">
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
                    <span className="text-slate-500">{t.vault}</span>
                    <span className="text-slate-800 dark:text-white">{certResult.certificate.vaultName}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-500">{t.issuedAt}</span>
                    <span className="text-slate-800 dark:text-white">{formatDate(certResult.certificate.issuedAt)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {certResult.blockchain?.explorerUrl && (
                    <a href={certResult.blockchain.explorerUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {t.viewExplorer}
                    </a>
                  )}
                  <a href={getPdfUrl(certResult.certificate.certificateNumber)} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#BFA181]/15 dark:bg-[#BFA181]/20 text-[10px] font-medium text-[#BFA181] dark:text-[#BFA181] hover:bg-[#BFA181]/20 dark:hover:bg-[#BFA181]/30 transition">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    </section>
  );
}
