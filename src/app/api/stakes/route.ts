import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendStakingAgreementEmail } from "@/lib/email";
import { getUserStakesOnChain, checkDelegationApproval } from "@/lib/staking-service";
import { openStake, readPositions, type StakePosition } from "@/lib/staking/ledger";
import { getUserLanguage } from "@/lib/user-language";
import { recordExposureChange, METALS, type MetalSymbol } from "@/lib/treasury-exposure";
import { requireUser } from "@/lib/security/require-user";
import { assertAccountActive } from "@/lib/security/account-guard";

const METAL_NAMES: Record<string, string> = {
  AUXG: "Gold",
  AUXS: "Silver",
  AUXPT: "Platinum",
  AUXPD: "Palladium",
  AUXR: "Auxite Reserve",
};

/** Ledger position → the shape the web app has always read from this route. */
function toLegacyShape(p: StakePosition, documentLanguage?: string) {
  return {
    id: p.id,
    agreementNo: p.agreementNo || p.id,
    metal: p.metal.toUpperCase(),
    amount: Number(p.amount).toFixed(4),
    duration: p.duration,
    durationMonths: p.durationMonths || Math.round(p.duration / 30),
    apy: Number(p.apy).toFixed(2),
    startDate: new Date(p.startDate).toISOString(),
    endDate: new Date(p.endDate).toISOString(),
    status: p.status,
    createdAt: new Date(p.startDate).toISOString(),
    onChain: false,
    txHash: null,
    stakeCode: null,
    ...(documentLanguage ? { document_language: documentLanguage } : {}),
    source: "ledger",
  };
}

// Helper: Get user email from Redis (same pattern as transfer/withdraw)
async function getUserEmail(address: string): Promise<{ email?: string; name?: string }> {
  const normalizedAddress = address.toLowerCase();
  const userId = await redis.get(`user:address:${normalizedAddress}`);
  if (userId) {
    const userData = await redis.hgetall(`user:${userId}`);
    return { email: userData?.email as string, name: userData?.name as string || undefined };
  }
  // Fallback for legacy format
  const directUserData = await redis.hgetall(`user:${normalizedAddress}`);
  return { email: directUserData?.email as string, name: directUserData?.name as string || undefined };
}

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
  const auth = requireUser(request);
  if (!auth.ok) return auth.response;

  const address = auth.user.address;
  const source = new URL(request.url).searchParams.get("source") || "hybrid";

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

    // Merge stakes (on-chain takes priority), then the ledger's positions.
    const allStakes: any[] = [...onChainStakes];
    if (source === "redis" || source === "hybrid") {
      for (const p of await readPositions(address)) allStakes.push(toLegacyShape(p));
    }
    
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
  // This route calls stakeOnChain, which moves real tokens. Taking the address
  // from the body meant an unauthenticated caller could stake someone else's
  // metal on chain.
  const auth = requireUser(request);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const { metal, amount, duration, apy, email, holderName, useOnChain = true } = body;
  const address = auth.user.address;

  if (!metal || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const gate = await assertAccountActive(address);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error, code: gate.code }, { status: 403 });
  }

  try {
    const amountNum = parseFloat(amount);
    const agreementNo = generateAgreementNo();

    // The custody stake goes through the staking ledger. It used to try a
    // server-side on-chain stake against the retired V8 tokens (which custody
    // accounts never hold) and then fall back to a Redis record that took its
    // APY from this request's body and never locked the metal — so the same
    // grams could be staked and still sold. The ledger sets the rate itself,
    // locks metals through the yielding encumbrance, and debits AUXR.
    const opened = await openStake({ address, asset: metal, amount: amountNum, duration: Number(duration), agreementNo });
    if (!opened.ok) {
      const { ok: _ok, status, ...rest } = opened;
      return NextResponse.json({ success: false, ...rest }, { status });
    }
    const position = opened.position;
    const stakeId = position.id;
    const durationMonths = position.durationMonths;
    const lockDays = position.duration;
    const apyPercent = position.apy.toFixed(2);
    const startDate = new Date(position.startDate);
    const endDate = new Date(position.endDate);

    // Language lock: capture client language at agreement creation (immutable legal artifact)
    const documentLanguage = await getUserLanguage(address.toLowerCase());

    const newStake = toLegacyShape(position, documentLanguage);

    // Participation-note details (read by /api/staking/agreement).
    await redis.hset(`stake:${stakeId}`, {
      ...newStake,
      userAddress: address.toLowerCase(),
    });

    // Treasury exposure ledger — record the lock so Phase 2 hedge engine and
    // /api/admin/treasury/exposure can see it. Best-effort; never block the
    // stake creation if the ledger write itself fails.
    if (METALS.includes(String(metal).toUpperCase() as MetalSymbol)) try {
      await recordExposureChange({
        metal: String(metal).toUpperCase() as MetalSymbol,
        type: "stake",
        amount: amountNum,
        refId: stakeId,
        walletAddress: address,
        reason: `stake-create:${durationMonths}m:apy=${apyPercent}`,
      });
    } catch (expErr: any) {
      console.warn(`[treasury] exposure record failed (non-fatal):`, expErr?.message);
    }

    console.log(`✅ Stake saved: ${stakeId} - ${amount} ${metal} for ${lockDays} days`);

    // Send email — auto-retrieve from Redis if not provided in body
    let userEmail = email;
    let userName = holderName;
    if (!userEmail) {
      try {
        const userInfo = await getUserEmail(address);
        userEmail = userInfo.email;
        if (!userName) userName = userInfo.name;
      } catch (e) {
        console.warn('Could not retrieve user email from Redis:', e);
      }
    }

    if (userEmail) {
      try {
        const stakeLang = await getUserLanguage(address.toLowerCase());
        await sendStakingAgreementEmail(userEmail, "", {
          agreementNo,
          stakeId,
          metal,
          metalName: METAL_NAMES[metal] || metal,
          amount: amountNum.toFixed(4),
          termLabel: TERM_LABELS[lockDays] || TERM_LABELS[durationMonths] || `${lockDays} Days`,
          apy: apyPercent,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          holderName: userName || undefined,
          language: stakeLang,
        });
        console.log(`📧 Staking agreement email sent to ${userEmail}`);
      } catch (emailErr: any) {
        console.error(`❌ Staking email failed:`, emailErr.message);
      }
    } else {
      console.warn(`⚠️ No email found for ${address} — staking agreement email skipped`);
    }

    // Push notification (non-blocking)
    const { notifyTransactionRich } = await import('@/lib/notification-sender');
    notifyTransactionRich(address.toLowerCase(), {
      type: 'stake', amount: amountNum, token: metal.toUpperCase(),
      apy: String(apyPercent), duration: `${durationMonths || Math.round(lockDays / 30)}m`,
      channel: 'default',
    }).catch(err => console.error('[Push] stake notification error:', err));

    return NextResponse.json({
      success: true,
      stake: newStake,
      agreementNo,
      onChain: false,
      txHash: null,
      message: "Stake created",
    });
  } catch (error: any) {
    console.error("Stake creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
