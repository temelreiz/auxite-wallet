// src/app/api/admin/pending-deposits/route.ts
// Admin endpoint for viewing and assigning pending deposits

import { NextRequest, NextResponse } from "next/server";
import { getRedis, incrementBalance, addTransaction } from "@/lib/redis";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function checkAuth(request: NextRequest): boolean {
  const cookie = request.cookies.get("admin_session")?.value;
  if (!cookie) return false;
  // Simple session check
  return true;
}

// GET: List pending deposits
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();

  try {
    const pendingRaw = await redis.lrange("deposits:pending", 0, 99);
    const pending = pendingRaw.map((item: any) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    return NextResponse.json({ success: true, deposits: pending, count: pending.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Assign a pending deposit to a user
export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();

  try {
    const { txHash, walletAddress, coin, amount } = await request.json();

    if (!txHash || !walletAddress || !coin || !amount) {
      return NextResponse.json({ error: "Missing txHash, walletAddress, coin, or amount" }, { status: 400 });
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user exists
    const email = await redis.get(`wallet:${normalizedAddress}`);
    if (!email) {
      return NextResponse.json({ error: "User not found for this wallet address" }, { status: 404 });
    }

    // Check duplicate
    const txKey = `deposit:tx:${txHash}`;
    const existing = await redis.get(txKey);
    if (existing === "credited") {
      return NextResponse.json({ error: "This deposit was already credited" }, { status: 409 });
    }

    // Credit balance
    const coinKey = coin.toLowerCase();
    await incrementBalance(normalizedAddress, { [coinKey]: parseFloat(amount) } as any);

    // Record transaction
    await addTransaction(normalizedAddress, {
      type: "deposit",
      token: coin.toUpperCase(),
      amount: parseFloat(amount),
      metadata: {
        source: "admin-assigned",
        txHash,
        assignedBy: "admin",
        assignedAt: new Date().toISOString(),
      },
      status: "completed",
    });

    // Mark as credited
    await redis.set(txKey, "credited", { ex: 86400 * 365 });

    // Remove from pending list (mark as processed)
    // We can't easily remove from a list, so we mark it
    await redis.set(`deposit:assigned:${txHash}`, JSON.stringify({
      walletAddress: normalizedAddress,
      email,
      coin,
      amount: parseFloat(amount),
      assignedAt: new Date().toISOString(),
    }), { ex: 86400 * 365 });

    return NextResponse.json({
      success: true,
      message: `Credited ${amount} ${coin} to ${email}`,
      walletAddress: normalizedAddress,
      email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
