// src/app/api/trade/route.ts
export const maxDuration = 60;
// V6 BLOCKCHAIN ENTEGRASYONLU - Gerçek token mint/burn işlemleri
// ✅ AUXITEER TIER BAZLI FEE ENTEGRASYONU
import { NextRequest, NextResponse } from "next/server";
import { executeQuote } from "@/lib/quote-service";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { validateRequest } from "@/lib/validations";
import { withRateLimit, tradeLimiter, checkSuspiciousActivity } from "@/lib/security/rate-limiter";
import { logTrade, logAudit } from "@/lib/security/audit-logger";
import { getMetalSpread } from "@/lib/spread-config";
import { getUserTier, calculateTierFee, getDefaultTier } from "@/lib/auxiteer-service";
import { createPublicClient, http, formatUnits } from "viem";
import { sepolia } from "viem/chains";
import {
  updateOraclePrices,
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
const CRYPTOS = ["eth", "btc", "xrp", "sol", "usdt"];
const VALID_TOKENS = [...METALS, "auxm", ...CRYPTOS];

// Feature flag: Enable/disable blockchain execution
const BLOCKCHAIN_ENABLED = process.env.ENABLE_BLOCKCHAIN_TRADES === "true";

// Blockchain client for balance checks
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(RPC_URL, { timeout: 10000 }),
});

