"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface EmailPreferencesProps {
  walletAddress: string;
}

interface Preferences {
  transactions: boolean;
  deposits: boolean;
  withdrawals: boolean;
  staking: boolean;
  security: boolean;
  marketing: boolean;
}

const translations = {
  tr: {
    title: "Email Bildirimleri",
    description: "Islemleriniz hakkinda email bildirimleri alin",
    email: "Email Adresi",
    emailPlaceholder: "ornek@email.com",
    noEmail: "Email adresi eklenmemis",
    addEmail: "Email Ekle",
    changeEmail: "Degistir",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    cancel: "Iptal",
    preferences: "Bildirim Tercihleri",
    transactions: "Islem Bildirimleri",
    transactionsDesc: "Alim/satim islemleri tamamlandiginda",
    deposits: "Yatirim Bildirimleri",
    depositsDesc: "Hesabiniza yatirim yapildiginda",
    withdrawals: "Cekim Bildirimleri",
    withdrawalsDesc: "Cekim islemi gonderildiginde",
    staking: "Stake Bildirimleri",
    stakingDesc: "Stake baslangic/bitis ve uyarilar",
    security: "Guvenlik Bildirimleri",
    securityDesc: "Yeni giris, sifre degisikligi vb.",
    marketing: "Pazarlama Bildirimleri",
    marketingDesc: "Kampanya ve duyurular",
    saved: "Tercihler kaydedildi",
    emailRequired: "Email adresi gerekli",
    recommended: "Onerilen",
  },
  en: {
    title: "Email Notifications",
    description: "Receive email notifications about your transactions",
    email: "Email Address",
    emailPlaceholder: "example@email.com",
    noEmail: "No email address added",
    addEmail: "Add Email",
    changeEmail: "Change",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    preferences: "Notification Preferences",
    transactions: "Transaction Notifications",
    transactionsDesc: "When buy/sell trades are completed",
    deposits: "Deposit Notifications",
    depositsDesc: "When deposits are credited",
    withdrawals: "Withdrawal Notifications",
    withdrawalsDesc: "When withdrawals are sent",
    staking: "Staking Notifications",
    stakingDesc: "Stake start/end and reminders",
    security: "Security Notifications",
    securityDesc: "New login, password changes, etc.",
    marketing: "Marketing Notifications",
    marketingDesc: "Campaigns and announcements",
    saved: "Preferences saved",
    emailRequired: "Email address required",
    recommended: "Recommended",
  },
  de: {
    title: "E-Mail-Benachrichtigungen",
    description: "Erhalten Sie E-Mail-Benachrichtigungen zu Ihren Transaktionen",
    email: "E-Mail-Adresse",
    emailPlaceholder: "beispiel@email.com",
    noEmail: "Keine E-Mail-Adresse hinzugefugt",
    addEmail: "E-Mail Hinzufugen",
    changeEmail: "Andern",
    save: "Speichern",
    saving: "Speichern...",
    cancel: "Abbrechen",
    preferences: "Benachrichtigungseinstellungen",
    transactions: "Transaktionsbenachrichtigungen",
    transactionsDesc: "Wenn Kauf-/Verkaufstransaktionen abgeschlossen sind",
    deposits: "Einzahlungsbenachrichtigungen",
    depositsDesc: "Wenn Einzahlungen gutgeschrieben werden",
    withdrawals: "Auszahlungsbenachrichtigungen",
    withdrawalsDesc: "Wenn Auszahlungen gesendet werden",
    staking: "Staking-Benachrichtigungen",
    stakingDesc: "Staking Start/Ende und Erinnerungen",
    security: "Sicherheitsbenachrichtigungen",
    securityDesc: "Neue Anmeldung, Passwortwechsel usw.",
    marketing: "Marketing-Benachrichtigungen",
    marketingDesc: "Kampagnen und Ankuendigungen",
    saved: "Einstellungen gespeichert",
    emailRequired: "E-Mail-Adresse erforderlich",
    recommended: "Empfohlen",
  },
  fr: {
    title: "Notifications par E-mail",
    description: "Recevez des notifications par e-mail concernant vos transactions",
    email: "Adresse E-mail",
    emailPlaceholder: "exemple@email.com",
    noEmail: "Aucune adresse e-mail ajoutee",
    addEmail: "Ajouter un E-mail",
    changeEmail: "Modifier",
    save: "Sauvegarder",
    saving: "Sauvegarde...",
    cancel: "Annuler",
    preferences: "Preferences de Notification",
    transactions: "Notifications de Transactions",
    transactionsDesc: "Lorsque les transactions d'achat/vente sont terminees",
    deposits: "Notifications de Depot",
    depositsDesc: "Lorsque les depots sont credites",
    withdrawals: "Notifications de Retrait",
    withdrawalsDesc: "Lorsque les retraits sont envoyes",
    staking: "Notifications de Staking",
    stakingDesc: "Debut/fin de staking et rappels",
    security: "Notifications de Securite",
    securityDesc: "Nouvelle connexion, changements de mot de passe, etc.",
    marketing: "Notifications Marketing",
    marketingDesc: "Campagnes et annonces",
    saved: "Preferences sauvegardees",
    emailRequired: "Adresse e-mail requise",
    recommended: "Recommande",
  },
  ar: {
    title: "اشعارات البريد الالكتروني",
    description: "تلقي اشعارات البريد الالكتروني حول معاملاتك",
    email: "عنوان البريد الالكتروني",
    emailPlaceholder: "مثال@email.com",
    noEmail: "لم يتم اضافة عنوان بريد الكتروني",
    addEmail: "اضافة بريد الكتروني",
    changeEmail: "تغيير",
    save: "حفظ",
    saving: "جاري الحفظ...",
    cancel: "الغاء",
    preferences: "تفضيلات الاشعارات",
    transactions: "اشعارات المعاملات",
    transactionsDesc: "عند اكتمال معاملات الشراء/البيع",
    deposits: "اشعارات الايداع",
    depositsDesc: "عند اضافة الايداعات",
    withdrawals: "اشعارات السحب",
    withdrawalsDesc: "عند ارسال عمليات السحب",
    staking: "اشعارات الستيكنج",
    stakingDesc: "بداية/نهاية الستيكنج والتذكيرات",
    security: "اشعارات الامان",
    securityDesc: "تسجيل دخول جديد، تغيير كلمة المرور، الخ.",
    marketing: "اشعارات التسويق",
    marketingDesc: "الحملات والاعلانات",
    saved: "تم حفظ التفضيلات",
    emailRequired: "عنوان البريد الالكتروني مطلوب",
    recommended: "موصى به",
  },
  ru: {
    title: "Email Уведомления",
    description: "Получайте email уведомления о ваших транзакциях",
    email: "Email Адрес",
    emailPlaceholder: "пример@email.com",
    noEmail: "Email адрес не добавлен",
    addEmail: "Добавить Email",
    changeEmail: "Изменить",
    save: "Сохранить",
    saving: "Сохранение...",
    cancel: "Отмена",
    preferences: "Настройки Уведомлений",
    transactions: "Уведомления о Транзакциях",
    transactionsDesc: "Когда сделки покупки/продажи завершены",
    deposits: "Уведомления о Депозитах",
    depositsDesc: "Когда депозиты зачислены",
    withdrawals: "Уведомления о Выводах",
    withdrawalsDesc: "Когда выводы отправлены",
    staking: "Уведомления о Стейкинге",
    stakingDesc: "Начало/конец стейкинга и напоминания",
    security: "Уведомления о Безопасности",
    securityDesc: "Новый вход, смена пароля и т.д.",
    marketing: "Маркетинговые Уведомления",
    marketingDesc: "Кампании и объявления",
    saved: "Настройки сохранены",
    emailRequired: "Email адрес обязателен",
    recommended: "Рекомендуется",
  },
};

