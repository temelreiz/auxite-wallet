import { useState, useCallback } from "react";
import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ERC20_ABI } from "@/contracts/ERC20";
import LeasingOfferABI from "@/contracts/AuxiteLeasingOffer.json";

interface UseLeasingProps {
  offerAddress: `0x${string}`;
  metalTokenAddress: `0x${string}`;
  metalSymbol: string;
}

export function useLeasing({ offerAddress, metalTokenAddress, metalSymbol }: UseLeasingProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [approveSuccess, setApproveSuccess] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Write contracts
  const { writeContractAsync } = useWriteContract();

  // Read user's token balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: metalTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Read user's allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: metalTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, offerAddress] : undefined,
  });

  // Read offer details
  const { data: isActive } = useReadContract({
    address: offerAddress,
    abi: LeasingOfferABI.abi,
    functionName: "isActive",
  });

  const { data: minAmount } = useReadContract({
    address: offerAddress,
    abi: LeasingOfferABI.abi,
    functionName: "minAmount",
  });

  const { data: maxAmount } = useReadContract({
    address: offerAddress,
    abi: LeasingOfferABI.abi,
    functionName: "maxAmount",
  });

  const { data: lockDuration } = useReadContract({
    address: offerAddress,
    abi: LeasingOfferABI.abi,
    functionName: "lockDuration",
  });

  // Approve token spending
  const approve = useCallback(async (amount: string) => {
    if (!address || !publicClient) throw new Error("Wallet not connected");
    
    setIsApproving(true);
    setApproveSuccess(false);
    
    try {
      const amountWei = parseUnits(amount, 18);
      
      console.log("🟡 Sending approve transaction...");
      const hash = await writeContractAsync({
        address: metalTokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [offerAddress, amountWei],
      });
      
      console.log("🟡 Approve tx hash:", hash);
      console.log("🟡 Waiting for transaction receipt...");
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ Approve confirmed! Block:", receipt.blockNumber);
      
      // Refetch allowance
      await refetchAllowance();
      
      setApproveSuccess(true);
      return true;
    } catch (error) {
      console.error("❌ Approve error:", error);
      throw error;
    } finally {
      setIsApproving(false);
    }
  }, [address, publicClient, metalTokenAddress, offerAddress, writeContractAsync, refetchAllowance]);

  // Deposit (allocate) tokens
  const deposit = useCallback(async (amount: string) => {
    if (!address || !publicClient) throw new Error("Wallet not connected");
    
    setIsDepositing(true);
    setDepositSuccess(false);
    
    try {
      const amountWei = parseUnits(amount, 18);
      
      console.log("🟡 Sending deposit transaction...");
      const hash = await writeContractAsync({
        address: offerAddress,
        abi: LeasingOfferABI.abi,
        functionName: "deposit",
        args: [amountWei],
      });
      
      console.log("🟡 Deposit tx hash:", hash);
      console.log("🟡 Waiting for transaction receipt...");
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ Deposit confirmed! Block:", receipt.blockNumber);
      
      // Refetch balance
      await refetchBalance();
      
      setDepositSuccess(true);
      return true;
    } catch (error) {
      console.error("❌ Deposit error:", error);
      throw error;
    } finally {
      setIsDepositing(false);
    }
  }, [address, publicClient, offerAddress, writeContractAsync, refetchBalance]);

  // Withdraw position
  const withdraw = useCallback(async (positionIndex: number) => {
    if (!address || !publicClient) throw new Error("Wallet not connected");
    
    setIsWithdrawing(true);
    setWithdrawSuccess(false);
    
    try {
      console.log("🟡 Sending withdraw transaction for position:", positionIndex);
      const hash = await writeContractAsync({
        address: offerAddress,
        abi: LeasingOfferABI.abi,
        functionName: "withdraw",
        args: [BigInt(positionIndex)],
      });
      
      console.log("🟡 Withdraw tx hash:", hash);
      console.log("🟡 Waiting for transaction receipt...");
      
      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("✅ Withdraw confirmed! Block:", receipt.blockNumber);
      
      // Refetch balance
      await refetchBalance();
      
      setWithdrawSuccess(true);
      return true;
    } catch (error) {
      console.error("❌ Withdraw error:", error);
      throw error;
    } finally {
      setIsWithdrawing(false);
    }
  }, [address, publicClient, offerAddress, writeContractAsync, refetchBalance]);

  // Check if user has enough allowance
  const hasEnoughAllowance = useCallback((amount: string): boolean => {
    if (!allowance || !amount) return false;
    try {
      const amountWei = parseUnits(amount, 18);
      return BigInt(allowance as bigint) >= amountWei;
    } catch {
      return false;
    }
  }, [allowance]);

  return {
    // State
    balance: balance ? formatUnits(balance as bigint, 18) : "0",
    allowance: allowance ? formatUnits(allowance as bigint, 18) : "0",
    isActive: isActive as boolean ?? false,
    minAmount: minAmount ? formatUnits(minAmount as bigint, 18) : "0",
    maxAmount: maxAmount ? formatUnits(maxAmount as bigint, 18) : "0",
    lockDuration: lockDuration ? Number(lockDuration) : 0,
    
    // Loading states
    isApproving,
    isDepositing,
    isWithdrawing,
    
    // Success states
    isApproveSuccess: approveSuccess,
    isDepositSuccess: depositSuccess,
    isWithdrawSuccess: withdrawSuccess,
    
    // Functions
    approve,
    deposit,
    withdraw,
    hasEnoughAllowance,
    refetchAllowance,
    refetchBalance,
  };
}