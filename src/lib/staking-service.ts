// src/lib/staking-service.ts
// On-chain staking service using V8 tokens and StakingV2 contract

import { ethers } from "ethers";

// Config
const RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/06f4a3d8bae44ffb889975d654d8a680";

// V8 Contract Addresses
const STAKING_V2_ADDRESS = process.env.NEXT_PUBLIC_STAKING_V2 || "0x96ff8358183BA045e3d6cDA4ca2AfF30423A9dC8";

const TOKEN_V8_ADDRESSES: Record<string, string> = {
  AUXG: process.env.NEXT_PUBLIC_AUXG_V8 || "0xD14D32B1e03B3027D1f8381EeeC567e147De9CCe",
  AUXS: process.env.NEXT_PUBLIC_AUXS_V8 || "0xc924EE950BF5A5Fbe3c26eECB27D99031B441caD",
  AUXPT: process.env.NEXT_PUBLIC_AUXPT_V8 || "0x37402EA435a91567223C132414C3A50C6bBc7200",
  AUXPD: process.env.NEXT_PUBLIC_AUXPD_V8 || "0x6026338B9Bfd94fed07EA61cbE60b15e300911DC",
};

// Metal IDs (keccak256 hash)
function getMetalId(metal: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(metal));
}

// ABIs
const TOKEN_V8_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function delegationApproved(address user) view returns (bool)",
  "function approveDelegation() external",
  "function delegatedTransfer(address from, address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const STAKING_V2_ABI = [
  "function stake(bytes32 metalId, uint256 amount, uint256 durationMonths, bool compounding, uint256 allocationId) external returns (uint256 stakeId, bytes32 stakeCode)",
  "function stakeFor(address user, bytes32 metalId, uint256 amount, uint256 durationMonths, bool compounding, uint256 allocationId) external returns (uint256 stakeId, bytes32 stakeCode)",
  "function getUserStakes(address user) view returns (tuple(uint256 id, bytes32 stakeCode, address staker, bytes32 metalId, uint256 amount, uint256 startTime, uint256 endTime, uint256 duration, uint256 apyBps, uint256 expectedReward, uint256 claimedReward, bool active, bool compounding, uint256 allocationId)[])",
  "function getUserActiveStakes(address user) view returns (tuple(uint256 id, bytes32 stakeCode, address staker, bytes32 metalId, uint256 amount, uint256 startTime, uint256 endTime, uint256 duration, uint256 apyBps, uint256 expectedReward, uint256 claimedReward, bool active, bool compounding, uint256 allocationId)[])",
  "function getClaimableRewards(uint256 stakeId) view returns (uint256)",
  "function getShortStakeCode(bytes32 stakeCode) pure returns (string)",
  "function previewReward(bytes32 metalId, uint256 amount, uint256 durationMonths) view returns (uint256 expectedReward, uint256 apyBps)",
];

function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL);
}

function getHotWallet() {
  const privateKey = process.env.HOT_WALLET_ETH_PRIVATE_KEY;
  if (!privateKey) throw new Error("HOT_WALLET_ETH_PRIVATE_KEY not configured");
  return new ethers.Wallet(privateKey, getProvider());
}

export interface StakeResult {
  success: boolean;
  stakeId?: number;
  stakeCode?: string;
  shortCode?: string;
  txHash?: string;
  error?: string;
}

/**
 * Check if user has approved delegation for a token
 */
export async function checkDelegationApproval(userAddress: string, metal: string): Promise<boolean> {
  try {
    const tokenAddress = TOKEN_V8_ADDRESSES[metal.toUpperCase()];
    if (!tokenAddress) return false;
    
    const provider = getProvider();
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_V8_ABI, provider);
    
    return await tokenContract.delegationApproved(userAddress);
  } catch (error) {
    console.error("Check delegation error:", error);
    return false;
  }
}

/**
 * Get user's token balance (V8)
 */
export async function getTokenBalance(userAddress: string, metal: string): Promise<number> {
  try {
    const tokenAddress = TOKEN_V8_ADDRESSES[metal.toUpperCase()];
    if (!tokenAddress) return 0;
    
    const provider = getProvider();
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_V8_ABI, provider);
    
    const balance = await tokenContract.balanceOf(userAddress);
    return Number(balance) / 1000; // 3 decimals
  } catch (error) {
    console.error("Get balance error:", error);
    return 0;
  }
}

/**
 * Stake tokens on-chain using stakeFor (delegated staking)
 * User must have approved delegation first via approveDelegation()
 */
