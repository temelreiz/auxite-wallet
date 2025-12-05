/**
 * Push Notification API
 * Subscribe, unsubscribe, send notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import webpush from 'web-push';

// VAPID keys - .env'den al
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:info@auxite.com';

// Web Push yapılandır
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ============================================
// SUBSCRIBE
// ============================================
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys) {
      return NextResponse.json({ error: 'Geçersiz subscription data' }, { status: 400 });
    }

    // Subscription'ı kaydet
    const subscriptionData = {
      endpoint,
      keys,
      walletAddress,
      createdAt: new Date().toISOString(),
      userAgent: request.headers.get('user-agent') || '',
    };

    // Kullanıcının subscription listesine ekle
    await redis.set(
      `push:subscription:${walletAddress}:${Buffer.from(endpoint).toString('base64').slice(0, 32)}`,
      JSON.stringify(subscriptionData)
    );

    // Kullanıcının tüm subscription'larını listele
    await redis.sadd(`push:user:${walletAddress}`, endpoint);

    // Varsayılan bildirim ayarları
    const defaultPreferences = {
      transactions: true,
      priceAlerts: true,
      security: true,
      marketing: false,
      enabled: true,
    };

    const existingPrefs = await redis.get(`push:preferences:${walletAddress}`);
    if (!existingPrefs) {
      await redis.set(`push:preferences:${walletAddress}`, JSON.stringify(defaultPreferences));
    }

    return NextResponse.json({
      success: true,
      message: 'Bildirimler aktifleştirildi',
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: 'Subscription başarısız' }, { status: 500 });
  }
}

// ============================================
// UNSUBSCRIBE - DELETE ile
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (endpoint) {
      // Tek subscription sil
      const key = `push:subscription:${walletAddress}:${Buffer.from(endpoint).toString('base64').slice(0, 32)}`;
      await redis.del(key);
      await redis.srem(`push:user:${walletAddress}`, endpoint);
    } else {
      // Tüm subscription'ları sil
      const endpoints = await redis.smembers(`push:user:${walletAddress}`);
      for (const ep of endpoints) {
        const key = `push:subscription:${walletAddress}:${Buffer.from(ep).toString('base64').slice(0, 32)}`;
        await redis.del(key);
      }
      await redis.del(`push:user:${walletAddress}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Bildirim aboneliği iptal edildi',
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json({ error: 'Unsubscribe başarısız' }, { status: 500 });
  }
}

// ============================================
// GET PREFERENCES
// ============================================
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    // Subscription durumu
    const endpoints = await redis.smembers(`push:user:${walletAddress}`);
    const isSubscribed = endpoints.length > 0;

    // Tercihler
    const prefsData = await redis.get(`push:preferences:${walletAddress}`);
    const preferences = prefsData 
      ? (typeof prefsData === 'string' ? JSON.parse(prefsData) : prefsData)
      : {
          transactions: true,
          priceAlerts: true,
          security: true,
          marketing: false,
          enabled: true,
        };

    return NextResponse.json({
      isSubscribed,
      subscriptionCount: endpoints.length,
      preferences,
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Tercihler alınamadı' }, { status: 500 });
  }
}

// ============================================
// UPDATE PREFERENCES - PATCH ile
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const body = await request.json();
    
    const prefsData = await redis.get(`push:preferences:${walletAddress}`);
    const currentPrefs = prefsData 
      ? (typeof prefsData === 'string' ? JSON.parse(prefsData) : prefsData)
      : {};

    const updatedPrefs = { ...currentPrefs, ...body };
    await redis.set(`push:preferences:${walletAddress}`, JSON.stringify(updatedPrefs));

    return NextResponse.json({
      success: true,
      preferences: updatedPrefs,
    });

  } catch (error) {
    console.error('Update preferences error:', error);
    return NextResponse.json({ error: 'Tercihler güncellenemedi' }, { status: 500 });
  }
}
