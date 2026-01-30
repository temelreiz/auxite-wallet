// /api/user/portfolio - Unified Portfolio API
// Single source of truth for both web and mobile
// All calculations done here, frontends just display

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { getUserBalance } from "@/lib/redis";
import { ethers } from "ethers";
import { METAL_TOKENS, USDT_ADDRESS } from "@/config/contracts-v8";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Blockchain RPC
const ETH_RPC_URL = process.env.ETH_RPC_URL || "https://eth-mainnet.g.alchemy.com/v2/demo";
const SEPOLIA_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

// Token Contracts
const TOKEN_CONTRACTS: Record<string, { address: string; decimals: number }> = {
  usdt: { address: USDT_ADDRESS, decimals: 6 },
  auxg: { address: METAL_TOKENS.AUXG, decimals: 3 },
  auxs: { address: METAL_TOKENS.AUXS, decimals: 3 },
  auxpt: { address: METAL_TOKENS.AUXPT, decimals: 3 },
  auxpd: { address: METAL_TOKENS.AUXPD, decimals: 3 },
};

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PortfolioResponse {
  success: boolean;
  address: string;
  totalValue: number;
  availableValue: number;
  lockedValue: number;
  pendingValue: number;
  breakdown: {
    metals: { value: number; items: any[] };
    crypto: { value: number; items: any[] };
    allocations: { value: number; totalGrams: Record<string, number>; items: any[] };
    staking: { value: number; totalGrams: Record<string, number>; items: any[] };
  };
  prices: {
    metals: Record<string, { ask: number; bid: number; spot: number; change24h: number }>;
    crypto: Record<string, number>;
    usdt: number;
  };
  balances: {
    metals: Record<string, number>;
    crypto: Record<string, number>;
    auxm: number;
    bonusAuxm: number;
  };
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKCHAIN BALANCE FETCHING
// ═══════════════════════════════════════════════════════════════════════════

async function getBlockchainBalances(address: string) {
  const balances: Record<string, number> = { eth: 0, usdt: 0, auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };

  try {
    // ETH balance from mainnet
    const ethProvider = new ethers.JsonRpcProvider(ETH_RPC_URL);
    const ethBalance = await ethProvider.getBalance(address);
    balances.eth = parseFloat(ethers.formatEther(ethBalance));

    // Token balances from Sepolia
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);

    await Promise.all(
      Object.entries(TOKEN_CONTRACTS).map(async ([symbol, config]) => {
        try {
          if (!config.address || config.address === "0x0000000000000000000000000000000000000000") return;
          const contract = new ethers.Contract(config.address, ERC20_ABI, sepoliaProvider);
          const balance = await contract.balanceOf(address);
          balances[symbol] = parseFloat(ethers.formatUnits(balance, config.decimals));
        } catch (e) {
          // Silent fail
        }
      })
    );
  } catch (e) {
    console.error("Blockchain balance error:", e);
  }

  return balances;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICE FETCHING
// ═══════════════════════════════════════════════════════════════════════════

async function getMetalPrices(): Promise<{
  ask: Record<string, number>;
  bid: Record<string, number>;
  spot: Record<string, number>;
  changes: Record<string, number>;
}> {
  try {
    // Check cache first
    const cached = await redis.get("metal_prices_cache") as any;
    if (cached && (Date.now() - (cached.timestamp || 0)) < 120000) {
      return {
        ask: cached.prices || {},
        bid: cached.bidPrices || {},
        spot: cached.spotPrices || {},
        changes: cached.changes || {},
      };
    }

    // Fetch from GoldAPI
    const GOLD_API_KEY = process.env.GOLD_API_KEY;
    const TROY_OZ_TO_GRAM = 31.1035;
    const metals = ["XAU", "XAG", "XPT", "XPD"];
    const metalMap: Record<string, string> = { XAU: "AUXG", XAG: "AUXS", XPT: "AUXPT", XPD: "AUXPD" };

    const ask: Record<string, number> = {};
    const bid: Record<string, number> = {};
    const spot: Record<string, number> = {};
    const changes: Record<string, number> = {};

    const spreadSettings = await redis.get("spread_settings") as any || {
      AUXG: { askAdjust: 3, bidAdjust: -3 },
      AUXS: { askAdjust: 10, bidAdjust: -10 },
      AUXPT: { askAdjust: 10, bidAdjust: -10 },
      AUXPD: { askAdjust: 2.5, bidAdjust: -2.5 },
    };

    for (const metal of metals) {
      try {
        const res = await fetch(`https://www.goldapi.io/api/${metal}/USD`, {
          headers: { "x-access-token": GOLD_API_KEY || "" },
        });
        if (res.ok) {
          const data = await res.json();
          const symbol = metalMap[metal];
          const pricePerGram = (data.price || 0) / TROY_OZ_TO_GRAM;
          const spread = spreadSettings[symbol] || { askAdjust: 5, bidAdjust: -5 };
          spot[symbol] = data.price || 0;
          ask[symbol] = pricePerGram * (1 + spread.askAdjust / 100);
          bid[symbol] = pricePerGram * (1 + spread.bidAdjust / 100);
          changes[symbol] = data.chp || 0;
        }
      } catch (e) {
        // Silent
      }
    }

    // Cache
    await redis.set("metal_prices_cache", { prices: ask, bidPrices: bid, spotPrices: spot, changes, timestamp: Date.now() }, { ex: 300 });

    return { ask, bid, spot, changes };
  } catch (e) {
    console.error("Metal prices error:", e);
    return {
      ask: { AUXG: 170, AUXS: 3.5, AUXPT: 80, AUXPD: 60 },
      bid: { AUXG: 160, AUXS: 3.0, AUXPT: 70, AUXPD: 55 },
      spot: { AUXG: 5100, AUXS: 100, AUXPT: 2400, AUXPD: 1800 },
      changes: { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 },
    };
  }
}

async function getCryptoPrices(): Promise<Record<string, number>> {
  try {
    const cached = await redis.get("crypto_prices_cache") as any;
    if (cached && (Date.now() - (cached.timestamp || 0)) < 120000) {
      return cached.prices || {};
    }

    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,tether&vs_currencies=usd");
    if (res.ok) {
      const data = await res.json();
      const prices = {
        BTC: data.bitcoin?.usd || 100000,
        ETH: data.ethereum?.usd || 3500,
        XRP: data.ripple?.usd || 2.5,
        SOL: data.solana?.usd || 150,
        USDT: data.tether?.usd || 1,
      };
      await redis.set("crypto_prices_cache", { prices, timestamp: Date.now() }, { ex: 300 });
      return prices;
    }
  } catch (e) {
    console.error("Crypto prices error:", e);
  }
  return { BTC: 100000, ETH: 3500, XRP: 2.5, SOL: 150, USDT: 1 };
}

// ═══════════════════════════════════════════════════════════════════════════
// STAKING & ALLOCATIONS
// ═══════════════════════════════════════════════════════════════════════════

async function getStakedAmounts(address: string): Promise<Record<string, number>> {
  const staked = { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };
  try {
    const key = `stakes:${address.toLowerCase()}`;
    const data = await redis.get(key) as any[];
    if (data && Array.isArray(data)) {
      for (const s of data) {
        if (s.status === "active") {
          const metal = (s.metal || "").toLowerCase();
          const amount = parseFloat(s.amount) || 0;
          if (metal in staked) {
            staked[metal as keyof typeof staked] += amount;
          }
        }
      }
    }
  } catch (e) {
    console.error("Stakes fetch error:", e);
  }
  return staked;
}

async function getStakes(address: string): Promise<any[]> {
  try {
    const key = `stakes:${address.toLowerCase()}`;
    const data = await redis.get(key) as any[];
    if (!data || !Array.isArray(data)) return [];

    const metalNames: Record<string, string> = { AUXG: "Gold", AUXS: "Silver", AUXPT: "Platinum", AUXPD: "Palladium" };

    return data.filter(s => s.status === "active").map(s => {
      const metalSymbol = (s.metal || "AUXS").toUpperCase();
      return {
        id: s.id || s.agreementNo,
        metal: metalNames[metalSymbol] || metalSymbol,
        metalSymbol,
        amount: parseFloat(s.amount || "0"),
        apy: parseFloat(s.apy || "0"),
        duration: parseInt(s.duration || "90"),
        startDate: s.startDate || s.createdAt,
        endDate: s.endDate,
        status: s.status,
      };
    });
  } catch (e) {
    console.error("Stakes fetch error:", e);
    return [];
  }
}

async function getAllocations(address: string): Promise<any[]> {
  try {
    // Get user UID first
    const userKey = `user:${address.toLowerCase()}:meta`;
    const userMeta = await redis.hgetall(userKey) as any;
    const uid = userMeta?.uid;
    if (!uid) return [];

    const allocKey = `allocation:user:${uid}:list`;
    const data = await redis.get(allocKey) as any[];
    if (!data || !Array.isArray(data)) return [];

    const metalNames: Record<string, string> = { AUXG: "Gold", AUXS: "Silver", AUXPT: "Platinum", AUXPD: "Palladium" };

    return data.filter(a => a.status === "active").map(a => {
      const metalSymbol = (a.metal || "AUXG").toUpperCase();
      return {
        id: a.id || a.allocationId,
        metal: metalNames[metalSymbol] || metalSymbol,
        metalSymbol,
        grams: parseFloat(a.grams || "0"),
        vault: a.vault || a.location || "Zurich",
        status: a.status,
      };
    });
  } catch (e) {
    console.error("Allocations fetch error:", e);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ success: false, error: "Address required" }, { status: 400 });
  }

  try {
    // Fetch all data in parallel
    const [metalPrices, cryptoPrices, redisBalance, blockchainBalances, stakedAmounts, stakes, allocations] = await Promise.all([
      getMetalPrices(),
      getCryptoPrices(),
      getUserBalance(address),
      getBlockchainBalances(address),
      getStakedAmounts(address),
      getStakes(address),
      getAllocations(address),
    ]);

    // Merge balances (blockchain + redis - staked)
    const mergedBalances = {
      metals: {
        auxg: Math.max(0, (blockchainBalances.auxg || 0) + (redisBalance.auxg || 0) - (stakedAmounts.auxg || 0)),
        auxs: Math.max(0, (blockchainBalances.auxs || 0) + (redisBalance.auxs || 0) - (stakedAmounts.auxs || 0)),
        auxpt: Math.max(0, (blockchainBalances.auxpt || 0) + (redisBalance.auxpt || 0) - (stakedAmounts.auxpt || 0)),
        auxpd: Math.max(0, (blockchainBalances.auxpd || 0) + (redisBalance.auxpd || 0) - (stakedAmounts.auxpd || 0)),
      },
      crypto: {
        eth: blockchainBalances.eth || redisBalance.eth || 0,
        btc: redisBalance.btc || 0,
        xrp: redisBalance.xrp || 0,
        sol: redisBalance.sol || 0,
        usdt: (blockchainBalances.usdt || 0) + (redisBalance.usdt || 0),
      },
      auxm: redisBalance.auxm || 0,
      bonusAuxm: redisBalance.bonusAuxm || 0,
    };

    // Calculate metal values
    const metalNames: Record<string, string> = { AUXG: "Gold", AUXS: "Silver", AUXPT: "Platinum", AUXPD: "Palladium" };
    const metalItems = Object.entries(mergedBalances.metals)
      .filter(([_, balance]) => balance > 0)
      .map(([symbol, balance]) => {
        const upperSymbol = symbol.toUpperCase();
        const price = metalPrices.ask[upperSymbol] || 0;
        return {
          symbol: upperSymbol,
          name: metalNames[upperSymbol] || upperSymbol,
          balance,
          price,
          value: balance * price,
          change24h: metalPrices.changes[upperSymbol] || 0,
        };
      });
    const metalsValue = metalItems.reduce((sum, m) => sum + m.value, 0);

    // Calculate crypto values
    const cryptoNames: Record<string, string> = { ETH: "Ethereum", BTC: "Bitcoin", XRP: "Ripple", SOL: "Solana", USDT: "Tether" };
    const cryptoItems = Object.entries(mergedBalances.crypto)
      .filter(([_, balance]) => balance > 0)
      .map(([symbol, balance]) => {
        const upperSymbol = symbol.toUpperCase();
        const price = cryptoPrices[upperSymbol] || 0;
        return {
          symbol: upperSymbol,
          name: cryptoNames[upperSymbol] || upperSymbol,
          balance,
          price,
          value: balance * price,
          change24h: 0,
        };
      });
    const cryptoValue = cryptoItems.reduce((sum, c) => sum + c.value, 0);

    // Calculate allocation values
    const allocationTotals: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
    const allocationItems = allocations.map(a => {
      const price = metalPrices.ask[a.metalSymbol] || 0;
      allocationTotals[a.metalSymbol] = (allocationTotals[a.metalSymbol] || 0) + a.grams;
      return { ...a, price, value: a.grams * price };
    });
    const allocationsValue = allocationItems.reduce((sum, a) => sum + a.value, 0);

    // Calculate staking values
    const stakingTotals: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };
    const stakingItems = stakes.map(s => {
      const price = metalPrices.ask[s.metalSymbol] || 0;
      stakingTotals[s.metalSymbol] = (stakingTotals[s.metalSymbol] || 0) + s.amount;
      return { ...s, price, value: s.amount * price };
    });
    const stakingValue = stakingItems.reduce((sum, s) => sum + s.value, 0);

    // Final calculations
    const availableValue = metalsValue + cryptoValue;
    const lockedValue = allocationsValue + stakingValue;
    const totalValue = availableValue + lockedValue;

    const response: PortfolioResponse = {
      success: true,
      address: address.toLowerCase(),
      totalValue,
      availableValue,
      lockedValue,
      pendingValue: 0,
      breakdown: {
        metals: { value: metalsValue, items: metalItems },
        crypto: { value: cryptoValue, items: cryptoItems },
        allocations: { value: allocationsValue, totalGrams: allocationTotals, items: allocationItems },
        staking: { value: stakingValue, totalGrams: stakingTotals, items: stakingItems },
      },
      prices: {
        metals: Object.fromEntries(
          Object.keys(metalPrices.ask).map(symbol => [
            symbol,
            {
              ask: metalPrices.ask[symbol] || 0,
              bid: metalPrices.bid[symbol] || 0,
              spot: metalPrices.spot[symbol] || 0,
              change24h: metalPrices.changes[symbol] || 0,
            },
          ])
        ),
        crypto: cryptoPrices,
        usdt: cryptoPrices.USDT || 1,
      },
      balances: mergedBalances,
      timestamp: Date.now(),
    };

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch portfolio" }, { status: 500 });
  }
}
