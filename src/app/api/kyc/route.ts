/**
 * KYC API
 * GET: KYC durumunu al
 * POST: KYC başvurusu yap
 * PATCH: KYC bilgilerini güncelle
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  createDefaultKYCData,
  KYC_LIMITS,
  calculateCompletionPercentage,
  isAdult,
  type KYCData,
  type KYCLevel,
} from '@/lib/kyc';

// GET: KYC durumunu al
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const kycData = await redis.get(`kyc:${walletAddress}`);
    const kyc: KYCData = kycData 
      ? (typeof kycData === 'string' ? JSON.parse(kycData) : kycData)
      : createDefaultKYCData(walletAddress);

    // Hassas bilgileri maskele
    const safeKyc = {
      ...kyc,
      personalInfo: kyc.personalInfo ? {
        ...kyc.personalInfo,
        dateOfBirth: kyc.personalInfo.dateOfBirth ? '****-**-**' : undefined,
      } : undefined,
      documents: kyc.documents ? {
        ...kyc.documents,
        documentNumber: kyc.documents.documentNumber 
          ? '****' + kyc.documents.documentNumber.slice(-4) 
          : undefined,
      } : undefined,
    };

    return NextResponse.json({
      kyc: safeKyc,
      limits: kyc.limits,
      completion: {
        basic: calculateCompletionPercentage(kyc, 'basic'),
        verified: calculateCompletionPercentage(kyc, 'verified'),
        enhanced: calculateCompletionPercentage(kyc, 'enhanced'),
      },
    });

  } catch (error) {
    console.error('KYC GET error:', error);
    return NextResponse.json({ error: 'KYC bilgileri alınamadı' }, { status: 500 });
  }
}

// POST: KYC başvurusu
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { step, data } = body;

    // Mevcut KYC verisini al
    const existingData = await redis.get(`kyc:${walletAddress}`);
    let kyc: KYCData = existingData 
      ? (typeof existingData === 'string' ? JSON.parse(existingData) : existingData)
      : createDefaultKYCData(walletAddress);

    switch (step) {
      case 'basic':
        // Email ve telefon doğrulama
        if (!data.email || !data.phone) {
          return NextResponse.json({ error: 'Email ve telefon gerekli' }, { status: 400 });
        }
        
        kyc.personalInfo = {
          ...kyc.personalInfo,
          email: data.email,
          phone: data.phone,
          firstName: kyc.personalInfo?.firstName || '',
          lastName: kyc.personalInfo?.lastName || '',
          dateOfBirth: kyc.personalInfo?.dateOfBirth || '',
          nationality: kyc.personalInfo?.nationality || '',
        };
        
        if (kyc.level === 'none') {
          kyc.level = 'basic';
          kyc.limits = KYC_LIMITS.basic;
        }
        break;

      case 'personal':
        // Kişisel bilgiler
        if (!data.firstName || !data.lastName || !data.dateOfBirth || !data.nationality) {
          return NextResponse.json({ error: 'Tüm kişisel bilgiler gerekli' }, { status: 400 });
        }

        // Yaş kontrolü
        if (!isAdult(data.dateOfBirth)) {
          return NextResponse.json({ error: '18 yaşından küçükler kayıt olamaz' }, { status: 400 });
        }

        kyc.personalInfo = {
          ...kyc.personalInfo,
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth,
          nationality: data.nationality,
          email: kyc.personalInfo?.email || '',
          phone: kyc.personalInfo?.phone || '',
        };
        break;

      case 'address':
        // Adres bilgileri
        if (!data.street || !data.city || !data.postalCode || !data.country) {
          return NextResponse.json({ error: 'Adres bilgileri eksik' }, { status: 400 });
        }

        kyc.address = {
          street: data.street,
          city: data.city,
          state: data.state,
          postalCode: data.postalCode,
          country: data.country,
        };
        break;

      case 'document':
        // Kimlik belgesi
        if (!data.type || !data.frontImageId) {
          return NextResponse.json({ error: 'Belge tipi ve ön yüz fotoğrafı gerekli' }, { status: 400 });
        }

        kyc.documents = {
          type: data.type,
          documentNumber: data.documentNumber,
          expiryDate: data.expiryDate,
          frontImageId: data.frontImageId,
          backImageId: data.backImageId,
          selfieImageId: data.selfieImageId,
          uploadedAt: new Date().toISOString(),
        };
        break;

      case 'submit':
        // Doğrulama için gönder
        if (kyc.status === 'pending' || kyc.status === 'under_review') {
          return NextResponse.json({ error: 'Zaten bekleyen bir başvuru var' }, { status: 400 });
        }

        kyc.status = 'pending';
        kyc.verification = {
          submittedAt: new Date().toISOString(),
        };
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz adım' }, { status: 400 });
    }

    kyc.updatedAt = new Date().toISOString();
    await redis.set(`kyc:${walletAddress}`, JSON.stringify(kyc));

    return NextResponse.json({
      success: true,
      message: 'KYC bilgileri güncellendi',
      level: kyc.level,
      status: kyc.status,
    });

  } catch (error) {
    console.error('KYC POST error:', error);
    return NextResponse.json({ error: 'KYC başvurusu başarısız' }, { status: 500 });
  }
}

// PATCH: Admin tarafından onay/red
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    const adminKey = request.headers.get('x-admin-key');

    // Admin kontrolü (basit örnek)
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 });
    }

    const body = await request.json();
    const { targetWallet, action, level, rejectionReason } = body;

    if (!targetWallet || !action) {
      return NextResponse.json({ error: 'targetWallet ve action gerekli' }, { status: 400 });
    }

    const kycData = await redis.get(`kyc:${targetWallet}`);
    if (!kycData) {
      return NextResponse.json({ error: 'KYC verisi bulunamadı' }, { status: 404 });
    }

    let kyc: KYCData = typeof kycData === 'string' ? JSON.parse(kycData) : kycData;

    switch (action) {
      case 'approve':
        const newLevel = (level || 'verified') as KYCLevel;
        kyc.status = 'approved';
        kyc.level = newLevel;
        kyc.limits = KYC_LIMITS[newLevel];
        kyc.verification = {
          ...kyc.verification,
          submittedAt: kyc.verification?.submittedAt || new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          reviewedBy: walletAddress || 'admin',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 yıl
        };
        if (kyc.documents) {
          kyc.documents.verifiedAt = new Date().toISOString();
        }
        break;

      case 'reject':
        kyc.status = 'rejected';
        kyc.verification = {
          ...kyc.verification,
          submittedAt: kyc.verification?.submittedAt || new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          reviewedBy: walletAddress || 'admin',
          rejectionReason: rejectionReason || 'Belgeler doğrulanamadı',
        };
        break;

      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 });
    }

    kyc.updatedAt = new Date().toISOString();
    await redis.set(`kyc:${targetWallet}`, JSON.stringify(kyc));

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'KYC onaylandı' : 'KYC reddedildi',
      kyc,
    });

  } catch (error) {
    console.error('KYC PATCH error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
