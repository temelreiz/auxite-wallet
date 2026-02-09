"use client";

import { useState, useEffect } from "react";

interface EmailPreferencesProps {
  walletAddress: string;
  lang?: "tr" | "en";
}

interface Preferences {
  transactions: boolean;
  deposits: boolean;
  withdrawals: boolean;
  staking: boolean;
  security: boolean;
  marketing: boolean;
}

export function EmailPreferences({ walletAddress, lang = "en" }: EmailPreferencesProps) {
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

  const t = {
    title: lang === "tr" ? "Email Bildirimleri" : "Email Notifications",
    description: lang === "tr" 
      ? "İşlemleriniz hakkında email bildirimleri alın" 
      : "Receive email notifications about your transactions",
    email: lang === "tr" ? "Email Adresi" : "Email Address",
    emailPlaceholder: lang === "tr" ? "ornek@email.com" : "example@email.com",
    noEmail: lang === "tr" ? "Email adresi eklenmemiş" : "No email address added",
    addEmail: lang === "tr" ? "Email Ekle" : "Add Email",
    changeEmail: lang === "tr" ? "Değiştir" : "Change",
    save: lang === "tr" ? "Kaydet" : "Save",
    saving: lang === "tr" ? "Kaydediliyor..." : "Saving...",
    cancel: lang === "tr" ? "İptal" : "Cancel",
    preferences: lang === "tr" ? "Bildirim Tercihleri" : "Notification Preferences",
    transactions: lang === "tr" ? "İşlem Bildirimleri" : "Transaction Notifications",
    transactionsDesc: lang === "tr" ? "Alım/satım işlemleri tamamlandığında" : "When buy/sell trades are completed",
    deposits: lang === "tr" ? "Yatırım Bildirimleri" : "Deposit Notifications",
    depositsDesc: lang === "tr" ? "Hesabınıza yatırım yapıldığında" : "When deposits are credited",
    withdrawals: lang === "tr" ? "Çekim Bildirimleri" : "Withdrawal Notifications",
    withdrawalsDesc: lang === "tr" ? "Çekim işlemi gönderildiğinde" : "When withdrawals are sent",
    staking: lang === "tr" ? "Stake Bildirimleri" : "Staking Notifications",
    stakingDesc: lang === "tr" ? "Stake başlangıç/bitiş ve uyarılar" : "Stake start/end and reminders",
    security: lang === "tr" ? "Güvenlik Bildirimleri" : "Security Notifications",
    securityDesc: lang === "tr" ? "Yeni giriş, şifre değişikliği vb." : "New login, password changes, etc.",
    marketing: lang === "tr" ? "Pazarlama Bildirimleri" : "Marketing Notifications",
    marketingDesc: lang === "tr" ? "Kampanya ve duyurular" : "Campaigns and announcements",
    saved: lang === "tr" ? "Tercihler kaydedildi" : "Preferences saved",
  };

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
      setError(lang === "tr" ? "Email adresi gerekli" : "Email address required");
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
      setSuccess(t.saved);
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
        <h3 className="text-lg font-semibold text-white">{t.title}</h3>
        <p className="text-sm text-slate-400">{t.description}</p>
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
        <label className="block text-sm text-slate-400 mb-2">{t.email}</label>
        
        {!hasEmail || editingEmail ? (
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.emailPlaceholder}
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-[#2F6F62] focus:outline-none"
            />
            <button
              onClick={handleSaveEmail}
              disabled={saving}
              className="px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {saving ? "..." : t.save}
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
                {t.cancel}
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
              {t.changeEmail}
            </button>
          </div>
        )}
      </div>

      {/* Preferences */}
      {hasEmail && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-300">{t.preferences}</h4>
          
          {/* Transactions */}
          <PreferenceToggle
            label={t.transactions}
            description={t.transactionsDesc}
            checked={preferences.transactions}
            onChange={() => handleTogglePreference("transactions")}
          />

          {/* Deposits */}
          <PreferenceToggle
            label={t.deposits}
            description={t.depositsDesc}
            checked={preferences.deposits}
            onChange={() => handleTogglePreference("deposits")}
          />

          {/* Withdrawals */}
          <PreferenceToggle
            label={t.withdrawals}
            description={t.withdrawalsDesc}
            checked={preferences.withdrawals}
            onChange={() => handleTogglePreference("withdrawals")}
          />

          {/* Staking */}
          <PreferenceToggle
            label={t.staking}
            description={t.stakingDesc}
            checked={preferences.staking}
            onChange={() => handleTogglePreference("staking")}
          />

          {/* Security */}
          <PreferenceToggle
            label={t.security}
            description={t.securityDesc}
            checked={preferences.security}
            onChange={() => handleTogglePreference("security")}
            important
          />

          {/* Marketing */}
          <PreferenceToggle
            label={t.marketing}
            description={t.marketingDesc}
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
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  important?: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-white text-sm">{label}</span>
          {important && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded">
              Recommended
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
