"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/components/LanguageContext";

interface TwoFactorSetupProps {
  walletAddress?: string;
  onClose?: () => void;
}

type Step = "status" | "setup" | "verify" | "success" | "disable";

const translations = {
  tr: {
    title: "İki Faktörlü Doğrulama (2FA)",
    subtitle: "Hesabınızı ekstra güvenlik katmanıyla koruyun",
    enabled: "2FA Aktif",
    disabled: "2FA Devre Dışı",
    enable: "2FA Aktifleştir",
    disable: "2FA Devre Dışı Bırak",
    setupTitle: "2FA Kurulumu",
    step1: "1. Google Authenticator veya benzer bir uygulama indirin",
    step2: "2. Aşağıdaki QR kodu tarayın veya kodu manuel girin",
    step3: "3. Uygulamadan 6 haneli kodu girin",
    secretKey: "Gizli Anahtar",
    verificationCode: "Doğrulama Kodu",
    verify: "Doğrula ve Aktifleştir",
    backupCodesTitle: "Backup Kodları",
    backupCodesWarning: "Bu kodları güvenli bir yere kaydedin! Telefonunuzu kaybederseniz bunlarla giriş yapabilirsiniz.",
    backupCodesRemaining: "Kalan backup kodu",
    regenerateBackup: "Yeni Kodlar Oluştur",
    close: "Kapat",
    cancel: "İptal",
    copied: "Kopyalandı!",
    enterCodeToDisable: "2FA'yı devre dışı bırakmak için doğrulama kodunu girin",
    success: "2FA başarıyla aktifleştirildi!",
    disableSuccess: "2FA devre dışı bırakıldı",
    walletRequired: "Cüzdan bağlantısı gerekli",
    enterSixDigit: "6 haneli kod girin",
    enterVerificationCode: "Doğrulama kodu girin",
    backupLow: "Backup kodlarınız azaldı. Yeni kodlar oluşturun.",
    copyAll: "Tümünü Kopyala",
    codeOrBackup: "6 haneli kod veya backup kodu girin",
    setupFailed: "Kurulum başarısız",
    verificationFailed: "Doğrulama başarısız",
    disableFailed: "Devre dışı bırakma başarısız",
    regenerateFailed: "Yeniden oluşturma başarısız",
  },
  en: {
    title: "Two-Factor Authentication (2FA)",
    subtitle: "Protect your account with an extra layer of security",
    enabled: "2FA Enabled",
    disabled: "2FA Disabled",
    enable: "Enable 2FA",
    disable: "Disable 2FA",
    setupTitle: "2FA Setup",
    step1: "1. Download Google Authenticator or similar app",
    step2: "2. Scan the QR code below or enter the code manually",
    step3: "3. Enter the 6-digit code from the app",
    secretKey: "Secret Key",
    verificationCode: "Verification Code",
    verify: "Verify & Enable",
    backupCodesTitle: "Backup Codes",
    backupCodesWarning: "Save these codes securely! You can use them to log in if you lose your phone.",
    backupCodesRemaining: "Backup codes remaining",
    regenerateBackup: "Regenerate Codes",
    close: "Close",
    cancel: "Cancel",
    copied: "Copied!",
    enterCodeToDisable: "Enter verification code to disable 2FA",
    success: "2FA successfully enabled!",
    disableSuccess: "2FA disabled",
    walletRequired: "Wallet connection required",
    enterSixDigit: "Enter 6-digit code",
    enterVerificationCode: "Enter verification code",
    backupLow: "Your backup codes are running low. Generate new codes.",
    copyAll: "Copy All",
    codeOrBackup: "Enter 6-digit code or backup code",
    setupFailed: "Setup failed",
    verificationFailed: "Verification failed",
    disableFailed: "Disable failed",
    regenerateFailed: "Regenerate failed",
  },
  de: {
    title: "Zwei-Faktor-Authentifizierung (2FA)",
    subtitle: "Schützen Sie Ihr Konto mit einer zusätzlichen Sicherheitsebene",
    enabled: "2FA Aktiviert",
    disabled: "2FA Deaktiviert",
    enable: "2FA Aktivieren",
    disable: "2FA Deaktivieren",
    setupTitle: "2FA Einrichtung",
    step1: "1. Google Authenticator oder eine ähnliche App herunterladen",
    step2: "2. QR-Code scannen oder Code manuell eingeben",
    step3: "3. Den 6-stelligen Code aus der App eingeben",
    secretKey: "Geheimer Schlüssel",
    verificationCode: "Bestätigungscode",
    verify: "Bestätigen & Aktivieren",
    backupCodesTitle: "Backup-Codes",
    backupCodesWarning: "Speichern Sie diese Codes sicher! Sie können sich damit anmelden, wenn Sie Ihr Telefon verlieren.",
    backupCodesRemaining: "Verbleibende Backup-Codes",
    regenerateBackup: "Codes Neu Generieren",
    close: "Schließen",
    cancel: "Abbrechen",
    copied: "Kopiert!",
    enterCodeToDisable: "Bestätigungscode eingeben, um 2FA zu deaktivieren",
    success: "2FA erfolgreich aktiviert!",
    disableSuccess: "2FA deaktiviert",
    walletRequired: "Wallet-Verbindung erforderlich",
    enterSixDigit: "6-stelligen Code eingeben",
    enterVerificationCode: "Bestätigungscode eingeben",
    backupLow: "Ihre Backup-Codes werden knapp. Generieren Sie neue Codes.",
    copyAll: "Alle Kopieren",
    codeOrBackup: "6-stelligen Code oder Backup-Code eingeben",
    setupFailed: "Einrichtung fehlgeschlagen",
    verificationFailed: "Bestätigung fehlgeschlagen",
    disableFailed: "Deaktivierung fehlgeschlagen",
    regenerateFailed: "Neugenerierung fehlgeschlagen",
  },
  fr: {
    title: "Authentification à Deux Facteurs (2FA)",
    subtitle: "Protégez votre compte avec une couche de sécurité supplémentaire",
    enabled: "2FA Activé",
    disabled: "2FA Désactivé",
    enable: "Activer 2FA",
    disable: "Désactiver 2FA",
    setupTitle: "Configuration 2FA",
    step1: "1. Téléchargez Google Authenticator ou une application similaire",
    step2: "2. Scannez le code QR ci-dessous ou entrez le code manuellement",
    step3: "3. Entrez le code à 6 chiffres de l'application",
    secretKey: "Clé Secrète",
    verificationCode: "Code de Vérification",
    verify: "Vérifier & Activer",
    backupCodesTitle: "Codes de Secours",
    backupCodesWarning: "Conservez ces codes en lieu sûr ! Vous pouvez les utiliser pour vous connecter si vous perdez votre téléphone.",
    backupCodesRemaining: "Codes de secours restants",
    regenerateBackup: "Régénérer les Codes",
    close: "Fermer",
    cancel: "Annuler",
    copied: "Copié !",
    enterCodeToDisable: "Entrez le code de vérification pour désactiver 2FA",
    success: "2FA activé avec succès !",
    disableSuccess: "2FA désactivé",
    walletRequired: "Connexion au portefeuille requise",
    enterSixDigit: "Entrez le code à 6 chiffres",
    enterVerificationCode: "Entrez le code de vérification",
    backupLow: "Vos codes de secours s'épuisent. Générez de nouveaux codes.",
    copyAll: "Tout Copier",
    codeOrBackup: "Entrez le code à 6 chiffres ou le code de secours",
    setupFailed: "Échec de la configuration",
    verificationFailed: "Échec de la vérification",
    disableFailed: "Échec de la désactivation",
    regenerateFailed: "Échec de la régénération",
  },
  ar: {
    title: "المصادقة الثنائية (2FA)",
    subtitle: "احمِ حسابك بطبقة أمان إضافية",
    enabled: "2FA مفعّل",
    disabled: "2FA معطّل",
    enable: "تفعيل 2FA",
    disable: "تعطيل 2FA",
    setupTitle: "إعداد 2FA",
    step1: "1. قم بتنزيل Google Authenticator أو تطبيق مشابه",
    step2: "2. امسح رمز QR أدناه أو أدخل الرمز يدوياً",
    step3: "3. أدخل الرمز المكون من 6 أرقام من التطبيق",
    secretKey: "المفتاح السري",
    verificationCode: "رمز التحقق",
    verify: "تحقق وتفعيل",
    backupCodesTitle: "رموز النسخ الاحتياطي",
    backupCodesWarning: "احفظ هذه الرموز في مكان آمن! يمكنك استخدامها لتسجيل الدخول إذا فقدت هاتفك.",
    backupCodesRemaining: "رموز النسخ الاحتياطي المتبقية",
    regenerateBackup: "إعادة إنشاء الرموز",
    close: "إغلاق",
    cancel: "إلغاء",
    copied: "تم النسخ!",
    enterCodeToDisable: "أدخل رمز التحقق لتعطيل 2FA",
    success: "تم تفعيل 2FA بنجاح!",
    disableSuccess: "تم تعطيل 2FA",
    walletRequired: "يلزم الاتصال بالمحفظة",
    enterSixDigit: "أدخل الرمز المكون من 6 أرقام",
    enterVerificationCode: "أدخل رمز التحقق",
    backupLow: "رموز النسخ الاحتياطي على وشك النفاد. قم بإنشاء رموز جديدة.",
    copyAll: "نسخ الكل",
    codeOrBackup: "أدخل الرمز المكون من 6 أرقام أو رمز النسخ الاحتياطي",
    setupFailed: "فشل الإعداد",
    verificationFailed: "فشل التحقق",
    disableFailed: "فشل التعطيل",
    regenerateFailed: "فشلت إعادة الإنشاء",
  },
  ru: {
    title: "Двухфакторная Аутентификация (2FA)",
    subtitle: "Защитите свой аккаунт дополнительным уровнем безопасности",
    enabled: "2FA Включена",
    disabled: "2FA Отключена",
    enable: "Включить 2FA",
    disable: "Отключить 2FA",
    setupTitle: "Настройка 2FA",
    step1: "1. Скачайте Google Authenticator или аналогичное приложение",
    step2: "2. Отсканируйте QR-код ниже или введите код вручную",
    step3: "3. Введите 6-значный код из приложения",
    secretKey: "Секретный Ключ",
    verificationCode: "Код Подтверждения",
    verify: "Подтвердить и Включить",
    backupCodesTitle: "Резервные Коды",
    backupCodesWarning: "Сохраните эти коды в безопасном месте! Вы можете использовать их для входа, если потеряете телефон.",
    backupCodesRemaining: "Оставшиеся резервные коды",
    regenerateBackup: "Сгенерировать Новые Коды",
    close: "Закрыть",
    cancel: "Отмена",
    copied: "Скопировано!",
    enterCodeToDisable: "Введите код подтверждения для отключения 2FA",
    success: "2FA успешно включена!",
    disableSuccess: "2FA отключена",
    walletRequired: "Требуется подключение кошелька",
    enterSixDigit: "Введите 6-значный код",
    enterVerificationCode: "Введите код подтверждения",
    backupLow: "Резервные коды заканчиваются. Сгенерируйте новые коды.",
    copyAll: "Копировать Все",
    codeOrBackup: "Введите 6-значный код или резервный код",
    setupFailed: "Ошибка настройки",
    verificationFailed: "Ошибка подтверждения",
    disableFailed: "Ошибка отключения",
    regenerateFailed: "Ошибка повторной генерации",
  },
};

