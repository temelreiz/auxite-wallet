import { NextRequest, NextResponse } from "next/server";
import { getUserBalance, setBalance, incrementBalance, addBonusAuxm, ensureUser } from "@/lib/redis";
import { ethers } from "ethers";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const USE_MOCK = !process.env.UPSTASH_REDIS_REST_URL;

const MOCK_BALANCE = {
  auxm: 1250.5, bonusAuxm: 25, totalAuxm: 1275.5, bonusExpiresAt: "2025-03-01T00:00:00Z",
  auxg: 15.75, auxs: 500, auxpt: 2.5, auxpd: 1.25, eth: 0.5, btc: 0.01, xrp: 100, sol: 2.5, usdt: 0,
};

// Blockchain RPC
const RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

// Token Contracts (On-chain)
const TOKEN_CONTRACTS: Record<string, { address: string; decimals: number }> = {
  usdt: { 
    address: "0x738e3134d83014B7a63CFF08C13CBBF0671EEeF2", 
    decimals: 6 
  },
  auxg: {
    address: "0x74C143Acd7Ee02CfffD1c23FB5B2Ee9dEBE369AC",
    decimals: 3
  },
  auxs: { 
    address: "0xb6179d8eDAC23c5d4F69B128a1b974baB788828D", 
    decimals: 3 
  },
  auxpt: { 
    address: "0x02A712F9aF81Ee9E55b154e5bae08Fe831c59c15", 
    decimals: 3 
  },
  auxpd: { 
    address: "0xb0d5929b5F0486865072c6933911947e999947E0", 
    decimals: 3 
  },
};

// Which tokens are on-chain vs off-chain
const ON_CHAIN_TOKENS = ["usdt", "auxg", "auxs", "auxpt", "auxpd"];
const OFF_CHAIN_TOKENS = ["auxm", "bonusauxm", "eth", "btc", "xrp", "sol"];

// ERC20 ABI (minimal)
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN BALANCE HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function getBlockchainBalance(address: string, token: string): Promise<number> {
  try {
    const tokenConfig = TOKEN_CONTRACTS[token.toLowerCase()];
    if (!tokenConfig || !tokenConfig.address) {
      // Contract not configured, return 0
      return 0;
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
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
  
  // Fetch all on-chain balances in parallel
  const promises = ON_CHAIN_TOKENS.map(async (token) => {
    const balance = await getBlockchainBalance(address, token);
    return { token, balance };
  });
  
  const results = await Promise.all(promises);
  
  results.forEach(({ token, balance }) => {
    balances[token] = balance;
  });
  
  return balances;
}

// ═══════════════════════════════════════════════════════════════════════════
// HYBRID BALANCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

async function getHybridBalance(address: string): Promise<{
  balances: Record<string, number>;
  sources: Record<string, "blockchain" | "redis">;
}> {
  // 1. Get Redis balance (off-chain data)
  const redisBalance = await getUserBalance(address);
  
  // 2. Get Blockchain balances (on-chain tokens)
  const blockchainBalances = await getAllBlockchainBalances(address);
  
  // 3. Merge - prioritize blockchain for on-chain tokens
  const balances: Record<string, number> = {
    // Off-chain from Redis
    auxm: parseFloat(String(redisBalance.auxm || 0)),
    bonusAuxm: parseFloat(String(redisBalance.bonusAuxm || 0)),
    eth: parseFloat(String(redisBalance.eth || 0)),
    btc: parseFloat(String(redisBalance.btc || 0)),
    xrp: parseFloat(String(redisBalance.xrp || 0)),
    sol: parseFloat(String(redisBalance.sol || 0)),
    usd: parseFloat(String(redisBalance.usd || 0)),
    
    // On-chain from Blockchain
    usdt: blockchainBalances.usdt || 0,
    auxg: blockchainBalances.auxg || 0,
    auxs: blockchainBalances.auxs || 0,
    auxpt: blockchainBalances.auxpt || 0,
    auxpd: blockchainBalances.auxpd || 0,
  };
  
  // Calculate totalAuxm
  balances.totalAuxm = balances.auxm + balances.bonusAuxm;
  
  // Track sources for debugging
  const sources: Record<string, "blockchain" | "redis"> = {
    auxm: "redis",
    bonusAuxm: "redis",
    eth: "redis",
    btc: "redis",
    xrp: "redis",
    sol: "redis",
    usd: "redis",
    usdt: "blockchain",
    auxg: "blockchain",
    auxs: "blockchain",
    auxpt: "blockchain",
    auxpd: "blockchain",
  };
  
  return { balances, sources };
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

    if (source === "redis") {
      // Only Redis
      const redisBalance = await getUserBalance(address);
      balances = {
        auxm: parseFloat(String(redisBalance.auxm || 0)),
        bonusAuxm: parseFloat(String(redisBalance.bonusAuxm || 0)),
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
      // Only Blockchain (for on-chain tokens)
      const blockchainBalances = await getAllBlockchainBalances(address);
      balances = {
        auxm: 0,
        bonusAuxm: 0,
        totalAuxm: 0,
        ...blockchainBalances,
        eth: 0,
        btc: 0,
        xrp: 0,
        sol: 0,
        usd: 0,
      };
      responseSource = "blockchain";
    } else {
      // Hybrid (default) - Best of both worlds
      const result = await getHybridBalance(address);
      balances = result.balances;
      sources = result.sources;
      responseSource = "hybrid";
    }

    return NextResponse.json({
      success: true,
      address: address.toLowerCase(),
      balances,
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
      ...(sources && { sources }), // Include source breakdown for debugging
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
