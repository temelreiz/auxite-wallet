// src/app/api/admin/deposit-monitor/route.ts
// Admin Deposit Monitor API — Scanner durumu, recent deposits, orphan yönetimi

import { NextRequest, NextResponse } from "next/server";
import { getRedis, incrementBalance, addTransaction } from "@/lib/redis";
import { calculateAuxmBonus } from "@/lib/auxm-bonus-service";

export const dynamic = "force-dynamic";

// Admin auth
const ADMIN_TOKEN = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET || "";

function isAdmin(request: NextRequest): boolean {
  const auth = request.headers.get("authorization")?.replace("Bearer ", "");
  return !!auth && auth === ADMIN_TOKEN;
}

/**
 * GET /api/admin/deposit-monitor
 * ?type=scanner  → Scanner durumu
 * ?type=recent   → Son deposit'ler
 * ?type=orphan   → Eşleşmeyen deposit'ler
 * ?type=stats    → İstatistikler
 */
export async function GET(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "scanner";

  const redis = getRedis();

  try {
    switch (type) {
      case "scanner": {
        // Scanner durumu + chain state'leri
        const status = await redis.hgetall("scanner:status");
        const enabled = await redis.get("scanner:config:enabled");

        const ethLastBlock = await redis.get("scanner:eth:lastBlock");
        const btcLastTxid = await redis.get("scanner:btc:lastTxid");
        const xrpLastLedger = await redis.get("scanner:xrp:lastLedger");
        const solLastSig = await redis.get("scanner:sol:lastSignature");

        return NextResponse.json({
          success: true,
          scanner: {
            enabled: enabled !== "false",
            ...status,
            errors: status?.errors ? JSON.parse(String(status.errors)) : [],
          },
          chains: {
            eth: { lastBlock: ethLastBlock || 0 },
            btc: { lastTxid: btcLastTxid || "" },
            xrp: { lastLedger: xrpLastLedger || 0 },
            sol: { lastSignature: solLastSig || "" },
          },
        });
      }

      case "recent": {
        // Son 50 deposit
        const limit = parseInt(searchParams.get("limit") || "50");
        const deposits = await redis.lrange("scanner:deposits:recent", 0, limit - 1);
        const parsed = deposits.map((d: any) => (typeof d === "string" ? JSON.parse(d) : d));

        return NextResponse.json({ success: true, deposits: parsed, total: parsed.length });
      }

      case "orphan": {
        // Eşleşmeyen deposit'ler
        const orphans = await redis.lrange("deposits:orphan", 0, 49);
        const parsed = orphans.map((d: any) => (typeof d === "string" ? JSON.parse(d) : d));

        return NextResponse.json({ success: true, orphans: parsed, total: parsed.length });
      }

      case "stats": {
        // Günlük istatistikler (son 7 gün)
        const stats: any[] = [];
        for (let i = 0; i < 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];
          const dayStats = await redis.hgetall(`scanner:deposits:stats:${dateStr}`);
          stats.push({
            date: dateStr,
            ...dayStats,
          });
        }

        return NextResponse.json({ success: true, stats });
      }

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin deposit monitor error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/deposit-monitor
 * action=toggle    → Scanner aç/kapat
 * action=reconcile → Orphan deposit'i kullanıcıya eşle
 * action=rescan    → Scanner state'i sıfırla (yeniden tara)
 */
export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;
  const redis = getRedis();

  try {
    switch (action) {
      case "toggle": {
        const current = await redis.get("scanner:config:enabled");
        const newState = current === "false" ? "true" : "false";
        await redis.set("scanner:config:enabled", newState);

        return NextResponse.json({
          success: true,
          enabled: newState === "true",
          message: newState === "true" ? "Scanner activated" : "Scanner paused",
        });
      }

      case "reconcile": {
        // Orphan deposit'i kullanıcıya eşle
        const { txHash, userAddress } = body;
        if (!txHash || !userAddress) {
          return NextResponse.json({ error: "txHash and userAddress required" }, { status: 400 });
        }

        // Orphan listesinden bul
        const orphans = await redis.lrange("deposits:orphan", 0, -1);
        let targetDeposit: any = null;
        let targetIndex = -1;

        for (let i = 0; i < orphans.length; i++) {
          const d = typeof orphans[i] === "string" ? JSON.parse(orphans[i] as string) : orphans[i];
          if (d.txHash === txHash) {
            targetDeposit = d;
            targetIndex = i;
            break;
          }
        }

        if (!targetDeposit) {
          return NextResponse.json({ error: "Orphan deposit not found" }, { status: 404 });
        }

        // Fiyat hesapla
        const priceMap: Record<string, number> = { ETH: 3500, BTC: 95000, XRP: 2.2, SOL: 200, USDT: 1 };
        const amountUsd = targetDeposit.amount * (priceMap[targetDeposit.coin] || 1);

        // AUXM kredile
        const bonus = calculateAuxmBonus(amountUsd);
        await incrementBalance(userAddress.toLowerCase(), {
          auxm: bonus.auxmAmount,
          bonusAuxm: bonus.bonusAmount > 0 ? bonus.bonusAmount : undefined,
        } as any);

        // Transaction kaydet
        await addTransaction(userAddress.toLowerCase(), {
          type: "deposit",
          token: targetDeposit.coin,
          amount: targetDeposit.amount,
          metadata: {
            source: "admin-reconcile",
            chain: targetDeposit.chain,
            txHash: targetDeposit.txHash,
            amountUsd,
            auxmReceived: bonus.auxmAmount,
            bonusReceived: bonus.bonusAmount,
          },
          status: "completed",
        });

        // Orphan'dan sil
        await redis.lrem("deposits:orphan", 1, orphans[targetIndex]);

        // Duplicate prevention
        await redis.set(
          `deposit:tx:${txHash}`,
          JSON.stringify({ ...targetDeposit, reconciledTo: userAddress, reconciledAt: new Date().toISOString() }),
          { ex: 86400 * 365 }
        );

        return NextResponse.json({
          success: true,
          message: `Deposit reconciled: ${bonus.auxmAmount} AUXM + ${bonus.bonusAmount} bonus → ${userAddress}`,
        });
      }

      case "rescan": {
        // Belirli chain'in scanner state'ini sıfırla
        const { chain } = body;
        const keyMap: Record<string, string> = {
          eth: "scanner:eth:lastBlock",
          btc: "scanner:btc:lastTxid",
          xrp: "scanner:xrp:lastLedger",
          sol: "scanner:sol:lastSignature",
        };

        if (chain && keyMap[chain]) {
          await redis.del(keyMap[chain]);
          return NextResponse.json({ success: true, message: `${chain} scanner state reset` });
        } else if (!chain) {
          // Tümünü sıfırla
          await Promise.all(Object.values(keyMap).map((k) => redis.del(k)));
          return NextResponse.json({ success: true, message: "All scanner states reset" });
        }

        return NextResponse.json({ error: "Invalid chain" }, { status: 400 });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Admin deposit monitor POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
