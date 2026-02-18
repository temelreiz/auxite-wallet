// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { processWithdraw } from "@/lib/blockchain-service";
import { sendWithdrawConfirmedEmail, sendWithdrawRequestedEmail } from "@/lib/email-service";
import { getUserLanguage } from "@/lib/user-language";
import { checkTradingAllowed } from "@/lib/trading-guard";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface WithdrawRequest {
  twoFactorCode?: string;
  address: string;
  coin: string;
  amount: number; // Direkt kripto miktarı
  withdrawAddress: string;
  network?: string; // ethereum, tron, base, bitcoin etc.
  memo?: string;
}

// Network fee (kripto cinsinden)
const NETWORK_FEES: Record<string, number> = {
  USDT: 1,      // 1 USDT gas fee
  USDC: 1,      // 1 USDC gas fee
  ETH: 0.001,   // 0.001 ETH gas fee
  XRP: 0.1,     // 0.1 XRP fee
  SOL: 0.01,    // 0.01 SOL fee
  BTC: 0.0001,  // 0.0001 BTC fee
};

// Minimum çekim miktarları
const MIN_WITHDRAW: Record<string, number> = {
  USDT: 10,
  USDC: 10,
  ETH: 0.001,
  XRP: 10,
  SOL: 0.1,
  BTC: 0.0005,
};

// Balance key mapping
const BALANCE_KEYS: Record<string, string> = {
  USDT: "usdt",
  USDC: "usdc",
  BTC: "btc",
  ETH: "eth",
  XRP: "xrp",
  SOL: "sol",
};

// ═══════════════════════════════════════════════════════════════════════════
// 2FA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function verify2FA(address: string, code: string): Promise<{ valid: boolean; error?: string; enabled?: boolean }> {
  const key = get2FAKey(address);
  
  // Redis hash olarak oku (hgetall)
  const data = await redis.hgetall(key);
  
  // 2FA verisi yoksa
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // 2FA aktif değilse - hem string "true" hem boolean true kontrol et
  const isEnabled = data.enabled === true || data.enabled === "true";
  if (!isEnabled || !data.secret) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // Kod girilmemişse
  if (!code) {
    return { valid: false, error: "2FA kodu gerekli", enabled: true };
  }
  
  // TOTP doğrula
  try {
    const secretObj = OTPAuth.Secret.fromBase32(data.secret as string);
    const totp = new OTPAuth.TOTP({
      issuer: "Auxite",
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secretObj,
    });
    // Window 3 = ±90 saniye tolerans (frontend verify + backend re-verify arasındaki gecikme)
    const delta = totp.validate({ token: code, window: 3 });
    if (delta !== null) {
      return { valid: true, enabled: true };
    }
  } catch (e) {
    console.error("TOTP verify error:", e);
  }

  // Backup kodu dene - check both possible keys
  let backupCodes: string[] = [];
  
  if (data.hashedBackupCodes) {
    try {
      backupCodes = JSON.parse(data.hashedBackupCodes as string);
    } catch {}
  }
  
  if (backupCodes.length === 0 && data.backupCodes) {
    try {
      backupCodes = JSON.parse(data.backupCodes as string);
    } catch {}
  }
  
  const hashedInput = hashCode(code.toUpperCase());
  const codeIndex = backupCodes.indexOf(hashedInput);
  
  if (codeIndex !== -1) {
    // Kullanılan backup kodunu sil
    backupCodes.splice(codeIndex, 1);
    await redis.hset(key, {
      backupCodes: JSON.stringify(backupCodes),
      hashedBackupCodes: JSON.stringify(backupCodes),
      backupCodesRemaining: backupCodes.length.toString(),
    });
    return { valid: true, enabled: true };
  }
  
  return { valid: false, error: "Geçersiz 2FA kodu", enabled: true };
}

