"use client";

import { useState } from "react";
import { useWallet, WalletType } from "./WalletContext";
import { useConnect } from "wagmi";
import { useLanguage } from "@/components/LanguageContext";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    connectWallet: "Cüzdan Bağla",
    connectSubtitle: "Sepolia test ağına bağlanacaksınız",
    hotWallets: "Sıcak Cüzdanlar",
    coldWallets: "Soğuk Cüzdanlar (Hardware)",
    secure: "Güvenli",
    info: "Bilgi",
    infoHardware: "MetaMask ile hardware wallet kullanabilirsiniz",
    infoWalletConnect: "WalletConnect 100+ mobil cüzdanı destekler",
    infoSepolia: "Tüm bağlantılar otomatik olarak Sepolia ağına geçer",
    cancel: "İptal",
    connectionFailed: "Bağlantı başarısız",
    descMetamask: "En popüler cüzdan",
    descWalletconnect: "100+ cüzdan desteği",
    descCoinbase: "Coinbase kullanıcıları için",
    descLedger: "Hardware wallet (güvenli)",
    descTrezor: "Hardware wallet (güvenli)",
  },
  en: {
    connectWallet: "Connect Wallet",
    connectSubtitle: "You will connect to Sepolia test network",
    hotWallets: "Hot Wallets",
    coldWallets: "Cold Wallets (Hardware)",
    secure: "Secure",
    info: "Info",
    infoHardware: "You can use hardware wallets via MetaMask",
    infoWalletConnect: "WalletConnect supports 100+ mobile wallets",
    infoSepolia: "All connections automatically switch to Sepolia network",
    cancel: "Cancel",
    connectionFailed: "Connection failed",
    descMetamask: "Most popular wallet",
    descWalletconnect: "100+ wallets supported",
    descCoinbase: "For Coinbase users",
    descLedger: "Hardware wallet (secure)",
    descTrezor: "Hardware wallet (secure)",
  },
  de: {
    connectWallet: "Wallet Verbinden",
    connectSubtitle: "Sie werden mit dem Sepolia-Testnetzwerk verbunden",
    hotWallets: "Hot Wallets",
    coldWallets: "Cold Wallets (Hardware)",
    secure: "Sicher",
    info: "Info",
    infoHardware: "Sie können Hardware-Wallets über MetaMask verwenden",
    infoWalletConnect: "WalletConnect unterstützt über 100 mobile Wallets",
    infoSepolia: "Alle Verbindungen wechseln automatisch zum Sepolia-Netzwerk",
    cancel: "Abbrechen",
    connectionFailed: "Verbindung fehlgeschlagen",
    descMetamask: "Beliebteste Wallet",
    descWalletconnect: "100+ Wallets unterstützt",
    descCoinbase: "Für Coinbase-Benutzer",
    descLedger: "Hardware-Wallet (sicher)",
    descTrezor: "Hardware-Wallet (sicher)",
  },
  fr: {
    connectWallet: "Connecter le Portefeuille",
    connectSubtitle: "Vous serez connecté au réseau de test Sepolia",
    hotWallets: "Portefeuilles Chauds",
    coldWallets: "Portefeuilles Froids (Hardware)",
    secure: "Sécurisé",
    info: "Info",
    infoHardware: "Vous pouvez utiliser des portefeuilles hardware via MetaMask",
    infoWalletConnect: "WalletConnect prend en charge plus de 100 portefeuilles mobiles",
    infoSepolia: "Toutes les connexions basculent automatiquement vers le réseau Sepolia",
    cancel: "Annuler",
    connectionFailed: "Échec de la connexion",
    descMetamask: "Portefeuille le plus populaire",
    descWalletconnect: "100+ portefeuilles supportés",
    descCoinbase: "Pour les utilisateurs Coinbase",
    descLedger: "Portefeuille hardware (sécurisé)",
    descTrezor: "Portefeuille hardware (sécurisé)",
  },
  ar: {
    connectWallet: "ربط المحفظة",
    connectSubtitle: "ستتصل بشبكة Sepolia التجريبية",
    hotWallets: "المحافظ الساخنة",
    coldWallets: "المحافظ الباردة (Hardware)",
    secure: "آمن",
    info: "معلومات",
    infoHardware: "يمكنك استخدام محافظ الأجهزة عبر MetaMask",
    infoWalletConnect: "يدعم WalletConnect أكثر من 100 محفظة محمولة",
    infoSepolia: "جميع الاتصالات تنتقل تلقائياً إلى شبكة Sepolia",
    cancel: "إلغاء",
    connectionFailed: "فشل الاتصال",
    descMetamask: "المحفظة الأكثر شعبية",
    descWalletconnect: "دعم أكثر من 100 محفظة",
    descCoinbase: "لمستخدمي Coinbase",
    descLedger: "محفظة أجهزة (آمنة)",
    descTrezor: "محفظة أجهزة (آمنة)",
  },
  ru: {
    connectWallet: "Подключить Кошелек",
    connectSubtitle: "Вы подключитесь к тестовой сети Sepolia",
    hotWallets: "Горячие Кошельки",
    coldWallets: "Холодные Кошельки (Hardware)",
    secure: "Безопасно",
    info: "Информация",
    infoHardware: "Вы можете использовать аппаратные кошельки через MetaMask",
    infoWalletConnect: "WalletConnect поддерживает более 100 мобильных кошельков",
    infoSepolia: "Все подключения автоматически переключаются на сеть Sepolia",
    cancel: "Отмена",
    connectionFailed: "Ошибка подключения",
    descMetamask: "Самый популярный кошелек",
    descWalletconnect: "Поддержка 100+ кошельков",
    descCoinbase: "Для пользователей Coinbase",
    descLedger: "Аппаратный кошелек (безопасный)",
    descTrezor: "Аппаратный кошелек (безопасный)",
  },
};

