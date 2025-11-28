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

// Metal fiyatını farklı para birimlerine dönüştür
export function convertMetalPrice(priceUSD: number, toCurrency: string, tryRate: number): number {
  switch (toCurrency.toUpperCase()) {
    case "TRY":
      return priceUSD * tryRate;
    case "EUR":
      return priceUSD * 0.92; // Yaklaşık EUR/USD
    case "USD":
    default:
      return priceUSD;
  }
}

// Para birimini formatla
export function formatCurrencyPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    TRY: "₺",
    EUR: "€",
  };
  const symbol = symbols[currency.toUpperCase()] || "$";
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
  const [loading, setLoading] = useState(true);
  
  // Önceki fiyatları sakla
  const prevPricesRef = useRef<CryptoPrices>({ eth: 0, btc: 0, usdt: 1, try: 34.50 });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch("/api/crypto");
        
        if (response.ok) {
          const data = await response.json();
          
          const newPrices = {
            eth: data.ethereum?.usd || prevPricesRef.current.eth,
            btc: data.bitcoin?.usd || prevPricesRef.current.btc,
            usdt: 1,
            try: data.tether?.try || prevPricesRef.current.try,
          };
          
          setPrices(newPrices);
          prevPricesRef.current = newPrices;
          
          setChanges({
            eth: data.ethereum?.usd_24h_change || 0,
            btc: data.bitcoin?.usd_24h_change || 0,
            usdt: 0,
            try: 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // 30 saniye
    
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, loading };
}
