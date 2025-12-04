"use client";

import { useWallet } from "@/components/WalletContext";


interface PortfolioSummaryProps {
  metalPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
  lang?: "tr" | "en";
}

export function PortfolioSummary({ 
  metalPrices = { AUXG: 85, AUXS: 1, AUXPT: 32, AUXPD: 34 },
  lang = "en" 
}: PortfolioSummaryProps) {
  const { address, isConnected, balances, balancesLoading, refreshBalances } = useWallet();
  
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  const totalAuxm = auxmBalance + bonusAuxm;
  
  const auxg = balances?.auxg ?? 0;
  const auxs = balances?.auxs ?? 0;
  const auxpt = balances?.auxpt ?? 0;
  const auxpd = balances?.auxpd ?? 0;

  // Calculate total portfolio value in USD
  const metalValue = 
    (auxg * metalPrices.AUXG) +
    (auxs * metalPrices.AUXS) +
    (auxpt * metalPrices.AUXPT) +
    (auxpd * metalPrices.AUXPD);
  
  const totalValue = totalAuxm + metalValue;

  const t = {
    portfolio: lang === "tr" ? "Portföy" : "Portfolio",
    totalValue: lang === "tr" ? "Toplam Değer" : "Total Value",
    auxmBalance: lang === "tr" ? "AUXM Bakiye" : "AUXM Balance",
    metals: lang === "tr" ? "Metaller" : "Metals",
    notConnected: lang === "tr" ? "Cüzdan bağlanmadı" : "Wallet not connected",
    connectWallet: lang === "tr" ? "Bağlan" : "Connect",
    loading: lang === "tr" ? "Yükleniyor..." : "Loading...",
  };

  if (!isConnected) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💼</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">{t.notConnected}</h3>
          <p className="text-sm text-slate-400">
            {lang === "tr" 
              ? "Portföyünüzü görmek için cüzdanınızı bağlayın"
              : "Connect your wallet to view your portfolio"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">{t.portfolio}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
          </span>
          <button 
            onClick={refreshBalances}
            disabled={balancesLoading}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${balancesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Total Value */}
      <div className="mb-6">
        <div className="text-sm text-slate-400 mb-1">{t.totalValue}</div>
        <div className="text-3xl font-bold text-white font-mono">
          ${totalValue.toFixed(2)}
        </div>
      </div>

      {/* AUXM Section */}
      <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">{t.auxmBalance}</span>
          <span className="text-white font-mono">${totalAuxm.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{auxmBalance.toFixed(2)} AUXM</span>
          {bonusAuxm > 0 && (
            <span className="text-purple-400 text-sm">+{bonusAuxm.toFixed(2)} bonus</span>
          )}
        </div>
      </div>

      {/* Metals Section */}
      <div>
        <div className="text-sm text-slate-400 mb-3">{t.metals}</div>
        <div className="grid grid-cols-2 gap-3">
          {/* Gold */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>🥇</span>
              <span className="text-sm text-slate-300">AUXG</span>
            </div>
            <div className="text-white font-mono">{auxg.toFixed(4)}g</div>
            <div className="text-xs text-slate-500">${(auxg * metalPrices.AUXG).toFixed(2)}</div>
          </div>

          {/* Silver */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>🥈</span>
              <span className="text-sm text-slate-300">AUXS</span>
            </div>
            <div className="text-white font-mono">{auxs.toFixed(4)}g</div>
            <div className="text-xs text-slate-500">${(auxs * metalPrices.AUXS).toFixed(2)}</div>
          </div>

          {/* Platinum */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>💎</span>
              <span className="text-sm text-slate-300">AUXPT</span>
            </div>
            <div className="text-white font-mono">{auxpt.toFixed(4)}g</div>
            <div className="text-xs text-slate-500">${(auxpt * metalPrices.AUXPT).toFixed(2)}</div>
          </div>

          {/* Palladium */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>🔷</span>
              <span className="text-sm text-slate-300">AUXPD</span>
            </div>
            <div className="text-white font-mono">{auxpd.toFixed(4)}g</div>
            <div className="text-xs text-slate-500">${(auxpd * metalPrices.AUXPD).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioSummary;
