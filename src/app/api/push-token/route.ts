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
      // Anonymous device — downloaded/exploring but not signed up yet. Store
      // so we can send onboarding re-engagement push (gets linked to a wallet
      // once the user signs up and re-registers with the same token).
      await redis.sadd("push:anon:tokens", token);
      await redis.set(
        `push:anon:meta:${token}`,
        JSON.stringify({
          token,
          platform: platform || "unknown",
          deviceName: deviceName || "Unknown",
          registeredAt: new Date().toISOString(),
        }),
      );
      console.log(`[Push Token] Registered ANON: ${token.slice(0, 20)}... (${platform}/${deviceName})`);
      return NextResponse.json({ success: true, anon: true });
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

    // Reinstall-aware token registration:
    // A new Expo token is generated on every app reinstall, but the old
    // token in Redis stays "valid" from Expo's perspective for days until
    // DeviceNotRegistered is returned. Result: backend fan-outs each push
    // to both tokens — and if both still route to the same device, the
    // user sees the notification twice.
    //
    // Strategy: when a new token comes in, drop any prior entries for the
    // same (platform, deviceName) before pushing the new one. The risk
    // (two different physical devices with identical model name and OS
    // belonging to the same user) is rare enough that a single dropped
    // delivery is an acceptable trade-off vs. the recurring duplicate.
    const incomingPlatform = (platform || "unknown").toLowerCase();
    const incomingDevice = (deviceName || "Unknown").toLowerCase();

    const tokenExistsIdx = existingTokens.findIndex(
      (t: { token: string }) => t.token === token,
    );

    if (tokenExistsIdx >= 0) {
      // Same token re-registering — just refresh timestamp.
      existingTokens[tokenExistsIdx].updatedAt = new Date().toISOString();
    } else {
      // Remove any stale tokens from the same (platform, deviceName) slot.
      const beforeCount = existingTokens.length;
      existingTokens = existingTokens.filter((t: { token: string; platform?: string; deviceName?: string }) => {
        const sameSlot =
          (t.platform || "").toLowerCase() === incomingPlatform &&
          (t.deviceName || "").toLowerCase() === incomingDevice;
        return !sameSlot;
      });
      if (existingTokens.length < beforeCount) {
        console.log(
          `[Push Token] Pruned ${beforeCount - existingTokens.length} stale token(s) for slot ${incomingPlatform}/${incomingDevice}`,
        );
      }
      existingTokens.push({
        token,
        platform: platform || "unknown",
        deviceName: deviceName || "Unknown",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Save tokens for this wallet (format expo-push.ts expects)
    await redis.set(`push:mobile:${walletLower}`, JSON.stringify(existingTokens));

    // Add wallet to global users set (for broadcast)
    await redis.sadd("push:mobile:all_users", walletLower);

    // This token now belongs to a known user — drop any anonymous entry for it
    // so we don't double-send (anon broadcast + per-user).
    await redis.srem("push:anon:tokens", token);
    await redis.del(`push:anon:meta:${token}`);

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
    const anonMembers = await redis.smembers("push:anon:tokens");
    return NextResponse.json({ count: members?.length || 0, anonCount: anonMembers?.length || 0 });
  } catch (error) {
    console.error("[Push Token] Count error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
