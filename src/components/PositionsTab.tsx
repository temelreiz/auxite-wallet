"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useStaking, FormattedStake } from "@/hooks/useStaking";

interface PositionsTabProps {
  address?: string;
  lang?: "tr" | "en" | "de" | "fr" | "ar" | "ru";
}

const metalIcons: Record<string, string> = {
  AUXG: "/gold-favicon-32x32.png",
  AUXS: "/silver-favicon-32x32.png",
  AUXPT: "/platinum-favicon-32x32.png",
  AUXPD: "/palladium-favicon-32x32.png",
};

const metalColors: Record<string, string> = {
  AUXG: "text-amber-500",
  AUXS: "text-slate-400",
  AUXPT: "text-cyan-400",
  AUXPD: "text-rose-400",
};

const metalBgColors: Record<string, string> = {
  AUXG: "from-amber-500/20 to-amber-600/10",
  AUXS: "from-slate-400/20 to-slate-500/10",
  AUXPT: "from-cyan-400/20 to-cyan-500/10",
  AUXPD: "from-rose-400/20 to-rose-500/10",
};

// 6-language translations
const translations: Record<string, Record<string, string>> = {
  tr: {
    noPositions: "Henüz pozisyonunuz yok",
    startEarning: "Biriktir tabından stake yaparak kazanmaya başlayın",
    yourPositions: "Pozisyonlarınız",
    amount: "Miktar",
    apy: "APY",
    earned: "Kazanç",
    claimable: "Talep Edilebilir",
    status: "Durum",
    endDate: "Bitiş",
    active: "Aktif",
    completed: "Tamamlandı",
    matured: "Vadesi Doldu",
    withdraw: "Çek",
    claim: "Talep Et",
    compound: "Biriktir",
    daysLeft: "gün kaldı",
    months: "ay",
    stakeCode: "Stake Kodu",
    copyCode: "Kopyala",
    copied: "Kopyalandı!",
    viewOnChain: "Blockchain'de Görüntüle",
    earlyWithdraw: "Erken Çekim",
    penalty: "Ceza",
    confirmWithdraw: "Çekimi Onayla",
    withdrawWarning: "Bu stake henüz vadesi dolmamış. Erken çekim yaparsanız %5 ceza uygulanacaktır.",
    cancel: "İptal",
    progress: "İlerleme",
    compounding: "Bileşik",
    total: "Toplam",
    principal: "Anapara",
    reward: "Ödül",
    loading: "Yükleniyor...",
    refresh: "Yenile",
    unstaking: "Çekiliyor...",
    claiming: "Talep Ediliyor...",
  },
  en: {
    noPositions: "No positions yet",
    startEarning: "Start earning by staking from the Earn tab",
    yourPositions: "Your Positions",
    amount: "Amount",
    apy: "APY",
    earned: "Earned",
    claimable: "Claimable",
    status: "Status",
    endDate: "End Date",
    active: "Active",
    completed: "Completed",
    matured: "Matured",
    withdraw: "Withdraw",
    claim: "Claim",
    compound: "Compound",
    daysLeft: "days left",
    months: "months",
    stakeCode: "Stake Code",
    copyCode: "Copy",
    copied: "Copied!",
    viewOnChain: "View on Blockchain",
    earlyWithdraw: "Early Withdrawal",
    penalty: "Penalty",
    confirmWithdraw: "Confirm Withdrawal",
    withdrawWarning: "This stake has not matured yet. Early withdrawal will incur a 5% penalty.",
    cancel: "Cancel",
    progress: "Progress",
    compounding: "Compounding",
    total: "Total",
    principal: "Principal",
    reward: "Reward",
    loading: "Loading...",
    refresh: "Refresh",
    unstaking: "Withdrawing...",
    claiming: "Claiming...",
  },
  de: {
    noPositions: "Noch keine Positionen",
    startEarning: "Beginnen Sie zu verdienen, indem Sie im Verdienen-Tab staken",
    yourPositions: "Ihre Positionen",
    amount: "Betrag",
    apy: "APY",
    earned: "Verdient",
    claimable: "Abrufbar",
    status: "Status",
    endDate: "Enddatum",
    active: "Aktiv",
    completed: "Abgeschlossen",
    matured: "Fällig",
    withdraw: "Abheben",
    claim: "Abrufen",
    compound: "Zusammensetzen",
    daysLeft: "Tage übrig",
    months: "Monate",
    stakeCode: "Stake-Code",
    copyCode: "Kopieren",
    copied: "Kopiert!",
    viewOnChain: "Auf Blockchain anzeigen",
    earlyWithdraw: "Vorzeitige Abhebung",
    penalty: "Strafe",
    confirmWithdraw: "Abhebung Bestätigen",
    withdrawWarning: "Dieser Stake ist noch nicht fällig. Bei vorzeitiger Abhebung fällt eine Strafe von 5% an.",
    cancel: "Abbrechen",
    progress: "Fortschritt",
    compounding: "Zinseszins",
    total: "Gesamt",
    principal: "Kapital",
    reward: "Belohnung",
    loading: "Laden...",
    refresh: "Aktualisieren",
    unstaking: "Abheben...",
    claiming: "Abrufen...",
  },
  fr: {
    noPositions: "Pas encore de positions",
    startEarning: "Commencez à gagner en stakant depuis l'onglet Gagner",
    yourPositions: "Vos Positions",
    amount: "Montant",
    apy: "APY",
    earned: "Gagné",
    claimable: "Réclamable",
    status: "Statut",
    endDate: "Date de fin",
    active: "Actif",
    completed: "Terminé",
    matured: "Arrivé à échéance",
    withdraw: "Retirer",
    claim: "Réclamer",
    compound: "Composer",
    daysLeft: "jours restants",
    months: "mois",
    stakeCode: "Code de Stake",
    copyCode: "Copier",
    copied: "Copié!",
    viewOnChain: "Voir sur Blockchain",
    earlyWithdraw: "Retrait Anticipé",
    penalty: "Pénalité",
    confirmWithdraw: "Confirmer le Retrait",
    withdrawWarning: "Ce stake n'est pas encore arrivé à échéance. Un retrait anticipé entraînera une pénalité de 5%.",
    cancel: "Annuler",
    progress: "Progression",
    compounding: "Composition",
    total: "Total",
    principal: "Capital",
    reward: "Récompense",
    loading: "Chargement...",
    refresh: "Actualiser",
    unstaking: "Retrait...",
    claiming: "Réclamation...",
  },
  ar: {
    noPositions: "لا توجد مراكز بعد",
    startEarning: "ابدأ في الكسب من خلال التخزين من علامة تبويب اكسب",
    yourPositions: "مراكزك",
    amount: "المبلغ",
    apy: "العائد السنوي",
    earned: "المكتسب",
    claimable: "قابل للمطالبة",
    status: "الحالة",
    endDate: "تاريخ الانتهاء",
    active: "نشط",
    completed: "مكتمل",
    matured: "نضج",
    withdraw: "سحب",
    claim: "مطالبة",
    compound: "تجميع",
    daysLeft: "يوم متبقي",
    months: "أشهر",
    stakeCode: "رمز التخزين",
    copyCode: "نسخ",
    copied: "تم النسخ!",
    viewOnChain: "عرض على البلوكتشين",
    earlyWithdraw: "سحب مبكر",
    penalty: "غرامة",
    confirmWithdraw: "تأكيد السحب",
    withdrawWarning: "هذا التخزين لم ينضج بعد. السحب المبكر سيترتب عليه غرامة 5%.",
    cancel: "إلغاء",
    progress: "التقدم",
    compounding: "تجميع",
    total: "المجموع",
    principal: "رأس المال",
    reward: "المكافأة",
    loading: "جاري التحميل...",
    refresh: "تحديث",
    unstaking: "جاري السحب...",
    claiming: "جاري المطالبة...",
  },
  ru: {
    noPositions: "Позиций пока нет",
    startEarning: "Начните зарабатывать, делая стейкинг на вкладке Заработок",
    yourPositions: "Ваши Позиции",
    amount: "Сумма",
    apy: "APY",
    earned: "Заработано",
    claimable: "Доступно",
    status: "Статус",
    endDate: "Дата окончания",
    active: "Активна",
    completed: "Завершена",
    matured: "Созрела",
    withdraw: "Вывести",
    claim: "Забрать",
    compound: "Реинвестировать",
    daysLeft: "дней осталось",
    months: "месяцев",
    stakeCode: "Код Стейкинга",
    copyCode: "Копировать",
    copied: "Скопировано!",
    viewOnChain: "Посмотреть в Блокчейне",
    earlyWithdraw: "Досрочный Вывод",
    penalty: "Штраф",
    confirmWithdraw: "Подтвердить Вывод",
    withdrawWarning: "Этот стейк еще не созрел. Досрочный вывод повлечет штраф 5%.",
    cancel: "Отмена",
    progress: "Прогресс",
    compounding: "Компаундинг",
    total: "Всего",
    principal: "Основная сумма",
    reward: "Награда",
    loading: "Загрузка...",
    refresh: "Обновить",
    unstaking: "Вывод...",
    claiming: "Получение...",
  },
};

