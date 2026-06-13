// /api/cron/activity-report — read-only diagnostic of REAL user activity.
//
// Scans the off-chain ledger and reports who actually holds metal, who has any
// balance, and who has transacted — EXCLUDING demo/test accounts (App Store
// review acct + RWA_SYNC_EXCLUDE). No writes, no on-chain calls.
//
// Auth: Authorization: Bearer ${CRON_SECRET}.
//   GET → { balances, metalHolders, transactions }

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const SECRET = process.env.CRON_SECRET || "";
const redis = Redis.fromEnv();

// Same exclusion list as the on-chain reconciler (rwa-mint-sync.ts).
const EXCLUDED = new Set(
  [
    "0x7cffdf3cda3350cc727049b0aba34af6dc6821ed", // App Store / Apple review demo account
    ...(process.env.RWA_SYNC_EXCLUDE || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  ].map((a) => a.toLowerCase()),
);

const METAL_FIELDS = ["auxg", "auxs", "auxpt", "auxpd"];
const CRYPTO_FIELDS = ["usdt", "usdc", "eth", "btc", "auxm", "usd"];
const CAP = 8000; // safety bound on keys scanned per pass

const addrFromKey = (key: string, suffix: string) =>
  key.slice("user:".length, key.length - suffix.length).toLowerCase();

export async function GET(req: NextRequest) {
  if (SECRET && req.headers.get("authorization") !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 1) Balances ──────────────────────────────────────────────────────────
  let cursor: any = 0;
  let scanned = 0;
  let usersWithBalance = 0;
  let usersWithMetal = 0;
  let usersWithCrypto = 0;
  let demoSkipped = 0;
  let capped = false;
  const metalHolders: { address: string; grams: Record<string, number> }[] = [];

  do {
    const [next, keys] = (await redis.scan(cursor, { match: "user:0x*:balance", count: 500 })) as [any, string[]];
    cursor = next;
    if (keys.length) {
      const pipe = redis.pipeline();
      keys.forEach((k) => pipe.hgetall(k));
      const rows = (await pipe.exec()) as Array<Record<string, unknown> | null>;
      keys.forEach((k, i) => {
        scanned++;
        const addr = addrFromKey(k, ":balance");
        if (EXCLUDED.has(addr)) {
          demoSkipped++;
          return;
        }
        const h = rows[i];
        if (!h) return;
        const grams: Record<string, number> = {};
        let hasMetal = false;
        let hasCrypto = false;
        for (const f of METAL_FIELDS) {
          const v = parseFloat(String(h[f] ?? "0")) || 0;
          if (v > 0) {
            grams[f] = v;
            hasMetal = true;
          }
        }
        for (const f of CRYPTO_FIELDS) {
          if ((parseFloat(String(h[f] ?? "0")) || 0) > 0) hasCrypto = true;
        }
        if (hasMetal || hasCrypto) usersWithBalance++;
        if (hasCrypto) usersWithCrypto++;
        if (hasMetal) {
          usersWithMetal++;
          metalHolders.push({ address: addr, grams });
        }
      });
    }
    if (scanned >= CAP) {
      capped = true;
      break;
    }
  } while (String(cursor) !== "0");

  // ── 2) Transactions ──────────────────────────────────────────────────────
  let txCursor: any = 0;
  let txScanned = 0;
  let usersWithTx = 0;
  let totalTx = 0;
  let txCapped = false;

  do {
    const [next, keys] = (await redis.scan(txCursor, { match: "user:0x*:transactions", count: 500 })) as [any, string[]];
    txCursor = next;
    const fresh = keys.filter((k) => !EXCLUDED.has(addrFromKey(k, ":transactions")));
    if (fresh.length) {
      const pipe = redis.pipeline();
      fresh.forEach((k) => pipe.llen(k));
      const lens = (await pipe.exec()) as number[];
      lens.forEach((n) => {
        txScanned++;
        if (n > 0) {
          usersWithTx++;
          totalTx += n;
        }
      });
    }
    if (txScanned >= CAP) {
      txCapped = true;
      break;
    }
  } while (String(txCursor) !== "0");

  metalHolders.sort(
    (a, b) =>
      Object.values(b.grams).reduce((x, y) => x + y, 0) -
      Object.values(a.grams).reduce((x, y) => x + y, 0),
  );

  // ── 3) Resolve identity for metal holders (merge every key shape) ─────────
  const holders = metalHolders.slice(0, 50);
  const wanted = new Set(holders.map((h) => h.address));
  const srcByAddr = new Map<string, Record<string, any>>();
  const uidByAddr = new Map<string, string>();
  const kycByAddr = new Map<string, string>();

  // Fill only still-missing fields so the richest source for each field wins.
  const merge = (addr: string, data: Record<string, any> | null) => {
    if (!data) return;
    const cur = srcByAddr.get(addr) || {};
    for (const k of Object.keys(data)) {
      if (cur[k] == null || cur[k] === "") cur[k] = data[k];
    }
    srcByAddr.set(addr, cur);
  };

  // (a) user:address:{addr} -> userId -> user:{userId}; user:{addr}:info; kyc:{addr}
  for (const h of holders) {
    const addr = h.address;
    const uid = (await redis.get(`user:address:${addr}`)) as string | null;
    if (uid) {
      uidByAddr.set(addr, uid);
      merge(addr, (await redis.hgetall(`user:${uid}`)) as Record<string, any> | null);
    }
    merge(addr, (await redis.hgetall(`user:${addr}:info`)) as Record<string, any> | null);
    const k = (await redis.hgetall(`kyc:${addr}`)) as Record<string, any> | null;
    if (k) {
      const st = k.status ?? k.kycStatus ?? k.level ?? k.state ?? null;
      if (st != null) kycByAddr.set(addr, String(st));
    }
  }

  // (b) auth:user:* scan — email/name/provider live here; match by walletAddress
  //     OR by userId (the holder's balance address may differ from the auth addr).
  const uidToAddr = new Map<string, string>();
  for (const [addr, uid] of uidByAddr) uidToAddr.set(uid, addr);
  {
    let aCursor: any = 0;
    do {
      const [next, keys] = (await redis.scan(aCursor, { match: "auth:user:*", count: 500 })) as [any, string[]];
      aCursor = next;
      if (keys.length) {
        const pipe = redis.pipeline();
        keys.forEach((key) => pipe.hgetall(key));
        const rows = (await pipe.exec()) as Array<Record<string, any> | null>;
        for (const d of rows) {
          if (!d) continue;
          const wa = d.walletAddress ? String(d.walletAddress).toLowerCase() : null;
          const byId = d.id != null && uidToAddr.has(String(d.id)) ? uidToAddr.get(String(d.id))! : null;
          const target = wa && wanted.has(wa) ? wa : byId;
          if (target) merge(target, d);
        }
      }
    } while (String(aCursor) !== "0");
  }

  const metalHoldersWithId = holders.map((h) => {
    const s = srcByAddr.get(h.address) || {};
    const name = (s.name || `${s.firstName || ""} ${s.lastName || ""}`.trim()) || null;
    return {
      ...h,
      identity: {
        userId: uidByAddr.get(h.address) || s.id || null,
        email: s.email || null,
        name,
        phone: s.phone || null,
        kycStatus: kycByAddr.get(h.address) || s.kycStatus || null,
        authProvider: s.authProvider || null,
        createdAt: s.createdAt || null,
      },
    };
  });

  return NextResponse.json({
    success: true,
    excludedDemo: [...EXCLUDED],
    balances: { scanned, capped, usersWithBalance, usersWithMetal, usersWithCrypto, demoSkipped },
    metalHolders: metalHoldersWithId,
    transactions: { scanned: txScanned, capped: txCapped, usersWithTx, totalTx },
    ts: Date.now(),
  });
}
