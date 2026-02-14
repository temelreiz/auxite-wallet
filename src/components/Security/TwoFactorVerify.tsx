"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface TwoFactorVerifyProps {
  walletAddress: string;
  title?: string;
  description?: string;
  onVerified: (verificationToken: string) => void;
  onCancel: () => void;
  allowBiometric?: boolean;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    verificationRequired: "Doğrulama Gerekli",
    verifyToConfirm: "İşlemi onaylamak için doğrulayın",
    verifyWithBiometric: "Biyometrik ile Doğrula",
    waiting: "Bekleniyor...",
    or: "veya",
    backupCode: "Backup Kodu",
    verificationCode: "Doğrulama Kodu",
    useAuthenticator: "← Authenticator kodu kullan",
    useBackupCode: "Backup kodu kullan →",
    remainingAttempts: "Kalan deneme:",
    cancel: "İptal",
    verify: "Doğrula",
    verifying: "Doğrulanıyor...",
    enter8digit: "8 haneli backup kodu girin",
    enter6digit: "6 haneli kod girin",
    tooManyAttempts: "Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.",
    errorOccurred: "Bir hata oluştu",
    operationCancelled: "İşlem iptal edildi",
  },
  en: {
    verificationRequired: "Verification Required",
    verifyToConfirm: "Verify to confirm this action",
    verifyWithBiometric: "Verify with Biometric",
    waiting: "Waiting...",
    or: "or",
    backupCode: "Backup Code",
    verificationCode: "Verification Code",
    useAuthenticator: "← Use authenticator code",
    useBackupCode: "Use backup code →",
    remainingAttempts: "Remaining attempts:",
    cancel: "Cancel",
    verify: "Verify",
    verifying: "Verifying...",
    enter8digit: "Enter 8-digit backup code",
    enter6digit: "Enter 6-digit code",
    tooManyAttempts: "Too many failed attempts. Try again in 15 minutes.",
    errorOccurred: "An error occurred",
    operationCancelled: "Operation cancelled",
  },
  de: {
    verificationRequired: "Verifizierung erforderlich",
    verifyToConfirm: "Verifizieren Sie diese Aktion",
    verifyWithBiometric: "Mit Biometrie verifizieren",
    waiting: "Warten...",
    or: "oder",
    backupCode: "Backup-Code",
    verificationCode: "Verifizierungscode",
    useAuthenticator: "← Authenticator-Code verwenden",
    useBackupCode: "Backup-Code verwenden →",
    remainingAttempts: "Verbleibende Versuche:",
    cancel: "Abbrechen",
    verify: "Verifizieren",
    verifying: "Verifizierung...",
    enter8digit: "8-stelligen Backup-Code eingeben",
    enter6digit: "6-stelligen Code eingeben",
    tooManyAttempts: "Zu viele fehlgeschlagene Versuche. Versuchen Sie es in 15 Minuten erneut.",
    errorOccurred: "Ein Fehler ist aufgetreten",
    operationCancelled: "Vorgang abgebrochen",
  },
  fr: {
    verificationRequired: "Vérification requise",
    verifyToConfirm: "Vérifiez pour confirmer cette action",
    verifyWithBiometric: "Vérifier avec biométrie",
    waiting: "En attente...",
    or: "ou",
    backupCode: "Code de secours",
    verificationCode: "Code de vérification",
    useAuthenticator: "← Utiliser le code authenticator",
    useBackupCode: "Utiliser le code de secours →",
    remainingAttempts: "Tentatives restantes :",
    cancel: "Annuler",
    verify: "Vérifier",
    verifying: "Vérification...",
    enter8digit: "Entrez le code de secours à 8 chiffres",
    enter6digit: "Entrez le code à 6 chiffres",
    tooManyAttempts: "Trop de tentatives échouées. Réessayez dans 15 minutes.",
    errorOccurred: "Une erreur est survenue",
    operationCancelled: "Opération annulée",
  },
  ar: {
    verificationRequired: "التحقق مطلوب",
    verifyToConfirm: "تحقق لتأكيد هذا الإجراء",
    verifyWithBiometric: "التحقق بالبصمة",
    waiting: "جارٍ الانتظار...",
    or: "أو",
    backupCode: "رمز النسخ الاحتياطي",
    verificationCode: "رمز التحقق",
    useAuthenticator: "← استخدم رمز المصادقة",
    useBackupCode: "استخدم رمز النسخ الاحتياطي →",
    remainingAttempts: "المحاولات المتبقية:",
    cancel: "إلغاء",
    verify: "تحقق",
    verifying: "جارٍ التحقق...",
    enter8digit: "أدخل رمز النسخ الاحتياطي المكون من 8 أرقام",
    enter6digit: "أدخل الرمز المكون من 6 أرقام",
    tooManyAttempts: "محاولات فاشلة كثيرة. حاول مرة أخرى بعد 15 دقيقة.",
    errorOccurred: "حدث خطأ",
    operationCancelled: "تم إلغاء العملية",
  },
  ru: {
    verificationRequired: "Требуется проверка",
    verifyToConfirm: "Подтвердите это действие",
    verifyWithBiometric: "Подтвердить биометрией",
    waiting: "Ожидание...",
    or: "или",
    backupCode: "Резервный код",
    verificationCode: "Код подтверждения",
    useAuthenticator: "← Использовать код аутентификатора",
    useBackupCode: "Использовать резервный код →",
    remainingAttempts: "Оставшиеся попытки:",
    cancel: "Отмена",
    verify: "Подтвердить",
    verifying: "Проверка...",
    enter8digit: "Введите 8-значный резервный код",
    enter6digit: "Введите 6-значный код",
    tooManyAttempts: "Слишком много неудачных попыток. Попробуйте через 15 минут.",
    errorOccurred: "Произошла ошибка",
    operationCancelled: "Операция отменена",
  },
};

