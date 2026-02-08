// src/app/api/custody/webhook/route.ts
// Custody Webhook Handler - Process provider callbacks

import { NextRequest, NextResponse } from 'next/server';
import {
  initializeCustody,
  verifyWebhook,
  parseWebhookEvent,
  CustodyProvider,
} from '@/lib/custody';
import { handleFireblocksWebhook } from '@/lib/custody/fireblocks';

// ============================================
// POST - Handle webhook from custody provider
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Get provider from URL or header
    const { searchParams } = new URL(request.url);
    const provider = (searchParams.get('provider') || 'fireblocks') as CustodyProvider;

    // Get webhook signature
    const signature = request.headers.get('x-fireblocks-signature') || '';

    // Get raw body
    const body = await request.json();

    console.log(`[Webhook] Received ${provider} webhook`);

    // Initialize custody adapters
    await initializeCustody();

    // Verify webhook signature (skip in development)
    if (process.env.NODE_ENV === 'production') {
      const isValid = await verifyWebhook(provider, body, signature);
      if (!isValid) {
        console.error('[Webhook] Invalid signature');
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // Parse webhook event
    const event = parseWebhookEvent(provider, body);

    // Handle based on provider
    switch (provider) {
      case 'fireblocks':
        await handleFireblocksWebhook(event);
        break;

      case 'mock':
        console.log('[Webhook] Mock webhook received:', event);
        break;

      default:
        console.warn(`[Webhook] Unknown provider: ${provider}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Fireblocks requires GET for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    // Fireblocks webhook verification
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ status: 'Webhook endpoint active' });
}
