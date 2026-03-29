import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_VERIFY_SID = "VA08d05fab6141b55c1be51bf41743b330";

// POST /api/verify/check — Verify SMS code and save phone
export async function POST(req: NextRequest) {
  try {
    const { phone, code, walletAddress } = await req.json();

    if (!phone || !code || !walletAddress) {
      return NextResponse.json({ error: "Phone, code, and wallet address required" }, { status: 400 });
    }

    const url = `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SID}/VerificationCheck`;

    const params = new URLSearchParams();
    params.append("To", phone);
    params.append("Code", code);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();

    if (!res.ok || data.status !== "approved") {
      console.error("[Verify] Check failed:", data);
      return NextResponse.json({ error: "Invalid or expired code", status: data.status }, { status: 400 });
    }

    // Code verified — save phone to user profile
    const normalizedAddress = walletAddress.toLowerCase();
    const userId = await redis.get(`user:address:${normalizedAddress}`) as string;

    if (userId) {
      await redis.hset(`user:${userId}`, {
        phone,
        phoneVerified: "true",
        phoneVerifiedAt: new Date().toISOString(),
      });
      console.log(`[Verify] Phone verified and saved for ${normalizedAddress}: ${phone}`);
    }

    return NextResponse.json({ success: true, verified: true });
  } catch (error: any) {
    console.error("[Verify] Check error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
