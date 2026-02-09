"use client";

import { useState, useEffect } from "react";

interface WhitelistAddress {
  id: string;
  address: string;
  label: string;
  network: "ETH" | "BTC" | "XRP" | "SOL";
  addedAt: number;
  verifiedAt?: number;
  isVerified: boolean;
}

interface WhitelistManagerProps {
  walletAddress: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const NETWORK_ICONS: Record<string, { icon: string; color: string; name: string }> = {
  ETH: { icon: "Ξ", color: "#627EEA", name: "Ethereum" },
  BTC: { icon: "₿", color: "#F7931A", name: "Bitcoin" },
  XRP: { icon: "✕", color: "#23292F", name: "Ripple" },
  SOL: { icon: "◎", color: "#9945FF", name: "Solana" },
};

// 6-language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Güvenli Çekim Adresleri",
    description: "Yeni adresler 24 saat sonra aktif olur",
    addNew: "Yeni Adres Ekle",
    address: "Adres",
    label: "Etiket",
    network: "Ağ",
    add: "Ekle",
    cancel: "İptal",
    delete: "Sil",
    verified: "Doğrulandı",
    pending: "Beklemede",
    noAddresses: "Henüz güvenli adres eklenmemiş",
    verifyIn: "Doğrulama:",
    addressRequired: "Adres ve ağ gerekli",
    confirmDelete: "Bu adresi silmek istediğinize emin misiniz?",
    labelPlaceholder: "Örn: Binance Cüzdanı",
  },
  en: {
    title: "Withdrawal Whitelist",
    description: "New addresses become active after 24 hours",
    addNew: "Add New Address",
    address: "Address",
    label: "Label",
    network: "Network",
    add: "Add",
    cancel: "Cancel",
    delete: "Delete",
    verified: "Verified",
    pending: "Pending",
    noAddresses: "No whitelist addresses yet",
    verifyIn: "Verifies in:",
    addressRequired: "Address and network required",
    confirmDelete: "Are you sure you want to remove this address?",
    labelPlaceholder: "e.g. Binance Wallet",
  },
  de: {
    title: "Auszahlungs-Whitelist",
    description: "Neue Adressen werden nach 24 Stunden aktiv",
    addNew: "Neue Adresse hinzufügen",
    address: "Adresse",
    label: "Bezeichnung",
    network: "Netzwerk",
    add: "Hinzufügen",
    cancel: "Abbrechen",
    delete: "Löschen",
    verified: "Verifiziert",
    pending: "Ausstehend",
    noAddresses: "Noch keine Whitelist-Adressen",
    verifyIn: "Verifizierung in:",
    addressRequired: "Adresse und Netzwerk erforderlich",
    confirmDelete: "Möchten Sie diese Adresse wirklich entfernen?",
    labelPlaceholder: "z.B. Binance Wallet",
  },
  fr: {
    title: "Liste Blanche de Retrait",
    description: "Les nouvelles adresses deviennent actives après 24 heures",
    addNew: "Ajouter une Adresse",
    address: "Adresse",
    label: "Libellé",
    network: "Réseau",
    add: "Ajouter",
    cancel: "Annuler",
    delete: "Supprimer",
    verified: "Vérifié",
    pending: "En attente",
    noAddresses: "Aucune adresse de liste blanche",
    verifyIn: "Vérification dans:",
    addressRequired: "Adresse et réseau requis",
    confirmDelete: "Êtes-vous sûr de vouloir supprimer cette adresse?",
    labelPlaceholder: "ex. Portefeuille Binance",
  },
  ar: {
    title: "القائمة البيضاء للسحب",
    description: "تصبح العناوين الجديدة نشطة بعد 24 ساعة",
    addNew: "إضافة عنوان جديد",
    address: "العنوان",
    label: "التسمية",
    network: "الشبكة",
    add: "إضافة",
    cancel: "إلغاء",
    delete: "حذف",
    verified: "تم التحقق",
    pending: "قيد الانتظار",
    noAddresses: "لا توجد عناوين في القائمة البيضاء",
    verifyIn: "التحقق في:",
    addressRequired: "العنوان والشبكة مطلوبان",
    confirmDelete: "هل أنت متأكد من حذف هذا العنوان؟",
    labelPlaceholder: "مثال: محفظة بينانس",
  },
  ru: {
    title: "Белый Список для Вывода",
    description: "Новые адреса активируются через 24 часа",
    addNew: "Добавить Адрес",
    address: "Адрес",
    label: "Метка",
    network: "Сеть",
    add: "Добавить",
    cancel: "Отмена",
    delete: "Удалить",
    verified: "Подтверждено",
    pending: "Ожидание",
    noAddresses: "Адресов в белом списке пока нет",
    verifyIn: "Подтверждение через:",
    addressRequired: "Требуется адрес и сеть",
    confirmDelete: "Вы уверены, что хотите удалить этот адрес?",
    labelPlaceholder: "напр. Кошелёк Binance",
  },
};

