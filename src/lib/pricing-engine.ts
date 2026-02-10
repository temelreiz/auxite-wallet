// ============================================
// AUXITE INSTITUTIONAL PRICING ENGINE v3
// ============================================
// "Execution price = risk engine. Spread değil, komisyon değil, risk sigortası."
//
// FORMULA (8-Layer):
//   L1: Base Margin (ticket curve adjusted)
//   L2: Absolute Floor (hedge slippage + fill risk)
//   L3: Volatility Add
//   L4: Market Hours Add
//   L5: Depth Multiplier (thin liquidity protection)
//   L6: Micro Optimization (+0.12% invisible buffer)
//   L7: Price Optimization (ceil to clean increment)
//   L8: Whale Floor (min 0.80% realized — NEVER below)
//
// PHILOSOPHY:
//   - Cheapest platform ❌
//   - Safest execution venue ✅
//   - Execution price = risk yönetimi, indirim alanı değil
//   - Engine çalışıyorsa spread düşürme. Slow widen.
// ============================================

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================
// TYPES
// ============================================

export interface MetalPricingConfig {
  baseMargin: number;           // Base % margin (e.g., 0.95 = 0.95%)
  absoluteFloor: number;        // Min absolute $/gram — hedge slippage + fill risk
}

export type DepthMode = 'deep' | 'normal' | 'thin' | 'shock';

export interface PricingConfig {
  metals: {
    gold: MetalPricingConfig;
    silver: MetalPricingConfig;
    platinum: MetalPricingConfig;
    palladium: MetalPricingConfig;
  };
  volatilityMode: 'calm' | 'elevated' | 'high' | 'extreme';
  marketHoursMode: 'london_ny' | 'asia' | 'weekend';
  depthMode: DepthMode;
  ticketTiers: {
    microMax: number;
    tier1Max: number;
    tier2Max: number;
    tier3Max: number;
    rfqThreshold: number;
  };
  // Whale floor: min realized margin %. Engine ne yaparsa yapsın altına düşmez.
  whaleFloorPercent: number;
  // Micro optimization: invisible buffer added to every execution
  microOptimizationPercent: number;
  priceOptimizationEnabled: boolean;
}

export interface ExecutionPriceResult {
  spotPrice: number;
  executionPrice: number;
  spotPriceOz: number;
  executionPriceOz: number;
  // Layer breakdown
  baseMarginApplied: number;
  floorApplied: boolean;
  volatilityAdd: number;
  marketHoursAdd: number;
  depthAdd: number;
  microOptAdd: number;
  priceOptAdd: number;
  whaleFloorApplied: boolean;
  totalMarkup: number;
  effectiveMarginPercent: number;
  ticketAdjustPercent: number;
  requiresRFQ: boolean;
  metal: string;
}

// ============================================
// CONSTANTS
// ============================================

const TROY_OZ_TO_GRAM = 31.1035;

// Volatility: ADDITIVE (% points)
const VOLATILITY_ADD: Record<string, number> = {
  calm: 0,
  elevated: 0.20,
  high: 0.40,
  extreme: 0.80,
};

// Market hours: ADDITIVE (% points)
const MARKET_HOURS_ADD: Record<string, number> = {
  london_ny: 0,
  asia: 0.15,
  weekend: 0.30,
};

// Market depth: ADDITIVE (% points) — flash move koruma
const DEPTH_ADD: Record<string, number> = {
  deep: 0,          // Derin book, spread tight
  normal: 0,        // Normal conditions
  thin: 0.25,       // Thin liquidity → +0.25%
  shock: 0.45,      // Flash crash / gap → +0.45%
};

