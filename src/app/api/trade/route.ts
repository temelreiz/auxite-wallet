// src/app/api/trade/route.ts
import { sendCertificateEmail } from "@/lib/email";
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
import { createPublicClient, createWalletClient, http, formatUnits, formatEther, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, mainnet } from "viem/chains";
import {
  updateOraclePrices,
  buyMetalToken,
  sellMetalToken,
  calculateBuyCost,
  calculateSellPayout,
  getTokenPrices,
  checkReserveLimit,
} from "@/lib/v6-token-service";
import { METAL_TOKENS, USDT_ADDRESS } from "@/config/contracts-v8";

// ═══════════════════════════════════════════════════════════════════════════
// CRYPTO PRICE HELPER - Direkt Binance'den fiyat al
// ═══════════════════════════════════════════════════════════════════════════

const BINANCE_SYMBOLS: Record<string, string> = {
  eth: "ETHUSDT",
  btc: "BTCUSDT",
  xrp: "XRPUSDT",
  sol: "SOLUSDT",
};

const FALLBACK_CRYPTO_PRICES: Record<string, number> = {
  eth: 3000,
  btc: 90000,
  xrp: 2,
  sol: 130,
  usdt: 1,
};

async function getCryptoPrice(symbol: string): Promise<number> {
  const symbolLower = symbol.toLowerCase();
  
  // USDT her zaman 1
  if (symbolLower === "usdt") return 1;
  
  const binanceSymbol = BINANCE_SYMBOLS[symbolLower];
  if (!binanceSymbol) return FALLBACK_CRYPTO_PRICES[symbolLower] || 0;
  
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`,
      { cache: "no-store" }
    );
    
    if (response.ok) {
      const data = await response.json();
      return parseFloat(data.price) || FALLBACK_CRYPTO_PRICES[symbolLower];
    }
  } catch (error) {
    console.error(`Binance price fetch error for ${symbol}:`, error);
  }
  
  return FALLBACK_CRYPTO_PRICES[symbolLower] || 0;
}

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

// Tokens that require on-chain transfer FROM user (non-custodial)
const ON_CHAIN_FROM_TOKENS = ["eth"]; // User sends ETH to hot wallet

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

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM STOCK MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_WARNING_THRESHOLD = 0.2; // %20

interface PlatformStock {
  total: number;
  available: number;
  reserved: number;
  warningThreshold: number;
  isLowStock: boolean;
}

async function getPlatformStock(metal: string): Promise<PlatformStock | null> {
  const stockKey = `platform:stock:${metal.toUpperCase()}`;
  const data = await redis.hgetall(stockKey);

  if (!data || Object.keys(data).length === 0) {
    return null; // Stock not initialized
  }

  const total = parseFloat(data.total as string || '0');
  const available = parseFloat(data.available as string || '0');
  const threshold = parseFloat(data.warningThreshold as string || String(DEFAULT_WARNING_THRESHOLD));

  return {
    total,
    available,
    reserved: parseFloat(data.reserved as string || '0'),
    warningThreshold: threshold,
    isLowStock: available <= (total * threshold),
  };
}

async function checkAndAlertLowStock(metal: string, newAvailable: number, total: number, threshold: number): Promise<void> {
  const stockKey = `platform:stock:${metal.toUpperCase()}`;
  const thresholdAmount = total * threshold;

  if (newAvailable <= thresholdAmount) {
    // Check if alert already sent
    const alertSent = await redis.hget(stockKey, 'lowStockAlertSent');

    if (alertSent !== 'true') {
      // Log alert (in production, send email/notification)
      console.log(`🚨 LOW STOCK ALERT: ${metal.toUpperCase()} - ${newAvailable.toFixed(2)}g available (${((newAvailable/total)*100).toFixed(1)}%)`);

      // Mark alert as sent
      await redis.hset(stockKey, { lowStockAlertSent: 'true' });

      // Add to active alerts
      await redis.sadd('platform:alerts:low-stock', metal.toUpperCase());
    }
  } else {
    // Stock recovered, clear alert
    await redis.hset(stockKey, { lowStockAlertSent: 'false' });
    await redis.srem('platform:alerts:low-stock', metal.toUpperCase());
  }
}

// Feature flag: Enable/disable blockchain execution
const BLOCKCHAIN_ENABLED = process.env.ENABLE_BLOCKCHAIN_TRADES === "true";

// Blockchain clients
// Base Mainnet for ERC-20 tokens (metals)
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || "https://mainnet.base.org";
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_RPC_URL, { timeout: 10000 }),
});

// Mainnet for native ETH
const ETH_RPC_URL = process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo";
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(ETH_RPC_URL, { timeout: 10000 }),
});

// Keep publicClient for backward compatibility
const publicClient = baseClient;

// Hot wallet for ETH transfers (Mainnet)
const HOT_WALLET_PRIVATE_KEY = process.env.HOT_WALLET_ETH_PRIVATE_KEY;

// Create wallet client for ETH transfers
function getMainnetWalletClient() {
  if (!HOT_WALLET_PRIVATE_KEY) {
    throw new Error("HOT_WALLET_ETH_PRIVATE_KEY not configured");
  }
  const account = privateKeyToAccount(HOT_WALLET_PRIVATE_KEY as `0x${string}`);
  return createWalletClient({
    account,
    chain: mainnet,
    transport: http(ETH_RPC_URL, { timeout: 30000 }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ETH TRANSFER FUNCTION (Hot Wallet → User)
// ═══════════════════════════════════════════════════════════════════════════

async function sendEthToUser(
  toAddress: string,
  amountEth: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const walletClient = getMainnetWalletClient();
    const account = walletClient.account;
    
    if (!account) {
      return { success: false, error: "Wallet account not found" };
    }
    
    // Check hot wallet balance
    const hotWalletBalance = await mainnetClient.getBalance({ address: account.address });
    const amountWei = parseEther(amountEth.toString());
    
    // Estimate gas
    const gasPrice = await mainnetClient.getGasPrice();
    const gasLimit = BigInt(21000);
    const gasCost = gasLimit * gasPrice;
    
    const totalRequired = amountWei + gasCost;
    
    console.log(`💸 ETH Transfer: ${amountEth} ETH to ${toAddress}`);
    console.log(`   Hot wallet balance: ${formatEther(hotWalletBalance)} ETH`);
    console.log(`   Required (incl. gas): ${formatEther(totalRequired)} ETH`);
    
    if (hotWalletBalance < totalRequired) {
      return { 
        success: false, 
        error: `Insufficient hot wallet balance. Available: ${formatEther(hotWalletBalance)} ETH, Required: ${formatEther(totalRequired)} ETH` 
      };
    }
    
    // Send transaction
    const txHash = await walletClient.sendTransaction({
      to: toAddress as `0x${string}`,
      value: amountWei,
      gas: gasLimit,
    });
    
    console.log(`✅ ETH Transfer TX: ${txHash}`);
    
    return { success: true, txHash };
  } catch (error: any) {
    console.error("ETH Transfer error:", error);
    return { success: false, error: error.message };
  }
}

// Token addresses from central config
const TOKEN_ADDRESSES: Record<string, `0x${string}`> = {
  auxg: METAL_TOKENS.AUXG,
  auxs: METAL_TOKENS.AUXS,
  auxpt: METAL_TOKENS.AUXPT,
  auxpd: METAL_TOKENS.AUXPD,
  usdt: USDT_ADDRESS,
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

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN BALANCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

// Get native ETH balance from Mainnet
async function getEthBalance(address: string): Promise<number> {
  try {
    const balance = await mainnetClient.getBalance({
      address: address as `0x${string}`,
    });
    const ethBalance = parseFloat(formatEther(balance));
    console.log(`   ETH balance from Mainnet: ${ethBalance}`);
    return ethBalance;
  } catch (error) {
    console.error("Error getting ETH balance from Mainnet:", error);
    return 0;
  }
}

// Get ERC-20 token balance from Sepolia
async function getErc20Balance(address: string, token: string): Promise<number> {
  const tokenLower = token.toLowerCase();
  const tokenAddress = TOKEN_ADDRESSES[tokenLower];
  
  if (!tokenAddress) return 0;
  
  try {
    // Correct decimals for each token type
    let decimals = 18; // default
    if (tokenLower === "usdt") {
      decimals = 6;
    } else if (["auxg", "auxs", "auxpt", "auxpd"].includes(tokenLower)) {
      decimals = 3; // Metal tokens use 3 decimals
    }
    
    const balance = await baseClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    });
    return parseFloat(formatUnits(balance, decimals));
  } catch (error) {
    console.error(`Error getting ERC-20 balance for ${token}:`, error);
    return 0;
  }
}

// Get blockchain balance for on-chain tokens (unified function)
async function getBlockchainBalance(address: string, token: string): Promise<number> {
  const tokenLower = token.toLowerCase();
  
  // ETH - Native token on Mainnet
  if (tokenLower === "eth") {
    return await getEthBalance(address);
  }
  
  // ERC-20 tokens on Sepolia (metals + USDT)
  return await getErc20Balance(address, token);
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
  email: z.string().email().optional(),
  holderName: z.string().optional(),
  ethTransferTxHash: z.string().optional(), // TX hash from user's ETH transfer
  optimistic: z.boolean().default(false), // Don't wait for blockchain confirmation
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
    // CRYPTO → METAL (ETH/BTC/XRP/SOL/USDT → AUXG/AUXS/AUXPT/AUXPD)
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "buy" && CRYPTOS.includes(fromTokenLower) && METALS.includes(toTokenLower)) {
      // 1. Crypto fiyatını al (direkt Binance'den)
      const cryptoPrice = await getCryptoPrice(fromTokenLower);
      
      if (cryptoPrice === 0) {
        return NextResponse.json({ error: `${fromToken} fiyatı alınamadı` }, { status: 400 });
      }
      
      // 2. Crypto'yu USD'ye çevir
      const usdValue = amount * cryptoPrice;
      
      // 3. Metal fiyatını al
      const metalPrices = await getTokenPrices(toToken);
      spreadPercent = metalPrices.spreadPercent;
      price = metalPrices.askPerGram;
      
      // 4. Fee hesapla (USD değeri üzerinden)
      fee = calculateTierFee(usdValue, tierFeePercent);
      const netUsdValue = usdValue - fee;
      
      // 5. Alınacak metal miktarını hesapla
      toAmount = netUsdValue / price;
      
      blockchainData = {
        cryptoPrice,
        usdValue,
        metalPrice: price,
        netUsdValue,
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

    // ═══════════════════════════════════════════════════════════════════════
    // ALLOCATION PREVIEW (sadece metal alımlarında)
    // ═══════════════════════════════════════════════════════════════════════
    let allocationPreview = null;
    
    if (type === "buy" && METALS.includes(toTokenLower)) {
      const allocatedGrams = Math.floor(toAmount);
      const nonAllocatedGrams = parseFloat((toAmount - allocatedGrams).toFixed(6));
      
      if (nonAllocatedGrams > 0) {
        // Bir sonraki tam grama ulaşmak için gereken ek miktar
        const gramsNeededForNextWhole = parseFloat((1 - nonAllocatedGrams).toFixed(6));
        const additionalAuxmNeeded = parseFloat((gramsNeededForNextWhole * (price / (1 - tierFeePercent / 100))).toFixed(2));
        
        allocationPreview = {
          totalGrams: parseFloat(toAmount.toFixed(6)),
          allocatedGrams,
          nonAllocatedGrams,
          hasPartialAllocation: true,
          suggestion: {
            gramsToAdd: gramsNeededForNextWhole,
            auxmToAdd: additionalAuxmNeeded,
            targetGrams: allocatedGrams + 1,
          },
        };
      } else {
        allocationPreview = {
          totalGrams: parseFloat(toAmount.toFixed(6)),
          allocatedGrams,
          nonAllocatedGrams: 0,
          hasPartialAllocation: false,
        };
      }
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
        tier: tierInfo,
        allocationPreview, // Partial allocation bilgisi
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
    console.log(`📥 TRADE REQUEST BODY:`, JSON.stringify(body));
    
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
      email,
      holderName,
      ethTransferTxHash,
      optimistic,
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
    const bonusAuxm = parseFloat(currentBalance.bonusauxm as string || currentBalance.bonusAuxm as string || "0");

    // Debug: Log all balances
    console.log(`📊 Balance Debug for ${normalizedAddress}:`);
    console.log(`   Redis ${fromTokenLower}: ${fromBalance}`);
    console.log(`   Redis bonusAuxm: ${bonusAuxm}`);
    console.log(`   Redis all:`, currentBalance);

    // ═══════════════════════════════════════════════════════════════════════
    // CHECK BALANCE FOR TOKENS
    // ═══════════════════════════════════════════════════════════════════════

    // Check if user has custodial wallet
    const isCustodial = await isCustodialWallet(normalizedAddress);
    console.log(`   Wallet type: ${isCustodial ? 'custodial' : 'external'}`);

    // ETH: Custodial uses Redis, external uses blockchain
    if (fromTokenLower === "eth") {
      if (isCustodial) {
        fromBalance = parseFloat(currentBalance.eth as string || "0");
        console.log(`   ETH from Redis (custodial): ${fromBalance}`);
      } else {
        const blockchainBalance = await getBlockchainBalance(normalizedAddress, fromTokenLower);
        console.log(`   ETH from Blockchain: ${blockchainBalance}`);
        fromBalance = blockchainBalance;
      }
    }

    // Metals (AUXG, AUXS, AUXPT, AUXPD): Always use Redis balance (custodial for trading)
    const METALS_REDIS = ["auxg", "auxs", "auxpt", "auxpd"];
    if (METALS_REDIS.includes(fromTokenLower)) {
      fromBalance = parseFloat(currentBalance[fromTokenLower] as string || "0");
      console.log(`   Metal ${fromTokenLower} from Redis: ${fromBalance}`);
    }

    // USDT: Custodial uses Redis, external uses blockchain
    if (fromTokenLower === "usdt") {
      if (isCustodial) {
        fromBalance = parseFloat(currentBalance.usdt as string || "0");
        console.log(`   USDT from Redis (custodial): ${fromBalance}`);
      } else {
        const blockchainBalance = await getBlockchainBalance(normalizedAddress, fromTokenLower);
        console.log(`   USDT from Blockchain: ${blockchainBalance}`);
        fromBalance = blockchainBalance;
      }
    }

    // AUXM: Use Redis balance (off-chain token)
    if (fromTokenLower === "auxm") {
      const auxmBalance = parseFloat(currentBalance.auxm as string || currentBalance.AUXM as string || "0");
      console.log(`   AUXM from Redis: ${auxmBalance}`);
      fromBalance = auxmBalance;
    }

    // Custodial cryptos (BTC, XRP, SOL): Use Redis balance
    const CUSTODIAL_CRYPTOS = ["btc", "xrp", "sol"];
    if (CUSTODIAL_CRYPTOS.includes(fromTokenLower)) {
      fromBalance = parseFloat(currentBalance[fromTokenLower] as string || "0");
      console.log(`   ${fromTokenLower} is custodial, Redis: ${fromBalance}`);
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

    // Bakiye kontrolü - TÜM tokenlar için geçerli
    if (fromAmount > availableBalance) {
      return NextResponse.json({
        error: "Yetersiz bakiye",
        required: fromAmount,
        available: availableBalance,
        token: fromToken.toUpperCase(),
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

      // 🔍 DEBUG: Hesaplama değerlerini logla
      console.log(`🔍 BUY CALCULATION DEBUG:`);
      console.log(`   fromAmount: ${fromAmount}`);
      console.log(`   lockedPrice: ${lockedPrice}`);
      console.log(`   prices.askPerGram: ${prices.askPerGram}`);
      console.log(`   FINAL price: ${price}`);

      // ✅ TIER BAZLI FEE
      fee = calculateTierFee(fromAmount, tierFeePercent);
      const netAmount = fromAmount - fee;
      toAmount = netAmount / price;

      console.log(`   fee: ${fee}`);
      console.log(`   netAmount: ${netAmount}`);
      console.log(`   toAmount (grams): ${toAmount}`);

      // ═══════════════════════════════════════════════════════════════════════
      // 📦 PLATFORM STOCK CHECK - Stokta yeterli metal var mı?
      // ═══════════════════════════════════════════════════════════════════════
      const platformStock = await getPlatformStock(toTokenLower);

      if (!platformStock) {
        console.log(`⚠️ Platform stock not initialized for ${toTokenLower.toUpperCase()}`);
        // Stok henüz oluşturulmamış - işleme izin ver (geliştirme aşamasında)
      } else if (toAmount > platformStock.available) {
        console.log(`❌ Insufficient platform stock: requested ${toAmount}g, available ${platformStock.available}g`);
        return NextResponse.json({
          error: `Yeterli stok yok. Satılabilir: ${platformStock.available.toFixed(2)}g ${toTokenLower.toUpperCase()}`,
          available: platformStock.available,
          requested: toAmount,
          code: "INSUFFICIENT_STOCK",
        }, { status: 400 });
      } else {
        console.log(`✅ Platform stock OK: ${platformStock.available}g available, requesting ${toAmount}g`);
      }

      const reserveCheck = await checkReserveLimit(toToken, toAmount);
      if (false) { // TEMP: reserve check disabled (using platform stock instead)
        return NextResponse.json({
          error: `Rezerv limiti aşıldı. Maksimum alınabilir: ${reserveCheck.maxMintable.toFixed(2)}g`,
        }, { status: 400 });
      }

      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        // Hot wallet ETH kontrolü
        const hotWalletAddress = process.env.HOT_WALLET_ETH_ADDRESS;
        if (hotWalletAddress) {
          try {
            const hotWalletBalance = await publicClient.getBalance({ address: hotWalletAddress as `0x${string}` });
            const hotWalletETH = parseFloat(formatUnits(hotWalletBalance, 18));
            console.log(`🔋 Hot wallet ETH: ${hotWalletETH}`);
            if (hotWalletETH < 0.001) {
              return NextResponse.json({
                error: "Sistem bakımda - blockchain işlemleri geçici olarak devre dışı. Lütfen daha sonra tekrar deneyin.",
                code: "HOT_WALLET_INSUFFICIENT_ETH",
              }, { status: 503 });
            }
          } catch (e) {
            console.error("Hot wallet balance check failed:", e);
          }
        }
        
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
      // 1. Crypto fiyatını al (direkt Binance'den)
      const cryptoPrice = await getCryptoPrice(fromTokenLower);
      
      if (cryptoPrice === 0) {
        return NextResponse.json({ error: `${fromToken} fiyatı alınamadı` }, { status: 400 });
      }
      
      // 2. Crypto'yu USD'ye çevir
      const usdValue = fromAmount * cryptoPrice;
      
      // 3. Metal fiyatını al
      const metalPrices = await getTokenPrices(toToken);
      price = metalPrices.askPerGram;
      
      // 4. Fee hesapla (USD değeri üzerinden)
      fee = calculateTierFee(usdValue, tierFeePercent);
      const netUsdValue = usdValue - fee;
      
      // 5. Alınacak metal miktarını hesapla
      toAmount = netUsdValue / price;
      
      if (BLOCKCHAIN_ENABLED && executeOnChain) {
        // Oracle updated via cron
        const buyResult = await buyMetalToken(toToken, toAmount, address, slippage);
        if (!buyResult.success) {
          return NextResponse.json({ error: `Blockchain işlemi başarısız: ${buyResult.error}` }, { status: 500 });
        }
        txHash = buyResult.txHash;
        blockchainResult = { executed: true, txHash, costETH: buyResult.costETH, cryptoPrice, usdValue };
      }
    }
    // ───────────────────────────────────────────────────────────────────────
    // METAL → CRYPTO (Sell metal for crypto) - REDIS BASED + ETH TRANSFER
    // Metal balance is tracked in Redis, actual burn happens on withdraw
    // ───────────────────────────────────────────────────────────────────────
    else if (type === "sell" && METALS.includes(fromTokenLower) && CRYPTOS.includes(toTokenLower)) {
      // 1. Get metal price
      const prices = await getTokenPrices(fromToken);
      const metalPricePerGram = prices.bidPerGram;
      
      // 2. Get crypto price
      const cryptoPrice = await getCryptoPrice(toTokenLower);
      if (cryptoPrice === 0) {
        return NextResponse.json({ error: `${toToken} fiyatı alınamadı` }, { status: 400 });
      }
      
      // 3. Calculate USD value of metal
      const metalValueUsd = fromAmount * metalPricePerGram;
      
      // 4. Calculate fee (on USD value)
      fee = calculateTierFee(metalValueUsd, tierFeePercent);
      const netValueUsd = metalValueUsd - fee;
      
      // 5. Calculate crypto amount
      toAmount = netValueUsd / cryptoPrice;
      price = metalPricePerGram / cryptoPrice;
      
      console.log(`📊 METAL → CRYPTO Calculation:`);
      console.log(`   Metal: ${fromAmount}g ${fromToken} @ $${metalPricePerGram}/g = $${metalValueUsd.toFixed(2)}`);
      console.log(`   Fee: $${fee.toFixed(2)} (${tierFeePercent}%)`);
      console.log(`   Net USD: $${netValueUsd.toFixed(2)}`);
      console.log(`   Crypto: ${toAmount.toFixed(6)} ${toToken} @ $${cryptoPrice}`);
      
      // 6. For ETH: Transfer from hot wallet to user (non-custodial)
      if (toTokenLower === "eth" && BLOCKCHAIN_ENABLED) {
        console.log(`💸 Sending ${toAmount.toFixed(6)} ETH to ${address}...`);
        const ethTransfer = await sendEthToUser(address, toAmount);
        if (!ethTransfer.success) {
          console.error(`❌ ETH transfer failed: ${ethTransfer.error}`);
          return NextResponse.json({ 
            error: `ETH transferi başarısız: ${ethTransfer.error}`,
          }, { status: 500 });
        }
        
        txHash = ethTransfer.txHash;
        blockchainResult = { 
          executed: true, 
          ethTransferTxHash: ethTransfer.txHash,
          payoutETH: toAmount,
          payoutUSD: netValueUsd,
          note: "Metal deducted from Redis, ETH sent to user wallet"
        };
        console.log(`✅ ETH sent to user: ${ethTransfer.txHash}`);
      } else {
        // For other cryptos (BTC, XRP, SOL) - credit to Redis (custodial)
        blockchainResult = { 
          executed: false, 
          reason: "Custodial crypto - credited to Redis balance",
          payoutUSD: netValueUsd,
        };
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

    // ─────────────────────────────────────────────────────────────────────────
    // COLLECT PLATFORM FEES
    // ─────────────────────────────────────────────────────────────────────────
    if (fee > 0) {
      // Determine fee token (usually the fromToken for buys, USD value for sells)
      let feeToken = fromTokenLower;
      let feeAmount = fee;
      
      // For metal sales, fee is in USD value - convert to appropriate token
      if (METALS.includes(fromTokenLower) && (toTokenLower === "auxm" || CRYPTOS.includes(toTokenLower))) {
        feeToken = "usd"; // Fee collected in USD equivalent
      }
      
      // Store fee in platform account
      multi.hincrbyfloat(`platform:fees:${feeToken}`, "total", feeAmount);
      multi.hincrbyfloat(`platform:fees:${feeToken}`, "pending", feeAmount); // Not yet transferred to Ledger
      multi.hincrby("platform:fees:count", feeToken, 1); // Transaction count
      
      console.log(`💰 Fee collected: ${feeAmount.toFixed(4)} ${feeToken.toUpperCase()}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 📦 PLATFORM STOCK UPDATE
    // ─────────────────────────────────────────────────────────────────────────

    // METAL BUY: Stoktan düş
    if (type === "buy" && METALS.includes(toTokenLower)) {
      const stockKey = `platform:stock:${toTokenLower.toUpperCase()}`;
      const currentStock = await getPlatformStock(toTokenLower);

      if (currentStock) {
        // Stoktan düş
        multi.hincrbyfloat(stockKey, "available", -toAmount);
        multi.hincrbyfloat(stockKey, "reserved", toAmount);
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });

        // Stok geçmişi
        const stockHistoryEntry = {
          type: "user_buy",
          userId: normalizedAddress,
          amount: toAmount,
          previousAvailable: currentStock.available,
          newAvailable: currentStock.available - toAmount,
          timestamp: Date.now(),
        };
        multi.lpush(`${stockKey}:history`, JSON.stringify(stockHistoryEntry));
        multi.ltrim(`${stockKey}:history`, 0, 999);

        console.log(`📦 Platform stock ${toTokenLower.toUpperCase()}: ${currentStock.available}g → ${(currentStock.available - toAmount).toFixed(2)}g`);

        // Low stock alert check (async, don't block)
        checkAndAlertLowStock(
          toTokenLower,
          currentStock.available - toAmount,
          currentStock.total,
          currentStock.warningThreshold
        ).catch(err => console.error("Low stock alert error:", err));
      }
    }

    // METAL SELL: Stoğa ekle (kullanıcı metal satıyor = platform stoğu artıyor)
    if ((type === "sell" || type === "swap") && METALS.includes(fromTokenLower)) {
      const stockKey = `platform:stock:${fromTokenLower.toUpperCase()}`;
      const currentStock = await getPlatformStock(fromTokenLower);

      if (currentStock) {
        // Stoğa geri ekle
        multi.hincrbyfloat(stockKey, "available", fromAmount);
        multi.hincrbyfloat(stockKey, "reserved", -fromAmount);
        multi.hset(stockKey, { lastUpdated: Date.now().toString() });

        // Stok geçmişi
        const stockHistoryEntry = {
          type: "user_sell",
          userId: normalizedAddress,
          amount: fromAmount,
          previousAvailable: currentStock.available,
          newAvailable: currentStock.available + fromAmount,
          timestamp: Date.now(),
        };
        multi.lpush(`${stockKey}:history`, JSON.stringify(stockHistoryEntry));
        multi.ltrim(`${stockKey}:history`, 0, 999);

        console.log(`📦 Platform stock ${fromTokenLower.toUpperCase()}: ${currentStock.available}g → ${(currentStock.available + fromAmount).toFixed(2)}g (user sold)`);

        // Clear low stock alert if stock recovered
        checkAndAlertLowStock(
          fromTokenLower,
          currentStock.available + fromAmount,
          currentStock.total,
          currentStock.warningThreshold
        ).catch(err => console.error("Low stock alert error:", err));
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DEDUCT FROM USER BALANCE
    // ─────────────────────────────────────────────────────────────────────────
    // Deduct from token
    if (type === "buy" && fromTokenLower === "auxm" && usedBonus > 0) {
      if (usedBonus > 0) {
        multi.hincrbyfloat(balanceKey, "bonusAuxm", -usedBonus);
      }
      if (usedRegular > 0) {
        multi.hincrbyfloat(balanceKey, "auxm", -usedRegular);
      }
    } else {
      // For ETH: Custodial wallets use Redis, external wallets use blockchain
      // For metals and other tokens: Always deduct from Redis
      if (fromTokenLower === "eth" && type === "buy") {
        if (isCustodial) {
          // Custodial wallet: ETH is managed in Redis, always deduct
          multi.hincrbyfloat(balanceKey, fromTokenLower, -fromAmount);
          console.log(`   Deducting ${fromAmount} ETH from Redis (custodial wallet)`);
        } else {
          // External wallet: ETH should be transferred on-chain, skip Redis
          console.log(`   Skipping Redis deduction for ETH - external wallet uses blockchain`);
        }
      } else {
        multi.hincrbyfloat(balanceKey, fromTokenLower, -fromAmount);
        console.log(`   Deducting ${fromAmount} ${fromTokenLower} from Redis`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADD TO USER BALANCE
    // ─────────────────────────────────────────────────────────────────────────
    // Add to token
    // For ETH: Don't add to Redis if sent via blockchain
    const ON_CHAIN_TO_TOKENS = ["eth"];
    if (ON_CHAIN_TO_TOKENS.includes(toTokenLower) && blockchainResult?.executed && blockchainResult?.ethTransferTxHash) {
      console.log(`   Skipping Redis credit for ${toTokenLower} - sent via blockchain`);
    } else {
      multi.hincrbyfloat(balanceKey, toTokenLower, toAmount);
    }

    // Transaction record
    const txId = txHash || ethTransferTxHash || `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Determine status based on optimistic mode and ETH transfer
    // If user sent ETH (has txHash) and optimistic mode, mark as pending_confirmation
    const hasPendingEthTransfer = ethTransferTxHash && optimistic && ON_CHAIN_FROM_TOKENS.includes(fromTokenLower);
    const txStatus = hasPendingEthTransfer ? "pending_confirmation" : "completed";
    
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
      status: txStatus,
      timestamp: Date.now(),
      blockchain: blockchainResult,
      txHash: txHash || ethTransferTxHash,
      ethTransferTxHash, // Store user's ETH transfer TX for verification
      tier: userTier.id,
      ip: ip.split(".").slice(0, 3).join(".") + ".***",
    };

    const txKey = `user:${normalizedAddress}:transactions`;
    multi.lpush(txKey, JSON.stringify(transaction));
    
    // If pending confirmation, add to pending transactions list for cron verification
    if (txStatus === "pending_confirmation" && ethTransferTxHash) {
      const pendingTx = {
        txId,
        ethTxHash: ethTransferTxHash,
        address: normalizedAddress,
        fromToken: fromToken.toUpperCase(),
        toToken: toToken.toUpperCase(),
        fromAmount,
        toAmount,
        timestamp: Date.now(),
      };
      multi.lpush("pending:eth_transfers", JSON.stringify(pendingTx));
      multi.expire("pending:eth_transfers", 86400 * 7); // 7 gün TTL
      console.log(`📋 Added to pending ETH transfers: ${ethTransferTxHash}`);
    }

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


    // ═══════════════════════════════════════════════════════════════════════
    // 9.5 AUTO ALLOCATION & CERTIFICATE EMAIL (Metal Buy Only)
    // ═══════════════════════════════════════════════════════════════════════
    let certificateNumber: string | undefined;
    let allocationInfo: { allocatedGrams?: number; nonAllocatedGrams?: number } = {};
    if (type === "buy" && METALS.includes(toTokenLower) && toAmount > 0) {
      console.log("🔍 Allocation check:", { type, toTokenLower, toAmount, metalsIncludes: METALS.includes(toTokenLower) });
      try {
        // Create allocation via internal API call
        const allocRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://auxite-wallet.vercel.app"}/api/allocations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: normalizedAddress,
            metal: toToken.toUpperCase(),
            grams: toAmount,
            txHash,
            email,
            holderName,
          }),
        });
        const allocData = await allocRes.json();
        if (allocData.success) {
        console.log("📦 Allocation response:", JSON.stringify(allocData));
          allocationInfo = {
            allocatedGrams: allocData.allocatedGrams,
            nonAllocatedGrams: allocData.nonAllocatedGrams,
          };
          certificateNumber = allocData.certificateNumber;
          console.log(`📜 Certificate issued: ${certificateNumber}`);
        }
      } catch (allocErr: any) {
        console.error("Auto-allocation failed:", allocErr.message);
      }
    }
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

        allocation: allocationInfo.allocatedGrams ? {
          certificateNumber,
          allocatedGrams: allocationInfo.allocatedGrams,
          nonAllocatedGrams: allocationInfo.nonAllocatedGrams,
        } : undefined,

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

    return NextResponse.json({ error: "Trade işlemi başarısız", details: error.message }, { status: 500 });
  }
}
