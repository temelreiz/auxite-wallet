// app/leasing/my-leases/page.tsx
"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import type { Address } from "viem";
import { useState } from "react";
import { useLanguage } from "@/components/LanguageContext";

// ============================================
// 6-LANGUAGE TRANSLATIONS
// ============================================
const translations: Record<string, Record<string, string>> = {
  tr: {
    title: "Leasing Pozisyonlarım",
    description: "Auxite Leasing programı kapsamında açtığın aktif ve tamamlanmış pozisyonları burada görebilirsin.",
    connectWallet: "Pozisyonlarını görmek için cüzdan bağla.",
    noPositions: "Henüz herhangi bir leasing pozisyonun bulunmuyor.",
    position: "Pozisyon #",
    completed: "Tamamlandı",
    unlocked: "Kilidi Açık",
    locked: "Kilitte",
    amount: "Miktar:",
    start: "Başlangıç:",
    end: "Bitiş:",
    yieldStatus: "Getiri durumu:",
    rewardPaid: "Ticari gelir ödemesi yapılmış görünüyor.",
    rewardNotPaid: "Henüz ticari gelir aktarımı işlenmemiş görünüyor.",
    withdrawn: "Çekildi",
    sending: "İşlem gönderiliyor...",
    withdrawAsset: "Varlığı Geri Çek",
  },
  en: {
    title: "My Leasing Positions",
    description: "View your active and completed positions within the Auxite Leasing program here.",
    connectWallet: "Connect your wallet to see your positions.",
    noPositions: "You don't have any leasing positions yet.",
    position: "Position #",
    completed: "Completed",
    unlocked: "Unlocked",
    locked: "Locked",
    amount: "Amount:",
    start: "Start:",
    end: "End:",
    yieldStatus: "Yield status:",
    rewardPaid: "Commercial income payment appears to have been made.",
    rewardNotPaid: "Commercial income transfer appears not to have been processed yet.",
    withdrawn: "Withdrawn",
    sending: "Sending transaction...",
    withdrawAsset: "Withdraw Asset",
  },
  de: {
    title: "Meine Leasing-Positionen",
    description: "Sehen Sie hier Ihre aktiven und abgeschlossenen Positionen im Auxite Leasing-Programm.",
    connectWallet: "Verbinden Sie Ihre Wallet, um Ihre Positionen zu sehen.",
    noPositions: "Sie haben noch keine Leasing-Positionen.",
    position: "Position #",
    completed: "Abgeschlossen",
    unlocked: "Entsperrt",
    locked: "Gesperrt",
    amount: "Betrag:",
    start: "Beginn:",
    end: "Ende:",
    yieldStatus: "Ertragsstatus:",
    rewardPaid: "Die Zahlung der Handelserträge scheint erfolgt zu sein.",
    rewardNotPaid: "Die Übertragung der Handelserträge scheint noch nicht verarbeitet worden zu sein.",
    withdrawn: "Abgehoben",
    sending: "Transaktion wird gesendet...",
    withdrawAsset: "Vermögenswert abheben",
  },
  fr: {
    title: "Mes Positions de Leasing",
    description: "Consultez ici vos positions actives et terminées dans le programme Auxite Leasing.",
    connectWallet: "Connectez votre portefeuille pour voir vos positions.",
    noPositions: "Vous n'avez pas encore de positions de leasing.",
    position: "Position #",
    completed: "Terminée",
    unlocked: "Déverrouillée",
    locked: "Verrouillée",
    amount: "Montant :",
    start: "Début :",
    end: "Fin :",
    yieldStatus: "Statut du rendement :",
    rewardPaid: "Le paiement des revenus commerciaux semble avoir été effectué.",
    rewardNotPaid: "Le transfert des revenus commerciaux ne semble pas encore avoir été traité.",
    withdrawn: "Retiré",
    sending: "Envoi de la transaction...",
    withdrawAsset: "Retirer l'actif",
  },
  ar: {
    title: "مراكز التأجير الخاصة بي",
    description: "يمكنك هنا عرض مراكزك النشطة والمكتملة ضمن برنامج Auxite للتأجير.",
    connectWallet: "قم بتوصيل محفظتك لعرض مراكزك.",
    noPositions: "ليس لديك أي مراكز تأجير حتى الآن.",
    position: "المركز #",
    completed: "مكتمل",
    unlocked: "غير مقفل",
    locked: "مقفل",
    amount: "المبلغ:",
    start: "البداية:",
    end: "النهاية:",
    yieldStatus: "حالة العائد:",
    rewardPaid: "يبدو أنه تم دفع إيرادات التجارة.",
    rewardNotPaid: "يبدو أنه لم تتم معالجة تحويل الإيرادات التجارية بعد.",
    withdrawn: "تم السحب",
    sending: "جارٍ إرسال المعاملة...",
    withdrawAsset: "سحب الأصل",
  },
  ru: {
    title: "Мои лизинговые позиции",
    description: "Здесь вы можете просмотреть свои активные и завершённые позиции в программе Auxite Leasing.",
    connectWallet: "Подключите кошелёк, чтобы увидеть свои позиции.",
    noPositions: "У вас пока нет лизинговых позиций.",
    position: "Позиция #",
    completed: "Завершена",
    unlocked: "Разблокирована",
    locked: "Заблокирована",
    amount: "Сумма:",
    start: "Начало:",
    end: "Окончание:",
    yieldStatus: "Статус доходности:",
    rewardPaid: "Похоже, выплата коммерческого дохода была произведена.",
    rewardNotPaid: "Похоже, перевод коммерческого дохода ещё не обработан.",
    withdrawn: "Выведено",
    sending: "Отправка транзакции...",
    withdrawAsset: "Вывести актив",
  },
};

