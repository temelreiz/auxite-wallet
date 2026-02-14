"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface TrustedContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  canUnfreeze: boolean;
  canRecover: boolean;
}

interface EmergencyConfig {
  frozen: boolean;
  frozenAt?: string;
  frozenReason?: string;
  panicMode: boolean;
  trustedContacts: TrustedContact[];
  cooldownPeriod: number;
  securityLevel: "standard" | "high" | "maximum";
}

interface Props {
  walletAddress: string;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Acil Durum Ayarları",
    subtitle: "Hesap güvenliği ve acil durum kontrolleri",
    accountStatus: "Hesap Durumu",
    active: "Aktif",
    frozen: "Dondurulmuş",
    panic: "ACİL DURUM",
    freezeAccount: "Hesabı Dondur",
    unfreezeAccount: "Hesabı Aç",
    freezeDesc: "Tüm işlemler geçici olarak durdurulur",
    panicButton: "🚨 PANIC BUTONU",
    panicDesc: "Tüm işlemleri anında durdur ve güvenlik önlemlerini aktifleştir",
    activatePanic: "Panic Mode Aktif Et",
    deactivatePanic: "Panic Mode Kapat",
    panicWarning: "Bu işlem tüm çekimleri ve transferleri anında durdurur!",
    trustedContacts: "Güvenilir Kişiler",
    trustedDesc: "Hesap kurtarma için yetkilendirilen kişiler",
    addContact: "Kişi Ekle",
    removeContact: "Kaldır",
    noContacts: "Güvenilir kişi eklenmemiş",
    canUnfreeze: "Hesabı açabilir",
    canRecover: "Hesabı kurtarabilir",
    securityLevel: "Güvenlik Seviyesi",
    standard: "Standart",
    high: "Yüksek",
    maximum: "Maksimum",
    name: "İsim",
    email: "Email",
    phone: "Telefon",
    save: "Kaydet",
    cancel: "İptal",
    confirm: "Onayla",
    freezeReason: "Dondurma Sebebi",
    frozenSince: "Dondurulma Zamanı",
    recovery: "Hesap Kurtarma",
    startRecovery: "Kurtarma Başlat",
  },
  en: {
    title: "Emergency Settings",
    subtitle: "Account security and emergency controls",
    accountStatus: "Account Status",
    active: "Active",
    frozen: "Frozen",
    panic: "EMERGENCY",
    freezeAccount: "Freeze Account",
    unfreezeAccount: "Unfreeze Account",
    freezeDesc: "All transactions will be temporarily suspended",
    panicButton: "🚨 PANIC BUTTON",
    panicDesc: "Instantly stop all transactions and activate security measures",
    activatePanic: "Activate Panic Mode",
    deactivatePanic: "Deactivate Panic Mode",
    panicWarning: "This will immediately stop all withdrawals and transfers!",
    trustedContacts: "Trusted Contacts",
    trustedDesc: "People authorized for account recovery",
    addContact: "Add Contact",
    removeContact: "Remove",
    noContacts: "No trusted contacts added",
    canUnfreeze: "Can unfreeze",
    canRecover: "Can recover",
    securityLevel: "Security Level",
    standard: "Standard",
    high: "High",
    maximum: "Maximum",
    name: "Name",
    email: "Email",
    phone: "Phone",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    freezeReason: "Freeze Reason",
    frozenSince: "Frozen Since",
    recovery: "Account Recovery",
    startRecovery: "Start Recovery",
  },
  de: {
    title: "Notfalleinstellungen",
    subtitle: "Kontosicherheit und Notfallkontrollen",
    accountStatus: "Kontostatus",
    active: "Aktiv",
    frozen: "Eingefroren",
    panic: "NOTFALL",
    freezeAccount: "Konto einfrieren",
    unfreezeAccount: "Konto freigeben",
    freezeDesc: "Alle Transaktionen werden vorübergehend ausgesetzt",
    panicButton: "🚨 PANIC-TASTE",
    panicDesc: "Alle Transaktionen sofort stoppen und Sicherheitsmaßnahmen aktivieren",
    activatePanic: "Panikmodus aktivieren",
    deactivatePanic: "Panikmodus deaktivieren",
    panicWarning: "Dies stoppt sofort alle Auszahlungen und Überweisungen!",
    trustedContacts: "Vertrauenswürdige Kontakte",
    trustedDesc: "Für die Kontowiederherstellung autorisierte Personen",
    addContact: "Kontakt hinzufügen",
    removeContact: "Entfernen",
    noContacts: "Keine vertrauenswürdigen Kontakte hinzugefügt",
    canUnfreeze: "Kann freigeben",
    canRecover: "Kann wiederherstellen",
    securityLevel: "Sicherheitsstufe",
    standard: "Standard",
    high: "Hoch",
    maximum: "Maximum",
    name: "Name",
    email: "E-Mail",
    phone: "Telefon",
    save: "Speichern",
    cancel: "Abbrechen",
    confirm: "Bestätigen",
    freezeReason: "Einfriergrund",
    frozenSince: "Eingefroren seit",
    recovery: "Kontowiederherstellung",
    startRecovery: "Wiederherstellung starten",
  },
  fr: {
    title: "Paramètres d'urgence",
    subtitle: "Sécurité du compte et contrôles d'urgence",
    accountStatus: "Statut du compte",
    active: "Actif",
    frozen: "Gelé",
    panic: "URGENCE",
    freezeAccount: "Geler le compte",
    unfreezeAccount: "Dégeler le compte",
    freezeDesc: "Toutes les transactions seront temporairement suspendues",
    panicButton: "🚨 BOUTON PANIQUE",
    panicDesc: "Arrêter instantanément toutes les transactions et activer les mesures de sécurité",
    activatePanic: "Activer le mode panique",
    deactivatePanic: "Désactiver le mode panique",
    panicWarning: "Cela arrêtera immédiatement tous les retraits et transferts !",
    trustedContacts: "Contacts de confiance",
    trustedDesc: "Personnes autorisées pour la récupération du compte",
    addContact: "Ajouter un contact",
    removeContact: "Supprimer",
    noContacts: "Aucun contact de confiance ajouté",
    canUnfreeze: "Peut dégeler",
    canRecover: "Peut récupérer",
    securityLevel: "Niveau de sécurité",
    standard: "Standard",
    high: "Élevé",
    maximum: "Maximum",
    name: "Nom",
    email: "E-mail",
    phone: "Téléphone",
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
    freezeReason: "Raison du gel",
    frozenSince: "Gelé depuis",
    recovery: "Récupération du compte",
    startRecovery: "Lancer la récupération",
  },
  ar: {
    title: "إعدادات الطوارئ",
    subtitle: "أمان الحساب وضوابط الطوارئ",
    accountStatus: "حالة الحساب",
    active: "نشط",
    frozen: "مجمّد",
    panic: "طوارئ",
    freezeAccount: "تجميد الحساب",
    unfreezeAccount: "إلغاء تجميد الحساب",
    freezeDesc: "سيتم تعليق جميع المعاملات مؤقتاً",
    panicButton: "🚨 زر الطوارئ",
    panicDesc: "إيقاف جميع المعاملات فوراً وتفعيل إجراءات الأمان",
    activatePanic: "تفعيل وضع الطوارئ",
    deactivatePanic: "إلغاء وضع الطوارئ",
    panicWarning: "سيؤدي هذا إلى إيقاف جميع عمليات السحب والتحويل فوراً!",
    trustedContacts: "جهات الاتصال الموثوقة",
    trustedDesc: "الأشخاص المصرّح لهم باسترداد الحساب",
    addContact: "إضافة جهة اتصال",
    removeContact: "إزالة",
    noContacts: "لم تتم إضافة جهات اتصال موثوقة",
    canUnfreeze: "يمكنه إلغاء التجميد",
    canRecover: "يمكنه الاسترداد",
    securityLevel: "مستوى الأمان",
    standard: "قياسي",
    high: "عالي",
    maximum: "أقصى",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "الهاتف",
    save: "حفظ",
    cancel: "إلغاء",
    confirm: "تأكيد",
    freezeReason: "سبب التجميد",
    frozenSince: "مجمّد منذ",
    recovery: "استرداد الحساب",
    startRecovery: "بدء الاسترداد",
  },
  ru: {
    title: "Экстренные настройки",
    subtitle: "Безопасность аккаунта и экстренное управление",
    accountStatus: "Статус аккаунта",
    active: "Активен",
    frozen: "Заморожен",
    panic: "ЭКСТРЕННАЯ СИТУАЦИЯ",
    freezeAccount: "Заморозить аккаунт",
    unfreezeAccount: "Разморозить аккаунт",
    freezeDesc: "Все транзакции будут временно приостановлены",
    panicButton: "🚨 ТРЕВОЖНАЯ КНОПКА",
    panicDesc: "Мгновенно остановить все транзакции и активировать меры безопасности",
    activatePanic: "Активировать режим паники",
    deactivatePanic: "Деактивировать режим паники",
    panicWarning: "Это немедленно остановит все выводы и переводы!",
    trustedContacts: "Доверенные контакты",
    trustedDesc: "Люди, уполномоченные для восстановления аккаунта",
    addContact: "Добавить контакт",
    removeContact: "Удалить",
    noContacts: "Доверенные контакты не добавлены",
    canUnfreeze: "Может разморозить",
    canRecover: "Может восстановить",
    securityLevel: "Уровень безопасности",
    standard: "Стандартный",
    high: "Высокий",
    maximum: "Максимальный",
    name: "Имя",
    email: "Email",
    phone: "Телефон",
    save: "Сохранить",
    cancel: "Отмена",
    confirm: "Подтвердить",
    freezeReason: "Причина заморозки",
    frozenSince: "Заморожен с",
    recovery: "Восстановление аккаунта",
    startRecovery: "Начать восстановление",
  },
};

