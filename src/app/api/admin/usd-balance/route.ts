// src/app/api/user/usd-balance/route.ts
// Kullanıcı USD bakiye sorgulama endpoint'i

import { NextRequest, NextResponse } from "next/server";
import { getUserBalance } from "@/lib/redis";

/**
 * GET /api/user/usd-balance
 * Headers: x-wallet-address: kullanıcı wallet adresi
 */
export async function GET(request: NextRequest) {
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

    const balance = await getUserBalance(address);

    return NextResponse.json({
      success: true,
      data: {
        usd: balance.usd,
        usdt: balance.usdt,
        // Toplam USD değeri (fiat + stablecoin)
        totalUsdValue: balance.usd + balance.usdt,
      },
    });
  } catch (error) {
    console.error("USD balance fetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch USD balance" },
      { status: 500 }
    );
  }
}