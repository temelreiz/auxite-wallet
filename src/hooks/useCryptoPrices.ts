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

// Metal fiyatını farklı para birimlerine dönüştür
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

// Para birimini formatla
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
          
          // Direction hesapla
          const newDirections: CryptoDirections = {
            eth: newPrices.eth > prevPricesRef.current.eth ? "up" : 
                 newPrices.eth < prevPricesRef.current.eth ? "down" : "neutral",
            btc: newPrices.btc > prevPricesRef.current.btc ? "up" : 
                 newPrices.btc < prevPricesRef.current.btc ? "down" : "neutral",
            usdt: "neutral",
            try: newPrices.try > prevPricesRef.current.try ? "up" : 
                 newPrices.try < prevPricesRef.current.try ? "down" : "neutral",
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
        }
      } catch (error) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, directions, loading };
}
