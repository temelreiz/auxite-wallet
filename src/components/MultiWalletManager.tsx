"use client";

import { useState } from "react";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";

interface Props {
  lang?: string;
  onClose?: () => void;
}

// ============================================
// LOCAL TRANSLATIONS - 6 Language Support
// ============================================
const translations: Record<string, any> = {
  tr: {
    title: "Cüzdan Yönetimi",
    subtitle: "Cüzdanlarınızı yönetin",
    activeWallet: "Aktif Cüzdan",
    allWallets: "Tüm Cüzdanlar",
    addWallet: "Cüzdan Ekle",
    rename: "Yeniden Adlandır",
    remove: "Sil",
    switch: "Geçiş Yap",
    confirmRemove: "Bu cüzdanı silmek istediğinizden emin misiniz?",
    cancel: "İptal",
    confirm: "Onayla",
    walletName: "Cüzdan Adı",
    save: "Kaydet",
    noWallets: "Henüz cüzdan eklenmemiş",
    local: "Yerel",
    external: "Harici",
    created: "Oluşturulma",
    loading: "Yükleniyor...",
  },
  en: {
    title: "Wallet Management",
    subtitle: "Manage your wallets",
    activeWallet: "Active Wallet",
    allWallets: "All Wallets",
    addWallet: "Add Wallet",
    rename: "Rename",
    remove: "Remove",
    switch: "Switch",
    confirmRemove: "Are you sure you want to remove this wallet?",
    cancel: "Cancel",
    confirm: "Confirm",
    walletName: "Wallet Name",
    save: "Save",
    noWallets: "No wallets added yet",
    local: "Local",
    external: "External",
    created: "Created",
    loading: "Loading...",
  },
  de: {
    title: "Wallet-Verwaltung",
    subtitle: "Verwalten Sie Ihre Wallets",
    activeWallet: "Aktive Wallet",
    allWallets: "Alle Wallets",
    addWallet: "Wallet hinzufügen",
    rename: "Umbenennen",
    remove: "Entfernen",
    switch: "Wechseln",
    confirmRemove: "Möchten Sie diese Wallet wirklich entfernen?",
    cancel: "Abbrechen",
    confirm: "Bestätigen",
    walletName: "Wallet-Name",
    save: "Speichern",
    noWallets: "Noch keine Wallets hinzugefügt",
    local: "Lokal",
    external: "Extern",
    created: "Erstellt",
    loading: "Wird geladen...",
  },
  fr: {
    title: "Gestion des Portefeuilles",
    subtitle: "Gérez vos portefeuilles",
    activeWallet: "Portefeuille Actif",
    allWallets: "Tous les Portefeuilles",
    addWallet: "Ajouter Portefeuille",
    rename: "Renommer",
    remove: "Supprimer",
    switch: "Changer",
    confirmRemove: "Êtes-vous sûr de vouloir supprimer ce portefeuille?",
    cancel: "Annuler",
    confirm: "Confirmer",
    walletName: "Nom du Portefeuille",
    save: "Enregistrer",
    noWallets: "Aucun portefeuille ajouté",
    local: "Local",
    external: "Externe",
    created: "Créé",
    loading: "Chargement...",
  },
  ar: {
    title: "إدارة المحافظ",
    subtitle: "أدر محافظك",
    activeWallet: "المحفظة النشطة",
    allWallets: "جميع المحافظ",
    addWallet: "إضافة محفظة",
    rename: "إعادة تسمية",
    remove: "إزالة",
    switch: "تبديل",
    confirmRemove: "هل أنت متأكد من إزالة هذه المحفظة؟",
    cancel: "إلغاء",
    confirm: "تأكيد",
    walletName: "اسم المحفظة",
    save: "حفظ",
    noWallets: "لم تتم إضافة محافظ بعد",
    local: "محلي",
    external: "خارجي",
    created: "تم الإنشاء",
    loading: "جاري التحميل...",
  },
  ru: {
    title: "Управление Кошельками",
    subtitle: "Управляйте своими кошельками",
    activeWallet: "Активный Кошелек",
    allWallets: "Все Кошельки",
    addWallet: "Добавить Кошелек",
    rename: "Переименовать",
    remove: "Удалить",
    switch: "Переключить",
    confirmRemove: "Вы уверены, что хотите удалить этот кошелек?",
    cancel: "Отмена",
    confirm: "Подтвердить",
    walletName: "Название Кошелька",
    save: "Сохранить",
    noWallets: "Кошельки ещё не добавлены",
    local: "Локальный",
    external: "Внешний",
    created: "Создан",
    loading: "Загрузка...",
  },
};

