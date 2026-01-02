import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"];

export async function POST(request: NextRequest) {
  try {
    const { fromAsset, toAsset, fromAmount, toAmount, address } = await request.json();

    if (!fromAsset || !toAsset || !fromAmount || !toAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    // Get current balance
    const currentBalance = await redis.hgetall(balanceKey);
    if (!currentBalance) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Normalize asset names for Redis keys
    const fromKey = fromAsset.toLowerCase();
    const toKey = toAsset.toLowerCase();

    const currentFromBalance = parseFloat(currentBalance[fromKey] as string || "0");

    // Check balance
    if (currentFromBalance < fromAmount) {
      return NextResponse.json({ 
        error: "Insufficient balance",
        required: fromAmount,
        available: currentFromBalance
      }, { status: 400 });
    }

    // Deduct from balance
    await redis.hincrbyfloat(balanceKey, fromKey, -fromAmount);

    let allocationInfo: { allocatedGrams?: number; nonAllocatedGrams?: number; certificateNumber?: string } = {};

    // If buying metal, create allocation
    if (METALS.includes(toKey) && toAmount > 0) {
      try {
        const allocRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://auxite-wallet.vercel.app"}/api/allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: normalizedAddress,
            metal: toAsset.toUpperCase(),
            grams: toAmount,
          }),
        });
        const allocData = await allocRes.json();
        console.log("📦 Allocation response:", JSON.stringify(allocData));
        
        if (allocData.success) {
          allocationInfo = {
            allocatedGrams: allocData.allocatedGrams,
            nonAllocatedGrams: allocData.nonAllocatedGrams,
            certificateNumber: allocData.certificateNumber,
          };
          console.log(`📜 Certificate issued: ${allocData.certificateNumber}`);
        }
      } catch (allocErr: any) {
        console.error("Auto-allocation failed:", allocErr.message);
        // Still continue - just won't have allocation
      }
    } else {
      // Non-metal: just add to Redis balance
      await redis.hincrbyfloat(balanceKey, toKey, toAmount);
    }

    // Get updated balance
    const updatedBalance = await redis.hgetall(balanceKey);

    // Log transaction
    const txKey = `user:${normalizedAddress}:transactions`;
    const transaction = {
      id: `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "exchange",
      fromToken: fromAsset,
      toToken: toAsset,
      fromAmount: fromAmount.toString(),
      toAmount: toAmount.toString(),
      allocation: allocationInfo.allocatedGrams ? allocationInfo : undefined,
      status: "completed",
      timestamp: Date.now(),
    };
    await redis.lpush(txKey, JSON.stringify(transaction));

    return NextResponse.json({
      success: true,
      exchange: {
        fromAsset,
        toAsset,
        fromAmount,
        toAmount,
        allocation: allocationInfo,
      },
      balances: {
        [fromKey]: parseFloat(updatedBalance?.[fromKey] as string || "0"),
        [toKey]: parseFloat(updatedBalance?.[toKey] as string || "0"),
      },
    });

  } catch (error: any) {
    console.error("Exchange error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
