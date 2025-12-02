"use client";

import { calculateAuxmBonus, isLaunchCampaignActive } from "@/lib/auxm-bonus-service";

interface DepositConfirmationProps {
  coin: string;
  amount: number;
  amountUsd: number;
  lang?: "tr" | "en";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function DepositConfirmation({ 
  coin, 
  amount, 
  amountUsd, 
  lang = "en",
  onConfirm,
  onCancel 
}: DepositConfirmationProps) {
  const bonus = calculateAuxmBonus(amountUsd);
  const isLaunchActive = isLaunchCampaignActive();

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-sm w-full">
      {/* Header */}
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white text-center mb-2">
        {lang === "tr" ? "Yatırım Alındı!" : "Deposit Received!"}
      </h3>
      
      <p className="text-slate-400 text-sm text-center mb-6">
        {lang === "tr" 
          ? "Yatırımınız işleniyor ve AUXM'e dönüştürülüyor."
          : "Your deposit is being processed and converted to AUXM."}
      </p>

      {/* Deposit Details */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-3 mb-4">
        {/* Coin Amount */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">
            {lang === "tr" ? "Yatırılan" : "Deposited"}
          </span>
          <span className="text-white font-semibold">
            {amount} {coin}
          </span>
        </div>

        {/* USD Value */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">
            {lang === "tr" ? "USD Değeri" : "USD Value"}
          </span>
          <span className="text-white font-mono">
            ${amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700" />

        {/* Base AUXM */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-400 text-sm">AUXM</span>
          </div>
          <span className="text-white font-mono">
            {bonus.auxmAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Bonus */}
        {bonus.bonusAmount > 0 && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-slate-400 text-sm flex items-center gap-1">
                {isLaunchActive ? "🚀" : "🎁"}
                {lang === "tr" ? "Bonus AUXM" : "Bonus AUXM"}
                <span className="text-purple-400 text-xs">
                  (+{bonus.bonusPercent}%)
                </span>
              </span>
            </div>
            <span className="text-purple-400 font-mono font-semibold">
              +{bonus.bonusAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-700" />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-white font-semibold">
            {lang === "tr" ? "Toplam" : "Total"}
          </span>
          <span className="text-emerald-400 font-bold text-lg font-mono">
            {bonus.totalAuxm.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUXM
          </span>
        </div>
      </div>

      {/* Bonus Usage Note - ÖNEMLİ */}
      {bonus.bonusAmount > 0 && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm text-purple-300 font-medium mb-1">
                {lang === "tr" ? "Bonus Kullanım Koşulu" : "Bonus Usage Terms"}
              </p>
              <p className="text-xs text-purple-300/80">
                {lang === "tr" 
                  ? `${bonus.bonusAmount.toFixed(2)} Bonus AUXM sadece metal alımında (Altın, Gümüş, Platin, Paladyum) kullanılabilir. Çekim veya transfer için kullanılamaz.`
                  : `${bonus.bonusAmount.toFixed(2)} Bonus AUXM can only be used for metal purchases (Gold, Silver, Platinum, Palladium). Cannot be withdrawn or transferred.`}
              </p>
              {bonus.bonusExpiresAt && (
                <p className="text-xs text-purple-400 mt-1">
                  {lang === "tr" 
                    ? `⏰ Son kullanma: ${bonus.bonusExpiresAt.toLocaleDateString("tr-TR")}`
                    : `⏰ Expires: ${bonus.bonusExpiresAt.toLocaleDateString("en-US")}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Campaign Badge */}
      {bonus.bonusAmount > 0 && (
        <div className={`rounded-xl p-3 mb-4 text-center ${
          isLaunchActive 
            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
            : "bg-emerald-500/10 border border-emerald-500/30"
        }`}>
          <p className={`text-sm font-medium ${
            isLaunchActive ? "text-purple-300" : "text-emerald-400"
          }`}>
            {bonus.message[lang]}
          </p>
        </div>
      )}

      {/* No Bonus Message */}
      {bonus.bonusAmount === 0 && (
        <div className="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700">
          <p className="text-sm text-center text-slate-400">
            {bonus.message[lang]}
          </p>
        </div>
      )}

      {/* Balance Breakdown Preview */}
      <div className="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700">
        <p className="text-xs text-slate-400 mb-2">
          {lang === "tr" ? "Cüzdan Bakiyeniz:" : "Your Wallet Balance:"}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-300">
                {bonus.auxmAmount.toFixed(2)} AUXM
              </span>
            </div>
            {bonus.bonusAmount > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs text-purple-400">
                  +{bonus.bonusAmount.toFixed(2)} Bonus
                </span>
              </div>
            )}
          </div>
          <span className="text-xs text-slate-500">1 AUXM = 1 USD</span>
        </div>
      </div>

      {/* Metal Purchase CTA */}
      {bonus.bonusAmount > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <p className="text-sm text-amber-300">
              {lang === "tr" 
                ? "Bonus AUXM'inizi kullanarak hemen altın veya gümüş satın alabilirsiniz!"
                : "Use your Bonus AUXM to buy gold or silver right now!"}
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium transition-colors"
          >
            {lang === "tr" ? "Kapat" : "Close"}
          </button>
        )}
        {onConfirm && (
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-white font-semibold transition-colors ${
              bonus.bonusAmount > 0
                ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400"
                : "bg-emerald-500 hover:bg-emerald-400"
            }`}
          >
            {bonus.bonusAmount > 0
              ? (lang === "tr" ? "Metal Satın Al" : "Buy Metals")
              : (lang === "tr" ? "Cüzdana Git" : "Go to Wallet")}
          </button>
        )}
      </div>
    </div>
  );
}

export default DepositConfirmation;
