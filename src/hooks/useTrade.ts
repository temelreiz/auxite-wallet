"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";

// Metal token addresses
const METAL_TOKENS: Record<string, `0x${string}`> = {
  AUXG: (process.env.NEXT_PUBLIC_AUXG_ADDRESS || "0x3F8067C9E3706D16E1aF0C6Eba8688d6154b9a7a") as `0x${string}`,
  AUXS: (process.env.NEXT_PUBLIC_AUXS_ADDRESS || "0x0b43Da9aaf53b8AfA430683bCbD8cB89622C53a3") as `0x${string}`,
  AUXPT: (process.env.NEXT_PUBLIC_AUXPT_ADDRESS || "0xcd14F991C9de712C7665e9d138A31d098207F649") as `0x${string}`,
  AUXPD: (process.env.NEXT_PUBLIC_AUXPD_ADDRESS || "0x7619BAcf538F9FA07cf428dC57897aEfF975594b") as `0x${string}`,
};

// USDT address on Sepolia (mock for testing)
const USDT_ADDRESS = "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06" as `0x${string}`;

// Treasury/Exchange address (where tokens are bought from/sold to)
const TREASURY_ADDRESS = "0xD24B2bca1E0b58a2EAE5b1184871219f9a8EE944" as `0x${string}`;

const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "transferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface UseTradeProps {
  metalSymbol: string;
}

export function useTrade({ metalSymbol }: UseTradeProps) {
  const { address } = useAccount();
  const [step, setStep] = useState<"idle" | "approving" | "trading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const metalTokenAddress = METAL_TOKENS[metalSymbol];

  // Get user's metal token balance
  const { data: metalBalance } = useReadContract({
    address: metalTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Write contract hooks
  const { 
    writeContract: writeApprove, 
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const { 
    writeContract: writeTrade, 
    data: tradeHash,
    isPending: isTradePending,
    error: tradeError,
  } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isTradeConfirming, isSuccess: isTradeSuccess } = useWaitForTransactionReceipt({
    hash: tradeHash,
  });

  // Buy metal tokens (user pays USDT, receives metal tokens)
  const buy = async (amountInGrams: number, pricePerGram: number) => {
    if (!address) {
      setErrorMessage("Wallet not connected");
      setStep("error");
      return;
    }

    try {
      setStep("approving");
      setErrorMessage("");

      const metalAmount = parseUnits(amountInGrams.toString(), 18);
      const usdtAmount = parseUnits((amountInGrams * pricePerGram).toFixed(6), 6); // USDT has 6 decimals

      // Step 1: Approve USDT spending
      writeApprove({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [TREASURY_ADDRESS, usdtAmount],
      });

    } catch (error: any) {
      console.error("Buy error:", error);
      setErrorMessage(error.message || "Transaction failed");
      setStep("error");
    }
  };

  // Sell metal tokens (user pays metal tokens, receives USDT)
  const sell = async (amountInGrams: number) => {
    if (!address) {
      setErrorMessage("Wallet not connected");
      setStep("error");
      return;
    }

    try {
      setStep("trading");
      setErrorMessage("");

      const metalAmount = parseUnits(amountInGrams.toString(), 18);

      // Check if user has enough balance
      if (metalBalance && metalAmount > metalBalance) {
        setErrorMessage("Insufficient balance");
        setStep("error");
        return;
      }

      // Transfer metal tokens to treasury
      writeTrade({
        address: metalTokenAddress,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [TREASURY_ADDRESS, metalAmount],
      });

    } catch (error: any) {
      console.error("Sell error:", error);
      setErrorMessage(error.message || "Transaction failed");
      setStep("error");
    }
  };

  // Reset state
  const reset = () => {
    setStep("idle");
    setErrorMessage("");
  };

  // Update step based on transaction status
  if (isApproveSuccess && step === "approving") {
    setStep("trading");
  }
  
  if (isTradeSuccess && step === "trading") {
    setStep("success");
  }

  if (approveError && step === "approving") {
    setStep("error");
    setErrorMessage(approveError.message);
  }

  if (tradeError && step === "trading") {
    setStep("error");
    setErrorMessage(tradeError.message);
  }

  return {
    buy,
    sell,
    reset,
    step,
    errorMessage,
    isApproving: isApprovePending || isApproveConfirming,
    isTrading: isTradePending || isTradeConfirming,
    isSuccess: isTradeSuccess,
    approveHash,
    tradeHash,
    metalBalance: metalBalance ? formatUnits(metalBalance, 18) : "0",
  };
}