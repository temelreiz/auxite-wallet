// app/api/referral/route.ts
// Referral System - Referans kodları ve komisyon yönetimi

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

import { requireUser } from "@/lib/security/require-user";
import { incrementBalance } from "@/lib/redis";

const redis = Redis.fromEnv();

interface ReferralCode {
  code: string;
  ownerAddress: string;
  createdAt: number;
  usageCount: number;
  totalEarnings: number;
  isActive: boolean;
}

interface ReferralUsage {
  id: string;
  code: string;
  referrerAddress: string;
  referredAddress: string;
  usedAt: number;
  status: "pending" | "qualified" | "rewarded";
  firstTradeAt?: number;
  firstTradeAmount?: number;
  rewardAmount?: number;
  rewardPaidAt?: number;
}

interface ReferralStats {
  code: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  commissionRate: number;
}

// Komisyon oranları (tier bazlı)
const COMMISSION_TIERS = {
  bronze: { minReferrals: 0, rate: 0.10 },    // %10
  silver: { minReferrals: 10, rate: 0.15 },   // %15
  gold: { minReferrals: 50, rate: 0.20 },     // %20
  platinum: { minReferrals: 100, rate: 0.25 }, // %25
};

// Minimum trade amount for referral to qualify ($50)
const MIN_TRADE_AMOUNT = 50;

// Referral bonus amount ($10 AUXM for both)
const REFERRAL_BONUS = 10;

