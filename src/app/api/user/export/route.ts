import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// GET - Export all user data (profile, balances, transactions, allocations, stakes)
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Get UID for allocation lookup
    const uid = await redis.get(`user:address:${normalizedAddress}`) as string | null;

    // Fetch all data in parallel
    const [
      profileData,
      balanceData,
      transactionsData,
      allocationsData,
      stakesData,
    ] = await Promise.all([
      // 1. Profile data
      redis.hgetall(`user:${uid || normalizedAddress}`),

      // 2. Balance data
      redis.hgetall(`user:${normalizedAddress}:balance`),

      // 3. Transaction history (last 100)
      redis.lrange(`user:${uid || normalizedAddress}:transactions`, 0, 99),

      // 4. Allocations
      uid ? redis.get(`allocation:user:${uid}:list`) : Promise.resolve(null),

      // 5. Stakes (from Redis if exists)
      redis.lrange(`user:${uid || normalizedAddress}:stakes`, 0, -1),
    ]);

    // Parse transactions
    const transactions = (transactionsData || []).map((tx: string) => {
      try {
        return JSON.parse(tx);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Parse allocations
    let allocations: any[] = [];
    if (allocationsData) {
      try {
        allocations = typeof allocationsData === "string"
          ? JSON.parse(allocationsData)
          : allocationsData;
      } catch {
        allocations = [];
      }
    }

    // Parse stakes
    const stakes = (stakesData || []).map((stake: string) => {
      try {
        return JSON.parse(stake);
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Calculate totals
    const balance = balanceData || {};
    const totalAllocatedByMetal: Record<string, number> = {};

    allocations.forEach((alloc: any) => {
      if (alloc.status === "active") {
        const metal = alloc.metal || alloc.metalSymbol;
        totalAllocatedByMetal[metal] = (totalAllocatedByMetal[metal] || 0) + (alloc.grams || 0);
      }
    });

    // Build export data
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        walletAddress: address,
        uid: uid || null,
      },

      profile: {
        email: (profileData as any)?.email || null,
        phone: (profileData as any)?.phone || null,
        country: (profileData as any)?.country || null,
        timezone: (profileData as any)?.timezone || null,
        walletType: (profileData as any)?.walletType || "external",
        createdAt: (profileData as any)?.createdAt || null,
      },

      balances: {
        auxm: parseFloat(String(balance.auxm || 0)),
        bonusAuxm: parseFloat(String(balance.bonusauxm || balance.bonusAuxm || 0)),
        eth: parseFloat(String(balance.eth || 0)),
        btc: parseFloat(String(balance.btc || 0)),
        usdt: parseFloat(String(balance.usdt || 0)),
        auxg: parseFloat(String(balance.auxg || 0)),
        auxs: parseFloat(String(balance.auxs || 0)),
        auxpt: parseFloat(String(balance.auxpt || 0)),
        auxpd: parseFloat(String(balance.auxpd || 0)),
      },

      allocations: {
        summary: {
          totalAllocations: allocations.length,
          activeAllocations: allocations.filter((a: any) => a.status === "active").length,
          releasedAllocations: allocations.filter((a: any) => a.status === "released").length,
          totalAllocatedGrams: totalAllocatedByMetal,
        },
        details: allocations.map((alloc: any) => ({
          id: alloc.id,
          metal: alloc.metal || alloc.metalSymbol,
          grams: alloc.grams,
          status: alloc.status,
          serialNumber: alloc.serialNumber,
          certificateNumber: alloc.certificateNumber,
          vaultId: alloc.vaultId,
          createdAt: alloc.createdAt || alloc.timestamp,
        })),
      },

      stakes: {
        summary: {
          totalStakes: stakes.length,
          activeStakes: stakes.filter((s: any) => s.active).length,
        },
        details: stakes.map((stake: any) => ({
          id: stake.id,
          metal: stake.metal || stake.metalId,
          amount: stake.amount,
          startTime: stake.startTime,
          endTime: stake.endTime,
          duration: stake.duration,
          apyPercent: stake.apyBps ? stake.apyBps / 100 : stake.apy,
          expectedReward: stake.expectedReward,
          claimedReward: stake.claimedReward,
          active: stake.active,
          compounding: stake.compounding,
        })),
      },

      transactions: {
        summary: {
          totalTransactions: transactions.length,
          byType: transactions.reduce((acc: Record<string, number>, tx: any) => {
            acc[tx.type] = (acc[tx.type] || 0) + 1;
            return acc;
          }, {}),
        },
        details: transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.type,
          token: tx.token,
          fromToken: tx.fromToken,
          toToken: tx.toToken,
          amount: tx.amount,
          fromAmount: tx.fromAmount,
          toAmount: tx.toAmount,
          status: tx.status,
          txHash: tx.txHash || tx.hash,
          timestamp: tx.timestamp,
          date: tx.timestamp ? new Date(tx.timestamp).toISOString() : null,
        })),
      },
    };

    return NextResponse.json({
      success: true,
      data: exportData,
    });

  } catch (error: any) {
    console.error("Export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
