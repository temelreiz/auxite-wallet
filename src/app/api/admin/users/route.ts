// src/app/api/admin/users/route.ts
// Admin User Management API

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

// ═══════════════════════════════════════════════════════════════════════════
// GET - List users or get single user details
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE USER DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    if (address) {
      const normalizedAddress = address.toLowerCase();
      
      // Get balance
      const balance = await redis.hgetall(`user:${normalizedAddress}:balance`);
      
      // Get user info
      const userInfo = await redis.hgetall(`user:${normalizedAddress}:info`);
      
      // Get transactions
      const transactions = await redis.lrange(`user:${normalizedAddress}:transactions`, 0, 49);
      const parsedTx = transactions.map((tx: any) => {
        try {
          return typeof tx === "string" ? JSON.parse(tx) : tx;
        } catch {
          return tx;
        }
      });

      // Get allocations
      const allocations = await redis.lrange(`user:${normalizedAddress}:allocations`, 0, -1);
      const parsedAlloc = allocations.map((a: any) => {
        try {
          return typeof a === "string" ? JSON.parse(a) : a;
        } catch {
          return a;
        }
      });

      // Get tier info
      const tierInfo = await redis.hgetall(`user:${normalizedAddress}:tier`);

      // Calculate total value
      const prices: Record<string, number> = {
        auxm: 1, usd: 1, usdt: 1, eth: 2900, btc: 95000,
        auxg: 95, auxs: 1.1, auxpt: 32, auxpd: 35,
      };
      
      let totalValueUsd = 0;
      if (balance) {
        for (const [token, amount] of Object.entries(balance)) {
          const val = parseFloat(amount as string || "0");
          const price = prices[token.toLowerCase()] || 0;
          totalValueUsd += val * price;
        }
      }

      return NextResponse.json({
        success: true,
        user: {
          address: normalizedAddress,
          info: userInfo || {},
          balance: balance || {},
          totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
          tier: tierInfo || { id: "regular", name: "Regular" },
          transactionCount: parsedTx.length,
          allocationCount: parsedAlloc.length,
        },
        transactions: parsedTx,
        allocations: parsedAlloc,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST ALL USERS
    // ─────────────────────────────────────────────────────────────────────────
    
    // Get all user balance keys
    let userKeys = await redis.keys("user:0x*:balance");
    
    // Filter by search if provided
    if (search) {
      userKeys = userKeys.filter(key => 
        key.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort and paginate
    const total = userKeys.length;
    const startIndex = (page - 1) * limit;
    const paginatedKeys = userKeys.slice(startIndex, startIndex + limit);

    // Get user details
    const users = [];
    const prices: Record<string, number> = {
      auxm: 1, usd: 1, usdt: 1, eth: 2900, btc: 95000,
      auxg: 95, auxs: 1.1, auxpt: 32, auxpd: 35,
    };

    for (const key of paginatedKeys) {
      const address = key.split(":")[1];
      const balance = await redis.hgetall(key);
      const userInfo = await redis.hgetall(`user:${address}:info`);
      
      // Calculate total value
      let totalValueUsd = 0;
      if (balance) {
        for (const [token, amount] of Object.entries(balance)) {
          const val = parseFloat(amount as string || "0");
          const price = prices[token.toLowerCase()] || 0;
          totalValueUsd += val * price;
        }
      }

      users.push({
        address,
        email: userInfo?.email || null,
        name: userInfo?.name || null,
        totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
        auxmBalance: parseFloat(balance?.auxm as string || "0"),
        ethBalance: parseFloat(balance?.eth as string || "0"),
        btcBalance: parseFloat(balance?.btc as string || "0"),
        auxgBalance: parseFloat(balance?.auxg as string || "0"),
        auxsBalance: parseFloat(balance?.auxs as string || "0"),
        auxptBalance: parseFloat(balance?.auxpt as string || "0"),
        auxpdBalance: parseFloat(balance?.auxpd as string || "0"),
        createdAt: userInfo?.createdAt || null,
      });
    }

    // Sort by total value
    users.sort((a, b) => b.totalValueUsd - a.totalValueUsd);

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Admin users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Admin actions on user (adjust balance, ban, etc.)
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, address, ...params } = body;

    if (!action || !address) {
      return NextResponse.json({ error: "Action and address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;

    switch (action) {
      // ─────────────────────────────────────────────────────────────────────
      // ADJUST BALANCE
      // ─────────────────────────────────────────────────────────────────────
      case "adjust_balance": {
        const { token, amount, reason } = params;
        if (!token || amount === undefined) {
          return NextResponse.json({ error: "Token and amount required" }, { status: 400 });
        }

        await redis.hincrbyfloat(balanceKey, token.toLowerCase(), amount);

        // Log the adjustment
        const adjustment = {
          type: "admin_adjustment",
          token: token.toUpperCase(),
          amount,
          reason: reason || "Admin adjustment",
          timestamp: Date.now(),
          admin: "system",
        };
        await redis.lpush(`user:${normalizedAddress}:transactions`, JSON.stringify(adjustment));

        const newBalance = await redis.hget(balanceKey, token.toLowerCase());

        return NextResponse.json({
          success: true,
          action: "adjust_balance",
          token: token.toUpperCase(),
          adjustment: amount,
          newBalance: parseFloat(newBalance as string || "0"),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // SET TIER
      // ─────────────────────────────────────────────────────────────────────
      case "set_tier": {
        const { tierId, tierName } = params;
        if (!tierId) {
          return NextResponse.json({ error: "Tier ID required" }, { status: 400 });
        }

        await redis.hset(`user:${normalizedAddress}:tier`, {
          id: tierId,
          name: tierName || tierId,
          updatedAt: Date.now(),
        });

        return NextResponse.json({
          success: true,
          action: "set_tier",
          tier: { id: tierId, name: tierName },
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // BAN/UNBAN USER
      // ─────────────────────────────────────────────────────────────────────
      case "ban": {
        const { reason } = params;
        await redis.hset(`user:${normalizedAddress}:info`, {
          banned: "true",
          bannedAt: Date.now(),
          banReason: reason || "Admin action",
        });

        return NextResponse.json({
          success: true,
          action: "ban",
          address: normalizedAddress,
        });
      }

      case "unban": {
        await redis.hdel(`user:${normalizedAddress}:info`, "banned", "bannedAt", "banReason");

        return NextResponse.json({
          success: true,
          action: "unban",
          address: normalizedAddress,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin users action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
