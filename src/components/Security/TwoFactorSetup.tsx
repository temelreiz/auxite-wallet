"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface TwoFactorSetupProps {
  walletAddress: string;
  onStatusChange?: () => void;
}

interface TwoFAStatus {
  enabled: boolean;
  enabledAt?: string;
  backupCodesRemaining?: number;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    twoFactorAuth: "İki Faktörlü Doğrulama",
    active: "Aktif",
    disabled: "Kapalı",
    disable: "Kapat",
    loading: "Yükleniyor...",
    enable: "Aktifleştir",
    backupCodesRemaining: "Kalan yedek kod",
    enabledAt: "Aktifleştirilme",
    whatIs2FA: "2FA Nedir?",
    whatIs2FADesc: "İki faktörlü doğrulama, hesabınıza giriş yaparken şifrenize ek olarak telefonunuzdaki bir uygulamadan kod girmenizi gerektirir. Bu, hesabınızı çok daha güvenli hale getirir.",
    scanQR: "QR Kodu Tarayın",
    scanQRDesc: "Google Authenticator veya Authy uygulamasıyla tarayın",
    verificationCode: "Doğrulama Kodu",
    cancel: "İptal",
    verifying: "Doğrulanıyor...",
    verifyAndEnable: "Doğrula ve Aktifleştir",
    enter6Digit: "6 haneli kod girin",
    setupFailed: "Kurulum başlatılamadı",
    verificationFailed: "Doğrulama başarısız",
    operationFailed: "İşlem başarısız",
    twoFAEnabled: "2FA Aktifleştirildi!",
    saveBackupCodes: "Yedek kodlarınızı güvenli bir yere kaydedin",
    backupCodes: "Yedek Kodlar",
    copied: "✓ Kopyalandı",
    copy: "Kopyala",
    backupWarning: "Bu kodları bir daha göremeyeceksiniz. Güvenli bir yere kaydedin!",
    done: "Tamamla",
    disable2FA: "2FA'yı Kapat",
    disable2FADesc: "Doğrulama kodunuzu girerek 2FA'yı kapatın",
    disableWarning: "2FA'yı kapatmak hesabınızın güvenliğini azaltır. Bu işlemi sadece gerekli durumlarda yapın.",
    processing: "İşleniyor...",
    disable2FAButton: "2FA'yı Kapat",
  },
  en: {
    twoFactorAuth: "Two-Factor Authentication",
    active: "Enabled",
    disabled: "Disabled",
    disable: "Disable",
    loading: "Loading...",
    enable: "Enable",
    backupCodesRemaining: "Backup codes remaining",
    enabledAt: "Enabled at",
    whatIs2FA: "What is 2FA?",
    whatIs2FADesc: "Two-factor authentication requires you to enter a code from an app on your phone in addition to your password when logging in. This makes your account much more secure.",
    scanQR: "Scan QR Code",
    scanQRDesc: "Scan with Google Authenticator or Authy app",
    verificationCode: "Verification Code",
    cancel: "Cancel",
    verifying: "Verifying...",
    verifyAndEnable: "Verify & Enable",
    enter6Digit: "Enter 6-digit code",
    setupFailed: "Setup failed",
    verificationFailed: "Verification failed",
    operationFailed: "Operation failed",
    twoFAEnabled: "2FA Enabled!",
    saveBackupCodes: "Save your backup codes in a safe place",
    backupCodes: "Backup Codes",
    copied: "✓ Copied",
    copy: "Copy",
    backupWarning: "You won't see these codes again. Save them somewhere safe!",
    done: "Done",
    disable2FA: "Disable 2FA",
    disable2FADesc: "Enter your verification code to disable 2FA",
    disableWarning: "Disabling 2FA reduces your account security. Only do this when necessary.",
    processing: "Processing...",
    disable2FAButton: "Disable 2FA",
  },
  de: {
    twoFactorAuth: "Zwei-Faktor-Authentifizierung",
    active: "Aktiviert",
    disabled: "Deaktiviert",
    disable: "Deaktivieren",
    loading: "Laden...",
    enable: "Aktivieren",
    backupCodesRemaining: "Verbleibende Backup-Codes",
    enabledAt: "Aktiviert am",
    whatIs2FA: "Was ist 2FA?",
    whatIs2FADesc: "Die Zwei-Faktor-Authentifizierung erfordert, dass Sie beim Anmelden zusätzlich zu Ihrem Passwort einen Code aus einer App auf Ihrem Telefon eingeben. Dies macht Ihr Konto wesentlich sicherer.",
    scanQR: "QR-Code scannen",
    scanQRDesc: "Scannen Sie mit Google Authenticator oder der Authy-App",
    verificationCode: "Verifizierungscode",
    cancel: "Abbrechen",
    verifying: "Verifizierung...",
    verifyAndEnable: "Verifizieren & Aktivieren",
    enter6Digit: "6-stelligen Code eingeben",
    setupFailed: "Einrichtung fehlgeschlagen",
    verificationFailed: "Verifizierung fehlgeschlagen",
    operationFailed: "Vorgang fehlgeschlagen",
    twoFAEnabled: "2FA Aktiviert!",
    saveBackupCodes: "Speichern Sie Ihre Backup-Codes an einem sicheren Ort",
    backupCodes: "Backup-Codes",
    copied: "✓ Kopiert",
    copy: "Kopieren",
    backupWarning: "Sie werden diese Codes nicht wieder sehen. Bewahren Sie sie sicher auf!",
    done: "Fertig",
    disable2FA: "2FA Deaktivieren",
    disable2FADesc: "Geben Sie Ihren Verifizierungscode ein, um 2FA zu deaktivieren",
    disableWarning: "Das Deaktivieren von 2FA verringert die Sicherheit Ihres Kontos. Tun Sie dies nur, wenn es notwendig ist.",
    processing: "Verarbeitung...",
    disable2FAButton: "2FA Deaktivieren",
  },
  fr: {
    twoFactorAuth: "Authentification à deux facteurs",
    active: "Activé",
    disabled: "Désactivé",
    disable: "Désactiver",
    loading: "Chargement...",
    enable: "Activer",
    backupCodesRemaining: "Codes de secours restants",
    enabledAt: "Activé le",
    whatIs2FA: "Qu'est-ce que la 2FA ?",
    whatIs2FADesc: "L'authentification à deux facteurs vous oblige à entrer un code depuis une application sur votre téléphone en plus de votre mot de passe lors de la connexion. Cela rend votre compte beaucoup plus sécurisé.",
    scanQR: "Scanner le code QR",
    scanQRDesc: "Scannez avec Google Authenticator ou l'application Authy",
    verificationCode: "Code de vérification",
    cancel: "Annuler",
    verifying: "Vérification...",
    verifyAndEnable: "Vérifier et activer",
    enter6Digit: "Entrez le code à 6 chiffres",
    setupFailed: "Échec de la configuration",
    verificationFailed: "Échec de la vérification",
    operationFailed: "Échec de l'opération",
    twoFAEnabled: "2FA Activée !",
    saveBackupCodes: "Enregistrez vos codes de secours dans un endroit sûr",
    backupCodes: "Codes de secours",
    copied: "✓ Copié",
    copy: "Copier",
    backupWarning: "Vous ne reverrez plus ces codes. Conservez-les en lieu sûr !",
    done: "Terminé",
    disable2FA: "Désactiver la 2FA",
    disable2FADesc: "Entrez votre code de vérification pour désactiver la 2FA",
    disableWarning: "Désactiver la 2FA réduit la sécurité de votre compte. Ne le faites que si nécessaire.",
    processing: "Traitement...",
    disable2FAButton: "Désactiver la 2FA",
  },
  ar: {
    twoFactorAuth: "المصادقة الثنائية",
    active: "مفعّل",
    disabled: "معطّل",
    disable: "تعطيل",
    loading: "جاري التحميل...",
    enable: "تفعيل",
    backupCodesRemaining: "رموز النسخ الاحتياطي المتبقية",
    enabledAt: "تم التفعيل في",
    whatIs2FA: "ما هي المصادقة الثنائية؟",
    whatIs2FADesc: "تتطلب المصادقة الثنائية إدخال رمز من تطبيق على هاتفك بالإضافة إلى كلمة المرور عند تسجيل الدخول. هذا يجعل حسابك أكثر أماناً.",
    scanQR: "امسح رمز QR",
    scanQRDesc: "امسح باستخدام تطبيق Google Authenticator أو Authy",
    verificationCode: "رمز التحقق",
    cancel: "إلغاء",
    verifying: "جاري التحقق...",
    verifyAndEnable: "تحقق وتفعيل",
    enter6Digit: "أدخل الرمز المكون من 6 أرقام",
    setupFailed: "فشل في بدء الإعداد",
    verificationFailed: "فشل التحقق",
    operationFailed: "فشل العملية",
    twoFAEnabled: "تم تفعيل المصادقة الثنائية!",
    saveBackupCodes: "احفظ رموز النسخ الاحتياطي في مكان آمن",
    backupCodes: "رموز النسخ الاحتياطي",
    copied: "✓ تم النسخ",
    copy: "نسخ",
    backupWarning: "لن ترى هذه الرموز مرة أخرى. احفظها في مكان آمن!",
    done: "تم",
    disable2FA: "تعطيل المصادقة الثنائية",
    disable2FADesc: "أدخل رمز التحقق لتعطيل المصادقة الثنائية",
    disableWarning: "تعطيل المصادقة الثنائية يقلل من أمان حسابك. افعل ذلك فقط عند الضرورة.",
    processing: "جاري المعالجة...",
    disable2FAButton: "تعطيل المصادقة الثنائية",
  },
  ru: {
    twoFactorAuth: "Двухфакторная аутентификация",
    active: "Включено",
    disabled: "Отключено",
    disable: "Отключить",
    loading: "Загрузка...",
    enable: "Включить",
    backupCodesRemaining: "Оставшиеся резервные коды",
    enabledAt: "Включено",
    whatIs2FA: "Что такое 2FA?",
    whatIs2FADesc: "Двухфакторная аутентификация требует ввода кода из приложения на телефоне в дополнение к паролю при входе. Это делает ваш аккаунт значительно безопаснее.",
    scanQR: "Сканируйте QR-код",
    scanQRDesc: "Сканируйте с помощью Google Authenticator или приложения Authy",
    verificationCode: "Код подтверждения",
    cancel: "Отмена",
    verifying: "Проверка...",
    verifyAndEnable: "Подтвердить и включить",
    enter6Digit: "Введите 6-значный код",
    setupFailed: "Не удалось начать настройку",
    verificationFailed: "Проверка не удалась",
    operationFailed: "Операция не удалась",
    twoFAEnabled: "2FA Включена!",
    saveBackupCodes: "Сохраните резервные коды в безопасном месте",
    backupCodes: "Резервные коды",
    copied: "✓ Скопировано",
    copy: "Копировать",
    backupWarning: "Вы больше не увидите эти коды. Сохраните их в надёжном месте!",
    done: "Готово",
    disable2FA: "Отключить 2FA",
    disable2FADesc: "Введите код подтверждения для отключения 2FA",
    disableWarning: "Отключение 2FA снижает безопасность вашего аккаунта. Делайте это только при необходимости.",
    processing: "Обработка...",
    disable2FAButton: "Отключить 2FA",
  },
};

