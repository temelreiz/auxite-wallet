"use client";

import { useLanguage } from "@/components/LanguageContext";
import { useWallet } from "@/components/WalletContext";
import { formatAmount, formatUSD, getDecimalPlaces } from '@/lib/format';

const translations: Record<string, Record<string, string>> = {
  tr: {
    availableToWithdraw: "Çekilebilir Varlıklar",
    total: "TOPLAM",
    available: "KULLANILABİLİR",
    locked: "KİLİTLİ",
    staked: "Staking",
    allocated: "Tahsis",
    noAssets: "Varlık bulunamadı",
  },
  en: {
    availableToWithdraw: "Available to Withdraw",
    total: "TOTAL",
    available: "AVAILABLE",
    locked: "LOCKED",
    staked: "Staked",
    allocated: "Allocated",
    noAssets: "No assets found",
  },
  de: {
    availableToWithdraw: "Verfügbar zum Abheben",
    total: "GESAMT",
    available: "VERFÜGBAR",
    locked: "GESPERRT",
    staked: "Gestaked",
    allocated: "Zugewiesen",
    noAssets: "Keine Vermögenswerte",
  },
  fr: {
    availableToWithdraw: "Disponible pour Retrait",
    total: "TOTAL",
    available: "DISPONIBLE",
    locked: "VERROUILLÉ",
    staked: "En Staking",
    allocated: "Alloué",
    noAssets: "Aucun actif",
  },
  ar: {
    availableToWithdraw: "متاح للسحب",
    total: "الإجمالي",
    available: "متاح",
    locked: "مقفل",
    staked: "مُرهون",
    allocated: "مُخصص",
    noAssets: "لا توجد أصول",
  },
  ru: {
    availableToWithdraw: "Доступно для Вывода",
    total: "Всего",
    available: "Доступно",
    locked: "Заблокировано",
    staked: "В стейкинге",
    allocated: "Распределено",
    noAssets: "Нет активов",
  },
};

interface AssetInfo {
  symbol: string;
  name: string;
  icon: string;
  color: string;
  unit: string;
}

const ASSET_META: Record<string, AssetInfo> = {
  AUXM: { symbol: "AUXM", name: "Settlement Balance", icon: "◈", color: "#BFA181", unit: "" },
  AUXG: { symbol: "AUXG", name: "Gold", icon: "Au", color: "#F59E0B", unit: "g" },
  AUXS: { symbol: "AUXS", name: "Silver", icon: "Ag", color: "#94A3B8", unit: "g" },
  AUXPT: { symbol: "AUXPT", name: "Platinum", icon: "Pt", color: "#CBD5E1", unit: "g" },
  AUXPD: { symbol: "AUXPD", name: "Palladium", icon: "Pd", color: "#64748B", unit: "g" },
  ETH: { symbol: "ETH", name: "Ethereum", icon: "Ξ", color: "#627EEA", unit: "" },
  BTC: { symbol: "BTC", name: "Bitcoin", icon: "₿", color: "#F7931A", unit: "" },
  USDT: { symbol: "USDT", name: "Tether", icon: "₮", color: "#26A17B", unit: "" },
  XRP: { symbol: "XRP", name: "Ripple", icon: "✕", color: "#23292F", unit: "" },
  SOL: { symbol: "SOL", name: "Solana", icon: "◎", color: "#9945FF", unit: "" },
};

function displayAmount(amount: number, symbol: string): string {
  if (["AUXM", "USDT"].includes(symbol)) return formatUSD(amount);
  if (["AUXG", "AUXS", "AUXPT", "AUXPD"].includes(symbol)) return `${formatAmount(amount, symbol)}g`;
  return formatAmount(amount, symbol);
}

export function WithdrawableAssetsPanel() {
  const { lang } = useLanguage();
  const { balances, stakedAmounts, allocationAmounts } = useWallet();
  const t = translations[lang] || translations.en;

  if (!balances) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">{t.noAssets}</p>
      </div>
    );
  }

  const ASSET_ORDER = ["AUXM", "AUXG", "AUXS", "AUXPT", "AUXPD", "ETH", "BTC", "USDT", "XRP", "SOL"];

  const assets = ASSET_ORDER.map((symbol) => {
    const key = symbol.toLowerCase() as keyof typeof balances;
    const total = parseFloat(String((balances as any)[key] || 0));
    const staked = (stakedAmounts as any)?.[key] || 0;
    const allocated = (allocationAmounts as any)?.[key] || 0;
    const locked = staked + allocated;
    const available = Math.max(0, total - locked);

    return { symbol, total, staked, allocated, locked, available };
  }).filter((a) => a.total > 0 || ["AUXM", "AUXG"].includes(a.symbol));

  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800 mb-6 overflow-hidden">
      <div className="p-4 border-b border-stone-100 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <svg className="w-4 h-4 text-[#BFA181]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t.availableToWithdraw}
        </h3>
      </div>

      {/* Header Row */}
      <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wider border-b border-stone-100 dark:border-slate-800">
        <span>ASSET</span>
        <span className="text-right">{t.total}</span>
        <span className="text-right text-[#2F6F62]">{t.available}</span>
        <span className="text-right text-[#BFA181]">{t.locked}</span>
      </div>

      {/* Asset Rows */}
      <div className="divide-y divide-stone-100 dark:divide-slate-800">
        {assets.map((asset) => {
          const meta = ASSET_META[asset.symbol] || { symbol: asset.symbol, name: asset.symbol, icon: "?", color: "#94A3B8", unit: "" };
          return (
            <div
              key={asset.symbol}
              className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 px-4 py-3 hover:bg-stone-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              {/* Asset Info */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: meta.color }}
                >
                  {meta.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{asset.symbol}</p>
                  <p className="text-xs text-slate-500 hidden md:block">{meta.name}</p>
                </div>
              </div>

              {/* Total */}
              <div className="text-right md:flex md:flex-col md:justify-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {displayAmount(asset.total, asset.symbol)}
                </p>
              </div>

              {/* Available */}
              <div className="text-right md:flex md:flex-col md:justify-center">
                <p className="text-sm font-semibold text-[#2F6F62]">
                  {displayAmount(asset.available, asset.symbol)}
                </p>
              </div>

              {/* Locked */}
              <div className="text-right md:flex md:flex-col md:justify-center">
                <p className="text-sm text-[#BFA181]">
                  {asset.locked > 0 ? displayAmount(asset.locked, asset.symbol) : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WithdrawableAssetsPanel;
