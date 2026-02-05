// src/app/api/admin/hot-wallet/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getHotWalletBalances } from "@/lib/blockchain-service";
import { getNOWPaymentsBalance } from "@/lib/nowpayments-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin wallet addresses (kontrol için)
const ADMIN_ADDRESSES = [
  process.env.ADMIN_ADDRESS?.toLowerCase(),
  "0x7bb286a8c876ac6283dd0b95d8ec853bbdb20378", // Burak
].filter(Boolean);

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

function isAdmin(address: string | null): boolean {
  if (!address) return false;
  return ADMIN_ADDRESSES.includes(address.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const adminAddress = request.headers.get("x-admin-address");
    
    if (!isAdmin(adminAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

      // NOWPayments bakiyelerini al (BTC, XRP, SOL için)
      let nowPaymentsBalances: Record<string, number> = {};
      try {
        nowPaymentsBalances = await getNOWPaymentsBalance();
        console.log('NOWPayments balances:', nowPaymentsBalances);
      } catch (e) {
        console.error('NOWPayments balance fetch error:', e);
      }

      // Formatla
      const balances: Record<string, any> = {};

      for (const [coin, wallet] of Object.entries(HOT_WALLETS)) {
        // BTC, XRP, SOL için NOWPayments bakiyesini kullan
        let balance = liveBalances[coin] || 0;
        if (['BTC', 'XRP', 'SOL'].includes(coin) && nowPaymentsBalances[coin]) {
          balance = nowPaymentsBalances[coin];
        }

        balances[coin] = {
          balance: balance.toFixed(coin === 'BTC' ? 8 : 6),
          address: wallet.address,
          network: wallet.network,
          explorerUrl: wallet.address ? `${wallet.explorer}${wallet.address}` : null,
          source: ['BTC', 'XRP', 'SOL'].includes(coin) ? 'NOWPayments' : 'blockchain',
        };
      }

      // NOWPayments ek bilgisi
      const nowPaymentsInfo = {
        btc: nowPaymentsBalances.BTC || 0,
        xrp: nowPaymentsBalances.XRP || 0,
        sol: nowPaymentsBalances.SOL || 0,
        usdt: nowPaymentsBalances.USDT || 0,
      };

      // 5 dakika cache'le
      await redis.set(cacheKey, balances, { ex: 300 });

      return NextResponse.json({
        balances,
        nowPaymentsBalances: nowPaymentsInfo,
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
    const adminAddress = request.headers.get("x-admin-address");
    
    if (!isAdmin(adminAddress)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, token, toAddress, amount, withdrawId } = body;

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
