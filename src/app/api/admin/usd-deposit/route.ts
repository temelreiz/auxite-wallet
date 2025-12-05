// src/app/api/admin/usd-deposit/route.ts
// Admin manuel USD ekleme endpoint'i

import { NextRequest, NextResponse } from "next/server";
import { addUsdBalance, getUserBalance } from "@/lib/redis";

// Admin wallet adresleri (environment'tan veya hardcoded)
const ADMIN_WALLETS = [
  process.env.ADMIN_WALLET_1?.toLowerCase(),
  process.env.ADMIN_WALLET_2?.toLowerCase(),
  // Geliştirme için sabit adres ekleyebilirsiniz
  // "0x1234...".toLowerCase(),
].filter(Boolean);

/**
 * POST /api/admin/usd-deposit
 * Body: { targetAddress: string, amount: number, note?: string }
 * Headers: x-wallet-address: admin wallet adresi
 */
export async function POST(request: NextRequest) {
  try {
    // Admin kontrolü
    const adminAddress = request.headers.get("x-wallet-address")?.toLowerCase();
    
    if (!adminAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address required" },
        { status: 401 }
      );
    }

    // Admin yetkisi kontrolü
    if (!ADMIN_WALLETS.includes(adminAddress)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Body'yi parse et
    const body = await request.json();
    const { targetAddress, amount, note } = body;

    // Validasyonlar
    if (!targetAddress || typeof targetAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "Target address is required" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid positive amount is required" },
        { status: 400 }
      );
    }

    if (amount > 1000000) {
      return NextResponse.json(
        { success: false, error: "Amount exceeds maximum limit (1,000,000 USD)" },
        { status: 400 }
      );
    }

    // Ethereum address formatı kontrolü
    if (!/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // USD ekle
    const result = await addUsdBalance(
      targetAddress,
      amount,
      note || `Admin deposit by ${adminAddress.slice(0, 10)}...`
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Güncel bakiyeyi al
    const updatedBalance = await getUserBalance(targetAddress);

    return NextResponse.json({
      success: true,
      message: `Successfully added $${amount.toFixed(2)} USD`,
      data: {
        targetAddress: targetAddress.toLowerCase(),
        addedAmount: amount,
        newUsdBalance: updatedBalance.usd,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin USD deposit error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/usd-deposit?address=0x...
 * Belirli bir kullanıcının USD bakiyesini sorgula (admin için)
 */
export async function GET(request: NextRequest) {
  try {
    // Admin kontrolü
    const adminAddress = request.headers.get("x-wallet-address")?.toLowerCase();
    
    if (!adminAddress || !ADMIN_WALLETS.includes(adminAddress)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Query param'dan address al
    const { searchParams } = new URL(request.url);
    const targetAddress = searchParams.get("address");

    if (!targetAddress) {
      return NextResponse.json(
        { success: false, error: "Address parameter required" },
        { status: 400 }
      );
    }

    const balance = await getUserBalance(targetAddress);

    return NextResponse.json({
      success: true,
      data: {
        address: targetAddress.toLowerCase(),
        usd: balance.usd,
        usdt: balance.usdt,
        fullBalance: balance,
      },
    });
  } catch (error) {
    console.error("Admin USD balance check error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}