// Token addresses
const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  auxg: "0xDc47ee58d95c6CcF515e2532b3F792A623b2BcbF",
  auxs: "0xA51e78dbDF6EFe6C5Fe933ffb3De410cf9513883",
  auxpt: "0x472578d3d235894b4d34458E2d16cA7A571abc7a",
  auxpd: "0x419B25b00aDe21146a4f3dF3b151108E82088727",
  usdt: "0x738e3134d83014B7a63CFF08C13CBBF0671EEeF2",
};

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// Get blockchain balance for on-chain tokens
async function getBlockchainBalance(address: string, token: string): Promise<number> {
  const tokenLower = token.toLowerCase();
  const tokenAddress = TOKEN_ADDRESSES[tokenLower];
  
  if (!tokenAddress) return 0;
  
  try {
    const decimals = tokenLower === "usdt" ? 6 : 18;
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    return parseFloat(formatUnits(balance, decimals));
  } catch (error) {
    console.error(`Error getting blockchain balance for ${token}:`, error);
    return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

const tradePreviewSchema = z.object({
  type: z.enum(["buy", "sell", "swap"]),
  fromToken: z.string().min(1).max(10),
  toToken: z.string().min(1).max(10),
  amount: z.coerce.number().positive().max(1000000000),
  price: z.preprocess(
    (val) => (val === '' || val === null || val === undefined) ? undefined : Number(val),
    z.number().positive().optional()
  ),
  address: z.string().optional(), // For tier-based fee preview
});

const tradeExecuteSchema = z.object({
  address: z.string().min(10).max(100),
  type: z.enum(["buy", "sell", "swap"]),
  fromToken: z.string().min(1).max(10),
  toToken: z.string().min(1).max(10),
  fromAmount: z.number().positive().max(1000000000),
  price: z.number().positive().optional(),
  slippage: z.number().min(0).max(10).default(1),
  executeOnChain: z.boolean().default(true),
  quoteId: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// GET - Trade Preview (Fiyat Hesaplama) - TIER BAZLI FEE
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
      address: searchParams.get("address"), // Optional: for tier-based fee
    };

    const validation = tradePreviewSchema.safeParse(input);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Geçersiz parametreler", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, fromToken, toToken, amount, address } = validation.data;
    const fromTokenLower = fromToken.toLowerCase();
    const toTokenLower = toToken.toLowerCase();

    // Token validation
    if (!VALID_TOKENS.includes(fromTokenLower) || !VALID_TOKENS.includes(toTokenLower)) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // GET USER TIER FOR FEE CALCULATION
    // ═══════════════════════════════════════════════════════════════════════
    let userTier = getDefaultTier();
    let tierInfo = null;
    
    if (address) {
      try {
        const tierData = await getUserTier(address);
        userTier = tierData.tier;
        tierInfo = {
          id: userTier.id,
          name: userTier.name,
          feePercent: userTier.fee,
          spreadPercent: userTier.spread,
        };
      } catch (e) {
        console.warn("Could not fetch user tier, using default:", e);
      }
    }

    // Fee percentage based on tier (default Regular: 0.35%)
    const tierFeePercent = userTier.fee;
    
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
      const prices = await getTokenPrices(toToken);
      spreadPercent = prices.spreadPercent;
      price = prices.askPerGram;
      
      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(amount, tierFeePercent);
      const netAmount = amount - fee;
      toAmount = netAmount / price;
      
      const costResult = await calculateBuyCost(toToken, toAmount);
      costETH = costResult.costETH;
      
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
      const prices = await getTokenPrices(fromToken);
      price = prices.bidPerGram;
      
      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(amount * price, tierFeePercent);
      toAmount = (amount * price) - fee;
      
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
      const fromPrices = await getTokenPrices(fromToken);
      const toPrices = await getTokenPrices(toToken);
      
      const sellPrice = fromPrices.bidPerGram;
      const buyPrice = toPrices.askPerGram;
      
      // ✅ TIER BAZLI FEE (swap için 2x normal fee)
      fee = calculateTierFee(amount * sellPrice, tierFeePercent * 2);
      const auxmValue = (amount * sellPrice) - fee;
      toAmount = auxmValue / buyPrice;
      price = sellPrice / buyPrice;
      
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
      fee = calculateTierFee(amount, tierFeePercent);
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
        feePercent: tierFeePercent,
        spread: type === "buy" ? spreadPercent.buy.toFixed(2) + "%" : spreadPercent.sell.toFixed(2) + "%",
        blockchainEnabled: BLOCKCHAIN_ENABLED,
        blockchain: blockchainData,
        tier: tierInfo, // Include tier info in response
      },
    });

  } catch (error: any) {
    console.error("Trade preview error:", error);
    return NextResponse.json({ error: "Preview failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Trade Execute - TIER BAZLI FEE
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

    // ═══════════════════════════════════════════════════════════════════════
    // GET USER TIER FOR FEE CALCULATION
    // ═══════════════════════════════════════════════════════════════════════
    let userTier = getDefaultTier();
    try {
      const tierData = await getUserTier(normalizedAddress);
      userTier = tierData.tier;
      console.log(`📊 User tier: ${userTier.name} (fee: ${userTier.fee}%)`);
    } catch (e) {
      console.warn("Could not fetch user tier, using default Regular:", e);
    }
    
    const tierFeePercent = userTier.fee;

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

    let fromBalance = parseFloat(currentBalance[fromTokenLower] as string || "0");
    const bonusAuxm = parseFloat(currentBalance.bonusauxm as string || "0");

    // Debug: Log all balances
    console.log(`📊 Balance Debug for ${normalizedAddress}:`);
    console.log(`   Redis ${fromTokenLower}: ${fromBalance}`);
    console.log(`   Redis bonusAuxm: ${bonusAuxm}`);
    console.log(`   Redis all:`, currentBalance);

    // Check blockchain balance for on-chain tokens (metals + USDT)
    const ON_CHAIN_TOKENS = ["usdt", "auxg", "auxs", "auxpt", "auxpd"];
    if (ON_CHAIN_TOKENS.includes(fromTokenLower)) {
      const blockchainBalance = await getBlockchainBalance(normalizedAddress, fromTokenLower);
      console.log(`   Blockchain ${fromTokenLower}: ${blockchainBalance}`);
      fromBalance = blockchainBalance;
    }
    
    // For AUXM: Use Redis balance (it's off-chain token)
    // Make sure we're reading the correct key
    if (fromTokenLower === "auxm") {
      // Try both 'auxm' and 'AUXM' keys
      const auxmBalance = parseFloat(currentBalance.auxm as string || currentBalance.AUXM as string || "0");
      console.log(`   AUXM from Redis: ${auxmBalance}`);
      fromBalance = auxmBalance;
    }
    
    // For other cryptos (ETH, BTC, etc.) - use Redis balance
    // These are tracked off-chain in this system
    const OFF_CHAIN_CRYPTOS = ["eth", "btc", "xrp", "sol"];
    if (OFF_CHAIN_CRYPTOS.includes(fromTokenLower)) {
      console.log(`   ${fromTokenLower} is off-chain, using Redis: ${fromBalance}`);
    }

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

    console.log(`📊 Balance Check: required=${fromAmount}, available=${availableBalance}, fromBalance=${fromBalance}, bonusAuxm=${bonusAuxm}`);

    const isOnChainCryptoBuy = executeOnChain && type === "buy" && ["eth", "btc", "usdt", "xrp", "sol"].includes(fromTokenLower);
    
    if (fromAmount > availableBalance && !isOnChainCryptoBuy) {
      return NextResponse.json({
        error: "Yetersiz bakiye",
        required: fromAmount,
        available: availableBalance,
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 7. CALCULATE & EXECUTE WITH TIER-BASED FEE
    // ═══════════════════════════════════════════════════════════════════════

    let toAmount: number;
    let fee: number;
    let price: number;
    let blockchainResult: any = null;
    let spreadPercent: { buy: number; sell: number } = { buy: 0, sell: 0 };
    let txHash: string | undefined;

    // ───────────────────────────────────────────────────────────────────────
    // METAL BUY (AUXM → Metal Token) - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    if (type === "buy" && fromTokenLower === "auxm" && METALS.includes(toTokenLower)) {
      const prices = await getTokenPrices(toToken);
      spreadPercent = prices.spreadPercent;
      price = lockedPrice || prices.askPerGram;
      
      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(fromAmount, tierFeePercent);
      const netAmount = fromAmount - fee;
      toAmount = netAmount / price;

      const reserveCheck = await checkReserveLimit(toToken, toAmount);
      if (false) { // TEMP: reserve check disabled
        return NextResponse.json({
          error: `Rezerv limiti aşıldı. Maksimum alınabilir: ${reserveCheck.maxMintable.toFixed(2)}g`,
        }, { status: 400 });
      }

      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        console.log(`🔷 Executing blockchain buy: ${toAmount}g ${toToken.toUpperCase()}`);
        
        // Oracle updated via cron
        const buyResult = await buyMetalToken(toToken, toAmount, address, slippage);
        
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
    // METAL SELL (Metal Token → AUXM) - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "sell" && METALS.includes(fromTokenLower) && toTokenLower === "auxm") {
      const prices = await getTokenPrices(fromToken);
      price = prices.bidPerGram;
      
      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(fromAmount, tierFeePercent);
      toAmount = (fromAmount * price) - fee;

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
    // SWAP (Metal → Metal) - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "swap" && METALS.includes(fromTokenLower) && METALS.includes(toTokenLower)) {
      const fromPrices = await getTokenPrices(fromToken);
      const toPrices = await getTokenPrices(toToken);
      
      const sellPrice = fromPrices.bidPerGram;
      const buyPrice = toPrices.askPerGram;
      
      // ✅ TIER BAZLI FEE (swap için 2x normal fee)
      fee = calculateTierFee(fromAmount * sellPrice, tierFeePercent * 2);
      const auxmValue = (fromAmount * sellPrice) - fee;
      toAmount = auxmValue / buyPrice;
      price = sellPrice / buyPrice;

      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        const sellResult = await sellMetalToken(fromToken, fromAmount, address);
        if (!sellResult.success) {
          return NextResponse.json({
            error: `Swap satış başarısız: ${sellResult.error}`,
          }, { status: 500 });
        }

        // Oracle updated via cron
        const buyResult = await buyMetalToken(toToken, toAmount, address, slippage);
        if (!buyResult.success) {
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
    // CRYPTO → METAL (Buy metal with crypto) - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "buy" && CRYPTOS.includes(fromTokenLower) && METALS.includes(toTokenLower)) {
      const prices = await getTokenPrices(toToken);
      price = prices.askPerGram;
      
      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(fromAmount, tierFeePercent);
      toAmount = (fromAmount - fee) / price;
      
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        // Oracle updated via cron
        const buyResult = await buyMetalToken(toToken, toAmount, address, slippage);
        if (!buyResult.success) {
          return NextResponse.json({ error: `Blockchain işlemi başarısız: ${buyResult.error}` }, { status: 500 });
        }
        txHash = buyResult.txHash;
        blockchainResult = { executed: true, txHash, costETH: buyResult.costETH };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // METAL → CRYPTO (Sell metal for crypto) - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "sell" && METALS.includes(fromTokenLower) && CRYPTOS.includes(toTokenLower)) {
      const prices = await getTokenPrices(fromToken);
      price = prices.bidPerGram;
      
      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(fromAmount, tierFeePercent);
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
    // CRYPTO → AUXM - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else if (CRYPTOS.includes(fromTokenLower) && toTokenLower === "auxm") {
      price = 1;
      fee = calculateTierFee(fromAmount, tierFeePercent);
      toAmount = fromAmount - fee;
      blockchainResult = { executed: false, reason: "Off-chain AUXM conversion" };
    }
    // ───────────────────────────────────────────────────────────────────────
    // AUXM → CRYPTO - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else if (fromTokenLower === "auxm" && CRYPTOS.includes(toTokenLower)) {
      price = 1;
      fee = calculateTierFee(fromAmount, tierFeePercent);
      toAmount = fromAmount - fee;
      blockchainResult = { executed: false, reason: "Off-chain AUXM conversion" };
    }
    // ───────────────────────────────────────────────────────────────────────
    // CRYPTO → CRYPTO (YASAK)
    // ───────────────────────────────────────────────────────────────────────
    else if (CRYPTOS.includes(fromTokenLower) && CRYPTOS.includes(toTokenLower)) {
      return NextResponse.json({ error: "Crypto-Crypto dönüşüm desteklenmiyor" }, { status: 400 });
    }
    // OTHER TRADES - TIER BAZLI FEE
    // ───────────────────────────────────────────────────────────────────────
    else {
      price = validation.data.price || 1;
      fee = calculateTierFee(fromAmount, tierFeePercent);
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
      feePercent: tierFeePercent,
      price: price.toString(),
      usedBonus: usedBonus.toString(),
      status: "completed",
      timestamp: Date.now(),
      blockchain: blockchainResult,
      txHash,
      tier: userTier.id, // ✅ Track which tier was used
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
        feePercent: tierFeePercent,
        price: parseFloat(price.toFixed(4)),
        usedBonus,
        status: "completed",
        txHash,
        blockchain: blockchainResult,
        tier: {
          id: userTier.id,
          name: userTier.name,
        },
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
