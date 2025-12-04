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
  const { balances, balancesLoading, refreshBalances, isConnected } = useWallet();
  
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const totalAuxm = auxmBalance + bonusAuxm;
  const bonusExpiresAt = balances?.bonusExpiresAt;

  const t = {
    balance: lang === "tr" ? "Bakiye" : "Balance",
    bonus: lang === "tr" ? "Bonus" : "Bonus",
    total: lang === "tr" ? "Toplam" : "Total",
    available: lang === "tr" ? "Kullanılabilir" : "Available",
    expires: lang === "tr" ? "Son kullanma" : "Expires",
    notConnected: lang === "tr" ? "Cüzdan bağlı değil" : "Wallet not connected",
    loading: lang === "tr" ? "Yükleniyor..." : "Loading...",
  };

  if (!isConnected) {
    return (
      <div className="text-slate-500 text-sm">
        {t.notConnected}
      </div>
    );
  }

  if (balancesLoading && !balances) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        🔄
        <span className="text-sm">{t.loading}</span>
      </div>
    );
  }

  // Compact version
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-white font-mono font-medium">{totalAuxm.toFixed(2)}</span>
        <span className="text-slate-400">AUXM</span>
        {bonusAuxm > 0 && (
          <span className="text-purple-400 text-xs">
            (+{bonusAuxm.toFixed(2)} bonus)
          </span>
        )}
        {showRefresh && (
          <button 
            onClick={refreshBalances}
            className="p-1 hover:bg-slate-800 rounded"
            disabled={balancesLoading}
          >
            <RefreshCw className={`w-3 h-3 text-slate-500 ${balancesLoading ? 'animate-spin' : ''}`} />
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
            <RefreshCw className={`w-4 h-4 text-slate-400 ${balancesLoading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Total Balance */}
      <div className="mb-4">
        <div className="text-3xl font-bold text-white font-mono">
          {totalAuxm.toFixed(2)}
          <span className="text-lg text-slate-400 ml-2">AUXM</span>
        </div>
        <div className="text-sm text-slate-500">
          ≈ ${totalAuxm.toFixed(2)} USD
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">{t.available}:</span>
          <span className="text-white font-mono">{auxmBalance.toFixed(2)} AUXM</span>
        </div>
        
        {bonusAuxm > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-purple-400">💜 {t.bonus}:</span>
              <span className="text-purple-300 font-mono">{bonusAuxm.toFixed(2)} AUXM</span>
            </div>
            {bonusExpiresAt && (
              <div className="text-xs text-slate-500">
                {t.expires}: {new Date(bonusExpiresAt).toLocaleDateString()}
              </div>
            )}
            <div className="mt-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-xs text-purple-300">
                {lang === "tr" 
                  ? "💡 Bonus AUXM sadece metal alımlarında kullanılabilir"
                  : "💡 Bonus AUXM can only be used for metal purchases"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AuxmBalanceDisplay;
