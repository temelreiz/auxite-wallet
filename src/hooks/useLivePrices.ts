// src/hooks/useLivePrices.ts
import { useEffect, useRef, useState } from "react";

export type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

export interface PriceItem {
  symbol: MetalSymbol;
  price: number;
  ts: number;
}

type Status = "connecting" | "connected" | "disconnected";

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "wss://api.auxite.io/ws/prices";

const CHAIN_ID =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");

export function useLivePrices() {
  const [prices, setPrices] = useState<PriceItem[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("connecting");

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      setStatus("connecting");

      const ws = new WebSocket(`${WS_URL}?chain=${CHAIN_ID}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        retryCountRef.current = 0;
        setStatus("connected");
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "prices" && Array.isArray(msg.data)) {
            setPrices(msg.data);
            if (msg.updatedAt) {
              setUpdatedAt(msg.updatedAt);
            } else {
              setUpdatedAt(new Date().toISOString());
            }
          }
        } catch (err) {
          console.error("[useLivePrices] bad WS message", err);
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setStatus("disconnected");

        // Exponential backoff (1s, 2s, 4s, … max 30s)
        const retryMs = Math.min(
          30000,
          1000 * 2 ** retryCountRef.current++
        );

        reconnectRef.current = setTimeout(connect, retryMs);
      };

      ws.onerror = (err) => {
        console.error("[useLivePrices] ws error", err);
        // onclose zaten reconnect’i tetikleyecek
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { prices, updatedAt, status };
}
