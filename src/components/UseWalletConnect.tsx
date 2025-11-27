"use client";

import { useState } from "react";
import { ethers } from "ethers";

interface WalletConnectModalProps {
  open: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
}

export default function WalletConnectModal({
  open,
  onClose,
  lang = "en",
}: WalletConnectModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>("");

  if (!open) return null;

  const connectMetaMask = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setConnecting(true);
        setError("");

        // Request account access
        const accounts = await (window as any).ethereum.request({
          method: "eth_requestAccounts",
        });

        // Check network (Sepolia)
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const network = await provider.getNetwork();

        if (network.chainId !== 11155111n) {
          // Not on Sepolia
          try {
            await (window as any).ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0xaa36a7" }], // Sepolia chainId in hex
            });
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              // Chain not added, add it
              await (window as any).ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0xaa36a7",
                    chainName: "Sepolia Testnet",
                    nativeCurrency: {
                      name: "Sepolia ETH",
                      symbol: "ETH",
                      decimals: 18,
                    },
                    rpcUrls: ["https://rpc.sepolia.org"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
            } else {
              throw switchError;
            }
          }
        }

        setConnecting(false);
        onClose();
        
        // Reload page to update wallet connection
        window.location.reload();
      } catch (error: any) {
        console.error("MetaMask connection error:", error);
        setError(error.message || "Failed to connect");
        setConnecting(false);
      }
    } else {
      setError(
        lang === "tr"
          ? "MetaMask yüklü değil"
          : "MetaMask not installed"
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">
              {lang === "tr" ? "Cüzdan Bağla" : "Connect Wallet"}
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* MetaMask Button */}
            <button
              onClick={connectMetaMask}
              disabled={connecting}
              className="w-full p-4 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                {/* MetaMask Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl">
                  🦊
                </div>

                {/* Text */}
                <div className="flex-1 text-left">
                  <div className="text-base font-semibold text-slate-100">
                    MetaMask
                  </div>
                  <div className="text-xs text-slate-400">
                    {connecting
                      ? lang === "tr"
                        ? "Bağlanıyor..."
                        : "Connecting..."
                      : lang === "tr"
                      ? "En popüler Ethereum cüzdanı"
                      : "Most popular Ethereum wallet"}
                  </div>
                </div>

                {/* Arrow */}
                {!connecting && (
                  <div className="text-slate-400">→</div>
                )}
                {connecting && (
                  <div className="animate-spin">⏳</div>
                )}
              </div>
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                ⚠️ {error}
                {error.includes("not installed") && (
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 underline hover:text-red-300"
                  >
                    {lang === "tr" ? "MetaMask İndir" : "Download MetaMask"} →
                  </a>
                )}
              </div>
            )}

            {/* Info */}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="text-sm text-blue-300 mb-2">
                ℹ️ {lang === "tr" ? "Bilgi" : "Information"}
              </div>
              <ul className="text-xs text-blue-200 space-y-1">
                <li>
                  • {lang === "tr"
                    ? "Sepolia testnet'inde çalışıyoruz"
                    : "We operate on Sepolia testnet"}
                </li>
                <li>
                  • {lang === "tr"
                    ? "Test ETH için sepolia-faucet.pk910.de"
                    : "Get test ETH from sepolia-faucet.pk910.de"}
                </li>
                <li>
                  • {lang === "tr"
                    ? "Cüzdanınız güvendedir, biz sadece adresinizi okuruz"
                    : "Your wallet is secure, we only read your address"}
                </li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700 bg-slate-800/30">
            <p className="text-xs text-slate-400 text-center">
              {lang === "tr"
                ? "Bağlanarak, kullanım şartlarımızı kabul ediyorsunuz"
                : "By connecting, you agree to our terms of service"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}