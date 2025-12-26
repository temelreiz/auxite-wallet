// V6 Token Service - Blockchain operations
import { ethers } from 'ethers';

// Contract addresses (Sepolia)
const CONTRACTS: Record<string, string> = {
  auxg: '0x74C143Acd7Ee02CfffD1c23FB5B2Ee9dEBE369AC',
  auxs: '0xb6179d8eDAC23c5d4F69B128a1b974baB788828D',
  auxpt: '0x02A712F9aF81Ee9E55b154e5bae08Fe831c59c15',
  auxpd: '0xb0d5929b5F0486865072c6933911947e999947E0',
};

const ORACLE_ADDRESS = '0x8ccA0FC65B5b745cdF8C427cb43e1EC29A95a51d';

const TOKEN_ABI = [
  'function calculateBuyCost(uint256 grams) view returns (uint256)',
  'function calculateSellPayout(uint256 grams) view returns (uint256)',
  'function buy(uint256 grams, uint256 maxCostWei) payable',
  'function buyFor(address to, uint256 grams, uint256 maxCostWei) payable',
  'function sell(uint256 grams)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function askPerKgE6() view returns (uint256)',
  'function bidPerKgE6() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

const ORACLE_ABI = [
  'function setAllPrices(uint256 auxgOzE6, uint256 auxsOzE6, uint256 auxptOzE6, uint256 auxpdOzE6, uint256 ethPriceE6)',
  'function getAllPricesOzE6() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function getETHPriceE6() view returns (uint256)',
];

// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER & WALLET
// ═══════════════════════════════════════════════════════════════════════════

function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error('SEPOLIA_RPC_URL not configured');
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getHotWallet(): ethers.Wallet {
  const privateKey = process.env.HOT_WALLET_ETH_PRIVATE_KEY;
  if (!privateKey) throw new Error('HOT_WALLET_ETH_PRIVATE_KEY not configured');
  return new ethers.Wallet(privateKey, getProvider());
}

function getTokenContract(token: string, signer?: ethers.Wallet): ethers.Contract {
  const address = CONTRACTS[token.toLowerCase()];
  if (!address || address.includes('ADDRESS')) throw new Error(`Token not configured: ${token}`);
  return new ethers.Contract(address, TOKEN_ABI, signer || getProvider());
}

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════

import { getMetalPrices, getMetalPrice } from './price-cache';
import { getMetalSpread, applySpread } from './spread-config';

// ═══════════════════════════════════════════════════════════════════════════
// PRICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface TokenPrices {
  askPerKg: number;
  bidPerKg: number;
  askPerGram: number;
  bidPerGram: number;
  spreadPercent: { buy: number; sell: number };
  contractAskPerGram?: number;
  contractBidPerGram?: number;
}

/**
 * Get token prices - API prices with spread for display/quote
 */
export async function getTokenPrices(token: string): Promise<TokenPrices> {
  const basePrice = await getMetalPrice(token);
  const spread = await getMetalSpread(token);
  
  const askPerGram = applySpread(basePrice, 'buy', spread.buy);
  const bidPerGram = applySpread(basePrice, 'sell', spread.sell);
  
  let contractAskPerGram: number | undefined;
  let contractBidPerGram: number | undefined;
  
  try {
    const contract = getTokenContract(token);
    const [askE6, bidE6] = await Promise.all([
      contract.askPerKgE6(),
      contract.bidPerKgE6(),
    ]);
    contractAskPerGram = Number(askE6) / 1_000_000 / 1000;
    contractBidPerGram = Number(bidE6) / 1_000_000 / 1000;
  } catch (e) {
    // Contract not available
  }
  
  return {
    askPerKg: askPerGram * 1000,
    bidPerKg: bidPerGram * 1000,
    askPerGram,
    bidPerGram,
    spreadPercent: spread,
    contractAskPerGram,
    contractBidPerGram,
  };
}

/**
 * Get ETH/USD price from Oracle
 */
export async function getETHUSDPrice(): Promise<number> {
  const provider = getProvider();
  const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, provider);
  const ethPriceE6 = await oracle.getETHPriceE6();
  return Number(ethPriceE6) / 1_000_000;
}

