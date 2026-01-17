"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { METAL_TOKENS, USDT_ADDRESS, EXCHANGE_ADDRESS } from "@/config/contracts-v8";

const ERC20_ABI = [
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

const EXCHANGE_ABI = [
  {
    name: "buy",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "symbol", type: "string" },
      { name: "grams", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "sell",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "symbol", type: "string" },
      { name: "grams", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getBuyQuote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "symbol", type: "string" },
      { name: "grams", type: "uint256" },
    ],
    outputs: [{ name: "usdtCost", type: "uint256" }],
  },
  {
    name: "getSellQuote",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "symbol", type: "string" },
      { name: "grams", type: "uint256" },
    ],
    outputs: [{ name: "usdtPayout", type: "uint256" }],
  },
  {
    name: "buyPrices",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "string" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "sellPrices",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "string" }],
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
  const [pendingAction, setPendingAction] = useState<{ type: 'buy' | 'sell'; grams: number } | null>(null);

  const metalTokenAddress = METAL_TOKENS[metalSymbol as keyof typeof METAL_TOKENS];

  // Get user's metal token balance
  const { data: metalBalance } = useReadContract({
    address: metalTokenAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get user's USDT balance
  const { data: usdtBalance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  // Get USDT allowance for exchange
  const { data: usdtAllowance, refetch: refetchAllowance } = useReadContract({
    address: USDT_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, EXCHANGE_ADDRESS] : undefined,
  });

  // Get metal allowance for exchange (for selling)
  const { data: metalAllowance, refetch: refetchMetalAllowance } = useReadContract({
    address: metalTokenAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, EXCHANGE_ADDRESS] : undefined,
  });

  // Write contract hooks
  const { 
    writeContract: writeApprove, 
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { 
    writeContract: writeTrade, 
    data: tradeHash,
    isPending: isTradePending,
    error: tradeError,
    reset: resetTrade,
  } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isTradeConfirming, isSuccess: isTradeSuccess } = useWaitForTransactionReceipt({
    hash: tradeHash,
  });

  // After approve success, execute the trade
  useEffect(() => {
    if (isApproveSuccess && step === "approving" && pendingAction) {
      refetchAllowance();
      refetchMetalAllowance();
      
      // Small delay to ensure allowance is updated
      setTimeout(() => {
        executeTrade(pendingAction.type, pendingAction.grams);
      }, 1000);
    }
  }, [isApproveSuccess]);

  // Execute trade after approval
  const executeTrade = async (type: 'buy' | 'sell', grams: number) => {
    try {
      setStep("trading");
      const gramsWei = parseUnits(grams.toString(), 18);

      writeTrade({
        address: EXCHANGE_ADDRESS,
        abi: EXCHANGE_ABI,
        functionName: type,
        args: [metalSymbol, gramsWei],
      });
    } catch (error: any) {
      console.error("Trade error:", error);
      setErrorMessage(error.message || "Trade failed");
      setStep("error");
    }
  };

  // Buy metal tokens (user pays USDT)
  const buy = async (amountInGrams: number, pricePerGram: number) => {
    if (!address) {
      setErrorMessage("Wallet not connected");
      setStep("error");
      return;
    }

    try {
      setErrorMessage("");
      setPendingAction({ type: 'buy', grams: amountInGrams });

      const usdtAmount = parseUnits((amountInGrams * pricePerGram).toFixed(6), 6);
      const currentAllowance = usdtAllowance || BigInt(0);

      // Check if we need approval
      if (currentAllowance < usdtAmount) {
        setStep("approving");
        // Approve a larger amount to avoid frequent approvals
        const approveAmount = usdtAmount * BigInt(10);
        writeApprove({
          address: USDT_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [EXCHANGE_ADDRESS, approveAmount],
        });
      } else {
        // Already approved, execute trade directly
        executeTrade('buy', amountInGrams);
      }
    } catch (error: any) {
      console.error("Buy error:", error);
      setErrorMessage(error.message || "Transaction failed");
      setStep("error");
    }
  };

  // Sell metal tokens (receive USDT)
  const sell = async (amountInGrams: number) => {
    if (!address) {
      setErrorMessage("Wallet not connected");
      setStep("error");
      return;
    }

    try {
      setErrorMessage("");
      setPendingAction({ type: 'sell', grams: amountInGrams });

      const metalAmount = parseUnits(amountInGrams.toString(), 18);
      const currentAllowance = metalAllowance || BigInt(0);

      // Check if user has enough balance
      if (metalBalance && metalAmount > metalBalance) {
        setErrorMessage("Insufficient balance");
        setStep("error");
        return;
      }

      // Check if we need approval
      if (currentAllowance < metalAmount) {
        setStep("approving");
        const approveAmount = metalAmount * BigInt(10);
        writeApprove({
          address: metalTokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [EXCHANGE_ADDRESS, approveAmount],
        });
      } else {
        // Already approved, execute trade directly
        executeTrade('sell', amountInGrams);
      }
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
    setPendingAction(null);
    resetApprove();
    resetTrade();
  };

  // Update step based on transaction status
  useEffect(() => {
    if (isTradeSuccess && step === "trading") {
      setStep("success");
      setPendingAction(null);
    }
  }, [isTradeSuccess, step]);

  useEffect(() => {
    if (approveError && step === "approving") {
      setStep("error");
      setErrorMessage(approveError.message);
    }
  }, [approveError, step]);

  useEffect(() => {
    if (tradeError && step === "trading") {
      setStep("error");
      setErrorMessage(tradeError.message);
    }
  }, [tradeError, step]);

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
    usdtBalance: usdtBalance ? formatUnits(usdtBalance, 6) : "0",
  };
}
