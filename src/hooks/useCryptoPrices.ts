"use client";
import { useState, useEffect, useRef } from "react";

export interface CryptoPrices {
  eth: number;
  btc: number;
  usdt: number;
  try: number;
}

export interface CryptoChanges {
  eth: number;
  btc: number;
  usdt: number;
  try: number;
}

export interface CryptoDirections {
  eth: "up" | "down" | "neutral";
  btc: "up" | "down" | "neutral";
  usdt: "up" | "down" | "neutral";
  try: "up" | "down" | "neutral";
}

export function convertMetalPrice(priceUSD: number, cryptoPrices: CryptoPrices, toCurrency: string): number {
  switch (toCurrency.toUpperCase()) {
    case "TRY":
      return priceUSD * cryptoPrices.try;
    case "ETH":
      return cryptoPrices.eth > 0 ? priceUSD / cryptoPrices.eth : 0;
    case "BTC":
      return cryptoPrices.btc > 0 ? priceUSD / cryptoPrices.btc : 0;
    case "USDT":
    case "USD":
    default:
      return priceUSD;
  }
}

export function formatCurrencyPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    USDT: "$",
    TRY: "₺",
    EUR: "€",
    ETH: "Ξ",
    BTC: "₿",
  };
  const symbol = symbols[currency.toUpperCase()] || "$";
  
  if (currency === "ETH" || currency === "BTC") {
    return `${symbol}${price.toFixed(6)}`;
  }
  
  return `${symbol}${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrices>({
    eth: 0,
    btc: 0,
    usdt: 1,
    try: 34.50,
  });
  const [changes, setChanges] = useState<CryptoChanges>({
    eth: 0,
    btc: 0,
    usdt: 0,
    try: 0,
  });
  const [directions, setDirections] = useState<CryptoDirections>({
    eth: "neutral",
    btc: "neutral",
    usdt: "neutral",
    try: "neutral",
  });
  const [loading, setLoading] = useState(true);
  
  const prevPricesRef = useRef<CryptoPrices>({ eth: 0, btc: 0, usdt: 1, try: 34.50 });

  useEffect(() => {
    let mounted = true;

    const fetchPrices = async () => {
      try {
        const res = await fetch("/api/crypto", { cache: 'no-store' });
        if (!res.ok || !mounted) return;
        
        const data = await res.json();
        
        const newPrices: CryptoPrices = {
          eth: data.ethereum?.usd || prevPricesRef.current.eth,
          btc: data.bitcoin?.usd || prevPricesRef.current.btc,
          usdt: 1,
          try: data.tether?.try || 34.50,
        };

        // Direction hesapla
        const newDirections: CryptoDirections = {
          eth: newPrices.eth > prevPricesRef.current.eth ? "up" : 
               newPrices.eth < prevPricesRef.current.eth ? "down" : directions.eth,
          btc: newPrices.btc > prevPricesRef.current.btc ? "up" : 
               newPrices.btc < prevPricesRef.current.btc ? "down" : directions.btc,
          usdt: "neutral",
          try: "neutral",
        };

        setPrices(newPrices);
        setDirections(newDirections);
        prevPricesRef.current = newPrices;
        
        setChanges({
          eth: data.ethereum?.usd_24h_change || 0,
          btc: data.bitcoin?.usd_24h_change || 0,
          usdt: 0,
          try: 0,
        });
        
        setLoading(false);
      } catch (e) {
        // Silent fail
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { prices, changes, directions, loading };
}
