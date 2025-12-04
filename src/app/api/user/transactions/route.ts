// src/app/api/transactions/route.ts
// Auxite Wallet - Transaction History API with Redis

import { NextRequest, NextResponse } from "next/server";
import {
  getTransactions,
  addTransaction,
  type Transaction,
} from "@/lib/redis";

// Mock mode flag
const USE_MOCK = !process.env.UPSTASH_REDIS_REST_URL;

// Mock transactions
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_1",
    type: "deposit",
    token: "AUXM",
    amount: 1000,
    status: "completed",
    timestamp: Date.now() - 86400000,
    txHash: "0x1234...5678",
    metadata: { method: "bank_transfer" },
  },
  {
    id: "tx_2",
    type: "swap",
    fromToken: "AUXM",
    toToken: "AUXG",
    fromAmount: 500,
    toAmount: 5.85,
    status: "completed",
    timestamp: Date.now() - 172800000,
  },
  {
    id: "tx_3",
    type: "bonus",
    token: "AUXM",
    amount: 25,
    status: "completed",
    timestamp: Date.now() - 259200000,
    metadata: { reason: "welcome_bonus" },
  },
  {
    id: "tx_4",
    type: "swap",
    fromToken: "AUXM",
    toToken: "AUXS",
    fromAmount: 100,
    toAmount: 100.5,
    status: "completed",
    timestamp: Date.now() - 345600000,
  },
  {
    id: "tx_5",
    type: "withdraw",
    token: "AUXM",
    amount: 200,
    status: "completed",
    timestamp: Date.now() - 432000000,
    txHash: "0xabcd...ef01",
    metadata: { method: "bank_transfer", destination: "TR12..." },
  },
];

/**
 * GET - Transaction geçmişini al
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const type = searchParams.get("type"); // filter by type

  if (!address) {
    return NextResponse.json(
      { error: "Address parameter is required" },
      { status: 400 }
    );
  }

  try {
    let transactions: Transaction[];

    if (USE_MOCK) {
      transactions = MOCK_TRANSACTIONS;
    } else {
      transactions = await getTransactions(address, limit, offset);
    }

    // Type filter
    if (type) {
      transactions = transactions.filter((tx) => tx.type === type);
    }

    // Pagination için toplam sayı
    const total = transactions.length;

    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      transactions,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
      timestamp: Date.now(),
      source: USE_MOCK ? "mock" : "redis",
    });
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

/**
 * POST - Yeni transaction ekle (internal use only)
 */
export async function POST(request: NextRequest) {
  try {
    // API key kontrolü
    const apiKey = request.headers.get("x-api-key");
    if (apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { address, transaction } = body;

    if (!address || !transaction) {
      return NextResponse.json(
        { error: "Missing required fields: address, transaction" },
        { status: 400 }
      );
    }

    // Transaction validation
    const validTypes = ["deposit", "withdraw", "swap", "transfer", "bonus"];
    if (!validTypes.includes(transaction.type)) {
      return NextResponse.json(
        { error: `Invalid transaction type. Valid types: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (USE_MOCK) {
      const mockId = `tx_mock_${Date.now()}`;
      console.log(`[MOCK] Transaction added for ${address}:`, { id: mockId, ...transaction });
      return NextResponse.json({
        success: true,
        transactionId: mockId,
        message: "[MOCK] Transaction added",
        source: "mock",
      });
    }

    const transactionId = await addTransaction(address, {
      ...transaction,
      status: transaction.status || "pending",
    });

    return NextResponse.json({
      success: true,
      transactionId,
      message: "Transaction added successfully",
      source: "redis",
    });
  } catch (error) {
    console.error("Add transaction error:", error);
    return NextResponse.json(
      { error: "Failed to add transaction" },
      { status: 500 }
    );
  }
}
