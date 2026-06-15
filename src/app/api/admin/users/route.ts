// src/app/api/admin/users/route.ts
// Admin User Management API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { isDemoAccount } from "@/lib/demo-accounts";

// Building the full user list scans the whole user base; give it room beyond
// the default serverless timeout so it never gets cut off mid-build.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

// Run a Redis pipeline over `keys` in parallel batches, returning results in
// the same order as `keys`. This collapses one-HTTP-request-per-key into one
// request per batch — the key to building the list fast at scale.
async function pipeAll(keys: string[], add: (p: any, k: string) => void, batch = 256): Promise<any[]> {
  if (keys.length === 0) return [];
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += batch) batches.push(keys.slice(i, i + batch));
  // Bounded parallelism so we never open too many Upstash connections at once.
  const CONCURRENCY = 8;
  const out: any[] = [];
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const wave = batches.slice(i, i + CONCURRENCY);
    const res = await Promise.all(
      wave.map(async (slice) => {
        const p = redis.pipeline();
        for (const k of slice) add(p, k);
        return (await p.exec()) as any[];
      }),
    );
    for (const r of res) out.push(...r);
  }
  return out;
}

// USD value of a balance hash + active allocations.
function computeValue(balance: any, allocRaw: any, prices: Record<string, number>): number {
  let total = 0;
  if (balance) {
    for (const token of KNOWN_TOKENS) {
      const val = parseFloat(balance[token] as string || "0");
      if (isNaN(val) || val <= 0) continue;
      total += val * (prices[token] || 0);
    }
  }
  try {
    const allocs = allocRaw ? (typeof allocRaw === 'string' ? JSON.parse(allocRaw) : allocRaw) : [];
    for (const alloc of (allocs as any[])) {
      if (alloc.status !== 'active') continue;
      const metalKey = (alloc.metal || '').toLowerCase();
      const grams = parseFloat(alloc.grams || '0');
      if (grams > 0 && prices[metalKey]) total += grams * prices[metalKey];
    }
  } catch {}
  return total;
}

const parseKyc = (raw: any) => (raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null);

// Build a sparse array aligned to `n` from values gathered only for some indices.
function scatter(n: number, idx: number[], values: any[]): any[] {
  const out: any[] = new Array(n).fill(null);
  idx.forEach((origI, j) => { out[origI] = values[j]; });
  return out;
}

// Build one user-list row from its raw Redis pieces. Single source of truth
// shared by the full-list build and the direct (scan-free) search lookups.
function summarize(o: {
  addr: string; email: string | null; userData: any; balance: any;
  userInfo: any; profile: any; kycRaw: any; allocRaw: any; prices: Record<string, number>;
}) {
  const userData = o.userData || {};
  const userInfo = o.userInfo || {};
  const profileData = (o.profile || {}) as Record<string, any>;
  const kyc = parseKyc(o.kycRaw);
  const balance = o.balance as any;
  const totalValueUsd = computeValue(balance, o.allocRaw, o.prices);
  const userName = (userData.name as string) || profileData.name ||
    (profileData.firstName ? `${profileData.firstName} ${profileData.lastName || ''}`.trim() : null) ||
    (userInfo.name as string) || null;
  return {
    address: o.addr,
    email: o.email || (userInfo.email as string) || null,
    name: userName,
    phone: (userData.phone as string) || profileData.phone || (userInfo.phone as string) || null,
    platform: (userData.lastPlatform as string) || (userData.platform as string) || null,
    source: (userData.source as string) || null,
    kycStatus: kyc?.status || (userData.kycVerified === 'true' ? 'approved' : 'none'),
    kycLevel: kyc?.level || (userData.kycVerified === 'true' ? 'verified' : 'none'),
    totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
    auxmBalance: parseFloat(balance?.auxm as string || "0"),
    ethBalance: parseFloat(balance?.eth as string || "0"),
    btcBalance: parseFloat(balance?.btc as string || "0"),
    auxgBalance: parseFloat(balance?.auxg as string || "0"),
    auxsBalance: parseFloat(balance?.auxs as string || "0"),
    auxptBalance: parseFloat(balance?.auxpt as string || "0"),
    auxpdBalance: parseFloat(balance?.auxpd as string || "0"),
    createdAt: (userData.createdAt as string) || profileData.createdAt || (userInfo.createdAt as string) || null,
    vaultId: (userData.vaultId as string) || profileData.vaultId || null,
    userId: (userData.id as string) || null,
  };
}

