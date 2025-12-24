import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const stakes = await redis.get(`stakes:${address.toLowerCase()}`);
    
    return NextResponse.json({
      success: true,
      stakes: stakes || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, metal, amount, duration } = body;

  if (!address || !metal || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const key = `stakes:${address.toLowerCase()}`;
    const existing = await redis.get(key) || [];
    const stakes = Array.isArray(existing) ? existing : [];
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (duration || 30));

    stakes.push({
      id: `STAKE_${Date.now()}`,
      metal,
      amount,
      duration: duration || 30,
      startDate: new Date().toISOString(),
      endDate: endDate.toISOString(),
      status: "active",
    });

    await redis.set(key, stakes);

    return NextResponse.json({ success: true, stakes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
