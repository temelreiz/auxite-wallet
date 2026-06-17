// NOWPayments IPN (Instant Payment Notification) Handler
// Kripto deposit geldiğinde bakiyeleri otomatik günceller
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { incrementBalance, addTransaction, addBonusAuxm } from "@/lib/redis";

export const dynamic = "force-dynamic";

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

// IPN_SECRET zorunlu - yoksa başlatmada uyar
if (!IPN_SECRET) {
  console.error("⚠️ CRITICAL: NOWPAYMENTS_IPN_SECRET is not configured! IPN webhook will reject all requests.");
}

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

// Kripto fiyatlarını al
async function getCryptoPrices(): Promise<Record<string, number>> {
  const redis = await getRedis();
  
  // Cache'den fiyatları al
  const cached = await redis.get("crypto:prices:cache");
  if (cached && typeof cached === "object") {
    return cached as Record<string, number>;
  }
  
  // Fallback fiyatlar
  return {
    BTC: 100000,
    ETH: 3500,
    USDT: 1,
    USDC: 1,
    XRP: 2.5,
    SOL: 200,
    LTC: 100,
    DOGE: 0.35,
    TRX: 0.25,
    BNB: 700,
  };
}

// Bonus oranını hesapla (küçük yatırımcı dostu - ters piramit)
function calculateBonusPercent(amountUsd: number): number {
  if (amountUsd >= 5000) return 3;
  if (amountUsd >= 1000) return 5;
  if (amountUsd >= 500) return 7;
  if (amountUsd >= 100) return 10;
  if (amountUsd >= 10) return 15;
  return 0;
}

// AUXM miktarını ve bonusu hesapla
async function calculateAUXMAmount(
  payCurrency: string,
  actuallyPaid: number
): Promise<{ auxmAmount: number; bonusAmount: number; bonusPercent: number; usdValue: number }> {
  const prices = await getCryptoPrices();
  
  // Kripto sembolünü normalize et
  const symbol = payCurrency.toUpperCase().replace("_", "");
  const priceUSD = prices[symbol] || 1;
  
  // USD değeri
  const usdValue = actuallyPaid * priceUSD;
  
  // 1 AUXM = 1 USD
  const auxmAmount = usdValue;
  
  // Bonus hesapla
  const bonusPercent = calculateBonusPercent(usdValue);
  const bonusAmount = usdValue * (bonusPercent / 100);
  
  return {
    auxmAmount,
    bonusAmount,
    bonusPercent,
    usdValue,
  };
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
    
    // IPN'i kaydet (duplicate önleme - 30 gün)
    await redis.set(ipnKey, JSON.stringify(payload), { ex: 86400 * 30 });
    
    // Payment kaydını güncelle
    const paymentKey = `nowpayments:payment:${payload.payment_id}`;
    await redis.hset(paymentKey, {
      status: payload.payment_status,
      actually_paid: payload.actually_paid,
      pay_currency: payload.pay_currency,
      order_id: payload.order_id,
      updated_at: payload.updated_at,
    });
    
    // Sadece "finished" veya "confirmed" status'lerde bakiye güncelle
    if (payload.payment_status === "finished" || payload.payment_status === "confirmed") {
      // Order ID'den user wallet address'i çıkar
      // Format: "auxite_{walletAddress}_{timestamp}" veya "deposit_{walletAddress}"
      const orderParts = payload.order_id?.split("_") || [];
      let userAddress = "";
      
      if (orderParts.length >= 2) {
        // auxite_0x1234...5678_1234567890 formatı
        userAddress = orderParts[1];
      }
      
      if (!userAddress || !userAddress.startsWith("0x")) {
        console.warn("⚠️ Could not extract user address from order_id:", payload.order_id);
        
        // Orphan payment olarak kaydet - admin manuel işleyebilir
        await redis.lpush("nowpayments:orphan", JSON.stringify({
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
      
      // AUXM miktarını ve bonusu hesapla
      const { auxmAmount, bonusAmount, bonusPercent, usdValue } = await calculateAUXMAmount(
        payload.pay_currency,
        payload.actually_paid
      );
      
      // Kullanıcı bakiyesini güncelle
      const normalizedAddress = userAddress.toLowerCase();
      
      // AUXM ekle
      await incrementBalance(normalizedAddress, { auxm: auxmAmount }, {
        auxmReason: "nowpayments",
        counterAsset: payload.pay_currency?.toUpperCase(),
        counterAmount: Number(payload.actually_paid) || undefined,
        refTxId: payload.payment_id != null ? String(payload.payment_id) : undefined,
        meta: { usdValue },
      });
      
      // Bonus varsa ekle (30 gün geçerli)
      if (bonusAmount > 0) {
        const bonusExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await addBonusAuxm(normalizedAddress, bonusAmount, bonusExpiry);
      }
      
      // Kripto bakiyesini de ekle
      const cryptoField = payload.pay_currency.toLowerCase().replace("_", "") as any;
      if (["eth", "btc", "xrp", "sol", "usdt"].includes(cryptoField)) {
        await incrementBalance(normalizedAddress, { [cryptoField]: payload.actually_paid });
        console.log(`   Crypto: +${payload.actually_paid} ${cryptoField.toUpperCase()}`);
      }
      
      // Transaction kaydı oluştur
      await addTransaction(normalizedAddress, {
        type: "deposit",
        amount: auxmAmount,
        token: "AUXM",
        status: "completed",
        metadata: {
          source: "nowpayments",
          payment_id: payload.payment_id,
          pay_currency: payload.pay_currency,
          pay_amount: payload.actually_paid,
          usd_value: usdValue,
          bonus_amount: bonusAmount,
          bonus_percent: bonusPercent,
        },
      });
      
      // Tüm işlemleri logla
      await redis.lpush("nowpayments:completed", JSON.stringify({
        payment_id: payload.payment_id,
        userAddress: normalizedAddress,
        pay_currency: payload.pay_currency,
        pay_amount: payload.actually_paid,
        usd_value: usdValue,
        auxm_amount: auxmAmount,
        bonus_amount: bonusAmount,
        bonus_percent: bonusPercent,
        processed_at: new Date().toISOString(),
      }));
      
      console.log(`✅ Payment processed for ${normalizedAddress}:`);
      console.log(`   Received: ${payload.actually_paid} ${payload.pay_currency}`);
      console.log(`   USD Value: $${usdValue.toFixed(2)}`);
      console.log(`   AUXM: ${auxmAmount.toFixed(2)} + ${bonusAmount.toFixed(2)} bonus (${bonusPercent}%)`);
      
      return NextResponse.json({
        success: true,
        message: "Payment processed successfully",
        userAddress: normalizedAddress,
        auxmAmount,
        bonusAmount,
        bonusPercent,
        totalAuxm: auxmAmount + bonusAmount,
      });
    }
    
    // Pending, waiting vb. status'ler için sadece log
    if (payload.payment_status === "waiting" || payload.payment_status === "confirming") {
      console.log(`⏳ Payment ${payload.payment_status}: ${payload.payment_id}`);
    } else if (payload.payment_status === "failed" || payload.payment_status === "expired") {
      console.log(`❌ Payment ${payload.payment_status}: ${payload.payment_id}`);
    } else {
      console.log(`ℹ️ Payment status update: ${payload.payment_status}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Payment status: ${payload.payment_status}`,
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
    configured: !!IPN_SECRET,
    timestamp: new Date().toISOString(),
  });
}
