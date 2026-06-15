// src/app/api/admin/users/route.ts
// Admin User Management API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { isDemoAccount } from "@/lib/demo-accounts";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ───────────────────────────────────────────────────────────────────────────
// Full-list cache. Building the list scans every user with several Redis reads
// each; without a cache the frontend's page-by-page fan-out re-runs that full
// scan for every page. We build once, cache the sorted+demo-filtered array, and
// serve all pages (and search) from it. Busted on any mutating POST action.
// ───────────────────────────────────────────────────────────────────────────
const USERS_CACHE_KEY = "admin:users:cache:v1";
const USERS_CACHE_TTL = 120; // seconds
let usersBuildInFlight: Promise<any[]> | null = null;

const KNOWN_TOKENS = ['auxm', 'eth', 'btc', 'usdt', 'usdc', 'usd', 'xrp', 'sol', 'auxg', 'auxs', 'auxpt', 'auxpd'];

// Run an async mapper over items in bounded-concurrency chunks so we don't fire
// thousands of Redis round-trips at once, while still parallelising heavily.
async function mapChunked<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size);
    out.push(...(await Promise.all(batch.map(fn))));
  }
  return out;
}

// Build the full, sorted, demo-filtered user list. Parallelised per user.
async function buildAllUsers(): Promise<any[]> {
  const authKeys = await redis.keys("auth:user:*");
  const balanceKeys = await redis.keys("user:0x*:balance");

  const { getLivePrices } = await import('@/lib/live-prices');
  const prices = await getLivePrices();

  const userMap = new Map<string, any>();

  // Registered users (auth:user:{email}) — processed in parallel chunks.
  const authUsers = await mapChunked(authKeys, 100, async (authKey) => {
    try {
      const userData = await redis.hgetall(authKey);
      const walletAddr = ((userData?.walletAddress as string) || "").toLowerCase().trim();
      if (!walletAddr) return null;
      const email = authKey.replace("auth:user:", "");

      const userId = (userData?.id as string) || null;
      const userUid = await redis.get(`user:address:${walletAddr}`) as string;

      // Fan out this user's reads together.
      const [balance, userInfo, profile, allocRaw, kycData] = await Promise.all([
        redis.hgetall(`user:${walletAddr}:balance`),
        redis.hgetall(`user:${walletAddr}:info`),
        userId ? redis.hgetall(`user:${userId}`) : Promise.resolve(null),
        userUid ? redis.get(`allocation:user:${userUid}:list`) : Promise.resolve(null),
        redis.get(`kyc:${walletAddr}`),
      ]);

      let totalValueUsd = 0;
      if (balance) {
        for (const token of KNOWN_TOKENS) {
          const val = parseFloat(balance[token] as string || "0");
          if (isNaN(val) || val <= 0) continue;
          totalValueUsd += val * (prices[token] || 0);
        }
      }
      try {
        const allocs = allocRaw ? (typeof allocRaw === 'string' ? JSON.parse(allocRaw) : allocRaw) : [];
        for (const alloc of (allocs as any[])) {
          if (alloc.status !== 'active') continue;
          const metalKey = (alloc.metal || '').toLowerCase();
          const grams = parseFloat(alloc.grams || '0');
          if (grams > 0 && prices[metalKey]) totalValueUsd += grams * prices[metalKey];
        }
      } catch {}

      const profileData: Record<string, any> = (profile as Record<string, any>) || {};
      const userName = (userData?.name as string) || profileData.name ||
        (profileData.firstName ? `${profileData.firstName} ${profileData.lastName || ''}`.trim() : null) ||
        (userInfo?.name as string) || null;

      const kyc = kycData ? (typeof kycData === 'string' ? JSON.parse(kycData) : kycData) : null;
      const kycStatus = kyc?.status || (userData?.kycVerified === 'true' ? 'approved' : 'none');
      const kycLevel = kyc?.level || (userData?.kycVerified === 'true' ? 'verified' : 'none');

      return {
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
      };
    } catch (e) {
      console.warn(`Failed to process ${authKey}:`, e);
      return null;
    }
  });
  for (const u of authUsers) if (u) userMap.set(u.address, u);

  // Balance-only users (not registered) — processed in parallel chunks.
  const balanceUsers = await mapChunked(balanceKeys, 100, async (key) => {
    const addr = key.split(":")[1];
    if (userMap.has(addr)) return null;

    const userUid2 = await redis.get(`user:address:${addr}`) as string;
    const [balance, userInfo, allocRaw2, kycData2] = await Promise.all([
      redis.hgetall(key),
      redis.hgetall(`user:${addr}:info`),
      userUid2 ? redis.get(`allocation:user:${userUid2}:list`) : Promise.resolve(null),
      redis.get(`kyc:${addr}`),
    ]);

    let totalValueUsd = 0;
    if (balance) {
      for (const token of KNOWN_TOKENS) {
        const val = parseFloat(balance[token] as string || "0");
        if (isNaN(val) || val <= 0) continue;
        totalValueUsd += val * (prices[token] || 0);
      }
    }
    try {
      const allocs2 = allocRaw2 ? (typeof allocRaw2 === 'string' ? JSON.parse(allocRaw2) : allocRaw2) : [];
      for (const alloc of (allocs2 as any[])) {
        if (alloc.status !== 'active') continue;
        const metalKey = (alloc.metal || '').toLowerCase();
        const grams = parseFloat(alloc.grams || '0');
        if (grams > 0 && prices[metalKey]) totalValueUsd += grams * prices[metalKey];
      }
    } catch {}

    const kyc2 = kycData2 ? (typeof kycData2 === 'string' ? JSON.parse(kycData2) : kycData2) : null;

    return {
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
    };
  });
  for (const u of balanceUsers) if (u) userMap.set(u.address, u);

  // Hide test/demo accounts, then sort by total value.
  const users = Array.from(userMap.values()).filter((u) => !isDemoAccount(u.address));
  users.sort((a: any, b: any) => b.totalValueUsd - a.totalValueUsd);
  return users;
}

