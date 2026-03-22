// src/app/api/cron/execute-weekend-orders/route.ts
// Cron Job: Execute pending weekend/holiday orders at live market prices
// Runs Monday morning (or first business day after holiday)
// Finds all pending weekend orders, executes at real price, adjusts balances

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { isMarketOpen } from "@/lib/market-hours";
import { getUserBalance, incrementBalance, addTransaction } from "@/lib/redis";
import { getTokenPrices } from "@/lib/v6-token-service";
import { notifyTrade } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface WeekendOrder {
  id: string;
  walletAddress: string;
  type: "buy" | "sell";
  token: string;
  amount: number;
  estimatedPriceUsd: number;
  estimatedTotalUsd: number;
  status: string;
  createdAt: string;
  executedAt?: string;
  executionPriceUsd?: number;
  executionTotalUsd?: number;
  priceDifferenceUsd?: number;
  marketStatus: string;
}

// Map token symbols to the correct format for getTokenPrices
const TOKEN_BALANCE_KEY: Record<string, string> = {
  AUXG: "auxg",
  AUXS: "auxs",
  AUXPT: "auxpt",
  AUXPD: "auxpd",
};

// ═══════════════════════════════════════════════════════════════════════════
// GET LIVE PRICE FOR A TOKEN
// ═══════════════════════════════════════════════════════════════════════════

