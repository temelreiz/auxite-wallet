// src/app/api/user/transactions/route.ts
// Transaction History API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const typeFilter = searchParams.get("type"); // comma-separated types

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const normalizedAddress = address.toLowerCase();
    const txKey = `user:${normalizedAddress}:transactions`;

    // Get all transactions
    const rawTransactions = await redis.lrange(txKey, 0, -1);
    
    let transactions = rawTransactions.map((tx: any) => {
      try {
        return typeof tx === 'string' ? JSON.parse(tx) : tx;
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Calculate summary before filtering
    const summary = {
      total: transactions.length,
      deposits: transactions.filter((t: any) => t.type === 'deposit').length,
      withdrawals: transactions.filter((t: any) => t.type === 'withdraw').length,
      trades: transactions.filter((t: any) => ['buy', 'sell', 'trade_buy', 'trade_sell', 'exchange', 'swap'].includes(t.type)).length,
      transfers: transactions.filter((t: any) => ['transfer_in', 'transfer_out'].includes(t.type)).length,
      stakes: transactions.filter((t: any) => ['stake', 'unstake'].includes(t.type)).length,
    };

    // Filter by type if specified
    if (typeFilter) {
      const types = typeFilter.split(',').map(t => t.trim());
      transactions = transactions.filter((tx: any) => {
        // Map some types
        const txType = tx.type;
        if (types.includes(txType)) return true;
        // Handle trade filter
        if (types.includes('trade_buy') && txType === 'buy') return true;
        if (types.includes('trade_sell') && txType === 'sell') return true;
        if (types.includes('exchange') && txType === 'swap') return true;
        return false;
      });
    }

    // Sort by timestamp descending (newest first)
    transactions.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    // Paginate
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    return NextResponse.json({
      success: true,
      transactions: paginatedTransactions,
      summary,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error: any) {
    console.error("Transactions API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
