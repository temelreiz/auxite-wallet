import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getUserBalance, setBalance, incrementBalance, addBonusAuxm, ensureUser } from "@/lib/redis";
import { ethers } from "ethers";
import { METAL_TOKENS, USDT_ADDRESS } from "@/config/contracts-v8";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const USE_MOCK = !process.env.UPSTASH_REDIS_REST_URL;

const MOCK_BALANCE = {
  auxm: 1250.5, bonusAuxm: 25, totalAuxm: 1275.5, bonusExpiresAt: "2025-03-01T00:00:00Z",
  auxg: 15.75, auxs: 500, auxpt: 2.5, auxpd: 1.25, eth: 0.5, btc: 0.01, xrp: 100, sol: 2.5, usdt: 0,
};

// Blockchain RPC - Ethereum Mainnet
const ETH_RPC_URL = process.env.ETH_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo";
// Sepolia for tokens
const SEPOLIA_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

// Token Contracts from central config
const TOKEN_CONTRACTS: Record<string, { address: string; decimals: number }> = {
  usdt: { address: USDT_ADDRESS, decimals: 6 },
  auxg: { address: METAL_TOKENS.AUXG, decimals: 3 },
  auxs: { address: METAL_TOKENS.AUXS, decimals: 3 },
  auxpt: { address: METAL_TOKENS.AUXPT, decimals: 3 },
  auxpd: { address: METAL_TOKENS.AUXPD, decimals: 3 },
};

// Which tokens are on-chain vs off-chain
const ON_CHAIN_TOKENS = ["usdt", "auxg", "auxs", "auxpt", "auxpd"];
const OFF_CHAIN_TOKENS = ["auxm", "bonusauxm", "btc", "xrp", "sol"];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN BALANCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

// Get native ETH balance from Ethereum Mainnet
async function getEthBalance(address: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  } catch (error) {
    console.error('ETH balance error:', error);
    return 0;
  }
}

