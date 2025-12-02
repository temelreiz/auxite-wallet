import { NextRequest, NextResponse } from "next/server";

// Redis bağlantısı için (production'da gerçek Redis kullanılacak)
// import { Redis } from "@upstash/redis";
// const redis = new Redis({ url: process.env.REDIS_URL!, token: process.env.REDIS_TOKEN! });

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

// Mock transactions
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_001",
    type: "deposit",
    coin: "ETH",
    amount: 0.1,
    amountUsd: 300,
    status: "completed",
    txHash: "0x2eb99ad0b38f9613d7c422674cae82af96543bd98aebe2070a8559754deaa5c7",
    fromAddress: "0xC7AF91293dC7dF3DdF0bF0dDD14AaA96aE63BD4E",
    toAddress: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6",
    metadata: { chain: "BASE", auxmAmount: 300 },
    createdAt: "2024-12-01T10:30:00Z",
    completedAt: "2024-12-01T10:35:00Z",
  },
  {
    id: "tx_002",
    type: "trade_buy",
    coin: "AUXG",
    amount: 2.5,
    amountUsd: 231.25,
    fee: 0.23,
    status: "completed",
    metadata: { metalPrice: 92.50, auxmSpent: 231.48 },
    createdAt: "2024-12-01T11:00:00Z",
    completedAt: "2024-12-01T11:00:01Z",
  },
  {
    id: "tx_003",
    type: "trade_sell",
    coin: "AUXS",
    amount: 100,
    amountUsd: 105,
    fee: 0.11,
    status: "completed",
    metadata: { metalPrice: 1.05, auxmReceived: 104.89 },
    createdAt: "2024-12-01T11:30:00Z",
    completedAt: "2024-12-01T11:30:01Z",
  },
  {
    id: "tx_004",
    type: "withdraw",
    coin: "ETH",
    amount: 0.05,
    amountUsd: 150,
    fee: 5,
    status: "pending",
    toAddress: "0xABC123...",
    metadata: { cryptoAmount: 0.0483, cryptoPrice: 3000 },
    createdAt: "2024-12-01T12:00:00Z",
  },
  {
    id: "tx_005",
    type: "deposit",
    coin: "BTC",
    amount: 0.005,
    amountUsd: 475,
    status: "pending",
    txHash: "abc123...",
    fromAddress: "bc1qxyz...",
    toAddress: "1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume",
    metadata: { chain: "BTC", confirmations: 2, required: 3 },
    createdAt: "2024-12-01T12:30:00Z",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const type = searchParams.get("type"); // deposit, withdraw, trade_buy, trade_sell, transfer
  const coin = searchParams.get("coin");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  const normalizedAddress = address.toLowerCase();

  try {
    // TODO: Redis'ten transaction geçmişini çek
    // const txIds = await redis.lrange(
    //   `user:${normalizedAddress}:transactions`,
    //   0, -1
    // );
    // 
    // let transactions = await Promise.all(
    //   txIds.map(id => redis.hgetall(`transaction:${id}`))
    // );

    // Mock response
    let transactions = [...MOCK_TRANSACTIONS];

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

    if (startDate) {
      const start = new Date(startDate);
      transactions = transactions.filter(t => new Date(t.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      transactions = transactions.filter(t => new Date(t.createdAt) <= end);
    }

    // Tarihe göre sırala (en yeni önce)
    transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Pagination
    const total = transactions.length;
    const paginatedTx = transactions.slice(offset, offset + limit);

    // Özet istatistikler
    const summary = {
      totalTransactions: total,
      byType: {
        deposits: transactions.filter(t => t.type === "deposit").length,
        withdrawals: transactions.filter(t => t.type === "withdraw").length,
        trades: transactions.filter(t => t.type.startsWith("trade")).length,
        transfers: transactions.filter(t => t.type.startsWith("transfer")).length,
      },
      byStatus: {
        pending: transactions.filter(t => t.status === "pending").length,
        completed: transactions.filter(t => t.status === "completed").length,
        failed: transactions.filter(t => t.status === "failed").length,
      },
      totalVolume: transactions
        .filter(t => t.status === "completed")
        .reduce((sum, t) => sum + t.amountUsd, 0),
      totalFees: transactions
        .filter(t => t.status === "completed" && t.fee)
        .reduce((sum, t) => sum + (t.fee || 0), 0),
    };

    return NextResponse.json({
      address: normalizedAddress,
      transactions: paginatedTx,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      summary,
    });

  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// Transaction kaydı (internal use)
export async function POST(request: NextRequest) {
  try {
    // API key kontrolü
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      userAddress,
      type,
      coin,
      amount,
      amountUsd,
      fee,
      status,
      txHash,
      fromAddress,
      toAddress,
      metadata,
    } = body;

    if (!userAddress || !type || !coin || amount === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedAddress = userAddress.toLowerCase();
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction: Transaction = {
      id: txId,
      type,
      coin,
      amount,
      amountUsd: amountUsd || 0,
      fee,
      status: status || "pending",
      txHash,
      fromAddress,
      toAddress,
      metadata,
      createdAt: new Date().toISOString(),
    };

    if (transaction.status === "completed") {
      transaction.completedAt = new Date().toISOString();
    }

    // TODO: Redis'e transaction kaydı ekle
    // await redis.hset(`transaction:${txId}`, transaction);
    // await redis.lpush(`user:${normalizedAddress}:transactions`, txId);

    console.log("Transaction recorded:", transaction);

    return NextResponse.json({
      success: true,
      transaction,
    });

  } catch (error) {
    console.error("Transaction record error:", error);
    return NextResponse.json(
      { error: "Failed to record transaction" },
      { status: 500 }
    );
  }
}
