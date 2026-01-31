// Debug endpoint - Remove in production!
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  // Check all possible keys
  const walletAddressKey = await redis.get(`wallet:address:${address}`);
  const userAddressKey = await redis.get(`user:address:${address}`);

  let walletData = null;
  let userData = null;

  const userId = walletAddressKey || userAddressKey;

  if (userId) {
    walletData = await redis.hgetall(`user:${userId}:wallet`);
    userData = await redis.hgetall(`user:${userId}`);
  }

  return NextResponse.json({
    address,
    keys: {
      "wallet:address": walletAddressKey,
      "user:address": userAddressKey,
    },
    userId,
    walletData: walletData ? {
      address: walletData.address,
      type: walletData.type,
      hasEncryptedKey: !!walletData.encryptedPrivateKey,
      createdAt: walletData.createdAt,
    } : null,
    userData: userData ? {
      id: userData.id,
      walletAddress: userData.walletAddress,
      walletType: userData.walletType,
      createdAt: userData.createdAt,
    } : null,
    isCustodial: !!(walletData?.encryptedPrivateKey || userData?.walletType === 'custodial'),
  });
}
