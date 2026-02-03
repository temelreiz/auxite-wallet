import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import crypto from "crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Transak configuration
const TRANSAK_API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
const TRANSAK_SECRET_KEY = process.env.TRANSAK_SECRET_KEY;
const TRANSAK_ENVIRONMENT = process.env.TRANSAK_ENVIRONMENT || "STAGING"; // STAGING or PRODUCTION

// Fixed/Whitelisted URLs (not from frontend)
const REDIRECT_URL = process.env.TRANSAK_REDIRECT_URL || "https://auxite.com/wallet";
const WEBHOOK_URL = process.env.TRANSAK_WEBHOOK_URL || "https://auxite.com/api/transak/webhook";

// Allowed cryptocurrencies
const ALLOWED_CRYPTO = ["ETH", "USDT", "USDC", "BTC", "AUXM"];

// Allowed fiat currencies
const ALLOWED_FIAT = ["USD", "EUR", "GBP", "TRY"];

// Min/Max amounts (in USD equivalent)
const MIN_AMOUNT_USD = 30;
const MAX_AMOUNT_USD = 10000;

// Generate a secure order reference
function generateOrderRef(): string {
  return `AUX-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

// POST - Create a new Transak order (backend-controlled parameters)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      cryptoCurrency,
      fiatCurrency,
      fiatAmount,
      email,
    } = body;

    // 1. Validate wallet address
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // 2. Validate cryptocurrency
    const cryptoUpper = (cryptoCurrency || "ETH").toUpperCase();
    if (!ALLOWED_CRYPTO.includes(cryptoUpper)) {
      return NextResponse.json(
        { error: `Invalid cryptocurrency. Allowed: ${ALLOWED_CRYPTO.join(", ")}` },
        { status: 400 }
      );
    }

    // 3. Validate fiat currency
    const fiatUpper = (fiatCurrency || "USD").toUpperCase();
    if (!ALLOWED_FIAT.includes(fiatUpper)) {
      return NextResponse.json(
        { error: `Invalid fiat currency. Allowed: ${ALLOWED_FIAT.join(", ")}` },
        { status: 400 }
      );
    }

    // 4. Validate amount
    const amount = parseFloat(fiatAmount);
    if (isNaN(amount) || amount < MIN_AMOUNT_USD || amount > MAX_AMOUNT_USD) {
      return NextResponse.json(
        { error: `Amount must be between $${MIN_AMOUNT_USD} and $${MAX_AMOUNT_USD}` },
        { status: 400 }
      );
    }

    // 5. Generate order reference
    const orderRef = generateOrderRef();

    // 6. Store order in Redis (for verification when webhook arrives)
    const orderKey = `transak:pending:${orderRef}`;
    const orderData = {
      orderRef,
      walletAddress: walletAddress.toLowerCase(),
      cryptoCurrency: cryptoUpper,
      fiatCurrency: fiatUpper,
      fiatAmount: amount.toString(),
      email: email || "",
      status: "PENDING",
      createdAt: Date.now().toString(),
      expiresAt: (Date.now() + 30 * 60 * 1000).toString(), // 30 minutes
    };

    await redis.hset(orderKey, orderData);
    await redis.expire(orderKey, 30 * 60); // Auto-expire in 30 minutes

    // 7. Build Transak widget URL with locked parameters
    const transakParams = new URLSearchParams({
      apiKey: TRANSAK_API_KEY || "",
      environment: TRANSAK_ENVIRONMENT,
      cryptoCurrencyCode: cryptoUpper,
      fiatCurrency: fiatUpper,
      fiatAmount: amount.toString(),
      walletAddress: walletAddress,
      disableWalletAddressForm: "true", // Lock wallet address
      hideMenu: "true",
      themeColor: "F59E0B", // Auxite gold color
      redirectURL: REDIRECT_URL,
      partnerOrderId: orderRef,
      ...(email && { email }),
    });

    // Network mapping
    const networkMap: Record<string, string> = {
      ETH: "ethereum",
      USDT: "ethereum", // or "polygon", "bsc"
      USDC: "ethereum",
      BTC: "bitcoin",
    };

    if (networkMap[cryptoUpper]) {
      transakParams.set("network", networkMap[cryptoUpper]);
    }

    const widgetUrl = `https://global${TRANSAK_ENVIRONMENT === "STAGING" ? "-stg" : ""}.transak.com/?${transakParams.toString()}`;

    console.log(`Transak order created: ${orderRef} for ${walletAddress}`);

    return NextResponse.json({
      success: true,
      orderRef,
      widgetUrl,
      params: {
        cryptoCurrency: cryptoUpper,
        fiatCurrency: fiatUpper,
        fiatAmount: amount,
        walletAddress,
      },
    });

  } catch (error: any) {
    console.error("Transak order error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

// GET - Get order status
export async function GET(request: NextRequest) {
  try {
    const orderRef = request.nextUrl.searchParams.get("orderRef");

    if (!orderRef) {
      return NextResponse.json(
        { error: "orderRef required" },
        { status: 400 }
      );
    }

    // Check pending order first
    const pendingKey = `transak:pending:${orderRef}`;
    const pendingOrder = await redis.hgetall(pendingKey);

    if (pendingOrder && Object.keys(pendingOrder).length > 0) {
      return NextResponse.json({
        success: true,
        orderRef,
        status: "PENDING",
        data: pendingOrder,
      });
    }

    // Check completed/processed orders (search by partnerOrderId)
    // This would require additional indexing in production
    return NextResponse.json({
      success: true,
      orderRef,
      status: "NOT_FOUND",
      message: "Order not found or expired",
    });

  } catch (error: any) {
    console.error("Transak status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get status" },
      { status: 500 }
    );
  }
}
