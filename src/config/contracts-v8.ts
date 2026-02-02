// src/config/contracts-v8.ts
// ═══════════════════════════════════════════════════════════════════════════════
// AUXITE WALLET - MERKEZI CONTRACT KONFİGÜRASYONU (V8)
// ═══════════════════════════════════════════════════════════════════════════════
// 
// Bu dosya tüm contract adreslerini merkezi olarak yönetir.
// Production'da ENV değişkenlerinden alır, development'ta fallback kullanır.
//
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// NETWORK KONFİGÜRASYONU
// ═══════════════════════════════════════════════════════════════════════════════

export const NETWORK = {
  SEPOLIA: {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
    explorer: "https://sepolia.etherscan.io",
  },
  MAINNET: {
    chainId: 1,
    name: "Ethereum Mainnet",
    rpcUrl: process.env.ETH_MAINNET_RPC || "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
    explorer: "https://etherscan.io",
  },
} as const;

// Aktif network
export const ACTIVE_NETWORK = 
  Number(process.env.NEXT_PUBLIC_APP_CHAIN_ID) === 1 
    ? NETWORK.MAINNET 
    : NETWORK.SEPOLIA;

// ═══════════════════════════════════════════════════════════════════════════════
// METAL TOKEN ADRESLERİ (V8)
// ═══════════════════════════════════════════════════════════════════════════════

// Sepolia Fallback Adresleri (V8)
const SEPOLIA_V8_TOKENS = {
  AUXG: "0xD14D32B1e03B3027D1f8381EeeC567e147De9CCe",
  AUXS: "0xc924EE950BF5A5Fbe3c26eECB27D99031B441caD",
  AUXPT: "0x37402EA435a91567223C132414C3A50C6bBc7200",
  AUXPD: "0x6026338B9Bfd94fed07EA61cbE60b15e300911DC",
} as const;

// Mainnet Adresleri (Production için ayarlanacak)
const MAINNET_V8_TOKENS = {
  AUXG: process.env.NEXT_PUBLIC_MAINNET_AUXG || "",
  AUXS: process.env.NEXT_PUBLIC_MAINNET_AUXS || "",
  AUXPT: process.env.NEXT_PUBLIC_MAINNET_AUXPT || "",
  AUXPD: process.env.NEXT_PUBLIC_MAINNET_AUXPD || "",
} as const;

// ENV'den veya fallback'ten al
export const METAL_TOKENS_V8 = {
  AUXG: (process.env.NEXT_PUBLIC_AUXG_V8 || SEPOLIA_V8_TOKENS.AUXG) as `0x${string}`,
  AUXS: (process.env.NEXT_PUBLIC_AUXS_V8 || SEPOLIA_V8_TOKENS.AUXS) as `0x${string}`,
  AUXPT: (process.env.NEXT_PUBLIC_AUXPT_V8 || SEPOLIA_V8_TOKENS.AUXPT) as `0x${string}`,
  AUXPD: (process.env.NEXT_PUBLIC_AUXPD_V8 || SEPOLIA_V8_TOKENS.AUXPD) as `0x${string}`,
} as const;

// Eski V6 adresleri (geriye uyumluluk için)
export const METAL_TOKENS_V6 = {
  AUXG: "0x28e0938457c5bf02Fe35208b7b1098af7Ec20d91" as `0x${string}`,
  AUXS: "0x21583fa6D61Ecbad51C092c4A433511255D29A4E" as `0x${string}`,
  AUXPT: "0x0023aBB9822AC52012542278e6E862EF4Ea12616" as `0x${string}`,
  AUXPD: "0x3d2F416A30BAcd28D93ACCc1Ee1DB69C27ff9223" as `0x${string}`,
} as const;

// Eski V5 adresleri (deprecated)
export const METAL_TOKENS_V5 = {
  AUXG: "0x2e7fff4061134a420faB630CA04Be04f5b2C7B59" as `0x${string}`,
  AUXS: "0x48016261ba15ad3603621A4F6A8985776a37bb8a" as `0x${string}`,
  AUXPT: "0x2443Ef1F9a4C6f3561A2750048C68d7Bfc02363B" as `0x${string}`,
  AUXPD: "0xD978F69Ab9DF519bD7f08a823c82536471CA95b3" as `0x${string}`,
} as const;

// Aktif token adresleri (V8 kullan)
export const METAL_TOKENS = METAL_TOKENS_V8;

// ═══════════════════════════════════════════════════════════════════════════════
// ORACLE & EXCHANGE
// ═══════════════════════════════════════════════════════════════════════════════

export const ORACLE_ADDRESS = (
  process.env.NEXT_PUBLIC_ORACLE_V2 ||
  process.env.NEXT_PUBLIC_ORACLE_ADDRESS ||
  "0x68C5C98DB68284A0211a1FDCA668Ee66ef15b08d"
) as `0x${string}`;

export const EXCHANGE_ADDRESS = (
  process.env.NEXT_PUBLIC_EXCHANGE_ADDRESS || 
  ""
) as `0x${string}`;

// ═══════════════════════════════════════════════════════════════════════════════
// STAKING CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

export const STAKING_CONTRACT = (
  process.env.NEXT_PUBLIC_STAKING_CONTRACT || 
  process.env.NEXT_PUBLIC_STAKING_V2 ||
  ""
) as `0x${string}`;

// ═══════════════════════════════════════════════════════════════════════════════
// USDT & STABLE COINS
// ═══════════════════════════════════════════════════════════════════════════════

export const USDT_ADDRESS = (
  process.env.NEXT_PUBLIC_USDT_ADDRESS ||
  process.env.USDT_CONTRACT_ADDRESS ||
  "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0" // Sepolia USDT
) as `0x${string}`;

