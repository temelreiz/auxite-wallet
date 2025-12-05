/**
 * Devices API
 * GET: Cihaz listesi
 * POST: Yeni cihaz ekle/kaydet
 * DELETE: Cihazı sil
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { 
  createDevice, 
  parseUserAgent, 
  generateDeviceFingerprint,
  matchDevice,
  type DeviceInfo 
} from '@/lib/security/device-fingerprint';
import { getLocationByIP, formatLocation } from '@/lib/security/geoip';

// GET: Cihaz listesi
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // Cihazları al
    const devicesData = await redis.get(`user:devices:${walletAddress}`);
    const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];

    // Mevcut cihaz fingerprint'i
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';
    const currentFingerprint = generateDeviceFingerprint(userAgent, ip);

    // Cihazları formatlı döndür
    const formattedDevices = devices.map(device => ({
      ...device,
      isCurrent: device.fingerprint === currentFingerprint,
      locationFormatted: device.location ? formatLocation({ 
        ip: device.ip, 
        ...device.location 
      }) : 'Bilinmiyor',
    }));

    return NextResponse.json({
      devices: formattedDevices,
      currentFingerprint,
      totalDevices: devices.length,
      trustedDevices: devices.filter(d => d.trusted).length,
    });
  } catch (error) {
    console.error('Devices list error:', error);
    return NextResponse.json(
      { error: 'Cihaz listesi alınamadı' },
      { status: 500 }
    );
  }
}

// POST: Mevcut cihazı kaydet
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               '127.0.0.1';

    // Lokasyon al
    const location = await getLocationByIP(ip);

    // Mevcut cihazları al
    const devicesData = await redis.get(`user:devices:${walletAddress}`);
    const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];

    // Bu cihaz zaten kayıtlı mı?
    const currentFingerprint = generateDeviceFingerprint(userAgent, ip);
    const existingDevice = devices.find(d => d.fingerprint === currentFingerprint);

    if (existingDevice) {
      // Mevcut cihazı güncelle
      existingDevice.lastSeen = new Date().toISOString();
      existingDevice.ip = ip;
      if (location.city || location.country) {
        existingDevice.location = {
          city: location.city,
          country: location.country,
          countryCode: location.countryCode,
        };
      }

      await redis.set(`user:devices:${walletAddress}`, JSON.stringify(devices));

      return NextResponse.json({
        success: true,
        device: existingDevice,
        isNew: false,
      });
    }

    // Yeni cihaz oluştur
    const newDevice = createDevice(userAgent, ip, {
      city: location.city,
      country: location.country,
      countryCode: location.countryCode,
    });

    // Maksimum 10 cihaz - en eski olanı sil
    if (devices.length >= 10) {
      devices.sort((a, b) => new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime());
      devices.shift(); // En eski cihazı sil
    }

    devices.push(newDevice);
    await redis.set(`user:devices:${walletAddress}`, JSON.stringify(devices));

    // Security log
    await logSecurityEvent(walletAddress, 'NEW_DEVICE', {
      deviceId: newDevice.id,
      deviceName: newDevice.name,
      ip: newDevice.ip,
      location: formatLocation(location),
    });

    return NextResponse.json({
      success: true,
      device: newDevice,
      isNew: true,
      message: 'Yeni cihaz kaydedildi',
    });
  } catch (error) {
    console.error('Device register error:', error);
    return NextResponse.json(
      { error: 'Cihaz kaydedilemedi' },
      { status: 500 }
    );
  }
}

// DELETE: Cihazı sil
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Cihaz ID gerekli' },
        { status: 400 }
      );
    }

    // Cihazları al
    const devicesData = await redis.get(`user:devices:${walletAddress}`);
    const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];

    // Cihazı bul ve sil
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex === -1) {
      return NextResponse.json(
        { error: 'Cihaz bulunamadı' },
        { status: 404 }
      );
    }

    const removedDevice = devices.splice(deviceIndex, 1)[0];
    await redis.set(`user:devices:${walletAddress}`, JSON.stringify(devices));

    // İlgili session'ları da sil
    await redis.del(`user:sessions:${walletAddress}:${deviceId}`);

    // Security log
    await logSecurityEvent(walletAddress, 'DEVICE_REMOVED', {
      deviceId: removedDevice.id,
      deviceName: removedDevice.name,
    });

    return NextResponse.json({
      success: true,
      message: 'Cihaz silindi',
    });
  } catch (error) {
    console.error('Device delete error:', error);
    return NextResponse.json(
      { error: 'Cihaz silinemedi' },
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
