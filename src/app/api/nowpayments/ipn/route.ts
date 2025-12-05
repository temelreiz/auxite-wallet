// NOWPayments IPN (Instant Payment Notification) Handler
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || "";

// Redis bağlantısı
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

// NOWPayments IPN payload tipi
interface NOWPaymentsIPN {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  actually_paid: number;
  pay_currency: string;
  order_id: string;
  order_description?: string;
  purchase_id?: string;
  outcome_amount: number;
  outcome_currency: string;
  created_at: string;
  updated_at: string;
}

// HMAC signature doğrulama
function verifySignature(payload: string, signature: string): boolean {
  if (!IPN_SECRET) {
    console.error("❌ IPN_SECRET not configured");
    return false;
  }
  
  const hmac = crypto.createHmac("sha512", IPN_SECRET);
  hmac.update(payload);
  const calculatedSignature = hmac.digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(calculatedSignature)
  );
}

// Coin'e göre AUXM dönüşüm oranı hesapla
async function calculateAUXMAmount(
  payCurrency: string,
  actuallyPaid: number
): Promise<number> {
  // Basit dönüşüm - gerçek fiyatlarla güncellenmeli
  // 1 AUXM = 1 USD varsayımı
  const redis = await getRedis();
  
  // Kripto fiyatlarını al (cached)
  const pricesKey = "crypto:prices";
  const prices = await redis.get(pricesKey) as Record<string, number> | null;
  
  const cryptoPrices: Record<string, number> = prices || {
    BTC: 100000,
    ETH: 3500,
    USDT: 1,
    XRP: 2,
    SOL: 200,
    LTC: 100,
  };
  
  const priceUSD = cryptoPrices[payCurrency.toUpperCase()] || 1;
  const valueUSD = actuallyPaid * priceUSD;
  
  // 1 AUXM = 1 USD
  return valueUSD;
}

/**
 * POST /api/nowpayments/ipn
 * NOWPayments'tan gelen ödeme bildirimlerini işler
 */
export async function POST(request: NextRequest) {
  try {
    // Raw body al (signature doğrulama için)
    const rawBody = await request.text();
    
    // Signature kontrolü
    const signature = request.headers.get("x-nowpayments-sig");
    
    if (!signature) {
      console.error("❌ Missing IPN signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    
    // Sorted JSON için parse et ve tekrar stringify et
    const payload: NOWPaymentsIPN = JSON.parse(rawBody);
    const sortedPayload = JSON.stringify(payload, Object.keys(payload).sort());
    
    if (!verifySignature(sortedPayload, signature)) {
      console.error("❌ Invalid IPN signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    console.log("📥 NOWPayments IPN received:", {
      payment_id: payload.payment_id,
      status: payload.payment_status,
      amount: payload.actually_paid,
      currency: payload.pay_currency,
      order_id: payload.order_id,
    });
    
    const redis = await getRedis();
    
    // Duplicate kontrolü
    const ipnKey = `nowpayments:ipn:${payload.payment_id}:${payload.payment_status}`;
    const existingIPN = await redis.get(ipnKey);
    
    if (existingIPN) {
      console.log("⏭️ Duplicate IPN, skipping");
      return NextResponse.json({ success: true, duplicate: true });
    }
    
    // IPN'i kaydet (duplicate önleme)
    await redis.set(ipnKey, JSON.stringify(payload), { ex: 86400 * 30 }); // 30 gün
    
    // Payment kaydını güncelle
    const paymentKey = `payment:${payload.payment_id}`;
    await redis.hset(paymentKey, {
      status: payload.payment_status,
      actually_paid: payload.actually_paid,
      updated_at: payload.updated_at,
      raw_ipn: JSON.stringify(payload),
    });
    
    // Sadece "finished" veya "confirmed" status'lerde bakiye güncelle
    if (payload.payment_status === "finished" || payload.payment_status === "confirmed") {
      // Order ID'den user wallet address'i çıkar
      // Format: "deposit_{walletAddress}" veya "auxite_{walletAddress}_{timestamp}"
      const orderParts = payload.order_id?.split("_") || [];
      let userAddress = "";
      
      if (orderParts.length >= 2) {
        userAddress = orderParts[1];
      }
      
      if (!userAddress) {
        console.warn("⚠️ Could not extract user address from order_id:", payload.order_id);
        
        // Orphan payment olarak kaydet
        await redis.lpush("payments:orphan", JSON.stringify({
          ...payload,
          receivedAt: new Date().toISOString(),
          reason: "no_user_address",
        }));
        
        return NextResponse.json({
          success: true,
          message: "Payment received but no user address found",
          orphan: true,
        });
      }
      
      // Kullanıcıyı bul
      const userKey = `user:address:${userAddress.toLowerCase()}`;
      const userId = await redis.get(userKey);
      
      if (!userId) {
        // Yeni kullanıcı oluştur veya orphan olarak kaydet
        console.warn("⚠️ No user found for address:", userAddress);
        
        await redis.lpush("payments:orphan", JSON.stringify({
          ...payload,
          userAddress,
          receivedAt: new Date().toISOString(),
          reason: "user_not_found",
        }));
        
        return NextResponse.json({
          success: true,
          message: "Payment received but user not registered",
          orphan: true,
        });
      }
      
      // AUXM miktarını hesapla
      const auxmAmount = await calculateAUXMAmount(
        payload.pay_currency,
        payload.actually_paid
      );
      
      // Kullanıcı bakiyesini güncelle
      const balanceKey = `user:${userId}:balance:AUXM`;
      const currentBalance = (await redis.get(balanceKey)) as number || 0;
      const newBalance = currentBalance + auxmAmount;
      
      await redis.set(balanceKey, newBalance);
      
      // Transaction kaydı oluştur
      const transaction = {
        type: "deposit",
        payment_id: payload.payment_id,
        pay_currency: payload.pay_currency,
        pay_amount: payload.actually_paid,
        auxm_amount: auxmAmount,
        status: "completed",
        created_at: payload.created_at,
        processed_at: new Date().toISOString(),
      };
      
      await redis.lpush(`user:${userId}:transactions`, JSON.stringify(transaction));
      await redis.lpush("transactions:all", JSON.stringify({
        ...transaction,
        userId,
        userAddress,
      }));
      
      console.log(`✅ Payment processed: ${auxmAmount} AUXM → User ${userId}`);
      console.log(`   ${payload.actually_paid} ${payload.pay_currency} received`);
      console.log(`   New balance: ${newBalance} AUXM`);
      
      return NextResponse.json({
        success: true,
        message: "Payment processed successfully",
        userId,
        auxmAmount,
        newBalance,
      });
    }
    
    // Diğer status'ler için sadece log
    console.log(`ℹ️ Payment status update: ${payload.payment_status}`);
    
    return NextResponse.json({
      success: true,
      message: `Payment status updated: ${payload.payment_status}`,
    });
    
  } catch (error: any) {
    console.error("❌ NOWPayments IPN error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nowpayments/ipn
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "NOWPayments IPN Handler",
    timestamp: new Date().toISOString(),
  });
}
