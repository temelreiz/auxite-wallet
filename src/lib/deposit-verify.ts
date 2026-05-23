// src/lib/deposit-verify.ts
// On-chain verification of a single deposit transaction into the platform hot
// wallet. Used by the user-facing /api/deposit/claim flow so a deposit is
// credited to the *logged-in* user after we confirm the tx really landed in
// the hot wallet — instead of guessing the owner from the sender address
// (which never works for exchange withdrawals).
//
// Chains: Base (native ETH + ERC-20 USDT/USDC) via Blockscout v2, and BTC via
// mempool.space. Chain is auto-detected from the hash shape.

const BASE_V2 = "https://base.blockscout.com/api/v2";

// Base mainnet token contracts (must match deposit-scanner.ts).
const USDT_CONTRACT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2".toLowerCase();
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".toLowerCase();

// Spam-prevention floors (match deposit-scanner.ts).
const MIN_DEPOSITS: Record<string, number> = {
  ETH: 0.001,
  USDT: 5,
  USDC: 5,
  BTC: 0.00005,
};

const MIN_CONFIRMATIONS_EVM = 2;

export interface VerifiedDeposit {
  ok: true;
  chain: "eth" | "btc";
  coin: "ETH" | "USDT" | "USDC" | "BTC";
  amount: number;
  amountUsdHint: number | null;
  fromAddress: string;
  toAddress: string;
  confirmations: number;
}
export type VerifyResult = VerifiedDeposit | { ok: false; reason: string };

function hotEth(): string {
  return (process.env.HOT_WALLET_ETH_ADDRESS || "").toLowerCase();
}
function hotBtc(): string {
  return process.env.HOT_WALLET_BTC_ADDRESS || "";
}

export async function verifyHotWalletDeposit(rawTxHash: string): Promise<VerifyResult> {
  const txHash = String(rawTxHash || "").trim();
  if (!txHash) return { ok: false, reason: "missing_txhash" };

  if (txHash.startsWith("0x")) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return { ok: false, reason: "invalid_txhash" };
    return verifyEvm(txHash);
  }
  if (/^[0-9a-fA-F]{64}$/.test(txHash)) return verifyBtc(txHash);
  return { ok: false, reason: "invalid_txhash" };
}

async function verifyEvm(txHash: string): Promise<VerifyResult> {
  const hot = hotEth();
  if (!hot) return { ok: false, reason: "hot_wallet_not_configured" };

  let tx: any;
  try {
    const res = await fetch(`${BASE_V2}/transactions/${txHash}`, { cache: "no-store" });
    if (res.status === 404) return { ok: false, reason: "tx_not_found" };
    if (!res.ok) return { ok: false, reason: "explorer_error" };
    tx = await res.json();
  } catch {
    return { ok: false, reason: "explorer_error" };
  }

  // status "ok" + result "success" => mined successfully
  if (tx?.status && tx.status !== "ok") return { ok: false, reason: "tx_failed" };
  if (tx?.result && String(tx.result).toLowerCase() !== "success") {
    return { ok: false, reason: "tx_failed" };
  }

  const confirmations = Number(tx?.confirmations || 0);
  if (confirmations < MIN_CONFIRMATIONS_EVM) {
    return { ok: false, reason: "pending_confirmations" };
  }

  // 1) ERC-20 USDT/USDC transfer to the hot wallet (filter strictly by contract
  //    so spam tokens sent to the hot wallet can never be claimed).
  try {
    const ttRes = await fetch(`${BASE_V2}/transactions/${txHash}/token-transfers`, { cache: "no-store" });
    if (ttRes.ok) {
      const tt = await ttRes.json();
      for (const item of tt?.items || []) {
        const to = String(item?.to?.hash || "").toLowerCase();
        const contract = String(item?.token?.address || "").toLowerCase();
        if (to !== hot) continue;
        if (contract !== USDT_CONTRACT && contract !== USDC_CONTRACT) continue;
        const coin = contract === USDC_CONTRACT ? "USDC" : "USDT";
        const decimals = parseInt(String(item?.total?.decimals || "6"), 10);
        const amount = Number(item?.total?.value || 0) / Math.pow(10, decimals);
        if (amount < MIN_DEPOSITS[coin]) return { ok: false, reason: "below_minimum" };
        return {
          ok: true,
          chain: "eth",
          coin,
          amount,
          amountUsdHint: amount, // stablecoin ≈ $1
          fromAddress: String(item?.from?.hash || ""),
          toAddress: hot,
          confirmations,
        };
      }
    }
  } catch {
    // fall through to native check
  }

  // 2) Native ETH transfer to the hot wallet
  const to = String(tx?.to?.hash || "").toLowerCase();
  const valueWei = BigInt(tx?.value || "0");
  if (to === hot && valueWei > 0n) {
    const amount = Number(valueWei) / 1e18;
    if (amount < MIN_DEPOSITS.ETH) return { ok: false, reason: "below_minimum" };
    const rate = tx?.exchange_rate ? Number(tx.exchange_rate) : null;
    return {
      ok: true,
      chain: "eth",
      coin: "ETH",
      amount,
      amountUsdHint: rate ? amount * rate : null,
      fromAddress: String(tx?.from?.hash || ""),
      toAddress: hot,
      confirmations,
    };
  }

  return { ok: false, reason: "not_to_hot_wallet" };
}

async function verifyBtc(txid: string): Promise<VerifyResult> {
  const hot = hotBtc();
  if (!hot) return { ok: false, reason: "hot_wallet_not_configured" };

  let tx: any;
  try {
    const res = await fetch(`https://mempool.space/api/tx/${txid}`, { cache: "no-store" });
    if (res.status === 404 || res.status === 400) return { ok: false, reason: "tx_not_found" };
    if (!res.ok) return { ok: false, reason: "explorer_error" };
    tx = await res.json();
  } catch {
    return { ok: false, reason: "explorer_error" };
  }

  if (!tx?.status?.confirmed) return { ok: false, reason: "pending_confirmations" };

  let received = 0;
  for (const vout of tx?.vout || []) {
    if (vout?.scriptpubkey_address === hot) received += Number(vout?.value || 0) / 1e8;
  }
  if (received <= 0) return { ok: false, reason: "not_to_hot_wallet" };
  if (received < MIN_DEPOSITS.BTC) return { ok: false, reason: "below_minimum" };

  let confirmations = 1;
  try {
    const tipRes = await fetch("https://mempool.space/api/blocks/tip/height", { cache: "no-store" });
    if (tipRes.ok) {
      const tip = Number(await tipRes.json());
      const h = Number(tx?.status?.block_height || tip);
      confirmations = Math.max(1, tip - h + 1);
    }
  } catch {
    // keep default 1
  }

  return {
    ok: true,
    chain: "btc",
    coin: "BTC",
    amount: received,
    amountUsdHint: null,
    fromAddress: String(tx?.vin?.[0]?.prevout?.scriptpubkey_address || "unknown"),
    toAddress: hot,
    confirmations,
  };
}
