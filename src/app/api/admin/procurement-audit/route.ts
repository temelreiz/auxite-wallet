// src/app/api/admin/procurement-audit/route.ts
//
// Read only view of the metal procurement records, to check them against the bank
// account. It never runs the procurement queue, unlike /api/cron/procure. A bank
// reference here only proves the API answered: while the bank URL points at the test
// gateway, no order reached the real account.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/require-user";
import {
  listProcurementOrders,
  PROCUREMENT_LISTS,
  ProcurementOrder,
} from "@/lib/procurement-service";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const DEFAULT_BANK_URL = "https://prep-gateway.kuveytturk.com.tr";

function bankEnvironment(): "test" | "live" {
  const url = process.env.KUVEYTTURK_BASE_URL || DEFAULT_BANK_URL;
  return /prep|test|sandbox/i.test(url) ? "test" : "live";
}

type ReferenceKind = "bank" | "generated" | "manual_pending" | "none";

function referenceKind(order: ProcurementOrder): ReferenceKind {
  const reference = order.ktPurchase?.referenceId;
  if (!reference) return "none";
  if (reference === "MANUAL_PENDING") return "manual_pending";
  // The pipeline makes up a KT-<time> reference when the bank returned none.
  return reference.startsWith("KT-") ? "generated" : "bank";
}

function presentOrder(order: ProcurementOrder) {
  const last = order.statusHistory?.[order.statusHistory.length - 1];
  return {
    id: order.id,
    tradeId: order.tradeId,
    status: order.status,
    metal: order.metal,
    grams: order.metalGrams,
    fromToken: order.fromToken,
    fromAmount: order.fromAmount,
    chargedUsd: order.fromValueUSD,
    chargedPerGram: order.tradePricePerGram,
    createdAt: order.createdAt,
    completedAt: order.completedAt ?? null,
    retryCount: order.retryCount,
    lastError: order.lastError ?? null,
    lastNote: last?.note ?? null,
    cryptoSale: order.cryptoConversion
      ? {
          exchange: order.cryptoConversion.exchange,
          orderId: order.cryptoConversion.orderId ?? null,
          soldAmount: order.cryptoConversion.soldAmount,
          receivedUsdt: order.cryptoConversion.receivedUSDT,
        }
      : null,
    bankPurchase: order.ktPurchase
      ? {
          referenceId: order.ktPurchase.referenceId,
          referenceKind: referenceKind(order),
          ratePerGramTl: order.ktPurchase.rateTLPerGram,
          totalTl: order.ktPurchase.totalTL,
          completedAt: order.ktPurchase.completedAt,
        }
      : null,
  };
}

function summarize(orders: ProcurementOrder[]) {
  const gramsByMetal: Record<string, number> = {};
  const references: Record<ReferenceKind, number> = { bank: 0, generated: 0, manual_pending: 0, none: 0 };
  let chargedUsd = 0;
  let cryptoSales = 0;
  let cryptoSaleUsdt = 0;
  for (const order of orders) {
    gramsByMetal[order.metal] = (gramsByMetal[order.metal] || 0) + (order.metalGrams || 0);
    references[referenceKind(order)]++;
    chargedUsd += order.fromValueUSD || 0;
    if (order.cryptoConversion) {
      cryptoSales++;
      cryptoSaleUsdt += order.cryptoConversion.receivedUSDT || 0;
    }
  }
  return { gramsByMetal, chargedUsd, cryptoSales, cryptoSaleUsdt, references };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.response;

  const requested = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_LIMIT) : DEFAULT_LIMIT;

  const results = await Promise.all(PROCUREMENT_LISTS.map((list) => listProcurementOrders(list, limit)));
  const lists = Object.fromEntries(
    PROCUREMENT_LISTS.map((list, index) => {
      const { total, orders } = results[index];
      return [
        list,
        {
          total,
          returned: orders.length,
          summary: summarize(orders),
          orders: orders.map(presentOrder),
        },
      ];
    }),
  );

  return NextResponse.json({
    bankEnvironment: bankEnvironment(),
    limit,
    readAt: new Date().toISOString(),
    lists,
  });
}
