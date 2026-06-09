// src/lib/tron-withdraw.ts
// ============================================================================
// USDT (TRC20) WITHDRAWAL on Tron — the widely-accepted USDT rail (every
// exchange/wallet supports it; cheapest fees). Sends from the Tron treasury
// hot wallet. Mirrors the signing pattern used by /api/admin/sweep-tron.
//
// Treasury = HOT_WALLET_TRON_ADDRESS/_KEY if set, else HD seed index 0.
// The treasury must hold USDT-TRC20 (to send) + TRX (to burn for energy).
// ============================================================================

import { TronWeb } from "tronweb";
import { deriveTronAddress, deriveTronPrivateKey, TRON_USDT_CONTRACT } from "@/lib/tron-deposit";

const FULL_HOST = "https://api.trongrid.io";
const SUN = 1_000_000; // 1 TRX = 1e6 sun; USDT-TRC20 also has 6 decimals
const FEE_LIMIT_SUN = 60 * SUN; // max TRX a transfer may burn for energy
const MIN_TREASURY_TRX = 30; // need TRX on hand to pay energy for the transfer

export interface TronWithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
  fee?: number;
}

function tronOpts() {
  const headers: Record<string, string> = {};
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;
  return { fullHost: FULL_HOST, headers };
}
function treasuryAddress(): string {
  return process.env.HOT_WALLET_TRON_ADDRESS || deriveTronAddress(0);
}
function treasuryPrivateKey(): string {
  return process.env.HOT_WALLET_TRON_KEY || deriveTronPrivateKey(0);
}

export async function withdrawUSDT_TRC20(toAddress: string, amount: number): Promise<TronWithdrawResult> {
  try {
    const dest = (toAddress || "").trim();

    // Validate the destination is a real Tron (base58 "T...") address — guards
    // against sending TRC20 to a wrong-network (e.g. 0x EVM) address.
    if (!TronWeb.isAddress(dest)) {
      return { success: false, error: "Geçersiz Tron (TRC20) adresi" };
    }
    if (!(amount > 0)) {
      return { success: false, error: "Geçersiz tutar" };
    }

    const treasury = treasuryAddress();
    const reader = new TronWeb(tronOpts());
    const tw = new TronWeb({ ...tronOpts(), privateKey: treasuryPrivateKey() });

    // Treasury USDT balance check.
    reader.setAddress(treasury);
    const usdtContract = await reader.contract().at(TRON_USDT_CONTRACT);
    const balRaw = await usdtContract.balanceOf(treasury).call();
    const usdtBal = Number(balRaw.toString()) / SUN;
    const raw = Math.round(amount * SUN);
    if (usdtBal * SUN < raw) {
      return { success: false, error: `Yetersiz USDT (TRC20) bakiyesi. Mevcut: ${usdtBal.toFixed(2)} USDT` };
    }

    // Treasury TRX (energy gas) check — TRC20 transfers burn energy paid in TRX.
    const treasuryTrx = Number(await reader.trx.getBalance(treasury)) / SUN;
    if (treasuryTrx < MIN_TREASURY_TRX) {
      return {
        success: false,
        error: `Gas için yetersiz TRX. Gerekli ~${MIN_TREASURY_TRX} TRX, mevcut: ${treasuryTrx.toFixed(2)} TRX`,
      };
    }

    console.log(`💵 USDT-TRC20 Withdraw: ${amount} USDT → ${dest} (treasury ${treasury})`);

    const c = await tw.contract().at(TRON_USDT_CONTRACT);
    const txid: string = await c.transfer(dest, raw).send({ feeLimit: FEE_LIMIT_SUN });

    console.log(`   ✅ TRC20 sent: ${txid}`);
    return { success: true, txHash: txid };
  } catch (error: any) {
    console.error("USDT-TRC20 withdraw error:", error);
    return { success: false, error: error?.message || "TRC20 transfer failed" };
  }
}
