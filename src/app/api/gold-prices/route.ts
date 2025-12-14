// src/app/api/gold-prices/route.ts
// GoldAPI için server-side proxy - API key client'tan gizlenir

import { NextRequest, NextResponse } from "next/server";

// Cache süresi (5 dakika)
const CACHE_DURATION = 5 * 60 * 1000;

let cachedPrices: any = null;
let lastFetch = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metal = searchParams.get("metal") || "XAU"; // XAU, XAG, XPT, XPD

    // Cache kontrolü
    const now = Date.now();
    if (cachedPrices && (now - lastFetch) < CACHE_DURATION) {
      const cachedMetal = cachedPrices[metal];
      if (cachedMetal) {
        return NextResponse.json({
          success: true,
          data: cachedMetal,
          cached: true,
        });
      }
    }

    // GoldAPI'den fiyat al (server-side - key gizli)
    const response = await fetch(
      `${process.env.GOLDAPI_BASE_URL}/${metal}/USD`,
      {
        headers: {
          "x-access-token": process.env.GOLDAPI_KEY!,
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 }, // Next.js cache
      }
    );

    if (!response.ok) {
      throw new Error(`GoldAPI error: ${response.status}`);
    }

    const data = await response.json();

    // Cache güncelle
    if (!cachedPrices) cachedPrices = {};
    cachedPrices[metal] = data;
    lastFetch = now;

    return NextResponse.json({
      success: true,
      data,
      cached: false,
    });

  } catch (error: any) {
    console.error("Gold prices proxy error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Tüm metalleri tek seferde al
export async function POST(request: NextRequest) {
  try {
    const metals = ["XAU", "XAG", "XPT", "XPD"];
    const results: Record<string, any> = {};

    for (const metal of metals) {
      try {
        const response = await fetch(
          `${process.env.GOLDAPI_BASE_URL}/${metal}/USD`,
          {
            headers: {
              "x-access-token": process.env.GOLDAPI_KEY!,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          results[metal] = await response.json();
        }
      } catch (e) {
        console.error(`Error fetching ${metal}:`, e);
      }
    }

    // Cache güncelle
    cachedPrices = results;
    lastFetch = Date.now();

    return NextResponse.json({
      success: true,
      data: results,
    });

  } catch (error: any) {
    console.error("Gold prices batch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
