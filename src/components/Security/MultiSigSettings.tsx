"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/components/LanguageContext";

interface Signer {
  id: string;
  walletAddress: string;
  name: string;
  email?: string;
  role: "owner" | "approver" | "viewer";
  addedAt: string;
}

interface PendingTransaction {
  id: string;
  type: string;
  amount?: number;
  token?: string;
  toAddress?: string;
  approvals: { walletAddress: string; timestamp: string }[];
  rejections: { walletAddress: string; reason?: string }[];
  requiredApprovals: number;
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface MultiSigConfig {
  enabled: boolean;
  requiredApprovals: number;
  totalSigners: number;
  signers: Signer[];
  thresholdAmount: number;
}

interface Props {
  walletAddress: string;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Çoklu İmza (Multi-Sig)",
    subtitle: "Büyük işlemler için çoklu onay sistemi",
    enabled: "Multi-Sig Aktif",
    disabled: "Multi-Sig Kapalı",
    enable: "Aktifleştir",
    disable: "Kapat",
    signers: "Onaylayıcılar",
    addSigner: "Onaylayıcı Ekle",
    removeSigner: "Kaldır",
    pendingTx: "Bekleyen İşlemler",
    noPending: "Bekleyen işlem yok",
    approve: "Onayla",
    reject: "Reddet",
    threshold: "Eşik Miktarı",
    thresholdDesc: "Bu miktarın üzerindeki işlemler çoklu onay gerektirir",
    requiredApprovals: "Gerekli Onay",
    of: "/",
    owner: "Sahip",
    approver: "Onaylayıcı",
    viewer: "İzleyici",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    pending: "Bekliyor",
    expired: "Süresi Doldu",
    name: "İsim",
    address: "Cüzdan Adresi",
    email: "Email (opsiyonel)",
    role: "Rol",
    save: "Kaydet",
    cancel: "İptal",
    expiresIn: "Süre:",
    noSigners: "Henüz onaylayıcı eklenmemiş",
  },
  en: {
    title: "Multi-Signature",
    subtitle: "Multi-approval system for large transactions",
    enabled: "Multi-Sig Active",
    disabled: "Multi-Sig Disabled",
    enable: "Enable",
    disable: "Disable",
    signers: "Signers",
    addSigner: "Add Signer",
    removeSigner: "Remove",
    pendingTx: "Pending Transactions",
    noPending: "No pending transactions",
    approve: "Approve",
    reject: "Reject",
    threshold: "Threshold Amount",
    thresholdDesc: "Transactions above this amount require multi-approval",
    requiredApprovals: "Required Approvals",
    of: "/",
    owner: "Owner",
    approver: "Approver",
    viewer: "Viewer",
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    expired: "Expired",
    name: "Name",
    address: "Wallet Address",
    email: "Email (optional)",
    role: "Role",
    save: "Save",
    cancel: "Cancel",
    expiresIn: "Expires:",
    noSigners: "No signers added yet",
  },
  de: {
    title: "Multi-Signatur",
    subtitle: "Multi-Genehmigungssystem für große Transaktionen",
    enabled: "Multi-Sig Aktiv",
    disabled: "Multi-Sig Deaktiviert",
    enable: "Aktivieren",
    disable: "Deaktivieren",
    signers: "Unterzeichner",
    addSigner: "Unterzeichner hinzufügen",
    removeSigner: "Entfernen",
    pendingTx: "Ausstehende Transaktionen",
    noPending: "Keine ausstehenden Transaktionen",
    approve: "Genehmigen",
    reject: "Ablehnen",
    threshold: "Schwellenwert",
    thresholdDesc: "Transaktionen über diesem Betrag erfordern Multi-Genehmigung",
    requiredApprovals: "Erforderliche Genehmigungen",
    of: "/",
    owner: "Eigentümer",
    approver: "Genehmiger",
    viewer: "Betrachter",
    approved: "Genehmigt",
    rejected: "Abgelehnt",
    pending: "Ausstehend",
    expired: "Abgelaufen",
    name: "Name",
    address: "Wallet-Adresse",
    email: "E-Mail (optional)",
    role: "Rolle",
    save: "Speichern",
    cancel: "Abbrechen",
    expiresIn: "Läuft ab:",
    noSigners: "Noch keine Unterzeichner hinzugefügt",
  },
  fr: {
    title: "Multi-Signature",
    subtitle: "Système d'approbation multiple pour les grandes transactions",
    enabled: "Multi-Sig Actif",
    disabled: "Multi-Sig Désactivé",
    enable: "Activer",
    disable: "Désactiver",
    signers: "Signataires",
    addSigner: "Ajouter un signataire",
    removeSigner: "Supprimer",
    pendingTx: "Transactions en attente",
    noPending: "Aucune transaction en attente",
    approve: "Approuver",
    reject: "Rejeter",
    threshold: "Montant seuil",
    thresholdDesc: "Les transactions au-dessus de ce montant nécessitent une approbation multiple",
    requiredApprovals: "Approbations requises",
    of: "/",
    owner: "Propriétaire",
    approver: "Approbateur",
    viewer: "Observateur",
    approved: "Approuvé",
    rejected: "Rejeté",
    pending: "En attente",
    expired: "Expiré",
    name: "Nom",
    address: "Adresse du portefeuille",
    email: "E-mail (optionnel)",
    role: "Rôle",
    save: "Enregistrer",
    cancel: "Annuler",
    expiresIn: "Expire :",
    noSigners: "Aucun signataire ajouté",
  },
  ar: {
    title: "التوقيع المتعدد",
    subtitle: "نظام الموافقة المتعددة للمعاملات الكبيرة",
    enabled: "التوقيع المتعدد مفعّل",
    disabled: "التوقيع المتعدد معطّل",
    enable: "تفعيل",
    disable: "تعطيل",
    signers: "الموقّعون",
    addSigner: "إضافة موقّع",
    removeSigner: "إزالة",
    pendingTx: "المعاملات المعلّقة",
    noPending: "لا توجد معاملات معلّقة",
    approve: "موافقة",
    reject: "رفض",
    threshold: "مبلغ الحد",
    thresholdDesc: "المعاملات التي تتجاوز هذا المبلغ تتطلب موافقة متعددة",
    requiredApprovals: "الموافقات المطلوبة",
    of: "/",
    owner: "المالك",
    approver: "المُوافِق",
    viewer: "المشاهد",
    approved: "تمت الموافقة",
    rejected: "مرفوض",
    pending: "معلّق",
    expired: "منتهي الصلاحية",
    name: "الاسم",
    address: "عنوان المحفظة",
    email: "البريد الإلكتروني (اختياري)",
    role: "الدور",
    save: "حفظ",
    cancel: "إلغاء",
    expiresIn: "ينتهي:",
    noSigners: "لم تتم إضافة موقّعين بعد",
  },
  ru: {
    title: "Мультиподпись",
    subtitle: "Система множественного одобрения для крупных транзакций",
    enabled: "Мультиподпись активна",
    disabled: "Мультиподпись отключена",
    enable: "Включить",
    disable: "Отключить",
    signers: "Подписанты",
    addSigner: "Добавить подписанта",
    removeSigner: "Удалить",
    pendingTx: "Ожидающие транзакции",
    noPending: "Нет ожидающих транзакций",
    approve: "Одобрить",
    reject: "Отклонить",
    threshold: "Пороговая сумма",
    thresholdDesc: "Транзакции выше этой суммы требуют множественного одобрения",
    requiredApprovals: "Необходимые одобрения",
    of: "/",
    owner: "Владелец",
    approver: "Одобряющий",
    viewer: "Наблюдатель",
    approved: "Одобрено",
    rejected: "Отклонено",
    pending: "Ожидает",
    expired: "Истекло",
    name: "Имя",
    address: "Адрес кошелька",
    email: "Email (необязательно)",
    role: "Роль",
    save: "Сохранить",
    cancel: "Отмена",
    expiresIn: "Истекает:",
    noSigners: "Подписанты ещё не добавлены",
  },
};

