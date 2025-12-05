/**
 * Push Notification API
 * Subscribe, unsubscribe, send notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

// ============================================
// SUBSCRIBE - POST
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

    // Mevcut subscription'ları al
    const subscriptionsData = await redis.get(`push:subscriptions:${walletAddress}`);
    const subscriptions: Array<{ endpoint: string; keys: { p256dh: string; auth: string }; createdAt: string }> = 
      subscriptionsData 
        ? (typeof subscriptionsData === 'string' ? JSON.parse(subscriptionsData) : subscriptionsData)
        : [];

    // Aynı endpoint varsa güncelle, yoksa ekle
    const existingIndex = subscriptions.findIndex(s => s.endpoint === endpoint);
    const newSubscription = {
      endpoint,
      keys,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      subscriptions[existingIndex] = newSubscription;
    } else {
      subscriptions.push(newSubscription);
    }

    await redis.set(`push:subscriptions:${walletAddress}`, JSON.stringify(subscriptions));

    // Varsayılan bildirim ayarları
    const existingPrefs = await redis.get(`push:preferences:${walletAddress}`);
    if (!existingPrefs) {
      const defaultPreferences = {
        transactions: true,
        priceAlerts: true,
        security: true,
        marketing: false,
        enabled: true,
      };
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
// UNSUBSCRIBE - DELETE
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    const subscriptionsData = await redis.get(`push:subscriptions:${walletAddress}`);
    let subscriptions: Array<{ endpoint: string; keys: object }> = 
      subscriptionsData 
        ? (typeof subscriptionsData === 'string' ? JSON.parse(subscriptionsData) : subscriptionsData)
        : [];

    if (endpoint) {
      // Tek subscription sil
      subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
    } else {
      // Tümünü sil
      subscriptions = [];
    }

    await redis.set(`push:subscriptions:${walletAddress}`, JSON.stringify(subscriptions));

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
    const subscriptionsData = await redis.get(`push:subscriptions:${walletAddress}`);
    const subscriptions = subscriptionsData 
      ? (typeof subscriptionsData === 'string' ? JSON.parse(subscriptionsData) : subscriptionsData)
      : [];
    const isSubscribed = subscriptions.length > 0;

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
      subscriptionCount: subscriptions.length,
      preferences,
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    return NextResponse.json({ error: 'Tercihler alınamadı' }, { status: 500 });
  }
}

// ============================================
// UPDATE PREFERENCES - PATCH
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
