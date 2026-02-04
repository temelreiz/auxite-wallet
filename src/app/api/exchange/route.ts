import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getTokenPrices } from "@/lib/v6-token-service";
import { notifyTrade } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTOS = ["eth", "btc", "xrp", "sol", "usdt"];

// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SIDE PRICE CALCULATION - Frontend manipulation önleme
// ═══════════════════════════════════════════════════════════════════════════

async function getServerPrice(asset: string): Promise<{ ask: number; bid: number }> {
  const assetLower = asset.toLowerCase();
  const assetUpper = asset.toUpperCase();

  // USD, AUXM, USDT = 1:1
  if (assetLower === "usd" || assetLower === "auxm" || assetLower === "usdt") {
    return { ask: 1, bid: 1 };
  }

  // Metals - get from API/Oracle
  if (METALS.includes(assetLower)) {
    try {
      const prices = await getTokenPrices(asset);
      return { ask: prices.askPerGram, bid: prices.bidPerGram };
    } catch (e) {
      console.error(`Failed to get ${asset} price:`, e);
      // Fallback prices (should never be used in production)
      const fallbacks: Record<string, { ask: number; bid: number }> = {
        auxg: { ask: 170, bid: 160 },
        auxs: { ask: 3.5, bid: 2.9 },
        auxpt: { ask: 82, bid: 68 },
        auxpd: { ask: 60, bid: 56 },
      };
      return fallbacks[assetLower] || { ask: 100, bid: 100 };
    }
  }

  // Cryptos - fetch from Binance
  if (CRYPTOS.includes(assetLower)) {
    try {
      const symbols: Record<string, string> = {
        eth: "ETHUSDT", btc: "BTCUSDT", xrp: "XRPUSDT", sol: "SOLUSDT"
      };
      const symbol = symbols[assetLower];
      if (symbol) {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        const data = await res.json();
        const price = parseFloat(data.price);
        return { ask: price, bid: price };
      }
    } catch (e) {
      console.error(`Failed to get ${asset} crypto price:`, e);
    }
    // Fallback
    const fallbacks: Record<string, number> = { eth: 3500, btc: 97000, xrp: 2.2, sol: 235 };
    const p = fallbacks[assetLower] || 1;
    return { ask: p, bid: p };
  }

  return { ask: 1, bid: 1 };
}

