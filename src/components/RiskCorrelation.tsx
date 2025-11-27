"use client";

import { useState, useEffect } from "react";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";

interface RiskCorrelationProps {
  lang?: "tr" | "en";
}

interface MetalMetrics {
  volatility: number;
  avgReturn: number;
  priceRange: number;
}

// Metal icon mapping
const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

// Map our symbols to GoldAPI symbols
const symbolMap: Record<string, string> = {
  AUXG: "XAU",
  AUXS: "XAG", 
  AUXPT: "XPT",
  AUXPD: "XPD",
};

export function RiskCorrelation({ lang = "en" }: RiskCorrelationProps) {
  const { balances } = useTokenBalances();
  const { prices } = useMetalsPrices();
  const [metrics, setMetrics] = useState<Record<string, MetalMetrics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch historical data for all metals
    const fetchMetrics = async () => {
      const newMetrics: Record<string, MetalMetrics> = {};
      
      for (const [symbol, goldSymbol] of Object.entries(symbolMap)) {
        try {
          const res = await fetch(`/api/prices/history?metal=${goldSymbol}&days=7`);
          if (res.ok) {
            const data = await res.json();
            if (data.metrics) {
              newMetrics[symbol] = data.metrics;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch metrics for ${symbol}:`, err);
        }
      }
      
      setMetrics(newMetrics);
      setLoading(false);
    };

    fetchMetrics();
    // Refresh every 1 hour
    const interval = setInterval(fetchMetrics, 3600000);
    return () => clearInterval(interval);
  }, []);

  // Calculate portfolio metrics with real volatility data
  const assets = [
    {
      symbol: "AUXG",
      name: lang === "tr" ? "Gold" : "Gold",
      balance: parseFloat(balances.AUXG || "0"),
      volatility: metrics.AUXG?.volatility || 0,
      sharpe: "1.41",
      correlation: 1.0,
      beta: 1.0,
      var95: metrics.AUXG ? (metrics.AUXG.volatility * 1.65).toFixed(1) : "0",
      avgReturn: metrics.AUXG?.avgReturn || 0,
      drawdown: metrics.AUXG?.priceRange.toFixed(1) || "0",
    },
    {
      symbol: "AUXS",
      name: lang === "tr" ? "Silver" : "Silver",
      balance: parseFloat(balances.AUXS || "0"),
      volatility: metrics.AUXS?.volatility || 0,
      sharpe: "0.11",
      correlation: 0.85,
      beta: 1.2,
      var95: metrics.AUXS ? (metrics.AUXS.volatility * 1.65).toFixed(1) : "0",
      avgReturn: metrics.AUXS?.avgReturn || 0,
      drawdown: metrics.AUXS?.priceRange.toFixed(1) || "0",
    },
    {
      symbol: "AUXPT",
      name: lang === "tr" ? "Platinum" : "Platinum",
      balance: parseFloat(balances.AUXPT || "0"),
      volatility: metrics.AUXPT?.volatility || 0,
      sharpe: "0.30",
      correlation: 0.75,
      beta: 0.9,
      var95: metrics.AUXPT ? (metrics.AUXPT.volatility * 1.65).toFixed(1) : "0",
      avgReturn: metrics.AUXPT?.avgReturn || 0,
      drawdown: metrics.AUXPT?.priceRange.toFixed(1) || "0",
    },
    {
      symbol: "AUXPD",
      name: lang === "tr" ? "Palladium" : "Palladium",
      balance: parseFloat(balances.AUXPD || "0"),
      volatility: metrics.AUXPD?.volatility || 0,
      sharpe: "0.25",
      correlation: 0.65,
      beta: 1.5,
      var95: metrics.AUXPD ? (metrics.AUXPD.volatility * 1.65).toFixed(1) : "0",
      avgReturn: metrics.AUXPD?.avgReturn || 0,
      drawdown: metrics.AUXPD?.priceRange.toFixed(1) || "0",
    },
  ].filter((asset) => asset.balance > 0);

  const getAssetIcon = (symbol: string) => {
    if (metalIcons[symbol]) {
      return <img src={metalIcons[symbol]} alt={symbol} className="w-6 h-6" />;
    }
    return <span className="text-lg">●</span>;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {lang === "tr" ? "Risk & Korelasyon" : "Risk & Correlation"}
          </h3>
          <p className="text-sm text-slate-400">
            {lang === "tr"
              ? "Portföy risk metrikleri (7 günlük veri)"
              : "Portfolio risk metrics (7-day data)"}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button className="rounded bg-slate-800 px-3 py-1 text-slate-300">
            {lang === "tr" ? "Karşılaştırma" : "Comparison"}
          </button>
          <button className="rounded bg-slate-800 px-3 py-1 text-slate-300">
            7{lang === "tr" ? "g" : "d"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-2xl">⏳</div>
          <p className="text-slate-400 text-sm">
            {lang === "tr" ? "Metrikler hesaplanıyor..." : "Calculating metrics..."}
          </p>
        </div>
      ) : assets.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-4xl">📊</div>
          <p className="text-slate-400">
            {lang === "tr"
              ? "Risk metrikleri için token bakiyesi gerekli"
              : "Token balance required for risk metrics"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs text-slate-400">
                <th className="pb-3 font-medium">
                  {lang === "tr" ? "Varlık" : "Asset"}
                </th>
                <th className="pb-3 text-right font-medium">
                  {lang === "tr" ? "Vol" : "Vol"}
                  <br />
                  <span className="text-[10px] text-slate-500">7{lang === "tr" ? "g" : "d"}</span>
                </th>
                <th className="pb-3 text-right font-medium">
                  Sharpe
                </th>
                <th className="pb-3 text-right font-medium">
                  {lang === "tr" ? "Kor" : "Corr"}
                </th>
                <th className="pb-3 text-right font-medium">Beta</th>
                <th className="pb-3 text-right font-medium">
                  VaR
                  <br />
                  <span className="text-[10px] text-slate-500">95%</span>
                </th>
                <th className="pb-3 text-right font-medium">
                  {lang === "tr" ? "Ort Get" : "Avg Ret"}
                  <br />
                  <span className="text-[10px] text-slate-500">7{lang === "tr" ? "g" : "d"}</span>
                </th>
                <th className="pb-3 text-right font-medium">
                  {lang === "tr" ? "Aralık" : "Range"}
                  <br />
                  <span className="text-[10px] text-slate-500">%</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.symbol}
                  className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {getAssetIcon(asset.symbol)}
                      <div>
                        <div className="font-medium text-slate-200">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-slate-500">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-mono text-sm ${
                        asset.volatility > 2 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {asset.volatility.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-300">
                      {asset.sharpe}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-300">
                      {asset.correlation.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-300">
                      {asset.beta.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-300">
                      {asset.var95}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-mono text-sm ${
                      asset.avgReturn >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {asset.avgReturn >= 0 ? "+" : ""}{asset.avgReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-amber-400">
                      {asset.drawdown}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Notes */}
      {assets.length > 0 && (
        <div className="mt-4 space-y-1 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <p>
            <strong className="text-slate-400">
              {lang === "tr" ? "Volatilite:" : "Volatility:"}
            </strong>{" "}
            {lang === "tr"
              ? "7 günlük fiyat değişimlerinin standart sapması"
              : "Standard deviation of 7-day price changes"}
          </p>
          <p>
            <strong className="text-slate-400">VaR 95%:</strong>{" "}
            {lang === "tr"
              ? "95% güven aralığında maksimum kayıp tahmini"
              : "Estimated maximum loss at 95% confidence"}
          </p>
          <p>
            <strong className="text-slate-400">
              {lang === "tr" ? "Aralık:" : "Range:"}
            </strong>{" "}
            {lang === "tr"
              ? "7 günlük min-max fiyat farkı"
              : "Min-max price difference over 7 days"}
          </p>
        </div>
      )}
    </div>
  );
}

export default RiskCorrelation;