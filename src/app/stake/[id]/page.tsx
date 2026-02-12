// app/leasing/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AUXITE_LEASING_OFFERS, auxiteLeasingOfferAbi } from "@/lib/leasing";
import {
  useAccount,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { erc20Abi } from "viem";
import { formatUnits, parseUnits, type Address } from "viem";
import { formatAmount, getDecimalPlaces } from '@/lib/format';

export default function LeasingOfferPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const offerConfig = useMemo(
    () => AUXITE_LEASING_OFFERS.find((o) => o.id === id),
    [id]
  );

  const { address: userAddress } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const [amountInput, setAmountInput] = useState("");
  const [txStatus, setTxStatus] = useState<string | null>(null);

  const now = Math.floor(Date.now() / 1000);

  if (!offerConfig) {
    return (
      <main className="px-5 py-6">
        <p className="text-sm">Bu leasing ürünü bulunamadı.</p>
      </main>
    );
  }

  const { address: offerAddress, metalToken, symbol, lockDays, dealerName } =
    offerConfig;

  // Kullanıcının metal (AUXG) bakiyesi
  const { data: metalBalance } = useReadContract({
    abi: erc20Abi,
    address: metalToken,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: Boolean(userAddress) },
  });

  // Kullanıcının pozisyon sayısı
  const { data: numPositionsRaw, refetch: refetchNum } = useReadContract({
    abi: auxiteLeasingOfferAbi,
    address: offerAddress,
    functionName: "numPositions",
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: Boolean(userAddress) },
  });

  const numPositions = Number(numPositionsRaw ?? 0);

  // Basitçe N pozisyon için getPosition çağrılarını teker teker yapalım
  // (Optimize etmek istersek hook ayrıştırırız)
  const positionIndexes = Array.from({ length: numPositions }, (_, i) => i);

  return (
    <main className="px-5 py-6 max-w-3xl mx-auto space-y-5">
      <button
        onClick={() => router.push("/leasing")}
        className="text-xs text-muted-foreground hover:text-white"
      >
        ← Leasing listesine dön
      </button>

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">
          {symbol} – {lockDays} gün leasing
        </h1>
        <p className="text-sm text-muted-foreground">
          Yetkili metal kuruluşu: {dealerName}
        </p>
        <p className="text-xs text-muted-foreground">
          Bu programda {symbol} token’larını belirli bir süre kilitleyerek,
          Auxite Kıymetli Madenler Tic. A.Ş.’nin ticari metal faaliyetlerinden
          elde ettiği gelire göre dönemsel ödeme alma hakkı kazanırsın.
          Auxite Wallet, bu ticari gelirin tarafı veya garantörü değildir.
        </p>
      </header>

      {/* Kullanıcı bakiyesi ve katılım formu */}
      <section className="border border-white/10 rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-medium">Leasing’e katıl</h2>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Cüzdan: {userAddress ?? "Bağlı değil"}</span>
          <span>
            {symbol} bakiyesi:{" "}
            {metalBalance
              ? formatAmount(Number(formatUnits(metalBalance as bigint, 18)), symbol)
              : "-"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-2">
          <div className="space-y-1 md:col-span-2">
            <label>Leasing’e kilitlemek istediğin miktar ({symbol})</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 outline-none"
              placeholder={`min. ${offerConfig.minAmount}`}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              disabled={!userAddress || !amountInput || isPending}
              onClick={async () => {
                if (!userAddress || !amountInput) return;
                try {
                  setTxStatus("ONAY BEKLENİYOR");
                  const value = parseUnits(amountInput, 18);

                  // 1) Kullanıcı -> offer kontratına approve
                  await writeContractAsync({
                    abi: erc20Abi,
                    address: metalToken,
                    functionName: "approve",
                    args: [offerAddress, value],
                  });

                  // 2) deposit
                  setTxStatus("İŞLEM GÖNDERİLİYOR");
                  await writeContractAsync({
                    abi: auxiteLeasingOfferAbi,
                    address: offerAddress,
                    functionName: "deposit",
                    args: [value],
                  });

                  setTxStatus("Tamamlandı");
                  setAmountInput("");
                  await refetchNum();
                } catch (e) {
                  console.error(e);
                  setTxStatus("Hata oluştu veya işlem iptal edildi");
                }
              }}
              className="w-full rounded-lg bg-white text-black px-4 py-2 text-xs font-medium disabled:opacity-40"
            >
              {isPending ? "İşlem gönderiliyor..." : "Leasing’e katıl"}
            </button>
          </div>
        </div>

        {txStatus && (
          <p className="text-[11px] text-muted-foreground mt-1">{txStatus}</p>
        )}

        <p className="text-[11px] text-muted-foreground mt-2">
          İşlem on-chain olarak gerçekleşir. Gas ücretleri kullanıcı tarafından
          ödenir. İşlemler geri alınamaz.
        </p>
      </section>

      {/* Pozisyon listesi */}
      <section className="border border-white/10 rounded-xl p-4 space-y-3 text-sm">
        <h2 className="font-medium">Pozisyonların</h2>
        {!userAddress && (
          <p className="text-xs text-muted-foreground">
            Pozisyonlarını görmek için cüzdanını bağlamalısın.
          </p>
        )}

        {userAddress && numPositions === 0 && (
          <p className="text-xs text-muted-foreground">
            Bu leasing programında henüz pozisyonun yok.
          </p>
        )}

        <div className="space-y-2">
          {userAddress &&
            positionIndexes.map((i) => (
              <LeasingPositionRow
                key={i}
                index={i}
                offerAddress={offerAddress}
                symbol={symbol}
                lockDays={lockDays}
                now={now}
              />
            ))}
        </div>
      </section>

      {/* Uyum / risk disclaimer */}
      <section className="border border-yellow-500/30 bg-yellow-500/5 text-yellow-100 rounded-xl p-4 space-y-2 text-[11px]">
        <p className="font-medium">Uyumluluk ve risk bildirimi</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Auxite Wallet, sadece akıllı kontratlar ile etkileşime geçen bir
            arayüzdür; leasing ürünlerinin ihraççısı, satıcısı veya garantörü
            değildir.
          </li>
          <li>
            Leasing programları, Auxite Kıymetli Madenler Tic. A.Ş.’nin ticari
            faaliyetlerine dayalıdır ve getiriler önceden garanti edilmez.
          </li>
          <li>
            Kullanıcılar, leasinge katılmadan önce kendi risk değerlendirmesini
            yapmalı ve gerekirse bağımsız bir danışmandan görüş almalıdır.
          </li>
          <li>
            Bu ekran yatırım tavsiyesi niteliği taşımaz; sadece bilgi amaçlıdır.
          </li>
        </ul>
      </section>
    </main>
  );
}

