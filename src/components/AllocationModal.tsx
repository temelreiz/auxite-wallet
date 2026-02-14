"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, erc20Abi } from "viem";
import { useStaking, METAL_IDS } from "@/hooks/useStaking";
import { useWallet } from "@/components/WalletContext";
import { useLanguage } from "@/components/LanguageContext";
import { formatAmount } from "@/lib/format";

// 6-language translations — Institutional Language Bible compliant
const translations: Record<string, Record<string, string>> = {
  tr: {
    lockEarn: "Sermaye Tahsis Et",
    lockPeriod: "Vade Süresi",
    month: "Ay",
    days: "gün",
    amount: "Tahsis Miktarı",
    amountSub: "Tahsis Edilmiş Metal",
    balance: "Mevcut Tahsisli Bakiye",
    lockSuccess: "Tahsis Başarılı!",
    positionCreated: "Pozisyonunuz oluşturuldu.",
    approved: "Onaylandı",
    canLockNow: "Şimdi tahsis edebilirsiniz.",
    infoNotice: "gün boyunca tahsis edilen metal, kurumsal gelir programlarına yönlendirilecektir. Vade sonunda anapara ve getiri otomatik olarak iade edilecektir.",
    approving: "Onaylanıyor...",
    approveToken: "Onayla",
    locking: "Sermaye Tahsis Ediliyor...",
    cancel: "İptal",
    estimatedEarnings: "Tahmini Getiri",
    afterPeriod: "Vade sonunda",
    apy: "Getiri Oranı",
    stakeCode: "Getiri Referansı",
    copyCode: "Kopyala",
    copied: "Kopyalandı!",
    viewOnChain: "Blockchain'de Görüntüle",
    compounding: "Otomatik Vade Yenileme",
    compoundingDesc: "Kazançlar vade sonunda aksi belirtilmedikçe yeniden tahsis edilir",
    txPending: "İşlem Onay Bekliyor...",
    txConfirming: "Blockchain'de Doğrulanıyor...",
    done: "Tamam",
    termLength: "Vade",
    minAllocation: "Minimum Tahsis Edilebilir Tutar",
    headerSub: "Tahsis edilmiş metali kurumsal getiri programlarına yönlendirin.",
    yieldDisclaimer: "Gelir, kurumsal piyasa faaliyetleri aracılığıyla üretilir. Getiriler garanti değildir.",
    custodyNotice: "Müşteri metalleri tamamen tahsis edilmiş ve bağımsız saklama altındadır.",
    counterpartyNotice: "Gelir, kurumsal karşı taraflar aracılığıyla üretilmektedir.",
    riskDisclosure: "Gelir programlarına tahsis edilen sermaye, karşı taraf riskine tabi olabilir.",
    incomeProgram: "Gelir Programı",
    fixedTermAllocation: "Sabit Vadeli Tahsis",
    totalLabel: "Toplam",
    allocationFailed: "Tahsis başarısız oldu. Lütfen tekrar deneyin.",
  },
  en: {
    lockEarn: "Deploy Capital",
    lockPeriod: "Term Length",
    month: "Month Term",
    days: "days",
    amount: "Allocation Amount",
    amountSub: "Allocated Metal",
    balance: "Available Allocated Balance",
    lockSuccess: "Allocation Successful!",
    positionCreated: "Your position has been created.",
    approved: "Approved",
    canLockNow: "You can now proceed with allocation.",
    infoNotice: "days your allocated metal will be deployed into institutional income programs for the selected term. Principal and income will be automatically returned after the period ends.",
    approving: "Approving...",
    approveToken: "Approve",
    locking: "Deploying Capital...",
    cancel: "Cancel",
    estimatedEarnings: "Projected Returns",
    afterPeriod: "At maturity",
    apy: "Yield Rate",
    stakeCode: "Yield Reference",
    copyCode: "Copy",
    copied: "Copied!",
    viewOnChain: "View on Blockchain",
    compounding: "Auto-Renew Term",
    compoundingDesc: "Earnings are reinvested at maturity unless instructed otherwise.",
    txPending: "Transaction Pending...",
    txConfirming: "Confirming on Blockchain...",
    done: "Done",
    termLength: "Term",
    minAllocation: "Minimum Deployable Amount",
    headerSub: "Deploy allocated metal into institutional yield programs.",
    yieldDisclaimer: "Income is generated through institutional market activities. Returns are not guaranteed.",
    custodyNotice: "Client metals remain fully allocated and under independent custody.",
    counterpartyNotice: "Income generated through institutional counterparties.",
    riskDisclosure: "Capital deployed into income programs may be subject to counterparty risk.",
    incomeProgram: "Income Program",
    fixedTermAllocation: "Fixed-Term Allocation",
    totalLabel: "Total",
    allocationFailed: "Allocation failed. Please try again.",
  },
  de: {
    lockEarn: "Kapital Einsetzen",
    lockPeriod: "Laufzeit",
    month: "Monate",
    days: "Tage",
    amount: "Allokationsbetrag",
    amountSub: "Allokiertes Metall",
    balance: "Verfügbares Allokiertes Guthaben",
    lockSuccess: "Allokation Erfolgreich!",
    positionCreated: "Ihre Position wurde erstellt.",
    approved: "Genehmigt",
    canLockNow: "Sie können jetzt allokieren.",
    infoNotice: "Tage wird Ihr allokiertes Metall in institutionelle Einkommensprogramme eingesetzt. Kapital und Erträge werden nach Ablauf automatisch zurückgegeben.",
    approving: "Genehmigung...",
    approveToken: "Genehmigen",
    locking: "Kapital wird eingesetzt...",
    cancel: "Abbrechen",
    estimatedEarnings: "Prognostizierte Erträge",
    afterPeriod: "Bei Fälligkeit",
    apy: "Rendite-Rate",
    stakeCode: "Rendite-Referenz",
    copyCode: "Kopieren",
    copied: "Kopiert!",
    viewOnChain: "Auf Blockchain anzeigen",
    compounding: "Automatische Laufzeitverlängerung",
    compoundingDesc: "Erträge werden bei Fälligkeit reinvestiert, sofern nicht anders angewiesen.",
    txPending: "Transaktion ausstehend...",
    txConfirming: "Wird auf Blockchain bestätigt...",
    done: "Fertig",
    termLength: "Laufzeit",
    minAllocation: "Mindesteinsatzbetrag",
    headerSub: "Allokiertes Metall in institutionelle Renditeprogramme einsetzen.",
    yieldDisclaimer: "Einkommen wird durch institutionelle Marktaktivitäten generiert. Erträge sind nicht garantiert.",
    custodyNotice: "Kundenmetalle bleiben vollständig allokiert und unter unabhängiger Verwahrung.",
    counterpartyNotice: "Einkommen wird durch institutionelle Gegenparteien generiert.",
    riskDisclosure: "In Einkommensprogramme eingesetztes Kapital kann dem Gegenparteirisiko unterliegen.",
    incomeProgram: "Einkommensprogramm",
    fixedTermAllocation: "Festlaufzeit-Allokation",
    totalLabel: "Gesamt",
    allocationFailed: "Allokation fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
  fr: {
    lockEarn: "Déployer le Capital",
    lockPeriod: "Durée du Terme",
    month: "Mois",
    days: "jours",
    amount: "Montant d'Allocation",
    amountSub: "Métal Alloué",
    balance: "Solde Alloué Disponible",
    lockSuccess: "Allocation Réussie!",
    positionCreated: "Votre position a été créée.",
    approved: "Approuvé",
    canLockNow: "Vous pouvez maintenant procéder à l'allocation.",
    infoNotice: "jours votre métal alloué sera déployé dans des programmes de revenu institutionnels. Le capital et les revenus seront automatiquement retournés après la période.",
    approving: "Approbation...",
    approveToken: "Approuver",
    locking: "Déploiement du Capital...",
    cancel: "Annuler",
    estimatedEarnings: "Rendements Projetés",
    afterPeriod: "À maturité",
    apy: "Taux de Rendement",
    stakeCode: "Référence de Rendement",
    copyCode: "Copier",
    copied: "Copié!",
    viewOnChain: "Voir sur Blockchain",
    compounding: "Renouvellement Automatique",
    compoundingDesc: "Les gains sont réinvestis à maturité sauf instruction contraire.",
    txPending: "Transaction en attente...",
    txConfirming: "Confirmation sur Blockchain...",
    done: "Terminé",
    termLength: "Terme",
    minAllocation: "Montant Minimum Déployable",
    headerSub: "Déployer le métal alloué dans des programmes de rendement institutionnel.",
    yieldDisclaimer: "Le revenu est généré par des activités de marché institutionnelles. Les retours ne sont pas garantis.",
    custodyNotice: "Les métaux des clients restent entièrement alloués et sous garde indépendante.",
    counterpartyNotice: "Revenu généré par des contreparties institutionnelles.",
    riskDisclosure: "Le capital déployé dans les programmes de revenu peut être soumis au risque de contrepartie.",
    incomeProgram: "Programme de Revenu",
    fixedTermAllocation: "Allocation à Terme Fixe",
    totalLabel: "Total",
    allocationFailed: "L'allocation a échoué. Veuillez réessayer.",
  },
  ar: {
    lockEarn: "نشر رأس المال",
    lockPeriod: "مدة الاستثمار",
    month: "شهر",
    days: "يوم",
    amount: "مبلغ التخصيص",
    amountSub: "المعدن المخصص",
    balance: "الرصيد المخصص المتاح",
    lockSuccess: "تم التخصيص بنجاح!",
    positionCreated: "تم إنشاء موقعك.",
    approved: "تمت الموافقة",
    canLockNow: "يمكنك الآن المتابعة بالتخصيص.",
    infoNotice: "يوم سيتم نشر المعدن المخصص في برامج الدخل المؤسسية. سيتم إرجاع رأس المال والدخل تلقائياً بعد انتهاء الفترة.",
    approving: "جاري الموافقة...",
    approveToken: "يتأكد",
    locking: "جاري نشر رأس المال...",
    cancel: "إلغاء",
    estimatedEarnings: "العوائد المتوقعة",
    afterPeriod: "عند الاستحقاق",
    apy: "معدل العائد",
    stakeCode: "مرجع العائد",
    copyCode: "نسخ",
    copied: "تم النسخ!",
    viewOnChain: "عرض على البلوكتشين",
    compounding: "تجديد تلقائي للمدة",
    compoundingDesc: "تُعاد الأرباح للاستثمار عند الاستحقاق ما لم يُطلب خلاف ذلك.",
    txPending: "المعاملة معلقة...",
    txConfirming: "جاري التأكيد على البلوكتشين...",
    done: "تم",
    termLength: "المدة",
    minAllocation: "الحد الأدنى للمبلغ القابل للنشر",
    headerSub: "نشر المعدن المخصص في برامج العائد المؤسسية.",
    yieldDisclaimer: "يتم توليد الدخل من خلال أنشطة السوق المؤسسية. العوائد غير مضمونة.",
    custodyNotice: "تبقى معادن العملاء مخصصة بالكامل وتحت حفظ مستقل.",
    counterpartyNotice: "الدخل المولّد عبر أطراف مقابلة مؤسسية.",
    riskDisclosure: "رأس المال المنشور في برامج الدخل قد يخضع لمخاطر الطرف المقابل.",
    incomeProgram: "برنامج الدخل",
    fixedTermAllocation: "تخصيص بأجل ثابت",
    totalLabel: "الإجمالي",
    allocationFailed: "فشل التخصيص. يرجى المحاولة مرة أخرى.",
  },
  ru: {
    lockEarn: "Разместить Капитал",
    lockPeriod: "Срок Инвестирования",
    month: "Мес",
    days: "дней",
    amount: "Сумма Аллокации",
    amountSub: "Аллоцированный Металл",
    balance: "Доступный Аллоцированный Баланс",
    lockSuccess: "Аллокация Успешна!",
    positionCreated: "Ваша позиция создана.",
    approved: "Одобрено",
    canLockNow: "Теперь вы можете выполнить аллокацию.",
    infoNotice: "дней ваш аллоцированный металл будет размещён в институциональных программах дохода. Основная сумма и доход будут автоматически возвращены после окончания периода.",
    approving: "Одобрение...",
    approveToken: "Одобрить",
    locking: "Размещение Капитала...",
    cancel: "Отмена",
    estimatedEarnings: "Прогнозируемый Доход",
    afterPeriod: "При погашении",
    apy: "Ставка Доходности",
    stakeCode: "Ссылка Доходности",
    copyCode: "Копировать",
    copied: "Скопировано!",
    viewOnChain: "Посмотреть в Блокчейне",
    compounding: "Автопродление Срока",
    compoundingDesc: "Доход реинвестируется при погашении, если не указано иное.",
    txPending: "Транзакция ожидает...",
    txConfirming: "Подтверждение в блокчейне...",
    done: "Готово",
    termLength: "Срок",
    minAllocation: "Минимальная Размещаемая Сумма",
    headerSub: "Размещение аллоцированного металла в институциональные программы доходности.",
    yieldDisclaimer: "Доход генерируется через институциональную рыночную деятельность. Доходность не гарантирована.",
    custodyNotice: "Металлы клиентов остаются полностью аллоцированными и под независимым хранением.",
    counterpartyNotice: "Доход генерируется через институциональных контрагентов.",
    riskDisclosure: "Капитал, размещённый в программах дохода, может быть подвержен контрагентному риску.",
    incomeProgram: "Программа Дохода",
    fixedTermAllocation: "Аллокация с Фиксированным Сроком",
    totalLabel: "Итого",
    allocationFailed: "Аллокация не удалась. Пожалуйста, попробуйте снова.",
  },
};

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
}