// Institutional Base Margins + Absolute Floors
const DEFAULT_CONFIG: PricingConfig = {
  metals: {
    gold:      { baseMargin: 0.95, absoluteFloor: 1.25 },
    silver:    { baseMargin: 1.45, absoluteFloor: 0.04 },
    platinum:  { baseMargin: 1.85, absoluteFloor: 1.80 },
    palladium: { baseMargin: 2.40, absoluteFloor: 4.20 },  // Artırıldı: $3.50 → $4.20
  },
  volatilityMode: 'calm',
  marketHoursMode: 'london_ny',
  depthMode: 'normal',
  ticketTiers: {
    microMax: 50000,
    tier1Max: 250000,
    tier2Max: 1000000,
    tier3Max: 1500000,      // Değişti: $2M → $1.5M
    rfqThreshold: 1500000,  // RFQ erken: $1.5M+
  },
  // Whale floor: hiçbir ticket %0.80'ın altına DÜŞMEZ
  whaleFloorPercent: 0.80,
  // Micro optimization: +0.12% invisible buffer — UI'da görünmez, revenue ↑
  microOptimizationPercent: 0.12,
  priceOptimizationEnabled: true,
};

const METAL_KEY_MAP: Record<string, string> = {
  AUXG: 'gold', AUXS: 'silver', AUXPT: 'platinum', AUXPD: 'palladium',
  gold: 'gold', silver: 'silver', platinum: 'platinum', palladium: 'palladium',
};

// ============================================
// CONFIG MANAGEMENT
// ============================================

const REDIS_KEY = 'admin:pricing:config:v3';

function mergeConfig(base: PricingConfig, partial: any): PricingConfig {
  return {
    metals: {
      gold: { ...base.metals.gold, ...(partial?.metals?.gold || {}) },
      silver: { ...base.metals.silver, ...(partial?.metals?.silver || {}) },
      platinum: { ...base.metals.platinum, ...(partial?.metals?.platinum || {}) },
      palladium: { ...base.metals.palladium, ...(partial?.metals?.palladium || {}) },
    },
    volatilityMode: partial?.volatilityMode || base.volatilityMode,
    marketHoursMode: partial?.marketHoursMode || base.marketHoursMode,
    depthMode: partial?.depthMode || base.depthMode,
    ticketTiers: { ...base.ticketTiers, ...(partial?.ticketTiers || {}) },
    whaleFloorPercent: partial?.whaleFloorPercent ?? base.whaleFloorPercent,
    microOptimizationPercent: partial?.microOptimizationPercent ?? base.microOptimizationPercent,
    priceOptimizationEnabled: partial?.priceOptimizationEnabled ?? base.priceOptimizationEnabled,
  };
}

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const raw = await redis.get(REDIS_KEY);
    if (raw && typeof raw === 'object') return mergeConfig(DEFAULT_CONFIG, raw);
    if (raw && typeof raw === 'string') return mergeConfig(DEFAULT_CONFIG, JSON.parse(raw));
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('Pricing config read error:', error);
    return DEFAULT_CONFIG;
  }
}

export async function setPricingConfig(config: Partial<PricingConfig>): Promise<PricingConfig> {
  const current = await getPricingConfig();
  const updated = mergeConfig(current, config);
  await redis.set(REDIS_KEY, JSON.stringify(updated));
  return updated;
}

export async function setVolatilityMode(mode: PricingConfig['volatilityMode']): Promise<void> {
  const config = await getPricingConfig();
  config.volatilityMode = mode;
  await redis.set(REDIS_KEY, JSON.stringify(config));
}

export async function setMarketHoursMode(mode: PricingConfig['marketHoursMode']): Promise<void> {
  const config = await getPricingConfig();
  config.marketHoursMode = mode;
  await redis.set(REDIS_KEY, JSON.stringify(config));
}

export async function setDepthMode(mode: DepthMode): Promise<void> {
  const config = await getPricingConfig();
  config.depthMode = mode;
  await redis.set(REDIS_KEY, JSON.stringify(config));
}