// Calculate server-side toAmount
async function calculateServerToAmount(
  fromAsset: string,
  toAsset: string,
  fromAmount: number
): Promise<{ toAmount: number; fromPrice: number; toPrice: number }> {
  const fromPrices = await getServerPrice(fromAsset);
  const toPrices = await getServerPrice(toAsset);

  // User is SELLING fromAsset (we use bid price - we buy low)
  // User is BUYING toAsset (we use ask price - we sell high)
  const fromPrice = fromPrices.bid;
  const toPrice = toPrices.ask;

  // Convert fromAmount to USD value
  const fromValueUSD = fromAmount * fromPrice;

  // Calculate toAmount
  const toAmount = fromValueUSD / toPrice;

  console.log(`📊 Server calculation: ${fromAmount} ${fromAsset} (@ $${fromPrice}) = $${fromValueUSD.toFixed(2)} USD`);
  console.log(`📊 Server calculation: $${fromValueUSD.toFixed(2)} / $${toPrice} = ${toAmount.toFixed(6)} ${toAsset}`);

  return { toAmount, fromPrice, toPrice };
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTODIAL WALLET CHECK
// ═══════════════════════════════════════════════════════════════════════════

async function isCustodialWallet(address: string): Promise<boolean> {
  try {
    const normalizedAddress = address.toLowerCase();
    // First, get userId from address mapping
    const userId = await redis.get(`user:address:${normalizedAddress}`);
    if (userId) {
      const userData = await redis.hgetall(`user:${userId}`);
      if (userData?.walletType === 'custodial') return true;
    }
    // Fallback: check direct address key (legacy format)
    const directUserData = await redis.hgetall(`user:${normalizedAddress}`);
    if (directUserData?.walletType === 'custodial') return true;
    return false;
  } catch (error) {
    console.error('Error checking wallet type:', error);
    return false;
  }
}

// Metal bakiyesini al - önce allocation, sonra Redis fallback
async function getMetalBalance(address: string, metal: string): Promise<number> {
  try {
    const normalizedAddress = address.toLowerCase();
    const metalKey = metal.toLowerCase();

    // 1. Try to get UID (correct key format: user:address:{address})
    const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;

    // 2. Check allocation if UID exists
    if (userUid) {
      const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
      if (allocDataRaw) {
        const allocations = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;

        let allocationTotal = 0;
        for (const alloc of allocations) {
          if (alloc.status === 'active' && alloc.metal?.toUpperCase() === metal.toUpperCase()) {
            allocationTotal += parseFloat(alloc.grams) || 0;
          }
        }

        if (allocationTotal > 0) {
          console.log(`📦 Metal balance from allocation: ${allocationTotal}g ${metal}`);
          return allocationTotal;
        }
      }
    }

    // 3. Fallback to Redis balance
    const balanceKey = `user:${normalizedAddress}:balance`;
    const redisBalance = await redis.hget(balanceKey, metalKey) as string;
    const balance = parseFloat(redisBalance || "0");
    console.log(`📦 Metal balance from Redis: ${balance}g ${metal}`);
    return balance;

  } catch (error) {
    console.error('Error getting metal balance:', error);
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { fromAsset, toAsset, fromAmount, toAmount: clientToAmount, address } = await request.json();

    if (!fromAsset || !toAsset || !fromAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔒 SERVER-SIDE PRICE CALCULATION - Frontend manipulation önleme
    // ═══════════════════════════════════════════════════════════════════════════
    const { toAmount, fromPrice, toPrice } = await calculateServerToAmount(fromAsset, toAsset, fromAmount);

    // Validate: server calculation vs client request (max 5% tolerance for timing differences)
    if (clientToAmount) {
      const diff = Math.abs(toAmount - clientToAmount) / toAmount;
      if (diff > 0.05) {
        console.error(`⚠️ PRICE MANIPULATION DETECTED!`);
        console.error(`   Client requested: ${clientToAmount} ${toAsset}`);
        console.error(`   Server calculated: ${toAmount} ${toAsset}`);
        console.error(`   Difference: ${(diff * 100).toFixed(2)}%`);
        return NextResponse.json({
          error: "Price changed. Please refresh and try again.",
          serverToAmount: toAmount,
          clientToAmount,
        }, { status: 400 });
      }
    }

    console.log(`✅ Exchange validated: ${fromAmount} ${fromAsset} → ${toAmount.toFixed(6)} ${toAsset}`);

    // Get current Redis balance
    const currentBalance = await redis.hgetall(balanceKey) || {};

    // Normalize asset names
    const fromKey = fromAsset.toLowerCase();
    const toKey = toAsset.toLowerCase();

    // Check if custodial wallet
    const isCustodial = await isCustodialWallet(normalizedAddress);
    console.log(`📊 Exchange: ${fromAsset} → ${toAsset}, custodial: ${isCustodial}`);

    // Get balance based on asset type
    let currentFromBalance: number;
    const isSellingMetal = METALS.includes(fromKey);
    const isSellingCrypto = CRYPTOS.includes(fromKey);

    if (isSellingMetal) {
      // Metal satışı - önce allocation, sonra Redis'ten bakiye kontrol et
      currentFromBalance = await getMetalBalance(normalizedAddress, fromAsset);
    } else {
      // Crypto/AUXM - Redis'ten bakiye kontrol et (custodial için her zaman Redis)
      currentFromBalance = parseFloat(currentBalance[fromKey] as string || "0");
      console.log(`📊 ${fromAsset} balance from Redis: ${currentFromBalance}`);
    }

    // Check balance
    if (currentFromBalance < fromAmount) {
      return NextResponse.json({ 
        error: "Insufficient balance",
        required: fromAmount,
        available: currentFromBalance
      }, { status: 400 });
    }

    const baseUrl = request.headers.get('host') 
      ? `https://${request.headers.get('host')}` 
      : process.env.NEXT_PUBLIC_APP_URL || "https://wallet.auxite.io";

    let allocationInfo: { allocatedGrams?: number; nonAllocatedGrams?: number; certificateNumber?: string } = {};
    let releaseInfo: { releasedGrams?: number; metal?: string } = {};

    // If SELLING metal, release allocation or deduct from Redis
    if (isSellingMetal && fromAmount > 0) {
      let deductedFromAllocation = false;
      try {
        // Get user's allocations to find one to release (correct key format)
        const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;
        if (userUid) {
          const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
          if (allocDataRaw) {
            const allocations = typeof allocDataRaw === 'string' ? JSON.parse(allocDataRaw) : allocDataRaw;
            
            // Find active allocations for this metal
            let remainingToRelease = fromAmount;
            const updatedAllocations = [];
            
            for (const alloc of allocations) {
              if (alloc.status === 'active' && alloc.metal?.toUpperCase() === fromAsset.toUpperCase() && remainingToRelease > 0) {
                const allocGrams = parseFloat(alloc.grams) || 0;
                
                if (allocGrams <= remainingToRelease) {
                  // Release entire allocation
                  updatedAllocations.push({
                    ...alloc,
                    status: 'released',
                    releasedAt: new Date().toISOString(),
                    releasedGrams: allocGrams,
                    releaseReason: 'SOLD',
                  });
                  remainingToRelease -= allocGrams;
                  console.log(`📤 Released full allocation: ${allocGrams}g ${fromAsset}`);
                } else {
                  // Partial release
                  updatedAllocations.push({
                    ...alloc,
                    grams: (allocGrams - remainingToRelease).toString(),
                  });
                  updatedAllocations.push({
                    ...alloc,
                    id: `${alloc.id}-released-${Date.now()}`,
                    grams: remainingToRelease.toString(),
                    status: 'released',
                    releasedAt: new Date().toISOString(),
                    releaseReason: 'SOLD',
                  });
                  console.log(`📤 Released partial allocation: ${remainingToRelease}g ${fromAsset}`);
                  remainingToRelease = 0;
                }
              } else {
                updatedAllocations.push(alloc);
              }
            }
            
            // Save updated allocations
            await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(updatedAllocations));
            releaseInfo = { releasedGrams: fromAmount, metal: fromAsset };
            deductedFromAllocation = true;
          }
        }

        // If no allocation found or allocation was empty, deduct from Redis balance
        if (!deductedFromAllocation) {
          await redis.hincrbyfloat(balanceKey, fromKey, -fromAmount);
          console.log(`📉 Deducted ${fromAmount} ${fromAsset} from Redis (no allocation)`);
        }
      } catch (releaseErr: any) {
        console.error("Allocation release failed:", releaseErr.message);
        // Fallback: deduct from Redis
        await redis.hincrbyfloat(balanceKey, fromKey, -fromAmount);
        console.log(`📉 Deducted ${fromAmount} ${fromAsset} from Redis (fallback)`);
      }
    } else if (!isSellingMetal) {
      // Deduct crypto/AUXM from Redis
      // For custodial wallets: always deduct from Redis
      // For external wallets with ETH: skip (should be on-chain) - but we'll deduct anyway for exchange
      await redis.hincrbyfloat(balanceKey, fromKey, -fromAmount);
      console.log(`📉 Deducted ${fromAmount} ${fromAsset} from Redis`);
    }

    // If BUYING metal, create allocation
    if (METALS.includes(toKey) && toAmount > 0) {
      try {
        const allocRes = await fetch(`${baseUrl}/api/allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: normalizedAddress,
            metal: toAsset.toUpperCase(),
            grams: toAmount,
          }),
        });
        const allocData = await allocRes.json();
        console.log("📦 Allocation response:", JSON.stringify(allocData));
        
        if (allocData.success) {
          allocationInfo = {
            allocatedGrams: allocData.allocatedGrams,
            nonAllocatedGrams: allocData.nonAllocatedGrams,
            certificateNumber: allocData.certificateNumber,
          };
          console.log(`📜 Certificate issued: ${allocData.certificateNumber}`);

          // nonAllocatedGrams (küsurat) Redis balance'a eklenmeli
          if (allocData.nonAllocatedGrams && allocData.nonAllocatedGrams > 0) {
            await redis.hincrbyfloat(balanceKey, toKey, allocData.nonAllocatedGrams);
            console.log(`📊 Added ${allocData.nonAllocatedGrams}g ${toAsset} (fractional) to Redis balance`);
          }
        } else {
          console.error("Allocation failed:", allocData.error);
          // Fallback: Add to Redis if allocation fails
          await redis.hincrbyfloat(balanceKey, toKey, toAmount);
        }
      } catch (allocErr: any) {
        console.error("Auto-allocation failed:", allocErr.message);
        // Fallback: Add to Redis if allocation fails
        await redis.hincrbyfloat(balanceKey, toKey, toAmount);
      }
    } else {
      // Non-metal: just add to Redis balance
      await redis.hincrbyfloat(balanceKey, toKey, toAmount);
    }

    // Get updated balance
    const updatedBalance = await redis.hgetall(balanceKey);

    // Log transaction
    const txKey = `user:${normalizedAddress}:transactions`;
    const transaction = {
      id: `exchange_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "exchange",
      fromToken: fromAsset,
      toToken: toAsset,
      fromAmount: fromAmount.toString(),
      toAmount: toAmount.toString(),
      allocation: allocationInfo.allocatedGrams ? allocationInfo : undefined,
      release: releaseInfo.releasedGrams ? releaseInfo : undefined,
      status: "completed",
      timestamp: Date.now(),
    };
    await redis.lpush(txKey, JSON.stringify(transaction));

    // ═══════════════════════════════════════════════════════════════════════════
    // TELEGRAM BİLDİRİMİ - Metal alımlarında admin'e bildirim gönder
    // ═══════════════════════════════════════════════════════════════════════════
    if (METALS.includes(toKey)) {
      // Get user email if available
      let userEmail = "";
      try {
        const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;
        if (userUid) {
          const userData = await redis.hgetall(`user:${userUid}`);
          userEmail = (userData?.email as string) || "";
        }
      } catch (e) {
        console.warn("Could not fetch user email:", e);
      }

      // Async olarak gönder, response'u bekletme
      notifyTrade({
        type: "buy",
        userAddress: normalizedAddress,
        fromToken: fromAsset.toUpperCase(),
        toToken: toAsset.toUpperCase(),
        fromAmount,
        toAmount,
        certificateNumber: allocationInfo.certificateNumber,
        email: userEmail,
      }).then((success) => {
        if (success) {
          console.log(`📱 Exchange Telegram bildirimi gönderildi: ${toAmount.toFixed(4)}g ${toAsset.toUpperCase()}`);
        } else {
          console.error(`❌ Exchange Telegram bildirimi gönderilemedi`);
        }
      }).catch((err) => {
        console.error(`❌ Exchange Telegram bildirim hatası:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      exchange: {
        fromAsset,
        toAsset,
        fromAmount,
        toAmount,
        allocation: allocationInfo,
        release: releaseInfo,
      },
      balances: {
        [fromKey]: parseFloat(updatedBalance?.[fromKey] as string || "0"),
        [toKey]: parseFloat(updatedBalance?.[toKey] as string || "0"),
      },
    });

  } catch (error: any) {
    console.error("Exchange error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
