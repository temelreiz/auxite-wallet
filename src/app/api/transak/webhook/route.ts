import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Transak Webhook Secret - MUST be set in environment
const TRANSAK_WEBHOOK_SECRET = process.env.TRANSAK_WEBHOOK_SECRET;

// Allowed redirect URLs (whitelist)
const ALLOWED_REDIRECT_URLS = [
  "https://auxite.com",
  "https://www.auxite.com",
  "https://auxite.com/wallet",
  "https://auxite.com/deposit",
];

// Transaction states (state machine)
type TransactionStatus =
  | "CREATED"           // Order created
  | "PROCESSING"        // Payment being processed
  | "PENDING_DELIVERY"  // Payment received, waiting for crypto delivery
  | "COMPLETED"         // Crypto delivered to user
  | "CANCELLED"         // User cancelled
  | "FAILED"            // Payment failed
  | "EXPIRED"           // Order expired
  | "REFUNDED";         // Payment refunded

// Valid state transitions
const VALID_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  CREATED: ["PROCESSING", "CANCELLED", "EXPIRED"],
  PROCESSING: ["PENDING_DELIVERY", "FAILED", "CANCELLED"],
  PENDING_DELIVERY: ["COMPLETED", "FAILED", "REFUNDED"],
  COMPLETED: ["REFUNDED"], // Can still be refunded after completion
  CANCELLED: [],
  FAILED: [],
  EXPIRED: [],
  REFUNDED: [],
};

// Map Transak events to our status
const EVENT_TO_STATUS: Record<string, TransactionStatus> = {
  "ORDER_CREATED": "CREATED",
  "ORDER_PROCESSING": "PROCESSING",
  "ORDER_PAYMENT_VERIFYING": "PROCESSING",
  "ORDER_PENDING_DELIVERY_FROM_TRANSAK": "PENDING_DELIVERY",
  "ORDER_COMPLETED": "COMPLETED",
  "ORDER_CANCELLED": "CANCELLED",
  "ORDER_FAILED": "FAILED",
  "ORDER_EXPIRED": "EXPIRED",
  "ORDER_REFUNDED": "REFUNDED",
};

// Verify Transak webhook signature
function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!TRANSAK_WEBHOOK_SECRET) {
    console.error("TRANSAK_WEBHOOK_SECRET not configured!");
    return false;
  }

  try {
    // Transak uses HMAC-SHA512 for webhook signatures
    const expectedSignature = crypto
      .createHmac("sha512", TRANSAK_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Check if state transition is valid
function isValidTransition(currentStatus: TransactionStatus | null, newStatus: TransactionStatus): boolean {
  if (!currentStatus) return true; // New transaction
  return VALID_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
}

// Credit user balance (only on COMPLETED status)
async function creditUserBalance(
  walletAddress: string,
  cryptoAmount: number,
  cryptoCurrency: string,
  fiatAmount: number,
  fiatCurrency: string
): Promise<boolean> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;
    const tokenKey = cryptoCurrency.toLowerCase();

    // Credit the crypto amount
    await redis.hincrbyfloat(balanceKey, tokenKey, cryptoAmount);

    console.log(`Credited ${cryptoAmount} ${cryptoCurrency} to ${normalizedAddress}`);
    return true;
  } catch (error) {
    console.error("Credit balance error:", error);
    return false;
  }
}

