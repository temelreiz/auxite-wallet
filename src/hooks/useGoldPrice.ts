// src/hooks/useGoldPrice.ts
"use client";

import { useEffect, useState } from "react";

export type PriceDirection = "up" | "down" | "flat";

export type GoldPrice = {
  price: number | null;
  currency: string;
  timestamp: number;
};

export function useGoldPrice(pollMs: number = 5000) {
  const [data, setData] = useState<GoldPrice | null>(null);
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<PriceDirection>("flat");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/gold", { cache: "no-store" });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch gold price");
      }

      const json = await res.json();
      const price = typeof json.price === "number" ? json.price : null;

      setData({
        price,
        currency: json.currency || "USD",
        timestamp: json.timestamp || Date.now() / 1000,
      });

      if (price != null && previousPrice != null) {
        if (price > previousPrice) setDirection("up");
        else if (price < previousPrice) setDirection("down");
        else setDirection("flat");
      }

      if (price != null) {
        setPreviousPrice(price);
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // İlk fetch
    fetchPrice();

    // Periyodik poll
    const id = setInterval(fetchPrice, pollMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  return {
    data,
    direction,
    loading,
    error,
    refetch: fetchPrice,
  };
}
