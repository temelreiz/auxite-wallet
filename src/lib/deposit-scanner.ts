// src/lib/deposit-scanner.ts
// Direct Blockchain Deposit Scanner — NowPayments'tan bağımsız treasury
// 2 chain: ETH (+ USDT/USDC ERC-20), BTC

import { getRedis } from "./redis";

// ============================================
// TYPES
// ============================================

export interface DepositResult {
  chain: "eth" | "btc";
  coin: string; // ETH, USDT, BTC, USDC
  amount: number;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  blockNumber: number;
  timestamp: number;
  confirmations?: number;
}

interface ScanResult {
  chain: string;
  deposits: DepositResult[];
  lastScanned: string | number;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================

// USDT ERC-20 contract (Base mainnet - bridged USDT)
const USDT_CONTRACT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";
// USDC on Base
const USDC_CONTRACT = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Base chain explorer API - Blockscout (compatible with Etherscan V1 format)
const BASE_EXPLORER_API = "https://base.blockscout.com/api";

// Minimum deposit amounts (spam prevention)
const MIN_DEPOSITS: Record<string, number> = {
  ETH: 0.001,
  USDT: 5,
  BTC: 0.00005,
};

// ============================================
// ETH SCANNER (Etherscan API)
// ============================================

export async function scanEthDeposits(): Promise<ScanResult> {
  const redis = getRedis();
  const hotWallet = process.env.HOT_WALLET_ETH_ADDRESS;

  if (!hotWallet) {
    return { chain: "eth", deposits: [], lastScanned: 0, error: "HOT_WALLET_ETH_ADDRESS not set" };
  }

  const deposits: DepositResult[] = [];

  try {
    // Son taranan bloğu al
    const lastBlock = ((await redis.get("scanner:eth:lastBlock")) as number) || 0;
    const startBlock = lastBlock > 0 ? lastBlock + 1 : 0;

    // 1. Native ETH transfers (Base chain via Blockscout)
    const ethUrl = `${BASE_EXPLORER_API}?module=account&action=txlist&address=${hotWallet}&startblock=${startBlock}&endblock=99999999&sort=asc`;
    const ethRes = await fetch(ethUrl);
    const ethData = await ethRes.json();

    let maxBlock = lastBlock;

    if (ethData.status === "1" && Array.isArray(ethData.result)) {
      for (const tx of ethData.result) {
        // Sadece gelen TX'ler (to = hot wallet)
        if (tx.to?.toLowerCase() !== hotWallet.toLowerCase()) continue;
        // Başarılı TX
        if (tx.isError === "1") continue;

        const amount = parseFloat(tx.value) / 1e18;
        if (amount < MIN_DEPOSITS.ETH) continue;

        // Duplicate kontrolü
        const alreadyProcessed = await redis.sismember("scanner:eth:processed", tx.hash);
        if (alreadyProcessed) continue;

        const block = parseInt(tx.blockNumber);
        if (block > maxBlock) maxBlock = block;

        deposits.push({
          chain: "eth",
          coin: "ETH",
          amount,
          txHash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to,
          blockNumber: block,
          timestamp: parseInt(tx.timeStamp) * 1000,
          confirmations: parseInt(tx.confirmations || "0"),
        });
      }
    }

    // 2. ERC-20 USDT/USDC transfers (Base chain via Blockscout)
    const tokenUrl = `${BASE_EXPLORER_API}?module=account&action=tokentx&address=${hotWallet}&startblock=${startBlock}&endblock=99999999&sort=asc`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.status === "1" && Array.isArray(tokenData.result)) {
      for (const tx of tokenData.result) {
        if (tx.to?.toLowerCase() !== hotWallet.toLowerCase()) continue;
        const contractAddr = tx.contractAddress?.toLowerCase();
        if (contractAddr !== USDT_CONTRACT.toLowerCase() && contractAddr !== USDC_CONTRACT.toLowerCase()) continue;
        const coinName = contractAddr === USDC_CONTRACT.toLowerCase() ? "USDC" : "USDT";

        const decimals = parseInt(tx.tokenDecimal || "6");
        const amount = parseFloat(tx.value) / Math.pow(10, decimals);
        if (amount < MIN_DEPOSITS.USDT) continue;

        const alreadyProcessed = await redis.sismember("scanner:eth:processed", tx.hash);
        if (alreadyProcessed) continue;

        const block = parseInt(tx.blockNumber);
        if (block > maxBlock) maxBlock = block;

        deposits.push({
          chain: "eth",
          coin: coinName,
          amount,
          txHash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to,
          blockNumber: block,
          timestamp: parseInt(tx.timeStamp) * 1000,
          confirmations: parseInt(tx.confirmations || "0"),
        });
      }
    }

    // Son bloğu güncelle
    if (maxBlock > lastBlock) {
      await redis.set("scanner:eth:lastBlock", maxBlock.toString());
    }

    return { chain: "eth", deposits, lastScanned: maxBlock };
  } catch (error: any) {
    console.error("ETH scanner error:", error.message);
    return { chain: "eth", deposits: [], lastScanned: 0, error: error.message };
  }
}

