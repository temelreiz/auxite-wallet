/**
 * 2FA Enable API
 * POST: 2FA kurulumunu tamamla ve aktifleştir
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { verifyToken } from '@/lib/security/totp';

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
    const { code } = body;

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: '6 haneli doğrulama kodu gerekli' },
        { status: 400 }
      );
    }

    // Pending 2FA verisini al
    const pendingData = await redis.get(`user:2fa:pending:${walletAddress}`);
    
    if (!pendingData) {
      return NextResponse.json(
        { error: '2FA kurulumu bulunamadı veya süresi doldu. Lütfen tekrar başlatın.' },
        { status: 400 }
      );
    }

    const pending = JSON.parse(pendingData);

    // TOTP kodunu doğrula
    const isValid = verifyToken(code, pending.secret);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz doğrulama kodu. QR kodu taradığınızdan emin olun.' },
        { status: 400 }
      );
    }

    // 2FA'yı aktifleştir
    const twoFAData = {
      secret: pending.secret,
      hashedBackupCodes: pending.hashedBackupCodes,
      backupCodesRemaining: pending.hashedBackupCodes.length,
      enabled: true,
      enabledAt: new Date().toISOString(),
    };

    // Kalıcı olarak kaydet
    await redis.set(`user:2fa:${walletAddress}`, JSON.stringify(twoFAData));

    // Pending veriyi sil
    await redis.del(`user:2fa:pending:${walletAddress}`);

    // Security log
    await logSecurityEvent(walletAddress, '2FA_ENABLED', {
      backupCodesCount: pending.hashedBackupCodes.length,
    });

    return NextResponse.json({
      success: true,
      message: '2FA başarıyla aktifleştirildi',
      backupCodesRemaining: pending.hashedBackupCodes.length,
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { error: '2FA aktifleştirme başarısız' },
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

  // Son 100 log'u tut
  await redis.lpush(
    `user:security:logs:${walletAddress}`,
    JSON.stringify(logEntry)
  );
  await redis.ltrim(`user:security:logs:${walletAddress}`, 0, 99);
}
