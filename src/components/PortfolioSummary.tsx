"use client";

import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";
import { formatAmount, getDecimalPlaces } from '@/lib/format';


const translations = {
  tr: {
    portfolio: "Portföy",
    totalValue: "Toplam Değer",
    auxmBalance: "AUXM Bakiye",
    metals: "Metaller",
    notConnected: "Cüzdan bağlanmadı",
    connectWalletPrompt: "Portföyünüzü görmek için cüzdanınızı bağlayın",
    loading: "Yükleniyor...",
  },
  en: {
    portfolio: "Portfolio",
    totalValue: "Total Value",
    auxmBalance: "AUXM Balance",
    metals: "Metals",
    notConnected: "Wallet not connected",
    connectWalletPrompt: "Connect your wallet to view your portfolio",
    loading: "Loading...",
  },
  de: {
    portfolio: "Portfolio",
    totalValue: "Gesamtwert",
    auxmBalance: "AUXM Guthaben",
    metals: "Metalle",
    notConnected: "Wallet nicht verbunden",
    connectWalletPrompt: "Verbinden Sie Ihre Wallet, um Ihr Portfolio anzuzeigen",
    loading: "Laden...",
  },
  fr: {
    portfolio: "Portefeuille",
    totalValue: "Valeur Totale",
    auxmBalance: "Solde AUXM",
    metals: "Métaux",
    notConnected: "Portefeuille non connecté",
    connectWalletPrompt: "Connectez votre portefeuille pour voir votre portfolio",
    loading: "Chargement...",
  },
  ar: {
    portfolio: "المحفظة",
    totalValue: "القيمة الإجمالية",
    auxmBalance: "رصيد AUXM",
    metals: "المعادن",
    notConnected: "المحفظة غير متصلة",
    connectWalletPrompt: "اربط محفظتك لعرض محفظتك الاستثمارية",
    loading: "جاري التحميل...",
  },
  ru: {
    portfolio: "Портфель",
    totalValue: "Общая Стоимость",
    auxmBalance: "Баланс AUXM",
    metals: "Металлы",
    notConnected: "Кошелек не подключен",
    connectWalletPrompt: "Подключите кошелек для просмотра портфеля",
    loading: "Загрузка...",
  },
};

interface PortfolioSummaryProps {
  metalPrices?: {
    AUXG: number;
    AUXS: number;
    AUXPT: number;
    AUXPD: number;
  };
}

export function PortfolioSummary({
  metalPrices = { AUXG: 85, AUXS: 1, AUXPT: 32, AUXPD: 34 },
}: PortfolioSummaryProps) {
  const { address, isConnected, balances, balancesLoading, refreshBalances } = useWallet();
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;

  const auxmBalance = balances?.auxm ?? 0;
  const totalAuxm = auxmBalance;

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

  if (!isConnected) {
    return (
      <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">💼</div>
          <h3 className="text-lg font-semibold text-slate-200 mb-2">{t("notConnected")}</h3>
          <p className="text-sm text-slate-400">
            {t("connectWalletPrompt")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white">{t("portfolio")}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
          </span>
          <button 
            onClick={refreshBalances}
            disabled={balancesLoading}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className={`w-4 h-4 text-slate-400 ${balancesLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>     </button>
        </div>
      </div>

      {/* Total Value */}
      <div className="mb-6">
        <div className="text-sm text-slate-400 mb-1">{t("totalValue")}</div>
        <div className="text-3xl font-bold text-white font-mono">
          ${totalValue.toFixed(2)}
        </div>
      </div>

      {/* AUXM Section */}
      <div className="mb-4 p-4 bg-slate-800/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">{t("auxmBalance")}</span>
          <span className="text-white font-mono">${totalAuxm.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{auxmBalance.toFixed(2)} AUXM</span>
        </div>
      </div>

      {/* Metals Section */}
      <div>
        <div className="text-sm text-slate-400 mb-3">{t("metals")}</div>
        <div className="grid grid-cols-2 gap-3">
          {/* Gold */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>🥇</span>
              <span className="text-sm text-slate-300">AUXG</span>
            </div>
            <div className="text-white font-mono">{formatAmount(auxg, 'AUXG')}g</div>
            <div className="text-xs text-slate-500">${(auxg * metalPrices.AUXG).toFixed(2)}</div>
          </div>

          {/* Silver */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>🥈</span>
              <span className="text-sm text-slate-300">AUXS</span>
            </div>
            <div className="text-white font-mono">{formatAmount(auxs, 'AUXS')}g</div>
            <div className="text-xs text-slate-500">${(auxs * metalPrices.AUXS).toFixed(2)}</div>
          </div>

          {/* Platinum */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>💎</span>
              <span className="text-sm text-slate-300">AUXPT</span>
            </div>
            <div className="text-white font-mono">{formatAmount(auxpt, 'AUXPT')}g</div>
            <div className="text-xs text-slate-500">${(auxpt * metalPrices.AUXPT).toFixed(2)}</div>
          </div>

          {/* Palladium */}
          <div className="p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <span>🔷</span>
              <span className="text-sm text-slate-300">AUXPD</span>
            </div>
            <div className="text-white font-mono">{formatAmount(auxpd, 'AUXPD')}g</div>
            <div className="text-xs text-slate-500">${(auxpd * metalPrices.AUXPD).toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioSummary;
