// Admin: Complete or Fail a settlement order
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-user';
import { completeSettlement, failSettlement } from '@/lib/settlement-service';
import { sendEmail } from '@/lib/email';


export async function POST(request: NextRequest) {
  try {
    // Auth check
    // ADMIN_TOKEN was never set in production, so this compared against a
    // default that is in this public repository. Use the admin session.
    const admin = await requireAdmin(request);
    if (!admin.ok) return admin.response;

    const { orderId, action, reason } = await request.json();

    if (!orderId || !action) {
      return NextResponse.json({ error: 'Missing orderId or action' }, { status: 400 });
    }

    if (action === 'complete') {
      const order = await completeSettlement(orderId);

      // Send completion email to admin
      try {
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'physicalredemption@auxite.io',
          subject: `✅ Settlement Completed — ${order.id}`,
          html: `
            <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#fafaf8;border:1px solid #e5e2dc">
              <h2 style="margin:0 0 16px;font-size:16px;color:#1a1a1a">Settlement Completed</h2>
              <p style="font-size:14px;color:#333;margin:0">
                <strong>${order.id}</strong> — ${order.grams}g ${order.metal}<br/>
                $${order.totalSettlementUSD.toFixed(2)} ${order.settlementRail.toUpperCase()} credited to ${order.address.slice(0, 10)}...
              </p>
              <div style="margin-top:16px;font-size:11px;color:#999">Auxite Cash Settlement System</div>
            </div>
          `,
        });
      } catch {}

      return NextResponse.json({ success: true, order });
    }

    if (action === 'fail') {
      const order = await failSettlement(orderId, reason || 'Admin rejected');
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json({ error: 'Invalid action. Use "complete" or "fail".' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
