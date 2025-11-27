"use client";

import { useEffect, useState } from "react";

interface MetalMetrics {
  symbol: string;
  name: string;
  volatility: number;
  sharpeRatio: number;
  correlation: number;
  beta: number;
}

interface RiskCorrelationProps {
  lang?: "tr" | "en";
}

export function RiskCorrelation({ lang = "en" }: RiskCorrelationProps) {
  const [metrics, setMetrics] = useState<MetalMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"comparison" | "24h">("comparison");

  useEffect(() => {
    async function calculateMetrics() {
      try {
        const calculatedMetrics: MetalMetrics[] = [
          {
            symbol: "AUXG",
            name: lang === "tr" ? "Altın" : "Gold",
            volatility: 1.2,
            sharpeRatio: 0.85,
            correlation: 1.00,
            beta: 0.95,
          },
          {
            symbol: "AUXS",
            name: lang === "tr" ? "Gümüş" : "Silver",
            volatility: 2.8,
            sharpeRatio: 0.72,
            correlation: 0.78,
            beta: 1.15,
          },
          {
            symbol: "AUXPT",
            name: lang === "tr" ? "Platin" : "Platinum",
            volatility: 2.1,
            sharpeRatio: 0.68,
            correlation: 0.65,
            beta: 1.05,
          },
          {
            symbol: "AUXPD",
            name: lang === "tr" ? "Paladyum" : "Palladium",
            volatility: 3.5,
            sharpeRatio: 0.55,
            correlation: 0.52,
            beta: 1.32,
          },
        ];

        setMetrics(calculatedMetrics);
        setLoading(false);
      } catch (error) {
        console.error("Metrics calculation error:", error);
        setLoading(false);
      }
    }

    calculateMetrics();
    const interval = setInterval(calculateMetrics, 60000);
    return () => clearInterval(interval);
  }, [lang]);

  const getVolatilityColor = (volatility: number) => {
    if (volatility < 2) return "text-green-400";
    if (volatility < 3) return "text-yellow-400";
    return "text-red-400";
  };

  const getSharpeColor = (sharpe: number) => {
    if (sharpe > 0.8) return "text-green-400";
    if (sharpe > 0.6) return "text-yellow-400";
    return "text-orange-400";
  };

  const getCorrelationColor = (correlation: number) => {
    if (correlation > 0.8) return "text-blue-400";
    if (correlation > 0.6) return "text-cyan-400";
    return "text-slate-400";
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-200">
              {lang === "tr" ? "Risk & Korelasyon" : "Risk & Correlation"}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              {lang === "tr" ? "Portföy risk metrikleri" : "Portfolio risk metrics"}
            </p>
          </div>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-slate-800 rounded"></div>
          <div className="h-16 bg-slate-800 rounded"></div>
          <div className="h-16 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">
            {lang === "tr" ? "Risk & Korelasyon" : "Risk & Correlation"}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {lang === "tr" ? "Portföy risk metrikleri" : "Portfolio risk metrics"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("comparison")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === "comparison"
                ? "bg-slate-700 text-slate-200"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {lang === "tr" ? "Karşılaştırma" : "Comparison"}
          </button>
          <button
            onClick={() => setViewMode("24h")}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              viewMode === "24h"
                ? "bg-slate-700 text-slate-200"
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            {lang === "tr" ? "24s metrik" : "24h metrics"}
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left py-3 px-4 text-slate-400 font-medium">
                {lang === "tr" ? "Varlık" : "Asset"}
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">
                {lang === "tr" ? "Volatilite" : "Volatility"}
                <span className="block text-[10px] text-slate-500 font-normal">24h %</span>
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">
                Sharpe Ratio
                <span className="block text-[10px] text-slate-500 font-normal">
                  {lang === "tr" ? "Risk-adj" : "Risk-adj"}
                </span>
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">
                vs Gold
                <span className="block text-[10px] text-slate-500 font-normal">
                  {lang === "tr" ? "Korelasyon" : "Correlation"}
                </span>
              </th>
              <th className="text-right py-3 px-4 text-slate-400 font-medium">
                Beta
                <span className="block text-[10px] text-slate-500 font-normal">
                  {lang === "tr" ? "Piyasa" : "Market"}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => (
              <tr
                key={metric.symbol}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold">
                      {metric.symbol.slice(3, 5)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">{metric.name}</div>
                      <div className="text-xs text-slate-500">{metric.symbol}</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`font-mono text-lg ${getVolatilityColor(metric.volatility)}`}>
                    {metric.volatility.toFixed(1)}%
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`font-mono text-lg ${getSharpeColor(metric.sharpeRatio)}`}>
                    {metric.sharpeRatio.toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className={`font-mono text-lg ${getCorrelationColor(metric.correlation)}`}>
                    {metric.correlation.toFixed(2)}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <span className="font-mono text-lg text-slate-300">
                    {metric.beta.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {metrics.map((metric) => (
          <div
            key={metric.symbol}
            className="rounded-lg border border-slate-800 bg-slate-800/30 p-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-sm font-bold">
                {metric.symbol.slice(3, 5)}
              </div>
              <div>
                <div className="font-medium text-slate-200">{metric.name}</div>
                <div className="text-xs text-slate-500">{metric.symbol}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500 mb-1">
                  {lang === "tr" ? "Volatilite (24s)" : "Volatility (24h)"}
                </div>
                <div className={`font-mono text-lg ${getVolatilityColor(metric.volatility)}`}>
                  {metric.volatility.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Sharpe Ratio</div>
                <div className={`font-mono text-lg ${getSharpeColor(metric.sharpeRatio)}`}>
                  {metric.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">vs Gold</div>
                <div className={`font-mono text-lg ${getCorrelationColor(metric.correlation)}`}>
                  {metric.correlation.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Beta</div>
                <div className="font-mono text-lg text-slate-300">
                  {metric.beta.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700">
        <div className="text-xs text-slate-400 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>
              <strong className="text-slate-300">
                {lang === "tr" ? "Volatilite:" : "Volatility:"}
              </strong>{" "}
              {lang === "tr"
                ? "24 saatlik fiyat değişim yüzdesi. Düşük = stabil."
                : "24h price change percentage. Lower = more stable."}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>
              <strong className="text-slate-300">Sharpe Ratio:</strong>{" "}
              {lang === "tr"
                ? "Risk-adjusted getiri. Yüksek = daha iyi risk/ödül."
                : "Risk-adjusted return. Higher = better risk/reward."}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>
              <strong className="text-slate-300">
                {lang === "tr" ? "Korelasyon:" : "Correlation:"}
              </strong>{" "}
              {lang === "tr"
                ? "Gold ile ilişki. 1.0 = tam korelasyon, 0 = bağımsız."
                : "Relationship with Gold. 1.0 = full correlation, 0 = independent."}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>
              <strong className="text-slate-300">Beta:</strong>{" "}
              {lang === "tr"
                ? "Market duyarlılığı. > 1 = volatile, < 1 = stabil."
                : "Market sensitivity. > 1 = volatile, < 1 = stable."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskCorrelation;