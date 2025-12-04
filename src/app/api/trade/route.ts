import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Metal sembolleri
const METALS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTOS = ["eth", "btc", "xrp", "sol"];

interface TradeRequest {
  address: string;
  type: "buy" | "sell" | "swap";
  fromToken: string;
  toToken: string;
  fromAmount: number;
  price: number; // gram başına fiyat
}

// GET - Fiyat hesapla (preview)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const fromToken = searchParams.get("fromToken");
  const toToken = searchParams.get("toToken");
  const amount = parseFloat(searchParams.get("amount") || "0");
  const price = parseFloat(searchParams.get("price") || "0");

  if (!type || !fromToken || !toToken || amount <= 0 || price <= 0) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Spread hesapla (0.5%)
  const spreadRate = 0.005;
  const spread = amount * spreadRate;
  
  let toAmount: number;
  let fee: number;

  if (type === "buy") {
    // AUXM -> Metal
    fee = amount * 0.001; // 0.1% fee
    const netAmount = amount - fee;
    toAmount = netAmount / price; // gram cinsinden
  } else if (type === "sell") {
    // Metal -> AUXM
    fee = amount * price * 0.001;
    toAmount = (amount * price) - fee;
  } else {
    // Swap
    fee = amount * 0.002; // 0.2% fee
    toAmount = (amount - fee) * price;
  }

  return NextResponse.json({
    success: true,
    preview: {
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: toAmount.toFixed(type === "buy" ? 6 : 2),
      price,
      spread: spread.toFixed(4),
      fee: fee.toFixed(4),
      total: amount.toFixed(2),
    },
  });
}

// POST - Trade işlemi gerçekleştir
export async function POST(request: NextRequest) {
  try {
    const body: TradeRequest = await request.json();
    const { address, type, fromToken, toToken, fromAmount, price } = body;

    if (!address || !type || !fromToken || !toToken || !fromAmount || !price) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const fromTokenLower = fromToken.toLowerCase();
    const toTokenLower = toToken.toLowerCase();

    // Mevcut bakiyeleri al
    const balanceKey = `user:${normalizedAddress}:balance`;
    const currentBalance = await redis.hgetall(balanceKey);

    if (!currentBalance || Object.keys(currentBalance).length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Bakiye kontrolü
    const fromBalance = parseFloat(currentBalance[fromTokenLower] as string || "0");
    const bonusAuxm = parseFloat(currentBalance.bonusauxm as string || "0");

    let availableBalance = fromBalance;
    let usedBonus = 0;
    let usedRegular = fromAmount;

    // AUXM ile alım yapıyorsa bonus kullanılabilir
    if (type === "buy" && fromTokenLower === "auxm" && METALS.includes(toTokenLower)) {
      availableBalance = fromBalance + bonusAuxm;
      
      // Önce bonus kullan
      if (bonusAuxm >= fromAmount) {
        usedBonus = fromAmount;
        usedRegular = 0;
      } else {
        usedBonus = bonusAuxm;
        usedRegular = fromAmount - bonusAuxm;
      }
    }

    if (fromAmount > availableBalance) {
      return NextResponse.json({ 
        error: "Insufficient balance",
        required: fromAmount,
        available: availableBalance,
      }, { status: 400 });
    }

    // Fee ve miktar hesapla
    let fee: number;
    let toAmount: number;

    if (type === "buy") {
      fee = fromAmount * 0.001; // 0.1%
      const netAmount = fromAmount - fee;
      toAmount = netAmount / price;
    } else if (type === "sell") {
      fee = fromAmount * price * 0.001; // 0.1%
      toAmount = (fromAmount * price) - fee;
    } else {
      fee = fromAmount * 0.002; // 0.2%
      toAmount = (fromAmount - fee) * price;
    }

    // Bakiyeleri güncelle (atomik işlem)
    const multi = redis.multi();

    // From token'ı düş
    if (type === "buy" && fromTokenLower === "auxm" && usedBonus > 0) {
      // Bonus ve normal AUXM ayrı düşülür
      if (usedBonus > 0) {
        multi.hincrbyfloat(balanceKey, "bonusauxm", -usedBonus);
      }
      if (usedRegular > 0) {
        multi.hincrbyfloat(balanceKey, "auxm", -usedRegular);
      }
    } else {
      multi.hincrbyfloat(balanceKey, fromTokenLower, -fromAmount);
    }

    // To token'ı ekle
    multi.hincrbyfloat(balanceKey, toTokenLower, toAmount);

    // Transaction ekle
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction = {
      id: txId,
      type,
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      fromAmount: fromAmount.toString(),
      toAmount: toAmount.toFixed(6),
      fee: fee.toFixed(4),
      price: price.toString(),
      usedBonus: usedBonus.toString(),
      status: "completed",
      timestamp: Date.now(),
    };

    const txKey = `user:${normalizedAddress}:transactions`;
    multi.lpush(txKey, JSON.stringify(transaction));

    // Execute
    await multi.exec();

    // Güncel bakiyeleri al
    const updatedBalance = await redis.hgetall(balanceKey);

    return NextResponse.json({
      success: true,
      transaction: {
        id: txId,
        type,
        fromToken: fromToken.toUpperCase(),
        toToken: toToken.toUpperCase(),
        fromAmount,
        toAmount: parseFloat(toAmount.toFixed(6)),
        fee: parseFloat(fee.toFixed(4)),
        usedBonus,
        status: "completed",
      },
      balances: {
        auxm: parseFloat(updatedBalance?.auxm as string || "0"),
        bonusAuxm: parseFloat(updatedBalance?.bonusauxm as string || "0"),
        [toTokenLower]: parseFloat(updatedBalance?.[toTokenLower] as string || "0"),
      },
    });

  } catch (error) {
    console.error("Trade error:", error);
    return NextResponse.json({ error: "Trade failed" }, { status: 500 });
  }
}
