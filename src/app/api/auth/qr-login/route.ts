// src/app/api/auth/qr-login/route.ts
// QR Code Login System - Web generates QR, Mobile scans and approves

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import * as crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// QR session expires in 5 minutes
const QR_SESSION_TTL = 300;

// Generate unique session ID
function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// GET - Generate new QR session or check status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const sessionId = searchParams.get("sessionId");

  // Check session status (polling from web)
  if (action === "status" && sessionId) {
    const sessionKey = `qr_login:${sessionId}`;
    const session = await redis.hgetall(sessionKey);

    if (!session || Object.keys(session).length === 0) {
      return NextResponse.json({ 
        status: "expired",
        message: "Session expired or not found" 
      });
    }

    return NextResponse.json({
      status: session.status,
      walletAddress: session.status === "approved" ? session.walletAddress : undefined,
      approvedAt: session.approvedAt,
    });
  }

  // Generate new QR session
  if (action === "generate") {
    const walletAddress = searchParams.get("walletAddress");
    const newSessionId = generateSessionId();
    const sessionKey = `qr_login:${newSessionId}`;
    const pairingCode = newSessionId.slice(0, 6).toUpperCase();

    await redis.hset(sessionKey, {
      status: "pending",
      createdAt: Date.now().toString(),
      walletAddress: walletAddress?.toLowerCase() || "",
    });
    await redis.expire(sessionKey, QR_SESSION_TTL);

    // QR code in auxite:// URI format for mobile parsing
    // Format: auxite://auth?session=xxx&code=xxx&address=xxx
    const qrData = walletAddress
      ? `auxite://auth?session=${newSessionId}&code=${pairingCode}&address=${walletAddress.toLowerCase()}`
      : JSON.stringify({
          type: "auxite_login",
          sessionId: newSessionId,
          code: pairingCode,
          expiresAt: Date.now() + (QR_SESSION_TTL * 1000),
        });

    return NextResponse.json({
      success: true,
      sessionId: newSessionId,
      pairingCode,
      qrData,
      expiresIn: QR_SESSION_TTL,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// POST - Mobile approves login
export async function POST(request: NextRequest) {
  try {
    const { sessionId, walletAddress, signature } = await request.json();

    if (!sessionId || !walletAddress) {
      return NextResponse.json({ 
        error: "Session ID and wallet address required" 
      }, { status: 400 });
    }

    const sessionKey = `qr_login:${sessionId}`;
    const session = await redis.hgetall(sessionKey);

    if (!session || Object.keys(session).length === 0) {
      return NextResponse.json({ 
        error: "Session expired or not found" 
      }, { status: 404 });
    }

    if (session.status !== "pending") {
      return NextResponse.json({ 
        error: "Session already used" 
      }, { status: 400 });
    }

    // Verify wallet exists
    const userKey = `user:${walletAddress.toLowerCase()}`;
    const userExists = await redis.exists(userKey);

    // Update session with approval
    await redis.hset(sessionKey, {
      status: "approved",
      walletAddress: walletAddress.toLowerCase(),
      approvedAt: Date.now().toString(),
    });

    // Extend TTL a bit for web to pick up
    await redis.expire(sessionKey, 60);

    // Log the login
    await redis.lpush(`user:${walletAddress.toLowerCase()}:security_logs`, JSON.stringify({
      action: "qr_login_approved",
      sessionId,
      timestamp: Date.now(),
      ip: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
    }));

    return NextResponse.json({
      success: true,
      message: "Login approved",
    });

  } catch (error: any) {
    console.error("QR login error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to process login" 
    }, { status: 500 });
  }
}

// DELETE - Cancel/reject session
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID required" }, { status: 400 });
  }

  const sessionKey = `qr_login:${sessionId}`;
  await redis.del(sessionKey);

  return NextResponse.json({ success: true, message: "Session cancelled" });
}
