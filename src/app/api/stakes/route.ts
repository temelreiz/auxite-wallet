import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendStakingAgreementEmail } from "@/lib/email";

const METAL_NAMES: Record<string, string> = {
  AUXG: "Gold",
  AUXS: "Silver",
  AUXPT: "Platinum",
  AUXPD: "Palladium",
};

const TERM_LABELS: Record<number, string> = {
  91: "3 Months",
  181: "6 Months",
  366: "12 Months",
};

function generateAgreementNo(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `AUX-EARN-${year}-${random}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }
  try {
    const stakes = await redis.get(`stakes:${address.toLowerCase()}`);
    
    return NextResponse.json({
      success: true,
      stakes: stakes || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, metal, amount, duration, apy, email, holderName } = body;

  if (!address || !metal || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const key = `stakes:${address.toLowerCase()}`;
    const existingData = await redis.get(key);
    const existing = existingData ? (typeof existingData === "string" ? JSON.parse(existingData) : existingData) : [];
    const stakes = Array.isArray(existing) ? existing : [];
    
    const lockDays = duration || 91;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + lockDays);

    const stakeId = `STAKE_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const agreementNo = generateAgreementNo();
    const apyPercent = apy || "5.0";

    const newStake = {
      id: stakeId,
      agreementNo,
      metal,
      amount: parseFloat(amount).toFixed(4),
      duration: lockDays,
      apy: apyPercent,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "active",
      createdAt: new Date().toISOString(),
    };

    stakes.push(newStake);
    await redis.set(key, JSON.stringify(stakes));

    // Stake detaylarını ayrıca kaydet (agreement için)
    await redis.hset(`stake:${stakeId}`, {
      ...newStake,
      userAddress: address.toLowerCase(),
      userUid: address.substring(0, 12).toUpperCase(),
      holderUid: address.substring(0, 12).toUpperCase(),
    });

    console.log(`✅ Stake created: ${stakeId} - ${amount} ${metal} for ${lockDays} days`);

    // Email gönder (eğer email varsa)
    if (email) {
      try {
        await sendStakingAgreementEmail(email, "", {
          agreementNo,
          stakeId,
          metal,
          metalName: METAL_NAMES[metal] || metal,
          amount: parseFloat(amount).toFixed(4),
          termLabel: TERM_LABELS[lockDays] || `${lockDays} days`,
          apy: apyPercent,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          holderName: holderName || undefined,
        });
        console.log(`📧 Staking agreement email sent to ${email}`);
      } catch (emailErr: any) {
        console.error(`❌ Staking email failed:`, emailErr.message);
      }
    }

    return NextResponse.json({ 
      success: true, 
      stake: newStake,
      agreementNo,
      agreementUrl: `/api/staking/agreement?stakeId=${stakeId}`,
    });
  } catch (error: any) {
    console.error("Stake creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
