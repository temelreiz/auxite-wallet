"use client";

import { useState, useEffect } from "react";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
  auxmBalance?: {
    auxm: number;
    bonusAuxm: number;
  };
  cryptoPrices?: {
    BTC: number;
    ETH: number;
    XRP: number;
    SOL: number;
    USDT: number;
  };
}

type WithdrawCrypto = "USDT" | "BTC" | "ETH" | "XRP" | "SOL";

const WITHDRAW_CRYPTOS: Record<WithdrawCrypto, { 
  name: string; 
  nameTr: string; 
  icon: string; 
  color: string; 
  network: string;
  minWithdraw: number;
  fee: number;
}> = {
  USDT: { 
    name: "Tether", 
    nameTr: "Tether", 
    icon: "₮", 
    color: "#26A17B", 
    network: "Ethereum / Tron",
    minWithdraw: 10,
    fee: 1
  },
  BTC: { 
    name: "Bitcoin", 
    nameTr: "Bitcoin", 
    icon: "₿", 
    color: "#F7931A", 
    network: "Bitcoin Network",
    minWithdraw: 0.0005,
    fee: 0.0001
  },
  ETH: { 
    name: "Ethereum", 
    nameTr: "Ethereum", 
    icon: "Ξ", 
    color: "#627EEA", 
    network: "Ethereum / Base",
    minWithdraw: 0.01,
    fee: 0.001
  },
  XRP: { 
    name: "Ripple", 
    nameTr: "Ripple", 
    icon: "✕", 
    color: "#23292F", 
    network: "XRP Ledger",
    minWithdraw: 10,
    fee: 0.1
  },
  SOL: { 
    name: "Solana", 
    nameTr: "Solana", 
    icon: "◎", 
    color: "#9945FF", 
    network: "Solana",
    minWithdraw: 0.1,
    fee: 0.01
  },
};

