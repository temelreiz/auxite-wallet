// src/app/api/admin/fees/route.ts
// Platform Fee Management API
// 🔒 SECURITY: Full audit trail + IP logging + Telegram alerts

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { kv } from "@vercel/kv";
import { sendTelegramMessage } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════
// 🔒 SECURITY: IP extraction + audit logging
// ═══════════════════════════════════════════════════════════════════════════
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

async function logAdminAudit(
  action: string,
  details: Record<string, any>,
  request: NextRequest,
  authMethod: string,
): Promise<void> {
  try {
    const entry = {
      action,
      ...details,
      ip: getClientIP(request),
      userAgent: request.headers.get("user-agent") || "unknown",
      authMethod,
      timestamp: Date.now(),
      date: new Date().toISOString(),
    };
    await redis.lpush("admin:audit:actions", JSON.stringify(entry));
    await redis.ltrim("admin:audit:actions", 0, 999);
    // Also log to dedicated fees audit trail
    await redis.lpush("admin:audit:fees", JSON.stringify(entry));
    await redis.ltrim("admin:audit:fees", 0, 999);
    console.log(`🔒 AUDIT: ${action} from IP ${entry.ip} via ${authMethod}`);
  } catch (e) {
    console.error("Audit log error:", e);
  }
}

// Admin authentication - session token ONLY (legacy ADMIN_SECRET removed)
async function isAuthorized(request: NextRequest): Promise<{ authorized: boolean; method: string }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return { authorized: false, method: "none" };

  const token = authHeader.replace("Bearer ", "");

  // Check session token from Vercel KV (admin panel login)
  try {
    const session = await kv.get(`admin:session:${token}`);
    if (session) return { authorized: true, method: "session" };
  } catch (e) {
    console.error("Session check error:", e);
  }

  // 🔒 Log failed auth attempt
  const ip = getClientIP(request);
  console.warn(`🚨 FAILED AUTH ATTEMPT on /api/admin/fees from IP: ${ip}`);
  await redis.lpush("admin:audit:failed_auth", JSON.stringify({
    endpoint: "/api/admin/fees",
    ip,
    userAgent: request.headers.get("user-agent") || "unknown",
    timestamp: Date.now(),
  }));
  await redis.ltrim("admin:audit:failed_auth", 0, 499);

  return { authorized: false, method: "invalid" };
}

