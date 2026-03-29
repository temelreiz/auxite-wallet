import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// POST /api/push-token — Register Expo push token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, platform, deviceName } = body;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Get wallet address: try JWT first, fallback to body
    let walletAddress: string | null = null;

    const authHeader = req.headers.get("authorization");
    const jwtToken = authHeader?.replace("Bearer ", "");

    if (jwtToken) {
      try {
        const decoded: any = jwt.verify(jwtToken, JWT_SECRET);
        walletAddress = decoded?.walletAddress;
      } catch {
        // JWT invalid, try body
      }
    }

    // Fallback: accept walletAddress from body (for mobile where auth token may not be ready)
    if (!walletAddress && body.walletAddress) {
      walletAddress = body.walletAddress;
    }

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 });
    }

    // Store push token
    const tokenData = {
      token,
      platform: platform || "unknown",
      deviceName: deviceName || "Unknown",
      walletAddress,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const walletLower = walletAddress.toLowerCase();

    // Get existing tokens for this user
    const existingData = await redis.get(`push:mobile:${walletLower}`);
    // Upstash SDK auto-parses JSON, so existingData may already be an array
    let existingTokens: any[] = [];
    if (existingData) {
      if (typeof existingData === 'string') {
        try { existingTokens = JSON.parse(existingData); } catch { existingTokens = []; }
      } else if (Array.isArray(existingData)) {
        existingTokens = existingData;
      }
    }

    // Check if token already registered
    const tokenExists = existingTokens.some((t: { token: string }) => t.token === token);
    if (!tokenExists) {
      existingTokens.push({
        token,
        platform: platform || "unknown",
        deviceName: deviceName || "Unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Update existing token's timestamp
      const idx = existingTokens.findIndex((t: { token: string }) => t.token === token);
      if (idx >= 0) existingTokens[idx].updatedAt = new Date().toISOString();
    }

    // Save tokens for this wallet (format expo-push.ts expects)
    await redis.set(`push:mobile:${walletLower}`, JSON.stringify(existingTokens));

    // Add wallet to global users set (for broadcast)
    await redis.sadd("push:mobile:all_users", walletLower);

    console.log(`[Push Token] Registered: ${token.slice(0, 20)}... for ${walletAddress.slice(0, 10)}... (${platform}/${deviceName})`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Push Token] Error:", error?.message || error, error?.stack);
    return NextResponse.json({ error: "Internal error", detail: error?.message || String(error) }, { status: 500 });
  }
}

// DELETE /api/push-token — Remove push token on logout
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Get token data to find wallet
    const tokenDataStr = await redis.get(`push:token:${token}`);
    if (tokenDataStr) {
      const tokenData = typeof tokenDataStr === "string" ? JSON.parse(tokenDataStr) : tokenDataStr;
      const walletAddress = tokenData?.walletAddress;

      if (walletAddress) {
        const walletLower = walletAddress.toLowerCase();
        const existingData = await redis.get(`push:mobile:${walletLower}`);
        if (existingData) {
          const tokens = typeof existingData === 'string' ? JSON.parse(existingData) : Array.isArray(existingData) ? existingData : [];
          const filtered = tokens.filter((t: { token: string }) => t.token !== token);
          if (filtered.length > 0) {
            await redis.set(`push:mobile:${walletLower}`, JSON.stringify(filtered));
          } else {
            await redis.del(`push:mobile:${walletLower}`);
            await redis.srem("push:mobile:all_users", walletLower);
          }
        }
      }
    }

    console.log(`[Push Token] Removed: ${token.slice(0, 20)}...`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Push Token] Delete error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET /api/push-token — Get push token count (for admin)
export async function GET() {
  try {
    const members = await redis.smembers("push:mobile:all_users");
    const count = members?.length || 0;
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[Push Token] Count error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
