import { NextRequest, NextResponse } from "next/server";

const GOLD_API_KEY = "goldapi-58n6619mh0smwpz-io";
const GOLD_API_BASE = "https://www.goldapi.io/api";

// Get date string in YYYYMMDD format
function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '7');
  const metal = searchParams.get('metal') || 'XAU'; // XAU, XAG, XPT, XPD
  
  try {
    const historicalData = [];
    
    // Fetch data for each day (skip today, start from yesterday)
    for (let i = 1; i <= days; i++) {
      const dateStr = getDateString(i);
      
      try {
        const res = await fetch(`${GOLD_API_BASE}/${metal}/USD/${dateStr}`, {
          headers: {
            'x-access-token': GOLD_API_KEY,
            'Content-Type': 'application/json',
          },
          cache: 'no-cache',
        });
        
        if (res.ok) {
          const data = await res.json();
          historicalData.push({
            date: dateStr,
            timestamp: data.timestamp,
            price: data.price_gram_24k || 0,
            change: data.ch || 0,
            changePercent: data.chp || 0,
          });
        }
      } catch (err) {
        console.error(`Failed to fetch ${metal} for ${dateStr}:`, err);
      }
      
      // Rate limiting - wait 150ms between requests
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    
    // Filter out entries without price data
    const validData = historicalData.filter(d => d.price > 0);
    
    // Calculate volatility from historical data
    if (validData.length > 1) {
      const returns = [];
      for (let i = 1; i < validData.length; i++) {
        const prevPrice = validData[i - 1].price;
        const currPrice = validData[i].price;
        if (prevPrice > 0 && currPrice > 0) {
          const dailyReturn = ((currPrice - prevPrice) / prevPrice) * 100;
          returns.push(dailyReturn);
        }
      }
      
      if (returns.length > 0) {
        // Standard deviation (volatility)
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance);
        
        // Calculate min and max for range
        const prices = validData.map(d => d.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = ((maxPrice - minPrice) / minPrice) * 100;
        
        return NextResponse.json({
          metal,
          days,
          count: validData.length,
          data: validData.reverse(), // Oldest first
          metrics: {
            volatility: parseFloat(volatility.toFixed(2)),
            avgReturn: parseFloat(mean.toFixed(2)),
            priceRange: parseFloat(priceRange.toFixed(2)),
            minPrice: parseFloat(minPrice.toFixed(2)),
            maxPrice: parseFloat(maxPrice.toFixed(2)),
          }
        });
      }
    }
    
    return NextResponse.json({
      metal,
      days,
      count: validData.length,
      data: validData,
      error: "Insufficient data for calculations",
    });
    
  } catch (error: any) {
    console.error("Historical price API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch historical prices" },
      { status: 500 }
    );
  }
}