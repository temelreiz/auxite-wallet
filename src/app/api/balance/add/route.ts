// src/app/api/balance/add/route.ts
//
// READ-ONLY compatibility shim for mobile builds already in users' hands.
//
// History: this path was a test endpoint whose POST wrote balances with no
// authentication of any kind. It is how the balances on 0xb7f4f51b…9588 were
// fabricated, and it was deleted in #67. The POST is not coming back.
//
// The GET is back because the mobile app reads balances through it —
// auxite-mobile services/api-service.ts calls
// `${API_URL}/api/balance/add?address=…` — and shipped builds cannot be
// changed. Deleting the route showed every mobile user an empty wallet.
//
// This restores the previous read behaviour and widens nothing, but it is
// still an unauthenticated balance lookup by address: anyone who knows an
// address can read its balances. It must not outlive the mobile release that
// moves getBalance() onto the login token (phase 2 of the identity migration),
// and it is deliberately the only handler in this file so that no write can be
// added here by habit.

import { NextRequest, NextResponse } from "next/server";
import { getUserBalance } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get("address");
    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    const balance = await getUserBalance(address);
    return NextResponse.json({ success: true, address, balance });
  } catch (error: any) {
    console.error("GET /api/balance/add error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to get balance" },
      { status: 500 },
    );
  }
}
