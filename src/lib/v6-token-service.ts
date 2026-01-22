// V8 Token Service - Blockchain operations for Auxite V8 Contracts
import { ethers } from 'ethers';
import { METAL_TOKENS, ORACLE_ADDRESS } from '@/config/contracts-v8';

// Contract addresses from central config
const CONTRACTS: Record<string, string> = {
  auxg: METAL_TOKENS.AUXG,
  auxs: METAL_TOKENS.AUXS,
  auxpt: METAL_TOKENS.AUXPT,
  auxpd: METAL_TOKENS.AUXPD,
};

// V8 Contract ABI
const TOKEN_ABI = [
  'function buy(uint256 grams, string calldata custodian) external payable returns (uint256)',
  'function sell(uint256 grams) external',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function getPrice() view returns (uint256 askWeiPerGram, uint256 bidWeiPerGram)',
  'function calculateBuyCost(uint256 grams) view returns (uint256)',
  'function calculateSellPayout(uint256 grams) view returns (uint256)',
];

const ORACLE_ABI = [
  'function setAllPrices(uint256 auxgOzE6, uint256 auxsOzE6, uint256 auxptOzE6, uint256 auxpdOzE6, uint256 ethPriceE6)',
  'function getAllPricesOzE6() view returns (uint256, uint256, uint256, uint256, uint256)',
  'function getETHPriceE6() view returns (uint256)',
  'function setPricePerOzE6(bytes32 metalId, uint256 newPricePerOzE6)',
  'function setETHPriceE6(uint256 newPriceE6)',
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
  if (!address) throw new Error('Unknown token: ' + token);
  return new ethers.Contract(address, TOKEN_ABI, signer || getProvider());
}

function getOracleContract(signer?: ethers.Wallet): ethers.Contract {
  return new ethers.Contract(ORACLE_ADDRESS, ORACLE_ABI, signer || getProvider());
}

// ═══════════════════════════════════════════════════════════════════════════
// PRICE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getETHUSDPrice(): Promise<number> {
  try {
    const oracle = getOracleContract();
    const ethPriceE6 = await oracle.getETHPriceE6();
    return Number(ethPriceE6) / 1_000_000;
  } catch (error) {
    console.error('Failed to get ETH price from oracle:', error);
    return 3500; // Fallback
  }
}

// Price cache for API calls
let priceCache: { prices: any; bidPrices: any; timestamp: number } | null = null;
const PRICE_CACHE_DURATION = 5000; // 5 saniye cache

async function fetchPricesFromAPI(): Promise<{ prices: any; bidPrices: any }> {
  const now = Date.now();
  
  // Cache kontrolü
  if (priceCache && now - priceCache.timestamp < PRICE_CACHE_DURATION) {
    return { prices: priceCache.prices, bidPrices: priceCache.bidPrices };
  }
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wallet.auxite.io';
    const response = await fetch(`${baseUrl}/api/prices`, {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch prices');
    }
    
    const data = await response.json();
    
    priceCache = {
      prices: data.prices,
      bidPrices: data.bidPrices,
      timestamp: now,
    };
    
    return { prices: data.prices, bidPrices: data.bidPrices };
  } catch (error) {
    console.error('Failed to fetch prices from API:', error);
    // Fallback prices
    return {
      prices: { AUXG: 160, AUXS: 3.3, AUXPT: 87, AUXPD: 61 },
      bidPrices: { AUXG: 150, AUXS: 2.7, AUXPT: 72, AUXPD: 58 },
    };
  }
}

export async function getTokenPrices(token: string): Promise<{ 
  askUSD: number; 
  bidUSD: number; 
  askPerGram: number;
  bidPerGram: number;
  spreadPercent: { buy: number; sell: number };
}> {
  try {
    // /api/prices'dan fiyat çek (GoldAPI + spread)
    const { prices, bidPrices } = await fetchPricesFromAPI();
    
    const tokenUpper = token.toUpperCase();
    const askUSD = prices[tokenUpper] || 0;
    const bidUSD = bidPrices[tokenUpper] || 0;
    
    const spread = askUSD > 0 ? ((askUSD - bidUSD) / askUSD) * 100 : 0;
    const spreadPercent = { buy: spread, sell: spread };
    
    console.log(`📊 ${tokenUpper} prices from API: ask=$${askUSD}, bid=$${bidUSD}`);
    
    return {
      askUSD,
      bidUSD,
      askPerGram: askUSD,
      bidPerGram: bidUSD,
      spreadPercent,
    };
  } catch (error) {
    console.error('Failed to get ' + token + ' prices:', error);
    throw error;
  }
}

