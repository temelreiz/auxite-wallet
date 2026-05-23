import { NextRequest, NextResponse } from "next/server";
import { isHdConfigured, getUserDepositAddresses, armWatch } from "@/lib/hd-deposit";
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

  // Per-user deposit address — the basis for automatic crediting. Precedence:
  //   1. HD seed (DEPOSIT_HD_MNEMONIC) — vendor-free; covers EVM + BTC.
  //   2. KMS custodial wallet — EVM only (BTC stays shared, attributed by claim).
  //   3. shared hot wallet fallback (below) so the screen never breaks.
  // HD is preferred so that setting the seed migrates new addresses off AWS
  // with no gap; addresses already issued via KMS keep working (the watcher is
  // address-based and KMS keys still decrypt).
  if (userAddress && /^0x[0-9a-fA-F]{40}$/.test(userAddress)) {
    if (isHdConfigured()) {
      try {
        const { evm, btc } = await getUserDepositAddresses(userAddress);
        await armWatch(evm, btc);
        addresses = {
          BTC: { address: btc, network: "Bitcoin" },
          ETH: { address: evm, network: "Base" },
          USDT: { address: evm, network: "Base" },
          USDC: { address: evm, network: "Base" },
        };
        perUser = true;
      } catch (e) {
        console.error("[/api/deposit] HD derive failed, using shared:", e);
      }
    } else if (isKmsConfigured()) {
      try {
        const evm = await getOrCreateEvmDepositAddress(userAddress);
        if (evm) {
          addresses.ETH = { address: evm, network: "Base" };
          addresses.USDT = { address: evm, network: "Base" };
          addresses.USDC = { address: evm, network: "Base" };
          perUser = true;
        }
      } catch (e) {
        console.error("[/api/deposit] KMS address failed, using shared:", e);
      }
    }
  }

  if (coin && addresses[coin]) {
    return NextResponse.json({ success: true, perUser, ...addresses[coin] });
  }
  return NextResponse.json({ success: true, perUser, addresses });
}
