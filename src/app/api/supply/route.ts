// app/api/supply/route.ts
// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC TOKEN SUPPLY API
// ═══════════════════════════════════════════════════════════════════════════
// On-chain ERC20 totalSupply() okur (Base Mainnet). CoinGecko / CoinMarketCap
// listeleme başvuruları için circulating + total supply uç noktası.
//
//   GET /api/supply                         → 4 token için JSON özet
//   GET /api/supply?symbol=AUXG             → tek token JSON
//   GET /api/supply?symbol=AUXG&type=total        → plain-text toplam arz (CG/CMC formatı)
//   GET /api/supply?symbol=AUXG&type=circulating  → plain-text dolaşımdaki arz
//
// SUPPLY KAYNAĞI = MIRROR kontratlar. V8 buy() yalnızca on-chain USDC karşılığı
// mint ettiğinden V8 totalSupply gerçek AUM'u eksik gösterir. Mirror'lar custodian
// allocation'a günlük reconcile edilir; totalSupply() = vault'taki gerçek toplam gram.
// Token fiziksel metale 1:1 dayalı, hazine/kilit yok → circulating == total.
// ═══════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {
  MIRROR_TOKENS,
  CANONICAL_TOKENS,
  CANONICAL_READY,
  TOKEN_CONFIG,
  NETWORK,
  type MetalSymbol,
} from "@/config/contracts-v8";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Public listeleme ucu → her zaman kanonik Base mainnet adreslerini kullan.
// METAL_TOKENS (env override) KULLANMA; ortamdan bağımsız deterministik olmalı.
// RPC: server-side BASE_RPC_URL (Alchemy/QuickNode için) → public Base mainnet fallback.
// NEXT_PUBLIC_* RPC'leri zincir değiştirebildiği için KULLANMA.
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";

// Canonical kontratlar deploy + env set edildiğinde otomatik olarak onlara geç;
// aksi halde interim mirror feed'i kullan (bugünkü davranış).
const SUPPLY_MODE = CANONICAL_READY ? "canonical" : "mirror-interim";
const TOKENS = (CANONICAL_READY ? CANONICAL_TOKENS : MIRROR_TOKENS) as Record<
  MetalSymbol,
  string
>;

const ERC20_ABI = ["function totalSupply() view returns (uint256)"];

const DECIMALS = TOKEN_CONFIG.DECIMALS; // 3 (1 token = 1 gram)
const SYMBOLS: MetalSymbol[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

async function getTotalSupply(symbol: MetalSymbol): Promise<number> {
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const contract = new ethers.Contract(TOKENS[symbol], ERC20_ABI, provider);
  const raw: bigint = await contract.totalSupply();
  return parseFloat(ethers.formatUnits(raw, DECIMALS));
}

function tokenPayload(symbol: MetalSymbol, supply: number) {
  // supply = on-chain totalSupply = vault'taki gerçek toplam gram (platform AUM)
  return {
    symbol,
    name: TOKEN_CONFIG.METALS[symbol].name,
    contractAddress: TOKENS[symbol], // canonical (deploy sonrası) ya da interim mirror
    chain: NETWORK.BASE.name,
    chainId: NETWORK.BASE.chainId,
    decimals: DECIMALS,
    totalSupply: supply,
    circulatingSupply: supply,
    supplyMode: SUPPLY_MODE,
    supplySource:
      SUPPLY_MODE === "canonical"
        ? "canonical totalSupply (per-investor on-chain ownership, daily custodian reconciliation)"
        : "mirror totalSupply (daily custodian reconciliation)",
    backing: "1:1 physical metal (1 token = 1 gram)",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get("symbol")?.toUpperCase();
  const type = searchParams.get("type")?.toLowerCase(); // total | circulating

  try {
    // ── Tek token ────────────────────────────────────────────────────────────
    if (symbolParam) {
      if (!SYMBOLS.includes(symbolParam as MetalSymbol)) {
        return NextResponse.json(
          { error: `Unknown symbol. Use one of: ${SYMBOLS.join(", ")}` },
          { status: 400 }
        );
      }
      const symbol = symbolParam as MetalSymbol;
      const supply = await getTotalSupply(symbol);

      // CoinGecko / CMC plain-text tek değer formatı
      if (type === "total" || type === "circulating") {
        return new NextResponse(String(supply), {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return NextResponse.json({
        success: true,
        ...tokenPayload(symbol, supply),
        lastUpdated: new Date().toISOString(),
      });
    }

    // ── Tüm tokenlar ──────────────────────────────────────────────────────────
    const supplies = await Promise.all(SYMBOLS.map((s) => getTotalSupply(s)));
    const tokens = SYMBOLS.map((s, i) => tokenPayload(s, supplies[i]));

    return NextResponse.json({
      success: true,
      tokens,
      backingRatio: "1:1",
      supplyMode: SUPPLY_MODE,
      source:
        SUPPLY_MODE === "canonical"
          ? "canonical ERC20 totalSupply on Base Mainnet (per-investor ownership, daily custodian reconciliation = full platform AUM)"
          : "mirror ERC20 totalSupply on Base Mainnet (daily custodian reconciliation = full platform AUM)",
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Supply API error:", error);
    return NextResponse.json(
      { error: "Failed to read on-chain supply", details: error?.message },
      { status: 500 }
    );
  }
}
