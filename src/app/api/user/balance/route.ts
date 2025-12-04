import { NextRequest, NextResponse } from "next/server";
import { getUserBalance, setBalance, incrementBalance, addBonusAuxm, ensureUser } from "@/lib/redis";

const USE_MOCK = !process.env.UPSTASH_REDIS_REST_URL;

const MOCK_BALANCE = {
  auxm: 1250.5, bonusAuxm: 25, totalAuxm: 1275.5, bonusExpiresAt: "2025-03-01T00:00:00Z",
  auxg: 15.75, auxs: 500, auxpt: 2.5, auxpd: 1.25, eth: 0.5, btc: 0.01, xrp: 100, sol: 2.5,
};

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

  await ensureUser(address);
  const balance = USE_MOCK ? MOCK_BALANCE : await getUserBalance(address);

  return NextResponse.json({
    success: true,
    address: address.toLowerCase(),
    balances: balance,
    summary: {
      totalAuxm: balance.totalAuxm,
      withdrawableAuxm: balance.auxm,
      lockedBonusAuxm: balance.bonusAuxm,
      bonusStatus: balance.bonusAuxm > 0 ? { amount: balance.bonusAuxm, expiresAt: balance.bonusExpiresAt } : null,
      metals: { auxg: balance.auxg, auxs: balance.auxs, auxpt: balance.auxpt, auxpd: balance.auxpd },
      crypto: { eth: balance.eth, btc: balance.btc, xrp: balance.xrp, sol: balance.sol, usdt: balance.usdt },
      totalValueUsd: balance.totalAuxm,
    },
    timestamp: Date.now(),
    source: USE_MOCK ? "mock" : "redis",
  });
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const envKey = process.env.INTERNAL_API_KEY;
  
  // DEBUG - terminal'de göreceksin
  console.log("=== DEBUG ===");
  console.log("Received API Key:", apiKey);
  console.log("Expected API Key:", envKey);
  console.log("Match:", apiKey === envKey);
  
  if (apiKey !== envKey) {
    return NextResponse.json({ 
      error: "Unauthorized",
      debug: { received: apiKey, expected: envKey ? "[SET]" : "[NOT SET]" }
    }, { status: 401 });
  }

  const { address, updates, operation = "increment" } = await request.json();
  if (!address || !updates) {
    return NextResponse.json({ error: "Missing address or updates" }, { status: 400 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ success: true, message: "[MOCK] Updated", source: "mock" });
  }

  const success = operation === "set" 
    ? await setBalance(address, updates)
    : await incrementBalance(address, updates);

  const newBalance = await getUserBalance(address);
  return NextResponse.json({ success, newBalance, source: "redis" });
}

export async function PUT(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address, amount, expiresInDays = 30 } = await request.json();
  if (!address || !amount) {
    return NextResponse.json({ error: "Missing address or amount" }, { status: 400 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ success: true, message: "[MOCK] Bonus added", source: "mock" });
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await addBonusAuxm(address, amount, expiresAt);
  const newBalance = await getUserBalance(address);

  return NextResponse.json({ success: true, newBalance, expiresAt: expiresAt.toISOString(), source: "redis" });
}
