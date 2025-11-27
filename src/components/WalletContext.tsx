"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type WalletType = "metamask" | "walletconnect" | "coinbase" | "ledger" | "trezor" | null;

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  walletType: WalletType;
  connectWallet: (type: WalletType) => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);

  // Check if already connected on mount
  useEffect(() => {
    const savedWalletType = localStorage.getItem("walletType") as WalletType;
    if (savedWalletType) {
      checkConnection(savedWalletType);
    }
  }, []);

  // Setup event listeners for MetaMask
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum && walletType === "metamask") {
      const ethereum = (window as any).ethereum;

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAddress(accounts[0]);
          setIsConnected(true);
        }
      };

      const handleChainChanged = (newChainId: string) => {
        setChainId(newChainId);
        window.location.reload();
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      return () => {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [walletType]);

  const checkConnection = async (type: WalletType) => {
    if (typeof window === "undefined") return;

    try {
      if (type === "metamask" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        const accounts = await ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setIsConnected(true);
          setWalletType(type);
          const currentChainId = await ethereum.request({ method: "eth_chainId" });
          setChainId(currentChainId);
        }
      }
      // Add WalletConnect check here
      // Add Coinbase check here
    } catch (error) {
      console.error("Check connection error:", error);
    }
  };

  const switchToSepolia = async (provider: any) => {
    const sepoliaChainId = "0xaa36a7";
    
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: sepoliaChainId }],
      });
      setChainId(sepoliaChainId);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: sepoliaChainId,
              chainName: "Sepolia Test Network",
              nativeCurrency: {
                name: "Sepolia ETH",
                symbol: "SepoliaETH",
                decimals: 18,
              },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        setChainId(sepoliaChainId);
      } else {
        throw switchError;
      }
    }
  };

  const connectMetaMask = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("MetaMask is not installed");
    }

    const ethereum = (window as any).ethereum;

    const accounts = await ethereum.request({
      method: "eth_requestAccounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found");
    }

    setAddress(accounts[0]);

    const currentChainId = await ethereum.request({ method: "eth_chainId" });
    setChainId(currentChainId);

    await switchToSepolia(ethereum);

    setIsConnected(true);
    setWalletType("metamask");
    localStorage.setItem("walletType", "metamask");
  };

  const connectWalletConnect = async () => {
    try {
      // WalletConnect v2 implementation
      const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
      
      const provider = await EthereumProvider.init({
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
        chains: [11155111], // Sepolia
        showQrModal: true,
        metadata: {
          name: "Auxite Wallet",
          description: "Physical metal-backed tokens",
          url: "https://auxite.io",
          icons: ["https://auxite.io/icon.png"],
        },
      });

      await provider.connect();

      const accounts = provider.accounts;
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setChainId("0xaa36a7"); // Sepolia
        setIsConnected(true);
        setWalletType("walletconnect");
        localStorage.setItem("walletType", "walletconnect");
      }

      // Listen for events
      provider.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      provider.on("disconnect", () => {
        disconnectWallet();
      });
    } catch (error) {
      console.error("WalletConnect error:", error);
      throw new Error("WalletConnect connection failed");
    }
  };

  const connectCoinbase = async () => {
    try {
      const CoinbaseWalletSDK = (await import("@coinbase/wallet-sdk")).default;
      
      const coinbaseWallet = new CoinbaseWalletSDK({
        appName: "Auxite Wallet",
        appLogoUrl: "https://auxite.io/icon.png",
        darkMode: true,
      });

      const ethereum = coinbaseWallet.makeWeb3Provider(
        "https://rpc.sepolia.org",
        11155111
      );

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setChainId("0xaa36a7");
        setIsConnected(true);
        setWalletType("coinbase");
        localStorage.setItem("walletType", "coinbase");
      }
    } catch (error) {
      console.error("Coinbase Wallet error:", error);
      throw new Error("Coinbase Wallet connection failed");
    }
  };

  const connectLedger = async () => {
    try {
      // Ledger connection via Web3Modal or direct
      throw new Error("Ledger: Please connect via MetaMask with your Ledger device");
    } catch (error) {
      throw error;
    }
  };

  const connectTrezor = async () => {
    try {
      // Trezor connection via Web3Modal or direct
      throw new Error("Trezor: Please connect via MetaMask with your Trezor device");
    } catch (error) {
      throw error;
    }
  };

  const connectWallet = async (type: WalletType) => {
    try {
      switch (type) {
        case "metamask":
          await connectMetaMask();
          break;
        case "walletconnect":
          await connectWalletConnect();
          break;
        case "coinbase":
          await connectCoinbase();
          break;
        case "ledger":
          await connectLedger();
          break;
        case "trezor":
          await connectTrezor();
          break;
        default:
          throw new Error("Unknown wallet type");
      }
    } catch (error) {
      console.error("Connect wallet error:", error);
      throw error;
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(null);
    setChainId(null);
    setWalletType(null);
    localStorage.removeItem("walletType");
  };

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        chainId,
        walletType,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}