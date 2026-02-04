import { useState, useEffect, useRef } from "react";

interface MetalPrices {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
  [key: string]: number;
}

interface MetalDirections {
  AUXG: "up" | "down" | "neutral";
  AUXS: "up" | "down" | "neutral";
  AUXPT: "up" | "down" | "neutral";
  AUXPD: "up" | "down" | "neutral";
  [key: string]: "up" | "down" | "neutral";
}

interface MetalChanges {
  AUXG: number;
  AUXS: number;
  AUXPT: number;
  AUXPD: number;
  [key: string]: number;
}

export function useMetalsPrices() {
  // Realistic default prices (February 2026) - prevents $0 or $1 bugs
  // Updated based on current market: Gold ~$5050/oz, Silver ~$89/oz, Platinum ~$2280/oz, Palladium ~$1820/oz
  const DEFAULT_BASE = { AUXG: 162.5, AUXS: 2.87, AUXPT: 73.3, AUXPD: 58.6 };
  const DEFAULT_ASK = { AUXG: 165.8, AUXS: 2.96, AUXPT: 75.1, AUXPD: 60.0 };
  const DEFAULT_BID = { AUXG: 160.9, AUXS: 2.84, AUXPT: 72.4, AUXPD: 58.0 };

  // Base prices (spread'siz ham fiyat - kartlarda gösterilecek)
  const [basePrices, setBasePrices] = useState<MetalPrices>(DEFAULT_BASE);
  // Ask prices (spread'li satış fiyatı - kullanıcıya satış)
  const [prices, setPrices] = useState<MetalPrices>(DEFAULT_ASK);
  // Bid prices (spread'li alış fiyatı - kullanıcıdan alış)
  const [bidPrices, setBidPrices] = useState<MetalPrices>(DEFAULT_BID);
  const [changes, setChanges] = useState<MetalChanges>({
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  });
  const [directions, setDirections] = useState<MetalDirections>({
    AUXG: "neutral",
    AUXS: "neutral",
    AUXPT: "neutral",
    AUXPD: "neutral",
  });
  const [loading, setLoading] = useState(true);
  const prevPrices = useRef<MetalPrices>({ AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 });

  const fetchPrices = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch("/api/prices", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const data = await response.json();

      // Helper: Use new value only if it's valid (> 0), otherwise keep current
      const validPrice = (newVal: number | undefined, currentVal: number, defaultVal: number): number => {
        if (newVal && newVal > 0) return newVal;
        if (currentVal > 0) return currentVal;
        return defaultVal;
      };

      // Base prices (spread'siz) - only update if valid
      const newBasePrices: MetalPrices = {
        AUXG: validPrice(data.basePrices?.AUXG, basePrices.AUXG, DEFAULT_BASE.AUXG),
        AUXS: validPrice(data.basePrices?.AUXS, basePrices.AUXS, DEFAULT_BASE.AUXS),
        AUXPT: validPrice(data.basePrices?.AUXPT, basePrices.AUXPT, DEFAULT_BASE.AUXPT),
        AUXPD: validPrice(data.basePrices?.AUXPD, basePrices.AUXPD, DEFAULT_BASE.AUXPD),
      };

      // Ask prices (spread'li satış) - only update if valid
      const newPrices: MetalPrices = {
        AUXG: validPrice(data.prices?.AUXG, prices.AUXG, DEFAULT_ASK.AUXG),
        AUXS: validPrice(data.prices?.AUXS, prices.AUXS, DEFAULT_ASK.AUXS),
        AUXPT: validPrice(data.prices?.AUXPT, prices.AUXPT, DEFAULT_ASK.AUXPT),
        AUXPD: validPrice(data.prices?.AUXPD, prices.AUXPD, DEFAULT_ASK.AUXPD),
      };

      // Bid prices (spread'li alış) - only update if valid
      const newBidPrices: MetalPrices = {
        AUXG: validPrice(data.bidPrices?.AUXG, bidPrices.AUXG, DEFAULT_BID.AUXG),
        AUXS: validPrice(data.bidPrices?.AUXS, bidPrices.AUXS, DEFAULT_BID.AUXS),
        AUXPT: validPrice(data.bidPrices?.AUXPT, bidPrices.AUXPT, DEFAULT_BID.AUXPT),
        AUXPD: validPrice(data.bidPrices?.AUXPD, bidPrices.AUXPD, DEFAULT_BID.AUXPD),
      };

      const newChanges: MetalChanges = {
        AUXG: data.changes?.AUXG || 0,
        AUXS: data.changes?.AUXS || 0,
        AUXPT: data.changes?.AUXPT || 0,
        AUXPD: data.changes?.AUXPD || 0,
      };

      // Calculate directions based on base price changes (only if we have previous prices)
      const newDirections: MetalDirections = {
        AUXG: prevPrices.current.AUXG > 0 ? (newBasePrices.AUXG > prevPrices.current.AUXG ? "up" : newBasePrices.AUXG < prevPrices.current.AUXG ? "down" : "neutral") : "neutral",
        AUXS: prevPrices.current.AUXS > 0 ? (newBasePrices.AUXS > prevPrices.current.AUXS ? "up" : newBasePrices.AUXS < prevPrices.current.AUXS ? "down" : "neutral") : "neutral",
        AUXPT: prevPrices.current.AUXPT > 0 ? (newBasePrices.AUXPT > prevPrices.current.AUXPT ? "up" : newBasePrices.AUXPT < prevPrices.current.AUXPT ? "down" : "neutral") : "neutral",
        AUXPD: prevPrices.current.AUXPD > 0 ? (newBasePrices.AUXPD > prevPrices.current.AUXPD ? "up" : newBasePrices.AUXPD < prevPrices.current.AUXPD ? "down" : "neutral") : "neutral",
      };

      prevPrices.current = newBasePrices;
      setBasePrices(newBasePrices);
      setPrices(newPrices);
      setBidPrices(newBidPrices);
      setChanges(newChanges);
      setDirections(newDirections);
      setLoading(false);
    } catch (error) {
      console.warn("Price fetch failed, keeping current values");
      // Don't overwrite with bad fallbacks - keep current state
      // Only set loading to false
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 3000);
    return () => clearInterval(interval);
  }, []);

  return { basePrices, prices, bidPrices, changes, directions, loading };
}
