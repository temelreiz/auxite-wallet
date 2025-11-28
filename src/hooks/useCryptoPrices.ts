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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    // TRY kurunu API'den al
    const fetchTryRate = async () => {
      try {
        const res = await fetch("/api/crypto");
        if (res.ok) {
          const data = await res.json();
          if (data.tether?.try && mounted) {
            setPrices(prev => ({ ...prev, try: data.tether.try }));
            
            // 24h change'leri de al
            if (data.ethereum?.usd_24h_change !== undefined) {
              setChanges(prev => ({
                ...prev,
                eth: data.ethereum.usd_24h_change,
                btc: data.bitcoin?.usd_24h_change || 0,
              }));
            }
          }
        }
      } catch (e) {}
    };

    // Coinbase WebSocket - gerçek zamanlı fiyatlar
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket("wss://ws-feed.exchange.coinbase.com");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Coinbase WebSocket connected");
        ws.send(JSON.stringify({
          type: "subscribe",
          product_ids: ["ETH-USD", "BTC-USD"],
          channels: ["ticker"]
        }));
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "ticker") {
            const price = parseFloat(data.price);
            const productId = data.product_id;
            
            setPrices(prev => {
              const newPrices = { ...prev };
              
              if (productId === "ETH-USD") {
                newPrices.eth = price;
              } else if (productId === "BTC-USD") {
                newPrices.btc = price;
              }
              
              // Direction hesapla
              const newDirections: CryptoDirections = { ...directions };
              
              if (productId === "ETH-USD") {
                newDirections.eth = price > prevPricesRef.current.eth ? "up" : 
                                    price < prevPricesRef.current.eth ? "down" : "neutral";
              } else if (productId === "BTC-USD") {
                newDirections.btc = price > prevPricesRef.current.btc ? "up" : 
                                    price < prevPricesRef.current.btc ? "down" : "neutral";
              }
              
              setDirections(newDirections);
              prevPricesRef.current = newPrices;
              
              return newPrices;
            });
            
            setLoading(false);
          }
        } catch (e) {}
      };

      ws.onerror = (error) => {
        console.log("WebSocket error, will reconnect...");
      };

      ws.onclose = () => {
        console.log("WebSocket closed, reconnecting in 3s...");
        if (mounted) {
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
        }
      };
    };

    // Başlat
    fetchTryRate();
    connectWebSocket();
    
    // TRY kurunu periyodik güncelle (her 30 saniye)
    const tryInterval = setInterval(fetchTryRate, 30000);

    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(tryInterval);
    };
  }, []);

  return { prices, changes, directions, loading };
}
