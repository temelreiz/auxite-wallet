// app/api/transactions/export/route.ts
// Transaction Export - CSV export

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

interface Transaction {
  id: string;
  type: "buy" | "sell" | "deposit" | "withdraw" | "exchange" | "stake" | "unstake" | "transfer";
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  price?: number;
  fee?: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  txHash?: string;
  createdAt: number;
  completedAt?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("address");
    const format = searchParams.get("format") || "csv";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type");
    const lang = (searchParams.get("lang") || "en") as "tr" | "en";

    if (!walletAddress) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    // İşlemleri getir
    const txKey = `transactions:${walletAddress.toLowerCase()}`;
    let transactions = await redis.lrange(txKey, 0, -1) as Transaction[];

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({ error: "No transactions found" }, { status: 404 });
    }

    // Filtreleme
    if (startDate) {
      const start = new Date(startDate).getTime();
      transactions = transactions.filter((tx) => tx.createdAt >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000; // End of day
      transactions = transactions.filter((tx) => tx.createdAt <= end);
    }
    if (type && type !== "all") {
      transactions = transactions.filter((tx) => tx.type === type);
    }

    // Tarihe göre sırala (eskiden yeniye)
    transactions.sort((a, b) => a.createdAt - b.createdAt);

    if (format === "csv") {
      const csv = generateCSV(transactions, lang);
      const filename = `auxite_transactions_${walletAddress.slice(0, 8)}_${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (format === "json") {
      return NextResponse.json({
        transactions,
        count: transactions.length,
        exportedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error: any) {
    console.error("Transaction export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateCSV(transactions: Transaction[], lang: "tr" | "en"): string {
  const isTr = lang === "tr";

  // CSV Headers
  const headers = isTr
    ? ["Tarih", "Tür", "Giden Varlık", "Giden Miktar", "Gelen Varlık", "Gelen Miktar", "Fiyat", "Ücret", "Durum", "İşlem Hash"]
    : ["Date", "Type", "From Asset", "From Amount", "To Asset", "To Amount", "Price", "Fee", "Status", "TX Hash"];

  // Type translations
  const typeLabels: Record<string, { tr: string; en: string }> = {
    buy: { tr: "Alım", en: "Buy" },
    sell: { tr: "Satım", en: "Sell" },
    deposit: { tr: "Yatırım", en: "Deposit" },
    withdraw: { tr: "Çekim", en: "Withdrawal" },
    exchange: { tr: "Dönüşüm", en: "Exchange" },
    stake: { tr: "Stake", en: "Stake" },
    unstake: { tr: "Unstake", en: "Unstake" },
    transfer: { tr: "Transfer", en: "Transfer" },
  };

  // Status translations
  const statusLabels: Record<string, { tr: string; en: string }> = {
    pending: { tr: "Beklemede", en: "Pending" },
    completed: { tr: "Tamamlandı", en: "Completed" },
    failed: { tr: "Başarısız", en: "Failed" },
    cancelled: { tr: "İptal", en: "Cancelled" },
  };

  // Generate rows
  const rows = transactions.map((tx) => {
    const date = new Date(tx.createdAt).toLocaleString(isTr ? "tr-TR" : "en-US");
    const type = typeLabels[tx.type]?.[lang] || tx.type;
    const status = statusLabels[tx.status]?.[lang] || tx.status;

    return [
      date,
      type,
      tx.fromAsset || "-",
      tx.fromAmount?.toString() || "-",
      tx.toAsset || "-",
      tx.toAmount?.toString() || "-",
      tx.price?.toString() || "-",
      tx.fee?.toString() || "-",
      status,
      tx.txHash || "-",
    ];
  });

  // Build CSV
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => {
        // Escape commas and quotes
        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(",")
    ),
  ].join("\n");

  // Add BOM for Excel compatibility with Turkish characters
  return "\uFEFF" + csvContent;
}

// POST - Generate report with options
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, startDate, endDate, types, format = "csv", lang = "en" } = body;

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress required" }, { status: 400 });
    }

    // Build URL with params
    const url = new URL("/api/transactions/export", request.url);
    url.searchParams.set("address", walletAddress);
    url.searchParams.set("format", format);
    url.searchParams.set("lang", lang);
    if (startDate) url.searchParams.set("startDate", startDate);
    if (endDate) url.searchParams.set("endDate", endDate);
    if (types && types.length > 0) url.searchParams.set("type", types.join(","));

    // Redirect to GET
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("Transaction export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
