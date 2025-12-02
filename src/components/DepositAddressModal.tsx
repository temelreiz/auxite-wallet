"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface DepositAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: string;
  lang?: "tr" | "en";
}

// Deposit adresleri
const DEPOSIT_ADDRESSES: Record<string, { 
  address: string; 
  network: string; 
  memo?: string;
  color: string;
  icon: string;
}> = {
  BTC: { 
    address: "1L4h8XzsLzzek6LoxGKdDsFcSaD7oxyume", 
    network: "Bitcoin",
    color: "#F7931A",
    icon: "₿",
  },
  ETH: { 
    address: "0x2A6007a15A7B04FEAdd64f0d002A10A6867587F6", 
    network: "Ethereum / Base",
    color: "#627EEA",
    icon: "Ξ",
  },
  XRP: { 
    address: "r4pNH6DdDtVknt8NZAhhbcY8Wqr46QoGae", 
    network: "XRP Ledger",
    memo: "123456",
    color: "#23292F",
    icon: "X",
  },
  SOL: { 
    address: "6orrQ2dRuiFwH5w3wddQjQNbPT6w7vEN7eMW9wUNM1Qe", 
    network: "Solana",
    color: "#9945FF",
    icon: "◎",
  },
};

export function DepositAddressModal({ isOpen, onClose, coin, lang = "en" }: DepositAddressModalProps) {
  const [copied, setCopied] = useState(false);
  const [copiedMemo, setCopiedMemo] = useState(false);

  if (!isOpen) return null;

  const coinData = DEPOSIT_ADDRESSES[coin];
  if (!coinData) return null;

  const copyToClipboard = async (text: string, type: "address" | "memo") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedMemo(true);
        setTimeout(() => setCopiedMemo(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // QR kod için URI oluştur
  const getQRValue = () => {
    switch (coin) {
      case "BTC":
        return `bitcoin:${coinData.address}`;
      case "ETH":
        return `ethereum:${coinData.address}`;
      case "XRP":
        return coinData.memo 
          ? `https://xrpl.to/${coinData.address}?dt=${coinData.memo}`
          : coinData.address;
      case "SOL":
        return `solana:${coinData.address}`;
      default:
        return coinData.address;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: coinData.color }}
            >
              {coinData.icon}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {lang === "tr" ? `${coin} Yatır` : `Deposit ${coin}`}
              </h2>
              <p className="text-xs text-slate-400">{coinData.network}</p>
            </div>
          </div>
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
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl mb-4 flex items-center justify-center">
            <QRCodeSVG
              value={getQRValue()}
              size={180}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: `/coins/${coin.toLowerCase()}.png`,
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
              style={{ backgroundColor: coinData.color }}
            >
              {coinData.network}
            </span>
          </div>

          {/* Address */}
          <div className="bg-slate-800 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-xs font-medium">
                {lang === "tr" ? "Adres" : "Address"}
              </span>
              <button
                onClick={() => copyToClipboard(coinData.address, "address")}
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
              {coinData.address}
            </p>
          </div>

          {/* Memo/Destination Tag (XRP only) */}
          {coinData.memo && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-amber-500 text-xs font-medium">Destination Tag</span>
                </div>
                <button
                  onClick={() => copyToClipboard(coinData.memo!, "memo")}
                  className={`text-xs font-medium transition-colors ${
                    copiedMemo ? "text-amber-300" : "text-amber-500 hover:text-amber-400"
                  }`}
                >
                  {copiedMemo ? "✓" : (lang === "tr" ? "Kopyala" : "Copy")}
                </button>
              </div>
              <p className="text-white font-mono text-lg font-bold">{coinData.memo}</p>
              <p className="text-xs text-amber-400/80 mt-2">
                {lang === "tr" 
                  ? "⚠️ Tag olmadan gönderim yapmayın! Fonlarınızı kaybedebilirsiniz." 
                  : "⚠️ Do not send without tag! You may lose your funds."}
              </p>
            </div>
          )}

          {/* AUXM Info */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 mb-4">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-emerald-400 text-xs font-medium mb-1">
                  {lang === "tr" ? "Otomatik AUXM Dönüşümü" : "Auto AUXM Conversion"}
                </p>
                <p className="text-emerald-400/70 text-xs">
                  {lang === "tr" 
                    ? `${coin} yatırımınız otomatik olarak AUXM'e dönüştürülür (1 AUXM = 1 USD)`
                    : `Your ${coin} deposit will be automatically converted to AUXM (1 AUXM = 1 USD)`}
                </p>
              </div>
            </div>
          </div>

          {/* Minimum Deposit Info */}
          <div className="bg-slate-800/50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {lang === "tr" ? "Min. Yatırım" : "Min. Deposit"}
              </span>
              <span className="text-slate-300">
                {coin === "BTC" ? "0.0001 BTC" : 
                 coin === "ETH" ? "0.001 ETH" :
                 coin === "XRP" ? "10 XRP" :
                 coin === "SOL" ? "0.01 SOL" : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-slate-400">
                {lang === "tr" ? "Onay Süresi" : "Confirmation Time"}
              </span>
              <span className="text-slate-300">
                {coin === "BTC" ? "~30 min (3 conf)" : 
                 coin === "ETH" ? "~5 min (12 conf)" :
                 coin === "XRP" ? "~10 sec" :
                 coin === "SOL" ? "~30 sec" : "-"}
              </span>
            </div>
          </div>

          {/* Done Button */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors"
          >
            {lang === "tr" ? "Tamam" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DepositAddressModal;