// ============================================
// BTC SCANNER (Mempool.space API)
// ============================================

export async function scanBtcDeposits(): Promise<ScanResult> {
  const redis = getRedis();
  const hotWallet = process.env.HOT_WALLET_BTC_ADDRESS;

  if (!hotWallet) {
    return { chain: "btc", deposits: [], lastScanned: "", error: "HOT_WALLET_BTC_ADDRESS not set" };
  }

  const deposits: DepositResult[] = [];

  try {
    // Son taranan TX id
    const lastTxid = ((await redis.get("scanner:btc:lastTxid")) as string) || "";

    // Mempool.space API — confirmed TX'ler
    const url = `https://mempool.space/api/address/${hotWallet}/txs`;
    const res = await fetch(url);
    const txs = await res.json();

    if (!Array.isArray(txs)) {
      return { chain: "btc", deposits: [], lastScanned: lastTxid, error: "Invalid response" };
    }

    let newLastTxid = lastTxid;
    let foundLast = !lastTxid; // İlk çalışmada hepsini al

    for (const tx of txs) {
      // Confirmed olmayanları atla
      if (!tx.status?.confirmed) continue;

      // Daha önce tarananları atla
      if (tx.txid === lastTxid) break;

      // Bu TX'te hot wallet'a gelen output'ları bul
      let receivedAmount = 0;
      for (const vout of tx.vout || []) {
        if (vout.scriptpubkey_address === hotWallet) {
          receivedAmount += vout.value / 1e8; // satoshi → BTC
        }
      }

      if (receivedAmount < MIN_DEPOSITS.BTC) continue;

      // Gönderen adresi (ilk input'tan)
      const fromAddr = tx.vin?.[0]?.prevout?.scriptpubkey_address || "unknown";

      if (!newLastTxid || txs.indexOf(tx) === 0) {
        newLastTxid = tx.txid;
      }

      deposits.push({
        chain: "btc",
        coin: "BTC",
        amount: receivedAmount,
        txHash: tx.txid,
        fromAddress: fromAddr,
        toAddress: hotWallet,
        blockNumber: tx.status.block_height || 0,
        timestamp: (tx.status.block_time || Math.floor(Date.now() / 1000)) * 1000,
      });
    }

    // Son TX'i güncelle
    if (newLastTxid && newLastTxid !== lastTxid) {
      await redis.set("scanner:btc:lastTxid", newLastTxid);
    }

    return { chain: "btc", deposits, lastScanned: newLastTxid };
  } catch (error: any) {
    console.error("BTC scanner error:", error.message);
    return { chain: "btc", deposits: [], lastScanned: "", error: error.message };
  }
}


// ============================================
// MASTER SCAN — Tüm chain'leri tara
// ============================================

export interface FullScanResult {
  totalDeposits: number;
  chains: ScanResult[];
  allDeposits: DepositResult[];
  errors: string[];
  timestamp: number;
}

export async function scanAllChains(): Promise<FullScanResult> {
  const results = await Promise.allSettled([
    scanEthDeposits(),
    scanBtcDeposits(),
  ]);

  const chains: ScanResult[] = [];
  const allDeposits: DepositResult[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      chains.push(result.value);
      allDeposits.push(...result.value.deposits);
      if (result.value.error) {
        errors.push(`${result.value.chain}: ${result.value.error}`);
      }
    } else {
      errors.push(`Scanner failed: ${result.reason}`);
    }
  }

  return {
    totalDeposits: allDeposits.length,
    chains,
    allDeposits,
    errors,
    timestamp: Date.now(),
  };
}
