// src/app/api/admin/fees/route.ts
// Platform Fee Management API

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { kv } from "@vercel/kv";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Admin authentication - supports both ADMIN_SECRET and session token
const ADMIN_SECRET = process.env.ADMIN_SECRET || "auxite-admin-secret";

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;
  
  const token = authHeader.replace("Bearer ", "");
  
  // Check direct ADMIN_SECRET
  if (token === ADMIN_SECRET) return true;
  
  // Check session token from Vercel KV (admin panel login)
  try {
    const session = await kv.get(`admin:session:${token}`);
    if (session) return true;
  } catch (e) {
    console.error("Session check error:", e);
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET - Get all platform fees
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token"); // Optional: filter by token

    // Fee tokens to check
    const feeTokens = ["auxm", "eth", "usd", "usdt", "btc", "xrp", "sol", "auxg", "auxs", "auxpt", "auxpd"];
    
    const fees: Record<string, any> = {};
    let totalValueUsd = 0;

    // Approximate USD prices for calculation
    const prices: Record<string, number> = {
      auxm: 1,
      usd: 1,
      usdt: 1,
      eth: 2900,
      btc: 95000,
      xrp: 2.3,
      sol: 200,
      auxg: 95,
      auxs: 1.1,
      auxpt: 32,
      auxpd: 35,
    };

    for (const t of feeTokens) {
      if (token && t !== token.toLowerCase()) continue;

      const feeData = await redis.hgetall(`platform:fees:${t}`);
      const count = await redis.hget("platform:fees:count", t);

      if (feeData && Object.keys(feeData).length > 0) {
        const total = parseFloat(feeData.total as string || "0");
        const pending = parseFloat(feeData.pending as string || "0");
        const transferred = parseFloat(feeData.transferred as string || "0");
        const valueUsd = total * (prices[t] || 1);

        fees[t.toUpperCase()] = {
          total,
          pending,
          transferred,
          transactionCount: parseInt(count as string || "0"),
          valueUsd: parseFloat(valueUsd.toFixed(2)),
        };

        totalValueUsd += valueUsd;
      }
    }

    // Get transfer history
    const transferHistory = await redis.lrange("platform:fees:transfers", 0, 19);
    const parsedHistory = transferHistory.map((item: any) => {
      try {
        return typeof item === "string" ? JSON.parse(item) : item;
      } catch {
        return item;
      }
    });

    return NextResponse.json({
      success: true,
      fees,
      summary: {
        totalValueUsd: parseFloat(totalValueUsd.toFixed(2)),
        tokenCount: Object.keys(fees).length,
      },
      recentTransfers: parsedHistory,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Admin fees error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST - Mark fees as transferred to Ledger OR transfer to user wallet OR mint
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  if (!await isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, token, amount, ledgerAddress, txHash, note, toAddress } = body;

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Send REAL on-chain crypto from hot wallet to any address
    // Supports: ETH, USDT, XRP, SOL, BTC
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'sendOnChain' || action === 'sendReal') {
      if (!toAddress || !token || !amount || amount <= 0) {
        return NextResponse.json({ error: "toAddress, token, and positive amount required" }, { status: 400 });
      }

      const supportedTokens = ['ETH', 'USDT', 'XRP', 'SOL', 'BTC'];
      const tokenUpper = token.toUpperCase();

      if (!supportedTokens.includes(tokenUpper)) {
        return NextResponse.json({
          error: `Token not supported for on-chain transfer. Supported: ${supportedTokens.join(', ')}`,
          supported: supportedTokens
        }, { status: 400 });
      }

      try {
        // Import blockchain service
        const { processWithdraw } = await import("@/lib/blockchain-service");

        console.log(`🚀 Admin sending REAL ${tokenUpper}: ${amount} to ${toAddress}`);

        // Process the actual blockchain transfer
        const result = await processWithdraw(tokenUpper, toAddress, parseFloat(amount.toString()));

        if (!result.success) {
          return NextResponse.json({
            success: false,
            error: result.error || "On-chain transfer failed",
            token: tokenUpper,
            amount,
            toAddress
          }, { status: 500 });
        }

        // Record transfer in history
        const transfer = {
          id: `onchain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "onChainTransfer",
          token: tokenUpper,
          amount,
          toAddress,
          txHash: result.txHash,
          fee: result.fee || 0,
          note: note || "Admin on-chain transfer from hot wallet",
          timestamp: Date.now(),
          date: new Date().toISOString(),
        };

        await redis.lpush("platform:fees:transfers", JSON.stringify(transfer));
        await redis.ltrim("platform:fees:transfers", 0, 99);

        return NextResponse.json({
          success: true,
          message: `Successfully sent ${amount} ${tokenUpper} on-chain to ${toAddress}`,
          transfer,
          txHash: result.txHash,
          networkFee: result.fee,
        });
      } catch (error: any) {
        console.error("On-chain transfer error:", error);
        return NextResponse.json({
          success: false,
          error: error.message || "On-chain transfer failed",
          token: tokenUpper,
          amount,
          toAddress
        }, { status: 500 });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Mint/Add balance to any wallet (no fee source required)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'mintToWallet' || action === 'addBalance') {
      if (!toAddress || !token || !amount || amount <= 0) {
        return NextResponse.json({ error: "toAddress, token, and positive amount required" }, { status: 400 });
      }

      const tokenLower = token.toLowerCase();
      const userBalanceKey = `user:${toAddress.toLowerCase()}:balance`;

      // Get current balance
      const currentBalance = parseFloat(await redis.hget(userBalanceKey, tokenLower) as string || "0");

      // Add to user's balance
      await redis.hincrbyfloat(userBalanceKey, tokenLower, amount);

      // Record transfer
      const transfer = {
        id: `admin_mint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "adminMint",
        token: token.toUpperCase(),
        amount,
        toAddress: toAddress.toLowerCase(),
        note: note || "Admin mint/transfer",
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };

      await redis.lpush("platform:fees:transfers", JSON.stringify(transfer));
      await redis.ltrim("platform:fees:transfers", 0, 99);

      // Also record in user's transaction history
      const userTx = {
        type: "deposit",
        token: token.toUpperCase(),
        amount,
        source: "admin_mint",
        note: note || "Admin transfer",
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };
      await redis.lpush(`user:${toAddress.toLowerCase()}:transactions`, JSON.stringify(userTx));
      await redis.ltrim(`user:${toAddress.toLowerCase()}:transactions`, 0, 99);

      const newBalance = currentBalance + amount;

      return NextResponse.json({
        success: true,
        message: `Added ${amount} ${token.toUpperCase()} to ${toAddress}`,
        transfer,
        previousBalance: currentBalance,
        newBalance,
      });
    }

    // Validate token and amount for fee-based operations
    if (!token || !amount || amount <= 0) {
      return NextResponse.json({ error: "Token and positive amount required" }, { status: 400 });
    }

    const tokenLower = token.toLowerCase();
    const feeKey = `platform:fees:${tokenLower}`;

    // Get current pending amount
    const pending = parseFloat(await redis.hget(feeKey, "pending") as string || "0");

    if (amount > pending) {
      return NextResponse.json({
        error: `Insufficient pending fees. Available: ${pending} ${token.toUpperCase()}`,
        available: pending,
      }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Transfer from fee wallet to User Wallet (off-chain Redis balance)
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'transferToUser') {
      if (!toAddress) {
        return NextResponse.json({ error: "toAddress required for user transfer" }, { status: 400 });
      }

      const userBalanceKey = `user:${toAddress.toLowerCase()}:balance`;

      // Check if user exists (optional - create balance if not)
      const existingBalance = await redis.hgetall(userBalanceKey);

      // Update fee balances (reduce pending)
      const multi = redis.multi();
      multi.hincrbyfloat(feeKey, "pending", -amount);
      multi.hincrbyfloat(feeKey, "transferred", amount);

      // Add to user's off-chain balance
      multi.hincrbyfloat(userBalanceKey, tokenLower, amount);

      // Record transfer
      const transfer = {
        id: `user_transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: "toUser",
        token: token.toUpperCase(),
        amount,
        toAddress: toAddress.toLowerCase(),
        note: note || "Admin transfer from fee wallet",
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };

      multi.lpush("platform:fees:transfers", JSON.stringify(transfer));
      multi.ltrim("platform:fees:transfers", 0, 99);

      // Also record in user's transaction history
      const userTx = {
        type: "deposit",
        token: token.toUpperCase(),
        amount,
        source: "admin_fee_transfer",
        note: note || "Transfer from platform fees",
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };
      multi.lpush(`user:${toAddress.toLowerCase()}:transactions`, JSON.stringify(userTx));
      multi.ltrim(`user:${toAddress.toLowerCase()}:transactions`, 0, 99);

      await multi.exec();

      // Get updated user balance
      const newBalance = await redis.hget(userBalanceKey, tokenLower);

      return NextResponse.json({
        success: true,
        message: `Transferred ${amount} ${token.toUpperCase()} to user wallet`,
        transfer,
        userNewBalance: parseFloat(newBalance as string || "0"),
        remainingPending: pending - amount,
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEFAULT ACTION: Transfer to Ledger (existing behavior)
    // ═══════════════════════════════════════════════════════════════════════

    // Update fee balances
    const multi = redis.multi();
    multi.hincrbyfloat(feeKey, "pending", -amount);
    multi.hincrbyfloat(feeKey, "transferred", amount);

    // Record transfer
    const transfer = {
      id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: "toLedger",
      token: token.toUpperCase(),
      amount,
      ledgerAddress: ledgerAddress || "Not specified",
      txHash: txHash || null,
      note: note || null,
      timestamp: Date.now(),
      date: new Date().toISOString(),
    };

    multi.lpush("platform:fees:transfers", JSON.stringify(transfer));
    multi.ltrim("platform:fees:transfers", 0, 99); // Keep last 100 transfers

    await multi.exec();

    return NextResponse.json({
      success: true,
      transfer,
      remainingPending: pending - amount,
    });
  } catch (error: any) {
    console.error("Admin fees transfer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
