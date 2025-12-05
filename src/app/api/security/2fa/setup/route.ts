/**
 * 2FA Setup API
 * POST: QR kod ve secret oluştur
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { setupTwoFactor, hashBackupCode } from '@/lib/security/totp';

export async function POST(request: NextRequest) {
  try {
    // Wallet address al
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // Mevcut 2FA durumunu kontrol et
    const existing2FA = await redis.get(`user:2fa:${walletAddress}`);
    if (existing2FA) {
      const data = typeof existing2FA === 'string' ? JSON.parse(existing2FA) : existing2FA as any;
      if (data.enabled) {
        return NextResponse.json(
          { error: '2FA zaten aktif' },
          { status: 400 }
        );
      }
    }

    // Email al (opsiyonel, QR kodda gösterilecek)
    const body = await request.json().catch(() => ({}));
    const email = body.email || `${walletAddress.slice(0, 8)}@auxite.wallet`;

    // 2FA setup oluştur
    const setupData = await setupTwoFactor(email);

    // Backup kodlarını hashle
    const hashedBackupCodes = setupData.backupCodes.map(code => hashBackupCode(code));

    // Geçici olarak Redis'e kaydet (15 dakika geçerli)
    // Kullanıcı doğrulama yapınca kalıcı olacak
    const tempData = {
      secret: setupData.secret,
      hashedBackupCodes,
      enabled: false,
      setupStartedAt: new Date().toISOString(),
    };

    await redis.set(
      `user:2fa:pending:${walletAddress}`,
      JSON.stringify(tempData),
      'EX',
      900 // 15 dakika
    );

    // Response - secret'ı gösterme, sadece QR kod
    return NextResponse.json({
      success: true,
      qrCodeDataUrl: setupData.qrCodeDataUrl,
      backupCodes: setupData.backupCodes, // İlk ve son kez göster
      message: 'QR kodu tarayın ve doğrulama kodunu girin',
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: '2FA kurulumu başarısız' },
      { status: 500 }
    );
  }
}
