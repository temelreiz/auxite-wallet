import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const API_BASE = "https://api.auxite.io/api/prices";
const SETTINGS_FILE = join(process.cwd(), "price-settings.json");

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

function getSettings() {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const data = readFileSync(SETTINGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      
      // Format kontrolü ve dönüşümü
      const converted: any = {};
      for (const symbol of ["AUXG", "AUXS", "AUXPT", "AUXPD"]) {
        if (parsed[symbol]) {
          // Yeni format (askAdjust/bidAdjust) varsa kullan
          if (typeof parsed[symbol].askAdjust === "number") {
            converted[symbol] = {
              askAdjust: parsed[symbol].askAdjust,
              bidAdjust: parsed[symbol].bidAdjust,
            };
          }
          // Eski format (buySpread/sellSpread) varsa dönüştür
          else if (typeof parsed[symbol].buySpread === "number") {
            converted[symbol] = {
              askAdjust: parsed[symbol].buySpread,
              bidAdjust: -parsed[symbol].sellSpread, // Negatife çevir
            };
          }
          else {
            converted[symbol] = DEFAULT_SETTINGS[symbol as keyof typeof DEFAULT_SETTINGS];
          }
        } else {
          converted[symbol] = DEFAULT_SETTINGS[symbol as keyof typeof DEFAULT_SETTINGS];
        }
      }
      return converted;
    }
  } catch (e) {
    console.error("Error reading settings:", e);
  }
  return DEFAULT_SETTINGS;
}

let previousPrices: Record<string, number> = {};
let lastPriceUpdate = 0;
const RESET_INTERVAL = 3600000;

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${API_BASE}?chain=84532`, {
      cache: "no-cache",
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `API returned ${res.status}` },
        { status: res.status }
      );
    }

    const json = await res.json();
    
    if (!json.data || json.data.length === 0) {
      return NextResponse.json(
        { error: "No data from API" },
        { status: 500 }
      );
    }

    const settings = getSettings();
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};
    const basePrices: Record<string, number> = {};
    const directions: Record<string, "up" | "down" | "neutral"> = {};
    const changes: Record<string, number> = {};
    const now = Date.now();

    const shouldReset = Object.keys(previousPrices).length === 0 || 
                        (now - lastPriceUpdate > RESET_INTERVAL);

    if (shouldReset) {
      console.log('🔄 Resetting price baseline');
      for (const item of json.data) {
        const symbol = item.symbol;
        const pricePerGram = item.price / 31.1035;
        previousPrices[symbol] = pricePerGram;
      }
      lastPriceUpdate = now;
    }

    for (const item of json.data) {
      const symbol = item.symbol;
      const basePricePerGram = item.price / 31.1035;
      
      const metalSettings = settings[symbol] || DEFAULT_SETTINGS[symbol as keyof typeof DEFAULT_SETTINGS] || { askAdjust: 2, bidAdjust: -1 };
      
      // Satış fiyatı (kullanıcı satın alırken) = Baz × (1 + askAdjust%)
      const askPrice = basePricePerGram * (1 + metalSettings.askAdjust / 100);
      
      // Alış fiyatı (kullanıcı satarken) = Baz × (1 + bidAdjust%)
      // bidAdjust negatif olacağı için fiyat düşer
      const bidPrice = basePricePerGram * (1 + metalSettings.bidAdjust / 100);
      
      basePrices[symbol] = Math.round(basePricePerGram * 100) / 100;
      prices[symbol] = Math.round(askPrice * 100) / 100;
      bidPrices[symbol] = Math.round(bidPrice * 100) / 100;
      
      const baselinePrice = previousPrices[symbol] || basePricePerGram;
      const percentChange = ((basePricePerGram - baselinePrice) / baselinePrice) * 100;
      changes[symbol] = Math.round(percentChange * 100) / 100;
      
      if (percentChange > 0.05) {
        directions[symbol] = "up";
      } else if (percentChange < -0.05) {
        directions[symbol] = "down";
      } else {
        directions[symbol] = "neutral";
      }
    }

    return NextResponse.json({
      prices,
      bidPrices,
      basePrices,
      directions,
      changes,
      timestamp: now,
      source: "auxite",
      settings,
      baselineAge: Math.round((now - lastPriceUpdate) / 60000),
    });
  } catch (error: any) {
    console.error("Price API error:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to fetch prices" },
      { status: 500 }
    );
  }
}