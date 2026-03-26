import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getTokenPrices } from "@/lib/v6-token-service";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTOS = ["eth", "btc", "usdt", "usdc"];

// Custody & Settlement Fee for metal transactions (2%)
const METAL_CUSTODY_FEE_PERCENT = 2.0;
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
      // Try internal prices API first (most reliable)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
      const priceRes = await fetch(`${baseUrl}/api/prices?chain=84532`, { cache: "no-store" });
      const priceData = await priceRes.json();
      if (priceData.success && priceData.executionPrices) {
        const symbol = asset.toUpperCase();
        const execPrice = priceData.executionPrices[symbol];
        const basePrice = priceData.basePrices?.[symbol];
        if (execPrice && basePrice) {
          return { ask: execPrice, bid: basePrice };
        }
      }
      // Fallback to getTokenPrices
      const prices = await getTokenPrices(asset);
      return { ask: prices.askPerGram, bid: prices.bidPerGram };
    } catch (e) {
      console.error(`Failed to get ${asset} price:`, e);
      const fallbacks: Record<string, { ask: number; bid: number }> = {
        auxg: { ask: 145, bid: 143 },
        auxs: { ask: 2.40, bid: 2.30 },
        auxpt: { ask: 63, bid: 61 },
        auxpd: { ask: 46, bid: 44 },
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

// ═══════════════════════════════════════════════════════════════════════════
// YIELD / LEASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const LEASE_TERMS: Record<number, { label: string; apyBase: number }> = {
  90: { label: "3 months", apyBase: 2.5 },
  180: { label: "6 months", apyBase: 3.2 },
  365: { label: "12 months", apyBase: 4.1 },
};

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER: Demo trade (buy/sell/convert)
// ═══════════════════════════════════════════════════════════════════════════

async function handleTrade(
  normalizedAddress: string,
  fromAsset: string,
  toAsset: string,
  fromAmount: number,
) {
  const demoBalanceKey = `demo:${normalizedAddress}:balance`;
  const demoTxKey = `demo:${normalizedAddress}:transactions`;

  const currentBalance = await redis.hgetall(demoBalanceKey) || {};
  const fromKey = fromAsset.toLowerCase();
  const toKey = toAsset.toLowerCase();
  const currentFromBalance = parseFloat(String(currentBalance[fromKey]) || "0");

  if (currentFromBalance < fromAmount) {
    return NextResponse.json({
      error: "Insufficient demo balance",
      required: fromAmount,
      available: currentFromBalance,
    }, { status: 400 });
  }

  const { toAmount, fromPrice, toPrice, tradingFee, custodyFee, totalFeePercent } =
    await calculateServerToAmount(fromAsset, toAsset, fromAmount);

  const currentToBalance = parseFloat(String(currentBalance[toKey]) || "0");
  const newFromBalance = Math.max(0, currentFromBalance - fromAmount);
  const newToBalance = currentToBalance + toAmount;

  await redis.hset(demoBalanceKey, {
    [fromKey]: newFromBalance,
    [toKey]: newToBalance,
  });

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
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER: Demo lease (yield / stake)
// ═══════════════════════════════════════════════════════════════════════════

async function handleLease(
  normalizedAddress: string,
  fromAsset: string,
  fromAmount: number,
  termDays: number,
) {
  const demoBalanceKey = `demo:${normalizedAddress}:balance`;
  const demoTxKey = `demo:${normalizedAddress}:transactions`;
  const demoLeaseKey = `demo:${normalizedAddress}:leases`;

  const fromKey = fromAsset.toLowerCase();
  if (!METALS.includes(fromKey)) {
    return NextResponse.json({ error: "Only metals can be leased" }, { status: 400 });
  }

  const termConfig = LEASE_TERMS[termDays];
  if (!termConfig) {
    return NextResponse.json({ error: "Invalid lease term. Use 90, 180, or 365 days." }, { status: 400 });
  }

  const currentBalance = await redis.hgetall(demoBalanceKey) || {};
  const currentFromBalance = parseFloat(String(currentBalance[fromKey]) || "0");

  if (currentFromBalance < fromAmount) {
    return NextResponse.json({
      error: "Insufficient demo balance",
      required: fromAmount,
      available: currentFromBalance,
    }, { status: 400 });
  }

  // Lock the metal (deduct from available balance)
  const newBalance = Math.max(0, currentFromBalance - fromAmount);
  await redis.hset(demoBalanceKey, { [fromKey]: newBalance });

  // Calculate estimated yield
  const apyPercent = termConfig.apyBase;
  const estimatedYieldGrams = fromAmount * (apyPercent / 100) * (termDays / 365);

  const now = new Date();
  const maturityDate = new Date(now.getTime() + termDays * 24 * 60 * 60 * 1000);

  const lease = {
    id: `demo-lease-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    metal: fromAsset.toUpperCase(),
    amount: fromAmount,
    termDays,
    termLabel: termConfig.label,
    apyPercent,
    estimatedYieldGrams,
    startDate: now.toISOString(),
    maturityDate: maturityDate.toISOString(),
    status: "active",
  };

  await redis.lpush(demoLeaseKey, JSON.stringify(lease));
  await redis.ltrim(demoLeaseKey, 0, 49);

  // Record transaction
  const transaction = {
    id: lease.id,
    type: "demo_lease",
    fromAsset: fromAsset.toUpperCase(),
    toAsset: fromAsset.toUpperCase(),
    fromAmount,
    toAmount: 0,
    termDays,
    apyPercent,
    estimatedYieldGrams,
    maturityDate: maturityDate.toISOString(),
    timestamp: now.toISOString(),
  };

  const demoTxKeyForTx = `demo:${normalizedAddress}:transactions`;
  await redis.lpush(demoTxKeyForTx, JSON.stringify(transaction));
  await redis.ltrim(demoTxKeyForTx, 0, 99);

  console.log(`[DEMO] Lease: ${fromAmount}g ${fromAsset} for ${termDays}d @ ${apyPercent}% APY for ${normalizedAddress}`);

  return NextResponse.json({
    success: true,
    demo: true,
    lease,
    transaction: {
      ...transaction,
      newBalance: { [fromKey]: newBalance },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER: Demo withdraw (simulation only)
// ═══════════════════════════════════════════════════════════════════════════

async function handleWithdraw(
  normalizedAddress: string,
  fromAsset: string,
  fromAmount: number,
  toAddress?: string,
) {
  const demoBalanceKey = `demo:${normalizedAddress}:balance`;
  const demoTxKey = `demo:${normalizedAddress}:transactions`;
  const demoWithdrawKey = `demo:${normalizedAddress}:withdrawals`;

  const fromKey = fromAsset.toLowerCase();
  const currentBalance = await redis.hgetall(demoBalanceKey) || {};
  const currentFromBalance = parseFloat(String(currentBalance[fromKey]) || "0");

  if (currentFromBalance < fromAmount) {
    return NextResponse.json({
      error: "Insufficient demo balance",
      required: fromAmount,
      available: currentFromBalance,
    }, { status: 400 });
  }

  // Deduct from demo balance
  const newBalance = Math.max(0, currentFromBalance - fromAmount);
  await redis.hset(demoBalanceKey, { [fromKey]: newBalance });

  const withdrawal = {
    id: `demo-wd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    asset: fromAsset.toUpperCase(),
    amount: fromAmount,
    toAddress: toAddress || "0x...simulated",
    status: "simulated",
    estimatedArrival: "24 hours",
    timestamp: new Date().toISOString(),
  };

  await redis.lpush(demoWithdrawKey, JSON.stringify(withdrawal));
  await redis.ltrim(demoWithdrawKey, 0, 49);

  // Record transaction
  const transaction = {
    id: withdrawal.id,
    type: "demo_withdraw",
    fromAsset: fromAsset.toUpperCase(),
    toAsset: fromAsset.toUpperCase(),
    fromAmount,
    toAmount: fromAmount,
    toAddress: withdrawal.toAddress,
    status: "simulated",
    timestamp: withdrawal.timestamp,
  };

  await redis.lpush(demoTxKey, JSON.stringify(transaction));
  await redis.ltrim(demoTxKey, 0, 99);

  console.log(`[DEMO] Withdraw (simulated): ${fromAmount} ${fromAsset} for ${normalizedAddress}`);

  return NextResponse.json({
    success: true,
    demo: true,
    withdrawal,
    transaction: {
      ...transaction,
      newBalance: { [fromKey]: newBalance },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// POST: Execute a demo action (trade / lease / withdraw / convert)
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromAsset, toAsset, fromAmount, address, type, termDays, toAddress } = body;

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Validate demo mode is active
    const isActive = await redis.get(`demo:${normalizedAddress}:active`);
    if (isActive !== "true" && isActive !== true) {
      return NextResponse.json({ error: "Demo mode is not active" }, { status: 403 });
    }

    // Route by type
    const actionType = (type || "trade").toLowerCase();

    if (actionType === "lease") {
      if (!fromAsset || !fromAmount || !termDays) {
        return NextResponse.json({ error: "Lease requires fromAsset, fromAmount, and termDays" }, { status: 400 });
      }
      return handleLease(normalizedAddress, fromAsset, fromAmount, termDays);
    }

    if (actionType === "withdraw") {
      if (!fromAsset || !fromAmount) {
        return NextResponse.json({ error: "Withdraw requires fromAsset and fromAmount" }, { status: 400 });
      }
      return handleWithdraw(normalizedAddress, fromAsset, fromAmount, toAddress);
    }

    // Default: trade / convert (same logic — swap one asset for another)
    if (!fromAsset || !toAsset || !fromAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    return handleTrade(normalizedAddress, fromAsset, toAsset, fromAmount);
  } catch (error) {
    console.error("Demo trade error:", error);
    return NextResponse.json({ error: "Demo trade failed" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET: Fetch demo leases and withdrawals
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const dataType = searchParams.get("type") || "leases"; // leases | withdrawals

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    const isActive = await redis.get(`demo:${normalizedAddress}:active`);
    if (isActive !== "true" && isActive !== true) {
      return NextResponse.json({ error: "Demo mode is not active" }, { status: 403 });
    }

    if (dataType === "withdrawals") {
      const key = `demo:${normalizedAddress}:withdrawals`;
      const raw = await redis.lrange(key, 0, 49);
      const withdrawals = raw.map((item: unknown) => {
        if (typeof item === "string") {
          try { return JSON.parse(item); } catch { return item; }
        }
        return item;
      });
      return NextResponse.json({ success: true, withdrawals });
    }

    // Default: leases
    const key = `demo:${normalizedAddress}:leases`;
    const raw = await redis.lrange(key, 0, 49);
    const leases = raw.map((item: unknown) => {
      if (typeof item === "string") {
        try { return JSON.parse(item); } catch { return item; }
      }
      return item;
    });
    return NextResponse.json({ success: true, leases });
  } catch (error) {
    console.error("Demo data fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch demo data" }, { status: 500 });
  }
}