async function getLivePrice(token: string): Promise<{ askPerGram: number; bidPerGram: number }> {
  try {
    const prices = await getTokenPrices(token);
    return { askPerGram: prices.askPerGram, bidPerGram: prices.bidPerGram };
  } catch (error) {
    console.error(`Failed to get live price for ${token}:`, error);
    throw new Error(`Cannot execute order: live price unavailable for ${token}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTE A SINGLE WEEKEND ORDER
// ═══════════════════════════════════════════════════════════════════════════

async function executeOrder(order: WeekendOrder): Promise<{
  success: boolean;
  error?: string;
  executionPrice?: number;
  priceDifference?: number;
}> {
  try {
    const { walletAddress, type, token, amount, estimatedPriceUsd, estimatedTotalUsd } = order;

    // Get live price
    const livePrice = await getLivePrice(token);

    // For buy orders: user pays ask price. For sell orders: user receives bid price.
    const executionPricePerGram = type === "buy" ? livePrice.askPerGram : livePrice.bidPerGram;
    const executionTotalUsd = amount * executionPricePerGram;
    const priceDifferenceUsd = executionTotalUsd - estimatedTotalUsd;

    console.log(
      `📊 Executing ${order.id}: ${type} ${amount}g ${token} — Est: $${estimatedPriceUsd.toFixed(2)}/g, Live: $${executionPricePerGram.toFixed(2)}/g, Diff: $${priceDifferenceUsd.toFixed(2)}`
    );

    const metalKey = TOKEN_BALANCE_KEY[token];

    if (type === "buy") {
      // BUY: User already had USD blocked at estimated price.
      // If live price is HIGHER: charge additional USD.
      // If live price is LOWER: refund difference.
      if (priceDifferenceUsd > 0) {
        // Price went up — need to charge more USD
        const balance = await getUserBalance(walletAddress);
        if (balance.usd < priceDifferenceUsd) {
          // Not enough USD for the difference — execute at what they can afford
          // or fail the order
          return {
            success: false,
            error: `Insufficient USD for price increase. Need additional $${priceDifferenceUsd.toFixed(2)}, available: $${balance.usd.toFixed(2)}`,
          };
        }
        await incrementBalance(walletAddress, { usd: -priceDifferenceUsd });
      } else if (priceDifferenceUsd < 0) {
        // Price went down — refund the difference
        await incrementBalance(walletAddress, { usd: Math.abs(priceDifferenceUsd) });
      }

      // Credit the metal to user
      await incrementBalance(walletAddress, {
        [metalKey]: amount,
      } as Partial<Record<string, number>>);
    } else {
      // SELL: User already had metal blocked.
      // Credit USD at live price (not estimated).
      // The metal was already deducted when order was placed.
      await incrementBalance(walletAddress, { usd: executionTotalUsd });
    }

    // Record completed transaction
    await addTransaction(walletAddress, {
      type: "swap",
      fromToken: type === "buy" ? "USD" : token,
      toToken: type === "buy" ? token : "USD",
      fromAmount: type === "buy" ? executionTotalUsd : amount,
      toAmount: type === "buy" ? amount : executionTotalUsd,
      status: "completed",
      metadata: {
        weekendOrderId: order.id,
        estimatedPriceUsd,
        executionPriceUsd: executionPricePerGram,
        priceDifferenceUsd,
        executedAt: new Date().toISOString(),
        orderType: "weekend",
      },
    });

    // Update order in Redis
    const updatedOrder: WeekendOrder = {
      ...order,
      status: "executed",
      executedAt: new Date().toISOString(),
      executionPriceUsd: executionPricePerGram,
      executionTotalUsd: executionTotalUsd,
      priceDifferenceUsd,
    };
    await redis.set(`weekend:order:${order.id}`, JSON.stringify(updatedOrder), { ex: 30 * 24 * 60 * 60 });

    // Remove from pending set
    await redis.srem("weekend:orders:pending", order.id);

    // Send notification
    notifyTrade({
      type: "buy",
      userAddress: walletAddress,
      fromToken: type === "buy" ? "USD" : token,
      toToken: type === "buy" ? token : "USD",
      fromAmount: type === "buy" ? executionTotalUsd : amount,
      toAmount: type === "buy" ? amount : executionTotalUsd,
    }).catch((err) => console.warn("Telegram notification failed:", err));

    return {
      success: true,
      executionPrice: executionPricePerGram,
      priceDifference: priceDifferenceUsd,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return { success: false, error: message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CRON HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get("x-api-key") === process.env.INTERNAL_API_KEY ||
    request.headers.get("x-vercel-cron") !== null ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized && cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only execute when market is open
  if (!isMarketOpen()) {
    return NextResponse.json({
      success: true,
      message: "Market is still closed. Orders will be executed when market opens.",
      timestamp: new Date().toISOString(),
    });
  }

  console.log("🔄 Running weekend order execution...");

  const results: {
    executed: string[];
    failed: { id: string; error: string }[];
    skipped: string[];
  } = {
    executed: [],
    failed: [],
    skipped: [],
  };

  try {
    // Get all pending order IDs
    const pendingIds = await redis.smembers("weekend:orders:pending");

    if (!pendingIds || pendingIds.length === 0) {
      console.log("✅ No pending weekend orders to execute.");
      return NextResponse.json({
        success: true,
        message: "No pending weekend orders",
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`📋 Found ${pendingIds.length} pending weekend orders`);

    for (const orderId of pendingIds) {
      try {
        // Fetch order data
        const orderData = await redis.get(`weekend:order:${orderId}`);
        if (!orderData) {
          // Order expired or was deleted — clean up
          await redis.srem("weekend:orders:pending", orderId as string);
          results.skipped.push(orderId as string);
          continue;
        }

        const order: WeekendOrder =
          typeof orderData === "string" ? JSON.parse(orderData) : (orderData as WeekendOrder);

        if (order.status !== "pending") {
          // Already executed or cancelled
          await redis.srem("weekend:orders:pending", orderId as string);
          results.skipped.push(orderId as string);
          continue;
        }

        // Execute the order
        const result = await executeOrder(order);

        if (result.success) {
          results.executed.push(orderId as string);
          console.log(
            `✅ Executed ${orderId}: ${order.type} ${order.amount}g ${order.token} @ $${result.executionPrice?.toFixed(2)}/g (diff: $${result.priceDifference?.toFixed(2)})`
          );
        } else {
          results.failed.push({ id: orderId as string, error: result.error || "Unknown error" });
          console.error(`❌ Failed ${orderId}: ${result.error}`);
        }
      } catch (orderError: unknown) {
        const message = orderError instanceof Error ? orderError.message : "Unknown error";
        results.failed.push({ id: orderId as string, error: message });
        console.error(`❌ Error processing ${orderId}:`, message);
      }
    }

    console.log(
      `🏁 Weekend order execution complete: ${results.executed.length} executed, ${results.failed.length} failed, ${results.skipped.length} skipped`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: pendingIds.length,
        executed: results.executed.length,
        failed: results.failed.length,
        skipped: results.skipped.length,
      },
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cron job failed";
    console.error("Weekend order cron error:", message);
    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// POST also supported for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
