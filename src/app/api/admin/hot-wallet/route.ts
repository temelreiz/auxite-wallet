// src/app/api/admin/hot-wallet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getHotWalletBalances } from "@/lib/blockchain-service";
import * as OTPAuth from "otpauth";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin wallet addresses (kontrol için)
const ADMIN_ADDRESSES = [
  process.env.ADMIN_ADDRESS?.toLowerCase(),
  ...(process.env.NEXT_PUBLIC_ADMIN_ADDRESSES || "").split(",").map(a => a.trim().toLowerCase()),
].filter(Boolean);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN 2FA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════
function get2FAKey(address: string): string {
  return `user:2fa:${address.toLowerCase()}`;
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

async function verifyAdmin2FA(address: string, code: string): Promise<{ valid: boolean; error?: string }> {
  const key = get2FAKey(address);
  const data = await redis.hgetall(key);

  // Admin için 2FA zorunlu
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: "Admin hesabında 2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin." };
  }

  const isEnabled = data.enabled === true || data.enabled === "true";
  if (!isEnabled || !data.secret) {
    return { valid: false, error: "Admin hesabında 2FA etkinleştirilmemiş. Lütfen önce 2FA'yı aktif edin." };
  }

  if (!code) {
    return { valid: false, error: "Admin işlemleri için 2FA kodu gerekli" };
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
      return { valid: true };
    }
  } catch (e) {
    console.error("Admin TOTP verify error:", e);
  }

  // Backup kodu dene
  let backupCodes: string[] = [];
  if (data.backupCodes) {
    try {
      backupCodes = typeof data.backupCodes === "string" ? JSON.parse(data.backupCodes) : data.backupCodes as string[];
    } catch {}
  }

  const hashedInput = hashCode(code.toUpperCase());
  if (backupCodes.includes(hashedInput)) {
    // Backup kodu kullanıldı - sil
    const newCodes = backupCodes.filter(c => c !== hashedInput);
    await redis.hset(key, { backupCodes: JSON.stringify(newCodes), backupCodesRemaining: newCodes.length });
    return { valid: true };
  }

  return { valid: false, error: "Geçersiz 2FA kodu" };
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN AUTHENTICATION - Bearer token + Address verification
// ═══════════════════════════════════════════════════════════════════════════
function isAuthorized(request: NextRequest): { authorized: boolean; adminAddress?: string } {
  // 1. Bearer token kontrolü
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || token === "null" || token === "undefined") {
    return { authorized: false };
  }

  // 2. Admin address kontrolü
  const adminAddress = request.headers.get("x-admin-address");
  if (!adminAddress) {
    return { authorized: false };
  }

  // 3. Admin listesinde mi kontrol et
  if (!ADMIN_ADDRESSES.includes(adminAddress.toLowerCase())) {
    return { authorized: false };
  }

  return { authorized: true, adminAddress: adminAddress.toLowerCase() };
}

