import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

// GET - Kullanıcı profilini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    
    // user:address:{address} -> userId
    const userId = await redis.get(`user:address:${normalizedAddress}`);
    
    if (!userId) {
      return NextResponse.json({
        success: true,
        profile: {
          email: "",
          phone: "",
          country: "",
          timezone: "Europe/Istanbul",
        },
        message: "User not registered"
      });
    }

    // user:{userId} hash'inden bilgileri al
    const userData = await redis.hgetall(`user:${userId}`);
    
    return NextResponse.json({
      success: true,
      profile: {
        email: userData?.email || "",
        phone: userData?.phone || "",
        country: userData?.country || "",
        timezone: userData?.timezone || "Europe/Istanbul",
        createdAt: userData?.createdAt || null,
      },
      userId,
    });
  } catch (error: any) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Kullanıcı profilini güncelle
export async function POST(request: NextRequest) {
  try {
    const { address, email, phone, country, timezone } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    
    // user:address:{address} -> userId
    let userId = await redis.get(`user:address:${normalizedAddress}`) as string;
    
    // Kullanıcı yoksa oluştur
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      await redis.set(`user:address:${normalizedAddress}`, userId);
      await redis.hset(`user:${userId}`, {
        id: userId,
        walletAddress: normalizedAddress,
        createdAt: new Date().toISOString(),
        status: "active",
      });
    }

    // Profil bilgilerini güncelle
    const updates: Record<string, string> = {};
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (country !== undefined) updates.country = country;
    if (timezone !== undefined) updates.timezone = timezone;

    if (Object.keys(updates).length > 0) {
      await redis.hset(`user:${userId}`, updates);
      
      // Email varsa email->userId mapping
      if (email) {
        await redis.set(`user:email:${email.toLowerCase()}`, userId);
      }
    }

    console.log(`✅ Profile updated for ${normalizedAddress}:`, updates);

    return NextResponse.json({
      success: true,
      message: "Profile updated",
      profile: updates,
    });
  } catch (error: any) {
    console.error("Profile POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