type PositionRowProps = {
  index: number;
  offerAddress: Address;
  symbol: string;
  lockDays: number;
  now: number;
};

function LeasingPositionRow({
  index,
  offerAddress,
  symbol,
  lockDays,
  now,
}: PositionRowProps) {
  const { address: userAddress } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  const { data: position } = useReadContract({
    abi: auxiteLeasingOfferAbi,
    address: offerAddress,
    functionName: "getPosition",
    args: userAddress ? [userAddress, BigInt(index)] : undefined,
    query: { enabled: Boolean(userAddress) },
  });

  if (!position) return null;

  const [amount, startTime, endTime, closed, rewardClaimed] =
    position as unknown as [bigint, bigint, bigint, boolean, boolean];

  const unlocked = now >= Number(endTime);
  const amountFormatted = formatAmount(Number(formatUnits(amount, 18)), symbol);

  return (
    <div className="border border-white/10 rounded-lg p-3 flex flex-col gap-1 text-xs">
      <div className="flex justify-between">
        <span>Pozisyon #{index}</span>
        <span className="text-muted-foreground">
          {closed ? "Kapalı" : unlocked ? "Kilidi Açık" : "Kilitte"}
        </span>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>
          Miktar: {amountFormatted} {symbol}
        </span>
        <span>
          Başlangıç:{" "}
          {new Date(Number(startTime) * 1000).toLocaleDateString("tr-TR")}
        </span>
        <span>
          Bitiş:{" "}
          {new Date(Number(endTime) * 1000).toLocaleDateString("tr-TR")}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Ticari gelir durumu:{" "}
        {rewardClaimed
          ? "Ödeme işlenmiş."
          : "Ödeme henüz Auxite Kıymetli Madenler Tic. A.Ş. tarafından işlenmemiş olabilir."}
      </div>

      {!closed && unlocked && (
        <div className="mt-2">
          <button
            disabled={isPending}
            onClick={async () => {
              try {
                await writeContractAsync({
                  abi: auxiteLeasingOfferAbi,
                  address: offerAddress,
                  functionName: "withdraw",
                  args: [BigInt(index)],
                });
              } catch (e) {
                console.error(e);
              }
            }}
            className="rounded-lg bg-white text-black px-3 py-1 text-[11px] font-medium disabled:opacity-40"
          >
            Kilidi aç ve {symbol}’leri geri al
          </button>
        </div>
      )}
    </div>
  );
}
