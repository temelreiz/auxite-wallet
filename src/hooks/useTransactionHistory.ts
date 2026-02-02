"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

export interface Transaction {
  id: string;
  type: "deposit" | "withdraw" | "swap" | "transfer" | "bonus" | "buy" | "sell";
  hash?: string;
  timestamp: number;
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  toAmount?: string;
  token?: string;
  amount?: string;
  fee?: string;
  status: "pending" | "completed" | "failed";
  description?: string;
}

export function useTransactionHistory(limit: number = 20) {
  const { address: wagmiAddress } = useAccount();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Get address from wagmi OR localStorage (for custodial wallets)
  const [localAddress, setLocalAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem("auxite_wallet_address");
      setLocalAddress(savedAddress);
    }
  }, []);

  // Use wagmi address first, then fall back to localStorage
  const address = wagmiAddress || localAddress;

  const fetchTransactions = useCallback(async (walletAddress: string, currentOffset: number = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/user/transactions?address=${walletAddress}&limit=${limit}&offset=${currentOffset}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (currentOffset === 0) {
        setTransactions(data.transactions || []);
      } else {
        setTransactions(prev => [...prev, ...(data.transactions || [])]);
      }

      setHasMore(data.pagination?.hasMore || data.hasMore || false);
      setOffset(currentOffset + (data.transactions?.length || 0));
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setError(err instanceof Error ? err.message : "Failed to load transactions");
      if (currentOffset === 0) {
        setTransactions([]);
      }
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Initial fetch
  useEffect(() => {
    if (!address) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    fetchTransactions(address, 0);
  }, [address, fetchTransactions]);

  // Load more function
  const loadMore = useCallback(() => {
    if (address && hasMore && !loading) {
      fetchTransactions(address, offset);
    }
  }, [address, hasMore, loading, offset, fetchTransactions]);

  // Refresh function
  const refresh = useCallback(() => {
    if (address) {
      setOffset(0);
      fetchTransactions(address, 0);
    }
  }, [address, fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
