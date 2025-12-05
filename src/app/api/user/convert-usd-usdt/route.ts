// src/app/api/user/convert-usd-usdt/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserBalance, incrementBalance, addTransaction } from "@/lib/redis";

export async function POST(request: NextRequest) {
  try {
    const address = request.headers.get("x-wallet-address");

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Wallet address required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { direction, amount, usdtPrice = 1 } = body;

    if (!direction || !["usd-to-usdt", "usdt-to-usd"].includes(direction)) {
      return NextResponse.json(
        { success: false, error: "Invalid direction" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount < 1) {
      return NextResponse.json(
        { success: false, error: "Minimum amount is $1" },
        { status: 400 }
      );
    }

    const balance = await getUserBalance(address);
    const isUsdToUsdt = direction === "usd-to-usdt";

    if (isUsdToUsdt && balance.usd < amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient USD balance" },
        { status: 400 }
      );
    }

    if (!isUsdToUsdt && balance.usdt < amount) {
      return NextResponse.json(
        { success: false, error: "Insufficient USDT balance" },
        { status: 400 }
      );
    }

    const feePercent = 0.001;
    let outputAmount: number;

    if (isUsdToUsdt) {
      outputAmount = (amount / usdtPrice) * (1 - feePercent);
      await incrementBalance(address, {
        usd: -amount,
        usdt: outputAmount,
      });
    } else {
      outputAmount = (amount * usdtPrice) * (1 - feePercent);
      await incrementBalance(address, {
        usdt: -amount,
        usd: outputAmount,
      });
    }

    await addTransaction(address, {
      type: "swap",
      fromToken: isUsdToUsdt ? "usd" : "usdt",
      toToken: isUsdToUsdt ? "usdt" : "usd",
      fromAmount: amount,
      toAmount: outputAmount,
      status: "completed",
      metadata: { usdtPrice, fee: feePercent },
    });

    const updatedBalance = await getUserBalance(address);

    return NextResponse.json({
      success: true,
      data: {
        direction,
        spent: amount,
        received: outputAmount,
        newBalances: {
          usd: updatedBalance.usd,
          usdt: updatedBalance.usdt,
        },
      },
    });
  } catch (error) {
    console.error("USD-USDT convert error:", error);
    return NextResponse.json(
      { success: false, error: "Conversion failed" },
      { status: 500 }
    );
  }
}