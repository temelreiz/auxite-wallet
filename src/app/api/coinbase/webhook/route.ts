// Coinbase Commerce Webhook Handler
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

// Bonus tiers - küçük yatırımcı dostu (ters piramit)
function calculateBonus(amountUsd: number): { percent: number; amount: number } {
  let percent = 0;
  if (amountUsd >= 5000) percent = 3;
  else if (amountUsd >= 1000) percent = 5;
  else if (amountUsd >= 500) percent = 7;
  else if (amountUsd >= 100) percent = 10;
  else if (amountUsd >= 10) percent = 15;
  
  return {
    percent,
    amount: amountUsd * (percent / 100),
  };
}

// Verify webhook signature
function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) {
    console.error("❌ COINBASE_COMMERCE_WEBHOOK_SECRET not configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  hmac.update(payload);
  const computedSignature = hmac.digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-cc-webhook-signature");

    // Verify signature
    if (!signature || !verifySignature(rawBody, signature)) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event?.type;
    const chargeData = event.event?.data;

    console.log(`📥 Coinbase webhook received: ${eventType}`);
    console.log(`   Charge ID: ${chargeData?.id}`);

    // Duplicate check
    const eventKey = `coinbase:event:${event.event?.id}`;
    const processed = await redis.get(eventKey);
    if (processed) {
      console.log("⏭️ Duplicate event, skipping");
      return NextResponse.json({ success: true, duplicate: true });
    }
    await redis.set(eventKey, "1", { ex: 86400 * 7 }); // 7 day dedup

    // Handle different event types
    switch (eventType) {
      case "charge:confirmed":
      case "charge:resolved": {
        // Payment confirmed!
        const metadata = chargeData.metadata || {};
        const userAddress = metadata.user_address;
        const orderId = metadata.order_id;

        if (!userAddress) {
          console.error("❌ No user address in metadata");
          await redis.lpush("coinbase:orphan_payments", JSON.stringify({
            event,
            reason: "no_user_address",
            receivedAt: new Date().toISOString(),
          }));
          return NextResponse.json({ success: true, orphan: true });
        }

        // Get payment details
        const payments = chargeData.payments || [];
        const confirmedPayment = payments.find(
          (p: any) => p.status === "CONFIRMED"
        );

        if (!confirmedPayment) {
          console.warn("⚠️ No confirmed payment found in charge");
          return NextResponse.json({ success: true, noPayment: true });
        }

        const paidCrypto = confirmedPayment.value?.crypto?.amount || 0;
        const paidCurrency = confirmedPayment.value?.crypto?.currency || "UNKNOWN";
        const paidLocalAmount = parseFloat(
          confirmedPayment.value?.local?.amount || chargeData.pricing?.local?.amount || "0"
        );

        // Calculate AUXM amount (1 USD = 1 AUXM)
        const auxmAmount = paidLocalAmount;
        const bonus = calculateBonus(auxmAmount);

        // Update user balance
        const balanceKey = `user:${userAddress}:balance`;
        
        await redis.hincrbyfloat(balanceKey, "auxm", auxmAmount);
        if (bonus.amount > 0) {
          await redis.hincrbyfloat(balanceKey, "bonusauxm", bonus.amount);
        }

        // Record transaction
        const transaction = {
          id: `cb_${chargeData.id}`,
          type: "deposit",
          method: "coinbase",
          token: paidCurrency,
          cryptoAmount: paidCrypto,
          amountUsd: paidLocalAmount,
          auxmReceived: auxmAmount,
          bonusReceived: bonus.amount,
          bonusPercent: bonus.percent,
          chargeId: chargeData.id,
          orderId,
          status: "completed",
          timestamp: Date.now(),
        };

        await redis.lpush(
          `user:${userAddress}:transactions`,
          JSON.stringify(transaction)
        );

        // Update charge status
        await redis.set(
          `coinbase:charge:${chargeData.id}`,
          JSON.stringify({
            chargeId: chargeData.id,
            orderId,
            userAddress,
            amount: paidLocalAmount,
            status: "completed",
            completedAt: Date.now(),
          }),
          { ex: 86400 * 30 }
        );

        // Remove from pending
        await redis.lrem(
          `user:${userAddress}:pending_deposits`,
          1,
          chargeData.id
        );

        console.log(`✅ Deposit processed for ${userAddress}:`);
        console.log(`   Amount: $${paidLocalAmount} (${paidCrypto} ${paidCurrency})`);
        console.log(`   AUXM: ${auxmAmount} + ${bonus.amount} bonus`);

        // Get updated balance for logging
        const newBalance = await redis.hgetall(balanceKey);
        console.log(`   New balance: ${JSON.stringify(newBalance)}`);

        return NextResponse.json({
          success: true,
          processed: true,
          auxmAmount,
          bonus: bonus.amount,
        });
      }

      case "charge:pending": {
        // Payment detected, waiting for confirmation
        const metadata = chargeData.metadata || {};
        const userAddress = metadata.user_address;
        
        if (userAddress) {
          await redis.set(
            `coinbase:charge:${chargeData.id}`,
            JSON.stringify({
              chargeId: chargeData.id,
              userAddress,
              status: "pending",
              updatedAt: Date.now(),
            }),
            { ex: 86400 }
          );
        }
        
        console.log(`⏳ Payment pending for charge ${chargeData.id}`);
        return NextResponse.json({ success: true, status: "pending" });
      }

      case "charge:failed":
      case "charge:expired": {
        const metadata = chargeData.metadata || {};
        const userAddress = metadata.user_address;

        if (userAddress) {
          // Update status
          await redis.set(
            `coinbase:charge:${chargeData.id}`,
            JSON.stringify({
              chargeId: chargeData.id,
              userAddress,
              status: eventType === "charge:failed" ? "failed" : "expired",
              updatedAt: Date.now(),
            }),
            { ex: 86400 }
          );

          // Remove from pending
          await redis.lrem(
            `user:${userAddress}:pending_deposits`,
            1,
            chargeData.id
          );
        }

        console.log(`❌ Charge ${eventType}: ${chargeData.id}`);
        return NextResponse.json({ success: true, status: eventType });
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
        return NextResponse.json({ success: true, ignored: true });
    }
  } catch (error: any) {
    console.error("❌ Coinbase webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// GET - Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Coinbase Commerce Webhook",
    configured: !!WEBHOOK_SECRET,
    timestamp: new Date().toISOString(),
  });
}
