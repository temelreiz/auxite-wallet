"use client";

import { useState, useEffect } from "react";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";

interface RiskCorrelationProps {
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

interface MetalMetrics {
  volatility: number;
  avgReturn: number;
  priceRange: number;
}

// Translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Risk & Korelasyon",
    subtitle: "Portföy risk metrikleri (7 günlük veri)",
    comparison: "Karşılaştırma",
    days: "7g",
    calculating: "Metrikler hesaplanıyor...",
    noBalance: "Risk metrikleri için token bakiyesi gerekli",
    asset: "Varlık",
    vol: "Vol",
    corr: "Kor",
    avgRet: "Ort Get",
    range: "Aralık",
    volatilityDesc: "7 günlük fiyat değişimlerinin standart sapması",
    varDesc: "95% güven aralığında maksimum kayıp tahmini",
    rangeDesc: "7 günlük min-max fiyat farkı",
  },
  en: {
    title: "Risk & Correlation",
    subtitle: "Portfolio risk metrics (7-day data)",
    comparison: "Comparison",
    days: "7d",
    calculating: "Calculating metrics...",
    noBalance: "Token balance required for risk metrics",
    asset: "Asset",
    vol: "Vol",
    corr: "Corr",
    avgRet: "Avg Ret",
    range: "Range",
    volatilityDesc: "Standard deviation of 7-day price changes",
    varDesc: "Estimated maximum loss at 95% confidence",
    rangeDesc: "Min-max price difference over 7 days",
  },
  de: {
    title: "Risiko & Korrelation",
    subtitle: "Portfolio-Risikometriken (7-Tage-Daten)",
    comparison: "Vergleich",
    days: "7T",
    calculating: "Metriken werden berechnet...",
    noBalance: "Token-Guthaben für Risikometriken erforderlich",
    asset: "Vermögenswert",
    vol: "Vol",
    corr: "Korr",
    avgRet: "Ø Rend",
    range: "Spanne",
    volatilityDesc: "Standardabweichung der 7-Tage-Preisänderungen",
    varDesc: "Geschätzter maximaler Verlust bei 95% Konfidenz",
    rangeDesc: "Min-Max-Preisdifferenz über 7 Tage",
  },
  fr: {
    title: "Risque & Corrélation",
    subtitle: "Métriques de risque du portefeuille (données sur 7 jours)",
    comparison: "Comparaison",
    days: "7j",
    calculating: "Calcul des métriques...",
    noBalance: "Solde de tokens requis pour les métriques de risque",
    asset: "Actif",
    vol: "Vol",
    corr: "Corr",
    avgRet: "Rend Moy",
    range: "Plage",
    volatilityDesc: "Écart-type des variations de prix sur 7 jours",
    varDesc: "Perte maximale estimée à 95% de confiance",
    rangeDesc: "Différence de prix min-max sur 7 jours",
  },
  ar: {
    title: "المخاطر والارتباط",
    subtitle: "مقاييس مخاطر المحفظة (بيانات 7 أيام)",
    comparison: "مقارنة",
    days: "7ي",
    calculating: "جاري حساب المقاييس...",
    noBalance: "رصيد الرموز مطلوب لمقاييس المخاطر",
    asset: "الأصل",
    vol: "التقلب",
    corr: "الارتباط",
    avgRet: "متوسط العائد",
    range: "النطاق",
    volatilityDesc: "الانحراف المعياري لتغيرات الأسعار على مدى 7 أيام",
    varDesc: "الخسارة القصوى المقدرة بثقة 95%",
    rangeDesc: "فرق السعر الأدنى-الأقصى على مدى 7 أيام",
  },
  ru: {
    title: "Риск и Корреляция",
    subtitle: "Метрики риска портфеля (данные за 7 дней)",
    comparison: "Сравнение",
    days: "7д",
    calculating: "Расчет метрик...",
    noBalance: "Для метрик риска требуется баланс токенов",
    asset: "Актив",
    vol: "Вол",
    corr: "Корр",
    avgRet: "Ср Дох",
    range: "Диапазон",
    volatilityDesc: "Стандартное отклонение изменений цены за 7 дней",
    varDesc: "Оценочный максимальный убыток с доверием 95%",
    rangeDesc: "Разница мин-макс цены за 7 дней",
  },
};

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

  const t = translations[lang] || translations.en;

  useEffect(() => {
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
    const interval = setInterval(fetchMetrics, 3600000);
    return () => clearInterval(interval);
  }, []);

  const assets = [
    {
      symbol: "AUXG",
      name: "Gold",
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
      name: "Silver",
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
      name: "Platinum",
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
      name: "Palladium",
      balance: parseFloat(balances.AUXPD || "0"),
      volatility: metrics.AUXPD?.volatility || 0,
      sharpe: "0.25",
      correlation: 0.65,
      beta: 1.5,
      var95: metrics.AUXPD ? (metrics.AUXPD.volatility * 1.65).toFixed(1) : "0",
      avgReturn: metrics.AUXPD?.avgReturn || 0,
      drawdown: metrics.AUXPD?.priceRange.toFixed(1) || "0",
    },
  ].filter((asset) => asset.symbol); // Show all metals regardless of balance

  const getAssetIcon = (symbol: string) => {
    if (metalIcons[symbol]) {
      return <img src={metalIcons[symbol]} alt={symbol} className="w-6 h-6" />;
    }
    return <span className="text-lg">●</span>;
  };

  return (
    <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t.title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.subtitle}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <button className="rounded bg-stone-100 dark:bg-slate-800 px-3 py-1 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
            {t.comparison}
          </button>
          <button className="rounded bg-stone-100 dark:bg-slate-800 px-3 py-1 text-slate-600 dark:text-slate-300 hover:bg-stone-200 dark:hover:bg-slate-700 transition-colors">
            {t.days}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-2xl">⏳</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t.calculating}
          </p>
        </div>
      ) : assets.length === 0 ? (
        <div className="py-8 text-center">
          <div className="mb-2 text-4xl">📊</div>
          <p className="text-slate-500 dark:text-slate-400">
            {t.noBalance}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                <th className="pb-3 font-medium">{t.asset}</th>
                <th className="pb-3 text-right font-medium">
                  {t.vol}
                  <br />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.days}</span>
                </th>
                <th className="pb-3 text-right font-medium">Sharpe</th>
                <th className="pb-3 text-right font-medium">{t.corr}</th>
                <th className="pb-3 text-right font-medium">Beta</th>
                <th className="pb-3 text-right font-medium">
                  VaR
                  <br />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">95%</span>
                </th>
                <th className="pb-3 text-right font-medium">
                  {t.avgRet}
                  <br />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{t.days}</span>
                </th>
                <th className="pb-3 text-right font-medium">
                  {t.range}
                  <br />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">%</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr
                  key={asset.symbol}
                  className="border-b border-stone-100 dark:border-slate-800/50 transition-colors hover:bg-stone-50 dark:hover:bg-slate-800/30"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {getAssetIcon(asset.symbol)}
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {asset.symbol}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-mono text-sm ${
                        asset.volatility > 2 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {asset.volatility.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                      {asset.sharpe}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                      {asset.correlation.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                      {asset.beta.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
                      {asset.var95}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`font-mono text-sm ${
                        asset.avgReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {asset.avgReturn >= 0 ? "+" : ""}
                      {asset.avgReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className="font-mono text-sm text-amber-600 dark:text-amber-400">
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
        <div className="mt-4 space-y-1 border-t border-stone-200 dark:border-slate-800 pt-4 text-xs text-slate-400 dark:text-slate-500">
          <p>
            <strong className="text-slate-600 dark:text-slate-400">
              {lang === "tr" ? "Volatilite:" : "Volatility:"}
            </strong>{" "}
            {t.volatilityDesc}
          </p>
          <p>
            <strong className="text-slate-600 dark:text-slate-400">VaR 95%:</strong>{" "}
            {t.varDesc}
          </p>
          <p>
            <strong className="text-slate-600 dark:text-slate-400">
              {t.range}:
            </strong>{" "}
            {t.rangeDesc}
          </p>
        </div>
      )}
    </div>
  );
}

export default RiskCorrelation;
