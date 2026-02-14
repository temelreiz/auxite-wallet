/**
 * Phone Tiering API
 * GET  - Get phone tiering data + communication preference
 * POST - Set phone, verify, set communication preference, check gate
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getPhoneTiering,
  setPhoneNumber,
  verifyPhone,
  setCommunicationPreference,
  checkPhoneGate,
  isCustodyAllowed,
  type CommunicationPreference,
} from '@/lib/phone-tiering';

export const dynamic = 'force-dynamic';

// ═══════════════════════════════════════════════════════════════════════════
// GET - Get phone tiering data
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const tiering = await getPhoneTiering(address);
    const custody = await isCustodyAllowed(address);

    // Mask phone for display
    const maskedPhone = tiering.phone
      ? tiering.phone.slice(0, 4) + ' *** ' + tiering.phone.slice(-4)
      : '';

    return NextResponse.json({
      success: true,
      tiering: {
        tier: tiering.tier,
        phone: maskedPhone,
        phoneVerified: tiering.phoneVerified,
        phoneVerifiedAt: tiering.phoneVerifiedAt,
        voiceVerified: tiering.voiceVerified,
        communicationPreference: tiering.communicationPreference,
      },
      custody: {
        allowed: custody.allowed,
        reason: custody.reason,
        phoneVerified: custody.phoneVerified,
        kycVerified: custody.kycVerified,
      },
    });
  } catch (error: any) {
    console.error('Phone tiering GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Phone tiering actions
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, action } = body;

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────
    // SET PHONE NUMBER (unverified)
    // ─────────────────────────────────────────────────────────────
    if (action === 'set_phone') {
      const { phone } = body;
      if (!phone || phone.length < 8) {
        return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 });
      }

      const tiering = await setPhoneNumber(address, phone);
      return NextResponse.json({
        success: true,
        message: 'Phone number set. Verification required.',
        tiering: {
          tier: tiering.tier,
          phoneVerified: tiering.phoneVerified,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // VERIFY PHONE (OTP confirmed → Tier 1)
    // ─────────────────────────────────────────────────────────────
    if (action === 'verify_phone') {
      // In production, OTP verification would happen here
      // For now, mark as verified directly
      const tiering = await verifyPhone(address);
      console.log(`✅ Phone verified for ${address} → Tier ${tiering.tier}`);

      return NextResponse.json({
        success: true,
        message: 'Phone verified successfully. Custody enabled.',
        tiering: {
          tier: tiering.tier,
          phoneVerified: tiering.phoneVerified,
          phoneVerifiedAt: tiering.phoneVerifiedAt,
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // SET COMMUNICATION PREFERENCE
    // ─────────────────────────────────────────────────────────────
    if (action === 'set_communication_preference') {
      const { preference } = body;
      const validPreferences: CommunicationPreference[] = ['phone', 'email', 'both'];
      if (!preference || !validPreferences.includes(preference)) {
        return NextResponse.json({ error: 'Valid preference required: phone, email, or both' }, { status: 400 });
      }

      const tiering = await setCommunicationPreference(address, preference);
      return NextResponse.json({
        success: true,
        message: `Communication preference set to ${preference}`,
        communicationPreference: tiering.communicationPreference,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // CHECK GATE (before high-risk actions)
    // ─────────────────────────────────────────────────────────────
    if (action === 'check_gate') {
      const { gateAction } = body;
      if (!gateAction) {
        return NextResponse.json({ error: 'gateAction required' }, { status: 400 });
      }

      const result = await checkPhoneGate(address, gateAction);
      return NextResponse.json({
        success: true,
        gate: result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Phone tiering POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
