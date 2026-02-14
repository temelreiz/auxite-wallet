"use client";

import { calculateAuxmBonus, isLaunchCampaignActive } from "@/lib/auxm-bonus-service";
import { useLanguage } from "@/components/LanguageContext";

interface DepositConfirmationProps {
  coin: string;
  amount: number;
  amountUsd: number;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
  onConfirm?: () => void;
  onCancel?: () => void;
}

const translations: Record<string, Record<string, string>> = {
  tr: {
    depositReceived: "Yatırım Alındı!",
    depositProcessing: "Yatırımınız işleniyor ve AUXM'e dönüştürülüyor.",
    deposited: "Yatırılan",
    usdValue: "USD Değeri",
    total: "Toplam",
    bonusUsageTitle: "Bonus Kullanım Koşulu",
    bonusUsageDesc: "Bonus AUXM sadece metal alımında (Altın, Gümüş, Platin, Paladyum) kullanılabilir. Çekim veya transfer için kullanılamaz.",
    expiresLabel: "Son kullanma:",
    walletBalance: "Cüzdan Bakiyeniz:",
    buyMetals: "Metal Satın Al",
    goToWallet: "Cüzdana Git",
    close: "Kapat",
    useBonusCta: "Bonus AUXM'inizi kullanarak hemen altın veya gümüş satın alabilirsiniz!",
  },
  en: {
    depositReceived: "Deposit Received!",
    depositProcessing: "Your deposit is being processed and converted to AUXM.",
    deposited: "Deposited",
    usdValue: "USD Value",
    total: "Total",
    bonusUsageTitle: "Bonus Usage Terms",
    bonusUsageDesc: "Bonus AUXM can only be used for metal purchases (Gold, Silver, Platinum, Palladium). Cannot be withdrawn or transferred.",
    expiresLabel: "Expires:",
    walletBalance: "Your Wallet Balance:",
    buyMetals: "Buy Metals",
    goToWallet: "Go to Wallet",
    close: "Close",
    useBonusCta: "Use your Bonus AUXM to buy gold or silver right now!",
  },
  de: {
    depositReceived: "Einzahlung erhalten!",
    depositProcessing: "Ihre Einzahlung wird verarbeitet und in AUXM umgewandelt.",
    deposited: "Eingezahlt",
    usdValue: "USD-Wert",
    total: "Gesamt",
    bonusUsageTitle: "Bonus-Nutzungsbedingungen",
    bonusUsageDesc: "Bonus-AUXM kann nur zum Metallkauf (Gold, Silber, Platin, Palladium) verwendet werden. Kann nicht abgehoben oder transferiert werden.",
    expiresLabel: "Ablauf:",
    walletBalance: "Ihr Wallet-Guthaben:",
    buyMetals: "Metalle kaufen",
    goToWallet: "Zum Wallet",
    close: "Schließen",
    useBonusCta: "Nutzen Sie Ihre Bonus-AUXM, um jetzt Gold oder Silber zu kaufen!",
  },
  fr: {
    depositReceived: "Dépôt reçu !",
    depositProcessing: "Votre dépôt est en cours de traitement et converti en AUXM.",
    deposited: "Déposé",
    usdValue: "Valeur USD",
    total: "Total",
    bonusUsageTitle: "Conditions d'utilisation du bonus",
    bonusUsageDesc: "Le bonus AUXM ne peut être utilisé que pour l'achat de métaux (Or, Argent, Platine, Palladium). Ne peut pas être retiré ou transféré.",
    expiresLabel: "Expire :",
    walletBalance: "Solde de votre portefeuille :",
    buyMetals: "Acheter des métaux",
    goToWallet: "Aller au portefeuille",
    close: "Fermer",
    useBonusCta: "Utilisez vos AUXM bonus pour acheter de l'or ou de l'argent maintenant !",
  },
  ar: {
    depositReceived: "تم استلام الإيداع!",
    depositProcessing: "جاري معالجة إيداعك وتحويله إلى AUXM.",
    deposited: "المبلغ المودع",
    usdValue: "القيمة بالدولار",
    total: "المجموع",
    bonusUsageTitle: "شروط استخدام المكافأة",
    bonusUsageDesc: "يمكن استخدام مكافأة AUXM فقط لشراء المعادن (الذهب، الفضة، البلاتين، البالاديوم). لا يمكن سحبها أو تحويلها.",
    expiresLabel: "تنتهي:",
    walletBalance: "رصيد محفظتك:",
    buyMetals: "شراء المعادن",
    goToWallet: "الذهاب إلى المحفظة",
    close: "إغلاق",
    useBonusCta: "استخدم مكافأة AUXM لشراء الذهب أو الفضة الآن!",
  },
  ru: {
    depositReceived: "Депозит получен!",
    depositProcessing: "Ваш депозит обрабатывается и конвертируется в AUXM.",
    deposited: "Внесено",
    usdValue: "Сумма в USD",
    total: "Итого",
    bonusUsageTitle: "Условия использования бонуса",
    bonusUsageDesc: "Бонусные AUXM могут использоваться только для покупки металлов (Золото, Серебро, Платина, Палладий). Нельзя вывести или перевести.",
    expiresLabel: "Срок действия:",
    walletBalance: "Баланс вашего кошелька:",
    buyMetals: "Купить металлы",
    goToWallet: "Перейти в кошелёк",
    close: "Закрыть",
    useBonusCta: "Используйте бонусные AUXM для покупки золота или серебра прямо сейчас!",
  },
};

