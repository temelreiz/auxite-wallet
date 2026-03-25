import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getTokenPrices } from "@/lib/v6-token-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTOS = ["eth", "btc", "usdt", "usdc"];

// Custody & Settlement Fee for metal transactions (4%)
const METAL_CUSTODY_FEE_PERCENT = 4.0;
// Trading fee (0.35%)
const CRYPTO_TRADING_FEE_PERCENT = 0.35;

// ═══════════════════════════════════════════════════════════════════════════
// SERVER-SIDE PRICE CALCULATION (same as exchange route)
// ═══════════════════════════════════════════════════════════════════════════

async function getServerPrice(asset: string): Promise<{ ask: number; bid: number }> {
  const assetLower = asset.toLowerCase();

  if (assetLower === "usd" || assetLower === "auxm" || assetLower === "usdt") {
    return { ask: 1, bid: 1 };
  }

  if (METALS.includes(assetLower)) {
    try {
      const prices = await getTokenPrices(asset);
      return { ask: prices.askPerGram, bid: prices.bidPerGram };
    } catch (e) {
      console.error(`Failed to get ${asset} price:`, e);
      const fallbacks: Record<string, { ask: number; bid: number }> = {
        auxg: { ask: 170, bid: 160 },
        auxs: { ask: 3.5, bid: 2.9 },
        auxpt: { ask: 82, bid: 68 },
        auxpd: { ask: 60, bid: 56 },
      };
      return fallbacks[assetLower] || { ask: 100, bid: 100 };
    }
  }

  if (CRYPTOS.includes(assetLower)) {
    try {
      const symbols: Record<string, string> = {
        eth: "ethusdt", btc: "btcusdt",
      };
      const symbol = symbols[assetLower];
      if (symbol) {
        const htxRes = await fetch(`https://api.huobi.pro/market/detail/merged?symbol=${symbol}`);
        const htxData = await htxRes.json();
        if (htxData.status === "ok" && htxData.tick) {
          return { ask: htxData.tick.ask[0], bid: htxData.tick.bid[0] };
        }
        const binRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
        const binData = await binRes.json();
        const price = parseFloat(binData.price);
        return { ask: price, bid: price };
      }
    } catch (e) {
      console.error(`Failed to get ${asset} crypto price:`, e);
    }
    const fallbacks: Record<string, number> = { eth: 2000, btc: 87000 };
    const p = fallbacks[assetLower] || 1;
    return { ask: p, bid: p };
  }

  return { ask: 1, bid: 1 };
}

async function calculateServerToAmount(
  fromAsset: string,
  toAsset: string,
  fromAmount: number
): Promise<{ toAmount: number; fromPrice: number; toPrice: number; tradingFee: number; custodyFee: number; totalFeePercent: number }> {
  const fromKey = fromAsset.toLowerCase();
  const toKey = toAsset.toLowerCase();
  const fromPrices = await getServerPrice(fromAsset);
  const toPrices = await getServerPrice(toAsset);

  const fromPrice = fromPrices.bid;
  const toPrice = toPrices.ask;

  const involvesMetal = METALS.includes(fromKey) || METALS.includes(toKey);

  const tradingFeePercent = CRYPTO_TRADING_FEE_PERCENT;
  const custodyFeePercent = involvesMetal ? METAL_CUSTODY_FEE_PERCENT : 0;
  const totalFeePercent = tradingFeePercent + custodyFeePercent;

  const fromValueUSD = fromAmount * fromPrice;
  const feeAmount = fromValueUSD * (totalFeePercent / 100);
  const netValueUSD = fromValueUSD - feeAmount;
  const toAmount = netValueUSD / toPrice;

  return { toAmount, fromPrice, toPrice, tradingFee: tradingFeePercent, custodyFee: custodyFeePercent, totalFeePercent };
}

// POST: Execute a demo trade
export async function POST(request: NextRequest) {
  try {
    const { fromAsset, toAsset, fromAmount, address } = await request.json();

    if (!fromAsset || !toAsset || !fromAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Validate demo mode is active
    const isActive = await redis.get(`demo:${normalizedAddress}:active`);
    if (isActive !== "true") {
      return NextResponse.json({ error: "Demo mode is not active" }, { status: 403 });
    }

    const demoBalanceKey = `demo:${normalizedAddress}:balance`;
    const demoTxKey = `demo:${normalizedAddress}:transactions`;

    // Get current demo balance
    const currentBalance = await redis.hgetall(demoBalanceKey) || {};

    const fromKey = fromAsset.toLowerCase();
    const toKey = toAsset.toLowerCase();

    const currentFromBalance = parseFloat(String(currentBalance[fromKey]) || "0");

    // Check balance
    if (currentFromBalance < fromAmount) {
      return NextResponse.json({
        error: "Insufficient demo balance",
        required: fromAmount,
        available: currentFromBalance,
      }, { status: 400 });
    }

    // Calculate server-side amounts using real prices
    const { toAmount, fromPrice, toPrice, tradingFee, custodyFee, totalFeePercent } = await calculateServerToAmount(fromAsset, toAsset, fromAmount);

    // Update demo balances
    const currentToBalance = parseFloat(String(currentBalance[toKey]) || "0");
    const newFromBalance = Math.max(0, currentFromBalance - fromAmount);
    const newToBalance = currentToBalance + toAmount;

    await redis.hset(demoBalanceKey, {
      [fromKey]: newFromBalance,
      [toKey]: newToBalance,
    });

    // Record demo transaction
    const transaction = {
      id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: "demo_trade",
      fromAsset: fromAsset.toUpperCase(),
      toAsset: toAsset.toUpperCase(),
      fromAmount,
      toAmount,
      fromPrice,
      toPrice,
      tradingFee,
      custodyFee,
      totalFeePercent,
      timestamp: new Date().toISOString(),
    };

    await redis.lpush(demoTxKey, JSON.stringify(transaction));
    // Keep only last 100 demo transactions
    await redis.ltrim(demoTxKey, 0, 99);

    console.log(`[DEMO] Trade: ${fromAmount} ${fromAsset} -> ${toAmount.toFixed(6)} ${toAsset} for ${normalizedAddress}`);

    return NextResponse.json({
      success: true,
      demo: true,
      transaction: {
        ...transaction,
        newBalance: {
          [fromKey]: newFromBalance,
          [toKey]: newToBalance,
        },
      },
    });
  } catch (error) {
    console.error("Demo trade error:", error);
    return NextResponse.json({ error: "Demo trade failed" }, { status: 500 });
  }
}
