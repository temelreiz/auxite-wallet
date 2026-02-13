"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

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
    tooManyAttempts: "Çok fazla başarısız deneme. Lütfen bekleyin.",
    setupSuccess: "2FA başarıyla kuruldu!",
    error: "Bir hata oluştu",
    loading: "Yükleniyor...",
    processing: "İşlem gerçekleştiriliyor...",
    processingDesc: "Lütfen bekleyin, işleminiz yürütülüyor.",
    retry: "Tekrar Dene",
    connectionError: "Bağlantı hatası. Tekrar deneyin.",
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
    tooManyAttempts: "Too many failed attempts. Please wait.",
    setupSuccess: "2FA successfully set up!",
    error: "An error occurred",
    loading: "Loading...",
    processing: "Processing transaction...",
    processingDesc: "Please wait while your transaction is being executed.",
    retry: "Retry",
    connectionError: "Connection error. Please retry.",
  },
  de: {
    setupTitle: "2FA-Einrichtung erforderlich", setupDesc: "Sie müssen die Zwei-Faktor-Authentifizierung einrichten.",
    verifyTitle: "2FA-Verifizierung", verifyDesc: "Geben Sie den Verifizierungscode ein.", scanQR: "QR-Code scannen",
    scanQRDesc: "Mit Google Authenticator oder Authy scannen", manualEntry: "Manuelle Eingabe", secretKey: "Geheimschlüssel",
    verificationCode: "Verifizierungscode", enterCode: "6-stelligen Code eingeben", backupCodes: "Backup-Codes",
    backupCodesDesc: "Speichern Sie diese Codes sicher.", saveBackupCodes: "Codes gespeichert", verify: "Verifizieren",
    verifying: "Verifiziere...", cancel: "Abbrechen", continue: "Weiter", invalidCode: "Ungültiger Code",
    codeCopied: "Kopiert!", useBackupCode: "Backup-Code", useAuthenticator: "Authenticator",
    tooManyAttempts: "Zu viele Fehlversuche.", setupSuccess: "2FA erfolgreich!", error: "Ein Fehler ist aufgetreten",
    loading: "Laden...", processing: "Transaktion wird verarbeitet...", processingDesc: "Bitte warten Sie, Ihre Transaktion wird ausgeführt.",
    retry: "Wiederholen", connectionError: "Verbindungsfehler.",
  },
  fr: {
    setupTitle: "Configuration 2FA requise", setupDesc: "Vous devez configurer l'authentification à deux facteurs.",
    verifyTitle: "Vérification 2FA", verifyDesc: "Entrez le code de vérification.", scanQR: "Scanner le code QR",
    scanQRDesc: "Scanner avec Google Authenticator ou Authy", manualEntry: "Entrée manuelle", secretKey: "Clé secrète",
    verificationCode: "Code de vérification", enterCode: "Entrez le code à 6 chiffres", backupCodes: "Codes de secours",
    backupCodesDesc: "Enregistrez ces codes en lieu sûr.", saveBackupCodes: "Codes enregistrés", verify: "Vérifier",
    verifying: "Vérification...", cancel: "Annuler", continue: "Continuer", invalidCode: "Code invalide",
    codeCopied: "Copié!", useBackupCode: "Code de secours", useAuthenticator: "Authenticator",
    tooManyAttempts: "Trop de tentatives.", setupSuccess: "2FA configuré!", error: "Une erreur s'est produite",
    loading: "Chargement...", processing: "Traitement de la transaction...", processingDesc: "Veuillez patienter pendant l'exécution de votre transaction.",
    retry: "Réessayer", connectionError: "Erreur de connexion.",
  },
  ar: {
    setupTitle: "إعداد 2FA مطلوب", setupDesc: "تحتاج إلى إعداد المصادقة الثنائية.", verifyTitle: "التحقق من 2FA",
    verifyDesc: "أدخل رمز التحقق.", scanQR: "امسح رمز QR", scanQRDesc: "امسح باستخدام Google Authenticator أو Authy",
    manualEntry: "إدخال يدوي", secretKey: "المفتاح السري", verificationCode: "رمز التحقق", enterCode: "أدخل الرمز",
    backupCodes: "رموز النسخ الاحتياطي", backupCodesDesc: "احفظ هذه الرموز بأمان.", saveBackupCodes: "تم الحفظ",
    verify: "تحقق", verifying: "جاري التحقق...", cancel: "إلغاء", continue: "متابعة", invalidCode: "رمز غير صالح",
    codeCopied: "تم النسخ!", useBackupCode: "رمز احتياطي", useAuthenticator: "المصادق",
    tooManyAttempts: "محاولات كثيرة.", setupSuccess: "تم إعداد 2FA!", error: "حدث خطأ",
    loading: "جاري التحميل...", processing: "جاري معالجة المعاملة...", processingDesc: "يرجى الانتظار أثناء تنفيذ معاملتك.",
    retry: "إعادة المحاولة", connectionError: "خطأ في الاتصال.",
  },
  ru: {
    setupTitle: "Требуется настройка 2FA", setupDesc: "Настройте двухфакторную аутентификацию.",
    verifyTitle: "Проверка 2FA", verifyDesc: "Введите код подтверждения.", scanQR: "Сканировать QR-код",
    scanQRDesc: "Сканируйте с помощью Google Authenticator или Authy", manualEntry: "Ручной ввод",
    secretKey: "Секретный ключ", verificationCode: "Код подтверждения", enterCode: "Введите 6-значный код",
    backupCodes: "Резервные коды", backupCodesDesc: "Сохраните эти коды в безопасном месте.",
    saveBackupCodes: "Коды сохранены", verify: "Подтвердить", verifying: "Проверка...", cancel: "Отмена",
    continue: "Продолжить", invalidCode: "Неверный код", codeCopied: "Скопировано!",
    useBackupCode: "Резервный код", useAuthenticator: "Аутентификатор", tooManyAttempts: "Слишком много попыток.",
    setupSuccess: "2FA настроен!", error: "Произошла ошибка",
    loading: "Загрузка...", processing: "Обработка транзакции...", processingDesc: "Пожалуйста, подождите, ваша транзакция выполняется.",
    retry: "Повторить", connectionError: "Ошибка соединения.",
  },
};

