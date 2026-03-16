// Oracle Price Updater - KuveytTurk primary, GoldAPI fallback
// Updates on-chain oracle with real metal prices
import { ethers } from 'ethers';
import { getSpreadConfig, applySpread } from './spread-config';
import { ORACLE_ADDRESS } from '@/config/contracts-v8';
import { getMetalPricesInUsd } from './kuveytturk-service';

const ORACLE_ABI = [
  'function updatePrice(bytes32 metalId, uint256 priceE6) external',
  'function getBasePerKgE6(bytes32 metalId) external view returns (uint256)',
  'function getETHPriceE6() view returns (uint256)'
];

const METAL_IDS = {
  GOLD: ethers.id('GOLD'),
  SILVER: ethers.id('SILVER'),
  PLATINUM: ethers.id('PLATINUM'),
  PALLADIUM: ethers.id('PALLADIUM'),
};

const TROY_OUNCE_TO_GRAMS = 31.1035;

interface MetalPrices {
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
}

// ============================================
// PRIMARY: KuveytTurk price source
// ============================================

async function fetchKuveytTurkPrices(): Promise<MetalPrices | null> {
  try {
    const metalPricesUsd = await getMetalPricesInUsd();

    const gold = metalPricesUsd.AUXG?.buyRateUSD;
    const silver = metalPricesUsd.AUXS?.buyRateUSD;
    const platinum = metalPricesUsd.AUXPT?.buyRateUSD;
    const palladium = metalPricesUsd.AUXPD?.buyRateUSD;

    if (!gold || !silver || !platinum || !palladium) {
      console.warn('⚠️ KuveytTurk incomplete data for oracle');
      return null;
    }

    console.log(`📊 Oracle source: KuveytTurk — AUXG: $${gold.toFixed(2)}/g, AUXS: $${silver.toFixed(2)}/g`);
    return { gold, silver, platinum, palladium };
  } catch (error) {
    console.error('❌ KuveytTurk oracle fetch failed:', error);
    return null;
  }
}

// ============================================
// FALLBACK: GoldAPI price source
// ============================================

async function fetchGoldApiPrices(): Promise<MetalPrices | null> {
  const apiKey = process.env.GOLDAPI_KEY;

  if (!apiKey) {
    console.warn('⚠️ GOLDAPI_KEY not set, skipping GoldAPI fallback');
    return null;
  }

  try {
    const metals = ['XAU', 'XAG', 'XPT', 'XPD'];
    const prices: any = {};

    for (const metal of metals) {
      await new Promise(r => setTimeout(r, 1500));
      const res = await fetch(`https://www.goldapi.io/api/${metal}/USD`, {
        headers: { 'x-access-token': apiKey }
      });

      if (!res.ok) {
        console.warn(`⚠️ GoldAPI error for ${metal}: ${res.status}`);
        return null;
      }

      const data = await res.json();
      prices[metal] = data.price;
    }

    // GoldAPI returns $/oz, convert to $/gram
    const result = {
      gold: prices.XAU / TROY_OUNCE_TO_GRAMS,
      silver: prices.XAG / TROY_OUNCE_TO_GRAMS,
      platinum: prices.XPT / TROY_OUNCE_TO_GRAMS,
      palladium: prices.XPD / TROY_OUNCE_TO_GRAMS,
    };

    console.log(`📊 Oracle source: GoldAPI — AUXG: $${result.gold.toFixed(2)}/g, AUXS: $${result.silver.toFixed(2)}/g`);
    return result;
  } catch (error) {
    console.error('❌ GoldAPI oracle fetch failed:', error);
    return null;
  }
}

// ============================================
// FETCH PRICES: KuveytTurk → GoldAPI fallback
// ============================================

async function fetchMetalPricesWithFallback(): Promise<{ prices: MetalPrices; source: string }> {
  // Primary: KuveytTurk (returns $/gram directly)
  const ktPrices = await fetchKuveytTurkPrices();
  if (ktPrices) {
    return { prices: ktPrices, source: 'kuveytturk' };
  }

  // Fallback: GoldAPI
  console.log('⚠️ KuveytTurk failed, falling back to GoldAPI for oracle...');
  const goldApiPrices = await fetchGoldApiPrices();
  if (goldApiPrices) {
    return { prices: goldApiPrices, source: 'goldapi' };
  }

  throw new Error('All price sources failed (KuveytTurk + GoldAPI)');
}