export async function setMetalMarkup(
  metal: string,
  markup: Partial<MetalPricingConfig>
): Promise<void> {
  const config = await getPricingConfig();
  const key = METAL_KEY_MAP[metal];
  if (key && config.metals[key as keyof typeof config.metals]) {
    config.metals[key as keyof typeof config.metals] = {
      ...config.metals[key as keyof typeof config.metals],
      ...markup,
    };
    await redis.set(REDIS_KEY, JSON.stringify(config));
  }
}

// ============================================
// TICKET CURVE
// ============================================
// <50K       → base + 0.20%  (micro — operasyonu fonlar)
// 50K-250K   → base          (standard)
// 250K-1M    → base - 0.10%  (preferred — daha conservative)
// 1M-1.5M    → base - 0.15%  (institutional)
// 1.5M+      → RFQ           (desk-priced, LP quote, tighter ama yine kazanırsın)

function getTicketCurveAdjustment(
  capitalAmount: number,
  config: PricingConfig
): { adjustPercent: number; requiresRFQ: boolean } {
  if (capitalAmount >= config.ticketTiers.rfqThreshold) {
    return { adjustPercent: -0.15, requiresRFQ: true };
  }
  if (capitalAmount >= config.ticketTiers.tier2Max) {
    // 1M-1.5M: base - 0.15%
    return { adjustPercent: -0.15, requiresRFQ: false };
  }
  if (capitalAmount >= config.ticketTiers.tier1Max) {
    // 250K-1M: base - 0.10%
    return { adjustPercent: -0.10, requiresRFQ: false };
  }
  if (capitalAmount >= config.ticketTiers.microMax) {
    // 50K-250K: base (no adjustment)
    return { adjustPercent: 0, requiresRFQ: false };
  }
  // <50K: base + 0.20%
  return { adjustPercent: 0.20, requiresRFQ: false };
}

// ============================================
// PRICE OPTIMIZATION (ceil to clean increment)
// ============================================

function applyPriceOptimization(price: number, metal: string): number {
  const key = METAL_KEY_MAP[metal] || metal;
  switch (key) {
    case 'gold':
      return Math.ceil(price * 20) / 20;       // nearest $0.05
    case 'silver':
      return Math.ceil(price * 100) / 100;      // nearest $0.01
    case 'platinum':
      return Math.ceil(price * 20) / 20;
    case 'palladium':
      return Math.ceil(price * 20) / 20;
    default:
      return Math.ceil(price * 20) / 20;
  }
}

// ============================================
// CORE: 8-LAYER EXECUTION PRICING
// ============================================

