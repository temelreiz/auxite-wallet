import { NextRequest, NextResponse } from "next/server";
import { isKmsConfigured, getOrCreateEvmDepositAddress } from "@/lib/deposit-address";

// POST is intentionally DISABLED. It previously credited a client-supplied
// amount/coin with no on-chain verification or authentication — i.e. anyone
// could mint themselves arbitrary balance. Deposits are now credited only
// through verified paths:
//   • POST /api/deposit/claim       (txid verified on-chain for the caller)
//   • cron /api/cron/scan-user-deposits  (auto-credit to per-user addresses)
//   • admin assignment
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "endpoint_disabled",
      message: "Direct deposit crediting is disabled. Use /api/deposit/claim.",
    },
    { status: 410 }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get("coin");
  const userAddress = searchParams.get("address");

  // Shared hot-wallet fallback (used when no user address or HD not configured).
  const sharedBtc = process.env.HOT_WALLET_BTC_ADDRESS || "bc1qcvdqwjtsmnl92ldhapmyuvfnlj5gfquvj0w3ke";
  const sharedEvm = process.env.HOT_WALLET_ETH_ADDRESS || "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6";

  let addresses: Record<string, { address: string; network: string; memo?: string }> = {
    BTC: { address: sharedBtc, network: "Bitcoin" },
    ETH: { address: sharedEvm, network: "Base" },
    USDT: { address: sharedEvm, network: "Base" },
    USDC: { address: sharedEvm, network: "Base" },
  };
  let perUser = false;

  // Per-user EVM deposit address (KMS custodial wallet) — the basis for
  // automatic crediting. BTC stays on the shared wallet for now (KMS is
  // EVM-only); BTC deposits are attributed via the txid-claim flow. Any failure
  // falls back to the shared wallet so the deposit screen never breaks.
  if (userAddress && /^0x[0-9a-fA-F]{40}$/.test(userAddress) && isKmsConfigured()) {
    try {
      const evm = await getOrCreateEvmDepositAddress(userAddress);
      if (evm) {
        addresses.ETH = { address: evm, network: "Base" };
        addresses.USDT = { address: evm, network: "Base" };
        addresses.USDC = { address: evm, network: "Base" };
        perUser = true;
      }
    } catch (e) {
      console.error("[/api/deposit] per-user KMS address failed, using shared:", e);
    }
  }

  if (coin && addresses[coin]) {
    return NextResponse.json({ success: true, perUser, ...addresses[coin] });
  }
  return NextResponse.json({ success: true, perUser, addresses });
}
