"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TopNav from "@/components/TopNav";
import { useLanguage } from "@/components/LanguageContext";

const translations = {
  en: {
    certificateVerification: "Certificate Verification",
    verifySubtitle: "Verify the authenticity of your Auxite precious metal certificate",
    certificateNumber: "Certificate Number",
    verifying: "Verifying...",
    verify: "Verify",
    verificationFailed: "Verification failed. Please try again.",
    certificateVerified: "Certificate Verified ✓",
    certificateNotFound: "Certificate Not Found",
    verifiedAt: "Verified at",
    certificateDetails: "Certificate Details",
    certificateNo: "Certificate No.",
    ownerID: "Owner ID",
    metal: "Metal",
    weight: "Weight",
    serialNumber: "Serial Number",
    purity: "Purity",
    vaultLocation: "Vault Location",
    issueDate: "Issue Date",
    issuer: "Issuer",
    blockchainVerification: "Blockchain Verification",
    anchoredOnChain: "Anchored on-chain",
    pendingOnChain: "Pending on-chain anchor",
    certificateHash: "Certificate Hash",
    chain: "Chain",
    aboutCertVerification: "About Certificate Verification",
    aboutCertDescription: "Each Auxite certificate is cryptographically hashed and anchored on the Base blockchain. This provides immutable proof of ownership and authenticity for your precious metal holdings.",
    loading: "Loading...",
  },
  tr: {
    certificateVerification: "Sertifika Doğrulama",
    verifySubtitle: "Auxite değerli metal sertifikanızın özgünlüğünü doğrulayın",
    certificateNumber: "Sertifika Numarası",
    verifying: "Doğrulanıyor...",
    verify: "Doğrula",
    verificationFailed: "Doğrulama başarısız oldu. Lütfen tekrar deneyin.",
    certificateVerified: "Sertifika Doğrulandı ✓",
    certificateNotFound: "Sertifika Bulunamadı",
    verifiedAt: "Doğrulanma zamanı",
    certificateDetails: "Sertifika Detayları",
    certificateNo: "Sertifika No.",
    ownerID: "Sahip ID",
    metal: "Metal",
    weight: "Ağırlık",
    serialNumber: "Seri Numarası",
    purity: "Saflık",
    vaultLocation: "Kasa Konumu",
    issueDate: "Düzenlenme Tarihi",
    issuer: "Düzenleyen",
    blockchainVerification: "Blockchain Doğrulama",
    anchoredOnChain: "Zincir üzerinde sabitlendi",
    pendingOnChain: "Zincir üzerinde sabitleme bekliyor",
    certificateHash: "Sertifika Hash",
    chain: "Zincir",
    aboutCertVerification: "Sertifika Doğrulama Hakkında",
    aboutCertDescription: "Her Auxite sertifikası kriptografik olarak hashlenir ve Base blok zincirine sabitlenir. Bu, değerli metal varlıklarınız için değiştirilemez mülkiyet ve özgünlük kanıtı sağlar.",
    loading: "Yükleniyor...",
  },
  de: {
    certificateVerification: "Zertifikatsüberprüfung",
    verifySubtitle: "Überprüfen Sie die Echtheit Ihres Auxite-Edelmetallzertifikats",
    certificateNumber: "Zertifikatsnummer",
    verifying: "Überprüfung...",
    verify: "Überprüfen",
    verificationFailed: "Überprüfung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    certificateVerified: "Zertifikat verifiziert ✓",
    certificateNotFound: "Zertifikat nicht gefunden",
    verifiedAt: "Verifiziert am",
    certificateDetails: "Zertifikatsdetails",
    certificateNo: "Zertifikat-Nr.",
    ownerID: "Eigentümer-ID",
    metal: "Metall",
    weight: "Gewicht",
    serialNumber: "Seriennummer",
    purity: "Reinheit",
    vaultLocation: "Tresorstandort",
    issueDate: "Ausstellungsdatum",
    issuer: "Aussteller",
    blockchainVerification: "Blockchain-Verifizierung",
    anchoredOnChain: "On-Chain verankert",
    pendingOnChain: "On-Chain-Verankerung ausstehend",
    certificateHash: "Zertifikats-Hash",
    chain: "Kette",
    aboutCertVerification: "Über die Zertifikatsüberprüfung",
    aboutCertDescription: "Jedes Auxite-Zertifikat wird kryptografisch gehasht und auf der Base-Blockchain verankert. Dies bietet einen unveränderlichen Eigentums- und Echtheitsnachweis für Ihre Edelmetallbestände.",
    loading: "Laden...",
  },
  fr: {
    certificateVerification: "Vérification du certificat",
    verifySubtitle: "Vérifiez l'authenticité de votre certificat de métal précieux Auxite",
    certificateNumber: "Numéro de certificat",
    verifying: "Vérification...",
    verify: "Vérifier",
    verificationFailed: "La vérification a échoué. Veuillez réessayer.",
    certificateVerified: "Certificat vérifié ✓",
    certificateNotFound: "Certificat introuvable",
    verifiedAt: "Vérifié le",
    certificateDetails: "Détails du certificat",
    certificateNo: "N° de certificat",
    ownerID: "ID du propriétaire",
    metal: "Métal",
    weight: "Poids",
    serialNumber: "Numéro de série",
    purity: "Pureté",
    vaultLocation: "Emplacement du coffre",
    issueDate: "Date d'émission",
    issuer: "Émetteur",
    blockchainVerification: "Vérification blockchain",
    anchoredOnChain: "Ancré sur la chaîne",
    pendingOnChain: "Ancrage sur la chaîne en attente",
    certificateHash: "Hash du certificat",
    chain: "Chaîne",
    aboutCertVerification: "À propos de la vérification des certificats",
    aboutCertDescription: "Chaque certificat Auxite est haché cryptographiquement et ancré sur la blockchain Base. Cela fournit une preuve immuable de propriété et d'authenticité pour vos avoirs en métaux précieux.",
    loading: "Chargement...",
  },
  ar: {
    certificateVerification: "التحقق من الشهادة",
    verifySubtitle: "تحقق من صحة شهادة المعادن الثمينة الخاصة بك من Auxite",
    certificateNumber: "رقم الشهادة",
    verifying: "جارٍ التحقق...",
    verify: "تحقق",
    verificationFailed: "فشل التحقق. يرجى المحاولة مرة أخرى.",
    certificateVerified: "تم التحقق من الشهادة ✓",
    certificateNotFound: "الشهادة غير موجودة",
    verifiedAt: "تم التحقق في",
    certificateDetails: "تفاصيل الشهادة",
    certificateNo: "رقم الشهادة",
    ownerID: "معرّف المالك",
    metal: "المعدن",
    weight: "الوزن",
    serialNumber: "الرقم التسلسلي",
    purity: "النقاء",
    vaultLocation: "موقع الخزنة",
    issueDate: "تاريخ الإصدار",
    issuer: "الجهة المصدرة",
    blockchainVerification: "التحقق عبر البلوكتشين",
    anchoredOnChain: "مثبّت على السلسلة",
    pendingOnChain: "في انتظار التثبيت على السلسلة",
    certificateHash: "هاش الشهادة",
    chain: "السلسلة",
    aboutCertVerification: "حول التحقق من الشهادات",
    aboutCertDescription: "يتم تشفير كل شهادة Auxite بتجزئة مشفرة وتثبيتها على بلوكتشين Base. يوفر هذا إثباتًا غير قابل للتغيير للملكية والأصالة لحيازاتك من المعادن الثمينة.",
    loading: "جارٍ التحميل...",
  },
  ru: {
    certificateVerification: "Проверка сертификата",
    verifySubtitle: "Проверьте подлинность вашего сертификата на драгоценные металлы Auxite",
    certificateNumber: "Номер сертификата",
    verifying: "Проверка...",
    verify: "Проверить",
    verificationFailed: "Проверка не удалась. Пожалуйста, попробуйте снова.",
    certificateVerified: "Сертификат подтверждён ✓",
    certificateNotFound: "Сертификат не найден",
    verifiedAt: "Проверено в",
    certificateDetails: "Детали сертификата",
    certificateNo: "Сертификат №",
    ownerID: "ID владельца",
    metal: "Металл",
    weight: "Вес",
    serialNumber: "Серийный номер",
    purity: "Чистота",
    vaultLocation: "Расположение хранилища",
    issueDate: "Дата выдачи",
    issuer: "Эмитент",
    blockchainVerification: "Верификация блокчейна",
    anchoredOnChain: "Закреплено в блокчейне",
    pendingOnChain: "Ожидает закрепления в блокчейне",
    certificateHash: "Хеш сертификата",
    chain: "Сеть",
    aboutCertVerification: "О проверке сертификатов",
    aboutCertDescription: "Каждый сертификат Auxite криптографически хешируется и закрепляется в блокчейне Base. Это обеспечивает неизменяемое доказательство владения и подлинности ваших драгоценных металлов.",
    loading: "Загрузка...",
  },
};

