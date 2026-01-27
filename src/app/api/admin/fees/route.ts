// src/app/api/admin/fees/route.ts
// Platform Fee Management API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin authentication (simple token check - enhance for production)
const ADMIN_SECRET = process.env.ADMIN_SECRET || "auxite-admin-secret";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  
  const token = authHeader.replace("Bearer ", "");
  return token === ADMIN_SECRET;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET - Get all platform fees
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token"); // Optional: filter by token

    // Fee tokens to check
    const feeTokens = ["auxm", "eth", "usd", "usdt", "btc", "xrp", "sol", "auxg", "auxs", "auxpt", "auxpd"];
    
    const fees: Record<string, any> = {};
    let totalValueUsd = 0;

    // Approximate USD prices for calculation
    const prices: Record<string, number> = {
      auxm: 1,
      usd: 1,
      usdt: 1,
      eth: 2900,
      btc: 95000,
      xrp: 2.3,
      sol: 200,
      auxg: 95,
      auxs: 1.1,
      auxpt: 32,
      auxpd: 35,
    };

    for (const t of feeTokens) {
      if (token && t !== token.toLowerCase()) continue;

      const feeData = await redis.hgetall(`platform:fees:${t}`);
      const count = await redis.hget("platform:fees:count", t);

      if (feeData && Object.keys(feeData).length > 0) {
        const total = parseFloat(feeData.total as string || "0");
        const pending = parseFloat(feeData.pending as string || "0");
        const transferred = parseFloat(feeData.transferred as string || "0");
        const valueUsd = total * (prices[t] || 1);

        fees[t.toUpperCase()] = {
          total,
          pending,
          transferred,
          transactionCount: parseInt(count as string || "0"),
          valueUsd: parseFloat(valueUsd.toFixed(2)),
        };

        totalValueUsd += valueUsd;
      }
    }

    // Get transfer history
    const transferHistory = await redis.lrange("platform:fees:transfers", 0, 19);
    const parsedHistory = transferHistory.map((item: any) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    return NextResponse.json({
      success: true,
      fees,
      summary: {
        totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
        tokenCount: Object.keys(fees).length,
      },
      recentTransfers: parsedHistory,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Admin fees error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Mark fees as transferred to Ledger
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token, amount, ledgerAddress, txHash, note } = body;

    if (!token || !amount || amount <= 0) {
      return NextResponse.json({ error: "Token and positive amount required" }, { status: 400 });
    }

    const tokenLower = token.toLowerCase();
    const feeKey = `platform:fees:${tokenLower}`;

    // Get current pending amount
    const pending = parseFloat(await redis.hget(feeKey, "pending") as string || "0");

    if (amount > pending) {
      return NextResponse.json({ 
        error: `Insufficient pending fees. Available: ${pending} ${token.toUpperCase()}`,
        available: pending,
      }, { status: 400 });
    }

    // Update fee balances
    const multi = redis.multi();
    multi.hincrbyfloat(feeKey, "pending", -amount);
    multi.hincrbyfloat(feeKey, "transferred", amount);

    // Record transfer
    const transfer = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      token: token.toUpperCase(),
      amount,
      ledgerAddress: ledgerAddress || "Not specified",
      txHash: txHash || null,
      note: note || null,
      timestamp: Date.now(),
      date: new Date().toISOString(),
    };

    multi.lpush("platform:fees:transfers", JSON.stringify(transfer));
    multi.ltrim("platform:fees:transfers", 0, 99); // Keep last 100 transfers

    await multi.exec();

    return NextResponse.json({
      success: true,
      transfer,
      remainingPending: pending - amount,
    });
  } catch (error: any) {
    console.error("Admin fees transfer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
