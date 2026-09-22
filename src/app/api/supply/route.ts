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

const ERC20_ABI = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const DECIMALS = TOKEN_CONFIG.DECIMALS; // 3 (1 token = 1 gram)
const SYMBOLS: MetalSymbol[] = ["AUXG", "AUXS", "AUXPT", "AUXPD"];

// ── AUXR (Auxite Reserve) ────────────────────────────────────────────────────
// Metal tokenlarından ayrı bir enstrüman: 4 metalden oluşan bir sepete dayalı,
// NAV üzerinden nakit uzlaşımlı. Metaller gibi "1 token = 1 gram" DEĞİL, o
// yüzden aynı payload şeklini paylaşmaz.
//
// CoinGecko / CMC circulating supply'ı "piyasada serbestçe dolaşan" olarak
// tanımlar: hazine, kilitli ve ihraççıda duran bakiyeler HARİÇ tutulmalıdır.
// Dolaşım dışı cüzdanlar AUXR_NONCIRCULATING_ADDRESSES ile (virgülle ayrılmış)
// verilir; boşsa circulating == total olur ve payload bunu açıkça belirtir.
const AUXR_ADDRESS = "0xB145B8e9C02193d55454f534f917Cabe704FA042";
const AUXR_DECIMALS = 18;

function auxrExcludedAddresses(): string[] {
  return (process.env.AUXR_NONCIRCULATING_ADDRESSES || "")
    .split(",")
    .map((a) => a.trim())
    .filter((a) => /^0x[0-9a-fA-F]{40}$/.test(a));
}

async function getAuxrSupply() {
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const contract = new ethers.Contract(AUXR_ADDRESS, ERC20_ABI, provider);

  const rawTotal: bigint = await contract.totalSupply();
  const excluded = auxrExcludedAddresses();
  const balances = await Promise.all(
    excluded.map(async (addr) => ({
      address: addr,
      amount: parseFloat(
        ethers.formatUnits((await contract.balanceOf(addr)) as bigint, AUXR_DECIMALS)
      ),
    }))
  );

  const total = parseFloat(ethers.formatUnits(rawTotal, AUXR_DECIMALS));
  const withheld = balances.reduce((sum, b) => sum + b.amount, 0);
  return { total, circulating: total - withheld, nonCirculating: balances };
}

function auxrPayload(s: Awaited<ReturnType<typeof getAuxrSupply>>) {
  return {
    symbol: "AUXR",
    name: "Auxite Reserve",
    contractAddress: AUXR_ADDRESS,
    chain: NETWORK.BASE.name,
    chainId: NETWORK.BASE.chainId,
    decimals: AUXR_DECIMALS,
    totalSupply: s.total,
    circulatingSupply: s.circulating,
    nonCirculating: s.nonCirculating,
    supplySource: "ERC20 totalSupply() on Base Mainnet",
    circulatingBasis: s.nonCirculating.length
      ? "totalSupply minus the balances of the declared non-circulating addresses"
      : "no non-circulating addresses declared — circulating equals total supply",
    backingModel: "basket of four precious metals, cash-settled at NAV (issuer's stated backing model)",
    attestationStatus: "none — no independent reserve attestation has been issued to date",
  };
}

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
        ? "canonical totalSupply (per-investor on-chain ownership, issuer internal reconciliation)"
        : "mirror totalSupply (issuer internal reconciliation)",
    backingModel: "1 token = 1 gram of physical metal (issuer's stated backing model)",
    attestationStatus: "none — no independent reserve attestation has been issued to date",
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbolParam = searchParams.get("symbol")?.toUpperCase();
  const type = searchParams.get("type")?.toLowerCase(); // total | circulating

  try {
    // ── AUXR (tek token) ─────────────────────────────────────────────────────
    if (symbolParam === "AUXR") {
      const s = await getAuxrSupply();

      // CoinGecko / CMC düz metin tek değer formatı
      if (type === "total" || type === "circulating") {
        return new NextResponse(String(type === "total" ? s.total : s.circulating), {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }

      return NextResponse.json({
        success: true,
        ...auxrPayload(s),
        lastUpdated: new Date().toISOString(),
      });
    }

    // ── Tek token ────────────────────────────────────────────────────────────
    if (symbolParam) {
      if (!SYMBOLS.includes(symbolParam as MetalSymbol)) {
        return NextResponse.json(
          { error: `Unknown symbol. Use one of: ${[...SYMBOLS, "AUXR"].join(", ")}` },
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
    const [supplies, auxr] = await Promise.all([
      Promise.all(SYMBOLS.map((s) => getTotalSupply(s))),
      // AUXR ayrı bir enstrüman; metal dizisine karışmaz (farklı teminat modeli).
      getAuxrSupply().catch(() => null),
    ]);
    const tokens = SYMBOLS.map((s, i) => tokenPayload(s, supplies[i]));

    return NextResponse.json({
      success: true,
      tokens,
      auxr: auxr ? auxrPayload(auxr) : null,
      backingModel: "1 token = 1 gram of physical metal",
      attestation: {
        status: "none",
        auditor: null,
        custodian: null,
        insurer: null,
        note: "Backing is the issuer's stated model and has not been verified by an independent auditor, custodian or insurer. No attestation report has been published to date.",
      },
      supplyMode: SUPPLY_MODE,
      source:
        SUPPLY_MODE === "canonical"
          ? "canonical ERC20 totalSupply on Base Mainnet (per-investor ownership, issuer internal reconciliation = full platform AUM)"
          : "mirror ERC20 totalSupply on Base Mainnet (issuer internal reconciliation = full platform AUM)",
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
