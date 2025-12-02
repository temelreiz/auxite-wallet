import { NextRequest, NextResponse } from "next/server";

// User Balance API
// Normal AUXM + Bonus AUXM (metal-only) desteği

interface UserBalance {
  // Normal AUXM - her yerde kullanılabilir
  auxm: number;
  // Bonus AUXM - sadece metal alımında kullanılabilir
  bonusAuxm: number;
  // Toplam görünen bakiye
  totalAuxm: number;
  // Bonus son kullanma tarihi
  bonusExpiresAt: string | null;
  // Metal bakiyeleri
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
  // Crypto bakiyeleri (native)
  eth: number;
  btc: number;
  xrp: number;
  sol: number;
}

// Mock bakiyeler (test için)
const MOCK_BALANCES: Record<string, UserBalance> = {
  "default": {
    auxm: 1250.50,
    bonusAuxm: 25.00,
    totalAuxm: 1275.50,
    bonusExpiresAt: "2025-03-01T00:00:00Z",
    auxg: 15.75,
    auxs: 500.00,
    auxpt: 2.50,
    auxpd: 1.25,
    eth: 0.5,
    btc: 0.01,
    xrp: 100,
    sol: 2.5,
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  try {
    // TODO: Redis'ten gerçek bakiye çek
    // const balance = await redis.hgetall(`user:${address.toLowerCase()}`);
    
    const balance = MOCK_BALANCES["default"];

    // Çekilebilir bakiye hesapla
    const withdrawableAuxm = balance.auxm;
    const lockedBonusAuxm = balance.bonusAuxm;

    return NextResponse.json({
      address: address.toLowerCase(),
      balances: balance,
      summary: {
        // Toplam bakiye (görünen)
        totalAuxm: balance.totalAuxm,
        // Çekilebilir AUXM (sadece normal)
        withdrawableAuxm,
        // Kilitli bonus AUXM
        lockedBonusAuxm,
        // Bonus durumu
        bonusStatus: balance.bonusAuxm > 0 ? {
          amount: balance.bonusAuxm,
          expiresAt: balance.bonusExpiresAt,
          usableFor: ["AUXG", "AUXS", "AUXPT", "AUXPD"],
          note: "Bonus AUXM can only be used for metal purchases"
        } : null,
        // USD değerleri
        totalValueUsd: balance.totalAuxm, // 1 AUXM = 1 USD
      }
    });

  } catch (error) {
    console.error("Balance fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}

// Bakiye güncelleme (internal use)
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { address, updates, operation = "increment" } = body;

    if (!address || !updates) {
      return NextResponse.json(
        { error: "Missing required fields: address, updates" },
        { status: 400 }
      );
    }

    // updates = { auxm: 100, bonusAuxm: 10, auxg: 5 }
    // operation = "set" | "increment"

    // TODO: Redis'te güncelle
    // if (operation === "increment") {
    //   for (const [key, value] of Object.entries(updates)) {
    //     await redis.hincrbyfloat(`user:${address.toLowerCase()}`, key, value);
    //   }
    // } else {
    //   await redis.hset(`user:${address.toLowerCase()}`, updates);
    // }

    console.log(`Balance update for ${address}:`, { operation, updates });

    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      operation,
      updates,
      message: operation === "increment" 
        ? "Balance incremented successfully"
        : "Balance set successfully"
    });

  } catch (error) {
    console.error("Balance update error:", error);
    return NextResponse.json(
      { error: "Failed to update balance" },
      { status: 500 }
    );
  }
}
