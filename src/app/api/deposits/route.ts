import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ===========================================
// AUXM BONUS CALCULATION (inline for API)
// ===========================================

const CAMPAIGN_CONFIG = {
  launch: {
    enabled: true,
    bonusPercent: 2.0,
    startDate: new Date("2024-12-01T00:00:00Z"),
    endDate: new Date("2025-01-01T00:00:00Z"),
  },
  tiers: [
    { minAmount: 0,     maxAmount: 99.99,   bonusPercent: 0 },
    { minAmount: 100,   maxAmount: 999.99,  bonusPercent: 0.5 },
    { minAmount: 1000,  maxAmount: 4999.99, bonusPercent: 0.8 },
    { minAmount: 5000,  maxAmount: 9999.99, bonusPercent: 1.0 },
    { minAmount: 10000, maxAmount: Infinity, bonusPercent: 1.5 },
  ],
  minDepositForBonus: 100,
};

function isLaunchCampaignActive(): boolean {
  if (!CAMPAIGN_CONFIG.launch.enabled) return false;
  const now = new Date();
  return now >= CAMPAIGN_CONFIG.launch.startDate && now <= CAMPAIGN_CONFIG.launch.endDate;
}

function calculateBonus(amountUsd: number): { bonusPercent: number; bonusAmount: number; totalAuxm: number } {
  if (amountUsd < CAMPAIGN_CONFIG.minDepositForBonus) {
    return { bonusPercent: 0, bonusAmount: 0, totalAuxm: amountUsd };
  }

  let bonusPercent: number;

  if (isLaunchCampaignActive()) {
    bonusPercent = CAMPAIGN_CONFIG.launch.bonusPercent;
  } else {
    const tier = CAMPAIGN_CONFIG.tiers.find(
      t => amountUsd >= t.minAmount && amountUsd <= t.maxAmount
    );
    bonusPercent = tier?.bonusPercent || 0;
  }

  const bonusAmount = (amountUsd * bonusPercent) / 100;
  const totalAuxm = amountUsd + bonusAmount;

  return { bonusPercent, bonusAmount, totalAuxm };
}

// ===========================================
// API ROUTES
// ===========================================

interface Deposit {
  id: string;
  chain: string;
  coin: string;
  amount: number;
  amountUsd: number;
  auxmAmount: number;
  bonusAmount: number;
  bonusPercent: number;
  totalAuxm: number;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  status: "pending" | "confirmed" | "failed";
  confirmations: number;
  requiredConfirmations: number;
  createdAt: string;
  confirmedAt?: string;
}

// Helper function to get deposits from Redis
async function getUserDeposits(address: string): Promise<Deposit[]> {
  try {
    const normalizedAddress = address.toLowerCase();
    const depositIds = await redis.lrange(`user:${normalizedAddress}:deposits`, 0, -1);

    if (!depositIds || depositIds.length === 0) {
      return [];
    }

    const deposits: Deposit[] = [];
    for (const id of depositIds) {
      const depositData = await redis.hgetall(`deposit:${id}`);
      if (depositData && Object.keys(depositData).length > 0) {
        deposits.push({
          id: String(id),
          chain: String(depositData.chain || 'ETH'),
          coin: String(depositData.coin || 'ETH'),
          amount: parseFloat(String(depositData.amount || 0)),
          amountUsd: parseFloat(String(depositData.amountUsd || 0)),
          auxmAmount: parseFloat(String(depositData.auxmAmount || 0)),
          bonusAmount: parseFloat(String(depositData.bonusAmount || 0)),
          bonusPercent: parseFloat(String(depositData.bonusPercent || 0)),
          totalAuxm: parseFloat(String(depositData.totalAuxm || 0)),
          txHash: String(depositData.txHash || ''),
          fromAddress: String(depositData.fromAddress || ''),
          toAddress: String(depositData.toAddress || ''),
          status: (depositData.status as "pending" | "confirmed" | "failed") || 'pending',
          confirmations: parseInt(String(depositData.confirmations || 0)),
          requiredConfirmations: parseInt(String(depositData.requiredConfirmations || 12)),
          createdAt: String(depositData.createdAt || new Date().toISOString()),
          confirmedAt: depositData.confirmedAt ? String(depositData.confirmedAt) : undefined,
        });
      }
    }

    // Sort by creation date (newest first)
    deposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return deposits;
  } catch (error) {
    console.error('Error fetching deposits from Redis:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const status = searchParams.get("status");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Get real deposits from Redis
    let deposits = await getUserDeposits(address);

    if (status) {
      deposits = deposits.filter(d => d.status === status);
    }

    const paginatedDeposits = deposits.slice(offset, offset + limit);

    // Toplam hesaplamalar
    const confirmedDeposits = deposits.filter(d => d.status === "confirmed");
    const totalAuxm = confirmedDeposits.reduce((sum, d) => sum + d.totalAuxm, 0);
    const totalBonus = confirmedDeposits.reduce((sum, d) => sum + d.bonusAmount, 0);

    return NextResponse.json({
      address: address.toLowerCase(),
      deposits: paginatedDeposits,
      pagination: {
        total: deposits.length,
        limit,
        offset,
        hasMore: offset + limit < deposits.length,
      },
      summary: {
        totalDeposits: deposits.length,
        confirmedDeposits: confirmedDeposits.length,
        pendingDeposits: deposits.filter(d => d.status === "pending").length,
        totalAuxmReceived: totalAuxm,
        totalBonusReceived: totalBonus,
      },
      campaign: {
        isLaunchActive: isLaunchCampaignActive(),
        currentBonusPercent: isLaunchCampaignActive() ? CAMPAIGN_CONFIG.launch.bonusPercent : null,
      },
    });

  } catch (error) {
    console.error("Deposits fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch deposits" },
      { status: 500 }
    );
  }
}

