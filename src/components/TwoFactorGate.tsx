"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";

// ============================================
// TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    setupTitle: "2FA Kurulumu Gerekli",
    setupDesc: "Bu işlemi gerçekleştirmek için iki faktörlü doğrulama kurmanız gerekiyor.",
    verifyTitle: "2FA Doğrulama",
    verifyDesc: "İşlemi onaylamak için doğrulama kodunu girin.",
    scanQR: "QR Kodu Tarayın",
    scanQRDesc: "Google Authenticator veya Authy uygulamasıyla tarayın",
    manualEntry: "Manuel Giriş",
    secretKey: "Gizli Anahtar",
    verificationCode: "Doğrulama Kodu",
    enterCode: "6 haneli kodu girin",
    backupCodes: "Yedek Kodlar",
    backupCodesDesc: "Bu kodları güvenli bir yere kaydedin. Her kod sadece bir kez kullanılabilir.",
    saveBackupCodes: "Kodları Kaydettim",
    verify: "Doğrula",
    verifying: "Doğrulanıyor...",
    cancel: "İptal",
    continue: "Devam Et",
    invalidCode: "Geçersiz kod",
    codeCopied: "Kopyalandı!",
    useBackupCode: "Yedek kodu kullan",
    useAuthenticator: "Authenticator kullan",
    tooManyAttempts: "Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.",
    setupSuccess: "2FA başarıyla kuruldu!",
    error: "Bir hata oluştu",
  },
  en: {
    setupTitle: "2FA Setup Required",
    setupDesc: "You need to set up two-factor authentication to perform this action.",
    verifyTitle: "2FA Verification",
    verifyDesc: "Enter the verification code to confirm this action.",
    scanQR: "Scan QR Code",
    scanQRDesc: "Scan with Google Authenticator or Authy app",
    manualEntry: "Manual Entry",
    secretKey: "Secret Key",
    verificationCode: "Verification Code",
    enterCode: "Enter 6-digit code",
    backupCodes: "Backup Codes",
    backupCodesDesc: "Save these codes in a safe place. Each code can only be used once.",
    saveBackupCodes: "I Saved The Codes",
    verify: "Verify",
    verifying: "Verifying...",
    cancel: "Cancel",
    continue: "Continue",
    invalidCode: "Invalid code",
    codeCopied: "Copied!",
    useBackupCode: "Use backup code",
    useAuthenticator: "Use authenticator",
    tooManyAttempts: "Too many failed attempts. Try again in 15 minutes.",
    setupSuccess: "2FA successfully set up!",
    error: "An error occurred",
  },
  de: {
    setupTitle: "2FA-Einrichtung erforderlich",
    setupDesc: "Sie müssen die Zwei-Faktor-Authentifizierung einrichten, um diese Aktion auszuführen.",
    verifyTitle: "2FA-Verifizierung",
    verifyDesc: "Geben Sie den Verifizierungscode ein, um diese Aktion zu bestätigen.",
    scanQR: "QR-Code scannen",
    scanQRDesc: "Mit Google Authenticator oder Authy App scannen",
    manualEntry: "Manuelle Eingabe",
    secretKey: "Geheimschlüssel",
    verificationCode: "Verifizierungscode",
    enterCode: "6-stelligen Code eingeben",
    backupCodes: "Backup-Codes",
    backupCodesDesc: "Speichern Sie diese Codes an einem sicheren Ort.",
    saveBackupCodes: "Codes gespeichert",
    verify: "Verifizieren",
    verifying: "Verifiziere...",
    cancel: "Abbrechen",
    continue: "Weiter",
    invalidCode: "Ungültiger Code",
    codeCopied: "Kopiert!",
    useBackupCode: "Backup-Code verwenden",
    useAuthenticator: "Authenticator verwenden",
    tooManyAttempts: "Zu viele Fehlversuche. Versuchen Sie es in 15 Minuten erneut.",
    setupSuccess: "2FA erfolgreich eingerichtet!",
    error: "Ein Fehler ist aufgetreten",
  },
  fr: {
    setupTitle: "Configuration 2FA requise",
    setupDesc: "Vous devez configurer l'authentification à deux facteurs pour effectuer cette action.",
    verifyTitle: "Vérification 2FA",
    verifyDesc: "Entrez le code de vérification pour confirmer cette action.",
    scanQR: "Scanner le code QR",
    scanQRDesc: "Scanner avec Google Authenticator ou Authy",
    manualEntry: "Entrée manuelle",
    secretKey: "Clé secrète",
    verificationCode: "Code de vérification",
    enterCode: "Entrez le code à 6 chiffres",
    backupCodes: "Codes de secours",
    backupCodesDesc: "Enregistrez ces codes dans un endroit sûr.",
    saveBackupCodes: "Codes enregistrés",
    verify: "Vérifier",
    verifying: "Vérification...",
    cancel: "Annuler",
    continue: "Continuer",
    invalidCode: "Code invalide",
    codeCopied: "Copié!",
    useBackupCode: "Utiliser code de secours",
    useAuthenticator: "Utiliser authenticator",
    tooManyAttempts: "Trop de tentatives. Réessayez dans 15 minutes.",
    setupSuccess: "2FA configuré avec succès!",
    error: "Une erreur s'est produite",
  },
  ar: {
    setupTitle: "إعداد 2FA مطلوب",
    setupDesc: "تحتاج إلى إعداد المصادقة الثنائية لتنفيذ هذا الإجراء.",
    verifyTitle: "التحقق من 2FA",
    verifyDesc: "أدخل رمز التحقق لتأكيد هذا الإجراء.",
    scanQR: "امسح رمز QR",
    scanQRDesc: "امسح باستخدام Google Authenticator أو Authy",
    manualEntry: "إدخال يدوي",
    secretKey: "المفتاح السري",
    verificationCode: "رمز التحقق",
    enterCode: "أدخل الرمز المكون من 6 أرقام",
    backupCodes: "رموز النسخ الاحتياطي",
    backupCodesDesc: "احفظ هذه الرموز في مكان آمن.",
    saveBackupCodes: "تم حفظ الرموز",
    verify: "تحقق",
    verifying: "جاري التحقق...",
    cancel: "إلغاء",
    continue: "متابعة",
    invalidCode: "رمز غير صالح",
    codeCopied: "تم النسخ!",
    useBackupCode: "استخدم رمز النسخ الاحتياطي",
    useAuthenticator: "استخدم المصادق",
    tooManyAttempts: "محاولات كثيرة جداً. حاول مرة أخرى خلال 15 دقيقة.",
    setupSuccess: "تم إعداد 2FA بنجاح!",
    error: "حدث خطأ",
  },
  ru: {
    setupTitle: "Требуется настройка 2FA",
    setupDesc: "Вам необходимо настроить двухфакторную аутентификацию для выполнения этого действия.",
    verifyTitle: "Проверка 2FA",
    verifyDesc: "Введите код подтверждения для подтверждения этого действия.",
    scanQR: "Сканировать QR-код",
    scanQRDesc: "Сканируйте с помощью Google Authenticator или Authy",
    manualEntry: "Ручной ввод",
    secretKey: "Секретный ключ",
    verificationCode: "Код подтверждения",
    enterCode: "Введите 6-значный код",
    backupCodes: "Резервные коды",
    backupCodesDesc: "Сохраните эти коды в безопасном месте.",
    saveBackupCodes: "Коды сохранены",
    verify: "Подтвердить",
    verifying: "Проверка...",
    cancel: "Отмена",
    continue: "Продолжить",
    invalidCode: "Неверный код",
    codeCopied: "Скопировано!",
    useBackupCode: "Использовать резервный код",
    useAuthenticator: "Использовать аутентификатор",
    tooManyAttempts: "Слишком много попыток. Повторите через 15 минут.",
    setupSuccess: "2FA успешно настроен!",
    error: "Произошла ошибка",
  },
};

