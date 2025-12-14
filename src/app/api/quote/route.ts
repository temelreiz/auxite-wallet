// Quote API - Get locked prices for trades
import { NextRequest, NextResponse } from 'next/server';
import { createQuote, getQuote, getQuoteTimeRemaining } from '@/lib/quote-service';

// GET - Get existing quote
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const quoteId = searchParams.get('id');

  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
  }

  const quote = await getQuote(quoteId);
  
  if (!quote) {
    return NextResponse.json({ error: 'Quote expired or not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...quote,
    timeRemaining: getQuoteTimeRemaining(quote),
  });
}

// POST - Create new quote
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, metal, grams, address } = body;

    if (!type || !metal || !grams || !address) {
      return NextResponse.json({ 
        error: 'Missing parameters: type, metal, grams, address required' 
      }, { status: 400 });
    }

    const quote = await createQuote(type, metal, grams, address);

    return NextResponse.json({
      success: true,
      quote: {
        ...quote,
        timeRemaining: getQuoteTimeRemaining(quote),
      },
      message: `Fiyat 30 saniye kilitlendi`,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