// ═══════════════════════════════════════════════════════════════════════════════
// LEASING CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LEASING_CONTRACTS = {
  AUXG: {
    "90": "0xe63050b6d0497a970d3fB44EBF428742631d1006" as `0x${string}`,
    "180": "0x62e7bEB70155C5443271692DCAD6094e1c20647C" as `0x${string}`,
    "365": "0x9a236d87A1250B3C54c94711C3269bD6eA1a7c2B" as `0x${string}`,
  },
  AUXS: {
    "90": "0x6396163f0CeA0EdC639c353f6D1EbCd7C5427945" as `0x${string}`,
    "180": "0xD9F5Ea455d01296F7600586C1131917A342CaE14" as `0x${string}`,
    "365": "0x116B762D553856ef2513Ee6F85ED3Bb567732725" as `0x${string}`,
  },
  AUXPT: {
    "90": "0xeB95c1C459506F6265c800C64D3423005499C3Ea" as `0x${string}`,
    "180": "0x39d35C659B28f78bf8041B994D94C6904560f941" as `0x${string}`,
    "365": "0x7f20C78a52C48438Eb8D40Ba99653Ea56de6a980" as `0x${string}`,
  },
  AUXPD: {
    "90": "0x587706Bf9A907288145cfFc35b57818Df4db68A4" as `0x${string}`,
    "180": "0xe45d7bab2f052861A1Df5cFc5E2a72Dc808cf310" as `0x${string}`,
    "365": "0x00CBFC888aF70f2d8028A7BAEbfA8F530b0F62A2" as `0x${string}`,
  },
} as const;

export const LEASING_REGISTRY = "0xcD144f079faB6743365606Db5FCcD8051315834D" as `0x${string}`;

// ═══════════════════════════════════════════════════════════════════════════════
// CERTIFICATE REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

export const CERTIFICATE_REGISTRY = (
  process.env.CERTIFICATE_REGISTRY_ADDRESS || ""
) as `0x${string}`;

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN KONFİGÜRASYONU
// ═══════════════════════════════════════════════════════════════════════════════

export const TOKEN_CONFIG = {
  DECIMALS: 3, // V8 token'ları 3 decimal kullanıyor (1 token = 1 gram)
  
  METALS: {
    AUXG: { 
      name: "Gold", 
      nameTr: "Altın", 
      symbol: "AUXG",
      icon: "🥇", 
      color: "#FFD700",
      address: METAL_TOKENS.AUXG,
    },
    AUXS: { 
      name: "Silver", 
      nameTr: "Gümüş", 
      symbol: "AUXS",
      icon: "🥈", 
      color: "#C0C0C0",
      address: METAL_TOKENS.AUXS,
    },
    AUXPT: { 
      name: "Platinum", 
      nameTr: "Platin", 
      symbol: "AUXPT",
      icon: "⚪", 
      color: "#E5E4E2",
      address: METAL_TOKENS.AUXPT,
    },
    AUXPD: { 
      name: "Palladium", 
      nameTr: "Paladyum", 
      symbol: "AUXPD",
      icon: "🔘", 
      color: "#CED0DD",
      address: METAL_TOKENS.AUXPD,
    },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════════════════

export type MetalSymbol = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

/**
 * Token symbol'den contract adresi al
 */
export function getTokenAddress(symbol: string): `0x${string}` {
  const key = symbol.toUpperCase() as MetalSymbol;
  return METAL_TOKENS[key] || METAL_TOKENS.AUXG;
}

/**
 * Token adresinden symbol al
 */
export function getTokenSymbol(address: string): MetalSymbol | null {
  const lowerAddress = address.toLowerCase();
  for (const [symbol, addr] of Object.entries(METAL_TOKENS)) {
    if (addr.toLowerCase() === lowerAddress) {
      return symbol as MetalSymbol;
    }
  }
  return null;
}

/**
 * Leasing contract adresi al
 */
export function getLeasingContract(
  metal: MetalSymbol, 
  duration: "90" | "180" | "365"
): `0x${string}` {
  return LEASING_CONTRACTS[metal]?.[duration] || LEASING_CONTRACTS.AUXG["90"];
}

/**
 * Block explorer URL oluştur
 */
export function getExplorerUrl(type: "tx" | "address" | "token", hash: string): string {
  return `${ACTIVE_NETWORK.explorer}/${type}/${hash}`;
}

/**
 * Gram'ı token amount'a çevir (3 decimal)
 */
export function gramsToTokenAmount(grams: number): bigint {
  return BigInt(Math.floor(grams * 1000));
}

/**
 * Token amount'u gram'a çevir
 */
export function tokenAmountToGrams(amount: bigint): number {
  return Number(amount) / 1000;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contract adreslerinin geçerliliğini kontrol et
 */
export function validateContracts(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Metal token adresleri
  for (const [symbol, address] of Object.entries(METAL_TOKENS)) {
    if (!address || !address.startsWith("0x") || address.length < 42) {
      errors.push(`Invalid ${symbol} token address: ${address}`);
    }
  }
  
  // Oracle
  if (!ORACLE_ADDRESS || !ORACLE_ADDRESS.startsWith("0x") || ORACLE_ADDRESS.length < 42) {
    errors.push(`Invalid ORACLE address: ${ORACLE_ADDRESS}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Development modda contract validasyonu yap
if (process.env.NODE_ENV === "development") {
  const validation = validateContracts();
  if (!validation.valid) {
    console.warn("⚠️ Contract validation warnings:", validation.errors);
  }
}
