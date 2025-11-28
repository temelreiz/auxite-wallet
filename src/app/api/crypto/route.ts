import { NextResponse } from "next/server";

// Cache değişkenleri
let cachedData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 60 saniye cache

const FALLBACK_DATA = {
  ethereum: { usd: 3500, try: 120000, usd_24h_change: 0 },
  bitcoin: { usd: 95000, try: 3200000, usd_24h_change: 0 },
  tether: { try: 34.5 }
};

export async function GET() {
  const now = Date.now();
  
  // Cache geçerliyse cached data döndür
  if (cachedData && (now - lastFetchTime) < CACHE_DURATION) {
    return NextResponse.json(cachedData);
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true",
      { 
        cache: "no-cache",
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      // Rate limit veya hata - cache veya fallback kullan
      if (cachedData) {
        return NextResponse.json(cachedData);
      }
      return NextResponse.json(FALLBACK_DATA);
    }

    const data = await response.json();
    
    // Cache'i güncelle
    cachedData = data;
    lastFetchTime = now;
    
    return NextResponse.json(data);
  } catch (error) {
    // Hata durumunda cache veya fallback
    if (cachedData) {
      return NextResponse.json(cachedData);
    }
    return NextResponse.json(FALLBACK_DATA);
  }
}