export function MultiWalletManager({ lang: propLang, onClose }: Props) {
  const { lang: contextLang } = useLanguage();
  const lang = propLang || contextLang || "en";
  const labels = translations[lang] || translations.en;
  
  const walletContext = useWallet();
  
  const wallets = walletContext?.address ? [{ address: walletContext.address, name: "Main Wallet" }] : [];
  const activeWallet = walletContext?.address || null;
  const switchWallet = () => {};
  const removeWallet = (_id: string) => {};
  const renameWallet = (_id: string, _name: string) => {};
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleRename = (id: string, currentName: string) => {
    setSelectedWalletId(id);
    setNewName(currentName);
    setShowRenameModal(true);
  };

  const handleRemove = (id: string) => {
    setSelectedWalletId(id);
    setShowRemoveModal(true);
  };

  const confirmRename = () => {
    if (selectedWalletId && newName.trim()) {
      renameWallet(selectedWalletId, newName.trim());
      setShowRenameModal(false);
      setSelectedWalletId(null);
      setNewName("");
    }
  };

  const confirmRemove = () => {
    if (selectedWalletId) {
      removeWallet(selectedWalletId);
      setShowRemoveModal(false);
      setSelectedWalletId(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const locale = lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US";

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      {onClose && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{labels.title}</h2>
            <p className="text-sm text-slate-400">{labels.subtitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {!onClose && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">{labels.title}</h2>
          <p className="text-sm text-slate-400">{labels.subtitle}</p>
        </div>
      )}

      {/* Active Wallet */}
      {activeWallet && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <div className="text-xs text-emerald-400 mb-2">{labels.activeWallet}</div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">{"Main Wallet"}</div>
              <div className="text-sm text-slate-400 font-mono">{formatAddress(activeWallet)}</div>
            </div>
            <span className={`px-2 py-1 rounded text-xs ${false ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
              {false ? labels.local : labels.external}
            </span>
          </div>
        </div>
      )}

      {/* All Wallets */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="text-sm text-slate-400 mb-3">{labels.allWallets}</div>
        
        {wallets.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-3xl mb-2">💼</p>
            <p>{labels.noWallets}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <div
                key={wallet.address}
                className={`p-3 rounded-xl border transition-all ${
                  wallet.address === activeWallet
                    ? "bg-slate-800/80 border-emerald-500/50"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      wallet.isLocal ? "bg-purple-500/20" : "bg-blue-500/20"
                    }`}>
                      {wallet.isLocal ? "🔐" : "🦊"}
                    </div>
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {wallet.name}
                        {wallet.address === activeWallet && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{formatAddress(wallet.address)}</div>
                      <div className="text-xs text-slate-600">{labels.created}: {formatDate(wallet.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {wallet.address !== activeWallet && (
                      <button
                        onClick={() => switchWallet(wallet.address)}
                        className="px-3 py-1.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"
                      >
                        {labels.switch}
                      </button>
                    )}
                    <button
                      onClick={() => handleRename(wallet.address, wallet.name)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                      title={labels.rename}
                    >
                      ✏️
                    </button>
                    {wallets.length > 1 && (
                      <button
                        onClick={() => handleRemove(wallet.address)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                        title={labels.remove}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-4">{labels.rename}</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={labels.walletName}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowRenameModal(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg">
                {labels.cancel}
              </button>
              <button onClick={confirmRename} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg">
                {labels.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-white mb-2">⚠️ {labels.remove}</h3>
            <p className="text-slate-400 text-sm mb-4">{labels.confirmRemove}</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRemoveModal(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg">
                {labels.cancel}
              </button>
              <button onClick={confirmRemove} className="flex-1 py-2 bg-red-500 text-white rounded-lg">
                {labels.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiWalletManager;
