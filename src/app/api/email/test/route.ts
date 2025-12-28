// app/api/email/test/route.ts
// Test email endpoint
import { NextRequest, NextResponse } from 'next/server';
import { sendCertificateEmail, sendStakingAgreementEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { type, to } = await request.json();

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    if (type === 'certificate') {
      const result = await sendCertificateEmail(to, '', {
        certificateNumber: 'AUX-CERT-2025-TEST01',
        metal: 'AUXG',
        metalName: 'Gold',
        grams: '10.0000',
      });
      return NextResponse.json({ success: true, type: 'certificate', ...result });
    }

    if (type === 'staking') {
      const result = await sendStakingAgreementEmail(to, '', {
        agreementNo: 'AUX-EARN-2025-TEST01',
        stakeId: 'TEST-STAKE-001',
        metal: 'AUXG',
        metalName: 'Gold',
        amount: '10.0000',
        termLabel: '3 Months',
        apy: '5.5',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 91 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      return NextResponse.json({ success: true, type: 'staking', ...result });
    }

    return NextResponse.json({ error: 'Invalid type. Use "certificate" or "staking"' }, { status: 400 });
  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