// Direct, scan-free lookup by email — auth:user:{email} is a 1:1 key, so this
// never touches the full-list build (works even when that's slow/cold).
async function lookupByEmail(email: string, prices: Record<string, number>) {
  const userData = await redis.hgetall(`auth:user:${email}`) as any;
  if (!userData || Object.keys(userData).length === 0) return null;
  const addr = ((userData.walletAddress as string) || "").toLowerCase().trim();
  if (!addr) return null;
  const userId = (userData.id as string) || null;
  const uid = await redis.get(`user:address:${addr}`) as string;
  const [balance, userInfo, profile, kycRaw, allocRaw] = await Promise.all([
    redis.hgetall(`user:${addr}:balance`),
    redis.hgetall(`user:${addr}:info`),
    userId ? redis.hgetall(`user:${userId}`) : Promise.resolve(null),
    redis.get(`kyc:${addr}`),
    uid ? redis.get(`allocation:user:${uid}:list`) : Promise.resolve(null),
  ]);
  if (isDemoAccount(addr)) return null;
  return summarize({ addr, email, userData, balance, userInfo, profile, kycRaw, allocRaw, prices });
}

// Direct, scan-free lookup by wallet address.
async function lookupByAddress(address: string, prices: Record<string, number>) {
  const addr = address.toLowerCase().trim();
  if (isDemoAccount(addr)) return null;
  const uid = await redis.get(`user:address:${addr}`) as string;
  const [balance, userInfo, kycRaw, allocRaw] = await Promise.all([
    redis.hgetall(`user:${addr}:balance`),
    redis.hgetall(`user:${addr}:info`),
    redis.get(`kyc:${addr}`),
    uid ? redis.get(`allocation:user:${uid}:list`) : Promise.resolve(null),
  ]);
  const hasAny = (balance && Object.keys(balance).length) || (userInfo && Object.keys(userInfo).length);
  if (!hasAny) return null;
  return summarize({ addr, email: null, userData: {}, balance, userInfo, profile: null, kycRaw, allocRaw, prices });
}

