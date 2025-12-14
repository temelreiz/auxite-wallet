/**
 * KYC Reset API (Sadece development için)
 */

import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(request: NextRequest) {
  // Sadece development'ta çalışsın
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  const walletAddress = request.headers.get('x-wallet-address');
  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet adresi gerekli' }, { status: 401 });
  }

  await redis.del('kyc:' + walletAddress.toLowerCase());

  return NextResponse.json({ success: true, message: 'KYC verisi sıfırlandı' });
}
