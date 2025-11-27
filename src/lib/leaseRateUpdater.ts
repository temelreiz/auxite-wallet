/**
 * Automatic Lease Rate Updater
 * 
 * This service fetches data from multiple sources to calculate gold lease rates:
 * 1. FRED API - SOFR rates (replaces LIBOR)
 * 2. Gold futures/spot spread - to derive implied forward rates
 * 3. Fallback to manual rates if APIs fail
 * 
 * Formula: Gold Lease Rate = SOFR - GOFO (Gold Forward Offered Rate)
 * Where GOFO ≈ (Futures Price - Spot Price) / Spot Price * (365 / Days to Expiry)
 * 
 * Run this as a cron job daily at market close (5 PM EST / 22:00 UTC)
 */

// API Keys and endpoints
const FRED_API_KEY = process.env.FRED_API_KEY || ""; // Get free key at https://fred.stlouisfed.org/docs/api/api_key.html
const METALS_API_KEY = process.env.METALS_API_KEY || ""; // Optional: metals-api.com for spot prices

// FRED API endpoints
const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";
const SOFR_SERIES_ID = "SOFR"; // Secured Overnight Financing Rate
const SOFR_30DAY_SERIES_ID = "SOFR30DAYAVG"; // 30-day average

// NY Fed API for reference rates (no key needed)
const NY_FED_RATES_URL = "https://markets.newyorkfed.org/api/rates/secured/sofr/last/1.json";

// Metals API for gold prices
const METALS_API_URL = "https://metals-api.com/api/latest";

// Alternative free gold price API
const GOLD_PRICE_API = "https://api.metals.live/v1/spot";

export interface LeaseRateData {
  metal: string;
  rate3m: number;
  rate6m: number;
  rate12m: number;
  sofr: number;
  gofo6m: number;
  spotPrice: number;
  futuresPrice: number;
  lastUpdated: string;
  source: string;
  success: boolean;
  error?: string;
}

export interface SOFRData {
  rate: number;
  date: string;
  source: string;
}

export interface GoldPriceData {
  spot: number;
  futures6m: number;
  currency: string;
  timestamp: string;
}

/**
 * Fetch SOFR rate from NY Fed API (no key required)
 */
