import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"];

// Allocation'dan metal bakiyesini al
async function getAllocationBalance(address: string, metal: string): Promise<number> {
  try {
    const userUid = await redis.get(`user:address:${address.toLowerCase()}:uid`) as string;
    if (!userUid) return 0;
    
    const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
    if (!allocDataRaw) return 0;
    
    const allocations = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
    
    let total = 0;
    for (const alloc of allocations) {
      if (alloc.status === 'active' && alloc.metal?.toUpperCase() === metal.toUpperCase()) {
        total += parseFloat(alloc.grams) || 0;
      }
    }
    return total;
  } catch (error) {
    console.error('Error getting allocation balance:', error);
    return 0;
  }
}

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

    // Get current Redis balance
    const currentBalance = await redis.hgetall(balanceKey) || {};

    // Normalize asset names
    const fromKey = fromAsset.toLowerCase();
    const toKey = toAsset.toLowerCase();

    // Get balance based on asset type
    let currentFromBalance: number;
    const isSellingMetal = METALS.includes(fromKey);
    
    if (isSellingMetal) {
      // Metal satışı - allocation'dan bakiye kontrol et
      currentFromBalance = await getAllocationBalance(normalizedAddress, fromAsset);
      console.log(`📊 Metal balance from allocation: ${currentFromBalance}g ${fromAsset}`);
    } else {
      // Crypto/AUXM - Redis'ten bakiye kontrol et
      currentFromBalance = parseFloat(currentBalance[fromKey] as string || "0");
      console.log(`📊 Crypto balance from Redis: ${currentFromBalance} ${fromAsset}`);
    }

    // Check balance
    if (currentFromBalance < fromAmount) {
      return NextResponse.json({ 
        error: "Insufficient balance",
        required: fromAmount,
        available: currentFromBalance
      }, { status: 400 });
    }

    const baseUrl = request.headers.get('host') 
      ? `https://${request.headers.get('host')}` 
      : process.env.NEXT_PUBLIC_APP_URL || "https://wallet.auxite.io";

    let allocationInfo: { allocatedGrams?: number; nonAllocatedGrams?: number; certificateNumber?: string } = {};
    let releaseInfo: { releasedGrams?: number; metal?: string } = {};

    // If SELLING metal, release allocation
    if (isSellingMetal && fromAmount > 0) {
      try {
        // Get user's allocations to find one to release
        const userUid = await redis.get(`user:address:${normalizedAddress}:uid`) as string;
        if (userUid) {
          const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
          if (allocDataRaw) {
            const allocations = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
            
            // Find active allocations for this metal
            let remainingToRelease = fromAmount;
            const updatedAllocations = [];
            
            for (const alloc of allocations) {
              if (alloc.status === 'active' && alloc.metal?.toUpperCase() === fromAsset.toUpperCase() && remainingToRelease > 0) {
                const allocGrams = parseFloat(alloc.grams) || 0;
                
                if (allocGrams <= remainingToRelease) {
                  // Release entire allocation
                  updatedAllocations.push({
                    ...alloc,
                    status: 'released',
                    releasedAt: new Date().toISOString(),
                    releasedGrams: allocGrams,
                    releaseReason: 'SOLD',
                  });
                  remainingToRelease -= allocGrams;
                  console.log(`📤 Released full allocation: ${allocGrams}g ${fromAsset}`);
                } else {
                  // Partial release
                  updatedAllocations.push({
                    ...alloc,
                    grams: (allocGrams - remainingToRelease).toString(),
                  });
                  updatedAllocations.push({
                    ...alloc,
                    id: `${alloc.id}-released-${Date.now()}`,
                    grams: remainingToRelease.toString(),
                    status: 'released',
                    releasedAt: new Date().toISOString(),
                    releaseReason: 'SOLD',
                  });
                  console.log(`📤 Released partial allocation: ${remainingToRelease}g ${fromAsset}`);
                  remainingToRelease = 0;
                }
              } else {
                updatedAllocations.push(alloc);
              }
            }
            
            // Save updated allocations
            await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(updatedAllocations));
            releaseInfo = { releasedGrams: fromAmount, metal: fromAsset };
          }
        }
      } catch (releaseErr: any) {
        console.error("Allocation release failed:", releaseErr.message);
        return NextResponse.json({ error: "Failed to release allocation" }, { status: 500 });
      }
    } else if (!isSellingMetal) {
      // Deduct crypto/AUXM from Redis
      await redis.hincrbyfloat(balanceKey, fromKey, -fromAmount);
    }

    // If BUYING metal, create allocation
    if (METALS.includes(toKey) && toAmount > 0) {
      try {
        const allocRes = await fetch(`${baseUrl}/api/allocations`, {
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
        } else {
          console.error("Allocation failed:", allocData.error);
          // Fallback: Add to Redis if allocation fails
          await redis.hincrbyfloat(balanceKey, toKey, toAmount);
        }
      } catch (allocErr: any) {
        console.error("Auto-allocation failed:", allocErr.message);
        // Fallback: Add to Redis if allocation fails
        await redis.hincrbyfloat(balanceKey, toKey, toAmount);
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
      release: releaseInfo.releasedGrams ? releaseInfo : undefined,
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
        release: releaseInfo,
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
