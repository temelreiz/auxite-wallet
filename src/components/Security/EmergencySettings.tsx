"use client";

import { useState, useEffect } from "react";

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
  lang: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const t = {
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
};

export function EmergencySettings({ walletAddress, lang }: Props) {
  const [config, setConfig] = useState<EmergencyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFreeze, setShowFreeze] = useState(false);
  const [showPanic, setShowPanic] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [freezeReason, setFreezeReason] = useState("");
  const [newContact, setNewContact] = useState({
    name: "",
    email: "",
    phone: "",
    canUnfreeze: false,
    canRecover: true,
  });

  const labels = (t as Record<string, typeof t.en>)[lang] || t.en;

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
          reason: freezeReason || "Manuel dondurma",
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
        alert(data.error);
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
        alert(data.error);
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
    if (config?.frozen) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStatusLabel = () => {
    if (config?.panicMode) return labels.panic;
    if (config?.frozen) return labels.frozen;
    return labels.active;
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-slate-800 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Account Status */}
      <div className={`rounded-xl p-6 border ${
        config?.panicMode 
          ? "bg-red-900/30 border-red-500/50" 
          : config?.frozen 
            ? "bg-amber-900/30 border-amber-500/50"
            : "bg-slate-800/50 border-slate-700"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-4 h-4 rounded-full ${getStatusColor()} ${
              config?.panicMode ? "animate-pulse" : ""
            }`} />
            <div>
              <h3 className="text-lg font-semibold text-white">{labels.accountStatus}</h3>
              <p className={`text-sm ${
                config?.panicMode ? "text-red-400" : config?.frozen ? "text-amber-400" : "text-emerald-400"
              }`}>
                {getStatusLabel()}
              </p>
            </div>
          </div>

          {config?.frozen && !config?.panicMode ? (
            <button
              onClick={handleUnfreeze}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              {labels.unfreezeAccount}
            </button>
          ) : !config?.frozen ? (
            <button
              onClick={() => setShowFreeze(true)}
              className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
            >
              {labels.freezeAccount}
            </button>
          ) : null}
        </div>

        {config?.frozen && config?.frozenAt && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              <span className="font-medium">{labels.frozenSince}:</span>{" "}
              {new Date(config.frozenAt).toLocaleString()}
            </p>
            {config.frozenReason && (
              <p className="text-sm text-slate-400 mt-1">
                <span className="font-medium">{labels.freezeReason}:</span>{" "}
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
            <h3 className="text-lg font-semibold text-white">{labels.panicButton}</h3>
            <p className="text-sm text-slate-400">{labels.panicDesc}</p>
          </div>
          <button
            onClick={() => setShowPanic(true)}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              config?.panicMode
                ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                : "bg-red-600 text-white hover:bg-red-700 hover:scale-105"
            }`}
          >
            {config?.panicMode ? labels.deactivatePanic : labels.activatePanic}
          </button>
        </div>
      </div>

      {/* Security Level */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">{labels.securityLevel}</h3>
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
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              <div className="text-2xl mb-2">
                {level === "standard" ? "🛡️" : level === "high" ? "🔐" : "🏰"}
              </div>
              <div className="font-medium">
                {level === "standard" ? labels.standard : level === "high" ? labels.high : labels.maximum}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trusted Contacts */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{labels.trustedContacts}</h3>
            <p className="text-sm text-slate-400">{labels.trustedDesc}</p>
          </div>
          <button
            onClick={() => setShowAddContact(true)}
            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
          >
            + {labels.addContact}
          </button>
        </div>

        {config?.trustedContacts.length === 0 ? (
          <p className="text-slate-500 text-center py-4">{labels.noContacts}</p>
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
                      <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs">
                        {labels.canUnfreeze}
                      </span>
                    )}
                    {contact.canRecover && (
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                        {labels.canRecover}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveContact(contact.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    {labels.removeContact}
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
            <h3 className="text-lg font-semibold text-white mb-4">{labels.freezeAccount}</h3>
            <p className="text-slate-400 mb-4">{labels.freezeDesc}</p>

            <input
              type="text"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              placeholder={labels.freezeReason}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-amber-500 mb-4"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowFreeze(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleFreeze}
                className="flex-1 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                {labels.confirm}
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
                {config?.panicMode ? labels.deactivatePanic : labels.activatePanic}
              </h3>
              <p className="text-red-400">{labels.panicWarning}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPanic(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                onClick={() => handlePanic(!config?.panicMode)}
                className={`flex-1 py-3 rounded-lg font-bold transition-colors ${
                  config?.panicMode
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {labels.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">{labels.addContact}</h3>

            <div className="space-y-4">
              <input
                type="text"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                placeholder={labels.name}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder={labels.email}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="tel"
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                placeholder={labels.phone}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={newContact.canUnfreeze}
                    onChange={(e) => setNewContact({ ...newContact, canUnfreeze: e.target.checked })}
                    className="rounded"
                  />
                  {labels.canUnfreeze}
                </label>
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={newContact.canRecover}
                    onChange={(e) => setNewContact({ ...newContact, canRecover: e.target.checked })}
                    className="rounded"
                  />
                  {labels.canRecover}
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddContact(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                onClick={handleAddContact}
                disabled={!newContact.name}
                className="flex-1 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {labels.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