interface TwoFactorGateProps {
  walletAddress: string;
  isOpen: boolean;
  onClose: () => void;
  onVerified: (verifiedCode?: string) => void; // Now passes the verified code
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

type Step = "checking" | "error" | "setup-qr" | "setup-backup" | "verify" | "processing";

export function TwoFactorGate({ walletAddress, isOpen, onClose, onVerified, lang = "en" }: TwoFactorGateProps) {
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

  const API_BASE = "/api/security/2fa";

  // Check 2FA status
  const check2FAStatus = async () => {
    setStep("checking");
    setError(null);
    setCode("");
    setUseBackupCode(false);

    try {
      console.log("Checking 2FA status for:", walletAddress);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/status`, {
        headers: { "x-wallet-address": walletAddress },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      console.log("2FA Status response:", data);

      // Check if 2FA is enabled - also check enabledAt as backup
      const isEnabled = data.enabled === true || (data.enabledAt && data.backupCodesRemaining > 0);
      
      if (isEnabled) {
        console.log("2FA is enabled, showing verify screen");
        setStep("verify");
      } else {
        console.log("2FA not enabled, starting setup");
        await startSetup();
      }
    } catch (err: any) {
      console.error("2FA status check error:", err);
      if (err.name === "AbortError") {
        setError(t.connectionError);
      } else {
        setError(err.message || t.error);
      }
      setStep("error");
    }
  };

  // Start setup
  const startSetup = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log("Starting 2FA setup...");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${API_BASE}/setup`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await res.json();
      console.log("Setup response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Setup failed");
      }

      setSecret(data.secret);

      if (data.qrCodeUrl) {
        const qr = await QRCode.toDataURL(data.qrCodeUrl, { width: 200, margin: 2 });
        setQrCodeDataUrl(qr);
      }

      setStep("setup-qr");
    } catch (err: any) {
      console.error("Setup error:", err);
      if (err.name === "AbortError") {
        setError(t.connectionError);
      } else {
        setError(err.message || t.error);
      }
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run check when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      check2FAStatus();
    }
  }, [isOpen, walletAddress]);

  // Verify setup code (enable 2FA)
  const handleVerifySetup = async () => {
    if (code.length !== 6) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/enable`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();
      console.log("Enable response:", data);

      if (!res.ok) {
        throw new Error(data.error || t.invalidCode);
      }

      if (data.backupCodes) {
        setBackupCodes(data.backupCodes);
      }
      setStep("setup-backup");
      setCode("");
    } catch (err: any) {
      setError(err.message || t.invalidCode);
    } finally {
      setIsProcessing(false);
    }
  };

  // Verify code (for existing 2FA)
  const handleVerify = async () => {
    const codeLength = useBackupCode ? 8 : 6;
    if (code.length !== codeLength) return;

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/verify`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          code: useBackupCode ? code.toUpperCase() : code,
          isBackupCode: useBackupCode,
        }),
      });

      const data = await res.json();
      console.log("Verify response:", data);

      if (!res.ok || !data.valid) {
        throw new Error(data.error || t.invalidCode);
      }

      // Show processing state before passing code to parent
      setStep("processing");

      // Pass the verified code back so it can be sent to backend APIs
      onVerified(useBackupCode ? code.toUpperCase() : code);
    } catch (err: any) {
      setError(err.message || t.invalidCode);
      setIsProcessing(false);
    }
  };

  const handleBackupCodesSaved = () => {
    // For new setup, we don't have a code to pass - user just completed setup
    onVerified();
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== "processing" ? onClose : undefined} />

      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-slate-700 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-stone-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              step === "verify" ? "bg-[#BFA181]/15 dark:bg-[#BFA181]/20" :
              step === "processing" ? "bg-[#2F6F62]/15 dark:bg-[#2F6F62]/20" :
              step === "error" ? "bg-red-100 dark:bg-red-500/20" :
              "bg-blue-100 dark:bg-blue-500/20"
            }`}>
              <span className="text-2xl">
                {step === "checking" && "⏳"}
                {step === "error" && "❌"}
                {step === "setup-qr" && "📱"}
                {step === "setup-backup" && "🔐"}
                {step === "verify" && "🔑"}
                {step === "processing" && "⚡"}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {step === "error" ? t.error :
                 step === "processing" ? t.processing :
                 step === "setup-qr" || step === "setup-backup" ? t.setupTitle :
                 t.verifyTitle}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {step === "error" ? "" :
                 step === "processing" ? t.processingDesc :
                 step === "setup-qr" || step === "setup-backup" ? t.setupDesc :
                 t.verifyDesc}
              </p>
            </div>
            {step !== "processing" && (
              <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Checking */}
          {step === "checking" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 border-4 border-[#BFA181]/30 border-t-[#BFA181] rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400">{t.loading}</p>
            </div>
          )}

          {/* Processing — 2FA verified, executing transaction */}
          {step === "processing" && (
            <div className="flex flex-col items-center py-8">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-[#2F6F62]/20 border-t-[#2F6F62] rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-[#2F6F62] animate-pulse" />
                <p className="text-sm font-semibold text-[#2F6F62]">{t.processing}</p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">{t.processingDesc}</p>
            </div>
          )}

          {/* Error with Retry */}
          {step === "error" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <p className="text-red-600 dark:text-red-400 mb-4 text-center">{error || t.connectionError}</p>
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={check2FAStatus}
                  className="px-4 py-2 rounded-lg bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-medium"
                >
                  {t.retry}
                </button>
              </div>
            </div>
          )}

          {/* Setup - QR Code */}
          {step === "setup-qr" && (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 text-center">{t.scanQRDesc}</p>
                {qrCodeDataUrl && (
                  <div className="bg-white p-3 rounded-xl shadow-lg">
                    <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button onClick={() => setShowManualKey(!showManualKey)} className="text-sm text-[#BFA181] dark:text-[#BFA181] hover:underline">
                  {showManualKey ? "Hide" : t.manualEntry} →
                </button>
                {showManualKey && secret && (
                  <div className="mt-2 p-3 bg-stone-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t.secretKey}:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono text-slate-800 dark:text-white break-all">{secret}</code>
                      <button onClick={() => copyToClipboard(secret)} className="p-1.5 bg-white dark:bg-slate-700 rounded text-slate-500 hover:text-slate-700">
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">{t.verificationCode}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-center text-2xl font-mono text-slate-800 dark:text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-[#BFA181]"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-stone-300 dark:hover:bg-slate-600 transition-colors">
                  {t.cancel}
                </button>
                <button
                  onClick={handleVerifySetup}
                  disabled={code.length !== 6 || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {isProcessing ? t.verifying : t.continue}
                </button>
              </div>
            </div>
          )}

          {/* Setup - Backup Codes */}
          {step === "setup-backup" && (
            <div className="space-y-4">
              <div className="p-4 bg-[#BFA181]/10 dark:bg-[#BFA181]/10 border border-[#BFA181]/30 dark:border-[#BFA181]/30 rounded-xl">
                <p className="text-sm text-[#BFA181] dark:text-[#D4B47A]">⚠️ {t.backupCodesDesc}</p>
              </div>

              <div className="bg-stone-100 dark:bg-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.backupCodes}</span>
                  <button onClick={copyAllBackupCodes} className="text-xs text-[#BFA181] dark:text-[#BFA181] hover:underline">
                    {copied ? t.codeCopied : "Copy all"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((backupCode, i) => (
                    <div key={i} className="px-3 py-2 bg-white dark:bg-slate-900 rounded-lg text-center font-mono text-sm text-slate-800 dark:text-white">
                      {backupCode}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleBackupCodesSaved}
                className="w-full py-3 rounded-xl bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-semibold transition-colors"
              >
                {t.saveBackupCodes}
              </button>
            </div>
          )}

          {/* Verify */}
          {step === "verify" && (
            <div className="space-y-4">
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
                  className="w-full px-4 py-3 bg-stone-100 dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-xl text-center text-2xl font-mono text-slate-800 dark:text-white tracking-widest focus:outline-none focus:ring-2 focus:ring-[#BFA181]"
                  maxLength={useBackupCode ? 8 : 6}
                  autoFocus
                />
              </div>

              <button
                onClick={() => { setUseBackupCode(!useBackupCode); setCode(""); setError(null); }}
                className="text-sm text-[#BFA181] dark:text-[#BFA181] hover:underline"
              >
                {useBackupCode ? t.useAuthenticator : t.useBackupCode} →
              </button>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-stone-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium hover:bg-stone-300 dark:hover:bg-slate-600 transition-colors">
                  {t.cancel}
                </button>
                <button
                  onClick={handleVerify}
                  disabled={(useBackupCode ? code.length !== 8 : code.length !== 6) || isProcessing}
                  className="flex-1 py-3 rounded-xl bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-semibold transition-colors"
                >
                  {isProcessing ? t.verifying : t.verify}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TwoFactorGate;
