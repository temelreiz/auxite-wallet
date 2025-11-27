import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,tether&vs_currencies=usd,try&include_24hr_change=true",
      { 
        cache: "no-cache",
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      // Fallback değerler
      return NextResponse.json({
        ethereum: { usd: 3500, try: 120000, usd_24h_change: 0 },
        bitcoin: { usd: 95000, try: 3200000, usd_24h_change: 0 },
        tether: { try: 34.5 }
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Fallback
    return NextResponse.json({
      ethereum: { usd: 3500, try: 120000, usd_24h_change: 0 },
      bitcoin: { usd: 95000, try: 3200000, usd_24h_change: 0 },
      tether: { try: 34.5 }
    });
  }
}