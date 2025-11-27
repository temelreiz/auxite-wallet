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

  // Mock balances for BTC, USDT, TRY
  const balances = {
    ETH: ethBalance ? parseFloat(ethBalance.formatted) : 0,
    BTC: 0, // Mock
    USDT: 0, // Mock
    TRY: 0, // Mock
  };

  const values = {
    ETH: balances.ETH * prices.eth,
    BTC: balances.BTC * prices.btc,
    USDT: balances.USDT * prices.usdt,
    TRY: balances.TRY * (1 / prices.try),
  };

  return {
    balances,
    values,
    prices,
  };
}
