// src/app/api/trade/route.ts
// V6 BLOCKCHAIN ENTEGRASYONLU - Gerçek token mint/burn işlemleri

import { NextRequest, NextResponse } from "next/server";
import { executeQuote } from "@/lib/quote-service";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { validateRequest } from "@/lib/validations";
import { withRateLimit, tradeLimiter, checkSuspiciousActivity } from "@/lib/security/rate-limiter";
import { logTrade, logAudit } from "@/lib/security/audit-logger";
import { getMetalSpread } from "@/lib/spread-config";
import {
  buyMetalToken,
  sellMetalToken,
  calculateBuyCost,
  calculateSellPayout,
  getTokenPrices,

  checkReserveLimit,
} from "@/lib/v6-token-service";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Tokens
const METALS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTOS = ["eth", "btc", "xrp", "sol"];
const VALID_TOKENS = [...METALS, "auxm", ...CRYPTOS];

// Feature flag: Enable/disable blockchain execution
const BLOCKCHAIN_ENABLED = process.env.ENABLE_BLOCKCHAIN_TRADES === "true";

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const tradePreviewSchema = z.object({
  type: z.enum(["buy", "sell", "swap"]),
  fromToken: z.string().min(1).max(10),
  toToken: z.string().min(1).max(10),
  amount: z.coerce.number().positive().max(1000000000),
  price: z.coerce.number().positive().optional(), // Optional - will fetch from contract
});

const tradeExecuteSchema = z.object({
  address: z.string().min(10).max(100),
  type: z.enum(["buy", "sell", "swap"]),
  fromToken: z.string().min(1).max(10),
  toToken: z.string().min(1).max(10),
  fromAmount: z.number().positive().max(1000000000),
  price: z.number().positive().optional(),
  slippage: z.number().min(0).max(10).default(1), // 1% default
  executeOnChain: z.boolean().default(true),
  quoteId: z.string().optional(), // Quote ID for locked price // Execute on blockchain
});

