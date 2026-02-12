// app/api/security/whitelist/route.ts
// Withdrawal Whitelist - Güvenli çekim adresleri yönetimi

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { sendSecurityAlertEmail } from "@/lib/email";

const redis = Redis.fromEnv();

interface WhitelistAddress {
  id: string;
  address: string;
  label: string;
  network: "ETH" | "BTC" | "XRP" | "SOL";
  addedAt: number;
  verifiedAt?: number;
  isVerified: boolean;
}

// GET - Kullanıcının whitelist adreslerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");

    if (!walletAddress) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const key = `whitelist:${walletAddress.toLowerCase()}`;
    const addresses = await redis.lrange(key, 0, -1) as WhitelistAddress[];

    return NextResponse.json({
      addresses: addresses || [],
      count: addresses?.length || 0,
    });
  } catch (error: any) {
    console.error("Whitelist GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Yeni whitelist adresi ekle (24 saat bekleme süresi ile)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, withdrawAddress, label, network } = body;

    if (!walletAddress || !withdrawAddress || !network) {
      return NextResponse.json(
        { error: "walletAddress, withdrawAddress, and network required" },
        { status: 400 }
      );
    }

    // Adres formatı kontrolü
    const validNetworks = ["ETH", "BTC", "XRP", "SOL"];
    if (!validNetworks.includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be ETH, BTC, XRP, or SOL" },
        { status: 400 }
      );
    }

    const key = `whitelist:${walletAddress.toLowerCase()}`;
    
    // Mevcut adresleri kontrol et (duplicate önleme)
    const existing = await redis.lrange(key, 0, -1) as WhitelistAddress[];
    const duplicate = existing?.find(
      (a) => a.address.toLowerCase() === withdrawAddress.toLowerCase() && a.network === network
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "Address already in whitelist" },
        { status: 400 }
      );
    }

    // Max 10 adres limiti
    if (existing && existing.length >= 10) {
      return NextResponse.json(
        { error: "Maximum 10 whitelist addresses allowed" },
        { status: 400 }
      );
    }

    const newAddress: WhitelistAddress = {
      id: `WL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      address: withdrawAddress,
      label: label || `${network} Address`,
      network,
      addedAt: Date.now(),
      isVerified: false, // 24 saat sonra verified olacak
    };

    await redis.rpush(key, JSON.stringify(newAddress));

    // 24 saat sonra otomatik verify için scheduled task
    const verifyKey = `whitelist-verify:${newAddress.id}`;
    await redis.set(verifyKey, walletAddress.toLowerCase(), { ex: 86400 }); // 24 saat

    // Security Alert Email — Institutional hygiene
    const userDataKey = `user:${walletAddress.toLowerCase()}`;
    const userData = await redis.hgetall(userDataKey) as Record<string, string> | null;
    if (userData?.email) {
      const ipHeader = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      sendSecurityAlertEmail(userData.email, {
        clientName: userData.name || undefined,
        event: 'Withdrawal Address Whitelisted',
        asset: network,
        address: withdrawAddress,
        network,
        timestamp: new Date().toISOString().replace('T', ', ').replace(/\.\d+Z/, ' UTC'),
        ipAddress: ipHeader || undefined,
      }).catch((err: any) => console.error('Security alert email error:', err));
    }

    return NextResponse.json({
      success: true,
      address: newAddress,
      message: "Address added. Will be verified in 24 hours.",
      verificationTime: Date.now() + 86400000, // 24 saat sonra
    });
  } catch (error: any) {
    console.error("Whitelist POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Whitelist adresini sil
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, addressId } = body;

    if (!walletAddress || !addressId) {
      return NextResponse.json(
        { error: "walletAddress and addressId required" },
        { status: 400 }
      );
    }

    const key = `whitelist:${walletAddress.toLowerCase()}`;
    const addresses = await redis.lrange(key, 0, -1) as WhitelistAddress[];

    if (!addresses || addresses.length === 0) {
      return NextResponse.json({ error: "No addresses found" }, { status: 404 });
    }

    // Adresi bul ve sil
    const addressToRemove = addresses.find((a) => a.id === addressId);
    if (!addressToRemove) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Listeyi güncelle
    const updatedAddresses = addresses.filter((a) => a.id !== addressId);
    await redis.del(key);
    
    if (updatedAddresses.length > 0) {
      for (const addr of updatedAddresses) {
        await redis.rpush(key, JSON.stringify(addr));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Address removed from whitelist",
    });
  } catch (error: any) {
    console.error("Whitelist DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Whitelist adresini güncelle (verify veya label değiştir)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, addressId, label, verify } = body;

    if (!walletAddress || !addressId) {
      return NextResponse.json(
        { error: "walletAddress and addressId required" },
        { status: 400 }
      );
    }

    const key = `whitelist:${walletAddress.toLowerCase()}`;
    const addresses = await redis.lrange(key, 0, -1) as WhitelistAddress[];

    if (!addresses || addresses.length === 0) {
      return NextResponse.json({ error: "No addresses found" }, { status: 404 });
    }

    const addressIndex = addresses.findIndex((a) => a.id === addressId);
    if (addressIndex === -1) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Güncelle
    const updatedAddress = { ...addresses[addressIndex] };
    if (label) updatedAddress.label = label;
    if (verify) {
      updatedAddress.isVerified = true;
      updatedAddress.verifiedAt = Date.now();
    }

    addresses[addressIndex] = updatedAddress;

    // Redis'i güncelle
    await redis.del(key);
    for (const addr of addresses) {
      await redis.rpush(key, JSON.stringify(addr));
    }

    return NextResponse.json({
      success: true,
      address: updatedAddress,
    });
  } catch (error: any) {
    console.error("Whitelist PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
