// src/app/api/admin/heal-negative-metal/route.ts
// One-time corrective: heal accounts whose Redis metal balance went negative
// because sells debited the fractional balance without de-allocating whole
// grams (see reduceAllocations / trade route fix).
//
// For each user with a negative metal balance, re-normalize:
//   total = redisBalance + activeAllocations   (the true holding)
//   newWhole = floor(total)  → target allocations
//   newFrac  = total - newWhole → target Redis balance (≥ 0)
//   deAlloc  = activeAllocations - newWhole → grams to de-allocate
// Then reduceAllocations(deAlloc) (frees bars + redeems certs) and set the
// Redis balance to newFrac.
//
// If total < 0 the account is a genuine shortfall (not just a split artifact) —
// it is NOT auto-healed; it's reported for manual review.
//
//   GET                      → dry-run plan (no writes)
//   POST { confirm:"HEAL" }  → execute
// Auth: Authorization: Bearer ${CRON_SECRET}

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { reduceAllocations } from "@/lib/allocation-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const METALS = ["auxg", "auxs", "auxpt", "auxpd"] as const;
const SECRET = process.env.CRON_SECRET || "";

async function scanBalanceKeys(): Promise<string[]> {
  let cursor = "0";
  const out: string[] = [];
  do {
    const [next, batch] = (await redis.scan(cursor, { match: "user:*:balance", count: 500 })) as [string, string[]];
    cursor = next;
    out.push(...batch);
  } while (cursor !== "0");
  return out;
}

async function activeAllocation(address: string, metal: string): Promise<number> {
  const uid = (await redis.get(`user:address:${address.toLowerCase()}`)) as string;
  if (!uid) return 0;
  const raw = await redis.get(`allocation:user:${uid}:list`);
  if (!raw) return 0;
  const list = typeof raw === "string" ? JSON.parse(raw) : raw;
  let sum = 0;
  for (const a of list) {
    if ((a.metal || "").toLowerCase() === metal && (a.status || "active") === "active") sum += parseFloat(a.grams) || 0;
  }
  return sum;
}

export async function GET(request: NextRequest) {
  return handle(request, false);
}
export async function POST(request: NextRequest) {
  let body: any = {};
  try { body = await request.json(); } catch {}
  if (body?.confirm !== "HEAL") {
    return NextResponse.json({ error: "POST requires { confirm: 'HEAL' }" }, { status: 400 });
  }
  return handle(request, true);
}

async function handle(request: NextRequest, execute: boolean) {
  const auth = request.headers.get("Authorization");
  if (SECRET && auth !== `Bearer ${SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await scanBalanceKeys();
  const healed: any[] = [];
  const shortfalls: any[] = [];

  for (const key of keys) {
    const address = key.replace(/^user:/, "").replace(/:balance$/, "");
    if (!address.startsWith("0x")) continue;
    const bal = await redis.hgetall(key);
    if (!bal) continue;

    for (const metal of METALS) {
      const redisBal = parseFloat((bal as any)[metal] || "0");
      if (!(redisBal < -1e-6)) continue; // only negatives

      const allocAmt = await activeAllocation(address, metal);
      const total = redisBal + allocAmt;

      if (total < -1e-6) {
        shortfalls.push({ address, metal, redisBal, allocAmt, total: parseFloat(total.toFixed(6)) });
        continue; // genuine shortfall — manual review
      }

      const newWhole = Math.max(0, Math.floor(total + 1e-9));
      const newFrac = parseFloat(Math.max(0, total - newWhole).toFixed(6));
      const deAlloc = parseFloat((allocAmt - newWhole).toFixed(6));

      const plan = { address, metal, redisBal, allocAmt, total: parseFloat(total.toFixed(6)), newBalance: newFrac, newAllocation: newWhole, deAlloc };

      if (execute) {
        if (deAlloc > 1e-6) {
          const res = await reduceAllocations(address, metal.toUpperCase(), deAlloc);
          (plan as any).deallocResult = res;
        }
        await redis.hset(key, { [metal]: newFrac.toString() });
        (plan as any).executed = true;
      }
      healed.push(plan);
    }
  }

  return NextResponse.json({
    success: true,
    mode: execute ? "executed" : "dry-run",
    scanned: keys.length,
    healedCount: healed.length,
    shortfallCount: shortfalls.length,
    healed,
    shortfalls,
  });
}
