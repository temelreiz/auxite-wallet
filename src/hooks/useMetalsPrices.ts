"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export function useMetalsPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [bidPrices, setBidPrices] = useState<Record<string, number>>({});
  const [directions, setDirections] = useState<Record<string, "up" | "down" | "neutral">>({
    AUXG: "neutral",
    AUXS: "neutral",
    AUXPT: "neutral",
    AUXPD: "neutral",
  });
  const [changes, setChanges] = useState<Record<string, number>>({
    AUXG: 0,
    AUXS: 0,
    AUXPT: 0,
    AUXPD: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prevPricesRef = useRef<Record<string, number>>({});
  const prevBidPricesRef = useRef<Record<string, number>>({});

  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch("/api/prices");
      
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      
      const data = await response.json();

      if (data.prices) {
        setPrices(data.prices);
      }
      
      if (data.bidPrices) {
        setBidPrices(data.bidPrices);
      }
      
      if (data.changes) {
        setChanges(data.changes);
      }
      
      if (data.directions) {
        setDirections(data.directions);
      }
      
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      console.error("Error fetching prices:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  return {
    prices,
    bidPrices,
    directions,
    changes,
    loading,
    lastUpdate,
    error,
    refetch: fetchPrices,
  };
}
