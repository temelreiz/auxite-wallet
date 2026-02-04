// src/app/api/user/buy-with-usd/route.ts
// Quick Buy API - USD ile token satın alma
// ✅ TELEGRAM BOT BİLDİRİMLERİ

import { NextRequest, NextResponse } from "next/server";
import { buyWithUsd, getUserBalance } from "@/lib/redis";
import { notifyTrade } from "@/lib/telegram";
import { getTokenPrices } from "@/lib/v6-token-service";

// Metal listesi
const METALS = ["auxg", "auxs", "auxpt", "auxpd"];

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

    const normalizedAddress = address.toLowerCase();
    const body = await request.json();
    const { targetToken, usdAmount, expectedTokenAmount } = body;

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

    const balance = await getUserBalance(normalizedAddress);

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

    // Get dynamic price for metals
    let tokenPrice = TOKEN_PRICES[targetToken];
    const targetTokenLower = targetToken.toLowerCase();

    if (METALS.includes(targetTokenLower)) {
      try {
        const prices = await getTokenPrices(targetToken);
        tokenPrice = prices.askPerGram; // Use ask price for buying
        console.log(`📊 Quick Buy: Using dynamic price for ${targetToken}: $${tokenPrice}/g`);
      } catch (e) {
        console.warn(`Could not get dynamic price for ${targetToken}, using default: $${tokenPrice}`);
      }
    }

    const tokenAmount = usdAmount / tokenPrice;

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔒 SERVER-SIDE VALIDATION - Frontend manipulation önleme
    // ═══════════════════════════════════════════════════════════════════════════
    if (expectedTokenAmount) {
      const diff = Math.abs(tokenAmount - expectedTokenAmount) / tokenAmount;
      if (diff > 0.05) {
        console.error(`⚠️ PRICE MANIPULATION DETECTED in Quick Buy!`);
        console.error(`   Client expected: ${expectedTokenAmount} ${targetToken}`);
        console.error(`   Server calculated: ${tokenAmount} ${targetToken}`);
        console.error(`   Difference: ${(diff * 100).toFixed(2)}%`);
        return NextResponse.json({
          success: false,
          error: "Price changed. Please refresh and try again.",
          serverTokenAmount: tokenAmount,
          clientTokenAmount: expectedTokenAmount,
        }, { status: 400 });
      }
    }
    console.log(`✅ Quick Buy validated: $${usdAmount} USD → ${tokenAmount.toFixed(6)} ${targetToken.toUpperCase()}`);

    const result = await buyWithUsd(
      normalizedAddress,
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

    const updatedBalance = await getUserBalance(normalizedAddress);

    // ═══════════════════════════════════════════════════════════════════════════
    // TELEGRAM BİLDİRİMİ - Metal alımlarında admin'e bildirim gönder
    // ═══════════════════════════════════════════════════════════════════════════
    if (METALS.includes(targetTokenLower)) {
      // Async olarak gönder, response'u bekletme
      notifyTrade({
        type: "buy",
        userAddress: normalizedAddress,
        fromToken: "USD",
        toToken: targetToken.toUpperCase(),
        fromAmount: usdAmount,
        toAmount: tokenAmount,
      }).then((success) => {
        if (success) {
          console.log(`📱 Quick Buy Telegram bildirimi gönderildi: ${tokenAmount.toFixed(4)}g ${targetToken.toUpperCase()}`);
        } else {
          console.error(`❌ Quick Buy Telegram bildirimi gönderilemedi`);
        }
      }).catch((err) => {
        console.error(`❌ Quick Buy Telegram bildirim hatası:`, err);
      });
    }

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
        rate: `1 ${targetToken.toUpperCase()} = $${tokenPrice.toFixed(2)}`,
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
      const balance = await getUserBalance(address.toLowerCase());
      userUsd = balance.usd;
    }

    // Get dynamic prices for metals
    const dynamicPrices: Record<string, number> = { ...TOKEN_PRICES };

    for (const metal of METALS) {
      try {
        const prices = await getTokenPrices(metal);
        dynamicPrices[metal] = prices.askPerGram;
      } catch (e) {
        console.warn(`Could not get dynamic price for ${metal}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        prices: dynamicPrices,
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
