/**
 * 2FA Verify API
 * POST: TOTP kodunu doğrula
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyToken, verifyBackupCode } from '@/lib/security/totp';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { code, isBackupCode = false } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Doğrulama kodu gerekli' },
        { status: 400 }
      );
    }

    // 2FA bilgisini al
    const twoFAData = await redis.get(`user:2fa:${walletAddress}`);
    
    if (!twoFAData) {
      return NextResponse.json(
        { error: '2FA aktif değil' },
        { status: 400 }
      );
    }

    const data = typeof twoFAData === 'string' ? JSON.parse(twoFAData) : twoFAData as any;

    if (!data.enabled) {
      return NextResponse.json(
        { error: '2FA aktif değil' },
        { status: 400 }
      );
    }

    let isValid = false;
    let usedBackupCodeIndex = -1;

    if (isBackupCode) {
      // Backup code doğrula
      usedBackupCodeIndex = verifyBackupCode(code, data.hashedBackupCodes);
      isValid = usedBackupCodeIndex !== -1;

      // Kullanılan backup code'u sil
      if (isValid) {
        data.hashedBackupCodes.splice(usedBackupCodeIndex, 1);
        data.backupCodesRemaining = data.hashedBackupCodes.length;
        await redis.set(`user:2fa:${walletAddress}`, JSON.stringify(data));
      }
    } else {
      // TOTP doğrula
      isValid = verifyToken(code, data.secret);
    }

    if (!isValid) {
      // Başarısız deneme sayısını artır
      const failKey = `user:2fa:fails:${walletAddress}`;
      const fails = await redis.incr(failKey);
      await redis.expire(failKey, 900); // 15 dakika

      // Çok fazla başarısız deneme
      if (fails >= 5) {
        return NextResponse.json(
          { 
            error: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.',
            locked: true,
            remainingTime: 900,
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Geçersiz doğrulama kodu',
          remainingAttempts: 5 - fails,
        },
        { status: 400 }
      );
    }

    // Başarılı - fail sayacını sıfırla
    await redis.del(`user:2fa:fails:${walletAddress}`);

    // Verification token oluştur (kısa süreli)
    const verificationToken = crypto.randomUUID();
    await redis.set(
      `user:2fa:verified:${walletAddress}`,
      verificationToken,
      'EX',
      300 // 5 dakika geçerli
    );

    return NextResponse.json({
      success: true,
      verified: true,
      verificationToken,
      message: isBackupCode 
        ? `Backup kodu ile doğrulandı. Kalan backup kod: ${data.hashedBackupCodes.length}` 
        : 'Başarıyla doğrulandı',
      backupCodesRemaining: data.hashedBackupCodes.length,
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: '2FA doğrulama başarısız' },
      { status: 500 }
    );
  }
}
