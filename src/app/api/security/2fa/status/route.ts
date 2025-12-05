/**
 * 2FA Status API
 * GET: Mevcut 2FA durumunu al
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // 2FA verisini al
    const twoFAData = await redis.get(`user:2fa:${walletAddress}`);
    
    if (!twoFAData) {
      return NextResponse.json({
        enabled: false,
        setupRequired: true,
      });
    }

    const data = typeof twoFAData === 'string' ? JSON.parse(twoFAData) : twoFAData as any;

    return NextResponse.json({
      enabled: data.enabled,
      enabledAt: data.enabledAt,
      backupCodesRemaining: data.hashedBackupCodes?.length || 0,
      setupRequired: false,
    });
  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: '2FA durumu alınamadı' },
      { status: 500 }
    );
  }
}