export function EmergencySettings({ walletAddress }: Props) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [config, setConfig] = useState<EmergencyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFreeze, setShowFreeze] = useState(false);
  const [showPanic, setShowPanic] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [emergencyError, setEmergencyError] = useState<string | null>(null);
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    canUnfreeze: false,
    canRecover: true,
  });

  useEffect(() => {
    fetchData();
  }, [walletAddress]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/security/emergency", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setConfig(data.config);
    } catch (error) {
      console.error("Emergency fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    try {
      const res = await fetch("/api/security/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "freeze",
          reason: freezeReason || t("freezeReason"),
          notifyContacts: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFreeze(false);
        setFreezeReason("");
        fetchData();
      }
    } catch (error) {
      console.error("Freeze error:", error);
    }
  };

  const handleUnfreeze = async () => {
    try {
      const res = await fetch("/api/security/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({ action: "unfreeze" }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setEmergencyError(data.error);
      }
    } catch (error) {
      console.error("Unfreeze error:", error);
    }
  };

  const handlePanic = async (activate: boolean) => {
    try {
      const res = await fetch("/api/security/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "panic",
          activate,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPanic(false);
        fetchData();
      } else {
        setEmergencyError(data.error);
      }
    } catch (error) {
      console.error("Panic error:", error);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name) return;

    try {
      const res = await fetch("/api/security/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "add_contact",
          ...newContact,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddContact(false);
        setNewContact({ name: "", email: "", phone: "", canUnfreeze: false, canRecover: true });
        fetchData();
      }
    } catch (error) {
      console.error("Add contact error:", error);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    try {
      const res = await fetch("/api/security/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "remove_contact",
          contactId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Remove contact error:", error);
    }
  };

  const handleSecurityLevel = async (level: "standard" | "high" | "maximum") => {
    try {
      const res = await fetch("/api/security/emergency", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "set_security_level",
          level,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Security level error:", error);
    }
  };

  const getStatusColor = () => {
    if (config?.panicMode) return "bg-red-500";
    if (config?.frozen) return "bg-[#BFA181]";
    return "bg-[#2F6F62]";
  };

  const getStatusLabel = () => {
    if (config?.panicMode) return t("panic");
    if (config?.frozen) return t("frozen");
    return t("active");
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-slate-800 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Emergency Error Banner */}
      {emergencyError && (
        <div className="p-3 rounded-xl bg-red-900/20 border border-red-800">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm font-medium text-red-400">{emergencyError}</p>
            <button onClick={() => setEmergencyError(null)} className="ml-auto text-red-400 hover:text-red-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Account Status */}
      <div className={`rounded-xl p-6 border ${
        config?.panicMode
          ? "bg-red-900/30 border-red-500/50"
          : config?.frozen
            ? "bg-[#BFA181]/20 border-[#BFA181]/50"
            : "bg-slate-800/50 border-slate-700"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${getStatusColor()} ${
              config?.panicMode ? "animate-pulse" : ""
            }`} />
            <div>
              <h3 className="text-lg font-semibold text-white">{t("accountStatus")}</h3>
              <p className={`text-sm ${
                config?.panicMode ? "text-red-400" : config?.frozen ? "text-[#BFA181]" : "text-[#2F6F62]"
              }`}>
                {getStatusLabel()}
              </p>
            </div>
          </div>

          {config?.frozen && !config?.panicMode ? (
            <button
              onClick={handleUnfreeze}
              className="px-4 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] transition-colors"
            >
              {t("unfreezeAccount")}
            </button>
          ) : !config?.frozen ? (
            <button
              onClick={() => setShowFreeze(true)}
              className="px-4 py-2 bg-[#BFA181]/20 text-[#BFA181] rounded-lg hover:bg-[#BFA181]/30 transition-colors"
            >
              {t("freezeAccount")}
            </button>
          ) : null}
        </div>

        {config?.frozen && config?.frozenAt && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              <span className="font-medium">{t("frozenSince")}:</span>{" "}
              {new Date(config.frozenAt).toLocaleString()}
            </p>
            {config.frozenReason && (
              <p className="text-sm text-slate-400 mt-1">
                <span className="font-medium">{t("freezeReason")}:</span>{" "}
                {config.frozenReason}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Panic Button */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{t("panicButton")}</h3>
            <p className="text-sm text-slate-400">{t("panicDesc")}</p>
          </div>
          <button
            onClick={() => setShowPanic(true)}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              config?.panicMode
                ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                : "bg-red-600 text-white hover:bg-red-700 hover:scale-105"
            }`}
          >
            {config?.panicMode ? t("deactivatePanic") : t("activatePanic")}
          </button>
        </div>
      </div>

      {/* Security Level */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">{t("securityLevel")}</h3>
        <div className="grid grid-cols-3 gap-3">
          {(["standard", "high", "maximum"] as const).map((level) => (
            <button
              key={level}
              onClick={() => handleSecurityLevel(level)}
              className={`p-4 rounded-xl border transition-all ${
                config?.securityLevel === level
                  ? level === "maximum"
                    ? "bg-red-500/20 border-red-500 text-red-400"
                    : level === "high"
                      ? "bg-[#BFA181]/20 border-[#BFA181] text-[#BFA181]"
                      : "bg-[#2F6F62]/20 border-[#2F6F62] text-[#2F6F62]"
                  : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <div className="text-2xl mb-2">
                {level === "standard" ? "🛡️" : level === "high" ? "🔐" : "🏰"}
              </div>
              <div className="font-medium">
                {level === "standard" ? t("standard") : level === "high" ? t("high") : t("maximum")}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trusted Contacts */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{t("trustedContacts")}</h3>
            <p className="text-sm text-slate-400">{t("trustedDesc")}</p>
          </div>
          <button
            onClick={() => setShowAddContact(true)}
            className="px-3 py-1.5 bg-[#2F6F62]/20 text-[#2F6F62] rounded-lg text-sm hover:bg-[#2F6F62]/30 transition-colors"
          >
            + {t("addContact")}
          </button>
        </div>

        {config?.trustedContacts.length === 0 ? (
          <p className="text-slate-500 text-center py-4">{t("noContacts")}</p>
        ) : (
          <div className="space-y-3">
            {config?.trustedContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-lg text-slate-400">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{contact.name}</p>
                    <p className="text-sm text-slate-500">
                      {contact.email || contact.phone || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {contact.canUnfreeze && (
                      <span className="px-2 py-1 bg-[#BFA181]/20 text-[#BFA181] rounded text-xs">
                        {t("canUnfreeze")}
                      </span>
                    )}
                    {contact.canRecover && (
                      <span className="px-2 py-1 bg-[#2F6F62]/20 text-[#2F6F62] rounded text-xs">
                        {t("canRecover")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveContact(contact.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    {t("removeContact")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Freeze Modal */}
      {showFreeze && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">{t("freezeAccount")}</h3>
            <p className="text-slate-400 mb-4">{t("freezeDesc")}</p>

            <input
              type="text"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder={t("freezeReason")}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#BFA181] mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowFreeze(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleFreeze}
                className="flex-1 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] transition-colors"
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panic Modal */}
      {showPanic && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-red-500/50">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🚨</div>
              <h3 className="text-xl font-bold text-white mb-2">
                {config?.panicMode ? t("deactivatePanic") : t("activatePanic")}
              </h3>
              <p className="text-red-400">{t("panicWarning")}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPanic(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => handlePanic(!config?.panicMode)}
                className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                  config?.panicMode
                    ? "bg-[#2F6F62] text-white hover:bg-[#2F6F62]"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">{t("addContact")}</h3>

            <div className="space-y-4">
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder={t("name")}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#2F6F62]"
              />
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder={t("email")}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#2F6F62]"
              />
              <input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder={t("phone")}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#2F6F62]"
              />

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={newContact.canUnfreeze}
                    onChange={(e) => setNewContact({ ...newContact, canUnfreeze: e.target.checked })}
                    className="rounded"
                  />
                  {t("canUnfreeze")}
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={newContact.canRecover}
                    onChange={(e) => setNewContact({ ...newContact, canRecover: e.target.checked })}
                    className="rounded"
                  />
                  {t("canRecover")}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddContact(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddContact}
                disabled={!newContact.name}
                className="flex-1 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] transition-colors disabled:opacity-50"
              >
                {t("save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
