"use client";

// CampaignBannerCarousel — web twin of the mobile component. Same
// endpoint, same banner shape, different rendering: on desktop we
// auto-rotate through banners; on mobile widths we let the user
// horizontal-scroll. Hidden when there are no active campaigns so
// quiet weeks don't leave an empty slot above the AUC card.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface BannerLocale {
  tr?: string;
  en?: string;
  de?: string;
  fr?: string;
  ar?: string;
  ru?: string;
}

interface Banner {
  id: string;
  title: BannerLocale;
  subtitle?: BannerLocale;
  imageUrl?: string;
  backgroundColor: string;
  textColor: string;
  actionType: "none" | "link" | "screen" | "promo";
  actionValue?: string;
  active: boolean;
  priority: number;
  startDate?: string;
  endDate?: string;
}

interface BannersResponse {
  success: boolean;
  banners: Banner[];
}

function pickLocale(localized: BannerLocale | undefined, language: string): string {
  if (!localized) return "";
  return (
    (localized[language as keyof BannerLocale] as string | undefined) ||
    localized.tr ||
    localized.en ||
    localized.de ||
    localized.fr ||
    localized.ar ||
    localized.ru ||
    ""
  );
}

// Mirror the mobile screenMap so the same banner record routes
// consistently in both apps. Symbolic names stay short ("trade",
// "convert"); we resolve them to the real /paths here.
function resolveRoute(actionValue: string | undefined): string | null {
  if (!actionValue) return null;
  const map: Record<string, string> = {
    trade: "/markets",
    buy: "/markets",
    markets: "/markets",
    convert: "/allocate",
    withdraw: "/redeem",
    fund: "/fund-vault",
    "fund-vault": "/fund-vault",
    stake: "/stake",
    yield: "/stake",
    profile: "/profile",
    vault: "/vault",
  };
  return map[actionValue.toLowerCase()] || `/${actionValue}`;
}

interface Props {
  language: string;
}

const ROTATE_MS = 5000;

export default function CampaignBannerCarousel({ language }: Props) {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mobile/banners?active=true", {
        cache: "no-store",
      });
      const data: BannersResponse = await res.json();
      if (data.success && Array.isArray(data.banners)) {
        const now = Date.now();
        const filtered = data.banners.filter((b) => {
          if (!b.active) return false;
          if (b.startDate && Date.parse(b.startDate) > now) return false;
          if (b.endDate && Date.parse(b.endDate) < now) return false;
          return true;
        });
        setBanners(filtered);
      } else {
        setBanners([]);
      }
    } catch (err) {
      console.warn("[BannerCarousel] fetch failed:", err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-rotate carousel when there's more than one banner. Single
  // banner stays put — no pointless interval.
  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [banners.length]);

  if (loading || banners.length === 0) return null;

  const handleClick = (b: Banner) => {
    if (b.actionType === "screen") {
      const target = resolveRoute(b.actionValue);
      if (target) router.push(target);
    } else if (b.actionType === "link" && b.actionValue) {
      if (b.actionValue.startsWith("http")) {
        window.open(b.actionValue, "_blank", "noopener,noreferrer");
      } else {
        router.push(b.actionValue);
      }
    }
  };

  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {banners.map((b) => {
            const title = pickLocale(b.title, language);
            const subtitle = pickLocale(b.subtitle, language);
            return (
              <button
                key={b.id}
                onClick={() => handleClick(b)}
                className="min-w-full flex items-center gap-4 p-5 text-left hover:opacity-95 transition-opacity"
                style={{
                  backgroundColor: b.backgroundColor || "#10b981",
                  color: b.textColor || "#ffffff",
                }}
              >
                {b.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={b.imageUrl}
                    alt=""
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold mb-1 line-clamp-2">
                    {title}
                  </div>
                  {!!subtitle && (
                    <div className="text-sm opacity-90 line-clamp-2">
                      {subtitle}
                    </div>
                  )}
                </div>
                <svg
                  className="w-5 h-5 flex-shrink-0 opacity-70"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            );
          })}
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === active ? "bg-white w-5" : "bg-white/50"
                }`}
                aria-label={`Banner ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
