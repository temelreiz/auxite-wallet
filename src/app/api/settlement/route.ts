// ============================================
// CASH SETTLEMENT API
// Custody unwind — LBMA spot - exit spread, T+1
// GET: config + user orders
// POST: action "quote" | "execute"
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import {
  isSettlementEnabled,
  createSettlementQuote,
  getSettlementQuote,
  getQuoteTimeRemaining,
  executeSettlement,
  getSettlementConfig,
  getUserSettlementOrders,
} from '@/lib/settlement-service';
import { getSettlementSpreadConfig } from '@/lib/settlement-spread';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'physicalredemption@auxite.io';

// ── GET: Settlement config + user orders ──
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  const config = await getSettlementConfig();
  const spreadConfig = await getSettlementSpreadConfig();

  let orders: any[] = [];
  if (address) {
    orders = await getUserSettlementOrders(address);
  }

  return NextResponse.json({
    success: true,
    config,
    spreadConfig,
    orders,
  });
}

// ── POST: Quote or Execute ──
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Check global enable
    if (!(await isSettlementEnabled())) {
      return NextResponse.json({ error: 'Cash settlement is currently unavailable' }, { status: 403 });
    }

    // ── ACTION: QUOTE ──
    if (action === 'quote') {
      const { address, metal, grams, rail } = body;

      if (!address || !metal || !grams) {
        return NextResponse.json({ error: 'Missing required fields: address, metal, grams' }, { status: 400 });
      }

      if (!['auxm', 'usdt'].includes(rail || 'auxm')) {
        return NextResponse.json({ error: 'Invalid settlement rail. Supported: auxm, usdt' }, { status: 400 });
      }

      const amt = parseFloat(grams);
      if (amt <= 0) {
        return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
      }

      try {
        const quote = await createSettlementQuote(address, metal, amt, rail || 'auxm');
        const timeRemaining = getQuoteTimeRemaining(quote);

        return NextResponse.json({
          success: true,
          quote: {
            id: quote.id,
            metal: quote.metal,
            grams: quote.grams,
            spotPricePerGram: quote.spotPricePerGram,
            exitSpreadPercent: quote.exitSpreadPercent,
            settlementPricePerGram: quote.settlementPricePerGram,
            totalSettlementUSD: quote.totalSettlementUSD,
            settlementRail: quote.settlementRail,
            timeRemaining,
            expiresAt: quote.expiresAt,
            oracleSource: quote.oracleSnapshot.source,
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // ── ACTION: EXECUTE ──
    if (action === 'execute') {
      const { quoteId } = body;

      if (!quoteId) {
        return NextResponse.json({ error: 'Missing quoteId' }, { status: 400 });
      }

      try {
        const order = await executeSettlement(quoteId);

        // Send admin notification email (non-blocking)
        try {
          await sendEmail({
            to: ADMIN_EMAIL,
            subject: `💰 Cash Settlement — ${order.grams}g ${order.metal} at $${order.settlementPricePerGram.toFixed(2)}/g [${order.id}]`,
            html: `
              <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 32px;background:#fafaf8;border:1px solid #e5e2dc">
                <div style="border-bottom:2px solid #2F6F62;padding-bottom:16px;margin-bottom:24px">
                  <h2 style="margin:0;font-size:18px;color:#1a1a1a;font-weight:600">Cash Settlement Executed</h2>
                  <p style="margin:4px 0 0;font-size:12px;color:#888;letter-spacing:0.05em">${new Date().toISOString()}</p>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:14px;color:#333">
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666;width:180px">Settlement ID</td>
                    <td style="padding:10px 0;font-family:monospace;color:#2F6F62;font-weight:600">${order.id}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Wallet</td>
                    <td style="padding:10px 0;font-family:monospace;font-size:12px">${order.address}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Metal</td>
                    <td style="padding:10px 0;font-weight:600">${order.metal}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Quantity</td>
                    <td style="padding:10px 0">${order.grams.toLocaleString()}g</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Spot Price</td>
                    <td style="padding:10px 0">$${order.spotPricePerGram.toFixed(2)}/g</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Exit Spread</td>
                    <td style="padding:10px 0">${order.exitSpreadPercent.toFixed(2)}%</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Settlement Price</td>
                    <td style="padding:10px 0;font-weight:700;color:#2F6F62">$${order.settlementPricePerGram.toFixed(2)}/g</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Total Proceeds</td>
                    <td style="padding:10px 0;font-weight:700;color:#2F6F62">$${order.totalSettlementUSD.toFixed(2)}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #e5e2dc">
                    <td style="padding:10px 0;font-weight:600;color:#666">Settlement Rail</td>
                    <td style="padding:10px 0">${order.settlementRail.toUpperCase()}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;font-weight:600;color:#666">Status</td>
                    <td style="padding:10px 0"><span style="background:#f59e0b;color:#fff;padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600">PRICE LOCKED — T+1</span></td>
                  </tr>
                </table>
                <div style="margin-top:24px;padding:14px 16px;background:#e8f5e9;border:1px solid rgba(47,111,98,0.2);border-radius:6px;font-size:13px;color:#2F6F62">
                  Settlement will auto-complete in ~24 hours (T+1). Metal has been deducted. Proceeds will be credited as ${order.settlementRail.toUpperCase()}.
                </div>
                <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e2dc;font-size:11px;color:#999">
                  Auxite Cash Settlement System · Aurum Ledger Ltd · Hong Kong
                </div>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error('Settlement notification email failed:', emailErr);
        }

        return NextResponse.json({
          success: true,
          order: {
            id: order.id,
            metal: order.metal,
            grams: order.grams,
            settlementPricePerGram: order.settlementPricePerGram,
            totalSettlementUSD: order.totalSettlementUSD,
            settlementRail: order.settlementRail,
            status: order.status,
            estimatedCompletion: 'T+1 (1 business day)',
            nonCancelable: true,
          },
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use "quote" or "execute".' }, { status: 400 });
  } catch (error: any) {
    console.error('Settlement API error:', error);
    return NextResponse.json({ error: error.message || 'Settlement failed' }, { status: 500 });
  }
}
