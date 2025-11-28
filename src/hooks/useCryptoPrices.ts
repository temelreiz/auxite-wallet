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
  const useWebSocketRef = useRef(true);

  useEffect(() => {
    let mounted = true;

    // API'den fiyat çek (fallback ve TRY için)
    const fetchFromAPI = async () => {
      try {
        const res = await fetch("/api/crypto");
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            const newPrices = {
              eth: data.ethereum?.usd || prices.eth,
              btc: data.bitcoin?.usd || prices.btc,
              usdt: 1,
              try: data.tether?.try || 34.50,
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
            
            // 24h change'leri al
            if (data.ethereum?.usd_24h_change !== undefined) {
              setChanges({
                eth: data.ethereum.usd_24h_change,
                btc: data.bitcoin?.usd_24h_change || 0,
                usdt: 0,
                try: 0,
              });
            }
            
            setLoading(false);
          }
        }
      } catch (e) {
        console.log("API fetch failed");
      }
    };

    // Coinbase WebSocket
    const connectWebSocket = () => {
      if (!useWebSocketRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
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
            
            if (data.type === "ticker" && data.price) {
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
                setDirections(prevDir => ({
                  ...prevDir,
                  eth: productId === "ETH-USD" 
                    ? (price > prevPricesRef.current.eth ? "up" : price < prevPricesRef.current.eth ? "down" : "neutral")
                    : prevDir.eth,
                  btc: productId === "BTC-USD"
                    ? (price > prevPricesRef.current.btc ? "up" : price < prevPricesRef.current.btc ? "down" : "neutral")
                    : prevDir.btc,
                }));
                
                prevPricesRef.current = newPrices;
                return newPrices;
              });
              
              setLoading(false);
            }
          } catch (e) {}
        };

        ws.onerror = (error) => {
          console.log("WebSocket error:", error);
        };

        ws.onclose = (event) => {
          console.log("WebSocket closed, code:", event.code, "reason:", event.reason);
          wsRef.current = null;
          
          // Reconnect sadece normal close değilse
          if (mounted && useWebSocketRef.current && event.code !== 1000) {
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
          }
        };
      } catch (e) {
        console.log("WebSocket creation failed:", e);
        useWebSocketRef.current = false;
      }
    };

    // Başlat
    fetchFromAPI();
    connectWebSocket();
    
    // API polling (WebSocket fallback + TRY güncellemesi)
    const apiInterval = setInterval(fetchFromAPI, 3000);

    return () => {
      mounted = false;
      useWebSocketRef.current = false;
      if (wsRef.current) {
        wsRef.current.close(1000);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      clearInterval(apiInterval);
    };
  }, []);

  return { prices, changes, directions, loading };
}