export function MultiSigSettings({ walletAddress }: Props) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [config, setConfig] = useState<MultiSigConfig | null>(null);
  const [pending, setPending] = useState<PendingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [newSigner, setNewSigner] = useState({ name: "", address: "", email: "", role: "approver" });

  useEffect(() => {
    fetchData();
  }, [walletAddress]);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/security/multisig", {
        headers: { "x-wallet-address": walletAddress },
      });
      const data = await res.json();
      setConfig(data.config);
      setPending(data.pendingTransactions || []);
    } catch (error) {
      console.error("MultiSig fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await fetch("/api/security/multisig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: config?.enabled ? "disable" : "enable",
          requiredApprovals: 2,
          thresholdAmount: 10000,
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

  const handleAddSigner = async () => {
    if (!newSigner.name || !newSigner.address) return;

    try {
      const res = await fetch("/api/security/multisig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "add_signer",
          signerAddress: newSigner.address,
          name: newSigner.name,
          email: newSigner.email,
          role: newSigner.role,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddSigner(false);
        setNewSigner({ name: "", address: "", email: "", role: "approver" });
        fetchData();
      }
    } catch (error) {
      console.error("Add signer error:", error);
    }
  };

  const handleRemoveSigner = async (signerId: string) => {
    try {
      const res = await fetch("/api/security/multisig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "remove_signer",
          signerId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Remove signer error:", error);
    }
  };

  const handleApprove = async (txId: string) => {
    try {
      const res = await fetch("/api/security/multisig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "approve",
          transactionId: txId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Approve error:", error);
    }
  };

  const handleReject = async (txId: string) => {
    try {
      const res = await fetch("/api/security/multisig", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": walletAddress,
        },
        body: JSON.stringify({
          action: "reject",
          transactionId: txId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      }
    } catch (error) {
      console.error("Reject error:", error);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner": return t("owner");
      case "approver": return t("approver");
      case "viewer": return t("viewer");
      default: return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "text-[#2F6F62]";
      case "rejected": return "text-red-400";
      case "expired": return "text-slate-500";
      default: return "text-[#BFA181]";
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return t("expired");
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
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
            config?.enabled
              ? "bg-[#2F6F62]/20 text-[#2F6F62] hover:bg-[#2F6F62]/30"
              : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
        >
          {config?.enabled ? t("enabled") : t("disabled")}
        </button>
      </div>

      {config?.enabled && (
        <>
          {/* Threshold Setting */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-white">{t("threshold")}</p>
                <p className="text-sm text-slate-400">{t("thresholdDesc")}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#BFA181]">
                  ${config.thresholdAmount.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500">
                  {t("requiredApprovals")}: {config.requiredApprovals}{t("of")}{config.totalSigners || config.signers.length}
                </p>
              </div>
            </div>
          </div>

          {/* Signers */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-white">{t("signers")}</h4>
              <button
                onClick={() => setShowAddSigner(true)}
                className="px-3 py-1.5 bg-[#2F6F62]/20 text-[#2F6F62] rounded-lg text-sm hover:bg-[#2F6F62]/30 transition-colors"
              >
                + {t("addSigner")}
              </button>
            </div>

            {config.signers.length === 0 ? (
              <p className="text-slate-500 text-center py-4">{t("noSigners")}</p>
            ) : (
              <div className="space-y-2">
                {config.signers.map((signer) => (
                  <div
                    key={signer.id}
                    className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        signer.role === "owner" ? "bg-[#BFA181]/20" : "bg-slate-700"
                      }`}>
                        <span className={`text-lg ${
                          signer.role === "owner" ? "text-[#BFA181]" : "text-slate-400"
                        }`}>
                          {signer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{signer.name}</p>
                        <p className="text-sm text-slate-500 font-mono">{signer.walletAddress}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        signer.role === "owner"
                          ? "bg-[#BFA181]/20 text-[#BFA181]"
                          : "bg-slate-700 text-slate-400"
                      }`}>
                        {getRoleLabel(signer.role)}
                      </span>
                      {signer.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveSigner(signer.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          {t("removeSigner")}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Transactions */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <h4 className="font-medium text-white mb-4">{t("pendingTx")}</h4>

            {pending.length === 0 ? (
              <p className="text-slate-500 text-center py-4">{t("noPending")}</p>
            ) : (
              <div className="space-y-3">
                {pending.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">
                          {tx.amount} {tx.token} → {tx.toAddress?.slice(0, 10)}...
                        </p>
                        <p className="text-sm text-slate-500">
                          {t("expiresIn")} {formatExpiry(tx.expiresAt)}
                        </p>
                      </div>
                      <span className={`${getStatusColor(tx.status)}`}>
                        {tx.approvals.length}/{tx.requiredApprovals} {t("approved")}
                      </span>
                    </div>

                    {tx.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(tx.id)}
                          className="flex-1 py-2 bg-[#2F6F62]/20 text-[#2F6F62] rounded-lg hover:bg-[#2F6F62]/30 transition-colors"
                        >
                          {t("approve")}
                        </button>
                        <button
                          onClick={() => handleReject(tx.id)}
                          className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                        >
                          {t("reject")}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Add Signer Modal */}
      {showAddSigner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">{t("addSigner")}</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">{t("name")}</label>
                <input
                  type="text"
                  value={newSigner.name}
                  onChange={(e) => setNewSigner({ ...newSigner, name: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#2F6F62]"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">{t("address")}</label>
                <input
                  type="text"
                  value={newSigner.address}
                  onChange={(e) => setNewSigner({ ...newSigner, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-[#2F6F62]"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">{t("email")}</label>
                <input
                  type="email"
                  value={newSigner.email}
                  onChange={(e) => setNewSigner({ ...newSigner, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#2F6F62]"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">{t("role")}</label>
                <select
                  value={newSigner.role}
                  onChange={(e) => setNewSigner({ ...newSigner, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-[#2F6F62]"
                >
                  <option value="approver">{t("approver")}</option>
                  <option value="viewer">{t("viewer")}</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddSigner(false)}
                className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddSigner}
                disabled={!newSigner.name || !newSigner.address}
                className="flex-1 py-2 bg-[#2F6F62] text-white rounded-lg hover:bg-[#2F6F62] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
