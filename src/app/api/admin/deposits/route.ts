// ============================================================================
// /api/admin/deposits — read-only status for the new per-user deposit system
// (HD seed / KMS per-user addresses + auto-credit watcher). Powers the /admin
// "Deposits & Sweep" panel. No signing, no fund movement here.
//
//   GET → { addressesIssued, armed:{evm,btc,tron}, recentCredits, config }
//
// Auth: admin session (Authorization: Bearer <session token>).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { requireAdmin } from "@/lib/admin-auth";
import { isHdConfigured } from "@/lib/hd-deposit";
import { isTronConfigured } from "@/lib/tron-deposit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const WATCH_EVM = "deposit:watch:evm";
const WATCH_BTC = "deposit:watch:btc";
const WATCH_TRON = "deposit:watch:tron";

// Number of currently-armed (non-expired) addresses in a watch ZSET.
async function armedCount(r: any, key: string): Promise<number> {
  try {
    const n = await r.zcount(key, Date.now(), "+inf");
    return Number(n) || 0;
  } catch {
    return 0;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  const r = getRedis();

  let addressesIssued = 0;
  try {
    addressesIssued = Number((await r.get("deposit:hd:counter")) || 0) || 0;
  } catch {}

  const [evm, btc, tron] = await Promise.all([
    armedCount(r, WATCH_EVM),
    armedCount(r, WATCH_BTC),
    armedCount(r, WATCH_TRON),
  ]);

  let recentCredits: any[] = [];
  try {
    const raw = (await r.lrange("deposit:credits:recent", 0, 49)) as any[];
    recentCredits = raw.map((d) => (typeof d === "string" ? JSON.parse(d) : d));
  } catch {}

  return NextResponse.json({
    success: true,
    addressesIssued,
    armed: { evm, btc, tron },
    recentCredits,
    config: {
      hdConfigured: isHdConfigured(),
      tronConfigured: isTronConfigured(),
      hotWalletEvm: (process.env.HOT_WALLET_ETH_ADDRESS || "").toLowerCase() || null,
      hotWalletTron: process.env.HOT_WALLET_TRON_ADDRESS || null,
      baseRpcConfigured: !!(process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL),
    },
  });
}
