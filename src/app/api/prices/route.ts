import { NextResponse } from "next/server";

const DEFAULT_SETTINGS = {
  AUXG: { askAdjust: 2, bidAdjust: -1 },
  AUXS: { askAdjust: 3, bidAdjust: -1.5 },
  AUXPT: { askAdjust: 2.5, bidAdjust: -1.25 },
  AUXPD: { askAdjust: 2.5, bidAdjust: -1.25 },
};

// Son başarılı veriyi cache'le
let lastSuccessfulData: any = null;

export async function GET() {
  try {
    const res = await fetch("https://api.auxite.io/api/prices?chain=84532", {
      cache: "no-cache",
    });

    const json = await res.json();
    
    // API hata döndüyse cache'den dön
    if (!json.ok || !json.data) {
      if (lastSuccessfulData) {
        return NextResponse.json(lastSuccessfulData);
      }
      return NextResponse.json({ error: "API error" }, { status: 500 });
    }
    
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
      
      changes[symbol] = 0;
      directions[symbol] = "neutral";
    }

    const result = {
      prices,
      bidPrices,
      basePrices,
      directions,
      changes,
      timestamp: Date.now(),
      source: "auxite",
      settings: DEFAULT_SETTINGS,
    };
    
    // Başarılı veriyi cache'le
    lastSuccessfulData = result;

    return NextResponse.json(result);
  } catch (error: any) {
    // Hata durumunda cache'den dön
    if (lastSuccessfulData) {
      return NextResponse.json(lastSuccessfulData);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
