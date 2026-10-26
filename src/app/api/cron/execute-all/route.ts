/**
 * Master Cron Job
 * Her saat başı çalışır
 * DCA ve Recurring Stake planlarını execute eder
 */

import { NextRequest, NextResponse } from 'next/server';
import { isCronRequest } from '@/lib/security/require-user';

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // NEXT_PUBLIC_BASE_URL is not set in production; it fell back to localhost.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vault.auxite.io';
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
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
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
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
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
