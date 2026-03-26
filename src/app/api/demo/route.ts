import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const DEMO_INITIAL_BALANCE = {
  usdt: 10000,
  auxm: 0,
  auxg: 0,
  auxs: 0,
  auxpt: 0,
  auxpd: 0,
  eth: 0,
  btc: 0,
  usdc: 0,
};

// POST: Activate demo mode for a user
export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const demoActiveKey = `demo:${normalizedAddress}:active`;
    const demoBalanceKey = `demo:${normalizedAddress}:balance`;

    // Check if demo mode already active
    const isActive = await redis.get(demoActiveKey);
    if (isActive === "true" || isActive === true) {
      return NextResponse.json({ success: true, message: "Demo mode already active" });
    }

    // Set demo active flag (expires in 30 days)
    await redis.set(demoActiveKey, "true", { ex: 30 * 24 * 60 * 60 });

    // Set initial demo balance
    await redis.hset(demoBalanceKey, DEMO_INITIAL_BALANCE);
    await redis.expire(demoBalanceKey, 30 * 24 * 60 * 60);

    // Initialize empty transactions list
    const demoTxKey = `demo:${normalizedAddress}:transactions`;
    await redis.del(demoTxKey);

    console.log(`Demo mode activated for ${normalizedAddress}`);

    return NextResponse.json({
      success: true,
      message: "Demo mode activated",
      balance: DEMO_INITIAL_BALANCE,
    });
  } catch (error) {
    console.error("Demo activation error:", error);
    return NextResponse.json({ error: "Failed to activate demo mode" }, { status: 500 });
  }
}

// GET: Check demo status and balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const demoActiveKey = `demo:${normalizedAddress}:active`;
    const demoBalanceKey = `demo:${normalizedAddress}:balance`;

    const isActive = await redis.get(demoActiveKey);

    if (isActive !== "true") {
      return NextResponse.json({ active: false, balance: null });
    }

    const balance = await redis.hgetall(demoBalanceKey);

    // Parse balance values to numbers
    const parsedBalance: Record<string, number> = {};
    if (balance) {
      for (const [key, value] of Object.entries(balance)) {
        parsedBalance[key] = parseFloat(String(value)) || 0;
      }
    }

    return NextResponse.json({
      active: true,
      balance: parsedBalance,
    });
  } catch (error) {
    console.error("Demo status check error:", error);
    return NextResponse.json({ error: "Failed to check demo status" }, { status: 500 });
  }
}

// DELETE: Deactivate demo mode
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();

    // Clear all demo keys
    await redis.del(
      `demo:${normalizedAddress}:active`,
      `demo:${normalizedAddress}:balance`,
      `demo:${normalizedAddress}:transactions`
    );

    console.log(`Demo mode deactivated for ${normalizedAddress}`);

    return NextResponse.json({ success: true, message: "Demo mode deactivated" });
  } catch (error) {
    console.error("Demo deactivation error:", error);
    return NextResponse.json({ error: "Failed to deactivate demo mode" }, { status: 500 });
  }
}
