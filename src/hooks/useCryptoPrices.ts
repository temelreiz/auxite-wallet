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
  const [prices, setPrices] = useState<CryptoPrices>({ eth: 0, btc: 0, xrp: 0, sol: 0 });
  const [changes, setChanges] = useState<CryptoChanges>({ eth: 0, btc: 0, xrp: 0, sol: 0 });
  const [directions, setDirections] = useState<CryptoDirections>({
    eth: "neutral", btc: "neutral", xrp: "neutral", sol: "neutral",
  });
  const [loading, setLoading] = useState(true);
  const prevPrices = useRef<CryptoPrices>({ eth: 0, btc: 0, xrp: 0, sol: 0 });

  const fetchPrices = async () => {
    try {
      const response = await fetch("/api/crypto");
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

      // Anlık fiyat değişimine göre direction belirle
      const getDirection = (current: number, prev: number): "up" | "down" | "neutral" => {
        if (prev === 0) return "neutral"; // İlk yüklemede neutral
        const diff = current - prev;
        if (diff > 0.01) return "up";
        if (diff < -0.01) return "down";
        return "neutral";
      };

      const newDirections: CryptoDirections = {
        eth: getDirection(newPrices.eth, prevPrices.current.eth),
        btc: getDirection(newPrices.btc, prevPrices.current.btc),
        xrp: getDirection(newPrices.xrp, prevPrices.current.xrp),
        sol: getDirection(newPrices.sol, prevPrices.current.sol),
      };

      prevPrices.current = newPrices;
      setPrices(newPrices);
      setChanges(newChanges);
      setDirections(newDirections);
      setLoading(false);
    } catch (error) {
      setPrices({ eth: 3100, btc: 92000, xrp: 2.10, sol: 140 });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 3000); // 3 saniye
    return () => clearInterval(interval);
  }, []);

  return { prices, changes, directions, loading };
}
