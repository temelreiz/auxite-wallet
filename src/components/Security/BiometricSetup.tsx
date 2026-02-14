"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

interface BiometricSetupProps {
  walletAddress: string;
  onStatusChange?: () => void;
}

interface Passkey {
  id: string;
  name: string;
  createdAt: string;
  lastUsed?: string;
  deviceType: string;
  backedUp: boolean;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    biometricAuth: "Biyometrik Doğrulama",
    passkeyRegistered: "passkey kayıtlı",
    noPasskeys: "Kayıtlı passkey yok",
    waiting: "Bekleniyor...",
    addPasskey: "+ Passkey Ekle",
    registeredPasskeys: "Kayıtlı Passkey'ler",
    test: "Test Et",
    added: "Eklendi",
    rename: "Yeniden Adlandır",
    deleteLabel: "Sil",
    whatIsPasskey: "Passkey Nedir?",
    whatIsPasskeyDesc: "Passkey, parmak izi veya yüz tanıma gibi biyometrik yöntemlerle kimlik doğrulamanızı sağlar. Şifrelerden çok daha güvenlidir ve phishing saldırılarına karşı koruma sağlar.",
    passkeyAdded: "Passkey başarıyla eklendi!",
    operationCancelled: "İşlem iptal edildi",
    errorOccurred: "Bir hata oluştu",
    deleteConfirm: "Bu passkey silinsin mi?",
    verificationSuccess: "Biyometrik doğrulama başarılı!",
    notSupported: "Desteklenmiyor",
    notSupportedDesc: "Bu cihaz biyometrik doğrulamayı desteklemiyor. Lütfen Touch ID veya Face ID destekleyen bir cihaz kullanın.",
  },
  en: {
    biometricAuth: "Biometric Authentication",
    passkeyRegistered: "passkey(s) registered",
    noPasskeys: "No passkeys registered",
    waiting: "Waiting...",
    addPasskey: "+ Add Passkey",
    registeredPasskeys: "Registered Passkeys",
    test: "Test",
    added: "Added",
    rename: "Rename",
    deleteLabel: "Delete",
    whatIsPasskey: "What is a Passkey?",
    whatIsPasskeyDesc: "Passkeys enable authentication using biometrics like fingerprint or face recognition. They're much more secure than passwords and protect against phishing attacks.",
    passkeyAdded: "Passkey added successfully!",
    operationCancelled: "Operation cancelled",
    errorOccurred: "An error occurred",
    deleteConfirm: "Delete this passkey?",
    verificationSuccess: "Biometric verification successful!",
    notSupported: "Not Supported",
    notSupportedDesc: "This device doesn't support biometric authentication. Please use a device with Touch ID or Face ID.",
  },
  de: {
    biometricAuth: "Biometrische Authentifizierung",
    passkeyRegistered: "Passkey(s) registriert",
    noPasskeys: "Keine Passkeys registriert",
    waiting: "Warten...",
    addPasskey: "+ Passkey hinzufügen",
    registeredPasskeys: "Registrierte Passkeys",
    test: "Testen",
    added: "Hinzugefügt",
    rename: "Umbenennen",
    deleteLabel: "Löschen",
    whatIsPasskey: "Was ist ein Passkey?",
    whatIsPasskeyDesc: "Passkeys ermöglichen die Authentifizierung mit Biometrie wie Fingerabdruck oder Gesichtserkennung. Sie sind viel sicherer als Passwörter und schützen vor Phishing-Angriffen.",
    passkeyAdded: "Passkey erfolgreich hinzugefügt!",
    operationCancelled: "Vorgang abgebrochen",
    errorOccurred: "Ein Fehler ist aufgetreten",
    deleteConfirm: "Diesen Passkey löschen?",
    verificationSuccess: "Biometrische Verifizierung erfolgreich!",
    notSupported: "Nicht unterstützt",
    notSupportedDesc: "Dieses Gerät unterstützt keine biometrische Authentifizierung. Bitte verwenden Sie ein Gerät mit Touch ID oder Face ID.",
  },
  fr: {
    biometricAuth: "Authentification biométrique",
    passkeyRegistered: "passkey(s) enregistré(s)",
    noPasskeys: "Aucun passkey enregistré",
    waiting: "En attente...",
    addPasskey: "+ Ajouter un Passkey",
    registeredPasskeys: "Passkeys enregistrés",
    test: "Tester",
    added: "Ajouté",
    rename: "Renommer",
    deleteLabel: "Supprimer",
    whatIsPasskey: "Qu'est-ce qu'un Passkey ?",
    whatIsPasskeyDesc: "Les passkeys permettent l'authentification par biométrie comme l'empreinte digitale ou la reconnaissance faciale. Ils sont beaucoup plus sûrs que les mots de passe et protègent contre les attaques de phishing.",
    passkeyAdded: "Passkey ajouté avec succès !",
    operationCancelled: "Opération annulée",
    errorOccurred: "Une erreur est survenue",
    deleteConfirm: "Supprimer ce passkey ?",
    verificationSuccess: "Vérification biométrique réussie !",
    notSupported: "Non pris en charge",
    notSupportedDesc: "Cet appareil ne prend pas en charge l'authentification biométrique. Veuillez utiliser un appareil avec Touch ID ou Face ID.",
  },
  ar: {
    biometricAuth: "المصادقة البيومترية",
    passkeyRegistered: "مفتاح مرور مسجّل",
    noPasskeys: "لا توجد مفاتيح مرور مسجّلة",
    waiting: "في الانتظار...",
    addPasskey: "+ إضافة مفتاح مرور",
    registeredPasskeys: "مفاتيح المرور المسجّلة",
    test: "اختبار",
    added: "أُضيف",
    rename: "إعادة تسمية",
    deleteLabel: "حذف",
    whatIsPasskey: "ما هو مفتاح المرور؟",
    whatIsPasskeyDesc: "تتيح مفاتيح المرور المصادقة باستخدام البيومتري مثل بصمة الإصبع أو التعرف على الوجه. إنها أكثر أماناً من كلمات المرور وتحمي من هجمات التصيد.",
    passkeyAdded: "تمت إضافة مفتاح المرور بنجاح!",
    operationCancelled: "تم إلغاء العملية",
    errorOccurred: "حدث خطأ",
    deleteConfirm: "هل تريد حذف مفتاح المرور هذا؟",
    verificationSuccess: "تم التحقق البيومتري بنجاح!",
    notSupported: "غير مدعوم",
    notSupportedDesc: "هذا الجهاز لا يدعم المصادقة البيومترية. يرجى استخدام جهاز يدعم Touch ID أو Face ID.",
  },
  ru: {
    biometricAuth: "Биометрическая аутентификация",
    passkeyRegistered: "ключ(и) зарегистрировано",
    noPasskeys: "Нет зарегистрированных ключей",
    waiting: "Ожидание...",
    addPasskey: "+ Добавить Passkey",
    registeredPasskeys: "Зарегистрированные Passkeys",
    test: "Тест",
    added: "Добавлен",
    rename: "Переименовать",
    deleteLabel: "Удалить",
    whatIsPasskey: "Что такое Passkey?",
    whatIsPasskeyDesc: "Passkeys обеспечивают аутентификацию с помощью биометрии, такой как отпечаток пальца или распознавание лица. Они намного безопаснее паролей и защищают от фишинговых атак.",
    passkeyAdded: "Passkey успешно добавлен!",
    operationCancelled: "Операция отменена",
    errorOccurred: "Произошла ошибка",
    deleteConfirm: "Удалить этот passkey?",
    verificationSuccess: "Биометрическая проверка успешна!",
    notSupported: "Не поддерживается",
    notSupportedDesc: "Это устройство не поддерживает биометрическую аутентификацию. Пожалуйста, используйте устройство с Touch ID или Face ID.",
  },
};

