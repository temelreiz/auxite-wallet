/**
 * Sumsub Access Token API
 * Frontend SDK için access token oluşturur
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createApplicant, createAccessToken, getApplicantByExternalId } from '@/lib/sumsub';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { email, phone } = body;

    const externalUserId = walletAddress.toLowerCase();

    // Mevcut applicant var mı kontrol et
    let applicant = await getApplicantByExternalId(externalUserId);

    // Yoksa oluştur
    if (!applicant) {
      applicant = await createApplicant(externalUserId, email, phone);
      
      // Redis'e kaydet
      const kycData = await redis.get('kyc:' + externalUserId);
      const kyc = kycData 
        ? (typeof kycData === 'string' ? JSON.parse(kycData) : kycData)
        : {
            walletAddress: externalUserId,
            level: 'none',
            status: 'pending',
            limits: { dailyWithdraw: 100, monthlyWithdraw: 500, singleTransaction: 50 },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
      
      kyc.sumsubApplicantId = applicant.id;
      kyc.updatedAt = new Date().toISOString();
      await redis.set('kyc:' + externalUserId, JSON.stringify(kyc));
    }

    // Access token oluştur
    const accessToken = await createAccessToken(externalUserId);

    return NextResponse.json({
      success: true,
      accessToken,
      applicantId: applicant.id,
    });

  } catch (error: any) {
    console.error('Sumsub token error:', error);
    return NextResponse.json({ error: error.message || 'Token oluşturulamadı' }, { status: 500 });
  }
}
