// src/app/api/cron/verify-pending-transfers/route.ts
// Verifies pending ETH transfers from users and updates transaction status
// Run every 1-2 minutes via Vercel Cron

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Mainnet client for ETH transfer verification
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com"),
});

const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ETH_ADDRESS?.toLowerCase();

// Cron auth (optional - Vercel Cron sends this header)
const CRON_SECRET = process.env.CRON_SECRET;

interface PendingTransfer {
  txId: string;
  ethTxHash: string;
  address: string;
  fromToken: string;
  toToken: string;
  fromAmount: number;
  toAmount: number;
  timestamp: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Starting pending ETH transfer verification...");

    // Get all pending transfers
    const pendingList = await redis.lrange("pending:eth_transfers", 0, -1);
    
    if (!pendingList || pendingList.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No pending transfers",
        checked: 0 
      });
    }

    console.log(`📋 Found ${pendingList.length} pending transfers to verify`);

    const results = {
      verified: 0,
      failed: 0,
      stillPending: 0,
      errors: [] as string[],
    };

    const toRemove: number[] = [];

    for (let i = 0; i < pendingList.length; i++) {
      const item = pendingList[i];
      let transfer: PendingTransfer;
      
      try {
        transfer = typeof item === 'string' ? JSON.parse(item) : item;
      } catch (e) {
        console.error(`Invalid pending transfer at index ${i}:`, item);
        toRemove.push(i);
        continue;
      }

      const { txId, ethTxHash, address, fromAmount, toAmount, timestamp } = transfer;
      
      // Skip if too old (> 10 minutes = likely failed)
      const age = Date.now() - timestamp;
      if (age > 10 * 60 * 1000) {
        console.log(`⚠️ TX ${ethTxHash} too old (${Math.round(age / 60000)}min), marking as failed`);
        await updateTransactionStatus(address, txId, "failed", "Transaction timeout");
        toRemove.push(i);
        results.failed++;
        continue;
      }

      try {
        // Check transaction receipt
        const receipt = await mainnetClient.getTransactionReceipt({
          hash: ethTxHash as `0x${string}`,
        });

        if (receipt) {
          if (receipt.status === "success") {
            // Verify it was sent to our hot wallet
            const tx = await mainnetClient.getTransaction({
              hash: ethTxHash as `0x${string}`,
            });

            if (tx.to?.toLowerCase() === HOT_WALLET_ADDRESS) {
              console.log(`✅ TX ${ethTxHash} confirmed! Marking as completed.`);
              await updateTransactionStatus(address, txId, "completed");
              results.verified++;
            } else {
              console.log(`⚠️ TX ${ethTxHash} sent to wrong address: ${tx.to}`);
              await updateTransactionStatus(address, txId, "failed", "Wrong recipient");
              // TODO: Revert AUXG credit if needed
              results.failed++;
            }
            toRemove.push(i);
          } else {
            // Transaction failed on chain
            console.log(`❌ TX ${ethTxHash} failed on chain`);
            await updateTransactionStatus(address, txId, "failed", "Transaction reverted");
            // TODO: Revert AUXG credit
            toRemove.push(i);
            results.failed++;
          }
        } else {
          // Still pending
          console.log(`⏳ TX ${ethTxHash} still pending (${Math.round(age / 1000)}s old)`);
          results.stillPending++;
        }
      } catch (e: any) {
        // Transaction not found yet - still pending
        if (e.message?.includes("not found") || e.message?.includes("could not be found")) {
          console.log(`⏳ TX ${ethTxHash} not found yet (still pending)`);
          results.stillPending++;
        } else {
          console.error(`Error checking TX ${ethTxHash}:`, e.message);
          results.errors.push(`${ethTxHash}: ${e.message}`);
        }
      }
    }

    // Remove processed items from the list (in reverse order to maintain indices)
    if (toRemove.length > 0) {
      // Use LREM to remove specific items
      for (const index of toRemove.reverse()) {
        const item = pendingList[index];
        await redis.lrem("pending:eth_transfers", 1, item);
      }
      console.log(`🗑️ Removed ${toRemove.length} processed items from pending list`);
    }

    // Send admin alert if there are failures
    if (results.failed > 0) {
      // TODO: Send Slack/email notification
      console.warn(`⚠️ ${results.failed} ETH transfers failed - admin action may be needed`);
    }

    console.log(`✅ Verification complete:`, results);

    return NextResponse.json({
      success: true,
      results,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Verify pending transfers error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}

// Update transaction status in user's transaction history
async function updateTransactionStatus(
  address: string, 
  txId: string, 
  status: "completed" | "failed",
  failReason?: string
) {
  const txKey = `user:${address}:transactions`;
  
  try {
    // Get all transactions
    const transactions = await redis.lrange(txKey, 0, 99);
    
    for (let i = 0; i < transactions.length; i++) {
      const tx = typeof transactions[i] === 'string' 
        ? JSON.parse(transactions[i]) 
        : transactions[i];
      
      if (tx.id === txId) {
        // Update status
        tx.status = status;
        if (failReason) tx.failReason = failReason;
        tx.verifiedAt = Date.now();
        
        // Replace in list
        await redis.lset(txKey, i, JSON.stringify(tx));
        console.log(`📝 Updated TX ${txId} status to ${status}`);
        
        // If failed, we might need to revert the AUXG credit
        if (status === "failed" && tx.toToken) {
          const balanceKey = `user:${address}:balance`;
          const toTokenLower = tx.toToken.toLowerCase();
          const toAmount = parseFloat(tx.toAmount);
          
          if (toAmount > 0) {
            // Revert the credit
            await redis.hincrbyfloat(balanceKey, toTokenLower, -toAmount);
            console.log(`💸 Reverted ${toAmount} ${tx.toToken} credit for failed TX`);
            
            // Log the reversion
            const revertTx = {
              id: `revert_${txId}`,
              type: "revert",
              originalTxId: txId,
              token: tx.toToken,
              amount: -toAmount,
              reason: failReason || "ETH transfer failed",
              timestamp: Date.now(),
            };
            await redis.lpush(txKey, JSON.stringify(revertTx));
          }
        }
        
        return;
      }
    }
    
    console.warn(`TX ${txId} not found in user's transactions`);
  } catch (e) {
    console.error(`Failed to update TX ${txId} status:`, e);
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