interface TwoFactorGateProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  actionName?: string; // "withdraw", "send", "login" etc.
}

type Step = "checking" | "setup-qr" | "setup-backup" | "verify" | "success";

export function TwoFactorGate({
  walletAddress,
  isOpen,
  onClose,
  onVerified,
  lang = "en",
  actionName = "action",
}: TwoFactorGateProps) {
  const t = translations[lang] || translations.en;

  const [step, setStep] = useState<Step>("checking");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualKey, setShowManualKey] = useState(false);

  // Check 2FA status on open
  useEffect(() => {
    if (!isOpen || !walletAddress) return;

    const check2FAStatus = async () => {
      setStep("checking");
      setError(null);
      setCode("");

      try {
        const res = await fetch(`/api/security/2fa/status`, {
          headers: { "x-wallet-address": walletAddress },
        });
        const data = await res.json();

        if (data.enabled) {
          setStep("verify");
        } else {
          // Start 2FA setup
          await startSetup();
        }
      } catch (err) {
        console.error("2FA status check error:", err);
        setError(t.error);
      }
    };

    check2FAStatus();
  }, [isOpen, walletAddress]);

  const startSetup = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/security/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Setup failed");
      }

      setSecret(data.secret);
      setBackupCodes(data.backupCodes || []);

      // Generate QR code if not provided
      if (data.qrCodeDataUrl) {
        setQrCodeDataUrl(data.qrCodeDataUrl);
      } else if (data.qrCodeUrl) {
        const qr = await QRCode.toDataURL(data.qrCodeUrl, {
          width: 200,
          margin: 2,
        });
        setQrCodeDataUrl(qr);
      }

      setStep("setup-qr");
    } catch (err: any) {
      setError(err.message || t.error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifySetup = async () => {
    if (code.length !== 6) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/security/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t.invalidCode);
      }

      // Setup successful - show backup codes
      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
      }
      setStep("setup-backup");
    } catch (err: any) {
      setError(err.message || t.invalidCode);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async () => {
    const codeLength = useBackupCode ? 8 : 6;
    if (code.length !== codeLength) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/security/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          code,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();

      if (data.locked) {
        setError(t.tooManyAttempts);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || t.invalidCode);
      }

      // Verification successful
      setStep("success");
      setTimeout(() => {
        onVerified();
      }, 500);
    } catch (err: any) {
      setError(err.message || t.invalidCode);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackupCodesSaved = () => {
    setStep("success");
    setTimeout(() => {
      onVerified();
    }, 500);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const copyAllBackupCodes = () => {
    copyToClipboard(backupCodes.join("\n"));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              step === "success" 
                ? "bg-emerald-100 dark:bg-emerald-500/20" 
                : "bg-amber-100 dark:bg-amber-500/20"
            }`}>
              <span className="text-2xl">
                {step === "checking" && "⏳"}
                {step === "setup-qr" && "📱"}
                {step === "setup-backup" && "🔐"}
                {step === "verify" && "🔑"}
                {step === "success" && "✅"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {step === "setup-qr" || step === "setup-backup" ? t.setupTitle : step === "success" ? t.setupSuccess : t.verifyTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {step === "setup-qr" || step === "setup-backup" ? t.setupDesc : step === "success" ? "" : t.verifyDesc}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Checking */}
          {step === "checking" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Checking 2FA status...</p>
            </div>
          )}

          {/* Setup - QR Code */}
          {step === "setup-qr" && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{t.scanQRDesc}</p>
                {qrCodeDataUrl && (
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              {/* Manual Entry */}
              <div className="pt-2">
                <button
                  onClick={() => setShowManualKey(!showManualKey)}
                  className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {showManualKey ? "Hide" : t.manualEntry} →
                </button>
                {showManualKey && secret && (
                  <div className="mt-2 p-3 bg-stone-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.secretKey}:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono text-slate-800 dark:text-white break-all">
                        {secret}
                      </code>
                      <button
                        onClick={() => copyToClipboard(secret)}
                        className="p-1.5 bg-white dark:bg-slate-700 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Code Input */}
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {t.verificationCode}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-center text-2xl font-mono text-slate-800 dark:text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-stone-300 dark:hover:bg-slate-600 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleVerifySetup}
                  disabled={code.length !== 6 || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {isProcessing ? t.verifying : t.continue}
                </button>
              </div>
            </div>
          )}

          {/* Setup - Backup Codes */}
          {step === "setup-backup" && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ {t.backupCodesDesc}
                </p>
              </div>

              {/* Backup Codes Grid */}
              <div className="bg-stone-100 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t.backupCodes}
                  </span>
                  <button
                    onClick={copyAllBackupCodes}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    {copied ? t.codeCopied : "Copy all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 bg-white dark:bg-slate-900 rounded-lg text-center font-mono text-sm text-slate-800 dark:text-white"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleBackupCodesSaved}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-colors"
              >
                {t.saveBackupCodes}
              </button>
            </div>
          )}

          {/* Verify */}
          {step === "verify" && (
            <div className="space-y-4">
              {/* Code Input */}
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {useBackupCode ? t.backupCodes : t.verificationCode}
                </label>
                <input
                  type="text"
                  inputMode={useBackupCode ? "text" : "numeric"}
                  value={code}
                  onChange={(e) => {
                    const val = useBackupCode 
                      ? e.target.value.toUpperCase().slice(0, 8) 
                      : e.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(val);
                  }}
                  placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-center text-2xl font-mono text-slate-800 dark:text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500"
                  maxLength={useBackupCode ? 8 : 6}
                  autoFocus
                />
              </div>

              {/* Toggle backup code mode */}
              <button
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setCode("");
                  setError(null);
                }}
                className="text-sm text-amber-600 dark:text-amber-400 hover:underline"
              >
                {useBackupCode ? t.useAuthenticator : t.useBackupCode} →
              </button>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-stone-300 dark:hover:bg-slate-600 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleVerify}
                  disabled={(useBackupCode ? code.length !== 8 : code.length !== 6) || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {isProcessing ? t.verifying : t.verify}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
            <div className="flex flex-col items-center py-6">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">✅</span>
              </div>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {t.setupSuccess}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TwoFactorGate;