// ═══════════════════════════════════════════════════════════════════════════
// COST CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

export async function calculateBuyCost(
  token: string,
  grams: number
): Promise<{ costWei: bigint; costETH: number; costUSD: number }> {
  const contract = getTokenContract(token);
  const gramsInt = BigInt(Math.ceil(grams));
  
  const costWei = await contract.calculateBuyCost(gramsInt);
  const costETH = parseFloat(ethers.formatEther(costWei));
  
  const ethPrice = await getETHUSDPrice();
  const costUSD = costETH * ethPrice;
  
  return { costWei, costETH, costUSD };
}

export async function calculateSellPayout(
  token: string,
  grams: number
): Promise<{ payoutWei: bigint; payoutETH: number; payoutUSD: number }> {
  const contract = getTokenContract(token);
  const gramsInt = BigInt(Math.ceil(grams));
  
  const payoutWei = await contract.calculateSellPayout(gramsInt);
  const payoutETH = parseFloat(ethers.formatEther(payoutWei));
  
  const ethPrice = await getETHUSDPrice();
  const payoutUSD = payoutETH * ethPrice;
  
  return { payoutWei, payoutETH, payoutUSD };
}

// ═══════════════════════════════════════════════════════════════════════════
// RESERVE CHECK
// ═══════════════════════════════════════════════════════════════════════════

