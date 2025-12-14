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
  // Base prices (spread'siz ham fiyat - kartlarda gösterilecek)
  const [basePrices, setBasePrices] = useState<MetalPrices>({
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  });
  // Ask prices (spread'li satış fiyatı - kullanıcıya satış)
  const [prices, setPrices] = useState<MetalPrices>({
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  });
  // Bid prices (spread'li alış fiyatı - kullanıcıdan alış)
  const [bidPrices, setBidPrices] = useState<MetalPrices>({
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  });
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

      // Base prices (spread'siz)
      const newBasePrices: MetalPrices = {
        AUXG: data.basePrices?.AUXG || 0,
        AUXS: data.basePrices?.AUXS || 0,
        AUXPT: data.basePrices?.AUXPT || 0,
        AUXPD: data.basePrices?.AUXPD || 0,
      };

      // Ask prices (spread'li satış)
      const newPrices: MetalPrices = {
        AUXG: data.prices?.AUXG || 0,
        AUXS: data.prices?.AUXS || 0,
        AUXPT: data.prices?.AUXPT || 0,
        AUXPD: data.prices?.AUXPD || 0,
      };

      // Bid prices (spread'li alış)
      const newBidPrices: MetalPrices = {
        AUXG: data.bidPrices?.AUXG || newPrices.AUXG,
        AUXS: data.bidPrices?.AUXS || newPrices.AUXS,
        AUXPT: data.bidPrices?.AUXPT || newPrices.AUXPT,
        AUXPD: data.bidPrices?.AUXPD || newPrices.AUXPD,
      };

      const newChanges: MetalChanges = {
        AUXG: data.changes?.AUXG || 0,
        AUXS: data.changes?.AUXS || 0,
        AUXPT: data.changes?.AUXPT || 0,
        AUXPD: data.changes?.AUXPD || 0,
      };

      // Calculate directions based on base price changes
      const newDirections: MetalDirections = {
        AUXG: newBasePrices.AUXG > prevPrices.current.AUXG ? "up" : newBasePrices.AUXG < prevPrices.current.AUXG ? "down" : "neutral",
        AUXS: newBasePrices.AUXS > prevPrices.current.AUXS ? "up" : newBasePrices.AUXS < prevPrices.current.AUXS ? "down" : "neutral",
        AUXPT: newBasePrices.AUXPT > prevPrices.current.AUXPT ? "up" : newBasePrices.AUXPT < prevPrices.current.AUXPT ? "down" : "neutral",
        AUXPD: newBasePrices.AUXPD > prevPrices.current.AUXPD ? "up" : newBasePrices.AUXPD < prevPrices.current.AUXPD ? "down" : "neutral",
      };

      prevPrices.current = newBasePrices;
      setBasePrices(newBasePrices);
      setPrices(newPrices);
      setBidPrices(newBidPrices);
      setChanges(newChanges);
      setDirections(newDirections);
      setLoading(false);
    } catch (error) {
      // Fallback prices
      const fallbackBase = {
        AUXG: 136.26,
        AUXS: 1.74,
        AUXPT: 52.80,
        AUXPD: 46.90,
      };
      setBasePrices(fallbackBase);
      setPrices({
        AUXG: 138.99,
        AUXS: 1.79,
        AUXPT: 54.12,
        AUXPD: 48.07,
      });
      setBidPrices({
        AUXG: 134.90,
        AUXS: 1.71,
        AUXPT: 52.14,
        AUXPD: 46.31,
      });
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
