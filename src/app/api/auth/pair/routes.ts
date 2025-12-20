// ============================================
// BACKEND API ROUTES FOR CROSS-AUTH
// Next.js API Routes Example
// ============================================

// api/auth/pair/create/route.ts
// Creates a new pairing session (called from Web to show QR)

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv'; // or Redis

const SESSION_EXPIRY = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceDevice, targetDevice } = body;

    // Generate session
    const sessionId = uuidv4();
    const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const session = {
      sessionId,
      pairingCode,
      qrData: `auxite://auth?session=${sessionId}&code=${pairingCode}`,
      walletAddress: null,
      sourceDevice: sourceDevice || 'web',
      targetDevice: targetDevice || 'mobile',
      expiresAt: Date.now() + (SESSION_EXPIRY * 1000),
      status: 'pending',
      createdAt: Date.now(),
    };

    // Store in Redis/KV with expiry
    await kv.set(`pair:${sessionId}`, JSON.stringify(session), { ex: SESSION_EXPIRY });

    return NextResponse.json(session);
  } catch (error) {
    console.error('Create pairing error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// ============================================
// api/auth/pair/verify/route.ts
// Verifies QR scan from mobile

export async function POST_verify(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, pairingCode, walletAddress, deviceId } = body;

    // Get session
    const sessionData = await kv.get(`pair:${sessionId}`);
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Session not found or expired' });
    }

    const session = JSON.parse(sessionData as string);

    // Verify code
    if (session.pairingCode !== pairingCode) {
      return NextResponse.json({ success: false, error: 'Invalid pairing code' });
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      await kv.del(`pair:${sessionId}`);
      return NextResponse.json({ success: false, error: 'Session expired' });
    }

    // Update session with wallet address
    session.walletAddress = walletAddress;
    session.mobileDeviceId = deviceId;
    session.verifiedAt = Date.now();
    
    await kv.set(`pair:${sessionId}`, JSON.stringify(session), { ex: SESSION_EXPIRY });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Verify pairing error:', error);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}

// ============================================
// api/auth/pair/confirm/route.ts
// Final confirmation from mobile

export async function POST_confirm(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, walletAddress, approved, signature, deviceId } = body;

    // Get session
    const sessionData = await kv.get(`pair:${sessionId}`);
    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Session not found' });
    }

    const session = JSON.parse(sessionData as string);

    // Verify wallet matches
    if (session.walletAddress !== walletAddress) {
      return NextResponse.json({ success: false, error: 'Wallet mismatch' });
    }

    // In production: Verify signature to ensure user owns the wallet
    // const isValid = await verifySignature(message, signature, walletAddress);

    if (approved) {
      // Generate auth token for web
      const authToken = uuidv4();
      
      session.status = 'confirmed';
      session.authToken = authToken;
      session.confirmedAt = Date.now();
      
      // Store auth token mapping
      await kv.set(`auth:${authToken}`, JSON.stringify({
        walletAddress,
        createdAt: Date.now(),
        sessionId,
      }), { ex: 3600 }); // 1 hour token expiry
    } else {
      session.status = 'rejected';
    }

    await kv.set(`pair:${sessionId}`, JSON.stringify(session), { ex: 60 }); // Keep for 1 min for polling

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error('Confirm pairing error:', error);
    return NextResponse.json({ success: false, error: 'Confirmation failed' }, { status: 500 });
  }
}

// ============================================
// api/auth/pair/status/[sessionId]/route.ts
// Check pairing status (polling from web)

export async function GET_status(req: NextRequest, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;

    const sessionData = await kv.get(`pair:${sessionId}`);
    if (!sessionData) {
      return NextResponse.json({ status: 'expired' });
    }

    const session = JSON.parse(sessionData as string);
    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// ============================================
// api/auth/mobile-request/route.ts
// Web requests mobile confirmation (sends push)

export async function POST_mobile_request(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, action, actionData, sourceDevice } = body;

    // Get user's registered devices
    const devicesData = await kv.get(`devices:${walletAddress}`);
    if (!devicesData) {
      return NextResponse.json({ success: false, error: 'No mobile device registered' });
    }

    const devices = JSON.parse(devicesData as string);
    const mobileDevices = devices.filter((d: any) => d.platform !== 'web' && d.pushToken);

    if (mobileDevices.length === 0) {
      return NextResponse.json({ success: false, error: 'No mobile device with push token' });
    }

    // Create auth request
    const requestId = uuidv4();
    const authRequest = {
      requestId,
      walletAddress,
      action,
      actionData,
      fromDevice: sourceDevice || 'web',
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
    };

    await kv.set(`auth_request:${requestId}`, JSON.stringify(authRequest), { ex: 300 });

    // Send push notification to all mobile devices
    const pushPromises = mobileDevices.map(async (device: any) => {
      await sendPushNotification(device.pushToken, {
        title: 'Login Request',
        body: 'Web browser wants to access your account',
        data: {
          type: 'auth_request',
          requestId,
          action,
          ...actionData,
        },
      });
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, requestId });
  } catch (error) {
    console.error('Mobile request error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send request' }, { status: 500 });
  }
}

