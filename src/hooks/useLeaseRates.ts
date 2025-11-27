"use client";

import { useState, useEffect, useCallback } from "react";

interface LeaseRatePeriod {
  months: number;
  days: number;
  apy: number;
}

interface MetalLeaseRates {
  "3m": number;
  "6m": number;
  "12m": number;
}

interface LeaseRatesResponse {
  gold: MetalLeaseRates;
  silver: MetalLeaseRates;
  platinum: MetalLeaseRates;
  palladium: MetalLeaseRates;
  lastUpdated: string;
  sofr: number;
  gofo: number;
  source: string;
}

interface LeaseOffer {
  metal: string;
  symbol: string;
  name: string;
  icon: string;
  metalTokenAddress: string;
  contractAddress: string;
  periods: LeaseRatePeriod[];
  minAmount: number;
  maxAmount: number;
  tvl: number;
  lastUpdated: string;
  source: string;
}

const METAL_CONFIGS = {
  AUXG: {
    symbol: "AUXG",
    nameEn: "Gold",
    nameTr: "Altın",
    icon: "/gold-favicon-32x32.png",
    metalTokenAddress: "0xE425A9923250E94Fe2F4cB99cbc0896Aea24933a",
    contractAddress: "0xe63050b6d0497a970d3fB44EBF428742631d1006",
    minAmount: 10,
    maxAmount: 0,
    tvl: 500000,
    rateKey: "gold" as const,
  },
  AUXS: {
    symbol: "AUXS",
    nameEn: "Silver",
    nameTr: "Gümüş",
    icon: "/silver-favicon-32x32.png",
    metalTokenAddress: "0xaE583c98c833a0B4b1B23e58209E697d95F05D23",
    contractAddress: "0x6396163f0CeA0EdC639c353f6D1EbCd7C5427945",
    minAmount: 100,
    maxAmount: 0,
    tvl: 250000,
    rateKey: "silver" as const,
  },
  AUXPT: {
    symbol: "AUXPT",
    nameEn: "Platinum",
    nameTr: "Platin",
    icon: "/platinum-favicon-32x32.png",
    metalTokenAddress: "0xeCfD88bE4f93C9379644B303444943e636A35F66",
    contractAddress: "0xeB95c1C459506F6265c800C64D3423005499C3Ea",
    minAmount: 5,
    maxAmount: 0,
    tvl: 350000,
    rateKey: "platinum" as const,
  },
  AUXPD: {
    symbol: "AUXPD",
    nameEn: "Palladium",
    nameTr: "Paladyum",
    icon: "/palladium-favicon-32x32.png",
    metalTokenAddress: "0x6F4E027B42E14e06f3eaeA39d574122188eab1D4",
    contractAddress: "0x587706Bf9A907288145cfFc35b57818Df4db68A4",
    minAmount: 5,
    maxAmount: 0,
    tvl: 150000,
    rateKey: "palladium" as const,
  },
};

const FALLBACK_RATES: LeaseRatesResponse = {
  gold: { "3m": 2.5, "6m": 3.0, "12m": 3.5 },
  silver: { "3m": 2.0, "6m": 2.5, "12m": 3.0 },
  platinum: { "3m": 3.0, "6m": 3.5, "12m": 4.0 },
  palladium: { "3m": 2.8, "6m": 3.3, "12m": 3.8 },
  lastUpdated: "2025-01-20",
  sofr: 4.33,
  gofo: 1.5,
  source: "Fallback",
};

interface UseLeaseRatesOptions {
  lang?: "tr" | "en";
  refreshInterval?: number;
}

export function useLeaseRates(options: UseLeaseRatesOptions = {}) {
  const { lang = "en", refreshInterval = 5 * 60 * 1000 } = options;
  
  const [rates, setRates] = useState<LeaseRatesResponse>(FALLBACK_RATES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchRates = useCallback(async () => {
    console.log("🔍 Fetching lease rates from API...");
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/lease-rates", {
        cache: "no-store",
      });
      
      console.log("📡 API Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("✅ API Data received:", data);
      
      if (data.success && data.rates) {
        console.log("💾 Setting rates:", data.rates);
        setRates(data.rates);
        setLastFetch(new Date());
      } else {
        throw new Error(data.error || "Invalid response");
      }
    } catch (err) {
      console.error("❌ Failed to fetch lease rates:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log("🚀 useLeaseRates mounted");
    fetchRates();
  }, [fetchRates]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchRates, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchRates, refreshInterval]);

  const leaseOffers: LeaseOffer[] = Object.entries(METAL_CONFIGS).map(([key, config]) => {
    const metalRates = rates[config.rateKey];
    
    return {
      metal: key,
      symbol: config.symbol,
      name: lang === "tr" ? config.nameTr : config.nameEn,
      icon: config.icon,
      metalTokenAddress: config.metalTokenAddress,
      contractAddress: config.contractAddress,
      periods: [
        { months: 3, days: 90, apy: metalRates["3m"] },
        { months: 6, days: 180, apy: metalRates["6m"] },
        { months: 12, days: 365, apy: metalRates["12m"] },
      ],
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      tvl: config.tvl,
      lastUpdated: rates.lastUpdated,
      source: rates.source,
    };
  });

  const getOfferBySymbol = useCallback((symbol: string): LeaseOffer | undefined => {
    return leaseOffers.find(offer => offer.symbol === symbol || offer.metal === symbol);
  }, [leaseOffers]);

  const formatAPYRange = useCallback((offer: LeaseOffer): string => {
    const apys = offer.periods.map(p => p.apy);
    return `${Math.min(...apys)}% - ${Math.max(...apys)}%`;
  }, []);

  return {
    leaseOffers,
    getOfferBySymbol,
    formatAPYRange,
    isLoading,
    error,
    lastFetch,
    lastUpdated: rates.lastUpdated,
    source: rates.source,
    sofr: rates.sofr,
    gofo: rates.gofo,
    refresh: fetchRates,
  };
}

export type { LeaseOffer, LeaseRatePeriod, LeaseRatesResponse };