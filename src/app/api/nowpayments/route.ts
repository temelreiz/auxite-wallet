// NOWPayments Payment Creation API
// Kullanıcı için deposit adresi oluşturur
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || "";
const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

// Desteklenen coinler ve ağları
const SUPPORTED_COINS: Record<string, { currency: string; network?: string; name: string; icon: string; color: string; minDeposit: string; confirmTime: string }> = {
  BTC: { 
    currency: "btc", 
    name: "Bitcoin", 
    icon: "₿", 
    color: "#F7931A",
    minDeposit: "0.0001 BTC",
    confirmTime: "~30 min (3 conf)",
  },
  ETH: { 
    currency: "eth", 
    name: "Ethereum", 
    icon: "Ξ", 
    color: "#627EEA",
    minDeposit: "0.001 ETH",
    confirmTime: "~5 min (12 conf)",
  },
  USDT_TRC20: { 
    currency: "usdttrc20", 
    network: "trx", 
    name: "USDT (TRC20)", 
    icon: "₮", 
    color: "#26A17B",
    minDeposit: "10 USDT",
    confirmTime: "~1 min",
  },
  USDT_ERC20: { 
    currency: "usdterc20", 
    network: "eth", 
    name: "USDT (ERC20)", 
    icon: "₮", 
    color: "#26A17B",
    minDeposit: "20 USDT",
    confirmTime: "~5 min",
  },
  USDC: { 
    currency: "usdc", 
    name: "USD Coin", 
    icon: "$", 
    color: "#2775CA",
    minDeposit: "10 USDC",
    confirmTime: "~5 min",
  },
  XRP: { 
    currency: "xrp", 
    name: "Ripple", 
    icon: "✕", 
    color: "#23292F",
    minDeposit: "10 XRP",
    confirmTime: "~10 sec",
  },
  SOL: { 
    currency: "sol", 
    name: "Solana", 
    icon: "◎", 
    color: "#9945FF",
    minDeposit: "0.1 SOL",
    confirmTime: "~30 sec",
  },
  LTC: { 
    currency: "ltc", 
    name: "Litecoin", 
    icon: "Ł", 
    color: "#BFBBBB",
    minDeposit: "0.01 LTC",
    confirmTime: "~10 min",
  },
  DOGE: { 
    currency: "doge", 
    name: "Dogecoin", 
    icon: "Ð", 
    color: "#C2A633",
    minDeposit: "50 DOGE",
    confirmTime: "~10 min",
  },
  TRX: { 
    currency: "trx", 
    name: "TRON", 
    icon: "◆", 
    color: "#FF0013",
    minDeposit: "50 TRX",
    confirmTime: "~1 min",
  },
  BNB: { 
    currency: "bnbbsc", 
    network: "bsc", 
    name: "BNB (BSC)", 
    icon: "◆", 
    color: "#F3BA2F",
    minDeposit: "0.01 BNB",
    confirmTime: "~1 min",
  },
};

// Redis bağlantısı
async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

/**
 * POST /api/nowpayments
 * Yeni payment oluştur ve deposit adresi al
 */
export async function POST(request: NextRequest) {
  try {
    if (!NOWPAYMENTS_API_KEY) {
      return NextResponse.json(
        { error: "NowPayments not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { coin, address, amount } = body;

    if (!coin || !address) {
      return NextResponse.json(
        { error: "Missing required fields: coin, address" },
        { status: 400 }
      );
    }

    const coinConfig = SUPPORTED_COINS[coin.toUpperCase()];
    if (!coinConfig) {
      return NextResponse.json(
        { error: `Unsupported coin: ${coin}` },
        { status: 400 }
      );
    }

    // Benzersiz order ID oluştur
    const orderId = `auxite_${address.toLowerCase()}_${Date.now()}`;

    // NowPayments'a payment oluştur
    const paymentData: any = {
      price_amount: amount || 100, // Default $100 (min amount için)
      price_currency: "usd",
      pay_currency: coinConfig.currency,
      order_id: orderId,
      order_description: `Auxite Wallet Deposit - ${coin}`,
      ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://vault.auxite.io"}/api/nowpayments/ipn`,
    };

    const response = await fetch(`${NOWPAYMENTS_API_URL}/payment`, {
      method: "POST",
      headers: {
        "x-api-key": NOWPAYMENTS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("NowPayments API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create payment", details: errorData },
        { status: response.status }
      );
    }

    const payment = await response.json();

    // Redis'e kaydet
    const redis = await getRedis();
    await redis.hset(`nowpayments:payment:${payment.payment_id}`, {
      payment_id: payment.payment_id,
      order_id: orderId,
      user_address: address.toLowerCase(),
      pay_currency: coin,
      pay_address: payment.pay_address,
      pay_amount: payment.pay_amount,
      status: payment.payment_status,
      created_at: new Date().toISOString(),
    });

    // Kullanıcının pending deposit'lerini takip et
    await redis.lpush(
      `user:${address.toLowerCase()}:pending_deposits`,
      payment.payment_id.toString()
    );

    console.log(`✅ NowPayments payment created: ${payment.payment_id}`);
    console.log(`   Address: ${payment.pay_address}`);
    console.log(`   Amount: ${payment.pay_amount} ${coin}`);

    // coinConfig'ten currency'yi ayır (duplicate önlemek için)
    const { currency: _, ...restConfig } = coinConfig;

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.payment_id,
        address: payment.pay_address,
        amount: payment.pay_amount,
        currency: coin,
        network: coinConfig.network || coinConfig.currency,
        expiresAt: payment.expiration_estimate_date,
        orderId,
        ...restConfig,
      },
    });
  } catch (error: any) {
    console.error("NowPayments create payment error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nowpayments
 * Payment durumunu kontrol et veya desteklenen coinleri listele
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const action = searchParams.get("action");

    // Desteklenen coinleri listele
    if (action === "coins") {
      return NextResponse.json({
        success: true,
        coins: Object.entries(SUPPORTED_COINS).map(([id, config]) => ({
          id,
          ...config,
        })),
      });
    }

    // Payment durumunu kontrol et
    if (paymentId) {
      if (!NOWPAYMENTS_API_KEY) {
        return NextResponse.json(
          { error: "NowPayments not configured" },
          { status: 500 }
        );
      }

      const response = await fetch(
        `${NOWPAYMENTS_API_URL}/payment/${paymentId}`,
        {
          headers: {
            "x-api-key": NOWPAYMENTS_API_KEY,
          },
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        );
      }

      const payment = await response.json();

      return NextResponse.json({
        success: true,
        payment: {
          id: payment.payment_id,
          status: payment.payment_status,
          address: payment.pay_address,
          amount: payment.pay_amount,
          actuallyPaid: payment.actually_paid,
          currency: payment.pay_currency,
        },
      });
    }

    // Health check
    return NextResponse.json({
      status: "ok",
      service: "NowPayments API",
      configured: !!NOWPAYMENTS_API_KEY,
      supportedCoins: Object.keys(SUPPORTED_COINS),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("NowPayments GET error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch" },
      { status: 500 }
    );
  }
}
