// src/config/contracts.ts
// Tüm kontrat adresleri ve konfigürasyonları tek yerden yönetim

export const CHAIN_ID = 11155111; // Sepolia

// ═══════════════════════════════════════════════════════════════════════════════
// V6 KONTRAT ADRESLERİ (Sepolia)
// ═══════════════════════════════════════════════════════════════════════════════
export const CONTRACTS = {
  // Oracle & Reserve
  ORACLE: "0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA" as `0x${string}`,
  RESERVE_PROOF: "0x307Ec2E609079fB902c6Eb8220e28847ba78cA5E" as `0x${string}`,
  
  // Metal Tokens V6
  AUXG: "0x28e0938457c5bf02Fe35208b7b1098af7Ec20d91" as `0x${string}`,
  AUXS: "0x21583fa6D61Ecbad51C092c4A433511255D29A4E" as `0x${string}`,
  AUXPT: "0x0023aBB9822AC52012542278e6E862EF4Ea12616" as `0x${string}`,
  AUXPD: "0x3d2F416A30BAcd28D93ACCc1Ee1DB69C27ff9223" as `0x${string}`,
} as const;

// Token adresi helper
export const getTokenAddress = (symbol: string): `0x${string}` => {
  const key = symbol.toUpperCase() as keyof typeof CONTRACTS;
  return CONTRACTS[key] || CONTRACTS.AUXG;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN KONFİGÜRASYONU
// ═══════════════════════════════════════════════════════════════════════════════
export const TOKEN_CONFIG = {
  DECIMALS: 3, // V6 token'ları 3 decimal kullanıyor (1 token = 1 gram)
  
  // Metal bilgileri
  METALS: {
    AUXG: { name: "Gold", nameTr: "Altın", icon: "🥇", color: "#FFD700" },
    AUXS: { name: "Silver", nameTr: "Gümüş", icon: "🥈", color: "#C0C0C0" },
    AUXPT: { name: "Platinum", nameTr: "Platin", icon: "⚪", color: "#E5E4E2" },
    AUXPD: { name: "Palladium", nameTr: "Paladyum", icon: "🔘", color: "#CED0DD" },
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TİCARET AYARLARI
// ═══════════════════════════════════════════════════════════════════════════════
export const TRADE_CONFIG = {
  // Varsayılan slippage toleransı (%)
  DEFAULT_SLIPPAGE_PERCENT: 1,
  
  // Minimum/Maximum slippage
  MIN_SLIPPAGE_PERCENT: 0.1,
  MAX_SLIPPAGE_PERCENT: 5,
  
  // Minimum işlem miktarı (gram)
  MIN_TRADE_GRAMS: 0.001,
  
  // Gas limit tahminleri
  GAS_LIMITS: {
    BUY: 250000n,
    SELL: 200000n,
    APPROVE: 100000n,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// METAL ID'LERİ (keccak256 hash)
// ═══════════════════════════════════════════════════════════════════════════════
export const METAL_IDS = {
  AUXG: "0x4155584700000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  AUXS: "0x4155585300000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  AUXPT: "0x4155585054000000000000000000000000000000000000000000000000000000" as `0x${string}`,
  AUXPD: "0x4155585044000000000000000000000000000000000000000000000000000000" as `0x${string}`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ABI'LAR
// ═══════════════════════════════════════════════════════════════════════════════
export const AUXITE_TOKEN_V6_ABI = [
  // ERC20 Standard
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "transfer", type: "function", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  
  // Price Functions
  { name: "askPerKgE6", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "bidPerKgE6", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "calculateBuyCost", type: "function", stateMutability: "view", inputs: [{ name: "grams", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "calculateSellPayout", type: "function", stateMutability: "view", inputs: [{ name: "grams", type: "uint256" }], outputs: [{ type: "uint256" }] },
  
  // Buy/Sell Functions
  { name: "buy", type: "function", stateMutability: "payable", inputs: [{ name: "grams", type: "uint256" }], outputs: [] },
  { name: "buyWithSlippage", type: "function", stateMutability: "payable", inputs: [{ name: "grams", type: "uint256" }, { name: "maxCostInWei", type: "uint256" }], outputs: [] },
  { name: "sell", type: "function", stateMutability: "nonpayable", inputs: [{ name: "grams", type: "uint256" }], outputs: [] },
  { name: "sellWithSlippage", type: "function", stateMutability: "nonpayable", inputs: [{ name: "grams", type: "uint256" }, { name: "minPayoutInWei", type: "uint256" }], outputs: [] },
  
  // Refund Functions
  { name: "pendingRefunds", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "withdrawRefund", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  
  // Physical Delivery
  { name: "requestPhysicalDelivery", type: "function", stateMutability: "nonpayable", inputs: [{ name: "grams", type: "uint256" }], outputs: [{ name: "requestId", type: "uint256" }] },
  { name: "cancelDeliveryRequest", type: "function", stateMutability: "nonpayable", inputs: [{ name: "requestId", type: "uint256" }], outputs: [] },
  
  // Reserve Info
  { name: "checkReserveLimit", type: "function", stateMutability: "view", inputs: [{ name: "gramsToMint", type: "uint256" }], outputs: [{ name: "allowed", type: "bool" }, { name: "maxMintable", type: "uint256" }] },
  { name: "getCollateralizationRatio", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "ratioE6", type: "uint256" }, { name: "supplyGrams", type: "uint256" }, { name: "reserveGrams", type: "uint256" }] },
  
  // Allocations
  { name: "getActiveAllocations", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ type: "uint256[]" }] },
  
  // Status
  { name: "paused", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  
  // Events
  { name: "Transfer", type: "event", inputs: [{ name: "from", type: "address", indexed: true }, { name: "to", type: "address", indexed: true }, { name: "value", type: "uint256", indexed: false }] },
  { name: "MetalPurchased", type: "event", inputs: [{ name: "buyer", type: "address", indexed: true }, { name: "grams", type: "uint256", indexed: false }, { name: "cost", type: "uint256", indexed: false }, { name: "allocId", type: "uint256", indexed: false }] },
  { name: "MetalSold", type: "event", inputs: [{ name: "seller", type: "address", indexed: true }, { name: "grams", type: "uint256", indexed: false }, { name: "payout", type: "uint256", indexed: false }] },
  { name: "RefundAvailable", type: "event", inputs: [{ name: "user", type: "address", indexed: true }, { name: "amount", type: "uint256", indexed: false }] },
] as const;

export const AUXITE_ORACLE_V3_ABI = [
  { name: "getPrice", type: "function", stateMutability: "view", inputs: [{ name: "metalId", type: "bytes32" }], outputs: [{ name: "priceE6", type: "uint256" }] },
  { name: "getETHPriceE6", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getBasePerKgE6", type: "function", stateMutability: "view", inputs: [{ name: "metalId", type: "bytes32" }], outputs: [{ type: "uint256" }] },
] as const;

export const AUXITE_RESERVE_PROOF_ABI = [
  { name: "getMetalReserve", type: "function", stateMutability: "view", inputs: [{ name: "metalId", type: "bytes32" }], outputs: [{ name: "grams", type: "uint256" }, { name: "lastUpdate", type: "uint256" }] },
  { name: "isProofValid", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "isValid", type: "bool" }, { name: "age", type: "uint256" }] },
  { name: "getLatestSnapshot", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "reportHash", type: "bytes32" }, { name: "reportTimestamp", type: "uint256" }, { name: "blockTime", type: "uint256" }, { name: "submittedBy", type: "address" }, { name: "auditorName", type: "string" }, { name: "reportUri", type: "string" }] },
  { name: "snapshotCount", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════════════════

// Gram'ı token amount'a çevir (3 decimal)
export const gramsToTokenAmount = (grams: number): bigint => {
  return BigInt(Math.floor(grams * 1000)); // 1 gram = 1000 units (3 decimals)
};

// Token amount'u gram'a çevir
export const tokenAmountToGrams = (amount: bigint): number => {
  return Number(amount) / 1000;
};

// Slippage ile max cost hesapla
export const calculateMaxCost = (cost: bigint, slippagePercent: number): bigint => {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100)); // % to basis points
  return cost + (cost * slippageBps / 10000n);
};

// Slippage ile min payout hesapla
export const calculateMinPayout = (payout: bigint, slippagePercent: number): bigint => {
  const slippageBps = BigInt(Math.floor(slippagePercent * 100));
  return payout - (payout * slippageBps / 10000n);
};

// Wei'yi ETH'ye çevir (display için)
export const formatEth = (wei: bigint, decimals: number = 6): string => {
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
};

// ETH'yi Wei'ye çevir
export const parseEth = (eth: string | number): bigint => {
  return BigInt(Math.floor(Number(eth) * 1e18));
};
