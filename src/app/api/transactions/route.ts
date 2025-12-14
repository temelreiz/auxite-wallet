import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type TransactionType = "deposit" | "withdraw" | "trade_buy" | "trade_sell" | "transfer_in" | "transfer_out";

interface Transaction {
  id: string;
  type: TransactionType;
  coin: string;
  amount: number;
  amountUsd: number;
  fee?: number;
  status: "pending" | "completed" | "failed";
  txHash?: string;
  fromAddress?: string;
  toAddress?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const type = searchParams.get("type");
  const coin = searchParams.get("coin");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  const normalizedAddress = address.toLowerCase();

  try {
    // Redis'ten transaction geçmişini çek
    const txKey = `user:${normalizedAddress}:transactions`;
    const rawTransactions = await redis.lrange(txKey, 0, -1);
    
    let transactions: Transaction[] = rawTransactions.map((tx: any) => {
      if (typeof tx === 'string') {
        return JSON.parse(tx);
      }
      return tx;
    });

    // Filtreler
    if (type) {
      const types = type.split(",");
      transactions = transactions.filter(t => types.includes(t.type));
    }
    if (coin) {
      transactions = transactions.filter(t => t.coin === coin.toUpperCase());
    }
    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }

    // Tarihe göre sırala (en yeni önce)
    transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const total = transactions.length;
    const paginatedTransactions = transactions.slice(offset, offset + limit);

    // Summary
    const summary = {
      totalTransactions: total,
      byType: {
        deposits: transactions.filter(t => t.type === "deposit").length,
        withdrawals: transactions.filter(t => t.type === "withdraw").length,
        trades: transactions.filter(t => t.type.startsWith("trade_")).length,
        transfers: transactions.filter(t => t.type.startsWith("transfer_")).length,
      },
      byStatus: {
        pending: transactions.filter(t => t.status === "pending").length,
        completed: transactions.filter(t => t.status === "completed").length,
        failed: transactions.filter(t => t.status === "failed").length,
      },
      totalVolume: transactions.reduce((sum, t) => sum + (t.amountUsd || 0), 0),
      totalFees: transactions.reduce((sum, t) => sum + (t.fee || 0), 0),
    };

    return NextResponse.json({
      address: normalizedAddress,
      transactions: paginatedTransactions,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary,
    });
  } catch (error) {
    console.error("Transaction history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions", transactions: [], pagination: { total: 0, limit, offset, hasMore: false } },
      { status: 200 }
    );
  }
}