// Hot Wallet adresleri
const HOT_WALLETS = {
  ETH: {
    address: process.env.HOT_WALLET_ETH_ADDRESS || '',
    network: 'Ethereum Mainnet',
    explorer: 'https://etherscan.io/address/',
  },
  USDT: {
    address: process.env.HOT_WALLET_USDT_ADDRESS || process.env.HOT_WALLET_ETH_ADDRESS || '',
    network: 'Ethereum (ERC-20)',
    explorer: 'https://etherscan.io/address/',
    contract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  BTC: {
    address: process.env.HOT_WALLET_BTC_ADDRESS || '',
    network: 'Bitcoin Mainnet',
    explorer: 'https://blockstream.info/address/',
  },
  SOL: {
    address: process.env.HOT_WALLET_SOL_ADDRESS || '',
    network: 'Solana Mainnet',
    explorer: 'https://solscan.io/account/',
  },
  XRP: {
    address: process.env.HOT_WALLET_XRP_ADDRESS || '',
    network: 'XRP Ledger',
    explorer: 'https://xrpscan.com/account/',
  },
};

export async function GET(request: NextRequest) {
  try {
    const auth = isAuthorized(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminAddress = auth.adminAddress;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "balances";
    const refresh = searchParams.get("refresh") === "true";

    // ═══════════════════════════════════════════════════════════════
    // BALANCES - Tüm hot wallet bakiyeleri
    // ═══════════════════════════════════════════════════════════════
    if (type === "balances") {
      // Cache'den al veya blockchain'den çek
      const cacheKey = "admin:hot-wallet:balances";
      
      if (!refresh) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return NextResponse.json({ 
            balances: cached, 
            cached: true,
            wallets: HOT_WALLETS 
          });
        }
      }

      // Blockchain'den canlı bakiyeleri al
      const liveBalances = await getHotWalletBalances();
      
      // Formatla
      const balances: Record<string, any> = {};
      
      for (const [coin, wallet] of Object.entries(HOT_WALLETS)) {
        balances[coin] = {
          balance: liveBalances[coin]?.toFixed(coin === 'BTC' ? 8 : 6) || '0',
          address: wallet.address,
          network: wallet.network,
          explorerUrl: wallet.address ? `${wallet.explorer}${wallet.address}` : null,
        };
      }

      // 5 dakika cache'le
      await redis.set(cacheKey, balances, { ex: 300 });

      return NextResponse.json({ 
        balances, 
        cached: false,
        wallets: HOT_WALLETS,
        timestamp: new Date().toISOString()
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ADDRESSES - Sadece adresler
    // ═══════════════════════════════════════════════════════════════
    if (type === "addresses") {
      return NextResponse.json({ wallets: HOT_WALLETS });
    }

    // ═══════════════════════════════════════════════════════════════
    // PENDING WITHDRAWS - Bekleyen çekim talepleri
    // ═══════════════════════════════════════════════════════════════
    if (type === "pending-withdraws") {
      const pendingKey = "admin:pending-withdraws";
      const pending = await redis.lrange(pendingKey, 0, 50);
      
      const withdraws = pending.map((item: any) => {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        return parsed;
      }).filter((w: any) => w.status === 'pending' || w.status === 'processing');

      return NextResponse.json({ withdraws });
    }

    // ═══════════════════════════════════════════════════════════════
    // HISTORY - Son işlemler
    // ═══════════════════════════════════════════════════════════════
    if (type === "history") {
      const historyKey = "admin:hot-wallet:history";
      const history = await redis.lrange(historyKey, 0, 50);
      
      const transactions = history.map((item: any) => {
        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
        return parsed;
      });

      return NextResponse.json({ 
        transactions,
        withdraws: transactions.filter((t: any) => t.type === 'withdraw'),
        deposits: transactions.filter((t: any) => t.type === 'deposit'),
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error: any) {
    console.error("Admin hot-wallet error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Admin kripto gönderimi
// ═══════════════════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
  try {
    const auth = isAuthorized(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const adminAddress = auth.adminAddress;

    const body = await request.json();
    const { action, token, toAddress, amount, withdrawId, twoFactorCode } = body;

    // ═══════════════════════════════════════════════════════════════
    // ADMIN 2FA DOĞRULAMASI - Tüm POST işlemleri için zorunlu
    // ═══════════════════════════════════════════════════════════════
    if (!adminAddress) {
      return NextResponse.json({ error: "Admin address required" }, { status: 400 });
    }

    const twoFAResult = await verifyAdmin2FA(adminAddress, twoFactorCode || "");
    if (!twoFAResult.valid) {
      return NextResponse.json({
        error: twoFAResult.error || "Admin 2FA doğrulaması başarısız",
        code: "ADMIN_2FA_REQUIRED",
        requires2FA: true,
      }, { status: 401 });
    }

    // Rate limiting for admin operations
    const rateLimitKey = `ratelimit:admin_send:${adminAddress}`;
    const now = Math.floor(Date.now() / 1000);
    await redis.zremrangebyscore(rateLimitKey, 0, now - 3600); // 1 saat
    const requestCount = await redis.zcard(rateLimitKey);

    if (requestCount >= 10) { // Saatte max 10 admin gönderim
      return NextResponse.json({
        error: "Admin gönderim limiti aşıldı. Lütfen 1 saat bekleyin.",
        code: "ADMIN_RATE_LIMIT",
      }, { status: 429 });
    }

    await redis.zadd(rateLimitKey, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(rateLimitKey, 7200);

    // ═══════════════════════════════════════════════════════════════
    // SEND - Kripto gönder
    // ═══════════════════════════════════════════════════════════════
    if (action === "send") {
      if (!token || !toAddress || !amount) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }

      const { processWithdraw } = await import("@/lib/blockchain-service");
      
      console.log(`🔐 Admin sending ${amount} ${token} to ${toAddress}`);
      
      const result = await processWithdraw(token, toAddress, parseFloat(amount));

      if (result.success) {
        // İşlemi history'e kaydet
        const historyKey = "admin:hot-wallet:history";
        const historyEntry = {
          type: 'admin-send',
          token,
          amount,
          toAddress,
          txHash: result.txHash,
          adminAddress,
          timestamp: Date.now(),
        };
        await redis.lpush(historyKey, JSON.stringify(historyEntry));

        // Cache'i temizle
        await redis.del("admin:hot-wallet:balances");

        return NextResponse.json({ 
          success: true, 
          txHash: result.txHash,
          message: `${amount} ${token} sent to ${toAddress}`
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // APPROVE WITHDRAW - Bekleyen çekimi onayla
    // ═══════════════════════════════════════════════════════════════
    if (action === "approve-withdraw") {
      if (!withdrawId) {
        return NextResponse.json({ error: "Missing withdrawId" }, { status: 400 });
      }

      // Bekleyen çekimi bul ve işle
      const pendingKey = "admin:pending-withdraws";
      const pending = await redis.lrange(pendingKey, 0, 100);
      
      let withdrawRequest: any = null;
      let withdrawIndex = -1;

      for (let i = 0; i < pending.length; i++) {
        const item = typeof pending[i] === 'string' ? JSON.parse(pending[i]) : pending[i];
        if (item.id === withdrawId) {
          withdrawRequest = item;
          withdrawIndex = i;
          break;
        }
      }

      if (!withdrawRequest) {
        return NextResponse.json({ error: "Withdraw request not found" }, { status: 404 });
      }

      // İşlemi gerçekleştir
      const { processWithdraw } = await import("@/lib/blockchain-service");
      
      const result = await processWithdraw(
        withdrawRequest.token,
        withdrawRequest.toAddress,
        parseFloat(withdrawRequest.amount)
      );

      if (result.success) {
        // Bekleyen listeden kaldır
        await redis.lrem(pendingKey, 1, JSON.stringify(withdrawRequest));
        
        // History'e ekle
        const historyKey = "admin:hot-wallet:history";
        const historyEntry = {
          ...withdrawRequest,
          type: 'withdraw',
          status: 'completed',
          txHash: result.txHash,
          approvedBy: adminAddress,
          approvedAt: Date.now(),
        };
        await redis.lpush(historyKey, JSON.stringify(historyEntry));

        // Cache'i temizle
        await redis.del("admin:hot-wallet:balances");

        return NextResponse.json({ 
          success: true, 
          txHash: result.txHash,
          message: `Withdraw approved: ${withdrawRequest.amount} ${withdrawRequest.token}`
        });
      } else {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: any) {
    console.error("Admin hot-wallet POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
