// src/app/api/admin/operations/route.ts
// Pending Operations API - Manuel backend operasyonları takibi

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin wallet kontrolü
const ADMIN_WALLETS = [
  "0x101bd08219773e0ff8cd3805542c0a2835fec0ff",
  "0x7bb286a8e09d83daa24c449aaec9bf3bbdb20378",
].map((w) => w.toLowerCase());

function isAdmin(address: string | null): boolean {
  if (!address) return false;
  return ADMIN_WALLETS.includes(address.toLowerCase());
}

interface PendingOperation {
  id: string;
  type: "metal_buy";
  userAddress: string;
  metal: string;
  amount: number;
  usdValue: number;
  txHash?: string;
  certificateNumber?: string;
  status: "pending" | "processing" | "completed";
  createdAt: string;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

// GET: Pending operations listele
export async function GET(req: NextRequest) {
  const adminAddress = req.headers.get("x-wallet-address");
  
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const status = req.nextUrl.searchParams.get("status") || "pending";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");

    // Redis'ten operations çek
    const opsKey = `admin:operations:${status}`;
    const operations = await redis.lrange(opsKey, 0, limit - 1);
    
    const parsed = operations.map((op) => {
      if (typeof op === "string") {
        return JSON.parse(op);
      }
      return op;
    });

    // Stats
    const pendingCount = await redis.llen("admin:operations:pending");
    const processingCount = await redis.llen("admin:operations:processing");
    const completedToday = await redis.get("admin:operations:completed_today") || 0;

    return NextResponse.json({
      success: true,
      operations: parsed,
      stats: {
        pending: pendingCount,
        processing: processingCount,
        completedToday: Number(completedToday),
      },
    });
  } catch (error: any) {
    console.error("Get operations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Yeni operation ekle (trade API'den çağrılır)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, userAddress, metal, amount, usdValue, txHash, certificateNumber } = body;

    const operation: PendingOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type || "metal_buy",
      userAddress,
      metal,
      amount,
      usdValue,
      txHash,
      certificateNumber,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // Redis'e ekle
    await redis.lpush("admin:operations:pending", JSON.stringify(operation));

    return NextResponse.json({ success: true, operation });
  } catch (error: any) {
    console.error("Create operation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Operation durumunu güncelle
export async function PATCH(req: NextRequest) {
  const adminAddress = req.headers.get("x-wallet-address");
  
  if (!isAdmin(adminAddress)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { operationId, status, notes } = body;

    if (!operationId || !status) {
      return NextResponse.json({ error: "operationId and status required" }, { status: 400 });
    }

    // Pending listesinden bul ve çıkar
    const pendingOps = await redis.lrange("admin:operations:pending", 0, -1);
    let foundOp: PendingOperation | null = null;
    let foundIndex = -1;

    for (let i = 0; i < pendingOps.length; i++) {
      const op = typeof pendingOps[i] === "string" ? JSON.parse(pendingOps[i]) : pendingOps[i];
      if (op.id === operationId) {
        foundOp = op;
        foundIndex = i;
        break;
      }
    }

    if (!foundOp) {
      // Processing listesinde ara
      const processingOps = await redis.lrange("admin:operations:processing", 0, -1);
      for (let i = 0; i < processingOps.length; i++) {
        const op = typeof processingOps[i] === "string" ? JSON.parse(processingOps[i]) : processingOps[i];
        if (op.id === operationId) {
          foundOp = op;
          foundIndex = i;
          // Processing'den sil
          await redis.lrem("admin:operations:processing", 1, JSON.stringify(op));
          break;
        }
      }
    } else {
      // Pending'den sil
      await redis.lrem("admin:operations:pending", 1, JSON.stringify(foundOp));
    }

    if (!foundOp) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    // Güncelle
    foundOp.status = status;
    foundOp.notes = notes || foundOp.notes;
    
    if (status === "completed") {
      foundOp.completedAt = new Date().toISOString();
      foundOp.completedBy = adminAddress || undefined;
      
      // Completed listesine ekle
      await redis.lpush("admin:operations:completed", JSON.stringify(foundOp));
      
      // Günlük sayaç artır
      const today = new Date().toISOString().split("T")[0];
      await redis.incr(`admin:operations:completed:${today}`);
      await redis.incr("admin:operations:completed_today");
      await redis.expire("admin:operations:completed_today", 86400); // 24 saat
    } else if (status === "processing") {
      // Processing listesine ekle
      await redis.lpush("admin:operations:processing", JSON.stringify(foundOp));
    }

    return NextResponse.json({ success: true, operation: foundOp });
  } catch (error: any) {
    console.error("Update operation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
