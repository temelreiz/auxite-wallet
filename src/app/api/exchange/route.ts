import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getTokenPrices } from "@/lib/v6-token-service";
import { notifyTrade } from "@/lib/telegram";
import { sendTradeExecutionEmail, sendCertificateEmail } from "@/lib/email";
import { submitForMatching } from "@/lib/matching-engine";
import { recordExposure, closeHedge } from "@/lib/hedge-engine";
import { checkOrderAllowed, recordClientAllocation, recordClientDeallocation } from "@/lib/inventory-manager";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTOS = ["eth", "btc", "usdt", "usdc"];

const METAL_NAMES: Record<string, string> = {
  AUXG: "Gold",
  AUXS: "Silver",
  AUXPT: "Platinum",
  AUXPD: "Palladium",
};

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

  // Cryptos - fetch from HTX (primary) with Binance fallback
  if (CRYPTOS.includes(assetLower)) {
    try {
      const symbols: Record<string, string> = {
        eth: "ethusdt", btc: "btcusdt"
      };
      const symbol = symbols[assetLower];
      if (symbol) {
        // Try HTX first
        const htxRes = await fetch(`https://api.huobi.pro/market/detail/merged?symbol=${symbol}`);
        const htxData = await htxRes.json();
        if (htxData.status === "ok" && htxData.tick) {
          return { ask: htxData.tick.ask[0], bid: htxData.tick.bid[0] };
        }
        // Fallback to Binance
        const binRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
        const binData = await binRes.json();
        const price = parseFloat(binData.price);
        return { ask: price, bid: price };
      }
    } catch (e) {
      console.error(`Failed to get ${asset} crypto price:`, e);
    }
    // Fallback
    const fallbacks: Record<string, number> = { eth: 2000, btc: 87000 };
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
    // 🛡️ KYC/EMAIL CHECK - Metal alımı için zorunlu
    // ═══════════════════════════════════════════════════════════════════════════
    const isBuyingMetalCheck = METALS.includes(toAsset.toLowerCase());
    if (isBuyingMetalCheck) {
      try {
        const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;
        if (userUid) {
          const userData = await redis.hgetall(`user:${userUid}`);
          const email = (userData?.email as string) || "";
          const kycStatus = (userData?.kycStatus as string) || "";

          if (!email) {
            return NextResponse.json({
              error: "Metal alımı için email adresi gereklidir. Lütfen profil ayarlarından email adresinizi ekleyin.",
              code: "EMAIL_REQUIRED",
            }, { status: 403 });
          }

          if (kycStatus !== "verified") {
            console.warn(`⚠️ KYC not verified for ${normalizedAddress} (status: ${kycStatus || "none"})`);
          }
        } else {
          // Legacy format check
          const legacyInfo = await redis.hgetall(`user:${normalizedAddress}:info`);
          const email = (legacyInfo?.email as string) || "";
          if (!email) {
            return NextResponse.json({
              error: "Metal alımı için email adresi gereklidir. Lütfen profil ayarlarından email adresinizi ekleyin.",
              code: "EMAIL_REQUIRED",
            }, { status: 403 });
          }
        }
      } catch (e) {
        console.warn("KYC/Email check error (non-blocking):", e);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔒 BONUS TOKEN SELL PROTECTION
    // ═══════════════════════════════════════════════════════════════════════════
    const isSellingMetal = METALS.includes(fromAsset.toLowerCase());
    if (isSellingMetal) {
      const bonusStatus = await redis.get(`user:${normalizedAddress}:bonus:welcome`);
      if (bonusStatus === 'claimed') {
        const bonusAmount = parseFloat((await redis.get(`user:${normalizedAddress}:bonus:welcomeAmount`) as string) || '0');
        if (bonusAmount > 0) {
          const metalKey = fromAsset.toLowerCase();
          const currentBalance = parseFloat((await redis.hget(balanceKey, metalKey) as string) || '0');
          // Check if bonus token is same metal being sold
          const bonusToken = 'auxs'; // Welcome bonus is always AUXS
          if (metalKey === bonusToken) {
            const nonBonusBalance = Math.max(0, currentBalance - bonusAmount);
            if (fromAmount > nonBonusBalance) {
              return NextResponse.json({
                error: "Bonus tokens cannot be sold. Your bonus balance is locked until unlock conditions are met (30 days or 5x trading volume).",
                code: "BONUS_LOCKED",
              }, { status: 403 });
            }
          }
        }
      }
    }

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

    // ═══════════════════════════════════════════════════════════════════════════
    // 🏛️ MATCHED PRINCIPAL INFRASTRUCTURE
    // Layer 1: Inventory check — would this create forbidden directional exposure?
    // Layer 2: Internal matching — find counterparty before going to LP
    // Layer 3: Hedge — cover unmatched exposure immediately
    // ═══════════════════════════════════════════════════════════════════════════
    const isBuyingMetal = METALS.includes(toAsset.toLowerCase());
    const isSellingMetal_check = METALS.includes(fromAsset.toLowerCase());
    let matchResult: any = null;
    let hedgeResult: any = null;

    if (isBuyingMetal || isSellingMetal_check) {
      const metal = isBuyingMetal ? toAsset.toUpperCase() : fromAsset.toUpperCase();
      const side = isBuyingMetal ? 'buy' : 'sell';
      const grams = isBuyingMetal ? toAmount : fromAmount;
      const price = isBuyingMetal ? toPrice : fromPrice;

      // ── L1: INVENTORY CHECK ──
      const inventoryCheck = await checkOrderAllowed(metal, grams, side);
      if (!inventoryCheck.allowed) {
        console.warn(`🚨 INVENTORY BLOCK: ${inventoryCheck.reason}`);
        // Don't hard-block user — log and continue (inventory manager tracks it)
      }

      // ── L2: INTERNAL MATCHING ──
      try {
        matchResult = await submitForMatching(side, metal, grams, price, normalizedAddress, fromAsset);
        if (matchResult.matched) {
          console.log(`🔄 INTERNAL MATCH: ${matchResult.matchedGrams.toFixed(4)}g ${metal} (${matchResult.matchType})`);
          console.log(`💰 Spread captured: $${matchResult.spreadCaptured.toFixed(2)}`);
        }
      } catch (matchErr) {
        console.warn('Matching engine error (non-blocking):', matchErr);
      }

      // ── L3: HEDGE UNMATCHED PORTION ──
      const unmatched = matchResult?.requiresLP ? matchResult.lpGrams : grams;
      if (unmatched > 0) {
        try {
          hedgeResult = await recordExposure(
            metal, unmatched, side, price,
            matchResult?.matched ? 'partial_unmatched' : 'no_match_lp_required',
            matchResult?.buyOrder?.id,
          );
          if (hedgeResult.needsHedge) {
            console.log(`📊 HEDGE OPENED: ${hedgeResult.hedgeId} — ${unmatched.toFixed(4)}g ${metal}`);
          }
        } catch (hedgeErr) {
          console.warn('Hedge engine error (non-blocking):', hedgeErr);
        }
      }
    }

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
      : process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

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

            // ── INVENTORY: Record client de-allocation ──
            try {
              await recordClientDeallocation(fromAsset.toUpperCase(), fromAmount);
            } catch (e) { console.warn('Inventory dealloc track error:', e); }

            // ── HEDGE: Close hedge for sell side ──
            if (hedgeResult?.hedgeId) {
              try {
                const closeResult = await closeHedge(hedgeResult.hedgeId, fromPrice);
                console.log(`📊 SELL HEDGE CLOSED: ${hedgeResult.hedgeId} — P&L: $${closeResult.pnl.toFixed(2)}`);
              } catch (e) { console.warn('Sell hedge close error:', e); }
            }
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

          // ── INVENTORY: Record client allocation ──
          try {
            await recordClientAllocation(toAsset.toUpperCase(), toAmount);
          } catch (e) { console.warn('Inventory track error:', e); }

          // ── HEDGE: Close hedge now that physical is allocated ──
          if (hedgeResult?.hedgeId) {
            try {
              const closeResult = await closeHedge(hedgeResult.hedgeId, toPrice);
              console.log(`📊 HEDGE CLOSED: ${hedgeResult.hedgeId} — P&L: $${closeResult.pnl.toFixed(2)}`);
            } catch (e) { console.warn('Hedge close error:', e); }
          }

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
    // TELEGRAM BİLDİRİMİ + EMAIL — Metal alımlarında admin'e bildirim + kullanıcıya email
    // ═══════════════════════════════════════════════════════════════════════════
    if (METALS.includes(toKey) || METALS.includes(fromKey)) {
      // Get user info for notifications
      let userEmail = "";
      let userName = "";
      let userLanguage = "en";
      try {
        const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;
        if (userUid) {
          const userData = await redis.hgetall(`user:${userUid}`);
          userEmail = (userData?.email as string) || "";
          userName = (userData?.name as string) || (userData?.fullName as string) || "";
          userLanguage = (userData?.language as string) || "en";
        }
      } catch (e) {
        console.warn("Could not fetch user data:", e);
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

      // ── EMAIL NOTIFICATIONS ──
      console.log(`📧 Exchange email: to=${userEmail || 'EMPTY'}, user=${userName || 'EMPTY'}`);

      if (userEmail) {
        const now = new Date().toISOString();
        const txId = transaction.id;
        const isBuying = METALS.includes(toKey);
        const metal = isBuying ? toAsset.toUpperCase() : fromAsset.toUpperCase();
        const metalGrams = isBuying ? toAmount : fromAmount;
        const metalPrice = isBuying ? toPrice : fromPrice;
        const totalValue = metalGrams * metalPrice;

        // 1. Trade Execution Email
        try {
          const tradeEmailResult = await sendTradeExecutionEmail(userEmail, {
            clientName: userName || undefined,
            transactionType: isBuying ? "Buy" : "Sell",
            metal,
            metalName: METAL_NAMES[metal] || metal,
            grams: metalGrams.toFixed(4),
            executionPrice: `$${metalPrice.toFixed(2)}/g`,
            grossConsideration: `$${totalValue.toFixed(2)}`,
            executionTime: now,
            referenceId: txId,
            language: userLanguage,
          });
          console.log(`📧 Exchange trade email result:`, tradeEmailResult);
        } catch (err) {
          console.error("📧 Exchange trade email FAILED:", err);
        }

        // 2. Certificate Email (if buying metal and certificate was issued)
        if (isBuying && allocationInfo.certificateNumber) {
          try {
            const certEmailResult = await sendCertificateEmail(userEmail, "", {
              certificateNumber: allocationInfo.certificateNumber,
              metal,
              metalName: METAL_NAMES[metal] || metal,
              grams: (allocationInfo.allocatedGrams || metalGrams).toFixed(4),
              purity: metal === "AUXG" ? "999.9" : metal === "AUXS" ? "999.0" : "999.5",
              vaultLocation: "Auxite Segregated Vault — Dubai",
              holderName: userName || undefined,
              language: userLanguage,
            });
            console.log(`📧 Exchange certificate email result:`, certEmailResult);
          } catch (err) {
            console.error("📧 Exchange certificate email FAILED:", err);
          }
        }
      } else {
        console.warn("📧 No user email found — skipping email notifications for exchange");
      }
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
      // ── MATCHED PRINCIPAL METADATA ──
      infrastructure: {
        internalMatch: matchResult?.matched || false,
        matchType: matchResult?.matchType || 'none',
        matchedGrams: matchResult?.matchedGrams || 0,
        spreadCaptured: matchResult?.spreadCaptured || 0,
        hedgeOpened: hedgeResult?.needsHedge || false,
        hedgeId: hedgeResult?.hedgeId || null,
      },
    });

  } catch (error: any) {
    console.error("Exchange error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
