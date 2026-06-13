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

  // ── 3) Resolve identity for metal holders (try every key shape) ───────────
  const holders = metalHolders.slice(0, 50);
  const idMap = new Map<string, Record<string, any>>();

  const pick = (src: Record<string, any>, uid: string | null) => {
    const name = (src.name || `${src.firstName || ""} ${src.lastName || ""}`.trim()) || null;
    const has = uid || src.email || name || src.phone;
    return has
      ? {
          userId: uid || src.id || null,
          email: src.email || null,
          name,
          phone: src.phone || null,
          kycStatus: src.kycStatus || null,
          authProvider: src.authProvider || null,
          createdAt: src.createdAt || null,
        }
      : null;
  };

  // (a) direct: user:address:{addr} -> userId -> user:{userId}, plus user:{addr}:info
  for (const h of holders) {
    const addr = h.address;
    let src: Record<string, any> = {};
    const uid = (await redis.get(`user:address:${addr}`)) as string | null;
    if (uid) {
      const prof = (await redis.hgetall(`user:${uid}`)) as Record<string, any> | null;
      if (prof) src = { ...src, ...prof };
    }
    const info = (await redis.hgetall(`user:${addr}:info`)) as Record<string, any> | null;
    if (info) src = { ...info, ...src }; // profile wins over legacy info
    const id = pick(src, uid);
    if (id) idMap.set(addr, id);
  }

  // (b) fallback: scan auth:user:* matched by walletAddress for the rest
  const unresolved = new Set(holders.map((h) => h.address).filter((a) => !idMap.has(a)));
  if (unresolved.size) {
    let aCursor: any = 0;
    do {
      const [next, keys] = (await redis.scan(aCursor, { match: "auth:user:*", count: 500 })) as [any, string[]];
      aCursor = next;
      if (keys.length) {
        const pipe = redis.pipeline();
        keys.forEach((k) => pipe.hgetall(k));
        const rows = (await pipe.exec()) as Array<Record<string, any> | null>;
        for (const d of rows) {
          if (!d) continue;
          const wa = d.walletAddress ? String(d.walletAddress).toLowerCase() : null;
          if (wa && unresolved.has(wa)) {
            const id = pick(d, d.id || null);
            if (id) {
              idMap.set(wa, id);
              unresolved.delete(wa);
            }
          }
        }
      }
      if (!unresolved.size) break;
    } while (String(aCursor) !== "0");
  }

  const metalHoldersWithId = holders.map((h) => ({ ...h, identity: idMap.get(h.address) || null }));

  return NextResponse.json({
    success: true,
    excludedDemo: [...EXCLUDED],
    balances: { scanned, capped, usersWithBalance, usersWithMetal, usersWithCrypto, demoSkipped },
    metalHolders: metalHoldersWithId,
    transactions: { scanned: txScanned, capped: txCapped, usersWithTx, totalTx },
    ts: Date.now(),
  });
}