export async function calculateBuyCost(token: string, grams: number): Promise<{ costETH: number; costUSD: number }> {
  const contract = getTokenContract(token);
  const gramsInt = BigInt(Math.ceil(grams));
  const costWei = await contract.calculateBuyCost(gramsInt);
  const costETH = parseFloat(ethers.formatEther(costWei));
  const ethPrice = await getETHUSDPrice();
  
  return {
    costETH,
    costUSD: costETH * ethPrice,
  };
}

export async function calculateSellPayout(token: string, grams: number): Promise<{ payoutETH: number; payoutUSD: number }> {
  const contract = getTokenContract(token);
  const gramsInt = BigInt(Math.ceil(grams));
  const payoutWei = await contract.calculateSellPayout(gramsInt);
  const payoutETH = parseFloat(ethers.formatEther(payoutWei));
  const ethPrice = await getETHUSDPrice();
  
  return {
    payoutETH,
    payoutUSD: payoutETH * ethPrice,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ORACLE UPDATE
// ═══════════════════════════════════════════════════════════════════════════

interface MetalPrices {
  AUXG?: number;
  AUXS?: number;
  AUXPT?: number;
  AUXPD?: number;
}

export async function updateOraclePrices(metals: MetalPrices, ethPriceUSD?: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const wallet = getHotWallet();
    const oracle = getOracleContract(wallet);
    
    // Convert USD/oz to E6 format
    const auxgOzE6 = Math.round((metals.AUXG || 0) * 1_000_000);
    const auxsOzE6 = Math.round((metals.AUXS || 0) * 1_000_000);
    const auxptOzE6 = Math.round((metals.AUXPT || 0) * 1_000_000);
    const auxpdOzE6 = Math.round((metals.AUXPD || 0) * 1_000_000);
    const ethE6 = Math.round((ethPriceUSD || 3500) * 1_000_000);
    
    console.log('Updating oracle prices:', { auxgOzE6, auxsOzE6, auxptOzE6, auxpdOzE6, ethE6 });
    
    const tx = await oracle.setAllPrices(auxgOzE6, auxsOzE6, auxptOzE6, auxpdOzE6, ethE6);
    const receipt = await tx.wait();
    
    console.log('Oracle updated:', receipt.hash);
    return { success: true, txHash: receipt.hash };
  } catch (error: any) {
    console.error('Oracle update failed:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BUY METAL
// ═══════════════════════════════════════════════════════════════════════════

interface BuyResult {
  success: boolean;
  txHash?: string;
  grams?: number;
  costETH?: number;
  costUSD?: number;
  error?: string;
  status?: 'pending' | 'confirmed' | 'failed';
}

export async function buyMetalToken(
  token: string,
  grams: number,
  toAddress?: string,
  slippagePercent: number = 5
): Promise<BuyResult> {
  // Normalize address to checksum format
  const normalizedToAddress = toAddress ? ethers.getAddress(toAddress.toLowerCase()) : undefined;
  try {
    const wallet = getHotWallet();
    const contract = getTokenContract(token, wallet);
    const provider = getProvider();
    
    const gramsInt = BigInt(Math.ceil(grams));
    
    // Calculate cost
    const costWei = await contract.calculateBuyCost(gramsInt);
    const costETH = parseFloat(ethers.formatEther(costWei));
    
    // Add slippage
    const maxCostWei = costWei + (costWei * BigInt(Math.floor(slippagePercent * 100))) / 10000n;
    
    // Check balance
    const ethBalance = await provider.getBalance(wallet.address);
    
    // Estimate gas
    const gasEstimate = await contract.buy.estimateGas(gramsInt, "Zurich", { value: maxCostWei });
    const feeData = await provider.getFeeData();
    const maxFeePerGas = feeData.maxFeePerGas || ethers.parseUnits("50", "gwei");
    const gasCost = BigInt(gasEstimate) * maxFeePerGas;
    
    const totalNeeded = maxCostWei + gasCost;
    
    if (ethBalance < totalNeeded) {
      return {
        success: false,
        error: 'Insufficient ETH balance for transaction',
      };
    }
    
    const ethPrice = await getETHUSDPrice();
    const costUSD = costETH * ethPrice;
    
    console.log('Buying ' + gramsInt + 'g ' + token.toUpperCase() + ' for ' + costETH.toFixed(6) + ' ETH ($' + costUSD.toFixed(2) + ')');
    
    // Execute buy
    const nonce = await provider.getTransactionCount(wallet.address, 'latest');
    const baseFee = feeData.maxFeePerGas || ethers.parseUnits("30", "gwei");
    const priorityFee = ethers.parseUnits("2", "gwei");
    const maxFee = baseFee + priorityFee;
    
    const tx = await contract.buy(gramsInt, "Zurich", {
      value: maxCostWei,
      gasLimit: BigInt(gasEstimate) + 50000n,
      nonce: nonce,
      maxPriorityFeePerGas: priorityFee,
      maxFeePerGas: maxFee,
    });
    
    // 🚀 NON-BLOCKING: Hemen hash döndür, confirmation arka planda bekle
    const txHash = tx.hash;
    console.log('Buy tx submitted:', txHash);
    
    // Arka planda confirmation bekle ve transfer yap
    tx.wait(1).then(async (receipt: any) => {
      console.log('Buy confirmed:', receipt.hash);
      
      // Transfer to user if specified
      if (normalizedToAddress && normalizedToAddress.toLowerCase() !== wallet.address.toLowerCase()) {
        try {
          const decimals = await contract.decimals();
          const tokenAmount = gramsInt * (10n ** BigInt(Number(decimals) - 3));
          console.log('Transferring ' + gramsInt + 'g to ' + normalizedToAddress);
          
          const transferTx = await contract.transfer(normalizedToAddress, tokenAmount);
          await transferTx.wait(1);
          console.log('Transfer complete:', transferTx.hash);
        } catch (transferError: any) {
          console.error('Transfer failed (will retry):', transferError.message);
          // TODO: Queue for retry
        }
      }
    }).catch((err: any) => {
      console.error('Buy confirmation failed:', err.message);
      // TODO: Handle failed transaction
    });
    
    return {
      success: true,
      txHash,
      grams: Number(gramsInt),
      costETH,
      costUSD,
      status: 'pending', // Yeni field - UI'da gösterilebilir
    };
  } catch (error: any) {
    console.error('Buy failed:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SELL METAL
// ═══════════════════════════════════════════════════════════════════════════

interface SellResult {
  success: boolean;
  txHash?: string;
  grams?: number;
  payoutETH?: number;
  payoutUSD?: number;
  error?: string;
  status?: 'pending' | 'confirmed' | 'failed';
}

export async function sellMetalToken(
  token: string,
  grams: number,
  fromAddress?: string
): Promise<SellResult> {
  try {
    const wallet = getHotWallet();
    const contract = getTokenContract(token, wallet);
    const provider = getProvider();
    
    const gramsInt = BigInt(Math.ceil(grams));
    const decimals = await contract.decimals();
    const tokenAmount = gramsInt * (10n ** BigInt(Number(decimals) - 3));
    
    // Check balance
    const balance = await contract.balanceOf(wallet.address);
    if (balance < tokenAmount) {
      return {
        success: false,
        error: 'Insufficient ' + token.toUpperCase() + ' balance',
      };
    }
    
    // Calculate payout
    const payoutWei = await contract.calculateSellPayout(gramsInt);
    const payoutETH = parseFloat(ethers.formatEther(payoutWei));
    const ethPrice = await getETHUSDPrice();
    const payoutUSD = payoutETH * ethPrice;
    
    console.log('Selling ' + gramsInt + 'g ' + token.toUpperCase() + ' for ' + payoutETH.toFixed(6) + ' ETH ($' + payoutUSD.toFixed(2) + ')');
    
    // Execute sell
    const tx = await contract.sell(gramsInt);
    
    // 🚀 NON-BLOCKING: Hemen hash döndür
    const txHash = tx.hash;
    console.log('Sell tx submitted:', txHash);
    
    // Arka planda confirmation bekle
    tx.wait(1).then((receipt: any) => {
      console.log('Sell confirmed:', receipt.hash);
    }).catch((err: any) => {
      console.error('Sell confirmation failed:', err.message);
    });
    
    return {
      success: true,
      txHash,
      grams: Number(gramsInt),
      payoutETH,
      payoutUSD,
      status: 'pending',
    };
  } catch (error: any) {
    console.error('Sell failed:', error);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getTokenBalance(token: string, address: string): Promise<number> {
  const contract = getTokenContract(token);
  const balance = await contract.balanceOf(address);
  const decimals = await contract.decimals();
  return parseFloat(ethers.formatUnits(balance, decimals));
}

export async function checkReserveLimit(token: string, grams: number): Promise<{ allowed: boolean; maxMintable: number }> {
  // V8 contracts have reserve limit disabled for testing
  return { allowed: true, maxMintable: 1000000 };
}

export async function getHotWalletBalance(token: string): Promise<number> {
  const wallet = getHotWallet();
  return getTokenBalance(token, wallet.address);
}

export async function getHotWalletETH(): Promise<number> {
  const wallet = getHotWallet();
  const provider = getProvider();
  const balance = await provider.getBalance(wallet.address);
  return parseFloat(ethers.formatEther(balance));
}

// Export contract addresses for reference
export const TOKEN_CONTRACTS = CONTRACTS;
export const ORACLE_CONTRACT = ORACLE_ADDRESS;
