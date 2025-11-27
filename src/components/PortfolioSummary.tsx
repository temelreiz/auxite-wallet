// src/components/PortfolioSummary.tsx
"use client";

type UiLang = "tr" | "en";
type UiTheme = "dark" | "light";
import { useWallet } from "@/hooks/useWallet";
import { useAuxiteBalances } from "@/hooks/useAuxiteBalances";
import { useMetalsPrices } from "@/hooks/useMetalsPrices";
import { METALS } from "@/lib/metals";

type Props = {
  theme: UiTheme;
  lang: UiLang;
};

export default function PortfolioSummary({ theme, lang }: Props) {
  // useWallet artık account değil address döndürüyor
  const { address, isConnected } = useWallet();

  const { balances, loading: balLoading, error: balError } =
    useAuxiteBalances(address ?? undefined);

  // Yeni hook: metals yok, prices (USD/oz) var
  const { prices, loading: priceLoading } = useMetalsPrices();

  const isDark = theme === "dark";
  const t = (tr: string, en: string) => (lang === "tr" ? tr : en);

  // fiyatları id → pricePerGram mapine çevir (USD/oz → USD/g)
  const priceById: Record<string, number> = {};
  for (const m of METALS) {
    const pricePerOz = prices[m.id] ?? 0;
    const pricePerGram = pricePerOz > 0 ? pricePerOz / 31.1034768 : 0;
    priceById[m.id] = pricePerGram;
  }

  const safeBalances = balances ?? {};

  // gösterilecek metal listesi
  const items = METALS.map((m) => {
    const bal = (safeBalances as any)[m.id];
    const grams = bal?.grams ?? 0;
    const price = priceById[m.id] ?? 0;
    const usd = grams * price; // 1 USDT ≈ 1 USD varsayımı
    return {
      ...m,
      grams,
      usd,
    };
  }).filter((x) => x.grams > 0.0001); // sıfır bakiyeleri gizle

  const totalUsd = items.reduce((sum, x) => sum + x.usd, 0);

  // cüzdan bağlı değilse hafif bilgi
  if (!isConnected || !address) {
    return (
      <section className="mb-4">
        <div
          className={
            "rounded-2xl border px-4 py-3 text-xs " +
            (isDark
              ? "border-slate-800 bg-slate-900/70 text-slate-300"
              : "border-slate-200 bg-white text-slate-700")
          }
        >
          {t(
            "Varlık özetini görmek için sağ üstten cüzdanınızı bağlayın.",
            "Connect your wallet (top right) to see your Auxite asset summary."
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4">
      <div
        className={
          "rounded-2xl border px-4 py-3 " +
          (isDark
            ? "border-slate-800 bg-slate-900/80"
            : "border-slate-200 bg-white")
        }
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">
              {t("Varlıklarım", "My Assets")}
            </h2>
            <p className="mt-1 text-[11px] text-slate-400">
              {t(
                "Auxite RWA token bakiyeleriniz ve yaklaşık USD/USDT karşılığı.",
                "Your Auxite RWA token balances and approximate USD/USDT value."
              )}
            </p>
          </div>

          <div className="text-right text-[11px]">
            <div className="text-slate-400">
              {t("Toplam Değer (≈)", "Total Value (≈)")}
            </div>
            <div className="font-mono text-sm">
              {totalUsd.toFixed(2)} USD · {totalUsd.toFixed(2)} USDT
            </div>
          </div>
        </div>

        {balError && (
          <p className="mb-1 text-[11px] text-red-400">
            {t("Bakiyeler okunamadı:", "Balances unavailable:")} {balError}
          </p>
        )}

        {balLoading || priceLoading ? (
          <p className="text-[11px] text-slate-400">
            {t("Bakiyeler yükleniyor…", "Loading balances…")}
          </p>
        ) : items.length === 0 ? (
          <p className="text-[11px] text-slate-400">
            {t(
              "Bu cüzdanda henüz AUXG, AUXS, AUXPT veya AUXPD bakiyesi bulunmuyor.",
              "This wallet has no AUXG, AUXS, AUXPT or AUXPD balance yet."
            )}
          </p>
        ) : (
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it) => (
              <div
                key={it.id}
                className={
                  "flex flex-col gap-1 rounded-xl border px-3 py-2 text-[11px] " +
                  (isDark
                    ? "border-slate-800 bg-slate-950/70"
                    : "border-slate-200 bg-slate-50")
                }
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{it.symbol}</span>
                  <span className="text-slate-400 truncate max-w-[8rem] text-right">
                    {it.name}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-mono">{it.grams.toFixed(3)} g</span>
                  <span className="text-right">
                    <div className="font-mono">
                      ≈ {it.usd.toFixed(2)} USD
                    </div>
                    <div className="font-mono text-slate-400">
                      ≈ {it.usd.toFixed(2)} USDT
                    </div>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
