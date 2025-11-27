import { NextResponse } from "next/server";

export async function GET() {
  console.log("=== API PRICES CALLED ===");
  
  try {
    console.log("Fetching from auxite.io...");
    
    const res = await fetch("https://api.auxite.io/api/prices?chain=84532", {
      cache: "no-cache",
    });

    console.log("Response status:", res.status);

    if (!res.ok) {
      console.log("API not ok");
      return NextResponse.json({ error: "API error" }, { status: 500 });
    }

    const json = await res.json();
    console.log("Data received:", json.data?.length, "items");
    
    const prices: Record<string, number> = {};
    const bidPrices: Record<string, number> = {};
    const directions: Record<string, string> = {};
    const changes: Record<string, number> = {};

    for (const item of json.data) {
      const pricePerGram = item.price / 31.1035;
      prices[item.symbol] = Math.round(pricePerGram * 100) / 100;
      bidPrices[item.symbol] = Math.round(pricePerGram * 0.99 * 100) / 100;
      directions[item.symbol] = "neutral";
      changes[item.symbol] = 0;
    }

    console.log("Returning prices:", Object.keys(prices));
    
    return NextResponse.json({
      prices,
      bidPrices,
      directions,
      changes,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.log("=== ERROR ===", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
