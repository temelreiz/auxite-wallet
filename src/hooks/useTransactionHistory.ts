"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACTS, EXCHANGE_ABI } from "@/lib/web3Config";
import { formatUnits } from "viem";

export interface SwapTransaction {
  hash: string;
  timestamp: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  spread: string;
  fee: string;
  user: string;
}

export function useTransactionHistory() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [transactions, setTransactions] = useState<SwapTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address || !publicClient) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      try {
        setLoading(true);

        // Get TokensSwapped events from the last 1000 blocks (RPC limit)
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - 1000n; // Reduced from 10000 to 1000

        const logs = await publicClient.getLogs({
          address: CONTRACTS.EXCHANGE,
          event: {
            type: "event",
            name: "TokensSwapped",
            inputs: [
              { indexed: true, name: "user", type: "address" },
              { indexed: true, name: "fromToken", type: "address" },
              { indexed: true, name: "toToken", type: "address" },
              { indexed: false, name: "fromAmount", type: "uint256" },
              { indexed: false, name: "toAmount", type: "uint256" },
              { indexed: false, name: "spread", type: "uint256" },
              { indexed: false, name: "fee", type: "uint256" },
            ],
          },
          fromBlock,
          toBlock: "latest",
        });

        // Parse logs
        const parsedTransactions = await Promise.all(
          logs
            .filter((log: any) => log.args.user.toLowerCase() === address.toLowerCase())
            .map(async (log: any) => {
              const block = await publicClient.getBlock({
                blockNumber: log.blockNumber,
              });

              return {
                hash: log.transactionHash,
                timestamp: Number(block.timestamp),
                fromToken: getTokenSymbol(log.args.fromToken),
                toToken: getTokenSymbol(log.args.toToken),
                fromAmount: formatUnits(log.args.fromAmount, 18),
                toAmount: formatUnits(log.args.toAmount, 18),
                spread: formatUnits(log.args.spread, 18),
                fee: formatUnits(log.args.fee, 18),
                user: log.args.user,
              };
            })
        );

        // Sort by timestamp (newest first)
        parsedTransactions.sort((a, b) => b.timestamp - a.timestamp);

        setTransactions(parsedTransactions);
      } catch (error) {
        console.error("Failed to fetch transaction history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [address, publicClient]);

  return {
    transactions,
    loading,
  };
}

// Helper to get token symbol from address
function getTokenSymbol(address: string): string {
  const addressLower = address.toLowerCase();
  if (addressLower === CONTRACTS.AUXG.toLowerCase()) return "AUXG";
  if (addressLower === CONTRACTS.AUXS.toLowerCase()) return "AUXS";
  if (addressLower === CONTRACTS.AUXPT.toLowerCase()) return "AUXPT";
  if (addressLower === CONTRACTS.AUXPD.toLowerCase()) return "AUXPD";
  return "UNKNOWN";
}