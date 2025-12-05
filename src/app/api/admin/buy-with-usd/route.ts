// src/app/api/user/buy-with-usd/route.ts
import { NextRequest, NextResponse } from "next/server";
import { buyWithUsd, getUserBalance } from "@/lib/redis";

// Sadece AUXM ve Metaller (Crypto YOK)
const TOKEN_PRICES: Record<string, number> = {
  auxm: 0.10,
  auxg: 90,
  auxs: 1.1,
  auxpt: 35,
  auxpd: 32,
};

export async function POST(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Wallet address required" },
        { status: 401 }
      );
    }

    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { targetToken, usdAmount } = body;

    if (!targetToken || !TOKEN_PRICES[targetToken]) {
      return NextResponse.json(
        { success: false, error: "Invalid target token. Only AUXM and metals are allowed." },
        { status: 400 }
      );
    }

    if (!usdAmount || typeof usdAmount !== "number" || usdAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid positive USD amount required" },
        { status: 400 }
      );
    }

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

    const tokenPrice = TOKEN_PRICES[targetToken];
    const tokenAmount = usdAmount / tokenPrice;

    const result = await buyWithUsd(
      address,
      targetToken as "auxm" | "auxg" | "auxs" | "auxpt" | "auxpd",
      usdAmount,
      tokenAmount
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

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