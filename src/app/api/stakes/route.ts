import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendStakingAgreementEmail } from "@/lib/email";
import { stakeOnChain, getUserStakesOnChain, checkDelegationApproval } from "@/lib/staking-service";

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
  3: "3 Months",
  6: "6 Months",
  12: "12 Months",
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
  const source = new URL(request.url).searchParams.get("source") || "hybrid";
  
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    // Get on-chain stakes
    let onChainStakes: any[] = [];
    if (source === "blockchain" || source === "hybrid") {
      try {
        onChainStakes = await getUserStakesOnChain(address);
      } catch (e) {
        console.error("On-chain stakes fetch error:", e);
      }
    }

    // Get Redis stakes (legacy/backup)
    let redisStakes: any[] = [];
    if (source === "redis" || source === "hybrid") {
      const key = `stakes:${address.toLowerCase()}`;
      const existingData = await redis.get(key);
      redisStakes = existingData ? (typeof existingData === "string" ? JSON.parse(existingData) : existingData) : [];
      if (!Array.isArray(redisStakes)) redisStakes = [];
    }

    // Merge stakes (on-chain takes priority)
    const allStakes = [...onChainStakes];
    
    // Add Redis stakes that aren't on-chain
    for (const rs of redisStakes) {
      const exists = onChainStakes.some(os => 
        os.stakeCode === rs.stakeCode || 
        (os.amount === parseFloat(rs.amount) && os.metal === rs.metal)
      );
      if (!exists) {
        allStakes.push({
          ...rs,
          source: "redis",
        });
      }
    }

    // Check delegation approval status for each metal
    const delegationStatus: Record<string, boolean> = {};
    for (const metal of ["AUXG", "AUXS", "AUXPT", "AUXPD"]) {
      delegationStatus[metal] = await checkDelegationApproval(address, metal);
    }

    return NextResponse.json({
      success: true,
      stakes: allStakes,
      delegationStatus,
      source,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, metal, amount, duration, apy, email, holderName, useOnChain = true } = body;

  if (!address || !metal || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const amountNum = parseFloat(amount);
    const durationMonths = duration === 91 ? 3 : duration === 181 ? 6 : duration === 366 ? 12 : duration;
    
    let stakeResult: any = null;
    let agreementNo = generateAgreementNo();
    let stakeId = `STAKE_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Try on-chain staking first
    if (useOnChain) {
      console.log(`🔄 Attempting on-chain stake: ${amountNum}g ${metal} for ${durationMonths} months`);
      
      stakeResult = await stakeOnChain(
        address,
        metal as "AUXG" | "AUXS" | "AUXPT" | "AUXPD",
        amountNum,
        durationMonths as 3 | 6 | 12,
        false, // compounding
        0 // allocationId
      );

      if (stakeResult.success) {
        console.log(`✅ On-chain stake successful: ${stakeResult.txHash}`);
        stakeId = stakeResult.shortCode || stakeResult.stakeCode || stakeId;
        agreementNo = stakeResult.shortCode || agreementNo;
      } else {
        console.log(`⚠️ On-chain stake failed: ${stakeResult.error}`);
        // If delegation not approved, return error with instructions
        if (stakeResult.error?.includes("delegation")) {
          return NextResponse.json({
            success: false,
            error: "Delegation not approved",
            message: "Please approve delegation in your wallet first. Call approveDelegation() on the token contract.",
            needsDelegation: true,
            metal,
          }, { status: 400 });
        }
        // Fall back to Redis for other errors
        console.log(`⚠️ Falling back to Redis stake`);
      }
    }

    // Save to Redis (either as backup or primary if on-chain failed)
    const key = `stakes:${address.toLowerCase()}`;
    const existingData = await redis.get(key);
    const existing = existingData ? (typeof existingData === "string" ? JSON.parse(existingData) : existingData) : [];
    const stakes = Array.isArray(existing) ? existing : [];

    const lockDays = durationMonths === 3 ? 91 : durationMonths === 6 ? 181 : 366;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + lockDays);

    const apyPercent = apy || "2.0";

    const newStake = {
      id: stakeId,
      agreementNo,
      metal,
      amount: amountNum.toFixed(4),
      duration: lockDays,
      durationMonths,
      apy: apyPercent,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: "active",
      createdAt: new Date().toISOString(),
      onChain: stakeResult?.success || false,
      txHash: stakeResult?.txHash || null,
      stakeCode: stakeResult?.stakeCode || null,
    };

    stakes.push(newStake);
    await redis.set(key, JSON.stringify(stakes));

    // Save stake details separately
    await redis.hset(`stake:${stakeId}`, {
      ...newStake,
      userAddress: address.toLowerCase(),
    });

    console.log(`✅ Stake saved: ${stakeId} - ${amount} ${metal} for ${lockDays} days (onChain: ${newStake.onChain})`);

    // Send email
    if (email) {
      try {
        await sendStakingAgreementEmail(email, "", {
          agreementNo,
          stakeId,
          metal,
          metalName: METAL_NAMES[metal] || metal,
          amount: amountNum.toFixed(4),
          termLabel: TERM_LABELS[lockDays] || TERM_LABELS[durationMonths] || `${lockDays} Days`,
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
      onChain: stakeResult?.success || false,
      txHash: stakeResult?.txHash || null,
      message: stakeResult?.success 
        ? "Stake created on-chain successfully" 
        : "Stake created (off-chain)",
    });
  } catch (error: any) {
    console.error("Stake creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