// ═══════════════════════════════════════════════════════════════════════════
// GET - Get all platform fees
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const auth = await isAuthorized(request);
  if (!auth.authorized) {
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
        // Use pending (available balance) for USD value, not total (historical)
        const valueUsd = pending * (prices[t] || 1);

        fees[t.toUpperCase()] = {
          total,
          pending,
          transferred,
          transactionCount: parseInt(count as string || "0"),
          valueUsd: parseFloat(valueUsd.toFixed(2)),
        };

        // totalValueUsd should reflect available balance (pending), not historical total
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
  const auth = await isAuthorized(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, token, amount, ledgerAddress, txHash, note, toAddress } = body;

    // 🔒 Log every POST action
    await logAdminAudit(`fees:${action || 'transfer'}`, {
      token, amount, toAddress, note,
      requestBody: { action, token, amount, toAddress },
    }, request, auth.method);

    // ═══════════════════════════════════════════════════════════════════════
    // ACTION: Send REAL on-chain crypto from hot wallet to any address
    // Supports: ETH, USDT, XRP, SOL, BTC
    // For custodial wallets: Updates Redis balance instead of on-chain transfer
    // ═══════════════════════════════════════════════════════════════════════
    if (action === 'sendOnChain' || action === 'sendReal') {
      if (!toAddress || !token || !amount || amount <= 0) {
        return NextResponse.json({ error: "toAddress, token, and positive amount required" }, { status: 400 });
      }

      const supportedTokens = ['ETH', 'USDT', 'XRP', 'SOL', 'BTC'];
      const tokenUpper = token.toUpperCase();
      const tokenLower = token.toLowerCase();

      if (!supportedTokens.includes(tokenUpper)) {
        return NextResponse.json({
          error: `Token not supported for on-chain transfer. Supported: ${supportedTokens.join(', ')}`,
          supported: supportedTokens
        }, { status: 400 });
      }

      // Check if we have enough pending fees
      const feeKey = `platform:fees:${tokenLower}`;
      const pending = parseFloat(await redis.hget(feeKey, "pending") as string || "0");

      if (amount > pending) {
        return NextResponse.json({
          error: `Insufficient pending fees. Available: ${pending} ${tokenUpper}`,
          available: pending,
        }, { status: 400 });
      }

      // Check if target is a custodial wallet
      const normalizedTo = toAddress.toLowerCase();
      let isCustodialTarget = false;

      // Check multiple Redis patterns for custodial detection
      const [custodialKey, userId] = await Promise.all([
        redis.get(`custodial:wallet:${normalizedTo}`),
        redis.get(`user:address:${normalizedTo}`)
      ]);

      if (custodialKey) {
        // Direct custodial wallet key exists
        isCustodialTarget = true;
      } else if (userId) {
        // Check user data for walletType
        const userData = await redis.hgetall(`user:${userId}`);
        isCustodialTarget = userData?.walletType === 'custodial';
      }

      // Also check if balance key exists (another custodial indicator)
      if (!isCustodialTarget) {
        const balanceExists = await redis.exists(`user:${normalizedTo}:balance`);
        if (balanceExists) {
          isCustodialTarget = true;
        }
      }

      console.log(`🔍 Custodial check for ${normalizedTo}: ${isCustodialTarget ? 'CUSTODIAL' : 'EXTERNAL'}`);
      console.log(`   - custodial:wallet key: ${custodialKey ? 'exists' : 'not found'}`);
      console.log(`   - user:address key: ${userId ? userId : 'not found'}`);

      try {
        let txHash = '';
        let networkFee = 0;

        if (isCustodialTarget) {
          // Custodial wallet: Just update Redis balance (no on-chain needed)
          console.log(`📦 Custodial transfer: Adding ${amount} ${tokenUpper} to ${normalizedTo} Redis balance`);

          const userBalanceKey = `user:${normalizedTo}:balance`;
          await redis.hincrbyfloat(userBalanceKey, tokenLower, amount);

          // Record in user's transaction history
          const userTx = {
            id: `admin_deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: "deposit",
            token: tokenUpper,
            amount: amount,
            source: "admin_transfer",
            status: "completed",
            note: note || "Admin transfer",
            timestamp: Date.now(),
            date: new Date().toISOString(),
          };
          await redis.lpush(`user:${normalizedTo}:transactions`, JSON.stringify(userTx));
          await redis.ltrim(`user:${normalizedTo}:transactions`, 0, 99);

          txHash = `custodial_${Date.now()}`;
        } else {
          // External wallet: Send real on-chain transfer
          const { processWithdraw } = await import("@/lib/blockchain-service");
          console.log(`🚀 Admin sending REAL ${tokenUpper}: ${amount} to ${toAddress}`);

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

          txHash = result.txHash || '';
          networkFee = result.fee || 0;
        }

        // Deduct from fee balance (pending -> transferred)
        await redis.hincrbyfloat(feeKey, "pending", -amount);
        await redis.hincrbyfloat(feeKey, "transferred", amount);

        // Record transfer in history
        const transfer = {
          id: `onchain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: isCustodialTarget ? "custodialTransfer" : "onChainTransfer",
          token: tokenUpper,
          amount,
          toAddress,
          txHash,
          fee: networkFee,
          note: note || (isCustodialTarget ? "Admin custodial transfer" : "Admin on-chain transfer from hot wallet"),
          timestamp: Date.now(),
          date: new Date().toISOString(),
        };

        await redis.lpush("platform:fees:transfers", JSON.stringify(transfer));
        await redis.ltrim("platform:fees:transfers", 0, 99);

        // 🔒 SECURITY: Telegram alert for on-chain/custodial transfers
        const transferIp = getClientIP(request);
        sendTelegramMessage(
          `🚨 <b>ADMIN TRANSFER</b> 🚨\n\n` +
          `<b>Tür:</b> ${isCustodialTarget ? "Custodial (Redis)" : "On-Chain (Gerçek)"}\n` +
          `<b>Token:</b> ${tokenUpper}\n` +
          `<b>Miktar:</b> ${amount}\n` +
          `<b>Hedef:</b> <code>${toAddress}</code>\n` +
          `<b>TxHash:</b> <code>${txHash}</code>\n` +
          `<b>Fee:</b> ${networkFee}\n` +
          `<b>IP:</b> <code>${transferIp}</code>\n` +
          `<b>Auth:</b> ${auth.method}\n` +
          `<b>Zaman:</b> ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}\n\n` +
          `⚠️ Bu işlemi siz yapmadıysanız hemen kontrol edin!`
        ).catch((err) => console.error("Transfer Telegram alert error:", err));

        return NextResponse.json({
          success: true,
          message: isCustodialTarget
            ? `Successfully added ${amount} ${tokenUpper} to custodial wallet ${toAddress}`
            : `Successfully sent ${amount} ${tokenUpper} on-chain to ${toAddress}`,
          transfer,
          txHash,
          networkFee,
          remainingPending: pending - amount,
          isCustodial: isCustodialTarget,
        });
      } catch (error: any) {
        console.error("Transfer error:", error);
        return NextResponse.json({
          success: false,
          error: error.message || "Transfer failed",
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

      // 🔒 SECURITY: Telegram alert for admin mint operations
      const ip = getClientIP(request);
      sendTelegramMessage(
        `🚨 <b>ADMIN MINT İŞLEMİ</b> 🚨\n\n` +
        `<b>Token:</b> ${token.toUpperCase()}\n` +
        `<b>Miktar:</b> ${amount}\n` +
        `<b>Hedef:</b> <code>${toAddress.toLowerCase()}</code>\n` +
        `<b>Önceki Bakiye:</b> ${currentBalance}\n` +
        `<b>Yeni Bakiye:</b> ${newBalance}\n` +
        `<b>Not:</b> ${note || "Yok"}\n` +
        `<b>IP:</b> <code>${ip}</code>\n` +
        `<b>Auth:</b> ${auth.method}\n` +
        `<b>Zaman:</b> ${new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}\n\n` +
        `⚠️ Bu işlemi siz yapmadıysanız hemen kontrol edin!`
      ).catch((err) => console.error("Mint Telegram alert error:", err));

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
