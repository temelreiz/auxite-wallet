// app/api/auth/mobile-request/route.ts
// Request mobile confirmation from web (sends push notification)

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { v4 as uuidv4 } from 'uuid';

const REQUEST_EXPIRY = 300; // 5 minutes

interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  pushToken: string | null;
  lastActive: number;
}

// Send Expo Push Notification
async function sendExpoPushNotification(
  pushToken: string,
  notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
  }
) {
  const message = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
    priority: 'high',
    channelId: 'auth-requests',
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });

  const result = await response.json();
  
  if (result.data?.status === 'error') {
    console.error('Push notification error:', result.data.message);
    return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, action, actionData, sourceDevice = 'web' } = body;

    // Validate required fields
    if (!walletAddress || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user's registered devices
    const devicesData = await kv.get(`devices:${walletAddress.toLowerCase()}`);
    
    if (!devicesData) {
      return NextResponse.json({
        success: false,
        error: 'No mobile device registered for this wallet',
      });
    }

    const devices: DeviceInfo[] = typeof devicesData === 'string' 
      ? JSON.parse(devicesData) 
      : devicesData as DeviceInfo[];

    // Filter mobile devices with push tokens
    const mobileDevices = devices.filter(
      (d) => d.platform !== 'web' && d.pushToken
    );

    if (mobileDevices.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No mobile device with push notifications enabled',
      });
    }

    // Create auth request
    const requestId = uuidv4();
    const authRequest = {
      requestId,
      walletAddress: walletAddress.toLowerCase(),
      action,
      actionData: actionData || {},
      fromDevice: sourceDevice,
      status: 'pending' as const,
      createdAt: Date.now(),
      expiresAt: Date.now() + (REQUEST_EXPIRY * 1000),
      confirmedBy: null,
      confirmedAt: null,
      authToken: null,
      deepLink: null,
    };

    // Store request
    await kv.set(`auth_request:${requestId}`, JSON.stringify(authRequest), { 
      ex: REQUEST_EXPIRY 
    });

    // Determine notification content based on action
    let notificationTitle = 'Login Request';
    let notificationBody = 'Web browser wants to access your account';

    if (action === 'open_app') {
      notificationTitle = 'Open in Mobile';
      notificationBody = 'Tap to open Auxite app';
    } else if (action === 'sign_transaction') {
      notificationTitle = 'Transaction Request';
      notificationBody = 'A transaction needs your approval';
    }

    // Send push notifications to all mobile devices
    const pushResults = await Promise.all(
      mobileDevices.map((device) =>
        sendExpoPushNotification(device.pushToken!, {
          title: notificationTitle,
          body: notificationBody,
          data: {
            type: 'auth_request',
            requestId,
            action,
            walletAddress,
            timestamp: Date.now(),
            ...actionData,
          },
        })
      )
    );

    const successCount = pushResults.filter(Boolean).length;

    if (successCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to send push notifications',
      });
    }

    return NextResponse.json({
      success: true,
      requestId,
      deviceCount: successCount,
    });
  } catch (error) {
    console.error('Mobile request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send request' },
      { status: 500 }
    );
  }
}