export function TwoFactorVerify({
  walletAddress,
  title,
  description,
  onVerified,
  onCancel,
  allowBiometric = true,
}: TwoFactorVerifyProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [hasBiometric, setHasBiometric] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (allowBiometric) {
      checkBiometric();
    }
  }, []);

  const checkBiometric = async () => {
    try {
      const res = await fetch("/api/security/biometric", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setHasBiometric(data.enabled);
    } catch {
      setHasBiometric(false);
    }
  };

  const verify = async () => {
    const cleanCode = code.replace(/\s/g, "");

    if (useBackupCode) {
      if (cleanCode.length !== 8) {
        setError(t("enter8digit"));
        return;
      }
    } else {
      if (cleanCode.length !== 6) {
        setError(t("enter6digit"));
        return;
      }
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch("/api/security/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          code: cleanCode,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.locked) {
          setError(t("tooManyAttempts"));
        } else {
          setError(data.error);
          if (data.remainingAttempts !== undefined) {
            setRemainingAttempts(data.remainingAttempts);
          }
        }
        return;
      }

      onVerified(data.verificationToken);
    } catch (err: any) {
      setError(err.message || t("errorOccurred"));
    } finally {
      setProcessing(false);
    }
  };

  const verifyWithBiometric = async () => {
    try {
      setProcessing(true);
      setError(null);

      // WebAuthn import
      const { startAuthentication } = await import("@simplewebauthn/browser");

      // Auth options al
      const optionsRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ action: "auth-options" }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsData.error);

      // Biometric prompt
      const credential = await startAuthentication(optionsData.options);

      // Verify
      const verifyRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "auth-verify",
          response: credential,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);

      onVerified(verifyData.verificationToken);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(t("operationCancelled"));
      } else {
        setError(err.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verify();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#BFA181]/20 flex items-center justify-center">
              <span className="text-xl">🔐</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {title || t("verificationRequired")}
              </h2>
              <p className="text-sm text-slate-400">
                {description || t("verifyToConfirm")}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Biometric Option */}
          {hasBiometric && allowBiometric && (
            <>
              <button
                onClick={verifyWithBiometric}
                disabled={processing}
                className="w-full py-4 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <span className="text-2xl">👆</span>
                {processing
                  ? t("waiting")
                  : t("verifyWithBiometric")}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500">
                  {t("or")}
                </span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
            </>
          )}

          {/* Code Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {useBackupCode
                ? t("backupCode")
                : t("verificationCode")}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setCode(val.slice(0, useBackupCode ? 8 : 6));
              }}
              onKeyDown={handleKeyDown}
              placeholder={useBackupCode ? "00000000" : "000000"}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#2F6F62]"
              maxLength={useBackupCode ? 8 : 6}
              disabled={processing}
            />
          </div>

          {/* Toggle Backup Code */}
          <button
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setCode("");
              setError(null);
            }}
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            {useBackupCode
              ? t("useAuthenticator")
              : t("useBackupCode")}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
              {remainingAttempts !== null && (
                <p className="mt-1 text-xs">
                  {t("remainingAttempts")} {remainingAttempts}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium disabled:opacity-50"
          >
            {t("cancel")}
          </button>
          <button
            onClick={verify}
            disabled={
              processing ||
              (useBackupCode ? code.length !== 8 : code.length !== 6)
            }
            className="flex-1 py-3 rounded-xl bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors font-medium disabled:opacity-50"
          >
            {processing
              ? t("verifying")
              : t("verify")}
          </button>
        </div>
      </div>
    </div>
  );
}
