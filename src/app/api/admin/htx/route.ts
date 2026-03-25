// src/app/api/admin/htx/route.ts
// HTX Admin API - View balances, recent orders, exchange rates, trigger manual exchanges

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  getHTXBalances,
  getRecentTransactions,
  getTreasuryTotals,
  getExchangeRate,
  exchangeCryptoToUsd,
} from "@/lib/htx-treasury";
import { getMarketTicker } from "@/lib/htx-client";

// ============================================
// GET: View HTX balances, recent orders, exchange rates
// ============================================

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    // Fetch all data in parallel
    const [balances, recentTx, totals, btcRate, ethRate] = await Promise.allSettled([
      getHTXBalances(),
      getRecentTransactions(20),
      getTreasuryTotals(),
      getExchangeRate("BTC", "USDT"),
      getExchangeRate("ETH", "USDT"),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        balances: balances.status === "fulfilled" ? balances.value : [],
        recentTransactions:
          recentTx.status === "fulfilled" ? recentTx.value : [],
        treasuryTotals: totals.status === "fulfilled" ? totals.value : {},
        exchangeRates: {
          BTC_USDT:
            btcRate.status === "fulfilled"
              ? {
                  bid: btcRate.value.bid,
                  ask: btcRate.value.ask,
                  last: btcRate.value.last,
                }
              : null,
          ETH_USDT:
            ethRate.status === "fulfilled"
              ? {
                  bid: ethRate.value.bid,
                  ask: ethRate.value.ask,
                  last: ethRate.value.last,
                }
              : null,
        },
        timestamp: new Date().toISOString(),
      },
      errors: [
        balances.status === "rejected" ? `Balances: ${balances.reason}` : null,
        recentTx.status === "rejected" ? `Transactions: ${recentTx.reason}` : null,
        totals.status === "rejected" ? `Totals: ${totals.reason}` : null,
        btcRate.status === "rejected" ? `BTC rate: ${btcRate.reason}` : null,
        ethRate.status === "rejected" ? `ETH rate: ${ethRate.reason}` : null,
      ].filter(Boolean),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin HTX] GET error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Manually trigger exchange (e.g. swap all BTC to USDT)
// ============================================

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { action, crypto, amount } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Missing 'action' field" },
        { status: 400 }
      );
    }

    switch (action) {
      case "exchange": {
        // Manual exchange: swap specified crypto to USDT
        if (!crypto || !amount) {
          return NextResponse.json(
            { error: "Missing 'crypto' or 'amount' for exchange action" },
            { status: 400 }
          );
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          return NextResponse.json(
            { error: "Invalid amount" },
            { status: 400 }
          );
        }

        console.log(
          `[Admin HTX] Manual exchange triggered by ${auth.address}: ${numAmount} ${crypto} -> USDT`
        );

        const result = await exchangeCryptoToUsd(crypto, numAmount);

        return NextResponse.json({
          success: result.success,
          exchange: result,
          triggeredBy: auth.address,
          timestamp: new Date().toISOString(),
        });
      }

      case "exchange_all": {
        // Swap ALL of a specific crypto to USDT
        if (!crypto) {
          return NextResponse.json(
            { error: "Missing 'crypto' for exchange_all action" },
            { status: 400 }
          );
        }

        // Get current balance
        const balances = await getHTXBalances();
        const targetBalance = balances.find(
          (b) => b.currency.toLowerCase() === crypto.toLowerCase()
        );

        if (!targetBalance || targetBalance.available <= 0) {
          return NextResponse.json({
            success: false,
            error: `No available ${crypto.toUpperCase()} balance on HTX`,
            currentBalance: targetBalance || null,
          });
        }

        console.log(
          `[Admin HTX] Exchange ALL triggered by ${auth.address}: ${targetBalance.available} ${crypto} -> USDT`
        );

        const result = await exchangeCryptoToUsd(crypto, targetBalance.available);

        return NextResponse.json({
          success: result.success,
          exchange: result,
          triggeredBy: auth.address,
          timestamp: new Date().toISOString(),
        });
      }

      case "get_rate": {
        // Get current rate for a pair
        const from = body.from || crypto || "BTC";
        const to = body.to || "USDT";
        const rate = await getExchangeRate(from, to);

        return NextResponse.json({
          success: true,
          rate,
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Supported: exchange, exchange_all, get_rate`,
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[Admin HTX] POST error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
