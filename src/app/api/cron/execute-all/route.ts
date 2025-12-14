/**
 * Master Cron Job
 * Her saat başı çalışır
 * DCA ve Recurring Stake planlarını execute eder
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Vercel cron secret kontrolü
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Development'ta veya INTERNAL_API_KEY ile de çalışsın
    const apiKey = request.headers.get('x-api-key');
    if (apiKey !== process.env.INTERNAL_API_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const results: any = {
    timestamp: new Date().toISOString(),
    dca: null,
    recurringStake: null,
  };

  // 1. DCA Execute
  try {
    const dcaResponse = await fetch(baseUrl + '/api/recurring-buy/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || '',
      },
    });
    results.dca = await dcaResponse.json();
  } catch (err: any) {
    results.dca = { error: err.message };
  }

  // 2. Recurring Stake Execute
  try {
    const stakeResponse = await fetch(baseUrl + '/api/recurring-stake/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || '',
      },
    });
    results.recurringStake = await stakeResponse.json();
  } catch (err: any) {
    results.recurringStake = { error: err.message };
  }

  // Log sonuçları
  console.log('Cron execution results:', JSON.stringify(results, null, 2));

  return NextResponse.json({
    success: true,
    ...results,
  });
}

// POST da destekle (manuel test için)
export async function POST(request: NextRequest) {
  return GET(request);
}
