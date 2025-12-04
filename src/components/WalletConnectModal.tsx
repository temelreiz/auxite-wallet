"use client";

import { useState } from "react";
import { useWallet, WalletType } from "./WalletContext";
import { useConnect } from "wagmi";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
}

const walletOptions = [
  {
    id: "metamask" as WalletType,
    name: "MetaMask",
    icon: "🦊",
    description: { tr: "En popüler cüzdan", en: "Most popular wallet" },
    category: "hot",
  },
  {
    id: "walletconnect" as WalletType,
    name: "WalletConnect",
    icon: "🔗",
    description: { tr: "100+ cüzdan desteği", en: "100+ wallets supported" },
    category: "hot",
  },
  {
    id: "coinbase" as WalletType,
    name: "Coinbase Wallet",
    icon: "🔵",
    description: { tr: "Coinbase kullanıcıları için", en: "For Coinbase users" },
    category: "hot",
  },
  {
    id: "ledger" as WalletType,
    name: "Ledger",
    icon: "🔐",
    description: { tr: "Hardware wallet (güvenli)", en: "Hardware wallet (secure)" },
    category: "cold",
  },
  {
    id: "trezor" as WalletType,
    name: "Trezor",
    icon: "🛡️",
    description: { tr: "Hardware wallet (güvenli)", en: "Hardware wallet (secure)" },
    category: "cold",
  },
];

export function WalletConnectModal({ isOpen, onClose, lang = "en" }: WalletConnectModalProps) {
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
      setError(err.message || (lang === "tr" ? "Bağlantı başarısız" : "Connection failed"));
    } finally {
      setConnecting(false);
      setSelectedWallet(null);
    }
  };

  if (!isOpen) return null;

  const hotWallets = walletOptions.filter((w) => w.category === "hot");
  const coldWallets = walletOptions.filter((w) => w.category === "cold");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={connecting ? undefined : onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-100 mb-2">
            {lang === "tr" ? "Cüzdan Bağla" : "Connect Wallet"}
          </h2>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Sepolia test ağına bağlanacaksınız"
              : "You will connect to Sepolia test network"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Hot Wallets Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span>🔥</span>
            <span>{lang === "tr" ? "Sıcak Cüzdanlar" : "Hot Wallets"}</span>
          </h3>
          <div className="space-y-2">
            {hotWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={connecting}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  connecting && selectedWallet === wallet.id
                    ? "bg-emerald-500/20 border-emerald-500"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connecting && selectedWallet === wallet.id ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="text-4xl">{wallet.icon}</div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-100">{wallet.name}</div>
                  <div className="text-xs text-slate-400">{wallet.description[lang]}</div>
                </div>
                {!connecting && (
                  <svg
                    className="w-5 h-5 text-slate-500"
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
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <span>❄️</span>
            <span>{lang === "tr" ? "Soğuk Cüzdanlar (Hardware)" : "Cold Wallets (Hardware)"}</span>
          </h3>
          <div className="space-y-2">
            {coldWallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => handleConnect(wallet.id)}
                disabled={connecting}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  connecting && selectedWallet === wallet.id
                    ? "bg-blue-500/20 border-blue-500"
                    : "bg-slate-800 hover:bg-slate-700 border-slate-700"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {connecting && selectedWallet === wallet.id ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-slate-300 rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="text-4xl">{wallet.icon}</div>
                )}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-slate-100 flex items-center gap-2">
                    {wallet.name}
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {lang === "tr" ? "Güvenli" : "Secure"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{wallet.description[lang]}</div>
                </div>
                {!connecting && (
                  <svg
                    className="w-5 h-5 text-slate-500"
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
        <div className="mb-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-xs text-blue-300">
          <div className="font-medium mb-2">
            {lang === "tr" ? "ℹ️ Bilgi" : "ℹ️ Info"}
          </div>
          <ul className="space-y-1">
            <li>
              • {lang === "tr"
                ? "MetaMask ile hardware wallet kullanabilirsiniz"
                : "You can use hardware wallets via MetaMask"}
            </li>
            <li>
              • {lang === "tr"
                ? "WalletConnect 100+ mobil cüzdanı destekler"
                : "WalletConnect supports 100+ mobile wallets"}
            </li>
            <li>
              • {lang === "tr"
                ? "Tüm bağlantılar otomatik olarak Sepolia ağına geçer"
                : "All connections automatically switch to Sepolia network"}
            </li>
          </ul>
        </div>

        {/* Cancel Button */}
        <button
          onClick={onClose}
          disabled={connecting}
          className="w-full px-4 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          {lang === "tr" ? "İptal" : "Cancel"}
        </button>
      </div>
    </div>
  );
}