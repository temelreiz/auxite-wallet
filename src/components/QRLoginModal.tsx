"use client";

// components/QRLoginModal.tsx
// QR Code Login - Scan with mobile app to login

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { useLanguage } from "@/components/LanguageContext";

interface QRLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (walletAddress: string) => void;
}

const translations = {
  tr: {
    title: "QR ile Giriş",
    subtitle: "Auxite mobil uygulaması ile QR kodu tarayın",
    step1: "Mobil uygulamayı açın",
    step2: "QR Tarayıcıyı açın",
    step3: "Bu kodu tarayın",
    waiting: "Onay bekleniyor...",
    expired: "QR kod süresi doldu",
    refresh: "Yenile",
    cancel: "İptal",
    success: "Giriş başarılı!",
    error: "Bir hata oluştu",
  },
  en: {
    title: "QR Login",
    subtitle: "Scan the QR code with Auxite mobile app",
    step1: "Open mobile app",
    step2: "Open QR Scanner",
    step3: "Scan this code",
    waiting: "Waiting for approval...",
    expired: "QR code expired",
    refresh: "Refresh",
    cancel: "Cancel",
    success: "Login successful!",
    error: "An error occurred",
  },
  de: {
    title: "QR-Anmeldung",
    subtitle: "Scannen Sie den QR-Code mit der Auxite-App",
    step1: "App öffnen",
    step2: "QR-Scanner öffnen",
    step3: "Code scannen",
    waiting: "Warte auf Bestätigung...",
    expired: "QR-Code abgelaufen",
    refresh: "Aktualisieren",
    cancel: "Abbrechen",
    success: "Anmeldung erfolgreich!",
    error: "Ein Fehler ist aufgetreten",
  },
  fr: {
    title: "Connexion QR",
    subtitle: "Scannez le code QR avec l'app Auxite",
    step1: "Ouvrir l'app",
    step2: "Ouvrir le scanner",
    step3: "Scanner ce code",
    waiting: "En attente d'approbation...",
    expired: "Code QR expiré",
    refresh: "Actualiser",
    cancel: "Annuler",
    success: "Connexion réussie!",
    error: "Une erreur s'est produite",
  },
  ar: {
    title: "تسجيل QR",
    subtitle: "امسح رمز QR باستخدام تطبيق Auxite",
    step1: "افتح التطبيق",
    step2: "افتح الماسح",
    step3: "امسح هذا الرمز",
    waiting: "في انتظار الموافقة...",
    expired: "انتهت صلاحية رمز QR",
    refresh: "تحديث",
    cancel: "إلغاء",
    success: "تم تسجيل الدخول!",
    error: "حدث خطأ",
  },
  ru: {
    title: "QR Вход",
    subtitle: "Отсканируйте QR-код в приложении Auxite",
    step1: "Откройте приложение",
    step2: "Откройте сканер",
    step3: "Отсканируйте код",
    waiting: "Ожидание подтверждения...",
    expired: "QR-код истёк",
    refresh: "Обновить",
    cancel: "Отмена",
    success: "Вход выполнен!",
    error: "Произошла ошибка",
  },
};

type Status = "loading" | "ready" | "waiting" | "approved" | "expired" | "error";

export default function QRLoginModal({ isOpen, onClose, onSuccess }: QRLoginModalProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  
  const [status, setStatus] = useState<Status>("loading");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(300);

  const generateQRCode = useCallback(async () => {
    try {
      setStatus("loading");
      setError("");

      const res = await fetch("/api/auth/qr-login?action=generate");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate QR code");
      }

      // Generate QR code image
      const qrDataUrl = await QRCode.toDataURL(data.qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      setQrCodeUrl(qrDataUrl);
      setSessionId(data.sessionId);
      setTimeLeft(data.expiresIn);
      setStatus("ready");

    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }, []);

  // Generate QR on mount
  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
    return () => {
      setStatus("loading");
      setQrCodeUrl("");
      setSessionId("");
    };
  }, [isOpen, generateQRCode]);

  // Poll for approval status
  useEffect(() => {
    if (!sessionId || status !== "ready") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/qr-login?action=status&sessionId=${sessionId}`);
        const data = await res.json();

        if (data.status === "approved" && data.walletAddress) {
          setStatus("approved");
          clearInterval(pollInterval);
          
          // Brief delay to show success message
          setTimeout(() => {
            onSuccess(data.walletAddress);
          }, 1500);
        } else if (data.status === "expired") {
          setStatus("expired");
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [sessionId, status, onSuccess]);

  // Countdown timer
  useEffect(() => {
    if (status !== "ready" || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, timeLeft]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("title")}</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">{t("subtitle")}</p>
        </div>

        {/* QR Code Area */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-6">
          {status === "loading" && (
            <div className="w-64 h-64 mx-auto flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-yellow-500 border-t-transparent"></div>
            </div>
          )}

          {status === "ready" && qrCodeUrl && (
            <div className="text-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 mx-auto rounded-lg" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                {t("waiting")} ({formatTime(timeLeft)})
              </p>
            </div>
          )}

          {status === "approved" && (
            <div className="w-64 h-64 mx-auto flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">{t("success")}</p>
            </div>
          )}

          {status === "expired" && (
            <div className="w-64 h-64 mx-auto flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-600 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-4">{t("expired")}</p>
              <button
                onClick={generateQRCode}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                {t("refresh")}
              </button>
            </div>
          )}

          {status === "error" && (
            <div className="w-64 h-64 mx-auto flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-500 mb-4">{error || t("error")}</p>
              <button
                onClick={generateQRCode}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                {t("refresh")}
              </button>
            </div>
          )}
        </div>

        {/* Steps */}
        {(status === "ready" || status === "loading") && (
          <div className="space-y-3 mb-6">
            {[t("step1"), t("step2"), t("step3")].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-semibold text-sm">
                  {i + 1}
                </div>
                <span className="text-gray-700 dark:text-gray-300">{step}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cancel Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