const walletOptions = [
  {
    id: "metamask" as WalletType,
    name: "MetaMask",
    icon: "🦊",
    descKey: "descMetamask",
    category: "hot",
  },
  {
    id: "walletconnect" as WalletType,
    name: "WalletConnect",
    icon: "🔗",
    descKey: "descWalletconnect",
    category: "hot",
  },
  {
    id: "coinbase" as WalletType,
    name: "Coinbase Wallet",
    icon: "🔵",
    descKey: "descCoinbase",
    category: "hot",
  },
  {
    id: "ledger" as WalletType,
    name: "Ledger",
    icon: "🔐",
    descKey: "descLedger",
    category: "cold",
  },
  {
    id: "trezor" as WalletType,
    name: "Trezor",
    icon: "🛡️",
    descKey: "descTrezor",
    category: "cold",
  },
];

export function WalletConnectModal({ isOpen, onClose, lang: langProp }: WalletConnectModalProps) {
  const { lang: ctxLang } = useLanguage();
  const lang = langProp || ctxLang || "en";
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<WalletType>(null);
  const { connect, connectors } = useConnect();

  const handleConnect = async (walletType: WalletType) => {
    setConnecting(true);
    setError(null);
    setSelectedWallet(walletType);

    try {
      const connector = connectors.find(c => c.id.toLowerCase().includes(walletType?.toLowerCase() || "")); if (connector) { connect({ connector }); } else { throw new Error("Connector not found"); }
      onClose();
    } catch (err: any) {
      console.error("Connection error:", err);
      setError(err.message || t("connectionFailed"));
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  if (!isOpen) return null;

  const hotWallets = walletOptions.filter((w) => w.category === "hot");
  const coldWallets = walletOptions.filter((w) => w.category === "cold");

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={connecting ? undefined : onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-slate-700 bg-slate-900 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 mb-1.5 sm:mb-2">
            {t("connectWallet")}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {t("connectSubtitle")}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Hot Wallets Section */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <span>🔥</span>
            <span>{t("hotWallets")}</span>
          </h3>
          <div className="space-y-1.5 sm:space-y-2">
            {hotWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={connecting}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
                  connecting && selectedWallet === wallet.id
                    ? "bg-[#2F6F62]/20 border-[#2F6F62]"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connecting && selectedWallet === wallet.id ? (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="text-2xl sm:text-4xl w-8 sm:w-10 flex items-center justify-center">{wallet.icon}</div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm sm:text-base text-slate-100">{wallet.name}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 truncate">{t(wallet.descKey)}</div>
                </div>
                {!connecting && (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cold Wallets Section */}
        <div className="mb-4 sm:mb-6">
          <h3 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
            <span>❄️</span>
            <span>{t("coldWallets")}</span>
          </h3>
          <div className="space-y-1.5 sm:space-y-2">
            {coldWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={connecting}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all ${
                  connecting && selectedWallet === wallet.id
                    ? "bg-blue-500/20 border-blue-500"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connecting && selectedWallet === wallet.id ? (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="text-2xl sm:text-4xl w-8 sm:w-10 flex items-center justify-center">{wallet.icon}</div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <div className="font-semibold text-sm sm:text-base text-slate-100 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span>{wallet.name}</span>
                    <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {t("secure")}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 truncate">{t(wallet.descKey)}</div>
                </div>
                {!connecting && (
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[10px] sm:text-xs text-blue-300">
          <div className="font-medium mb-1.5 sm:mb-2">
            {"ℹ️ " + t("info")}
          </div>
          <ul className="space-y-0.5 sm:space-y-1">
            <li>
              • {t("infoHardware")}
            </li>
            <li>
              • {t("infoWalletConnect")}
            </li>
            <li>
              • {t("infoSepolia")}
            </li>
          </ul>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={connecting}
          className="w-full px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