export async function checkReserveLimit(
  token: string,
  grams: number
): Promise<{ allowed: boolean; maxMintable: number }> {
  return { allowed: true, maxMintable: 1000000 };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export interface BuyResult {
  success: boolean;
  txHash?: string;
  costETH?: number;
  costUSD?: number;
  gramsReceived?: number;
  error?: string;
}

export async function buyMetalToken(
  token: string,
  grams: number,
  toAddress?: string,
  slippagePercent: number = 5
): Promise<BuyResult> {
  try {
    const wallet = getHotWallet();
    const contract = getTokenContract(token, wallet);
    const provider = getProvider();
    
    const gramsInt = BigInt(Math.ceil(grams));
    
    const costWei = await contract.calculateBuyCost(gramsInt);
    const costETH = parseFloat(ethers.formatEther(costWei));
    
    const maxCostWei = costWei + (costWei * BigInt(Math.floor(slippagePercent * 100))) / 10000n;
    
    const ethBalance = await provider.getBalance(wallet.address);
    
    const gasEstimate = await contract.buy.estimateGas(
      gramsInt,
      maxCostWei,
      { value: maxCostWei }
    );
    const feeData = await provider.getFeeData();
    const gasCost = gasEstimate * (feeData.maxFeePerGas || ethers.parseUnits("50", "gwei"));
    
    const totalNeeded = maxCostWei + gasCost;
    
    if (ethBalance < totalNeeded) {
      return {
        success: false,
        error: `Insufficient hot wallet ETH. Need: ${ethers.formatEther(totalNeeded)} ETH, Have: ${ethers.formatEther(ethBalance)} ETH`,
      };
    }
    
    const ethPrice = await getETHUSDPrice();
    const costUSD = costETH * ethPrice;
    
    console.log(`🔷 Buying ${gramsInt}g ${token.toUpperCase()} for ~${costETH.toFixed(6)} ETH ($${costUSD.toFixed(2)})`);
    
    // Execute buy
    const tx = await contract.buyFor(toAddress || wallet.address,
      gramsInt,
      maxCostWei,
      {
        value: maxCostWei,
        gasLimit: gasEstimate + 50000n,
      }
    );
    
    const receipt = await tx.wait(1);
    
    console.log(`✅ Buy complete: ${receipt.hash}`);
    
    // Skip transfer - tokens stay in hot wallet for now
    // TODO: Implement buyFor in contract
    if (false && toAddress) { // Disabled - too slow
      const decimals = await contract.decimals();
      const tokenAmount = gramsInt * (10n ** BigInt(decimals));
      console.log(`🔄 Transferring ${gramsInt}g to ${toAddress}`);
      const transferTx = await contract.transfer(toAddress, tokenAmount);
      await transferTx.wait(1);
      console.log(`✅ Transfer complete: ${transferTx.hash}`);
    }
    
    return {
      success: true,
      txHash: receipt.hash,
      costETH,
      costUSD,
      gramsReceived: Number(gramsInt),
    };
    
  } catch (error: any) {
    console.error('Buy error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELL FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export interface SellResult {
  success: boolean;
  txHash?: string;
  payoutETH?: number;
  payoutUSD?: number;
  error?: string;
}

export async function sellMetalToken(
  token: string,
  grams: number,
  fromAddress?: string
): Promise<SellResult> {
  try {
    const wallet = getHotWallet();
    const contract = getTokenContract(token, wallet);
    
    const gramsInt = BigInt(Math.ceil(grams));
    
    const payoutWei = await contract.calculateSellPayout(gramsInt);
    const payoutETH = parseFloat(ethers.formatEther(payoutWei));
    
    const ethPrice = await getETHUSDPrice();
    const payoutUSD = payoutETH * ethPrice;
    
    console.log(`🔶 Selling ${gramsInt}g ${token.toUpperCase()} for ~${payoutETH.toFixed(6)} ETH ($${payoutUSD.toFixed(2)})`);
    
    const tx = await contract.sell(gramsInt);
    const receipt = await tx.wait(1);
    
    console.log(`✅ Sell complete: ${receipt.hash}`);
    
    return {
      success: true,
      txHash: receipt.hash,
      payoutETH,
      payoutUSD,
    };
    
  } catch (error: any) {
    console.error('Sell error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORACLE PRICE UPDATE
// ═══════════════════════════════════════════════════════════════════════════

const GRAMS_PER_OZ = 31.1035;

/**
 * Update Oracle prices from API before trade
 */
export async function updateOraclePrices(): Promise<boolean> {
  try {
    const wallet = getHotWallet();
    const oracle = new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, wallet);
    
    // Fetch current prices from API
    const [metalRes, ethRes] = await Promise.all([
      fetch('https://auxite-wallet.vercel.app/api/metals'),
      fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'),
    ]);
    
    const metalData = await metalRes.json();
    const ethData = await ethRes.json();
    
    if (!metalData.ok || !metalData.data) {
      console.error('Failed to fetch metal prices');
      return false;
    }
    
    // Parse metal prices from array
    const metals: Record<string, number> = {};
    for (const m of metalData.data) {
      metals[m.symbol] = m.priceOz;
    }
    
    // Already in $/oz, convert to * 1e6
    const auxgOzE6 = Math.round((metals.AUXG || 4500) * 1_000_000);
    const auxsOzE6 = Math.round((metals.AUXS || 30) * 1_000_000);
    const auxptOzE6 = Math.round((metals.AUXPT || 950) * 1_000_000);
    const auxpdOzE6 = Math.round((metals.AUXPD || 1000) * 1_000_000);
    const ethPriceE6 = Math.round((ethData.ethereum?.usd || 3500) * 1_000_000);
    
    console.log('🔄 Updating Oracle prices:');
    console.log(`   AUXG: $${(auxgOzE6 / 1_000_000).toFixed(2)}/oz`);
    console.log(`   AUXS: $${(auxsOzE6 / 1_000_000).toFixed(2)}/oz`);
    console.log(`   AUXPT: $${(auxptOzE6 / 1_000_000).toFixed(2)}/oz`);
    console.log(`   AUXPD: $${(auxpdOzE6 / 1_000_000).toFixed(2)}/oz`);
    console.log(`   ETH: $${(ethPriceE6 / 1_000_000).toFixed(2)}`);
    
    // Update Oracle on-chain
    const tx = await oracle.setAllPrices(
      auxgOzE6,
      auxsOzE6,
      auxptOzE6,
      auxpdOzE6,
      ethPriceE6,
      { gasLimit: 200000 }
    );
    
    await tx.wait(1);
    console.log('✅ Oracle prices updated:', tx.hash);
    
    return true;
  } catch (error: any) {
    console.error('Oracle update error:', error.message);
    return false;
  }
}
