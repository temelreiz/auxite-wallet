/**
 * 2FA Disable API
 * POST: 2FA'yı kapat (mevcut kod ile doğrulama gerekli)
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
    const { code, password, isBackupCode = false } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Doğrulama kodu gerekli' },
        { status: 400 }
      );
    }

    // 2FA verisini al
    const twoFAData = await redis.get(`user:2fa:${walletAddress}`);
    
    if (!twoFAData) {
      return NextResponse.json(
        { error: '2FA aktif değil' },
        { status: 400 }
      );
    }

    const data = JSON.parse(twoFAData);

    if (!data.enabled) {
      return NextResponse.json(
        { error: '2FA zaten kapalı' },
        { status: 400 }
      );
    }

    // Kodu doğrula
    let isValid = false;

    if (isBackupCode) {
      const index = verifyBackupCode(code, data.hashedBackupCodes);
      isValid = index !== -1;
    } else {
      isValid = verifyToken(code, data.secret);
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz doğrulama kodu' },
        { status: 400 }
      );
    }

    // 2FA'yı kapat (veriyi tamamen sil)
    await redis.del(`user:2fa:${walletAddress}`);

    // Security log
    await logSecurityEvent(walletAddress, '2FA_DISABLED', {
      method: isBackupCode ? 'backup_code' : 'totp',
    });

    return NextResponse.json({
      success: true,
      message: '2FA başarıyla kapatıldı',
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: '2FA kapatma başarısız' },
      { status: 500 }
    );
  }
}

// Security event loglama
async function logSecurityEvent(
  walletAddress: string,
  event: string,
  details: Record<string, unknown>
) {
  const logEntry = {
    event,
    walletAddress,
    details,
    timestamp: new Date().toISOString(),
  };

  await redis.lpush(
    `user:security:logs:${walletAddress}`,
    JSON.stringify(logEntry)
  );
  await redis.ltrim(`user:security:logs:${walletAddress}`, 0, 99);
}