const dateLocaleMap: Record<string, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  ar: "ar-SA",
  ru: "ru-RU",
};

const LEASING_OFFER_ADDRESS = "0xYourLeasingOfferContractHere" as Address;

const leasingOfferAbi = [
  {
    name: "getAllPositions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "amounts", type: "uint256[]" },
      { name: "startTimes", type: "uint64[]" },
      { name: "closeds", type: "bool[]" },
      { name: "rewardClaimeds", type: "bool[]" },
    ],
  },
  {
    name: "lockDuration",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [],
  },
] as const;

export default function MyLeasesPage() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [refreshKey, setRefreshKey] = useState(0);
  const { lang } = useLanguage();
  const t = (key: string) => (translations as any)[lang]?.[key] || (translations as any).en[key] || key;
  const dateLocale = dateLocaleMap[lang] || "en-US";

  const { data: positionsData } = useReadContract({
    abi: leasingOfferAbi,
    address: LEASING_OFFER_ADDRESS,
    functionName: "getAllPositions",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
      staleTime: 5_000,
      gcTime: 5_000,
    },
  });

  const { data: lockDurationData } = useReadContract({
    abi: leasingOfferAbi,
    address: LEASING_OFFER_ADDRESS,
    functionName: "lockDuration",
  });

  const lockDuration = Number(lockDurationData ?? 0); // seconds
  const now = Math.floor(Date.now() / 1000);

  const onWithdraw = async (index: number) => {
    await writeContractAsync({
      abi: leasingOfferAbi,
      address: LEASING_OFFER_ADDRESS,
      functionName: "withdraw",
      args: [BigInt(index)],
    });
    setRefreshKey((k) => k + 1);
  };

  const amounts = (positionsData?.[0] as bigint[] | undefined) ?? [];
  const startTimes = (positionsData?.[1] as bigint[] | undefined) ?? [];
  const closeds = (positionsData?.[2] as boolean[] | undefined) ?? [];
  const rewardClaimeds = (positionsData?.[3] as boolean[] | undefined) ?? [];

  const hasPositions = amounts.length > 0;

  return (
    <main className="px-5 py-6 max-w-3xl mx-auto space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </header>

      {!address && (
        <p className="text-sm text-muted-foreground">
          {t("connectWallet")}
        </p>
      )}

      {address && !hasPositions && (
        <p className="text-sm text-muted-foreground">
          {t("noPositions")}
        </p>
      )}

      {address && hasPositions && (
        <section className="space-y-3">
          {amounts.map((amount, idx) => {
            const start = Number(startTimes[idx]);
            const end = start + lockDuration;
            const closed = closeds[idx];
            const rewardClaimed = rewardClaimeds[idx];

            const unlocked = now >= end;
            const canWithdraw = unlocked && !closed;

            const startDate = new Date(start * 1000);
            const endDate = new Date(end * 1000);

            return (
              <div
                key={idx}
                className="border border-white/10 rounded-xl p-3 flex flex-col gap-2 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {t("position")}{idx + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {closed ? t("completed") : unlocked ? t("unlocked") : t("locked")}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t("amount")} {formatUnits(amount, 18)} AUXG
                  </span>
                  <span>
                    {t("start")} {startDate.toLocaleDateString(dateLocale)}
                  </span>
                  <span>
                    {t("end")} {endDate.toLocaleDateString(dateLocale)}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  {t("yieldStatus")}{" "}
                  {rewardClaimed
                    ? t("rewardPaid")
                    : t("rewardNotPaid")}
                </div>

                <div className="flex justify-end">
                  <button
                    disabled={!canWithdraw || isPending}
                    onClick={() => onWithdraw(idx)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-black disabled:opacity-40"
                  >
                    {closed
                      ? t("withdrawn")
                      : !unlocked
                      ? t("locked")
                      : isPending
                      ? t("sending")
                      : t("withdrawAsset")}
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}
