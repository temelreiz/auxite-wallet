/**
 * GET /api/security — Security Status Overview
 *
 * Returns the user's current security configuration status.
 * Used by mobile app Security Center screen.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const redis = getRedis();
    const addr = walletAddress.toLowerCase();

    // Fetch security settings from Redis
    const [securitySettings, devices, sessions, whitelist, limits, twoFaStatus] = await Promise.all([
      redis.hgetall(`user:${addr}:security`).catch(() => null),
      redis.get(`user:${addr}:devices`).catch(() => null),
      redis.get(`user:${addr}:sessions`).catch(() => null),
      redis.get(`user:${addr}:whitelist`).catch(() => null),
      redis.get(`user:${addr}:limits`).catch(() => null),
      redis.get(`user:${addr}:2fa`).catch(() => null),
    ]);

    // Build security status response
    const settings = securitySettings || {};
    const deviceList = Array.isArray(devices) ? devices : [];
    const sessionList = Array.isArray(sessions) ? sessions : [];
    const whitelistAddresses = Array.isArray(whitelist) ? whitelist : [];
    const twoFa = typeof twoFaStatus === 'object' && twoFaStatus !== null ? twoFaStatus : {};

    return NextResponse.json({
      success: true,
      security: {
        twoFactorEnabled: (twoFa as any)?.enabled === true,
        biometricsEnabled: (settings as any)?.biometrics === 'true',
        pinEnabled: (settings as any)?.pin === 'true',
        emailVerified: (settings as any)?.emailVerified === 'true',
        withdrawalDelayEnabled: (settings as any)?.withdrawalDelay !== 'false',
        whitelistEnabled: (settings as any)?.whitelist !== 'false',
        deviceCount: deviceList.length,
        activeSessionCount: sessionList.length,
        whitelistedAddressCount: whitelistAddresses.length,
        dailyLimits: limits || {
          redemptionLimit: 100000,
          transferLimit: 500000,
        },
      },
    });
  } catch (error) {
    console.error('[/api/security] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch security status' },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
