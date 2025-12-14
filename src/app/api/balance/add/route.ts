// src/app/api/balance/add/route.ts
// Test/Admin endpoint to add balance

import { NextRequest, NextResponse } from 'next/server';
import { incrementBalance, getUserBalance, setBalance } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    // Development only check (optional - remove for admin use)
    // if (process.env.NODE_ENV === 'production') {
    //   return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    // }

    const body = await request.json();
    const { address, token, amount } = body;

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }
    if (amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Amount required' }, { status: 400 });
    }

    const validTokens = ['auxm', 'bonusAuxm', 'auxg', 'auxs', 'auxpt', 'auxpd', 'eth', 'btc', 'xrp', 'sol', 'usdt', 'usd'];
    const tokenLower = token.toLowerCase();
    
    if (!validTokens.includes(tokenLower)) {
      return NextResponse.json({ error: `Invalid token. Use: ${validTokens.join(', ')}` }, { status: 400 });
    }

    // Add balance
    const success = await incrementBalance(address, { [tokenLower]: parseFloat(amount) });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
    }

    // Get updated balance
    const newBalance = await getUserBalance(address);

    return NextResponse.json({
      success: true,
      message: `Added ${amount} ${token.toUpperCase()} to ${address}`,
      balance: newBalance,
    });

  } catch (error: any) {
    console.error('POST /api/balance/add error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add balance' },
      { status: 500 }
    );
  }
}

// GET - Check balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const balance = await getUserBalance(address);

    return NextResponse.json({
      success: true,
      address,
      balance,
    });

  } catch (error: any) {
    console.error('GET /api/balance/add error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get balance' },
      { status: 500 }
    );
  }
}
