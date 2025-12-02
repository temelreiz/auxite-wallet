import { useState, useEffect, useRef } from "react";

interface CryptoPrices {
  eth: number;
  btc: number;
  xrp: number;
  sol: number;
}

interface CryptoChanges {
  eth: number;
  btc: number;
  xrp: number;
  sol: number;
}

interface CryptoDirections {
  eth: "up" | "down" | "neutral";
  btc: "up" | "down" | "neutral";
  xrp: "up" | "down" | "neutral";
  sol: "up" | "down" | "neutral";
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrices>({
    eth: 0,
    btc: 0,
    xrp: 0,
    sol: 0,
  });
  const [changes, setChanges] = useState<CryptoChanges>({
    eth: 0,
    btc: 0,
    xrp: 0,
    sol: 0,
  });
  const [directions, setDirections] = useState<CryptoDirections>({
    eth: "neutral",
    btc: "neutral",
    xrp: "neutral",
    sol: "neutral",
  });
  const [loading, setLoading] = useState(true);
  const prevPrices = useRef<CryptoPrices>({ eth: 0, btc: 0, xrp: 0, sol: 0 });

  const fetchPrices = async () => {
    try {
      const response = await fetch(
        "/api/crypto"
      );
      const data = await response.json();

      const newPrices: CryptoPrices = {
        eth: data.ethereum?.usd || 0,
        btc: data.bitcoin?.usd || 0,
        xrp: data.ripple?.usd || 0,
        sol: data.solana?.usd || 0,
      };

      const newChanges: CryptoChanges = {
        eth: data.ethereum?.usd_24h_change || 0,
        btc: data.bitcoin?.usd_24h_change || 0,
        xrp: data.ripple?.usd_24h_change || 0,
        sol: data.solana?.usd_24h_change || 0,
      };

      // Calculate directions based on price changes
      const newDirections: CryptoDirections = {
        eth: newPrices.eth > prevPrices.current.eth ? "up" : newPrices.eth < prevPrices.current.eth ? "down" : "neutral",
        btc: newPrices.btc > prevPrices.current.btc ? "up" : newPrices.btc < prevPrices.current.btc ? "down" : "neutral",
        xrp: newPrices.xrp > prevPrices.current.xrp ? "up" : newPrices.xrp < prevPrices.current.xrp ? "down" : "neutral",
        sol: newPrices.sol > prevPrices.current.sol ? "up" : newPrices.sol < prevPrices.current.sol ? "down" : "neutral",
      };

      prevPrices.current = newPrices;
      setPrices(newPrices);
      setChanges(newChanges);
      setDirections(newDirections);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
      // Fallback prices
      setPrices({
        eth: 3000,
        btc: 90000,
        xrp: 2.20,
        sol: 235,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // Her 5 saniyede güncelle
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, directions, loading };
}
