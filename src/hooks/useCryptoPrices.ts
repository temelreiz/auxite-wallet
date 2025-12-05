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

const COINCAP_API = "https://api.coincap.io/v2/assets";

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

  const fetchPrices = async () => {
    try {
      // Direkt CoinCap API'ye istek at (client-side)
      const response = await fetch(
        `${COINCAP_API}?ids=bitcoin,ethereum,xrp,solana`
      );
      
      if (!response.ok) throw new Error("API error");
      
      const { data } = await response.json();

      const newPrices: CryptoPrices = { eth: 0, btc: 0, xrp: 0, sol: 0 };
      const newChanges: CryptoChanges = { eth: 0, btc: 0, xrp: 0, sol: 0 };

      for (const coin of data) {
        const usd = parseFloat(coin.priceUsd) || 0;
        const change = parseFloat(coin.changePercent24Hr) || 0;
        
        if (coin.id === "bitcoin") { newPrices.btc = usd; newChanges.btc = change; }
        if (coin.id === "ethereum") { newPrices.eth = usd; newChanges.eth = change; }
        if (coin.id === "xrp") { newPrices.xrp = usd; newChanges.xrp = change; }
        if (coin.id === "solana") { newPrices.sol = usd; newChanges.sol = change; }
      }

      const newDirections: CryptoDirections = {
        eth: newChanges.eth > 0 ? "up" : newChanges.eth < 0 ? "down" : "neutral",
        btc: newChanges.btc > 0 ? "up" : newChanges.btc < 0 ? "down" : "neutral",
        xrp: newChanges.xrp > 0 ? "up" : newChanges.xrp < 0 ? "down" : "neutral",
        sol: newChanges.sol > 0 ? "up" : newChanges.sol < 0 ? "down" : "neutral",
      };

      setPrices(newPrices);
      setChanges(newChanges);
      setDirections(newDirections);
      setLoading(false);
    } catch (error) {
      console.error("CoinCap error:", error);
      // Fallback
      setPrices({ eth: 3100, btc: 92000, xrp: 2.10, sol: 140 });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000); // 5 saniye
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, directions, loading };
}