import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getTokenPrices } from "@/lib/v6-token-service";
import { notifyTrade } from "@/lib/telegram";
import { sendTradeExecutionEmail, sendCertificateEmail } from "@/lib/email";
import { submitForMatching } from "@/lib/matching-engine";
import { recordExposure, closeHedge } from "@/lib/hedge-engine";
import { checkOrderAllowed, recordClientAllocation, recordClientDeallocation } from "@/lib/inventory-manager";
import { handleBonusConvert } from "@/lib/bonus-guard";

// ═══════════════════════════════════════════════════════════════════════════════
// METAL CONVERSION — Atomic Dual-Leg Route
// Architecture: SELL Metal_A → AUXM (internal) → BUY Metal_B
// AUXM = Internal Clearing Currency (never exposed to user)
// This is a CUSTODY MOVEMENT, not a trade.
// ═══════════════════════════════════════════════════════════════════════════════

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const VALID_METALS = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

const METAL_NAMES: Record<string, string> = {
  AUXG: "Gold",
  AUXS: "Silver",
  AUXPT: "Platinum",
  AUXPD: "Palladium",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SERVER-SIDE PRICE — reuses v6-token-service (same as /api/exchange)
// ═══════════════════════════════════════════════════════════════════════════════

async function getMetalPrice(metal: string): Promise<{ ask: number; bid: number }> {
  try {
    const prices = await getTokenPrices(metal);
    return { ask: prices.askPerGram, bid: prices.bidPerGram };
  } catch (e) {
    console.error(`Failed to get ${metal} price:`, e);
    const fallbacks: Record<string, { ask: number; bid: number }> = {
      AUXG: { ask: 170, bid: 160 },
      AUXS: { ask: 3.5, bid: 2.9 },
      AUXPT: { ask: 82, bid: 68 },
      AUXPD: { ask: 60, bid: 56 },
    };
    return fallbacks[metal.toUpperCase()] || { ask: 100, bid: 100 };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// METAL BALANCE — check allocations first, then Redis
// ═══════════════════════════════════════════════════════════════════════════════

async function getMetalBalance(address: string, metal: string): Promise<number> {
  try {
    const normalizedAddress = address.toLowerCase();
    let allocTotal = 0;

    const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (userUid) {
      const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
      if (allocDataRaw) {
        const allocations = typeof allocDataRaw === "string" ? JSON.parse(allocDataRaw) : allocDataRaw;
        for (const alloc of allocations) {
          if (alloc.status === "active" && alloc.metal?.toUpperCase() === metal.toUpperCase()) {
            allocTotal += parseFloat(alloc.grams) || 0;
          }
        }
      }
    }

    // Redis balance (küsurat dahil) — allocation ile birlikte toplam bakiye
    const balanceKey = `user:${normalizedAddress}:balance`;
    const redisBalance = await redis.hget(balanceKey, metal.toLowerCase()) as string;
    const redisBal = parseFloat(redisBalance || "0");

    // Allocation + Redis küsurat = toplam bakiye
    const total = allocTotal + Math.max(0, redisBal);
    console.log(`📦 getMetalBalance: ${metal} alloc=${allocTotal} redis=${redisBal} total=${total}`);
    return total;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAKED/ENCUMBERED CHECK
// ═══════════════════════════════════════════════════════════════════════════════

async function getEncumberedAmount(address: string, metal: string): Promise<number> {
  try {
    const normalizedAddress = address.toLowerCase();

    // Staking positions — aynı key balance API ile tutarlı (user:{address}:staking list)
    const stakingKey = `user:${normalizedAddress}:staking`;
    const positions = await redis.lrange(stakingKey, 0, -1);

    let total = 0;
    const now = Date.now();

    for (const pos of positions) {
      try {
        const position = typeof pos === "string" ? JSON.parse(pos) : pos;
        if (position.status === "active" && position.endDate > now &&
            position.metal?.toLowerCase() === metal.toLowerCase()) {
          total += position.amount || 0;
        }
      } catch { /* skip invalid */ }
    }

    return total;
  } catch {
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST — Execute Metal Conversion
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, fromMetal, toMetal, amount: rawAmount } = body;

    // ── Input Validation ──
    if (!address || !fromMetal || !toMetal || !rawAmount) {
      return NextResponse.json({ error: "Missing required fields: address, fromMetal, toMetal, amount" }, { status: 400 });
    }

    const fromMetalUpper = fromMetal.toUpperCase();
    const toMetalUpper = toMetal.toUpperCase();
    const amount = parseFloat(rawAmount);

    if (!VALID_METALS.includes(fromMetalUpper) || !VALID_METALS.includes(toMetalUpper)) {
      return NextResponse.json({ error: "Invalid metal. Allowed: AUXG, AUXS, AUXPT, AUXPD" }, { status: 400 });
    }

    if (fromMetalUpper === toMetalUpper) {
      return NextResponse.json({ error: "Source and target metals must be different" }, { status: 400 });
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
    }

    if (amount < 1) {
      return NextResponse.json({ error: "Minimum conversion: 1 gram" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    // ── Risk Controls ──
    // 1. Vault freeze check
    const userUid = await redis.get(`user:address:${normalizedAddress}`) as string;
    if (userUid) {
      const userData = await redis.hgetall(`user:${userUid}`);
      if (userData?.vaultFrozen === "true" || userData?.vaultFrozen === true) {
        return NextResponse.json({ error: "Vault is frozen. Conversions are not permitted." }, { status: 403 });
      }
    }

    // 2. Encumbered check (staked metals cannot be converted)
    const encumbered = await getEncumberedAmount(normalizedAddress, fromMetalUpper);
    const totalBalance = await getMetalBalance(normalizedAddress, fromMetalUpper);
    const availableBalance = Math.max(0, totalBalance - encumbered);

    if (availableBalance < amount) {
      return NextResponse.json({
        error: "Insufficient available balance",
        required: amount,
        available: availableBalance,
        encumbered,
        total: totalBalance,
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // SERVER-SIDE PRICING — Dual-leg calculation
    // Leg 1: SELL fromMetal at BID → AUXM proceeds
    // Leg 2: BUY toMetal at ASK with AUXM proceeds
    // ═══════════════════════════════════════════════════════════════════════════

    const fromPrices = await getMetalPrice(fromMetalUpper);
    const toPrices = await getMetalPrice(toMetalUpper);

    const fromBidPrice = fromPrices.bid; // We buy from user at bid (lower)
    const toAskPrice = toPrices.ask;     // We sell to user at ask (higher)

    const auxmProceeds = amount * fromBidPrice;           // USD value of source metal
    const outputGrams = auxmProceeds / toAskPrice;        // Grams of target metal
    const conversionRatio = fromBidPrice / toAskPrice;    // Direct ratio

    console.log(`🔄 METAL CONVERSION: ${amount}g ${fromMetalUpper} → ${outputGrams.toFixed(4)}g ${toMetalUpper}`);
    console.log(`   Leg 1: ${amount}g × $${fromBidPrice} (bid) = $${auxmProceeds.toFixed(2)} AUXM`);
    console.log(`   Leg 2: $${auxmProceeds.toFixed(2)} / $${toAskPrice} (ask) = ${outputGrams.toFixed(4)}g`);
    console.log(`   Ratio: ${conversionRatio.toFixed(4)}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // MATCHED PRINCIPAL INFRASTRUCTURE (both legs)
    // ═══════════════════════════════════════════════════════════════════════════

    let sellMatchResult: any = null;
    let buyMatchResult: any = null;
    let sellHedgeResult: any = null;
    let buyHedgeResult: any = null;

    // ── Leg 1: Sell-side inventory + matching + hedge ──
    try {
      await checkOrderAllowed(fromMetalUpper, amount, "sell");
      sellMatchResult = await submitForMatching("sell", fromMetalUpper, amount, fromBidPrice, normalizedAddress, fromMetalUpper);
      if (sellMatchResult?.matched) {
        console.log(`🔄 SELL MATCH: ${sellMatchResult.matchedGrams.toFixed(4)}g ${fromMetalUpper}`);
      }
    } catch (e) { console.warn("Sell-side infra error (non-blocking):", e); }

    // Hedge unmatched sell portion
    const sellUnmatched = sellMatchResult?.requiresLP ? sellMatchResult.lpGrams : amount;
    if (sellUnmatched > 0) {
      try {
        sellHedgeResult = await recordExposure(fromMetalUpper, sellUnmatched, "sell", fromBidPrice, "conversion_sell", sellMatchResult?.buyOrder?.id);
      } catch (e) { console.warn("Sell hedge error:", e); }
    }

    // ── Leg 2: Buy-side inventory + matching + hedge ──
    try {
      await checkOrderAllowed(toMetalUpper, outputGrams, "buy");
      buyMatchResult = await submitForMatching("buy", toMetalUpper, outputGrams, toAskPrice, normalizedAddress, "AUXM");
      if (buyMatchResult?.matched) {
        console.log(`🔄 BUY MATCH: ${buyMatchResult.matchedGrams.toFixed(4)}g ${toMetalUpper}`);
      }
    } catch (e) { console.warn("Buy-side infra error (non-blocking):", e); }

    const buyUnmatched = buyMatchResult?.requiresLP ? buyMatchResult.lpGrams : outputGrams;
    if (buyUnmatched > 0) {
      try {
        buyHedgeResult = await recordExposure(toMetalUpper, buyUnmatched, "buy", toAskPrice, "conversion_buy", buyMatchResult?.buyOrder?.id);
      } catch (e) { console.warn("Buy hedge error:", e); }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LEG 1 — SELL SOURCE METAL (Release allocation, revoke certificate)
    // ═══════════════════════════════════════════════════════════════════════════

    let revokedCertificate: string | null = null;
    let deductedFromAllocation = false;

    if (userUid) {
      try {
        const allocDataRaw = await redis.get(`allocation:user:${userUid}:list`);
        if (allocDataRaw) {
          const allocations = typeof allocDataRaw === "string" ? JSON.parse(allocDataRaw) : allocDataRaw;
          let remainingToRelease = amount;
          const updatedAllocations = [];

          for (const alloc of allocations) {
            if (alloc.status === "active" && alloc.metal?.toUpperCase() === fromMetalUpper && remainingToRelease > 0) {
              const allocGrams = parseFloat(alloc.grams) || 0;

              if (allocGrams <= remainingToRelease) {
                // Full release
                updatedAllocations.push({
                  ...alloc,
                  status: "released",
                  releasedAt: new Date().toISOString(),
                  releasedGrams: allocGrams,
                  releaseReason: "METAL_CONVERSION",
                });
                if (alloc.certificateNumber) revokedCertificate = alloc.certificateNumber;
                remainingToRelease -= allocGrams;
              } else {
                // Partial release
                updatedAllocations.push({ ...alloc, grams: (allocGrams - remainingToRelease).toString() });
                updatedAllocations.push({
                  ...alloc,
                  id: `${alloc.id}-conversion-${Date.now()}`,
                  grams: remainingToRelease.toString(),
                  status: "released",
                  releasedAt: new Date().toISOString(),
                  releaseReason: "METAL_CONVERSION",
                });
                if (alloc.certificateNumber) revokedCertificate = alloc.certificateNumber;
                remainingToRelease = 0;
              }
            } else {
              updatedAllocations.push(alloc);
            }
          }

          await redis.set(`allocation:user:${userUid}:list`, JSON.stringify(updatedAllocations));

          const releasedFromAllocation = amount - remainingToRelease;
          if (releasedFromAllocation > 0) {
            deductedFromAllocation = true;
            console.log(`📦 Released ${releasedFromAllocation}g ${fromMetalUpper} from allocation`);
          }

          // Allocation tüm miktarı karşılamadıysa, kalanı Redis'ten düş
          if (remainingToRelease > 0) {
            await redis.hincrbyfloat(balanceKey, fromMetalUpper.toLowerCase(), -remainingToRelease);
            console.log(`📉 Partial Redis deduction: ${remainingToRelease}g ${fromMetalUpper} (allocation covered ${releasedFromAllocation}g)`);
            deductedFromAllocation = true;
          }

          // Revoke certificate
          if (revokedCertificate) {
            try {
              const certData = await redis.hgetall(`certificate:${revokedCertificate}`);
              if (certData) {
                await redis.hset(`certificate:${revokedCertificate}`, {
                  status: "VOID",
                  voidReason: "METAL_CONVERSION",
                  voidedAt: new Date().toISOString(),
                });
                console.log(`📜 Certificate REVOKED: ${revokedCertificate}`);
              }
            } catch (e) { console.warn("Certificate revoke error:", e); }
          }

          // Inventory deallocation
          try { await recordClientDeallocation(fromMetalUpper, amount); } catch (e) { console.warn("Inventory dealloc error:", e); }

          // Close sell hedge
          if (sellHedgeResult?.hedgeId) {
            try {
              const closeResult = await closeHedge(sellHedgeResult.hedgeId, fromBidPrice);
              console.log(`📊 SELL HEDGE CLOSED: ${sellHedgeResult.hedgeId} — P&L: $${closeResult.pnl.toFixed(2)}`);
            } catch (e) { console.warn("Sell hedge close error:", e); }
          }
        }
      } catch (e) {
        console.error("Allocation release error:", e);
        // Fallback: allocation release başarısız oldu, Redis'ten düşür
        try {
          await redis.hincrbyfloat(balanceKey, fromMetalUpper.toLowerCase(), -amount);
          console.log(`📉 Fallback: Deducted ${amount}g ${fromMetalUpper} from Redis (allocation error)`);
          deductedFromAllocation = true; // fallback başarılı
        } catch (redisErr) {
          console.error("CRITICAL: Redis fallback deduction also failed:", redisErr);
        }
      }
    }

    // Fallback: deduct from Redis if no allocation
    if (!deductedFromAllocation) {
      await redis.hincrbyfloat(balanceKey, fromMetalUpper.toLowerCase(), -amount);
      console.log(`📉 Deducted ${amount}g ${fromMetalUpper} from Redis (no allocation)`);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LEG 2 — BUY TARGET METAL (Create allocation, issue certificate)
    // ═══════════════════════════════════════════════════════════════════════════

    let newCertificate: string | null = null;
    let allocationInfo: { allocatedGrams?: number; nonAllocatedGrams?: number; certificateNumber?: string } = {};

    const baseUrl = request.headers.get("host")
      ? `https://${request.headers.get("host")}`
      : process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io";

    try {
      const allocRes = await fetch(`${baseUrl}/api/allocations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: normalizedAddress,
          metal: toMetalUpper,
          grams: outputGrams,
        }),
      });
      const allocData = await allocRes.json();

      if (allocData.success) {
        allocationInfo = {
          allocatedGrams: allocData.allocatedGrams,
          nonAllocatedGrams: allocData.nonAllocatedGrams,
          certificateNumber: allocData.certificateNumber,
        };
        newCertificate = allocData.certificateNumber || null;
        console.log(`📜 New certificate issued: ${newCertificate}`);

        // Inventory: record allocation
        try { await recordClientAllocation(toMetalUpper, outputGrams); } catch (e) { console.warn("Inventory alloc error:", e); }

        // Close buy hedge
        if (buyHedgeResult?.hedgeId) {
          try {
            const closeResult = await closeHedge(buyHedgeResult.hedgeId, toAskPrice);
            console.log(`📊 BUY HEDGE CLOSED: ${buyHedgeResult.hedgeId} — P&L: $${closeResult.pnl.toFixed(2)}`);
          } catch (e) { console.warn("Buy hedge close error:", e); }
        }

        // Fractional grams → Redis balance
        if (allocData.nonAllocatedGrams && allocData.nonAllocatedGrams > 0) {
          await redis.hincrbyfloat(balanceKey, toMetalUpper.toLowerCase(), allocData.nonAllocatedGrams);
        }
      } else {
        // Fallback: add to Redis
        await redis.hincrbyfloat(balanceKey, toMetalUpper.toLowerCase(), outputGrams);
        console.error("Allocation failed:", allocData.error);
      }
    } catch (e) {
      // Fallback: add to Redis
      await redis.hincrbyfloat(balanceKey, toMetalUpper.toLowerCase(), outputGrams);
      console.error("Allocation request failed:", e);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BONUS GUARD — Track bonus through metal conversions
    // ═══════════════════════════════════════════════════════════════════════════
    if (userUid) {
      try {
        await handleBonusConvert(userUid, fromMetalUpper, toMetalUpper, amount, outputGrams);
      } catch (bonusErr) {
        console.error("Bonus convert tracking error (non-blocking):", bonusErr);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD TRANSACTION — type: "metal_conversion"
    // ═══════════════════════════════════════════════════════════════════════════

    const txKey = `user:${normalizedAddress}:transactions`;
    const transaction = {
      id: `conversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "metal_conversion",
      fromToken: fromMetalUpper,
      toToken: toMetalUpper,
      fromAmount: amount.toString(),
      toAmount: outputGrams.toString(),
      conversionRatio: conversionRatio.toString(),
      auxmSettlement: auxmProceeds.toFixed(2),
      revokedCertificate: revokedCertificate || undefined,
      newCertificate: newCertificate || undefined,
      allocation: allocationInfo.allocatedGrams ? allocationInfo : undefined,
      status: "completed",
      timestamp: Date.now(),
    };
    await redis.lpush(txKey, JSON.stringify(transaction));

    // ═══════════════════════════════════════════════════════════════════════════
    // TELEGRAM NOTIFICATION + EMAIL
    // ═══════════════════════════════════════════════════════════════════════════

    let userEmail = "";
    let userName = "";
    let userLanguage = "en";
    try {
      if (userUid) {
        const userData = await redis.hgetall(`user:${userUid}`);
        userEmail = (userData?.email as string) || "";
        userName = (userData?.name as string) || (userData?.fullName as string) || "";
        userLanguage = (userData?.language as string) || "en";
      }
    } catch (e) { console.warn("Could not fetch user data:", e); }

    notifyTrade({
      type: "buy",
      userAddress: normalizedAddress,
      fromToken: fromMetalUpper,
      toToken: toMetalUpper,
      fromAmount: amount,
      toAmount: outputGrams,
      certificateNumber: newCertificate || undefined,
      email: userEmail,
    }).catch((err) => console.error("Telegram notification error:", err));

    // ── EMAIL NOTIFICATIONS ──
    console.log(`📧 Convert email: to=${userEmail || 'EMPTY'}, user=${userName || 'EMPTY'}, uid=${userUid || 'EMPTY'}`);

    if (userEmail) {
      const now = new Date().toISOString();
      const txId = transaction.id;

      // 1. Trade Execution Email (conversion = sell source + buy target)
      try {
        const tradeEmailResult = await sendTradeExecutionEmail(userEmail, {
          clientName: userName || undefined,
          transactionType: "Buy",
          metal: toMetalUpper,
          metalName: METAL_NAMES[toMetalUpper] || toMetalUpper,
          grams: outputGrams.toFixed(4),
          executionPrice: `$${toAskPrice.toFixed(2)}/g`,
          grossConsideration: `$${auxmProceeds.toFixed(2)}`,
          executionTime: now,
          referenceId: txId,
          language: userLanguage,
        });
        console.log(`📧 Trade email result:`, tradeEmailResult);
      } catch (err) {
        console.error("📧 Trade execution email FAILED:", err);
      }

      // 2. Certificate Email (if new certificate was issued)
      if (newCertificate) {
        try {
          const certEmailResult = await sendCertificateEmail(userEmail, "", {
            certificateNumber: newCertificate,
            metal: toMetalUpper,
            metalName: METAL_NAMES[toMetalUpper] || toMetalUpper,
            grams: (allocationInfo.allocatedGrams || outputGrams).toFixed(4),
            purity: toMetalUpper === "AUXG" ? "999.9" : toMetalUpper === "AUXS" ? "999.0" : "999.5",
            vaultLocation: "Auxite Segregated Vault — Dubai",
            holderName: userName || undefined,
            language: userLanguage,
          });
          console.log(`📧 Certificate email result:`, certEmailResult);
        } catch (err) {
          console.error("📧 Certificate email FAILED:", err);
        }
      }
    } else {
      console.warn("📧 No user email found — skipping email notifications for conversion");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════════════════════

    console.log(`✅ CONVERSION COMPLETED: ${amount}g ${fromMetalUpper} → ${outputGrams.toFixed(4)}g ${toMetalUpper}`);

    // Push notification (non-blocking)
    const { notifyTransactionRich } = await import('@/lib/notification-sender');
    notifyTransactionRich(normalizedAddress, {
      type: 'metal_conversion', fromToken: fromMetalUpper, toToken: toMetalUpper,
      amount: parseFloat(outputGrams.toFixed(4)), token: toMetalUpper,
      certificateNumber: newCertificate || undefined, channel: 'trades',
    }).catch(err => console.error('[Push] conversion notification error:', err));

    return NextResponse.json({
      success: true,
      conversion: {
        from: { metal: fromMetalUpper, grams: amount },
        to: { metal: toMetalUpper, grams: parseFloat(outputGrams.toFixed(6)), certificateNumber: newCertificate },
        ratio: parseFloat(conversionRatio.toFixed(6)),
        auxmSettlement: parseFloat(auxmProceeds.toFixed(2)),
        settlementMethod: "AUXM internal clearing",
        revokedCertificate,
        newCertificate,
      },
      infrastructure: {
        sellMatch: sellMatchResult?.matched || false,
        buyMatch: buyMatchResult?.matched || false,
        sellHedge: sellHedgeResult?.hedgeId || null,
        buyHedge: buyHedgeResult?.hedgeId || null,
      },
    });

  } catch (error: any) {
    console.error("Metal conversion error:", error);
    return NextResponse.json({ error: error.message || "Conversion failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET — Indicative Conversion Rates
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const metals = ["AUXG", "AUXS", "AUXPT", "AUXPD"];
    const prices: Record<string, { ask: number; bid: number }> = {};

    await Promise.all(
      metals.map(async (metal) => {
        prices[metal] = await getMetalPrice(metal);
      })
    );

    // Build all conversion ratios
    const ratios: Record<string, number> = {};
    for (const from of metals) {
      for (const to of metals) {
        if (from !== to) {
          ratios[`${from}_${to}`] = prices[from].bid / prices[to].ask;
        }
      }
    }

    return NextResponse.json({
      success: true,
      prices,
      ratios,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
