"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface LimitConfig {
  enabled: boolean;
  amount: number;
  used: number;
  resetAt?: string;
}

interface TransactionLimits {
  enabled: boolean;
  daily: LimitConfig;
  weekly: LimitConfig;
  monthly: LimitConfig;
  perTransaction: LimitConfig;
  whitelistedAddresses: string[];
}

interface Props {
  walletAddress: string;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "İşlem Limitleri",
    subtitle: "Günlük, haftalık ve aylık çekim limitleri",
    enabled: "Limitler Aktif",
    disabled: "Limitler Kapalı",
    daily: "Günlük Limit",
    weekly: "Haftalık Limit",
    monthly: "Aylık Limit",
    perTx: "İşlem Başına",
    used: "Kullanılan",
    remaining: "Kalan",
    resetIn: "Sıfırlanma",
    whitelist: "Güvenilir Adresler",
    whitelistDesc: "Bu adreslere gönderimde limit uygulanmaz",
    addAddress: "Adres Ekle",
    remove: "Kaldır",
    noWhitelist: "Güvenilir adres eklenmemiş",
    edit: "Düzenle",
    save: "Kaydet",
    cancel: "İptal",
    hours: "saat",
    days: "gün",
    aboveRequiresMultiApproval: "Üstü çoklu onay gerektirir",
  },
  en: {
    title: "Transaction Limits",
    subtitle: "Daily, weekly and monthly withdrawal limits",
    enabled: "Limits Active",
    disabled: "Limits Disabled",
    daily: "Daily Limit",
    weekly: "Weekly Limit",
    monthly: "Monthly Limit",
    perTx: "Per Transaction",
    used: "Used",
    remaining: "Remaining",
    resetIn: "Resets in",
    whitelist: "Trusted Addresses",
    whitelistDesc: "No limits apply when sending to these addresses",
    addAddress: "Add Address",
    remove: "Remove",
    noWhitelist: "No trusted addresses added",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    hours: "hours",
    days: "days",
    aboveRequiresMultiApproval: "Above requires multi-approval",
  },
  de: {
    title: "Transaktionslimits",
    subtitle: "Tägliche, wöchentliche und monatliche Auszahlungslimits",
    enabled: "Limits Aktiv",
    disabled: "Limits Deaktiviert",
    daily: "Tägliches Limit",
    weekly: "Wöchentliches Limit",
    monthly: "Monatliches Limit",
    perTx: "Pro Transaktion",
    used: "Verwendet",
    remaining: "Verbleibend",
    resetIn: "Zurücksetzung in",
    whitelist: "Vertrauenswürdige Adressen",
    whitelistDesc: "Keine Limits bei Sendungen an diese Adressen",
    addAddress: "Adresse hinzufügen",
    remove: "Entfernen",
    noWhitelist: "Keine vertrauenswürdigen Adressen hinzugefügt",
    edit: "Bearbeiten",
    save: "Speichern",
    cancel: "Abbrechen",
    hours: "Stunden",
    days: "Tage",
    aboveRequiresMultiApproval: "Darüber ist Multi-Genehmigung erforderlich",
  },
  fr: {
    title: "Limites de transaction",
    subtitle: "Limites de retrait quotidiennes, hebdomadaires et mensuelles",
    enabled: "Limites actives",
    disabled: "Limites désactivées",
    daily: "Limite quotidienne",
    weekly: "Limite hebdomadaire",
    monthly: "Limite mensuelle",
    perTx: "Par transaction",
    used: "Utilisé",
    remaining: "Restant",
    resetIn: "Réinitialisation dans",
    whitelist: "Adresses de confiance",
    whitelistDesc: "Aucune limite ne s'applique lors de l'envoi à ces adresses",
    addAddress: "Ajouter une adresse",
    remove: "Supprimer",
    noWhitelist: "Aucune adresse de confiance ajoutée",
    edit: "Modifier",
    save: "Enregistrer",
    cancel: "Annuler",
    hours: "heures",
    days: "jours",
    aboveRequiresMultiApproval: "Au-dessus nécessite une approbation multiple",
  },
  ar: {
    title: "حدود المعاملات",
    subtitle: "حدود السحب اليومية والأسبوعية والشهرية",
    enabled: "الحدود مفعّلة",
    disabled: "الحدود معطّلة",
    daily: "الحد اليومي",
    weekly: "الحد الأسبوعي",
    monthly: "الحد الشهري",
    perTx: "لكل معاملة",
    used: "مستخدم",
    remaining: "متبقي",
    resetIn: "إعادة التعيين خلال",
    whitelist: "العناوين الموثوقة",
    whitelistDesc: "لا تطبق حدود عند الإرسال إلى هذه العناوين",
    addAddress: "إضافة عنوان",
    remove: "إزالة",
    noWhitelist: "لم تتم إضافة عناوين موثوقة",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    hours: "ساعات",
    days: "أيام",
    aboveRequiresMultiApproval: "ما فوق يتطلب موافقة متعددة",
  },
  ru: {
    title: "Лимиты транзакций",
    subtitle: "Дневные, недельные и месячные лимиты вывода",
    enabled: "Лимиты активны",
    disabled: "Лимиты отключены",
    daily: "Дневной лимит",
    weekly: "Недельный лимит",
    monthly: "Месячный лимит",
    perTx: "За транзакцию",
    used: "Использовано",
    remaining: "Осталось",
    resetIn: "Сброс через",
    whitelist: "Доверенные адреса",
    whitelistDesc: "Лимиты не применяются при отправке на эти адреса",
    addAddress: "Добавить адрес",
    remove: "Удалить",
    noWhitelist: "Доверенные адреса не добавлены",
    edit: "Редактировать",
    save: "Сохранить",
    cancel: "Отмена",
    hours: "часов",
    days: "дней",
    aboveRequiresMultiApproval: "Выше требуется множественное одобрение",
  },
};

