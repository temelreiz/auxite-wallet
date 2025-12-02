import { NextRequest, NextResponse } from "next/server";

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

// Mock deposits (test için)
const MOCK_DEPOSITS: Deposit[] = [
  {
    id: "dep_001",
    chain: "BASE",
    coin: "ETH",
    amount: 0.1,
    amountUsd: 300,
    auxmAmount: 300,
    bonusAmount: 6,
    bonusPercent: 2,
    totalAuxm: 306,
    txHash: "0x2eb99ad0b38f9613d7c422674cae82af96543bd98aebe2070a8559754deaa5c7",
    fromAddress: "0xC7AF91293dC7dF3DdF0bF0dDD14AaA96aE63BD4E",
    toAddress: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
    status: "confirmed",
    confirmations: 50,
    requiredConfirmations: 12,
    createdAt: "2024-12-01T10:30:00Z",
    confirmedAt: "2024-12-01T10:35:00Z",
  },
  {
    id: "dep_002",
    chain: "ETH",
    coin: "ETH",
    amount: 0.5,
    amountUsd: 1500,
    auxmAmount: 1500,
    bonusAmount: 30,
    bonusPercent: 2,
    totalAuxm: 1530,
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    fromAddress: "0xABC123...",
    toAddress: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
    status: "confirmed",
    confirmations: 100,
    requiredConfirmations: 12,
    createdAt: "2024-11-30T15:20:00Z",
    confirmedAt: "2024-11-30T15:25:00Z",
  },
];

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
    let deposits = [...MOCK_DEPOSITS];

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

    // TODO: Redis'e kaydet
    // await redis.hset(`deposit:${depositId}`, deposit);
    // await redis.lpush(`user:${userAddress.toLowerCase()}:deposits`, depositId);
    // 
    // if (deposit.status === "confirmed") {
    //   await redis.hincrbyfloat(`user:${userAddress.toLowerCase()}`, "AUXM", totalAuxm);
    // }

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
