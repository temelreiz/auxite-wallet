// app/api/notifications/email/route.ts
// Email Notification API - Simplified
import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { sendEmail, sendCertificateEmail, sendStakingAgreementEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

// POST - Send notification email
export async function POST(request: NextRequest) {
  try {
    const { type, to, data } = await request.json();

    if (!to || !type) {
      return NextResponse.json({ error: 'to and type required' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'certificate':
        result = await sendCertificateEmail(to, '', {
          certificateNumber: data.certificateNumber,
          metal: data.metal,
          metalName: data.metalName,
          grams: data.grams,
          holderName: data.holderName,
        });
        break;

      case 'staking':
        result = await sendStakingAgreementEmail(to, '', {
          agreementNo: data.agreementNo,
          stakeId: data.stakeId,
          metal: data.metal,
          metalName: data.metalName,
          amount: data.amount,
          termLabel: data.termLabel,
          apy: data.apy,
          startDate: data.startDate,
          endDate: data.endDate,
          holderName: data.holderName,
        });
        break;

      case 'custom':
        result = await sendEmail({
          to,
          subject: data.subject || 'Auxite Notification',
          html: data.html || data.message || '',
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Notification email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