export function DepositConfirmation({
  coin,
  amount,
  amountUsd,
  lang: langProp,
  onConfirm,
  onCancel
}: DepositConfirmationProps) {
  const { lang: contextLang } = useLanguage();
  const lang = langProp || contextLang || "en";
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const bonus = calculateAuxmBonus(amountUsd);
  const isLaunchActive = isLaunchCampaignActive();

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 max-w-sm w-full">
      {/* Header */}
      <div className="flex items-center justify-center mb-4">
        <div className="w-16 h-16 rounded-full bg-[#2F6F62]/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#2F6F62]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white text-center mb-2">
        {t("depositReceived")}
      </h3>
      
      <p className="text-slate-400 text-sm text-center mb-6">
        {t("depositProcessing")}
      </p>

      {/* Deposit Details */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-3 mb-4">
        {/* Coin Amount */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">
            {t("deposited")}
          </span>
          <span className="text-white font-semibold">
            {amount} {coin}
          </span>
        </div>

        {/* USD Value */}
        <div className="flex justify-between items-center">
          <span className="text-slate-400 text-sm">
            {t("usdValue")}
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
            <div className="w-2 h-2 rounded-full bg-[#2F6F62]" />
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
                {"Bonus AUXM"}
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
            {t("total")}
          </span>
          <span className="text-[#2F6F62] font-bold text-lg font-mono">
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
                {t("bonusUsageTitle")}
              </p>
              <p className="text-xs text-purple-300/80">
                {`${bonus.bonusAmount.toFixed(2)} ${t("bonusUsageDesc")}`}
              </p>
              {bonus.bonusExpiresAt && (
                <p className="text-xs text-purple-400 mt-1">
                  {`⏰ ${t("expiresLabel")} ${bonus.bonusExpiresAt.toLocaleDateString(lang === "tr" ? "tr-TR" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US")}`}
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
            : "bg-[#2F6F62]/10 border border-[#2F6F62]/30"
        }`}>
          <p className={`text-sm font-medium ${
            isLaunchActive ? "text-purple-300" : "text-[#2F6F62]"
          }`}>
            {(bonus.message as Record<string, string>)[lang] || bonus.message.en}
          </p>
        </div>
      )}

      {/* No Bonus Message */}
      {bonus.bonusAmount === 0 && (
        <div className="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700">
          <p className="text-sm text-center text-slate-400">
            {(bonus.message as Record<string, string>)[lang] || bonus.message.en}
          </p>
        </div>
      )}

      {/* Balance Breakdown Preview */}
      <div className="bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-700">
        <p className="text-xs text-slate-400 mb-2">
          {t("walletBalance")}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#2F6F62]" />
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
        <div className="bg-gradient-to-r from-[#BFA181]/10 to-yellow-500/10 border border-[#BFA181]/30 rounded-xl p-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <p className="text-sm text-[#BFA181]">
              {t("useBonusCta")}
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
            {t("close")}
          </button>
        )}
        {onConfirm && (
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-white font-semibold transition-colors ${
              bonus.bonusAmount > 0
                ? "bg-gradient-to-r from-[#BFA181] to-yellow-500 hover:from-[#BFA181] hover:to-[#D4B47A]"
                : "bg-[#2F6F62] hover:bg-[#2F6F62]"
            }`}
          >
            {bonus.bonusAmount > 0 ? t("buyMetals") : t("goToWallet")}
          </button>
        )}
      </div>
    </div>
  );
}

export default DepositConfirmation;