// APY Visual Comparison
function APYVisual({ periods, selectedPeriod, onSelect }: {
  periods: Array<{ months: number; days: number; apy: number }>;
  selectedPeriod: number;
  onSelect: (months: number) => void;
}) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const maxAPY = Math.max(...periods.map(p => p.apy));
  
  const getDays = (months: number, days?: number) => days || (months === 12 ? 365 : months * 30);
  
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {periods.map((period) => {
        const isSelected = selectedPeriod === period.months;
        const barHeight = (period.apy / maxAPY) * 100;
        const periodDays = getDays(period.months, period.days);
        
        return (
          <button
            key={period.months}
            onClick={() => onSelect(period.months)}
            className={`relative p-2 sm:p-3 rounded-lg border-2 transition-all ${
              isSelected 
                ? "border-[#C6A15B] bg-[#C6A15B]/10 dark:bg-[#C6A15B]/20" 
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50"
            }`}
          >
            <div className="h-8 sm:h-12 flex items-end justify-center mb-1.5 sm:mb-2">
              <div 
                className={`w-5 sm:w-6 rounded-t-md sm:rounded-t-lg transition-all ${
                  isSelected 
                    ? "bg-gradient-to-t from-[#C6A15B] to-[#BFA181]" 
                    : "bg-gradient-to-t from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-500"
                }`}
                style={{ height: `${barHeight}%` }}
              />
            </div>
            
            <div className={`text-xs sm:text-sm font-bold whitespace-nowrap ${isSelected ? "text-[#C6A15B] dark:text-[#C6A15B]" : "text-slate-700 dark:text-slate-300"}`}>
              {period.months} {t("month")}
            </div>
            <div className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400">
              {periodDays} {t("days")}
            </div>
            <div className="text-[7px] sm:text-[8px] text-slate-400 dark:text-slate-500 mt-0.5">
              {t("fixedTermAllocation")}
            </div>
            
            <div className={`mt-1 text-[11px] sm:text-xs font-semibold ${isSelected ? "text-[#C6A15B] dark:text-[#C6A15B]" : "text-slate-600 dark:text-slate-400"}`}>
              {period.apy.toFixed(2)}%
            </div>

            {isSelected && (
              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#C6A15B] flex items-center justify-center">
                <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
function EarningsCalculator({ amount, apy, days, metalSymbol }: {
  amount: number;
  apy: number;
  days: number;
  metalSymbol: string;
}) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const earnings = (amount * apy * days) / (100 * 365);
  const total = amount + earnings;
  
  if (amount <= 0) return null;
  
  return (
    <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#C6A15B]/10 to-cyan-500/10 dark:from-[#C6A15B]/20 dark:to-cyan-500/20 border border-[#C6A15B]/20 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-2 sm:mb-3">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#C6A15B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-xs sm:text-sm font-medium text-[#C6A15B] dark:text-[#C6A15B]">
          {t("estimatedEarnings")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{t("afterPeriod")}</div>
          <div className="text-base sm:text-lg font-bold text-[#C6A15B] dark:text-[#C6A15B]">
            +{formatAmount(earnings, metalSymbol)}g
          </div>
        </div>
        <div>
          <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{t("totalLabel")}</div>
          <div className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
            {formatAmount(total, metalSymbol)}g
          </div>
        </div>
      </div>
    </div>
  );
}

// Stake Code Display Component
function StakeCodeDisplay({ stakeCode, shortCode, txHash }: {
  stakeCode: string;
  shortCode: string;
  txHash?: string;
}) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shortCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = txHash 
    ? `https://etherscan.io/tx/${txHash}` 
    : `https://etherscan.io/address/${process.env.NEXT_PUBLIC_STAKING_CONTRACT}`;

  return (
    <div className="rounded-lg sm:rounded-xl bg-gradient-to-br from-[#C6A15B]/20 to-cyan-500/20 border border-[#C6A15B]/30 p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div>
        <div className="text-[10px] sm:text-xs text-[#C6A15B] dark:text-[#C6A15B] mb-1 font-medium">
          {t("stakeCode")}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <code className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-slate-900/50 text-[#C6A15B] font-mono text-xs sm:text-sm truncate">
            {shortCode}
          </code>
          <button
            onClick={handleCopy}
            className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#C6A15B]/20 hover:bg-[#C6A15B]/30 text-[#C6A15B] text-xs sm:text-sm font-medium transition-colors flex items-center gap-1"
          >
            {copied ? (
              <>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">{t("copied")}</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="hidden sm:inline">{t("copyCode")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {txHash && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 text-xs sm:text-sm font-medium transition-colors"
        >
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {t("viewOnChain")}
        </a>
      )}
    </div>
  );
}

function AllocationModal({ isOpen, onClose, offer }: AllocationModalProps) {
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const { address: externalAddress, isConnected: isExternalConnected } = useAccount();
  const { balances, address: walletCtxAddress, isConnected: isWalletConnected } = useWallet();

  // Determine wallet mode: custody (API-based) vs on-chain
  const isCustodyMode = isWalletConnected && !isExternalConnected;
  const activeAddress = isCustodyMode ? walletCtxAddress : externalAddress;

  // Staking hook (only used in on-chain mode)
  const {
    stake,
    isStaking: isOnChainStaking,
    isStakeSuccess: isOnChainStakeSuccess,
    stakeHash,
    previewReward
  } = useStaking();

  // Local state
  const [selectedPeriod, setSelectedPeriod] = useState(3);
  const [amount, setAmount] = useState("");
  const [compounding, setCompounding] = useState(false);
  const [resultStakeCode, setResultStakeCode] = useState<string | null>(null);
  const [resultShortCode, setResultShortCode] = useState<string | null>(null);

  // Custody mode state
  const [isCustodyStaking, setIsCustodyStaking] = useState(false);
  const [isCustodySuccess, setIsCustodySuccess] = useState(false);
  const [custodyError, setCustodyError] = useState<string | null>(null);

  // Combined states
  const isStaking = isCustodyMode ? isCustodyStaking : isOnChainStaking;
  const isStakeSuccess = isCustodyMode ? isCustodySuccess : isOnChainStakeSuccess;

  const stakingContractAddress = process.env.NEXT_PUBLIC_STAKING_CONTRACT as `0x${string}`;
  const tokenAddress = offer?.metalTokenAddress as `0x${string}`;

  // Get balance from WalletContext (allocation-based)
  const getMetalBalance = () => {
    if (!balances || !offer) return 0;
    const metalKey = offer.metal.toLowerCase() as keyof typeof balances;
    return (balances[metalKey] as number) || 0;
  };
  const walletMetalBalance = getMetalBalance();

  // Read token balance (on-chain - only for external wallets)
  const { data: balanceData } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: externalAddress ? [externalAddress] : undefined,
    query: { enabled: !!externalAddress && !!tokenAddress && isOpen && !isCustodyMode },
  });

  // Read current allowance (only for on-chain mode)
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: externalAddress && stakingContractAddress ? [externalAddress, stakingContractAddress] : undefined,
    query: { enabled: !!externalAddress && !!stakingContractAddress && !!tokenAddress && isOpen && !isCustodyMode },
  });

  // Approve write contract (only for on-chain mode)
  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    reset: resetApprove
  } = useWriteContract();

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Refetch allowance after approve success
  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPeriod(3);
      setAmount("");
      setCompounding(false);
      setResultStakeCode(null);
      setResultShortCode(null);
      setIsCustodyStaking(false);
      setIsCustodySuccess(false);
      setCustodyError(null);
      resetApprove();
    }
  }, [isOpen]);

  if (!isOpen || !offer) return null;

  // Calculate values
  const amountNum = parseFloat(amount) || 0;
  const amountInTokenUnits = BigInt(Math.floor(amountNum * 1000)); // 3 decimals
  const onChainBalance = balanceData ? Number(balanceData) / 1000 : 0; // On-chain balance
  const balanceNum = walletMetalBalance > 0 ? walletMetalBalance : onChainBalance; // Prefer wallet balance
  const currentAllowance = allowanceData ? Number(allowanceData) / 1000 : 0;
  const currentPeriod = offer.periods.find(p => p.months === selectedPeriod) || offer.periods[0];
  const periodDays = currentPeriod.days || (selectedPeriod === 12 ? 365 : selectedPeriod * 30);

  // Check if needs approval (only relevant for on-chain mode)
  const needsApproval = !isCustodyMode && amountNum > 0 && currentAllowance < amountNum;
  const isApproving = isApprovePending || isApproveConfirming;

  // Handle approve (on-chain mode only)
  const handleApprove = () => {
    if (!externalAddress || !tokenAddress || !stakingContractAddress) return;

    writeApprove({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [stakingContractAddress, amountInTokenUnits],
    });
  };

  // Handle stake — custody mode (API) or on-chain
  const handleStake = async () => {
    if (!activeAddress || !offer) return;

    if (isCustodyMode) {
      // ═══ CUSTODY MODE: API-based staking ═══
      setIsCustodyStaking(true);
      setCustodyError(null);
      try {
        const durationMonths = selectedPeriod;
        const currentPeriodData = offer.periods.find(p => p.months === selectedPeriod) || offer.periods[0];
        const res = await fetch('/api/stakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: activeAddress,
            metal: offer.metal,
            amount: amountNum.toString(),
            duration: durationMonths,
            apy: currentPeriodData.apy.toFixed(2),
          }),
        });
        const data = await res.json();
        if (data.success && data.stake) {
          setIsCustodySuccess(true);
          const shortCode = data.agreementNo || `ALC-${(data.stake.id || '').slice(-8).toUpperCase()}`;
          setResultShortCode(shortCode);
          setResultStakeCode(data.stake.id || data.agreementNo);
        } else {
          setCustodyError(data.error || t('allocationFailed'));
        }
      } catch (err) {
        setCustodyError(lang === 'tr' ? 'Bağlantı hatası' : 'Connection error');
      } finally {
        setIsCustodyStaking(false);
      }
    } else {
      // ═══ ON-CHAIN MODE: Smart contract staking ═══
      try {
        const metalSymbol = offer.metal as 'AUXG' | 'AUXS' | 'AUXPT' | 'AUXPD';
        const durationMonths = selectedPeriod as 3 | 6 | 12;
        await stake(metalSymbol, amountNum, durationMonths, compounding, 0);
        const timestamp = Date.now().toString(16).toUpperCase();
        const shortCode = `ALC-${timestamp.slice(-8)}`;
        setResultShortCode(shortCode);
        setResultStakeCode(`0x${timestamp}${Math.random().toString(16).slice(2, 10)}`);
      } catch (err) {
        console.error("Stake failed:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/10" style={{ background: 'rgba(198,161,91,0.1)' }}>
              <img src={offer.icon} alt={offer.metal} className="w-full h-full object-cover scale-[0.85]" style={{ filter: 'contrast(1.1)' }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {offer.name} {t("incomeProgram")}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {t("headerSub")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 sm:top-4 right-3 sm:right-4 p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Period Selection */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 sm:mb-3 block flex items-center gap-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t("lockPeriod")}
            </label>
            <APYVisual
              periods={offer.periods}
              selectedPeriod={selectedPeriod}
              onSelect={setSelectedPeriod}
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 mb-0.5 block flex items-center gap-2">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              {t("amount")}
            </label>
            <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2 ml-5 sm:ml-6">
              {t("amountSub")} ({offer.metal})
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`${t("minAllocation")}: ${offer.minAmount}g`}
                disabled={isApproving || isStaking}
                className="w-full px-3 sm:px-4 py-3 sm:py-4 pr-16 sm:pr-20 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#C6A15B] transition-colors disabled:opacity-50 text-base sm:text-lg font-medium"
              />
              <button
                onClick={() => {
                  setAmount(balanceNum.toString());
                }}
                disabled={isApproving || isStaking}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-[#C6A15B]/20 text-[#C6A15B] dark:text-[#C6A15B] hover:bg-[#C6A15B]/30 text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between mt-1.5 sm:mt-2">
              <span className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {t("balance")}: {formatAmount(balanceNum, offer.metal)} {offer.metal}
              </span>
              {amountNum > 0 && amountNum < offer.minAmount && (
                <span className="text-[10px] sm:text-xs text-red-400">
                  {t("minAllocation")}: {offer.minAmount}g {offer.metal}
                </span>
              )}
            </div>
          </div>

          {/* Compounding Toggle */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div>
                <div className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{t("compounding")}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">{t("compoundingDesc")}</div>
              </div>
            </div>
            <button
              onClick={() => setCompounding(!compounding)}
              className={`w-10 sm:w-12 h-5 sm:h-6 rounded-full transition-colors ${
                compounding ? "bg-purple-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <div className={`w-4 sm:w-5 h-4 sm:h-5 rounded-full bg-white shadow-md transform transition-transform ${
                compounding ? "translate-x-5 sm:translate-x-6" : "translate-x-0.5"
              }`} />
            </button>
          </div>

          {/* Earnings Calculator */}
          <EarningsCalculator
            amount={amountNum}
            apy={currentPeriod.apy}
            days={periodDays}
            metalSymbol={offer.metal}
          />

          {/* Success Message with Stake Code */}
          {isStakeSuccess && resultShortCode && (
            <div className="space-y-3 sm:space-y-4">
              <div className="rounded-lg sm:rounded-xl bg-[#C6A15B]/20 border border-[#C6A15B]/30 p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#C6A15B]/30 flex items-center justify-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#C6A15B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-medium text-[#C6A15B] dark:text-[#C6A15B]">
                      {t("lockSuccess")}
                    </div>
                    <div className="text-[10px] sm:text-xs text-[#C6A15B] dark:text-[#C6A15B]/70">
                      {t("positionCreated")}
                    </div>
                  </div>
                </div>
              </div>

              <StakeCodeDisplay
                stakeCode={resultStakeCode || ""}
                shortCode={resultShortCode}
                txHash={stakeHash}
              />
            </div>
          )}

          {/* Transaction Pending */}
          {isStaking && !isStakeSuccess && (
            <div className="rounded-lg sm:rounded-xl bg-blue-500/20 border border-blue-500/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-300">
                    {t("txConfirming")}
                  </div>
                  <div className="text-[10px] sm:text-xs text-blue-500 dark:text-blue-400/70">
                    {t("txPending")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custody Error */}
          {custodyError && (
            <div className="rounded-lg sm:rounded-xl bg-red-500/20 border border-red-500/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-red-600 dark:text-red-300">{custodyError}</div>
                </div>
              </div>
            </div>
          )}

          {/* Approval Success Message */}
          {isApproveSuccess && !needsApproval && !isStakeSuccess && !isStaking && (
            <div className="rounded-lg sm:rounded-xl bg-blue-500/20 border border-blue-500/30 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-300">
                    {t("approved")}
                  </div>
                  <div className="text-[10px] sm:text-xs text-blue-500 dark:text-blue-400/70">
                    {t("canLockNow")}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info Notice */}
          {!isStakeSuccess && !isApproveSuccess && !isStaking && !isApproving && (
            <div className="space-y-2">
              <div className="rounded-lg sm:rounded-xl bg-stone-100 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700 p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400">
                    {periodDays} {t("infoNotice")}
                  </p>
                </div>
              </div>
              <div className="rounded-lg sm:rounded-xl bg-stone-50 dark:bg-slate-800/30 border border-stone-200 dark:border-slate-700/50 p-2.5 sm:p-3">
                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-500 leading-relaxed">
                  {t("yieldDisclaimer")}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                  {t("counterpartyNotice")}
                </p>
                <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed italic">
                  {t("riskDisclosure")}
                </p>
                <p className="text-[9px] sm:text-[10px] text-[#C6A15B] dark:text-[#C6A15B] mt-1.5 font-medium">
                  {t("custodyNotice")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-stone-200 dark:border-slate-800 space-y-2 sm:space-y-3">
          {/* On-chain mode: Approve button */}
          {!isCustodyMode && needsApproval && !isStakeSuccess ? (
            <button
              onClick={handleApprove}
              disabled={!amount || amountNum < offer.minAmount || isApproving || isStaking}
              className="w-full px-3 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isApproving ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("approving")}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {t("approveToken")}
                </>
              )}
            </button>
          ) : !isStakeSuccess ? (
            <button
              onClick={handleStake}
              disabled={!amount || amountNum < offer.minAmount || isApproving || isStaking || (!isCustodyMode && needsApproval)}
              className="w-full px-3 sm:px-4 py-3 sm:py-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#C6A15B] to-[#BFA181] hover:from-[#BFA181] hover:to-[#C6A15B] disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-sm sm:text-base transition-all shadow-lg shadow-[#C6A15B]/20 flex items-center justify-center gap-2"
            >
              {isStaking ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t("locking")}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t("lockEarn")}
                </>
              )}
            </button>
          ) : null}

          {/* Regulatory Shield */}
          {!isStakeSuccess && (
            <p className="text-[8px] sm:text-[9px] text-center text-slate-400 dark:text-slate-500 px-2">
              {t("custodyNotice")}
            </p>
          )}

          {!isStakeSuccess && (
            <button
              onClick={onClose}
              disabled={isApproving || isStaking}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-stone-200 dark:bg-slate-800 hover:bg-stone-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm sm:text-base transition-colors disabled:opacity-50"
            >
              {t("cancel")}
            </button>
          )}

          {isStakeSuccess && (
            <button
              onClick={onClose}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-[#C6A15B] hover:bg-[#C6A15B] text-white font-medium text-sm sm:text-base transition-colors"
            >
              {t("done")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { AllocationModal };
export default AllocationModal;
