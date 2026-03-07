/**
 * Sumsub Access Token API
 * Frontend SDK için access token oluşturur
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { createApplicant, createAccessToken, getApplicantByExternalId, getApplicantStatus, mapReviewStatusToLevel, mapReviewStatusToKYCStatus } from '@/lib/sumsub';

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
    }

    // KYC verisini al veya oluştur
    const KYC_LIMITS: Record<string, any> = {
      none: { dailyWithdraw: 100, monthlyWithdraw: 500, singleTransaction: 50 },
      basic: { dailyWithdraw: 1000, monthlyWithdraw: 5000, singleTransaction: 500 },
      verified: { dailyWithdraw: 10000, monthlyWithdraw: 50000, singleTransaction: 5000 },
      enhanced: { dailyWithdraw: 100000, monthlyWithdraw: 500000, singleTransaction: 50000 },
    };

    const kycData = await redis.get('kyc:' + externalUserId);
    const kyc = kycData
      ? (typeof kycData === 'string' ? JSON.parse(kycData) : kycData)
      : {
          walletAddress: externalUserId,
          level: 'none',
          status: 'pending',
          limits: KYC_LIMITS.none,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

    kyc.sumsubApplicantId = applicant.id;

    // Mevcut applicant varsa Sumsub'dan güncel durumu çek ve senkronize et
    if (applicant.id && !applicant.id.startsWith('test_')) {
      try {
        const status = await getApplicantStatus(applicant.id);
        if (status?.reviewStatus === 'completed' && status?.reviewResult) {
          const newLevel = mapReviewStatusToLevel(status.reviewResult);
          const newStatus = mapReviewStatusToKYCStatus(status.reviewStatus, status.reviewResult);
          kyc.level = newLevel;
          kyc.status = newStatus;
          kyc.limits = KYC_LIMITS[newLevel] || KYC_LIMITS.none;
          console.log('Synced KYC from Sumsub:', externalUserId, 'level:', newLevel, 'status:', newStatus);
        }
      } catch (syncErr) {
        console.error('Sumsub status sync error:', syncErr);
      }
    }

    kyc.updatedAt = new Date().toISOString();
    await redis.set('kyc:' + externalUserId, JSON.stringify(kyc));

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