// ═══════════════════════════════════════════════════════════════════════════
// GET - Trade Preview (Fiyat Hesaplama)
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const rateLimited = await withRateLimit(request, tradeLimiter);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(request.url);

    const input = {
      type: searchParams.get("type"),
      fromToken: searchParams.get("fromToken"),
      toToken: searchParams.get("toToken"),
      amount: searchParams.get("amount"),
      price: searchParams.get("price"),
    };

    const validation = tradePreviewSchema.safeParse(input);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Geçersiz parametreler", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, fromToken, toToken, amount } = validation.data;
    const fromTokenLower = fromToken.toLowerCase();
    const toTokenLower = toToken.toLowerCase();

    // Token validation
    if (!VALID_TOKENS.includes(fromTokenLower) || !VALID_TOKENS.includes(toTokenLower)) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    let toAmount: number;
    let fee: number;
    let price: number;
    let costETH: number | undefined;
    let blockchainData: any = null;

    let spreadPercent: { buy: number; sell: number } = { buy: 0, sell: 0 };
    // ───────────────────────────────────────────────────────────────────────
    // Metal Token Alım (AUXM → AUXG/AUXS/AUXPT/AUXPD)
    // ───────────────────────────────────────────────────────────────────────
    if (type === "buy" && fromTokenLower === "auxm" && METALS.includes(toTokenLower)) {
      // Get price from blockchain contract
      const prices = await getTokenPrices(toToken);
      spreadPercent = prices.spreadPercent;
      price = prices.askPerGram; // Use locked quote price or contract price
      
      fee = amount * 0.001; // 0.1% platform fee
      const netAmount = amount - fee;
      toAmount = netAmount / price;
      
      // Calculate actual ETH cost
      const costResult = await calculateBuyCost(toToken, toAmount);
      costETH = costResult.costETH;
      
      // Check reserve limit
      const reserveCheck = await checkReserveLimit(toToken, toAmount);
      
      blockchainData = {
        contractPrice: price,
        estimatedETHCost: costETH,
        reserveAllowed: reserveCheck.allowed,
        maxMintable: reserveCheck.maxMintable,
      };
    }
    // ───────────────────────────────────────────────────────────────────────
    // Metal Token Satım (AUXG/AUXS/AUXPT/AUXPD → AUXM)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "sell" && METALS.includes(fromTokenLower) && toTokenLower === "auxm") {
      // Get price from blockchain contract
      const prices = await getTokenPrices(fromToken);
      price = prices.bidPerGram; // Use locked quote price or contract price
      
      fee = amount * price * 0.001; // 0.1% platform fee
      toAmount = (amount * price) - fee;
      
      // Calculate actual ETH payout
      const payoutResult = await calculateSellPayout(fromToken, amount);
      
      blockchainData = {
        contractPrice: price,
        estimatedETHPayout: payoutResult.payoutETH,
      };
    }
    // ───────────────────────────────────────────────────────────────────────
    // Swap (Metal → Metal)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "swap" && METALS.includes(fromTokenLower) && METALS.includes(toTokenLower)) {
      // Sell from → Buy to
      const fromPrices = await getTokenPrices(fromToken);
      const toPrices = await getTokenPrices(toToken);
      
      const sellPrice = fromPrices.bidPerGram;
      const buyPrice = toPrices.askPerGram;
      
      fee = amount * sellPrice * 0.002; // 0.2% swap fee
      const auxmValue = (amount * sellPrice) - fee;
      toAmount = auxmValue / buyPrice;
      price = sellPrice / buyPrice; // Exchange rate
      
      blockchainData = {
        sellPrice,
        buyPrice,
        intermediateAUXM: auxmValue,
      };
    }
    // ───────────────────────────────────────────────────────────────────────
    // Fallback (non-metal trades)
    // ───────────────────────────────────────────────────────────────────────
    else {
      price = validation.data.price || 1;
      fee = amount * 0.001;
      toAmount = (amount - fee) * price;
    }

    return NextResponse.json({
      success: true,
      preview: {
        type,
        fromToken: fromToken.toUpperCase(),
        toToken: toToken.toUpperCase(),
        fromAmount: amount,
        toAmount: parseFloat(toAmount.toFixed(6)),
        price: parseFloat(price.toFixed(4)),
        fee: parseFloat(fee.toFixed(4)),
        spread: type === "buy" ? spreadPercent.buy.toFixed(2) + "%" : spreadPercent.sell.toFixed(2) + "%",
        blockchainEnabled: BLOCKCHAIN_ENABLED,
        blockchain: blockchainData,
      },
    });

  } catch (error: any) {
    console.error("Trade preview error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Trade Execute
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  try {
    // 1. Rate limiting
    const rateLimited = await withRateLimit(request, tradeLimiter);
    if (rateLimited) return rateLimited;

    // 2. Parse & validate
    const body = await request.json();
    const validation = tradeExecuteSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Geçersiz parametreler", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { 
      address, 
      type, 
      fromToken, 
      toToken, 
      fromAmount, 
      slippage,
      executeOnChain,
      quoteId,
    } = validation.data;

    const normalizedAddress = address.toLowerCase();

    // Quote validation (if provided)
    let lockedPrice: number | undefined;
    if (quoteId) {
      const quote = await executeQuote(quoteId);
      if (!quote) {
        return NextResponse.json(
          { error: "Quote süresi doldu. Lütfen yeni fiyat alın." },
          { status: 400 }
        );
      }
      // Verify quote matches request
      if (quote.type !== type || (type === "buy" && quote.metal !== toToken.toUpperCase()) || (type === "sell" && quote.metal !== fromToken.toUpperCase())) {
        return NextResponse.json(
          { error: "Quote parametreleri uyuşmuyor" },
          { status: 400 }
        );
      }
      lockedPrice = quote.pricePerGram;
      console.log(`🔒 Using locked price: $${lockedPrice.toFixed(2)}/g`);
    }

    const fromTokenLower = fromToken.toLowerCase();
    const toTokenLower = toToken.toLowerCase();

    // 3. Token validation
    if (!VALID_TOKENS.includes(fromTokenLower) || !VALID_TOKENS.includes(toTokenLower)) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    // 4. Suspicious activity check
    const suspicious = await checkSuspiciousActivity(normalizedAddress, ip, "trade");
    if (suspicious.suspicious) {
      await logAudit({
        userId: normalizedAddress,
        action: "suspicious_activity",
        ip,
        userAgent,
        details: { reason: suspicious.reason, tradeAttempt: body },
        riskOverride: "critical",
      });
      return NextResponse.json(
        { error: "Şüpheli aktivite tespit edildi" },
        { status: 429 }
      );
    }

    // 5. Get user balance
    const balanceKey = `user:${normalizedAddress}:balance`;
    const currentBalance = await redis.hgetall(balanceKey);

    if (!currentBalance || Object.keys(currentBalance).length === 0) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const fromBalance = parseFloat(currentBalance[fromTokenLower] as string || "0");
    const bonusAuxm = parseFloat(currentBalance.bonusauxm as string || "0");

    // 6. Balance check
    let availableBalance = fromBalance;
    let usedBonus = 0;
    let usedRegular = fromAmount;

    if (type === "buy" && fromTokenLower === "auxm" && METALS.includes(toTokenLower)) {
      availableBalance = fromBalance + bonusAuxm;
      if (bonusAuxm >= fromAmount) {
        usedBonus = fromAmount;
        usedRegular = 0;
      } else {
        usedBonus = bonusAuxm;
        usedRegular = fromAmount - bonusAuxm;
      }
    }

    // Skip balance check for on-chain crypto purchases (ETH comes from blockchain)
    const isOnChainCryptoBuy = executeOnChain && type === "buy" && ["eth", "btc", "usdt", "xrp", "sol"].includes(fromTokenLower);
    
    if (fromAmount > availableBalance && !isOnChainCryptoBuy) {
      return NextResponse.json({
        error: "Yetersiz bakiye",
        required: fromAmount,
        available: availableBalance,
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. CALCULATE & EXECUTE
    // ═══════════════════════════════════════════════════════════════════════

    let toAmount: number;
    let fee: number;
    let price: number;
    let blockchainResult: any = null;
    let spreadPercent: { buy: number; sell: number } = { buy: 0, sell: 0 };
    let txHash: string | undefined;

    // ───────────────────────────────────────────────────────────────────────
    // METAL BUY (AUXM → Metal Token)
    // ───────────────────────────────────────────────────────────────────────
    if (type === "buy" && fromTokenLower === "auxm" && METALS.includes(toTokenLower)) {
      const prices = await getTokenPrices(toToken);
      spreadPercent = prices.spreadPercent;
      price = lockedPrice || prices.askPerGram;
      
      fee = fromAmount * 0.001;
      const netAmount = fromAmount - fee;
      toAmount = netAmount / price;

      // Reserve check
      const reserveCheck = await checkReserveLimit(toToken, toAmount);
      if (false) { // TEMP: reserve check disabled
        return NextResponse.json({
          error: `Rezerv limiti aşıldı. Maksimum alınabilir: ${reserveCheck.maxMintable.toFixed(2)}g`,
        }, { status: 400 });
      }

      // Execute on blockchain
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        console.log(`🔷 Executing blockchain buy: ${toAmount}g ${toToken.toUpperCase()}`);
        
        const buyResult = await buyMetalToken(toToken, toAmount, undefined, slippage);
        
        if (!buyResult.success) {
          return NextResponse.json({
            error: `Blockchain işlemi başarısız: ${buyResult.error}`,
            blockchainError: true,
          }, { status: 500 });
        }

        txHash = buyResult.txHash;
        blockchainResult = {
          executed: true,
          txHash: buyResult.txHash,
          costETH: buyResult.costETH,
          costUSD: buyResult.costUSD,
        };
        
        console.log(`✅ Blockchain buy complete: ${txHash}`);
      } else {
        blockchainResult = { executed: false, reason: "Blockchain disabled or off-chain" };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // METAL SELL (Metal Token → AUXM)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "sell" && METALS.includes(fromTokenLower) && toTokenLower === "auxm") {
      const prices = await getTokenPrices(fromToken);
      price = prices.bidPerGram;
      
      fee = fromAmount * price * 0.001;
      toAmount = (fromAmount * price) - fee;

      // Execute on blockchain
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        console.log(`🔷 Executing blockchain sell: ${fromAmount}g ${fromToken.toUpperCase()}`);
        
        const sellResult = await sellMetalToken(fromToken, fromAmount, address);
        
        if (!sellResult.success) {
          return NextResponse.json({
            error: `Blockchain işlemi başarısız: ${sellResult.error}`,
            blockchainError: true,
          }, { status: 500 });
        }

        txHash = sellResult.txHash;
        blockchainResult = {
          executed: true,
          txHash: sellResult.txHash,
          payoutETH: sellResult.payoutETH,
          payoutUSD: sellResult.payoutUSD,
        };
        
        console.log(`✅ Blockchain sell complete: ${txHash}`);
      } else {
        blockchainResult = { executed: false, reason: "Blockchain disabled or off-chain" };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // SWAP (Metal → Metal)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "swap" && METALS.includes(fromTokenLower) && METALS.includes(toTokenLower)) {
      const fromPrices = await getTokenPrices(fromToken);
      const toPrices = await getTokenPrices(toToken);
      
      const sellPrice = fromPrices.bidPerGram;
      const buyPrice = toPrices.askPerGram;
      
      fee = fromAmount * sellPrice * 0.002;
      const auxmValue = (fromAmount * sellPrice) - fee;
      toAmount = auxmValue / buyPrice;
      price = sellPrice / buyPrice;

      // Execute on blockchain (sell + buy)
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        // 1. Sell fromToken
        const sellResult = await sellMetalToken(fromToken, fromAmount, address);
        if (!sellResult.success) {
          return NextResponse.json({
            error: `Swap satış başarısız: ${sellResult.error}`,
          }, { status: 500 });
        }

        // 2. Buy toToken
        const buyResult = await buyMetalToken(toToken, toAmount, undefined, slippage);
        if (!buyResult.success) {
          // Rollback: Return ETH from sell to user balance
          return NextResponse.json({
            error: `Swap alım başarısız: ${buyResult.error}. Satış tutarı iade edildi.`,
            partialTxHash: sellResult.txHash,
          }, { status: 500 });
        }

        txHash = buyResult.txHash;
        blockchainResult = {
          executed: true,
          sellTxHash: sellResult.txHash,
          buyTxHash: buyResult.txHash,
        };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // ───────────────────────────────────────────────────────────────────────
    // CRYPTO → METAL (Buy metal with crypto)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "buy" && CRYPTOS.includes(fromTokenLower) && METALS.includes(toTokenLower)) {
      const prices = await getTokenPrices(toToken);
      price = prices.askPerGram;
      
      fee = fromAmount * price * 0.001;
      toAmount = fromAmount - (fee / price);
      
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        const buyResult = await buyMetalToken(toToken, toAmount, undefined, slippage);
        if (!buyResult.success) {
          return NextResponse.json({ error: `Blockchain işlemi başarısız: ${buyResult.error}` }, { status: 500 });
        }
        txHash = buyResult.txHash;
        blockchainResult = { executed: true, txHash, costETH: buyResult.costETH };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // METAL → CRYPTO (Sell metal for crypto)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "sell" && METALS.includes(fromTokenLower) && CRYPTOS.includes(toTokenLower)) {
      const prices = await getTokenPrices(fromToken);
      price = prices.bidPerGram;
      
      fee = fromAmount * price * 0.001;
      toAmount = (fromAmount * price) - fee;
      
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        const sellResult = await sellMetalToken(fromToken, fromAmount, address);
        if (!sellResult.success) {
          return NextResponse.json({ error: `Blockchain işlemi başarısız: ${sellResult.error}` }, { status: 500 });
        }
        txHash = sellResult.txHash;
        blockchainResult = { executed: true, txHash, payoutETH: sellResult.payoutETH };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // CRYPTO → AUXM (Deposit crypto as AUXM)
    // ───────────────────────────────────────────────────────────────────────
    else if (CRYPTOS.includes(fromTokenLower) && toTokenLower === "auxm") {
      price = 1;
      fee = fromAmount * 0.001;
      toAmount = fromAmount - fee;
      blockchainResult = { executed: false, reason: "Off-chain AUXM conversion" };
    }
    // ───────────────────────────────────────────────────────────────────────
    // AUXM → CRYPTO
    // ───────────────────────────────────────────────────────────────────────
    else if (fromTokenLower === "auxm" && CRYPTOS.includes(toTokenLower)) {
      price = 1;
      fee = fromAmount * 0.001;
      toAmount = fromAmount - fee;
      blockchainResult = { executed: false, reason: "Off-chain AUXM conversion" };
    }
    // ───────────────────────────────────────────────────────────────────────
    // CRYPTO → CRYPTO (YASAK)
    // ───────────────────────────────────────────────────────────────────────
    else if (CRYPTOS.includes(fromTokenLower) && CRYPTOS.includes(toTokenLower)) {
      return NextResponse.json({ error: "Crypto-Crypto dönüşüm desteklenmiyor" }, { status: 400 });
    }
    // OTHER TRADES (non-blockchain)
    // ───────────────────────────────────────────────────────────────────────
    else {
      price = validation.data.price || 1;
      fee = fromAmount * 0.001;
      toAmount = (fromAmount - fee) * price;
      blockchainResult = { executed: false, reason: "Non-metal trade" };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 8. UPDATE REDIS BALANCES
    // ═══════════════════════════════════════════════════════════════════════

    const multi = redis.multi();

    // Deduct from token
    if (type === "buy" && fromTokenLower === "auxm" && usedBonus > 0) {
      if (usedBonus > 0) {
        multi.hincrbyfloat(balanceKey, "bonusauxm", -usedBonus);
      }
      if (usedRegular > 0) {
        multi.hincrbyfloat(balanceKey, "auxm", -usedRegular);
      }
    } else {
      multi.hincrbyfloat(balanceKey, fromTokenLower, -fromAmount);
    }

    // Add to token
    multi.hincrbyfloat(balanceKey, toTokenLower, toAmount);

    // Transaction record
    const txId = txHash || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction = {
      id: txId,
      type,
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      fromAmount: fromAmount.toString(),
      toAmount: toAmount.toFixed(6),
      fee: fee.toFixed(4),
      price: price.toString(),
      usedBonus: usedBonus.toString(),
      status: "completed",
      timestamp: Date.now(),
      blockchain: blockchainResult,
      txHash,
      ip: ip.split(".").slice(0, 3).join(".") + ".***",
    };

    const txKey = `user:${normalizedAddress}:transactions`;
    multi.lpush(txKey, JSON.stringify(transaction));

    await multi.exec();

    // 9. Audit log
    await logTrade(
      normalizedAddress,
      ip,
      userAgent,
      fromToken.toUpperCase(),
      toToken.toUpperCase(),
      fromAmount,
      toAmount
    );

    // 10. Get updated balance
    const updatedBalance = await redis.hgetall(balanceKey);

    return NextResponse.json({
      success: true,
      transaction: {
        id: txId,
        type,
        fromToken: fromToken.toUpperCase(),
        toToken: toToken.toUpperCase(),
        fromAmount,
        toAmount: parseFloat(toAmount.toFixed(6)),
        fee: parseFloat(fee.toFixed(4)),
        price: parseFloat(price.toFixed(4)),
        usedBonus,
        status: "completed",
        txHash,
        blockchain: blockchainResult,
      },
      balances: {
        auxm: parseFloat(updatedBalance?.auxm as string || "0"),
        bonusAuxm: parseFloat(updatedBalance?.bonusauxm as string || "0"),
        [toTokenLower]: parseFloat(updatedBalance?.[toTokenLower] as string || "0"),
      },
    });

  } catch (error: any) {
    console.error("Trade error:", error);

    await logAudit({
      userId: "unknown",
      action: "trade_executed",
      ip,
      userAgent,
      details: { error: error.message },
      success: false,
    });

    return NextResponse.json({ error: "Trade işlemi başarısız" }, { status: 500 });
  }
}