// Position Card Component
function PositionCard({ 
  stake, 
  onUnstake, 
  onClaim, 
  onCompound,
  isUnstaking,
  isClaiming,
  isCompounding,
  lang 
}: { 
  stake: FormattedStake;
  onUnstake: (id: number) => void;
  onClaim: (id: number) => void;
  onCompound: (id: number) => void;
  isUnstaking: boolean;
  isClaiming: boolean;
  isCompounding: boolean;
  lang: string;
}) {
  const t = translations[lang] || translations.en;
  const [copied, setCopied] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(stake.shortCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdraw = () => {
    if (!stake.isMatured) {
      setShowWithdrawModal(true);
    } else {
      onUnstake(stake.id);
    }
  };

  const confirmWithdraw = () => {
    setShowWithdrawModal(false);
    onUnstake(stake.id);
  };

  return (
    <>
      <div className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br ${metalBgColors[stake.metalSymbol] || 'from-slate-500/20 to-slate-600/10'} overflow-hidden`}>
        {/* Header */}
        <div className="p-5 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img 
                src={metalIcons[stake.metalSymbol]} 
                alt={stake.metalSymbol} 
                className="w-12 h-12"
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`font-bold text-lg ${metalColors[stake.metalSymbol]}`}>
                    {stake.metalSymbol}
                  </span>
                  {stake.isMatured ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#2F6F62]/20 text-[#2F6F62] dark:text-[#2F6F62]">
                      {t.matured}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-500 dark:text-blue-400">
                      {t.active}
                    </span>
                  )}
                  {stake.compounding && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-500 dark:text-purple-400">
                      {t.compounding}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {stake.amountGrams.toFixed(2)}g · {stake.durationMonths} {t.months}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xl font-bold text-[#2F6F62] dark:text-[#2F6F62]">
                {stake.apyPercent.toFixed(2)}% {t.apy}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                +{stake.expectedRewardGrams.toFixed(4)}g {t.earned.toLowerCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Stake Code */}
        <div className="px-5 py-3 bg-slate-100/50 dark:bg-slate-800/30 border-y border-slate-200/50 dark:border-slate-700/50">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.stakeCode}:</span>
              <code className="px-2 py-1 rounded bg-slate-200/50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-mono text-xs">
                {stake.shortCode}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-2 py-1 rounded text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? t.copied : t.copyCode}
              </button>
              <a
                href={`https://etherscan.io/address/${process.env.NEXT_PUBLIC_STAKING_CONTRACT}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded text-xs text-blue-500 dark:text-blue-400 hover:bg-blue-500/10 transition-colors"
              >
                {t.viewOnChain}
              </a>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {stake.active && (
          <div className="px-5 py-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>{t.progress}</span>
              <span>{stake.isMatured ? "100%" : `${stake.progress.toFixed(1)}%`}</span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${stake.isMatured ? "bg-[#2F6F62]" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, stake.progress)}%` }}
              />
            </div>
            {!stake.isMatured && stake.timeRemaining && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                {stake.timeRemaining} {t.daysLeft}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="px-5 py-3 grid grid-cols-3 gap-4 border-t border-slate-200/50 dark:border-slate-700/50">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.principal}</div>
            <div className="font-semibold text-slate-800 dark:text-white">{stake.amountGrams.toFixed(4)}g</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.reward}</div>
            <div className="font-semibold text-[#2F6F62] dark:text-[#2F6F62]">+{stake.expectedRewardGrams.toFixed(4)}g</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.claimable}</div>
            <div className="font-semibold text-purple-600 dark:text-purple-400">{stake.claimableRewardGrams.toFixed(4)}g</div>
          </div>
        </div>

        {/* Actions */}
        {stake.active && (
          <div className="p-4 bg-white/30 dark:bg-slate-900/30 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex gap-2 flex-wrap">
              {stake.isMatured ? (
                <button
                  onClick={handleWithdraw}
                  disabled={isUnstaking}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[#2F6F62] hover:bg-[#2F6F62] disabled:opacity-50 text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isUnstaking ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t.unstaking}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t.withdraw}
                    </>
                  )}
                </button>
              ) : (
                <>
                  {stake.compounding ? (
                    <button
                      onClick={() => onCompound(stake.id)}
                      disabled={isCompounding || stake.claimableRewardGrams <= 0}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isCompounding ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          {t.compound}
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => onClaim(stake.id)}
                      disabled={isClaiming || stake.claimableRewardGrams <= 0}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {isClaiming ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          {t.claiming}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t.claim}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={handleWithdraw}
                    disabled={isUnstaking}
                    className="py-2.5 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-300 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t.earlyWithdraw}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Early Withdrawal Warning Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-center text-slate-800 dark:text-white mb-2">
                {t.earlyWithdraw}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-4">
                {t.withdrawWarning}
              </p>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                  {t.penalty}: 5% ({(stake.amountGrams * 0.05).toFixed(4)}g)
                </span>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 px-4 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmWithdraw}
                className="flex-1 py-2.5 px-4 rounded-lg bg-[#2F6F62] hover:bg-[#2F6F62] text-white font-medium transition-colors"
              >
                {t.confirmWithdraw}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PositionsTab({ address: propAddress, lang = "en" }: PositionsTabProps) {
  const { address: walletAddress } = useAccount();
  const address = propAddress || walletAddress;
  const t = translations[lang] || translations.en;

  // Use staking hook
  const {
    activeStakes,
    loading,
    unstake,
    claimRewards,
    compoundRewards,
    refresh,
    isUnstaking,
    isClaiming,
    isCompounding,
  } = useStaking();

  // Handler functions
  const handleUnstake = async (stakeId: number) => {
    try {
      await unstake(stakeId);
    } catch (err) {
      console.error("Unstake failed:", err);
    }
  };

  const handleClaim = async (stakeId: number) => {
    try {
      await claimRewards(stakeId);
    } catch (err) {
      console.error("Claim failed:", err);
    }
  };

  const handleCompound = async (stakeId: number) => {
    try {
      await compoundRewards(stakeId);
    } catch (err) {
      console.error("Compound failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F6F62]"></div>
          <span className="text-slate-500 dark:text-slate-400">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (activeStakes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
          {t.noPositions}
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          {t.startEarning}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {t.yourPositions} ({activeStakes.length})
        </h3>
        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t.refresh}
        </button>
      </div>

      {/* Positions List */}
      <div className="space-y-4">
        {activeStakes.map((stake) => (
          <PositionCard
            key={stake.id}
            stake={stake}
            onUnstake={handleUnstake}
            onClaim={handleClaim}
            onCompound={handleCompound}
            isUnstaking={isUnstaking}
            isClaiming={isClaiming}
            isCompounding={isCompounding}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

export default PositionsTab;
