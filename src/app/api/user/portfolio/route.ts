// /api/user/portfolio - Unified Portfolio API
// Single source of truth for both web and mobile
// All calculations done here, frontends just display

import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface PortfolioResponse {
  success: boolean;
  address: string;

  // Main values (what to display in header)
  totalValue: number;
  availableValue: number;
  lockedValue: number;
  pendingValue: number;

  // Breakdown by category
  breakdown: {
    metals: {
      value: number;
      items: Array<{
        symbol: string;
        name: string;
        balance: number;
        price: number;
        value: number;
        change24h: number;
      }>;
    };
    crypto: {
      value: number;
      items: Array<{
        symbol: string;
        name: string;
        balance: number;
        price: number;
        value: number;
        change24h: number;
      }>;
    };
    allocations: {
      value: number;
      totalGrams: Record<string, number>;
      items: Array<{
        id: string;
        metal: string;
        metalSymbol: string;
        grams: number;
        price: number;
        value: number;
        vault: string;
        status: string;
      }>;
    };
    staking: {
      value: number;
      totalGrams: Record<string, number>;
      items: Array<{
        id: string;
        metal: string;
        metalSymbol: string;
        amount: number;
        price: number;
        value: number;
        apy: number;
        duration: number;
        startDate: string;
        endDate: string;
        status: string;
      }>;
    };
  };

  // Single source of prices
  prices: {
    metals: Record<string, { ask: number; bid: number; spot: number; change24h: number }>;
    crypto: Record<string, number>;
    usdt: number;
  };

  // Raw balances for reference
  balances: {
    metals: Record<string, number>;
    crypto: Record<string, number>;
    auxm: number;
    bonusAuxm: number;
  };

  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICE FETCHING - Single source
// ═══════════════════════════════════════════════════════════════════════════

async function getMetalPrices(): Promise<{
  ask: Record<string, number>;
  bid: Record<string, number>;
  spot: Record<string, number>;
  changes: Record<string, number>;
}> {
  try {
    // Try cache first
    const cached = await redis.get("metal_prices_cache");
    if (cached && typeof cached === "object") {
      const cacheData = cached as any;
      const cacheAge = Date.now() - (cacheData.timestamp || 0);
      if (cacheAge < 60000) { // 1 minute cache
        return {
          ask: cacheData.prices || {},
          bid: cacheData.bidPrices || {},
          spot: cacheData.spotPrices || {},
          changes: cacheData.changes || {},
        };
      }
    }

    // Fetch fresh prices from GoldAPI
    const GOLD_API_KEY = process.env.GOLD_API_KEY;
    const TROY_OZ_TO_GRAM = 31.1035;

    const metals = ["XAU", "XAG", "XPT", "XPD"];
    const metalMap: Record<string, string> = {
      XAU: "AUXG",
      XAG: "AUXS",
      XPT: "AUXPT",
      XPD: "AUXPD",
    };

    const ask: Record<string, number> = {};
    const bid: Record<string, number> = {};
    const spot: Record<string, number> = {};
    const changes: Record<string, number> = {};

    // Get spread settings
    const spreadSettings = await redis.get("spread_settings") as Record<string, { askAdjust: number; bidAdjust: number }> || {
      AUXG: { askAdjust: 3, bidAdjust: -3 },
      AUXS: { askAdjust: 10, bidAdjust: -10 },
      AUXPT: { askAdjust: 10, bidAdjust: -10 },
      AUXPD: { askAdjust: 2.5, bidAdjust: -2.5 },
    };

    for (const metal of metals) {
      try {
        const res = await fetch(`https://www.goldapi.io/api/${metal}/USD`, {
          headers: { "x-access-token": GOLD_API_KEY || "" },
          cache: "no-store",
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
        console.error(`Failed to fetch ${metal} price:`, e);
      }
    }

    // Cache the prices
    await redis.set("metal_prices_cache", {
      prices: ask,
      bidPrices: bid,
      spotPrices: spot,
      changes,
      timestamp: Date.now(),
    }, { ex: 120 }); // 2 min expiry

    return { ask, bid, spot, changes };
  } catch (e) {
    console.error("Metal prices fetch error:", e);
    // Return defaults
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
    const cached = await redis.get("crypto_prices_cache");
    if (cached && typeof cached === "object") {
      const cacheData = cached as any;
      const cacheAge = Date.now() - (cacheData.timestamp || 0);
      if (cacheAge < 60000) {
        return cacheData.prices || {};
      }
    }

    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,solana,tether&vs_currencies=usd",
      { cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();
      const prices = {
        BTC: data.bitcoin?.usd || 100000,
        ETH: data.ethereum?.usd || 3500,
        XRP: data.ripple?.usd || 2.5,
        SOL: data.solana?.usd || 150,
        USDT: data.tether?.usd || 1,
      };

      await redis.set("crypto_prices_cache", {
        prices,
        timestamp: Date.now(),
      }, { ex: 120 });

      return prices;
    }
  } catch (e) {
    console.error("Crypto prices fetch error:", e);
  }

  return { BTC: 100000, ETH: 3500, XRP: 2.5, SOL: 150, USDT: 1 };
}

// ═══════════════════════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════

async function getUserBalances(address: string): Promise<{
  metals: Record<string, number>;
  crypto: Record<string, number>;
  auxm: number;
  bonusAuxm: number;
  stakedAmounts: Record<string, number>;
}> {
  try {
    const balanceKey = `user:${address.toLowerCase()}:balances`;
    const data = await redis.hgetall(balanceKey) as Record<string, string> | null;

    if (!data) {
      return {
        metals: { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 },
        crypto: { eth: 0, btc: 0, xrp: 0, sol: 0, usdt: 0 },
        auxm: 0,
        bonusAuxm: 0,
        stakedAmounts: { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 },
      };
    }

    // Parse staked amounts
    let stakedAmounts = { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 };
    try {
      const stakesKey = `user:${address.toLowerCase()}:stakes`;
      const stakes = await redis.lrange(stakesKey, 0, -1);
      if (stakes && stakes.length > 0) {
        for (const stake of stakes) {
          const s = typeof stake === "string" ? JSON.parse(stake) : stake;
          if (s.status === "active") {
            const metal = s.metal?.toLowerCase();
            const amount = parseFloat(s.amount) || 0;
            if (metal && metal in stakedAmounts) {
              stakedAmounts[metal as keyof typeof stakedAmounts] += amount;
            }
          }
        }
      }
    } catch (e) {
      console.error("Stakes parse error:", e);
    }

    return {
      metals: {
        auxg: Math.max(0, parseFloat(data.auxg || "0") - stakedAmounts.auxg),
        auxs: Math.max(0, parseFloat(data.auxs || "0") - stakedAmounts.auxs),
        auxpt: Math.max(0, parseFloat(data.auxpt || "0") - stakedAmounts.auxpt),
        auxpd: Math.max(0, parseFloat(data.auxpd || "0") - stakedAmounts.auxpd),
      },
      crypto: {
        eth: parseFloat(data.eth || "0"),
        btc: parseFloat(data.btc || "0"),
        xrp: parseFloat(data.xrp || "0"),
        sol: parseFloat(data.sol || "0"),
        usdt: parseFloat(data.usdt || "0"),
      },
      auxm: parseFloat(data.auxm || "0"),
      bonusAuxm: parseFloat(data.bonusAuxm || "0"),
      stakedAmounts,
    };
  } catch (e) {
    console.error("Balance fetch error:", e);
    return {
      metals: { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 },
      crypto: { eth: 0, btc: 0, xrp: 0, sol: 0, usdt: 0 },
      auxm: 0,
      bonusAuxm: 0,
      stakedAmounts: { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 },
    };
  }
}

async function getAllocations(address: string): Promise<Array<{
  id: string;
  metal: string;
  metalSymbol: string;
  grams: number;
  vault: string;
  status: string;
}>> {
  try {
    const allocKey = `user:${address.toLowerCase()}:allocations`;
    const data = await redis.lrange(allocKey, 0, -1);

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const a = typeof item === "string" ? JSON.parse(item) : item;
      const metalSymbol = (a.metal || a.metalSymbol || "AUXG").toUpperCase();
      const metalNames: Record<string, string> = {
        AUXG: "Gold",
        AUXS: "Silver",
        AUXPT: "Platinum",
        AUXPD: "Palladium",
      };

      return {
        id: a.id || a.allocationId || `ALLOC_${Date.now()}`,
        metal: metalNames[metalSymbol] || metalSymbol,
        metalSymbol,
        grams: parseFloat(a.grams || a.amount || "0"),
        vault: a.vault || a.location || "Zurich",
        status: a.status || "active",
      };
    }).filter(a => a.status === "active" && a.grams > 0);
  } catch (e) {
    console.error("Allocations fetch error:", e);
    return [];
  }
}

async function getStakes(address: string): Promise<Array<{
  id: string;
  metal: string;
  metalSymbol: string;
  amount: number;
  apy: number;
  duration: number;
  startDate: string;
  endDate: string;
  status: string;
}>> {
  try {
    const stakesKey = `user:${address.toLowerCase()}:stakes`;
    const data = await redis.lrange(stakesKey, 0, -1);

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const s = typeof item === "string" ? JSON.parse(item) : item;
      const metalSymbol = (s.metal || "AUXS").toUpperCase();
      const metalNames: Record<string, string> = {
        AUXG: "Gold",
        AUXS: "Silver",
        AUXPT: "Platinum",
        AUXPD: "Palladium",
      };

      return {
        id: s.id || s.agreementNo || `STAKE_${Date.now()}`,
        metal: metalNames[metalSymbol] || metalSymbol,
        metalSymbol,
        amount: parseFloat(s.amount || "0"),
        apy: parseFloat(s.apy || "0"),
        duration: parseInt(s.duration || s.durationMonths || "90"),
        startDate: s.startDate || s.createdAt || new Date().toISOString(),
        endDate: s.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        status: s.status || "active",
      };
    }).filter(s => s.status === "active" && s.amount > 0);
  } catch (e) {
    console.error("Stakes fetch error:", e);
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
    const [metalPrices, cryptoPrices, balances, allocations, stakes] = await Promise.all([
      getMetalPrices(),
      getCryptoPrices(),
      getUserBalances(address),
      getAllocations(address),
      getStakes(address),
    ]);

    // Metal names
    const metalNames: Record<string, string> = {
      AUXG: "Gold",
      AUXS: "Silver",
      AUXPT: "Platinum",
      AUXPD: "Palladium",
    };

    // ─────────────────────────────────────────────────────────────────────────
    // CALCULATE METALS VALUE (Available balance)
    // ─────────────────────────────────────────────────────────────────────────
    const metalItems = Object.entries(balances.metals)
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

    // ─────────────────────────────────────────────────────────────────────────
    // CALCULATE CRYPTO VALUE
    // ─────────────────────────────────────────────────────────────────────────
    const cryptoNames: Record<string, string> = {
      ETH: "Ethereum",
      BTC: "Bitcoin",
      XRP: "Ripple",
      SOL: "Solana",
      USDT: "Tether",
    };

    const cryptoItems = Object.entries(balances.crypto)
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

    // ─────────────────────────────────────────────────────────────────────────
    // CALCULATE ALLOCATIONS VALUE (Locked - physical)
    // ─────────────────────────────────────────────────────────────────────────
    const allocationTotals: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };

    const allocationItems = allocations.map(a => {
      const price = metalPrices.ask[a.metalSymbol] || 0;
      allocationTotals[a.metalSymbol] = (allocationTotals[a.metalSymbol] || 0) + a.grams;
      return {
        ...a,
        price,
        value: a.grams * price,
      };
    });

    const allocationsValue = allocationItems.reduce((sum, a) => sum + a.value, 0);

    // ─────────────────────────────────────────────────────────────────────────
    // CALCULATE STAKING VALUE (Locked - earning)
    // ─────────────────────────────────────────────────────────────────────────
    const stakingTotals: Record<string, number> = { AUXG: 0, AUXS: 0, AUXPT: 0, AUXPD: 0 };

    const stakingItems = stakes.map(s => {
      const price = metalPrices.ask[s.metalSymbol] || 0;
      stakingTotals[s.metalSymbol] = (stakingTotals[s.metalSymbol] || 0) + s.amount;
      return {
        ...s,
        price,
        value: s.amount * price,
      };
    });

    const stakingValue = stakingItems.reduce((sum, s) => sum + s.value, 0);

    // ─────────────────────────────────────────────────────────────────────────
    // FINAL CALCULATIONS
    // ─────────────────────────────────────────────────────────────────────────
    const availableValue = metalsValue + cryptoValue;
    const lockedValue = allocationsValue + stakingValue;
    const totalValue = availableValue + lockedValue;

    const response: PortfolioResponse = {
      success: true,
      address: address.toLowerCase(),

      totalValue,
      availableValue,
      lockedValue,
      pendingValue: 0, // Future: pending orders

      breakdown: {
        metals: {
          value: metalsValue,
          items: metalItems,
        },
        crypto: {
          value: cryptoValue,
          items: cryptoItems,
        },
        allocations: {
          value: allocationsValue,
          totalGrams: allocationTotals,
          items: allocationItems,
        },
        staking: {
          value: stakingValue,
          totalGrams: stakingTotals,
          items: stakingItems,
        },
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

      balances: {
        metals: balances.metals,
        crypto: balances.crypto,
        auxm: balances.auxm,
        bonusAuxm: balances.bonusAuxm,
      },

      timestamp: Date.now(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}
