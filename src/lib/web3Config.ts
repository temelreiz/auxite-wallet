"use client";

import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { metaMask, walletConnect, coinbaseWallet } from "wagmi/connectors";

// Deployed Contract Addresses
export const CONTRACTS = {
  AUXG: "0xE425A9923250E94Fe2F4cB99cbc0896Aea24933a" as `0x${string}`,
  AUXS: "0xaE583c98c833a0B4b1B23e58209E697d95F05D23" as `0x${string}`,
  AUXPT: "0xeCfD88bE4f93C9379644B303444943e636A35F66" as `0x${string}`,
  AUXPD: "0x6F4E027B42E14e06f3eaeA39d574122188eab1D4" as `0x${string}`,
  EXCHANGE: "0xB015A2bA40c429B0FE3ea97BDE6fdb6bf8D6E78b" as `0x${string}`,
};

// Wagmi configuration
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    }),
    coinbaseWallet({
      appName: "Auxite Wallet",
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});

// ERC20 Token ABI
export const ERC20_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Exchange ABI
export const EXCHANGE_ABI = [
  {
    inputs: [
      { name: "fromToken", type: "address" },
      { name: "toToken", type: "address" },
      { name: "fromAmount", type: "uint256" },
    ],
    name: "swap",
    outputs: [{ name: "toAmount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "fromToken", type: "address" },
      { name: "toToken", type: "address" },
      { name: "fromAmount", type: "uint256" },
    ],
    name: "getExchangeRate",
    outputs: [
      { name: "toAmount", type: "uint256" },
      { name: "fee", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
