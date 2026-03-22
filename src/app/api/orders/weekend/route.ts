// src/app/api/orders/weekend/route.ts
// Weekend/Holiday pending order management
// POST: Create a pending weekend order (blocks funds at estimated price)
// GET: List pending weekend orders for a user

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { isMarketOpen, getMarketStatus } from "@/lib/market-hours";
import { getUserBalance, incrementBalance, addTransaction } from "@/lib/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const VALID_TOKENS = ["AUXG", "AUXS", "AUXPT", "AUXPD"] as const;
type MetalToken = (typeof VALID_TOKENS)[number];

const TOKEN_BALANCE_KEY: Record<MetalToken, string> = {
  AUXG: "auxg",
  AUXS: "auxs",
  AUXPT: "auxpt",
  AUXPD: "auxpd",
};

export interface WeekendOrder {
  id: string;
  walletAddress: string;
  type: "buy" | "sell";
  token: MetalToken;
  amount: number; // grams
  estimatedPriceUsd: number; // per gram at time of order
  estimatedTotalUsd: number;
  status: "pending" | "executed" | "cancelled" | "failed";
  createdAt: string;
  executedAt?: string;
  executionPriceUsd?: number;
  executionTotalUsd?: number;
  priceDifferenceUsd?: number;
  marketStatus: string; // "weekend" | "holiday"
}

// ═══════════════════════════════════════════════════════════════════════════
// POST: Create a pending weekend order
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, type, token, amount, estimatedPriceUsd } = body;

    // ── VALIDATION ──
    if (!walletAddress || !type || !token || !amount || !estimatedPriceUsd) {
      return NextResponse.json(
        { error: "Missing required fields: walletAddress, type, token, amount, estimatedPriceUsd" },
        { status: 400 }
      );
    }

    if (type !== "buy" && type !== "sell") {
      return NextResponse.json({ error: "type must be 'buy' or 'sell'" }, { status: 400 });
    }

    if (!VALID_TOKENS.includes(token as MetalToken)) {
      return NextResponse.json(
        { error: `token must be one of: ${VALID_TOKENS.join(", ")}` },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    if (typeof estimatedPriceUsd !== "number" || estimatedPriceUsd <= 0) {
      return NextResponse.json({ error: "estimatedPriceUsd must be a positive number" }, { status: 400 });
    }

    // ── MARKET STATUS CHECK ──
    // Only allow weekend orders when market is closed
    const marketStatus = getMarketStatus();
    if (marketStatus.open) {
      return NextResponse.json(
        {
          error: "Market is currently open. Use the regular exchange endpoint for live trading.",
          marketStatus: marketStatus.label,
        },
        { status: 400 }
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();
    const estimatedTotalUsd = amount * estimatedPriceUsd;

    // ── BALANCE CHECK & BLOCK ──
    const balance = await getUserBalance(normalizedAddress);

    if (type === "buy") {
      // Buyer needs sufficient USD balance
      if (balance.usd < estimatedTotalUsd) {
        return NextResponse.json(
          {
            error: "Insufficient USD balance",
            required: estimatedTotalUsd,
            available: balance.usd,
          },
          { status: 400 }
        );
      }

      // Block USD funds (deduct from available balance)
      const deducted = await incrementBalance(normalizedAddress, { usd: -estimatedTotalUsd });
      if (!deducted) {
        return NextResponse.json({ error: "Failed to block funds" }, { status: 500 });
      }
    } else {
      // Seller needs sufficient metal balance
      const metalKey = TOKEN_BALANCE_KEY[token as MetalToken] as keyof typeof balance;
      const metalBalance = balance[metalKey];

      if (typeof metalBalance !== "number" || metalBalance < amount) {
        return NextResponse.json(
          {
            error: `Insufficient ${token} balance`,
            required: amount,
            available: metalBalance,
          },
          { status: 400 }
        );
      }

      // Block metal funds (deduct from available balance)
      const deducted = await incrementBalance(normalizedAddress, {
        [metalKey]: -amount,
      } as Partial<Record<string, number>>);
      if (!deducted) {
        return NextResponse.json({ error: "Failed to block funds" }, { status: 500 });
      }
    }

    // ── CREATE ORDER ──
    const orderId = `wknd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const marketLabel = marketStatus.label.includes("Holiday") ? "holiday" : "weekend";

    const order: WeekendOrder = {
      id: orderId,
      walletAddress: normalizedAddress,
      type,
      token: token as MetalToken,
      amount,
      estimatedPriceUsd,
      estimatedTotalUsd,
      status: "pending",
      createdAt: new Date().toISOString(),
      marketStatus: marketLabel,
    };

    // Store order in Redis with 7-day TTL
    await redis.set(`weekend:order:${orderId}`, JSON.stringify(order), { ex: 7 * 24 * 60 * 60 });

    // Add to user's weekend order list
    await redis.sadd(`weekend:orders:${normalizedAddress}`, orderId);

    // Add to global pending orders set (for cron pickup)
    await redis.sadd("weekend:orders:pending", orderId);

    // Record transaction as pending
    await addTransaction(normalizedAddress, {
      type: "swap",
      fromToken: type === "buy" ? "USD" : token,
      toToken: type === "buy" ? token : "USD",
      fromAmount: type === "buy" ? estimatedTotalUsd : amount,
      toAmount: type === "buy" ? amount : estimatedTotalUsd,
      status: "pending",
      metadata: {
        weekendOrderId: orderId,
        estimatedPriceUsd,
        marketStatus: marketLabel,
      },
    });

    console.log(
      `📋 Weekend order created: ${orderId} — ${type} ${amount}g ${token} @ $${estimatedPriceUsd}/g (est. $${estimatedTotalUsd.toFixed(2)})`
    );

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        type,
        token,
        amount,
        estimatedPriceUsd,
        estimatedTotalUsd,
        status: "pending",
        marketStatus: marketLabel,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Weekend order creation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET: List pending weekend orders for a user
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress query parameter is required" }, { status: 400 });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Get user's weekend order IDs
    const orderIds = await redis.smembers(`weekend:orders:${normalizedAddress}`);

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json({ success: true, orders: [] });
    }

    // Fetch all orders
    const orders: WeekendOrder[] = [];

    for (const id of orderIds) {
      const orderData = await redis.get(`weekend:order:${id}`);
      if (orderData) {
        const order = typeof orderData === "string" ? JSON.parse(orderData) : orderData;
        orders.push(order as WeekendOrder);
      }
    }

    // Sort by createdAt descending (newest first)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      orders,
      count: orders.length,
      pendingCount: orders.filter((o) => o.status === "pending").length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Weekend orders list error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
