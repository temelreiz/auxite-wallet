"use client";

import { useAccount, useBalance } from "wagmi";
import { useCryptoPrices } from "./useCryptoPrices";

export function useCryptoBalances() {
  const { address } = useAccount();
  const { prices } = useCryptoPrices();

  // Get ETH balance (native Sepolia ETH)
  const { data: ethBalance } = useBalance({
    address: address,
  });

  // Mock balances for BTC, XRP, SOL
  const balances = {
    ETH: ethBalance ? parseFloat(ethBalance.formatted) : 0,
    BTC: 0, // Mock
    XRP: 0, // Mock
    SOL: 0, // Mock
  };

  const values = {
    ETH: balances.ETH * (prices.eth || 0),
    BTC: balances.BTC * (prices.btc || 0),
    XRP: balances.XRP * (prices.xrp || 0),
    SOL: balances.SOL * (prices.sol || 0),
  };

  return {
    balances,
    values,
    prices,
  };
}
