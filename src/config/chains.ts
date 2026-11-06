// src/config/chains.ts

export const CHAINS = {
  sepolia: { chainId: 11155111, name: "Sepolia" },
  base: { chainId: 8453, name: "Base" },
};

// En sağlam yöntem: direkt chainId ile kontrol (Vercel env'de set et)
const configuredChainId = Number(process.env.NEXT_PUBLIC_APP_CHAIN_ID || "");

// 1 is the old live setting, from before the tokens moved to Base. Ethereum holds no
// Auxite tokens, so sending a wallet there would leave it on the wrong network.
const isLiveSetting = configuredChainId === CHAINS.base.chainId || configuredChainId === 1;

// Eğer env ile verilmişse onu kullan, yoksa APP_ENV fallback
export const APP_CHAIN = isLiveSetting
  ? CHAINS.base
  : configuredChainId === CHAINS.sepolia.chainId
    ? CHAINS.sepolia
    : process.env.NEXT_PUBLIC_APP_ENV === "production"
      ? CHAINS.base
      : CHAINS.sepolia;

export const isAllowedChain = (chainId?: number | null) => {
  if (chainId == null) return true;
  return Number(chainId) === APP_CHAIN.chainId;
};