export function WhitelistManager({ walletAddress, lang = "en" }: WhitelistManagerProps) {
  const [addresses, setAddresses] = useState<WhitelistAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ address: "", label: "", network: "ETH" as const });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = translations[lang] || translations.en;

  useEffect(() => {
    fetchAddresses();
  }, [walletAddress]);

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`/api/security/whitelist?address=${walletAddress}`);
      const data = await res.json();
      setAddresses(data.addresses || []);
    } catch (err) {
      console.error("Whitelist fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newAddress.address || !newAddress.network) {
      setError(t.addressRequired);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/security/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          withdrawAddress: newAddress.address,
          label: newAddress.label,
          network: newAddress.network,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error);
      }

      setSuccess(data.message);
      setShowAddForm(false);
      setNewAddress({ address: "", label: "", network: "ETH" });
      fetchAddresses();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm(t.confirmDelete)) {
      return;
    }

    try {
      const res = await fetch("/api/security/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, addressId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      fetchAddresses();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatTimeRemaining = (addedAt: number) => {
    const verifyTime = addedAt + 86400000; // 24 saat
    const remaining = verifyTime - Date.now();
    
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-stone-200 dark:bg-slate-700 rounded w-1/3"></div>
        <div className="h-20 bg-stone-100 dark:bg-slate-800 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-semibold text-slate-800 dark:text-white">{t.title}</h3>
          <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400">{t.description}</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-[#2F6F62] hover:bg-[#2F6F62] text-white text-[10px] sm:text-sm font-medium rounded-lg transition-colors flex items-center gap-1 sm:gap-2 flex-shrink-0"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">{t.addNew}</span>
            <span className="sm:hidden">{t.add}</span>
          </button>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-2.5 sm:p-3 bg-[#2F6F62]/20 border border-[#2F6F62]/30 rounded-lg text-[#2F6F62] dark:text-[#2F6F62] text-xs sm:text-sm">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="p-2.5 sm:p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-600 dark:text-red-400 text-xs sm:text-sm">
          ✕ {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-3 sm:p-4 bg-stone-50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1 font-medium">{t.address}</label>
              <input
                type="text"
                value={newAddress.address}
                onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                placeholder="0x... / bc1... / r..."
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#2F6F62] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1 font-medium">{t.network}</label>
              <select
                value={newAddress.network}
                onChange={(e) => setNewAddress({ ...newAddress, network: e.target.value as any })}
                className="w-full px-2.5 sm:px-3 py-2 sm:py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-white focus:border-[#2F6F62] focus:outline-none"
              >
                <option value="ETH">Ethereum (ETH)</option>
                <option value="BTC">Bitcoin (BTC)</option>
                <option value="XRP">Ripple (XRP)</option>
                <option value="SOL">Solana (SOL)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 mb-1 font-medium">{t.label}</label>
            <input
              type="text"
              value={newAddress.label}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
              placeholder={t.labelPlaceholder}
              className="w-full px-2.5 sm:px-3 py-2 sm:py-2 bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#2F6F62] focus:outline-none"
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={handleAdd}
              disabled={submitting}
              className="px-3 sm:px-4 py-2 bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-xs sm:text-sm"
            >
              {submitting ? "..." : t.add}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewAddress({ address: "", label: "", network: "ETH" });
                setError(null);
              }}
              className="px-3 sm:px-4 py-2 bg-stone-200 dark:bg-slate-700 hover:bg-stone-300 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-medium rounded-lg transition-colors text-xs sm:text-sm"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Address List */}
      {addresses.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-slate-500 dark:text-slate-400">
          <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-xs sm:text-sm">{t.noAddresses}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {addresses.map((addr) => {
            const networkInfo = NETWORK_ICONS[addr.network];
            const timeRemaining = !addr.isVerified ? formatTimeRemaining(addr.addedAt) : null;

            return (
              <div
                key={addr.id}
                className="p-3 sm:p-4 bg-white dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 rounded-lg sm:rounded-xl flex items-center justify-between gap-2 hover:border-stone-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0"
                    style={{ backgroundColor: networkInfo.color }}
                  >
                    {networkInfo.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm text-slate-800 dark:text-white font-medium truncate">{addr.label || networkInfo.name}</span>
                      {addr.isVerified ? (
                        <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62] rounded flex-shrink-0">
                          ✓ {t.verified}
                        </span>
                      ) : (
                        <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded flex-shrink-0">
                          ⏳ {t.pending}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 font-mono truncate">
                      {addr.address.slice(0, 8)}...{addr.address.slice(-6)}
                    </p>
                    {timeRemaining && (
                      <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1">
                        {t.verifyIn} {timeRemaining}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                  title={t.delete}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WhitelistManager;