// Get the full list from cache, or build (single-flight) and cache it.
async function getAllUsersCached(): Promise<any[]> {
  const cached = await redis.get(USERS_CACHE_KEY);
  if (cached) return (typeof cached === 'string' ? JSON.parse(cached) : cached) as any[];

  if (!usersBuildInFlight) {
    usersBuildInFlight = buildAllUsers().finally(() => { usersBuildInFlight = null; });
  }
  const users = await usersBuildInFlight;
  try { await redis.set(USERS_CACHE_KEY, JSON.stringify(users), { ex: USERS_CACHE_TTL }); } catch {}
  return users;
}

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

      // Get allocations (key: allocation:user:{uid}:list)
      const detailUid = await redis.get(`user:address:${normalizedAddress}`) as string;
      let parsedAlloc: any[] = [];
      if (detailUid) {
        const allocRawDetail = await redis.get(`allocation:user:${detailUid}:list`);
        parsedAlloc = allocRawDetail ? (typeof allocRawDetail === 'string' ? JSON.parse(allocRawDetail) : allocRawDetail) : [];
      }
      // Fallback: also check legacy key
      if (parsedAlloc.length === 0) {
        const legacyAllocs = await redis.lrange(`user:${normalizedAddress}:allocations`, 0, -1);
        parsedAlloc = legacyAllocs.map((a: any) => {
          try { return typeof a === "string" ? JSON.parse(a) : a; } catch { return a; }
        });
      }

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
    // LIST ALL USERS — served from the cached, sorted, demo-filtered full list.
    // The single-user lookup (?address=) above is NOT filtered/cached.
    // ─────────────────────────────────────────────────────────────────────────
    let users = await getAllUsersCached();

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

    // Any admin action below mutates user data → invalidate the list cache so
    // the next GET rebuilds with fresh values.
    try { await redis.del(USERS_CACHE_KEY); } catch {}

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

      // ─────────────────────────────────────────────────────────────────────
      // UPDATE NAME — sync across auth:user / user:{userId} / user:{addr}:info
      // ─────────────────────────────────────────────────────────────────────
      case "update_name": {
        const rawName = (params.name as string || "").trim();
        if (!rawName) {
          return NextResponse.json({ error: "Name required" }, { status: 400 });
        }
        // Split into first / last on first space
        const spaceIdx = rawName.indexOf(" ");
        const firstName = spaceIdx === -1 ? rawName : rawName.slice(0, spaceIdx).trim();
        const lastName = spaceIdx === -1 ? "" : rawName.slice(spaceIdx + 1).trim();

        const updatedKeys: string[] = [];

        // 1. user:{addr}:info
        await redis.hset(`user:${normalizedAddress}:info`, { name: rawName });
        updatedKeys.push(`user:${normalizedAddress}:info`);

        // 2. auth:user:{email} (located by matching walletAddress) + user:{userId}
        try {
          const authKeys = await redis.keys("auth:user:*");
          for (const authKey of authKeys) {
            const data = await redis.hgetall(authKey);
            if (data && (data as any).walletAddress?.toLowerCase() === normalizedAddress) {
              await redis.hset(authKey, { name: rawName, firstName, lastName });
              updatedKeys.push(authKey);
              const userId = (data as any).id;
              if (userId) {
                await redis.hset(`user:${userId}`, { name: rawName, firstName, lastName });
                updatedKeys.push(`user:${userId}`);
              }
              break;
            }
          }
        } catch { /* best-effort */ }

        return NextResponse.json({
          success: true,
          action: "update_name",
          name: rawName,
          firstName,
          lastName,
          updatedKeys,
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