export function WithdrawModal({
  isOpen,
  onClose,
  lang = "tr",
  auxmBalance = { auxm: 1250.50, bonusAuxm: 25.00 },
  cryptoPrices = { BTC: 97500, ETH: 3650, XRP: 2.45, SOL: 235, USDT: 1 },
}: WithdrawModalProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<WithdrawCrypto>("USDT");
  const [auxmAmount, setAuxmAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [xrpMemo, setXrpMemo] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");

  // Sadece normal AUXM çekilebilir, bonus AUXM çekilemez
  const withdrawableAuxm = auxmBalance.auxm;

  useEffect(() => {
    if (isOpen) {
      setAuxmAmount("");
      setWithdrawAddress("");
      setXrpMemo("");
      setResult(null);
      setStep("select");
      setSelectedCrypto("USDT");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const crypto = WITHDRAW_CRYPTOS[selectedCrypto];
  const auxmAmountNum = parseFloat(auxmAmount) || 0;

  // Fiyat (1 AUXM = 1 USD)
  const cryptoPrice = cryptoPrices[selectedCrypto] || 1;
  
  // AUXM → Crypto dönüşümü
  const receiveAmount = auxmAmountNum / cryptoPrice;
  const feeInCrypto = crypto.fee;
  const netReceiveAmount = Math.max(0, receiveAmount - feeInCrypto);

  // Validasyonlar
  const canAfford = auxmAmountNum <= withdrawableAuxm && auxmAmountNum > 0;
  const meetsMinimum = receiveAmount >= crypto.minWithdraw;
  const hasValidAddress = withdrawAddress.length > 10;
  const hasXrpMemo = selectedCrypto !== "XRP" || xrpMemo.length > 0;

  const handleMaxClick = () => {
    setAuxmAmount(withdrawableAuxm.toString());
  };

  const handleContinue = () => {
    if (canAfford && meetsMinimum && hasValidAddress && hasXrpMemo) {
      setStep("confirm");
    }
  };

  const handleWithdraw = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "0x123", // TODO: gerçek cüzdan adresi
          coin: selectedCrypto,
          auxmAmount: auxmAmountNum,
          withdrawAddress,
          memo: selectedCrypto === "XRP" ? xrpMemo : undefined,
        }),
      });
      
      if (response.ok) {
        setResult("success");
        setTimeout(() => onClose(), 3000);
      } else {
        setResult("error");
      }
    } catch {
      setResult("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const cryptoList: WithdrawCrypto[] = ["USDT", "BTC", "ETH", "XRP", "SOL"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {step === "confirm" && (
              <button 
                onClick={() => setStep("select")}
                className="p-1 hover:bg-slate-800 rounded-lg"
              >
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">
                {lang === "tr" ? "Para Çek" : "Withdraw"}
              </h2>
              <p className="text-xs text-slate-400">
                {step === "select" 
                  ? (lang === "tr" ? "AUXM'i kripto olarak çekin" : "Withdraw AUXM as crypto")
                  : (lang === "tr" ? "İşlemi onaylayın" : "Confirm transaction")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {result === "success" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-400 mb-2">
              {lang === "tr" ? "Çekim Başlatıldı!" : "Withdrawal Initiated!"}
            </h3>
            <p className="text-slate-400">
              {netReceiveAmount.toFixed(6)} {selectedCrypto}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {lang === "tr" ? "Tahmini süre" : "Estimated time"}: {crypto.network}
            </p>
          </div>
        )}

        {/* Error State */}
        {result === "error" && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-2">
              {lang === "tr" ? "Çekim Başarısız" : "Withdrawal Failed"}
            </h3>
            <button 
              onClick={() => setResult(null)}
              className="mt-4 px-4 py-2 bg-slate-800 rounded-lg text-white hover:bg-slate-700"
            >
              {lang === "tr" ? "Tekrar Dene" : "Try Again"}
            </button>
          </div>
        )}

        {/* Content */}
        {result === null && (
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {step === "select" ? (
              <>
                {/* Info Banner */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-blue-300">
                    💡 {lang === "tr" 
                      ? "AUXM bakiyeniz seçtiğiniz kripto para birimine dönüştürülüp cüzdanınıza gönderilecek." 
                      : "Your AUXM balance will be converted to the selected cryptocurrency and sent to your wallet."}
                  </p>
                </div>

                {/* Withdrawable Balance Info */}
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">{lang === "tr" ? "Çekilebilir AUXM" : "Withdrawable AUXM"}</span>
                    <span className="text-white font-mono">{withdrawableAuxm.toFixed(2)} AUXM</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">≈ ${withdrawableAuxm.toFixed(2)} USD</span>
                  </div>
                  {auxmBalance.bonusAuxm > 0 && (
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-700">
                      <span className="text-purple-400">🎁 Bonus AUXM ({lang === "tr" ? "sadece metal alımında" : "metal purchases only"})</span>
                      <span className="text-purple-400 font-mono">{auxmBalance.bonusAuxm.toFixed(2)} AUXM</span>
                    </div>
                  )}
                </div>

                {/* AUXM Amount Input */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {lang === "tr" ? "Çekilecek AUXM Miktarı" : "AUXM Amount to Withdraw"}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={auxmAmount}
                      onChange={(e) => setAuxmAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono focus:outline-none focus:border-red-500"
                    />
                    <button
                      onClick={handleMaxClick}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-emerald-400 text-xs font-semibold transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">≈ ${auxmAmountNum.toFixed(2)} USD</p>
                </div>

                {/* Crypto Selection */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {lang === "tr" ? "Çekilecek Kripto" : "Withdraw As"}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {cryptoList.map((cryptoKey) => {
                      const c = WITHDRAW_CRYPTOS[cryptoKey];
                      const isSelected = selectedCrypto === cryptoKey;
                      return (
                        <button
                          key={cryptoKey}
                          onClick={() => setSelectedCrypto(cryptoKey)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                            isSelected
                              ? "border-red-500 bg-red-500/20"
                              : "border-slate-700 bg-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: c.color }}
                          >
                            {c.icon}
                          </div>
                          <span className="text-xs text-slate-300">{cryptoKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Withdraw Address */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">
                      {selectedCrypto} {lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}
                    </label>
                    <input
                      type="text"
                      value={withdrawAddress}
                      onChange={(e) => setWithdrawAddress(e.target.value)}
                      placeholder={
                        selectedCrypto === "BTC" ? "bc1q... veya 1..." : 
                        selectedCrypto === "XRP" ? "r..." :
                        selectedCrypto === "SOL" ? "..." :
                        "0x..."
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      {lang === "tr" ? "Ağ" : "Network"}: {crypto.network}
                    </div>
                  </div>

                  {/* XRP Memo/Destination Tag */}
                  {selectedCrypto === "XRP" && (
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">
                        Destination Tag <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={xrpMemo}
                        onChange={(e) => setXrpMemo(e.target.value)}
                        placeholder="123456789"
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                      />
                      <div className="text-xs text-amber-400 mt-1">
                        ⚠️ {lang === "tr" ? "Destination Tag zorunludur" : "Destination Tag is required"}
                      </div>
                    </div>
                  )}
                </div>

                {/* You Will Receive */}
                {auxmAmountNum > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">{lang === "tr" ? "Alacağınız" : "You will receive"}</span>
                      <span className="text-xl font-bold text-white">
                        {receiveAmount.toFixed(6)} {selectedCrypto}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{lang === "tr" ? "Ağ Ücreti" : "Network Fee"}</span>
                      <span className="text-slate-400">-{feeInCrypto} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 mt-2 border-t border-red-500/30">
                      <span className="text-red-400 font-semibold">{lang === "tr" ? "Net Alacak" : "Net Receive"}</span>
                      <span className="text-red-400 font-bold">
                        {netReceiveAmount.toFixed(6)} {selectedCrypto}
                      </span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {!canAfford && auxmAmountNum > 0 && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">
                      ⚠️ {lang === "tr" ? "Yetersiz AUXM bakiyesi" : "Insufficient AUXM balance"}
                    </p>
                  </div>
                )}

                {!meetsMinimum && auxmAmountNum > 0 && canAfford && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm text-amber-400">
                      ⚠️ {lang === "tr" ? "Minimum çekim" : "Minimum withdrawal"}: {crypto.minWithdraw} {selectedCrypto}
                    </p>
                  </div>
                )}

                {selectedCrypto === "XRP" && !hasXrpMemo && withdrawAddress.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">
                      ⚠️ {lang === "tr" ? "Destination Tag zorunludur" : "Destination Tag is required"}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Confirmation Step */
              <>
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "tr" ? "Çekilecek AUXM" : "AUXM to Withdraw"}</span>
                    <span className="text-white font-semibold">{auxmAmountNum.toFixed(2)} AUXM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "tr" ? "Dönüşüm" : "Convert to"}</span>
                    <span className="text-white font-semibold">{selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "tr" ? "Adres" : "Address"}</span>
                    <span className="text-white font-mono text-sm">
                      {withdrawAddress.slice(0, 8)}...{withdrawAddress.slice(-6)}
                    </span>
                  </div>
                  {selectedCrypto === "XRP" && xrpMemo && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Destination Tag</span>
                      <span className="text-white font-mono text-sm">{xrpMemo}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">{lang === "tr" ? "Ağ" : "Network"}</span>
                    <span className="text-white">{crypto.network}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">{lang === "tr" ? "Ağ Ücreti" : "Network Fee"}</span>
                    <span className="text-slate-300">{feeInCrypto} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400 font-semibold">{lang === "tr" ? "Net Alacak" : "Net Receive"}</span>
                    <span className="text-red-400 font-bold text-lg">
                      {netReceiveAmount.toFixed(6)} {selectedCrypto}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-300">
                    ⚠️ {lang === "tr" 
                      ? "Lütfen adresi ve tutarı kontrol edin. İşlem onaylandıktan sonra geri alınamaz."
                      : "Please verify the address and amount. This transaction cannot be reversed once confirmed."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {result === null && (
          <div className="p-4 border-t border-slate-800">
            {step === "select" ? (
              <button
                onClick={handleContinue}
                disabled={!canAfford || !meetsMinimum || !hasValidAddress || !hasXrpMemo || auxmAmountNum <= 0}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {lang === "tr" ? "Devam Et" : "Continue"}
              </button>
            ) : (
              <button
                onClick={handleWithdraw}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "tr" ? "İşleniyor..." : "Processing..."}
                  </>
                ) : (
                  lang === "tr" ? "Çekimi Onayla" : "Confirm Withdrawal"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WithdrawModal;
