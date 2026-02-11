// src/lib/deposit-scanner.ts
// Direct Blockchain Deposit Scanner — NowPayments'tan bağımsız treasury
// 4 chain: ETH (+ USDT ERC-20), BTC, XRP, SOL

import { getRedis } from "./redis";

// ============================================
// TYPES
// ============================================

export interface DepositResult {
  chain: "eth" | "btc" | "xrp" | "sol";
  coin: string; // ETH, USDT, BTC, XRP, SOL
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

// USDT ERC-20 contract (Ethereum mainnet)
const USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";

// Minimum deposit amounts (spam prevention)
const MIN_DEPOSITS: Record<string, number> = {
  ETH: 0.001,
  USDT: 5,
  BTC: 0.00005,
  XRP: 1,
  SOL: 0.01,
};

// ============================================
// ETH SCANNER (Etherscan API)
// ============================================

export async function scanEthDeposits(): Promise<ScanResult> {
  const redis = getRedis();
  const hotWallet = process.env.HOT_WALLET_ETH_ADDRESS;
  const apiKey = process.env.ETHERSCAN_API_KEY || "";

  if (!hotWallet) {
    return { chain: "eth", deposits: [], lastScanned: 0, error: "HOT_WALLET_ETH_ADDRESS not set" };
  }

  const deposits: DepositResult[] = [];

  try {
    // Son taranan bloğu al
    const lastBlock = ((await redis.get("scanner:eth:lastBlock")) as number) || 0;
    const startBlock = lastBlock > 0 ? lastBlock + 1 : "latest";

    // 1. Native ETH transfers
    const ethUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${hotWallet}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${apiKey}`;
    const ethRes = await fetch(ethUrl);
    const ethData = await ethRes.json();

    let maxBlock = lastBlock;

    if (ethData.status === "1" && Array.isArray(ethData.result)) {
      for (const tx of ethData.result) {
        // Sadece gelen TX'ler (to = hot wallet)
        if (tx.to?.toLowerCase() !== hotWallet.toLowerCase()) continue;
        // Başarılı TX
        if (tx.isError !== "0" && tx.isError !== "") continue;

        const amount = parseFloat(tx.value) / 1e18;
        if (amount < MIN_DEPOSITS.ETH) continue;

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

    // 2. ERC-20 USDT transfers
    const tokenUrl = `https://api.etherscan.io/api?module=account&action=tokentx&address=${hotWallet}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${apiKey}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.status === "1" && Array.isArray(tokenData.result)) {
      for (const tx of tokenData.result) {
        // Sadece gelen USDT
        if (tx.to?.toLowerCase() !== hotWallet.toLowerCase()) continue;
        if (tx.contractAddress?.toLowerCase() !== USDT_CONTRACT) continue;

        const decimals = parseInt(tx.tokenDecimal || "6");
        const amount = parseFloat(tx.value) / Math.pow(10, decimals);
        if (amount < MIN_DEPOSITS.USDT) continue;

        const block = parseInt(tx.blockNumber);
        if (block > maxBlock) maxBlock = block;

        deposits.push({
          chain: "eth",
          coin: "USDT",
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
// XRP SCANNER (XRPL JSON-RPC)
// ============================================

export async function scanXrpDeposits(): Promise<ScanResult> {
  const redis = getRedis();
  const hotWallet = process.env.HOT_WALLET_XRP_ADDRESS;

  if (!hotWallet) {
    return { chain: "xrp", deposits: [], lastScanned: 0, error: "HOT_WALLET_XRP_ADDRESS not set" };
  }

  const deposits: DepositResult[] = [];

  try {
    // Son taranan ledger index
    const lastLedger = ((await redis.get("scanner:xrp:lastLedger")) as number) || -1;

    // XRPL JSON-RPC
    const rpcUrl = "https://s1.ripple.com:51234/";
    const body = {
      method: "account_tx",
      params: [
        {
          account: hotWallet,
          ledger_index_min: lastLedger > 0 ? lastLedger + 1 : -1,
          ledger_index_max: -1,
          limit: 100,
          forward: true,
        },
      ],
    };

    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const transactions = data.result?.transactions || [];

    let maxLedger = lastLedger;

    for (const entry of transactions) {
      const tx = entry.tx;
      const meta = entry.meta;

      // Sadece Payment tipinde ve başarılı TX'ler
      if (tx?.TransactionType !== "Payment") continue;
      if (meta?.TransactionResult !== "tesSUCCESS") continue;

      // Sadece gelen payment'lar (destination = hot wallet)
      if (tx.Destination !== hotWallet) continue;

      // XRP miktarını hesapla (drops → XRP)
      const delivered = meta?.delivered_amount || tx.Amount;
      if (typeof delivered !== "string") continue; // IOU payment'ları atla

      const amount = parseInt(delivered) / 1e6;
      if (amount < MIN_DEPOSITS.XRP) continue;

      const ledgerIndex = tx.ledger_index || entry.ledger_index || 0;
      if (ledgerIndex > maxLedger) maxLedger = ledgerIndex;

      deposits.push({
        chain: "xrp",
        coin: "XRP",
        amount,
        txHash: tx.hash,
        fromAddress: tx.Account,
        toAddress: hotWallet,
        blockNumber: ledgerIndex,
        timestamp: (tx.date ? (tx.date + 946684800) : Math.floor(Date.now() / 1000)) * 1000,
      });
    }

    // Son ledger'ı güncelle
    if (maxLedger > lastLedger) {
      await redis.set("scanner:xrp:lastLedger", maxLedger.toString());
    }

    return { chain: "xrp", deposits, lastScanned: maxLedger };
  } catch (error: any) {
    console.error("XRP scanner error:", error.message);
    return { chain: "xrp", deposits: [], lastScanned: 0, error: error.message };
  }
}

// ============================================
// SOL SCANNER (Solana RPC)
// ============================================

export async function scanSolDeposits(): Promise<ScanResult> {
  const redis = getRedis();
  const hotWallet = process.env.HOT_WALLET_SOL_ADDRESS;

  if (!hotWallet) {
    return { chain: "sol", deposits: [], lastScanned: "", error: "HOT_WALLET_SOL_ADDRESS not set" };
  }

  const deposits: DepositResult[] = [];

  try {
    // Son taranan signature
    const lastSignature = ((await redis.get("scanner:sol:lastSignature")) as string) || "";

    // Solana RPC — getSignaturesForAddress
    const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
    const sigParams: any = {
      limit: 50,
    };
    if (lastSignature) {
      sigParams.until = lastSignature;
    }

    const sigRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getSignaturesForAddress",
        params: [hotWallet, sigParams],
      }),
    });

    const sigData = await sigRes.json();
    const signatures = sigData.result || [];

    if (signatures.length === 0) {
      return { chain: "sol", deposits, lastScanned: lastSignature };
    }

    // En yeni signature'ı kaydet
    const newestSig = signatures[0]?.signature || lastSignature;

    // Her TX'i kontrol et (en yeni → en eski sırada)
    for (const sig of signatures) {
      if (sig.err) continue; // Başarısız TX'leri atla

      // TX detayını al
      const txRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getTransaction",
          params: [sig.signature, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
        }),
      });

      const txData = await txRes.json();
      const transaction = txData.result;
      if (!transaction) continue;

      // SOL transfer bul — pre/post balance farkı
      const accountKeys = transaction.transaction?.message?.accountKeys || [];
      const preBalances = transaction.meta?.preBalances || [];
      const postBalances = transaction.meta?.postBalances || [];

      // Hot wallet'ın index'ini bul
      const walletIndex = accountKeys.findIndex(
        (key: any) => (typeof key === "string" ? key : key.pubkey) === hotWallet
      );

      if (walletIndex === -1) continue;

      const preBalance = preBalances[walletIndex] || 0;
      const postBalance = postBalances[walletIndex] || 0;
      const diff = (postBalance - preBalance) / 1e9; // lamports → SOL

      if (diff < MIN_DEPOSITS.SOL) continue;

      // Gönderen adresi (fee payer = ilk account)
      const fromAddr = typeof accountKeys[0] === "string" ? accountKeys[0] : accountKeys[0]?.pubkey || "unknown";

      deposits.push({
        chain: "sol",
        coin: "SOL",
        amount: diff,
        txHash: sig.signature,
        fromAddress: fromAddr,
        toAddress: hotWallet,
        blockNumber: transaction.slot || 0,
        timestamp: (sig.blockTime || Math.floor(Date.now() / 1000)) * 1000,
      });
    }

    // Son signature'ı güncelle
    if (newestSig && newestSig !== lastSignature) {
      await redis.set("scanner:sol:lastSignature", newestSig);
    }

    return { chain: "sol", deposits, lastScanned: newestSig };
  } catch (error: any) {
    console.error("SOL scanner error:", error.message);
    return { chain: "sol", deposits: [], lastScanned: "", error: error.message };
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
    scanXrpDeposits(),
    scanSolDeposits(),
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
