"use client";
import { useWallet } from "./WalletContext";
type Props = {
  lang: "tr" | "en";
  onLangChange: (lang: "tr" | "en") => void;
  activeTab: "markets" | "leasing";
  onTabChange: (tab: "markets" | "leasing") => void;
  onOpenWalletModal: () => void;
};
export default function TopNav({
  lang,
  onLangChange,
  activeTab,
  onTabChange,
  onOpenWalletModal,
}: Props) {
  const { isConnected, address, disconnectWallet } = useWallet();
  const tabCls = (tab: "markets" | "leasing") =>
    "rounded-full px-4 py-1.5 text-sm font-medium transition " +
    (activeTab === tab
      ? "bg-emerald-500 text-white"
      : "text-zinc-400 hover:bg-zinc-800");
  return (
    <header className="flex items-center justify-between py-3">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center">
          <img
            src="/auxite-wallet-logo.png"
            alt="Auxite Wallet"
            className="h-7 w-auto"
          />
        </div>
        {/* Navigation Tabs */}
        <nav className="hidden items-center gap-2 rounded-full bg-zinc-900/80 px-1.5 py-1.5 sm:flex">
          <button
            className={tabCls("markets")}
            onClick={() => onTabChange("markets")}
          >
            {lang === "tr" ? "Piyasalar" : "Markets"}
          </button>
          <button
            className={tabCls("leasing")}
            onClick={() => onTabChange("leasing")}
          >
            Leasing
          </button>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {/* Dil toggle */}
        <button
          onClick={() => onLangChange(lang === "tr" ? "en" : "tr")}
          className="rounded-full bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800"
        >
          {lang === "tr" ? "EN" : "TR"}
        </button>
        {/* Wallet button */}
        {isConnected && address ? (
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-mono text-emerald-400">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
            <button
              onClick={disconnectWallet}
              className="rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20"
            >
              {lang === "tr" ? "Bağlantıyı Kes" : "Disconnect"}
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenWalletModal}
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-400"
          >
            {lang === "tr" ? "Cüzdan Bağla" : "Connect Wallet"}
          </button>
        )}
      </div>
    </header>
  );
}
