import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { ethers } from "ethers";
import { METAL_TOKENS } from "@/config/contracts-v8";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";
import { getUserIdFromAddress, sendETH, sendERC20 } from "@/lib/kms-wallet";
import { sendTransferSentEmail, sendTransferReceivedEmail } from "@/lib/email-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

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
  
  // HASH olarak oku (hgetall kullan, get değil!)
  const data = await redis.hgetall(key);
  
  // 2FA verisi yoksa
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // String "true" kontrolü - Redis hash'ten string olarak gelir
  const isEnabled = data.enabled === true || data.enabled === "true";
  
  // 2FA aktif değilse
  if (!isEnabled || !data.secret) {
    return { valid: false, error: "2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin.", enabled: false };
  }
  
  // Kod girilmemişse
  if (!code) {
    return { valid: false, error: "2FA kodu gerekli", enabled: true };
  }
  
  // TOTP doğrula
  try {
    const totp = new OTPAuth.TOTP({
      issuer: "Auxite",
      label: "user",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: data.secret as string,
    });
    const delta = totp.validate({ token: code, window: 1 });
    if (delta !== null) {
      return { valid: true, enabled: true };
    }
  } catch (e) {
    console.error("TOTP verify error:", e);
  }
  
  // Backup kodu dene
  let backupCodes: string[] = [];
  if (data.backupCodes) {
    try {
      backupCodes = typeof data.backupCodes === 'string' 
        ? JSON.parse(data.backupCodes) 
        : data.backupCodes as string[];
    } catch {
      backupCodes = [];
    }
  }
  
  const hashedInput = hashCode(code.toUpperCase());
  const codeIndex = backupCodes.indexOf(hashedInput);
  
  if (codeIndex !== -1) {
    // Kullanılan backup kodunu sil
    backupCodes.splice(codeIndex, 1);
    await redis.hset(key, { 
      backupCodes: JSON.stringify(backupCodes),
      backupCodesRemaining: backupCodes.length 
    });
    return { valid: true, enabled: true };
  }
  
  return { valid: false, error: "Geçersiz 2FA kodu", enabled: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITING - Transfer saldırılarını önle
// ═══════════════════════════════════════════════════════════════════════════
const RATE_LIMIT_WINDOW = 60; // 60 saniye
const RATE_LIMIT_MAX_REQUESTS = 5; // Dakikada max 5 transfer

async function checkRateLimit(address: string): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const key = `ratelimit:transfer:${address.toLowerCase()}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Eski kayıtları temizle ve mevcut sayıyı al
  await redis.zremrangebyscore(key, 0, windowStart);
  const requestCount = await redis.zcard(key);

  if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
    // En eski kaydı al ve ne zaman sona ereceğini hesapla
    const oldest = await redis.zrange(key, 0, 0, { withScores: true }) as { score: number; member: string }[];
    const retryAfter = oldest.length > 0 ? Math.ceil(RATE_LIMIT_WINDOW - (now - oldest[0].score)) : RATE_LIMIT_WINDOW;
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Yeni istek kaydet
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
  await redis.expire(key, RATE_LIMIT_WINDOW * 2);

  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - requestCount - 1 };
}

// Token contract addresses from central config
const TOKEN_CONTRACTS: Record<string, string> = {
  AUXG: METAL_TOKENS.AUXG,
  AUXS: METAL_TOKENS.AUXS,
  AUXPT: METAL_TOKENS.AUXPT,
  AUXPD: METAL_TOKENS.AUXPD,
};

// ERC20 ABI for transfer
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// On-chain tokens - metal tokens only (Sepolia testnet)
const ON_CHAIN_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

// Off-chain tokens (Redis balance transfers)
// ETH is handled specially: custodial-to-custodial is off-chain, custodial-to-external is on-chain
const OFF_CHAIN_TOKENS = ["AUXM", "USDT", "BTC", "XRP", "SOL"];

// Helper: Get user email from address
async function getUserEmail(address: string): Promise<{ email?: string; name?: string }> {
  const normalizedAddress = address.toLowerCase();
  const userId = await redis.get(`user:address:${normalizedAddress}`);
  if (userId) {
    const userData = await redis.hgetall(`user:${userId}`);
    return { email: userData?.email as string, name: userData?.name as string || 'User' };
  }
  // Fallback for legacy format
  const directUserData = await redis.hgetall(`user:${normalizedAddress}`);
  return { email: directUserData?.email as string, name: directUserData?.name as string || 'User' };
}

// Helper: Send transfer emails (non-blocking)
async function sendTransferEmails(fromAddress: string, toAddress: string, amount: number, token: string) {
  try {
    const [sender, receiver] = await Promise.all([
      getUserEmail(fromAddress),
      getUserEmail(toAddress)
    ]);

    const promises = [];

    if (sender.email) {
      promises.push(
        sendTransferSentEmail(sender.email, sender.name || 'User', amount.toString(), token, toAddress, 'tr')
          .catch(e => console.error('Failed to send transfer-sent email:', e))
      );
    }

    if (receiver.email) {
      promises.push(
        sendTransferReceivedEmail(receiver.email, receiver.name || 'User', amount.toString(), token, fromAddress, 'tr')
          .catch(e => console.error('Failed to send transfer-received email:', e))
      );
    }

    await Promise.all(promises);
  } catch (e) {
    console.error('sendTransferEmails error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSAK HOLDING PERIOD CHECK
// Kullanıcı Transak ile kripto aldıysa, belirli süre dış cüzdana transfer edemez
// Bu süre chargeback (ters ibraz) riskini minimize etmek içindir
// ═══════════════════════════════════════════════════════════════════════════
const HOLDING_PERIOD_DAYS = 30; // 30 gün bekleme süresi (chargeback koruması)
const HOLDING_PERIOD_MS = HOLDING_PERIOD_DAYS * 24 * 60 * 60 * 1000;

async function checkTransakHoldingPeriod(
  address: string,
  token: string,
  amount: number,
  toAddress: string
): Promise<{ blocked: boolean; reason?: string; remainingDays?: number }> {
  const normalizedAddress = address.toLowerCase();
  const normalizedTo = toAddress.toLowerCase();

  // Eğer alıcı platform içi bir kullanıcıysa (custodial), kısıtlama yok
  const receiverId = await redis.get(`user:address:${normalizedTo}`);
  if (receiverId) {
    // Platform içi transfer - sorun yok
    return { blocked: false };
  }

  // Dış cüzdana transfer - Transak geçmişini kontrol et
  const transakKey = `user:${normalizedAddress}:transak:deposits`;
  const deposits = await redis.lrange(transakKey, 0, -1);

  if (!deposits || deposits.length === 0) {
    // Transak ile alım yok - sorun yok
    return { blocked: false };
  }

  const now = Date.now();
  const tokenUpper = token.toUpperCase();

  // Son 7 gün içindeki Transak alımlarını kontrol et
  let totalLockedAmount = 0;
  let latestDepositTime = 0;

  for (const depositStr of deposits) {
    try {
      const deposit = typeof depositStr === 'string' ? JSON.parse(depositStr) : depositStr;
      const depositAge = now - (deposit.timestamp || 0);

      // Sadece ilgili token ve holding period içindeki alımlar
      if (deposit.cryptoCurrency?.toUpperCase() === tokenUpper && depositAge < HOLDING_PERIOD_MS) {
        totalLockedAmount += parseFloat(deposit.cryptoAmount || 0);
        if (deposit.timestamp > latestDepositTime) {
          latestDepositTime = deposit.timestamp;
        }
      }
    } catch (e) {
      console.error("Error parsing transak deposit:", e);
    }
  }

  if (totalLockedAmount <= 0) {
    // Holding period'u geçmiş veya bu token için alım yok
    return { blocked: false };
  }

  // Transfer miktarı kilitli miktardan fazlaysa izin ver (eski bakiyeden transfer)
  // Kullanıcının mevcut bakiyesini al
  const balanceKey = `user:${normalizedAddress}:balance`;
  const balances = await redis.hgetall(balanceKey);
  const currentBalance = parseFloat(balances?.[token.toLowerCase()] as string || "0");

  // Kilitli olmayan miktar = mevcut bakiye - kilitli miktar
  const unlockedBalance = Math.max(0, currentBalance - totalLockedAmount);

  if (amount <= unlockedBalance) {
    // Transfer miktarı kilitsiz bakiyeden karşılanabilir
    return { blocked: false };
  }

  // Transfer engellendi
  const remainingMs = HOLDING_PERIOD_MS - (now - latestDepositTime);
  const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

  return {
    blocked: true,
    reason: `Transak ile satın alınan ${tokenUpper} için ${HOLDING_PERIOD_DAYS} günlük bekleme süresi gereklidir. Platform içi işlemler (metal alımı, stake vb.) yapabilirsiniz.`,
    remainingDays,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { fromAddress, toAddress, token, amount, twoFactorCode } = await request.json();

    console.log("Transfer request:", { fromAddress, toAddress, token, amount, amountType: typeof amount });

    if (!fromAddress || !toAddress || !token || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
      return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RATE LIMITING - Brute force ve spam saldırılarını önle
    // ═══════════════════════════════════════════════════════════════════════════
    const rateLimitCheck = await checkRateLimit(fromAddress);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json({
        error: "Çok fazla transfer denemesi. Lütfen biraz bekleyin.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: rateLimitCheck.retryAfter,
      }, { status: 429 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TRANSAK HOLDING PERIOD CHECK - Dış cüzdana transfer kısıtlaması
    // ═══════════════════════════════════════════════════════════════════════════
    const holdingCheck = await checkTransakHoldingPeriod(fromAddress, token, amount, toAddress);
    if (holdingCheck.blocked) {
      return NextResponse.json({
        error: holdingCheck.reason,
        code: "TRANSAK_HOLDING_PERIOD",
        remainingDays: holdingCheck.remainingDays,
      }, { status: 403 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 2FA DOĞRULAMASI - KRİTİK GÜVENLİK KONTROLÜ
    // Frontend kontrolü yeterli değil, backend'de de doğrulanmalı!
    // ═══════════════════════════════════════════════════════════════════════════
    const twoFAResult = await verify2FA(fromAddress, twoFactorCode);

    // 2FA etkinse kod gerekli
    if (twoFAResult.enabled) {
      if (!twoFAResult.valid) {
        return NextResponse.json({
          error: twoFAResult.error || "Geçersiz 2FA kodu",
          code: "2FA_REQUIRED",
          requires2FA: true,
        }, { status: 401 });
      }
    }
    // 2FA etkin değilse işleme devam et (kullanıcı henüz 2FA kurmamış)

    const normalizedFrom = fromAddress.toLowerCase();
    const normalizedTo = toAddress.toLowerCase();
    const tokenKey = token.toLowerCase();
    const tokenUpper = token.toUpperCase();

    // ETH transfer - check if user has custodial wallet
    if (tokenUpper === "ETH") {
      // Check if sender has a custodial wallet
      const senderId = await getUserIdFromAddress(fromAddress);

      if (!senderId) {
        // Not a custodial user - they need to sign via their own wallet (frontend)
        return NextResponse.json({
          error: "ETH transfers must be signed via your wallet. Use the web app to transfer ETH.",
          code: "USE_WALLET_SIGNING",
        }, { status: 400 });
      }

      // Check if receiver is also custodial
      const receiverId = await getUserIdFromAddress(toAddress);

      // Custodial sender - check Redis balance first
      const fromBalanceKey = `user:${normalizedFrom}:balance`;
      const fromBalance = await redis.hgetall(fromBalanceKey);
      const senderEthBalance = parseFloat(fromBalance?.eth as string || "0");

      if (senderEthBalance < amount) {
        return NextResponse.json({
          error: "Insufficient ETH balance",
          required: amount,
          available: senderEthBalance,
        }, { status: 400 });
      }

      const txId = `eth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (receiverId) {
        // Both sender and receiver are custodial - do off-chain Redis transfer
        console.log(`📦 Off-chain ETH transfer: ${amount} ETH from ${fromAddress} to ${toAddress} (both custodial)`);

        const toBalanceKey = `user:${normalizedTo}:balance`;

        // Execute Redis transfer
        const multi = redis.multi();
        multi.hincrbyfloat(fromBalanceKey, "eth", -amount);
        multi.hincrbyfloat(toBalanceKey, "eth", amount);
        await multi.exec();

        // Log transactions
        const senderTx = {
          id: txId,
          type: "transfer",
          token: "ETH",
          amount: -amount,
          toAddress: normalizedTo,
          status: "completed",
          timestamp: Date.now(),
        };
        await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTx));

        const receiverTx = {
          id: txId,
          type: "receive",
          token: "ETH",
          amount: amount,
          fromAddress: normalizedFrom,
          status: "completed",
          timestamp: Date.now(),
        };
        await redis.lpush(`user:${normalizedTo}:transactions`, JSON.stringify(receiverTx));

        // Send email notifications (non-blocking)
        sendTransferEmails(normalizedFrom, normalizedTo, amount, "ETH");

        // Get updated balance
        const updatedFromBalance = await redis.hgetall(fromBalanceKey);

        return NextResponse.json({
          success: true,
          onChain: false,
          transfer: {
            id: txId,
            from: normalizedFrom,
            to: normalizedTo,
            token: "ETH",
            amount,
          },
          balance: {
            eth: parseFloat(updatedFromBalance?.eth as string || "0"),
          },
        });
      } else {
        // Receiver is external - need on-chain transfer from HOT WALLET
        // Custodial users' ETH is held in hot wallet, not in their KMS wallet
        console.log(`🔐 Custodial to external ETH transfer: ${amount} ETH to ${toAddress} (via hot wallet)`);

        // Deduct from sender's Redis balance first
        await redis.hincrbyfloat(fromBalanceKey, "eth", -amount);

        // Use processWithdraw to send from hot wallet
        const { processWithdraw } = await import("@/lib/blockchain-service");
        const result = await processWithdraw("ETH", toAddress, amount);

        if (!result.success) {
          // Refund the Redis balance on failure
          await redis.hincrbyfloat(fromBalanceKey, "eth", amount);
          return NextResponse.json({
            error: result.error || "ETH transfer failed",
          }, { status: 400 });
        }

        // Log transaction
        const senderTx = {
          id: txId,
          type: "transfer",
          token: "ETH",
          amount: -amount,
          toAddress: normalizedTo,
          txHash: result.txHash,
          status: "completed",
          timestamp: Date.now(),
        };
        await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTx));

        // Send email notifications (non-blocking)
        sendTransferEmails(normalizedFrom, normalizedTo, amount, "ETH");

        return NextResponse.json({
          success: true,
          onChain: true,
          transfer: {
            id: txId,
            from: normalizedFrom,
            to: normalizedTo,
            token: "ETH",
            amount,
            txHash: result.txHash,
            explorerUrl: `https://etherscan.io/tx/${result.txHash}`,
          },
        });
      }
    }

    // Check if on-chain or off-chain transfer
    if (ON_CHAIN_TOKENS.includes(tokenUpper)) {
      // ============= ON-CHAIN TRANSFER (Metal Tokens on Base) =============

      // First check sender's Redis balance (custodial balance)
      const fromBalanceKey = `user:${normalizedFrom}:balance`;
      const fromBalance = await redis.hgetall(fromBalanceKey);
      const senderBalance = parseFloat(fromBalance?.[tokenKey] as string || "0");

      if (senderBalance < amount) {
        return NextResponse.json({
          error: "Insufficient balance",
          available: senderBalance,
          required: amount,
        }, { status: 400 });
      }

      // Use Base network for metal tokens
      const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || "https://mainnet.base.org";
      console.log(`🔗 Using Base RPC: ${baseRpcUrl}`);

      const provider = new ethers.JsonRpcProvider(baseRpcUrl);
      const wallet = new ethers.Wallet(process.env.HOT_WALLET_ETH_PRIVATE_KEY!, provider);

      const contractAddress = TOKEN_CONTRACTS[tokenUpper];
      console.log(`📋 Contract address for ${tokenUpper}: ${contractAddress}`);

      if (!contractAddress) {
        return NextResponse.json({ error: "Token contract not found" }, { status: 400 });
      }

      const contract = new ethers.Contract(contractAddress, ERC20_ABI, wallet);

      // Get decimals
      console.log(`🔍 Fetching decimals for ${tokenUpper}...`);
      const decimals = await contract.decimals();
      console.log(`✅ Decimals: ${decimals}`);
      const amountInUnits = ethers.parseUnits(amount.toString(), decimals);

      // Check hot wallet balance (where tokens are actually held)
      const hotWalletBalance = await contract.balanceOf(wallet.address);
      if (hotWalletBalance < amountInUnits) {
        console.error(`❌ Hot wallet insufficient: has ${ethers.formatUnits(hotWalletBalance, decimals)}, need ${amount}`);
        return NextResponse.json({
          error: "Sistem bakiyesi yetersiz, lütfen destek ile iletişime geçin",
          code: "HOT_WALLET_INSUFFICIENT",
        }, { status: 400 });
      }

      // Execute on-chain transfer from hot wallet to recipient
      console.log(`🚀 On-chain transfer: ${amount} ${tokenUpper} to ${toAddress} (from hot wallet on Base)`);
      const tx = await contract.transfer(toAddress, amountInUnits);
      const receipt = await tx.wait();

      console.log(`✅ Transfer completed: ${receipt.hash}`);

      // Deduct from sender's Redis balance
      await redis.hincrbyfloat(fromBalanceKey, tokenKey, -amount);

      // Log transaction - Gönderen için
      const txId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const senderTransaction = {
        id: txId,
        type: "transfer",
        token: tokenUpper,
        amount: -amount,
        toAddress: normalizedTo,
        txHash: receipt.hash,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTransaction));

      // Log transaction - Alıcı için
      const receiverTransaction = {
        id: txId,
        type: "receive",
        token: tokenUpper,
        amount: amount,
        fromAddress: normalizedFrom,
        txHash: receipt.hash,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedTo}:transactions`, JSON.stringify(receiverTransaction));

      // Send email notifications (non-blocking)
      sendTransferEmails(normalizedFrom, normalizedTo, amount, tokenUpper);

      return NextResponse.json({
        success: true,
        onChain: true,
        transfer: {
          id: txId,
          from: normalizedFrom,
          to: normalizedTo,
          token: tokenUpper,
          amount,
          txHash: receipt.hash,
          explorerUrl: `https://basescan.org/tx/${receipt.hash}`,
        },
      });

    } else {
      // ============= OFF-CHAIN TRANSFER (Redis) =============
      const fromBalanceKey = `user:${normalizedFrom}:balance`;
      const toBalanceKey = `user:${normalizedTo}:balance`;

      // Get sender's balance from Redis
      const fromBalance = await redis.hgetall(fromBalanceKey);
      if (!fromBalance) {
        return NextResponse.json({ error: "Sender not found" }, { status: 404 });
      }
      const senderBalance = parseFloat(fromBalance[tokenKey] as string || "0");

      if (senderBalance < amount) {
        return NextResponse.json({
          error: "Insufficient balance",
          required: amount,
          available: senderBalance,
        }, { status: 400 });
      }

      // Ensure receiver exists
      const toBalance = await redis.hgetall(toBalanceKey);
      if (!toBalance || Object.keys(toBalance).length === 0) {
        await redis.hset(toBalanceKey, { [tokenKey]: 0 });
      }

      // Execute transfer
      const multi = redis.multi();
      multi.hincrbyfloat(fromBalanceKey, tokenKey, -amount);
      multi.hincrbyfloat(toBalanceKey, tokenKey, amount);
      await multi.exec();

      // Log transactions
      const txId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Gönderen için - eksi miktar
      const senderTx = {
        id: txId,
        type: "transfer",
        token: tokenUpper,
        amount: -amount,
        toAddress: normalizedTo,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedFrom}:transactions`, JSON.stringify(senderTx));

      // Alıcı için - artı miktar
      const receiverTx = {
        id: txId,
        type: "receive",
        token: tokenUpper,
        amount: amount,
        fromAddress: normalizedFrom,
        status: "completed",
        timestamp: Date.now(),
      };
      await redis.lpush(`user:${normalizedTo}:transactions`, JSON.stringify(receiverTx));

      // Get updated balance
      const updatedFromBalance = await redis.hgetall(fromBalanceKey);

      // Send email notifications (non-blocking)
      sendTransferEmails(normalizedFrom, normalizedTo, amount, tokenUpper);

      return NextResponse.json({
        success: true,
        onChain: false,
        transfer: {
          id: txId,
          from: normalizedFrom,
          to: normalizedTo,
          token: tokenUpper,
          amount,
        },
        balance: {
          [tokenKey]: parseFloat(updatedFromBalance?.[tokenKey] as string || "0"),
        },
      });
    }

  } catch (error: any) {
    console.error("Transfer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
