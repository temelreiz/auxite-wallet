import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const allocations = await redis.get(`allocations:${address.toLowerCase()}`);
    
    return NextResponse.json({
      success: true,
      allocations: allocations || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { address, metal, grams, vaultId } = body;

  if (!address || !metal || !grams) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const redis = getRedis();
    const key = `allocations:${address.toLowerCase()}`;
    const existing = await redis.get(key) || [];
    const allocations = Array.isArray(existing) ? existing : [];
    
    allocations.push({
      id: `ALLOC_${Date.now()}`,
      metal,
      grams,
      vaultId: vaultId || "VAULT-001",
      createdAt: new Date().toISOString(),
    });

    await redis.set(key, allocations);

    return NextResponse.json({ success: true, allocations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
