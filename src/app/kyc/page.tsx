"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useLanguage } from "@/components/LanguageContext";

// Sumsub KYC Page - Standalone page for mobile WebBrowser
// This page loads Sumsub SDK directly with token from URL params

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    missingToken: "Erişim jetonu eksik",
    invalidRequest: "Geçersiz İstek",
    missingTokenDesc: "Erişim jetonu eksik. Lütfen uygulamadan tekrar deneyin.",
    identityVerification: "Kimlik Doğrulama",
    secureVerification: "Sumsub tarafından desteklenen güvenli doğrulama",
    loadingVerification: "Doğrulama yükleniyor...",
    gdprCompliant: "KVKK Uyumlu",
    poweredByAuxite: "Auxite tarafından desteklenmektedir",
    failedInit: "Doğrulama başlatılamadı",
    verificationError: "Doğrulama hatası",
  },
  en: {
    missingToken: "Missing access token",
    invalidRequest: "Invalid Request",
    missingTokenDesc: "Missing access token. Please try again from the app.",
    identityVerification: "Identity Verification",
    secureVerification: "Secure verification powered by Sumsub",
    loadingVerification: "Loading verification...",
    gdprCompliant: "GDPR Compliant",
    poweredByAuxite: "Powered by Auxite",
    failedInit: "Failed to initialize verification",
    verificationError: "Verification error",
  },
  de: {
    missingToken: "Zugriffstoken fehlt",
    invalidRequest: "Ungültige Anfrage",
    missingTokenDesc: "Zugriffstoken fehlt. Bitte versuchen Sie es erneut über die App.",
    identityVerification: "Identitätsprüfung",
    secureVerification: "Sichere Verifizierung powered by Sumsub",
    loadingVerification: "Verifizierung wird geladen...",
    gdprCompliant: "DSGVO-konform",
    poweredByAuxite: "Bereitgestellt von Auxite",
    failedInit: "Verifizierung konnte nicht initialisiert werden",
    verificationError: "Verifizierungsfehler",
  },
  fr: {
    missingToken: "Jeton d'accès manquant",
    invalidRequest: "Requête invalide",
    missingTokenDesc: "Jeton d'accès manquant. Veuillez réessayer depuis l'application.",
    identityVerification: "Vérification d'identité",
    secureVerification: "Vérification sécurisée propulsée par Sumsub",
    loadingVerification: "Chargement de la vérification...",
    gdprCompliant: "Conforme au RGPD",
    poweredByAuxite: "Propulsé par Auxite",
    failedInit: "Échec de l'initialisation de la vérification",
    verificationError: "Erreur de vérification",
  },
  ar: {
    missingToken: "رمز الوصول مفقود",
    invalidRequest: "طلب غير صالح",
    missingTokenDesc: "رمز الوصول مفقود. يرجى المحاولة مرة أخرى من التطبيق.",
    identityVerification: "التحقق من الهوية",
    secureVerification: "تحقق آمن مدعوم من Sumsub",
    loadingVerification: "جاري تحميل التحقق...",
    gdprCompliant: "متوافق مع GDPR",
    poweredByAuxite: "مدعوم من Auxite",
    failedInit: "فشل في بدء التحقق",
    verificationError: "خطأ في التحقق",
  },
  ru: {
    missingToken: "Отсутствует токен доступа",
    invalidRequest: "Недействительный запрос",
    missingTokenDesc: "Отсутствует токен доступа. Пожалуйста, попробуйте снова из приложения.",
    identityVerification: "Проверка личности",
    secureVerification: "Безопасная верификация от Sumsub",
    loadingVerification: "Загрузка верификации...",
    gdprCompliant: "Соответствие GDPR",
    poweredByAuxite: "На платформе Auxite",
    failedInit: "Не удалось инициализировать верификацию",
    verificationError: "Ошибка верификации",
  },
};

function KYCContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const wallet = searchParams.get("wallet");
  const { lang } = useLanguage();
  const t = translations[lang] || translations.en;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!token) {
      setError(t.missingToken);
      setLoading(false);
      return;
    }

    const initSDK = async () => {
      try {
        // Check if token is a test token (starts with test_)
        if (token?.startsWith("test_")) {
          throw new Error("Sumsub is in test mode. Please configure environment variables on the server.");
        }

        // Dynamically import Sumsub SDK
        const snsWebSdk = (await import("@sumsub/websdk")).default;

        if (!containerRef.current) {
          throw new Error("Container not ready");
        }

        // Initialize SDK
        const sdk = snsWebSdk
          .init(token, async () => {
            // Token refresh - fetch new token
            if (!wallet) return token;

            try {
              const res = await fetch("/api/kyc/sumsub", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-wallet-address": wallet,
                },
                body: JSON.stringify({}),
              });
              const data = await res.json();
              return data.accessToken || token;
            } catch {
              return token;
            }
          })
          .withConf({
            theme: "dark",
            lang: lang,
          })
          .withOptions({
            addViewportTag: false,
            adaptIframeHeight: true,
          })
          .on("idCheck.onStepCompleted", (payload: any) => {
            console.log("Step completed:", payload);
          })
          .on("idCheck.onError", (error: any) => {
            console.error("SDK error:", error);
            setError(error.message || t.verificationError);
          })
          .on("idCheck.applicantStatus", (payload: any) => {
            console.log("Applicant status:", payload);
            if (payload.reviewStatus === "completed" && payload.reviewResult?.reviewAnswer === "GREEN") {
              // Verification completed successfully
              setTimeout(() => {
                window.close();
              }, 2000);
            }
          })
          .onMessage((type: string, payload: any) => {
            console.log("SDK message:", type, payload);
            if (type === "idCheck.onApplicantSubmitted") {
              // Show success message
              setError(null);
            }
          })
          .build();

        sdkInstanceRef.current = sdk;
        sdk.launch(containerRef.current);
        setLoading(false);
      } catch (err: any) {
        console.error("SDK init error:", err);
        setError(err.message || t.failedInit);
        setLoading(false);
      }
    };

    initSDK();

    return () => {
      if (sdkInstanceRef.current) {
        try {
          sdkInstanceRef.current.destroy();
        } catch (e) {
          console.error("SDK destroy error:", e);
        }
      }
    };
  }, [token, wallet, lang]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{t.invalidRequest}</h1>
          <p className="text-slate-400">{t.missingTokenDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">{t.identityVerification}</h1>
            <p className="text-xs text-slate-400">{t.secureVerification}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2F6F62]/20 rounded-full">
              <svg className="w-3.5 h-3.5 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-[10px] font-medium text-[#2F6F62]">256-bit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin w-10 h-10 border-2 border-slate-600 border-t-[#BFA181] rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">{t.loadingVerification}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Sumsub Container */}
        <div
          ref={containerRef}
          id="sumsub-websdk-container"
          className="bg-slate-900 rounded-xl min-h-[500px] overflow-hidden"
        />
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {t.gdprCompliant}
          </span>
          <span>•</span>
          <span>{t.poweredByAuxite}</span>
        </div>
      </div>
    </div>
  );
}

export default function KYCPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-slate-600 border-t-[#BFA181] rounded-full"></div>
      </div>
    }>
      <KYCContent />
    </Suspense>
  );
}
