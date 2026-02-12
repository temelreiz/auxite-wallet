// app/api/email/test/route.ts
// Institutional Email Test Endpoint — All 6 templates
import { NextRequest, NextResponse } from 'next/server';
import {
  sendTradeExecutionEmail,
  sendCertificateEmail,
  sendStakingAgreementEmail,
  sendYieldDistributionEmail,
  sendRedemptionInitiatedEmail,
  sendSecurityAlertEmail,
} from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { type, to } = await request.json();

    if (!to) {
      return NextResponse.json({ error: 'Email address required' }, { status: 400 });
    }

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toISOString().replace('T', ', ').replace(/\.\d+Z/, ' UTC');

    // 1. Trade Execution Confirmation
    if (type === 'trade') {
      const result = await sendTradeExecutionEmail(to, {
        clientName: 'Test Client',
        transactionType: 'Buy',
        metal: 'AUXG',
        metalName: 'Gold (LBMA Good Delivery)',
        grams: '2500.0000',
        executionPrice: 'USD 74.21 / g',
        grossConsideration: 'USD 185,525.00',
        executionTime: timeStr,
        referenceId: `TRD-${Date.now().toString().slice(-6)}`,
      });
      return NextResponse.json({ type: 'trade', ...result });
    }

    // 2. Metal Allocation Certificate
    if (type === 'certificate') {
      const result = await sendCertificateEmail(to, '', {
        certificateNumber: `AUX-CERT-${now.getFullYear()}-TEST01`,
        metal: 'AUXG',
        metalName: 'Gold',
        grams: '2500.0000',
        purity: '999.9',
        vaultLocation: 'Zurich',
        holderName: 'Test Client',
      });
      return NextResponse.json({ type: 'certificate', ...result });
    }

    // 3. Yield Enrollment (Leasing Participation)
    if (type === 'staking' || type === 'leasing') {
      const result = await sendStakingAgreementEmail(to, '', {
        agreementNo: `YLD-${now.getFullYear()}-TEST01`,
        stakeId: 'TEST-STAKE-001',
        metal: 'AUXG',
        metalName: 'Gold',
        amount: '5000.0000',
        termLabel: '6 Months',
        apy: '3.40',
        startDate: dateStr,
        endDate: new Date(Date.now() + 182 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        holderName: 'Test Client',
      });
      return NextResponse.json({ type: 'leasing', ...result });
    }

    // 4. Yield Distribution Notice
    if (type === 'yield') {
      const result = await sendYieldDistributionEmail(to, {
        clientName: 'Test Client',
        metal: 'AUXG',
        metalName: 'Gold',
        yieldRate: '3.40',
        amountCredited: '42.0000',
        creditedAt: timeStr,
        referenceId: `YLD-${Date.now().toString().slice(-5)}`,
      });
      return NextResponse.json({ type: 'yield', ...result });
    }

    // 5. Physical Redemption
    if (type === 'redemption') {
      const result = await sendRedemptionInitiatedEmail(to, {
        clientName: 'Test Client',
        metal: 'AUXG',
        metalName: 'Gold',
        grams: '1000.0000',
        vaultLocation: 'Zurich',
        deliveryMethod: 'Insured Shipment',
        referenceId: `RDM-${Date.now().toString().slice(-6)}`,
      });
      return NextResponse.json({ type: 'redemption', ...result });
    }

    // 6. Security Alert
    if (type === 'security') {
      const result = await sendSecurityAlertEmail(to, {
        clientName: 'Test Client',
        event: 'Withdrawal Address Whitelisted',
        asset: 'USDT',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD08',
        network: 'ETH',
        timestamp: timeStr,
        ipAddress: '192.168.1.1',
      });
      return NextResponse.json({ type: 'security', ...result });
    }

    return NextResponse.json({
      error: 'Invalid type. Available: trade, certificate, staking/leasing, yield, redemption, security',
    }, { status: 400 });
  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
