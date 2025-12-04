import { NextResponse } from "next/server";
import { getHotWalletBalances } from "@/lib/blockchain-service";
import { getNOWPaymentsBalance } from "@/lib/nowpayments-service";

export async function GET() {
  try {
    const balances = await getHotWalletBalances();
    
    // NOWPayments BTC bakiyesi
    let nowPaymentsBalances: Record<string, number> = {};
    try {
      nowPaymentsBalances = await getNOWPaymentsBalance();
    } catch (e) {
      console.error("NOWPayments balance error:", e);
    }
    
    return NextResponse.json({
      success: true,
      balances: {
        ...balances,
        BTC: nowPaymentsBalances.BTC || 0,
      },
      nowPaymentsBalances,
      addresses: {
        ETH: process.env.HOT_WALLET_ETH_ADDRESS,
        XRP: process.env.HOT_WALLET_XRP_ADDRESS,
        SOL: process.env.HOT_WALLET_SOL_ADDRESS,
        BTC: "NOWPayments",
      },
      timestamp: Date.now(),
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}
