// hooks/useCryptoChart.ts
// Binance'den kripto chart verisi çeken hook

import { useState, useEffect, useCallback } from "react";

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface UseCryptoChartOptions {
  symbol: string;
  interval?: string;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useCryptoChart(options: UseCryptoChartOptions) {
  const {
    symbol,
    interval = "1h",
    limit = 100,
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
  } = options;

  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        symbol,
        interval,
        limit: limit.toString(),
      });

      const response = await fetch(`/api/crypto/chart?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch chart");
      }

      setCandles(data.candles || []);
      setError(null);
    } catch (err: any) {
      console.error("useCryptoChart error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, limit]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchChart, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval, fetchChart]);

  // Calculate sparkline data (last 24 points for mini chart)
  const sparklineData = candles.slice(-24).map((c) => c.close);

  // Calculate price change
  const priceChange =
    candles.length >= 2
      ? ((candles[candles.length - 1].close - candles[0].close) / candles[0].close) * 100
      : 0;

  // Get current price
  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

  // Get 24h high/low
  const last24 = candles.slice(-24);
  const high24h = last24.length > 0 ? Math.max(...last24.map((c) => c.high)) : 0;
  const low24h = last24.length > 0 ? Math.min(...last24.map((c) => c.low)) : 0;

  return {
    candles,
    sparklineData,
    currentPrice,
    priceChange,
    high24h,
    low24h,
    loading,
    error,
    refresh: fetchChart,
  };
}

export default useCryptoChart;
