"use client";
import { useState, useEffect, useCallback, useRef } from "react";

export function useMetalsPrices() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [bidPrices, setBidPrices] = useState<Record<string, number>>({});
  const [directions, setDirections] = useState<Record<string, "up" | "down" | "neutral">>({
    AUXG: "up",
    AUXS: "down",
    AUXPT: "up",
    AUXPD: "down",
  });
  const [changes, setChanges] = useState<Record<string, number>>({
    AUXG: 1.05,
    AUXS: -0.75,
    AUXPT: 0.82,
    AUXPD: -0.45,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep track of previous values to avoid unnecessary updates
  const prevPricesRef = useRef<Record<string, number>>({});
  const prevBidPricesRef = useRef<Record<string, number>>({});
  const prevChangesRef = useRef<Record<string, number>>({
    AUXG: 1.05,
    AUXS: -0.75,
    AUXPT: 0.82,
    AUXPD: -0.45,
  });
  const prevDirectionsRef = useRef<Record<string, "up" | "down" | "neutral">>({
    AUXG: "up",
    AUXS: "down",
    AUXPT: "up",
    AUXPD: "down",
  });

  // Helper function to check if objects are deeply equal
  const areObjectsEqual = (obj1: Record<string, any>, obj2: Record<string, any>): boolean => {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) return false;
    }
    
    return true;
  };

  // Fetch prices from API route
  const fetchPrices = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch("/api/prices?type=live", {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Only update if values have actually changed
      if (data.prices && !areObjectsEqual(data.prices, prevPricesRef.current)) {
        setPrices(data.prices);
        prevPricesRef.current = data.prices;
      }

      if (data.bidPrices && !areObjectsEqual(data.bidPrices, prevBidPricesRef.current)) {
        setBidPrices(data.bidPrices);
        prevBidPricesRef.current = data.bidPrices;
      }

      if (data.changes && !areObjectsEqual(data.changes, prevChangesRef.current)) {
        setChanges(data.changes);
        prevChangesRef.current = data.changes;
      }

      if (data.directions && !areObjectsEqual(data.directions, prevDirectionsRef.current)) {
        setDirections(data.directions as Record<string, "up" | "down" | "neutral">);
        prevDirectionsRef.current = data.directions;
      }
      
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      // Don't show error for abort
      if (err.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }
      
      console.error("Error fetching prices:", err);
      setError(err.message);
      // Keep last known prices on error
    } finally {
      setLoading(false);
    }
  }, [prices, bidPrices]); // Add dependencies

  // Initial fetch and periodic updates
  useEffect(() => {
    fetchPrices();
    
    // Update every 5 seconds
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