// ============================================
// api/auth/mobile-confirm/route.ts
// Mobile confirms/rejects auth request

export async function POST_mobile_confirm(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId, walletAddress, approved, deviceId } = body;

    // Get auth request
    const requestData = await kv.get(`auth_request:${requestId}`);
    if (!requestData) {
      return NextResponse.json({ success: false, error: 'Request not found or expired' });
    }

    const authRequest = JSON.parse(requestData as string);

    // Verify wallet matches
    if (authRequest.walletAddress !== walletAddress) {
      return NextResponse.json({ success: false, error: 'Wallet mismatch' });
    }

    if (approved) {
      authRequest.status = 'confirmed';
      authRequest.confirmedBy = deviceId;
      authRequest.confirmedAt = Date.now();

      // Generate token for web
      const authToken = uuidv4();
      authRequest.authToken = authToken;

      await kv.set(`auth:${authToken}`, JSON.stringify({
        walletAddress,
        createdAt: Date.now(),
        requestId,
      }), { ex: 3600 });

      // Generate deep link if action requires it
      let deepLink = null;
      if (authRequest.action === 'open_app' && authRequest.actionData?.path) {
        deepLink = `auxite://${authRequest.actionData.path}`;
      }

      authRequest.deepLink = deepLink;
    } else {
      authRequest.status = 'rejected';
    }

    await kv.set(`auth_request:${requestId}`, JSON.stringify(authRequest), { ex: 60 });

    return NextResponse.json({ 
      success: true, 
      deepLink: authRequest.deepLink,
      authToken: authRequest.authToken,
    });
  } catch (error) {
    console.error('Mobile confirm error:', error);
    return NextResponse.json({ success: false, error: 'Confirmation failed' }, { status: 500 });
  }
}

// ============================================
// api/auth/mobile-status/[requestId]/route.ts
// Check auth request status (polling from web)

export async function GET_mobile_status(req: NextRequest, { params }: { params: { requestId: string } }) {
  try {
    const { requestId } = params;

    const requestData = await kv.get(`auth_request:${requestId}`);
    if (!requestData) {
      return NextResponse.json({ status: 'expired' });
    }

    const authRequest = JSON.parse(requestData as string);
    return NextResponse.json({
      status: authRequest.status,
      token: authRequest.status === 'confirmed' ? authRequest.authToken : undefined,
    });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// ============================================
// api/auth/devices/route.ts
// Register device for push notifications

export async function POST_devices(req: NextRequest) {
  try {
    const body = await req.json();
    const { deviceId, walletAddress, platform, pushToken } = body;

    // Get existing devices for this wallet
    const devicesData = await kv.get(`devices:${walletAddress}`);
    let devices = devicesData ? JSON.parse(devicesData as string) : [];

    // Update or add device
    const existingIndex = devices.findIndex((d: any) => d.deviceId === deviceId);
    const deviceInfo = {
      deviceId,
      platform,
      pushToken,
      lastActive: Date.now(),
    };

    if (existingIndex >= 0) {
      devices[existingIndex] = deviceInfo;
    } else {
      devices.push(deviceInfo);
    }

    // Keep only last 5 devices
    devices = devices.slice(-5);

    await kv.set(`devices:${walletAddress}`, JSON.stringify(devices));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Register device error:', error);
    return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
  }
}

// ============================================
// api/auth/session/create/route.ts
// Create session token for cross-platform use

export async function POST_session_create(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, deviceId, platform } = body;

    const token = uuidv4();
    
    await kv.set(`auth:${token}`, JSON.stringify({
      walletAddress,
      deviceId,
      platform,
      createdAt: Date.now(),
    }), { ex: 3600 }); // 1 hour

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// ============================================
// api/auth/session/verify/route.ts
// Verify session token

export async function POST_session_verify(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    const sessionData = await kv.get(`auth:${token}`);
    if (!sessionData) {
      return NextResponse.json({ valid: false });
    }

    const session = JSON.parse(sessionData as string);
    return NextResponse.json({ 
      valid: true, 
      walletAddress: session.walletAddress,
    });
  } catch (error) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}

// ============================================
// HELPER: Send Push Notification (Expo)
// ============================================

async function sendPushNotification(pushToken: string, notification: {
  title: string;
  body: string;
  data?: Record<string, any>;
}) {
  const message = {
    to: pushToken,
    sound: 'default',
    title: notification.title,
    body: notification.body,
    data: notification.data,
  };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
}

// ============================================
// EXPORTS (for Next.js App Router)
// ============================================

/*
File structure:
app/
  api/
    auth/
      pair/
        create/route.ts    -> POST: Create QR session
        verify/route.ts    -> POST: Verify QR scan
        confirm/route.ts   -> POST: Confirm pairing
        status/
          [sessionId]/route.ts -> GET: Check status
      mobile-request/route.ts  -> POST: Send push to mobile
      mobile-confirm/route.ts  -> POST: Confirm from mobile
      mobile-status/
        [requestId]/route.ts   -> GET: Check request status
      devices/route.ts         -> POST: Register device
      session/
        create/route.ts        -> POST: Create session token
        verify/route.ts        -> POST: Verify session token
*/