async function getBlockchainBalance(address: string, token: string): Promise<number> {
  try {
    const tokenConfig = TOKEN_CONTRACTS[token.toLowerCase()];
    if (!tokenConfig || !tokenConfig.address) {
      return 0;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const contract = new ethers.Contract(tokenConfig.address, ERC20_ABI, provider);
    
    const balance = await contract.balanceOf(address);
    const decimals = tokenConfig.decimals;
    
    return parseFloat(ethers.formatUnits(balance, decimals));
  } catch (error) {
    console.error(`Blockchain balance error for ${token}:`, error);
    return 0;
  }
}

async function getAllBlockchainBalances(address: string): Promise<Record<string, number>> {
  const balances: Record<string, number> = {};
  
  // Fetch ETH balance from mainnet
  const ethPromise = getEthBalance(address);
  
  // Fetch all ERC20 token balances in parallel
  const tokenPromises = ON_CHAIN_TOKENS.map(async (token) => {
    const balance = await getBlockchainBalance(address, token);
    return { token, balance };
  });
  
  const [ethBalance, ...tokenResults] = await Promise.all([ethPromise, ...tokenPromises]);
  
  balances.eth = ethBalance;
  
  tokenResults.forEach(({ token, balance }) => {
    balances[token] = balance;
  });
  
  return balances;
}


// Redis for staked amounts
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Get staked amounts from active staking positions
async function getStakedAmounts(address: string): Promise<Record<string, number>> {
  const staked: Record<string, number> = {
    auxg: 0,
    auxs: 0,
    auxpt: 0,
    auxpd: 0,
  };
  
  try {
    // Get all staking positions for this user
    const stakingKey = `user:${address.toLowerCase()}:staking`;
    const positions = await redisClient.lrange(stakingKey, 0, -1);
    
    const now = Date.now();
    
    for (const pos of positions) {
      try {
        const position = typeof pos === 'string' ? JSON.parse(pos) : pos;
        
        // Only count active positions that haven't been withdrawn
        if (position.status === 'active' && position.endDate > now) {
          const metal = position.metal.toLowerCase();
          if (staked.hasOwnProperty(metal)) {
            staked[metal] += position.amount || 0;
          }
        }
      } catch (e) {
        // Skip invalid positions
      }
    }
  } catch (e) {
    console.error('Error getting staked amounts:', e);
  }
  
  return staked;
}

// ═══════════════════════════════════════════════════════════════════════════
// HYBRID BALANCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

// Check if user is custodial wallet (AWS KMS managed)
async function isCustodialWallet(address: string): Promise<boolean> {
  try {
    const userKey = `user:${address.toLowerCase()}`;
    const userData = await redisClient.hgetall(userKey);
    return userData?.walletType === 'custodial';
  } catch {
    return false;
  }
}

async function getHybridBalance(address: string): Promise<{
  balances: Record<string, number>;
  sources: Record<string, "blockchain" | "redis">;
  stakedAmounts?: Record<string, number>;
  onChainBalances?: Record<string, number>;
  walletType?: string;
}> {
  // 1. Get Redis balance (off-chain data)
  const redisBalance = await getUserBalance(address);

  // 2. Check if custodial wallet - custodial users use off-chain balances
  const isCustodial = await isCustodialWallet(address);

  // 3. Get Blockchain balances (only for external wallets)
  // For custodial wallets, skip blockchain calls to improve performance
  const blockchainBalances = isCustodial
    ? { eth: 0, usdt: 0, auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 }
    : await getAllBlockchainBalances(address);

  // 4. Get staked amounts
  const stakedAmounts = await getStakedAmounts(address);

  // 5. Merge balances based on wallet type
  const redisEth = parseFloat(String(redisBalance.eth || 0));
  const redisUsdt = parseFloat(String(redisBalance.usdt || 0));
  const redisAuxg = parseFloat(String(redisBalance.auxg || 0));
  const redisAuxs = parseFloat(String(redisBalance.auxs || 0));
  const redisAuxpt = parseFloat(String(redisBalance.auxpt || 0));
  const redisAuxpd = parseFloat(String(redisBalance.auxpd || 0));

  const balances: Record<string, number> = {
    // Off-chain from Redis (always)
    auxm: parseFloat(String(redisBalance.auxm || 0)),
    bonusAuxm: parseFloat(String((redisBalance as any).bonusauxm || redisBalance.bonusAuxm || 0)),
    btc: parseFloat(String(redisBalance.btc || 0)),
    xrp: parseFloat(String(redisBalance.xrp || 0)),
    sol: parseFloat(String(redisBalance.sol || 0)),
    usd: parseFloat(String(redisBalance.usd || 0)),

    // ETH: Custodial uses Redis, External uses Blockchain
    eth: isCustodial ? redisEth : (blockchainBalances.eth || 0),

    // ERC20 tokens: Custodial uses Redis, External uses Blockchain + Redis
    usdt: isCustodial ? redisUsdt : ((blockchainBalances.usdt || 0) + redisUsdt),
    auxg: isCustodial
      ? Math.max(0, redisAuxg - (stakedAmounts.auxg || 0))
      : Math.max(0, (blockchainBalances.auxg || 0) + redisAuxg - (stakedAmounts.auxg || 0)),
    auxs: isCustodial
      ? Math.max(0, redisAuxs - (stakedAmounts.auxs || 0))
      : Math.max(0, (blockchainBalances.auxs || 0) + redisAuxs - (stakedAmounts.auxs || 0)),
    auxpt: isCustodial
      ? Math.max(0, redisAuxpt - (stakedAmounts.auxpt || 0))
      : Math.max(0, (blockchainBalances.auxpt || 0) + redisAuxpt - (stakedAmounts.auxpt || 0)),
    auxpd: isCustodial
      ? Math.max(0, redisAuxpd - (stakedAmounts.auxpd || 0))
      : Math.max(0, (blockchainBalances.auxpd || 0) + redisAuxpd - (stakedAmounts.auxpd || 0)),
  };

  // Calculate totalAuxm
  balances.totalAuxm = balances.auxm + balances.bonusAuxm;

  // Track sources for debugging
  const sources: Record<string, "blockchain" | "redis"> = {
    auxm: "redis",
    bonusAuxm: "redis",
    eth: isCustodial ? "redis" : "blockchain",
    btc: "redis",
    xrp: "redis",
    sol: "redis",
    usd: "redis",
    usdt: isCustodial ? "redis" : "blockchain",
    auxg: isCustodial ? "redis" : "blockchain",
    auxs: isCustodial ? "redis" : "blockchain",
    auxpt: isCustodial ? "redis" : "blockchain",
    auxpd: isCustodial ? "redis" : "blockchain",
  };

  return {
    balances,
    sources,
    stakedAmounts,
    onChainBalances: blockchainBalances,
    walletType: isCustodial ? 'custodial' : 'external'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const address = new URL(request.url).searchParams.get("address");
  const source = new URL(request.url).searchParams.get("source"); // "redis", "blockchain", or "hybrid" (default)
  
  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  await ensureUser(address);
  
  // Mock mode
  if (USE_MOCK) {
    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      balances: MOCK_BALANCE,
      summary: {
        totalAuxm: MOCK_BALANCE.totalAuxm,
        withdrawableAuxm: MOCK_BALANCE.auxm,
        lockedBonusAuxm: MOCK_BALANCE.bonusAuxm,
        bonusStatus: MOCK_BALANCE.bonusAuxm > 0 ? { amount: MOCK_BALANCE.bonusAuxm, expiresAt: MOCK_BALANCE.bonusExpiresAt } : null,
        metals: { auxg: MOCK_BALANCE.auxg, auxs: MOCK_BALANCE.auxs, auxpt: MOCK_BALANCE.auxpt, auxpd: MOCK_BALANCE.auxpd },
        crypto: { eth: MOCK_BALANCE.eth, btc: MOCK_BALANCE.btc, xrp: MOCK_BALANCE.xrp, sol: MOCK_BALANCE.sol, usdt: MOCK_BALANCE.usdt },
      },
      timestamp: Date.now(),
      source: "mock",
    });
  }

  try {
    let balances: Record<string, number>;
    let sources: Record<string, string> | undefined;
    let responseSource: string;
    let onChainBalances: Record<string, number> | undefined;
    let stakedAmounts: Record<string, number> | undefined;

    if (source === "redis") {
      // Only Redis
      const redisBalance = await getUserBalance(address);
      balances = {
        auxm: parseFloat(String(redisBalance.auxm || 0)),
        bonusAuxm: parseFloat(String((redisBalance as any).bonusauxm || redisBalance.bonusAuxm || 0)),
        totalAuxm: parseFloat(String(redisBalance.totalAuxm || 0)),
        auxg: parseFloat(String(redisBalance.auxg || 0)),
        auxs: parseFloat(String(redisBalance.auxs || 0)),
        auxpt: parseFloat(String(redisBalance.auxpt || 0)),
        auxpd: parseFloat(String(redisBalance.auxpd || 0)),
        eth: parseFloat(String(redisBalance.eth || 0)),
        btc: parseFloat(String(redisBalance.btc || 0)),
        xrp: parseFloat(String(redisBalance.xrp || 0)),
        sol: parseFloat(String(redisBalance.sol || 0)),
        usdt: parseFloat(String(redisBalance.usdt || 0)),
        usd: parseFloat(String(redisBalance.usd || 0)),
      };
      responseSource = "redis";
    } else if (source === "blockchain") {
      // Only Blockchain (for on-chain tokens + ETH)
      const blockchainBalances = await getAllBlockchainBalances(address);
      balances = {
        auxm: 0,
        bonusAuxm: 0,
        totalAuxm: 0,
        eth: blockchainBalances.eth || 0,
        ...blockchainBalances,
        btc: 0,
        xrp: 0,
        sol: 0,
        usd: 0,
      };
      responseSource = "blockchain";
    } else {
      // Hybrid (default) - Best of both worlds
      const result = await getHybridBalance(address);
      onChainBalances = result.onChainBalances;
      balances = result.balances;
      sources = result.sources;
      stakedAmounts = result.stakedAmounts;
      responseSource = result.walletType === 'custodial' ? 'custodial' : 'hybrid';

      // Debug log
      console.log(`📊 Balance for ${address} (${result.walletType}):`, {
        eth: balances.eth,
        eth_source: sources?.eth,
        auxs_total: (onChainBalances?.auxs || 0) + parseFloat(String((await getUserBalance(address)).auxs || 0)),
        auxs_staked: stakedAmounts?.auxs || 0,
        auxs_available: balances.auxs,
      });
    }

    // Fetch transactions
    const txKey = `user:${address.toLowerCase()}:transactions`;
    const rawTransactions = await redisClient.lrange(txKey, 0, 49);
    const transactions = rawTransactions.map((tx: any) => {
      try {
        return typeof tx === 'string' ? JSON.parse(tx) : tx;
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      balances,
      stakedAmounts,
      transactions,
      summary: {
        totalAuxm: balances.totalAuxm || (balances.auxm + balances.bonusAuxm),
        withdrawableAuxm: balances.auxm,
        lockedBonusAuxm: balances.bonusAuxm,
        bonusStatus: balances.bonusAuxm > 0 ? { amount: balances.bonusAuxm, expiresAt: null } : null,
        metals: { 
          auxg: balances.auxg, 
          auxs: balances.auxs, 
          auxpt: balances.auxpt, 
          auxpd: balances.auxpd 
        },
        crypto: { 
          eth: balances.eth, 
          btc: balances.btc, 
          xrp: balances.xrp, 
          sol: balances.sol, 
          usdt: balances.usdt 
        },
        totalValueUsd: balances.totalAuxm || 0,
      },
      timestamp: Date.now(),
      source: responseSource,
      ...(sources && { sources }),
      ...(onChainBalances && { onChainBalances }),
    });
  } catch (error) {
    console.error("Balance API error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch balance", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  const envKey = process.env.INTERNAL_API_KEY;
  
  if (apiKey !== envKey) {
    return NextResponse.json({ 
      error: "Unauthorized",
      debug: { received: apiKey, expected: envKey ? "[SET]" : "[NOT SET]" }
    }, { status: 401 });
  }

  const { address, updates, operation = "increment" } = await request.json();
  if (!address || !updates) {
    return NextResponse.json({ error: "Missing address or updates" }, { status: 400 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ success: true, message: "[MOCK] Updated", source: "mock" });
  }

  const success = operation === "set" 
    ? await setBalance(address, updates)
    : await incrementBalance(address, updates);

  // Return hybrid balance after update
  const { balances } = await getHybridBalance(address);
  return NextResponse.json({ success, newBalance: balances, source: "hybrid" });
}

export async function PUT(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address, amount, expiresInDays = 30 } = await request.json();
  if (!address || !amount) {
    return NextResponse.json({ error: "Missing address or amount" }, { status: 400 });
  }

  if (USE_MOCK) {
    return NextResponse.json({ success: true, message: "[MOCK] Bonus added", source: "mock" });
  }

  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  await addBonusAuxm(address, amount, expiresAt);
  
  // Return hybrid balance after update
  const { balances } = await getHybridBalance(address);
  return NextResponse.json({ success: true, newBalance: balances, expiresAt: expiresAt.toISOString(), source: "hybrid" });
}
