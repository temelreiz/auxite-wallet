// src/app/api/admin/users/route.ts
// Admin User Management API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { requireAdmin } from "@/lib/admin-auth";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════
// GET - List users or get single user details
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "1000");
    const search = searchParams.get("search");

    // ─────────────────────────────────────────────────────────────────────────
    // SINGLE USER DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    if (address) {
      const normalizedAddress = address.toLowerCase();

      // Get balance
      const balance = await redis.hgetall(`user:${normalizedAddress}:balance`);

      // Get user info from :info hash
      const userInfo = await redis.hgetall(`user:${normalizedAddress}:info`) || {};

      // Also try to find auth:user data (registered users have more info)
      let authData: Record<string, any> = {};
      // Find auth:user entry by wallet address
      const authKeys = await redis.keys("auth:user:*");
      for (const authKey of authKeys) {
        try {
          const data = await redis.hgetall(authKey);
          if (data && (data as any).walletAddress?.toLowerCase() === normalizedAddress) {
            authData = data as Record<string, any>;
            // Also get userId-based profile for extra info
            const userId = (data as any).id;
            if (userId) {
              const profile = await redis.hgetall(`user:${userId}`);
              if (profile) {
                authData = { ...authData, ...(profile as Record<string, any>) };
              }
            }
            break;
          }
        } catch { /* skip */ }
      }

      // Merge info: auth data takes priority
      const mergedInfo = {
        email: authData.email || (userInfo as any)?.email || null,
        name: authData.name || authData.firstName ? `${authData.firstName || ''} ${authData.lastName || ''}`.trim() : (userInfo as any)?.name || null,
        phone: authData.phone || (userInfo as any)?.phone || null,
        createdAt: authData.createdAt || (userInfo as any)?.createdAt || null,
        vaultId: authData.vaultId || null,
        kycStatus: (userInfo as any)?.kycStatus || authData.kycStatus || 'none',
        banned: (userInfo as any)?.banned || false,
        banReason: (userInfo as any)?.banReason || null,
        authProvider: authData.authProvider || 'email',
        emailVerified: authData.emailVerified || false,
        picture: authData.picture || null,
        language: authData.language || 'en',
      };

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
      const { getLivePrices: getPrices } = await import('@/lib/live-prices');
      const prices = await getPrices();

      const KNOWN_TOKENS_DETAIL = ['auxm', 'eth', 'btc', 'usdt', 'usdc', 'usd', 'xrp', 'sol', 'auxg', 'auxs', 'auxpt', 'auxpd'];
      let liquidityUsd = 0;
      let allocatedUsd = 0;
      let yieldUsd = 0;

      if (balance) {
        for (const token of KNOWN_TOKENS_DETAIL) {
          const val = parseFloat(balance[token] as string || "0");
          if (isNaN(val) || val <= 0) continue;
          const price = prices[token] || 0;
          liquidityUsd += val * price;
        }
      }

      // Calculate allocated value from allocations
      const allocatedGrams: Record<string, number> = {};
      for (const alloc of parsedAlloc) {
        const metalKey = (alloc.metal || '').toLowerCase();
        const grams = parseFloat(alloc.grams || alloc.allocatedGrams || '0');
        if (grams > 0) {
          allocatedGrams[metalKey] = (allocatedGrams[metalKey] || 0) + grams;
          allocatedUsd += grams * (prices[metalKey] || 0);
        }
      }

      // Calculate staked/yield value
      try {
        const stakes = await redis.lrange(`user:${normalizedAddress}:stakes`, 0, -1);
        for (const s of stakes) {
          const stake = typeof s === 'string' ? JSON.parse(s) : s;
          if (stake.status === 'active') {
            const metalKey = (stake.metal || stake.token || '').toLowerCase();
            const grams = parseFloat(stake.grams || stake.amount || '0');
            if (grams > 0 && prices[metalKey]) {
              yieldUsd += grams * prices[metalKey];
            }
          }
        }
      } catch {}

      const totalValueUsd = liquidityUsd + allocatedUsd + yieldUsd;

      return NextResponse.json({
        success: true,
        user: {
          address: normalizedAddress,
          info: mergedInfo,
          balance: balance || {},
          totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
          liquidityUsd: parseFloat(liquidityUsd.toFixed(2)),
          allocatedUsd: parseFloat(allocatedUsd.toFixed(2)),
          yieldUsd: parseFloat(yieldUsd.toFixed(2)),
          allocatedGrams,
          tier: tierInfo || { id: "regular", name: "Regular" },
          transactionCount: parsedTx.length,
          allocationCount: parsedAlloc.length,
        },
        transactions: parsedTx,
        allocations: parsedAlloc,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST ALL USERS — auth:user:* (registered) + user:0x*:balance (with funds)
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Get all registered users from auth:user:* keys
    const authKeys = await redis.keys("auth:user:*");

    // 2. Also get balance-based users (legacy or direct)
    const balanceKeys = await redis.keys("user:0x*:balance");

    // Build a map of all users: address -> user data
    const userMap = new Map<string, any>();

    const { getLivePrices } = await import('@/lib/live-prices');
    const livePrices = await getLivePrices();
    const prices = livePrices;

    // Process registered users (auth:user:{email})
    for (const authKey of authKeys) {
      try {
        const userData = await redis.hgetall(authKey);
        const walletAddr = ((userData?.walletAddress as string) || "").toLowerCase().trim();
        if (!walletAddr) continue;
        const email = authKey.replace("auth:user:", "");

        // Get balance
        const balance = await redis.hgetall(`user:${walletAddr}:balance`);
        const userInfo = await redis.hgetall(`user:${walletAddr}:info`);

        const KNOWN_TOKENS = ['auxm', 'eth', 'btc', 'usdt', 'usdc', 'usd', 'xrp', 'sol', 'auxg', 'auxs', 'auxpt', 'auxpd'];
        let totalValueUsd = 0;
        if (balance) {
          for (const token of KNOWN_TOKENS) {
            const val = parseFloat(balance[token] as string || "0");
            if (isNaN(val) || val <= 0) continue;
            const price = prices[token] || 0;
            totalValueUsd += val * price;
          }
        }

        // Add allocation values
        try {
          const allocations = await redis.lrange(`user:${walletAddr}:allocations`, 0, -1);
          for (const a of allocations) {
            const alloc = typeof a === 'string' ? JSON.parse(a) : a;
            const metalKey = (alloc.metal || '').toLowerCase();
            const grams = parseFloat(alloc.grams || alloc.allocatedGrams || '0');
            if (grams > 0 && prices[metalKey]) {
              totalValueUsd += grams * prices[metalKey];
            }
          }
        } catch {}

        // Also get user:{userId} profile for extra info
        const userId = (userData?.id as string) || null;
        let profileData: Record<string, any> = {};
        if (userId) {
          const profile = await redis.hgetall(`user:${userId}`);
          if (profile) profileData = profile as Record<string, any>;
        }

        const userName = (userData?.name as string) || profileData.name ||
          (profileData.firstName ? `${profileData.firstName} ${profileData.lastName || ''}`.trim() : null) ||
          (userInfo?.name as string) || null;

        // Get KYC status
        const kycData = await redis.get(`kyc:${walletAddr}`);
        const kyc = kycData ? (typeof kycData === 'string' ? JSON.parse(kycData) : kycData) : null;
        const kycStatus = kyc?.status || (userData?.kycVerified === 'true' ? 'approved' : 'none');
        const kycLevel = kyc?.level || (userData?.kycVerified === 'true' ? 'verified' : 'none');

        userMap.set(walletAddr, {
          address: walletAddr,
          email: email || (userInfo?.email as string) || null,
          name: userName,
          phone: (userData?.phone as string) || profileData.phone || (userInfo?.phone as string) || null,
          platform: (userData?.lastPlatform as string) || (userData?.platform as string) || null,
          source: (userData?.source as string) || null,
          kycStatus,
          kycLevel,
          totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
          auxmBalance: parseFloat(balance?.auxm as string || "0"),
          ethBalance: parseFloat(balance?.eth as string || "0"),
          btcBalance: parseFloat(balance?.btc as string || "0"),
          auxgBalance: parseFloat(balance?.auxg as string || "0"),
          auxsBalance: parseFloat(balance?.auxs as string || "0"),
          auxptBalance: parseFloat(balance?.auxpt as string || "0"),
          auxpdBalance: parseFloat(balance?.auxpd as string || "0"),
          createdAt: (userData?.createdAt as string) || profileData.createdAt || (userInfo?.createdAt as string) || null,
          vaultId: (userData?.vaultId as string) || profileData.vaultId || null,
          userId,
        });
      } catch (e) {
        console.warn(`Failed to process ${authKey}:`, e);
      }
    }

    // Process balance-only users (not in auth:user:*)
    for (const key of balanceKeys) {
      const addr = key.split(":")[1];
      if (userMap.has(addr)) continue; // Already added from auth

      const balance = await redis.hgetall(key);
      const userInfo = await redis.hgetall(`user:${addr}:info`);

      const KNOWN_TOKENS2 = ['auxm', 'eth', 'btc', 'usdt', 'usdc', 'usd', 'xrp', 'sol', 'auxg', 'auxs', 'auxpt', 'auxpd'];
      let totalValueUsd = 0;
      if (balance) {
        for (const token of KNOWN_TOKENS2) {
          const val = parseFloat(balance[token] as string || "0");
          if (isNaN(val) || val <= 0) continue;
          const price = prices[token] || 0;
          totalValueUsd += val * price;
        }
      }

      // Add allocation values
      try {
        const allocations2 = await redis.lrange(`user:${addr}:allocations`, 0, -1);
        for (const a of allocations2) {
          const alloc = typeof a === 'string' ? JSON.parse(a) : a;
          const metalKey = (alloc.metal || '').toLowerCase();
          const grams = parseFloat(alloc.grams || alloc.allocatedGrams || '0');
          if (grams > 0 && prices[metalKey]) {
            totalValueUsd += grams * prices[metalKey];
          }
        }
      } catch {}

      // Get KYC status
      const kycData2 = await redis.get(`kyc:${addr}`);
      const kyc2 = kycData2 ? (typeof kycData2 === 'string' ? JSON.parse(kycData2) : kycData2) : null;

      userMap.set(addr, {
        address: addr,
        email: (userInfo?.email as string) || null,
        name: (userInfo?.name as string) || null,
        phone: (userInfo?.phone as string) || null,
        kycStatus: kyc2?.status || 'none',
        kycLevel: kyc2?.level || 'none',
        totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
        auxmBalance: parseFloat(balance?.auxm as string || "0"),
        ethBalance: parseFloat(balance?.eth as string || "0"),
        btcBalance: parseFloat(balance?.btc as string || "0"),
        auxgBalance: parseFloat(balance?.auxg as string || "0"),
        auxsBalance: parseFloat(balance?.auxs as string || "0"),
        auxptBalance: parseFloat(balance?.auxpt as string || "0"),
        auxpdBalance: parseFloat(balance?.auxpd as string || "0"),
        createdAt: (userInfo?.createdAt as string) || null,
      });
    }

    // Convert to array
    let users = Array.from(userMap.values());

    // Filter by search if provided
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.address?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
      );
    }

    // Sort by total value
    users.sort((a: any, b: any) => b.totalValueUsd - a.totalValueUsd);

    // Paginate
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      users: paginatedUsers,
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
  try {
    const auth = await requireAdmin(request);
    if (!auth.authorized) return auth.response!;
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
