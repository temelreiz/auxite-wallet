"use client";

// CampaignBannerPopup — the campaign banner as a centred modal instead of a
// strip above the AUC card.
//
// Reads the same /api/mobile/banners records the carousel and the mobile app
// use, so ops still creates one banner and it renders everywhere. Only the
// highest-priority banner is shown: queueing modals one after another is the
// fastest way to train people to dismiss without reading.
//
// Two things keep it from being obnoxious:
//   - it waits for a cookie-consent decision, so the user never faces two
//     overlays at once
//   - a dismissal is remembered for 24h per banner id, so a campaign can still
//     reach a daily visitor without ambushing them on every navigation

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Banner,
  fetchActiveBanners,
  pickBannerLocale,
  resolveBannerRoute,
} from "@/lib/campaign-banners";
import { readConsent } from "@/lib/consent";

interface Props {
  language: string;
}

const DISMISS_STORAGE_KEY = "auxite_banner_dismissed";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
/** Let the page paint before covering it. */
const OPEN_DELAY_MS = 900;

type DismissMap = Record<string, number>;

function readDismissals(): DismissMap {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as DismissMap) : {};
  } catch {
    return {};
  }
}

function isDismissed(id: string): boolean {
  const at = readDismissals()[id];
  return typeof at === "number" && Date.now() - at < DISMISS_TTL_MS;
}

function rememberDismissal(id: string): void {
  try {
    const all = readDismissals();
    // Drop expired entries while we're here so the record can't grow forever.
    const now = Date.now();
    const pruned: DismissMap = { [id]: now };
    for (const [key, at] of Object.entries(all)) {
      if (key !== id && now - at < DISMISS_TTL_MS) pruned[key] = at;
    }
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(pruned));
  } catch {}
}

export default function CampaignBannerPopup({ language }: Props) {
  const router = useRouter();
  const [banner, setBanner] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      // Don't stack on top of the cookie banner — wait until the user has
      // made a decision. They'll see the campaign on the next page view.
      if (readConsent() === null) return;

      const banners = await fetchActiveBanners();
      if (cancelled) return;

      const next = banners.find((b) => !isDismissed(b.id));
      if (!next) return;

      setBanner(next);
      timer = setTimeout(() => {
        if (!cancelled) setOpen(true);
      }, OPEN_DELAY_MS);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const close = useCallback(() => {
    if (banner) rememberDismissal(banner.id);
    setOpen(false);
  }, [banner]);

  // Escape to close, and hold the background still while the modal is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open || !banner) return null;

  const title = pickBannerLocale(banner.title, language);
  const subtitle = pickBannerLocale(banner.subtitle, language);
  // Campaign-supplied button copy, falling back to the generic defaults so
  // older records keep working unchanged.
  const ctaText =
    pickBannerLocale(banner.ctaLabel, language) || (language === "tr" ? "Devam et" : "Continue");
  const dismissText =
    pickBannerLocale(banner.dismissLabel, language) || (language === "tr" ? "Kapat" : "Dismiss");
  const hasAction = banner.actionType === "screen" || banner.actionType === "link";

  const act = () => {
    if (banner.actionType === "screen") {
      const target = resolveBannerRoute(banner.actionValue);
      if (target) router.push(target);
    } else if (banner.actionType === "link" && banner.actionValue) {
      if (banner.actionValue.startsWith("http")) {
        window.open(banner.actionValue, "_blank", "noopener,noreferrer");
      } else {
        router.push(banner.actionValue);
      }
    }
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-banner-title"
    >
      <div
        // Clicking the card itself must not fall through to the backdrop's
        // close handler.
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-2xl shadow-black/50 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        style={{
          backgroundColor: banner.backgroundColor || "#10b981",
          color: banner.textColor || "#ffffff",
        }}
      >
        <button
          onClick={close}
          aria-label="Kapat"
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/35 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {banner.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner.imageUrl} alt="" className="w-full h-40 object-cover" />
        )}

        <div className="p-7">
          <h2 id="campaign-banner-title" className="text-2xl font-bold leading-tight mb-2">
            {title}
          </h2>
          {!!subtitle && (
            <p className="text-base opacity-90 leading-relaxed">{subtitle}</p>
          )}

          <div className="mt-7 flex items-center gap-3">
            {hasAction && (
              <button
                onClick={act}
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/95 hover:bg-white transition-colors text-base font-bold"
                style={{ color: banner.backgroundColor || "#10b981" }}
              >
                {ctaText}
              </button>
            )}
            <button
              onClick={close}
              className={`px-5 py-3.5 rounded-xl text-base font-semibold bg-black/15 hover:bg-black/25 transition-colors ${
                hasAction ? "" : "flex-1"
              }`}
            >
              {dismissText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
