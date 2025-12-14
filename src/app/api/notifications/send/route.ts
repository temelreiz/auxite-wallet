/**
 * Send Push Notification API
 * Internal use - sends push notifications to users
 */

import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { redis } from '@/lib/redis';

// VAPID configuration
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:info@auxite.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{ action: string; title: string }>;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Send notification to a specific user
async function sendToUser(walletAddress: string, payload: NotificationPayload): Promise<{ sent: number; failed: number }> {
  const subscriptionsData = await redis.get(`push:subscriptions:${walletAddress.toLowerCase()}`);
  
  if (!subscriptionsData) {
    return { sent: 0, failed: 0 };
  }

  const subscriptions: PushSubscription[] = typeof subscriptionsData === 'string' 
    ? JSON.parse(subscriptionsData) 
    : subscriptionsData;

  let sent = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (error: any) {
      console.error(`Push failed for ${walletAddress}:`, error.message);
      failed++;
      
      // Remove expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        const updatedSubs = subscriptions.filter(s => s.endpoint !== subscription.endpoint);
        await redis.set(`push:subscriptions:${walletAddress.toLowerCase()}`, JSON.stringify(updatedSubs));
      }
    }
  }

  return { sent, failed };
}

// ============================================
// POST - Send notification
// ============================================
export async function POST(request: NextRequest) {
  try {
    // API key check for internal use
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletAddress, walletAddresses, type, title, body: messageBody, data } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'title ve body gerekli' }, { status: 400 });
    }

    const payload: NotificationPayload = {
      title,
      body: messageBody,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: type || 'general',
      data: {
        ...data,
        type,
        timestamp: Date.now(),
        url: data?.url || '/',
      },
    };

    let totalSent = 0;
    let totalFailed = 0;

    // Send to specific user(s)
    if (walletAddress) {
      const result = await sendToUser(walletAddress, payload);
      totalSent = result.sent;
      totalFailed = result.failed;
    } else if (walletAddresses && Array.isArray(walletAddresses)) {
      for (const addr of walletAddresses) {
        const result = await sendToUser(addr, payload);
        totalSent += result.sent;
        totalFailed += result.failed;
      }
    } else {
      return NextResponse.json({ error: 'walletAddress veya walletAddresses gerekli' }, { status: 400 });
    }

    // Log notification
    await redis.lpush('notifications:log', JSON.stringify({
      type,
      title,
      body: messageBody,
      recipients: walletAddress ? 1 : walletAddresses?.length || 0,
      sent: totalSent,
      failed: totalFailed,
      timestamp: Date.now(),
    }));
    await redis.ltrim('notifications:log', 0, 999); // Keep last 1000

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
    });

  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: 'Bildirim gönderilemedi' }, { status: 500 });
  }
}
