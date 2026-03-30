// ============================================
// ABAXX EXCHANGE — WebSocket Client
// Fetches Gold Singapore Futures (GKS) prices
// Serverless-friendly: connect → fetch → cache → close
// ============================================

import { Redis } from "@upstash/redis";
import WebSocket from "ws";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ABAXX_WS_URL =
  "wss://cws-gateway.abaxx.exchange/socket.io/?EIO=4&transport=websocket";

// GKS = Gold Kilobar Singapore
// Month codes: F=Jan G=Feb H=Mar J=Apr K=May M=Jun N=Jul Q=Aug U=Sep V=Oct X=Nov Z=Dec
const MONTH_CODES: Record<string, number> = {
  F: 1, G: 2, H: 3, J: 4, K: 5, M: 6,
  N: 7, Q: 8, U: 9, V: 10, X: 11, Z: 12,
};

// Active contracts to subscribe — updated as contracts roll
const ACTIVE_SYMBOLS = ["GKSJ26", "GKSK26", "GKSM26", "GKSN26", "GKSQ26", "GKSU26"];

// Redis keys
const REDIS_KEY_PREFIX = "abaxx:futures:";
const REDIS_KEY_LAST_SYNC = "abaxx:lastSync";
const REDIS_TTL = 600; // 10 minutes

export interface AbaxxFuturesData {
  symbol: string;
  bidPrice: number | null;
  askPrice: number | null;
  lastPrice: number | null;
  midPrice: number | null;
  settlementPrice: number | null;
  closingPrice: number | null;
  status: string;
  timestamp: number;
  expiryDate: string; // ISO date
  daysToExpiry: number;
}

/**
 * Parse symbol to extract expiry date
 * GKSJ26 → April 2026 (last business day)
 */
function parseSymbolExpiry(symbol: string): Date {
  const monthCode = symbol.charAt(3);
  const yearSuffix = parseInt(symbol.slice(4), 10);
  const month = MONTH_CODES[monthCode];
  const year = 2000 + yearSuffix;

  // Last business day of the month (approximate: last day)
  const lastDay = new Date(year, month, 0); // day 0 of next month = last day of this month
  // Adjust for weekends
  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return lastDay;
}

/**
 * Calculate days to expiry from now
 */
function daysToExpiry(expiryDate: Date): number {
  const now = new Date();
  const diff = expiryDate.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Connect to Abaxx WebSocket, fetch prices, cache to Redis, then close.
 * Designed for serverless: short-lived connection.
 */
export async function fetchAbaxxPrices(): Promise<AbaxxFuturesData[]> {
  return new Promise((resolve, reject) => {
    const results: Map<string, AbaxxFuturesData> = new Map();
    const timeout = setTimeout(() => {
      ws.close();
      resolve(Array.from(results.values()));
    }, 12000); // 12s max

    const ws = new WebSocket(ABAXX_WS_URL);
    let subscribed = false;

    ws.on("open", () => {
      console.log("[Abaxx] Connected");
    });

    ws.on("message", (data: Buffer) => {
      const msg = data.toString();

      // Step 1: Server handshake → send protocol ack
      if (msg.startsWith("0{")) {
        ws.send("40");
        return;
      }

      // Step 2: Connection ack → subscribe to symbols
      if (msg.startsWith("40") && !subscribed) {
        subscribed = true;
        for (const symbol of ACTIVE_SYMBOLS) {
          ws.send(`42["subscribe",{"symbol":"${symbol}"}]`);
        }
        console.log("[Abaxx] Subscribed to", ACTIVE_SYMBOLS.length, "symbols");
        return;
      }

      // Step 3: Parse market data messages
      if (msg.startsWith("42")) {
        try {
          const payload = JSON.parse(msg.slice(2));
          if (payload[0] === "message" && payload[1]?.d) {
            const d = payload[1].d;
            if (d.errorCode) return; // Skip error responses

            const expiry = parseSymbolExpiry(d.symbol);
            const dte = daysToExpiry(expiry);
            const bid = d.bidPrice || null;
            const ask = d.askPrice || null;
            const mid = bid && ask ? (bid + ask) / 2 : null;

            results.set(d.symbol, {
              symbol: d.symbol,
              bidPrice: bid,
              askPrice: ask,
              lastPrice: d.lastPrice || null,
              midPrice: mid,
              settlementPrice: d.settlementPrice || null,
              closingPrice: d.closingPrice || null,
              status: d.status || "Unknown",
              timestamp: d.timeStamp || Date.now(),
              expiryDate: expiry.toISOString().split("T")[0],
              daysToExpiry: dte,
            });
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Ping handling
      if (msg === "2") {
        ws.send("3");
      }

      // Close after receiving data for all symbols
      if (results.size >= ACTIVE_SYMBOLS.length) {
        clearTimeout(timeout);
        ws.close();
        resolve(Array.from(results.values()));
      }
    });

    ws.on("error", (err) => {
      console.error("[Abaxx] WebSocket error:", err.message);
      clearTimeout(timeout);
      resolve(Array.from(results.values())); // Return whatever we got
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      resolve(Array.from(results.values()));
    });
  });
}

/**
 * Fetch prices and cache to Redis
 */
export async function syncAbaxxPrices(): Promise<AbaxxFuturesData[]> {
  const prices = await fetchAbaxxPrices();

  if (prices.length === 0) {
    console.warn("[Abaxx] No prices received");
    return [];
  }

  // Cache each symbol individually
  const pipeline: Promise<any>[] = [];
  for (const p of prices) {
    pipeline.push(
      redis.set(`${REDIS_KEY_PREFIX}${p.symbol}`, JSON.stringify(p), { ex: REDIS_TTL })
    );
  }

  // Cache all prices together
  pipeline.push(
    redis.set(REDIS_KEY_LAST_SYNC, JSON.stringify({
      prices,
      syncedAt: new Date().toISOString(),
    }), { ex: REDIS_TTL })
  );

  await Promise.all(pipeline);
  console.log(`[Abaxx] Cached ${prices.length} futures prices`);

  return prices;
}

/**
 * Get cached futures price from Redis
 */
export async function getCachedFuturesPrice(symbol: string): Promise<AbaxxFuturesData | null> {
  const cached = await redis.get(`${REDIS_KEY_PREFIX}${symbol}`);
  if (!cached) return null;
  return typeof cached === "string" ? JSON.parse(cached) : cached as AbaxxFuturesData;
}

/**
 * Get all cached futures prices
 */
export async function getAllCachedFutures(): Promise<AbaxxFuturesData[]> {
  const cached = await redis.get(REDIS_KEY_LAST_SYNC);
  if (!cached) return [];
  const data = typeof cached === "string" ? JSON.parse(cached) : cached;
  return data?.prices || [];
}
