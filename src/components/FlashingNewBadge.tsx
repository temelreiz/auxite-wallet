// ============================================================================
// FlashingNewBadge (web)
// ----------------------------------------------------------------------------
// Small brand-gold "NEW" pill that pulses until the user dismisses it by
// clicking the parent surface. Dismissal persists under a caller-chosen
// localStorage key so each surface (nav link, banner, etc.) can have its
// own independent first-click memory.
//
// Tailwind animate-pulse is fine here; native CSS keyframes, no JS thread
// work. We hide via display: none after read, so SSR doesn't render the
// pill briefly for users who've already seen it.
// ============================================================================

"use client";

import { useEffect, useState } from "react";

interface FlashingNewBadgeProps {
  /** Per-surface localStorage key. Bump suffix (_v2) to re-show. */
  storageKey: string;
  /** Owner can force-hide (e.g. on parent click). When true, also persists. */
  dismissed?: boolean;
  /** Display label. Default "NEW". */
  label?: string;
  /** Extra class names to position / size the badge inside the parent. */
  className?: string;
}

export default function FlashingNewBadge({
  storageKey,
  dismissed = false,
  label = "NEW",
  className = "",
}: FlashingNewBadgeProps) {
  // Hidden during SSR + initial client render, then revealed if not visited.
  // Avoids the flicker where badge shows for a frame before being hidden.
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey);
    setShow(!seen);
  }, [storageKey]);

  useEffect(() => {
    if (dismissed && show) {
      setShow(false);
      try { localStorage.setItem(storageKey, "1"); } catch {}
    }
  }, [dismissed, show, storageKey]);

  if (!show) return null;

  return (
    <span
      className={`inline-block bg-[#BFA181] text-zinc-950 text-[8px] font-bold px-1.5 py-0.5 rounded ml-1 align-middle animate-pulse tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}
