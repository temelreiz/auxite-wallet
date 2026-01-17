// src/hooks/useTradeV6.ts
// V6 kontratları ile gerçek blockchain trade işlemleri

"use client";

import { useState, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { 
  METAL_TOKENS as CONTRACTS,
  TOKEN_CONFIG,
  getTokenAddress,
  gramsToTokenAmount,
  tokenAmountToGrams,
} from "@/config/contracts-v8";
import {
  AUXITE_TOKEN_V6_ABI,
  TRADE_CONFIG,
  calculateMaxCost,
  calculateMinPayout,
  formatEth,
} from "@/config/contracts";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type TradeStep = 
  | "idle" 
  | "calculating" 
  | "confirming" 
  | "pending" 
  | "success" 
  | "error";

export interface TradeState {
  step: TradeStep;
  error: string | null;
  txHash: `0x${string}` | null;
  estimatedCost: bigint | null;
  estimatedPayout: bigint | null;
}

export interface UseTradeV6Props {
  metalSymbol: "AUXG" | "AUXS" | "AUXPT" | "AUXPD";
  slippagePercent?: number;
}

export interface UseTradeV6Return {
  // State
  state: TradeState;
  
  // Balances
  metalBalance: number;
  ethBalance: string;
  pendingRefund: bigint;
  
  // Price info
  askPricePerKg: bigint | undefined;
  bidPricePerKg: bigint | undefined;
  
  // Actions
  buy: (grams: number) => Promise<void>;
  sell: (grams: number) => Promise<void>;
  withdrawRefund: () => Promise<void>;
  reset: () => void;
  
  // Helpers
  calculateBuyCost: (grams: number) => Promise<bigint | null>;
  calculateSellPayout: (grams: number) => Promise<bigint | null>;
  
  // Status
  isLoading: boolean;
  isConfirming: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useTradeV6({ 
  metalSymbol, 
  slippagePercent = TRADE_CONFIG.DEFAULT_SLIPPAGE_PERCENT 
}: UseTradeV6Props): UseTradeV6Return {
  
  const { address, isConnected } = useAccount();
  const tokenAddress = getTokenAddress(metalSymbol);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────────
  
  const [state, setState] = useState<TradeState>({
    step: "idle",
    error: null,
    txHash: null,
    estimatedCost: null,
    estimatedPayout: null,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // READ CONTRACTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Metal token balance
  const { data: rawMetalBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddress,
    abi: AUXITE_TOKEN_V6_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ETH balance
  const { data: ethBalanceData } = useBalance({
    address: address,
    query: { enabled: !!address },
  });

  // Ask price (buy price)
  const { data: askPricePerKg } = useReadContract({
    address: tokenAddress,
    abi: AUXITE_TOKEN_V6_ABI,
    functionName: "askPerKgE6",
  });

  // Bid price (sell price)
  const { data: bidPricePerKg } = useReadContract({
    address: tokenAddress,
    abi: AUXITE_TOKEN_V6_ABI,
    functionName: "bidPerKgE6",
  });

  // Pending refunds
  const { data: pendingRefundData, refetch: refetchRefund } = useReadContract({
    address: tokenAddress,
    abi: AUXITE_TOKEN_V6_ABI,
    functionName: "pendingRefunds",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // WRITE CONTRACTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const { 
    writeContract, 
    data: txHash,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  // Wait for transaction
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // COMPUTED VALUES
  // ─────────────────────────────────────────────────────────────────────────────
  
  const metalBalance = rawMetalBalance 
    ? tokenAmountToGrams(rawMetalBalance as bigint) 
    : 0;
  
  const ethBalance = ethBalanceData 
    ? formatEth(ethBalanceData.value, 4) 
    : "0";
  
  const pendingRefund = (pendingRefundData as bigint) || 0n;

  // ─────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Calculate buy cost from contract
  const calculateBuyCost = useCallback(async (grams: number): Promise<bigint | null> => {
    if (grams <= 0) return null;
    
    try {
      // Bu fonksiyon contract'tan direkt okunmalı
      // Şimdilik wagmi readContract ile yapamıyoruz, estimate yapıyoruz
      // Gerçek implementasyonda useReadContract ile dynamic args kullanılır
      
      // Basit estimate: askPricePerKg * grams / 1000 (kg'dan gram'a)
      if (askPricePerKg) {
        const pricePerGramE6 = (askPricePerKg as bigint) / 1000n;
        const costE6 = pricePerGramE6 * BigInt(Math.floor(grams * 1000)) / 1000n;
        // E6'dan Wei'ye çevir (ETH price ile)
        // Bu basitleştirilmiş hesap, gerçekte contract.calculateBuyCost kullanılmalı
        return costE6 * 10n ** 12n; // Approximate
      }
      return null;
    } catch (error) {
      console.error("Calculate buy cost error:", error);
      return null;
    }
  }, [askPricePerKg]);

  // Calculate sell payout from contract
  const calculateSellPayout = useCallback(async (grams: number): Promise<bigint | null> => {
    if (grams <= 0) return null;
    
    try {
      if (bidPricePerKg) {
        const pricePerGramE6 = (bidPricePerKg as bigint) / 1000n;
        const payoutE6 = pricePerGramE6 * BigInt(Math.floor(grams * 1000)) / 1000n;
        return payoutE6 * 10n ** 12n; // Approximate
      }
      return null;
    } catch (error) {
      console.error("Calculate sell payout error:", error);
      return null;
    }
  }, [bidPricePerKg]);

  // ─────────────────────────────────────────────────────────────────────────────
  // BUY FUNCTION
  // ─────────────────────────────────────────────────────────────────────────────
  
  const buy = useCallback(async (grams: number) => {
    if (!address || !isConnected) {
      setState(s => ({ ...s, step: "error", error: "Wallet not connected" }));
      return;
    }

    if (grams < TRADE_CONFIG.MIN_TRADE_GRAMS) {
      setState(s => ({ ...s, step: "error", error: `Minimum ${TRADE_CONFIG.MIN_TRADE_GRAMS} gram` }));
      return;
    }

    try {
      setState(s => ({ ...s, step: "calculating", error: null }));

      // Calculate cost
      const estimatedCost = await calculateBuyCost(grams);
      if (!estimatedCost) {
        setState(s => ({ ...s, step: "error", error: "Could not calculate cost" }));
        return;
      }

      // Add slippage
      const maxCost = calculateMaxCost(estimatedCost, slippagePercent);

      // Check ETH balance
      if (ethBalanceData && ethBalanceData.value < maxCost) {
        setState(s => ({ 
          ...s, 
          step: "error", 
          error: `Insufficient ETH. Need ${formatEth(maxCost)} ETH` 
        }));
        return;
      }

      setState(s => ({ ...s, step: "confirming", estimatedCost }));

      // Convert grams to token amount (3 decimals)
      const gramsAmount = gramsToTokenAmount(grams);

      // Call buyWithSlippage
      writeContract({
        address: tokenAddress,
        abi: AUXITE_TOKEN_V6_ABI,
        functionName: "buyWithSlippage",
        args: [gramsAmount, maxCost],
        value: maxCost,
        gas: TRADE_CONFIG.GAS_LIMITS.BUY,
      });

    } catch (error: any) {
      console.error("Buy error:", error);
      setState(s => ({ 
        ...s, 
        step: "error", 
        error: error.message || "Buy failed" 
      }));
    }
  }, [address, isConnected, calculateBuyCost, slippagePercent, ethBalanceData, tokenAddress, writeContract]);

  // ─────────────────────────────────────────────────────────────────────────────
  // SELL FUNCTION
  // ─────────────────────────────────────────────────────────────────────────────
  
  const sell = useCallback(async (grams: number) => {
    if (!address || !isConnected) {
      setState(s => ({ ...s, step: "error", error: "Wallet not connected" }));
      return;
    }

    if (grams < TRADE_CONFIG.MIN_TRADE_GRAMS) {
      setState(s => ({ ...s, step: "error", error: `Minimum ${TRADE_CONFIG.MIN_TRADE_GRAMS} gram` }));
      return;
    }

    if (grams > metalBalance) {
      setState(s => ({ ...s, step: "error", error: "Insufficient balance" }));
      return;
    }

    try {
      setState(s => ({ ...s, step: "calculating", error: null }));

      // Calculate payout
      const estimatedPayout = await calculateSellPayout(grams);
      if (!estimatedPayout) {
        setState(s => ({ ...s, step: "error", error: "Could not calculate payout" }));
        return;
      }

      // Subtract slippage
      const minPayout = calculateMinPayout(estimatedPayout, slippagePercent);

      setState(s => ({ ...s, step: "confirming", estimatedPayout }));

      // Convert grams to token amount (3 decimals)
      const gramsAmount = gramsToTokenAmount(grams);

      // Call sellWithSlippage
      writeContract({
        address: tokenAddress,
        abi: AUXITE_TOKEN_V6_ABI,
        functionName: "sellWithSlippage",
        args: [gramsAmount, minPayout],
        gas: TRADE_CONFIG.GAS_LIMITS.SELL,
      });

    } catch (error: any) {
      console.error("Sell error:", error);
      setState(s => ({ 
        ...s, 
        step: "error", 
        error: error.message || "Sell failed" 
      }));
    }
  }, [address, isConnected, metalBalance, calculateSellPayout, slippagePercent, tokenAddress, writeContract]);

  // ─────────────────────────────────────────────────────────────────────────────
  // WITHDRAW REFUND
  // ─────────────────────────────────────────────────────────────────────────────
  
  const withdrawRefundFn = useCallback(async () => {
    if (!address || pendingRefund === 0n) {
      return;
    }

    try {
      setState(s => ({ ...s, step: "confirming" }));

      writeContract({
        address: tokenAddress,
        abi: AUXITE_TOKEN_V6_ABI,
        functionName: "withdrawRefund",
      });

    } catch (error: any) {
      console.error("Withdraw refund error:", error);
      setState(s => ({ 
        ...s, 
        step: "error", 
        error: error.message || "Withdraw failed" 
      }));
    }
  }, [address, pendingRefund, tokenAddress, writeContract]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────────────────────────────────────
  
  const reset = useCallback(() => {
    setState({
      step: "idle",
      error: null,
      txHash: null,
      estimatedCost: null,
      estimatedPayout: null,
    });
    resetWrite();
  }, [resetWrite]);

  // ─────────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Update state based on write status
  useEffect(() => {
    if (txHash && state.step === "confirming") {
      setState(s => ({ ...s, step: "pending", txHash }));
    }
  }, [txHash, state.step]);

  // Update state based on confirmation
  useEffect(() => {
    if (isConfirmed && state.step === "pending") {
      setState(s => ({ ...s, step: "success" }));
      // Refresh balances
      refetchBalance();
      refetchRefund();
    }
  }, [isConfirmed, state.step, refetchBalance, refetchRefund]);

  // Handle errors
  useEffect(() => {
    if (writeError) {
      setState(s => ({ 
        ...s, 
        step: "error", 
        error: writeError.message || "Transaction failed" 
      }));
    }
    if (confirmError) {
      setState(s => ({ 
        ...s, 
        step: "error", 
        error: confirmError.message || "Transaction failed" 
      }));
    }
  }, [writeError, confirmError]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────────────────────
  
  return {
    state,
    metalBalance,
    ethBalance,
    pendingRefund,
    askPricePerKg: askPricePerKg as bigint | undefined,
    bidPricePerKg: bidPricePerKg as bigint | undefined,
    buy,
    sell,
    withdrawRefund: withdrawRefundFn,
    reset,
    calculateBuyCost,
    calculateSellPayout,
    isLoading: isWritePending,
    isConfirming,
  };
}

export default useTradeV6;