export function EmailPreferences({ walletAddress }: EmailPreferencesProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [hasEmail, setHasEmail] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>({
    transactions: true,
    deposits: true,
    withdrawals: true,
    staking: true,
    security: true,
    marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [walletAddress]);

  const fetchPreferences = async () => {
    try {
      const res = await fetch(`/api/notifications/email?address=${walletAddress}`);
      const data = await res.json();

      if (data.preferences) {
        setPreferences(data.preferences);
      }
      setMaskedEmail(data.email);
      setHasEmail(data.hasEmail);
    } catch (err) {
      console.error("Fetch preferences error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/notifications/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      setHasEmail(true);
      setMaskedEmail(`${email.slice(0, 3)}***@${email.split("@")[1]}`);
      setEditingEmail(false);
      setEmail("");
      setSuccess(t("saved"));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePreference = async (key: keyof Preferences) => {
    const newPreferences = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPreferences);

    try {
      await fetch("/api/notifications/email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, preferences: { [key]: newPreferences[key] } }),
      });
    } catch (err) {
      // Revert on error
      setPreferences(preferences);
      console.error("Toggle preference error:", err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-slate-700 rounded w-1/3"></div>
        <div className="h-20 bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
        <p className="text-sm text-slate-400">{t("description")}</p>
      </div>

      {/* Success/Error */}
      {success && (
        <div className="p-3 bg-[#2F6F62]/20 border border-[#2F6F62]/30 rounded-lg text-[#2F6F62] text-sm">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          ✕ {error}
        </div>
      )}

      {/* Email Section */}
      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl">
        <label className="block text-sm text-slate-400 mb-2">{t("email")}</label>

        {!hasEmail || editingEmail ? (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-[#2F6F62] focus:outline-none"
            />
            <button
              onClick={handleSaveEmail}
              disabled={saving}
              className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? "..." : t("save")}
            </button>
            {editingEmail && (
              <button
                onClick={() => {
                  setEditingEmail(false);
                  setEmail("");
                  setError(null);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                {t("cancel")}
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white">{maskedEmail}</span>
            <button
              onClick={() => setEditingEmail(true)}
              className="text-sm text-[#2F6F62] hover:text-[#BFA181] transition-colors"
            >
              {t("changeEmail")}
            </button>
          </div>
        )}
      </div>

      {/* Preferences */}
      {hasEmail && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">{t("preferences")}</h4>

          {/* Transactions */}
          <PreferenceToggle
            label={t("transactions")}
            description={t("transactionsDesc")}
            checked={preferences.transactions}
            onChange={() => handleTogglePreference("transactions")}
          />

          {/* Deposits */}
          <PreferenceToggle
            label={t("deposits")}
            description={t("depositsDesc")}
            checked={preferences.deposits}
            onChange={() => handleTogglePreference("deposits")}
          />

          {/* Withdrawals */}
          <PreferenceToggle
            label={t("withdrawals")}
            description={t("withdrawalsDesc")}
            checked={preferences.withdrawals}
            onChange={() => handleTogglePreference("withdrawals")}
          />

          {/* Staking */}
          <PreferenceToggle
            label={t("staking")}
            description={t("stakingDesc")}
            checked={preferences.staking}
            onChange={() => handleTogglePreference("staking")}
          />

          {/* Security */}
          <PreferenceToggle
            label={t("security")}
            description={t("securityDesc")}
            checked={preferences.security}
            onChange={() => handleTogglePreference("security")}
            important
            recommendedLabel={t("recommended")}
          />

          {/* Marketing */}
          <PreferenceToggle
            label={t("marketing")}
            description={t("marketingDesc")}
            checked={preferences.marketing}
            onChange={() => handleTogglePreference("marketing")}
          />
        </div>
      )}
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
  important,
  recommendedLabel,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  important?: boolean;
  recommendedLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">{label}</span>
          {important && (
            <span className="text-xs px-1.5 py-0.5 bg-[#BFA181]/20 text-[#BFA181] rounded">
              {recommendedLabel || "Recommended"}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-[#2F6F62]" : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}
