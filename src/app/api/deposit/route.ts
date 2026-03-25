import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendDepositConfirmedEmail } from "@/lib/email-service";
import {
  calculateDepositBonus,
  checkWelcomeBonusEligibility,
  getWelcomeBonusAmount,
  calculateReferralBonus,
  grantBonus,
  checkIpVelocity,
  BONUS_CONFIG,
} from "@/lib/metal-bonus-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface DepositRequest {
  address: string;
  coin: string;
  amount: number;
  convertToAuxm?: boolean;
  txHash?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DepositRequest = await request.json();
    const { address, coin, amount, convertToAuxm = false, txHash } = body;

    if (!address || !coin || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;
    const coinLower = coin.toLowerCase();

    // Crypto fiyatını al
    let cryptoPrice = 1;
    try {
      const priceRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crypto`);
      const priceData = await priceRes.json();
      const coinMap: Record<string, string> = {
        btc: 'bitcoin', eth: 'ethereum', usdt: 'tether', usdc: 'usd-coin'
      };
      cryptoPrice = priceData[coinMap[coinLower]]?.usd || 1;
    } catch {
      const fallback: Record<string, number> = { usdt: 1, usdc: 1, btc: 95000, eth: 3500 };
      cryptoPrice = fallback[coinLower] || 1;
    }

    const amountUsd = amount * cryptoPrice;
    const txId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let transaction: any;
    let resultData: any;

    if (convertToAuxm) {
      // AUXM'e çevir (no more AUXM bonus — bonuses are now metal-based)
      await redis.hincrbyfloat(balanceKey, "auxm", amountUsd);

      transaction = {
        id: txId,
        type: "deposit",
        token: coin.toUpperCase(),
        amount: amount.toString(),
        amountUsd: amountUsd.toFixed(2),
        convertedTo: "AUXM",
        auxmReceived: amountUsd.toFixed(2),
        txHash: txHash || null,
        status: "completed",
        timestamp: Date.now(),
      };

      resultData = {
        converted: true,
        auxmReceived: amountUsd,
        totalReceived: amountUsd,
      };
    } else {
      // Crypto olarak tut
      await redis.hincrbyfloat(balanceKey, coinLower, amount);

      transaction = {
        id: txId,
        type: "deposit",
        token: coin.toUpperCase(),
        amount: amount.toString(),
        amountUsd: amountUsd.toFixed(2),
        convertedTo: null,
        txHash: txHash || null,
        status: "completed",
        timestamp: Date.now(),
      };

      resultData = {
        converted: false,
        coinReceived: amount,
        coin: coin.toUpperCase(),
        valueUsd: amountUsd,
      };
    }

    // ═══════════════════════════════════════════════════════════════
    // METAL BONUS SYSTEM v2 — Deposit Bonus + Welcome Bonus + Referral
    // ═══════════════════════════════════════════════════════════════
    let bonusResults: any = {};

    if (BONUS_CONFIG.enabled) {
      // Get userId for bonus tracking
      const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

      if (userId) {
        // Get AUXS price for bonus calculation (default bonus asset)
        let auxsPrice = 2.80;
        try {
          const priceRes2 = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/prices?chain=84532`);
          const pd = await priceRes2.json();
          auxsPrice = pd.basePrices?.AUXS || 2.80;
        } catch {}

        // IP velocity check
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const ipCheck = await checkIpVelocity(userId, ip);

        if (ipCheck.allowed) {
          // 1. DEPOSIT BONUS: 2% as AUXS bonus
          if (amountUsd >= BONUS_CONFIG.minDepositForBonus) {
            const depositBonus = calculateDepositBonus(amountUsd, auxsPrice);
            if (depositBonus.bonusGrams > 0) {
              const grant = await grantBonus(userId, 'deposit', 'AUXS', depositBonus.bonusGrams, depositBonus.bonusValueUsd);
              if (grant.granted) {
                bonusResults.depositBonus = { asset: 'AUXS', grams: grant.grantedGrams, valueUsd: depositBonus.bonusValueUsd };
              }
            }
          }

          // 2. WELCOME BONUS: 10 AUXS (KYC + first deposit >= $100)
          if (amountUsd >= BONUS_CONFIG.minDepositForWelcome) {
            const welcomeCheck = await checkWelcomeBonusEligibility(userId, normalizedAddress);
            if (welcomeCheck.eligible) {
              const welcomeBonus = getWelcomeBonusAmount(auxsPrice);
              const grant = await grantBonus(userId, 'welcome', 'AUXS', welcomeBonus.bonusGrams, welcomeBonus.bonusValueUsd);
              if (grant.granted) {
                bonusResults.welcomeBonus = { asset: 'AUXS', grams: grant.grantedGrams, valueUsd: welcomeBonus.bonusValueUsd };
              }
            }
          }

          // 3. REFERRAL BONUS: 0.5% for both parties on first deposit
          const referredBy = await redis.get(`referred-by:${normalizedAddress}`) as string;
          const referralCredited = await redis.get(`user:${userId}:bonus:referralCredited`);
          if (referredBy && !referralCredited) {
            const refBonus = calculateReferralBonus(amountUsd, auxsPrice);
            if (refBonus.bonusGrams > 0) {
              // Referee gets bonus
              const refGrant = await grantBonus(userId, 'referral', 'AUXS', refBonus.bonusGrams, refBonus.bonusValueUsd);

              // Referrer gets bonus too
              const referrerCode = typeof referredBy === 'string' ? referredBy : '';
              if (referrerCode) {
                const codeData = await redis.get(`referral-code:${referrerCode}`) as any;
                const referrerAddress = codeData?.creatorAddress || codeData?.address;
                if (referrerAddress) {
                  const referrerId = await redis.get(`user:address:${referrerAddress.toLowerCase()}`) as string;
                  if (referrerId) {
                    await grantBonus(referrerId, 'referral', 'AUXS', refBonus.bonusGrams, refBonus.bonusValueUsd);
                  }
                }
              }

              await redis.set(`user:${userId}:bonus:referralCredited`, 'true');
              if (refGrant.granted) {
                bonusResults.referralBonus = { asset: 'AUXS', grams: refGrant.grantedGrams, valueUsd: refBonus.bonusValueUsd };
              }
            }
          }
        }
      }
    }

    // Transaction kaydet
    const txKey = `user:${normalizedAddress}:transactions`;
    await redis.lpush(txKey, JSON.stringify(transaction));

    // Deposit Confirmation Email
    try {
      const userData = await redis.hgetall(`user:${normalizedAddress}`) as Record<string, string> | null;
      if (userData?.email) {
        const emailAmount = convertToAuxm ? amountUsd.toFixed(2) : amount.toString();
        const emailToken = convertToAuxm ? 'AUXM' : coin.toUpperCase();
        sendDepositConfirmedEmail(
          userData.email,
          userData.name || 'Client',
          emailAmount,
          emailToken,
          txHash || undefined,
          userData.language || 'en'
        ).catch((err: any) => console.error('Deposit email error:', err));
      }
    } catch (emailErr) {
      console.error('Deposit email lookup error:', emailErr);
    }

    // Güncel bakiye
    const updatedBalance = await redis.hgetall(balanceKey);

    return NextResponse.json({
      success: true,
      deposit: {
        id: txId,
        coin: coin.toUpperCase(),
        amount,
        amountUsd,
        ...resultData,
        status: "completed",
      },
      bonus: Object.keys(bonusResults).length > 0 ? bonusResults : undefined,
      balances: updatedBalance,
    });

  } catch (error) {
    console.error("Deposit error:", error);
    return NextResponse.json({ error: "Deposit failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get("coin");

  const addresses: Record<string, { address: string; network: string; memo?: string }> = {
    BTC: { address: process.env.HOT_WALLET_BTC_ADDRESS || "bc1qcvdqwjtsmnl92ldhapmyuvfnlj5gfquvj0w3ke", network: "Bitcoin" },
    ETH: { address: process.env.HOT_WALLET_ETH_ADDRESS || "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", network: "Base" },
    USDT: { address: process.env.HOT_WALLET_ETH_ADDRESS || "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", network: "Base (ERC-20)" },
    USDC: { address: process.env.HOT_WALLET_ETH_ADDRESS || "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", network: "Base (ERC-20)" },
  };

  if (coin && addresses[coin]) {
    return NextResponse.json({ success: true, ...addresses[coin] });
  }
  return NextResponse.json({ success: true, addresses });
}
