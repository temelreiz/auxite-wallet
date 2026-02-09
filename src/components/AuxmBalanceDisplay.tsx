"use client";

import { useWallet } from "@/components/WalletContext";

interface AuxmBalanceDisplayProps {
  showRefresh?: boolean;
  compact?: boolean;
  lang?: "tr" | "en";
}

export function AuxmBalanceDisplay({ 
  showRefresh = false, 
  compact = false,
  lang = "en"
}: AuxmBalanceDisplayProps) {
  const { balances, refreshBalances, balancesLoading } = useWallet();
  
  const auxm = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const totalAuxm = auxm + bonusAuxm;

  const t = {
    balance: lang === "tr" ? "Bakiye" : "Balance",
    available: lang === "tr" ? "Kullanılabilir" : "Available",
    bonus: lang === "tr" ? "Bonus" : "Bonus",
    total: lang === "tr" ? "Toplam" : "Total",
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="text-purple-400 text-xs font-bold">A</span>
          </div>
          <span className="text-white font-semibold">{totalAuxm.toFixed(2)}</span>
          <span className="text-slate-400 text-sm">AUXM</span>
        </div>
        {bonusAuxm > 0 && (
          <span className="text-xs text-[#2F6F62] bg-[#2F6F62]/20 px-1.5 py-0.5 rounded">
            +{bonusAuxm.toFixed(2)} bonus
          </span>
        )}
        {showRefresh && (
          <button 
            onClick={refreshBalances}
            className="p-1 hover:bg-slate-800 rounded"
            disabled={balancesLoading}
          >
            <svg className={`w-3 h-3 text-slate-500 ${balancesLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-400">{t.balance} AUXM</h3>
        {showRefresh && (
          <button 
            onClick={refreshBalances}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            disabled={balancesLoading}
          >
            <svg className={`w-4 h-4 text-slate-400 ${balancesLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>

      {/* Total Balance */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-white font-mono">
          {totalAuxm.toFixed(2)}
          <span className="text-lg text-slate-400 ml-2">AUXM</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 pt-3 border-t border-slate-700">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">{t.available}</span>
          <span className="text-white font-mono">{auxm.toFixed(2)}</span>
        </div>
        {bonusAuxm > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-[#2F6F62]">{t.bonus}</span>
            <span className="text-[#2F6F62] font-mono">+{bonusAuxm.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuxmBalanceDisplay;
