"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useLeasing } from "@/hooks/useLeasing";

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    metal: string;
    name: string;
    icon: string;
    metalTokenAddress: string;
    periods: Array<{ months: number; days: number; apy: number }>;
    minAmount: number;
    maxAmount: number;
    tvl: number;
    contractAddress: string;
  } | null;
  lang: "tr" | "en";
}

export function AllocationModal({ isOpen, onClose, offer, lang }: AllocationModalProps) {
  const { address } = useAccount();
  const [selectedPeriod, setSelectedPeriod] = useState(6);
  const [amount, setAmount] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  // Get leasing contract hook
  const {
    balance,
    allowance,
    isApproving,
    isDepositing,
    isApproveSuccess,
    isDepositSuccess,
    approve,
    deposit,
    hasEnoughAllowance,
    refetchAllowance,
  } = useLeasing({
    offerAddress: (offer?.contractAddress as `0x${string}`) || "0x",
    metalTokenAddress: (offer?.metalTokenAddress as `0x${string}`) || "0x",
    metalSymbol: offer?.metal || "",
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && offer) {
      setAmount("");
      setSelectedPeriod(6);
      setIsApproved(false);
    }
  }, [isOpen, offer]);

  // Close modal on successful deposit
  useEffect(() => {
    if (isDepositSuccess) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [isDepositSuccess, onClose]);

  // Check allowance when amount changes
  useEffect(() => {
    if (amount && hasEnoughAllowance(amount)) {
      setIsApproved(true);
    }
  }, [amount, allowance, hasEnoughAllowance]);

  if (!isOpen || !offer) return null;

  const currentPeriod = offer.periods.find(p => p.months === selectedPeriod) || offer.periods[1];
  const needsApproval = amount && !isApproved && !hasEnoughAllowance(amount);

  const handleApprove = async () => {
    console.log("🔵 handleApprove called");
    console.log("Amount:", amount);
    
    if (!amount) {
      console.log("❌ No amount");
      return;
    }
    
    try {
      console.log("🟢 Calling approve with amount:", amount);
      await approve(amount);
      console.log("✅ Approve completed");
      
      // Mark as approved and refetch allowance
      setIsApproved(true);
      await refetchAllowance();
    } catch (error) {
      console.error("❌ Approval failed:", error);
    }
  };

  const handleAllocate = async () => {
    console.log("🔵 handleAllocate called");
    console.log("Amount:", amount);
    
    if (!amount) {
      console.log("❌ No amount");
      return;
    }
    
    try {
      console.log("🟢 Calling deposit with amount:", amount);
      await deposit(amount);
      console.log("✅ Deposit completed");
    } catch (error) {
      console.error("❌ Allocation failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img src={offer.icon} alt={offer.name} className="w-10 h-10" />
            <div>
              <h3 className="text-lg font-semibold text-slate-200">
                {lang === "tr" ? "Tahsis Et" : "Allocate"} - {offer.metal}
              </h3>
              <p className="text-xs text-slate-500">{offer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Period Selection */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              {lang === "tr" ? "Tahsis Süresi" : "Allocation Period"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {offer.periods.map((period) => (
                <button
                  key={period.months}
                  onClick={() => setSelectedPeriod(period.months)}
                  disabled={isApproving || isDepositing}
                  className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period.months
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div>{period.months} {lang === "tr" ? "Ay" : "Mo"}</div>
                  <div className="text-xs opacity-75">{period.apy}% APY</div>
                </button>
              ))}
            </div>
          </div>

          {/* Period Info */}
          <div className="rounded-lg bg-slate-800/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                {lang === "tr" ? "Seçili APY" : "Selected APY"}
              </span>
              <span className="text-emerald-400 font-semibold">{currentPeriod.apy}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                {lang === "tr" ? "Kilitleme Süresi" : "Lock Period"}
              </span>
              <span className="text-slate-300">{currentPeriod.days} {lang === "tr" ? "gün" : "days"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">
                {lang === "tr" ? "Min. Miktar" : "Min. Amount"}
              </span>
              <span className="text-slate-300">{offer.minAmount}g</span>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              {lang === "tr" ? "Miktar" : "Amount"} (gram)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setIsApproved(false); // Reset approval when amount changes
                }}
                placeholder={`Min. ${offer.minAmount}g`}
                disabled={isApproving || isDepositing}
                className="w-full px-4 py-3 pr-16 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={() => {
                  setAmount(balance);
                  setIsApproved(false);
                }}
                disabled={isApproving || isDepositing}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-emerald-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="text-slate-500">
                {lang === "tr" ? "Bakiye" : "Balance"}: {parseFloat(balance).toFixed(4)}g
              </span>
              {amount && parseFloat(amount) >= offer.minAmount && (
                <span className="text-emerald-400">
                  ≈ {(parseFloat(amount) * currentPeriod.apy / 100).toFixed(2)}g {lang === "tr" ? "kazanç/yıl" : "yield/year"}
                </span>
              )}
            </div>
          </div>

          {/* Success Message */}
          {isDepositSuccess && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
              <div className="flex items-start gap-2">
                <div className="text-emerald-400 text-sm">✓</div>
                <div className="text-xs text-emerald-300">
                  {lang === "tr"
                    ? "Tahsis işlemi başarılı! Pozisyonunuz oluşturuldu."
                    : "Allocation successful! Your position has been created."}
                </div>
              </div>
            </div>
          )}

          {/* Approval Success Message */}
          {isApproved && !isDepositSuccess && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-400 text-sm">✓</div>
                <div className="text-xs text-blue-300">
                  {lang === "tr"
                    ? "Onay tamamlandı! Şimdi tahsis edebilirsiniz."
                    : "Approval complete! You can now allocate."}
                </div>
              </div>
            </div>
          )}

          {/* Info Message */}
          {!isDepositSuccess && !isApproved && (
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
              <div className="flex items-start gap-2">
                <div className="text-blue-400 text-sm">ℹ️</div>
                <div className="text-xs text-blue-300">
                  {lang === "tr"
                    ? `${currentPeriod.days} gün boyunca tokenleriniz kilitlenecektir. Süre sonunda otomatik olarak kazancınızla birlikte iade edilecektir.`
                    : `Your tokens will be locked for ${currentPeriod.days} days. They will be automatically returned with your earnings after the period ends.`}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={!amount || parseFloat(amount) < offer.minAmount || isApproving || isDepositing}
                className="w-full px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {isApproving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "tr" ? "Onaylanıyor..." : "Approving..."}
                  </span>
                ) : (
                  lang === "tr" ? "Onayla" : "Approve"
                )}
              </button>
            ) : (
              <button
                onClick={handleAllocate}
                disabled={!amount || parseFloat(amount) < offer.minAmount || isApproving || isDepositing || isDepositSuccess}
                className="w-full px-4 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold transition-colors"
              >
                {isDepositing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {lang === "tr" ? "Tahsis Ediliyor..." : "Allocating..."}
                  </span>
                ) : isDepositSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <span>✓</span>
                    {lang === "tr" ? "Tamamlandı" : "Completed"}
                  </span>
                ) : (
                  lang === "tr" ? "Tahsis Et" : "Allocate"
                )}
              </button>
            )}

            {!isDepositSuccess && (
              <button
                onClick={onClose}
                disabled={isApproving || isDepositing}
                className="w-full px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {lang === "tr" ? "İptal" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}