// app/api/user/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createCustodialWallet, getWalletAddress } from "@/lib/kms-wallet";

// 12 haneli alfanümerik UID oluştur
function generateUID(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let uid = "";
  for (let i = 0; i < 12; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}
export const dynamic = "force-dynamic";

// Redis bağlantısı
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// Platform deposit adresleri
const DEPOSIT_ADDRESSES = {
  ETH: process.env.DEPOSIT_ADDRESS_ETH || "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
  BASE: process.env.DEPOSIT_ADDRESS_BASE || "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
  BTC: process.env.DEPOSIT_ADDRESS_BTC || "1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume",
  XRP: process.env.DEPOSIT_ADDRESS_XRP || "r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae",
  SOL: process.env.DEPOSIT_ADDRESS_SOL || "6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe",
};

/**
 * POST /api/user/register
 * Yeni kullanıcı kaydı veya mevcut kullanıcıyı bul
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress, email, referralCode, createCustodial } = await request.json();

    // walletAddress is now optional - if not provided, we create a custodial wallet
    // createCustodial flag can force custodial wallet creation
    const wantsCustodial = createCustodial === true || !walletAddress;

    const normalizedAddress = walletAddress ? walletAddress.toLowerCase() : null;
    const redis = await getRedis();

    // Mevcut kullanıcı kontrolü (only if address provided)
    if (normalizedAddress) {
      const existingUserId = await redis.get(`user:address:${normalizedAddress}`);

      if (existingUserId) {
        // Mevcut kullanıcıyı getir
        const userData = await redis.hgetall(`user:${existingUserId}`);

        return NextResponse.json({
          success: true,
          message: "User already exists",
          isNew: false,
          userId: existingUserId,
          user: userData,
          depositAddresses: DEPOSIT_ADDRESSES,
        });
      }
    }

    // Yeni kullanıcı oluştur
    const userId = generateUID();
    const createdAt = new Date().toISOString();

    // Create custodial wallet with KMS encryption
    let custodialWalletAddress = normalizedAddress;
    let walletType = "external"; // Default: user provided external wallet

    try {
      // If no wallet provided or explicit custodial request, create custodial wallet
      if (!walletAddress || walletAddress === "custodial") {
        const { address, created } = await createCustodialWallet(userId);
        custodialWalletAddress = address;
        walletType = "custodial";
        console.log(`🔐 Created custodial wallet for ${userId}: ${address}`);
      }
    } catch (kmsError) {
      console.error("KMS wallet creation failed:", kmsError);
      // Fall back to provided address if KMS fails
      if (!walletAddress) {
        return NextResponse.json(
          { error: "Wallet creation failed. Please try again." },
          { status: 500 }
        );
      }
    }

    const userData = {
      id: userId,
      walletAddress: custodialWalletAddress,
      walletType: walletType,
      email: email || null,
      referralCode: referralCode || null,
      createdAt,
      status: "active",
    };

    // Kullanıcıyı kaydet
    await redis.hset(`user:${userId}`, userData);

    // Cüzdan adresi -> userId eşleştirmesi
    await redis.set(`user:address:${custodialWalletAddress}`, userId);

    // Email varsa email -> userId eşleştirmesi
    if (email) {
      await redis.set(`user:email:${email.toLowerCase()}`, userId);
    }

    // Başlangıç bakiyeleri (0)
    await redis.set(`user:${userId}:balance:AUXM`, 0);
    await redis.set(`user:${userId}:balance:AUXG`, 0);
    await redis.set(`user:${userId}:balance:AUXS`, 0);
    await redis.set(`user:${userId}:balance:AUXPT`, 0);
    await redis.set(`user:${userId}:balance:AUXPD`, 0);

    // Hoşgeldin bonusu (opsiyonel)
    const WELCOME_BONUS = parseFloat(process.env.WELCOME_BONUS_AUXM || "0");
    if (WELCOME_BONUS > 0) {
      await redis.set(`user:${userId}:balance:AUXM`, WELCOME_BONUS);

      // Bonus transaction kaydı
      await redis.lpush(
        `user:${userId}:transactions`,
        JSON.stringify({
          type: "bonus",
          asset: "AUXM",
          amount: WELCOME_BONUS,
          description: "Welcome bonus",
          timestamp: createdAt,
        })
      );
    }

    // Referral işleme (varsa)
    if (referralCode) {
      const referrerId = await redis.get(`referral:code:${referralCode}`);
      if (referrerId) {
        // Referrer'a bonus ver
        const REFERRAL_BONUS = parseFloat(process.env.REFERRAL_BONUS_AUXM || "0");
        if (REFERRAL_BONUS > 0) {
          const referrerBalance =
            ((await redis.get(`user:${referrerId}:balance:AUXM`)) as number) || 0;
          await redis.set(
            `user:${referrerId}:balance:AUXM`,
            referrerBalance + REFERRAL_BONUS
          );

          // Referral kaydı
          await redis.lpush(
            `user:${referrerId}:referrals`,
            JSON.stringify({
              referredUserId: userId,
              bonus: REFERRAL_BONUS,
              timestamp: createdAt,
            })
          );
        }
      }
    }

    // Kullanıcının kendi referral kodunu oluştur
    const userReferralCode = `AUX${userId.substring(0, 8).toUpperCase()}`;
    await redis.set(`referral:code:${userReferralCode}`, userId);
    await redis.hset(`user:${userId}`, { referralCode: userReferralCode });

    console.log(`✅ New user registered: ${userId} (${normalizedAddress})`);

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      isNew: true,
      userId,
      user: {
        ...userData,
        referralCode: userReferralCode,
      },
      depositAddresses: DEPOSIT_ADDRESSES,
      welcomeBonus: WELCOME_BONUS > 0 ? WELCOME_BONUS : undefined,
    });
  } catch (error: any) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/register?address=xxx
 * Kullanıcı bilgilerini getir
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "address parameter required" },
        { status: 400 }
      );
    }

    const redis = await getRedis();
    const userId = await redis.get(`user:address:${address.toLowerCase()}`);

    if (!userId) {
      return NextResponse.json({
        exists: false,
        depositAddresses: DEPOSIT_ADDRESSES,
      });
    }

    const userData = await redis.hgetall(`user:${userId}`);

    // Bakiyeleri de getir
    const balances = {
      AUXM: ((await redis.get(`user:${userId}:balance:AUXM`)) as number) || 0,
      AUXG: ((await redis.get(`user:${userId}:balance:AUXG`)) as number) || 0,
      AUXS: ((await redis.get(`user:${userId}:balance:AUXS`)) as number) || 0,
      AUXPT: ((await redis.get(`user:${userId}:balance:AUXPT`)) as number) || 0,
      AUXPD: ((await redis.get(`user:${userId}:balance:AUXPD`)) as number) || 0,
    };

    return NextResponse.json({
      exists: true,
      userId,
      user: userData,
      balances,
      depositAddresses: DEPOSIT_ADDRESSES,
    });
  } catch (error: any) {
    console.error("User fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