export function TwoFactorSetup({ onClose, walletAddress }: TwoFactorSetupProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const address = walletAddress;
  const [step, setStep] = useState<Step>("status");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 2FA Status
  const [isEnabled, setIsEnabled] = useState(false);
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0);

  // Setup data
  const [secret, setSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Fetch 2FA status
  useEffect(() => {
    if (!address) return;
    
    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/security/2fa?address=${address}`);
        const data = await res.json();
        
        setIsEnabled(data.enabled);
        setBackupCodesRemaining(data.backupCodesRemaining || 0);
        setLoading(false);
      } catch (err) {
        console.error("2FA status error:", err);
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, [address]);

  // Start 2FA setup
  const handleSetup = async () => {
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", address }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || t("setupFailed"));
      }

      setSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setStep("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("setupFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Verify and enable 2FA
  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError(t("enterSixDigit"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enable",
          address,
          code: verificationCode
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("verificationFailed"));
      }

      setBackupCodes(data.backupCodes);
      setIsEnabled(true);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("verificationFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable = async () => {
    if (verificationCode.length < 6) {
      setError(t("enterVerificationCode"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disable",
          address,
          code: verificationCode
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("disableFailed"));
      }

      setIsEnabled(false);
      setStep("status");
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("disableFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Regenerate backup codes
  const handleRegenerateBackup = async () => {
    if (verificationCode.length !== 6) {
      setError(t("enterSixDigit"));
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/security/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate-backup",
          address,
          code: verificationCode
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("regenerateFailed"));
      }

      setBackupCodes(data.backupCodes);
      setBackupCodesRemaining(10);
      setVerificationCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("regenerateFailed"));
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (!address) {
    return (
      <div className="p-6 text-center text-slate-400">
        {t("walletRequired")}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🔐 {t("title")}
          </h3>
          <p className="text-sm text-slate-400 mt-1">{t("subtitle")}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && step === "status" && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full"></div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Status View */}
      {step === "status" && !loading && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${
            isEnabled 
              ? "bg-[#2F6F62]/10 border-[#2F6F62]/30" 
              : "bg-slate-800 border-slate-700"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isEnabled ? "bg-[#2F6F62]/20" : "bg-slate-700"
                }`}>
                  {isEnabled ? "✅" : "🔓"}
                </div>
                <div>
                  <p className={`font-medium ${isEnabled ? "text-[#2F6F62]" : "text-slate-300"}`}>
                    {isEnabled ? t("enabled") : t("disabled")}
                  </p>
                  {isEnabled && (
                    <p className="text-xs text-slate-400">
                      {t("backupCodesRemaining")}: {backupCodesRemaining}
                    </p>
                  )}
                </div>
              </div>
              
              {isEnabled ? (
                <button
                  onClick={() => setStep("disable")}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 text-sm font-medium"
                >
                  {t("disable")}
                </button>
              ) : (
                <button
                  onClick={handleSetup}
                  disabled={loading}
                  className="px-4 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] text-sm font-medium disabled:opacity-50"
                >
                  {t("enable")}
                </button>
              )}
            </div>
          </div>

          {/* Regenerate backup codes */}
          {isEnabled && backupCodesRemaining < 5 && (
            <div className="p-4 bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl">
              <p className="text-[#BFA181] text-sm mb-3">
                ⚠️ {t("backupLow")}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-mono"
                />
                <button
                  onClick={handleRegenerateBackup}
                  disabled={loading}
                  className="px-4 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] text-sm font-medium disabled:opacity-50"
                >
                  {t("regenerateBackup")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Setup View */}
      {step === "setup" && (
        <div className="space-y-6">
          <div className="text-sm text-slate-400 space-y-2">
            <p>{t("step1")}</p>
            <p>{t("step2")}</p>
            <p>{t("step3")}</p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG value={qrCodeUrl} size={200} />
            </div>
          </div>

          {/* Secret Key */}
          <div className="p-4 bg-slate-800 rounded-xl">
            <p className="text-xs text-slate-400 mb-2">{t("secretKey")}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[#2F6F62] font-mono text-sm break-all">
                {secret}
              </code>
              <button
                onClick={() => copyToClipboard(secret)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
              >
                📋
              </button>
            </div>
          </div>

          {/* Verification Input */}
          <div>
            <label className="text-sm text-slate-400 block mb-2">{t("verificationCode")}</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-[#2F6F62]"
              maxLength={6}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerificationCode("");
                setError("");
              }}
              className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="flex-1 py-3 bg-[#2F6F62] text-white rounded-xl hover:bg-[#2F6F62] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "..." : t("verify")}
            </button>
          </div>
        </div>
      )}

      {/* Success View - Show Backup Codes */}
      {step === "success" && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h4 className="text-xl font-semibold text-[#2F6F62]">{t("success")}</h4>
          </div>

          <div className="p-4 bg-[#BFA181]/10 border border-[#BFA181]/30 rounded-xl">
            <p className="text-[#BFA181] text-sm font-medium mb-2">⚠️ {t("backupCodesTitle")}</p>
            <p className="text-slate-400 text-xs mb-4">{t("backupCodesWarning")}</p>
            
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, i) => (
                <div key={i} className="px-3 py-2 bg-slate-800 rounded-lg text-center font-mono text-sm text-white">
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={() => copyToClipboard(backupCodes.join("\n"))}
              className="w-full mt-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
            >
              📋 {t("copyAll")}
            </button>
          </div>

          <button
            onClick={() => {
              setStep("status");
              setBackupCodes([]);
              setVerificationCode("");
            }}
            className="w-full py-3 bg-[#2F6F62] text-white rounded-xl hover:bg-[#2F6F62] font-medium"
          >
            {t("close")}
          </button>
        </div>
      )}

      {/* Disable View */}
      {step === "disable" && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">{t("enterCodeToDisable")}</p>
          
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="000000"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-red-500"
          />
          
          <p className="text-xs text-slate-500 text-center">
            {t("codeOrBackup")}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep("status");
                setVerificationCode("");
                setError("");
              }}
              className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600"
            >
              {t("cancel")}
            </button>
            <button
              onClick={handleDisable}
              disabled={loading || verificationCode.length < 6}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "..." : t("disable")}
            </button>
          </div>
        </div>
      )}

      {/* Show new backup codes if regenerated */}
      {backupCodes.length > 0 && step === "status" && (
        <div className="mt-4 p-4 bg-[#2F6F62]/10 border border-[#2F6F62]/30 rounded-xl">
          <p className="text-[#2F6F62] text-sm font-medium mb-2">✅ {t("backupCodesTitle")}</p>
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, i) => (
              <div key={i} className="px-3 py-2 bg-slate-800 rounded-lg text-center font-mono text-sm text-white">
                {code}
              </div>
            ))}
          </div>
          <button
            onClick={() => setBackupCodes([])}
            className="w-full mt-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
          >
            {t("close")}
          </button>
        </div>
      )}
    </div>
  );
}

export default TwoFactorSetup;
