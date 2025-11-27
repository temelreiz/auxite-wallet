// src/components/PriceCard.tsx
"use client";

import { GoldPrice, PriceDirection } from "@/hooks/useGoldPrice";

type Props = {
  data: GoldPrice | null;
  direction: PriceDirection;
  loading: boolean;
  error: string | null;
};

function DirectionArrow({ direction }: { direction: PriceDirection }) {
  if (direction === "up") {
    return <span className="text-green-500 text-xl ml-2">↑</span>;
  }
  if (direction === "down") {
    return <span className="text-red-500 text-xl ml-2">↓</span>;
  }
  return <span className="text-gray-400 text-xl ml-2">→</span>;
}

export default function PriceCard({ data, direction, loading, error }: Props) {
  const priceText =
    data?.price != null ? data.price.toFixed(2) : loading ? "Loading..." : "-";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Auxite Gold Price
          </p>
          <p className="text-lg font-semibold text-gray-900">1 oz Gold</p>
        </div>
        <div className="flex items-center">
          <p className="text-2xl font-bold tabular-nums">{priceText}</p>
          <span className="ml-1 text-sm text-gray-500">
            {data?.currency || "USD"}
          </span>
          <DirectionArrow direction={direction} />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1">
          Hata: {error}. Lütfen .env.local ve GOLDAPI key’ini kontrol et.
        </p>
      )}

      {!error && !loading && data?.timestamp && (
        <p className="text-[10px] text-gray-400 mt-1">
          Son güncelleme:{" "}
          {new Date(data.timestamp * 1000).toLocaleTimeString("tr-TR")}
        </p>
      )}
    </div>
  );
}