export function TwoFactorSetup({
  walletAddress,
  onStatusChange,
}: TwoFactorSetupProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [status, setStatus] = useState<TwoFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"status" | "setup" | "verify" | "backup" | "disable">("status");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [walletAddress]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/2fa/status", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setStatus(data);
      setStep("status");
    } catch (err) {
      console.error("2FA status error:", err);
    } finally {
      setLoading(false);
    }
  };

  const startSetup = async () => {
    try {
      setProcessing(true);
      setError(null);

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
        throw new Error(data.error || t("setupFailed"));
      }

      setQrCode(data.qrCodeDataUrl);
      setBackupCodes(data.backupCodes);
      setStep("setup");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const verifyAndEnable = async () => {
    if (verifyCode.length !== 6) {
      setError(t("enter6Digit"));
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch("/api/security/2fa/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("verificationFailed"));
      }

      setStep("backup");
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const disable2FA = async () => {
    if (verifyCode.length !== 6) {
      setError(t("enter6Digit"));
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const res = await fetch("/api/security/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ code: verifyCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("operationFailed"));
      }

      await fetchStatus();
      setVerifyCode("");
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status View */}
      {step === "status" && (
        <>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  status?.enabled ? "bg-[#2F6F62]/20" : "bg-slate-700"
                }`}>
                  <span className="text-2xl">🔐</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {t("twoFactorAuth")}
                  </h3>
                  <p className={`text-sm ${status?.enabled ? "text-[#2F6F62]" : "text-slate-400"}`}>
                    {status?.enabled ? t("active") : t("disabled")}
                  </p>
                </div>
              </div>

              {status?.enabled ? (
                <button
                  onClick={() => setStep("disable")}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                >
                  {t("disable")}
                </button>
              ) : (
                <button
                  onClick={startSetup}
                  disabled={processing}
                  className="px-4 py-2 rounded-lg bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {processing ? t("loading") : t("enable")}
                </button>
              )}
            </div>

            {status?.enabled && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    {t("backupCodesRemaining")}
                  </span>
                  <span className={`font-medium ${
                    (status.backupCodesRemaining || 0) <= 2 ? "text-[#BFA181]" : "text-slate-300"
                  }`}>
                    {status.backupCodesRemaining || 0}
                  </span>
                </div>
                {status.enabledAt && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-slate-400">
                      {t("enabledAt")}
                    </span>
                    <span className="text-slate-300">
                      {new Date(status.enabledAt).toLocaleDateString(lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <div className="flex gap-3">
              <span className="text-blue-400">ℹ️</span>
              <div>
                <p className="text-sm text-blue-400 font-medium mb-1">
                  {t("whatIs2FA")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("whatIs2FADesc")}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Setup View - QR Code */}
      {step === "setup" && qrCode && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("scanQR")}
            </h3>
            <p className="text-sm text-slate-400">
              {t("scanQRDesc")}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-xl">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>

          {/* Verify Code Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {t("verificationCode")}
            </label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-[#2F6F62]"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setQrCode(null);
                setVerifyCode("");
                setError(null);
              }}
              className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
            >
              {t("cancel")}
            </button>
            <button
              onClick={verifyAndEnable}
              disabled={verifyCode.length !== 6 || processing}
              className="flex-1 py-3 rounded-xl bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors font-medium disabled:opacity-50"
            >
              {processing ? t("verifying") : t("verifyAndEnable")}
            </button>
          </div>
        </div>
      )}

      {/* Backup Codes View */}
      {step === "backup" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#2F6F62]/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("twoFAEnabled")}
            </h3>
            <p className="text-sm text-slate-400">
              {t("saveBackupCodes")}
            </p>
          </div>

          {/* Backup Codes */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">
                {t("backupCodes")}
              </span>
              <button
                onClick={copyBackupCodes}
                className="text-xs text-[#2F6F62] hover:text-[#BFA181]"
              >
                {copiedBackup ? t("copied") : t("copy")}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i} className="font-mono text-sm text-slate-300 bg-slate-900 rounded px-3 py-2 text-center">
                  {code}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#BFA181]/10 border border-[#BFA181]/20 rounded-lg p-3">
            <div className="flex gap-2">
              <span className="text-[#BFA181]">⚠️</span>
              <p className="text-xs text-[#BFA181]">
                {t("backupWarning")}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setStep("status");
              fetchStatus();
            }}
            className="w-full py-3 rounded-xl bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors font-medium"
          >
            {t("done")}
          </button>
        </div>
      )}

      {/* Disable View */}
      {step === "disable" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔓</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {t("disable2FA")}
            </h3>
            <p className="text-sm text-slate-400">
              {t("disable2FADesc")}
            </p>
          </div>

          {/* Verify Code Input */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              {t("verificationCode")}
            </label>
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono text-white placeholder-slate-600 focus:outline-none focus:border-red-500"
              maxLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
            <div className="flex gap-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-xs text-red-400">
                {t("disableWarning")}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerifyCode("");
                setError(null);
              }}
              className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors font-medium"
            >
              {t("cancel")}
            </button>
            <button
              onClick={disable2FA}
              disabled={verifyCode.length !== 6 || processing}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors font-medium disabled:opacity-50"
            >
              {processing ? t("processing") : t("disable2FAButton")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
