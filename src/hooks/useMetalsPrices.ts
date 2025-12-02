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
  const [prices, setPrices] = useState<MetalPrices>({
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  });
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

      const newPrices: MetalPrices = {
        AUXG: data.prices?.AUXG || 0,
        AUXS: data.prices?.AUXS || 0,
        AUXPT: data.prices?.AUXPT || 0,
        AUXPD: data.prices?.AUXPD || 0,
      };

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

      // Calculate directions based on price changes
      const newDirections: MetalDirections = {
        AUXG: newPrices.AUXG > prevPrices.current.AUXG ? "up" : newPrices.AUXG < prevPrices.current.AUXG ? "down" : "neutral",
        AUXS: newPrices.AUXS > prevPrices.current.AUXS ? "up" : newPrices.AUXS < prevPrices.current.AUXS ? "down" : "neutral",
        AUXPT: newPrices.AUXPT > prevPrices.current.AUXPT ? "up" : newPrices.AUXPT < prevPrices.current.AUXPT ? "down" : "neutral",
        AUXPD: newPrices.AUXPD > prevPrices.current.AUXPD ? "up" : newPrices.AUXPD < prevPrices.current.AUXPD ? "down" : "neutral",
      };

      prevPrices.current = newPrices;
      setPrices(newPrices);
      setBidPrices(newBidPrices);
      setChanges(newChanges);
      setDirections(newDirections);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching metal prices:", error);
      // Fallback prices
      setPrices({
        AUXG: 139.31,
        AUXS: 1.79,
        AUXPT: 54.14,
        AUXPD: 48.16,
      });
      setBidPrices({
        AUXG: 138.50,
        AUXS: 1.75,
        AUXPT: 53.50,
        AUXPD: 47.50,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 3000); // Her 3 saniyede güncelle
    return () => clearInterval(interval);
  }, []);

  return { prices, bidPrices, changes, directions, loading };
}
