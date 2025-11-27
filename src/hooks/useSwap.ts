"use client";

import { useState, useCallback } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, type Address, maxUint256 } from "viem";
import { CONTRACTS, EXCHANGE_ABI, ERC20_ABI } from "@/lib/web3Config";

type Asset = "AUXG" | "AUXS" | "AUXPT" | "AUXPD";

export function useSwap() {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "approving" | "swapping" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");
  
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const getTokenAddress = (asset: Asset): Address => {
    return CONTRACTS[asset];
  };

  const swapTokens = useCallback(async (
    fromAsset: Asset,
    toAsset: Asset,
    amount: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> => {
    if (!address) {
      return { success: false, error: "Wallet not connected" };
    }

    if (!publicClient) {
      return { success: false, error: "Public client not available" };
    }

    console.log("🔄 Starting swap:", { fromAsset, toAsset, amount, address });
    setIsProcessing(true);
    setCurrentStep("swapping");
    setErrorMessage("");
    setTxHash("");

    try {
      const fromToken = getTokenAddress(fromAsset);
      const toToken = getTokenAddress(toAsset);
      const amountWei = parseUnits(amount, 18);

      // Check existing allowance
      let currentAllowance = BigInt(0);
      try {
        currentAllowance = await publicClient.readContract({
          address: fromToken,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, CONTRACTS.EXCHANGE],
        }) as bigint;
        console.log("📊 Current allowance:", currentAllowance.toString());
      } catch (e) {
        console.log("⚠️ Could not check allowance, will try approve");
      }

      // Only approve if needed
      if (currentAllowance < amountWei) {
        setCurrentStep("approving");
        console.log("✍️ Need approval, requesting...");
        
        const approveTx = await writeContractAsync({
          address: fromToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACTS.EXCHANGE, maxUint256],
        });
        console.log("✅ Approval TX sent:", approveTx);

        await publicClient.waitForTransactionReceipt({
          hash: approveTx,
          confirmations: 1,
        });
        console.log("✅ Approval confirmed");
        
        setCurrentStep("swapping");
      } else {
        console.log("✅ Sufficient allowance, skipping approve");
      }

      // Execute swap
      console.log("💱 Executing swap...");
      const swapTx = await writeContractAsync({
        address: CONTRACTS.EXCHANGE,
        abi: EXCHANGE_ABI,
        functionName: "swap",
        args: [fromToken, toToken, amountWei],
      });
      console.log("✅ Swap TX sent:", swapTx);
      setTxHash(swapTx);

      await publicClient.waitForTransactionReceipt({
        hash: swapTx,
        confirmations: 1,
      });
      console.log("✅ Swap confirmed");

      setCurrentStep("success");
      setIsProcessing(false);
      
      return { success: true, txHash: swapTx };
    } catch (error: any) {
      console.error("❌ Swap failed:", error);
      setCurrentStep("error");
      setIsProcessing(false);

      let errorMsg = "Swap failed";
      if (error.message?.includes("user rejected") || error.message?.includes("User rejected")) {
        errorMsg = "İşlem reddedildi";
      } else if (error.message?.includes("insufficient funds")) {
        errorMsg = "Gas için yetersiz ETH";
      } else if (error.message?.includes("execution reverted")) {
        errorMsg = "İşlem başarısız - bakiyeyi kontrol edin";
      } else if (error.shortMessage) {
        errorMsg = error.shortMessage;
      }

      setErrorMessage(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, [address, publicClient, writeContractAsync]);

  const reset = useCallback(() => {
    setCurrentStep("idle");
    setErrorMessage("");
    setIsProcessing(false);
    setTxHash("");
  }, []);

  return {
    swapTokens,
    isProcessing,
    currentStep,
    errorMessage,
    txHash,
    reset,
  };
}