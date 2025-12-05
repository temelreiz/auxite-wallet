// src/app/api/user/buy-with-usd/route.ts
// USD ile token satın alma endpoint'i

import { NextRequest, NextResponse } from "next/server";
import { buyWithUsd, getUserBalance } from "@/lib/redis";

// Token fiyatları (gerçek uygulamada API'den çekilmeli)
const TOKEN_PRICES: Record<string, number> = {
  usdt: 1.0,      // 1 USD = 1 USDT
  auxm: 0.10,     // 1 AUXM = $0.10 → 1 USD = 10 AUXM
  auxg: 2800,     // 1 AUXG = $2800 (gold price per gram)
  auxs: 32,       // 1 AUXS = $32 (silver price per gram)
  auxpt: 35,      // 1 AUXPT = $35 (platinum price per gram)
  auxpd: 45,      // 1 AUXPD = $45 (palladium price per gram)
};

/**
 * POST /api/user/buy-with-usd
 * Body: { targetToken: string, usdAmount: number }
 * Headers: x-wallet-address: kullanıcı wallet adresi
 */
export async function POST(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Wallet address required" },
        { status: 401 }
      );
    }

    // Ethereum address formatı kontrolü
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { targetToken, usdAmount } = body;

    // Validasyonlar
    if (!targetToken || !TOKEN_PRICES[targetToken]) {
      return NextResponse.json(
        { success: false, error: "Invalid target token" },
        { status: 400 }
      );
    }

    if (!usdAmount || typeof usdAmount !== "number" || usdAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid positive USD amount required" },
        { status: 400 }
      );
    }

    // Minimum ve maksimum limitler
    if (usdAmount < 1) {
      return NextResponse.json(
        { success: false, error: "Minimum purchase amount is $1" },
        { status: 400 }
      );
    }

    if (usdAmount > 100000) {
      return NextResponse.json(
        { success: false, error: "Maximum purchase amount is $100,000" },
        { status: 400 }
      );
    }

    // Mevcut bakiyeyi kontrol et
    const balance = await getUserBalance(address);
    
    if (balance.usd < usdAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Insufficient USD balance",
          availableUsd: balance.usd,
          requiredUsd: usdAmount,
        },
        { status: 400 }
      );
    }

    // Token miktarını hesapla
    const tokenPrice = TOKEN_PRICES[targetToken];
    const tokenAmount = usdAmount / tokenPrice;

    // Satın alma işlemi
    const result = await buyWithUsd(
      address,
      targetToken as "usdt" | "auxm" | "auxg" | "auxs" | "auxpt" | "auxpd",
      usdAmount,
      tokenAmount
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Güncel bakiyeyi al
    const updatedBalance = await getUserBalance(address);

    return NextResponse.json({
      success: true,
      message: `Successfully purchased ${tokenAmount.toFixed(6)} ${targetToken.toUpperCase()}`,
      data: {
        spent: {
          token: "USD",
          amount: usdAmount,
        },
        received: {
          token: targetToken.toUpperCase(),
          amount: tokenAmount,
        },
        rate: `1 ${targetToken.toUpperCase()} = $${tokenPrice}`,
        newBalances: {
          usd: updatedBalance.usd,
          [targetToken]: updatedBalance[targetToken as keyof typeof updatedBalance],
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Buy with USD error:", error);
    return NextResponse.json(
      { success: false, error: "Purchase failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/buy-with-usd
 * Token fiyatlarını ve kullanıcı USD bakiyesini getir
 */
export async function GET(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");

    let userUsd = 0;
    if (address && /^0x[a-fA-F0-9]{40}$/i.test(address)) {
      const balance = await getUserBalance(address);
      userUsd = balance.usd;
    }

    return NextResponse.json({
      success: true,
      data: {
        prices: TOKEN_PRICES,
        userUsdBalance: userUsd,
        supportedTokens: Object.keys(TOKEN_PRICES),
      },
    });
  } catch (error) {
    console.error("Get token prices error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}