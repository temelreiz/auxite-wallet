"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
  walletAddress?: string;
}

export function ReceiveModal({ isOpen, onClose, lang = "en", walletAddress }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<"ETH" | "BASE">("ETH");

  if (!isOpen) return null;

  // Demo address if not provided
  const address = walletAddress || "0xe6df1234567890abcdef1234567890abcdef3ba3";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const shareAddress = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Auxite Wallet Address",
          text: address,
        });
      } catch (err) {
        console.error("Failed to share:", err);
      }
    } else {
      copyToClipboard();
    }
  };

  // QR kod için URI
  const getQRValue = () => {
    return `ethereum:${address}`;
  };

  const networks = [
    { id: "ETH" as const, name: "Ethereum", color: "#627EEA" },
    { id: "BASE" as const, name: "Base", color: "#0052FF" },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white">
            {lang === "tr" ? "Token Al" : "Receive Tokens"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Info Text */}
          <p className="text-sm text-slate-400 mb-4 text-center">
            {lang === "tr" 
              ? "Bu adresi paylaşarak AUXG, AUXS, AUXPT, AUXPD veya ETH alabilirsiniz." 
              : "Share this address to receive AUXG, AUXS, AUXPT, AUXPD or ETH."}
          </p>

          {/* Network Selection */}
          <div className="flex gap-2 mb-4">
            {networks.map((network) => (
              <button
                key={network.id}
                onClick={() => setSelectedNetwork(network.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedNetwork === network.id
                    ? "bg-slate-700 text-white border border-slate-600"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: network.color }}
                  />
                  {network.name}
                </div>
              </button>
            ))}
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
            <QRCodeSVG
              value={getQRValue()}
              size={180}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "/gold-favicon-32x32.png",
                x: undefined,
                y: undefined,
                height: 30,
                width: 30,
                excavate: true,
              }}
            />
          </div>

          {/* Network Badge */}
          <div className="flex justify-center mb-4">
            <span 
              className="px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: networks.find(n => n.id === selectedNetwork)?.color }}
            >
              {selectedNetwork === "ETH" ? "Ethereum Mainnet" : "Base Network"}
            </span>
          </div>

          {/* Address */}
          <div className="bg-slate-800 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">
                {lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}
              </span>
              <button
                onClick={copyToClipboard}
                className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                  copied ? "text-emerald-400" : "text-emerald-500 hover:text-emerald-400"
                }`}
              >
                {copied ? (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {lang === "tr" ? "Kopyalandı!" : "Copied!"}
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {lang === "tr" ? "Kopyala" : "Copy"}
                  </>
                )}
              </button>
            </div>
            <p className="text-white font-mono text-xs break-all select-all leading-relaxed">
              {address}
            </p>
          </div>

          {/* Supported Tokens */}
          <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
            <p className="text-xs text-slate-400 mb-2">
              {lang === "tr" ? "Desteklenen Tokenlar" : "Supported Tokens"}
            </p>
            <div className="flex flex-wrap gap-2">
              {["AUXG", "AUXS", "AUXPT", "AUXPD", "ETH"].map((token) => (
                <span 
                  key={token}
                  className="px-2 py-1 rounded-md bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  {token}
                </span>
              ))}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-400/80">
                {lang === "tr" 
                  ? "Sadece desteklenen tokenları bu adrese gönderin. Diğer tokenları göndermek kayba neden olabilir." 
                  : "Only send supported tokens to this address. Sending other tokens may result in loss."}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={copyToClipboard}
              className={`py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                copied 
                  ? "bg-emerald-500 text-white" 
                  : "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white"
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {lang === "tr" ? "Kopyalandı" : "Copied"}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {lang === "tr" ? "Kopyala" : "Copy"}
                </>
              )}
            </button>
            <button 
              onClick={shareAddress}
              className="py-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {lang === "tr" ? "Paylaş" : "Share"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiveModal;
