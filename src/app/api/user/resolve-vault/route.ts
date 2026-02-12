// src/app/api/user/resolve-vault/route.ts
// Vault ID → Wallet Address resolution for internal transfers

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  try {
    const vaultId = new URL(request.url).searchParams.get("vaultId");

    if (!vaultId) {
      return NextResponse.json(
        { success: false, error: "vaultId parameter required" },
        { status: 400 }
      );
    }

    // Normalize vault ID format
    const normalizedVaultId = vaultId.toUpperCase().trim();

    // Lookup: vault:{vaultId} → userId
    const userId = await redis.get(`vault:${normalizedVaultId}`);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Vault not found" },
        { status: 404 }
      );
    }

    // Lookup: auth:user by scanning for the userId
    // We need to find the user's wallet address from their auth record
    // The userId is stored in auth:email:{email} → userId
    // And auth:user:{email} has walletAddress
    // But we don't have the email — we need another approach.

    // The user:address:{addr} → userId mapping exists.
    // We also have user:{userId} hash which might have data.
    // Let's try the direct user hash first:
    const userData = await redis.hgetall(`user:${userId}`);

    if (userData?.walletAddress) {
      return NextResponse.json({
        success: true,
        address: userData.walletAddress as string,
        vaultId: normalizedVaultId,
      });
    }

    // Fallback: scan auth:user records is not efficient.
    // Instead, reconstruct wallet address from userId (same deterministic method as registration):
    const crypto = await import("crypto");
    const addressHash = crypto.createHash("sha256").update(`auxite-wallet-${userId}`).digest("hex");
    const vaultAddress = "0x" + addressHash.substring(0, 40);

    return NextResponse.json({
      success: true,
      address: vaultAddress,
      vaultId: normalizedVaultId,
    });
  } catch (error: any) {
    console.error("Resolve vault error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to resolve vault" },
      { status: 500 }
    );
  }
}