export async function stakeOnChain(
  userAddress: string,
  metal: "AUXG" | "AUXS" | "AUXPT" | "AUXPD",
  amountGrams: number,
  durationMonths: 3 | 6 | 12,
  compounding: boolean = false,
  allocationId: number = 0
): Promise<StakeResult> {
  try {
    const wallet = getHotWallet();
    const provider = getProvider();
    
    // Get token contract
    const tokenAddress = TOKEN_V8_ADDRESSES[metal];
    if (!tokenAddress) {
      return { success: false, error: `Unknown metal: ${metal}` };
    }
    
    const tokenContract = new ethers.Contract(tokenAddress, TOKEN_V8_ABI, wallet);
    const stakingContract = new ethers.Contract(STAKING_V2_ADDRESS, STAKING_V2_ABI, wallet);
    
    // Convert grams to token units (3 decimals)
    const amount = BigInt(Math.floor(amountGrams * 1000));
    
    // Check user's token balance
    const userBalance = await tokenContract.balanceOf(userAddress);
    if (userBalance < amount) {
      return { 
        success: false, 
        error: `Insufficient balance. Have: ${Number(userBalance) / 1000}g, Need: ${amountGrams}g` 
      };
    }
    
    // Check if user has approved delegation
    const delegationApproved = await tokenContract.delegationApproved(userAddress);
    if (!delegationApproved) {
      return { 
        success: false, 
        error: "User has not approved delegation. Please call approveDelegation() first." 
      };
    }
    
    // Check hot wallet ETH for gas
    const ethBalance = await provider.getBalance(wallet.address);
    const minEth = ethers.parseEther("0.01");
    if (ethBalance < minEth) {
      return { 
        success: false, 
        error: `Insufficient hot wallet ETH for gas. Have: ${ethers.formatEther(ethBalance)} ETH` 
      };
    }
    
    console.log(`🔄 Transferring ${amountGrams}g ${metal} from user to staking contract...`);
    
    // Step 1: Use delegatedTransfer to move tokens from user to staking contract
    const transferTx = await tokenContract.delegatedTransfer(
      userAddress,
      STAKING_V2_ADDRESS,
      amount
    );
    await transferTx.wait();
    console.log(`✅ Tokens transferred to staking contract`);
    
    // Step 2: Call stakeFor to create the stake record
    const metalId = getMetalId(metal);
    console.log(`🔄 Creating stake for ${userAddress}...`);
    
    const stakeTx = await stakingContract.stakeFor(
      userAddress,
      metalId,
      amount,
      BigInt(durationMonths),
      compounding,
      BigInt(allocationId)
    );
    
    const receipt = await stakeTx.wait();
    console.log(`✅ Stake created, tx: ${receipt.hash}`);
    
    // Parse stakeId and stakeCode from logs
    let stakeId = 0;
    let stakeCode = "";
    let shortCode = "";
    
    // Find Staked event in logs
    for (const log of receipt.logs) {
      try {
        const parsed = stakingContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        });
        if (parsed && parsed.name === "Staked") {
          stakeId = Number(parsed.args[0]);
          stakeCode = parsed.args[1];
          break;
        }
      } catch (e) {
        // Not this event, continue
      }
    }
    
    // Get short code
    if (stakeCode) {
      try {
        shortCode = await stakingContract.getShortStakeCode(stakeCode);
      } catch (e) {
        shortCode = `STK-${stakeCode.slice(2, 10).toUpperCase()}`;
      }
    }
    
    return {
      success: true,
      stakeId,
      stakeCode,
      shortCode,
      txHash: receipt.hash,
    };
  } catch (error: any) {
    console.error("Staking error:", error);
    return {
      success: false,
      error: error.message || "Staking failed",
    };
  }
}

/**
 * Get user's on-chain stakes
 */
export async function getUserStakesOnChain(userAddress: string) {
  try {
    const provider = getProvider();
    const stakingContract = new ethers.Contract(STAKING_V2_ADDRESS, STAKING_V2_ABI, provider);
    
    const stakes = await stakingContract.getUserStakes(userAddress);
    
    const metalIdToSymbol: Record<string, string> = {
      [getMetalId("AUXG")]: "AUXG",
      [getMetalId("AUXS")]: "AUXS",
      [getMetalId("AUXPT")]: "AUXPT",
      [getMetalId("AUXPD")]: "AUXPD",
    };
    
    return stakes.map((s: any) => ({
      id: Number(s.id),
      stakeCode: s.stakeCode,
      staker: s.staker,
      metal: metalIdToSymbol[s.metalId] || "UNKNOWN",
      amount: Number(s.amount) / 1000,
      startTime: new Date(Number(s.startTime) * 1000),
      endTime: new Date(Number(s.endTime) * 1000),
      durationMonths: s.duration >= 365 * 24 * 60 * 60 ? 12 : s.duration >= 182 * 24 * 60 * 60 ? 6 : 3,
      apyPercent: Number(s.apyBps) / 100,
      expectedReward: Number(s.expectedReward) / 1000,
      claimedReward: Number(s.claimedReward) / 1000,
      active: s.active,
      compounding: s.compounding,
    }));
  } catch (error) {
    console.error("Error fetching stakes:", error);
    return [];
  }
}

/**
 * Preview stake reward
 */
export async function previewStakeReward(
  metal: string,
  amountGrams: number,
  durationMonths: 3 | 6 | 12
): Promise<{ expectedRewardGrams: number; apyPercent: number }> {
  try {
    const provider = getProvider();
    const stakingContract = new ethers.Contract(STAKING_V2_ADDRESS, STAKING_V2_ABI, provider);
    
    const metalId = getMetalId(metal);
    const amount = BigInt(Math.floor(amountGrams * 1000));
    
    const [expectedReward, apyBps] = await stakingContract.previewReward(
      metalId,
      amount,
      BigInt(durationMonths)
    );
    
    return {
      expectedRewardGrams: Number(expectedReward) / 1000,
      apyPercent: Number(apyBps) / 100,
    };
  } catch (error) {
    console.error("Preview reward error:", error);
    // Fallback calculation
    const apyMap: Record<string, Record<number, number>> = {
      AUXG: { 3: 1.53, 6: 2.03, 12: 2.53 },
      AUXS: { 3: 1.23, 6: 1.73, 12: 2.23 },
      AUXPT: { 3: 2.03, 6: 2.53, 12: 3.03 },
      AUXPD: { 3: 1.83, 6: 2.33, 12: 2.83 },
    };
    const apyPercent = apyMap[metal.toUpperCase()]?.[durationMonths] || 2.0;
    const days = durationMonths === 3 ? 91 : durationMonths === 6 ? 182 : 365;
    const expectedRewardGrams = (amountGrams * apyPercent * days) / (100 * 365);
    return { expectedRewardGrams, apyPercent };
  }
}
