// src/app/api/admin/pending-transactions/route.ts
// Admin endpoint to view and manage pending ETH transfers

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { kv } from "@vercel/kv";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ADMIN_SECRET = process.env.ADMIN_SECRET;

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  // Check direct ADMIN_SECRET
  if (token === ADMIN_SECRET) return true;
  
  // Check session token from Vercel KV
  try {
    const session = await kv.get(`admin:session:${token}`);
    if (session) return true;
  } catch (e) {
    console.error("KV session check error:", e);
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get pending ETH transfers from the queue
    const pendingList = await redis.lrange("pending:eth_transfers", 0, -1);
    
    const pendingTransactions = pendingList.map((item: any) => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);

    // Also get recent transactions with pending_confirmation status from users
    // This gives a more complete picture
    const allPendingFromUsers: any[] = [];
    
    // Get list of users with transactions (limit to recent activity)
    const userKeys = await redis.keys("user:0x*:transactions");
    
    for (const key of userKeys.slice(0, 100)) { // Limit to 100 users
      try {
        const transactions = await redis.lrange(key, 0, 20); // Last 20 txs per user
        
        for (const tx of transactions) {
          const parsed = typeof tx === 'string' ? JSON.parse(tx) : tx;
          if (parsed.status === 'pending_confirmation' || 
              (parsed.ethTransferTxHash && parsed.status !== 'completed')) {
            // Extract address from key
            const address = key.replace('user:', '').replace(':transactions', '');
            allPendingFromUsers.push({
              ...parsed,
              address,
            });
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }

    // Merge and deduplicate
    const allTransactions = [...pendingTransactions];
    
    for (const userTx of allPendingFromUsers) {
      const exists = allTransactions.some(t => 
        t.txId === userTx.id || 
        t.ethTxHash === userTx.ethTransferTxHash
      );
      if (!exists) {
        allTransactions.push({
          ...userTx,
          txId: userTx.id,
          ethTxHash: userTx.ethTransferTxHash,
        });
      }
    }

    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return NextResponse.json({
      success: true,
      transactions: allTransactions,
      summary: {
        total: allTransactions.length,
        pending: allTransactions.filter(t => t.status === 'pending_confirmation').length,
        completed: allTransactions.filter(t => t.status === 'completed').length,
        failed: allTransactions.filter(t => t.status === 'failed').length,
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Get pending transactions error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get pending transactions" },
      { status: 500 }
    );
  }
}

// POST: Manual actions (mark as completed/failed, retry, etc.)
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, txId, address, ethTxHash } = body;

    if (action === "mark_completed") {
      // Manually mark a transaction as completed
      const txKey = `user:${address}:transactions`;
      const transactions = await redis.lrange(txKey, 0, 99);
      
      for (let i = 0; i < transactions.length; i++) {
        const tx = typeof transactions[i] === 'string' 
          ? JSON.parse(transactions[i]) 
          : transactions[i];
        
        if (tx.id === txId || tx.ethTransferTxHash === ethTxHash) {
          tx.status = 'completed';
          tx.manuallyCompleted = true;
          tx.completedAt = Date.now();
          
          await redis.lset(txKey, i, JSON.stringify(tx));
          
          // Remove from pending list if exists
          const pendingList = await redis.lrange("pending:eth_transfers", 0, -1);
          for (const item of pendingList) {
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            if (parsed.txId === txId || parsed.ethTxHash === ethTxHash) {
              await redis.lrem("pending:eth_transfers", 1, item);
            }
          }
          
          return NextResponse.json({ success: true, message: "Transaction marked as completed" });
        }
      }
      
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (action === "mark_failed") {
      // Manually mark as failed and revert credit
      const txKey = `user:${address}:transactions`;
      const transactions = await redis.lrange(txKey, 0, 99);
      
      for (let i = 0; i < transactions.length; i++) {
        const tx = typeof transactions[i] === 'string' 
          ? JSON.parse(transactions[i]) 
          : transactions[i];
        
        if (tx.id === txId || tx.ethTransferTxHash === ethTxHash) {
          tx.status = 'failed';
          tx.manuallyFailed = true;
          tx.failedAt = Date.now();
          tx.failReason = body.reason || 'Manually marked as failed by admin';
          
          await redis.lset(txKey, i, JSON.stringify(tx));
          
          // Revert the credit
          if (tx.toToken && tx.toAmount) {
            const balanceKey = `user:${address}:balance`;
            const toAmount = parseFloat(tx.toAmount);
            if (toAmount > 0) {
              await redis.hincrbyfloat(balanceKey, tx.toToken.toLowerCase(), -toAmount);
            }
          }
          
          // Remove from pending list
          const pendingList = await redis.lrange("pending:eth_transfers", 0, -1);
          for (const item of pendingList) {
            const parsed = typeof item === 'string' ? JSON.parse(item) : item;
            if (parsed.txId === txId || parsed.ethTxHash === ethTxHash) {
              await redis.lrem("pending:eth_transfers", 1, item);
            }
          }
          
          return NextResponse.json({ success: true, message: "Transaction marked as failed, credit reverted" });
        }
      }
      
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Pending transaction action error:", error);
    return NextResponse.json(
      { error: error.message || "Action failed" },
      { status: 500 }
    );
  }
}