// Refund/reverse credit (on REFUNDED status)
async function reverseUserCredit(
  walletAddress: string,
  cryptoAmount: number,
  cryptoCurrency: string
): Promise<boolean> {
  try {
    const normalizedAddress = walletAddress.toLowerCase();
    const balanceKey = `user:${normalizedAddress}:balance`;
    const tokenKey = cryptoCurrency.toLowerCase();

    // Check current balance
    const currentBalance = await redis.hget(balanceKey, tokenKey) as string | null;
    const balance = parseFloat(currentBalance || "0");

    if (balance < cryptoAmount) {
      console.error(`Insufficient balance for reversal: ${balance} < ${cryptoAmount}`);
      // Still proceed but log the discrepancy
    }

    // Deduct the amount (could go negative, handle in business logic)
    await redis.hincrbyfloat(balanceKey, tokenKey, -cryptoAmount);

    console.log(`Reversed ${cryptoAmount} ${cryptoCurrency} from ${normalizedAddress}`);
    return true;
  } catch (error) {
    console.error("Reverse credit error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw body for signature verification
    const rawBody = await request.text();

    // 2. Verify webhook signature
    const signature = request.headers.get("x-transak-signature") || "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // 3. Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const {
      webhookData,
      eventID,
    } = payload;

    if (!webhookData) {
      return NextResponse.json(
        { error: "Missing webhookData" },
        { status: 400 }
      );
    }

    const {
      id: transakOrderId,
      status: transakStatus,
      walletAddress,
      cryptoAmount,
      cryptoCurrency,
      fiatAmount,
      fiatCurrency,
      network,
      transactionHash,
    } = webhookData;

    console.log(`Transak webhook: ${eventID} - Order ${transakOrderId} - Status ${transakStatus}`);

    // 4. Map Transak status to our status
    const newStatus = EVENT_TO_STATUS[eventID] || EVENT_TO_STATUS[`ORDER_${transakStatus}`];

    if (!newStatus) {
      console.log(`Unknown event/status: ${eventID}/${transakStatus}`);
      return NextResponse.json({ success: true, message: "Unknown event ignored" });
    }

    // 5. Idempotency check - get existing transaction
    const txKey = `transak:order:${transakOrderId}`;
    const existingTx = await redis.hgetall(txKey);
    const currentStatus = existingTx?.status as TransactionStatus | null;

    // 6. Check if already processed this exact event
    const processedKey = `transak:processed:${transakOrderId}:${eventID}`;
    const alreadyProcessed = await redis.get(processedKey);

    if (alreadyProcessed) {
      console.log(`Event ${eventID} for order ${transakOrderId} already processed`);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // 7. Validate state transition
    if (currentStatus && !isValidTransition(currentStatus, newStatus)) {
      console.error(`Invalid state transition: ${currentStatus} -> ${newStatus}`);
      // Still mark as processed to prevent retries
      await redis.set(processedKey, "1", { ex: 86400 * 30 }); // 30 days
      return NextResponse.json({
        success: true,
        message: `Invalid transition from ${currentStatus} to ${newStatus}`
      });
    }

    // 8. Verify order parameters match (if existing order)
    if (existingTx && Object.keys(existingTx).length > 0) {
      const expectedAddress = existingTx.walletAddress as string;
      const expectedCurrency = existingTx.cryptoCurrency as string;

      if (walletAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        console.error(`Wallet address mismatch: expected ${expectedAddress}, got ${walletAddress}`);
        return NextResponse.json(
          { error: "Wallet address mismatch" },
          { status: 400 }
        );
      }

      if (cryptoCurrency !== expectedCurrency) {
        console.error(`Currency mismatch: expected ${expectedCurrency}, got ${cryptoCurrency}`);
        return NextResponse.json(
          { error: "Currency mismatch" },
          { status: 400 }
        );
      }
    }

    // 9. Update transaction record
    const txData = {
      transakOrderId,
      status: newStatus,
      walletAddress: walletAddress.toLowerCase(),
      cryptoAmount: cryptoAmount.toString(),
      cryptoCurrency,
      fiatAmount: fiatAmount?.toString() || "0",
      fiatCurrency: fiatCurrency || "USD",
      network: network || "",
      transactionHash: transactionHash || "",
      lastEventId: eventID,
      updatedAt: Date.now().toString(),
      ...(existingTx?.createdAt ? {} : { createdAt: Date.now().toString() }),
    };

    await redis.hset(txKey, txData);

    // 10. Handle status-specific actions
    let creditSuccess = true;

    if (newStatus === "COMPLETED" && currentStatus !== "COMPLETED") {
      // Credit user balance on first COMPLETED event
      creditSuccess = await creditUserBalance(
        walletAddress,
        cryptoAmount,
        cryptoCurrency,
        fiatAmount,
        fiatCurrency
      );

      if (creditSuccess) {
        // Log transaction for user history
        const userTx = {
          id: `transak_${transakOrderId}`,
          type: "deposit",
          token: cryptoCurrency,
          amount: cryptoAmount,
          fiatAmount,
          fiatCurrency,
          source: "transak",
          txHash: transactionHash,
          status: "completed",
          timestamp: Date.now(),
        };

        const uid = await redis.get(`user:address:${walletAddress.toLowerCase()}`);
        const userTxKey = uid
          ? `user:${uid}:transactions`
          : `user:${walletAddress.toLowerCase()}:transactions`;

        await redis.lpush(userTxKey, JSON.stringify(userTx));
      }
    } else if (newStatus === "REFUNDED") {
      // Reverse the credit on refund
      creditSuccess = await reverseUserCredit(
        walletAddress,
        cryptoAmount,
        cryptoCurrency
      );

      if (creditSuccess) {
        // Log refund transaction
        const refundTx = {
          id: `transak_refund_${transakOrderId}`,
          type: "refund",
          token: cryptoCurrency,
          amount: -cryptoAmount,
          source: "transak",
          originalOrderId: transakOrderId,
          status: "completed",
          timestamp: Date.now(),
        };

        const uid = await redis.get(`user:address:${walletAddress.toLowerCase()}`);
        const userTxKey = uid
          ? `user:${uid}:transactions`
          : `user:${walletAddress.toLowerCase()}:transactions`;

        await redis.lpush(userTxKey, JSON.stringify(refundTx));
      }
    }

    // 11. Mark event as processed (idempotency)
    await redis.set(processedKey, "1", { ex: 86400 * 30 }); // 30 days

    // 12. Update credit status if applicable
    if (newStatus === "COMPLETED" || newStatus === "REFUNDED") {
      await redis.hset(txKey, { creditApplied: creditSuccess ? "true" : "false" });
    }

    console.log(`Transak order ${transakOrderId} updated to ${newStatus}`);

    return NextResponse.json({
      success: true,
      orderId: transakOrderId,
      status: newStatus,
    });

  } catch (error: any) {
    console.error("Transak webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Health check for webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Transak webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
