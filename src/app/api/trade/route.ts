import { NextRequest, NextResponse } from "next/server";

// Trade API v2
// Bonus AUXM'i önce kullanarak metal alımı

// Metal fiyatları (gerçek zamanlı API'den alınacak)
const METAL_PRICES = {
  AUXG: 92.50,   // Gold $/gram
  AUXS: 1.05,    // Silver $/gram
  AUXPT: 32.00,  // Platinum $/gram
  AUXPD: 35.00,  // Palladium $/gram
};

// Spread oranları
const SPREAD_CONFIG = {
  buy: 0.01,   // %1 buy spread
  sell: 0.01,  // %1 sell spread
};

interface UserBalance {
  auxm: number;
  bonusAuxm: number;
  totalAuxm: number;
  auxg: number;
  auxs: number;
  auxpt: number;
  auxpd: number;
}

// Mock balance (test için)
const getMockBalance = (): UserBalance => ({
  auxm: 1250.50,
  bonusAuxm: 25.00,
  totalAuxm: 1275.50,
  auxg: 15.75,
  auxs: 500.00,
  auxpt: 2.50,
  auxpd: 1.25,
});

export async function GET() {
  // Metal fiyatlarını döndür
  return NextResponse.json({
    prices: METAL_PRICES,
    spread: SPREAD_CONFIG,
    lastUpdated: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      address,
      action,     // "buy" | "sell"
      metal,      // "AUXG" | "AUXS" | "AUXPT" | "AUXPD"
      amount,     // gram miktarı
    } = body;

    if (!address || !action || !metal || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: address, action, metal, amount" },
        { status: 400 }
      );
    }

    if (!["buy", "sell"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'buy' or 'sell'" },
        { status: 400 }
      );
    }

    if (!Object.keys(METAL_PRICES).includes(metal)) {
      return NextResponse.json(
        { error: `Invalid metal. Must be one of: ${Object.keys(METAL_PRICES).join(", ")}` },
        { status: 400 }
      );
    }

    const metalPrice = METAL_PRICES[metal as keyof typeof METAL_PRICES];
    const balance = getMockBalance();
    
    // TODO: Redis'ten gerçek bakiye çek
    // const balance = await redis.hgetall(`user:${address.toLowerCase()}`);

    if (action === "buy") {
      // METAL ALIM
      const grossCost = amount * metalPrice;
      const spreadFee = grossCost * SPREAD_CONFIG.buy;
      const totalCost = grossCost + spreadFee;
      const totalAvailable = balance.auxm + balance.bonusAuxm;

      if (totalCost > totalAvailable) {
        return NextResponse.json({
          error: "Insufficient balance",
          required: totalCost,
          available: totalAvailable,
          auxm: balance.auxm,
          bonusAuxm: balance.bonusAuxm,
        }, { status: 400 });
      }

      // Önce bonus AUXM kullan, sonra normal AUXM
      let usedBonusAuxm = 0;
      let usedAuxm = 0;

      if (balance.bonusAuxm >= totalCost) {
        // Tamamı bonus'tan karşılanabilir
        usedBonusAuxm = totalCost;
        usedAuxm = 0;
      } else {
        // Önce tüm bonus'u kullan, kalanı normal AUXM'den
        usedBonusAuxm = balance.bonusAuxm;
        usedAuxm = totalCost - usedBonusAuxm;
      }

      const newBalance = {
        auxm: balance.auxm - usedAuxm,
        bonusAuxm: balance.bonusAuxm - usedBonusAuxm,
        [metal.toLowerCase()]: (balance[metal.toLowerCase() as keyof UserBalance] as number) + amount,
      };

      // TODO: Redis'te güncelle
      // await redis.hset(`user:${address.toLowerCase()}`, newBalance);

      const txId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return NextResponse.json({
        success: true,
        txId,
        action: "buy",
        metal,
        amount,
        pricePerGram: metalPrice,
        grossCost,
        spreadFee,
        spreadPercent: SPREAD_CONFIG.buy * 100,
        totalCost,
        payment: {
          usedAuxm,
          usedBonusAuxm,
          totalUsed: totalCost,
          bonusSavings: usedBonusAuxm > 0 ? usedBonusAuxm : 0,
        },
        newBalances: {
          auxm: newBalance.auxm,
          bonusAuxm: newBalance.bonusAuxm,
          totalAuxm: newBalance.auxm + newBalance.bonusAuxm,
          [metal.toLowerCase()]: newBalance[metal.toLowerCase() as keyof typeof newBalance],
        },
        message: usedBonusAuxm > 0 
          ? `Purchased ${amount}g ${metal}. Used ${usedBonusAuxm.toFixed(2)} Bonus AUXM + ${usedAuxm.toFixed(2)} AUXM.`
          : `Purchased ${amount}g ${metal} for ${totalCost.toFixed(2)} AUXM.`,
      });

    } else {
      // METAL SATIM
      const metalKey = metal.toLowerCase() as keyof UserBalance;
      const currentMetalBalance = balance[metalKey] as number;

      if (amount > currentMetalBalance) {
        return NextResponse.json({
          error: "Insufficient metal balance",
          required: amount,
          available: currentMetalBalance,
        }, { status: 400 });
      }

      const grossValue = amount * metalPrice;
      const spreadFee = grossValue * SPREAD_CONFIG.sell;
      const netValue = grossValue - spreadFee;

      // Metal satışında normal AUXM alınır (bonus değil)
      const newBalance = {
        auxm: balance.auxm + netValue,
        [metalKey]: currentMetalBalance - amount,
      };

      // TODO: Redis'te güncelle
      // await redis.hset(`user:${address.toLowerCase()}`, newBalance);

      const txId = `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      return NextResponse.json({
        success: true,
        txId,
        action: "sell",
        metal,
        amount,
        pricePerGram: metalPrice,
        grossValue,
        spreadFee,
        spreadPercent: SPREAD_CONFIG.sell * 100,
        netValue,
        received: {
          auxm: netValue,
          note: "Metal sales credit regular AUXM (not bonus)"
        },
        newBalances: {
          auxm: newBalance.auxm,
          bonusAuxm: balance.bonusAuxm,
          totalAuxm: newBalance.auxm + balance.bonusAuxm,
          [metalKey]: newBalance[metalKey],
        },
        message: `Sold ${amount}g ${metal} for ${netValue.toFixed(2)} AUXM.`,
      });
    }

  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json(
      { error: "Trade failed" },
      { status: 500 }
    );
  }
}