function VerifyContent() {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const searchParams = useSearchParams();
  const initialCert = searchParams.get("cert") || "";

  const [certNumber, setCertNumber] = useState(initialCert);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCert) {
      handleVerify();
    }
  }, []);

  const handleVerify = async () => {
    if (!certNumber.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/certificates/verify?certNumber=${encodeURIComponent(certNumber)}`);
      const data = await res.json();
      if (data.error && !data.verified) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(t("verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-[#2F6F62]/20 dark:bg-[#2F6F62]/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{t("certificateVerification")}</h1>
        <p className="text-slate-600 dark:text-slate-400">{t("verifySubtitle")}</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t("certificateNumber")}</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value.toUpperCase())}
            placeholder="AUX-CERT-2025-XXXXXX"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#BFA181] focus:border-transparent"
            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          />
          <button 
            onClick={handleVerify} 
            disabled={loading || !certNumber.trim()} 
            className="px-6 py-3 bg-[#2F6F62] hover:bg-[#2F6F62] disabled:bg-slate-400 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? t("verifying") : t("verify")}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className={`rounded-2xl p-6 ${result.verified ? 'bg-[#2F6F62]/10 dark:bg-[#2F6F62]/20 border border-[#2F6F62]/30 dark:border-[#2F6F62]/30' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${result.verified ? 'bg-[#2F6F62]' : 'bg-red-500'}`}>
                {result.verified ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className={`text-xl font-bold ${result.verified ? 'text-[#2F6F62] dark:text-[#2F6F62]' : 'text-red-700 dark:text-red-400'}`}>
                  {result.verified ? t("certificateVerified") : t("certificateNotFound")}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  {t("verifiedAt")} {new Date(result.verifiedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {result.verified && result.certificate && (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-gradient-to-r from-[#2F6F62] to-[#2F6F62] p-4">
                  <h3 className="text-white font-bold text-lg">{t("certificateDetails")}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("certificateNo")}</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-white">{result.certificate.certificateNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("ownerID")}</p>
                      <p className="font-mono text-slate-800 dark:text-white">{result.certificate.userUid}</p>
                    </div>
                  </div>
                  
                  <hr className="border-slate-200 dark:border-slate-700" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("metal")}</p>
                      <p className="font-bold text-slate-800 dark:text-white">{result.certificate.metalName} ({result.certificate.metal})</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("weight")}</p>
                      <p className="font-bold text-slate-800 dark:text-white">{result.certificate.grams}g</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("serialNumber")}</p>
                      <p className="font-mono text-slate-800 dark:text-white text-sm">{result.certificate.serialNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("purity")}</p>
                      <p className="text-slate-800 dark:text-white">{result.certificate.purity}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("vaultLocation")}</p>
                      <p className="text-slate-800 dark:text-white">{result.certificate.vaultName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("issueDate")}</p>
                      <p className="text-slate-800 dark:text-white">{new Date(result.certificate.issuedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <hr className="border-slate-200 dark:border-slate-700" />
                  
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{t("issuer")}</p>
                    <p className="text-slate-800 dark:text-white">{result.certificate.issuer}</p>
                  </div>
                </div>
              </div>

              {result.blockchain && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {t("blockchainVerification")}
                    </h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${result.blockchain.anchored ? 'bg-[#2F6F62]' : 'bg-[#BFA181]'}`} />
                      <span className={`font-medium ${result.blockchain.anchored ? 'text-[#2F6F62] dark:text-[#2F6F62]' : 'text-[#BFA181] dark:text-[#BFA181]'}`}>
                        {result.blockchain.anchored ? t("anchoredOnChain") : t("pendingOnChain")}
                      </span>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">{t("certificateHash")}</p>
                      <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all bg-slate-50 dark:bg-slate-800 p-2 rounded">
                        {result.blockchain.hash}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">{t("chain")}</p>
                      <p className="text-slate-800 dark:text-white">{result.blockchain.chain}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-8 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
        <h4 className="font-medium text-slate-800 dark:text-white mb-2">{t("aboutCertVerification")}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t("aboutCertDescription")}
        </p>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  return (
    <div className="min-h-screen bg-stone-100 dark:bg-slate-950">
      <TopNav />
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="text-slate-500">{t("loading")}</div></div>}>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