// Watcher'dan deposit bildirimi
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.WATCHER_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      chain,
      coin,
      amount,
      amountUsd,
      txHash,
      fromAddress,
      toAddress,
      userAddress,
      confirmations,
      requiredConfirmations,
    } = body;

    if (!chain || !coin || !amount || !txHash || !userAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Bonus hesapla
    const { bonusPercent, bonusAmount, totalAuxm } = calculateBonus(amountUsd);

    const depositId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const deposit: Deposit = {
      id: depositId,
      chain,
      coin,
      amount,
      amountUsd: amountUsd || amount * 3000,
      auxmAmount: amountUsd,
      bonusAmount,
      bonusPercent,
      totalAuxm,
      txHash,
      fromAddress,
      toAddress,
      status: confirmations >= requiredConfirmations ? "confirmed" : "pending",
      confirmations: confirmations || 0,
      requiredConfirmations: requiredConfirmations || 12,
      createdAt: new Date().toISOString(),
    };

    if (deposit.status === "confirmed") {
      deposit.confirmedAt = new Date().toISOString();
    }

    // Save deposit to Redis
    const normalizedUserAddress = userAddress.toLowerCase();

    await redis.hset(`deposit:${depositId}`, {
      ...deposit,
      userAddress: normalizedUserAddress,
    });
    await redis.lpush(`user:${normalizedUserAddress}:deposits`, depositId);

    // If deposit is confirmed, credit AUXM to user balance
    if (deposit.status === "confirmed") {
      // Credit base AUXM amount
      await redis.hincrbyfloat(`user:${normalizedUserAddress}`, "auxm", amountUsd);

      // Credit bonus AUXM if applicable
      if (bonusAmount > 0) {
        await redis.hincrbyfloat(`user:${normalizedUserAddress}`, "bonusauxm", bonusAmount);
      }

      // Update totalAuxm
      const currentAuxm = parseFloat(String(await redis.hget(`user:${normalizedUserAddress}`, "auxm") || 0));
      const currentBonus = parseFloat(String(await redis.hget(`user:${normalizedUserAddress}`, "bonusauxm") || 0));
      await redis.hset(`user:${normalizedUserAddress}`, { totalAuxm: currentAuxm + currentBonus });

      // Record transaction
      const transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "deposit",
        coin: coin,
        amount: amount,
        amountUsd: amountUsd,
        status: "completed",
        txHash: txHash,
        fromAddress: fromAddress,
        toAddress: toAddress,
        metadata: {
          chain,
          bonusAmount,
          bonusPercent,
          depositId,
        },
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };
      await redis.lpush(`user:${normalizedUserAddress}:transactions`, JSON.stringify(transaction));
    }

    console.log("Deposit recorded with bonus:", deposit);

    return NextResponse.json({
      success: true,
      deposit,
      bonus: {
        percent: bonusPercent,
        amount: bonusAmount,
        isLaunchCampaign: isLaunchCampaignActive(),
      },
      message: deposit.status === "confirmed" 
        ? `Deposit confirmed! ${totalAuxm.toFixed(2)} AUXM credited (including ${bonusAmount.toFixed(2)} bonus).`
        : `Deposit pending. ${confirmations}/${requiredConfirmations} confirmations.`,
    });

  } catch (error) {
    console.error("Deposit record error:", error);
    return NextResponse.json(
      { error: "Failed to record deposit" },
      { status: 500 }
    );
  }
}
