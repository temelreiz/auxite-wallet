import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendDepositConfirmedEmail } from "@/lib/email-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface DepositRequest {
  address: string;
  coin: string;
  amount: number;
  convertToAuxm?: boolean;
  txHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DepositRequest = await request.json();
    const { address, coin, amount, convertToAuxm = false, txHash } = body;

    if (!address || !coin || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;
    const coinLower = coin.toLowerCase();

    // Crypto fiyatını al
    let cryptoPrice = 1;
    try {
      const priceRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crypto`);
      const priceData = await priceRes.json();
      const coinMap: Record<string, string> = {
        btc: 'bitcoin', eth: 'ethereum', xrp: 'ripple', sol: 'solana', usdt: 'tether'
      };
      cryptoPrice = priceData[coinMap[coinLower]]?.usd || 1;
    } catch {
      const fallback: Record<string, number> = { usdt: 1, btc: 95000, eth: 3500, xrp: 2.2, sol: 200 };
      cryptoPrice = fallback[coinLower] || 1;
    }

    const amountUsd = amount * cryptoPrice;
    const txId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let transaction: any;
    let resultData: any;

    if (convertToAuxm) {
      // AUXM'e çevir + bonus
      const bonusPercent = amountUsd >= 10000 ? 15 : amountUsd >= 5000 ? 12 : amountUsd >= 1000 ? 10 : amountUsd >= 100 ? 5 : 0;
      const bonusAmount = amountUsd * (bonusPercent / 100);

      await redis.hincrbyfloat(balanceKey, "auxm", amountUsd);
      if (bonusAmount > 0) {
        await redis.hincrbyfloat(balanceKey, "bonusauxm", bonusAmount);
      }

      transaction = {
        id: txId,
        type: "deposit",
        token: coin.toUpperCase(),
        amount: amount.toString(),
        amountUsd: amountUsd.toFixed(2),
        convertedTo: "AUXM",
        auxmReceived: amountUsd.toFixed(2),
        bonusReceived: bonusAmount.toFixed(2),
        bonusPercent,
        txHash: txHash || null,
        status: "completed",
        timestamp: Date.now(),
      };

      resultData = {
        converted: true,
        auxmReceived: amountUsd,
        bonusReceived: bonusAmount,
        bonusPercent,
        totalReceived: amountUsd + bonusAmount,
      };
    } else {
      // Crypto olarak tut
      await redis.hincrbyfloat(balanceKey, coinLower, amount);

      transaction = {
        id: txId,
        type: "deposit",
        token: coin.toUpperCase(),
        amount: amount.toString(),
        amountUsd: amountUsd.toFixed(2),
        convertedTo: null,
        txHash: txHash || null,
        status: "completed",
        timestamp: Date.now(),
      };

      resultData = {
        converted: false,
        coinReceived: amount,
        coin: coin.toUpperCase(),
        valueUsd: amountUsd,
      };
    }

    // Transaction kaydet
    const txKey = `user:${normalizedAddress}:transactions`;
    await redis.lpush(txKey, JSON.stringify(transaction));

    // Deposit Confirmation Email
    try {
      const userData = await redis.hgetall(`user:${normalizedAddress}`) as Record<string, string> | null;
      if (userData?.email) {
        const emailAmount = convertToAuxm ? amountUsd.toFixed(2) : amount.toString();
        const emailToken = convertToAuxm ? 'AUXM' : coin.toUpperCase();
        sendDepositConfirmedEmail(
          userData.email,
          userData.name || 'Client',
          emailAmount,
          emailToken,
          txHash || undefined,
          userData.language || 'en'
        ).catch((err: any) => console.error('Deposit email error:', err));
      }
    } catch (emailErr) {
      console.error('Deposit email lookup error:', emailErr);
    }

    // Güncel bakiye
    const updatedBalance = await redis.hgetall(balanceKey);

    return NextResponse.json({
      success: true,
      deposit: {
        id: txId,
        coin: coin.toUpperCase(),
        amount,
        amountUsd,
        ...resultData,
        status: "completed",
      },
      balances: updatedBalance,
    });

  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json({ error: "Deposit failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get("coin");

  const addresses: Record<string, { address: string; network: string; memo?: string }> = {
    BTC: { address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", network: "Bitcoin" },
    ETH: { address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", network: "Ethereum / Base" },
    XRP: { address: "r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae", network: "XRP Ledger", memo: "123456" },
    SOL: { address: "6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe", network: "Solana" },
    USDT: { address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", network: "Ethereum / Tron" },
  };

  if (coin && addresses[coin]) {
    return NextResponse.json({ success: true, ...addresses[coin] });
  }
  return NextResponse.json({ success: true, addresses });
}
