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

// APY Visual Comparison
function APYVisual({ periods, selectedPeriod, onSelect, lang }: {
  periods: Array<{ months: number; days: number; apy: number }>;
  selectedPeriod: number;
  onSelect: (months: number) => void;
  lang: "tr" | "en";
}) {
  const maxAPY = Math.max(...periods.map(p => p.apy));
  
  return (
    <div className="grid grid-cols-3 gap-3">
      {periods.map((period) => {
        const isSelected = selectedPeriod === period.months;
        const barHeight = (period.apy / maxAPY) * 100;
        
        return (
          <button
            key={period.months}
            onClick={() => onSelect(period.months)}
            className={`relative p-4 rounded-xl transition-all duration-300 ${
              isSelected 
                ? "bg-emerald-500/20 border-2 border-emerald-500" 
                : "bg-slate-800/50 border-2 border-slate-700 hover:border-slate-600"
            }`}
          >
            {/* APY Bar */}
            <div className="h-16 flex items-end justify-center mb-3">
              <div 
                className={`w-8 rounded-t-lg transition-all duration-500 ${
                  isSelected 
                    ? "bg-gradient-to-t from-emerald-600 to-emerald-400" 
                    : "bg-gradient-to-t from-slate-700 to-slate-600"
                }`}
                style={{ height: `${barHeight}%` }}
              />
            </div>
            
            {/* Period Label */}
            <div className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-300"}`}>
              {period.months} {lang === "tr" ? "Ay" : "Mo"}
            </div>
            
            {/* APY Value */}
            <div className={`text-lg font-bold ${isSelected ? "text-emerald-400" : "text-slate-400"}`}>
              {period.apy}%
            </div>
            
            {/* Days */}
            <div className="text-xs text-slate-500">
              {period.days} {lang === "tr" ? "gün" : "days"}
            </div>
            
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Earnings Calculator
function EarningsCalculator({ amount, apy, days, metalSymbol, lang }: {
  amount: number;
  apy: number;
  days: number;
  metalSymbol: string;
  lang: "tr" | "en";
}) {
  const yearlyEarnings = amount * (apy / 100);
  const periodEarnings = yearlyEarnings * (days / 365);
  const totalReturn = amount + periodEarnings;
  
  if (amount <= 0) return null;
  
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-slate-900/50 border border-emerald-500/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-emerald-300">
          {lang === "tr" ? "Kazanç Hesaplayıcı" : "Earnings Calculator"}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">{lang === "tr" ? "Tahsis Miktarı" : "Allocation Amount"}</span>
          <span className="text-sm font-medium text-slate-200">{amount.toFixed(2)}g</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">{lang === "tr" ? "Dönem Kazancı" : "Period Earnings"}</span>
          <span className="text-sm font-bold text-emerald-400">+{periodEarnings.toFixed(4)}g</span>
        </div>
        <div className="h-px bg-slate-700 my-2"></div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500">{lang === "tr" ? "Toplam Dönüş" : "Total Return"}</span>
          <span className="text-sm font-bold text-white">{totalReturn.toFixed(4)}g</span>
        </div>
      </div>
      
      {/* Visual indicator */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
            style={{ width: `${(periodEarnings / amount) * 100 * 10}%` }}
          />
        </div>
        <span className="text-xs text-emerald-400">+{((periodEarnings / amount) * 100).toFixed(2)}%</span>
      </div>
    </div>
  );
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
  const amountNum = parseFloat(amount) || 0;
  const balanceNum = parseFloat(balance) || 0;

  const handleApprove = async () => {
    if (!amount) return;
    
    try {
      await approve(amount);
      setIsApproved(true);
      await refetchAllowance();
    } catch (error) {
      console.error("Approval failed:", error);
    }
  };

  const handleAllocate = async () => {
    if (!amount) return;
    
    try {
      await deposit(amount);
    } catch (error) {
      console.error("Allocation failed:", error);
    }
  };

  const metalGradients: Record<string, string> = {
    AUXG: "from-amber-500/20 via-slate-900 to-slate-900",
    AUXS: "from-slate-400/20 via-slate-900 to-slate-900",
    AUXPT: "from-cyan-400/20 via-slate-900 to-slate-900",
    AUXPD: "from-rose-400/20 via-slate-900 to-slate-900",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`bg-gradient-to-br ${metalGradients[offer.metal]} rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src={offer.icon} alt={offer.name} className="w-14 h-14" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {lang === "tr" ? "Tahsis Et" : "Allocate"} - {offer.metal}
              </h3>
              <p className="text-sm text-slate-400">{offer.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Period Selection with APY Visual */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-3 block flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lang === "tr" ? "Tahsis Süresi" : "Allocation Period"}
            </label>
            <APYVisual 
              periods={offer.periods}
              selectedPeriod={selectedPeriod}
              onSelect={setSelectedPeriod}
              lang={lang}
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              {lang === "tr" ? "Miktar" : "Amount"} (gram)
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setIsApproved(false);
                }}
                placeholder={`Min. ${offer.minAmount}g`}
                disabled={isApproving || isDepositing}
                className="w-full px-4 py-4 pr-20 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50 text-lg font-medium"
              />
              <button
                onClick={() => {
                  setAmount(balance);
                  setIsApproved(false);
                }}
                disabled={isApproving || isDepositing}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {lang === "tr" ? "Bakiye" : "Balance"}: {balanceNum.toFixed(4)}g
              </span>
              {amountNum > 0 && amountNum < offer.minAmount && (
                <span className="text-xs text-red-400">
                  Min. {offer.minAmount}g
                </span>
              )}
            </div>
          </div>

          {/* Earnings Calculator */}
          <EarningsCalculator
            amount={amountNum}
            apy={currentPeriod.apy}
            days={currentPeriod.days}
            metalSymbol={offer.metal}
            lang={lang}
          />

          {/* Success Message */}
          {isDepositSuccess && (
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-500/30 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-emerald-300">
                    {lang === "tr" ? "Tahsis Başarılı!" : "Allocation Successful!"}
                  </div>
                  <div className="text-xs text-emerald-400/70">
                    {lang === "tr" ? "Pozisyonunuz oluşturuldu." : "Your position has been created."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approval Success Message */}
          {isApproved && !isDepositSuccess && (
            <div className="rounded-xl bg-blue-500/20 border border-blue-500/30 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-300">
                    {lang === "tr" ? "Onay Tamamlandı!" : "Approval Complete!"}
                  </div>
                  <div className="text-xs text-blue-400/70">
                    {lang === "tr" ? "Şimdi tahsis edebilirsiniz." : "You can now allocate."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Notice */}
          {!isDepositSuccess && !isApproved && (
            <div className="rounded-xl bg-slate-800/50 border border-slate-700 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-slate-400">
                  {lang === "tr"
                    ? `${currentPeriod.days} gün boyunca tokenleriniz kilitlenecektir. Süre sonunda anaparanız ve kazancınız otomatik olarak iade edilecektir.`
                    : `Your tokens will be locked for ${currentPeriod.days} days. Principal and earnings will be automatically returned after the period ends.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 space-y-3">
          {needsApproval ? (
            <button
              onClick={handleApprove}
              disabled={!amount || amountNum < offer.minAmount || isApproving || isDepositing}
              className="w-full px-4 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isApproving ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {lang === "tr" ? "Onaylanıyor..." : "Approving..."}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {lang === "tr" ? "Token Onayla" : "Approve Token"}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleAllocate}
              disabled={!amount || amountNum < offer.minAmount || isApproving || isDepositing || isDepositSuccess}
              className="w-full px-4 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isDepositing ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {lang === "tr" ? "Tahsis Ediliyor..." : "Allocating..."}
                </>
              ) : isDepositSuccess ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {lang === "tr" ? "Tamamlandı" : "Completed"}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {lang === "tr" ? "Tahsis Et" : "Allocate"}
                </>
              )}
            </button>
          )}

          {!isDepositSuccess && (
            <button
              onClick={onClose}
              disabled={isApproving || isDepositing}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors disabled:opacity-50"
            >
              {lang === "tr" ? "İptal" : "Cancel"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default AllocationModal;
