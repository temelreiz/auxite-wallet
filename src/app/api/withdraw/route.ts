// app/api/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { processWithdraw } from "@/lib/blockchain-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface WithdrawRequest {
  address: string;
  coin: string;
  auxmAmount: number;
  withdrawAddress: string;
  memo?: string;
}

// Crypto fiyatları (fallback)
const FALLBACK_PRICES: Record<string, number> = {
  USDT: 1,
  BTC: 97500,
  ETH: 3500,
  XRP: 2.2,
  SOL: 200,
};

// Network fee (AUXM olarak, kullanıcıdan kesilir)
const NETWORK_FEES_AUXM: Record<string, number> = {
  USDT: 5,     // ~$5 gas fee
  ETH: 7,      // ~$7 gas fee
  XRP: 0.1,    // XRP fee çok düşük
  SOL: 0.1,    // SOL fee çok düşük
  BTC: 10,     // BTC fee
};

export async function POST(request: NextRequest) {
  try {
    const body: WithdrawRequest = await request.json();
    const { address, coin, auxmAmount, withdrawAddress, memo } = body;

    // Validation
    if (!address || !coin || !auxmAmount || !withdrawAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (auxmAmount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

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

    const auxmBalance = parseFloat(currentBalance.auxm as string || "0");
    const networkFeeAuxm = NETWORK_FEES_AUXM[coin] || 5;
    const totalRequired = auxmAmount + networkFeeAuxm;

    if (totalRequired > auxmBalance) {
      return NextResponse.json({ 
        error: "Insufficient balance",
        required: totalRequired,
        available: auxmBalance,
        breakdown: {
          withdrawAmount: auxmAmount,
          networkFee: networkFeeAuxm,
        }
      }, { status: 400 });
    }

    // Crypto fiyatını al
    let cryptoPrice = FALLBACK_PRICES[coin] || 1;
    try {
      const priceRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/crypto`);
      const priceData = await priceRes.json();
      const coinMap: Record<string, string> = {
        BTC: 'bitcoin',
        ETH: 'ethereum',
        XRP: 'ripple',
        SOL: 'solana',
        USDT: 'tether'
      };
      cryptoPrice = priceData[coinMap[coin]]?.usd || FALLBACK_PRICES[coin];
    } catch {
      console.log('Using fallback price for', coin);
    }

    // AUXM → Crypto dönüşümü (1 AUXM = $1)
    const cryptoAmount = auxmAmount / cryptoPrice;

    // Transaction ID oluştur
    const txId = `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Transaction kaydı (pending olarak başla)
    const transaction = {
      id: txId,
      type: "withdraw",
      fromToken: "AUXM",
      toToken: coin,
      fromAmount: auxmAmount.toString(),
      toAmount: cryptoAmount.toFixed(8),
      fee: networkFeeAuxm.toString(),
      feeToken: "AUXM",
      withdrawAddress,
      memo: memo || null,
      status: "processing",
      timestamp: Date.now(),
    };

    const txKey = `user:${normalizedAddress}:transactions`;
    
    // Önce bakiyeyi düş
    await redis.hincrbyfloat(balanceKey, "auxm", -(auxmAmount + networkFeeAuxm));
    
    // Transaction'ı kaydet
    await redis.lpush(txKey, JSON.stringify(transaction));

    // ===== GERÇEK BLOCKCHAIN TRANSFERİ =====
    console.log(`🚀 Processing ${coin} withdraw: ${cryptoAmount} to ${withdrawAddress}`);
    
    const withdrawResult = await processWithdraw(coin, withdrawAddress, cryptoAmount, coin === "XRP" && memo ? parseInt(memo) : undefined);

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
          auxmAmount,
          cryptoAmount,
          networkFee: networkFeeAuxm,
          withdrawAddress,
          status: "completed",
          txHash: withdrawResult.txHash,
          explorerUrl: getExplorerUrl(coin, withdrawResult.txHash!),
        },
        balances: {
          auxm: parseFloat(updatedBalance.auxm as string || "0"),
          bonusAuxm: parseFloat(updatedBalance.bonusauxm as string || "0"),
        },
      });

    } else {
      // Başarısız - bakiyeyi geri yükle
      await redis.hincrbyfloat(balanceKey, "auxm", auxmAmount + networkFeeAuxm);
      
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
