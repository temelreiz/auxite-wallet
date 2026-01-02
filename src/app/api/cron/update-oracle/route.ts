import { NextResponse } from "next/server";
import { updateOraclePrices } from "@/lib/v6-token-service";

export const maxDuration = 60;

// Default prices (USD/oz) - will be replaced by real API calls
const DEFAULT_PRICES = {
  AUXG: 2950,  // Gold
  AUXS: 33,    // Silver
  AUXPT: 1000, // Platinum
  AUXPD: 1050, // Palladium
};

const DEFAULT_ETH_PRICE = 3500;

async function fetchMetalPrices(): Promise<{ metals: typeof DEFAULT_PRICES; ethPrice: number }> {
  try {
    // Try to fetch from GoldAPI or similar
    const apiKey = process.env.GOLDAPI_KEY;
    if (apiKey) {
      // Fetch real prices here if API key is available
      // For now, return defaults
    }
    return { metals: DEFAULT_PRICES, ethPrice: DEFAULT_ETH_PRICE };
  } catch (error) {
    console.error('Failed to fetch prices, using defaults:', error);
    return { metals: DEFAULT_PRICES, ethPrice: DEFAULT_ETH_PRICE };
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { metals, ethPrice } = await fetchMetalPrices();
  const result = await updateOraclePrices(metals, ethPrice);
  
  return NextResponse.json({ 
    success: result.success, 
    txHash: result.txHash,
    error: result.error,
    timestamp: Date.now() 
  });
}
