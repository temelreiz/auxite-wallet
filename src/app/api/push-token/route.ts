import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// POST /api/push-token — Register Expo push token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, platform, deviceName } = body;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Get wallet address from auth header or session
    const authHeader = req.headers.get("authorization");
    const sessionToken = authHeader?.replace("Bearer ", "");

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up wallet from session
    const sessionData = await redis.get(`session:${sessionToken}`);
    const session = typeof sessionData === "string" ? JSON.parse(sessionData) : sessionData;
    const walletAddress = session?.walletAddress || session?.address;

    if (!walletAddress) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
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
    const existingData = await redis.get(`push:mobile:${walletLower}`) as string | null;
    const existingTokens = existingData ? JSON.parse(existingData) : [];

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
  } catch (error) {
    console.error("[Push Token] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
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
        const existingData = await redis.get(`push:mobile:${walletLower}`) as string | null;
        if (existingData) {
          const tokens = JSON.parse(existingData);
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
    const count = await redis.scard("push:mobile:all_users");
    return NextResponse.json({ count });
  } catch (error) {
    console.error("[Push Token] Count error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
