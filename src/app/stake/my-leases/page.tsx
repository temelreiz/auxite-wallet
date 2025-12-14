// app/leasing/my-leases/page.tsx
"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits } from "viem";
import type { Address } from "viem";
import { useState } from "react";

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
        <h1 className="text-2xl font-semibold">Leasing Pozisyonlarım</h1>
        <p className="text-sm text-muted-foreground">
          Auxite Leasing programı kapsamında açtığın aktif ve tamamlanmış
          pozisyonları burada görebilirsin.
        </p>
      </header>

      {!address && (
        <p className="text-sm text-muted-foreground">
          Pozisyonlarını görmek için cüzdan bağla.
        </p>
      )}

      {address && !hasPositions && (
        <p className="text-sm text-muted-foreground">
          Henüz herhangi bir leasing pozisyonun bulunmuyor.
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
                    Pozisyon #{idx + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {closed ? "Tamamlandı" : unlocked ? "Kilidi Açık" : "Kilitte"}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Miktar: {formatUnits(amount, 18)} AUXG
                  </span>
                  <span>
                    Başlangıç: {startDate.toLocaleDateString("tr-TR")}
                  </span>
                  <span>
                    Bitiş: {endDate.toLocaleDateString("tr-TR")}
                  </span>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Getiri durumu:{" "}
                  {rewardClaimed
                    ? "Ticari gelir ödemesi yapılmış görünüyor."
                    : "Henüz ticari gelir aktarımı işlenmemiş görünüyor."}
                </div>

                <div className="flex justify-end">
                  <button
                    disabled={!canWithdraw || isPending}
                    onClick={() => onWithdraw(idx)}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-black disabled:opacity-40"
                  >
                    {closed
                      ? "Çekildi"
                      : !unlocked
                      ? "Kilitte"
                      : isPending
                      ? "İşlem gönderiliyor..."
                      : "Varlığı Geri Çek"}
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
