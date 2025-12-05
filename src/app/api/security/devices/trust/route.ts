/**
 * Device Trust API
 * POST: Cihazı güvenilir olarak işaretle/kaldır
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import type { DeviceInfo } from '@/lib/security/device-fingerprint';

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
    const { deviceId, trusted } = body;

    if (!deviceId || typeof trusted !== 'boolean') {
      return NextResponse.json(
        { error: 'deviceId ve trusted değeri gerekli' },
        { status: 400 }
      );
    }

    // Cihazları al
    const devicesData = await redis.get(`user:devices:${walletAddress}`);
    const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];

    // Cihazı bul
    const device = devices.find(d => d.id === deviceId);
    if (!device) {
      return NextResponse.json(
        { error: 'Cihaz bulunamadı' },
        { status: 404 }
      );
    }

    // Trust durumunu güncelle
    device.trusted = trusted;

    await redis.set(`user:devices:${walletAddress}`, JSON.stringify(devices));

    // Security log
    await logSecurityEvent(walletAddress, trusted ? 'DEVICE_TRUSTED' : 'DEVICE_UNTRUSTED', {
      deviceId: device.id,
      deviceName: device.name,
    });

    return NextResponse.json({
      success: true,
      device,
      message: trusted ? 'Cihaz güvenilir olarak işaretlendi' : 'Cihaz güvenilirlik durumu kaldırıldı',
    });
  } catch (error) {
    console.error('Device trust error:', error);
    return NextResponse.json(
      { error: 'İşlem başarısız' },
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