// Kod oluşturma helper
function generateReferralCode(address: string): string {
  const prefix = address.slice(2, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}

// Tier hesaplama helper
function calculateTier(qualifiedCount: number): { tier: string; rate: number } {
  if (qualifiedCount >= COMMISSION_TIERS.platinum.minReferrals) {
    return { tier: "platinum", rate: COMMISSION_TIERS.platinum.rate };
  }
  if (qualifiedCount >= COMMISSION_TIERS.gold.minReferrals) {
    return { tier: "gold", rate: COMMISSION_TIERS.gold.rate };
  }
  if (qualifiedCount >= COMMISSION_TIERS.silver.minReferrals) {
    return { tier: "silver", rate: COMMISSION_TIERS.silver.rate };
  }
  return { tier: "bronze", rate: COMMISSION_TIERS.bronze.rate };
}

// GET - Referral bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");
    const code = searchParams.get("code");
    const action = searchParams.get("action");

    // Kod doğrulama (başka kullanıcı için)
    if (action === "validate" && code) {
      const codeKey = `referral-code:${code.toUpperCase()}`;
      const referralCode = await redis.get(codeKey) as ReferralCode | null;

      if (!referralCode || !referralCode.isActive) {
        return NextResponse.json({
          valid: false,
          error: "Invalid or inactive referral code",
        });
      }

      return NextResponse.json({
        valid: true,
        code: referralCode.code,
        ownerAddress: referralCode.ownerAddress.slice(0, 6) + "..." + referralCode.ownerAddress.slice(-4),
      });
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const addressLower = walletAddress.toLowerCase();

    // Kullanıcının referral kodunu al
    const userCodeKey = `user-referral:${addressLower}`;
    let userCode = await redis.get(userCodeKey) as string | null;

    // Yoksa oluştur
    if (!userCode) {
      userCode = generateReferralCode(walletAddress);
      const referralCode: ReferralCode = {
        code: userCode,
        ownerAddress: addressLower,
        createdAt: Date.now(),
        usageCount: 0,
        totalEarnings: 0,
        isActive: true,
      };

      await redis.set(userCodeKey, userCode);
      await redis.set(`referral-code:${userCode}`, JSON.stringify(referralCode));
    }

    // Referral istatistiklerini al
    const codeDataKey = `referral-code:${userCode}`;
    const codeData = await redis.get(codeDataKey) as ReferralCode | null;

    // Referral listesini al
    const referralsKey = `referrals:${userCode}`;
    const referrals = await redis.lrange(referralsKey, 0, -1) as ReferralUsage[];

    const qualifiedCount = referrals?.filter((r) => r.status === "qualified" || r.status === "rewarded").length || 0;
    const pendingCount = referrals?.filter((r) => r.status === "pending").length || 0;
    const pendingEarnings = referrals?.filter((r) => r.status === "qualified").reduce((sum, r) => sum + (r.rewardAmount || 0), 0) || 0;

    const tierInfo = calculateTier(qualifiedCount);

    const stats: ReferralStats = {
      code: userCode,
      totalReferrals: referrals?.length || 0,
      qualifiedReferrals: qualifiedCount,
      pendingReferrals: pendingCount,
      totalEarnings: codeData?.totalEarnings || 0,
      pendingEarnings,
      tier: tierInfo.tier as any,
      commissionRate: tierInfo.rate,
    };

    // Kullanıcının referrer'ı var mı?
    const referredByKey = `referred-by:${addressLower}`;
    const referredBy = await redis.get(referredByKey) as string | null;

    return NextResponse.json({
      stats,
      referrals: referrals || [],
      referredBy,
      bonusAmount: REFERRAL_BONUS,
      minTradeAmount: MIN_TRADE_AMOUNT,
      tiers: COMMISSION_TIERS,
    });
  } catch (error: any) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Referral kodu kullan (yeni kullanıcı kaydı sırasında)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, referralCode } = body;

    if (!walletAddress || !referralCode) {
      return NextResponse.json(
        { error: "walletAddress and referralCode required" },
        { status: 400 }
      );
    }

    const addressLower = walletAddress.toLowerCase();
    const codeUpper = referralCode.toUpperCase();

    // Kullanıcı daha önce referral kullanmış mı?
    const referredByKey = `referred-by:${addressLower}`;
    const existingReferral = await redis.get(referredByKey);

    if (existingReferral) {
      return NextResponse.json(
        { error: "Already used a referral code" },
        { status: 400 }
      );
    }

    // Kodu doğrula
    const codeKey = `referral-code:${codeUpper}`;
    const referralCodeData = await redis.get(codeKey) as ReferralCode | null;

    if (!referralCodeData || !referralCodeData.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive referral code" },
        { status: 400 }
      );
    }

    // Kendi kodunu kullanamasın
    if (referralCodeData.ownerAddress === addressLower) {
      return NextResponse.json(
        { error: "Cannot use your own referral code" },
        { status: 400 }
      );
    }

    // Referral kaydı oluştur
    const usage: ReferralUsage = {
      id: `REF_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      code: codeUpper,
      referrerAddress: referralCodeData.ownerAddress,
      referredAddress: addressLower,
      usedAt: Date.now(),
      status: "pending", // İlk trade'den sonra "qualified" olacak
    };

    // Kaydet
    await redis.set(referredByKey, codeUpper);
    await redis.rpush(`referrals:${codeUpper}`, JSON.stringify(usage));

    // Kod kullanım sayısını artır
    referralCodeData.usageCount += 1;
    await redis.set(codeKey, JSON.stringify(referralCodeData));

    return NextResponse.json({
      success: true,
      message: `Referral code applied! Complete a $${MIN_TRADE_AMOUNT}+ trade to unlock $${REFERRAL_BONUS} bonus.`,
      referrer: referralCodeData.ownerAddress.slice(0, 6) + "..." + referralCodeData.ownerAddress.slice(-4),
      bonusAmount: REFERRAL_BONUS,
      minTradeAmount: MIN_TRADE_AMOUNT,
    });
  } catch (error: any) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Referral durumunu güncelle (trade sonrası çağrılır)
export async function PATCH(request: NextRequest) {
  // `walletAddress` came from the body, so anyone could run the withdraw
  // action against any account — marking that account's qualified referrals
  // "rewarded" and paying them into a key nothing reads (see below). The
  // victim's earnings simply vanished.
  const auth = requireUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { tradeAmount, action } = body;

    const addressLower = auth.user.address;

    // Withdraw earnings action
    if (action === "withdraw") {
      // Kullanıcının kodunu bul
      const userCodeKey = `user-referral:${addressLower}`;
      const userCode = await redis.get(userCodeKey) as string | null;

      if (!userCode) {
        return NextResponse.json({ error: "No referral code found" }, { status: 404 });
      }

      // Qualified referralları bul ve ödeme yap
      const referralsKey = `referrals:${userCode}`;
      const referrals = await redis.lrange(referralsKey, 0, -1) as ReferralUsage[];

      const qualifiedReferrals = referrals?.filter((r) => r.status === "qualified") || [];
      const totalPayout = qualifiedReferrals.reduce((sum, r) => sum + (r.rewardAmount || 0), 0);

      if (totalPayout === 0) {
        return NextResponse.json({ error: "No pending earnings to withdraw" }, { status: 400 });
      }

      // Read, pay, then rewrite the list is not atomic: concurrent calls all
      // see the same qualified set and all pay it. One claim per code.
      const claimKey = `referral:withdraw:claim:${userCode}`;
      const claimed = await redis.set(claimKey, Date.now().toString(), { nx: true, ex: 60 });
      if (!claimed) {
        return NextResponse.json(
          { error: "A withdrawal is already in progress" },
          { status: 409 },
        );
      }

      // Referralları "rewarded" olarak güncelle
      const updatedReferrals = referrals.map((r) =>
        r.status === "qualified" ? { ...r, status: "rewarded" as const, rewardPaidAt: Date.now() } : r
      );

      await redis.del(referralsKey);
      for (const r of updatedReferrals) {
        await redis.rpush(referralsKey, JSON.stringify(r));
      }

      // Code data güncelle
      const codeKey = `referral-code:${userCode}`;
      const codeData = await redis.get(codeKey) as ReferralCode;
      if (codeData) {
        codeData.totalEarnings += totalPayout;
        await redis.set(codeKey, JSON.stringify(codeData));
      }

      // The payout was being written to `balance:<addr>`, which nothing in the
      // app reads — balances live at `user:<addr>:balance`. So referrals were
      // marked "rewarded" and the AUXM went nowhere. Pay through
      // incrementBalance so it lands on the real key and is journalled in the
      // AUXM ledger, which a raw hset skips.
      await incrementBalance(addressLower, { auxm: totalPayout }, {
        auxmReason: "referral_reward",
        meta: { code: userCode, referrals: qualifiedReferrals.length },
      });

      return NextResponse.json({
        success: true,
        paidAmount: totalPayout,
        referralsRewarded: qualifiedReferrals.length,
      });
    }

    // Trade sonrası referral qualify check
    if (!tradeAmount) {
      return NextResponse.json({ error: "tradeAmount required" }, { status: 400 });
    }

    // Kullanıcı referral ile mi geldi?
    const referredByKey = `referred-by:${addressLower}`;
    const referralCode = await redis.get(referredByKey) as string | null;

    if (!referralCode) {
      return NextResponse.json({
        success: true,
        message: "No referral to update",
      });
    }

    // Referral kaydını bul
    const referralsKey = `referrals:${referralCode}`;
    const referrals = await redis.lrange(referralsKey, 0, -1) as ReferralUsage[];
    const userReferral = referrals?.find(
      (r) => r.referredAddress === addressLower && r.status === "pending"
    );

    if (!userReferral) {
      return NextResponse.json({
        success: true,
        message: "Referral already processed or not found",
      });
    }

    // Trade miktarı yeterli mi?
    if (tradeAmount < MIN_TRADE_AMOUNT) {
      return NextResponse.json({
        success: true,
        message: `Trade amount ($${tradeAmount}) below minimum ($${MIN_TRADE_AMOUNT})`,
        qualified: false,
      });
    }

    // Tier ve komisyon hesapla
    const qualifiedCount = referrals.filter((r) => r.status === "qualified" || r.status === "rewarded").length;
    const tierInfo = calculateTier(qualifiedCount);

    // Referral'ı qualify et
    const updatedReferrals = referrals.map((r) =>
      r.id === userReferral.id
        ? {
            ...r,
            status: "qualified" as const,
            firstTradeAt: Date.now(),
            firstTradeAmount: tradeAmount,
            rewardAmount: REFERRAL_BONUS * (1 + tierInfo.rate), // Bonus + komisyon
          }
        : r
    );

    await redis.del(referralsKey);
    for (const r of updatedReferrals) {
      await redis.rpush(referralsKey, JSON.stringify(r));
    }

    // Referred user'a bonus ver
    const referredBalanceKey = `balance:${addressLower}`;
    const referredBalance = await redis.hgetall(referredBalanceKey) as Record<string, number>;
    await redis.hset(referredBalanceKey, { auxm: (referredBalance?.auxm || 0) + REFERRAL_BONUS });

    // Notification gönder
    const notifKey = `notifications:${userReferral.referrerAddress}`;
    await redis.lpush(notifKey, JSON.stringify({
      id: `NOTIF_${Date.now()}`,
      type: "referral",
      title: "Referral Qualified! 🎉",
      message: `Your referral made their first trade! You earned $${(REFERRAL_BONUS * tierInfo.rate).toFixed(2)} commission.`,
      createdAt: Date.now(),
      read: false,
    }));

    return NextResponse.json({
      success: true,
      qualified: true,
      bonusGiven: REFERRAL_BONUS,
      referrerReward: REFERRAL_BONUS * tierInfo.rate,
      message: `Referral qualified! You received $${REFERRAL_BONUS} AUXM bonus.`,
    });
  } catch (error: any) {
    console.error("Referral PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
