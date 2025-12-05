/**
 * Sessions API
 * GET: Aktif oturumları listele
 * POST: Yeni oturum oluştur
 * DELETE: Oturumu sonlandır
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { 
  createSession,
  generateDeviceFingerprint,
  type SessionInfo,
  type DeviceInfo 
} from '@/lib/security/device-fingerprint';
import { getLocationByIP, formatLocation } from '@/lib/security/geoip';

// GET: Aktif oturumları listele
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet adresi gerekli' },
        { status: 401 }
      );
    }

    // Session'ları al
    const sessionsData = await redis.get(`user:sessions:${walletAddress}`);
    const sessions: SessionInfo[] = sessionsData ? typeof sessionsData === 'string' ? JSON.parse(sessionsData) : sessionsData as any : [];

    // Cihaz bilgilerini al
    const devicesData = await redis.get(`user:devices:${walletAddress}`);
    const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];

    // Mevcut session'ı bul
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const currentFingerprint = generateDeviceFingerprint(userAgent, ip);
    const currentDevice = devices.find(d => d.fingerprint === currentFingerprint);

    // Session'ları zenginleştir
    const enrichedSessions = sessions
      .filter(s => s.isActive && new Date(s.expiresAt) > new Date())
      .map(session => {
        const device = devices.find(d => d.id === session.deviceId);
        return {
          ...session,
          deviceName: device?.name || 'Bilinmeyen Cihaz',
          deviceType: device?.deviceType || 'unknown',
          isCurrent: device?.fingerprint === currentFingerprint,
          location: device?.location ? formatLocation({ ip: session.ip, ...device.location }) : 'Bilinmiyor',
        };
      });

    return NextResponse.json({
      sessions: enrichedSessions,
      totalActive: enrichedSessions.length,
      currentSessionId: enrichedSessions.find(s => s.isCurrent)?.id,
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    return NextResponse.json(
      { error: 'Oturum listesi alınamadı' },
      { status: 500 }
    );
  }
}

// POST: Yeni oturum oluştur
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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // Cihazları al ve mevcut cihazı bul
    const devicesData = await redis.get(`user:devices:${walletAddress}`);
    const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];
    
    const currentFingerprint = generateDeviceFingerprint(userAgent, ip);
    let currentDevice = devices.find(d => d.fingerprint === currentFingerprint);

    // Cihaz yoksa oluştur
    if (!currentDevice) {
      const location = await getLocationByIP(ip);
      const { createDevice } = await import('@/lib/security/device-fingerprint');
      currentDevice = createDevice(userAgent, ip, {
        city: location.city,
        country: location.country,
        countryCode: location.countryCode,
      });
      devices.push(currentDevice);
      await redis.set(`user:devices:${walletAddress}`, JSON.stringify(devices));
    }

    // Mevcut session'ları al
    const sessionsData = await redis.get(`user:sessions:${walletAddress}`);
    const sessions: SessionInfo[] = sessionsData ? typeof sessionsData === 'string' ? JSON.parse(sessionsData) : sessionsData as any : [];

    // Bu cihaz için aktif session var mı?
    const existingSession = sessions.find(
      s => s.deviceId === currentDevice!.id && s.isActive && new Date(s.expiresAt) > new Date()
    );

    if (existingSession) {
      // Mevcut session'ı güncelle
      existingSession.lastActivity = new Date().toISOString();
      existingSession.ip = ip;
      await redis.set(`user:sessions:${walletAddress}`, JSON.stringify(sessions));

      return NextResponse.json({
        success: true,
        session: existingSession,
        isNew: false,
      });
    }

    // Yeni session oluştur
    const newSession = createSession(
      currentDevice.id,
      walletAddress,
      ip,
      userAgent,
      24 // 24 saat
    );

    // Maksimum 5 aktif session
    const activeSessions = sessions.filter(
      s => s.isActive && new Date(s.expiresAt) > new Date()
    );
    
    if (activeSessions.length >= 5) {
      // En eski session'ı sonlandır
      activeSessions.sort((a, b) => 
        new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()
      );
      const oldestSession = activeSessions[0];
      const oldIndex = sessions.findIndex(s => s.id === oldestSession.id);
      if (oldIndex !== -1) {
        sessions[oldIndex].isActive = false;
      }
    }

    sessions.push(newSession);
    await redis.set(`user:sessions:${walletAddress}`, JSON.stringify(sessions));

    // Security log
    await logSecurityEvent(walletAddress, 'SESSION_CREATED', {
      sessionId: newSession.id,
      deviceId: currentDevice.id,
      ip,
    });

    return NextResponse.json({
      success: true,
      session: newSession,
      isNew: true,
    });
  } catch (error) {
    console.error('Session create error:', error);
    return NextResponse.json(
      { error: 'Oturum oluşturulamadı' },
      { status: 500 }
    );
  }
}

// DELETE: Oturumu sonlandır
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
    const sessionId = searchParams.get('sessionId');
    const revokeAll = searchParams.get('revokeAll') === 'true';

    // Session'ları al
    const sessionsData = await redis.get(`user:sessions:${walletAddress}`);
    const sessions: SessionInfo[] = sessionsData ? typeof sessionsData === 'string' ? JSON.parse(sessionsData) : sessionsData as any : [];

    if (revokeAll) {
      // Tüm session'ları sonlandır
      const userAgent = request.headers.get('user-agent') || '';
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
      const currentFingerprint = generateDeviceFingerprint(userAgent, ip);
      
      const devicesData = await redis.get(`user:devices:${walletAddress}`);
      const devices: DeviceInfo[] = devicesData ? typeof devicesData === 'string' ? JSON.parse(devicesData) : devicesData as any : [];
      const currentDevice = devices.find(d => d.fingerprint === currentFingerprint);

      // Mevcut cihaz hariç hepsini kapat
      let revokedCount = 0;
      sessions.forEach(session => {
        if (session.isActive && session.deviceId !== currentDevice?.id) {
          session.isActive = false;
          revokedCount++;
        }
      });

      await redis.set(`user:sessions:${walletAddress}`, JSON.stringify(sessions));

      await logSecurityEvent(walletAddress, 'ALL_SESSIONS_REVOKED', {
        revokedCount,
        keptCurrentDevice: !!currentDevice,
      });

      return NextResponse.json({
        success: true,
        message: `${revokedCount} oturum sonlandırıldı`,
        revokedCount,
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID gerekli' },
        { status: 400 }
      );
    }

    // Belirli session'ı bul ve sonlandır
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Oturum bulunamadı' },
        { status: 404 }
      );
    }

    session.isActive = false;
    await redis.set(`user:sessions:${walletAddress}`, JSON.stringify(sessions));

    await logSecurityEvent(walletAddress, 'SESSION_REVOKED', {
      sessionId: session.id,
      deviceId: session.deviceId,
    });

    return NextResponse.json({
      success: true,
      message: 'Oturum sonlandırıldı',
    });
  } catch (error) {
    console.error('Session revoke error:', error);
    return NextResponse.json(
      { error: 'Oturum sonlandırılamadı' },
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
