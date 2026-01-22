// Coinbase Commerce API - Create Charge
import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const COINBASE_API_KEY = process.env.COINBASE_COMMERCE_API_KEY;
const COINBASE_API_URL = "https://api.commerce.coinbase.com";

interface CreateChargeRequest {
  address: string; // User wallet address
  amount: number;  // USD amount
  coin?: string;   // Preferred coin (optional)
}

// POST - Create a new charge for deposit
export async function POST(request: NextRequest) {
  try {
    if (!COINBASE_API_KEY) {
      return NextResponse.json(
        { error: "Coinbase Commerce not configured" },
        { status: 500 }
      );
    }

    const body: CreateChargeRequest = await request.json();
    const { address, amount, coin } = body;

    if (!address || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Missing required fields: address, amount" },
        { status: 400 }
      );
    }

    // Create unique order ID
    const orderId = `auxite_${address.toLowerCase()}_${Date.now()}`;

    // Create charge via Coinbase Commerce API
    const chargeData = {
      name: "AUXM Deposit",
      description: `Deposit ${amount} USD to Auxite Wallet`,
      pricing_type: "fixed_price",
      local_price: {
        amount: amount.toString(),
        currency: "USD",
      },
      metadata: {
        user_address: address.toLowerCase(),
        order_id: orderId,
        requested_coin: coin || "any",
      },
      redirect_url: `https://wallet.auxite.io/wallet?deposit=success`,
      cancel_url: `https://wallet.auxite.io/wallet?deposit=cancelled`,
    };

    const response = await fetch(`${COINBASE_API_URL}/charges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CC-Api-Key": COINBASE_API_KEY,
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify(chargeData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Coinbase API error:", errorData);
      return NextResponse.json(
        { error: "Failed to create charge", details: errorData },
        { status: response.status }
      );
    }

    const charge = await response.json();

    // Store charge info in Redis for tracking
    await redis.set(
      `coinbase:charge:${charge.data.id}`,
      JSON.stringify({
        chargeId: charge.data.id,
        orderId,
        userAddress: address.toLowerCase(),
        amount,
        status: "pending",
        createdAt: Date.now(),
        hostedUrl: charge.data.hosted_url,
      }),
      { ex: 86400 } // 24 hour expiry
    );

    // Also track by user
    await redis.lpush(
      `user:${address.toLowerCase()}:pending_deposits`,
      charge.data.id
    );

    console.log(`✅ Coinbase charge created: ${charge.data.id} for ${address}`);

    return NextResponse.json({
      success: true,
      charge: {
        id: charge.data.id,
        hostedUrl: charge.data.hosted_url,
        expiresAt: charge.data.expires_at,
        addresses: charge.data.addresses,
        pricing: charge.data.pricing,
      },
    });
  } catch (error: any) {
    console.error("Coinbase charge creation error:", error);
    return NextResponse.json(
      { error: "Failed to create deposit", details: error.message },
      { status: 500 }
    );
  }
}

// GET - Check charge status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chargeId = searchParams.get("chargeId");
    const userAddress = searchParams.get("address");

    if (chargeId) {
      // Get specific charge status
      const chargeData = await redis.get(`coinbase:charge:${chargeId}`);
      if (!chargeData) {
        return NextResponse.json({ error: "Charge not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, charge: chargeData });
    }

    if (userAddress) {
      // Get user's pending deposits
      const pendingIds = await redis.lrange(
        `user:${userAddress.toLowerCase()}:pending_deposits`,
        0,
        9
      );
      
      const deposits = await Promise.all(
        pendingIds.map(async (id) => {
          const data = await redis.get(`coinbase:charge:${id}`);
          return data;
        })
      );

      return NextResponse.json({
        success: true,
        deposits: deposits.filter(Boolean),
      });
    }

    return NextResponse.json(
      { error: "Provide chargeId or address" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Coinbase status check error:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
