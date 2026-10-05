// src/app/api/admin/usd-deposit/route.ts
// Admin manuel USD ekleme endpoint'i

import { NextRequest, NextResponse } from "next/server";
import { addUsdBalance, getUserBalance } from "@/lib/redis";
import { requireAdmin } from "@/lib/security/require-user";


/**
 * POST /api/admin/usd-deposit
 * Body: { targetAddress: string, amount: number, note?: string }
 * Headers: Authorization: Bearer <admin session token>
 */
export async function POST(request: NextRequest) {
  try {
    // Authorised by the admin session, not by a wallet address in a header: an
    // address is public (it is on-chain and in the admin UI), so membership in
    // an allowlist proved nothing about who was calling.
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

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
      note || `Admin deposit by ${admin.user.token.slice(0, 8)}…`
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
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

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