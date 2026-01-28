// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { processWithdraw } from "@/lib/blockchain-service";
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
  memo?: string;
}

// Network fee (kripto cinsinden)
const NETWORK_FEES: Record<string, number> = {
  USDT: 1,      // 1 USDT gas fee
  ETH: 0.001,   // 0.001 ETH gas fee
  XRP: 0.1,     // 0.1 XRP fee
  SOL: 0.01,    // 0.01 SOL fee
  BTC: 0.0001,  // 0.0001 BTC fee
};

// Minimum çekim miktarları
const MIN_WITHDRAW: Record<string, number> = {
  USDT: 10,
  ETH: 0.001,
  XRP: 10,
  SOL: 0.1,
  BTC: 0.0005,
};

// Balance key mapping
const BALANCE_KEYS: Record<string, string> = {
  USDT: "usdt",
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
    const body: WithdrawRequest = await request.json();
    const { address, coin, amount, withdrawAddress, memo, twoFactorCode } = body;

    // Validation
    if (!address || !coin || !amount || !withdrawAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    // Desteklenen coinler
    const supportedCoins = ["USDT", "ETH", "XRP", "SOL", "BTC"];
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

    // 2FA Kontrolü artık frontend'de TwoFactorGate ile yapılıyor
    // API'ye gelene kadar kullanıcı zaten doğrulanmış oluyor

    // BTC henüz desteklenmiyor
    if (coin === "BTC") {
      return NextResponse.json({ 
        error: "BTC withdrawals coming soon. Please use ETH, USDT, XRP or SOL." 
      }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    // Mevcut bakiyeyi al
    const currentBalance = await redis.hgetall(balanceKey);

    if (!currentBalance || Object.keys(currentBalance).length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Seçili kripto'nun bakiyesini kontrol et
    const balanceFieldKey = BALANCE_KEYS[coin];
    const cryptoBalance = parseFloat(currentBalance[balanceFieldKey] as string || "0");
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

    // ===== GERÇEK BLOCKCHAIN TRANSFERİ =====
    console.log(`🚀 Processing ${coin} withdraw: ${netAmount} to ${withdrawAddress}`);
    
    const withdrawResult = await processWithdraw(
      coin, 
      withdrawAddress, 
      netAmount, 
      coin === "XRP" && memo ? parseInt(memo) : undefined
    );

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

      return NextResponse.json({ 
        error: withdrawResult.error || "Withdrawal failed",
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
