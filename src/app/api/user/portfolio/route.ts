// /api/user/portfolio - Unified Portfolio API
// Single source of truth for both web and mobile
// All calculations done here, frontends just display

import { NextRequest, NextResponse } from "next/server";

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
// PRICE FETCHING - Use existing /api/prices for consistency
// ═══════════════════════════════════════════════════════════════════════════

async function getMetalPrices(): Promise<{
  ask: Record<string, number>;
  bid: Record<string, number>;
  spot: Record<string, number>;
  changes: Record<string, number>;
}> {
  try {
    const baseUrl = 'https://wallet.auxite.io';

    const res = await fetch(`${baseUrl}/api/prices`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Prices API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success) {
      throw new Error("Invalid prices response");
    }

    return {
      ask: data.prices || {},
      bid: data.bidPrices || {},
      spot: data.spotPrices || {},
      changes: data.changes || {},
    };
  } catch (e) {
    console.error("Metal prices fetch error:", e);
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
    const baseUrl = 'https://wallet.auxite.io';

    const res = await fetch(`${baseUrl}/api/crypto`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Crypto API error: ${res.status}`);
    }

    const data = await res.json();

    return {
      BTC: data.bitcoin?.usd || 100000,
      ETH: data.ethereum?.usd || 3500,
      XRP: data.ripple?.usd || 2.5,
      SOL: data.solana?.usd || 150,
      USDT: data.tether?.usd || 1,
    };
  } catch (e) {
    console.error("Crypto prices fetch error:", e);
    return { BTC: 100000, ETH: 3500, XRP: 2.5, SOL: 150, USDT: 1 };
  }
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
    // Call existing balance API (it has proper blockchain + redis + staked subtraction logic)
    const baseUrl = 'https://wallet.auxite.io';

    const res = await fetch(`${baseUrl}/api/user/balance?address=${address}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Balance API error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.balances) {
      throw new Error("Invalid balance response");
    }

    return {
      metals: {
        auxg: data.balances.auxg || 0,
        auxs: data.balances.auxs || 0,
        auxpt: data.balances.auxpt || 0,
        auxpd: data.balances.auxpd || 0,
      },
      crypto: {
        eth: data.balances.eth || 0,
        btc: data.balances.btc || 0,
        xrp: data.balances.xrp || 0,
        sol: data.balances.sol || 0,
        usdt: data.balances.usdt || 0,
      },
      auxm: data.balances.auxm || 0,
      bonusAuxm: data.balances.bonusAuxm || 0,
      stakedAmounts: data.stakedAmounts || { auxg: 0, auxs: 0, auxpt: 0, auxpd: 0 },
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
    // Call existing allocations API (it has the proper UID lookup logic)
    const baseUrl = 'https://wallet.auxite.io';

    const res = await fetch(`${baseUrl}/api/allocations?address=${address}`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.success || !data.allocations) return [];

    const metalNames: Record<string, string> = {
      AUXG: "Gold",
      AUXS: "Silver",
      AUXPT: "Platinum",
      AUXPD: "Palladium",
    };

    return data.allocations.map((a: any) => {
      const metalSymbol = (a.metal || a.metalSymbol || "AUXG").toUpperCase();
      return {
        id: a.id || a.allocationId || `ALLOC_${Date.now()}`,
        metal: metalNames[metalSymbol] || metalSymbol,
        metalSymbol,
        grams: parseFloat(a.grams || a.amount || "0"),
        vault: a.vault || a.location || "Zurich",
        status: a.status || "active",
      };
    }).filter((a: any) => a.status === "active" && a.grams > 0);
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
    // Call existing stakes API
    const baseUrl = 'https://wallet.auxite.io';

    const res = await fetch(`${baseUrl}/api/stakes?address=${address}`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!data.success || !data.stakes) return [];

    const metalNames: Record<string, string> = {
      AUXG: "Gold",
      AUXS: "Silver",
      AUXPT: "Platinum",
      AUXPD: "Palladium",
    };

    return data.stakes.map((s: any) => {
      const metalSymbol = (s.metal || "AUXS").toUpperCase();
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
    }).filter((s: any) => s.status === "active" && s.amount > 0);
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