/**
 * Convert gram price to kg price in E6 format
 */
function gramToKgE6(pricePerGram: number): bigint {
  const pricePerKg = pricePerGram * 1000;
  return BigInt(Math.round(pricePerKg * 1_000_000));
}

/**
 * Update oracle prices on blockchain WITH SPREAD
 * Primary: KuveytTurk, Fallback: GoldAPI
 */
export async function updateOraclePrices(): Promise<{
  success: boolean;
  txHashes?: string[];
  prices?: any;
  source?: string;
  error?: string;
}> {
  try {
    // 1. Fetch prices (KuveytTurk → GoldAPI fallback)
    const { prices: basePrices, source } = await fetchMetalPricesWithFallback();

    // 2. Get admin spread config
    const spreadConfig = await getSpreadConfig();
    const metals = spreadConfig.metals || spreadConfig;

    // 3. Apply spread for BUY prices (ask)
    const askPrices = {
      gold: applySpread(basePrices.gold, 'buy', metals.gold.buy),
      silver: applySpread(basePrices.silver, 'buy', metals.silver.buy),
      platinum: applySpread(basePrices.platinum, 'buy', metals.platinum.buy),
      palladium: applySpread(basePrices.palladium, 'buy', metals.palladium.buy),
    };

    console.log(`Oracle update [${source}] — Base ($/g):`, basePrices);
    console.log(`Oracle update [${source}] — Ask with spread ($/g):`, askPrices);

    // 4. Setup blockchain connection (Base Mainnet)
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const privateKey = process.env.PRIVATE_KEY;

    if (!rpcUrl || !privateKey) {
      throw new Error('RPC_URL or PRIVATE_KEY not set');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, wallet);

    const txHashes: string[] = [];

    // 5. Update each metal with spread-applied price
    const updates = [
      { id: METAL_IDS.GOLD, price: gramToKgE6(askPrices.gold), name: 'GOLD', pricePerGram: askPrices.gold },
      { id: METAL_IDS.SILVER, price: gramToKgE6(askPrices.silver), name: 'SILVER', pricePerGram: askPrices.silver },
      { id: METAL_IDS.PLATINUM, price: gramToKgE6(askPrices.platinum), name: 'PLATINUM', pricePerGram: askPrices.platinum },
      { id: METAL_IDS.PALLADIUM, price: gramToKgE6(askPrices.palladium), name: 'PALLADIUM', pricePerGram: askPrices.palladium },
    ];

    for (const update of updates) {
      console.log(`Updating ${update.name}: $${update.pricePerGram.toFixed(2)}/g (E6/kg: ${update.price})`);

      await new Promise(r => setTimeout(r, 2000)); // Wait 2s between txs
      const tx = await oracle.updatePrice(update.id, update.price);
      txHashes.push(tx.hash);
    }

    console.log(`✅ Oracle prices updated via ${source}!`);

    return {
      success: true,
      txHashes,
      source,
      prices: {
        base: basePrices,
        withSpread: askPrices,
        spread: spreadConfig,
      }
    };

  } catch (error: any) {
    console.error('Oracle update error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current oracle prices from on-chain
 */
export async function getOraclePrices(): Promise<{
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  ethUsd: number;
}> {
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);

  const [goldE6, silverE6, platinumE6, palladiumE6, ethE6] = await Promise.all([
    oracle.getBasePerKgE6(METAL_IDS.GOLD).catch(() => 0n),
    oracle.getBasePerKgE6(METAL_IDS.SILVER).catch(() => 0n),
    oracle.getBasePerKgE6(METAL_IDS.PLATINUM).catch(() => 0n),
    oracle.getBasePerKgE6(METAL_IDS.PALLADIUM).catch(() => 0n),
    oracle.getETHPriceE6(),
  ]);

  const toGramPrice = (e6: bigint) => Number(e6) / 1_000_000 / 1000;

  return {
    gold: toGramPrice(goldE6),
    silver: toGramPrice(silverE6),
    platinum: toGramPrice(platinumE6),
    palladium: toGramPrice(palladiumE6),
    ethUsd: Number(ethE6) / 1_000_000,
  };
}
