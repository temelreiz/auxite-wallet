"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/components/WalletContext";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: "tr" | "en";
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
  USDT: { name: "Tether", nameTr: "Tether", icon: "₮", color: "#26A17B", network: "Ethereum / Tron", minWithdraw: 10, fee: 1 },
  BTC: { name: "Bitcoin", nameTr: "Bitcoin", icon: "₿", color: "#F7931A", network: "Bitcoin Network", minWithdraw: 0.0005, fee: 0.0001 },
  ETH: { name: "Ethereum", nameTr: "Ethereum", icon: "Ξ", color: "#627EEA", network: "Ethereum / Base", minWithdraw: 0.01, fee: 0.001 },
  XRP: { name: "Ripple", nameTr: "Ripple", icon: "✕", color: "#23292F", network: "XRP Ledger", minWithdraw: 1, fee: 0.1 },
  SOL: { name: "Solana", nameTr: "Solana", icon: "◎", color: "#9945FF", network: "Solana", minWithdraw: 0.1, fee: 0.01 },
};

export function WithdrawModal({ isOpen, onClose, lang = "tr" }: WithdrawModalProps) {
  const { balances, address, refreshBalances, isConnected } = useWallet();
  const { prices: cryptoPrices } = useCryptoPrices();

  const [selectedCrypto, setSelectedCrypto] = useState<WithdrawCrypto>("USDT");
  const [auxmAmount, setAuxmAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState<string>("");
  const [xrpMemo, setXrpMemo] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message?: string } | null>(null);
  const [step, setStep] = useState<"select" | "confirm">("select");

  // Gerçek bakiyeler
  const auxmBalance = balances?.auxm ?? 0;
  const bonusAuxm = balances?.bonusAuxm ?? 0;
  // Sadece normal AUXM çekilebilir
  const withdrawableAuxm = auxmBalance;

  // Crypto fiyatları
  const realCryptoPrices: Record<WithdrawCrypto, number> = {
    USDT: 1,
    BTC: cryptoPrices?.btc ?? 95000,
    ETH: cryptoPrices?.eth ?? 3500,
    XRP: cryptoPrices?.xrp ?? 2.2,
    SOL: cryptoPrices?.sol ?? 200,
  };

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
  const cryptoPrice = realCryptoPrices[selectedCrypto];
  
  const receiveAmount = auxmAmountNum / cryptoPrice;
  const feeInCrypto = crypto.fee;
  const netReceiveAmount = Math.max(0, receiveAmount - feeInCrypto);

  const canAfford = auxmAmountNum <= withdrawableAuxm && auxmAmountNum > 0;
  const meetsMinimum = receiveAmount >= crypto.minWithdraw;
  const hasValidAddress = withdrawAddress.length > 10;
  const hasXrpMemo = selectedCrypto !== "XRP" || xrpMemo.length > 0;

  const handleMaxClick = () => {
    setAuxmAmount(withdrawableAuxm.toFixed(2));
  };

  const handleContinue = () => {
    if (canAfford && meetsMinimum && hasValidAddress && hasXrpMemo) {
      setStep("confirm");
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          coin: selectedCrypto,
          auxmAmount: auxmAmountNum,
          withdrawAddress,
          memo: selectedCrypto === "XRP" ? xrpMemo : undefined,
        }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      setResult({ type: "success", message: `${data.withdrawal.cryptoAmount.toFixed(2)} ${selectedCrypto}` });
      await refreshBalances();
      
      setTimeout(() => onClose(), 3000);

    } catch (err) {
      console.error("Withdraw error:", err);
      setResult({ type: "error", message: err instanceof Error ? err.message : "İşlem başarısız" });
    } finally {
      setIsProcessing(false);
    }
  };

  const cryptoList: WithdrawCrypto[] = ["USDT", "BTC", "ETH", "XRP", "SOL"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {step === "confirm" && (
              <button onClick={() => setStep("select")} className="p-1 hover:bg-slate-800 rounded-lg">
                ←
              </button>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{lang === "tr" ? "Para Çek" : "Withdraw"}</h2>
              <p className="text-xs text-slate-400">
                {step === "select" 
                  ? (lang === "tr" ? "AUXM'i kripto olarak çekin" : "Withdraw AUXM as crypto")
                  : (lang === "tr" ? "İşlemi onaylayın" : "Confirm transaction")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 text-xl">✕</button>
        </div>

        {/* Result */}
        {result && (
          <div className="p-6 text-center">
            <div className={`text-6xl mb-4 ${result.type === "success" ? "" : ""}`}>
              {result.type === "success" ? "✅" : "❌"}
            </div>
            <h3 className={`text-xl font-bold mb-2 ${result.type === "success" ? "text-emerald-400" : "text-red-400"}`}>
              {result.type === "success" ? (lang === "tr" ? "Çekim Başlatıldı!" : "Withdrawal Started!") : (lang === "tr" ? "Hata!" : "Error!")}
            </h3>
            <p className="text-slate-300">{result.message}</p>
            {result.type === "success" && (
              <p className="text-sm text-slate-500 mt-2">
                {lang === "tr" ? "İşlem 10-30 dakika içinde tamamlanacak" : "Transaction will complete in 10-30 minutes"}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        {!result && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {step === "select" ? (
              <>
                {/* AUXM Balance */}
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-400">{lang === "tr" ? "Çekilebilir Bakiye" : "Withdrawable Balance"}</p>
                      <p className="text-2xl font-bold text-white">{withdrawableAuxm.toFixed(2)} <span className="text-purple-400">AUXM</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{lang === "tr" ? "Bonus (çekilemez)" : "Bonus (locked)"}</p>
                      <p className="text-sm text-purple-400">{bonusAuxm.toFixed(2)} AUXM</p>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {lang === "tr" ? "Çekilecek AUXM Miktarı" : "AUXM Amount to Withdraw"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={auxmAmount}
                      onChange={(e) => setAuxmAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-lg font-mono focus:outline-none focus:border-red-500"
                    />
                    <button
                      onClick={handleMaxClick}
                      className="px-4 py-3 rounded-xl bg-red-500/20 text-red-400 font-semibold hover:bg-red-500/30"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">≈ ${auxmAmountNum.toFixed(2)} USD</p>
                </div>

                {/* Crypto Selection */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {lang === "tr" ? "Kripto Seçin" : "Select Crypto"}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {cryptoList.map((cryptoKey) => {
                      const c = WITHDRAW_CRYPTOS[cryptoKey];
                      const isSelected = selectedCrypto === cryptoKey;
                      return (
                        <button
                          key={cryptoKey}
                          onClick={() => setSelectedCrypto(cryptoKey)}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                            isSelected ? "border-red-500 bg-red-500/20" : "border-slate-700 bg-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: c.color }}>
                            {c.icon}
                          </div>
                          <span className="text-xs text-slate-300">{cryptoKey}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Withdraw Address */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    {selectedCrypto} {lang === "tr" ? "Cüzdan Adresi" : "Wallet Address"}
                  </label>
                  <input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder={selectedCrypto === "BTC" ? "bc1q..." : selectedCrypto === "XRP" ? "r..." : "0x..."}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-red-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">{lang === "tr" ? "Ağ" : "Network"}: {crypto.network}</p>
                </div>

                {/* XRP Memo */}
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
                  </div>
                )}

                {/* You Will Receive */}
                {auxmAmountNum > 0 && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">{lang === "tr" ? "Alacağınız" : "You will receive"}</span>
                      <span className="text-xl font-bold text-white">{receiveAmount.toFixed(2)} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">{lang === "tr" ? "Ağ Ücreti" : "Network Fee"}</span>
                      <span className="text-slate-400">-{feeInCrypto} {selectedCrypto}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 mt-2 border-t border-red-500/30">
                      <span className="text-red-400 font-semibold">{lang === "tr" ? "Net Alacak" : "Net Receive"}</span>
                      <span className="text-red-400 font-bold">{netReceiveAmount.toFixed(2)} {selectedCrypto}</span>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {!canAfford && auxmAmountNum > 0 && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <p className="text-sm text-red-400">⚠️ {lang === "tr" ? "Yetersiz AUXM bakiyesi" : "Insufficient AUXM balance"}</p>
                  </div>
                )}

                {!meetsMinimum && auxmAmountNum > 0 && canAfford && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <p className="text-sm text-amber-400">⚠️ {lang === "tr" ? "Minimum çekim" : "Minimum"}: {crypto.minWithdraw} {selectedCrypto}</p>
                  </div>
                )}
              </>
            ) : (
              /* Confirm Step */
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
                    <span className="text-white font-mono text-sm">{withdrawAddress.slice(0, 8)}...{withdrawAddress.slice(-6)}</span>
                  </div>
                  {selectedCrypto === "XRP" && xrpMemo && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tag</span>
                      <span className="text-white font-mono">{xrpMemo}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-slate-400">{lang === "tr" ? "Ağ Ücreti" : "Network Fee"}</span>
                    <span className="text-slate-300">{feeInCrypto} {selectedCrypto}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-400 font-semibold">{lang === "tr" ? "Net Alacak" : "Net Receive"}</span>
                    <span className="text-red-400 font-bold text-lg">{netReceiveAmount.toFixed(2)} {selectedCrypto}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-300">
                    ⚠️ {lang === "tr" 
                      ? "Adresi kontrol edin. İşlem geri alınamaz."
                      : "Verify address. This cannot be reversed."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {!result && (
          <div className="p-4 border-t border-slate-800">
            {step === "select" ? (
              <button
                onClick={handleContinue}
                disabled={!canAfford || !meetsMinimum || !hasValidAddress || !hasXrpMemo || auxmAmountNum <= 0}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === "tr" ? "Devam Et" : "Continue"}
              </button>
            ) : (
              <button
                onClick={handleWithdraw}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> {lang === "tr" ? "İşleniyor..." : "Processing..."}</>
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