export async function calculateExecutionPrice(
  metalSymbol: string,
  spotPricePerGram: number,
  capitalAmount: number = 0,
): Promise<ExecutionPriceResult> {
  const config = await getPricingConfig();
  const metalKey = METAL_KEY_MAP[metalSymbol] || 'gold';
  const metalConfig = config.metals[metalKey as keyof typeof config.metals] || DEFAULT_CONFIG.metals.gold;

  // ── L1: Base Margin (ticket curve adjusted) ──
  const { adjustPercent, requiresRFQ } = getTicketCurveAdjustment(capitalAmount, config);
  const effectiveBaseMargin = metalConfig.baseMargin + adjustPercent;
  const baseMarginDollar = spotPricePerGram * (effectiveBaseMargin / 100);

  // ── L2: Absolute Floor ──
  const floorApplied = metalConfig.absoluteFloor > baseMarginDollar;
  const marginAfterFloor = Math.max(baseMarginDollar, metalConfig.absoluteFloor);

  // ── L3: Volatility Add ──
  const volAddPct = VOLATILITY_ADD[config.volatilityMode] || 0;
  const volatilityDollar = spotPricePerGram * (volAddPct / 100);

  // ── L4: Market Hours Add ──
  const hoursAddPct = MARKET_HOURS_ADD[config.marketHoursMode] || 0;
  const marketHoursDollar = spotPricePerGram * (hoursAddPct / 100);

  // ── L5: Depth Multiplier ──
  const depthAddPct = DEPTH_ADD[config.depthMode] || 0;
  const depthDollar = spotPricePerGram * (depthAddPct / 100);

  // ── L6: Micro Optimization (invisible buffer) ──
  const microOptDollar = spotPricePerGram * (config.microOptimizationPercent / 100);

  // ── Pre-optimization execution ──
  const rawExecution = spotPricePerGram + marginAfterFloor + volatilityDollar + marketHoursDollar + depthDollar + microOptDollar;

  // ── L7: Price Optimization (ceil to clean price) ──
  let priceOptDollar = 0;
  let afterOptExecution = rawExecution;
  if (config.priceOptimizationEnabled) {
    afterOptExecution = applyPriceOptimization(rawExecution, metalSymbol);
    priceOptDollar = afterOptExecution - rawExecution;
  }

  // ── L8: WHALE FLOOR — min realized margin. ASLA altına düşmez. ──
  const whaleFloorDollar = spotPricePerGram * (config.whaleFloorPercent / 100);
  let finalExecution = afterOptExecution;
  let whaleFloorApplied = false;
  if ((finalExecution - spotPricePerGram) < whaleFloorDollar) {
    // Whale floor kick in — force minimum margin
    finalExecution = spotPricePerGram + whaleFloorDollar;
    // Re-apply price optimization on whale-floored price
    if (config.priceOptimizationEnabled) {
      finalExecution = applyPriceOptimization(finalExecution, metalSymbol);
    }
    whaleFloorApplied = true;
  }

  // ── METRICS ──
  const totalMarkup = finalExecution - spotPricePerGram;
  const effectivePercent = (totalMarkup / spotPricePerGram) * 100;

  return {
    spotPrice: spotPricePerGram,
    executionPrice: finalExecution,
    spotPriceOz: spotPricePerGram * TROY_OZ_TO_GRAM,
    executionPriceOz: finalExecution * TROY_OZ_TO_GRAM,
    baseMarginApplied: marginAfterFloor,
    floorApplied,
    volatilityAdd: volatilityDollar,
    marketHoursAdd: marketHoursDollar,
    depthAdd: depthDollar,
    microOptAdd: microOptDollar,
    priceOptAdd: priceOptDollar,
    whaleFloorApplied,
    totalMarkup,
    effectiveMarginPercent: Math.round(effectivePercent * 100) / 100,
    ticketAdjustPercent: adjustPercent,
    requiresRFQ,
    metal: metalSymbol,
  };
}

// ============================================
// BATCH PRICING
// ============================================

export async function calculateAllExecutionPrices(
  spotPricesPerGram: Record<string, number>,
  capitalAmount: number = 0,
): Promise<Record<string, ExecutionPriceResult>> {
  const results: Record<string, ExecutionPriceResult> = {};
  for (const [symbol, spotPrice] of Object.entries(spotPricesPerGram)) {
    results[symbol] = await calculateExecutionPrice(symbol, spotPrice, capitalAmount);
  }
  return results;
}

// ============================================
// ROUNDING / FORMATTING
// ============================================

export function roundPrice(price: number, metal: string): number {
  const key = METAL_KEY_MAP[metal] || metal;
  switch (key) {
    case 'gold':
      return Math.round(price * 20) / 20;
    case 'silver':
      return Math.round(price * 100) / 100;
    case 'platinum':
      return Math.round(price * 20) / 20;
    case 'palladium':
      return Math.round(price * 20) / 20;
    default:
      return Math.round(price * 100) / 100;
  }
}

export function roundPriceOz(price: number): number {
  return Math.round(price);
}

export function formatPrice(price: number, metal?: string): string {
  const rounded = metal ? roundPrice(price, metal) : Math.round(price * 100) / 100;
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPriceOz(price: number): string {
  return Math.round(price).toLocaleString('en-US');
}
