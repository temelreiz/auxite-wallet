// src/app/api/crypto/route.ts
// Auxite Wallet - Crypto Prices API
// CoinGecko'dan BTC, ETH, XRP, SOL fiyatlarını çeker

import { NextResponse } from "next/server";

const COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price";
const COINS = "bitcoin,ethereum,ripple,solana";
const VS_CURRENCY = "usd";

// Fallback fiyatlar (API çalışmazsa)
const FALLBACK_PRICES = {
  bitcoin: { usd: 97000, usd_24h_change: 0 },
  ethereum: { usd: 3600, usd_24h_change: 0 },
  ripple: { usd: 2.50, usd_24h_change: 0 },
  solana: { usd: 230, usd_24h_change: 0 },
};

export async function GET() {
  try {
    const url = `${COINGECKO_API}?ids=${COINS}&vs_currencies=${VS_CURRENCY}&include_24hr_change=true`;
    
    const response = await fetch(url, {
      next: { revalidate: 30 }, // 30 saniye cache
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error("CoinGecko API error:", response.status);
      return NextResponse.json(FALLBACK_PRICES, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const data = await response.json();
    
    // Format data
    const formattedData = {
      bitcoin: {
        usd: data.bitcoin?.usd || FALLBACK_PRICES.bitcoin.usd,
        usd_24h_change: data.bitcoin?.usd_24h_change || 0,
      },
      ethereum: {
        usd: data.ethereum?.usd || FALLBACK_PRICES.ethereum.usd,
        usd_24h_change: data.ethereum?.usd_24h_change || 0,
      },
      ripple: {
        usd: data.ripple?.usd || FALLBACK_PRICES.ripple.usd,
        usd_24h_change: data.ripple?.usd_24h_change || 0,
      },
      solana: {
        usd: data.solana?.usd || FALLBACK_PRICES.solana.usd,
        usd_24h_change: data.solana?.usd_24h_change || 0,
      },
      lastUpdated: new Date().toISOString(),
    };
    
    return NextResponse.json(formattedData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
    
  } catch (error) {
    console.error("Crypto API error:", error);
    return NextResponse.json({
      ...FALLBACK_PRICES,
      error: "Failed to fetch prices",
      lastUpdated: new Date().toISOString(),
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
