/**
 * Sumsub Webhook Handler
 * Sumsub'dan gelen doğrulama sonuçlarını işler
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyWebhookSignature, mapReviewStatusToLevel, mapReviewStatusToKYCStatus, getApplicantByExternalId } from '@/lib/sumsub';

const KYC_LIMITS = {
  none: { dailyWithdraw: 100, monthlyWithdraw: 500, singleTransaction: 50 },
  basic: { dailyWithdraw: 1000, monthlyWithdraw: 5000, singleTransaction: 500 },
  verified: { dailyWithdraw: 10000, monthlyWithdraw: 50000, singleTransaction: 5000 },
  enhanced: { dailyWithdraw: 100000, monthlyWithdraw: 500000, singleTransaction: 50000 },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-payload-digest') || '';

    // İmza doğrulama (production'da aktif et)
    if (process.env.NODE_ENV === 'production') {
      if (!verifyWebhookSignature(body, signature)) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    console.log('Sumsub webhook received:', payload.type, payload.externalUserId);

    const { type, externalUserId, reviewResult, reviewStatus, applicantId } = payload;

    if (!externalUserId) {
      return NextResponse.json({ error: 'Missing externalUserId' }, { status: 400 });
    }

    // KYC verisini al
    const kycKey = 'kyc:' + externalUserId.toLowerCase();
    const kycData = await redis.get(kycKey);
    
    if (!kycData) {
      console.error('KYC data not found for:', externalUserId);
      return NextResponse.json({ error: 'KYC not found' }, { status: 404 });
    }

    const kyc = typeof kycData === 'string' ? JSON.parse(kycData) : kycData;

    // Webhook tipine göre işle
    switch (type) {
      case 'applicantReviewed':
      case 'applicantPending':
        const newStatus = mapReviewStatusToKYCStatus(reviewStatus, reviewResult);
        const newLevel = mapReviewStatusToLevel(reviewResult);

        kyc.status = newStatus;
        kyc.level = newLevel;
        kyc.limits = KYC_LIMITS[newLevel];
        kyc.updatedAt = new Date().toISOString();

        if (reviewResult) {
          kyc.verification = {
            ...kyc.verification,
            reviewedAt: new Date().toISOString(),
            reviewAnswer: reviewResult.reviewAnswer,
            rejectLabels: reviewResult.rejectLabels,
            reviewRejectType: reviewResult.reviewRejectType,
          };

          if (reviewResult.reviewAnswer === 'RED' && reviewResult.rejectLabels) {
            kyc.verification.rejectionReason = reviewResult.rejectLabels.join(', ');
          }
        }

        console.log('KYC updated:', externalUserId, 'status:', newStatus, 'level:', newLevel);

        // ═══════════════════════════════════════════════════════════
        // KYC ONAYLAND → Sumsub'dan identity bilgilerini çek ve user profile'a yaz
        // ═══════════════════════════════════════════════════════════
        if (reviewResult?.reviewAnswer === 'GREEN') {
          try {
            const applicant = await getApplicantByExternalId(externalUserId);
            if (applicant?.info) {
              const info = applicant.info;
              const firstName = (info.firstNameEn || info.firstName || '').trim();
              const lastName = (info.lastNameEn || info.lastName || '').trim();
              const country = info.country || info.nationality || '';
              const dob = info.dob || '';

              // KYC kaydına identity bilgilerini ekle
              const email = info.email || '';
              const phone = info.phone || '';

              kyc.personalInfo = {
                ...kyc.personalInfo,
                firstName,
                lastName,
                country,
                dateOfBirth: dob,
                nationality: info.nationality || '',
                email,
                phone,
                verifiedAt: new Date().toISOString(),
                verificationSource: 'sumsub',
              };

              // User profile'ı güncelle (user:{userId} hash)
              const normalizedAddress = externalUserId.toLowerCase();
              const userId = await redis.get(`user:address:${normalizedAddress}`);

              if (userId) {
                const fullName = `${firstName} ${lastName}`.trim();
                const userUpdates: Record<string, string> = {
                  name: fullName,
                  firstName,
                  lastName,
                  country,
                  kycVerified: 'true',
                  kycVerifiedAt: new Date().toISOString(),
                };

                // Email'i Sumsub'dan gelen ile güncelle (eğer varsa ve mevcut değilse)
                const existingUserData = await redis.hgetall(`user:${userId}`) as Record<string, string> | null;
                if (email && (!existingUserData?.email || existingUserData.email === '')) {
                  userUpdates.email = email;
                }
                // Phone'u Sumsub'dan gelen ile güncelle (eğer varsa ve mevcut değilse)
                if (phone && (!existingUserData?.phone || existingUserData.phone === '')) {
                  userUpdates.phone = phone;
                }

                await redis.hset(`user:${userId}`, userUpdates);

                // auth:user:{email} hash'ini de güncelle
                const authEmail = existingUserData?.email || email;
                if (authEmail) {
                  const authUpdates: Record<string, string> = {
                    name: fullName,
                    kycVerified: 'true',
                  };
                  if (phone && (!existingUserData?.phone || existingUserData.phone === '')) {
                    authUpdates.phone = phone;
                  }
                  await redis.hset(`auth:user:${authEmail.toLowerCase()}`, authUpdates);
                }

                console.log(`✅ KYC identity synced for ${userId}: ${fullName}, country: ${country}, email: ${email ? '✓' : '—'}, phone: ${phone ? '✓' : '—'}`);
              } else {
                console.warn(`⚠️ User address mapping not found for ${normalizedAddress}`);
              }
            }
          } catch (identityErr: any) {
            // Non-fatal: KYC status zaten güncellendi, identity bonus data
            console.error('Failed to sync KYC identity data:', identityErr.message);
          }
        }

        break;

      case 'applicantCreated':
        kyc.sumsubApplicantId = applicantId;
        kyc.status = 'pending';
        kyc.updatedAt = new Date().toISOString();
        break;

      case 'applicantOnHold':
        kyc.status = 'under_review';
        kyc.updatedAt = new Date().toISOString();
        break;

      default:
        console.log('Unhandled webhook type:', type);
    }

    await redis.set(kycKey, JSON.stringify(kyc));

    // Push notification gönder (opsiyonel)
    if (type === 'applicantReviewed' && reviewResult) {
      const isApproved = reviewResult.reviewAnswer === 'GREEN';
      try {
        await fetch(process.env.NEXT_PUBLIC_BASE_URL + '/api/notifications/send', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': process.env.INTERNAL_API_KEY || '',
          },
          body: JSON.stringify({
            walletAddress: externalUserId,
            title: isApproved ? 'KYC Onaylandı!' : 'KYC Reddedildi',
            body: isApproved 
              ? 'Kimlik doğrulamanız başarıyla tamamlandı.' 
              : 'Kimlik doğrulamanız reddedildi. Lütfen tekrar deneyin.',
            type: 'kyc_result',
          }),
        });
      } catch (err) {
        console.error('Failed to send KYC notification:', err);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Sumsub webhook GET ile test eder
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Sumsub webhook endpoint' });
}
