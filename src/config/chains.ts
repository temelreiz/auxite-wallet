// src/config/chains.ts

export const CHAINS = {
  sepolia: { chainId: 11155111, name: "Sepolia" },
  mainnet: { chainId: 1, name: "Ethereum Mainnet" },
};

// En sağlam yöntem: direkt chainId ile kontrol (Vercel env'de set et)
const configuredChainId = Number(process.env.NEXT_PUBLIC_APP_CHAIN_ID || "");

// Eğer env ile verilmişse onu kullan, yoksa APP_ENV fallback
export const APP_CHAIN =
  configuredChainId === CHAINS.mainnet.chainId
    ? CHAINS.mainnet
    : configuredChainId === CHAINS.sepolia.chainId
      ? CHAINS.sepolia
      : process.env.NEXT_PUBLIC_APP_ENV === "production"
        ? CHAINS.mainnet
        : CHAINS.sepolia;

export const isAllowedChain = (chainId?: number | null) => {
  if (chainId == null) return true;
  return Number(chainId) === APP_CHAIN.chainId;
};

