// ============================================================================
// Hardhat config — AUXR token + Auxite oracle contracts
// ----------------------------------------------------------------------------
// Targets:
//   - hardhat       (in-memory local network for tests)
//   - baseSepolia   (Base testnet, chainId 84532)
//   - base          (Base mainnet, chainId 8453)
//
// Required env vars (see .env.example):
//   PRIVATE_KEY        Deployer EOA private key (64 hex chars, no 0x prefix)
//   BASE_RPC_URL       Base mainnet RPC (Alchemy / Quicknode / Infura)
//   BASE_SEPOLIA_RPC   Base Sepolia RPC
//   BASESCAN_API_KEY   For source verification on Basescan
//
// Test commands:
//   npx hardhat compile
//   npx hardhat test
//   npx hardhat test --network hardhat
//   npx hardhat run scripts/deploy-auxr.ts --network baseSepolia
// ============================================================================

import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0".repeat(64);
const BASE_RPC_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const BASE_SEPOLIA_RPC =
  process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Base mainnet supports Cancun (mcopy/tstore opcodes) — required by
      // OpenZeppelin 5.6+ which uses `mcopy` in Bytes.sol.
      evmVersion: "cancun",
      viaIR: false,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test/contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC,
      chainId: 84532,
      accounts: [PRIVATE_KEY],
    },
    base: {
      url: BASE_RPC_URL,
      chainId: 8453,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    // Etherscan V2 — single API key works across all supported chains
    // (Base mainnet, Base Sepolia, etc.) routed via chainid. The previous
    // per-network customChains config is no longer needed.
    apiKey: BASESCAN_API_KEY,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;