// Build the full, sorted, demo-filtered user list. Parallelised per user.
async function buildAllUsers(): Promise<any[]> {
  const authKeys = await redis.keys("auth:user:*");
  const balanceKeys = await redis.keys("user:0x*:balance");

  const { getLivePrices } = await import('@/lib/live-prices');
  const prices = await getLivePrices();

  const userMap = new Map<string, any>();

  // ── Registered users (auth:user:{email}) ──────────────────────────────────
  // Pull all auth hashes in batched pipelines, then keep only those with a wallet.
  const authDatas = await pipeAll(authKeys, (p, k) => p.hgetall(k));
  const reg = authKeys
    .map((k, i) => ({ email: k.replace("auth:user:", ""), data: (authDatas[i] || {}) as any }))
    .filter((x) => ((x.data.walletAddress as string) || "").trim())
    .map((x) => ({ ...x, addr: (x.data.walletAddress as string).toLowerCase().trim() }));
  const regAddrs = reg.map((x) => x.addr);

  // Fan out the per-user reads as 4 batched pipelines (one per key family).
  const [regBalances, regInfos, regKycs, regUids] = await Promise.all([
    pipeAll(regAddrs.map((a) => `user:${a}:balance`), (p, k) => p.hgetall(k)),
    pipeAll(regAddrs.map((a) => `user:${a}:info`), (p, k) => p.hgetall(k)),
    pipeAll(regAddrs.map((a) => `kyc:${a}`), (p, k) => p.get(k)),
    pipeAll(regAddrs.map((a) => `user:address:${a}`), (p, k) => p.get(k)),
  ]);

  // Profiles (only where an id exists) + allocation lists (only where a uid
  // resolved) — fetched sparsely and scattered back into per-user alignment.
  const profileIdx: number[] = [];
  const profileKeys: string[] = [];
  reg.forEach((x, i) => { if (x.data.id) { profileIdx.push(i); profileKeys.push(`user:${x.data.id}`); } });
  const allocIdx: number[] = [];
  const allocKeys: string[] = [];
  regUids.forEach((uid, i) => { if (uid) { allocIdx.push(i); allocKeys.push(`allocation:user:${uid}:list`); } });
  const [profilesRaw, allocsRaw] = await Promise.all([
    pipeAll(profileKeys, (p, k) => p.hgetall(k)),
    pipeAll(allocKeys, (p, k) => p.get(k)),
  ]);
  const profiles = scatter(reg.length, profileIdx, profilesRaw);
  const allocs = scatter(reg.length, allocIdx, allocsRaw);

  reg.forEach((x, i) => {
    try {
      const userData = x.data;
      const balance = regBalances[i] as any;
      const userInfo = (regInfos[i] || {}) as any;
      const profileData = (profiles[i] || {}) as Record<string, any>;
      const kyc = parseKyc(regKycs[i]);
      const totalValueUsd = computeValue(balance, allocs[i], prices);
      const userName = (userData?.name as string) || profileData.name ||
        (profileData.firstName ? `${profileData.firstName} ${profileData.lastName || ''}`.trim() : null) ||
        (userInfo?.name as string) || null;
      const kycStatus = kyc?.status || (userData?.kycVerified === 'true' ? 'approved' : 'none');
      const kycLevel = kyc?.level || (userData?.kycVerified === 'true' ? 'verified' : 'none');
      userMap.set(x.addr, {
        address: x.addr,
        email: x.email || (userInfo?.email as string) || null,
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
        userId: (userData?.id as string) || null,
      });
    } catch (e) {
      console.warn(`Failed to process auth user ${x.email}:`, e);
    }
  });

  // ── Balance-only users (not registered) ───────────────────────────────────
  const balOnly = balanceKeys
    .map((key) => ({ key, addr: key.split(":")[1] }))
    .filter((x) => !userMap.has(x.addr));
  const balAddrs = balOnly.map((x) => x.addr);
  const [balBalances, balInfos, balKycs, balUids] = await Promise.all([
    pipeAll(balOnly.map((x) => x.key), (p, k) => p.hgetall(k)),
    pipeAll(balAddrs.map((a) => `user:${a}:info`), (p, k) => p.hgetall(k)),
    pipeAll(balAddrs.map((a) => `kyc:${a}`), (p, k) => p.get(k)),
    pipeAll(balAddrs.map((a) => `user:address:${a}`), (p, k) => p.get(k)),
  ]);
  const balAllocIdx: number[] = [];
  const balAllocKeys: string[] = [];
  balUids.forEach((uid, i) => { if (uid) { balAllocIdx.push(i); balAllocKeys.push(`allocation:user:${uid}:list`); } });
  const balAllocs = scatter(balOnly.length, balAllocIdx, await pipeAll(balAllocKeys, (p, k) => p.get(k)));

  balOnly.forEach((x, i) => {
    const balance = balBalances[i] as any;
    const userInfo = (balInfos[i] || {}) as any;
    const kyc2 = parseKyc(balKycs[i]);
    const totalValueUsd = computeValue(balance, balAllocs[i], prices);
    userMap.set(x.addr, {
      address: x.addr,
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
  });

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
    // SEARCH BY EMAIL / ADDRESS — direct, scan-free lookup. Independent of the
    // full-list build so it stays fast (and works) even when the cache is cold.
    // ─────────────────────────────────────────────────────────────────────────
    if (search) {
      const q = search.trim().toLowerCase();
      if (q.includes("@") || q.startsWith("0x")) {
        const { getLivePrices } = await import('@/lib/live-prices');
        const prices = await getLivePrices();
        const hit = q.includes("@") ? await lookupByEmail(q, prices) : await lookupByAddress(q, prices);
        const arr = hit ? [hit] : [];
        return NextResponse.json({
          success: true,
          users: arr,
          pagination: { page: 1, limit, total: arr.length, pages: arr.length ? 1 : 0 },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // LIST USERS — served from the cached, sorted, demo-filtered full list.
    // ─────────────────────────────────────────────────────────────────────────
    let users = await getAllUsersCached();

    if (search) {
      // Name search (email/address handled above) — match across the full set.
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.address?.toLowerCase().includes(q)
      );
    } else if (searchParams.get("includeEmpty") !== "1") {
      // Default view hides zero-value / no-activity (demo) accounts. Pass
      // ?includeEmpty=1 to see everyone.
      users = users.filter(u => (u.totalValueUsd || 0) > 0);
    }

    // Paginate (list is already sorted by total value in the cache).
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
