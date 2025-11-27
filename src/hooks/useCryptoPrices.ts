"use client";

import { useState, useEffect } from "react";

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

// Convert USD price to other currencies
export function convertMetalPrice(
  usdPrice: number,
  cryptoPrices: CryptoPrices,
  currency: string
): number {
  switch (currency) {
    case "ETH":
      return cryptoPrices.eth > 0 ? usdPrice / cryptoPrices.eth : 0;
    case "BTC":
      return cryptoPrices.btc > 0 ? usdPrice / cryptoPrices.btc : 0;
    case "TRY":
      return usdPrice * cryptoPrices.try;
    case "USDT":
    default:
      return usdPrice;
  }
}

// Format price based on currency
export function formatCurrencyPrice(
  price: number,
  currency: string
): string {
  switch (currency) {
    case "ETH":
      return price.toFixed(6) + " ETH";
    case "BTC":
      return price.toFixed(8) + " BTC";
    case "TRY":
      return "₺" + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "USDT":
    default:
      return "$" + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
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

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // Fetch from CoinGecko API (free, no API key needed)
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true"
        );
        
        if (response.ok) {
          const data = await response.json();
          
          setPrices({
            eth: data.ethereum?.usd || 0,
            btc: data.bitcoin?.usd || 0,
            usdt: 1,
            try: data.tether?.try || 34.50,
          });
          
          setChanges({
            eth: data.ethereum?.usd_24h_change || 0,
            btc: data.bitcoin?.usd_24h_change || 0,
            usdt: 0,
            try: 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error);
        // Fallback değerler
        setPrices({
          eth: 3500,
          btc: 95000,
          usdt: 1,
          try: 34.50,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    
    // Her 30 saniyede güncelle
    const interval = setInterval(fetchPrices, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, loading };
}