import { NextResponse } from "next/server";

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

export async function GET() {
  try {
    const res = await fetch("https://api.auxite.io/api/prices?chain=84532", {
      cache: "no-cache",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "API error" }, { status: 500 });
    }

    const json = await res.json();
    
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};
    const basePrices: Record<string, number> = {};
    const directions: Record<string, string> = {};
    const changes: Record<string, number> = {};

    for (const item of json.data) {
      const symbol = item.symbol;
      const basePricePerGram = item.price / 31.1035;
      
      const settings = DEFAULT_SETTINGS[symbol as keyof typeof DEFAULT_SETTINGS] || { askAdjust: 2, bidAdjust: -1 };
      
      const askPrice = basePricePerGram * (1 + settings.askAdjust / 100);
      const bidPrice = basePricePerGram * (1 + settings.bidAdjust / 100);
      
      basePrices[symbol] = Math.round(basePricePerGram * 100) / 100;
      prices[symbol] = Math.round(askPrice * 100) / 100;
      bidPrices[symbol] = Math.round(bidPrice * 100) / 100;
      
      // Değişim ve yön şimdilik sıfır - client-side'da hesaplanıyor
      changes[symbol] = 0;
      directions[symbol] = "neutral";
    }

    return NextResponse.json({
      prices,
      bidPrices,
      basePrices,
      directions,
      changes,
      timestamp: Date.now(),
      source: "auxite",
      settings: DEFAULT_SETTINGS,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
