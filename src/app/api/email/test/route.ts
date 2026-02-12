// app/api/email/test/route.ts
// Institutional Email Test Endpoint — All templates
import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import {
  sendTradeExecutionEmail,
  sendCertificateEmail,
  sendStakingAgreementEmail,
  sendYieldDistributionEmail,
  sendRedemptionInitiatedEmail,
  sendSecurityAlertEmail,
} from '@/lib/email';
import {
  sendDepositConfirmedEmail,
  sendWithdrawConfirmedEmail,
  sendTransferSentEmail,
  sendTransferReceivedEmail,
} from '@/lib/email-service';

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
      const certNumber = `AUX-CERT-${now.getFullYear()}-TEST01`;
      const serialNumber = `BAR-${Date.now().toString().slice(-8)}`;

      // Create temporary certificate record in Redis so the "View Certificate" link works
      const certKey = `certificate:${certNumber}`;
      const certData: Record<string, string> = {
        certificateNumber: certNumber,
        userUid: 'TEST-CLIENT-001',
        metal: 'AUXG',
        grams: '2500.0000',
        purity: '999.9',
        vault: 'ZH',
        vaultName: 'Zurich',
        serialNumber: serialNumber,
        issuedAt: now.toISOString(),
        holderName: 'Test Client',
      };

      // Set with 24-hour TTL — auto-cleanup for test data
      for (const [field, value] of Object.entries(certData)) {
        await redis.hset(certKey, { [field]: value });
      }
      await redis.expire(certKey, 86400); // 24 saat

      const result = await sendCertificateEmail(to, '', {
        certificateNumber: certNumber,
        metal: 'AUXG',
        metalName: 'Gold',
        grams: '2500.0000',
        purity: '999.9',
        vaultLocation: 'Zurich',
        holderName: 'Test Client',
      });
      return NextResponse.json({ type: 'certificate', certNumber, ...result });
    }

    // 3. Yield Enrollment (Leasing Participation)
    if (type === 'staking' || type === 'leasing') {
      const stakeId = 'TEST-STAKE-001';
      const noteId = `YLD-${now.getFullYear()}-TEST01`;
      const endDate = new Date(Date.now() + 182 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create temporary stake record in Redis so the "View Participation Note" link works
      const stakeKey = `stake:${stakeId}`;
      const stakeData: Record<string, string> = {
        id: stakeId,
        noteId: noteId,
        userUid: 'TEST-CLIENT-001',
        metal: 'AUXG',
        amount: '5000.0000',
        lockDays: '181',
        apy: '3.40',
        startDate: now.toISOString(),
        endDate: new Date(Date.now() + 182 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: now.toISOString(),
        vault: 'ZH',
        status: 'active',
      };

      for (const [field, value] of Object.entries(stakeData)) {
        await redis.hset(stakeKey, { [field]: value });
      }
      await redis.expire(stakeKey, 86400); // 24 saat TTL

      const result = await sendStakingAgreementEmail(to, '', {
        agreementNo: noteId,
        stakeId,
        metal: 'AUXG',
        metalName: 'Gold',
        amount: '5000.0000',
        termLabel: '6 Months',
        apy: '3.40',
        startDate: dateStr,
        endDate,
        holderName: 'Test Client',
      });
      return NextResponse.json({ type: 'leasing', stakeId, noteId, ...result });
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

    // 7. Deposit Confirmed
    if (type === 'deposit') {
      const result = await sendDepositConfirmedEmail(to, 'Test Client', '10,000.00', 'USDT', '0xabc123def456...', 'en');
      return NextResponse.json({ type: 'deposit', ...result });
    }

    // 8. Withdraw Confirmed
    if (type === 'withdraw') {
      const result = await sendWithdrawConfirmedEmail(to, 'Test Client', '5,000.00', 'USDT', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD08', '0xdef789abc012...', '2.50 USDT', 'en');
      return NextResponse.json({ type: 'withdraw', ...result });
    }

    // 9. Transfer Sent
    if (type === 'transfer-sent') {
      const result = await sendTransferSentEmail(to, 'Test Client', '1,250.00', 'USDT', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD08', 'en');
      return NextResponse.json({ type: 'transfer-sent', ...result });
    }

    // 10. Transfer Received
    if (type === 'transfer-received') {
      const result = await sendTransferReceivedEmail(to, 'Test Client', '1,250.00', 'USDT', '0x912d35Cc6634C0532925a3b844Bc9e7595f2bD08', 'en');
      return NextResponse.json({ type: 'transfer-received', ...result });
    }

    return NextResponse.json({
      error: 'Invalid type. Available: trade, certificate, staking/leasing, yield, redemption, security, deposit, withdraw, transfer-sent, transfer-received',
    }, { status: 400 });
  } catch (error: any) {
    console.error('Email test error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
