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
      
      const converted: any = {};
      for (const symbol of ["AUXG", "AUXS", "AUXPT", "AUXPD"]) {
        if (parsed[symbol]) {
          if (typeof parsed[symbol].askAdjust === "number") {
            converted[symbol] = {
              askAdjust: parsed[symbol].askAdjust,
              bidAdjust: parsed[symbol].bidAdjust,
            };
          } else if (typeof parsed[symbol].buySpread === "number") {
            converted[symbol] = {
              askAdjust: parsed[symbol].buySpread,
              bidAdjust: -parsed[symbol].sellSpread,
            };
          } else {
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

// Sabit seed ile tutarlı veri üret
function seededRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "AUXG";
  const period = searchParams.get("period") || "1h";

  // Spread ayarlarını al
  const settings = getSettings();
  const metalSettings = settings[symbol] || DEFAULT_SETTINGS[symbol as keyof typeof DEFAULT_SETTINGS];

  // Gerçek fiyatı al
  let basePrice = 135;
  try {
    const res = await fetch(`${API_BASE}?chain=84532`, { cache: "no-cache" });
    const json = await res.json();
    const item = json.data?.find((d: any) => d.symbol === symbol);
    if (item) {
      basePrice = item.price / 31.1035;
    }
  } catch (e) {
    console.error("Price fetch error:", e);
  }

  // Spread uygula (askAdjust - satış fiyatı)
  const currentPrice = basePrice * (1 + metalSettings.askAdjust / 100);

  const data = [];
  const now = Date.now();
  
  // Period'a göre mum sayısı ve aralık
  let candleCount = 50;
  let interval = 300000;
  
  switch (period) {
    case "15m":
      candleCount = 15;
      interval = 60000;
      break;
    case "1h":
      candleCount = 30;
      interval = 120000;
      break;
    case "4h":
      candleCount = 48;
      interval = 300000;
      break;
    case "1d":
      candleCount = 48;
      interval = 1800000;
      break;
    case "1w":
      candleCount = 56;
      interval = 10800000;
      break;
  }

  // Günün başlangıcını seed olarak kullan
  const daySeed = Math.floor(now / 86400000);
  const symbolSeed = symbol.charCodeAt(0) + symbol.charCodeAt(3);
  
  // Son fiyattan geriye doğru git
  let price = currentPrice;
  const prices = [price];
  
  // Geriye doğru fiyat oluştur (düşük volatilite: %0.3)
  for (let i = 1; i <= candleCount; i++) {
    const seed = daySeed + symbolSeed + i;
    const change = (seededRandom(seed) - 0.5) * currentPrice * 0.003;
    price = price - change;
    prices.unshift(price);
  }

  // Candlestick verisi oluştur
  for (let i = 0; i < candleCount; i++) {
    const open = prices[i];
    const close = prices[i + 1];
    const seed = daySeed + symbolSeed + i * 100;
    
    const range = Math.abs(close - open) + currentPrice * 0.001;
    const high = Math.max(open, close) + seededRandom(seed + 1) * range;
    const low = Math.min(open, close) - seededRandom(seed + 2) * range;
    
    data.push({
      time: now - (candleCount - i) * interval,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.round(seededRandom(seed + 3) * 30000 + 10000),
    });
  }

  return NextResponse.json({ 
    symbol, 
    period, 
    data, 
    timestamp: now,
    currentPrice: Math.round(currentPrice * 100) / 100,
    basePrice: Math.round(basePrice * 100) / 100,
    spread: metalSettings.askAdjust
  });
}