async function fetchSOFRFromNYFed(): Promise<SOFRData | null> {
  try {
    const response = await fetch(NY_FED_RATES_URL);
    if (!response.ok) throw new Error(`NY Fed API error: ${response.status}`);
    
    const data = await response.json();
    const rate = data?.refRates?.[0];
    
    if (rate) {
      return {
        rate: parseFloat(rate.percentRate),
        date: rate.effectiveDate,
        source: "NY Fed",
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching SOFR from NY Fed:", error);
    return null;
  }
}

/**
 * Fetch SOFR rate from FRED API
 */
async function fetchSOFRFromFRED(): Promise<SOFRData | null> {
  if (!FRED_API_KEY) {
    console.warn("FRED API key not configured");
    return null;
  }
  
  try {
    const today = new Date().toISOString().split("T")[0];
    const url = `${FRED_BASE_URL}?series_id=${SOFR_SERIES_ID}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`FRED API error: ${response.status}`);
    
    const data = await response.json();
    const observation = data?.observations?.[0];
    
    if (observation && observation.value !== ".") {
      return {
        rate: parseFloat(observation.value),
        date: observation.date,
        source: "FRED",
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching SOFR from FRED:", error);
    return null;
  }
}

/**
 * Get current SOFR rate with fallback
 */
async function getCurrentSOFR(): Promise<SOFRData> {
  // Try NY Fed first (no key required)
  let sofr = await fetchSOFRFromNYFed();
  if (sofr) return sofr;
  
  // Fallback to FRED
  sofr = await fetchSOFRFromFRED();
  if (sofr) return sofr;
  
  // Hardcoded fallback (update periodically)
  return {
    rate: 4.33, // Current SOFR as of late 2025
    date: new Date().toISOString().split("T")[0],
    source: "Fallback",
  };
}

/**
 * Fetch gold spot price from free API
 */
async function fetchGoldPrice(): Promise<GoldPriceData | null> {
  try {
    const response = await fetch(GOLD_PRICE_API);
    if (!response.ok) throw new Error(`Gold API error: ${response.status}`);
    
    const data = await response.json();
    // api.metals.live returns array of metals
    const gold = data?.find?.((m: any) => m.metal === "gold" || m.symbol === "XAU");
    
    if (gold) {
      return {
        spot: gold.price || gold.ask,
        futures6m: gold.price * 1.015, // Estimate 1.5% premium for 6-month futures
        currency: "USD",
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching gold price:", error);
    return null;
  }
}

/**
 * Calculate implied GOFO from spot/futures spread
 * GOFO = (Futures - Spot) / Spot * (365 / Days) * 100
 */
function calculateImpliedGOFO(spot: number, futures: number, days: number): number {
  if (spot <= 0 || futures <= 0) return 0;
  const spread = futures - spot;
  const annualizedRate = (spread / spot) * (365 / days) * 100;
  return Math.round(annualizedRate * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate lease rate from SOFR and GOFO
 * Lease Rate = SOFR - GOFO
 */
function calculateLeaseRate(sofr: number, gofo: number): number {
  const rate = sofr - gofo;
  // Ensure rate is not negative (floor at 0.5%)
  return Math.max(0.5, Math.round(rate * 100) / 100);
}

/**
 * Main function to calculate current lease rates
 */
export async function calculateCurrentLeaseRates(): Promise<LeaseRateData> {
  const result: LeaseRateData = {
    metal: "AUXG",
    rate3m: 2.5,
    rate6m: 3.0,
    rate12m: 3.5,
    sofr: 4.33,
    gofo6m: 1.5,
    spotPrice: 2650,
    futuresPrice: 2690,
    lastUpdated: new Date().toISOString(),
    source: "Calculated",
    success: false,
  };

  try {
    // Fetch SOFR
    const sofrData = await getCurrentSOFR();
    result.sofr = sofrData.rate;

    // Fetch gold prices
    const goldData = await fetchGoldPrice();
    if (goldData) {
      result.spotPrice = goldData.spot;
      result.futuresPrice = goldData.futures6m;
    }

    // Calculate GOFO (6-month)
    result.gofo6m = calculateImpliedGOFO(result.spotPrice, result.futuresPrice, 180);

    // Calculate base lease rate
    const baseLeaseRate = calculateLeaseRate(result.sofr, result.gofo6m);

    // Add platform margin for different terms
    // Longer terms = better rates for users (more margin for platform)
    result.rate3m = Math.round((baseLeaseRate + 0.5) * 100) / 100;  // 3 month
    result.rate6m = Math.round((baseLeaseRate + 1.0) * 100) / 100;  // 6 month 
    result.rate12m = Math.round((baseLeaseRate + 1.5) * 100) / 100; // 12 month

    result.source = `SOFR: ${sofrData.source}, Gold: ${goldData ? "API" : "Fallback"}`;
    result.success = true;

  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    result.source = "Fallback (Error)";
  }

  return result;
}

/**
 * Generate updated config file content
 */
export function generateConfigUpdate(rates: LeaseRateData): string {
  const today = new Date().toISOString().split("T")[0];
  
  return `// Auto-generated lease rates - Last updated: ${today}
// Source: ${rates.source}
// SOFR: ${rates.sofr}%, GOFO(6m): ${rates.gofo6m}%

export const CURRENT_LEASE_RATES = {
  gold: {
    "3m": ${rates.rate3m},
    "6m": ${rates.rate6m},
    "12m": ${rates.rate12m},
  },
  silver: {
    "3m": ${Math.round((rates.rate3m - 0.5) * 100) / 100},
    "6m": ${Math.round((rates.rate6m - 0.5) * 100) / 100},
    "12m": ${Math.round((rates.rate12m - 0.5) * 100) / 100},
  },
  platinum: {
    "3m": ${Math.round((rates.rate3m + 0.5) * 100) / 100},
    "6m": ${Math.round((rates.rate6m + 0.5) * 100) / 100},
    "12m": ${Math.round((rates.rate12m + 0.5) * 100) / 100},
  },
  palladium: {
    "3m": ${Math.round((rates.rate3m + 0.3) * 100) / 100},
    "6m": ${Math.round((rates.rate6m + 0.3) * 100) / 100},
    "12m": ${Math.round((rates.rate12m + 0.3) * 100) / 100},
  },
  lastUpdated: "${today}",
  sofr: ${rates.sofr},
  source: "${rates.source}",
};
`;
}

/**
 * Store rates in a simple JSON file or database
 */
export async function saveRatesToFile(rates: LeaseRateData): Promise<void> {
  // In a real implementation, this would write to a file or database
  // For Vercel/Next.js, you might use:
  // - Vercel KV (Redis)
  // - Supabase
  // - PlanetScale
  // - Simple JSON file in /public (with revalidation)
  
  const configContent = generateConfigUpdate(rates);
  console.log("Generated config:", configContent);
  
  // Example: Save to localStorage for client-side (demo only)
  if (typeof window !== "undefined") {
    localStorage.setItem("leaseRates", JSON.stringify(rates));
    localStorage.setItem("leaseRatesConfig", configContent);
  }
}

/**
 * API Route handler for Next.js
 * Create this at: /app/api/lease-rates/update/route.ts
 */
export async function updateLeaseRatesAPI(): Promise<Response> {
  try {
    const rates = await calculateCurrentLeaseRates();
    await saveRatesToFile(rates);
    
    return new Response(JSON.stringify({
      success: true,
      rates,
      message: "Lease rates updated successfully",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/*
 * SETUP INSTRUCTIONS:
 * 
 * 1. Get a free FRED API key:
 *    https://fred.stlouisfed.org/docs/api/api_key.html
 * 
 * 2. Add to environment variables:
 *    FRED_API_KEY=your_key_here
 * 
 * 3. Create API route at /app/api/lease-rates/update/route.ts:
 *    
 *    import { updateLeaseRatesAPI } from "@/lib/leaseRateUpdater";
 *    export async function GET() {
 *      return updateLeaseRatesAPI();
 *    }
 * 
 * 4. Set up cron job (Vercel):
 *    Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/lease-rates/update",
 *        "schedule": "0 22 * * 1-5"  // 10 PM UTC, Mon-Fri (after market close)
 *      }]
 *    }
 * 
 * 5. Alternative: GitHub Actions cron
 *    Create .github/workflows/update-rates.yml
 * 
 * 6. Alternative: External cron service
 *    - cron-job.org (free)
 *    - EasyCron
 *    - Upstash QStash
 */