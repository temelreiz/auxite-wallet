import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// POST /api/account/delete — permanently delete the signed-in user's account.
// Guideline 5.1.1(v): in-app account deletion. Removes the account and personal
// data; a minimal audit tombstone is retained only as required for AML/legal
// compliance (permitted by Apple's account-deletion guidance).
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const email = String(decoded?.email || "").toLowerCase().trim();
    const walletAddress = String(decoded?.walletAddress || "").toLowerCase().trim();
    const userId = String(decoded?.userId || "");

    if (!email && !walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userKey = `auth:user:${email}`;
    const user = (await redis.hgetall(userKey)) as Record<string, any> | null;
    if (!user || Object.keys(user).length === 0) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Minimal audit tombstone — retained for legal/AML compliance only.
    await redis.set(
      `account:deleted:${userId || email}`,
      JSON.stringify({
        email,
        walletAddress,
        userId,
        deletedAt: new Date().toISOString(),
      }),
      { ex: 60 * 60 * 24 * 365 * 5 }, // 5 years
    );

    // Purge the account + personal-data records.
    const keys = [
      userKey,
      walletAddress ? `auth:user:${walletAddress}` : null,
      walletAddress ? `kyc:${walletAddress}` : null,
      `auth:user:${email}.pendingPromo`,
    ].filter(Boolean) as string[];

    if (keys.length) {
      await redis.del(...keys);
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Account deletion failed" },
      { status: 500 },
    );
  }
}