export function BiometricSetup({
  walletAddress,
  onStatusChange
}: BiometricSetupProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    checkSupport();
    fetchPasskeys();
  }, [walletAddress]);

  const checkSupport = async () => {
    if (!window.PublicKeyCredential) {
      setSupported(false);
      return;
    }
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setSupported(available);
    } catch {
      setSupported(false);
    }
  };

  const fetchPasskeys = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/security/biometric", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error("Passkeys fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const registerPasskey = async () => {
    try {
      setProcessing(true);
      setError(null);
      setSuccess(null);

      // Registration options al
      const optionsRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ action: "register-options" }),
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsData.error);

      // Biometric prompt göster
      const credential = await startRegistration(optionsData.options);

      // Verify
      const verifyRes = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "register-verify",
          response: credential,
          name: `Passkey ${passkeys.length + 1}`,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);

      setSuccess(t("passkeyAdded"));
      fetchPasskeys();
      onStatusChange?.();
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError(t("operationCancelled"));
      } else {
        setError(err.message || t("errorOccurred"));
      }
    } finally {
      setProcessing(false);
    }
  };

  const deletePasskey = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) {
      return;
    }

    try {
      setProcessing(true);
      const res = await fetch(`/api/security/biometric?id=${id}`, {
        method: "DELETE",
        headers: { "x-wallet-address": walletAddress },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchPasskeys();
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const renamePasskey = async (id: string) => {
    if (!editName.trim()) return;

    try {
      const res = await fetch("/api/security/biometric", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "rename",
          passkeyId: id,
          newName: editName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setEditingId(null);
      setEditName("");
      fetchPasskeys();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const testPasskey = async () => {
    try {
      setProcessing(true);
      setError(null);

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

      setSuccess(t("verificationSuccess"));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-slate-600 border-t-[#BFA181] rounded-full" />
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="bg-[#BFA181]/10 border border-[#BFA181]/20 rounded-xl p-6 text-center">
        <span className="text-4xl mb-4 block">🚫</span>
        <h3 className="text-lg font-semibold text-[#BFA181] mb-2">
          {t("notSupported")}
        </h3>
        <p className="text-sm text-slate-400">
          {t("notSupportedDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              passkeys.length > 0 ? "bg-[#2F6F62]/20" : "bg-slate-700"
            }`}>
              <span className="text-2xl">👆</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {t("biometricAuth")}
              </h3>
              <p className={`text-sm ${passkeys.length > 0 ? "text-[#2F6F62]" : "text-slate-400"}`}>
                {passkeys.length > 0
                  ? `${passkeys.length} ${t("passkeyRegistered")}`
                  : t("noPasskeys")}
              </p>
            </div>
          </div>

          <button
            onClick={registerPasskey}
            disabled={processing}
            className="px-4 py-2 rounded-lg bg-[#2F6F62] text-white hover:bg-[#2F6F62] transition-colors text-sm font-medium disabled:opacity-50"
          >
            {processing ? t("waiting") : t("addPasskey")}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[#2F6F62]/10 border border-[#2F6F62]/20 rounded-lg p-3 text-[#2F6F62] text-sm">
          {success}
        </div>
      )}

      {/* Passkeys List */}
      {passkeys.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-400">
              {t("registeredPasskeys")}
            </h4>
            <button
              onClick={testPasskey}
              disabled={processing}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {t("test")}
            </button>
          </div>

          {passkeys.map((passkey) => (
            <div
              key={passkey.id}
              className="bg-slate-800/50 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-lg">🔑</span>
                  </div>
                  <div>
                    {editingId === passkey.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => renamePasskey(passkey.id)}
                          className="text-[#2F6F62] text-xs"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <p className="text-white font-medium">{passkey.name}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {t("added")}: {new Date(passkey.createdAt).toLocaleDateString()}
                      </span>
                      {passkey.backedUp && (
                        <span className="text-[#2F6F62]">• Synced</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingId(passkey.id);
                      setEditName(passkey.name);
                    }}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    title={t("rename")}
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deletePasskey(passkey.id)}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    title={t("deleteLabel")}
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
        <div className="flex gap-3">
          <span className="text-blue-400">ℹ️</span>
          <div>
            <p className="text-sm text-blue-400 font-medium mb-1">
              {t("whatIsPasskey")}
            </p>
            <p className="text-xs text-slate-400">
              {t("whatIsPasskeyDesc")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
