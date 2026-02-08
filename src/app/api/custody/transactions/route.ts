// src/app/api/custody/transactions/route.ts
// Transaction History API - Capital Ledger

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  initializeCustody,
  getVaultByUserId,
  getTransactions,
} from '@/lib/custody';

const JWT_SECRET = process.env.JWT_SECRET!;

// ============================================
// GET - Get transaction history
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    // Get query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    // Initialize custody adapters
    await initializeCustody();

    // Get user's vault
    const vault = await getVaultByUserId(decoded.userId);

    if (!vault) {
      return NextResponse.json({
        success: true,
        transactions: [],
        message: 'No vault found',
      });
    }

    // Get transactions
    const transactions = await getTransactions(vault.id, limit);

    // Format for Capital Ledger display
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      event: tx.type,
      asset: tx.asset,
      network: tx.network,
      amount: tx.amount,
      amountUsd: tx.amountUsd,
      status: tx.status,
      fromAddress: tx.fromAddress,
      toAddress: tx.toAddress,
      txHash: tx.txHash,
      confirmations: tx.confirmations,
      requiredConfirmations: tx.requiredConfirmations,
      fee: tx.fee,
      feeAsset: tx.feeAsset,
      timestamp: tx.createdAt,
      settledAt: tx.settledAt,
      referenceId: tx.externalId,
    }));

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: transactions.length,
    });
  } catch (error: any) {
    console.error('Get transactions error:', error);

    if (error.name === 'JsonWebTokenError') {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get transactions' },
      { status: 500 }
    );
  }
}
