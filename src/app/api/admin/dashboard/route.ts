// src/app/api/admin/dashboard/route.ts
// Admin Dashboard - Platform Statistics

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin authentication
const ADMIN_SECRET = process.env.ADMIN_SECRET || "auxite-admin-secret";

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  
  const token = authHeader.replace("Bearer ", "");
  return token === ADMIN_SECRET;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // USER STATISTICS
    // ═══════════════════════════════════════════════════════════════════════
    
    // Get all user keys
    const userKeys = await redis.keys("user:0x*:balance");
    const totalUsers = userKeys.length;

    // ═══════════════════════════════════════════════════════════════════════
    // FEE STATISTICS
    // ═══════════════════════════════════════════════════════════════════════
    
    const feeTokens = ["auxm", "eth", "usd", "usdt"];
    const prices: Record<string, number> = { auxm: 1, usd: 1, usdt: 1, eth: 2900 };
    
    let totalFeesUsd = 0;
    let pendingFeesUsd = 0;
    const feesByToken: Record<string, any> = {};

    for (const token of feeTokens) {
      const feeData = await redis.hgetall(`platform:fees:${token}`);
      if (feeData && Object.keys(feeData).length > 0) {
        const total = parseFloat(feeData.total as string || "0");
        const pending = parseFloat(feeData.pending as string || "0");
        const price = prices[token] || 1;
        
        feesByToken[token.toUpperCase()] = { total, pending, valueUsd: total * price };
        totalFeesUsd += total * price;
        pendingFeesUsd += pending * price;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // TRANSACTION STATISTICS (Last 24 hours)
    // ═══════════════════════════════════════════════════════════════════════
    
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    let tradesLast24h = 0;
    let volumeLast24h = 0;

    // Sample a few users to estimate (full scan would be expensive)
    const sampleUsers = userKeys.slice(0, 50);
    for (const userKey of sampleUsers) {
      const address = userKey.split(":")[1];
      const txKey = `user:${address}:transactions`;
      const recentTx = await redis.lrange(txKey, 0, 9);
      
      for (const tx of recentTx) {
        try {
          const parsed = typeof tx === "string" ? JSON.parse(tx) : tx;
          if (parsed.timestamp && parsed.timestamp > oneDayAgo) {
            tradesLast24h++;
            volumeLast24h += parseFloat(parsed.fromAmount || "0");
          }
        } catch {}
      }
    }

    // Extrapolate if we sampled
    if (sampleUsers.length < totalUsers && sampleUsers.length > 0) {
      const multiplier = totalUsers / sampleUsers.length;
      tradesLast24h = Math.round(tradesLast24h * multiplier);
      volumeLast24h = volumeLast24h * multiplier;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOT WALLET BALANCES
    // ═══════════════════════════════════════════════════════════════════════
    
    const hotWalletEth = process.env.HOT_WALLET_ETH_ADDRESS || "0xaE4d3eb67558423f74E8D80F56fbdfc1F91F3213";
    
    // Get hot wallet ETH balance via API (simplified)
    let hotWalletBalance = "Check Etherscan";
    try {
      const etherscanUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${hotWalletEth}&tag=latest&apikey=${process.env.ETHERSCAN_API_KEY || ""}`;
      const ethRes = await fetch(etherscanUrl);
      const ethData = await ethRes.json();
      if (ethData.status === "1") {
        hotWalletBalance = (parseFloat(ethData.result) / 1e18).toFixed(4) + " ETH";
      }
    } catch {}

    // ═══════════════════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
        },
        fees: {
          totalUsd: parseFloat(totalFeesUsd.toFixed(2)),
          pendingUsd: parseFloat(pendingFeesUsd.toFixed(2)),
          byToken: feesByToken,
        },
        activity: {
          tradesLast24h,
          estimatedVolumeUsd: parseFloat(volumeLast24h.toFixed(2)),
        },
        hotWallet: {
          address: hotWalletEth,
          balance: hotWalletBalance,
        },
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Admin dashboard error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