export async function POST(request: NextRequest) {
  try {
    // Kill Switch / Trading Guard
    const withdrawCheck = await checkTradingAllowed('cryptoWithdraw');
    if (!withdrawCheck.allowed) {
      return NextResponse.json(
        { error: withdrawCheck.message?.en || 'Withdrawal temporarily disabled', reason: withdrawCheck.reason, message: withdrawCheck.message },
        { status: 503 }
      );
    }

    const body = await request.json();
    // Support both web (address, coin, withdrawAddress) and mobile (fromAddress, token, toAddress) field names
    const address = body.address || body.fromAddress;
    const coin = (body.coin || body.token || "").toUpperCase();
    const amount = body.amount;
    const withdrawAddress = body.withdrawAddress || body.toAddress;
    const network = body.network;
    const memo = body.memo;
    const twoFactorCode = body.twoFactorCode;

    console.log(`📤 Withdraw request: coin=${coin}, amount=${amount}, to=${withdrawAddress?.slice(0, 10)}..., network=${network || 'default'}, has2FA=${!!twoFactorCode}`);

    // Validation
    if (!address || !coin || !amount || !withdrawAddress) {
      console.error(`❌ Missing fields: address=${!!address}, coin=${!!coin}, amount=${!!amount}, withdrawAddress=${!!withdrawAddress}`);
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    // Desteklenen coinler
    const supportedCoins = ["USDT", "USDC", "ETH", "XRP", "SOL", "BTC"];
    if (!supportedCoins.includes(coin)) {
      return NextResponse.json({ error: "Unsupported cryptocurrency" }, { status: 400 });
    }

    // Minimum çekim kontrolü
    const minAmount = MIN_WITHDRAW[coin] || 0;
    if (amount < minAmount) {
      return NextResponse.json({
        error: `Minimum withdrawal is ${minAmount} ${coin}`
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RATE LIMITING - Brute force ve spam saldırılarını önle
    // ═══════════════════════════════════════════════════════════════════════════
    const rateLimitKey = `ratelimit:withdraw:${address.toLowerCase()}`;
    const rateLimitWindow = 300; // 5 dakika
    const rateLimitMax = 3; // 5 dakikada max 3 çekim denemesi
    const now = Math.floor(Date.now() / 1000);

    await redis.zremrangebyscore(rateLimitKey, 0, now - rateLimitWindow);
    const requestCount = await redis.zcard(rateLimitKey);

    if (requestCount >= rateLimitMax) {
      return NextResponse.json({
        error: "Çok fazla çekim denemesi. Lütfen 5 dakika bekleyin.",
        code: "RATE_LIMIT_EXCEEDED",
      }, { status: 429 });
    }

    await redis.zadd(rateLimitKey, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(rateLimitKey, rateLimitWindow * 2);

    // ═══════════════════════════════════════════════════════════════════════════
    // 2FA DOĞRULAMASI - KRİTİK GÜVENLİK KONTROLÜ
    // Frontend kontrolü yeterli değil, backend'de de doğrulanmalı!
    // ═══════════════════════════════════════════════════════════════════════════
    const twoFAResult = await verify2FA(address, twoFactorCode || "");
    console.log(`🔐 2FA result: enabled=${twoFAResult.enabled}, valid=${twoFAResult.valid}, error=${twoFAResult.error || 'none'}`);

    // 2FA etkinse kod gerekli
    if (twoFAResult.enabled) {
      if (!twoFAResult.valid) {
        console.warn(`⚠️ 2FA verification failed for withdraw: ${twoFAResult.error}`);
        return NextResponse.json({
          error: twoFAResult.error || "Geçersiz 2FA kodu",
          code: "2FA_REQUIRED",
          requires2FA: true,
        }, { status: 401 });
      }
    }
    // 2FA etkin değilse işleme devam et (kullanıcı henüz 2FA kurmamış)

    // BTC ve USDC henüz desteklenmiyor
    if (coin === "BTC") {
      return NextResponse.json({
        error: "BTC withdrawals coming soon. Please use ETH, USDT, XRP or SOL."
      }, { status: 400 });
    }
    if (coin === "USDC") {
      return NextResponse.json({
        error: "USDC withdrawals coming soon. Please use USDT for stablecoin withdrawals."
      }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    // Balance API'den gerçek bakiyeyi al (blockchain + redis + allocation)
    // Redis-only okuma yetersiz: external wallet kullanıcılarında USDT/ETH blockchain'de
    const balanceFieldKey = BALANCE_KEYS[coin];
    let cryptoBalance = 0;

    const baseUrl = request.headers.get("host")
      ? `https://${request.headers.get("host")}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

    try {
      const balanceRes = await fetch(`${baseUrl}/api/user/balance?address=${normalizedAddress}`);
      const balanceData = await balanceRes.json();
      if (balanceData.success && balanceData.balances) {
        cryptoBalance = parseFloat(balanceData.balances[balanceFieldKey] || "0");
        console.log(`📊 Balance from API: ${coin}=${cryptoBalance} (source: balance API)`);
      } else {
        throw new Error(balanceData.error || "Balance API returned unsuccessful");
      }
    } catch (e) {
      // Fallback: Redis'ten oku
      console.warn(`⚠️ Balance API failed, falling back to Redis:`, e);
      const currentBalance = await redis.hgetall(balanceKey);
      if (!currentBalance || Object.keys(currentBalance).length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      cryptoBalance = parseFloat(currentBalance[balanceFieldKey] as string || "0");
    }

    const networkFee = NETWORK_FEES[coin] || 0;

    console.log(`📊 Withdraw check - Coin: ${coin}, Balance: ${cryptoBalance}, Requested: ${amount}, Fee: ${networkFee}`);

    if (amount > cryptoBalance) {
      return NextResponse.json({ 
        error: `Insufficient ${coin} balance`,
        required: amount,
        available: cryptoBalance,
      }, { status: 400 });
    }

    // Net gönderilecek miktar (fee düşüldükten sonra)
    const netAmount = amount - networkFee;
    
    if (netAmount <= 0) {
      return NextResponse.json({ 
        error: `Amount too small. Minimum after fee: ${networkFee} ${coin}`,
      }, { status: 400 });
    }

    // Transaction ID oluştur
    const txId = `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Transaction kaydı (pending olarak başla)
    const transaction = {
      id: txId,
      type: "withdraw",
      subType: "external_settlement",
      coin: coin,
      amount: amount.toString(),
      netAmount: netAmount.toString(),
      fee: networkFee.toString(),
      withdrawAddress,
      memo: memo || null,
      status: "processing",
      timestamp: Date.now(),
    };

    const txKey = `user:${normalizedAddress}:transactions`;

    // Önce bakiyeyi düş
    await redis.hincrbyfloat(balanceKey, balanceFieldKey, -amount);

    // Transaction'ı kaydet
    await redis.lpush(txKey, JSON.stringify(transaction));

    // Send "requested" email (Stage 1 of 3)
    (async () => {
      try {
        const userId = await redis.get(`user:address:${normalizedAddress}`);
        if (userId) {
          const userData = await redis.hgetall(`user:${userId}`);
          if (userData?.email) {
            const userLang = await getUserLanguage(normalizedAddress);
            await sendWithdrawRequestedEmail(
              userData.email as string,
              userData.name as string || 'User',
              amount.toString(),
              coin,
              withdrawAddress,
              networkFee.toString() + ' ' + coin,
              userLang
            );
          }
        }
      } catch (e) {
        console.error('Failed to send withdraw-requested email:', e);
      }
    })();

    // ===== GERÇEK BLOCKCHAIN TRANSFERİ =====
    console.log(`🚀 Processing ${coin} withdraw: ${netAmount} to ${withdrawAddress} (network: ${network || 'default'})`);

    const withdrawResult = await processWithdraw(
      coin,
      withdrawAddress,
      netAmount,
      coin === "XRP" && memo ? parseInt(memo) : undefined
    );

    // Log detailed result for debugging
    console.log(`📋 Withdraw result: success=${withdrawResult.success}, txHash=${withdrawResult.txHash || 'none'}, error=${withdrawResult.error || 'none'}`);

    if (withdrawResult.success) {
      // Başarılı - transaction'ı güncelle
      const transactions = await redis.lrange(txKey, 0, 50);
      const updatedTransactions = transactions.map((tx: any) => {
        const parsed = typeof tx === 'string' ? JSON.parse(tx) : tx;
        if (parsed.id === txId) {
          return JSON.stringify({
            ...parsed,
            status: "completed",
            txHash: withdrawResult.txHash,
            blockchainFee: withdrawResult.fee,
            completedAt: Date.now(),
          });
        }
        return typeof tx === 'string' ? tx : JSON.stringify(tx);
      });

      // Transaction listesini güncelle
      await redis.del(txKey);
      if (updatedTransactions.length > 0) {
        await redis.rpush(txKey, ...updatedTransactions.reverse());
      }

      console.log(`✅ Withdraw completed: ${withdrawResult.txHash}`);

      // Send email notification (non-blocking)
      (async () => {
        try {
          const userId = await redis.get(`user:address:${normalizedAddress}`);
          if (userId) {
            const userData = await redis.hgetall(`user:${userId}`);
            if (userData?.email) {
              const userLang = await getUserLanguage(normalizedAddress);
              await sendWithdrawConfirmedEmail(
                userData.email as string,
                userData.name as string || 'User',
                amount.toString(),
                coin,
                withdrawAddress,
                withdrawResult.txHash,
                networkFee.toString() + ' ' + coin,
                userLang
              );
            }
          }
        } catch (e) {
          console.error('Failed to send withdraw email:', e);
        }
      })();

      const updatedBalance = await redis.hgetall(balanceKey);

      return NextResponse.json({
        success: true,
        withdrawal: {
          id: txId,
          coin,
          amount,
          netAmount,
          networkFee,
          withdrawAddress,
          status: "completed",
          txHash: withdrawResult.txHash,
          explorerUrl: getExplorerUrl(coin, withdrawResult.txHash!),
        },
        balances: {
          [balanceFieldKey]: parseFloat(updatedBalance?.[balanceFieldKey] as string || "0"),
        },
      });

    } else {
      // Başarısız - bakiyeyi geri yükle
      await redis.hincrbyfloat(balanceKey, balanceFieldKey, amount);
      
      // Transaction'ı failed olarak güncelle
      const transactions = await redis.lrange(txKey, 0, 50);
      const updatedTransactions = transactions.map((tx: any) => {
        const parsed = typeof tx === 'string' ? JSON.parse(tx) : tx;
        if (parsed.id === txId) {
          return JSON.stringify({
            ...parsed,
            status: "failed",
            error: withdrawResult.error,
            failedAt: Date.now(),
          });
        }
        return typeof tx === 'string' ? tx : JSON.stringify(tx);
      });

      await redis.del(txKey);
      if (updatedTransactions.length > 0) {
        await redis.rpush(txKey, ...updatedTransactions.reverse());
      }

      console.error(`❌ Withdraw failed: ${withdrawResult.error}`);

      // Map blockchain errors to user-friendly messages
      let userError = withdrawResult.error || "Withdrawal failed";
      if (userError.includes("Insufficient USDT balance")) {
        userError = "Hot wallet USDT balance insufficient. Please contact support.";
      } else if (userError.includes("Insufficient ETH for gas")) {
        userError = "Hot wallet ETH gas balance insufficient. Please contact support.";
      } else if (userError.includes("Insufficient hot wallet balance")) {
        userError = "Hot wallet balance insufficient. Please contact support.";
      } else if (userError.includes("private key not configured")) {
        userError = "Withdrawal service temporarily unavailable. Please contact support.";
      } else if (userError.includes("Insufficient SOL balance")) {
        userError = "Hot wallet SOL balance insufficient. Please contact support.";
      } else if (userError.includes("Insufficient XRP balance")) {
        userError = "Hot wallet XRP balance insufficient. Please contact support.";
      }

      return NextResponse.json({
        error: userError,
        debugError: withdrawResult.error, // Detailed error for debugging
        refunded: true,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Withdraw error:", error);
    return NextResponse.json({ error: "Withdrawal failed: " + error.message }, { status: 500 });
  }
}

// Explorer URL helper
function getExplorerUrl(coin: string, txHash: string): string {
  switch (coin) {
    case 'ETH':
    case 'USDT':
      return `https://etherscan.io/tx/${txHash}`;
    case 'XRP':
      return `https://xrpscan.com/tx/${txHash}`;
    case 'SOL':
      return `https://solscan.io/tx/${txHash}`;
    case 'BTC':
      return `https://blockstream.info/tx/${txHash}`;
    default:
      return '';
  }
}
