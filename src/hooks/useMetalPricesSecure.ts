// src/hooks/useMetalPricesSecure.ts
// GoldAPI proxy üzerinden fiyat çeker - API key gizli kalır

import { useState, useEffect, useCallback } from "react";

interface MetalPrice {
  price: number;
  price_gram_24k: number;
  price_gram_22k: number;
  price_gram_21k: number;
  price_gram_18k: number;
  ch: number; // Değişim yüzdesi
  chp: number; // Değişim fiyatı
  timestamp: number;
}

interface MetalPrices {
  gold: MetalPrice | null;
  silver: MetalPrice | null;
  platinum: MetalPrice | null;
  palladium: MetalPrice | null;
}

interface UseMetalPricesReturn {
  prices: MetalPrices;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const METAL_MAP: Record<string, keyof MetalPrices> = {
  XAU: "gold",
  XAG: "silver",
  XPT: "platinum",
  XPD: "palladium",
};

export function useMetalPricesSecure(
  autoRefresh = true,
  refreshInterval = 60000 // 1 dakika
): UseMetalPricesReturn {
  const [prices, setPrices] = useState<MetalPrices>({
    gold: null,
    silver: null,
    platinum: null,
    palladium: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Server-side proxy üzerinden çek (API key gizli)
      const response = await fetch("/api/gold-prices", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Fiyatlar alınamadı");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API hatası");
      }

      const newPrices: MetalPrices = {
        gold: null,
        silver: null,
        platinum: null,
        palladium: null,
      };

      // Map API response to our format
      Object.entries(result.data).forEach(([symbol, data]: [string, any]) => {
        const metalKey = METAL_MAP[symbol];
        if (metalKey && data) {
          newPrices[metalKey] = {
            price: data.price,
            price_gram_24k: data.price_gram_24k,
            price_gram_22k: data.price_gram_22k,
            price_gram_21k: data.price_gram_21k,
            price_gram_18k: data.price_gram_18k,
            ch: data.ch || 0,
            chp: data.chp || 0,
            timestamp: data.timestamp || Date.now(),
          };
        }
      });

      setPrices(newPrices);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error("Metal prices fetch error:", err);
      setError(err.message || "Fiyatlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  // İlk yükleme
  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Otomatik yenileme
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchPrices]);

  return {
    prices,
    loading,
    error,
    refresh: fetchPrices,
    lastUpdated,
  };
}

// Gram fiyatı hesapla (USD/gram)
export function getGramPrice(metalPrice: MetalPrice | null): number {
  if (!metalPrice) return 0;
  return metalPrice.price_gram_24k || metalPrice.price / 31.1035; // Troy ons
}

// Spread ile al/sat fiyatı
export function getPriceWithSpread(
  gramPrice: number,
  type: "buy" | "sell",
  spreadPercent = 1
): number {
  const spread = gramPrice * (spreadPercent / 100);
  return type === "buy" ? gramPrice + spread : gramPrice - spread;
}

export default useMetalPricesSecure;
