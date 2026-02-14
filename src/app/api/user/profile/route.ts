import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { getPhoneTiering } from "@/lib/phone-tiering";

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
    const userData = await redis.hgetall(`user:${userId}`) as Record<string, string> | null;

    // Eğer user:{userId} hash'ında email varsa, auth:user:{email} hash'ından da name/phone çek
    let authData: Record<string, string> | null = null;
    const email = userData?.email;
    if (email) {
      authData = await redis.hgetall(`auth:user:${email.toLowerCase()}`) as Record<string, string> | null;
    }

    // KYC verilerini al (identity bilgileri için)
    let kycIdentity: Record<string, any> = {};
    try {
      const kycData = await redis.get(`kyc:${normalizedAddress}`);
      if (kycData) {
        const kyc = typeof kycData === 'string' ? JSON.parse(kycData) : kycData;
        if (kyc.personalInfo) {
          kycIdentity = {
            firstName: kyc.personalInfo.firstName || '',
            lastName: kyc.personalInfo.lastName || '',
            dateOfBirth: kyc.personalInfo.dateOfBirth || '',
            nationality: kyc.personalInfo.nationality || '',
            verifiedAt: kyc.personalInfo.verifiedAt || null,
            verificationSource: kyc.personalInfo.verificationSource || null,
          };
        }
        kycIdentity.kycLevel = kyc.level || 'none';
        kycIdentity.kycStatus = kyc.status || 'not_started';
      }
    } catch (_) {}

    // Legal Name: KYC firstName+lastName > user hash name > auth name
    const kycFullName = [kycIdentity.firstName, kycIdentity.lastName].filter(Boolean).join(' ').trim();
    const fullName = kycFullName || userData?.name || authData?.name || '';

    // Phone tiering data
    let phoneTiering = { tier: 0, phoneVerified: false, communicationPreference: 'email' as string };
    try {
      const pt = await getPhoneTiering(normalizedAddress);
      phoneTiering = {
        tier: pt.tier,
        phoneVerified: pt.phoneVerified,
        communicationPreference: pt.communicationPreference,
      };
    } catch (_) {}

    return NextResponse.json({
      success: true,
      profile: {
        name: fullName,
        firstName: kycIdentity.firstName || userData?.firstName || '',
        lastName: kycIdentity.lastName || userData?.lastName || '',
        email: authData?.email || userData?.email || '',
        phone: authData?.phone || userData?.phone || '',
        country: kycIdentity.nationality || userData?.country || '',
        timezone: userData?.timezone || 'Europe/Istanbul',
        createdAt: authData?.createdAt || userData?.createdAt || null,
        // KYC Identity fields
        kycVerified: userData?.kycVerified === 'true' || authData?.kycVerified === 'true',
        kycVerifiedAt: userData?.kycVerifiedAt || null,
        kycLevel: kycIdentity.kycLevel || 'none',
        kycStatus: kycIdentity.kycStatus || 'not_started',
        dateOfBirth: kycIdentity.dateOfBirth || '',
        nationality: kycIdentity.nationality || '',
        verificationSource: kycIdentity.verificationSource || null,
        // Phone tiering
        phoneTier: phoneTiering.tier,
        phoneVerified: phoneTiering.phoneVerified,
        communicationPreference: phoneTiering.communicationPreference,
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
