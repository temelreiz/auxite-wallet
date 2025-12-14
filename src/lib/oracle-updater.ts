// Oracle Price Updater - Fetches prices and updates blockchain with spread
import { ethers } from 'ethers';
import { getSpreadConfig, applySpread } from './spread-config';

const ORACLE_ADDRESS = '0x45677fc1bE2F59937Fd6A93145Db76beB38a7CcA';
const ORACLE_ABI = [
  'function setManualPrice(bytes32 metalId, uint256 priceE6) external',
  'function getPrice(bytes32 metalId) view returns (uint256)',
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

/**
 * Fetch metal prices from GoldAPI (returns $/oz)
 */
export async function fetchMetalPrices(): Promise<MetalPrices> {
  const apiKey = process.env.GOLDAPI_KEY;
  
  if (!apiKey) {
    throw new Error('GOLDAPI_KEY not set');
  }

  const metals = ['XAU', 'XAG', 'XPT', 'XPD'];
  const prices: any = {};

  for (const metal of metals) {
    const res = await fetch(`https://www.goldapi.io/api/${metal}/USD`, {
      headers: { 'x-access-token': apiKey }
    });
    
    if (!res.ok) {
      throw new Error(`GoldAPI error for ${metal}: ${res.status}`);
    }
    
    const data = await res.json();
    prices[metal] = data.price;
  }

  return {
    gold: prices.XAU,
    silver: prices.XAG,
    platinum: prices.XPT,
    palladium: prices.XPD,
  };
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
 */
export async function updateOraclePrices(): Promise<{
  success: boolean;
  txHashes?: string[];
  prices?: any;
  error?: string;
}> {
  try {
    // 1. Get raw prices from API ($/oz)
    const rawPrices = await fetchMetalPrices();
    
    // 2. Convert to $/gram
    const basePrices = {
      gold: rawPrices.gold / TROY_OUNCE_TO_GRAMS,
      silver: rawPrices.silver / TROY_OUNCE_TO_GRAMS,
      platinum: rawPrices.platinum / TROY_OUNCE_TO_GRAMS,
      palladium: rawPrices.palladium / TROY_OUNCE_TO_GRAMS,
    };

    // 3. Get admin spread config
    const spreadConfig = await getSpreadConfig();
    const metals = spreadConfig.metals || spreadConfig;

    // 4. Apply spread for BUY prices (ask)
    const metals = spreadConfig.metals || spreadConfig;
    const askPrices = {
      gold: applySpread(basePrices.gold, 'buy', metals.gold.buy),
      silver: applySpread(basePrices.silver, 'buy', metals.silver.buy),
      platinum: applySpread(basePrices.platinum, 'buy', metals.platinum.buy),
      palladium: applySpread(basePrices.palladium, 'buy', metals.palladium.buy),
    };

    console.log('Base prices ($/g):', basePrices);
    console.log('Ask prices with spread ($/g):', askPrices);

    // 5. Setup blockchain connection
    const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
    const privateKey = process.env.PRIVATE_KEY;
    
    if (!rpcUrl || !privateKey) {
      throw new Error('RPC_URL or PRIVATE_KEY not set');
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, wallet);

    const txHashes: string[] = [];

    // 6. Update each metal with spread-applied price
    const updates = [
      { id: METAL_IDS.GOLD, price: gramToKgE6(askPrices.gold), name: 'GOLD', pricePerGram: askPrices.gold },
      { id: METAL_IDS.SILVER, price: gramToKgE6(askPrices.silver), name: 'SILVER', pricePerGram: askPrices.silver },
      { id: METAL_IDS.PLATINUM, price: gramToKgE6(askPrices.platinum), name: 'PLATINUM', pricePerGram: askPrices.platinum },
      { id: METAL_IDS.PALLADIUM, price: gramToKgE6(askPrices.palladium), name: 'PALLADIUM', pricePerGram: askPrices.palladium },
    ];

    for (const update of updates) {
      console.log(`Updating ${update.name}: $${update.pricePerGram.toFixed(2)}/g (E6/kg: ${update.price})`);
      
      const tx = await oracle.setManualPrice(update.id, update.price);
      await tx.wait();
      txHashes.push(tx.hash);
    }

    console.log('✅ Oracle prices updated with spread!');
    
    return { 
      success: true, 
      txHashes,
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
 * Get current oracle prices
 */
export async function getOraclePrices(): Promise<{
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  ethUsd: number;
}> {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);

  const [goldE6, silverE6, platinumE6, palladiumE6, ethE6] = await Promise.all([
    oracle.getPrice(METAL_IDS.GOLD).catch(() => 0n),
    oracle.getPrice(METAL_IDS.SILVER).catch(() => 0n),
    oracle.getPrice(METAL_IDS.PLATINUM).catch(() => 0n),
    oracle.getPrice(METAL_IDS.PALLADIUM).catch(() => 0n),
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
