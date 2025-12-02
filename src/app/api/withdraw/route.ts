import { NextRequest, NextResponse } from "next/server";

// Withdraw API v2
// Sadece normal AUXM çekilebilir, Bonus AUXM çekilemez

// Desteklenen coinler ve ayarları
const WITHDRAW_CONFIG = {
  ETH: {
    minAmount: 10,      // min 10 AUXM
    fee: 5,             // 5 AUXM fee
    network: "Ethereum",
    decimals: 18,
    estimatedTime: "5-30 minutes",
    addressRegex: /^0x[a-fA-F0-9]{40}$/,
  },
  BTC: {
    minAmount: 50,
    fee: 10,
    network: "Bitcoin",
    decimals: 8,
    estimatedTime: "30-60 minutes",
    addressRegex: /^(1|3|bc1)[a-zA-HJ-NP-Z0-9]{25,62}$/,
  },
  XRP: {
    minAmount: 5,
    fee: 1,
    network: "XRPL",
    decimals: 6,
    estimatedTime: "1-5 minutes",
    addressRegex: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
    requiresMemo: true,
  },
  SOL: {
    minAmount: 5,
    fee: 2,
    network: "Solana",
    decimals: 9,
    estimatedTime: "1-5 minutes",
    addressRegex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  },
};

interface UserBalance {
  auxm: number;
  bonusAuxm: number;
  totalAuxm: number;
}

// Mock balance (test için)
const getMockBalance = (): UserBalance => ({
  auxm: 1250.50,
  bonusAuxm: 25.00,
  totalAuxm: 1275.50,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    // Genel bilgi döndür
    return NextResponse.json({
      supportedCoins: Object.keys(WITHDRAW_CONFIG),
      config: WITHDRAW_CONFIG,
    });
  }

  // Kullanıcının çekilebilir bakiyesi
  const balance = getMockBalance();

  return NextResponse.json({
    address: address.toLowerCase(),
    withdrawable: {
      auxm: balance.auxm,
      usd: balance.auxm, // 1 AUXM = 1 USD
    },
    locked: {
      bonusAuxm: balance.bonusAuxm,
      reason: "Bonus AUXM can only be used for metal purchases",
    },
    supportedCoins: Object.keys(WITHDRAW_CONFIG),
    config: WITHDRAW_CONFIG,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      address,        // kullanıcı cüzdan adresi
      coin,           // "ETH" | "BTC" | "XRP" | "SOL"
      auxmAmount,     // çekilecek AUXM miktarı
      withdrawAddress, // hedef adres
      memo,           // XRP için destination tag
    } = body;

    // Validasyonlar
    if (!address || !coin || !auxmAmount || !withdrawAddress) {
      return NextResponse.json(
        { error: "Missing required fields: address, coin, auxmAmount, withdrawAddress" },
        { status: 400 }
      );
    }

    const coinConfig = WITHDRAW_CONFIG[coin as keyof typeof WITHDRAW_CONFIG];
    if (!coinConfig) {
      return NextResponse.json(
        { error: `Unsupported coin. Supported: ${Object.keys(WITHDRAW_CONFIG).join(", ")}` },
        { status: 400 }
      );
    }

    // XRP memo kontrolü
    if (coin === "XRP" && "requiresMemo" in coinConfig && coinConfig.requiresMemo && !memo) {
      return NextResponse.json(
        { error: "Destination Tag (memo) is required for XRP withdrawals" },
        { status: 400 }
      );
    }

    // Adres format kontrolü
    if (!coinConfig.addressRegex.test(withdrawAddress)) {
      return NextResponse.json(
        { error: `Invalid ${coin} address format` },
        { status: 400 }
      );
    }

    // Minimum miktar kontrolü
    if (auxmAmount < coinConfig.minAmount) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ${coinConfig.minAmount} AUXM for ${coin}` },
        { status: 400 }
      );
    }

    // Bakiye kontrolü - SADECE NORMAL AUXM
    const balance = getMockBalance();
    
    // TODO: Redis'ten gerçek bakiye çek
    // const balance = await redis.hgetall(`user:${address.toLowerCase()}`);

    const totalNeeded = auxmAmount + coinConfig.fee;
    
    if (totalNeeded > balance.auxm) {
      return NextResponse.json({
        error: "Insufficient withdrawable balance",
        message: "Only regular AUXM can be withdrawn. Bonus AUXM is reserved for metal purchases.",
        required: totalNeeded,
        available: balance.auxm,
        bonusAuxm: balance.bonusAuxm,
        breakdown: {
          withdrawAmount: auxmAmount,
          fee: coinConfig.fee,
          total: totalNeeded,
        }
      }, { status: 400 });
    }

    // Crypto fiyatı al
    // TODO: Gerçek fiyat API'den al
    const cryptoPrices: Record<string, number> = {
      ETH: 3000,
      BTC: 95000,
      XRP: 2.5,
      SOL: 200,
    };

    const cryptoPrice = cryptoPrices[coin];
    const netAuxm = auxmAmount - coinConfig.fee;
    const cryptoAmount = netAuxm / cryptoPrice;

    // Yeni bakiye
    const newAuxmBalance = balance.auxm - totalNeeded;

    // TODO: Redis'te güncelle
    // await redis.hset(`user:${address.toLowerCase()}`, { auxm: newAuxmBalance });

    const withdrawId = `wd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Withdraw queue'ya ekle
    // await redis.lpush("withdraw:pending", JSON.stringify({ withdrawId, ... }));

    return NextResponse.json({
      success: true,
      withdrawId,
      status: "pending",
      coin,
      network: coinConfig.network,
      withdrawAddress,
      memo: memo || null,
      amounts: {
        auxmRequested: auxmAmount,
        fee: coinConfig.fee,
        netAuxm,
        cryptoAmount: parseFloat(cryptoAmount.toFixed(coinConfig.decimals)),
        cryptoPrice,
      },
      newBalance: {
        auxm: newAuxmBalance,
        bonusAuxm: balance.bonusAuxm,
        totalAuxm: newAuxmBalance + balance.bonusAuxm,
      },
      estimatedTime: coinConfig.estimatedTime,
      message: `Withdrawal initiated. ${cryptoAmount.toFixed(6)} ${coin} will be sent to ${withdrawAddress}`,
      note: "Bonus AUXM cannot be withdrawn and remains available for metal purchases.",
    });

  } catch (error) {
    console.error("Withdraw error:", error);
    return NextResponse.json(
      { error: "Withdrawal failed" },
      { status: 500 }
    );
  }
}
