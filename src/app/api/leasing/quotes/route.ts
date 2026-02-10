// ============================================
// LEASING QUOTES API — Auxite Metal Leasing Engine
// GET: Active quotes by metal+tenor
// POST: Admin submits new quote (manual OTC entry)
// DELETE: Withdraw quote
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
  submitQuote,
  getActiveQuotes,
  withdrawQuote,
  getQuoteById,
  getAllActiveQuotesSummary,
  expireStaleQuotes,
} from '@/lib/leasing/counterparty-manager';

// GET — Fetch active quotes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metal = searchParams.get('metal');
    const tenor = searchParams.get('tenor');
    const summary = searchParams.get('summary');

    // If summary requested, return all active quotes summary
    if (summary === 'true') {
      const summaryData = await getAllActiveQuotesSummary();
      return NextResponse.json({ success: true, summary: summaryData });
    }

    // If metal+tenor specified, return specific quotes
    if (metal && tenor) {
      const quotes = await getActiveQuotes(metal, tenor);
      return NextResponse.json({
        success: true,
        metal,
        tenor,
        quotes,
        count: quotes.length,
      });
    }

    // Return all quotes across metals and tenors
    const metals = ['AUXG', 'AUXS', 'AUXPT', 'AUXPD'];
    const tenors = ['3M', '6M', '12M'];
    const allQuotes: Record<string, Record<string, any[]>> = {};

    for (const m of metals) {
      allQuotes[m] = {};
      for (const t of tenors) {
        allQuotes[m][t] = await getActiveQuotes(m, t);
      }
    }

    return NextResponse.json({
      success: true,
      quotes: allQuotes,
    });
  } catch (error: any) {
    console.error('Leasing quotes GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Submit new quote or expire stale quotes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // Admin: expire stale quotes
    if (action === 'expire_stale') {
      const count = await expireStaleQuotes();
      return NextResponse.json({
        success: true,
        message: `Expired ${count} stale quotes`,
        expiredCount: count,
      });
    }

    // Submit new quote
    const {
      counterpartyId,
      counterpartyName,
      metal,
      tenor,
      ratePercent,
      validHours,
      minSizeOz,
      maxSizeOz,
      collateralType,
      haircut,
      createdBy,
    } = body;

    if (!counterpartyId || !metal || !tenor || !ratePercent) {
      return NextResponse.json(
        { error: 'counterpartyId, metal, tenor, and ratePercent are required' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const validUntil = now + ((validHours || 24) * 60 * 60 * 1000);

    const quote = await submitQuote({
      counterpartyId,
      counterpartyName: counterpartyName || 'Unknown',
      metal: metal.toUpperCase(),
      tenor: tenor.toUpperCase(),
      tenorDays: 0, // Will be calculated by submitQuote
      ratePercent: parseFloat(ratePercent),
      validUntil,
      minSizeOz: minSizeOz || 0,
      maxSizeOz: maxSizeOz || 10000,
      collateralType: collateralType || 'metal_for_metal',
      haircut: haircut || 5,
      createdBy: createdBy || 'admin',
      source: 'manual',
    });

    return NextResponse.json({
      success: true,
      quote,
      message: `Quote submitted: ${ratePercent}% for ${metal}/${tenor}`,
    });
  } catch (error: any) {
    console.error('Leasing quotes POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE — Withdraw a quote
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');

    if (!quoteId) {
      return NextResponse.json({ error: 'quoteId required' }, { status: 400 });
    }

    const success = await withdrawQuote(quoteId);

    if (!success) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Quote ${quoteId} withdrawn`,
    });
  } catch (error: any) {
    console.error('Leasing quotes DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