export function TransactionLimitsSettings({ walletAddress }: Props) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [limits, setLimits] = useState<TransactionLimits | null>(null);
  const [usage, setUsage] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [nextReset, setNextReset] = useState({ daily: "", weekly: "", monthly: "" });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({ daily: 0, weekly: 0, monthly: 0, perTransaction: 0 });
  const [newAddress, setNewAddress] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);

  useEffect(() => {
    fetchData();
  }, [walletAddress]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/security/limits", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setLimits(data.limits);
      setUsage(data.usage);
      setNextReset(data.nextReset);
      setEditValues({
        daily: data.limits.daily.amount,
        weekly: data.limits.weekly.amount,
        monthly: data.limits.monthly.amount,
        perTransaction: data.limits.perTransaction.amount,
      });
    } catch (error) {
      console.error("Limits fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch("/api/security/limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "toggle",
          type: "all",
          enabled: !limits?.enabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/security/limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "update_limits",
          ...editValues,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditing(false);
        fetchData();
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const handleAddWhitelist = async () => {
    if (!newAddress) return;

    try {
      const res = await fetch("/api/security/limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "add_whitelist",
          address: newAddress,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewAddress("");
        setShowAddAddress(false);
        fetchData();
      }
    } catch (error) {
      console.error("Add whitelist error:", error);
    }
  };

  const handleRemoveWhitelist = async (address: string) => {
    try {
      const res = await fetch("/api/security/limits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "remove_whitelist",
          address,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Remove whitelist error:", error);
    }
  };

  const formatResetTime = (isoDate: string) => {
    const diff = new Date(isoDate).getTime() - Date.now();
    if (diff <= 0) return "0h";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}${t("hours")}`;
    const days = Math.floor(hours / 24);
    return `${days}${t("days")}`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-[#BFA181]";
    return "bg-[#2F6F62]";
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-slate-800 rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
          <p className="text-sm text-slate-400">{t("subtitle")}</p>
        </div>
        <button
          onClick={handleToggle}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            limits?.enabled
              ? "bg-[#2F6F62]/20 text-[#2F6F62] hover:bg-[#2F6F62]/30"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {limits?.enabled ? t("enabled") : t("disabled")}
        </button>
      </div>

      {limits?.enabled && (
        <>
          {/* Limit Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Daily */}
            <LimitCard
              label={t("daily")}
              limit={limits.daily.amount}
              used={limits.daily.used}
              percentage={usage.daily}
              resetTime={formatResetTime(nextReset.daily)}
              usedLabel={t("used")}
              remainingLabel={t("remaining")}
              resetInLabel={t("resetIn")}
              editing={editing}
              editValue={editValues.daily}
              onEditChange={(v) => setEditValues({ ...editValues, daily: v })}
              getProgressColor={getProgressColor}
            />

            {/* Weekly */}
            <LimitCard
              label={t("weekly")}
              limit={limits.weekly.amount}
              used={limits.weekly.used}
              percentage={usage.weekly}
              resetTime={formatResetTime(nextReset.weekly)}
              usedLabel={t("used")}
              remainingLabel={t("remaining")}
              resetInLabel={t("resetIn")}
              editing={editing}
              editValue={editValues.weekly}
              onEditChange={(v) => setEditValues({ ...editValues, weekly: v })}
              getProgressColor={getProgressColor}
            />

            {/* Monthly */}
            <LimitCard
              label={t("monthly")}
              limit={limits.monthly.amount}
              used={limits.monthly.used}
              percentage={usage.monthly}
              resetTime={formatResetTime(nextReset.monthly)}
              usedLabel={t("used")}
              remainingLabel={t("remaining")}
              resetInLabel={t("resetIn")}
              editing={editing}
              editValue={editValues.monthly}
              onEditChange={(v) => setEditValues({ ...editValues, monthly: v })}
              getProgressColor={getProgressColor}
            />

            {/* Per Transaction */}
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">{t("perTx")}</span>
                <span className="text-[#BFA181] text-sm">Multi-sig</span>
              </div>
              {editing ? (
                <input
                  type="number"
                  value={editValues.perTransaction}
                  onChange={(e) => setEditValues({ ...editValues, perTransaction: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-lg font-bold"
                />
              ) : (
                <p className="text-2xl font-bold text-white">
                  ${limits.perTransaction.amount.toLocaleString()}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {t("aboveRequiresMultiApproval")}
              </p>
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex justify-end gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] transition-colors"
                >
                  {t("save")}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t("edit")}
              </button>
            )}
          </div>

          {/* Whitelist */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-white">{t("whitelist")}</h4>
                <p className="text-sm text-slate-500">{t("whitelistDesc")}</p>
              </div>
              <button
                onClick={() => setShowAddAddress(true)}
                className="px-3 py-1.5 bg-[#2F6F62]/20 text-[#2F6F62] rounded-lg text-sm hover:bg-[#2F6F62]/30 transition-colors"
              >
                + {t("addAddress")}
              </button>
            </div>

            {limits.whitelistedAddresses.length === 0 ? (
              <p className="text-slate-500 text-center py-4">{t("noWhitelist")}</p>
            ) : (
              <div className="space-y-2">
                {limits.whitelistedAddresses.map((address, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <span className="text-white font-mono text-sm">
                      {address.slice(0, 10)}...{address.slice(-8)}
                    </span>
                    <button
                      onClick={() => handleRemoveWhitelist(address)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      {t("remove")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">{t("addAddress")}</h3>

            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-[#2F6F62]"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddAddress(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddWhitelist}
                disabled={!newAddress}
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

// Limit Card Component
function LimitCard({
  label,
  limit,
  used,
  percentage,
  resetTime,
  usedLabel,
  remainingLabel,
  resetInLabel,
  editing,
  editValue,
  onEditChange,
  getProgressColor,
}: {
  label: string;
  limit: number;
  used: number;
  percentage: number;
  resetTime: string;
  usedLabel: string;
  remainingLabel: string;
  resetInLabel: string;
  editing: boolean;
  editValue: number;
  onEditChange: (v: number) => void;
  getProgressColor: (p: number) => string;
}) {
  const remaining = limit - used;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-500 text-sm">{resetInLabel} {resetTime}</span>
      </div>

      {editing ? (
        <input
          type="number"
          value={editValue}
          onChange={(e) => onEditChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-lg font-bold mb-2"
        />
      ) : (
        <p className="text-2xl font-bold text-white mb-2">
          ${limit.toLocaleString()}
        </p>
      )}

      {/* Progress Bar */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${getProgressColor(percentage)} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-slate-500">
          {usedLabel}: ${used.toLocaleString()}
        </span>
        <span className="text-[#2F6F62]">
          {remainingLabel}: ${remaining.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
